"""Production uses the runtime image and its explicitly selected environment."""

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]


def test_production_compose_isolates_configuration_and_disables_watch(tmp_path):
    if shutil.which("docker") is None:
        pytest.skip("Docker Compose CLI is needed to resolve production overrides")
    for name in ("docker-compose.yml", "docker-compose-prod.yml"):
        shutil.copyfile(ROOT / name, tmp_path / name)
    # A local development file must not supply any production values.
    (tmp_path / ".env").write_text("SITE_URL=http://development.invalid\n")
    template = (ROOT / ".env.prod.example").read_text()
    production = "\n".join(
        f"{line}synthetic-production-value-with-at-least-32-bytes"
        if line.endswith("=")
        else line
        for line in template.splitlines()
        if not line.startswith(("#", "SMTP_", "EGRESS_"))
    )
    (tmp_path / ".env.prod").write_text(
        production.replace("replace-with-public-host", "production.invalid").replace(
            "replace-with-public-storage-host", "storage.production.invalid"
        )
    )
    command = [
        "docker",
        "compose",
        "--env-file",
        ".env.prod",
        "-f",
        "docker-compose.yml",
        "-f",
        "docker-compose-prod.yml",
        "config",
        "--format",
        "json",
    ]
    result = subprocess.run(
        command,
        cwd=tmp_path,
        env={"PATH": os.environ["PATH"], "HOME": os.environ.get("HOME", str(tmp_path))},
        capture_output=True,
        text=True,
        check=True,
    )
    services = json.loads(result.stdout)["services"]
    assert services["egress-proxy"]["ulimits"]["nofile"] == {
        "soft": 65536,
        "hard": 65536,
    }
    assert services["frontend"]["build"]["target"] == "runtime"
    assert (
        services["frontend"]["environment"]["SITE_URL"] == "https://production.invalid"
    )
    for name in ("migrate", "api", "worker", "session-runner"):
        assert services[name]["environment"]["APP_ENV"] == "production"
    for name in ("api", "frontend", "worker", "session-runner"):
        assert not services[name].get("develop")
    for name in ("api", "frontend"):
        assert services[name]["environment"]["MINIO_LOCAL_BROWSER_ENDPOINT"] == ""
        assert services[name]["environment"]["MINIO_PUBLIC_SECURE"] == "true"
    assert "AUTH_JWT_SECRET" not in services["session-runner"]["environment"]
    assert "DATABASE_URL" not in services["session-runner"]["environment"]

    (tmp_path / ".env.prod").write_text("SITE_URL=https://production.invalid\n")
    missing = subprocess.run(
        command,
        cwd=tmp_path,
        env={"PATH": os.environ["PATH"], "HOME": os.environ.get("HOME", str(tmp_path))},
        capture_output=True,
        text=True,
        check=False,
    )
    assert missing.returncode != 0
    assert "Configure" in missing.stderr
