export interface SsviParameters {
  atmVolatility: number;
  rho: number;
  eta: number;
}

export interface SsviInput {
  logMoneyness: number;
  timeToMaturity: number;
  parameters: SsviParameters;
}

export interface SsviNoArbitrageMargins {
  powerLawMargin: number;
  wingMargin: number;
  satisfied: boolean;
}

export interface DupireDerivatives {
  totalVariance: number;
  timeDerivative: number;
  logMoneynessDerivative: number;
  logMoneynessSecondDerivative: number;
}

export interface DupireResult {
  localVolatility: number;
  localVariance: number;
  densityDenominator: number;
  timeDerivative: number;
}

export type LocalVolErrorCode =
  | 'NON_FINITE_INPUT'
  | 'NON_POSITIVE_ATM_VOLATILITY'
  | 'INVALID_RHO'
  | 'NEGATIVE_ETA'
  | 'NON_POSITIVE_TIME'
  | 'STATIC_ARBITRAGE_CONSTRAINT'
  | 'NON_POSITIVE_TOTAL_VARIANCE'
  | 'NON_POSITIVE_TIME_DERIVATIVE'
  | 'NON_POSITIVE_DENSITY';

export class LocalVolError extends Error {
  readonly code: LocalVolErrorCode;
  readonly field?: string;

  constructor(code: LocalVolErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'LocalVolError';
    this.code = code;
    this.field = field;
  }
}

export const localVolSurfaceMaximumMaturity = 5;

function requireFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new LocalVolError('NON_FINITE_INPUT', `${field} must be a finite number.`, field);
  }
}

export function ssviNoArbitrageMargins(
  parameters: SsviParameters,
  maximumMaturity = localVolSurfaceMaximumMaturity,
): SsviNoArbitrageMargins {
  const thetaMaximum = parameters.atmVolatility ** 2 * maximumMaturity;
  const correlationScale = 1 + Math.abs(parameters.rho);
  const powerLawMargin = 4 - parameters.eta ** 2 * correlationScale;
  const wingMargin = 4 - parameters.eta * Math.sqrt(thetaMaximum) * correlationScale;
  return {
    powerLawMargin,
    wingMargin,
    satisfied: powerLawMargin >= 0 && wingMargin > 0,
  };
}

export function validateSsviParameters(
  parameters: SsviParameters,
  maximumMaturity = localVolSurfaceMaximumMaturity,
): void {
  requireFinite(parameters.atmVolatility, 'ATM volatility');
  requireFinite(parameters.rho, 'SSVI correlation');
  requireFinite(parameters.eta, 'SSVI curvature');
  requireFinite(maximumMaturity, 'Maximum maturity');
  if (parameters.atmVolatility <= 0) {
    throw new LocalVolError(
      'NON_POSITIVE_ATM_VOLATILITY',
      'ATM volatility must be strictly positive.',
      'atmVolatility',
    );
  }
  if (Math.abs(parameters.rho) >= 1) {
    throw new LocalVolError(
      'INVALID_RHO',
      'SSVI correlation must be strictly between −1 and 1.',
      'rho',
    );
  }
  if (parameters.eta < 0) {
    throw new LocalVolError('NEGATIVE_ETA', 'SSVI curvature cannot be negative.', 'eta');
  }
  if (maximumMaturity <= 0) {
    throw new LocalVolError(
      'NON_POSITIVE_TIME',
      'Maximum maturity must be strictly positive.',
      'maximumMaturity',
    );
  }
  if (!ssviNoArbitrageMargins(parameters, maximumMaturity).satisfied) {
    throw new LocalVolError(
      'STATIC_ARBITRAGE_CONSTRAINT',
      'These SSVI parameters violate the configured sufficient static-arbitrage conditions.',
    );
  }
}

function validateSsviInput(input: SsviInput): void {
  requireFinite(input.logMoneyness, 'Log moneyness');
  requireFinite(input.timeToMaturity, 'Time to maturity');
  validateSsviParameters(input.parameters);
  if (input.timeToMaturity <= 0) {
    throw new LocalVolError(
      'NON_POSITIVE_TIME',
      'SSVI volatility requires strictly positive time to maturity.',
      'timeToMaturity',
    );
  }
}

/** SSVI total implied variance w(k,T) with phi(theta)=eta/sqrt(theta). */
export function ssviTotalVariance(input: SsviInput): number {
  validateSsviInput(input);
  const { logMoneyness: k, timeToMaturity: time, parameters } = input;
  const theta = parameters.atmVolatility ** 2 * time;
  const phi = parameters.eta === 0 ? 0 : parameters.eta / Math.sqrt(theta);
  const x = phi * k + parameters.rho;
  return (
    (theta / 2) *
    (1 + parameters.rho * phi * k + Math.sqrt(x * x + 1 - parameters.rho * parameters.rho))
  );
}

export function ssviImpliedVolatility(input: SsviInput): number {
  return Math.sqrt(ssviTotalVariance(input) / input.timeToMaturity);
}

export function dupireLocalVolatilityFromDerivatives(
  logMoneyness: number,
  derivatives: DupireDerivatives,
): DupireResult {
  requireFinite(logMoneyness, 'Log moneyness');
  const { totalVariance: w, timeDerivative: wt, logMoneynessDerivative: wk } = derivatives;
  const wkk = derivatives.logMoneynessSecondDerivative;
  requireFinite(w, 'Total variance');
  requireFinite(wt, 'Total-variance time derivative');
  requireFinite(wk, 'Total-variance strike derivative');
  requireFinite(wkk, 'Total-variance strike second derivative');
  if (w <= 0) {
    throw new LocalVolError(
      'NON_POSITIVE_TOTAL_VARIANCE',
      'Dupire requires strictly positive total variance.',
    );
  }
  if (wt <= 0) {
    throw new LocalVolError(
      'NON_POSITIVE_TIME_DERIVATIVE',
      'The reconstructed surface has non-positive calendar variance growth at this point.',
    );
  }
  const densityDenominator =
    (1 - (logMoneyness * wk) / (2 * w)) ** 2 - (wk * wk * (1 / w + 0.25)) / 4 + wkk / 2;
  if (densityDenominator <= 0) {
    throw new LocalVolError(
      'NON_POSITIVE_DENSITY',
      'The reconstructed surface has a non-positive Dupire density denominator at this point.',
    );
  }
  const localVariance = wt / densityDenominator;
  return {
    localVariance,
    localVolatility: Math.sqrt(localVariance),
    densityDenominator,
    timeDerivative: wt,
  };
}

/** Analytic Dupire local volatility of the configured SSVI source surface. */
export function ssviLocalVolatility(input: SsviInput): DupireResult {
  validateSsviInput(input);
  const { logMoneyness: k, timeToMaturity: time, parameters } = input;
  const thetaRate = parameters.atmVolatility ** 2;
  const theta = thetaRate * time;
  const phi = parameters.eta === 0 ? 0 : parameters.eta / Math.sqrt(theta);
  const phiTheta = parameters.eta === 0 ? 0 : (-0.5 * phi) / theta;
  const x = phi * k + parameters.rho;
  const root = Math.sqrt(x * x + 1 - parameters.rho ** 2);
  const bracket = 1 + parameters.rho * phi * k + root;
  const totalVariance = (theta * bracket) / 2;
  const commonSlope = parameters.rho + x / root;
  const wk = (theta * phi * commonSlope) / 2;
  const wkk = (theta * phi * phi * (1 - parameters.rho ** 2)) / (2 * root ** 3);
  const bracketTheta = k * phiTheta * commonSlope;
  const wt = (thetaRate * (bracket + theta * bracketTheta)) / 2;
  return dupireLocalVolatilityFromDerivatives(k, {
    totalVariance,
    timeDerivative: wt,
    logMoneynessDerivative: wk,
    logMoneynessSecondDerivative: wkk,
  });
}
