import asyncio
import math
from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

from app.quant.heston import (
    CALIBRATION_OBJECTIVE_TOLERANCE,
    MAX_CALIBRATION_ITERATIONS,
    HestonCalibrationQuote,
    HestonCalibrationResult,
    HestonError,
    MarketState,
    calibrate_heston,
)

router = APIRouter(prefix="/api/v1/heston", tags=["heston"])

CalibrationRunner = Callable[
    [MarketState, tuple[HestonCalibrationQuote, ...], int, float],
    Awaitable[HestonCalibrationResult],
]

MAX_QUOTES = 50
MAX_SPOT_OR_STRIKE = 10_000_000.0
MAX_MARKET_PRICE = 100_000_000.0
MAX_MATURITY_YEARS = 10.0
MAX_ABSOLUTE_RATE = 1.0


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
        from_attributes=True,
    )


class MarketStatePayload(ApiModel):
    spot: float = Field(gt=0, le=MAX_SPOT_OR_STRIKE)
    risk_free_rate: float = Field(ge=-MAX_ABSOLUTE_RATE, le=MAX_ABSOLUTE_RATE)
    dividend_yield: float = Field(ge=-MAX_ABSOLUTE_RATE, le=MAX_ABSOLUTE_RATE)


class HestonCalibrationQuotePayload(ApiModel):
    strike: float = Field(gt=0, le=MAX_SPOT_OR_STRIKE)
    time_to_maturity: float = Field(gt=0, le=MAX_MATURITY_YEARS)
    market_price: float = Field(ge=0, le=MAX_MARKET_PRICE)
    market_implied_volatility: float = Field(ge=0, le=5)


class HestonCalibrationRequest(ApiModel):
    market: MarketStatePayload
    quotes: list[HestonCalibrationQuotePayload] = Field(min_length=5, max_length=MAX_QUOTES)
    max_iterations: int = Field(default=MAX_CALIBRATION_ITERATIONS, ge=1, le=120)
    objective_tolerance: float = Field(
        default=CALIBRATION_OBJECTIVE_TOLERANCE,
        ge=1e-8,
        le=5e-3,
    )

    @model_validator(mode="after")
    def validate_call_price_bounds(self) -> "HestonCalibrationRequest":
        for quote in self.quotes:
            discounted_spot = self.market.spot * math.exp(
                -self.market.dividend_yield * quote.time_to_maturity
            )
            discounted_strike = quote.strike * math.exp(
                -self.market.risk_free_rate * quote.time_to_maturity
            )
            lower_bound = max(discounted_spot - discounted_strike, 0.0)
            upper_bound = discounted_spot
            tolerance = 1e-10 * max(1.0, upper_bound)
            if (
                quote.market_price < lower_bound - tolerance
                or quote.market_price > upper_bound + tolerance
            ):
                raise ValueError(
                    "Each call market price must lie within its discounted no-arbitrage bounds."
                )
        return self


class HestonParametersResponse(ApiModel):
    initial_variance: float
    long_run_variance: float
    mean_reversion: float
    volatility_of_variance: float
    correlation: float


class HestonCalibrationFitResponse(ApiModel):
    strike: float
    time_to_maturity: float
    market_price: float
    market_implied_volatility: float
    model_price: float
    model_implied_volatility: float
    price_residual: float
    volatility_residual: float


class HestonCalibrationResponse(ApiModel):
    parameters: HestonParametersResponse
    initial_parameters: HestonParametersResponse
    initial_objective: float
    final_objective: float
    iterations: int
    evaluations: int
    converged: bool
    fit: list[HestonCalibrationFitResponse]


def _market(payload: MarketStatePayload) -> MarketState:
    return MarketState(
        spot=payload.spot,
        risk_free_rate=payload.risk_free_rate,
        dividend_yield=payload.dividend_yield,
    )


def _quotes(
    payloads: list[HestonCalibrationQuotePayload],
) -> tuple[HestonCalibrationQuote, ...]:
    return tuple(
        HestonCalibrationQuote(
            strike=payload.strike,
            time_to_maturity=payload.time_to_maturity,
            market_price=payload.market_price,
            market_implied_volatility=payload.market_implied_volatility,
        )
        for payload in payloads
    )


async def run_heston_calibration(
    market: MarketState,
    quotes: tuple[HestonCalibrationQuote, ...],
    max_iterations: int,
    objective_tolerance: float,
) -> HestonCalibrationResult:
    return await asyncio.to_thread(
        calibrate_heston,
        market,
        quotes,
        max_iterations=max_iterations,
        objective_tolerance=objective_tolerance,
    )


def get_calibration_runner() -> CalibrationRunner:
    return run_heston_calibration


@router.post("/calibrate", response_model=HestonCalibrationResponse)
async def calibrate_heston_route(
    request: HestonCalibrationRequest,
    run_calibration: Annotated[CalibrationRunner, Depends(get_calibration_runner)],
) -> HestonCalibrationResponse:
    try:
        result = await run_calibration(
            _market(request.market),
            _quotes(request.quotes),
            request.max_iterations,
            request.objective_tolerance,
        )
    except HestonError as error:
        raise HTTPException(
            status_code=422,
            detail={"code": error.code, "message": str(error), "field": error.field},
        ) from error
    return HestonCalibrationResponse.model_validate(result)
