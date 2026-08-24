import type {
  HestonCalibrationFitPoint,
  HestonCalibrationQuote,
  HestonCalibrationResult,
} from '../features/hestonLab';
import type { MarketState } from '../quant/blackScholes';
import type { HestonParameters } from '../quant/heston';
import { requestJson } from './client';
import { ApiProtocolError } from './errors';

interface HestonCalibrationRequest {
  market: MarketState;
  quotes: HestonCalibrationQuote[];
  maxIterations: number;
  objectiveTolerance: number;
}

const DEFAULT_MAX_ITERATIONS = 120;
const DEFAULT_OBJECTIVE_TOLERANCE = 5e-4;

function record(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ApiProtocolError(`The API returned an invalid ${context}.`);
  }
  return value as Record<string, unknown>;
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiProtocolError(`The API returned an invalid ${field}.`);
  }
  return value;
}

function integer(value: unknown, field: string): number {
  const parsed = finiteNumber(value, field);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiProtocolError(`The API returned an invalid ${field}.`);
  }
  return parsed;
}

function parameters(value: unknown, context: string): HestonParameters {
  const payload = record(value, context);
  return {
    initialVariance: finiteNumber(payload.initialVariance, `${context} initial variance`),
    longRunVariance: finiteNumber(payload.longRunVariance, `${context} long-run variance`),
    meanReversion: finiteNumber(payload.meanReversion, `${context} mean reversion`),
    volatilityOfVariance: finiteNumber(
      payload.volatilityOfVariance,
      `${context} volatility of variance`,
    ),
    correlation: finiteNumber(payload.correlation, `${context} correlation`),
  };
}

function fitPoint(value: unknown, index: number): HestonCalibrationFitPoint {
  const context = `calibration fit point ${index + 1}`;
  const payload = record(value, context);
  return {
    strike: finiteNumber(payload.strike, `${context} strike`),
    timeToMaturity: finiteNumber(payload.timeToMaturity, `${context} maturity`),
    marketPrice: finiteNumber(payload.marketPrice, `${context} market price`),
    marketImpliedVolatility: finiteNumber(
      payload.marketImpliedVolatility,
      `${context} market implied volatility`,
    ),
    modelPrice: finiteNumber(payload.modelPrice, `${context} model price`),
    modelImpliedVolatility: finiteNumber(
      payload.modelImpliedVolatility,
      `${context} model implied volatility`,
    ),
    priceResidual: finiteNumber(payload.priceResidual, `${context} price residual`),
    volatilityResidual: finiteNumber(payload.volatilityResidual, `${context} volatility residual`),
  };
}

export function parseHestonCalibrationResponse(value: unknown): HestonCalibrationResult {
  const payload = record(value, 'Heston calibration response');
  if (typeof payload.converged !== 'boolean') {
    throw new ApiProtocolError('The API returned an invalid convergence status.');
  }
  if (!Array.isArray(payload.fit) || payload.fit.length === 0 || payload.fit.length > 50) {
    throw new ApiProtocolError('The API returned an invalid calibration fit.');
  }
  return {
    parameters: parameters(payload.parameters, 'calibrated parameters'),
    initialParameters: parameters(payload.initialParameters, 'initial parameters'),
    initialObjective: finiteNumber(payload.initialObjective, 'initial objective'),
    finalObjective: finiteNumber(payload.finalObjective, 'final objective'),
    iterations: integer(payload.iterations, 'iteration count'),
    evaluations: integer(payload.evaluations, 'evaluation count'),
    converged: payload.converged,
    fit: payload.fit.map(fitPoint),
  };
}

export async function calibrateHestonRemote(
  market: MarketState,
  quotes: HestonCalibrationQuote[],
  fetchImplementation: typeof fetch = fetch,
): Promise<HestonCalibrationResult> {
  const request: HestonCalibrationRequest = {
    market,
    quotes,
    maxIterations: DEFAULT_MAX_ITERATIONS,
    objectiveTolerance: DEFAULT_OBJECTIVE_TOLERANCE,
  };
  const response = await requestJson<unknown>(
    '/api/v1/heston/calibrate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    fetchImplementation,
  );
  return parseHestonCalibrationResponse(response);
}
