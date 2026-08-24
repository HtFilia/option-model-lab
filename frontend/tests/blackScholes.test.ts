import { describe, expect, it } from 'vitest';
import {
  blackScholesPrice,
  noArbitrageBounds,
  priceBlackScholes,
  putCallParityResidual,
  QuantError,
  solveImpliedVolatility,
  type BlackScholesInput,
} from '../src/quant/blackScholes';
import { standardNormalCdf, standardNormalPdf } from '../src/quant/normal';

const referenceInput: BlackScholesInput = {
  option: { type: 'call', strike: 100, timeToMaturity: 1 },
  market: { spot: 100, riskFreeRate: 0.05, dividendYield: 0 },
  volatility: 0.2,
};

function expectAbsoluteError(actual: number, expected: number, tolerance: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

describe('normal distribution', () => {
  it('matches high-precision reference values', () => {
    expectAbsoluteError(standardNormalCdf(0), 0.5, 1e-15);
    expectAbsoluteError(standardNormalCdf(1), 0.8413447460685429, 1e-15);
    expectAbsoluteError(standardNormalCdf(-3), 0.0013498980316300933, 1e-17);
    expectAbsoluteError(standardNormalPdf(0), 0.3989422804014327, 1e-15);
  });
});

describe('Black–Scholes analytic pricing', () => {
  it('matches known call and put reference prices and Greeks', () => {
    const call = priceBlackScholes(referenceInput);
    const put = priceBlackScholes({
      ...referenceInput,
      option: { ...referenceInput.option, type: 'put' },
    });

    expectAbsoluteError(call.price, 10.450583572185565, 1e-12);
    expectAbsoluteError(put.price, 5.573526022256971, 1e-12);
    expectAbsoluteError(call.delta, 0.6368306511756191, 1e-12);
    expectAbsoluteError(call.gamma, 0.018762017345846895, 1e-14);
    expectAbsoluteError(call.vega, 37.52403469169379, 1e-11);
    expectAbsoluteError(call.theta, -6.414027546438197, 1e-11);
    expectAbsoluteError(call.rho, 53.232481545376345, 1e-11);
    expectAbsoluteError(put.delta, -0.3631693488243809, 1e-12);
    expectAbsoluteError(put.theta, -1.657880423934626, 1e-11);
    expectAbsoluteError(put.rho, -41.89046090469506, 1e-11);
  });

  it('satisfies call-put parity with a continuous dividend yield', () => {
    const option = { strike: 105, timeToMaturity: 2.25 };
    const market = { spot: 112, riskFreeRate: -0.005, dividendYield: 0.0275 };
    const volatility = 0.34;
    const call = blackScholesPrice({ option: { ...option, type: 'call' }, market, volatility });
    const put = blackScholesPrice({ option: { ...option, type: 'put' }, market, volatility });

    expectAbsoluteError(putCallParityResidual(call, put, option, market), 0, 3e-14);
  });

  it('matches analytic delta to a centered spot finite difference', () => {
    const h = 1e-3;
    const analytic = priceBlackScholes(referenceInput).delta;
    const up = blackScholesPrice({
      ...referenceInput,
      market: { ...referenceInput.market, spot: referenceInput.market.spot + h },
    });
    const down = blackScholesPrice({
      ...referenceInput,
      market: { ...referenceInput.market, spot: referenceInput.market.spot - h },
    });
    expectAbsoluteError((up - down) / (2 * h), analytic, 2e-9);
  });

  it('matches analytic gamma to a centered spot finite difference', () => {
    const h = 0.1;
    const center = blackScholesPrice(referenceInput);
    const analytic = priceBlackScholes(referenceInput).gamma;
    const up = blackScholesPrice({
      ...referenceInput,
      market: { ...referenceInput.market, spot: referenceInput.market.spot + h },
    });
    const down = blackScholesPrice({
      ...referenceInput,
      market: { ...referenceInput.market, spot: referenceInput.market.spot - h },
    });
    expectAbsoluteError((up - 2 * center + down) / (h * h), analytic, 3e-8);
  });

  it('matches analytic raw vega to a centered volatility finite difference', () => {
    const h = 1e-4;
    const analytic = priceBlackScholes(referenceInput).vega;
    const up = blackScholesPrice({ ...referenceInput, volatility: referenceInput.volatility + h });
    const down = blackScholesPrice({
      ...referenceInput,
      volatility: referenceInput.volatility - h,
    });
    expectAbsoluteError((up - down) / (2 * h), analytic, 2e-6);
  });

  it('returns intrinsic value and explicit limiting Greeks at expiry', () => {
    const call = priceBlackScholes({
      ...referenceInput,
      option: { type: 'call', strike: 90, timeToMaturity: 0 },
    });
    const put = priceBlackScholes({
      ...referenceInput,
      option: { type: 'put', strike: 110, timeToMaturity: 0 },
    });
    const atTheMoney = priceBlackScholes({
      ...referenceInput,
      option: { type: 'call', strike: 100, timeToMaturity: 0 },
    });

    expect(call).toEqual({ price: 10, delta: 1, gamma: 0, vega: 0, theta: 0, rho: 0 });
    expect(put).toEqual({ price: 10, delta: -1, gamma: 0, vega: 0, theta: 0, rho: 0 });
    expect(atTheMoney.delta).toBe(0.5);
  });

  it('uses the discounted deterministic payoff at zero volatility', () => {
    const input: BlackScholesInput = {
      option: { type: 'call', strike: 100, timeToMaturity: 2 },
      market: { spot: 120, riskFreeRate: 0.04, dividendYield: 0.01 },
      volatility: 0,
    };
    const discountedSpot = 120 * Math.exp(-0.01 * 2);
    const discountedStrike = 100 * Math.exp(-0.04 * 2);
    const call = priceBlackScholes(input);
    const put = priceBlackScholes({ ...input, option: { ...input.option, type: 'put' } });

    expectAbsoluteError(call.price, Math.max(discountedSpot - discountedStrike, 0), 1e-14);
    expect(call.gamma).toBe(0);
    expect(call.vega).toBe(0);
    expect(put.price).toBe(0);
  });

  it.each([
    [{ ...referenceInput, market: { ...referenceInput.market, spot: 0 } }, 'NON_POSITIVE_SPOT'],
    [
      { ...referenceInput, option: { ...referenceInput.option, strike: -1 } },
      'NON_POSITIVE_STRIKE',
    ],
    [
      { ...referenceInput, option: { ...referenceInput.option, timeToMaturity: -0.1 } },
      'NEGATIVE_TIME',
    ],
    [{ ...referenceInput, volatility: -0.01 }, 'NEGATIVE_VOLATILITY'],
    [{ ...referenceInput, volatility: Number.NaN }, 'NON_FINITE_INPUT'],
  ])('rejects invalid input with a typed error', (input, expectedCode) => {
    try {
      priceBlackScholes(input as BlackScholesInput);
      expect.fail('Expected pricing to reject the input.');
    } catch (error) {
      expect(error).toBeInstanceOf(QuantError);
      expect((error as QuantError).code).toBe(expectedCode);
    }
  });
});

describe('implied-volatility inversion', () => {
  it('recovers volatility from a generated Black–Scholes price', () => {
    const volatility = 0.37;
    const input = {
      option: { type: 'put' as const, strike: 95, timeToMaturity: 1.4 },
      market: { spot: 102, riskFreeRate: 0.0175, dividendYield: 0.008 },
    };
    const marketPrice = blackScholesPrice({ ...input, volatility });
    const solution = solveImpliedVolatility({ ...input, marketPrice });

    expect(solution.converged).toBe(true);
    expect(solution.status).toBe('converged');
    expectAbsoluteError(solution.impliedVolatility, volatility, 1e-9);
    expectAbsoluteError(solution.repricedValue, marketPrice, 1e-9);
    expect(Math.abs(solution.residual)).toBeLessThanOrEqual(1e-9);
    expect(solution.iterations).toBeGreaterThan(0);
  });

  it('returns the documented zero-volatility boundary solution', () => {
    const option = { type: 'call' as const, strike: 95, timeToMaturity: 1 };
    const market = { spot: 100, riskFreeRate: 0.02, dividendYield: 0 };
    const bounds = noArbitrageBounds(option, market);
    const solution = solveImpliedVolatility({ option, market, marketPrice: bounds.lower });

    expect(solution).toMatchObject({
      impliedVolatility: 0,
      converged: true,
      iterations: 0,
      status: 'boundary-zero-volatility',
    });
  });

  it('rejects market prices outside no-arbitrage bounds', () => {
    const option = { type: 'put' as const, strike: 120, timeToMaturity: 0.75 };
    const market = { spot: 105, riskFreeRate: 0.03, dividendYield: 0.01 };
    const bounds = noArbitrageBounds(option, market);

    for (const marketPrice of [bounds.lower - 0.001, bounds.upper + 0.001]) {
      try {
        solveImpliedVolatility({ option, market, marketPrice });
        expect.fail('Expected the no-arbitrage validation to reject the price.');
      } catch (error) {
        expect(error).toBeInstanceOf(QuantError);
        expect((error as QuantError).code).toBe('PRICE_OUTSIDE_BOUNDS');
      }
    }
  });
});
