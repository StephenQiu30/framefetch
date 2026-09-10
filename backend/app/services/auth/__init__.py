"""Email and password authentication use cases."""

from app.services.auth.errors import AuthError, AuthErrorCode, SessionRotationConflict
from app.services.auth.models import (
    AccountRecord,
    CurrentUser,
    IssuedTokens,
    ManagedUser,
    ManagedUserPage,
    PasswordCheck,
    SessionGrant,
    TokenClaims,
    UserRole,
)
from app.services.auth.service import AuthService
from app.services.auth.user_service import UserService

__all__ = [
    "AccountRecord",
    "AuthError",
    "AuthErrorCode",
    "AuthService",
    "CurrentUser",
    "IssuedTokens",
    "ManagedUser",
    "ManagedUserPage",
    "PasswordCheck",
    "SessionGrant",
    "SessionRotationConflict",
    "TokenClaims",
    "UserRole",
    "UserService",
]
