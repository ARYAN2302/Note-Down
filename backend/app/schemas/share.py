from datetime import datetime

from pydantic import BaseModel, EmailStr


class ShareCreate(BaseModel):
    share_with_email: EmailStr
    role: str = "viewer"


class ShareOut(BaseModel):
    user_id: str
    email: EmailStr
    role: str
    last_viewed_at: datetime | None


class PublicLinkResponse(BaseModel):
    url: str
    token: str
    expires_at: datetime | None
