import {
  LocalVolError,
  dupireLocalVolatilityFromDerivatives,
  ssviImpliedVolatility,
  ssviLocalVolatility,
  type DupireResult,
  type SsviParameters,
} from '../quant/localVol';

export const defaultLocalVolSurfaceParameters: SsviParameters = {
  atmVolatility: 0.2,
  rho: -0.4,
  eta: 1.1,
};

export const localVolLogMoneynessNodes = Array.from(
  { length: 17 },
  (_, index) => -0.6 + index * 0.075,
);
export const localVolMaturityNodes = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5];

export interface LocalVolQuote {
  logMoneyness: number;
  timeToMaturity: number;
  impliedVolatility: number;
  totalVariance: number;
  noise: number;
}

export interface ReconstructionSettings {
  quoteNoiseBasisPoints: number;
  logMoneynessStep: number;
  timeStep: number;
}

export const defaultReconstructionSettings: ReconstructionSettings = {
  quoteNoiseBasisPoints: 0,
  logMoneynessStep: 0.025,
  timeStep: 0.025,
};

function deterministicNoise(strikeIndex: number, maturityIndex: number): number {
  return Math.sin((strikeIndex + 1) * 1.73 + (maturityIndex + 1) * 0.91);
}

export function buildLocalVolQuotes(
  parameters: SsviParameters,
  quoteNoiseBasisPoints = 0,
): LocalVolQuote[] {
  if (!Number.isFinite(quoteNoiseBasisPoints) || quoteNoiseBasisPoints < 0) {
    throw new LocalVolError(
      'NON_FINITE_INPUT',
      'Quote-noise magnitude must be a finite non-negative number.',
      'quoteNoiseBasisPoints',
    );
  }
  const noiseScale = quoteNoiseBasisPoints / 10_000;
  return localVolMaturityNodes.flatMap((timeToMaturity, maturityIndex) =>
    localVolLogMoneynessNodes.map((logMoneyness, strikeIndex) => {
      const sourceVolatility = ssviImpliedVolatility({
        logMoneyness,
        timeToMaturity,
        parameters,
      });
      const noise = noiseScale * deterministicNoise(strikeIndex, maturityIndex);
      const impliedVolatility = sourceVolatility + noise;
      if (impliedVolatility <= 0) {
        throw new LocalVolError(
          'NON_POSITIVE_TOTAL_VARIANCE',
          'The noisy quote surface contains a non-positive implied volatility.',
        );
      }
      return {
        logMoneyness,
        timeToMaturity,
        impliedVolatility,
        totalVariance: impliedVolatility ** 2 * timeToMaturity,
        noise,
      };
    }),
  );
}

function fourPointWindow(nodes: readonly number[], value: number): number[] {
  if (value < nodes[0]! || value > nodes[nodes.length - 1]!) {
    throw new LocalVolError(
      'NON_FINITE_INPUT',
      'Interpolation point lies outside the controlled quote grid.',
    );
  }
  let upper = nodes.findIndex((node) => node >= value);
  if (upper < 0) upper = nodes.length - 1;
  const start = Math.max(0, Math.min(nodes.length - 4, upper - 1));
  return [start, start + 1, start + 2, start + 3];
}

function lagrange(value: number, nodes: number[], values: number[]): number {
  return values.reduce((sum, y, index) => {
    let basis = 1;
    for (let other = 0; other < nodes.length; other += 1) {
      if (other !== index) basis *= (value - nodes[other]!) / (nodes[index]! - nodes[other]!);
    }
    return sum + y * basis;
  }, 0);
}

export function interpolateTotalVariance(
  quotes: LocalVolQuote[],
  logMoneyness: number,
  timeToMaturity: number,
): number {
  const strikeIndices = fourPointWindow(localVolLogMoneynessNodes, logMoneyness);
  const maturityIndices = fourPointWindow(localVolMaturityNodes, timeToMaturity);
  const rowValues = maturityIndices.map((maturityIndex) => {
    const nodeTime = localVolMaturityNodes[maturityIndex]!;
    const strikeNodes = strikeIndices.map((index) => localVolLogMoneynessNodes[index]!);
    const values = strikeIndices.map((strikeIndex) => {
      const quote = quotes.find(
        (item) =>
          item.timeToMaturity === nodeTime &&
          item.logMoneyness === localVolLogMoneynessNodes[strikeIndex],
      );
      if (!quote) throw new Error('The local-vol quote grid is incomplete.');
      return quote.totalVariance;
    });
    return lagrange(logMoneyness, strikeNodes, values);
  });
  // SSVI power-law surfaces are smoother in square-root time than calendar time.
  // The coordinate choice is explicit because it changes differentiation quality.
  return lagrange(
    Math.sqrt(timeToMaturity),
    maturityIndices.map((index) => Math.sqrt(localVolMaturityNodes[index]!)),
    rowValues,
  );
}

export function reconstructLocalVolatility(
  quotes: LocalVolQuote[],
  logMoneyness: number,
  timeToMaturity: number,
  settings: ReconstructionSettings,
): DupireResult {
  const hk = settings.logMoneynessStep;
  const ht = settings.timeStep;
  if (!Number.isFinite(hk) || !Number.isFinite(ht) || hk <= 0 || ht <= 0) {
    throw new LocalVolError(
      'NON_FINITE_INPUT',
      'Finite-difference steps must be finite and strictly positive.',
    );
  }
  const w = interpolateTotalVariance(quotes, logMoneyness, timeToMaturity);
  const wkPlus = interpolateTotalVariance(quotes, logMoneyness + hk, timeToMaturity);
  const wkMinus = interpolateTotalVariance(quotes, logMoneyness - hk, timeToMaturity);
  const wtPlus = interpolateTotalVariance(quotes, logMoneyness, timeToMaturity + ht);
  const wtMinus = interpolateTotalVariance(quotes, logMoneyness, timeToMaturity - ht);
  return dupireLocalVolatilityFromDerivatives(logMoneyness, {
    totalVariance: w,
    timeDerivative: (wtPlus - wtMinus) / (2 * ht),
    logMoneynessDerivative: (wkPlus - wkMinus) / (2 * hk),
    logMoneynessSecondDerivative: (wkPlus - 2 * w + wkMinus) / (hk * hk),
  });
}

export interface LocalVolSlicePoint {
  logMoneyness: number;
  strike: number;
  impliedVolatility: number;
  sourceLocalVolatility: number;
  reconstructedLocalVolatility: number | null;
  reconstructionError: number | null;
  valid: boolean;
}

export function buildLocalVolSlice(
  parameters: SsviParameters,
  timeToMaturity: number,
  settings = defaultReconstructionSettings,
): LocalVolSlicePoint[] {
  const quotes = buildLocalVolQuotes(parameters, settings.quoteNoiseBasisPoints);
  return Array.from({ length: 29 }, (_, index) => -0.35 + index * 0.025).map((logMoneyness) => {
    const impliedVolatility = ssviImpliedVolatility({
      logMoneyness,
      timeToMaturity,
      parameters,
    });
    const sourceLocalVolatility = ssviLocalVolatility({
      logMoneyness,
      timeToMaturity,
      parameters,
    }).localVolatility;
    try {
      const reconstructedLocalVolatility = reconstructLocalVolatility(
        quotes,
        logMoneyness,
        timeToMaturity,
        settings,
      ).localVolatility;
      return {
        logMoneyness,
        strike: 100 * Math.exp(logMoneyness),
        impliedVolatility,
        sourceLocalVolatility,
        reconstructedLocalVolatility,
        reconstructionError: reconstructedLocalVolatility - sourceLocalVolatility,
        valid: true,
      };
    } catch (error) {
      if (!(error instanceof LocalVolError)) throw error;
      return {
        logMoneyness,
        strike: 100 * Math.exp(logMoneyness),
        impliedVolatility,
        sourceLocalVolatility,
        reconstructedLocalVolatility: null,
        reconstructionError: null,
        valid: false,
      };
    }
  });
}

export interface LocalVolSurfacePoint {
  logMoneyness: number;
  strike: number;
  timeToMaturity: number;
  impliedVolatility: number;
  localVolatility: number;
}

export function buildLocalVolSurface(parameters: SsviParameters): LocalVolSurfacePoint[] {
  const maturities = [0.25, 0.5, 1, 2, 3, 5];
  const logMoneynessValues = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3];
  return maturities.flatMap((timeToMaturity) =>
    logMoneynessValues.map((logMoneyness) => ({
      logMoneyness,
      strike: 100 * Math.exp(logMoneyness),
      timeToMaturity,
      impliedVolatility: ssviImpliedVolatility({ logMoneyness, timeToMaturity, parameters }),
      localVolatility: ssviLocalVolatility({ logMoneyness, timeToMaturity, parameters })
        .localVolatility,
    })),
  );
}
