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
import {
  buildHestonSmile,
  defaultHestonParameters,
  simulateHestonVolatilityPaths,
} from '../features/hestonLab';

const correlations = [-0.8, -0.4, 0] as const;
const market = { spot: 100, riskFreeRate: 0.03, dividendYield: 0.01 };
const tooltipStyle = {
  border: '1px solid var(--strong-line)',
  borderRadius: 2,
  background: 'var(--chart-surface)',
  color: 'var(--ink)',
  fontSize: 13,
};

export function HestonLearnVisuals() {
  const [correlation, setCorrelation] = useState<number>(-0.8);
  const parameters = useMemo(() => ({ ...defaultHestonParameters, correlation }), [correlation]);
  const smile = useMemo(() => buildHestonSmile(market, parameters, 1), [parameters]);
  const paths = useMemo(
    () => simulateHestonVolatilityPaths(defaultHestonParameters, 2, 80, 20_240_127),
    [],
  );

  return (
    <div className="learning-visuals heston-learning-visuals">
      <div className="visual-control-row">
        <div>
          <span className="equation-label">Spot/variance correlation ρ</span>
          <strong>{correlation.toFixed(1)}</strong>
        </div>
        <div className="visual-choice-group" aria-label="Choose an illustrative correlation">
          {correlations.map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={correlation === choice}
              className={correlation === choice ? 'active' : ''}
              onClick={() => setCorrelation(choice)}
            >
              {choice.toFixed(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="learning-chart-grid">
        <figure className="learning-chart learning-chart-wide">
          <div className="learning-chart-copy">
            <p className="section-index">Leverage effect</p>
            <h3>Correlation tilts the implied-volatility smile</h3>
            <p>
              Negative correlation makes falling spot and rising variance arrive together. Lower
              strikes become relatively expensive, producing the equity-style skew that one flat σ
              cannot create.
            </p>
          </div>
          <div className="visual-legend" aria-hidden="true">
            <span className="legend-accent">Heston implied σ</span>
            <span className="legend-quiet">Flat √v₀</span>
            <span className="legend-strike">Spot 100</span>
          </div>
          <div className="learning-chart-canvas" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={smile} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="2 5" />
                <XAxis
                  dataKey="strike"
                  stroke="var(--chart-axis)"
                  tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--chart-grid)' }}
                  tickFormatter={(value) => Number(value).toFixed(0)}
                />
                <YAxis
                  stroke="var(--chart-axis)"
                  tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                  tickFormatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
                />
                <Tooltip
                  formatter={(value, name) => [`${(Number(value) * 100).toFixed(2)}%`, name]}
                  labelFormatter={(value) => `Strike ${Number(value).toFixed(0)}`}
                  contentStyle={tooltipStyle}
                />
                <ReferenceLine x={100} stroke="var(--warm)" strokeDasharray="4 4" />
                <Line
                  name="Heston implied σ"
                  type="monotone"
                  dataKey="hestonVolatility"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  name="Flat initial σ"
                  type="linear"
                  dataKey="flatVolatility"
                  stroke="var(--quiet)"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <figcaption>
            One-year call implied volatilities under Heston as correlation changes, compared with
            the flat initial volatility √v₀.
          </figcaption>
        </figure>

        <figure className="learning-chart learning-chart-wide variance-path-chart">
          <div className="learning-chart-copy">
            <p className="section-index">Stochastic state</p>
            <h3>Variance takes many paths but remembers θ</h3>
            <p>
              Each line uses the same parameters and a deterministic random seed. Shocks separate
              the paths; mean reversion continually pulls them toward long-run volatility √θ.
            </p>
          </div>
          <div className="learning-chart-canvas" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={paths} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="2 5" />
                <XAxis
                  dataKey="time"
                  stroke="var(--chart-axis)"
                  tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--chart-grid)' }}
                  tickFormatter={(value) => `${Number(value).toFixed(1)}y`}
                />
                <YAxis
                  stroke="var(--chart-axis)"
                  tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                  tickFormatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${(Number(value) * 100).toFixed(2)}%`,
                    String(name).replace('path', 'Path '),
                  ]}
                  labelFormatter={(value) => `Time ${Number(value).toFixed(2)} years`}
                  contentStyle={tooltipStyle}
                />
                <ReferenceLine
                  y={Math.sqrt(defaultHestonParameters.longRunVariance)}
                  stroke="var(--warm)"
                  strokeDasharray="4 4"
                />
                {(['path1', 'path2', 'path3', 'path4'] as const).map((path, index) => (
                  <Line
                    key={path}
                    type="monotone"
                    dataKey={path}
                    stroke={index === 0 ? 'var(--accent)' : 'var(--path-secondary)'}
                    strokeOpacity={1 - index * 0.16}
                    strokeWidth={index === 0 ? 2.25 : 1.4}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <figcaption>
            Four seeded full-truncation Euler illustrations of instantaneous volatility. The dashed
            line is √θ. Pricing uses Fourier inversion, not these simulated paths.
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
