import { standardNormalCdf, standardNormalPdf } from './normal';

export type OptionType = 'call' | 'put';

export interface EuropeanOption {
  type: OptionType;
  strike: number;
  timeToMaturity: number;
}

export interface MarketState {
  spot: number;
  riskFreeRate: number;
  dividendYield: number;
}

export interface BlackScholesInput {
  option: EuropeanOption;
  market: MarketState;
  volatility: number;
}

export interface BlackScholesResult {
  price: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
}

export interface NoArbitrageBounds {
  lower: number;
  upper: number;
}

export type ImpliedVolatilityStatus =
  | 'converged'
  | 'boundary-zero-volatility'
  | 'boundary-unbounded-volatility'
  | 'maximum-iterations'
  | 'bracket-failure';

export interface ImpliedVolatilityResult {
  impliedVolatility: number;
  repricedValue: number;
  residual: number;
  converged: boolean;
  iterations: number;
  status: ImpliedVolatilityStatus;
  bracket: readonly [number, number];
}

export interface ImpliedVolatilityInput {
  option: EuropeanOption;
  market: MarketState;
  marketPrice: number;
  maxIterations?: number;
  priceTolerance?: number;
  volatilityTolerance?: number;
  maximumVolatility?: number;
}

export type QuantErrorCode =
  | 'INVALID_OPTION_TYPE'
  | 'NON_FINITE_INPUT'
  | 'NON_POSITIVE_SPOT'
  | 'NON_POSITIVE_STRIKE'
  | 'NEGATIVE_TIME'
  | 'NEGATIVE_VOLATILITY'
  | 'INVALID_MARKET_PRICE'
  | 'PRICE_OUTSIDE_BOUNDS'
  | 'IMPLIED_VOLATILITY_AT_EXPIRY'
  | 'INVALID_SOLVER_CONFIGURATION';

export class QuantError extends Error {
  readonly code: QuantErrorCode;
  readonly field?: string;

  constructor(code: QuantErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'QuantError';
    this.code = code;
    this.field = field;
  }
}

function requireFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new QuantError('NON_FINITE_INPUT', `${field} must be a finite number.`, field);
  }
}

export function validateOptionAndMarket(option: EuropeanOption, market: MarketState): void {
  if (option.type !== 'call' && option.type !== 'put') {
    throw new QuantError('INVALID_OPTION_TYPE', 'Option type must be call or put.', 'type');
  }

  requireFinite(market.spot, 'Spot');
  requireFinite(option.strike, 'Strike');
  requireFinite(option.timeToMaturity, 'Time to maturity');
  requireFinite(market.riskFreeRate, 'Risk-free rate');
  requireFinite(market.dividendYield, 'Dividend yield');

  if (market.spot <= 0) {
    throw new QuantError('NON_POSITIVE_SPOT', 'Spot must be greater than zero.', 'spot');
  }
  if (option.strike <= 0) {
    throw new QuantError('NON_POSITIVE_STRIKE', 'Strike must be greater than zero.', 'strike');
  }
  if (option.timeToMaturity < 0) {
    throw new QuantError('NEGATIVE_TIME', 'Time to maturity cannot be negative.', 'timeToMaturity');
  }
}

export function validateBlackScholesInput(input: BlackScholesInput): void {
  validateOptionAndMarket(input.option, input.market);
  requireFinite(input.volatility, 'Volatility');
  if (input.volatility < 0) {
    throw new QuantError('NEGATIVE_VOLATILITY', 'Volatility cannot be negative.', 'volatility');
  }
}

function expiryResult(type: OptionType, spot: number, strike: number): BlackScholesResult {
  // At the payoff kink delta is not unique; the lab reports the symmetric midpoint.
  // Higher sensitivities are distributional/undefined there, so exact-expiry display uses zero
  // instead of forcing the closed form through T = 0.
  const moneyness = spot - strike;
  const callDelta = moneyness > 0 ? 1 : moneyness < 0 ? 0 : 0.5;
  const price = type === 'call' ? Math.max(moneyness, 0) : Math.max(-moneyness, 0);

  return {
    price,
    delta: type === 'call' ? callDelta : callDelta - 1,
    gamma: 0,
    vega: 0,
    theta: 0,
    rho: 0,
  };
}

function zeroVolatilityResult(input: BlackScholesInput): BlackScholesResult {
  const { option, market } = input;
  const { strike, timeToMaturity: time } = option;
  const { spot, riskFreeRate: rate, dividendYield } = market;
  const discountedSpot = spot * Math.exp(-dividendYield * time);
  const discountedStrike = strike * Math.exp(-rate * time);
  const forwardMoneyness = discountedSpot - discountedStrike;
  // The deterministic payoff also has a kink. Use the symmetric indicator at the boundary and
  // explicit zero gamma/vega; this makes the limiting convention visible and division-free.
  const callIndicator = forwardMoneyness > 0 ? 1 : forwardMoneyness < 0 ? 0 : 0.5;
  const indicator = option.type === 'call' ? callIndicator : callIndicator - 1;

  return {
    price: option.type === 'call' ? Math.max(forwardMoneyness, 0) : Math.max(-forwardMoneyness, 0),
    delta: Math.exp(-dividendYield * time) * indicator,
    gamma: 0,
    vega: 0,
    theta:
      option.type === 'call'
        ? callIndicator * (dividendYield * discountedSpot - rate * discountedStrike)
        : (callIndicator - 1) * (dividendYield * discountedSpot - rate * discountedStrike),
    rho:
      option.type === 'call'
        ? callIndicator * time * discountedStrike
        : (callIndicator - 1) * time * discountedStrike,
  };
}

export function priceBlackScholes(input: BlackScholesInput): BlackScholesResult {
  validateBlackScholesInput(input);

  const { option, market, volatility } = input;
  const { type, strike, timeToMaturity: time } = option;
  const { spot, riskFreeRate: rate, dividendYield } = market;

  if (time === 0) {
    return expiryResult(type, spot, strike);
  }
  if (volatility === 0) {
    return zeroVolatilityResult(input);
  }

  const sqrtTime = Math.sqrt(time);
  const volatilitySqrtTime = volatility * sqrtTime;
  const d1 =
    (Math.log(spot / strike) + (rate - dividendYield + 0.5 * volatility * volatility) * time) /
    volatilitySqrtTime;
  const d2 = d1 - volatilitySqrtTime;
  const discountedSpot = spot * Math.exp(-dividendYield * time);
  const discountedStrike = strike * Math.exp(-rate * time);
  const density = standardNormalPdf(d1);
  const commonTheta = -(discountedSpot * density * volatility) / (2 * sqrtTime);
  const gamma = (Math.exp(-dividendYield * time) * density) / (spot * volatilitySqrtTime);
  const vega = discountedSpot * density * sqrtTime;

  if (type === 'call') {
    return {
      price: discountedSpot * standardNormalCdf(d1) - discountedStrike * standardNormalCdf(d2),
      delta: Math.exp(-dividendYield * time) * standardNormalCdf(d1),
      gamma,
      vega,
      theta:
        commonTheta -
        rate * discountedStrike * standardNormalCdf(d2) +
        dividendYield * discountedSpot * standardNormalCdf(d1),
      rho: time * discountedStrike * standardNormalCdf(d2),
    };
  }

  return {
    price: discountedStrike * standardNormalCdf(-d2) - discountedSpot * standardNormalCdf(-d1),
    delta: Math.exp(-dividendYield * time) * (standardNormalCdf(d1) - 1),
    gamma,
    vega,
    theta:
      commonTheta +
      rate * discountedStrike * standardNormalCdf(-d2) -
      dividendYield * discountedSpot * standardNormalCdf(-d1),
    rho: -time * discountedStrike * standardNormalCdf(-d2),
  };
}

export function blackScholesPrice(input: BlackScholesInput): number {
  return priceBlackScholes(input).price;
}

export function europeanOptionPayoff(
  type: OptionType,
  terminalSpot: number,
  strike: number,
): number {
  if (type !== 'call' && type !== 'put') {
    throw new QuantError('INVALID_OPTION_TYPE', 'Option type must be call or put.', 'type');
  }
  requireFinite(terminalSpot, 'Terminal spot');
  requireFinite(strike, 'Strike');
  if (terminalSpot < 0) {
    throw new QuantError('NON_POSITIVE_SPOT', 'Terminal spot cannot be negative.', 'terminalSpot');
  }
  if (strike <= 0) {
    throw new QuantError('NON_POSITIVE_STRIKE', 'Strike must be greater than zero.', 'strike');
  }
  return type === 'call' ? Math.max(terminalSpot - strike, 0) : Math.max(strike - terminalSpot, 0);
}

export function putCallParityResidual(
  callPrice: number,
  putPrice: number,
  option: Omit<EuropeanOption, 'type'>,
  market: MarketState,
): number {
  validateOptionAndMarket({ ...option, type: 'call' }, market);
  requireFinite(callPrice, 'Call price');
  requireFinite(putPrice, 'Put price');

  const discountedSpot = market.spot * Math.exp(-market.dividendYield * option.timeToMaturity);
  const discountedStrike = option.strike * Math.exp(-market.riskFreeRate * option.timeToMaturity);
  return callPrice - putPrice - (discountedSpot - discountedStrike);
}

export function noArbitrageBounds(option: EuropeanOption, market: MarketState): NoArbitrageBounds {
  validateOptionAndMarket(option, market);
  const discountedSpot = market.spot * Math.exp(-market.dividendYield * option.timeToMaturity);
  const discountedStrike = option.strike * Math.exp(-market.riskFreeRate * option.timeToMaturity);

  if (option.type === 'call') {
    return {
      lower: Math.max(discountedSpot - discountedStrike, 0),
      upper: discountedSpot,
    };
  }

  return {
    lower: Math.max(discountedStrike - discountedSpot, 0),
    upper: discountedStrike,
  };
}

export function solveImpliedVolatility(input: ImpliedVolatilityInput): ImpliedVolatilityResult {
  const {
    option,
    market,
    marketPrice,
    maxIterations = 200,
    priceTolerance = 1e-10,
    volatilityTolerance = 1e-10,
    maximumVolatility = 16,
  } = input;

  validateOptionAndMarket(option, market);
  requireFinite(marketPrice, 'Market price');
  if (marketPrice < 0) {
    throw new QuantError(
      'INVALID_MARKET_PRICE',
      'Market option price cannot be negative.',
      'marketPrice',
    );
  }
  if (
    !Number.isInteger(maxIterations) ||
    maxIterations <= 0 ||
    !Number.isFinite(priceTolerance) ||
    priceTolerance <= 0 ||
    !Number.isFinite(volatilityTolerance) ||
    volatilityTolerance <= 0 ||
    !Number.isFinite(maximumVolatility) ||
    maximumVolatility <= 0
  ) {
    throw new QuantError(
      'INVALID_SOLVER_CONFIGURATION',
      'Solver tolerances, iteration limit, and maximum volatility must be positive.',
    );
  }

  const bounds = noArbitrageBounds(option, market);
  if (marketPrice < bounds.lower || marketPrice > bounds.upper) {
    throw new QuantError(
      'PRICE_OUTSIDE_BOUNDS',
      `Market price must lie between ${bounds.lower} and ${bounds.upper}.`,
      'marketPrice',
    );
  }
  if (option.timeToMaturity === 0) {
    throw new QuantError(
      'IMPLIED_VOLATILITY_AT_EXPIRY',
      'At expiry the option price is intrinsic value and does not identify volatility.',
      'timeToMaturity',
    );
  }
  if (marketPrice === bounds.lower) {
    return {
      impliedVolatility: 0,
      repricedValue: bounds.lower,
      residual: 0,
      converged: true,
      iterations: 0,
      status: 'boundary-zero-volatility',
      bracket: [0, 0],
    };
  }
  if (marketPrice === bounds.upper) {
    return {
      impliedVolatility: Number.POSITIVE_INFINITY,
      repricedValue: bounds.upper,
      residual: 0,
      converged: true,
      iterations: 0,
      status: 'boundary-unbounded-volatility',
      bracket: [maximumVolatility, Number.POSITIVE_INFINITY],
    };
  }

  const objective = (volatility: number) =>
    blackScholesPrice({ option, market, volatility }) - marketPrice;
  let low = 0;
  let high = Math.min(0.5, maximumVolatility);
  let highResidual = objective(high);

  while (highResidual < 0 && high < maximumVolatility) {
    high = Math.min(high * 2, maximumVolatility);
    highResidual = objective(high);
  }

  if (highResidual < 0) {
    const repricedValue = highResidual + marketPrice;
    return {
      impliedVolatility: high,
      repricedValue,
      residual: highResidual,
      converged: false,
      iterations: 0,
      status: 'bracket-failure',
      bracket: [low, high],
    };
  }

  const absolutePriceTolerance = priceTolerance * Math.max(1, Math.abs(marketPrice));
  let midpoint = 0.5 * (low + high);
  let residual = objective(midpoint);

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    midpoint = 0.5 * (low + high);
    residual = objective(midpoint);

    if (Math.abs(residual) <= absolutePriceTolerance || high - low <= volatilityTolerance) {
      return {
        impliedVolatility: midpoint,
        repricedValue: residual + marketPrice,
        residual,
        converged: true,
        iterations: iteration,
        status: 'converged',
        bracket: [low, high],
      };
    }

    if (residual > 0) {
      high = midpoint;
    } else {
      low = midpoint;
    }
  }

  return {
    impliedVolatility: midpoint,
    repricedValue: residual + marketPrice,
    residual,
    converged: false,
    iterations: maxIterations,
    status: 'maximum-iterations',
    bracket: [low, high],
  };
}
