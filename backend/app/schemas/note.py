from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.tag import TagOut


class NoteCreate(BaseModel):
    title: str = Field(min_length=1)
    content: str = ""
    tag_ids: list[str] | None = None


class NoteUpdate(BaseModel):
    title: str = Field(min_length=1)
    content: str = ""
    tag_ids: list[str] | None = None


class NoteTagUpdate(BaseModel):
    tag_ids: list[str]


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    content: str
    status: str
    is_pinned: bool
    tags: list[TagOut]
    shared_by: str | None = None
    created_at: datetime
    updated_at: datetime


class NoteListResponse(BaseModel):
    items: list[NoteOut]
    total: int
    page: int
    limit: int
    pages: int


class NoteSearchItem(NoteOut):
    relevance_score: float
