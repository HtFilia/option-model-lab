import {
  priceBlackScholes,
  solveImpliedVolatility,
  type MarketState,
  type OptionType,
} from '../quant/blackScholes';

export interface SyntheticSurfaceShape {
  baseVolatility: number;
  skew: number;
  curvature: number;
  termSlope: number;
}

export interface ImpliedVolatilitySurfacePoint {
  strike: number;
  timeToMaturity: number;
  marketPrice: number;
  impliedVolatility: number;
  iterations: number;
}

export const defaultSurfaceShape: SyntheticSurfaceShape = {
  baseVolatility: 0.2,
  skew: -0.18,
  curvature: 0.28,
  termSlope: 0.015,
};

export const surfaceStrikeMultipliers = [0.75, 0.85, 0.925, 1, 1.075, 1.15, 1.25] as const;
export const surfaceMaturities = [0.25, 0.5, 1, 2, 3] as const;

function requirePositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number.`);
  }
}

function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be a finite number.`);
  }
}

export function syntheticSurfaceVolatility(
  strike: number,
  timeToMaturity: number,
  spot: number,
  shape: SyntheticSurfaceShape,
): number {
  requirePositiveFinite(strike, 'Strike');
  requirePositiveFinite(timeToMaturity, 'Time to maturity');
  requirePositiveFinite(spot, 'Spot');
  requirePositiveFinite(shape.baseVolatility, 'Base volatility');
  requireFinite(shape.skew, 'Skew');
  requireFinite(shape.curvature, 'Curvature');
  requireFinite(shape.termSlope, 'Term slope');

  const logMoneyness = Math.log(strike / spot);
  const volatility =
    shape.baseVolatility +
    shape.skew * logMoneyness +
    shape.curvature * logMoneyness * logMoneyness +
    shape.termSlope * (Math.sqrt(timeToMaturity) - 1);

  if (volatility <= 0) {
    throw new RangeError(
      'This synthetic surface shape produces a non-positive volatility. Adjust its level or slopes.',
    );
  }
  return volatility;
}

function invertSyntheticQuote(
  type: OptionType,
  strike: number,
  timeToMaturity: number,
  market: MarketState,
  shape: SyntheticSurfaceShape,
): ImpliedVolatilitySurfacePoint {
  const volatility = syntheticSurfaceVolatility(strike, timeToMaturity, market.spot, shape);
  const option = { type, strike, timeToMaturity };
  const marketPrice = priceBlackScholes({ option, market, volatility }).price;
  const inversion = solveImpliedVolatility({
    option,
    market,
    marketPrice,
    priceTolerance: 1e-12,
    volatilityTolerance: 1e-12,
  });

  return {
    strike,
    timeToMaturity,
    marketPrice,
    impliedVolatility: inversion.impliedVolatility,
    iterations: inversion.iterations,
  };
}

export function buildSyntheticImpliedVolatilitySurface(
  type: OptionType,
  market: MarketState,
  shape: SyntheticSurfaceShape,
): ImpliedVolatilitySurfacePoint[] {
  return surfaceMaturities.flatMap((timeToMaturity) =>
    surfaceStrikeMultipliers.map((multiplier) =>
      invertSyntheticQuote(
        type,
        Number((market.spot * multiplier).toFixed(4)),
        timeToMaturity,
        market,
        shape,
      ),
    ),
  );
}

export function buildSyntheticSmileSlice(
  type: OptionType,
  market: MarketState,
  shape: SyntheticSurfaceShape,
  timeToMaturity: number,
): ImpliedVolatilitySurfacePoint[] {
  return Array.from({ length: 21 }, (_, index) => 0.75 + index * 0.025).map((multiplier) =>
    invertSyntheticQuote(
      type,
      Number((market.spot * multiplier).toFixed(4)),
      timeToMaturity,
      market,
      shape,
    ),
  );
}
