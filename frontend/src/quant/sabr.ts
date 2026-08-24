import { standardNormalCdf } from './normal';

export type ForwardOptionType = 'call' | 'put';

export interface SabrParameters {
  alpha: number;
  beta: number;
  rho: number;
  nu: number;
}

export interface SabrVolatilityInput {
  forward: number;
  strike: number;
  timeToMaturity: number;
  parameters: SabrParameters;
}

export interface Black76Input {
  type: ForwardOptionType;
  forward: number;
  strike: number;
  timeToMaturity: number;
  volatility: number;
  discountFactor: number;
}

export interface SabrPriceInput extends Omit<Black76Input, 'volatility'> {
  parameters: SabrParameters;
}

export interface SabrPriceResult {
  price: number;
  impliedVolatility: number;
}

export type SabrErrorCode =
  | 'NON_FINITE_INPUT'
  | 'NON_POSITIVE_FORWARD'
  | 'NON_POSITIVE_STRIKE'
  | 'NEGATIVE_TIME'
  | 'NON_POSITIVE_ALPHA'
  | 'INVALID_BETA'
  | 'INVALID_RHO'
  | 'NEGATIVE_NU'
  | 'NEGATIVE_VOLATILITY'
  | 'NON_POSITIVE_DISCOUNT_FACTOR'
  | 'INVALID_OPTION_TYPE'
  | 'INVALID_APPROXIMATION';

export class SabrError extends Error {
  readonly code: SabrErrorCode;
  readonly field?: string;

  constructor(code: SabrErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'SabrError';
    this.code = code;
    this.field = field;
  }
}

function requireFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new SabrError('NON_FINITE_INPUT', `${field} must be a finite number.`, field);
  }
}

function validateForwardContract(forward: number, strike: number, timeToMaturity: number): void {
  requireFinite(forward, 'Forward');
  requireFinite(strike, 'Strike');
  requireFinite(timeToMaturity, 'Time to maturity');
  if (forward <= 0) {
    throw new SabrError(
      'NON_POSITIVE_FORWARD',
      'Forward must be strictly positive for the unshifted lognormal SABR convention.',
      'forward',
    );
  }
  if (strike <= 0) {
    throw new SabrError(
      'NON_POSITIVE_STRIKE',
      'Strike must be strictly positive for the unshifted lognormal SABR convention.',
      'strike',
    );
  }
  if (timeToMaturity < 0) {
    throw new SabrError('NEGATIVE_TIME', 'Time to maturity cannot be negative.', 'timeToMaturity');
  }
}

export function validateSabrParameters(parameters: SabrParameters): void {
  requireFinite(parameters.alpha, 'Alpha');
  requireFinite(parameters.beta, 'Beta');
  requireFinite(parameters.rho, 'Rho');
  requireFinite(parameters.nu, 'Nu');
  if (parameters.alpha <= 0) {
    throw new SabrError('NON_POSITIVE_ALPHA', 'Alpha must be strictly positive.', 'alpha');
  }
  if (parameters.beta < 0 || parameters.beta > 1) {
    throw new SabrError('INVALID_BETA', 'Beta must lie between 0 and 1.', 'beta');
  }
  if (Math.abs(parameters.rho) >= 1) {
    throw new SabrError('INVALID_RHO', 'Rho must be strictly between −1 and 1.', 'rho');
  }
  if (parameters.nu < 0) {
    throw new SabrError('NEGATIVE_NU', 'Nu cannot be negative.', 'nu');
  }
}

function zOverX(z: number, rho: number): number {
  if (z * z <= Number.EPSILON * 10) {
    return 1 - 0.5 * rho * z + ((2 - 3 * rho * rho) * z * z) / 12;
  }
  const radicand = 1 - 2 * rho * z + z * z;
  const ratio = (Math.sqrt(radicand) + z - rho) / (1 - rho);
  return z / Math.log(ratio);
}

/**
 * Hagan et al. first-order asymptotic Black (lognormal) implied volatility.
 * The function is forward-based and intentionally does not implement a shift
 * or the normal-volatility SABR convention.
 */
export function sabrLognormalVolatility(input: SabrVolatilityInput): number {
  const { forward, strike, timeToMaturity, parameters } = input;
  validateForwardContract(forward, strike, timeToMaturity);
  validateSabrParameters(parameters);

  const { alpha, beta, rho, nu } = parameters;
  const oneMinusBeta = 1 - beta;
  const a = Math.pow(forward * strike, oneMinusBeta);
  const sqrtA = Math.sqrt(a);
  const logMoneyness = Math.log(forward / strike);
  const z = (nu / alpha) * sqrtA * logMoneyness;
  const c = oneMinusBeta * oneMinusBeta * logMoneyness * logMoneyness;
  const denominator = sqrtA * (1 + c / 24 + (c * c) / 1920);
  const timeCorrection =
    1 +
    timeToMaturity *
      ((oneMinusBeta * oneMinusBeta * alpha * alpha) / (24 * a) +
        (rho * beta * nu * alpha) / (4 * sqrtA) +
        ((2 - 3 * rho * rho) * nu * nu) / 24);
  const volatility = (alpha / denominator) * zOverX(z, rho) * timeCorrection;

  if (!Number.isFinite(volatility) || volatility < 0) {
    throw new SabrError(
      'INVALID_APPROXIMATION',
      'This parameter combination makes the lognormal SABR approximation invalid.',
    );
  }
  return volatility;
}

export function black76Price(input: Black76Input): number {
  const { type, forward, strike, timeToMaturity, volatility, discountFactor } = input;
  validateForwardContract(forward, strike, timeToMaturity);
  requireFinite(volatility, 'Volatility');
  requireFinite(discountFactor, 'Discount factor');
  if (type !== 'call' && type !== 'put') {
    throw new SabrError('INVALID_OPTION_TYPE', 'Option type must be call or put.', 'type');
  }
  if (volatility < 0) {
    throw new SabrError(
      'NEGATIVE_VOLATILITY',
      'Black-76 volatility cannot be negative.',
      'volatility',
    );
  }
  if (discountFactor <= 0) {
    throw new SabrError(
      'NON_POSITIVE_DISCOUNT_FACTOR',
      'Discount factor must be strictly positive.',
      'discountFactor',
    );
  }

  const signedIntrinsic = type === 'call' ? forward - strike : strike - forward;
  if (timeToMaturity === 0 || volatility === 0) {
    return discountFactor * Math.max(signedIntrinsic, 0);
  }

  const standardDeviation = volatility * Math.sqrt(timeToMaturity);
  const d1 = Math.log(forward / strike) / standardDeviation + 0.5 * standardDeviation;
  const d2 = d1 - standardDeviation;
  if (type === 'call') {
    return discountFactor * (forward * standardNormalCdf(d1) - strike * standardNormalCdf(d2));
  }
  return discountFactor * (strike * standardNormalCdf(-d2) - forward * standardNormalCdf(-d1));
}

export function priceSabr(input: SabrPriceInput): SabrPriceResult {
  const impliedVolatility = sabrLognormalVolatility(input);
  return {
    impliedVolatility,
    price: black76Price({ ...input, volatility: impliedVolatility }),
  };
}
