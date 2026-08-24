import { describe, expect, it } from 'vitest';
import {
  buildLocalVolQuotes,
  buildLocalVolSlice,
  defaultLocalVolSurfaceParameters,
  defaultReconstructionSettings,
  interpolateTotalVariance,
} from '../src/features/localVolLab';
import { ssviTotalVariance } from '../src/quant/localVol';

describe('Local-vol surface reconstruction', () => {
  it('reproduces every noiseless quote node exactly', () => {
    const quotes = buildLocalVolQuotes(defaultLocalVolSurfaceParameters, 0);
    for (const quote of quotes) {
      expect(
        interpolateTotalVariance(quotes, quote.logMoneyness, quote.timeToMaturity),
      ).toBeCloseTo(quote.totalVariance, 14);
    }
  });

  it('keeps noiseless interpolation close to the analytic SSVI surface between nodes', () => {
    const quotes = buildLocalVolQuotes(defaultLocalVolSurfaceParameters, 0);
    const interpolated = interpolateTotalVariance(quotes, 0.075, 1.4);
    const analytic = ssviTotalVariance({
      logMoneyness: 0.075,
      timeToMaturity: 1.4,
      parameters: defaultLocalVolSurfaceParameters,
    });
    expect(Math.abs(interpolated - analytic)).toBeLessThan(2e-6);
  });

  it('reconstructs noiseless local volatility with small finite-difference error', () => {
    const slice = buildLocalVolSlice(
      defaultLocalVolSurfaceParameters,
      1,
      defaultReconstructionSettings,
    );
    expect(slice.every((point) => point.valid)).toBe(true);
    const maximumError = Math.max(
      ...slice.map((point) => Math.abs(point.reconstructionError ?? Infinity)),
    );
    expect(maximumError).toBeLessThan(0.007);
  });

  it('makes deterministic quote noise measurably worsen reconstruction', () => {
    const clean = buildLocalVolSlice(defaultLocalVolSurfaceParameters, 1, {
      ...defaultReconstructionSettings,
      quoteNoiseBasisPoints: 0,
    });
    const noisy = buildLocalVolSlice(defaultLocalVolSurfaceParameters, 1, {
      ...defaultReconstructionSettings,
      quoteNoiseBasisPoints: 20,
    });
    const rmse = (slice: typeof clean) =>
      Math.sqrt(
        slice.reduce((sum, point) => sum + (point.reconstructionError ?? 0) ** 2, 0) / slice.length,
      );
    expect(rmse(noisy)).toBeGreaterThan(rmse(clean) * 2);
  });
});
