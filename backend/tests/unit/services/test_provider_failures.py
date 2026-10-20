"""The rebuilt engine exposes exactly thirteen failure classes and safe summaries."""

from datetime import UTC, datetime, timedelta

import pytest
from app.schemas.download_intents import IntentFailureResponse
from app.services.download_execution.errors import classify_runner_failure
from app.services.downloads.rules.enums import DownloadErrorCode
from app.services.provider_failures import (
    FailureClass,
    FailureEvidenceKind,
    FailurePhase,
    ProviderFailure,
    parse_retry_after,
)
from app.workers.runner.errors import RunnerFailure


@pytest.mark.parametrize("kind", list(FailureClass))
def test_every_engine_failure_has_an_execution_location(kind):
    failure = ProviderFailure.for_code(kind.value, layer="L1")
    assert failure.failure_class is kind
    projection = IntentFailureResponse.from_failure(failure).model_dump()
    assert set(projection) == {
        "code",
        "failure_class",
        "layer",
        "stage",
        "gate",
        "evidence",
        "summary",
    }
    assert projection["stage"] == "resolve"
    assert classify_runner_failure(RunnerFailure(kind.value)) is DownloadErrorCode(
        kind.value
    )


def test_failures_use_only_the_thirteen_design_categories():
    assert {kind.value for kind in FailureClass} == {
        "network_blocked",
        "challenge",
        "login_required",
        "identity_unavailable",
        "rate_limited",
        "context_changed",
        "content_unavailable",
        "content_protected",
        "extractor_broken",
        "format_unavailable",
        "transient",
        "invalid_input",
        "runtime_unavailable",
    }


def test_validation_and_download_failures_keep_stage():
    assert (
        ProviderFailure.for_code("invalid_artifact", phase=FailurePhase.VALIDATE).stage
        == "validate"
    )
    assert (
        ProviderFailure.for_code("transient", phase=FailurePhase.TRANSFER).stage
        == "download"
    )


def test_retry_after_remains_bounded_and_timezone_aware():
    now = datetime(2026, 10, 1, tzinfo=UTC)
    assert parse_retry_after("60", now) == now + timedelta(seconds=60)
    for value in (None, "-1", "invalid", "9" * 129, "9" * 128):
        assert parse_retry_after(value, now) is None


def test_failure_execution_location_is_validated():
    with pytest.raises(ValueError):
        ProviderFailure.for_code("transient", layer="unknown")


def test_publish_failures_keep_stage_and_bounded_evidence():
    failure = ProviderFailure.for_code(
        "publish_failed",
        phase=FailurePhase.PUBLISH,
        gate="③",
        evidence={"kind": "unknown", "cause_code": "storage_unavailable"},
    )
    assert failure.stage == "publish" and failure.gate == "③"
    with pytest.raises(ValueError, match="unsupported facts"):
        ProviderFailure.for_code(
            "transient", evidence={"kind": "unknown", "stderr": "private response"}
        )
    with pytest.raises(ValueError, match="gate"):
        ProviderFailure.for_code("transient", gate="invalid")


@pytest.mark.parametrize(
    "code,scope,phase",
    [
        ("network_blocked", "route", "fetch_metadata"),
        ("identity_unavailable", "runtime", "prepare_context"),
        ("runtime_unavailable", "runtime", "prepare_context"),
        ("extractor_broken", "dependency", "fetch_metadata"),
        ("context_changed", "content", "select_format"),
    ],
)
def test_canonical_codes_keep_their_recovery_boundary(code, scope, phase):
    failure = ProviderFailure.for_code(code)
    assert failure.scope == scope and failure.phase == phase


@pytest.mark.parametrize(
    "facts",
    [
        {"client": "https://secret.example/cookie"},
        {"egress_observed_ip": "secret"},
        {"identity_used": "true"},
        {"identity_digest": "secret"},
        {"cookie": "secret"},
        {"egress_class": "anything"},
        {"layer": "L2"},
    ],
)
def test_failure_attempt_evidence_rejects_secrets_and_invalid_facts(facts):
    with pytest.raises(ValueError):
        ProviderFailure.for_code(
            "network_blocked", evidence={"kind": "unknown", **facts}
        )


@pytest.mark.parametrize(
    "phase,evidence",
    [
        (FailurePhase.FETCH_METADATA, "local_validation"),
        (FailurePhase.VALIDATE, "upstream_response"),
    ],
)
def test_extractor_failure_is_not_relabelled_as_local_file_validation(phase, evidence):
    from app.services.provider_failures import FailureEvidenceKind

    error = RunnerFailure(
        "extractor_broken", phase=phase, evidence_kind=FailureEvidenceKind(evidence)
    )
    assert classify_runner_failure(error) is DownloadErrorCode.EXTRACTOR_BROKEN


def test_local_validation_keeps_safe_comparison_evidence():
    facts = {
        "kind": "local_validation",
        "validation_rule": "frame_rate_mismatch",
        "expected": "fps_30",
        "observed": "fps_60",
        "evidence_source": "full_presentation_timeline",
        "observed_fps": "60000/1001",
        "decoded_frames": 488,
    }
    failure = ProviderFailure.for_code(
        "invalid_artifact",
        phase=FailurePhase.VALIDATE,
        evidence_kind=FailureEvidenceKind.LOCAL_VALIDATION,
        evidence=facts,
    )
    assert failure.evidence == facts


@pytest.mark.parametrize(
    "facts",
    [
        {"expected": "https://secret.example/media"},
        {"observed": {"cookie": "secret"}},
        {"evidence_source": "upstream_cookie"},
        {"observed_fps": "NaN"},
        {"observed_fps": "30/0"},
        {"decoded_frames": True},
        {"decoded_frames": -1},
        {"raw_timestamps": [1, 2, 3]},
    ],
)
def test_validation_evidence_rejects_secrets_and_malformed_comparisons(facts):
    with pytest.raises(ValueError):
        ProviderFailure.for_code(
            "invalid_artifact",
            phase=FailurePhase.VALIDATE,
            evidence_kind=FailureEvidenceKind.LOCAL_VALIDATION,
            evidence={"kind": "local_validation", **facts},
        )


def test_validation_timeout_is_not_reported_as_a_damaged_file():
    from app.services.download_execution.errors import validation_failure_message

    error = RunnerFailure("download_timeout", phase=FailurePhase.VALIDATE)
    assert not validation_failure_message(error).startswith("文件校验未通过")
