import httpx
import pytest

from app.api.heston import get_calibration_runner
from app.config import Settings
from app.main import create_app
from app.quant.heston import (
    HestonCalibrationQuote,
    HestonCalibrationResult,
    MarketState,
    build_heston_calibration_fixture,
    calibrate_heston,
)

ALLOWED_ORIGIN = "http://localhost:5173"
ENDPOINT = "/api/v1/heston/calibrate"


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


async def run_calibration_directly(
    market: MarketState,
    quotes: tuple[HestonCalibrationQuote, ...],
    max_iterations: int,
    objective_tolerance: float,
) -> HestonCalibrationResult:
    return calibrate_heston(
        market,
        quotes,
        max_iterations=max_iterations,
        objective_tolerance=objective_tolerance,
    )


async def calibration_runner_override():
    return run_calibration_directly


def application():
    app = create_app(
        Settings(
            app_env="test",
            allowed_origins=(ALLOWED_ORIGIN,),
            log_level="INFO",
        )
    )
    app.dependency_overrides[get_calibration_runner] = calibration_runner_override
    return app


def calibration_payload() -> dict:
    market = MarketState(spot=100, risk_free_rate=0.03, dividend_yield=0.01)
    quotes = build_heston_calibration_fixture(market)
    return {
        "market": {
            "spot": market.spot,
            "riskFreeRate": market.risk_free_rate,
            "dividendYield": market.dividend_yield,
        },
        "quotes": [
            {
                "strike": quote.strike,
                "timeToMaturity": quote.time_to_maturity,
                "marketPrice": quote.market_price,
                "marketImpliedVolatility": quote.market_implied_volatility,
            }
            for quote in quotes
        ],
    }


async def post(payload: dict) -> httpx.Response:
    transport = httpx.ASGITransport(app=application())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.post(ENDPOINT, json=payload)


@pytest.mark.anyio
async def test_calibration_endpoint_returns_typed_diagnostics() -> None:
    response = await post(calibration_payload())

    assert response.status_code == 200
    result = response.json()
    assert result["converged"] is True
    assert result["iterations"] == 84
    assert result["evaluations"] == 139
    assert len(result["fit"]) == 15
    assert result["finalObjective"] < result["initialObjective"] * 0.1
    assert "initialVariance" in result["parameters"]


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("field", "value"),
    (("maxIterations", 121), ("objectiveTolerance", 0.1)),
)
async def test_optimizer_limits_are_enforced(field: str, value: float) -> None:
    payload = calibration_payload()
    payload[field] = value

    response = await post(payload)

    assert response.status_code == 422


@pytest.mark.anyio
async def test_quote_count_limit_is_enforced_before_calibration() -> None:
    payload = calibration_payload()
    payload["quotes"] = payload["quotes"] * 4

    response = await post(payload)

    assert len(payload["quotes"]) == 60
    assert response.status_code == 422


@pytest.mark.anyio
async def test_invalid_call_market_price_has_an_educational_error() -> None:
    payload = calibration_payload()
    payload["quotes"][0]["marketPrice"] = 10_000

    response = await post(payload)

    assert response.status_code == 422
    assert "no-arbitrage bounds" in response.text


@pytest.mark.anyio
async def test_unknown_request_fields_are_rejected() -> None:
    payload = calibration_payload()
    payload["unboundedWork"] = True

    response = await post(payload)

    assert response.status_code == 422
