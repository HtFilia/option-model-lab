import { describe, expect, it } from 'vitest';
import { blackScholesPrice } from '../src/quant/blackScholes';
import {
  HestonError,
  hestonCharacteristicFunction,
  priceHeston,
  type HestonInput,
} from '../src/quant/heston';
import {
  buildHestonCalibrationFixture,
  calibrateHestonFixture,
  defaultHestonParameters,
  simulateHestonVolatilityPaths,
} from '../src/features/hestonLab';

const referenceInput: HestonInput = {
  option: { type: 'call', strike: 1, timeToMaturity: 0.7 },
  market: {
    spot: Math.exp(-0.03 * 0.7),
    riskFreeRate: 0.05,
    dividendYield: 0.02,
  },
  parameters: {
    initialVariance: 0.09,
    meanReversion: 1.2,
    longRunVariance: 0.08,
    volatilityOfVariance: 1.8,
    correlation: -0.45,
  },
};

describe('Heston Fourier pricing', () => {
  it('matches cached QuantLib analytic-engine prices', () => {
    const cases = [
      { strike: 0.9, expected: 0.1330371 },
      { strike: 1.0, expected: 0.0641016 },
      { strike: 1.1, expected: 0.0270645 },
    ];

    for (const testCase of cases) {
      const result = priceHeston({
        ...referenceInput,
        option: { ...referenceInput.option, strike: testCase.strike },
      });
      expect(Math.abs(result.price - testCase.expected)).toBeLessThanOrEqual(2e-6);
    }
  });

  it('has a characteristic function equal to one at the origin', () => {
    const value = hestonCharacteristicFunction(referenceInput, 0);
    expect(Math.abs(value.re - 1)).toBeLessThanOrEqual(1e-14);
    expect(Math.abs(value.im)).toBeLessThanOrEqual(1e-14);
  });

  it('converges to Black–Scholes when variance is constant', () => {
    const input: HestonInput = {
      option: { type: 'put', strike: 30, timeToMaturity: 0.5 },
      market: { spot: 32, riskFreeRate: 0.1, dividendYield: 0.04 },
      parameters: {
        initialVariance: 0.05,
        meanReversion: 5,
        longRunVariance: 0.05,
        volatilityOfVariance: 1e-4,
        correlation: 0,
      },
    };
    const heston = priceHeston(input).price;
    const blackScholes = blackScholesPrice({
      option: input.option,
      market: input.market,
      volatility: Math.sqrt(0.05),
    });
    expect(Math.abs(heston - blackScholes)).toBeLessThanOrEqual(5e-6);
  });

  it('satisfies European put-call parity', () => {
    const call = priceHeston(referenceInput).price;
    const put = priceHeston({
      ...referenceInput,
      option: { ...referenceInput.option, type: 'put' },
    }).price;
    const discountedSpot =
      referenceInput.market.spot *
      Math.exp(-referenceInput.market.dividendYield * referenceInput.option.timeToMaturity);
    const discountedStrike =
      referenceInput.option.strike *
      Math.exp(-referenceInput.market.riskFreeRate * referenceInput.option.timeToMaturity);
    expect(Math.abs(call - put - (discountedSpot - discountedStrike))).toBeLessThanOrEqual(1e-13);
  });

  it('returns intrinsic value at expiry without numerical integration', () => {
    const result = priceHeston({
      ...referenceInput,
      option: { type: 'put', strike: 1.2, timeToMaturity: 0 },
    });
    expect(result.price).toBeCloseTo(1.2 - referenceInput.market.spot, 14);
    expect(result.integrationEvaluations).toBe(0);
  });

  it('rejects invalid variance, correlation, and vol-of-vol inputs', () => {
    expect(() =>
      priceHeston({
        ...referenceInput,
        parameters: { ...referenceInput.parameters, initialVariance: -0.01 },
      }),
    ).toThrow(HestonError);
    expect(() =>
      priceHeston({
        ...referenceInput,
        parameters: { ...referenceInput.parameters, correlation: -1.1 },
      }),
    ).toThrow(/between -1 and 1/i);
    expect(() =>
      priceHeston({
        ...referenceInput,
        parameters: { ...referenceInput.parameters, volatilityOfVariance: 0 },
      }),
    ).toThrow(/greater than zero/i);
  });
});

describe('Heston educational workflows', () => {
  it('produces deterministic seeded volatility paths', () => {
    const first = simulateHestonVolatilityPaths(defaultHestonParameters, 1, 12, 42);
    const second = simulateHestonVolatilityPaths(defaultHestonParameters, 1, 12, 42);
    const differentSeed = simulateHestonVolatilityPaths(defaultHestonParameters, 1, 12, 43);
    expect(first).toEqual(second);
    expect(first).not.toEqual(differentSeed);
    expect(first).toHaveLength(13);
  });

  it('reduces the deterministic surface-calibration objective materially', () => {
    const market = { spot: 100, riskFreeRate: 0.03, dividendYield: 0.01 };
    const fixture = buildHestonCalibrationFixture(market);
    const result = calibrateHestonFixture(market, fixture);
    expect(fixture).toHaveLength(15);
    expect(result.converged).toBe(true);
    expect(result.finalObjective).toBeLessThan(result.initialObjective * 0.1);
    expect(result.fit).toHaveLength(fixture.length);
  });
});
