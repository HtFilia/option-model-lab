import { black76Price, sabrLognormalVolatility, type SabrParameters } from '../quant/sabr';

export const defaultSabrParameters: SabrParameters = {
  alpha: 0.04,
  beta: 0.5,
  rho: -0.3,
  nu: 0.5,
};

export interface SabrSmilePoint {
  strike: number;
  strikePercent: number;
  impliedVolatility: number;
  flatVolatility: number;
  sabrPrice: number;
  flatPrice: number;
}

export function buildSabrSmile(
  forward: number,
  discountFactor: number,
  timeToMaturity: number,
  parameters: SabrParameters,
): SabrSmilePoint[] {
  const atmVolatility = sabrLognormalVolatility({
    forward,
    strike: forward,
    timeToMaturity,
    parameters,
  });
  return Array.from({ length: 25 }, (_, index) => 0.55 + index * 0.0375).map((multiplier) => {
    const strike = forward * multiplier;
    const impliedVolatility = sabrLognormalVolatility({
      forward,
      strike,
      timeToMaturity,
      parameters,
    });
    return {
      strike,
      strikePercent: strike * 100,
      impliedVolatility,
      flatVolatility: atmVolatility,
      sabrPrice: black76Price({
        type: 'call',
        forward,
        strike,
        timeToMaturity,
        volatility: impliedVolatility,
        discountFactor,
      }),
      flatPrice: black76Price({
        type: 'call',
        forward,
        strike,
        timeToMaturity,
        volatility: atmVolatility,
        discountFactor,
      }),
    };
  });
}

export interface SabrTermPoint {
  maturity: number;
  lowStrikeVolatility: number;
  atmVolatility: number;
  highStrikeVolatility: number;
}

export function buildSabrTermSlices(forward: number, parameters: SabrParameters): SabrTermPoint[] {
  return [0.25, 0.5, 1, 2, 3, 5, 7, 10].map((maturity) => ({
    maturity,
    lowStrikeVolatility: sabrLognormalVolatility({
      forward,
      strike: forward * 0.75,
      timeToMaturity: maturity,
      parameters,
    }),
    atmVolatility: sabrLognormalVolatility({
      forward,
      strike: forward,
      timeToMaturity: maturity,
      parameters,
    }),
    highStrikeVolatility: sabrLognormalVolatility({
      forward,
      strike: forward * 1.25,
      timeToMaturity: maturity,
      parameters,
    }),
  }));
}

export interface SabrCalibrationQuote {
  strike: number;
  marketImpliedVolatility: number;
}

export interface SabrCalibrationFitPoint extends SabrCalibrationQuote {
  modelImpliedVolatility: number;
  volatilityResidual: number;
}

export interface SabrCalibrationResult {
  parameters: SabrParameters;
  initialParameters: SabrParameters;
  initialObjective: number;
  finalObjective: number;
  iterations: number;
  evaluations: number;
  converged: boolean;
  fit: SabrCalibrationFitPoint[];
}

export const sabrCalibrationForward = 0.03;
export const sabrCalibrationMaturity = 2;
export const sabrCalibrationBeta = 0.5;
export const sabrCalibrationTargetParameters: SabrParameters = {
  alpha: 0.04,
  beta: sabrCalibrationBeta,
  rho: -0.3,
  nu: 0.5,
};
export const sabrCalibrationInitialParameters: SabrParameters = {
  alpha: 0.028,
  beta: sabrCalibrationBeta,
  rho: 0.05,
  nu: 0.22,
};
export const sabrCalibrationBounds = {
  alpha: [0.005, 0.12],
  rho: [-0.95, 0.95],
  nu: [0.01, 1.5],
} as const;
export const sabrCalibrationObjectiveTolerance = 2e-5;

const calibrationStrikeMultipliers = [0.65, 0.75, 0.85, 0.925, 1, 1.075, 1.15, 1.25, 1.35];

export function buildSabrCalibrationFixture(): SabrCalibrationQuote[] {
  return calibrationStrikeMultipliers.map((multiplier) => {
    const strike = sabrCalibrationForward * multiplier;
    return {
      strike,
      marketImpliedVolatility: sabrLognormalVolatility({
        forward: sabrCalibrationForward,
        strike,
        timeToMaturity: sabrCalibrationMaturity,
        parameters: sabrCalibrationTargetParameters,
      }),
    };
  });
}

export function evaluateSabrCalibrationFit(
  parameters: SabrParameters,
  quotes: SabrCalibrationQuote[],
): SabrCalibrationFitPoint[] {
  return quotes.map((quote) => {
    const modelImpliedVolatility = sabrLognormalVolatility({
      forward: sabrCalibrationForward,
      strike: quote.strike,
      timeToMaturity: sabrCalibrationMaturity,
      parameters,
    });
    return {
      ...quote,
      modelImpliedVolatility,
      volatilityResidual: modelImpliedVolatility - quote.marketImpliedVolatility,
    };
  });
}

function calibrationObjective(parameters: SabrParameters, quotes: SabrCalibrationQuote[]): number {
  const squaredErrors = evaluateSabrCalibrationFit(parameters, quotes).map(
    ({ volatilityResidual }) => volatilityResidual * volatilityResidual,
  );
  return Math.sqrt(squaredErrors.reduce((sum, value) => sum + value, 0) / squaredErrors.length);
}

type CalibratedKey = keyof typeof sabrCalibrationBounds;

function boundedCandidate(
  parameters: SabrParameters,
  key: CalibratedKey,
  value: number,
): SabrParameters {
  const [lower, upper] = sabrCalibrationBounds[key];
  return { ...parameters, [key]: Math.min(upper, Math.max(lower, value)) };
}

export function calibrateSabrFixture(
  quotes = buildSabrCalibrationFixture(),
): SabrCalibrationResult {
  const initialParameters = { ...sabrCalibrationInitialParameters };
  let parameters = { ...initialParameters };
  let objective = calibrationObjective(parameters, quotes);
  const initialObjective = objective;
  const steps: Record<CalibratedKey, number> = { alpha: 0.012, rho: 0.2, nu: 0.2 };
  const keys = Object.keys(steps) as CalibratedKey[];
  let evaluations = 1;
  let iterations = 0;

  while (iterations < 160) {
    iterations += 1;
    let improved = false;
    for (const key of keys) {
      let bestParameters = parameters;
      let bestObjective = objective;
      for (const direction of [-1, 1] as const) {
        const candidate = boundedCandidate(
          parameters,
          key,
          parameters[key] + direction * steps[key],
        );
        const candidateObjective = calibrationObjective(candidate, quotes);
        evaluations += 1;
        if (candidateObjective < bestObjective) {
          bestParameters = candidate;
          bestObjective = candidateObjective;
        }
      }
      if (bestObjective < objective) {
        parameters = bestParameters;
        objective = bestObjective;
        improved = true;
      }
    }
    if (objective <= sabrCalibrationObjectiveTolerance) break;
    if (!improved) {
      for (const key of keys) steps[key] *= 0.5;
      if (steps.alpha < 1e-6 && steps.rho < 1e-4 && steps.nu < 1e-4) break;
    }
  }

  return {
    parameters,
    initialParameters,
    initialObjective,
    finalObjective: objective,
    iterations,
    evaluations,
    converged: objective <= sabrCalibrationObjectiveTolerance,
    fit: evaluateSabrCalibrationFit(parameters, quotes),
  };
}
