from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from slowapi import Limiter
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import decode_token
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.note import NoteCreate, NoteListResponse, NoteOut, NoteTagUpdate
from app.schemas.share import PublicLinkResponse, ShareCreate, ShareOut
from app.schemas.version import VersionDetail, VersionListItem
from app.services import ai_service
from app.services.note_service import (
    add_tags_to_note,
    build_note_response,
    create_note,
    create_public_link,
    create_tag,
    delete_tag,
    duplicate_note,
    get_note_with_access,
    get_public_note,
    get_version,
    get_versions,
    list_notes,
    list_shares,
    list_tags,
    remove_tag_from_note,
    require_note_owner,
    restore_version,
    revoke_public_link,
    revoke_share,
    set_note_status,
    share_note,
    soft_delete_note,
    toggle_pin,
    touch_last_viewed,
    update_note,
    update_tag,
)

router = APIRouter(prefix="/notes", tags=["notes"])
tag_router = APIRouter(prefix="/tags", tags=["tags"])


def ip_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def user_key(request: Request) -> str:
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token)
            return str(payload.get("sub") or ip_key(request))
        except ValueError:
            return ip_key(request)
    return ip_key(request)


limiter = Limiter(key_func=ip_key)


@router.get("", response_model=NoteListResponse)
async def get_notes(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status_filter: str = Query(default="active", alias="status"),
    sort: str = Query(default="updated_at"),
    order: str = Query(default="desc"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    return await list_notes(session, str(current_user.id), page, limit, status_filter, sort, order)


@router.get("/{note_id}", response_model=NoteOut)
async def get_note(note_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)) -> dict:
    note, share = await get_note_with_access(session, note_id, str(current_user.id))
    await touch_last_viewed(session, share)
    shared_by = None if share is None else note.owner.email
    return await build_note_response(note, shared_by=shared_by)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=NoteOut)
async def create_note_route(
    payload: NoteCreate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)
) -> dict:
    note = await create_note(session, str(current_user.id), payload.title, payload.content, payload.tag_ids)
    return await build_note_response(note)


@router.put("/{note_id}", response_model=NoteOut)
async def update_note_route(
    note_id: str, payload: NoteCreate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)
) -> dict:
    note, _ = await get_note_with_access(session, note_id, str(current_user.id), require_edit=True)
    updated = await update_note(session, note, payload.title, payload.content, payload.tag_ids, str(current_user.id))
    return await build_note_response(updated)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(note_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)) -> Response:
    note = await require_note_owner(session, note_id, str(current_user.id))
    await soft_delete_note(session, note)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{note_id}/share", response_model=MessageResponse)
async def share_note_route(
    note_id: str, payload: ShareCreate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)
) -> dict:
    note = await require_note_owner(session, note_id, str(current_user.id))
    await share_note(session, note, current_user.email.lower(), payload.share_with_email, payload.role)
    return {"message": "Note shared successfully"}


@router.get("/{note_id}/shares", response_model=list[ShareOut])
async def get_shares(note_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)) -> list[dict]:
    note = await require_note_owner(session, note_id, str(current_user.id))
    return await list_shares(session, note)


@router.delete("/{note_id}/shares/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_share(note_id: str, user_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)) -> Response:
    note = await require_note_owner(session, note_id, str(current_user.id))
    await revoke_share(session, note, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{note_id}/public-link", response_model=PublicLinkResponse)
async def public_link_create(
    note_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    note = await require_note_owner(session, note_id, str(current_user.id))
    base_url = str(request.base_url).rstrip("/")
    return await create_public_link(session, note, base_url)


@router.delete("/{note_id}/public-link", status_code=status.HTTP_204_NO_CONTENT)
async def public_link_delete(
    note_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)
) -> Response:
    note = await require_note_owner(session, note_id, str(current_user.id))
    await revoke_public_link(session, note)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{note_id}/history", response_model=list[VersionListItem])
async def history_list(note_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)) -> list[dict]:
    note, _ = await get_note_with_access(session, note_id, str(current_user.id))
    return await get_versions(session, note)


@router.get("/{note_id}/history/{version_num}", response_model=VersionDetail)
async def history_detail(
    note_id: str, version_num: int, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)
) -> dict:
    note, _ = await get_note_with_access(session, note_id, str(current_user.id))
    version = await get_version(session, note, version_num)
    return {
        "version_num": version.version_num,
        "title": version.title,
        "content": version.content,
        "created_at": version.created_at,
    }


@router.post("/{note_id}/restore/{version_num}", response_model=NoteOut)
async def restore_note_version(
    note_id: str, version_num: int, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)
) -> dict:
    note, _ = await get_note_with_access(session, note_id, str(current_user.id), require_edit=True)
    version = await get_version(session, note, version_num)
    restored = await restore_version(session, note, version)
    return await build_note_response(restored)


@tag_router.get("")
async def get_tags(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)) -> list:
    return await list_tags(session, str(current_user.id))


@tag_router.post("", status_code=status.HTTP_201_CREATED)
async def post_tag(payload: dict, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)) -> dict:
    tag = await create_tag(session, str(current_user.id), payload["name"], payload.get("color", "#6366f1"))
    return {"id": str(tag.id), "name": tag.name, "color": tag.color, "created_at": tag.created_at}


@tag_router.put("/{tag_id}")
async def put_tag(tag_id: str, payload: dict, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)) -> dict:
    tag = await update_tag(session, tag_id, str(current_user.id), payload.get("name"), payload.get("color"))
    return {"id": str(tag.id), "name": tag.name, "color": tag.color, "created_at": tag.created_at}


@tag_router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tag(tag_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)) -> Response:
    await delete_tag(session, tag_id, str(current_user.id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{note_id}/tags", response_model=NoteOut)
async def attach_tags(
    note_id: str, payload: NoteTagUpdate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)
) -> dict:
    note, _ = await get_note_with_access(session, note_id, str(current_user.id), require_edit=True)
    updated = await add_tags_to_note(session, note, str(current_user.id), payload.tag_ids)
    return await build_note_response(updated)


@router.delete("/{note_id}/tags/{tag_id}", response_model=NoteOut)
async def detach_tag(note_id: str, tag_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)) -> dict:
    note, _ = await get_note_with_access(session, note_id, str(current_user.id), require_edit=True)
    updated = await remove_tag_from_note(session, note, tag_id)
    return await build_note_response(updated)


@router.post("/{note_id}/pin", response_model=NoteOut)
async def pin_note(note_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)) -> dict:
    note = await require_note_owner(session, note_id, str(current_user.id))
    updated = await toggle_pin(session, note)
    return await build_note_response(updated)


@router.post("/{note_id}/archive", response_model=NoteOut)
async def archive_note(note_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)) -> dict:
    note = await require_note_owner(session, note_id, str(current_user.id))
    updated = await set_note_status(session, note, "archived")
    return await build_note_response(updated)


@router.post("/{note_id}/restore", response_model=NoteOut)
async def restore_note_status(note_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)) -> dict:
    note = await require_note_owner(session, note_id, str(current_user.id))
    updated = await set_note_status(session, note, "active")
    return await build_note_response(updated)


@router.post("/{note_id}/duplicate", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def duplicate_note_route(
    note_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)
) -> dict:
    note, _ = await get_note_with_access(session, note_id, str(current_user.id))
    duplicate = await duplicate_note(session, note, str(current_user.id))
    return await build_note_response(duplicate)


@router.post("/{note_id}/summarise")
@limiter.limit("10/minute", key_func=user_key)
async def summarise(
    request: Request, note_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)
) -> dict:
    note, _ = await get_note_with_access(session, note_id, str(current_user.id))
    if not note.content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Note has no content to process")
    return {"summary": await ai_service.summarise_note(note.title, note.content)}


@router.post("/{note_id}/suggest-tags")
@limiter.limit("10/minute", key_func=user_key)
async def ai_suggest_tags(
    request: Request, note_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)
) -> dict:
    note, _ = await get_note_with_access(session, note_id, str(current_user.id))
    if not note.content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Note has no content to process")
    return {"suggestions": await ai_service.suggest_tags(note.title, note.content)}


@router.post("/{note_id}/continue")
@limiter.limit("10/minute", key_func=user_key)
async def ai_continue(
    request: Request, note_id: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)
) -> dict:
    note, _ = await get_note_with_access(session, note_id, str(current_user.id))
    if not note.content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Note has no content to process")
    return {"continuation": await ai_service.continue_note(note.title, note.content)}
