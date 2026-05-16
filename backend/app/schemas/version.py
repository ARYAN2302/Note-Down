from datetime import datetime

from pydantic import BaseModel


class VersionListItem(BaseModel):
    version_num: int
    title: str
    preview: str
    created_at: datetime


class VersionDetail(BaseModel):
    version_num: int
    title: str
    content: str
    created_at: datetime
