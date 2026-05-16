import pytest


@pytest.mark.asyncio
async def test_shared_note_appears_for_recipient(client, auth_headers):
    await client.post("/register", json={"email": "viewer@example.com", "password": "secure123"})
    note = await client.post("/notes", headers=auth_headers, json={"title": "Shared", "content": "Body"})
    note_id = note.json()["id"]
    share = await client.post(
        f"/notes/{note_id}/share",
        headers=auth_headers,
        json={"share_with_email": "viewer@example.com", "role": "viewer"},
    )
    assert share.status_code == 200
    login = await client.post("/login", json={"email": "viewer@example.com", "password": "secure123"})
    viewer_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    listing = await client.get("/notes", headers=viewer_headers)
    assert listing.status_code == 200
    assert listing.json()[0]["shared_by"] == "owner@example.com"
