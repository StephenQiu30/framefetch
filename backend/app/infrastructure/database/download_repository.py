"""Download persistence composed from explicit transaction capabilities."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.application.quotas import QuotaPolicy

from .access_repository import AccessRepository
from .analytics_repository import AnalyticsRepository
from .completion_repository import CompletionRepository
from .download_delete_repository import DownloadDeleteRepository
from .job_repository import JobRepository
from .media_repository import MediaRepository
from .progress_repository import ProgressRepository
from .recovery_repository import RecoveryRepository


class SqlAlchemyDownloadRepository:
    def __init__(
        self,
        sessions: async_sessionmaker[AsyncSession],
        *,
        quota_policy: QuotaPolicy | None = None,
    ) -> None:
        access = AccessRepository(sessions, quota_policy=quota_policy)
        self.list_missing_download_thumbnails = access.list_missing_download_thumbnails
        self.get_download_presentation = access.get_download_presentation
        self.get_thumbnail_source = access.get_thumbnail_source
        self.save_thumbnail = access.save_thumbnail
        self.get_download_thumbnail_source = access.get_download_thumbnail_source
        self.save_download_thumbnail = access.save_download_thumbnail
        self.list_download_history = access.list_download_history
        self.get_job_source = access.get_job_source
        self.cancel_job = access.cancel_job
        self.get_artifact = access.get_artifact
        download_delete = DownloadDeleteRepository(sessions, quota_policy=quota_policy)
        self.prepare_download_deletion = download_delete.prepare_download_deletion
        self.finish_download_deletion = download_delete.finish_download_deletion
        analytics = AnalyticsRepository(sessions, quota_policy=quota_policy)
        self.get_download_analytics = analytics.get_download_analytics
        recovery = RecoveryRepository(sessions, quota_policy=quota_policy)
        self.recover_stale_queued = recovery.recover_stale_queued
        self.reclaim_stale = recovery.reclaim_stale
        self.release_ready_retries = recovery.release_ready_retries
        completion = CompletionRepository(sessions, quota_policy=quota_policy)
        self.complete_success = completion.complete_success
        self.complete_failure = completion.complete_failure
        progress = ProgressRepository(sessions, quota_policy=quota_policy)
        self.heartbeat = progress.heartbeat
        job = JobRepository(sessions, quota_policy=quota_policy)
        self.create_job = job.create_job
        self.get_job = job.get_job
        self.claim_job = job.claim_job
        media = MediaRepository(sessions, quota_policy=quota_policy)
        self.save_inspection = media.save_inspection
        self.get_inspection = media.get_inspection
