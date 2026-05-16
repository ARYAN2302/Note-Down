from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    validate_password,
    verify_password,
)
from app.models.token_blacklist import TokenBlacklist
from app.models.user import User


async def register_user(session: AsyncSession, email: str, password: str) -> User:
    existing = await session.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    try:
        validate_password(password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    user = User(email=email.lower().strip(), password_hash=get_password_hash(password))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def authenticate_user(session: AsyncSession, email: str, password: str) -> User | None:
    user = await session.scalar(select(User).where(User.email == email.lower().strip()))
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


def issue_tokens(user_id: str) -> tuple[str, str]:
    return create_access_token(user_id), create_refresh_token(user_id)


async def blacklist_token(session: AsyncSession, token: str) -> None:
    payload = decode_token(token)
    expires_at = datetime.fromtimestamp(payload["exp"], tz=UTC)
    entry = TokenBlacklist(jti=payload["jti"], expires_at=expires_at)
    session.add(entry)
    await session.commit()


async def is_token_blacklisted(session: AsyncSession, jti: str) -> bool:
    result = await session.scalar(select(TokenBlacklist).where(TokenBlacklist.jti == jti))
    return result is not None


async def refresh_access_token(session: AsyncSession, refresh_token: str) -> str:
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    if await is_token_blacklisted(session, payload["jti"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return create_access_token(payload["sub"])
