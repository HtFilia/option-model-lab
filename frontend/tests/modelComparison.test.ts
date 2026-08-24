import { describe, expect, it } from 'vitest';
import { defaultHestonParameters } from '../src/features/hestonLab';
import { buildBlackScholesHestonComparison } from '../src/features/modelComparison';

const scenario = {
  type: 'call' as const,
  strike: 110,
  timeToMaturity: 1,
  market: { spot: 100, riskFreeRate: 0.03, dividendYield: 0.01 },
  hestonParameters: defaultHestonParameters,
};

describe('Black–Scholes and Heston comparison', () => {
  it('matches the Heston at-the-money anchor by construction', () => {
    const result = buildBlackScholesHestonComparison(scenario);
    const anchor = result.strikePoints.find((point) => point.strike === result.anchorStrike);

    expect(anchor).toBeDefined();
    expect(Math.abs(anchor!.blackScholesPrice - anchor!.hestonPrice)).toBeLessThan(1e-8);
    expect(Math.abs(anchor!.hestonPrice - result.anchorPrice)).toBeLessThan(1e-10);
  });

  it('keeps Black–Scholes volatility flat while Heston produces a smile', () => {
    const result = buildBlackScholesHestonComparison(scenario);
    const flatVolatilities = new Set(
      result.strikePoints.map((point) => point.blackScholesVolatility),
    );
    const hestonRange =
      Math.max(...result.strikePoints.map((point) => point.hestonImpliedVolatility)) -
      Math.min(...result.strikePoints.map((point) => point.hestonImpliedVolatility));

    expect(flatVolatilities.size).toBe(1);
    expect(hestonRange).toBeGreaterThan(0.02);
    expect(result.maximumSmileDifference).toBeGreaterThan(0.01);
  });

  it('is deterministic and responds to Heston correlation', () => {
    const first = buildBlackScholesHestonComparison(scenario);
    const second = buildBlackScholesHestonComparison(scenario);
    const changed = buildBlackScholesHestonComparison({
      ...scenario,
      hestonParameters: { ...defaultHestonParameters, correlation: -0.2 },
    });

    expect(second).toEqual(first);
    expect(changed.maximumSmileDifference).not.toBeCloseTo(first.maximumSmileDifference, 4);
  });
});
