import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
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
  buildJumpCountProbabilities,
  buildMertonSmile,
  buildMertonTerminalDensity,
  defaultMertonJumpParameters,
} from '../features/mertonJumpLab';

const intensities = [0, 0.8, 2] as const;
const market = { spot: 100, riskFreeRate: 0.03, dividendYield: 0.01 };
const maturity = 0.25;
const tooltipStyle = {
  border: '1px solid var(--strong-line)',
  borderRadius: 2,
  background: 'var(--chart-surface)',
  color: 'var(--ink)',
  fontSize: 13,
};

export function MertonLearnVisuals() {
  const [intensity, setIntensity] = useState<number>(0.8);
  const parameters = useMemo(
    () => ({ ...defaultMertonJumpParameters, jumpIntensity: intensity }),
    [intensity],
  );
  const smile = useMemo(() => buildMertonSmile(market, parameters, maturity), [parameters]);
  const density = useMemo(
    () => buildMertonTerminalDensity(market, parameters, maturity),
    [parameters],
  );
  const jumpCounts = useMemo(() => buildJumpCountProbabilities(intensity, maturity), [intensity]);

  return (
    <div className="learning-visuals merton-learning-visuals">
      <div className="visual-control-row">
        <div>
          <span className="equation-label">Jump intensity λ</span>
          <strong>{intensity.toFixed(1)} / year</strong>
        </div>
        <div className="visual-choice-group" aria-label="Choose an illustrative jump intensity">
          {intensities.map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={intensity === choice}
              className={intensity === choice ? 'active' : ''}
              onClick={() => setIntensity(choice)}
            >
              {choice.toFixed(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="learning-chart-grid">
        <figure className="learning-chart learning-chart-wide">
          <div className="learning-chart-copy">
            <p className="section-index">Short-dated smile</p>
            <h3>Jumps move probability into the wings</h3>
            <p>
              At λ = 0, only the flat diffusion remains. Increasing jump frequency makes distant
              strikes more valuable and raises their Black–Scholes implied volatilities.
            </p>
          </div>
          <div className="visual-legend" aria-hidden="true">
            <span className="legend-accent">Merton implied σ</span>
            <span className="legend-quiet">Diffusion σ</span>
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
                  name="Merton implied σ"
                  type="monotone"
                  dataKey="mertonImpliedVolatility"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  name="Diffusion σ"
                  type="linear"
                  dataKey="diffusionVolatility"
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
            Three-month implied volatility by strike under Merton jump diffusion.
          </figcaption>
        </figure>

        <figure className="learning-chart">
          <div className="learning-chart-copy">
            <p className="section-index">Terminal tails</p>
            <h3>The density is a mixture, not one bell</h3>
            <p>Negative average jumps add downside mass while jump dispersion widens both tails.</p>
          </div>
          <div className="learning-chart-canvas compact" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={density} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="2 5" />
                <XAxis
                  dataKey="spot"
                  tickFormatter={(value) => Number(value).toFixed(0)}
                  stroke="var(--chart-axis)"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--chart-grid)' }}
                  tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
                />
                <YAxis hide />
                <ReferenceLine x={100} stroke="var(--warm)" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="mertonDensity"
                  stroke="var(--accent)"
                  strokeWidth={2.3}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="diffusionDensity"
                  stroke="var(--quiet)"
                  strokeWidth={1.4}
                  strokeDasharray="5 5"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <figcaption>Merton and diffusion-only terminal spot densities.</figcaption>
        </figure>

        <figure className="learning-chart">
          <div className="learning-chart-copy">
            <p className="section-index">Event count</p>
            <h3>Most intervals still have no jump</h3>
            <p>The last bar includes four or more jumps. λT is the expected jump count.</p>
          </div>
          <div className="learning-chart-canvas compact" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jumpCounts} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="2 5" />
                <XAxis
                  dataKey="jumps"
                  tickFormatter={(value) => (Number(value) === 4 ? '4+' : String(value))}
                  stroke="var(--chart-axis)"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--chart-grid)' }}
                  tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
                />
                <YAxis
                  tickFormatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
                  stroke="var(--chart-axis)"
                  tickLine={false}
                  axisLine={false}
                  width={38}
                  tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
                />
                <Tooltip
                  formatter={(value) => [`${(Number(value) * 100).toFixed(2)}%`, 'Probability']}
                  labelFormatter={(value) => `${value === 4 ? '4+' : value} jumps`}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="probability" fill="var(--accent)" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <figcaption>Poisson jump-count probabilities over three months.</figcaption>
        </figure>
      </div>
    </div>
  );
}
