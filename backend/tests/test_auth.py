import pytest


@pytest.mark.asyncio
async def test_register_success(client):
    response = await client.post("/register", json={"email": "new@example.com", "password": "secure123"})
    assert response.status_code == 201
    assert response.json() == {"message": "User registered successfully"}


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(client):
    await client.post("/register", json={"email": "dup@example.com", "password": "secure123"})
    response = await client.post("/register", json={"email": "dup@example.com", "password": "secure123"})
    assert response.status_code == 409
    assert response.json() == {"detail": "Email already registered"}


@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    await client.post("/register", json={"email": "login@example.com", "password": "secure123"})
    response = await client.post("/login", json={"email": "login@example.com", "password": "badpass123"})
    assert response.status_code == 401
    assert response.json() == {"message": "Invalid email or password"}


@pytest.mark.asyncio
async def test_refresh_issues_new_access_token(client):
    await client.post("/register", json={"email": "refresh@example.com", "password": "secure123"})
    await client.post("/login", json={"email": "refresh@example.com", "password": "secure123"})
    response = await client.post("/refresh")
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_returns_access_token_only(client):
    await client.post("/register", json={"email": "shape@example.com", "password": "secure123"})
    response = await client.post("/login", json={"email": "shape@example.com", "password": "secure123"})
    assert response.status_code == 200
    assert set(response.json().keys()) == {"access_token"}
