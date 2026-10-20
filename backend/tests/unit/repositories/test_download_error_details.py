from datetime import UTC, datetime
from uuid import uuid4

from app.models import DownloadJobRow
from app.repositories.downloads.repository import SqlAlchemyDownloadRepository
from app.schemas.downloads import DownloadResponse
from app.services.downloads.views import download_view
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker


async def test_persisted_failure_message_reaches_download_response(
    postgres_engine: AsyncEngine,
) -> None:
    sessions = async_sessionmaker(postgres_engine, expire_on_commit=False)
    job_id = uuid4()
    now = datetime.now(UTC)
    async with sessions.begin() as session:
        session.add(
            DownloadJobRow(
                id=job_id,
                source_kind="browser_import",
                inspection_id=None,
                format_id=None,
                owner_hash="a" * 64,
                idempotency_key="failure-message",
                request_fingerprint="b" * 64,
                semantic_plan={},
                status="failed",
                error_code="provider_content_restricted",
                error_message="内容访问受限",
                finished_at=now,
            )
        )
    repository = SqlAlchemyDownloadRepository(sessions)
    store = repository
    response = DownloadResponse.from_view(download_view(await store.get_job(job_id)))
    assert response.error_message == "内容访问受限"


async def test_validation_evidence_is_atomic_with_terminal_event():
    from pathlib import Path

    from tests.integration.test_execution_context_schema import apply_schema
    from tests.postgres import isolated_postgres_engine

    sql = (Path(__file__).resolve().parents[3] / "sql/schema.sql").read_text()
    async with isolated_postgres_engine() as postgres_engine:
        await apply_schema(postgres_engine, sql)
        from datetime import timedelta

        from app.models import TaskEventRow
        from app.services.provider_failures import FailurePhase, ProviderFailure
        from sqlalchemy import select

        sessions = async_sessionmaker(postgres_engine, expire_on_commit=False)
        job_id = uuid4()
        now = datetime.now(UTC)
        async with sessions.begin() as session:
            session.add(
                DownloadJobRow(
                    id=job_id,
                    source_kind="browser_import",
                    owner_hash="c" * 64,
                    idempotency_key="validation-evidence",
                    request_fingerprint="d" * 64,
                    semantic_plan={},
                    status="running",
                    attempt=1,
                    lease_owner="worker",
                    lease_expires_at=now + timedelta(minutes=1),
                )
            )
        fact = ProviderFailure.for_code(
            "invalid_artifact",
            phase=FailurePhase.VALIDATE,
            cause_code="frame_rate_mismatch",
        )
        repository = SqlAlchemyDownloadRepository(sessions)
        await repository.complete_failure(
            job_id,
            "worker",
            1,
            error_code="media_validation_failed",
            error_message="文件校验未通过：实际帧率与确认规格不一致。",
            failure=fact,
            retryable=False,
            now=now,
        )
        async with sessions() as session:
            row = await session.get(DownloadJobRow, job_id)
            event = await session.scalar(
                select(TaskEventRow)
                .where(TaskEventRow.task_id == job_id)
                .order_by(TaskEventRow.version.desc())
            )
            assert row.failure_details["cause_code"] == "frame_rate_mismatch"
            assert (
                event.payload["error"]["details"]["cause_code"] == "frame_rate_mismatch"
            )
            assert event.payload["error"]["details"]["stage"] == "validate"
