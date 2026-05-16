from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import JSONResponse
from slowapi import Limiter
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, MessageResponse, RefreshResponse, RegisterRequest, TokenResponse
from app.services.auth_service import (
    authenticate_user,
    blacklist_token,
    issue_tokens,
    refresh_access_token,
    register_user,
)

router = APIRouter()
limiter = Limiter(key_func=lambda request: request.client.host if request.client else "unknown")


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=MessageResponse)
@limiter.limit("3/minute")
async def register(request: Request, payload: RegisterRequest, session: AsyncSession = Depends(get_db)) -> dict:
    await register_user(session, payload.email, payload.password)
    return {"message": "User registered successfully"}


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/15minutes")
async def login(request: Request, payload: LoginRequest, response: Response, session: AsyncSession = Depends(get_db)) -> dict:
    user = await authenticate_user(session, payload.email, payload.password)
    if not user:
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"message": "Invalid email or password"})
    access_token, refresh_token = issue_tokens(str(user.id))
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax",
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    auth_header = request.headers.get("authorization")
    token = auth_header.split(" ", 1)[1] if auth_header and " " in auth_header else None
    if token:
        await blacklist_token(session, token)
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(request: Request, session: AsyncSession = Depends(get_db)) -> dict:
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": "Missing refresh token"})
    access_token = await refresh_access_token(session, refresh_token)
    return {"access_token": access_token}
