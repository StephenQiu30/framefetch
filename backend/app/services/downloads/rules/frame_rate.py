"""Frame-rate facts shared by candidate inspection and final validation."""

import math
from collections.abc import Mapping
from fractions import Fraction

from app.services.downloads.rules.enums import FpsBucket


def probe_frame_rate(
    video: Mapping[str, object], *, allow_nominal_fps: bool = False
) -> float | None:
    presentation = video.get("_framefetch_presentation")
    if isinstance(presentation, Mapping):
        if (
            presentation.get("complete") is not True
            or presentation.get("source") != "full_presentation_timeline"
        ):
            return None
        average_rate = _positive_fraction(presentation.get("average_rate_lower_bound"))
        sustained_rate = _positive_fraction(presentation.get("sustained_rate"))
        if average_rate is None:
            return None
        return float(max(average_rate, sustained_rate or average_rate))
    average = _positive_fraction(video.get("avg_frame_rate"))
    nominal = _positive_fraction(video.get("r_frame_rate"))
    if average is None:
        # Only a deliberately bounded codec-header probe can use its nominal
        # rate. A remote demuxer's timestamp base is not an observed average.
        width, height = video.get("width"), video.get("height")
        header_complete = (
            isinstance(video.get("codec_name"), str)
            and video.get("codec_name") not in {"", "unknown"}
            and type(width) is int
            and width > 0
            and type(height) is int
            and height > 0
        )
        return (
            float(nominal)
            if allow_nominal_fps and header_complete and nominal is not None
            else None
        )
    return float(average)


def _positive_fraction(value: object) -> Fraction | None:
    if isinstance(value, bool):
        return None
    try:
        result = Fraction(str(value))
        return result if result > 0 and math.isfinite(float(result)) else None
    except (ValueError, ZeroDivisionError, OverflowError):
        return None


def needs_local_frame_rate_probe(
    video: Mapping[str, object], *, remote: bool = False
) -> bool:
    """Separate an incomplete remote clock base from conflicting local facts."""
    if isinstance(video.get("_framefetch_presentation"), Mapping):
        return False
    average = _positive_fraction(video.get("avg_frame_rate"))
    nominal = _positive_fraction(video.get("r_frame_rate"))
    if average is None:
        return not remote
    if nominal is None:
        return False
    mismatch = FpsBucket.from_fps(float(average)) is not FpsBucket.from_fps(
        float(nominal)
    )
    return mismatch and (not remote or average > nominal)
