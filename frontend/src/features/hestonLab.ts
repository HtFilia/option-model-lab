import { solveImpliedVolatility, type MarketState, type OptionType } from '../quant/blackScholes';
import { hestonPriceFor, priceHeston, type HestonParameters } from '../quant/heston';

export const defaultHestonParameters: HestonParameters = {
  initialVariance: 0.04,
  longRunVariance: 0.05,
  meanReversion: 1.5,
  volatilityOfVariance: 0.5,
  correlation: -0.7,
};

export interface HestonSmilePoint {
  strike: number;
  hestonVolatility: number;
  flatVolatility: number;
  hestonPrice: number;
}

export function buildHestonSmile(
  market: MarketState,
  parameters: HestonParameters,
  timeToMaturity: number,
  type: OptionType = 'call',
): HestonSmilePoint[] {
  return Array.from({ length: 17 }, (_, index) => 0.7 + index * 0.0375).map((multiplier) => {
    const strike = Number((market.spot * multiplier).toFixed(4));
    const option = { type, strike, timeToMaturity };
    const hestonPrice = hestonPriceFor(type, strike, timeToMaturity, market, parameters);
    const inversion = solveImpliedVolatility({ option, market, marketPrice: hestonPrice });
    return {
      strike,
      hestonVolatility: inversion.impliedVolatility,
      flatVolatility: Math.sqrt(parameters.initialVariance),
      hestonPrice,
    };
  });
}

interface VariancePathPoint {
  time: number;
  path1: number;
  path2: number;
  path3: number;
  path4: number;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function normalGenerator(seed: number): () => number {
  const uniform = mulberry32(seed);
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    const first = Math.max(uniform(), Number.EPSILON);
    const second = uniform();
    const radius = Math.sqrt(-2 * Math.log(first));
    const angle = 2 * Math.PI * second;
    spare = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  };
}

export function simulateHestonVolatilityPaths(
  parameters: HestonParameters,
  timeToMaturity = 2,
  steps = 80,
  seed = 20_240_127,
): VariancePathPoint[] {
  const normal = normalGenerator(seed);
  const timeStep = timeToMaturity / steps;
  const squareRootTimeStep = Math.sqrt(timeStep);
  const variances = Array.from({ length: 4 }, () => parameters.initialVariance);
  const points: VariancePathPoint[] = [
    {
      time: 0,
      path1: Math.sqrt(variances[0]!),
      path2: Math.sqrt(variances[1]!),
      path3: Math.sqrt(variances[2]!),
      path4: Math.sqrt(variances[3]!),
    },
  ];

  for (let step = 1; step <= steps; step += 1) {
    for (let path = 0; path < variances.length; path += 1) {
      const variance = variances[path]!;
      const truncatedVariance = Math.max(variance, 0);
      variances[path] = Math.max(
        0,
        variance +
          parameters.meanReversion * (parameters.longRunVariance - truncatedVariance) * timeStep +
          parameters.volatilityOfVariance *
            Math.sqrt(truncatedVariance) *
            squareRootTimeStep *
            normal(),
      );
    }
    points.push({
      time: step * timeStep,
      path1: Math.sqrt(variances[0]!),
      path2: Math.sqrt(variances[1]!),
      path3: Math.sqrt(variances[2]!),
      path4: Math.sqrt(variances[3]!),
    });
  }
  return points;
}

export interface HestonCalibrationQuote {
  strike: number;
  timeToMaturity: number;
  marketPrice: number;
  marketImpliedVolatility: number;
}

export interface HestonCalibrationFitPoint extends HestonCalibrationQuote {
  modelPrice: number;
  modelImpliedVolatility: number;
  priceResidual: number;
  volatilityResidual: number;
}

export interface HestonCalibrationResult {
  parameters: HestonParameters;
  initialParameters: HestonParameters;
  initialObjective: number;
  finalObjective: number;
  iterations: number;
  evaluations: number;
  converged: boolean;
  fit: HestonCalibrationFitPoint[];
}

export const hestonCalibrationTargetParameters: HestonParameters = {
  initialVariance: 0.04,
  longRunVariance: 0.05,
  meanReversion: 1.5,
  volatilityOfVariance: 0.5,
  correlation: -0.7,
};

export const hestonCalibrationInitialParameters: HestonParameters = {
  initialVariance: 0.07,
  longRunVariance: 0.08,
  meanReversion: 0.8,
  volatilityOfVariance: 0.8,
  correlation: -0.3,
};

export const hestonParameterBounds = {
  initialVariance: [0.01, 0.16],
  longRunVariance: [0.01, 0.16],
  meanReversion: [0.2, 5],
  volatilityOfVariance: [0.1, 1.2],
  correlation: [-0.95, 0.2],
} as const satisfies Record<keyof HestonParameters, readonly [number, number]>;

export const hestonCalibrationObjectiveTolerance = 5e-4;

const calibrationStrikes = [80, 90, 100, 110, 120] as const;
const calibrationMaturities = [0.5, 1, 2] as const;

export function buildHestonCalibrationFixture(market: MarketState): HestonCalibrationQuote[] {
  return calibrationMaturities.flatMap((timeToMaturity) =>
    calibrationStrikes.map((strike) => {
      const option = { type: 'call' as const, strike, timeToMaturity };
      const marketPrice = priceHeston({
        option,
        market,
        parameters: hestonCalibrationTargetParameters,
      }).price;
      const marketImpliedVolatility = solveImpliedVolatility({
        option,
        market,
        marketPrice,
      }).impliedVolatility;
      return { strike, timeToMaturity, marketPrice, marketImpliedVolatility };
    }),
  );
}

export function evaluateHestonCalibrationFit(
  parameters: HestonParameters,
  market: MarketState,
  quotes: HestonCalibrationQuote[],
): HestonCalibrationFitPoint[] {
  return quotes.map((quote) => {
    const option = {
      type: 'call' as const,
      strike: quote.strike,
      timeToMaturity: quote.timeToMaturity,
    };
    const modelPrice = hestonPriceFor(
      'call',
      quote.strike,
      quote.timeToMaturity,
      market,
      parameters,
    );
    const modelImpliedVolatility = solveImpliedVolatility({
      option,
      market,
      marketPrice: modelPrice,
    }).impliedVolatility;
    return {
      ...quote,
      modelPrice,
      modelImpliedVolatility,
      priceResidual: modelPrice - quote.marketPrice,
      volatilityResidual: modelImpliedVolatility - quote.marketImpliedVolatility,
    };
  });
}

function objective(
  parameters: HestonParameters,
  market: MarketState,
  quotes: HestonCalibrationQuote[],
): number {
  const squaredErrors = quotes.map((quote) => {
    const modelPrice = hestonPriceFor(
      'call',
      quote.strike,
      quote.timeToMaturity,
      market,
      parameters,
    );
    const normalizedResidual = (modelPrice - quote.marketPrice) / market.spot;
    return normalizedResidual * normalizedResidual;
  });
  return Math.sqrt(squaredErrors.reduce((sum, value) => sum + value, 0) / quotes.length);
}

function withinBounds(parameters: HestonParameters): boolean {
  return (Object.keys(hestonParameterBounds) as (keyof HestonParameters)[]).every((key) => {
    const [lower, upper] = hestonParameterBounds[key];
    return parameters[key] >= lower && parameters[key] <= upper;
  });
}

type ParameterVector = [number, number, number, number, number];

function toVector(parameters: HestonParameters): ParameterVector {
  return [
    parameters.initialVariance,
    parameters.longRunVariance,
    parameters.meanReversion,
    parameters.volatilityOfVariance,
    parameters.correlation,
  ];
}

function fromVector(vector: ParameterVector): HestonParameters {
  return {
    initialVariance: vector[0],
    longRunVariance: vector[1],
    meanReversion: vector[2],
    volatilityOfVariance: vector[3],
    correlation: vector[4],
  };
}

function combineVectors(
  left: ParameterVector,
  right: ParameterVector,
  rightScale: number,
): ParameterVector {
  return left.map((value, index) => value + rightScale * right[index]!) as ParameterVector;
}

export function calibrateHestonFixture(
  market: MarketState,
  quotes = buildHestonCalibrationFixture(market),
): HestonCalibrationResult {
  const initialParameters = { ...hestonCalibrationInitialParameters };
  const initialVector = toVector(initialParameters);
  const initialSteps: ParameterVector = [0.025, 0.025, 0.6, 0.25, 0.3];
  const simplex: ParameterVector[] = [initialVector];
  for (let dimension = 0; dimension < initialVector.length; dimension += 1) {
    const vertex = [...initialVector] as ParameterVector;
    vertex[dimension] = vertex[dimension]! + initialSteps[dimension]!;
    simplex.push(vertex);
  }
  let evaluations = 0;
  const evaluate = (vector: ParameterVector) => {
    const parameters = fromVector(vector);
    evaluations += 1;
    return withinBounds(parameters)
      ? objective(parameters, market, quotes)
      : Number.POSITIVE_INFINITY;
  };
  const values = simplex.map(evaluate);
  const initialObjective = values[0]!;
  let iterations = 0;
  const dimension = initialVector.length;

  for (; iterations < 120; iterations += 1) {
    const ordering = values
      .map((value, index) => ({ value, index }))
      .sort((left, right) => left.value - right.value);
    const orderedSimplex = ordering.map(({ index }) => simplex[index]!);
    const orderedValues = ordering.map(({ value }) => value);
    simplex.splice(0, simplex.length, ...orderedSimplex);
    values.splice(0, values.length, ...orderedValues);

    if (
      values[0]! < hestonCalibrationObjectiveTolerance ||
      values[dimension]! - values[0]! < 1e-9
    ) {
      break;
    }

    const centroid = Array.from(
      { length: dimension },
      (_, coordinate) =>
        simplex.slice(0, dimension).reduce((sum, vertex) => sum + vertex[coordinate]!, 0) /
        dimension,
    ) as ParameterVector;
    const worst = simplex[dimension]!;
    const awayFromWorst = combineVectors(centroid, worst, -1);
    const reflected = combineVectors(centroid, awayFromWorst, 1);
    const reflectedValue = evaluate(reflected);

    if (reflectedValue < values[0]!) {
      const expanded = combineVectors(centroid, awayFromWorst, 2);
      const expandedValue = evaluate(expanded);
      if (expandedValue < reflectedValue) {
        simplex[dimension] = expanded;
        values[dimension] = expandedValue;
      } else {
        simplex[dimension] = reflected;
        values[dimension] = reflectedValue;
      }
      continue;
    }

    if (reflectedValue < values[dimension - 1]!) {
      simplex[dimension] = reflected;
      values[dimension] = reflectedValue;
      continue;
    }

    const contractedDirection = combineVectors(worst, centroid, -1);
    const contracted = combineVectors(centroid, contractedDirection, 0.5);
    const contractedValue = evaluate(contracted);
    if (contractedValue < values[dimension]!) {
      simplex[dimension] = contracted;
      values[dimension] = contractedValue;
      continue;
    }

    const best = simplex[0]!;
    for (let vertex = 1; vertex <= dimension; vertex += 1) {
      simplex[vertex] = combineVectors(best, combineVectors(simplex[vertex]!, best, -1), 0.5);
      values[vertex] = evaluate(simplex[vertex]!);
    }
  }

  const ordering = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value);
  const parameters = fromVector(simplex[ordering[0]!.index]!);
  const bestObjective = ordering[0]!.value;

  const fit = evaluateHestonCalibrationFit(parameters, market, quotes);

  return {
    parameters,
    initialParameters,
    initialObjective,
    finalObjective: bestObjective,
    iterations,
    evaluations,
    converged: bestObjective < hestonCalibrationObjectiveTolerance,
    fit,
  };
}
