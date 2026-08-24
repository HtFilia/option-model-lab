import { describe, expect, it } from 'vitest';
import {
  LocalVolError,
  ssviImpliedVolatility,
  ssviLocalVolatility,
  ssviNoArbitrageMargins,
  ssviTotalVariance,
  validateSsviParameters,
} from '../src/quant/localVol';

const parameters = { atmVolatility: 0.2, rho: -0.4, eta: 1.1 };

describe('SSVI and Dupire local volatility', () => {
  it('recovers the configured ATM implied volatility at every maturity', () => {
    for (const timeToMaturity of [0.1, 0.5, 1, 3, 5]) {
      expect(ssviImpliedVolatility({ logMoneyness: 0, timeToMaturity, parameters })).toBeCloseTo(
        parameters.atmVolatility,
        14,
      );
    }
  });

  it('has positive total variance growth and density denominator on the controlled grid', () => {
    for (const timeToMaturity of [0.1, 0.25, 0.5, 1, 2, 3, 5]) {
      for (let logMoneyness = -0.6; logMoneyness <= 0.6001; logMoneyness += 0.05) {
        expect(ssviTotalVariance({ logMoneyness, timeToMaturity, parameters })).toBeGreaterThan(0);
        const local = ssviLocalVolatility({ logMoneyness, timeToMaturity, parameters });
        expect(local.timeDerivative).toBeGreaterThan(0);
        expect(local.densityDenominator).toBeGreaterThan(0);
        expect(local.localVolatility).toBeGreaterThan(0);
      }
    }
    expect(ssviNoArbitrageMargins(parameters).satisfied).toBe(true);
  });

  it('reduces exactly to constant local volatility for a flat total-variance surface', () => {
    const flat = { atmVolatility: 0.27, rho: 0, eta: 0 };
    for (const logMoneyness of [-0.4, 0, 0.4]) {
      expect(
        ssviLocalVolatility({ logMoneyness, timeToMaturity: 2, parameters: flat }).localVolatility,
      ).toBeCloseTo(flat.atmVolatility, 14);
    }
  });

  it.each([
    [{ ...parameters, atmVolatility: 0 }, 'NON_POSITIVE_ATM_VOLATILITY'],
    [{ ...parameters, rho: 1 }, 'INVALID_RHO'],
    [{ ...parameters, eta: -0.1 }, 'NEGATIVE_ETA'],
    [{ ...parameters, eta: 2 }, 'STATIC_ARBITRAGE_CONSTRAINT'],
  ])('rejects invalid SSVI parameters %#', (invalid, code) => {
    try {
      validateSsviParameters(invalid);
      throw new Error('Expected SSVI validation to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(LocalVolError);
      expect((error as LocalVolError).code).toBe(code);
    }
  });
});
