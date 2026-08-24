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
  buildLocalVolQuotes,
  buildLocalVolSlice,
  defaultLocalVolSurfaceParameters,
  defaultReconstructionSettings,
  type ReconstructionSettings,
} from '../features/localVolLab';
import { ssviNoArbitrageMargins } from '../quant/localVol';
import { ParameterControl } from './LabControls';
import { ChartAccessibleSummary } from './ChartAccessibleSummary';

const tooltipStyle = {
  border: '1px solid var(--strong-line)',
  borderRadius: 2,
  background: 'var(--chart-surface)',
  color: 'var(--ink)',
  fontSize: 13,
};
export function LocalVolCalibrateView() {
  const [maturity, setMaturity] = useState(1);
  const [settings, setSettings] = useState<ReconstructionSettings>(defaultReconstructionSettings);
  const slice = useMemo(
    () => buildLocalVolSlice(defaultLocalVolSurfaceParameters, maturity, settings),
    [maturity, settings],
  );
  const quotes = useMemo(
    () => buildLocalVolQuotes(defaultLocalVolSurfaceParameters, settings.quoteNoiseBasisPoints),
    [settings.quoteNoiseBasisPoints],
  );
  const valid = slice.filter((point) => point.valid && point.reconstructionError !== null);
  const invalidCount = slice.length - valid.length;
  const rmse = Math.sqrt(
    valid.reduce((sum, point) => sum + (point.reconstructionError ?? 0) ** 2, 0) /
      Math.max(1, valid.length),
  );
  const maximumError = Math.max(
    0,
    ...valid.map((point) => Math.abs(point.reconstructionError ?? 0)),
  );
  const margins = ssviNoArbitrageMargins(defaultLocalVolSurfaceParameters);
  const update = <K extends keyof ReconstructionSettings>(
    key: K,
    value: ReconstructionSettings[K],
  ) => setSettings((current) => ({ ...current, [key]: value }));
  const quoteSlices = [0.5, 1, 2].flatMap((time) =>
    quotes
      .filter((quote) => quote.timeToMaturity === time)
      .map((quote) => ({
        strike: 100 * Math.exp(quote.logMoneyness),
        time,
        [time === 0.5 ? 'vol05' : `vol${time}`]: quote.impliedVolatility,
      })),
  );
  const merged = Array.from(new Set(quoteSlices.map((p) => p.strike)))
    .sort((a, b) => a - b)
    .map((strike) => ({
      strike,
      ...Object.assign({}, ...quoteSlices.filter((p) => p.strike === strike)),
    }));
  return (
    <main id="main-content" className="page-shell lab-page local-vol-calibrate-page">
      <section className="lab-intro">
        <div>
          <p className="eyebrow">Local Vol · Calibrate</p>
          <h1>Differentiate carefully.</h1>
        </div>
        <p>
          There is no Run button and no hidden optimizer. Change quote noise or the
          finite-difference stencil and the surface-to-local-vol reconstruction updates immediately.
        </p>
      </section>
      <section
        className="heston-calibration-setup local-vol-reconstruction-setup"
        aria-labelledby="local-reconstruction-title"
      >
        <div className="calibration-setup-copy">
          <p className="section-index">Inverse problem</p>
          <h2 id="local-reconstruction-title">From sparse quotes to σloc(S,t)</h2>
          <p>
            The source is an arbitrage-constrained SSVI surface. Quotes are sampled on a fixed grid,
            perturbed deterministically if requested, interpolated in total variance, and
            differentiated with centered stencils.
          </p>
          <div className="equation-panel">
            <span className="equation-label">Total-variance Dupire form</span>
            <BlockMath math="\sigma_{loc}^2(k,T)=\frac{\partial_Tw}{\left(1-\frac{k\partial_kw}{2w}\right)^2-\frac{(\partial_kw)^2}{4}\left(\frac1w+\frac14\right)+\frac12\partial_{kk}w}" />
          </div>
          <dl className="calibration-fixture-facts">
            <div>
              <dt>Quote nodes</dt>
              <dd>{quotes.length}</dd>
            </div>
            <div>
              <dt>Interpolation</dt>
              <dd>4×4 polynomial</dd>
            </div>
            <div>
              <dt>Time coordinate</dt>
              <dd>√T</dd>
            </div>
            <div>
              <dt>Source constraints</dt>
              <dd>{margins.satisfied ? 'Pass' : 'Fail'}</dd>
            </div>
          </dl>
        </div>
        <div className="parameter-bounds-panel">
          <div className="panel-heading">
            <div>
              <p className="section-index">Numerical controls</p>
              <h2>Stress the reconstruction</h2>
            </div>
            <span className={`calibration-state ${invalidCount === 0 ? 'complete' : 'error'}`}>
              <i aria-hidden="true" />
              {invalidCount === 0 ? 'Valid' : 'Invalid nodes'}
            </span>
          </div>
          <ParameterControl
            id="local-cal-maturity"
            label="Displayed maturity"
            symbol="T"
            value={maturity}
            min={0.5}
            max={3}
            step={0.25}
            suffix="yr"
            explanation="Interior slice used for centered time differentiation."
            onChange={setMaturity}
          />
          <ParameterControl
            id="local-cal-noise"
            label="Quote perturbation"
            symbol="ε"
            value={settings.quoteNoiseBasisPoints}
            min={0}
            max={40}
            step={2}
            suffix="bp vol"
            explanation="Deterministic node-level implied-volatility noise; second derivatives amplify it."
            onChange={(v) => update('quoteNoiseBasisPoints', v)}
          />
          <ParameterControl
            id="local-cal-k-step"
            label="Log-strike stencil"
            symbol="hk"
            value={settings.logMoneynessStep}
            min={1}
            max={6}
            step={0.5}
            scale={100}
            explanation="Centered differentiation step in forward log-moneyness."
            onChange={(v) => update('logMoneynessStep', v)}
          />
          <ParameterControl
            id="local-cal-t-step"
            label="Time stencil"
            symbol="hT"
            value={settings.timeStep}
            min={1}
            max={10}
            step={0.5}
            scale={100}
            suffix="yr"
            explanation="Centered differentiation step in maturity."
            onChange={(v) => update('timeStep', v)}
          />
          <dl className="calibration-diagnostics" data-testid="local-vol-reconstruction-result">
            <div>
              <dt>RMSE</dt>
              <dd data-testid="local-vol-rmse">{(rmse * 100).toFixed(4)} vol pt</dd>
            </div>
            <div>
              <dt>Maximum error</dt>
              <dd>{(maximumError * 100).toFixed(4)} vol pt</dd>
            </div>
            <div>
              <dt>Valid nodes</dt>
              <dd>
                {valid.length}/{slice.length}
              </dd>
            </div>
            <div>
              <dt>Rejected nodes</dt>
              <dd>{invalidCount}</dd>
            </div>
            <div>
              <dt>Power-law margin</dt>
              <dd>{margins.powerLawMargin.toFixed(3)}</dd>
            </div>
            <div>
              <dt>Wing margin</dt>
              <dd>{margins.wingMargin.toFixed(3)}</dd>
            </div>
          </dl>
        </div>
      </section>
      <section className="heston-fit-section local-vol-fit-section">
        <div className="surface-heading heston-fit-heading">
          <div>
            <p className="section-index">Reconstruction diagnostics</p>
            <h2>Separate the quote surface from its derivatives</h2>
          </div>
          <p>
            The analytic source remains visible. Gaps or rejected points belong to the
            reconstruction, not to a volatility clamp.
          </p>
        </div>
        <div className="heston-fit-grid local-vol-fit-grid">
          <figure className="surface-slice-chart">
            <div className="chart-heading">
              <div>
                <h3>Source versus reconstructed local volatility</h3>
                <p>Instantaneous volatility across normalized strike.</p>
              </div>
              <span className="fit-stage">Live reconstruction</span>
            </div>
            <div className="surface-chart-canvas" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={slice}>
                  <CartesianGrid
                    stroke="var(--chart-grid)"
                    vertical={false}
                    strokeDasharray="2 5"
                  />
                  <XAxis
                    dataKey="strike"
                    tickFormatter={(v) => Number(v).toFixed(0)}
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
                    contentStyle={tooltipStyle}
                  />
                  <Line
                    name="Analytic source"
                    dataKey="sourceLocalVolatility"
                    stroke="var(--warm)"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    name="Reconstructed"
                    dataKey="reconstructedLocalVolatility"
                    stroke="var(--accent)"
                    strokeWidth={2.2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ChartAccessibleSummary
              title="Source versus reconstructed local volatility"
              data={slice}
              xKey="strike"
              xLabel="Normalized strike"
              xFormat={(value) => value.toFixed(1)}
              series={[
                {
                  key: 'sourceLocalVolatility',
                  label: 'Analytic source',
                  format: (value) => `${(value * 100).toFixed(3)}%`,
                },
                {
                  key: 'reconstructedLocalVolatility',
                  label: 'Reconstructed volatility',
                  format: (value) => `${(value * 100).toFixed(3)}%`,
                },
              ]}
            />
            <figcaption>
              Dupire local volatility from analytic SSVI and sparse interpolated quotes.
            </figcaption>
          </figure>
          <figure className="surface-slice-chart">
            <div className="chart-heading">
              <div>
                <h3>Observed implied-volatility slices</h3>
                <p>Three maturities from the same quote grid.</p>
              </div>
              <span className="fit-stage">
                {settings.quoteNoiseBasisPoints.toFixed(0)} bp noise
              </span>
            </div>
            <div className="surface-chart-canvas" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={merged}>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis
                    dataKey="strike"
                    tickFormatter={(v) => Number(v).toFixed(0)}
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
                    contentStyle={tooltipStyle}
                  />
                  <Line
                    name="0.5y"
                    dataKey="vol05"
                    stroke="var(--warm)"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    name="1y"
                    dataKey="vol1"
                    stroke="var(--accent)"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    name="2y"
                    dataKey="vol2"
                    stroke="var(--quiet)"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ChartAccessibleSummary
              title="Observed implied-volatility slices"
              data={merged}
              xKey="strike"
              xLabel="Strike"
              xFormat={(value) => value.toFixed(1)}
              series={[
                {
                  key: 'vol05',
                  label: '0.5 year volatility',
                  format: (value) => `${(value * 100).toFixed(3)}%`,
                },
                {
                  key: 'vol1',
                  label: '1 year volatility',
                  format: (value) => `${(value * 100).toFixed(3)}%`,
                },
                {
                  key: 'vol2',
                  label: '2 year volatility',
                  format: (value) => `${(value * 100).toFixed(3)}%`,
                },
              ]}
            />
            <figcaption>Sparse synthetic market quotes before differentiation.</figcaption>
          </figure>
        </div>
        <p className="synthetic-note">
          <span aria-hidden="true">◆</span> Deterministic synthetic data. Passing source-surface
          constraints does not guarantee that noisy interpolated derivatives stay valid.
        </p>
      </section>
    </main>
  );
}
