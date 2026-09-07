"""Authentication, cookie and admission dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.dependencies import get_runtime_settings, get_services, require_service
from app.core.config import Settings
from app.core.errors import AppError
from app.services.auth import (
    AuthError,
    AuthService,
    CurrentUser,
    SessionGrant,
    UserRole,
    UserService,
)

native_bearer = HTTPBearer(auto_error=False, scheme_name="NativeBearerAuth")


def get_auth_service(request: Request) -> AuthService:
    return require_service(get_services(request).auth_service, "authentication")


def get_user_service(request: Request) -> UserService:
    return require_service(get_services(request).user_service, "user")


async def get_current_user(
    request: Request,
    settings: Annotated[Settings, Depends(get_runtime_settings)],
    auth: Annotated[AuthService, Depends(get_auth_service)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(native_bearer)],
) -> CurrentUser:
    authorization = request.headers.get("authorization")
    access_token: str | None
    if authorization is not None:
        if credentials is None or credentials.scheme.casefold() != "bearer":
            raise _unauthenticated()
        access_token = credentials.credentials
    else:
        access_token = request.cookies.get(settings.auth_access_cookie_name)
    if access_token:
        try:
            user = await auth.current_user(access_token)
        except AuthError:
            user = None
    else:
        user = None
    if user is None:
        raise _unauthenticated()
    return user


async def get_current_admin(
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CurrentUser:
    if user.role is not UserRole.ADMIN:
        raise AppError(
            status=403,
            code="forbidden",
            title="Forbidden",
            detail="Administrator access is required.",
        )
    return user


def set_auth_cookies(
    response: Response, settings: Settings, grant: SessionGrant
) -> None:
    response.set_cookie(
        key=settings.auth_access_cookie_name,
        value=grant.access_token,
        max_age=settings.auth_access_token_ttl_seconds,
        httponly=True,
        secure=settings.app_env in {"staging", "production"},
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key=settings.auth_refresh_cookie_name,
        value=grant.refresh_token,
        max_age=settings.auth_refresh_token_ttl_seconds,
        httponly=True,
        secure=settings.app_env in {"staging", "production"},
        samesite="lax",
        path="/api/auth",
    )


def clear_auth_cookies(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.auth_access_cookie_name,
        httponly=True,
        secure=settings.app_env in {"staging", "production"},
        samesite="lax",
        path="/",
    )
    response.delete_cookie(
        key=settings.auth_refresh_cookie_name,
        httponly=True,
        secure=settings.app_env in {"staging", "production"},
        samesite="lax",
        path="/api/auth",
    )


def _unauthenticated() -> AppError:
    return AppError(
        status=401,
        code="unauthenticated",
        title="Authentication required",
        detail="Sign in to continue.",
    )
