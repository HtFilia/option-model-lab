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
import { blackScholesContent as content } from '../content/blackScholes';
import { europeanOptionPayoff, priceBlackScholes } from '../quant/blackScholes';

const volatilityChoices = [0.1, 0.2, 0.4] as const;

const chartTheme = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  tick: 'var(--chart-tick)',
  accent: 'var(--accent)',
  warm: 'var(--warm)',
  quiet: 'var(--quiet)',
  surface: 'var(--chart-surface)',
  text: 'var(--ink)',
} as const;

const tooltipStyle = {
  border: '1px solid var(--strong-line)',
  borderRadius: 2,
  background: chartTheme.surface,
  color: chartTheme.text,
  fontSize: 13,
};

export function LearnVisuals() {
  const [volatility, setVolatility] = useState<number>(0.2);

  const priceData = useMemo(
    () =>
      Array.from({ length: 61 }, (_, index) => 40 + index * 2).map((spot) => {
        const result = priceBlackScholes({
          option: { type: 'call', strike: 100, timeToMaturity: 1 },
          market: { spot, riskFreeRate: 0.05, dividendYield: 0.02 },
          volatility,
        });
        return {
          spot,
          payoff: europeanOptionPayoff('call', spot, 100),
          price: result.price,
          delta: result.delta,
        };
      }),
    [volatility],
  );

  return (
    <div className="learning-visuals">
      <div className="visual-control-row">
        <div>
          <span className="equation-label">Assumed volatility</span>
          <strong>{(volatility * 100).toFixed(0)}%</strong>
        </div>
        <div className="visual-choice-group" aria-label="Choose an illustrative volatility">
          {volatilityChoices.map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={volatility === choice}
              className={volatility === choice ? 'active' : ''}
              onClick={() => setVolatility(choice)}
            >
              {choice * 100}%
            </button>
          ))}
        </div>
      </div>

      <div className="learning-chart-grid">
        <figure className="learning-chart learning-chart-wide">
          <div className="learning-chart-copy">
            <p className="section-index">Time value</p>
            <h3>Uncertainty lifts value above payoff</h3>
            <p>
              The kink is the payoff at expiry. Before expiry, possible future moves make the call
              valuable even below the strike—and more volatility widens that gap.
            </p>
          </div>
          <div className="visual-legend" aria-hidden="true">
            <span className="legend-accent">Value today</span>
            <span className="legend-quiet">Payoff at expiry</span>
            <span className="legend-strike">Strike 100</span>
          </div>
          <div className="learning-chart-canvas" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke={chartTheme.grid} vertical={false} strokeDasharray="2 5" />
                <XAxis
                  dataKey="spot"
                  stroke={chartTheme.axis}
                  tick={{ fontSize: 11, fill: chartTheme.tick }}
                  tickLine={false}
                  axisLine={{ stroke: chartTheme.grid }}
                />
                <YAxis
                  stroke={chartTheme.axis}
                  tick={{ fontSize: 11, fill: chartTheme.tick }}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                />
                <Tooltip
                  formatter={(value, name) => [Number(value).toFixed(2), name]}
                  labelFormatter={(value) => `Spot ${Number(value).toFixed(0)}`}
                  contentStyle={tooltipStyle}
                />
                <ReferenceLine x={100} stroke={chartTheme.warm} strokeDasharray="4 4" />
                <Line
                  name="Value today"
                  type="monotone"
                  dataKey="price"
                  stroke={chartTheme.accent}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  name="Payoff at expiry"
                  type="linear"
                  dataKey="payoff"
                  stroke={chartTheme.quiet}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <figcaption>
            Call value today and payoff at expiry across spot prices from 40 to 160, with strike 100
            and the selected constant volatility.
          </figcaption>
        </figure>

        <figure className="learning-chart">
          <div className="learning-chart-copy">
            <p className="section-index">Dynamic hedge</p>
            <h3>Delta is a changing hedge</h3>
            <p>
              A far out-of-the-money call barely follows spot. As exercise becomes likely, delta
              moves toward one share.
            </p>
          </div>
          <div className="learning-chart-canvas compact" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData} margin={{ top: 8, right: 10, bottom: 4, left: 0 }}>
                <CartesianGrid stroke={chartTheme.grid} vertical={false} strokeDasharray="2 5" />
                <XAxis
                  dataKey="spot"
                  stroke={chartTheme.axis}
                  tick={{ fontSize: 11, fill: chartTheme.tick }}
                  tickLine={false}
                  axisLine={{ stroke: chartTheme.grid }}
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 0.5, 1]}
                  stroke={chartTheme.axis}
                  tick={{ fontSize: 11, fill: chartTheme.tick }}
                  tickLine={false}
                  axisLine={false}
                  width={34}
                />
                <Tooltip
                  formatter={(value) => [Number(value).toFixed(3), 'Delta']}
                  labelFormatter={(value) => `Spot ${Number(value).toFixed(0)}`}
                  contentStyle={tooltipStyle}
                />
                <ReferenceLine x={100} stroke={chartTheme.warm} strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="delta"
                  stroke={chartTheme.accent}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <figcaption>
            Analytic call delta across spot, ranging from approximately zero to one share.
          </figcaption>
        </figure>

        <figure className="learning-chart">
          <div className="learning-chart-copy">
            <p className="section-index">The visible failure</p>
            <h3>One σ is flat; markets are not</h3>
            <p>
              Black–Scholes uses one volatility across strikes. This illustrative equity-like market
              skew asks for a different implied volatility at each strike.
            </p>
          </div>
          <div className="visual-legend" aria-hidden="true">
            <span className="legend-accent">Synthetic market IV</span>
            <span className="legend-quiet">Constant model σ</span>
          </div>
          <div className="learning-chart-canvas compact" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={content.visualIntuition.smileScenario}
                margin={{ top: 8, right: 10, bottom: 4, left: 0 }}
              >
                <CartesianGrid stroke={chartTheme.grid} vertical={false} strokeDasharray="2 5" />
                <XAxis
                  dataKey="strike"
                  stroke={chartTheme.axis}
                  tick={{ fontSize: 11, fill: chartTheme.tick }}
                  tickLine={false}
                  axisLine={{ stroke: chartTheme.grid }}
                />
                <YAxis
                  domain={[15, 36]}
                  tickFormatter={(value) => `${value}%`}
                  stroke={chartTheme.axis}
                  tick={{ fontSize: 11, fill: chartTheme.tick }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
                  labelFormatter={(value) => `Strike ${Number(value).toFixed(0)}`}
                  contentStyle={tooltipStyle}
                />
                <ReferenceLine x={100} stroke={chartTheme.warm} strokeDasharray="4 4" />
                <Line
                  name="Constant model σ"
                  type="linear"
                  dataKey="modelVolatility"
                  stroke={chartTheme.quiet}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  name="Synthetic market IV"
                  type="monotone"
                  dataKey="syntheticMarketVolatility"
                  stroke={chartTheme.accent}
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: chartTheme.accent }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <figcaption>
            Synthetic educational implied-volatility quotes compared with a constant 20 percent
            Black–Scholes volatility. This is not live market data.
          </figcaption>
        </figure>
      </div>

      <p className="synthetic-note">
        <span aria-hidden="true">◆</span> The skew series is synthetic and illustrative. Price and
        delta curves are computed by the tested Black–Scholes quant engine.
      </p>
    </div>
  );
}
