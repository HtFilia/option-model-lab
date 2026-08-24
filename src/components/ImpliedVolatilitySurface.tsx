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
  buildSyntheticImpliedVolatilitySurface,
  buildSyntheticSmileSlice,
  defaultSurfaceShape,
  surfaceMaturities,
  surfaceStrikeMultipliers,
  type ImpliedVolatilitySurfacePoint,
  type SyntheticSurfaceShape,
} from '../features/blackScholesSurface';
import type { MarketState, OptionType } from '../quant/blackScholes';
import { ParameterControl } from './LabControls';

interface ImpliedVolatilitySurfaceProps {
  type: OptionType;
  market: MarketState;
  onSelectQuote: (point: ImpliedVolatilitySurfacePoint) => void;
}

interface SurfaceState {
  points: ImpliedVolatilitySurfacePoint[];
  slice: ImpliedVolatilitySurfacePoint[];
  error: string | null;
}

const chartTooltipStyle = {
  border: '1px solid var(--strong-line)',
  borderRadius: 2,
  background: 'var(--chart-surface)',
  color: 'var(--ink)',
  fontSize: 13,
};

export function ImpliedVolatilitySurface({
  type,
  market,
  onSelectQuote,
}: ImpliedVolatilitySurfaceProps) {
  const [shape, setShape] = useState<SyntheticSurfaceShape>(defaultSurfaceShape);
  const [sliceMaturity, setSliceMaturity] = useState(1);

  const surfaceState = useMemo<SurfaceState>(() => {
    try {
      return {
        points: buildSyntheticImpliedVolatilitySurface(type, market, shape),
        slice: buildSyntheticSmileSlice(type, market, shape, sliceMaturity),
        error: null,
      };
    } catch (error) {
      return {
        points: [],
        slice: [],
        error: error instanceof Error ? error.message : 'The surface could not be evaluated.',
      };
    }
  }, [market, shape, sliceMaturity, type]);

  const strikes = surfaceStrikeMultipliers.map((multiplier) =>
    Number((market.spot * multiplier).toFixed(4)),
  );
  const finiteVolatilities = surfaceState.points
    .map((point) => point.impliedVolatility)
    .filter(Number.isFinite);
  const minimumVolatility = Math.min(...finiteVolatilities);
  const maximumVolatility = Math.max(...finiteVolatilities);
  const volatilityRange = maximumVolatility - minimumVolatility;

  function updateShape<Key extends keyof SyntheticSurfaceShape>(
    key: Key,
    value: SyntheticSurfaceShape[Key],
  ) {
    setShape((current) => ({ ...current, [key]: value }));
  }

  function levelClass(volatility: number): string {
    if (!Number.isFinite(volatility) || !Number.isFinite(volatilityRange) || volatilityRange <= 0) {
      return 'level-2';
    }
    return `level-${Math.round(((volatility - minimumVolatility) / volatilityRange) * 4)}`;
  }

  return (
    <section className="surface-lab" aria-labelledby="surface-heading" data-testid="iv-surface">
      <div className="surface-heading">
        <div>
          <p className="section-index">Many quotes · many inversions</p>
          <h2 id="surface-heading">Implied volatility across K and T</h2>
        </div>
        <p>
          A single quote produces one implied volatility. This labelled synthetic dataset generates
          a price at every strike and maturity, then runs the same bracketed inversion quote by
          quote to reveal a surface.
        </p>
      </div>

      <div className="surface-workspace">
        <div className="surface-controls">
          <div className="panel-heading">
            <div>
              <p className="section-index">Synthetic market shape</p>
              <h3>Move the surface</h3>
            </div>
            <button
              className="quiet-button"
              type="button"
              onClick={() => {
                setShape(defaultSurfaceShape);
                setSliceMaturity(1);
              }}
            >
              Reset shape
            </button>
          </div>
          <p className="surface-control-note">
            These are educational scenario controls—not extra Black–Scholes parameters.
            Black–Scholes still inverts one σ per quote.
          </p>
          <ParameterControl
            id="surface-level"
            label="ATM level"
            symbol="σ₀"
            value={shape.baseVolatility}
            min={12}
            max={35}
            step={1}
            scale={100}
            suffix="%"
            explanation="Raises or lowers the whole implied-volatility surface."
            onChange={(value) => updateShape('baseVolatility', value)}
          />
          <ParameterControl
            id="surface-skew"
            label="Strike skew"
            symbol="β₁"
            value={shape.skew}
            min={-30}
            max={5}
            step={1}
            scale={100}
            suffix="%"
            explanation="Tilts the smile across strike; negative values lift lower strikes."
            onChange={(value) => updateShape('skew', value)}
          />
          <ParameterControl
            id="surface-curvature"
            label="Smile curvature"
            symbol="β₂"
            value={shape.curvature}
            min={0}
            max={50}
            step={2.5}
            scale={100}
            suffix="%"
            explanation="Bends both wings upward relative to at-the-money volatility."
            onChange={(value) => updateShape('curvature', value)}
          />
          <ParameterControl
            id="surface-term"
            label="Term slope"
            symbol="βT"
            value={shape.termSlope}
            min={-5}
            max={5}
            step={0.5}
            scale={100}
            suffix="%"
            explanation="Tilts volatility from short to long maturities."
            onChange={(value) => updateShape('termSlope', value)}
          />
          <ParameterControl
            id="surface-slice"
            label="Curve maturity"
            symbol="T"
            value={sliceMaturity}
            min={0.25}
            max={3}
            step={0.25}
            suffix="yr"
            explanation="Selects the maturity slice drawn beside the full surface."
            onChange={setSliceMaturity}
          />
        </div>

        <div className="surface-visuals">
          {surfaceState.error ? (
            <div className="educational-error" role="alert">
              <strong>The synthetic surface cannot be evaluated.</strong>
              <p>{surfaceState.error}</p>
            </div>
          ) : (
            <>
              <figure className="surface-slice-chart">
                <div className="chart-heading">
                  <div>
                    <h3>{sliceMaturity.toFixed(2)} year smile slice</h3>
                    <p>Move any shape slider to see its effect on the strike curve immediately.</p>
                  </div>
                  <span className="chart-legend">
                    <i aria-hidden="true" /> Implied σ
                  </span>
                </div>
                <div className="surface-chart-canvas" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={surfaceState.slice}
                      margin={{ top: 10, right: 14, bottom: 4, left: 8 }}
                    >
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
                        tickFormatter={(value) => Number(value).toFixed(0)}
                      />
                      <YAxis
                        stroke="var(--chart-axis)"
                        tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
                        width={48}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${(Number(value) * 100).toFixed(2)}%`,
                          'Implied volatility',
                        ]}
                        labelFormatter={(value) => `Strike ${Number(value).toFixed(2)}`}
                        contentStyle={chartTooltipStyle}
                      />
                      <ReferenceLine x={market.spot} stroke="var(--warm)" strokeDasharray="4 4" />
                      <ReferenceLine
                        y={shape.baseVolatility}
                        stroke="var(--quiet)"
                        strokeDasharray="3 5"
                      />
                      <Line
                        type="monotone"
                        dataKey="impliedVolatility"
                        stroke="var(--accent)"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 3, fill: 'var(--accent)' }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <figcaption>
                  Implied volatility against strike at {sliceMaturity.toFixed(2)} years. The
                  vertical reference is current spot; the horizontal reference is the ATM level
                  control.
                </figcaption>
              </figure>

              <div className="surface-table-wrap">
                <div className="surface-table-heading">
                  <div>
                    <h3>Full implied-volatility surface</h3>
                    <p>
                      Rows are maturity T; columns are strike K. Select a cell to load its quote.
                    </p>
                  </div>
                  <div className="surface-scale" aria-hidden="true">
                    <span>lower σ</span>
                    <i />
                    <span>higher σ</span>
                  </div>
                </div>
                <div className="surface-table-scroll">
                  <table className="vol-surface-table">
                    <caption>
                      Synthetic implied-volatility surface. Select a cell to load its contract and
                      market price into the single-quote inversion above.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">T \ K</th>
                        {strikes.map((strike) => (
                          <th scope="col" key={strike}>
                            {strike.toFixed(0)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {surfaceMaturities.map((timeToMaturity) => (
                        <tr key={timeToMaturity}>
                          <th scope="row">{timeToMaturity.toFixed(2)}y</th>
                          {surfaceState.points
                            .filter((point) => point.timeToMaturity === timeToMaturity)
                            .map((point) => (
                              <td key={point.strike}>
                                <button
                                  type="button"
                                  className={`surface-cell ${levelClass(point.impliedVolatility)}`}
                                  aria-label={`Strike ${point.strike.toFixed(2)}, maturity ${timeToMaturity.toFixed(2)} years, implied volatility ${(point.impliedVolatility * 100).toFixed(2)} percent. Load quote.`}
                                  onClick={() => onSelectQuote(point)}
                                >
                                  {(point.impliedVolatility * 100).toFixed(1)}%
                                </button>
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="synthetic-note">
                  <span aria-hidden="true">◆</span> Synthetic educational prices, inverted with the
                  tested Black–Scholes solver. This is not live market data or a multi-parameter
                  model calibration.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
