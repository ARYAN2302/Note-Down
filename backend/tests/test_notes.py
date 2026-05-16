import pytest


@pytest.mark.asyncio
async def test_notes_require_auth(client):
    response = await client.get("/notes")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_and_list_notes(client, auth_headers):
    create = await client.post("/notes", headers=auth_headers, json={"title": "First", "content": "Hello"})
    assert create.status_code == 201
    listing = await client.get("/notes", headers=auth_headers)
    assert listing.status_code == 200
    payload = listing.json()
    assert isinstance(payload, list)
    assert payload[0]["title"] == "First"

    paged = await client.get("/notes/paged", headers=auth_headers)
    assert paged.status_code == 200
    assert paged.json()["total"] == 1


@pytest.mark.asyncio
async def test_get_note_hidden_as_404(client, auth_headers):
    response = await client.get("/notes/11111111-1111-1111-1111-111111111111", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_note_soft_deletes(client, auth_headers):
    create = await client.post("/notes", headers=auth_headers, json={"title": "Trash", "content": "Soon"})
    note_id = create.json()["id"]
    delete = await client.delete(f"/notes/{note_id}", headers=auth_headers)
    assert delete.status_code == 204
    trashed = await client.get("/notes", headers=auth_headers, params={"status": "trashed"})
    assert trashed.status_code == 200
    assert trashed.json()[0]["status"] == "trashed"
