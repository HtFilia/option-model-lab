import {
  blackScholesPrice,
  validateOptionAndMarket,
  type EuropeanOption,
  type MarketState,
  type OptionType,
} from './blackScholes';
import { standardNormalCdf } from './normal';

export interface MertonJumpParameters {
  diffusionVolatility: number;
  jumpIntensity: number;
  meanLogJump: number;
  jumpVolatility: number;
}

export interface MertonJumpInput {
  option: EuropeanOption;
  market: MarketState;
  parameters: MertonJumpParameters;
}

export interface MertonJumpResult {
  price: number;
  expectedJumpMultiplier: number;
  jumpCompensator: number;
  poissonTerms: number;
  omittedProbability: number;
}

export type MertonJumpErrorCode =
  | 'NON_FINITE_INPUT'
  | 'NEGATIVE_DIFFUSION_VOLATILITY'
  | 'NEGATIVE_JUMP_INTENSITY'
  | 'NEGATIVE_JUMP_VOLATILITY'
  | 'DEGENERATE_DENSITY';

export class MertonJumpError extends Error {
  readonly code: MertonJumpErrorCode;
  readonly field?: string;

  constructor(code: MertonJumpErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'MertonJumpError';
    this.code = code;
    this.field = field;
  }
}

const POISSON_TAIL_TOLERANCE = 1e-13;
const MAX_POISSON_TERMS = 200;

function requireFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new MertonJumpError('NON_FINITE_INPUT', `${field} must be a finite number.`, field);
  }
}

export function validateMertonJumpInput(input: MertonJumpInput): void {
  validateOptionAndMarket(input.option, input.market);
  const { parameters } = input;
  requireFinite(parameters.diffusionVolatility, 'Diffusion volatility');
  requireFinite(parameters.jumpIntensity, 'Jump intensity');
  requireFinite(parameters.meanLogJump, 'Mean log-jump');
  requireFinite(parameters.jumpVolatility, 'Jump volatility');

  if (parameters.diffusionVolatility < 0) {
    throw new MertonJumpError(
      'NEGATIVE_DIFFUSION_VOLATILITY',
      'Diffusion volatility cannot be negative.',
      'diffusionVolatility',
    );
  }
  if (parameters.jumpIntensity < 0) {
    throw new MertonJumpError(
      'NEGATIVE_JUMP_INTENSITY',
      'Jump intensity cannot be negative.',
      'jumpIntensity',
    );
  }
  if (parameters.jumpVolatility < 0) {
    throw new MertonJumpError(
      'NEGATIVE_JUMP_VOLATILITY',
      'Jump-size dispersion cannot be negative.',
      'jumpVolatility',
    );
  }
}

export function mertonExpectedJumpMultiplier(parameters: MertonJumpParameters): number {
  return Math.exp(
    parameters.meanLogJump + 0.5 * parameters.jumpVolatility * parameters.jumpVolatility,
  );
}

interface PoissonMixtureResult {
  callPrice: number;
  terms: number;
  omittedProbability: number;
}

function poissonMixtureCall(input: MertonJumpInput): PoissonMixtureResult {
  const { option, market, parameters } = input;
  const time = option.timeToMaturity;
  const poissonMean = parameters.jumpIntensity * time;
  const jumpCompensator = mertonExpectedJumpMultiplier(parameters) - 1;
  const discount = Math.exp(-market.riskFreeRate * time);
  const baseMeanLog =
    Math.log(market.spot) +
    (market.riskFreeRate -
      market.dividendYield -
      parameters.jumpIntensity * jumpCompensator -
      0.5 * parameters.diffusionVolatility * parameters.diffusionVolatility) *
      time;
  const baseVariance = parameters.diffusionVolatility * parameters.diffusionVolatility * time;
  let probability = Math.exp(-poissonMean);
  let accumulatedProbability = 0;
  let callPrice = 0;
  let terms = 0;

  for (let jumps = 0; jumps < MAX_POISSON_TERMS; jumps += 1) {
    const conditionalMeanLog = baseMeanLog + jumps * parameters.meanLogJump;
    const conditionalVariance =
      baseVariance + jumps * parameters.jumpVolatility * parameters.jumpVolatility;
    const standardDeviation = Math.sqrt(conditionalVariance);
    let conditionalCall: number;

    if (standardDeviation === 0) {
      conditionalCall = discount * Math.max(Math.exp(conditionalMeanLog) - option.strike, 0);
    } else {
      const d2 = (conditionalMeanLog - Math.log(option.strike)) / standardDeviation;
      const d1 = d2 + standardDeviation;
      const conditionalExpectedSpot = Math.exp(conditionalMeanLog + 0.5 * conditionalVariance);
      conditionalCall =
        discount *
        (conditionalExpectedSpot * standardNormalCdf(d1) - option.strike * standardNormalCdf(d2));
    }

    callPrice += probability * conditionalCall;
    accumulatedProbability += probability;
    terms = jumps + 1;

    const omittedProbability = Math.max(0, 1 - accumulatedProbability);
    if (jumps >= poissonMean && omittedProbability <= POISSON_TAIL_TOLERANCE) {
      return { callPrice, terms, omittedProbability };
    }
    probability *= poissonMean / (jumps + 1);
  }

  return {
    callPrice,
    terms,
    omittedProbability: Math.max(0, 1 - accumulatedProbability),
  };
}

export function priceMertonJumpDiffusion(input: MertonJumpInput): MertonJumpResult {
  validateMertonJumpInput(input);
  const { option, market, parameters } = input;
  const expectedJumpMultiplier = mertonExpectedJumpMultiplier(parameters);
  const jumpCompensator = expectedJumpMultiplier - 1;

  if (option.timeToMaturity === 0) {
    const intrinsic =
      option.type === 'call'
        ? Math.max(market.spot - option.strike, 0)
        : Math.max(option.strike - market.spot, 0);
    return {
      price: intrinsic,
      expectedJumpMultiplier,
      jumpCompensator,
      poissonTerms: 0,
      omittedProbability: 0,
    };
  }

  if (parameters.jumpIntensity === 0) {
    return {
      price: blackScholesPrice({
        option,
        market,
        volatility: parameters.diffusionVolatility,
      }),
      expectedJumpMultiplier,
      jumpCompensator,
      poissonTerms: 1,
      omittedProbability: 0,
    };
  }

  const mixture = poissonMixtureCall(input);
  const discountedSpot = market.spot * Math.exp(-market.dividendYield * option.timeToMaturity);
  const discountedStrike = option.strike * Math.exp(-market.riskFreeRate * option.timeToMaturity);
  const price =
    option.type === 'call'
      ? mixture.callPrice
      : mixture.callPrice - discountedSpot + discountedStrike;

  return {
    price,
    expectedJumpMultiplier,
    jumpCompensator,
    poissonTerms: mixture.terms,
    omittedProbability: mixture.omittedProbability,
  };
}

export function mertonJumpPriceFor(
  type: OptionType,
  strike: number,
  timeToMaturity: number,
  market: MarketState,
  parameters: MertonJumpParameters,
): number {
  return priceMertonJumpDiffusion({
    option: { type, strike, timeToMaturity },
    market,
    parameters,
  }).price;
}

function normalDensity(value: number, mean: number, variance: number): number {
  return (
    Math.exp(-((value - mean) * (value - mean)) / (2 * variance)) /
    Math.sqrt(2 * Math.PI * variance)
  );
}

export function mertonLogReturnDensity(input: MertonJumpInput, logReturn: number): number {
  validateMertonJumpInput(input);
  requireFinite(logReturn, 'Log return');
  const { option, market, parameters } = input;
  if (
    parameters.diffusionVolatility === 0 &&
    (parameters.jumpIntensity === 0 || parameters.jumpVolatility === 0)
  ) {
    throw new MertonJumpError(
      'DEGENERATE_DENSITY',
      'A continuous density is undefined when every source of dispersion is zero.',
    );
  }

  const time = option.timeToMaturity;
  if (time === 0) {
    throw new MertonJumpError('DEGENERATE_DENSITY', 'A terminal density is undefined at expiry.');
  }
  const poissonMean = parameters.jumpIntensity * time;
  const jumpCompensator = mertonExpectedJumpMultiplier(parameters) - 1;
  const baseMean =
    (market.riskFreeRate -
      market.dividendYield -
      parameters.jumpIntensity * jumpCompensator -
      0.5 * parameters.diffusionVolatility * parameters.diffusionVolatility) *
    time;
  const baseVariance = parameters.diffusionVolatility * parameters.diffusionVolatility * time;
  let probability = Math.exp(-poissonMean);
  let accumulatedProbability = 0;
  let density = 0;

  for (let jumps = 0; jumps < MAX_POISSON_TERMS; jumps += 1) {
    const variance = baseVariance + jumps * parameters.jumpVolatility * parameters.jumpVolatility;
    if (variance > 0) {
      density +=
        probability * normalDensity(logReturn, baseMean + jumps * parameters.meanLogJump, variance);
    }
    accumulatedProbability += probability;
    if (jumps >= poissonMean && 1 - accumulatedProbability <= POISSON_TAIL_TOLERANCE) {
      break;
    }
    probability *= poissonMean / (jumps + 1);
  }
  return density;
}
