import {
  blackScholesPrice,
  solveImpliedVolatility,
  type MarketState,
  type OptionType,
} from '../quant/blackScholes';
import { hestonFellerMargin, hestonPriceFor, type HestonParameters } from '../quant/heston';

export interface ModelComparisonScenario {
  type: OptionType;
  strike: number;
  timeToMaturity: number;
  market: MarketState;
  hestonParameters: HestonParameters;
}

export interface ComparisonStrikePoint {
  strike: number;
  blackScholesPrice: number;
  hestonPrice: number;
  blackScholesVolatility: number;
  hestonImpliedVolatility: number;
}

export interface ComparisonSpotPoint {
  spot: number;
  blackScholesPrice: number;
  hestonPrice: number;
}

export interface ModelComparisonResult {
  anchorStrike: number;
  anchorPrice: number;
  calibratedBlackScholesVolatility: number;
  selectedBlackScholesPrice: number;
  selectedHestonPrice: number;
  selectedPriceDifference: number;
  maximumSmileDifference: number;
  fellerMargin: number;
  strikePoints: ComparisonStrikePoint[];
  spotPoints: ComparisonSpotPoint[];
}

export function buildBlackScholesHestonComparison(
  scenario: ModelComparisonScenario,
): ModelComparisonResult {
  const { market, hestonParameters, timeToMaturity, type, strike } = scenario;
  const anchorStrike = market.spot;
  const anchorOption = { type: 'call' as const, strike: anchorStrike, timeToMaturity };
  const anchorPrice = hestonPriceFor(
    anchorOption.type,
    anchorOption.strike,
    anchorOption.timeToMaturity,
    market,
    hestonParameters,
  );
  const calibratedBlackScholesVolatility = solveImpliedVolatility({
    option: anchorOption,
    market,
    marketPrice: anchorPrice,
  }).impliedVolatility;

  const strikePoints = Array.from({ length: 17 }, (_, index) => {
    const pointStrike = Number((market.spot * (0.7 + index * 0.0375)).toFixed(4));
    const option = { type, strike: pointStrike, timeToMaturity };
    const hestonPrice = hestonPriceFor(type, pointStrike, timeToMaturity, market, hestonParameters);
    const hestonImpliedVolatility = solveImpliedVolatility({
      option,
      market,
      marketPrice: hestonPrice,
    }).impliedVolatility;
    return {
      strike: pointStrike,
      blackScholesPrice: blackScholesPrice({
        option,
        market,
        volatility: calibratedBlackScholesVolatility,
      }),
      hestonPrice,
      blackScholesVolatility: calibratedBlackScholesVolatility,
      hestonImpliedVolatility,
    };
  });

  const spotPoints = Array.from({ length: 21 }, (_, index) => {
    const scenarioSpot = Number((market.spot * (0.7 + index * 0.03)).toFixed(4));
    const scenarioMarket = { ...market, spot: scenarioSpot };
    const option = { type, strike, timeToMaturity };
    return {
      spot: scenarioSpot,
      blackScholesPrice: blackScholesPrice({
        option,
        market: scenarioMarket,
        volatility: calibratedBlackScholesVolatility,
      }),
      hestonPrice: hestonPriceFor(type, strike, timeToMaturity, scenarioMarket, hestonParameters),
    };
  });

  const selectedOption = { type, strike, timeToMaturity };
  const selectedBlackScholesPrice = blackScholesPrice({
    option: selectedOption,
    market,
    volatility: calibratedBlackScholesVolatility,
  });
  const selectedHestonPrice = hestonPriceFor(
    type,
    strike,
    timeToMaturity,
    market,
    hestonParameters,
  );

  return {
    anchorStrike,
    anchorPrice,
    calibratedBlackScholesVolatility,
    selectedBlackScholesPrice,
    selectedHestonPrice,
    selectedPriceDifference: selectedHestonPrice - selectedBlackScholesPrice,
    maximumSmileDifference: Math.max(
      ...strikePoints.map((point) =>
        Math.abs(point.hestonImpliedVolatility - point.blackScholesVolatility),
      ),
    ),
    fellerMargin: hestonFellerMargin(hestonParameters),
    strikePoints,
    spotPoints,
  };
}
