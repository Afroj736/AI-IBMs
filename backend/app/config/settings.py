from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Inventory AI System API"
    app_env: str = "development"
    app_debug: bool = True
    secret_key: str | None = None
    jwt_secret_key: str | None = Field(default=None, alias="JWT_SECRET_KEY")
    jwt_refresh_secret_key: str | None = Field(default=None, alias="JWT_REFRESH_SECRET_KEY")
    jwt_access_expire_minutes: int = Field(default=30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    jwt_refresh_expire_days: int = 7
    database_url: str
    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")
    openai_api_key: str | None = None
    openai_transcription_model: str = "gpt-4o-mini-transcribe"
    openai_transcription_fallback_model: str = "whisper-1"
    openai_extraction_model: str = "gpt-4.1-mini"
    openai_skip_extraction: bool = Field(
        default=False,
        description="Skip OpenAI entity extraction; use local regex parser (fast when quota is exhausted).",
    )
    openai_extraction_timeout_seconds: int = 12
    openai_timeout_seconds: int = 45
    openai_max_retries: int = 5
    openai_rate_limit_retries: int = 2
    elevenlabs_api_key: str | None = Field(default=None, alias="ELEVENLABS_API_KEY")
    elevenlabs_stt_model: str = "scribe_v2"
    voice_max_upload_mb: int = 25
    voice_upload_rate_limit_per_minute: int = 20
    voice_fallback_transcript: str | None = Field(
        default=None,
        description="Dev-only: used when OpenAI speech API is rate-limited (APP_DEBUG=true).",
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    @model_validator(mode="after")
    def resolve_secrets(self):
        if not self.secret_key:
            self.secret_key = self.jwt_secret_key
        if not self.jwt_secret_key and self.secret_key:
            self.jwt_secret_key = self.secret_key
        if not self.jwt_refresh_secret_key:
            self.jwt_refresh_secret_key = self.jwt_secret_key
        if not self.secret_key:
            raise ValueError("SECRET_KEY or JWT_SECRET_KEY must be provided")
        if self.database_url.startswith("sqlite"):
            raise ValueError("SQLite is disabled for this backend runtime. Use PostgreSQL DATABASE_URL.")
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
