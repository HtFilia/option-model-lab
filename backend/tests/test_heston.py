import json
import math
from pathlib import Path

import pytest

from app.quant.heston import (
    EuropeanOption,
    HestonError,
    HestonInput,
    HestonParameters,
    MarketState,
    build_heston_calibration_fixture,
    calibrate_heston,
    heston_characteristic_function,
    price_heston,
)

CROSS_LANGUAGE_PRICE_TOLERANCE = 2e-10
PARITY_FIXTURE = Path(__file__).parents[2] / "fixtures" / "heston-parity.json"
CALIBRATION_PARITY_FIXTURE = (
    Path(__file__).parents[2] / "fixtures" / "heston-calibration-parity.json"
)


def heston_input(case: dict) -> HestonInput:
    option = case["option"]
    market = case["market"]
    parameters = case["parameters"]
    return HestonInput(
        option=EuropeanOption(
            type=option["type"],
            strike=option["strike"],
            time_to_maturity=option["timeToMaturity"],
        ),
        market=MarketState(
            spot=market["spot"],
            risk_free_rate=market["riskFreeRate"],
            dividend_yield=market["dividendYield"],
        ),
        parameters=HestonParameters(
            initial_variance=parameters["initialVariance"],
            long_run_variance=parameters["longRunVariance"],
            mean_reversion=parameters["meanReversion"],
            volatility_of_variance=parameters["volatilityOfVariance"],
            correlation=parameters["correlation"],
        ),
    )


def test_python_prices_match_typescript_reference_fixture() -> None:
    cases = json.loads(PARITY_FIXTURE.read_text())

    for case in cases:
        actual = price_heston(heston_input(case)).price
        assert abs(actual - case["expectedPrice"]) <= CROSS_LANGUAGE_PRICE_TOLERANCE


def test_characteristic_function_is_one_at_origin() -> None:
    case = json.loads(PARITY_FIXTURE.read_text())[0]
    value = heston_characteristic_function(heston_input(case), 0j)

    assert abs(value - 1) <= 1e-14


def test_put_call_parity_and_expiry_behavior() -> None:
    case = json.loads(PARITY_FIXTURE.read_text())[1]
    input_value = heston_input(case)
    call = price_heston(
        HestonInput(
            EuropeanOption("call", input_value.option.strike, input_value.option.time_to_maturity),
            input_value.market,
            input_value.parameters,
        )
    ).price
    put = price_heston(input_value).price
    time = input_value.option.time_to_maturity
    parity = input_value.market.spot * math.exp(-input_value.market.dividend_yield * time)
    parity -= input_value.option.strike * math.exp(-input_value.market.risk_free_rate * time)
    assert abs(call - put - parity) <= 1e-13

    expired = price_heston(
        HestonInput(
            EuropeanOption("put", 120, 0),
            input_value.market,
            input_value.parameters,
        )
    )
    assert expired.price == 20
    assert expired.integration_evaluations == 0


def test_invalid_parameters_are_rejected_without_clamping() -> None:
    case = json.loads(PARITY_FIXTURE.read_text())[0]
    input_value = heston_input(case)

    with pytest.raises(HestonError, match="between -1 and 1"):
        price_heston(
            HestonInput(
                input_value.option,
                input_value.market,
                HestonParameters(
                    **{
                        **input_value.parameters.__dict__,
                        "correlation": -1.1,
                    }
                ),
            )
        )


def test_calibration_is_deterministic_and_reduces_objective() -> None:
    reference = json.loads(CALIBRATION_PARITY_FIXTURE.read_text())
    market_data = reference["market"]
    market = MarketState(
        spot=market_data["spot"],
        risk_free_rate=market_data["riskFreeRate"],
        dividend_yield=market_data["dividendYield"],
    )
    quotes = build_heston_calibration_fixture(market)
    first = calibrate_heston(market, quotes)
    second = calibrate_heston(market, quotes)

    assert len(quotes) == 15
    assert first == second
    assert first.converged
    assert first.final_objective < first.initial_objective * 0.1
    assert len(first.fit) == len(quotes)
    assert first.iterations == reference["iterations"]
    assert first.evaluations == reference["evaluations"]
    assert abs(first.initial_objective - reference["initialObjective"]) <= 2e-12
    assert abs(first.final_objective - reference["finalObjective"]) <= 2e-12
    for field, expected in {
        "initial_variance": reference["parameters"]["initialVariance"],
        "long_run_variance": reference["parameters"]["longRunVariance"],
        "mean_reversion": reference["parameters"]["meanReversion"],
        "volatility_of_variance": reference["parameters"]["volatilityOfVariance"],
        "correlation": reference["parameters"]["correlation"],
    }.items():
        assert abs(getattr(first.parameters, field) - expected) <= 2e-12
