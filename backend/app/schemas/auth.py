from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str


class RefreshResponse(BaseModel):
    access_token: str


class MessageResponse(BaseModel):
    message: str


class AboutResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    email: str
    my_features: dict[str, str] = Field(alias="my features")


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
