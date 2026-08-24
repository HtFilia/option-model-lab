import { useMemo } from 'react';
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
  buildSabrCalibrationFixture,
  calibrateSabrFixture,
  evaluateSabrCalibrationFit,
  sabrCalibrationBeta,
  sabrCalibrationBounds,
  sabrCalibrationForward,
  sabrCalibrationInitialParameters,
  sabrCalibrationMaturity,
  sabrCalibrationObjectiveTolerance,
} from '../features/sabrLab';

const tooltipStyle = {
  border: '1px solid var(--strong-line)',
  borderRadius: 2,
  background: 'var(--chart-surface)',
  color: 'var(--ink)',
  fontSize: 13,
};
const rows = [
  ['alpha', 'α', 'Volatility level'],
  ['beta', 'β', 'Elasticity'],
  ['rho', 'ρ', 'Correlation'],
  ['nu', 'ν', 'Vol of volatility'],
] as const;

export function SabrCalibrateView() {
  const quotes = useMemo(() => buildSabrCalibrationFixture(), []);
  const initialFit = useMemo(
    () => evaluateSabrCalibrationFit(sabrCalibrationInitialParameters, quotes),
    [quotes],
  );
  const result = useMemo(() => calibrateSabrFixture(quotes), [quotes]);
  const maximumResidual = Math.max(
    ...result.fit.map((point) => Math.abs(point.volatilityResidual)),
  );
  const level = (residual: number) =>
    maximumResidual <= 0
      ? 'level-0'
      : `level-${Math.min(4, Math.round((Math.abs(residual) / maximumResidual) * 4))}`;

  return (
    <main id="main-content" className="page-shell lab-page sabr-calibrate-page">
      <section className="lab-intro">
        <div>
          <p className="eyebrow">SABR · Calibrate</p>
          <h1>Fit a smile, not one price.</h1>
        </div>
        <p>
          The fit runs immediately because this small deterministic inverse problem is fast. β stays
          fixed while α, ρ, and ν minimize volatility-quote RMSE across one two-year smile.
        </p>
      </section>
      <section
        className="heston-calibration-setup sabr-calibration-setup"
        aria-labelledby="sabr-calibration-title"
      >
        <div className="calibration-setup-copy">
          <p className="section-index">Calibration contract</p>
          <h2 id="sabr-calibration-title">What the solver actually sees</h2>
          <p>
            Nine synthetic Black implied volatilities at one expiry. This differs from Black–Scholes
            inversion: one price determines one scalar σ there, while several smile quotes jointly
            constrain three SABR parameters here.
          </p>
          <div className="equation-panel">
            <span className="equation-label">Equal-weight volatility objective</span>
            <BlockMath math="\operatorname{RMSE}_{\sigma}=\sqrt{\frac1N\sum_{i=1}^N(\sigma_i^{SABR}-\sigma_i^{market})^2}" />
          </div>
          <dl className="calibration-fixture-facts">
            <div>
              <dt>Quotes</dt>
              <dd>{quotes.length}</dd>
            </div>
            <div>
              <dt>Forward</dt>
              <dd>{(sabrCalibrationForward * 100).toFixed(2)}%</dd>
            </div>
            <div>
              <dt>Maturity</dt>
              <dd>{sabrCalibrationMaturity.toFixed(1)}y</dd>
            </div>
            <div>
              <dt>β</dt>
              <dd>{sabrCalibrationBeta.toFixed(2)} fixed</dd>
            </div>
          </dl>
          <p className="worker-note">
            The bounded coordinate search is SABR-specific and completes during render without a
            perceptible pause. No worker or generic calibration framework is needed.
          </p>
        </div>
        <div className="parameter-bounds-panel">
          <div className="panel-heading">
            <div>
              <p className="section-index">Automatic result</p>
              <h2>Search diagnostics</h2>
            </div>
            <span
              className={`calibration-state ${result.converged ? 'complete' : 'error'}`}
              aria-live="polite"
            >
              <i aria-hidden="true" /> {result.converged ? 'Converged' : 'Stopped'}
            </span>
          </div>
          <div
            className="parameter-calibration-table"
            role="table"
            aria-label="SABR calibration parameters"
          >
            <div className="parameter-table-row heading" role="row">
              <span role="columnheader">Parameter</span>
              <span role="columnheader">Initial</span>
              <span role="columnheader">Bounds</span>
              <span role="columnheader">Fitted</span>
            </div>
            {rows.map(([key, symbol, label]) => {
              const bounds = key === 'beta' ? null : sabrCalibrationBounds[key];
              return (
                <div className="parameter-table-row" role="row" key={key}>
                  <span role="cell">
                    <b>{symbol}</b>
                    {label}
                  </span>
                  <span role="cell">{sabrCalibrationInitialParameters[key].toFixed(4)}</span>
                  <span role="cell">
                    {bounds ? `[${bounds[0].toFixed(3)}, ${bounds[1].toFixed(3)}]` : 'fixed'}
                  </span>
                  <span role="cell" className="calibrated-value">
                    {result.parameters[key].toFixed(4)}
                  </span>
                </div>
              );
            })}
          </div>
          <dl className="calibration-diagnostics" data-testid="sabr-calibration-result">
            <div>
              <dt>Initial RMSE</dt>
              <dd>{result.initialObjective.toExponential(4)}</dd>
            </div>
            <div>
              <dt>Final RMSE</dt>
              <dd data-testid="sabr-final-objective">{result.finalObjective.toExponential(4)}</dd>
            </div>
            <div>
              <dt>Iterations</dt>
              <dd>{result.iterations}</dd>
            </div>
            <div>
              <dt>Evaluations</dt>
              <dd>{result.evaluations}</dd>
            </div>
            <div>
              <dt>Tolerance</dt>
              <dd>{sabrCalibrationObjectiveTolerance.toExponential(1)}</dd>
            </div>
            <div>
              <dt>Convention</dt>
              <dd>Black σ</dd>
            </div>
          </dl>
        </div>
      </section>
      <section className="heston-fit-section sabr-fit-section" aria-labelledby="sabr-fit-title">
        <div className="surface-heading heston-fit-heading">
          <div>
            <p className="section-index">Model versus market</p>
            <h2 id="sabr-fit-title">The whole smile stays visible</h2>
          </div>
          <p>
            Initial and fitted curves remain on the chart so the optimizer’s work is inspectable
            rather than hidden behind one diagnostic.
          </p>
        </div>
        <div className="heston-fit-grid sabr-fit-grid">
          <figure className="surface-slice-chart">
            <div className="chart-heading">
              <div>
                <h3>Two-year implied-volatility fit</h3>
                <p>Black lognormal quote by strike.</p>
              </div>
              <span className="fit-stage">Automatic fit</span>
            </div>
            <div className="surface-chart-canvas" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={result.fit.map((point, index) => ({
                    ...point,
                    initialVolatility: initialFit[index]?.modelImpliedVolatility,
                  }))}
                >
                  <CartesianGrid
                    stroke="var(--chart-grid)"
                    vertical={false}
                    strokeDasharray="2 5"
                  />
                  <XAxis
                    dataKey="strike"
                    tickFormatter={(v) => `${(Number(v) * 100).toFixed(1)}%`}
                    tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                    width={48}
                    tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v, n) => [`${(Number(v) * 100).toFixed(3)}%`, n]}
                    labelFormatter={(v) => `Strike ${(Number(v) * 100).toFixed(3)}%`}
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
                    name="Initial SABR"
                    type="monotone"
                    dataKey="initialVolatility"
                    stroke="var(--quiet)"
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    name="Fitted SABR"
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
            <figcaption>Synthetic market, initial guess, and bounded SABR fit.</figcaption>
          </figure>
          <div className="residual-surface-wrap sabr-residual-wrap">
            <div className="surface-table-heading">
              <div>
                <h3>Quote residuals</h3>
                <p>Signed fitted minus market, in volatility points.</p>
              </div>
              <span className="fit-stage">After search</span>
            </div>
            <div className="merton-residual-list" role="table" aria-label="SABR smile residuals">
              <div className="merton-residual-row heading" role="row">
                <span role="columnheader">Strike</span>
                <span role="columnheader">Market σ</span>
                <span role="columnheader">SABR σ</span>
                <span role="columnheader">Residual</span>
              </div>
              {result.fit.map((point) => (
                <div className="merton-residual-row" role="row" key={point.strike}>
                  <span role="cell">{(point.strike * 100).toFixed(3)}%</span>
                  <span role="cell">{(point.marketImpliedVolatility * 100).toFixed(2)}%</span>
                  <span role="cell">{(point.modelImpliedVolatility * 100).toFixed(2)}%</span>
                  <span role="cell" className={`residual-cell ${level(point.volatilityResidual)}`}>
                    {point.volatilityResidual >= 0 ? '+' : ''}
                    {(point.volatilityResidual * 100).toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
            <p className="synthetic-note">
              <span aria-hidden="true">◆</span> Deterministic synthetic data generated locally. This
              is one expiry slice, not a market-wide arbitrage-clean surface.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
