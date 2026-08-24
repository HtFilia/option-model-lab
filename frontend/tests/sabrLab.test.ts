import { describe, expect, it } from 'vitest';
import {
  buildSabrCalibrationFixture,
  calibrateSabrFixture,
  evaluateSabrCalibrationFit,
  sabrCalibrationInitialParameters,
} from '../src/features/sabrLab';

describe('SABR educational lab helpers', () => {
  it('builds a deterministic nine-quote smile', () => {
    const first = buildSabrCalibrationFixture();
    const second = buildSabrCalibrationFixture();
    expect(first).toEqual(second);
    expect(first).toHaveLength(9);
    expect(first.every((quote) => quote.marketImpliedVolatility > 0)).toBe(true);
  });

  it('reduces smile-volatility RMSE and recovers the synthetic fixture', () => {
    const quotes = buildSabrCalibrationFixture();
    const initialFit = evaluateSabrCalibrationFit(sabrCalibrationInitialParameters, quotes);
    const result = calibrateSabrFixture(quotes);
    const initialRmse = Math.sqrt(
      initialFit.reduce((sum, point) => sum + point.volatilityResidual ** 2, 0) / initialFit.length,
    );
    expect(result.converged).toBe(true);
    expect(result.initialObjective).toBeCloseTo(initialRmse, 14);
    expect(result.finalObjective).toBeLessThan(2e-5);
    expect(result.finalObjective).toBeLessThan(result.initialObjective / 100);
    expect(result.parameters.alpha).toBeCloseTo(0.04, 3);
    expect(result.parameters.rho).toBeCloseTo(-0.3, 2);
    expect(result.parameters.nu).toBeCloseTo(0.5, 2);
    expect(result.parameters.beta).toBe(0.5);
  });
});
