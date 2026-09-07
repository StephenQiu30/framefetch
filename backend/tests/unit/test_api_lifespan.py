from unittest.mock import AsyncMock, Mock

import pytest
from app import main
from app.core.config import Settings
from fastapi.testclient import TestClient


def test_app_factory_does_not_build_resources(monkeypatch: pytest.MonkeyPatch) -> None:
    build = Mock(side_effect=AssertionError("resources built outside lifespan"))
    monkeypatch.setattr(main, "build_api_runtime", build)
    application = main.create_app(Settings(app_env="development", _env_file=None))
    assert application.openapi()["paths"]
    build.assert_not_called()


def test_lifespan_builds_starts_and_closes_resources(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime = Mock(start=AsyncMock(), close=AsyncMock())
    build = Mock(return_value=runtime)
    monkeypatch.setattr(main, "build_api_runtime", build)
    application = main.create_app(Settings(app_env="development", _env_file=None))
    with TestClient(application) as client:
        build.assert_called_once()
        runtime.start.assert_awaited_once()
        runtime.close.assert_not_awaited()
        assert client.get("/health/live").status_code == 200
    runtime.close.assert_awaited_once()


def test_startup_failure_still_closes_resources(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime = Mock(
        start=AsyncMock(side_effect=RuntimeError("startup failed")), close=AsyncMock()
    )
    monkeypatch.setattr(main, "build_api_runtime", Mock(return_value=runtime))
    application = main.create_app(Settings(app_env="development", _env_file=None))
    with pytest.raises(RuntimeError, match="startup failed"), TestClient(application):
        pass
    runtime.close.assert_awaited_once()
