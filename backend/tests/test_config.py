import pytest

from app.config import DEVELOPMENT_ORIGINS, PRODUCTION_ORIGINS, get_settings


@pytest.fixture(autouse=True)
def clear_settings_cache() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_development_defaults_use_loopback_origins(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)

    assert get_settings().allowed_origins == DEVELOPMENT_ORIGINS


def test_production_defaults_use_only_the_canonical_frontend(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)

    assert get_settings().allowed_origins == PRODUCTION_ORIGINS


def test_explicit_origins_are_normalized(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ALLOWED_ORIGINS", " https://example.test/,http://localhost:5173 ")

    assert get_settings().allowed_origins == (
        "https://example.test",
        "http://localhost:5173",
    )


def test_wildcard_origin_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ALLOWED_ORIGINS", "*")

    with pytest.raises(ValueError, match="Wildcard"):
        get_settings()
