from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "El Perfumista Rubio"
    environment: str = "development"
    secret_key: str = "dev-secret-change-me"
    database_url: str = "postgresql+psycopg://perfumista:Perfumista2026@127.0.0.1:5433/perfumista"
    access_token_expire_minutes: int = 480
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    media_dir: str = "media"
    frontend_dist: str = "../frontend/dist"
    admin_name: str = "Administrador"
    admin_email: str = "admin@elperfumistarubio.com"
    admin_password: str = "Perfumista2026!"
    seller_password: str = "Vendedor2026!"
    auto_init_db: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
