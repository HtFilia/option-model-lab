import httpx
import pytest

from app.config import Settings
from app.main import create_app

ALLOWED_ORIGIN = "http://localhost:5173"


def application():
    settings = Settings(
        app_env="test",
        allowed_origins=(ALLOWED_ORIGIN,),
        log_level="INFO",
    )
    return create_app(settings)


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


async def request(method: str, path: str, **kwargs) -> httpx.Response:
    transport = httpx.ASGITransport(app=application())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.request(method, path, **kwargs)


@pytest.mark.anyio
async def test_health_is_minimal_and_successful() -> None:
    response = await request("GET", "/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.anyio
async def test_cors_allows_the_configured_frontend() -> None:
    response = await request(
        "OPTIONS",
        "/health",
        headers={
            "Origin": ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN


@pytest.mark.anyio
async def test_cors_does_not_allow_an_unknown_origin() -> None:
    response = await request(
        "OPTIONS",
        "/health",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert "access-control-allow-origin" not in response.headers
