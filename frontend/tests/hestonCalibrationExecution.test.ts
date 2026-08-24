import { describe, expect, it, vi } from 'vitest';
import { ApiResponseError, ApiUnavailableError } from '../src/api/errors';
import { executeHestonCalibration } from '../src/features/hestonCalibrationExecution';
import { buildHestonCalibrationFixture, calibrateHestonFixture } from '../src/features/hestonLab';

const market = { spot: 100, riskFreeRate: 0.03, dividendYield: 0.01 };
const quotes = buildHestonCalibrationFixture(market);
const result = calibrateHestonFixture(market, quotes);

describe('hybrid Heston calibration execution', () => {
  it('uses the API result without invoking the local fallback', async () => {
    const remote = vi.fn().mockResolvedValue(result);
    const local = vi.fn().mockResolvedValue(result);

    await expect(executeHestonCalibration(market, quotes, local, remote)).resolves.toEqual({
      result,
      source: 'remote',
      notice: null,
    });
    expect(local).not.toHaveBeenCalled();
  });

  it('uses the correct local engine when the API is unavailable', async () => {
    const remote = vi.fn().mockRejectedValue(new ApiUnavailableError('offline'));
    const local = vi.fn().mockResolvedValue(result);

    const execution = await executeHestonCalibration(market, quotes, local, remote);

    expect(execution.source).toBe('local-fallback');
    expect(execution.result).toBe(result);
    expect(execution.notice).toContain('completed the fit locally');
  });

  it('does not bypass client errors with a fallback', async () => {
    const remote = vi.fn().mockRejectedValue(new ApiResponseError(422, 'Invalid quotes.'));
    const local = vi.fn().mockResolvedValue(result);

    await expect(executeHestonCalibration(market, quotes, local, remote)).rejects.toThrow(
      'Invalid quotes',
    );
    expect(local).not.toHaveBeenCalled();
  });

  it('falls back on server failures', async () => {
    const remote = vi.fn().mockRejectedValue(new ApiResponseError(503, 'Unavailable.'));
    const local = vi.fn().mockResolvedValue(result);

    await expect(executeHestonCalibration(market, quotes, local, remote)).resolves.toMatchObject({
      source: 'local-fallback',
    });
  });
});
