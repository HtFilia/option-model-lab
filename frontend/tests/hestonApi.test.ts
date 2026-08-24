import { describe, expect, it, vi } from 'vitest';
import { buildHestonCalibrationFixture, calibrateHestonFixture } from '../src/features/hestonLab';
import { calibrateHestonRemote, parseHestonCalibrationResponse } from '../src/api/heston';
import { ApiProtocolError } from '../src/api/errors';

const market = { spot: 100, riskFreeRate: 0.03, dividendYield: 0.01 };
const quotes = buildHestonCalibrationFixture(market);
const localResult = calibrateHestonFixture(market, quotes);

describe('Heston API client', () => {
  it('posts the bounded model-specific request and validates the response', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(localResult), { status: 200 }));

    await expect(calibrateHestonRemote(market, quotes, fetchImplementation)).resolves.toEqual(
      localResult,
    );
    expect(fetchImplementation).toHaveBeenCalledOnce();
    const [url, options] = fetchImplementation.mock.calls[0]!;
    expect(url).toBe('http://127.0.0.1:8000/api/v1/heston/calibrate');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(String(options?.body))).toMatchObject({
      market,
      maxIterations: 120,
      objectiveTolerance: 5e-4,
    });
  });

  it('rejects malformed responses instead of trusting arbitrary JSON', () => {
    expect(() => parseHestonCalibrationResponse({ ...localResult, fit: [] })).toThrow(
      ApiProtocolError,
    );
    expect(() =>
      parseHestonCalibrationResponse({
        ...localResult,
        parameters: { ...localResult.parameters, correlation: 'not a number' },
      }),
    ).toThrow('correlation');
  });
});
