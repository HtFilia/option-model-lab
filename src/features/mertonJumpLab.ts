import { blackScholesPrice, solveImpliedVolatility, type MarketState } from '../quant/blackScholes';
import {
  mertonJumpPriceFor,
  mertonLogReturnDensity,
  type MertonJumpParameters,
} from '../quant/mertonJumpDiffusion';

export const defaultMertonJumpParameters: MertonJumpParameters = {
  diffusionVolatility: 0.16,
  jumpIntensity: 0.8,
  meanLogJump: -0.1,
  jumpVolatility: 0.18,
};

export interface MertonSmilePoint {
  strike: number;
  mertonImpliedVolatility: number;
  diffusionVolatility: number;
  mertonPrice: number;
}

export function buildMertonSmile(
  market: MarketState,
  parameters: MertonJumpParameters,
  timeToMaturity: number,
): MertonSmilePoint[] {
  return Array.from({ length: 17 }, (_, index) => 0.7 + index * 0.0375).map((multiplier) => {
    const strike = Number((market.spot * multiplier).toFixed(4));
    const option = { type: 'call' as const, strike, timeToMaturity };
    const mertonPrice = mertonJumpPriceFor('call', strike, timeToMaturity, market, parameters);
    return {
      strike,
      mertonImpliedVolatility: solveImpliedVolatility({
        option,
        market,
        marketPrice: mertonPrice,
      }).impliedVolatility,
      diffusionVolatility: parameters.diffusionVolatility,
      mertonPrice,
    };
  });
}

export interface TerminalDensityPoint {
  spot: number;
  mertonDensity: number;
  diffusionDensity: number;
}

export function buildMertonTerminalDensity(
  market: MarketState,
  parameters: MertonJumpParameters,
  timeToMaturity: number,
): TerminalDensityPoint[] {
  const densityOption = { type: 'call' as const, strike: market.spot, timeToMaturity };
  const diffusionParameters: MertonJumpParameters = { ...parameters, jumpIntensity: 0 };
  return Array.from({ length: 91 }, (_, index) => market.spot * (0.35 + index * 0.015)).map(
    (terminalSpot) => {
      const logReturn = Math.log(terminalSpot / market.spot);
      return {
        spot: terminalSpot,
        mertonDensity:
          mertonLogReturnDensity({ option: densityOption, market, parameters }, logReturn) /
          terminalSpot,
        diffusionDensity:
          mertonLogReturnDensity(
            { option: densityOption, market, parameters: diffusionParameters },
            logReturn,
          ) / terminalSpot,
      };
    },
  );
}

export interface JumpCountPoint {
  jumps: number;
  probability: number;
}

export function buildJumpCountProbabilities(
  jumpIntensity: number,
  timeToMaturity: number,
  displayedCounts = 5,
): JumpCountPoint[] {
  const poissonMean = jumpIntensity * timeToMaturity;
  let probability = Math.exp(-poissonMean);
  const points: JumpCountPoint[] = [];
  let accumulated = 0;
  for (let jumps = 0; jumps < displayedCounts; jumps += 1) {
    if (jumps === displayedCounts - 1) {
      points.push({ jumps, probability: Math.max(0, 1 - accumulated) });
    } else {
      points.push({ jumps, probability });
      accumulated += probability;
      probability *= poissonMean / (jumps + 1);
    }
  }
  return points;
}

export interface MertonCalibrationQuote {
  strike: number;
  marketPrice: number;
  marketImpliedVolatility: number;
}

export interface MertonCalibrationFitPoint extends MertonCalibrationQuote {
  modelPrice: number;
  modelImpliedVolatility: number;
  priceResidual: number;
  volatilityResidual: number;
}

export interface MertonCalibrationResult {
  parameters: MertonJumpParameters;
  initialParameters: MertonJumpParameters;
  initialObjective: number;
  finalObjective: number;
  iterations: number;
  evaluations: number;
  converged: boolean;
  fit: MertonCalibrationFitPoint[];
}

export const mertonCalibrationMaturity = 0.25;
export const mertonCalibrationTargetParameters: MertonJumpParameters = {
  diffusionVolatility: 0.15,
  jumpIntensity: 1.2,
  meanLogJump: -0.12,
  jumpVolatility: 0.2,
};
export const mertonCalibrationInitialParameters: MertonJumpParameters = {
  diffusionVolatility: 0.15,
  jumpIntensity: 0.35,
  meanLogJump: -0.03,
  jumpVolatility: 0.1,
};
export const mertonCalibrationBounds = {
  jumpIntensity: [0.05, 3],
  meanLogJump: [-0.3, 0.1],
  jumpVolatility: [0.05, 0.4],
} as const;
export const mertonCalibrationObjectiveTolerance = 2e-5;

const calibrationStrikes = [75, 82.5, 90, 95, 100, 105, 110, 117.5, 125] as const;

export function buildMertonCalibrationFixture(market: MarketState): MertonCalibrationQuote[] {
  return calibrationStrikes.map((strike) => {
    const option = { type: 'call' as const, strike, timeToMaturity: mertonCalibrationMaturity };
    const marketPrice = mertonJumpPriceFor(
      'call',
      strike,
      mertonCalibrationMaturity,
      market,
      mertonCalibrationTargetParameters,
    );
    return {
      strike,
      marketPrice,
      marketImpliedVolatility: solveImpliedVolatility({ option, market, marketPrice })
        .impliedVolatility,
    };
  });
}

export function evaluateMertonCalibrationFit(
  parameters: MertonJumpParameters,
  market: MarketState,
  quotes: MertonCalibrationQuote[],
): MertonCalibrationFitPoint[] {
  return quotes.map((quote) => {
    const option = {
      type: 'call' as const,
      strike: quote.strike,
      timeToMaturity: mertonCalibrationMaturity,
    };
    const modelPrice = mertonJumpPriceFor(
      'call',
      quote.strike,
      mertonCalibrationMaturity,
      market,
      parameters,
    );
    const modelImpliedVolatility = solveImpliedVolatility({
      option,
      market,
      marketPrice: modelPrice,
    }).impliedVolatility;
    return {
      ...quote,
      modelPrice,
      modelImpliedVolatility,
      priceResidual: modelPrice - quote.marketPrice,
      volatilityResidual: modelImpliedVolatility - quote.marketImpliedVolatility,
    };
  });
}

function calibrationObjective(
  parameters: MertonJumpParameters,
  market: MarketState,
  quotes: MertonCalibrationQuote[],
): number {
  const squaredErrors = quotes.map((quote) => {
    const price = mertonJumpPriceFor(
      'call',
      quote.strike,
      mertonCalibrationMaturity,
      market,
      parameters,
    );
    const normalized = (price - quote.marketPrice) / market.spot;
    return normalized * normalized;
  });
  return Math.sqrt(squaredErrors.reduce((sum, value) => sum + value, 0) / quotes.length);
}

type CalibratedKey = keyof typeof mertonCalibrationBounds;

function boundedCandidate(
  parameters: MertonJumpParameters,
  key: CalibratedKey,
  value: number,
): MertonJumpParameters {
  const [lower, upper] = mertonCalibrationBounds[key];
  return { ...parameters, [key]: Math.min(upper, Math.max(lower, value)) };
}

export function calibrateMertonFixture(
  market: MarketState,
  quotes = buildMertonCalibrationFixture(market),
): MertonCalibrationResult {
  const initialParameters = { ...mertonCalibrationInitialParameters };
  let parameters = { ...initialParameters };
  let objective = calibrationObjective(parameters, market, quotes);
  const initialObjective = objective;
  const steps: Record<CalibratedKey, number> = {
    jumpIntensity: 0.5,
    meanLogJump: 0.06,
    jumpVolatility: 0.08,
  };
  const keys = Object.keys(steps) as CalibratedKey[];
  let evaluations = 1;
  let iterations = 0;

  while (iterations < 120) {
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
        const candidateObjective = calibrationObjective(candidate, market, quotes);
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

    if (objective <= mertonCalibrationObjectiveTolerance) {
      break;
    }
    if (!improved) {
      for (const key of keys) steps[key] *= 0.5;
      if (Math.max(...keys.map((key) => steps[key])) < 1e-4) break;
    }
  }

  return {
    parameters,
    initialParameters,
    initialObjective,
    finalObjective: objective,
    iterations,
    evaluations,
    converged: objective <= mertonCalibrationObjectiveTolerance,
    fit: evaluateMertonCalibrationFit(parameters, market, quotes),
  };
}

export function blackScholesDiffusionPrice(
  market: MarketState,
  strike: number,
  timeToMaturity: number,
  parameters: MertonJumpParameters,
): number {
  return blackScholesPrice({
    option: { type: 'call', strike, timeToMaturity },
    market,
    volatility: parameters.diffusionVolatility,
  });
}
