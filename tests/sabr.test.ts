import { describe, expect, it } from 'vitest';
import {
  SabrError,
  black76Price,
  priceSabr,
  sabrLognormalVolatility,
  type SabrParameters,
} from '../src/quant/sabr';

const parameters: SabrParameters = { alpha: 0.04, beta: 0.5, rho: -0.3, nu: 0.5 };

describe('SABR Hagan lognormal approximation', () => {
  it('matches cached values from the QuantLib formula at and away from ATM', () => {
    const cases = [
      [0.02, 0.30980885854931484],
      [0.03, 0.23752017417630725],
      [0.04, 0.21506981113266813],
    ] as const;
    for (const [strike, expected] of cases) {
      expect(
        sabrLognormalVolatility({
          forward: 0.03,
          strike,
          timeToMaturity: 2,
          parameters,
        }),
      ).toBeCloseTo(expected, 12);
    }
  });

  it('is continuous through the at-the-money limit', () => {
    const atm = sabrLognormalVolatility({
      forward: 0.03,
      strike: 0.03,
      timeToMaturity: 2,
      parameters,
    });
    const left = sabrLognormalVolatility({
      forward: 0.03,
      strike: 0.03 * (1 - 1e-9),
      timeToMaturity: 2,
      parameters,
    });
    const right = sabrLognormalVolatility({
      forward: 0.03,
      strike: 0.03 * (1 + 1e-9),
      timeToMaturity: 2,
      parameters,
    });
    expect(left).toBeCloseTo(atm, 8);
    expect(right).toBeCloseTo(atm, 8);
  });

  it('has the expected beta-one ATM limit', () => {
    const betaOne = { alpha: 0.2, beta: 1, rho: -0.25, nu: 0.4 };
    const expected =
      betaOne.alpha *
      (1 +
        3 *
          ((betaOne.rho * betaOne.nu * betaOne.alpha) / 4 +
            ((2 - 3 * betaOne.rho * betaOne.rho) * betaOne.nu * betaOne.nu) / 24));
    expect(
      sabrLognormalVolatility({
        forward: 0.03,
        strike: 0.03,
        timeToMaturity: 3,
        parameters: betaOne,
      }),
    ).toBeCloseTo(expected, 14);
  });

  it('prices calls and puts through Black-76 and satisfies forward parity', () => {
    const common = {
      forward: 0.03,
      strike: 0.0275,
      timeToMaturity: 2,
      discountFactor: 0.94,
      parameters,
    };
    const call = priceSabr({ ...common, type: 'call' }).price;
    const put = priceSabr({ ...common, type: 'put' }).price;
    expect(call - put).toBeCloseTo(common.discountFactor * (common.forward - common.strike), 14);
  });

  it('handles expiry and zero Black volatility explicitly', () => {
    expect(
      black76Price({
        type: 'call',
        forward: 0.04,
        strike: 0.03,
        timeToMaturity: 0,
        volatility: 0.2,
        discountFactor: 1,
      }),
    ).toBeCloseTo(0.01, 14);
    expect(
      black76Price({
        type: 'put',
        forward: 0.02,
        strike: 0.03,
        timeToMaturity: 2,
        volatility: 0,
        discountFactor: 0.95,
      }),
    ).toBeCloseTo(0.0095, 14);
  });

  it.each([
    [{ forward: 0, strike: 0.03, timeToMaturity: 1, parameters }, 'NON_POSITIVE_FORWARD'],
    [{ forward: 0.03, strike: 0, timeToMaturity: 1, parameters }, 'NON_POSITIVE_STRIKE'],
    [{ forward: 0.03, strike: 0.03, timeToMaturity: -1, parameters }, 'NEGATIVE_TIME'],
    [
      { forward: 0.03, strike: 0.03, timeToMaturity: 1, parameters: { ...parameters, alpha: 0 } },
      'NON_POSITIVE_ALPHA',
    ],
    [
      { forward: 0.03, strike: 0.03, timeToMaturity: 1, parameters: { ...parameters, beta: 1.1 } },
      'INVALID_BETA',
    ],
    [
      { forward: 0.03, strike: 0.03, timeToMaturity: 1, parameters: { ...parameters, rho: -1 } },
      'INVALID_RHO',
    ],
    [
      { forward: 0.03, strike: 0.03, timeToMaturity: 1, parameters: { ...parameters, nu: -0.1 } },
      'NEGATIVE_NU',
    ],
  ])('rejects invalid SABR input %#', (input, code) => {
    try {
      sabrLognormalVolatility(input);
      throw new Error('Expected SABR validation to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(SabrError);
      expect((error as SabrError).code).toBe(code);
    }
  });
});
