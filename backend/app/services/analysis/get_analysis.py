from __future__ import annotations

from uuid import UUID

from app.services.analysis.errors import (
    AnalysisApplicationError,
    AnalysisApplicationErrorCode,
)
from app.services.analysis.models import AnalysisJobView
from app.services.analysis.ports import AnalysisRepository
from app.services.analysis.validation import validate_owner_hash
from app.services.analysis.views import analysis_job_view


class GetAnalysis:
    def __init__(self, repository: AnalysisRepository) -> None:
        self._repository = repository

    async def __call__(self, job_id: UUID, owner_hash: str) -> AnalysisJobView:
        owner_hash = validate_owner_hash(owner_hash)
        snapshot = await self._repository.get_job(job_id)
        if snapshot is None or snapshot.owner_hash != owner_hash:
            raise AnalysisApplicationError(AnalysisApplicationErrorCode.NOT_FOUND)

        result = await self._repository.get_result(job_id)
        report = await self._repository.get_latest_report(job_id)
        if snapshot.status == "succeeded" and result is None:
            raise AnalysisApplicationError(AnalysisApplicationErrorCode.INTERNAL_ERROR)
        return analysis_job_view(snapshot, result=result, report=report)
