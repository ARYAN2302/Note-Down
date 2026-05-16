import pytest


@pytest.mark.asyncio
async def test_ai_endpoints_reject_empty_notes(client, auth_headers):
    create = await client.post("/notes", headers=auth_headers, json={"title": "Empty", "content": ""})
    note_id = create.json()["id"]
    for path in ["summarise", "suggest-tags", "continue"]:
        response = await client.post(f"/notes/{note_id}/{path}", headers=auth_headers)
        assert response.status_code == 400
        assert response.json() == {"detail": "Note has no content to process"}


@pytest.mark.asyncio
async def test_about_and_openapi_are_available(client):
    about = await client.get("/about")
    assert about.status_code == 200
    assert "features" in about.json()
    openapi = await client.get("/openapi.json")
    assert openapi.status_code == 200
    assert openapi.json()["openapi"].startswith("3.")
