from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.schemas.auth import AboutResponse
from app.services.note_service import build_note_response, get_public_note

router = APIRouter(tags=["misc"])


@router.get("/about", response_model=AboutResponse)
async def about() -> dict:
    return {
        "name": settings.ABOUT_NAME,
        "email": str(settings.ABOUT_EMAIL),
        "my features": {
            "version_history": "Every save snapshots the previous content. Users can browse and restore any prior version via GET /notes/{id}/history.",
            "ai_summarise": "POST /notes/{id}/summarise uses Gemini Flash 2.5 to return a 2-3 sentence TL;DR of any note.",
            "ai_suggest_tags": "POST /notes/{id}/suggest-tags asks Gemini to read the note and suggest up to 5 relevant tags.",
            "ai_continue_writing": "POST /notes/{id}/continue sends the note content to Gemini and returns a continuation paragraph.",
            "public_link_sharing": "POST /notes/{id}/public-link generates a shareable URL token. Anyone with the link can read the note without logging in.",
            "rich_tag_system": "Notes support coloured tags with full CRUD. Tags are scoped per user and support multi-tag filtering.",
            "full_text_search": "GET /search?q= uses PostgreSQL tsvector GIN index for fast full-text search across all accessible notes.",
            "pin_and_archive": "Notes support pinned (always-first) and archived states, giving users lightweight organisation without deletion.",
            "soft_delete_trash": "DELETE moves notes to trash instead of destroying them. GET /notes?status=trashed lets users restore or permanently delete.",
            "share_permissions": "Sharing supports viewer and editor roles. Editors can modify content; viewers can only read.",
        },
    }


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/shared/{token}")
async def shared_note(token: str, session: AsyncSession = Depends(get_db)) -> dict:
    note = await get_public_note(session, token)
    return await build_note_response(note)
