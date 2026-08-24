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
import { buildSabrSmile, buildSabrTermSlices, defaultSabrParameters } from '../features/sabrLab';
import { ChartAccessibleSummary } from './ChartAccessibleSummary';

const tooltipStyle = {
  border: '1px solid var(--strong-line)',
  borderRadius: 2,
  background: 'var(--chart-surface)',
  color: 'var(--ink)',
  fontSize: 13,
};

export function SabrLearnVisuals() {
  const [beta, setBeta] = useState(0.5);
  const [rho, setRho] = useState(-0.3);
  const parameters = useMemo(() => ({ ...defaultSabrParameters, beta, rho }), [beta, rho]);
  const smile = useMemo(() => buildSabrSmile(0.03, 0.96, 2, parameters), [parameters]);
  const term = useMemo(() => buildSabrTermSlices(0.03, parameters), [parameters]);
  return (
    <div className="learning-visuals sabr-learning-visuals">
      <div className="visual-control-row sabr-visual-controls">
        <div>
          <span className="equation-label">Elasticity β</span>
          <strong>{beta.toFixed(1)}</strong>
        </div>
        <div className="visual-choice-group" aria-label="Choose beta">
          {[0, 0.5, 1].map((value) => (
            <button
              key={value}
              type="button"
              className={beta === value ? 'active' : ''}
              aria-pressed={beta === value}
              onClick={() => setBeta(value)}
            >
              {value.toFixed(1)}
            </button>
          ))}
        </div>
        <div>
          <span className="equation-label">Correlation ρ</span>
          <strong>{rho.toFixed(1)}</strong>
        </div>
        <div className="visual-choice-group" aria-label="Choose rho">
          {[-0.6, 0, 0.6].map((value) => (
            <button
              key={value}
              type="button"
              className={rho === value ? 'active' : ''}
              aria-pressed={rho === value}
              onClick={() => setRho(value)}
            >
              {value.toFixed(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="learning-chart-grid">
        <figure className="learning-chart learning-chart-wide">
          <div className="learning-chart-copy">
            <p className="section-index">Strike smile</p>
            <h3>ρ tilts; ν bends</h3>
            <p>
              Negative correlation lifts low strikes relative to high strikes. β changes the
              backbone because αFᵝ scales differently with the forward.
            </p>
          </div>
          <div className="learning-chart-canvas" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={smile} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="2 5" />
                <XAxis
                  dataKey="strikePercent"
                  tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                  tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                  width={46}
                  tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v) => [`${(Number(v) * 100).toFixed(2)}%`, 'SABR σ']}
                  labelFormatter={(v) => `Strike ${Number(v).toFixed(2)}%`}
                  contentStyle={tooltipStyle}
                />
                <ReferenceLine x={3} stroke="var(--warm)" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="impliedVolatility"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ChartAccessibleSummary
            title="SABR strike smile"
            data={smile}
            xKey="strikePercent"
            xLabel="Strike"
            series={[
              {
                key: 'impliedVolatility',
                label: 'SABR volatility',
                format: (value) => `${(value * 100).toFixed(2)}%`,
              },
            ]}
            showTable={false}
          />
          <figcaption>Two-year Black implied volatility for a 3% forward.</figcaption>
        </figure>
        <figure className="learning-chart">
          <div className="learning-chart-copy">
            <p className="section-index">Across maturity</p>
            <h3>One parameter set is not a full calibration</h3>
            <p>
              The approximation itself changes with T. Real surfaces usually fit expiry slices
              separately.
            </p>
          </div>
          <div className="learning-chart-canvas compact" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={term}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="2 5" />
                <XAxis
                  dataKey="maturity"
                  tickFormatter={(v) => `${v}y`}
                  tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
                />
                <YAxis
                  tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                  width={42}
                  tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v, n) => [`${(Number(v) * 100).toFixed(2)}%`, n]}
                  labelFormatter={(v) => `${v} years`}
                  contentStyle={tooltipStyle}
                />
                <Line
                  name="75% F"
                  dataKey="lowStrikeVolatility"
                  stroke="var(--warm)"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  name="ATM"
                  dataKey="atmVolatility"
                  stroke="var(--accent)"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  name="125% F"
                  dataKey="highStrikeVolatility"
                  stroke="var(--quiet)"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ChartAccessibleSummary
            title="SABR moneyness slices across maturity"
            data={term}
            xKey="maturity"
            xLabel="Maturity"
            series={[
              {
                key: 'lowStrikeVolatility',
                label: '75% forward volatility',
                format: (value) => `${(value * 100).toFixed(2)}%`,
              },
              {
                key: 'atmVolatility',
                label: 'ATM volatility',
                format: (value) => `${(value * 100).toFixed(2)}%`,
              },
              {
                key: 'highStrikeVolatility',
                label: '125% forward volatility',
                format: (value) => `${(value * 100).toFixed(2)}%`,
              },
            ]}
            showTable={false}
          />
          <figcaption>Selected moneyness slices across maturity.</figcaption>
        </figure>
      </div>
    </div>
  );
}
