import { describe, expect, it } from 'vitest';
import {
  buildSyntheticImpliedVolatilitySurface,
  defaultSurfaceShape,
  surfaceMaturities,
  surfaceStrikeMultipliers,
  syntheticSurfaceVolatility,
} from '../src/features/blackScholesSurface';

const market = { spot: 100, riskFreeRate: 0.05, dividendYield: 0.02 };

describe('synthetic implied-volatility surface', () => {
  it('recovers every generated quote through independent Black–Scholes inversions', () => {
    const points = buildSyntheticImpliedVolatilitySurface('call', market, defaultSurfaceShape);

    expect(points).toHaveLength(surfaceMaturities.length * surfaceStrikeMultipliers.length);
    for (const point of points) {
      const generatedVolatility = syntheticSurfaceVolatility(
        point.strike,
        point.timeToMaturity,
        market.spot,
        defaultSurfaceShape,
      );
      // The surface builder prices and then solves each quote. A 1e-8 volatility tolerance is
      // well below a displayed basis point while allowing for low-vega wing quotes.
      expect(Math.abs(point.impliedVolatility - generatedVolatility)).toBeLessThanOrEqual(1e-8);
      expect(point.marketPrice).toBeGreaterThanOrEqual(0);
    }
  });

  it('makes negative skew lift lower strikes and term slope lift longer maturities', () => {
    const lowStrike = syntheticSurfaceVolatility(80, 1, 100, defaultSurfaceShape);
    const highStrike = syntheticSurfaceVolatility(120, 1, 100, defaultSurfaceShape);
    expect(lowStrike).toBeGreaterThan(highStrike);

    const upwardTerm = { ...defaultSurfaceShape, termSlope: 0.04 };
    const shortVolatility = syntheticSurfaceVolatility(100, 0.25, 100, upwardTerm);
    const longVolatility = syntheticSurfaceVolatility(100, 3, 100, upwardTerm);
    expect(longVolatility).toBeGreaterThan(shortVolatility);
  });

  it('rejects a shape that would imply non-positive volatility', () => {
    expect(() =>
      syntheticSurfaceVolatility(130, 3, 100, {
        baseVolatility: 0.01,
        skew: -1,
        curvature: 0,
        termSlope: -1,
      }),
    ).toThrow(/non-positive volatility/i);
  });
});
