import os
import sys
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-with-32-characters!!")
os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("ABOUT_NAME", "Test User")
os.environ.setdefault("ABOUT_EMAIL", "test@example.com")

sys.path.append(str(Path(__file__).resolve().parents[1]))

from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.database import Base, engine
from app.main import app
from app.models import *  # noqa: F403


@pytest_asyncio.fixture(autouse=True)
async def reset_database() -> AsyncGenerator[None, None]:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    storage = getattr(app.state.limiter, "_storage", None)
    if storage and hasattr(storage, "reset"):
        storage.reset()
    yield


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    await client.post("/register", json={"email": "owner@example.com", "password": "secure123"})
    response = await client.post("/login", json={"email": "owner@example.com", "password": "secure123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
