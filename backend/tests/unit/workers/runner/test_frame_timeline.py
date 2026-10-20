from fractions import Fraction

import pytest
from app.services.downloads.rules.enums import FpsBucket
from app.services.downloads.rules.frame_timeline import InvalidPresentationTimeline


def timeline(points, time_base="1/90000"):
    from app.services.downloads.rules.frame_timeline import PresentationTimeline

    reader = PresentationTimeline(Fraction(time_base))
    payload = b"".join(f"best_effort_timestamp={p}\n".encode() for p in points)
    # The pipe may split any field or timestamp across arbitrary chunks.
    for offset in range(0, len(payload), 17):
        reader.consume(payload[offset : offset + 17])
    return reader.finish()


@pytest.mark.parametrize(
    "rate",
    [
        Fraction(24000, 1001),
        24,
        25,
        Fraction(30000, 1001),
        30,
        50,
        Fraction(60000, 1001),
        60,
        120,
    ],
)
def test_full_timeline_measures_common_rates_without_trusting_metadata(rate):
    quantum = Fraction(1, 1000)
    points = [round(i / Fraction(rate) / quantum) for i in range(180)]
    facts = timeline(points, "1/1000")
    expected = (
        FpsBucket.FPS_30
        if rate <= 30
        else FpsBucket.FPS_60
        if rate <= 60
        else FpsBucket.ABOVE_60
    )
    assert FpsBucket.from_fps(facts.fps) is expected
    assert facts.frames == 180


def test_edit_list_and_short_terminal_interval_do_not_change_cadence_bucket():
    # Independent presentation timeline: a quantized 30fps cadence with a
    # shortened final interval, not encoded sample_count / edited duration.
    points = [i * 300000 - (i // 32) * 100 for i in range(487)]
    points.append(points[-1] + 178500)
    facts = timeline(points, "1/9000000")
    assert facts.frames == 488
    assert FpsBucket.from_fps(facts.fps) is FpsBucket.FPS_30


def test_sustained_high_rate_cannot_hide_behind_a_low_whole_file_average():
    slow = [i * 6000 for i in range(120)]  # 15fps
    fast = [slow[-1] + (i + 1) * 1500 for i in range(120)]  # 60fps
    facts = timeline(slow + fast)
    assert FpsBucket.from_fps(facts.fps) is FpsBucket.FPS_60


def test_real_rate_above_30_is_not_rounded_to_nominal_30():
    facts = timeline([round(i * 90000 / 30.2) for i in range(180)])
    assert FpsBucket.from_fps(facts.fps) is FpsBucket.FPS_60


@pytest.mark.parametrize(
    "points", [[0, 3000, 3000, 6000], [0, 3000, 2000, 6000], [0, 3000]]
)
def test_missing_or_nonmonotonic_presentation_evidence_is_rejected(points):
    with pytest.raises(InvalidPresentationTimeline) as caught:
        timeline(points)
    assert str(caught.value) == "frame_timeline_invalid"


def test_streaming_parser_bounds_malformed_line_memory():
    from app.services.downloads.rules.frame_timeline import PresentationTimeline

    reader = PresentationTimeline(Fraction(1, 90000))
    for _ in range(100):
        reader.consume(b"x" * 8192)
    with pytest.raises(InvalidPresentationTimeline) as caught:
        reader.finish()
    assert str(caught.value) == "frame_timeline_invalid"


def test_coarse_clock_does_not_hide_a_sustained_slightly_above_30_vfr_section():
    slow = [round(i * 1000 / 15) for i in range(180)]
    fast = [slow[-1] + round((i + 1) * 1000 / 30.2) for i in range(180)]
    facts = timeline(slow + fast, "1/1000")
    assert FpsBucket.from_fps(facts.fps) is FpsBucket.FPS_60


@pytest.mark.parametrize(
    "fast_rate,expected", [(30.2, FpsBucket.FPS_60), (60.2, FpsBucket.ABOVE_60)]
)
def test_long_vfr_section_crosses_its_bucket_even_with_coarse_timestamps(
    fast_rate, expected
):
    points = [round(i * 1000 / 15) for i in range(180)]
    points += [points[-1] + round((i + 1) * 1000 / fast_rate) for i in range(180)]
    assert FpsBucket.from_fps(timeline(points, "1/1000").fps) is expected


@pytest.mark.parametrize("seed", range(5))
def test_streaming_bucket_matches_exhaustive_all_span_reference(seed):
    import random

    randomizer = random.Random(seed)
    # Quantized, mixed cadence with edited boundary frames. The reference
    # enumerates every eligible span, independently of the prefix optimization.
    points = [0]
    for _ in range(100):
        points.append(points[-1] + randomizer.choice([16, 17, 33, 34, 66, 67]))
    inner = points[1:-1]
    rates = [Fraction(len(inner) - 1, inner[-1] - inner[0] + 2) * 1000]
    rates += [
        Fraction(j - i, inner[j] - inner[i] + 2) * 1000
        for i in range(len(inner))
        for j in range(i + 4, len(inner))
    ]
    expected = FpsBucket.from_fps(float(max(rates)))
    assert FpsBucket.from_fps(timeline(points, "1/1000").fps) is expected
