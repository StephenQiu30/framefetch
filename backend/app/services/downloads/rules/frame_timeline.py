"""Bounded statistics of decoded presentation timestamps, never coded sample counts."""

from collections import deque
from dataclasses import dataclass
from fractions import Fraction

from app.services.downloads.rules.enums import FPS_BUCKET_CEILINGS


class InvalidPresentationTimeline(ValueError):
    """Complete presentation evidence could not be established."""


@dataclass(frozen=True, slots=True)
class PresentationFacts:
    frames: int
    time_base: Fraction
    first_pts: int
    last_pts: int
    average_rate: Fraction
    average_rate_lower_bound: Fraction
    sustained_rate: Fraction

    @property
    def fps(self) -> float:
        return float(max(self.average_rate_lower_bound, self.sustained_rate))

    def evidence(self) -> dict[str, str | int | bool | None]:
        return {
            "source": "full_presentation_timeline",
            "decoded_frames": self.frames,
            "time_base": str(self.time_base),
            "first_pts": self.first_pts,
            "last_pts": self.last_pts,
            "average_rate": str(self.average_rate),
            "average_rate_lower_bound": str(self.average_rate_lower_bound),
            "sustained_rate": str(self.sustained_rate),
            "complete": True,
        }


class PresentationTimeline:
    """Consume all frames with constant memory; retain no frame list or media data.

    The first/last displayed frame may be clipped by container edits. Measure
    internal intervals, and detect a bucket crossing over any span of at least
    four intervals so coarse-clock rounding cannot hide a longer fast section. Two clock
    ticks cover rounding at the two window endpoints, without changing FPS bins.
    """

    def __init__(self, time_base: Fraction) -> None:
        if time_base <= 0:
            raise ValueError("time base must be positive")
        self._time_base = time_base
        self._buffer = bytearray()
        self._invalid = False
        self._frames = 0
        self._first: int | None = None
        self._previous: int | None = None
        self._inner_first: int | None = None
        self._inner_last: int | None = None
        self._inner_count = 0
        self._window: deque[int] = deque(maxlen=5)
        self._peak = Fraction(0)
        self._best_start: list[tuple[Fraction, int, int] | None] = [
            None for _ in FPS_BUCKET_CEILINGS
        ]

    def consume(self, chunk: bytes) -> None:
        if self._invalid:
            return
        for part in chunk.splitlines(keepends=True):
            self._buffer.extend(part)
            if len(self._buffer) > 1024:
                self._invalid = True
                self._buffer.clear()
                return
            if part.endswith(b"\n"):
                self._line(bytes(self._buffer).strip())
                self._buffer.clear()

    def _line(self, line: bytes) -> None:
        if not line:
            return
        field = line.split(b"|", 1)[0]
        if not field.startswith(b"best_effort_timestamp="):
            self._invalid = True
            return
        try:
            pts = int(field.partition(b"=")[2])
        except ValueError:
            self._invalid = True
            return
        if self._previous is not None:
            if pts <= self._previous:
                self._invalid = True
                return
            # Commit the previous point only once another frame follows it.
            # Thus neither edited endpoint participates in cadence estimation.
            if self._frames >= 2:
                self._observe(self._previous)
        else:
            self._first = pts
        self._previous = pts
        self._frames += 1

    def _observe(self, pts: int) -> None:
        if self._inner_first is None:
            self._inner_first = pts
        self._inner_last = pts
        self._inner_count += 1
        self._window.append(pts)
        if len(self._window) == 5:
            end_index = self._inner_count - 1
            start_index, start_pts = end_index - 4, self._window[0]
            for slot, ceiling in enumerate(FPS_BUCKET_CEILINGS):
                # For threshold R, a span crosses R exactly when
                # (end_pts - end_index/(R*TB)) + 2 is below its start score.
                # The maximum eligible prefix score proves existence over ANY
                # span >=4 intervals, retaining one point per threshold.
                score = start_pts - Fraction(start_index) / (ceiling * self._time_base)
                best = self._best_start[slot]
                if best is None or score > best[0]:
                    best = (score, start_index, start_pts)
                    self._best_start[slot] = best
                lower_rate = (
                    Fraction(end_index - best[1], pts - best[2] + 2) / self._time_base
                )
                self._peak = max(self._peak, lower_rate)

    def finish(self) -> PresentationFacts:
        if self._buffer:
            self._invalid = True
            self._buffer.clear()
        if (
            self._invalid
            or self._inner_first is None
            or self._inner_last is None
            or self._inner_count < 2
            or self._first is None
            or self._previous is None
        ):
            raise InvalidPresentationTimeline("frame_timeline_invalid")
        average = (
            Fraction(self._inner_count - 1, self._inner_last - self._inner_first)
            / self._time_base
        )
        lower_bound = (
            Fraction(self._inner_count - 1, self._inner_last - self._inner_first + 2)
            / self._time_base
        )
        return PresentationFacts(
            self._frames,
            self._time_base,
            self._first,
            self._previous,
            average,
            lower_bound,
            self._peak,
        )
