import os
from dataclasses import dataclass
from functools import lru_cache

DEVELOPMENT_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)
PRODUCTION_ORIGINS = ("https://pricing.lucaslebihan.dev",)


@dataclass(frozen=True)
class Settings:
    app_env: str
    allowed_origins: tuple[str, ...]
    log_level: str


def _parse_origins(value: str) -> tuple[str, ...]:
    origins = tuple(origin.strip().rstrip("/") for origin in value.split(",") if origin.strip())
    if not origins:
        raise ValueError("ALLOWED_ORIGINS must contain at least one explicit origin.")
    if "*" in origins:
        raise ValueError("Wildcard CORS origins are not permitted.")
    return origins


@lru_cache
def get_settings() -> Settings:
    app_env = os.getenv("APP_ENV", "development").strip().lower()
    if app_env not in {"development", "test", "production"}:
        raise ValueError("APP_ENV must be development, test, or production.")

    configured_origins = os.getenv("ALLOWED_ORIGINS")
    default_origins = PRODUCTION_ORIGINS if app_env == "production" else DEVELOPMENT_ORIGINS
    allowed_origins = (
        _parse_origins(configured_origins) if configured_origins is not None else default_origins
    )
    log_level = os.getenv("LOG_LEVEL", "INFO").strip().upper()

    return Settings(app_env=app_env, allowed_origins=allowed_origins, log_level=log_level)
