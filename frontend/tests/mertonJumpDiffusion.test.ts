import { describe, expect, it } from 'vitest';
import { blackScholesPrice } from '../src/quant/blackScholes';
import {
  mertonLogReturnDensity,
  priceMertonJumpDiffusion,
  type MertonJumpInput,
} from '../src/quant/mertonJumpDiffusion';

const baseInput: MertonJumpInput = {
  option: { type: 'call', strike: 100, timeToMaturity: 0.5 },
  market: { spot: 100, riskFreeRate: 0.08, dividendYield: 0 },
  parameters: {
    diffusionVolatility: 0.18,
    jumpIntensity: 1,
    meanLogJump: -0.08,
    jumpVolatility: 0.2,
  },
};

describe('Merton jump-diffusion pricing', () => {
  it('reproduces a cached QuantLib/Haug European-call reference', () => {
    const totalVolatility = 0.25;
    const varianceShareInJumps = 0.5;
    const jumpIntensity = 1;
    const jumpVolatility = totalVolatility * Math.sqrt(varianceShareInJumps / jumpIntensity);
    const result = priceMertonJumpDiffusion({
      ...baseInput,
      parameters: {
        diffusionVolatility: totalVolatility * Math.sqrt(1 - varianceShareInJumps),
        jumpIntensity,
        meanLogJump: -0.5 * jumpVolatility * jumpVolatility,
        jumpVolatility,
      },
    });

    expect(Math.abs(result.price - 8.71)).toBeLessThan(0.01);
  });

  it('reduces exactly to Black–Scholes when jump intensity is zero', () => {
    const input = {
      ...baseInput,
      parameters: { ...baseInput.parameters, jumpIntensity: 0 },
    };
    const merton = priceMertonJumpDiffusion(input).price;
    const blackScholes = blackScholesPrice({
      option: input.option,
      market: input.market,
      volatility: input.parameters.diffusionVolatility,
    });

    expect(merton).toBe(blackScholes);
  });

  it('satisfies put-call parity', () => {
    const call = priceMertonJumpDiffusion(baseInput).price;
    const put = priceMertonJumpDiffusion({
      ...baseInput,
      option: { ...baseInput.option, type: 'put' },
    }).price;
    const parity =
      baseInput.market.spot *
        Math.exp(-baseInput.market.dividendYield * baseInput.option.timeToMaturity) -
      baseInput.option.strike *
        Math.exp(-baseInput.market.riskFreeRate * baseInput.option.timeToMaturity);

    expect(Math.abs(call - put - parity)).toBeLessThan(2e-14);
  });

  it('reports intrinsic value at expiry', () => {
    const result = priceMertonJumpDiffusion({
      ...baseInput,
      option: { type: 'put', strike: 110, timeToMaturity: 0 },
    });
    expect(result.price).toBe(10);
    expect(result.poissonTerms).toBe(0);
  });

  it('uses enough Poisson terms to leave a negligible tail', () => {
    const result = priceMertonJumpDiffusion({
      ...baseInput,
      option: { ...baseInput.option, timeToMaturity: 3 },
      parameters: { ...baseInput.parameters, jumpIntensity: 5 },
    });
    expect(result.poissonTerms).toBeGreaterThan(30);
    expect(result.omittedProbability).toBeLessThanOrEqual(1e-13);
  });

  it('produces a terminal log-return density that integrates to one', () => {
    const lower = -2;
    const upper = 1.5;
    const steps = 7000;
    const width = (upper - lower) / steps;
    let integral = 0;
    for (let index = 0; index <= steps; index += 1) {
      const x = lower + index * width;
      const weight = index === 0 || index === steps ? 0.5 : 1;
      integral += weight * mertonLogReturnDensity(baseInput, x) * width;
    }
    expect(Math.abs(integral - 1)).toBeLessThan(2e-7);
  });

  it.each([
    ['diffusionVolatility', -0.1, 'NEGATIVE_DIFFUSION_VOLATILITY'],
    ['jumpIntensity', -0.1, 'NEGATIVE_JUMP_INTENSITY'],
    ['jumpVolatility', -0.1, 'NEGATIVE_JUMP_VOLATILITY'],
  ] as const)('rejects invalid %s', (field, value, code) => {
    expect(() =>
      priceMertonJumpDiffusion({
        ...baseInput,
        parameters: { ...baseInput.parameters, [field]: value },
      }),
    ).toThrowError(expect.objectContaining({ code }));
  });

  it('rejects a non-finite jump parameter', () => {
    expect(() =>
      priceMertonJumpDiffusion({
        ...baseInput,
        parameters: { ...baseInput.parameters, meanLogJump: Number.NaN },
      }),
    ).toThrowError(expect.objectContaining({ code: 'NON_FINITE_INPUT' }));
  });
});
