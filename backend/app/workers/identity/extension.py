"""Generate the unpacked extension permissions from the current Registry."""

from __future__ import annotations

import base64
import hashlib
import ipaddress
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

from app.core.config import CookieSourceSettings
from app.services.provider_types import ProviderIdentity
from app.workers.identity.permissions import private_directory, private_write
from app.workers.identity.yuanbao_parse import YUANBAO_ORIGIN
from app.workers.runner.provider_registry import current_provider_registry

EXTENSION_SOURCE = Path(__file__).resolve().parents[4] / "extension"


def extension_home() -> Path:
    # --git-common-dir points to the primary checkout even inside a worktree.
    common = subprocess.run(
        [
            "git",
            "-C",
            str(EXTENSION_SOURCE.parent),
            "rev-parse",
            "--path-format=absolute",
            "--git-common-dir",
        ],
        check=True,
        capture_output=True,
        text=True,
        timeout=5,
    ).stdout.strip()
    return Path(common).parent / "extension"


def cookie_domains() -> list[str]:
    return sorted(
        {
            domain.lstrip(".").lower()
            for profile in current_provider_registry().profiles
            if profile.identity in {ProviderIdentity.REQUIRED, ProviderIdentity.PREFER}
            and profile.identity_source == "cookies"
            for domain in profile.cookie_domain_allowlist
        }
    )


def request_origins() -> list[str]:
    return sorted(
        {
            YUANBAO_ORIGIN
            for profile in current_provider_registry().profiles
            if profile.key == "wechat_channels"
            and profile.identity in {ProviderIdentity.REQUIRED, ProviderIdentity.PREFER}
            and profile.identity_source == "yuanbao_http"
            and profile.identity_origin == YUANBAO_ORIGIN
        }
    )


def extension_endpoint(port: int, server_url: str | None = None) -> str:
    if server_url is None:
        return f"ws://127.0.0.1:{port}/extension"
    if any(ord(c) <= 32 or ord(c) >= 127 for c in server_url) or any(
        c in server_url for c in "\\?#"
    ):
        raise ValueError("identity_requires_https_origin")
    parsed = urlsplit(server_url)
    host = parsed.hostname or ""
    if (
        parsed.scheme != "https"
        or not host
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path not in ("", "/")
        or parsed.netloc.endswith(":")
    ):
        raise ValueError("identity_requires_https_origin")
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        if (
            not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", host)
            or "." not in host
            or host.endswith((".local", ".localhost"))
            or any(
                not part or len(part) > 63 or part.startswith("-") or part.endswith("-")
                for part in host.split(".")
            )
        ):
            raise ValueError("identity_requires_public_origin") from None
    else:
        if not address.is_global:
            raise ValueError("identity_requires_public_origin")
    if parsed.port is not None and not 1 <= parsed.port <= 65535:
        raise ValueError("identity_requires_https_origin")
    authority = f"[{host}]" if ":" in host else host
    if parsed.port not in (None, 443):
        authority += f":{parsed.port}"
    return f"wss://{authority}/identity/extension"


def manifest(port: int, server_url: str | None = None) -> dict[str, object]:
    result: dict[str, object] = json.loads(
        (EXTENSION_SOURCE / "manifest.template.json").read_text(encoding="utf-8")
    )
    result["host_permissions"] = [
        *(f"*://*.{domain}/*" for domain in cookie_domains()),
        *(f"{origin}/*" for origin in request_origins()),
    ]
    endpoint = urlsplit(extension_endpoint(port, server_url))
    # WebSockets need no host permission. Chrome match patterns accept HTTP(S),
    # not WS(S); constrain the selected socket origin in CSP instead.
    connect = " ".join(
        ["'self'", f"{endpoint.scheme}://{endpoint.netloc}", *request_origins()]
    )
    result["content_security_policy"] = {
        "extension_pages": (
            f"script-src 'self'; object-src 'self'; connect-src {connect};"
        )
    }
    return result


def extension_origin() -> str:
    key = json.loads(
        (EXTENSION_SOURCE / "manifest.template.json").read_text(encoding="utf-8")
    )["key"]
    digest = hashlib.sha256(base64.b64decode(key, validate=True)).hexdigest()[:32]
    extension_id = "".join(chr(ord("a") + int(char, 16)) for char in digest)
    return f"chrome-extension://{extension_id}"


def require_untracked_outputs(destination: Path) -> None:
    for name in ("config.local.json", "manifest.json"):
        result = subprocess.run(
            ["git", "-C", str(destination), "ls-files", "--error-unmatch", "--", name],
            capture_output=True,
            timeout=5,
        )
        if result.returncode != 1:
            raise ValueError("identity_generated_file_tracked")
        ignored = subprocess.run(
            ["git", "-C", str(destination), "check-ignore", "--quiet", "--", name],
            capture_output=True,
            timeout=5,
        )
        if ignored.returncode != 0:
            raise ValueError("identity_generated_file_not_ignored")


def install_extension(
    settings: CookieSourceSettings, server_url: str | None = None
) -> Path:
    destination = extension_home()
    if destination.resolve() != EXTENSION_SOURCE.resolve():
        raise ValueError("identity_install_requires_primary_workspace")
    require_untracked_outputs(destination)
    private_directory(destination)
    private_write(
        destination / "manifest.json",
        json.dumps(manifest(settings.cookie_source_port, server_url), indent=2) + "\n",
    )
    # Not web-accessible; local pairing data is never shipped or tracked.
    config = {
        "endpoint": extension_endpoint(settings.cookie_source_port, server_url),
        "pairingKey": settings.cookie_source_pairing_key.get_secret_value(),
        "domains": cookie_domains(),
        "yuanbaoParse": YUANBAO_ORIGIN in request_origins(),
    }
    private_write(destination / "config.local.json", json.dumps(config) + "\n")
    require_untracked_outputs(destination)
    return destination
