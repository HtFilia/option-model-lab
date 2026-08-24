import { useMemo, useState } from 'react';
import { BlockMath } from 'react-katex';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildMertonCalibrationFixture,
  calibrateMertonFixture,
  evaluateMertonCalibrationFit,
  mertonCalibrationBounds,
  mertonCalibrationInitialParameters,
  mertonCalibrationMaturity,
  mertonCalibrationObjectiveTolerance,
  type MertonCalibrationResult,
} from '../features/mertonJumpLab';
import type { MertonJumpParameters } from '../quant/mertonJumpDiffusion';

const market = { spot: 100, riskFreeRate: 0.03, dividendYield: 0.01 };
const parameterRows: readonly [keyof MertonJumpParameters, string, string][] = [
  ['diffusionVolatility', 'σ', 'Diffusion volatility'],
  ['jumpIntensity', 'λ', 'Jump intensity'],
  ['meanLogJump', 'μJ', 'Mean log jump'],
  ['jumpVolatility', 'δJ', 'Jump dispersion'],
];
const tooltipStyle = {
  border: '1px solid var(--strong-line)',
  borderRadius: 2,
  background: 'var(--chart-surface)',
  color: 'var(--ink)',
  fontSize: 13,
};

function residualLevel(residual: number, maximum: number): string {
  if (maximum <= 0) return 'level-0';
  return `level-${Math.min(4, Math.round((Math.abs(residual) / maximum) * 4))}`;
}

export function MertonCalibrateView() {
  const quotes = useMemo(() => buildMertonCalibrationFixture(market), []);
  const initialFit = useMemo(
    () => evaluateMertonCalibrationFit(mertonCalibrationInitialParameters, market, quotes),
    [quotes],
  );
  const [result, setResult] = useState<MertonCalibrationResult | null>(null);
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const displayedFit = result?.fit ?? initialFit;
  const displayedParameters = result?.parameters ?? mertonCalibrationInitialParameters;
  const maximumResidual = Math.max(
    ...displayedFit.map((point) => Math.abs(point.volatilityResidual)),
  );

  function runCalibration() {
    const startedAt = performance.now();
    try {
      const nextResult = calibrateMertonFixture(market, quotes);
      setResult(nextResult);
      setElapsedMilliseconds(performance.now() - startedAt);
      setStatus('complete');
      setError(null);
    } catch (calibrationError) {
      setStatus('error');
      setError(
        calibrationError instanceof Error
          ? calibrationError.message
          : 'The calibration could not complete.',
      );
    }
  }

  return (
    <main id="main-content" className="page-shell lab-page merton-calibrate-page">
      <section className="lab-intro">
        <div>
          <p className="eyebrow">Merton Jump Diffusion · Calibrate</p>
          <h1>Fit event risk to one short smile.</h1>
        </div>
        <p>
          Nine deterministic synthetic quotes isolate the jump parameters. Diffusion volatility is
          held fixed so frequency, direction, and jump dispersion remain the visible inverse
          problem.
        </p>
      </section>

      <section
        className="heston-calibration-setup merton-calibration-setup"
        aria-labelledby="merton-calibration-setup-title"
      >
        <div className="calibration-setup-copy">
          <p className="section-index">Calibration contract</p>
          <h2 id="merton-calibration-setup-title">What is fitted—and what is not</h2>
          <p>
            The synthetic market is a three-month call smile. λ, μJ, and δJ are bounded search
            variables; σ stays fixed at 15% to avoid hiding parameter trade-offs.
          </p>
          <div className="equation-panel">
            <span className="equation-label">Objective</span>
            <BlockMath math="\operatorname{RMSE}=\sqrt{\frac1N\sum_{i=1}^N\left(\frac{V_i^{model}-V_i^{market}}{S_0}\right)^2}" />
          </div>
          <dl className="calibration-fixture-facts">
            <div>
              <dt>Quotes</dt>
              <dd>{quotes.length}</dd>
            </div>
            <div>
              <dt>Maturity</dt>
              <dd>{mertonCalibrationMaturity.toFixed(2)}y</dd>
            </div>
            <div>
              <dt>Weighting</dt>
              <dd>Equal price</dd>
            </div>
            <div>
              <dt>Tolerance</dt>
              <dd>{mertonCalibrationObjectiveTolerance.toExponential(1)}</dd>
            </div>
          </dl>
          <button className="primary-button" type="button" onClick={runCalibration}>
            Run bounded smile calibration
          </button>
          <p className="worker-note">
            This small Poisson-mixture fit completes on the main thread without a perceptible pause,
            so adding another worker would not solve a measured problem.
          </p>
        </div>

        <div className="parameter-bounds-panel">
          <div className="panel-heading">
            <div>
              <p className="section-index">Initial point and bounds</p>
              <h2>Search domain</h2>
            </div>
            <span className={`calibration-state ${status}`} aria-live="polite">
              <i aria-hidden="true" /> {status === 'idle' ? 'Not run' : status}
            </span>
          </div>
          <div
            className="parameter-calibration-table"
            role="table"
            aria-label="Merton jump parameter calibration bounds"
          >
            <div className="parameter-table-row heading" role="row">
              <span role="columnheader">Parameter</span>
              <span role="columnheader">Initial</span>
              <span role="columnheader">Bounds</span>
              <span role="columnheader">Current</span>
            </div>
            {parameterRows.map(([key, symbol, label]) => {
              const bounds = key === 'diffusionVolatility' ? null : mertonCalibrationBounds[key];
              return (
                <div className="parameter-table-row" role="row" key={key}>
                  <span role="cell">
                    <b>{symbol}</b>
                    {label}
                  </span>
                  <span role="cell">{mertonCalibrationInitialParameters[key].toFixed(4)}</span>
                  <span role="cell">
                    {bounds ? `[${bounds[0].toFixed(2)}, ${bounds[1].toFixed(2)}]` : 'fixed'}
                  </span>
                  <span role="cell" className={result ? 'calibrated-value' : ''}>
                    {displayedParameters[key].toFixed(4)}
                  </span>
                </div>
              );
            })}
          </div>

          {error ? (
            <div className="educational-error" role="alert">
              <strong>Calibration did not complete.</strong>
              <p>{error}</p>
            </div>
          ) : null}
          {result ? (
            <dl className="calibration-diagnostics" data-testid="merton-calibration-result">
              <div>
                <dt>Initial objective</dt>
                <dd>{result.initialObjective.toExponential(4)}</dd>
              </div>
              <div>
                <dt>Final objective</dt>
                <dd data-testid="merton-final-objective">
                  {result.finalObjective.toExponential(4)}
                </dd>
              </div>
              <div>
                <dt>Iterations</dt>
                <dd>{result.iterations}</dd>
              </div>
              <div>
                <dt>Valuations</dt>
                <dd>{result.evaluations * quotes.length}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{result.converged ? 'Converged' : 'Stopped'}</dd>
              </div>
              <div>
                <dt>Elapsed</dt>
                <dd>{elapsedMilliseconds?.toFixed(1)} ms</dd>
              </div>
            </dl>
          ) : null}
        </div>
      </section>

      <section className="heston-fit-section merton-fit-section" aria-labelledby="merton-fit-title">
        <div className="surface-heading heston-fit-heading">
          <div>
            <p className="section-index">Model versus market</p>
            <h2 id="merton-fit-title">Residuals keep the smile honest</h2>
          </div>
          <p>
            Before calibration the chart shows the documented initial guess. After the search, every
            quote remains visible alongside its signed residual.
          </p>
        </div>
        <div className="heston-fit-grid merton-fit-grid">
          <figure className="surface-slice-chart">
            <div className="chart-heading">
              <div>
                <h3>Three-month implied-volatility fit</h3>
                <p>Synthetic market and model across strike.</p>
              </div>
              <span className="fit-stage">{result ? 'Calibrated fit' : 'Initial guess'}</span>
            </div>
            <div className="surface-chart-canvas" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayedFit} margin={{ top: 10, right: 14, bottom: 4, left: 8 }}>
                  <CartesianGrid
                    stroke="var(--chart-grid)"
                    vertical={false}
                    strokeDasharray="2 5"
                  />
                  <XAxis
                    dataKey="strike"
                    stroke="var(--chart-axis)"
                    tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--chart-grid)' }}
                  />
                  <YAxis
                    stroke="var(--chart-axis)"
                    tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    formatter={(value, name) => [`${(Number(value) * 100).toFixed(3)}%`, name]}
                    labelFormatter={(value) => `Strike ${Number(value).toFixed(1)}`}
                    contentStyle={tooltipStyle}
                  />
                  <Line
                    name="Synthetic market"
                    type="monotone"
                    dataKey="marketImpliedVolatility"
                    stroke="var(--warm)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'var(--warm)' }}
                    isAnimationActive={false}
                  />
                  <Line
                    name={result ? 'Calibrated Merton' : 'Initial Merton'}
                    type="monotone"
                    dataKey="modelImpliedVolatility"
                    stroke="var(--accent)"
                    strokeWidth={2.25}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <figcaption>
              Market and Merton implied volatilities for the synthetic fixture.
            </figcaption>
          </figure>

          <div className="residual-surface-wrap merton-residual-wrap">
            <div className="surface-table-heading">
              <div>
                <h3>Quote residuals</h3>
                <p>Signed model minus market, in volatility points.</p>
              </div>
              <span className="fit-stage">{result ? 'After search' : 'Before search'}</span>
            </div>
            <div
              className="merton-residual-list"
              role="table"
              aria-label="Merton smile calibration residuals"
            >
              <div className="merton-residual-row heading" role="row">
                <span role="columnheader">Strike</span>
                <span role="columnheader">Market σ</span>
                <span role="columnheader">Model σ</span>
                <span role="columnheader">Residual</span>
              </div>
              {displayedFit.map((point) => (
                <div className="merton-residual-row" role="row" key={point.strike}>
                  <span role="cell">{point.strike.toFixed(1)}</span>
                  <span role="cell">{(point.marketImpliedVolatility * 100).toFixed(2)}%</span>
                  <span role="cell">{(point.modelImpliedVolatility * 100).toFixed(2)}%</span>
                  <span
                    role="cell"
                    className={`residual-cell ${residualLevel(point.volatilityResidual, maximumResidual)}`}
                  >
                    {point.volatilityResidual >= 0 ? '+' : ''}
                    {(point.volatilityResidual * 100).toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
            <p className="synthetic-note">
              <span aria-hidden="true">◆</span> Deterministic synthetic data generated locally. A
              close smile fit does not prove the jump law is the true data-generating process.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
