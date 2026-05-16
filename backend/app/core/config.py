from functools import lru_cache

from pydantic import EmailStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    SECRET_KEY: str
    GEMINI_API_KEY: str

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    BCRYPT_ROUNDS: int = 12
    MAX_TITLE_LENGTH: int = 500
    MAX_CONTENT_LENGTH: int = 100000
    RATE_LIMIT_AUTH: str = "5/minute"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    ABOUT_NAME: str = "Your Name"
    ABOUT_EMAIL: EmailStr = "your@email.com"
    DEV_DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
