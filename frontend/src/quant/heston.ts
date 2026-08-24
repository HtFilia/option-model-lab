import {
  priceBlackScholes,
  type EuropeanOption,
  type MarketState,
  type OptionType,
} from './blackScholes';

export interface HestonParameters {
  /** Initial variance. Volatility at time zero is sqrt(initialVariance). */
  initialVariance: number;
  /** Long-run variance level. */
  longRunVariance: number;
  /** Annualized speed of variance mean reversion. */
  meanReversion: number;
  /** Volatility of variance, often denoted xi. */
  volatilityOfVariance: number;
  /** Instantaneous correlation between spot and variance Brownian shocks. */
  correlation: number;
}

export interface HestonInput {
  option: EuropeanOption;
  market: MarketState;
  parameters: HestonParameters;
}

export interface HestonPriceResult {
  price: number;
  callPrice: number;
  probability1: number;
  probability2: number;
  integrationEvaluations: number;
  integrationUpperBound: number;
  fellerSatisfied: boolean;
  fellerMargin: number;
}

export type HestonErrorCode =
  | 'NON_FINITE_INPUT'
  | 'NON_POSITIVE_SPOT'
  | 'NON_POSITIVE_STRIKE'
  | 'NEGATIVE_TIME'
  | 'NEGATIVE_VARIANCE'
  | 'NON_POSITIVE_MEAN_REVERSION'
  | 'NON_POSITIVE_VOL_OF_VOL'
  | 'INVALID_CORRELATION';

export class HestonError extends Error {
  readonly code: HestonErrorCode;
  readonly field?: string;

  constructor(code: HestonErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'HestonError';
    this.code = code;
    this.field = field;
  }
}

interface Complex {
  re: number;
  im: number;
}

const INTEGRATION_ORDER = 96;
const INTEGRATION_UPPER_BOUND = 150;
const DETERMINISTIC_VARIANCE_THRESHOLD = 1e-3;

function complex(re: number, im = 0): Complex {
  return { re, im };
}

function add(left: Complex, right: Complex): Complex {
  return complex(left.re + right.re, left.im + right.im);
}

function subtract(left: Complex, right: Complex): Complex {
  return complex(left.re - right.re, left.im - right.im);
}

function multiply(left: Complex, right: Complex): Complex {
  return complex(left.re * right.re - left.im * right.im, left.re * right.im + left.im * right.re);
}

function scale(value: Complex, factor: number): Complex {
  return complex(value.re * factor, value.im * factor);
}

function divide(left: Complex, right: Complex): Complex {
  const denominator = right.re * right.re + right.im * right.im;
  return complex(
    (left.re * right.re + left.im * right.im) / denominator,
    (left.im * right.re - left.re * right.im) / denominator,
  );
}

function complexExp(value: Complex): Complex {
  const magnitude = Math.exp(value.re);
  return complex(magnitude * Math.cos(value.im), magnitude * Math.sin(value.im));
}

function complexLog(value: Complex): Complex {
  return complex(Math.log(Math.hypot(value.re, value.im)), Math.atan2(value.im, value.re));
}

function complexSqrt(value: Complex): Complex {
  const magnitude = Math.hypot(value.re, value.im);
  const real = Math.sqrt(Math.max(0, 0.5 * (magnitude + value.re)));
  const imaginaryMagnitude = Math.sqrt(Math.max(0, 0.5 * (magnitude - value.re)));
  return complex(real, value.im < 0 ? -imaginaryMagnitude : imaginaryMagnitude);
}

function requireFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new HestonError('NON_FINITE_INPUT', `${field} must be a finite number.`, field);
  }
}

export function validateHestonInput(input: HestonInput): void {
  const { option, market, parameters } = input;
  requireFinite(market.spot, 'Spot');
  requireFinite(option.strike, 'Strike');
  requireFinite(option.timeToMaturity, 'Time to maturity');
  requireFinite(market.riskFreeRate, 'Risk-free rate');
  requireFinite(market.dividendYield, 'Dividend yield');
  requireFinite(parameters.initialVariance, 'Initial variance');
  requireFinite(parameters.longRunVariance, 'Long-run variance');
  requireFinite(parameters.meanReversion, 'Mean reversion');
  requireFinite(parameters.volatilityOfVariance, 'Volatility of variance');
  requireFinite(parameters.correlation, 'Correlation');

  if (market.spot <= 0) {
    throw new HestonError('NON_POSITIVE_SPOT', 'Spot must be greater than zero.', 'spot');
  }
  if (option.strike <= 0) {
    throw new HestonError('NON_POSITIVE_STRIKE', 'Strike must be greater than zero.', 'strike');
  }
  if (option.timeToMaturity < 0) {
    throw new HestonError(
      'NEGATIVE_TIME',
      'Time to maturity cannot be negative.',
      'timeToMaturity',
    );
  }
  if (parameters.initialVariance < 0 || parameters.longRunVariance < 0) {
    throw new HestonError(
      'NEGATIVE_VARIANCE',
      'Initial and long-run variance cannot be negative.',
      parameters.initialVariance < 0 ? 'initialVariance' : 'longRunVariance',
    );
  }
  if (parameters.meanReversion <= 0) {
    throw new HestonError(
      'NON_POSITIVE_MEAN_REVERSION',
      'Mean reversion must be greater than zero.',
      'meanReversion',
    );
  }
  if (parameters.volatilityOfVariance <= 0) {
    throw new HestonError(
      'NON_POSITIVE_VOL_OF_VOL',
      'Volatility of variance must be greater than zero.',
      'volatilityOfVariance',
    );
  }
  if (parameters.correlation < -1 || parameters.correlation > 1) {
    throw new HestonError(
      'INVALID_CORRELATION',
      'Spot/variance correlation must lie between -1 and 1.',
      'correlation',
    );
  }
}

export function hestonFellerMargin(parameters: HestonParameters): number {
  return (
    2 * parameters.meanReversion * parameters.longRunVariance -
    parameters.volatilityOfVariance * parameters.volatilityOfVariance
  );
}

/**
 * Characteristic function of log(S_T) under the risk-neutral Heston dynamics.
 *
 * Convention:
 *   dS/S = (r-q)dt + sqrt(v)dW_S
 *   dv   = kappa(theta-v)dt + xi sqrt(v)dW_v
 *   d<W_S,W_v> = rho dt
 *
 * The implementation uses the numerically stable "little Heston trap" form with
 * d chosen on the principal square-root branch and g = (b-d)/(b+d).
 */
function characteristicFunctionAt(input: HestonInput, argument: Complex): Complex {
  const { market, option, parameters } = input;
  const time = option.timeToMaturity;
  const { meanReversion: kappa, longRunVariance: theta } = parameters;
  const xi = parameters.volatilityOfVariance;
  const rho = parameters.correlation;
  const iArgument = complex(-argument.im, argument.re);
  const argumentSquared = multiply(argument, argument);
  const b = subtract(complex(kappa), scale(iArgument, rho * xi));
  const discriminant = add(multiply(b, b), scale(add(argumentSquared, iArgument), xi * xi));
  const d = complexSqrt(discriminant);
  const bMinusD = subtract(b, d);
  const g = divide(bMinusD, add(b, d));
  const expMinusDt = complexExp(scale(d, -time));
  const one = complex(1);
  const oneMinusGExp = subtract(one, multiply(g, expMinusDt));
  const oneMinusG = subtract(one, g);
  const logRatio = complexLog(divide(oneMinusGExp, oneMinusG));
  const cVariance = scale(
    subtract(scale(bMinusD, time), scale(logRatio, 2)),
    (kappa * theta) / (xi * xi),
  );
  const dVariance = scale(
    multiply(bMinusD, divide(subtract(one, expMinusDt), oneMinusGExp)),
    1 / (xi * xi),
  );
  const logForward = Math.log(market.spot) + (market.riskFreeRate - market.dividendYield) * time;
  return complexExp(
    add(add(scale(iArgument, logForward), cVariance), scale(dVariance, parameters.initialVariance)),
  );
}

export function hestonCharacteristicFunction(
  input: HestonInput,
  realArgument: number,
  imaginaryArgument = 0,
): Readonly<Complex> {
  validateHestonInput(input);
  requireFinite(realArgument, 'Characteristic-function real argument');
  requireFinite(imaginaryArgument, 'Characteristic-function imaginary argument');
  return characteristicFunctionAt(input, complex(realArgument, imaginaryArgument));
}

interface QuadraturePoint {
  node: number;
  weight: number;
}

function gaussLegendrePoints(order: number, lower: number, upper: number): QuadraturePoint[] {
  const points = Array.from({ length: order }, () => ({ node: 0, weight: 0 }));
  const midpoint = 0.5 * (lower + upper);
  const halfWidth = 0.5 * (upper - lower);
  const rootCount = Math.ceil(order / 2);

  for (let index = 0; index < rootCount; index += 1) {
    let root = Math.cos((Math.PI * (index + 0.75)) / (order + 0.5));
    let derivative = 0;

    for (let iteration = 0; iteration < 20; iteration += 1) {
      let previous = 1;
      let current = root;
      for (let degree = 2; degree <= order; degree += 1) {
        const next = ((2 * degree - 1) * root * current - (degree - 1) * previous) / degree;
        previous = current;
        current = next;
      }
      derivative = (order * (root * current - previous)) / (root * root - 1);
      const nextRoot = root - current / derivative;
      if (Math.abs(nextRoot - root) <= 1e-15) {
        root = nextRoot;
        break;
      }
      root = nextRoot;
    }

    const weight = (2 * halfWidth) / ((1 - root * root) * derivative * derivative);
    points[index] = { node: midpoint - halfWidth * root, weight };
    points[order - 1 - index] = { node: midpoint + halfWidth * root, weight };
  }
  return points;
}

const quadraturePoints = gaussLegendrePoints(INTEGRATION_ORDER, 0, INTEGRATION_UPPER_BOUND);

function probabilityIntegrals(input: HestonInput): readonly [number, number] {
  const logStrike = Math.log(input.option.strike);
  const phiMinusI = characteristicFunctionAt(input, complex(0, -1));
  let integral1 = 0;
  let integral2 = 0;

  for (const { node: u, weight } of quadraturePoints) {
    const exponential = complexExp(complex(0, -u * logStrike));
    const iU = complex(0, u);
    const phi1 = characteristicFunctionAt(input, complex(u, -1));
    const phi2 = characteristicFunctionAt(input, complex(u, 0));
    integral1 += weight * divide(multiply(exponential, phi1), multiply(iU, phiMinusI)).re;
    integral2 += weight * divide(multiply(exponential, phi2), iU).re;
  }

  return [0.5 + integral1 / Math.PI, 0.5 + integral2 / Math.PI];
}

export function priceHeston(input: HestonInput): HestonPriceResult {
  validateHestonInput(input);
  const { option, market, parameters } = input;
  const time = option.timeToMaturity;
  const fellerMargin = hestonFellerMargin(parameters);

  if (time === 0) {
    const intrinsic =
      option.type === 'call'
        ? Math.max(market.spot - option.strike, 0)
        : Math.max(option.strike - market.spot, 0);
    return {
      price: intrinsic,
      callPrice: Math.max(market.spot - option.strike, 0),
      probability1: Number.NaN,
      probability2: Number.NaN,
      integrationEvaluations: 0,
      integrationUpperBound: INTEGRATION_UPPER_BOUND,
      fellerSatisfied: fellerMargin >= 0,
      fellerMargin,
    };
  }

  // The general characteristic function contains xi^-2 terms whose cancellation becomes
  // ill-conditioned as xi tends to zero. In that limit variance follows its deterministic
  // mean-reverting path, so its exact time-average gives the equivalent Black–Scholes variance.
  if (parameters.volatilityOfVariance <= DETERMINISTIC_VARIANCE_THRESHOLD) {
    const averageVariance =
      parameters.longRunVariance +
      ((parameters.initialVariance - parameters.longRunVariance) *
        (1 - Math.exp(-parameters.meanReversion * time))) /
        (parameters.meanReversion * time);
    const volatility = Math.sqrt(Math.max(averageVariance, 0));
    const callPrice = priceBlackScholes({
      option: { ...option, type: 'call' },
      market,
      volatility,
    }).price;
    const price = priceBlackScholes({ option, market, volatility }).price;
    return {
      price,
      callPrice,
      probability1: Number.NaN,
      probability2: Number.NaN,
      integrationEvaluations: 0,
      integrationUpperBound: INTEGRATION_UPPER_BOUND,
      fellerSatisfied: fellerMargin >= 0,
      fellerMargin,
    };
  }

  const [probability1, probability2] = probabilityIntegrals(input);
  const discountedSpot = market.spot * Math.exp(-market.dividendYield * time);
  const discountedStrike = option.strike * Math.exp(-market.riskFreeRate * time);
  const callPrice = discountedSpot * probability1 - discountedStrike * probability2;
  const price = option.type === 'call' ? callPrice : callPrice - discountedSpot + discountedStrike;

  return {
    price,
    callPrice,
    probability1,
    probability2,
    integrationEvaluations: INTEGRATION_ORDER * 2,
    integrationUpperBound: INTEGRATION_UPPER_BOUND,
    fellerSatisfied: fellerMargin >= 0,
    fellerMargin,
  };
}

export function hestonPriceFor(
  type: OptionType,
  strike: number,
  timeToMaturity: number,
  market: MarketState,
  parameters: HestonParameters,
): number {
  return priceHeston({ option: { type, strike, timeToMaturity }, market, parameters }).price;
}
