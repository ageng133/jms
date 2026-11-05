import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0
    REDIS_AUDIT_QUEUE: str = "queue:ai_audit"

    S3_ENDPOINT: str = "http://localhost:9000"
    S3_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "jms-manuscripts"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_USE_SSL: bool = False

    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "jms_user"
    POSTGRES_PASSWORD: str = "jms_password"
    POSTGRES_DB: str = "jms_db"

    MARGIN_TOP_MM: float = 25.4
    MARGIN_BOTTOM_MM: float = 25.4
    MARGIN_LEFT_MM: float = 25.4
    MARGIN_RIGHT_MM: float = 25.4
    MARGIN_TOLERANCE_MM: float = 1.0

    # HTTP audit engine (app.server)
    AUDIT_ENGINE_HOST: str = "127.0.0.1"
    AUDIT_ENGINE_PORT: int = 8090
    # Optional shared secret; when set the gateway must send X-Worker-Token
    AUDIT_ENGINE_TOKEN: str = ""
    AUDIT_MAX_UPLOAD_MB: int = 50

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def postgres_dsn(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()

