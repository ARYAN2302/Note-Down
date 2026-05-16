import math
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import and_, case, delete, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.note import Note, PublicLink
from app.models.share import NoteShare
from app.models.tag import Tag
from app.models.user import User
from app.models.version import NoteVersion


def sanitize_text(value: str, field_name: str, max_length: int) -> str:
    sanitized = value.strip()
    if "\x00" in sanitized:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field_name} contains invalid characters")
    if len(sanitized) > max_length:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field_name} exceeds maximum length")
    return sanitized


async def get_note_with_access(
    session: AsyncSession, note_id: str, user_id: str, require_edit: bool = False
) -> tuple[Note, NoteShare | None]:
    try:
        parsed_id = uuid.UUID(note_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found") from exc

    query = (
        select(Note)
        .options(selectinload(Note.tags), selectinload(Note.shares))
        .where(Note.id == parsed_id)
    )
    note = await session.scalar(query)
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    if str(note.owner_id) == user_id:
        return note, None
    share = next((item for item in note.shares if str(item.shared_with_id) == user_id), None)
    if not share:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    if require_edit and share.role != "editor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return note, share


async def require_note_owner(session: AsyncSession, note_id: str, user_id: str) -> Note:
    note, share = await get_note_with_access(session, note_id, user_id)
    if share is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return note


async def build_note_response(note: Note, shared_by: str | None = None) -> dict:
    return {
        "id": str(note.id),
        "title": note.title,
        "content": note.content,
        "status": note.status,
        "is_pinned": note.is_pinned,
        "tags": [
            {"id": str(tag.id), "name": tag.name, "color": tag.color, "created_at": tag.created_at}
            for tag in note.tags
        ],
        "shared_by": shared_by,
        "created_at": note.created_at,
        "updated_at": note.updated_at,
    }


async def list_notes(
    session: AsyncSession,
    user_id: str,
    page: int,
    limit: int,
    status_filter: str,
    sort: str,
    order: str,
) -> dict:
    valid_sort_fields = {"updated_at": Note.updated_at, "created_at": Note.created_at, "title": Note.title}
    sort_column = valid_sort_fields.get(sort, Note.updated_at)
    shared_by_case = case((Note.owner_id == uuid.UUID(user_id), None), else_=User.email)

    base_query = (
        select(Note, shared_by_case.label("shared_by"))
        .outerjoin(NoteShare, NoteShare.note_id == Note.id)
        .outerjoin(User, User.id == Note.owner_id)
        .where(
            and_(
                Note.status == status_filter,
                or_(Note.owner_id == uuid.UUID(user_id), NoteShare.shared_with_id == uuid.UUID(user_id)),
            )
        )
        .options(selectinload(Note.tags), selectinload(Note.shares))
        .distinct()
    )
    total = await session.scalar(select(func.count()).select_from(base_query.subquery())) or 0
    query = base_query.order_by(Note.is_pinned.desc(), sort_column.asc() if order == "asc" else sort_column.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    rows = (await session.execute(query)).all()
    items = [await build_note_response(note, shared_by=shared_by) for note, shared_by in rows]
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, math.ceil(total / limit)) if total else 0,
    }


async def create_note(session: AsyncSession, user_id: str, title: str, content: str, tag_ids: list[str] | None) -> Note:
    title = sanitize_text(title, "Title", settings.MAX_TITLE_LENGTH)
    if not title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title must not be empty")
    content = sanitize_text(content, "Content", settings.MAX_CONTENT_LENGTH)
    note = Note(owner_id=uuid.UUID(user_id), title=title, content=content)
    if tag_ids:
        tags = await session.scalars(select(Tag).where(Tag.owner_id == uuid.UUID(user_id), Tag.id.in_(tag_ids)))
        note.tags = list(tags)
    session.add(note)
    await session.commit()
    await session.refresh(note)
    await session.refresh(note, attribute_names=["tags", "shares"])
    return note


async def create_version_snapshot(session: AsyncSession, note: Note) -> None:
    latest = await session.scalar(
        select(func.max(NoteVersion.version_num)).where(NoteVersion.note_id == note.id)
    )
    version = NoteVersion(
        note_id=note.id,
        version_num=(latest or 0) + 1,
        title=note.title,
        content=note.content,
    )
    session.add(version)


async def update_note(
    session: AsyncSession, note: Note, title: str, content: str, tag_ids: list[str] | None, actor_user_id: str
) -> Note:
    await create_version_snapshot(session, note)
    note.title = sanitize_text(title, "Title", settings.MAX_TITLE_LENGTH)
    if not note.title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title must not be empty")
    note.content = sanitize_text(content, "Content", settings.MAX_CONTENT_LENGTH)
    if tag_ids is not None:
        tags = await session.scalars(select(Tag).where(Tag.owner_id == uuid.UUID(actor_user_id), Tag.id.in_(tag_ids)))
        note.tags = list(tags)
    await session.commit()
    await session.refresh(note)
    await session.refresh(note, attribute_names=["tags", "shares"])
    return note


async def soft_delete_note(session: AsyncSession, note: Note) -> None:
    note.status = "trashed"
    await session.commit()


async def share_note(session: AsyncSession, note: Note, owner_email: str, share_email: str, role: str) -> None:
    share_email = share_email.lower().strip()
    if owner_email == share_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot share note with yourself")
    target = await session.scalar(select(User).where(User.email == share_email))
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    share = await session.scalar(
        select(NoteShare).where(NoteShare.note_id == note.id, NoteShare.shared_with_id == target.id)
    )
    if share:
        share.role = role
    else:
        session.add(NoteShare(note_id=note.id, shared_with_id=target.id, role=role))
    await session.commit()


async def list_shares(session: AsyncSession, note: Note) -> list[dict]:
    rows = (
        await session.execute(
            select(NoteShare, User.id, User.email)
            .join(User, User.id == NoteShare.shared_with_id)
            .where(NoteShare.note_id == note.id)
        )
    ).all()
    return [
        {"user_id": str(user_id), "email": email, "role": share.role, "last_viewed_at": share.last_viewed_at}
        for share, user_id, email in rows
    ]


async def revoke_share(session: AsyncSession, note: Note, user_id: str) -> None:
    await session.execute(delete(NoteShare).where(NoteShare.note_id == note.id, NoteShare.shared_with_id == uuid.UUID(user_id)))
    await session.commit()


async def create_public_link(session: AsyncSession, note: Note, base_url: str, expires_in_days: int | None = None) -> dict:
    existing = await session.scalar(select(PublicLink).where(PublicLink.note_id == note.id))
    if not existing:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(days=expires_in_days) if expires_in_days else None
        existing = PublicLink(note_id=note.id, token=token, expires_at=expires_at)
        session.add(existing)
        await session.commit()
        await session.refresh(existing)
    return {"url": f"{base_url}/shared/{existing.token}", "token": existing.token, "expires_at": existing.expires_at}


async def revoke_public_link(session: AsyncSession, note: Note) -> None:
    await session.execute(delete(PublicLink).where(PublicLink.note_id == note.id))
    await session.commit()


async def get_public_note(session: AsyncSession, token: str) -> Note:
    link = await session.scalar(
        select(PublicLink).where(PublicLink.token == token).options(selectinload(PublicLink.note).selectinload(Note.tags))
    )
    if not link or (link.expires_at and link.expires_at < datetime.now(UTC)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Public link not found")
    return link.note


async def touch_last_viewed(session: AsyncSession, share: NoteShare | None) -> None:
    if share:
        share.last_viewed_at = datetime.now(UTC)
        await session.commit()


async def toggle_pin(session: AsyncSession, note: Note) -> Note:
    note.is_pinned = not note.is_pinned
    await session.commit()
    await session.refresh(note)
    await session.refresh(note, attribute_names=["tags"])
    return note


async def set_note_status(session: AsyncSession, note: Note, new_status: str) -> Note:
    note.status = new_status
    await session.commit()
    await session.refresh(note)
    await session.refresh(note, attribute_names=["tags"])
    return note


async def duplicate_note(session: AsyncSession, note: Note, user_id: str) -> Note:
    duplicate = Note(
        owner_id=uuid.UUID(user_id),
        title=f"Copy of {note.title}",
        content=note.content,
        status="active",
        is_pinned=False,
    )
    duplicate.tags = list(note.tags)
    session.add(duplicate)
    await session.commit()
    await session.refresh(duplicate)
    await session.refresh(duplicate, attribute_names=["tags"])
    return duplicate


async def get_versions(session: AsyncSession, note: Note) -> list[dict]:
    versions = (
        await session.scalars(select(NoteVersion).where(NoteVersion.note_id == note.id).order_by(NoteVersion.version_num.desc()))
    ).all()
    return [
        {
            "version_num": version.version_num,
            "title": version.title,
            "preview": version.content[:120],
            "created_at": version.created_at,
        }
        for version in versions
    ]


async def get_version(session: AsyncSession, note: Note, version_num: int) -> NoteVersion:
    version = await session.scalar(
        select(NoteVersion).where(NoteVersion.note_id == note.id, NoteVersion.version_num == version_num)
    )
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
    return version


async def restore_version(session: AsyncSession, note: Note, version: NoteVersion) -> Note:
    await create_version_snapshot(session, note)
    note.title = version.title
    note.content = version.content
    note.status = "active"
    await session.commit()
    await session.refresh(note)
    await session.refresh(note, attribute_names=["tags"])
    return note


async def list_tags(session: AsyncSession, user_id: str) -> list[Tag]:
    return (await session.scalars(select(Tag).where(Tag.owner_id == uuid.UUID(user_id)).order_by(Tag.name.asc()))).all()


async def create_tag(session: AsyncSession, user_id: str, name: str, color: str) -> Tag:
    name = sanitize_text(name, "Tag name", 50)
    tag = Tag(owner_id=uuid.UUID(user_id), name=name, color=color)
    session.add(tag)
    try:
        await session.commit()
    except Exception as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tag already exists") from exc
    await session.refresh(tag)
    return tag


async def update_tag(session: AsyncSession, tag_id: str, user_id: str, name: str | None, color: str | None) -> Tag:
    tag = await session.scalar(select(Tag).where(Tag.id == uuid.UUID(tag_id), Tag.owner_id == uuid.UUID(user_id)))
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    if name is not None:
        tag.name = sanitize_text(name, "Tag name", 50)
    if color is not None:
        tag.color = color
    await session.commit()
    await session.refresh(tag)
    return tag


async def delete_tag(session: AsyncSession, tag_id: str, user_id: str) -> None:
    tag = await session.scalar(select(Tag).where(Tag.id == uuid.UUID(tag_id), Tag.owner_id == uuid.UUID(user_id)))
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    await session.delete(tag)
    await session.commit()


async def add_tags_to_note(session: AsyncSession, note: Note, user_id: str, tag_ids: list[str]) -> Note:
    tags = (await session.scalars(select(Tag).where(Tag.owner_id == uuid.UUID(user_id), Tag.id.in_(tag_ids)))).all()
    tag_map = {str(tag.id): tag for tag in tags}
    note.tags = list({str(tag.id): tag for tag in [*note.tags, *tag_map.values()]}.values())
    await session.commit()
    await session.refresh(note)
    await session.refresh(note, attribute_names=["tags"])
    return note


async def remove_tag_from_note(session: AsyncSession, note: Note, tag_id: str) -> Note:
    note.tags = [tag for tag in note.tags if str(tag.id) != tag_id]
    await session.commit()
    await session.refresh(note)
    await session.refresh(note, attribute_names=["tags"])
    return note


async def search_notes(session: AsyncSession, user_id: str, query_text: str, mode: str = "full_text") -> list[dict]:
    base_query = (
        select(Note, User.email.label("owner_email"))
        .outerjoin(NoteShare, NoteShare.note_id == Note.id)
        .join(User, User.id == Note.owner_id)
        .where(
            Note.status == "active",
            or_(Note.owner_id == uuid.UUID(user_id), NoteShare.shared_with_id == uuid.UUID(user_id)),
        )
        .options(selectinload(Note.tags), selectinload(Note.shares))
        .distinct()
    )
    if mode == "semantic":
        notes = (await session.execute(base_query)).all()
        from app.services.ai_service import semantic_scores

        documents = [f"{note.title}\n\n{note.content}" for note, _ in notes]
        scores = await semantic_scores(query_text, documents) if documents else []
        results = []
        for index, (note, owner_email) in enumerate(notes):
            score = scores[index] if index < len(scores) else 0.0
            if score > 0:
                payload = await build_note_response(
                    note, None if str(note.owner_id) == user_id else owner_email
                )
                payload["relevance_score"] = float(score)
                results.append(payload)
        return sorted(results, key=lambda item: item["relevance_score"], reverse=True)

    if session.bind.dialect.name == "postgresql":
        rank = func.ts_rank(Note.search_vector, func.plainto_tsquery("english", query_text)).label("rank")
        query = (
            select(Note, User.email.label("owner_email"), rank)
            .outerjoin(NoteShare, NoteShare.note_id == Note.id)
            .join(User, User.id == Note.owner_id)
            .where(
                Note.status == "active",
                or_(Note.owner_id == uuid.UUID(user_id), NoteShare.shared_with_id == uuid.UUID(user_id)),
                Note.search_vector.op("@@")(func.plainto_tsquery("english", query_text)),
            )
            .options(selectinload(Note.tags), selectinload(Note.shares))
            .distinct()
            .order_by(rank.desc())
        )
        rows = (await session.execute(query)).all()
        results = []
        for note, owner_email, rank_value in rows:
            payload = await build_note_response(note, None if str(note.owner_id) == user_id else owner_email)
            payload["relevance_score"] = float(rank_value or 0)
            results.append(payload)
        return results

    query = base_query.where(or_(Note.title.ilike(f"%{query_text}%"), Note.content.ilike(f"%{query_text}%")))
    rows = (await session.execute(query)).all()
    results = []
    for note, owner_email in rows:
        payload = await build_note_response(note, None if str(note.owner_id) == user_id else owner_email)
        payload["relevance_score"] = 1.0
        results.append(payload)
    return results
