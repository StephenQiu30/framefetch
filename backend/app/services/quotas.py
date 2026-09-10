"""User-owned admission budgets, independent of HTTP and persistence."""

from dataclasses import dataclass, replace


class QuotaExceeded(Exception):
    def __init__(self, code: str, *, retry_after: int = 60) -> None:
        super().__init__(code)
        self.code = code
        self.retry_after = retry_after


@dataclass(frozen=True)
class QuotaPolicy:
    max_active_per_owner: int = 5
    daily_tasks: int = 50
    daily_bytes: int = 100 * 1024**3
    storage_bytes: int = 100 * 1024**3
    daily_analysis_attempts: int = 60
    download_bytes: int = 20 * 1024**3
    document_normalized_bytes: int = 8_000_000
    report_bytes: int = 16 * 1024**2
    thumbnail_bytes: int = 2_000_000

    def __post_init__(self) -> None:
        if any(value <= 0 for value in vars(self).values()):
            raise ValueError("quota limits must be positive")


@dataclass(frozen=True, slots=True)
class UserQuota:
    """Optional administrator overrides for one user's business quota."""

    exempt: bool = False
    max_active_per_owner: int | None = None
    daily_tasks: int | None = None
    daily_bytes: int | None = None
    storage_bytes: int | None = None
    daily_analysis_attempts: int | None = None

    def __post_init__(self) -> None:
        values = (
            self.max_active_per_owner,
            self.daily_tasks,
            self.daily_bytes,
            self.storage_bytes,
            self.daily_analysis_attempts,
        )
        if any(value is not None and value <= 0 for value in values):
            raise ValueError("user quota overrides must be positive")

    def apply(self, defaults: QuotaPolicy) -> QuotaPolicy:
        values = {
            field: value
            for field in (
                "max_active_per_owner",
                "daily_tasks",
                "daily_bytes",
                "storage_bytes",
                "daily_analysis_attempts",
            )
            if (value := getattr(self, field)) is not None
        }
        return replace(defaults, **values)


DEFAULT_USER_QUOTA = UserQuota()
