import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildLocalVolSlice, defaultLocalVolSurfaceParameters } from '../features/localVolLab';
import { ChartAccessibleSummary } from './ChartAccessibleSummary';

const tooltipStyle = {
  border: '1px solid var(--strong-line)',
  borderRadius: 2,
  background: 'var(--chart-surface)',
  color: 'var(--ink)',
  fontSize: 13,
};
export function LocalVolLearnVisuals() {
  const [rho, setRho] = useState(-0.4);
  const [eta, setEta] = useState(1.1);
  const parameters = useMemo(() => ({ ...defaultLocalVolSurfaceParameters, rho, eta }), [rho, eta]);
  const slice = useMemo(() => buildLocalVolSlice(parameters, 1), [parameters]);
  return (
    <div className="learning-visuals local-vol-learning-visuals">
      <div className="visual-control-row sabr-visual-controls">
        <div>
          <span className="equation-label">Surface skew ρ</span>
          <strong>{rho.toFixed(1)}</strong>
        </div>
        <div className="visual-choice-group" aria-label="Choose local-vol surface skew">
          {[-0.7, -0.4, 0].map((v) => (
            <button
              key={v}
              type="button"
              className={rho === v ? 'active' : ''}
              aria-pressed={rho === v}
              onClick={() => setRho(v)}
            >
              {v.toFixed(1)}
            </button>
          ))}
        </div>
        <div>
          <span className="equation-label">Curvature η</span>
          <strong>{eta.toFixed(1)}</strong>
        </div>
        <div className="visual-choice-group" aria-label="Choose local-vol surface curvature">
          {[0, 0.7, 1.1].map((v) => (
            <button
              key={v}
              type="button"
              className={eta === v ? 'active' : ''}
              aria-pressed={eta === v}
              onClick={() => setEta(v)}
            >
              {v.toFixed(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="learning-chart-grid">
        <figure className="learning-chart learning-chart-wide">
          <div className="learning-chart-copy">
            <p className="section-index">One-year slice</p>
            <h3>Implied is not local</h3>
            <p>
              The implied smile quotes whole option lifetimes. Dupire transforms its strike and time
              derivatives into the instantaneous volatility used by the diffusion.
            </p>
          </div>
          <div className="learning-chart-canvas" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={slice}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="2 5" />
                <XAxis
                  dataKey="strike"
                  tickFormatter={(v) => Number(v).toFixed(0)}
                  tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                />
                <YAxis
                  tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                  width={46}
                  tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v, n) => [`${(Number(v) * 100).toFixed(2)}%`, n]}
                  labelFormatter={(v) => `Strike ${Number(v).toFixed(1)}`}
                  contentStyle={tooltipStyle}
                />
                <ReferenceLine x={100} stroke="var(--warm)" strokeDasharray="4 4" />
                <Line
                  name="Implied σ"
                  dataKey="impliedVolatility"
                  stroke="var(--warm)"
                  strokeWidth={2.3}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  name="Local σ"
                  dataKey="sourceLocalVolatility"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ChartAccessibleSummary
            title="Implied and local volatility at one year"
            data={slice}
            xKey="strike"
            xLabel="Normalized strike"
            series={[
              {
                key: 'impliedVolatility',
                label: 'Implied volatility',
                format: (value) => `${(value * 100).toFixed(2)}%`,
              },
              {
                key: 'sourceLocalVolatility',
                label: 'Local volatility',
                format: (value) => `${(value * 100).toFixed(2)}%`,
              },
            ]}
            showTable={false}
          />
          <figcaption>Analytic SSVI implied and Dupire local volatility at one year.</figcaption>
        </figure>
      </div>
    </div>
  );
}
