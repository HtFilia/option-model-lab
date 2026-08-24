from __future__ import annotations

import cmath
import math
from dataclasses import dataclass
from typing import Literal

from scipy.special import ndtr, roots_legendre

OptionType = Literal["call", "put"]

INTEGRATION_ORDER = 96
INTEGRATION_UPPER_BOUND = 150.0
DETERMINISTIC_VARIANCE_THRESHOLD = 1e-3
CALIBRATION_OBJECTIVE_TOLERANCE = 5e-4
MAX_CALIBRATION_ITERATIONS = 120


@dataclass(frozen=True)
class EuropeanOption:
    type: OptionType
    strike: float
    time_to_maturity: float


@dataclass(frozen=True)
class MarketState:
    spot: float
    risk_free_rate: float
    dividend_yield: float


@dataclass(frozen=True)
class HestonParameters:
    initial_variance: float
    long_run_variance: float
    mean_reversion: float
    volatility_of_variance: float
    correlation: float


@dataclass(frozen=True)
class HestonInput:
    option: EuropeanOption
    market: MarketState
    parameters: HestonParameters


@dataclass(frozen=True)
class HestonPriceResult:
    price: float
    call_price: float
    probability1: float
    probability2: float
    integration_evaluations: int
    integration_upper_bound: float
    feller_satisfied: bool
    feller_margin: float


@dataclass(frozen=True)
class HestonCalibrationQuote:
    strike: float
    time_to_maturity: float
    market_price: float
    market_implied_volatility: float


@dataclass(frozen=True)
class HestonCalibrationFitPoint:
    strike: float
    time_to_maturity: float
    market_price: float
    market_implied_volatility: float
    model_price: float
    model_implied_volatility: float
    price_residual: float
    volatility_residual: float


@dataclass(frozen=True)
class HestonCalibrationResult:
    parameters: HestonParameters
    initial_parameters: HestonParameters
    initial_objective: float
    final_objective: float
    iterations: int
    evaluations: int
    converged: bool
    fit: tuple[HestonCalibrationFitPoint, ...]


class HestonError(ValueError):
    def __init__(self, code: str, message: str, field: str | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.field = field


DEFAULT_PARAMETERS = HestonParameters(
    initial_variance=0.04,
    long_run_variance=0.05,
    mean_reversion=1.5,
    volatility_of_variance=0.5,
    correlation=-0.7,
)

CALIBRATION_TARGET_PARAMETERS = DEFAULT_PARAMETERS
CALIBRATION_INITIAL_PARAMETERS = HestonParameters(
    initial_variance=0.07,
    long_run_variance=0.08,
    mean_reversion=0.8,
    volatility_of_variance=0.8,
    correlation=-0.3,
)

PARAMETER_BOUNDS: dict[str, tuple[float, float]] = {
    "initial_variance": (0.01, 0.16),
    "long_run_variance": (0.01, 0.16),
    "mean_reversion": (0.2, 5.0),
    "volatility_of_variance": (0.1, 1.2),
    "correlation": (-0.95, 0.2),
}

_raw_nodes, _raw_weights = roots_legendre(INTEGRATION_ORDER)
_quadrature_nodes = 0.5 * INTEGRATION_UPPER_BOUND * (_raw_nodes + 1.0)
_quadrature_weights = 0.5 * INTEGRATION_UPPER_BOUND * _raw_weights


def _require_finite(value: float, field: str) -> None:
    if not math.isfinite(value):
        raise HestonError("NON_FINITE_INPUT", f"{field} must be a finite number.", field)


def validate_heston_input(input_value: HestonInput) -> None:
    option = input_value.option
    market = input_value.market
    parameters = input_value.parameters
    values = (
        (market.spot, "spot"),
        (option.strike, "strike"),
        (option.time_to_maturity, "time_to_maturity"),
        (market.risk_free_rate, "risk_free_rate"),
        (market.dividend_yield, "dividend_yield"),
        (parameters.initial_variance, "initial_variance"),
        (parameters.long_run_variance, "long_run_variance"),
        (parameters.mean_reversion, "mean_reversion"),
        (parameters.volatility_of_variance, "volatility_of_variance"),
        (parameters.correlation, "correlation"),
    )
    for value, field in values:
        _require_finite(value, field)

    if option.type not in {"call", "put"}:
        raise HestonError("INVALID_OPTION_TYPE", "Option type must be call or put.", "type")
    if market.spot <= 0:
        raise HestonError("NON_POSITIVE_SPOT", "Spot must be greater than zero.", "spot")
    if option.strike <= 0:
        raise HestonError("NON_POSITIVE_STRIKE", "Strike must be greater than zero.", "strike")
    if option.time_to_maturity < 0:
        raise HestonError(
            "NEGATIVE_TIME",
            "Time to maturity cannot be negative.",
            "time_to_maturity",
        )
    if parameters.initial_variance < 0 or parameters.long_run_variance < 0:
        field = "initial_variance" if parameters.initial_variance < 0 else "long_run_variance"
        raise HestonError(
            "NEGATIVE_VARIANCE",
            "Initial and long-run variance cannot be negative.",
            field,
        )
    if parameters.mean_reversion <= 0:
        raise HestonError(
            "NON_POSITIVE_MEAN_REVERSION",
            "Mean reversion must be greater than zero.",
            "mean_reversion",
        )
    if parameters.volatility_of_variance <= 0:
        raise HestonError(
            "NON_POSITIVE_VOL_OF_VOL",
            "Volatility of variance must be greater than zero.",
            "volatility_of_variance",
        )
    if not -1 <= parameters.correlation <= 1:
        raise HestonError(
            "INVALID_CORRELATION",
            "Spot/variance correlation must lie between -1 and 1.",
            "correlation",
        )


def heston_feller_margin(parameters: HestonParameters) -> float:
    return (
        2 * parameters.mean_reversion * parameters.long_run_variance
        - parameters.volatility_of_variance**2
    )


def _characteristic_function(input_value: HestonInput, argument: complex) -> complex:
    market = input_value.market
    option = input_value.option
    parameters = input_value.parameters
    time = option.time_to_maturity
    kappa = parameters.mean_reversion
    theta = parameters.long_run_variance
    xi = parameters.volatility_of_variance
    rho = parameters.correlation
    i_argument = 1j * argument
    b = kappa - rho * xi * i_argument
    discriminant = b * b + xi * xi * (argument * argument + i_argument)
    d = cmath.sqrt(discriminant)
    b_minus_d = b - d
    g = b_minus_d / (b + d)
    exp_minus_dt = cmath.exp(-d * time)
    one_minus_g_exp = 1 - g * exp_minus_dt
    log_ratio = cmath.log(one_minus_g_exp / (1 - g))
    c_variance = (kappa * theta / (xi * xi)) * (b_minus_d * time - 2 * log_ratio)
    d_variance = (b_minus_d / (xi * xi)) * (1 - exp_minus_dt) / one_minus_g_exp
    log_forward = math.log(market.spot) + (market.risk_free_rate - market.dividend_yield) * time
    return cmath.exp(
        i_argument * log_forward + c_variance + d_variance * parameters.initial_variance
    )


def heston_characteristic_function(input_value: HestonInput, argument: complex) -> complex:
    validate_heston_input(input_value)
    _require_finite(argument.real, "characteristic_function_real_argument")
    _require_finite(argument.imag, "characteristic_function_imaginary_argument")
    return _characteristic_function(input_value, argument)


def _probability_integrals(input_value: HestonInput) -> tuple[float, float]:
    log_strike = math.log(input_value.option.strike)
    phi_minus_i = _characteristic_function(input_value, -1j)
    integral1 = 0.0
    integral2 = 0.0
    for node, weight in zip(_quadrature_nodes, _quadrature_weights, strict=True):
        u = float(node)
        exponential = cmath.exp(-1j * u * log_strike)
        phi1 = _characteristic_function(input_value, complex(u, -1))
        phi2 = _characteristic_function(input_value, complex(u, 0))
        integral1 += float(weight) * (exponential * phi1 / (1j * u * phi_minus_i)).real
        integral2 += float(weight) * (exponential * phi2 / (1j * u)).real
    return 0.5 + integral1 / math.pi, 0.5 + integral2 / math.pi


def _black_scholes_price(
    option: EuropeanOption,
    market: MarketState,
    volatility: float,
) -> float:
    time = option.time_to_maturity
    discounted_spot = market.spot * math.exp(-market.dividend_yield * time)
    discounted_strike = option.strike * math.exp(-market.risk_free_rate * time)
    if time == 0 or volatility == 0:
        forward_intrinsic = (
            discounted_spot - discounted_strike
            if option.type == "call"
            else discounted_strike - discounted_spot
        )
        return max(forward_intrinsic, 0.0)
    standard_deviation = volatility * math.sqrt(time)
    d1 = (
        math.log(market.spot / option.strike)
        + (market.risk_free_rate - market.dividend_yield + 0.5 * volatility**2) * time
    ) / standard_deviation
    d2 = d1 - standard_deviation
    if option.type == "call":
        return discounted_spot * float(ndtr(d1)) - discounted_strike * float(ndtr(d2))
    return discounted_strike * float(ndtr(-d2)) - discounted_spot * float(ndtr(-d1))


def _implied_volatility(option: EuropeanOption, market: MarketState, market_price: float) -> float:
    lower_price = _black_scholes_price(option, market, 0.0)
    upper_price = (
        market.spot * math.exp(-market.dividend_yield * option.time_to_maturity)
        if option.type == "call"
        else option.strike * math.exp(-market.risk_free_rate * option.time_to_maturity)
    )
    if market_price < lower_price - 1e-12 or market_price > upper_price + 1e-12:
        raise HestonError(
            "INVALID_MARKET_PRICE",
            "Market price lies outside Black–Scholes no-arbitrage bounds.",
            "market_price",
        )
    if abs(market_price - lower_price) <= 1e-12:
        return 0.0
    lower = 0.0
    upper = 5.0
    for _ in range(100):
        midpoint = 0.5 * (lower + upper)
        value = _black_scholes_price(option, market, midpoint)
        if abs(value - market_price) <= 1e-10:
            return midpoint
        if value < market_price:
            lower = midpoint
        else:
            upper = midpoint
    return 0.5 * (lower + upper)


def price_heston(input_value: HestonInput) -> HestonPriceResult:
    validate_heston_input(input_value)
    option = input_value.option
    market = input_value.market
    parameters = input_value.parameters
    time = option.time_to_maturity
    feller_margin = heston_feller_margin(parameters)

    if time == 0:
        intrinsic = (
            max(market.spot - option.strike, 0.0)
            if option.type == "call"
            else max(option.strike - market.spot, 0.0)
        )
        return HestonPriceResult(
            price=intrinsic,
            call_price=max(market.spot - option.strike, 0.0),
            probability1=math.nan,
            probability2=math.nan,
            integration_evaluations=0,
            integration_upper_bound=INTEGRATION_UPPER_BOUND,
            feller_satisfied=feller_margin >= 0,
            feller_margin=feller_margin,
        )

    if parameters.volatility_of_variance <= DETERMINISTIC_VARIANCE_THRESHOLD:
        average_variance = parameters.long_run_variance + (
            (parameters.initial_variance - parameters.long_run_variance)
            * (1 - math.exp(-parameters.mean_reversion * time))
            / (parameters.mean_reversion * time)
        )
        volatility = math.sqrt(max(average_variance, 0.0))
        call_price = _black_scholes_price(
            EuropeanOption("call", option.strike, time), market, volatility
        )
        price = _black_scholes_price(option, market, volatility)
        return HestonPriceResult(
            price=price,
            call_price=call_price,
            probability1=math.nan,
            probability2=math.nan,
            integration_evaluations=0,
            integration_upper_bound=INTEGRATION_UPPER_BOUND,
            feller_satisfied=feller_margin >= 0,
            feller_margin=feller_margin,
        )

    probability1, probability2 = _probability_integrals(input_value)
    discounted_spot = market.spot * math.exp(-market.dividend_yield * time)
    discounted_strike = option.strike * math.exp(-market.risk_free_rate * time)
    call_price = discounted_spot * probability1 - discounted_strike * probability2
    price = (
        call_price if option.type == "call" else call_price - discounted_spot + discounted_strike
    )
    return HestonPriceResult(
        price=price,
        call_price=call_price,
        probability1=probability1,
        probability2=probability2,
        integration_evaluations=INTEGRATION_ORDER * 2,
        integration_upper_bound=INTEGRATION_UPPER_BOUND,
        feller_satisfied=feller_margin >= 0,
        feller_margin=feller_margin,
    )


def heston_price_for(
    option_type: OptionType,
    strike: float,
    time_to_maturity: float,
    market: MarketState,
    parameters: HestonParameters,
) -> float:
    return price_heston(
        HestonInput(EuropeanOption(option_type, strike, time_to_maturity), market, parameters)
    ).price


def build_heston_calibration_fixture(
    market: MarketState,
) -> tuple[HestonCalibrationQuote, ...]:
    strikes = (80.0, 90.0, 100.0, 110.0, 120.0)
    maturities = (0.5, 1.0, 2.0)
    quotes: list[HestonCalibrationQuote] = []
    for time_to_maturity in maturities:
        for strike in strikes:
            option = EuropeanOption("call", strike, time_to_maturity)
            market_price = heston_price_for(
                "call", strike, time_to_maturity, market, CALIBRATION_TARGET_PARAMETERS
            )
            quotes.append(
                HestonCalibrationQuote(
                    strike=strike,
                    time_to_maturity=time_to_maturity,
                    market_price=market_price,
                    market_implied_volatility=_implied_volatility(option, market, market_price),
                )
            )
    return tuple(quotes)


def _parameter_vector(parameters: HestonParameters) -> list[float]:
    return [
        parameters.initial_variance,
        parameters.long_run_variance,
        parameters.mean_reversion,
        parameters.volatility_of_variance,
        parameters.correlation,
    ]


def _parameters(vector: list[float]) -> HestonParameters:
    return HestonParameters(*vector)


def _within_bounds(parameters: HestonParameters) -> bool:
    return all(
        lower <= getattr(parameters, field) <= upper
        for field, (lower, upper) in PARAMETER_BOUNDS.items()
    )


def _combine(left: list[float], right: list[float], right_scale: float) -> list[float]:
    return [left_value + right_scale * right[index] for index, left_value in enumerate(left)]


def _objective(
    parameters: HestonParameters,
    market: MarketState,
    quotes: tuple[HestonCalibrationQuote, ...],
) -> float:
    squared_errors = [
        (
            (
                heston_price_for(
                    "call",
                    quote.strike,
                    quote.time_to_maturity,
                    market,
                    parameters,
                )
                - quote.market_price
            )
            / market.spot
        )
        ** 2
        for quote in quotes
    ]
    return math.sqrt(sum(squared_errors) / len(squared_errors))


def _calibration_fit(
    parameters: HestonParameters,
    market: MarketState,
    quotes: tuple[HestonCalibrationQuote, ...],
) -> tuple[HestonCalibrationFitPoint, ...]:
    fit: list[HestonCalibrationFitPoint] = []
    for quote in quotes:
        option = EuropeanOption("call", quote.strike, quote.time_to_maturity)
        model_price = heston_price_for(
            "call", quote.strike, quote.time_to_maturity, market, parameters
        )
        model_implied_volatility = _implied_volatility(option, market, model_price)
        fit.append(
            HestonCalibrationFitPoint(
                strike=quote.strike,
                time_to_maturity=quote.time_to_maturity,
                market_price=quote.market_price,
                market_implied_volatility=quote.market_implied_volatility,
                model_price=model_price,
                model_implied_volatility=model_implied_volatility,
                price_residual=model_price - quote.market_price,
                volatility_residual=model_implied_volatility - quote.market_implied_volatility,
            )
        )
    return tuple(fit)


def calibrate_heston(
    market: MarketState,
    quotes: tuple[HestonCalibrationQuote, ...],
    *,
    max_iterations: int = MAX_CALIBRATION_ITERATIONS,
    objective_tolerance: float = CALIBRATION_OBJECTIVE_TOLERANCE,
) -> HestonCalibrationResult:
    if not quotes:
        raise HestonError("EMPTY_QUOTES", "At least one calibration quote is required.", "quotes")
    if max_iterations <= 0 or max_iterations > MAX_CALIBRATION_ITERATIONS:
        raise HestonError(
            "INVALID_ITERATION_LIMIT",
            f"Iterations must be between 1 and {MAX_CALIBRATION_ITERATIONS}.",
            "max_iterations",
        )
    if not math.isfinite(objective_tolerance) or objective_tolerance <= 0:
        raise HestonError(
            "INVALID_OBJECTIVE_TOLERANCE",
            "Objective tolerance must be finite and greater than zero.",
            "objective_tolerance",
        )

    initial_parameters = CALIBRATION_INITIAL_PARAMETERS
    initial_vector = _parameter_vector(initial_parameters)
    initial_steps = [0.025, 0.025, 0.6, 0.25, 0.3]
    simplex = [initial_vector]
    for dimension, step in enumerate(initial_steps):
        vertex = initial_vector.copy()
        vertex[dimension] += step
        simplex.append(vertex)

    evaluations = 0

    def evaluate(vector: list[float]) -> float:
        nonlocal evaluations
        evaluations += 1
        parameters = _parameters(vector)
        return _objective(parameters, market, quotes) if _within_bounds(parameters) else math.inf

    values = [evaluate(vertex) for vertex in simplex]
    initial_objective = values[0]
    dimensions = len(initial_vector)
    iterations = 0

    while iterations < max_iterations:
        ordering = sorted(range(len(values)), key=values.__getitem__)
        simplex = [simplex[index] for index in ordering]
        values = [values[index] for index in ordering]
        if values[0] < objective_tolerance or values[dimensions] - values[0] < 1e-9:
            break

        centroid = [
            sum(vertex[coordinate] for vertex in simplex[:dimensions]) / dimensions
            for coordinate in range(dimensions)
        ]
        worst = simplex[dimensions]
        away_from_worst = _combine(centroid, worst, -1)
        reflected = _combine(centroid, away_from_worst, 1)
        reflected_value = evaluate(reflected)

        if reflected_value < values[0]:
            expanded = _combine(centroid, away_from_worst, 2)
            expanded_value = evaluate(expanded)
            if expanded_value < reflected_value:
                simplex[dimensions] = expanded
                values[dimensions] = expanded_value
            else:
                simplex[dimensions] = reflected
                values[dimensions] = reflected_value
        elif reflected_value < values[dimensions - 1]:
            simplex[dimensions] = reflected
            values[dimensions] = reflected_value
        else:
            contracted_direction = _combine(worst, centroid, -1)
            contracted = _combine(centroid, contracted_direction, 0.5)
            contracted_value = evaluate(contracted)
            if contracted_value < values[dimensions]:
                simplex[dimensions] = contracted
                values[dimensions] = contracted_value
            else:
                best = simplex[0]
                for vertex_index in range(1, dimensions + 1):
                    simplex[vertex_index] = _combine(
                        best,
                        _combine(simplex[vertex_index], best, -1),
                        0.5,
                    )
                    values[vertex_index] = evaluate(simplex[vertex_index])
        iterations += 1

    ordering = sorted(range(len(values)), key=values.__getitem__)
    parameters = _parameters(simplex[ordering[0]])
    final_objective = values[ordering[0]]
    return HestonCalibrationResult(
        parameters=parameters,
        initial_parameters=initial_parameters,
        initial_objective=initial_objective,
        final_objective=final_objective,
        iterations=iterations,
        evaluations=evaluations,
        converged=final_objective <= objective_tolerance,
        fit=_calibration_fit(parameters, market, quotes),
    )
