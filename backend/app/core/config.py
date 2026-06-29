"""Application settings loaded from environment variables.

All configuration is read once at startup into a typed `Settings` object.
See `.env.example` for the full list of variables.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application configuration, populated from the environment or `.env`."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # App
    app_env: str = "development"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # Database. The defaults match the bundled docker-compose Postgres so the
    # app and tests import cleanly even before a .env file exists.
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/voice_finance"
    test_database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/voice_finance_test"
    )

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""
    supabase_service_role_key: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Cloudflare R2
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "voice-recordings"

    # AI providers. STT and LLM both use OpenRouter so the backend needs one
    # AI provider key and model selection stays environment-driven.
    openrouter_api_key: str = ""
    stt_model: str = "openai/whisper-1"
    llm_model: str = "meta-llama/llama-3.3-70b-instruct"
    receipt_model: str = "google/gemini-flash-1.5"

    # HTTP: comma-separated list of allowed CORS origins.
    cors_origins: str = "http://localhost:3000,http://localhost:19006"

    # Trusted reverse-proxy CIDRs (comma-separated). Only peers matching these
    # ranges are allowed to set X-Forwarded-For. Leave empty in dev.
    trusted_proxy_ips: str = ""

    # Logging
    log_level: str = "INFO"

    @property
    def is_production(self) -> bool:
        """Whether the app is running in the production environment."""
        return self.app_env == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        """The CORS origins parsed into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def trusted_proxy_list(self) -> list[str]:
        """Trusted proxy CIDRs parsed into a list."""
        return [s.strip() for s in self.trusted_proxy_ips.split(",") if s.strip()]

    @property
    def r2_endpoint_url(self) -> str:
        """The S3-compatible endpoint URL for Cloudflare R2."""
        return f"https://{self.r2_account_id}.r2.cloudflarestorage.com"


@lru_cache
def get_settings() -> Settings:
    """Return the cached application settings (constructed once per process)."""
    return Settings()
