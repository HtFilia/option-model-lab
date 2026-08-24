import { useEffect, useMemo, useRef, useState } from 'react';
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
  buildHestonCalibrationFixture,
  calibrateHestonFixture,
  evaluateHestonCalibrationFit,
  hestonCalibrationInitialParameters,
  hestonCalibrationObjectiveTolerance,
  hestonParameterBounds,
  type HestonCalibrationFitPoint,
  type HestonCalibrationResult,
} from '../features/hestonLab';
import type { HestonParameters } from '../quant/heston';

const market = { spot: 100, riskFreeRate: 0.03, dividendYield: 0.01 };
const parameterRows: readonly [keyof HestonParameters, string, string][] = [
  ['initialVariance', 'v₀', 'Initial variance'],
  ['longRunVariance', 'θ', 'Long-run variance'],
  ['meanReversion', 'κ', 'Mean reversion'],
  ['volatilityOfVariance', 'ξ', 'Volatility of variance'],
  ['correlation', 'ρ', 'Spot/variance correlation'],
];
const tooltipStyle = {
  border: '1px solid var(--strong-line)',
  borderRadius: 2,
  background: 'var(--chart-surface)',
  color: 'var(--ink)',
  fontSize: 13,
};

interface WorkerResponse {
  result: HestonCalibrationResult | null;
  error: string | null;
}

function residualLevel(residual: number, maximum: number): string {
  if (maximum <= 0) return 'level-0';
  return `level-${Math.min(4, Math.round((Math.abs(residual) / maximum) * 4))}`;
}

export function HestonCalibrateView() {
  const quotes = useMemo(() => buildHestonCalibrationFixture(market), []);
  const initialFit = useMemo(
    () => evaluateHestonCalibrationFit(hestonCalibrationInitialParameters, market, quotes),
    [quotes],
  );
  const [result, setResult] = useState<HestonCalibrationResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState<number | null>(null);
  const [selectedMaturity, setSelectedMaturity] = useState(1);
  const workerRef = useRef<Worker | null>(null);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
    },
    [],
  );

  const displayedFit = result?.fit ?? initialFit;
  const smileSlice = displayedFit.filter((point) => point.timeToMaturity === selectedMaturity);
  const maximumResidual = Math.max(
    ...displayedFit.map((point) => Math.abs(point.volatilityResidual)),
  );
  const displayedParameters = result?.parameters ?? hestonCalibrationInitialParameters;

  function runCalibration() {
    workerRef.current?.terminate();
    setStatus('running');
    setError(null);
    setResult(null);
    const startedAt = performance.now();

    if (typeof Worker === 'undefined') {
      try {
        const fallbackResult = calibrateHestonFixture(market, quotes);
        setResult(fallbackResult);
        setElapsedMilliseconds(performance.now() - startedAt);
        setStatus('complete');
      } catch (calibrationError) {
        setError(
          calibrationError instanceof Error
            ? calibrationError.message
            : 'The calibration could not complete.',
        );
        setStatus('error');
      }
      return;
    }

    const worker = new Worker(new URL('../workers/hestonCalibration.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      workerRef.current = null;
      worker.terminate();
      setElapsedMilliseconds(performance.now() - startedAt);
      if (event.data.result) {
        setResult(event.data.result);
        setStatus('complete');
      } else {
        setError(event.data.error ?? 'The calibration could not complete.');
        setStatus('error');
      }
    };
    worker.onerror = () => {
      workerRef.current = null;
      worker.terminate();
      setError('The calibration worker stopped unexpectedly.');
      setStatus('error');
    };
    worker.postMessage({ market });
  }

  return (
    <main id="main-content" className="page-shell lab-page heston-calibrate-page">
      <section className="lab-intro">
        <div>
          <p className="eyebrow">Heston · Calibrate</p>
          <h1>Fit five parameters to one surface.</h1>
        </div>
        <p>
          This deterministic exercise fits fifteen synthetic option quotes jointly. It exposes
          parameter bounds, the objective, the starting point, fit residuals, and solver
          diagnostics.
        </p>
      </section>

      <section className="heston-calibration-setup" aria-labelledby="calibration-setup-title">
        <div className="calibration-setup-copy">
          <p className="section-index">Calibration contract</p>
          <h2 id="calibration-setup-title">What the optimizer is asked to do</h2>
          <p>
            Calls on five strikes and three maturities are generated from a hidden, reproducible
            Heston scenario. Every quote receives equal weight in normalized price space.
          </p>
          <div className="equation-panel">
            <span className="equation-label">Objective</span>
            <BlockMath math="\operatorname{RMSE}=\sqrt{\frac1N\sum_{i=1}^N\left(\frac{V_i^{model}-V_i^{market}}{S_0}\right)^2}" />
          </div>
          <dl className="calibration-fixture-facts">
            <div>
              <dt>Quotes</dt>
              <dd>15</dd>
            </div>
            <div>
              <dt>Weighting</dt>
              <dd>Equal</dd>
            </div>
            <div>
              <dt>Market</dt>
              <dd>S 100 · r 3% · q 1%</dd>
            </div>
            <div>
              <dt>Tolerance</dt>
              <dd>{hestonCalibrationObjectiveTolerance.toExponential(1)}</dd>
            </div>
          </dl>
          <button
            className="primary-button heston-calibrate-button"
            type="button"
            onClick={runCalibration}
            disabled={status === 'running'}
          >
            {status === 'running' ? 'Calibrating surface…' : 'Run bounded calibration'}
          </button>
          <p className="worker-note">
            The deterministic simplex search runs off the main interface thread because profiling
            showed that repeated Fourier valuations create a visible pause.
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
            aria-label="Heston parameter calibration bounds"
          >
            <div className="parameter-table-row heading" role="row">
              <span role="columnheader">Parameter</span>
              <span role="columnheader">Initial</span>
              <span role="columnheader">Bounds</span>
              <span role="columnheader">Current</span>
            </div>
            {parameterRows.map(([key, symbol, label]) => (
              <div className="parameter-table-row" role="row" key={key}>
                <span role="cell">
                  <b>{symbol}</b>
                  {label}
                </span>
                <span role="cell">{hestonCalibrationInitialParameters[key].toFixed(4)}</span>
                <span role="cell">
                  [{hestonParameterBounds[key][0].toFixed(2)},{' '}
                  {hestonParameterBounds[key][1].toFixed(2)}]
                </span>
                <span role="cell" className={result ? 'calibrated-value' : ''}>
                  {displayedParameters[key].toFixed(4)}
                </span>
              </div>
            ))}
          </div>

          {error ? (
            <div className="educational-error" role="alert">
              <strong>Calibration did not complete.</strong>
              <p>{error}</p>
            </div>
          ) : null}

          {result ? (
            <dl className="calibration-diagnostics" data-testid="heston-calibration-result">
              <div>
                <dt>Initial objective</dt>
                <dd>{result.initialObjective.toExponential(4)}</dd>
              </div>
              <div>
                <dt>Final objective</dt>
                <dd data-testid="heston-final-objective">
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
                <dd>{elapsedMilliseconds?.toFixed(0)} ms</dd>
              </div>
            </dl>
          ) : null}
        </div>
      </section>

      <section className="heston-fit-section" aria-labelledby="heston-fit-title">
        <div className="surface-heading heston-fit-heading">
          <div>
            <p className="section-index">Model versus market</p>
            <h2 id="heston-fit-title">A surface fit is more than one solved number</h2>
          </div>
          <p>
            Before calibration the chart shows the documented initial guess. After the search it
            shows the fitted parameters. Residuals remain visible instead of being hidden behind one
            objective value.
          </p>
        </div>

        <div className="heston-fit-grid">
          <figure className="surface-slice-chart">
            <div className="chart-heading">
              <div>
                <h3>{selectedMaturity.toFixed(1)} year fit</h3>
                <p>Market and model implied volatilities across strike.</p>
              </div>
              <div className="maturity-choice" aria-label="Select fit maturity">
                {[0.5, 1, 2].map((maturity) => (
                  <button
                    key={maturity}
                    type="button"
                    className={selectedMaturity === maturity ? 'active' : ''}
                    aria-pressed={selectedMaturity === maturity}
                    onClick={() => setSelectedMaturity(maturity)}
                  >
                    {maturity}y
                  </button>
                ))}
              </div>
            </div>
            <div className="surface-chart-canvas" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={smileSlice} margin={{ top: 10, right: 14, bottom: 4, left: 8 }}>
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
                    labelFormatter={(value) => `Strike ${Number(value).toFixed(0)}`}
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
                    name={result ? 'Calibrated Heston' : 'Initial Heston'}
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
              Implied-volatility residuals are market minus model at each quote.
            </figcaption>
          </figure>

          <div className="residual-surface-wrap">
            <div className="surface-table-heading">
              <div>
                <h3>Volatility residual surface</h3>
                <p>Signed model minus market residual, in volatility points.</p>
              </div>
              <span className="fit-stage">{result ? 'Calibrated fit' : 'Initial guess'}</span>
            </div>
            <div className="surface-table-scroll">
              <table className="vol-surface-table residual-table">
                <caption>Heston model minus synthetic market implied-volatility residuals.</caption>
                <thead>
                  <tr>
                    <th scope="col">T \ K</th>
                    {[80, 90, 100, 110, 120].map((strike) => (
                      <th scope="col" key={strike}>
                        {strike}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[0.5, 1, 2].map((timeToMaturity) => (
                    <tr key={timeToMaturity}>
                      <th scope="row">{timeToMaturity.toFixed(1)}y</th>
                      {displayedFit
                        .filter((point) => point.timeToMaturity === timeToMaturity)
                        .map((point: HestonCalibrationFitPoint) => (
                          <td key={point.strike}>
                            <span
                              className={`residual-cell ${residualLevel(point.volatilityResidual, maximumResidual)}`}
                            >
                              {point.volatilityResidual >= 0 ? '+' : ''}
                              {(point.volatilityResidual * 100).toFixed(2)}
                            </span>
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="synthetic-note">
              <span aria-hidden="true">◆</span> Deterministic synthetic quotes generated locally.
              Parameter recovery is not guaranteed to be unique even when the surface fit is close.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
