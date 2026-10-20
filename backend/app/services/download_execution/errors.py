from __future__ import annotations

from app.services.downloads.rules.enums import DownloadErrorCode
from app.services.provider_failures import (
    FailureClass,
    FailureEvidenceKind,
    FailurePhase,
    ProviderFailure,
    failure_definition,
)


class ExecutionPersistenceUnavailable(RuntimeError):
    pass


class ExecutionSourceUnavailable(RuntimeError):
    pass


class ExecutionOwnershipLost(RuntimeError):
    pass


class LeaseLost(RuntimeError):
    pass


class LeaseInfrastructureError(RuntimeError):
    pass


class ArtifactValidationError(RuntimeError):
    pass


_RUNNER_CODES = {
    "media_validation_failed": DownloadErrorCode.MEDIA_VALIDATION_FAILED,
    "invalid_artifact": DownloadErrorCode.MEDIA_VALIDATION_FAILED,
    "media_probe_failed": DownloadErrorCode.MEDIA_VALIDATION_FAILED,
    "invalid_artifact_path": DownloadErrorCode.MEDIA_VALIDATION_FAILED,
    "invalid_runner_response": DownloadErrorCode.RUNTIME_UNAVAILABLE,
    "workspace_limit_exceeded": DownloadErrorCode.OUTPUT_LIMIT_EXCEEDED,
    "output_limit_exceeded": DownloadErrorCode.OUTPUT_LIMIT_EXCEEDED,
    "cancelled": DownloadErrorCode.CANCELLED,
}


def classify_runner_failure(error: BaseException) -> DownloadErrorCode:
    code = getattr(error, "code", None)
    if isinstance(code, str):
        known = _RUNNER_CODES.get(code)
        if known is not None:
            return known
        failure = getattr(error, "failure", None)
        if (
            isinstance(failure, ProviderFailure)
            and failure.failure_class is FailureClass.EXTRACTOR_BROKEN
            and failure.phase is FailurePhase.VALIDATE
            and failure.evidence_kind is FailureEvidenceKind.LOCAL_VALIDATION
        ):
            return DownloadErrorCode.MEDIA_VALIDATION_FAILED
        kind, _, _ = failure_definition(code)
        return DownloadErrorCode(kind.value)
    return DownloadErrorCode.RUNTIME_UNAVAILABLE


_VALIDATION_REASONS = {
    "frame_rate_mismatch": "实际帧率与确认规格不一致",
    "frame_timeline_invalid": "无法取得完整有效的播放时间线",
    "full_decode_failed": "完整音视频解码未通过",
    "container_mismatch": "文件容器与确认规格不一致",
    "video_stream_count": "视频轨道数量不符合要求",
    "dynamic_range_mismatch": "动态范围与确认规格不一致",
    "dimensions_mismatch": "画面尺寸与确认规格不一致",
    "video_codec_mismatch": "视频编码与确认规格不一致",
    "audio_codec_mismatch": "音轨与确认规格不一致",
    "duration_mismatch": "文件或音视频轨时长与完整时长不一致",
}


def validation_failure_message(error: BaseException) -> str:
    failure = getattr(error, "failure", None)
    if (
        not isinstance(failure, ProviderFailure)
        or failure.phase is not FailurePhase.VALIDATE
        or classify_runner_failure(error)
        is not DownloadErrorCode.MEDIA_VALIDATION_FAILED
    ):
        return str(error)
    reason = _VALIDATION_REASONS.get(failure.cause_code or "")
    if reason is None:
        return "文件校验未通过：文件内容与确认规格不一致。"
    evidence = failure.evidence
    details = ""
    if "expected" in evidence and "observed" in evidence:
        details = f"（期望 {evidence['expected']}，实测 {evidence['observed']}）"
    return f"文件校验未通过：{reason}{details}。"
