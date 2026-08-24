import { describe, expect, it } from 'vitest';
import {
  buildJumpCountProbabilities,
  buildMertonCalibrationFixture,
  buildMertonSmile,
  calibrateMertonFixture,
  defaultMertonJumpParameters,
} from '../src/features/mertonJumpLab';

const market = { spot: 100, riskFreeRate: 0.03, dividendYield: 0.01 };

describe('Merton educational workflows', () => {
  it('builds a deterministic short-maturity smile', () => {
    const first = buildMertonSmile(market, defaultMertonJumpParameters, 0.25);
    const second = buildMertonSmile(market, defaultMertonJumpParameters, 0.25);
    const range =
      Math.max(...first.map((point) => point.mertonImpliedVolatility)) -
      Math.min(...first.map((point) => point.mertonImpliedVolatility));

    expect(first).toEqual(second);
    expect(first).toHaveLength(17);
    expect(range).toBeGreaterThan(0.03);
  });

  it('returns Poisson probabilities that sum to one including the tail bucket', () => {
    const probabilities = buildJumpCountProbabilities(2, 0.5);
    const total = probabilities.reduce((sum, point) => sum + point.probability, 0);
    expect(Math.abs(total - 1)).toBeLessThan(1e-14);
  });

  it('materially improves the deterministic smile calibration', () => {
    const quotes = buildMertonCalibrationFixture(market);
    const result = calibrateMertonFixture(market, quotes);

    expect(result.fit).toHaveLength(quotes.length);
    expect(result.finalObjective).toBeLessThan(result.initialObjective * 0.08);
    expect(result.converged).toBe(true);
  });
});
