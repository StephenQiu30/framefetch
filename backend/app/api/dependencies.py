"""Request-scoped dependencies shared by API routes."""

from __future__ import annotations

from typing import Annotated, cast

from fastapi import Header, Request
from starlette.requests import HTTPConnection

from app.core.config import Settings
from app.core.errors import AppError
from app.runtime import (
    AnalysisUseCases,
    ApiServices,
    DocumentImportUseCases,
    DownloadUseCases,
    MediaImportUseCases,
    SourceDiscoveryUseCases,
)
from app.services.ai_providers import AiProviderService
from app.services.downloads import DownloadArtifactStorage
from app.services.provider_catalog import ProviderCatalogService
from app.services.providers import ProviderStatusView
from app.services.storage_files import StorageFileService

IdempotencyKey = Annotated[
    str,
    Header(
        alias="Idempotency-Key",
        description="同一业务操作的安全重试必须复用相同键值。",
        examples=["01J4Z3Q9A7M2F6K8P0R1T5V7WX"],
        min_length=1,
        max_length=128,
    ),
]


def get_runtime_settings(request: Request) -> Settings:
    return cast(Settings, request.app.state.settings)


def get_download_storage(request: Request) -> DownloadArtifactStorage:
    return require_service(get_services(request).download_storage, "download storage")


def get_download_use_cases(request: Request) -> DownloadUseCases:
    return require_service(get_services(request).download_use_cases, "download")


def get_source_discovery_use_cases(request: Request) -> SourceDiscoveryUseCases:
    return require_service(
        get_services(request).source_discovery_use_cases, "source discovery"
    )


def get_analysis_use_cases(request: Request) -> AnalysisUseCases:
    return require_service(get_services(request).analysis_use_cases, "analysis")


def get_media_import_use_cases(request: Request) -> MediaImportUseCases:
    return require_service(get_services(request).media_import_use_cases, "media import")


def get_document_import_use_cases(request: Request) -> DocumentImportUseCases:
    return require_service(
        get_services(request).document_import_use_cases, "document import"
    )


def get_provider_catalog_service(request: Request) -> ProviderCatalogService:
    return require_service(
        get_services(request).provider_catalog_service, "Provider catalog"
    )


def get_ai_provider_service(request: Request) -> AiProviderService:
    return require_service(get_services(request).ai_provider_service, "AI Provider")


def get_storage_file_service(request: Request) -> StorageFileService:
    return require_service(get_services(request).storage_file_service, "storage file")


async def get_provider_statuses(request: Request) -> tuple[ProviderStatusView, ...]:
    service = get_services(request).provider_status_service
    if service is not None:
        return await service.list()
    return cast(tuple[ProviderStatusView, ...], request.app.state.provider_statuses)


def get_services(connection: HTTPConnection) -> ApiServices:
    return cast(ApiServices, connection.app.state.services)


def require_service[T](service: T | None, name: str) -> T:
    if service is None:
        raise AppError(
            status=503,
            code="service_unavailable",
            title="Service unavailable",
            detail=f"The {name} service is not available.",
        )
    return service
