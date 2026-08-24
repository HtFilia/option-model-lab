import { ApiResponseError, ApiUnavailableError } from '../api/errors';
import { calibrateHestonRemote } from '../api/heston';
import type { MarketState } from '../quant/blackScholes';
import type { HestonCalibrationQuote, HestonCalibrationResult } from './hestonLab';

export type HestonCalibrationExecutionSource = 'remote' | 'local-fallback';

export interface HestonCalibrationExecution {
  result: HestonCalibrationResult;
  source: HestonCalibrationExecutionSource;
  notice: string | null;
}

type RemoteCalibration = (
  market: MarketState,
  quotes: HestonCalibrationQuote[],
) => Promise<HestonCalibrationResult>;

type LocalCalibration = () => Promise<HestonCalibrationResult>;

function permitsLocalFallback(error: unknown): boolean {
  return (
    error instanceof ApiUnavailableError ||
    (error instanceof ApiResponseError && error.status >= 500)
  );
}

export async function executeHestonCalibration(
  market: MarketState,
  quotes: HestonCalibrationQuote[],
  localCalibration: LocalCalibration,
  remoteCalibration: RemoteCalibration = calibrateHestonRemote,
): Promise<HestonCalibrationExecution> {
  try {
    return {
      result: await remoteCalibration(market, quotes),
      source: 'remote',
      notice: null,
    };
  } catch (error) {
    if (!permitsLocalFallback(error)) throw error;
    return {
      result: await localCalibration(),
      source: 'local-fallback',
      notice:
        'The remote API was unavailable, so the identical browser engine completed the fit locally.',
    };
  }
}
