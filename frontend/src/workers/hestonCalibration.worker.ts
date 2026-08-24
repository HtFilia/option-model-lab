/// <reference lib="webworker" />

import { calibrateHestonFixture } from '../features/hestonLab';
import type { MarketState } from '../quant/blackScholes';

self.onmessage = (event: MessageEvent<{ market: MarketState }>) => {
  try {
    self.postMessage({ result: calibrateHestonFixture(event.data.market), error: null });
  } catch (error) {
    self.postMessage({
      result: null,
      error: error instanceof Error ? error.message : 'The calibration worker failed.',
    });
  }
};
