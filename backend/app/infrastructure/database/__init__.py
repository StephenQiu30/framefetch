"""PostgreSQL persistence adapter for inspections, jobs and the outbox."""

from app.application.downloads.analytics_models import (
    DownloadAnalyticsDailySnapshot,
    DownloadAnalyticsSnapshot,
    DownloadAnalyticsSourceSnapshot,
    DownloadAnalyticsSummarySnapshot,
)
from app.application.downloads.download_models import (
    ArtifactSnapshot,
    DownloadCleanupRef,
    DownloadCreate,
    DownloadDeletionPlan,
    DownloadPresentationSnapshot,
    JobSaveResult,
    JobSnapshot,
)
from app.application.downloads.history_models import (
    DownloadHistoryItemSnapshot,
    DownloadHistoryPageSnapshot,
    DownloadHistorySummarySnapshot,
)
from app.application.downloads.inspection_models import (
    FormatCreate,
    FormatSnapshot,
    InspectionCreate,
    InspectionSaveResult,
    InspectionSnapshot,
)
from app.application.downloads.thumbnail import (
    DownloadThumbnailSource,
    ThumbnailObject,
    ThumbnailSource,
)
from app.domain.downloads import build_artifact_object_key

from .base import Base
from .contracts import (
    ArtifactCreate,
    DownloadThumbnailCandidateSnapshot,
    JobSourceSnapshot,
    OutboxSnapshot,
)
from .document_catalog_repository import SqlAlchemyDocumentCatalogRepository
from .document_delete_repository import SqlAlchemyDocumentDeleteRepository
from .document_import_execution_repository import (
    SqlAlchemyDocumentImportExecutionRepository,
)
from .document_import_repository import SqlAlchemyDocumentImportRepository
from .download_repository import SqlAlchemyDownloadRepository
from .errors import (
    IdempotencyConflict,
    LeaseConflict,
    RepositoryConflict,
    RepositoryError,
    RepositoryNotFound,
)
from .media_import_repository import SqlAlchemyMediaImportRepository
from .models import (
    AnalysisArtifactLockRow,
    AnalysisDocumentLockRow,
    AnalysisJobRow,
    AnalysisReportArtifactRow,
    AnalysisReportVersionRow,
    AnalysisResultRow,
    ArtifactRow,
    AuthSessionRow,
    DocumentArtifactRow,
    DocumentImportAttemptRow,
    DocumentRow,
    DownloadJobRow,
    DownloadThumbnailRow,
    MediaFormatRow,
    MediaImportAttemptRow,
    MediaImportRow,
    MediaInspectionRow,
    MediaThumbnailRow,
    OutboxEventRow,
    ProviderCanaryResultRow,
    ProviderCatalogEntryRow,
    TaskEventRow,
    UserRow,
)
from .outbox_repository import SqlAlchemyOutboxRepository
from .session import create_engine, create_session_factory
from .source_discovery_repository import SqlAlchemySourceDiscoveryRepository

__all__ = [
    "ArtifactCreate",
    "ArtifactRow",
    "ArtifactSnapshot",
    "AuthSessionRow",
    "AnalysisArtifactLockRow",
    "AnalysisDocumentLockRow",
    "AnalysisJobRow",
    "AnalysisReportArtifactRow",
    "AnalysisReportVersionRow",
    "AnalysisResultRow",
    "Base",
    "DownloadCreate",
    "DownloadCleanupRef",
    "DownloadDeletionPlan",
    "DownloadAnalyticsDailySnapshot",
    "DownloadAnalyticsSnapshot",
    "DownloadAnalyticsSourceSnapshot",
    "DownloadAnalyticsSummarySnapshot",
    "DownloadHistoryItemSnapshot",
    "DownloadHistoryPageSnapshot",
    "DownloadHistorySummarySnapshot",
    "DownloadPresentationSnapshot",
    "DownloadJobRow",
    "DownloadThumbnailRow",
    "DownloadThumbnailSource",
    "DownloadThumbnailCandidateSnapshot",
    "DocumentArtifactRow",
    "DocumentImportAttemptRow",
    "DocumentRow",
    "FormatCreate",
    "FormatSnapshot",
    "IdempotencyConflict",
    "InspectionCreate",
    "InspectionSaveResult",
    "InspectionSnapshot",
    "JobSaveResult",
    "JobSnapshot",
    "JobSourceSnapshot",
    "LeaseConflict",
    "MediaFormatRow",
    "MediaImportAttemptRow",
    "MediaImportRow",
    "MediaInspectionRow",
    "MediaThumbnailRow",
    "OutboxEventRow",
    "ProviderCanaryResultRow",
    "ProviderCatalogEntryRow",
    "TaskEventRow",
    "OutboxSnapshot",
    "RepositoryConflict",
    "RepositoryError",
    "RepositoryNotFound",
    "ThumbnailObject",
    "ThumbnailSource",
    "SqlAlchemyDownloadRepository",
    "SqlAlchemyOutboxRepository",
    "SqlAlchemyDocumentImportRepository",
    "SqlAlchemyDocumentImportExecutionRepository",
    "SqlAlchemyDocumentCatalogRepository",
    "SqlAlchemyDocumentDeleteRepository",
    "SqlAlchemyMediaImportRepository",
    "SqlAlchemySourceDiscoveryRepository",
    "UserRow",
    "build_artifact_object_key",
    "create_engine",
    "create_session_factory",
]
