from app.db.base import as_utc
from app.models import UserRow
from app.services.auth import AccountRecord, CurrentUser, UserRole


def account_from_row(row: UserRow) -> AccountRecord:
    return AccountRecord(
        id=row.id,
        username=row.username,
        email=row.email,
        password_hash=row.password_hash,
        role=UserRole(row.role),
        is_active=row.is_active,
        created_at=as_utc(row.created_at),
        updated_at=as_utc(row.updated_at),
    )


def current_user_from_row(row: UserRow) -> CurrentUser:
    return account_from_row(row).public_view()
