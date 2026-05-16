import pytest


@pytest.mark.asyncio
async def test_update_creates_version_and_restore_works(client, auth_headers):
    create = await client.post("/notes", headers=auth_headers, json={"title": "Draft", "content": "v1"})
    note_id = create.json()["id"]
    update = await client.put(f"/notes/{note_id}", headers=auth_headers, json={"title": "Draft", "content": "v2"})
    assert update.status_code == 200
    history = await client.get(f"/notes/{note_id}/history", headers=auth_headers)
    assert history.status_code == 200
    assert history.json()[0]["version_num"] == 1
    restored = await client.post(f"/notes/{note_id}/restore/1", headers=auth_headers)
    assert restored.status_code == 200
    assert restored.json()["content"] == "v1"
