from __future__ import annotations

import ast
from importlib.util import resolve_name
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[2] / "app"

OUTER_APP_LAYERS = (
    "app.api",
    "app.integrations",
    "app.repositories",
    "app.db",
    "app.models",
    "app.schemas",
    "app.runtime",
    "app.composition",
    "app.lifespan",
    "app.runner",
    "app.workers",
)
INFRASTRUCTURE_PACKAGES = (
    "aio_pika",
    "fastapi",
    "minio",
    "sqlalchemy",
    "yt_dlp",
)


def test_domain_and_services_only_depend_inward() -> None:
    rules = {
        APP_ROOT / "domain": (
            "app.services",
            *OUTER_APP_LAYERS,
            *INFRASTRUCTURE_PACKAGES,
        ),
        APP_ROOT / "services": (
            *OUTER_APP_LAYERS,
            *INFRASTRUCTURE_PACKAGES,
        ),
    }
    violations: list[str] = []

    for layer, forbidden_prefixes in rules.items():
        assert layer.is_dir(), f"Missing layer: {layer}"
        for source in layer.rglob("*.py"):
            for imported in _imported_modules(source):
                if any(_matches(imported, prefix) for prefix in forbidden_prefixes):
                    violations.append(
                        f"{source.relative_to(APP_ROOT)} imports {imported}"
                    )

    assert not violations, "Invalid outward dependencies:\n" + "\n".join(violations)


def test_public_api_uses_one_unversioned_contract_tree() -> None:
    api_root = APP_ROOT / "api"

    assert (api_root / "routes").is_dir()
    assert (APP_ROOT / "schemas").is_dir()
    assert not (api_root / "v1").exists()


def _imported_modules(source: Path) -> set[str]:
    tree = ast.parse(source.read_text(encoding="utf-8"), filename=str(source))
    modules: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            modules.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            if node.level:
                package = source.parent.relative_to(APP_ROOT.parent).as_posix()
                module = resolve_name(
                    "." * node.level + (node.module or ""), package.replace("/", ".")
                )
            else:
                module = node.module or ""
            modules.add(module)
            modules.update(f"{module}.{name.name}" for name in node.names)
    return modules


def _matches(module: str, prefix: str) -> bool:
    return module == prefix or module.startswith(f"{prefix}.")


def test_database_and_models_do_not_import_services_or_adapters() -> None:
    forbidden = (
        "app.services",
        "app.api",
        "app.repositories",
        "app.integrations",
        "app.workers",
        "app.runner",
        "app.runtime",
        "app.composition",
    )
    for layer in ("db", "models"):
        sources = list((APP_ROOT / layer).rglob("*.py"))
        assert sources, f"Missing layer: {layer}"
        for source in sources:
            for module in _imported_modules(source):
                assert not any(_matches(module, prefix) for prefix in forbidden), (
                    f"{source.relative_to(APP_ROOT)} imports {module}"
                )
