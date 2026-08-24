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
import { blackScholesPrice, type OptionType } from '../quant/blackScholes';
import {
  MertonJumpError,
  priceMertonJumpDiffusion,
  type MertonJumpParameters,
} from '../quant/mertonJumpDiffusion';
import { OptionTypeToggle, ParameterControl } from './LabControls';
import { ChartAccessibleSummary } from './ChartAccessibleSummary';

interface ExploreInputs {
  type: OptionType;
  spot: number;
  strike: number;
  timeToMaturity: number;
  riskFreeRate: number;
  dividendYield: number;
}

const defaultInputs: ExploreInputs = {
  type: 'call',
  spot: 100,
  strike: 100,
  timeToMaturity: 0.25,
  riskFreeRate: 0.03,
  dividendYield: 0.01,
};

const tooltipStyle = {
  border: '1px solid var(--strong-line)',
  borderRadius: 2,
  background: 'var(--chart-surface)',
  color: 'var(--ink)',
  fontSize: 13,
};

export function MertonExploreView() {
  const [inputs, setInputs] = useState<ExploreInputs>(defaultInputs);
  const [parameters, setParameters] = useState<MertonJumpParameters>(defaultMertonJumpParameters);

  const state = useMemo(() => {
    try {
      const market = {
        spot: inputs.spot,
        riskFreeRate: inputs.riskFreeRate,
        dividendYield: inputs.dividendYield,
      };
      const option = {
        type: inputs.type,
        strike: inputs.strike,
        timeToMaturity: inputs.timeToMaturity,
      };
      const result = priceMertonJumpDiffusion({ option, market, parameters });
      return {
        result,
        diffusionPrice: blackScholesPrice({
          option,
          market,
          volatility: parameters.diffusionVolatility,
        }),
        smile: buildMertonSmile(market, parameters, inputs.timeToMaturity),
        density: buildMertonTerminalDensity(market, parameters, inputs.timeToMaturity),
        jumpCounts: buildJumpCountProbabilities(parameters.jumpIntensity, inputs.timeToMaturity),
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        diffusionPrice: null,
        smile: [],
        density: [],
        jumpCounts: [],
        error:
          error instanceof MertonJumpError || error instanceof Error
            ? error.message
            : 'The jump-diffusion scenario is invalid.',
      };
    }
  }, [inputs, parameters]);

  const updateInput = <Key extends keyof ExploreInputs>(key: Key, value: ExploreInputs[Key]) =>
    setInputs((current) => ({ ...current, [key]: value }));
  const updateParameter = <Key extends keyof MertonJumpParameters>(
    key: Key,
    value: MertonJumpParameters[Key],
  ) => setParameters((current) => ({ ...current, [key]: value }));

  return (
    <main id="main-content" className="page-shell lab-page merton-explore-page">
      <section className="lab-intro">
        <div>
          <p className="eyebrow">Merton Jump Diffusion · Explore</p>
          <h1>Move event risk into the tails.</h1>
        </div>
        <p>
          Manual exploration is not calibration. Change jump frequency, direction, and dispersion
          separately; then connect the Poisson event count to the terminal density and smile.
        </p>
      </section>

      <div className="lab-workspace merton-explore-workspace">
        <section className="input-panel" aria-labelledby="merton-parameters-heading">
          <div className="panel-heading">
            <div>
              <p className="section-index">Scenario</p>
              <h2 id="merton-parameters-heading">Jump inputs</h2>
            </div>
            <button
              className="quiet-button"
              type="button"
              onClick={() => {
                setInputs(defaultInputs);
                setParameters(defaultMertonJumpParameters);
              }}
            >
              Reset
            </button>
          </div>

          <OptionTypeToggle value={inputs.type} onChange={(value) => updateInput('type', value)} />
          <ParameterControl
            id="merton-diffusion-vol"
            label="Diffusion volatility"
            symbol="σ"
            value={parameters.diffusionVolatility}
            min={5}
            max={45}
            step={1}
            scale={100}
            suffix="%"
            explanation="Background volatility when no discontinuous event occurs."
            onChange={(value) => updateParameter('diffusionVolatility', value)}
          />
          <ParameterControl
            id="merton-intensity"
            label="Jump intensity"
            symbol="λ"
            value={parameters.jumpIntensity}
            min={0}
            max={5}
            step={0.1}
            suffix="/yr"
            explanation="Expected jump count per year; the probability of at least one jump is 1 − exp(−λT)."
            onChange={(value) => updateParameter('jumpIntensity', value)}
          />
          <ParameterControl
            id="merton-mean-jump"
            label="Mean log jump"
            symbol="μJ"
            value={parameters.meanLogJump}
            min={-30}
            max={15}
            step={1}
            scale={100}
            suffix="%"
            explanation="Centers log jump sizes; negative values make downward gaps more typical."
            onChange={(value) => updateParameter('meanLogJump', value)}
          />
          <ParameterControl
            id="merton-jump-vol"
            label="Jump-size dispersion"
            symbol="δJ"
            value={parameters.jumpVolatility}
            min={1}
            max={50}
            step={1}
            scale={100}
            suffix="%"
            explanation="Standard deviation of log jump size; wider jumps thicken both tails."
            onChange={(value) => updateParameter('jumpVolatility', value)}
          />

          <details className="market-input-disclosure">
            <summary>Contract and market inputs</summary>
            <ParameterControl
              id="merton-spot"
              label="Spot"
              symbol="S"
              value={inputs.spot}
              min={50}
              max={150}
              step={1}
              explanation="Current underlying price and center of the density and strike ranges."
              onChange={(value) => updateInput('spot', value)}
            />
            <ParameterControl
              id="merton-strike"
              label="Strike"
              symbol="K"
              value={inputs.strike}
              min={50}
              max={150}
              step={1}
              explanation="Exercise price of the option whose value is reported."
              onChange={(value) => updateInput('strike', value)}
            />
            <ParameterControl
              id="merton-time"
              label="Time to maturity"
              symbol="T"
              value={inputs.timeToMaturity}
              min={0.05}
              max={2}
              step={0.05}
              suffix="yr"
              explanation="Short maturities make event-risk wings especially visible."
              onChange={(value) => updateInput('timeToMaturity', value)}
            />
            <ParameterControl
              id="merton-rate"
              label="Risk-free rate"
              symbol="r"
              value={inputs.riskFreeRate}
              min={-2}
              max={10}
              step={0.25}
              scale={100}
              suffix="%"
              explanation="Continuously compounded discount rate."
              onChange={(value) => updateInput('riskFreeRate', value)}
            />
            <ParameterControl
              id="merton-dividend"
              label="Dividend yield"
              symbol="q"
              value={inputs.dividendYield}
              min={0}
              max={8}
              step={0.25}
              scale={100}
              suffix="%"
              explanation="Continuous dividend yield carried by the underlying."
              onChange={(value) => updateInput('dividendYield', value)}
            />
          </details>
        </section>

        <section className="output-panel" aria-live="polite">
          {state.error || !state.result || state.diffusionPrice === null ? (
            <div className="educational-error" role="alert">
              <strong>The jump scenario cannot be evaluated.</strong>
              <p>{state.error}</p>
            </div>
          ) : (
            <>
              <div className="result-heading">
                <div>
                  <p className="section-index">Poisson-mixture value</p>
                  <h2>
                    {inputs.type === 'call' ? 'Call' : 'Put'} value{' '}
                    <span data-testid="merton-price">{state.result.price.toFixed(6)}</span>
                  </h2>
                </div>
                <p>Diffusion-only Black–Scholes at σ gives {state.diffusionPrice.toFixed(6)}.</p>
              </div>

              <dl className="metric-strip merton-metrics">
                <div>
                  <dt>Jump probability</dt>
                  <dd>
                    {(
                      (1 - Math.exp(-parameters.jumpIntensity * inputs.timeToMaturity)) *
                      100
                    ).toFixed(2)}
                    %
                  </dd>
                  <small>at least one by T</small>
                </div>
                <div>
                  <dt>Expected multiplier</dt>
                  <dd>{state.result.expectedJumpMultiplier.toFixed(4)}×</dd>
                  <small>E[J]</small>
                </div>
                <div>
                  <dt>vs diffusion only</dt>
                  <dd>{(state.result.price - state.diffusionPrice).toFixed(4)}</dd>
                  <small>price difference</small>
                </div>
                <div>
                  <dt>Drift compensator</dt>
                  <dd>{state.result.jumpCompensator.toFixed(4)}</dd>
                  <small>E[J − 1]</small>
                </div>
                <div>
                  <dt>Poisson terms</dt>
                  <dd>{state.result.poissonTerms}</dd>
                  <small>adaptive truncation</small>
                </div>
                <div>
                  <dt>Omitted mass</dt>
                  <dd>{state.result.omittedProbability.toExponential(1)}</dd>
                  <small>probability tail</small>
                </div>
              </dl>

              <div className="charts-stack">
                <figure className="chart-panel">
                  <div className="chart-heading">
                    <div>
                      <h3>Short-maturity implied-volatility smile</h3>
                      <p>Merton prices inverted quote by quote through Black–Scholes.</p>
                    </div>
                    <div className="dual-chart-legend" aria-hidden="true">
                      <span>
                        <i /> Merton implied σ
                      </span>
                      <span>
                        <i /> Diffusion σ
                      </span>
                    </div>
                  </div>
                  <div className="chart-canvas" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={state.smile}
                        margin={{ top: 10, right: 12, bottom: 4, left: 4 }}
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
                          width={48}
                          tickFormatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            `${(Number(value) * 100).toFixed(2)}%`,
                            name,
                          ]}
                          labelFormatter={(value) => `Strike ${Number(value).toFixed(0)}`}
                          contentStyle={tooltipStyle}
                        />
                        <ReferenceLine x={inputs.spot} stroke="var(--warm)" strokeDasharray="4 4" />
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
                  <ChartAccessibleSummary
                    title="Short-maturity implied-volatility smile"
                    data={state.smile}
                    xKey="strike"
                    xLabel="Strike"
                    xFormat={(value) => value.toFixed(0)}
                    series={[
                      {
                        key: 'mertonImpliedVolatility',
                        label: 'Merton implied volatility',
                        format: (value) => `${(value * 100).toFixed(2)}%`,
                      },
                      {
                        key: 'diffusionVolatility',
                        label: 'Diffusion volatility',
                        format: (value) => `${(value * 100).toFixed(2)}%`,
                      },
                    ]}
                  />
                  <figcaption>
                    Implied volatility against strike for the selected maturity.
                  </figcaption>
                </figure>

                <div className="merton-secondary-charts">
                  <figure className="chart-panel">
                    <div className="chart-heading">
                      <div>
                        <h3>Terminal spot density</h3>
                        <p>Jump mixture versus the diffusion-only benchmark.</p>
                      </div>
                    </div>
                    <div className="chart-canvas" aria-hidden="true">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={state.density}
                          margin={{ top: 10, right: 12, bottom: 4, left: 4 }}
                        >
                          <CartesianGrid
                            stroke="var(--chart-grid)"
                            vertical={false}
                            strokeDasharray="2 5"
                          />
                          <XAxis
                            dataKey="spot"
                            tickFormatter={(value) => Number(value).toFixed(0)}
                            stroke="var(--chart-axis)"
                            tickLine={false}
                            axisLine={{ stroke: 'var(--chart-grid)' }}
                            tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                          />
                          <YAxis hide />
                          <Tooltip
                            formatter={(value, name) => [Number(value).toFixed(5), name]}
                            labelFormatter={(value) => `Terminal spot ${Number(value).toFixed(0)}`}
                            contentStyle={tooltipStyle}
                          />
                          <ReferenceLine
                            x={inputs.spot}
                            stroke="var(--warm)"
                            strokeDasharray="4 4"
                          />
                          <Line
                            name="Merton density"
                            type="monotone"
                            dataKey="mertonDensity"
                            stroke="var(--accent)"
                            strokeWidth={2.3}
                            dot={false}
                            isAnimationActive={false}
                          />
                          <Line
                            name="Diffusion density"
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
                    <ChartAccessibleSummary
                      title="Terminal spot density"
                      data={state.density}
                      xKey="spot"
                      xLabel="Terminal spot"
                      xFormat={(value) => value.toFixed(0)}
                      series={[
                        {
                          key: 'mertonDensity',
                          label: 'Merton density',
                          format: (value) => value.toFixed(5),
                        },
                        {
                          key: 'diffusionDensity',
                          label: 'Diffusion density',
                          format: (value) => value.toFixed(5),
                        },
                      ]}
                    />
                    <figcaption>Risk-neutral terminal spot density.</figcaption>
                  </figure>
                  <figure className="chart-panel">
                    <div className="chart-heading">
                      <div>
                        <h3>Number of jumps by maturity</h3>
                        <p>The final bucket contains four or more jumps.</p>
                      </div>
                    </div>
                    <div className="chart-canvas" aria-hidden="true">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={state.jumpCounts}
                          margin={{ top: 10, right: 12, bottom: 4, left: 4 }}
                        >
                          <CartesianGrid
                            stroke="var(--chart-grid)"
                            vertical={false}
                            strokeDasharray="2 5"
                          />
                          <XAxis
                            dataKey="jumps"
                            tickFormatter={(value) => (Number(value) === 4 ? '4+' : String(value))}
                            stroke="var(--chart-axis)"
                            tickLine={false}
                            axisLine={{ stroke: 'var(--chart-grid)' }}
                            tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                          />
                          <YAxis
                            tickFormatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
                            stroke="var(--chart-axis)"
                            tickLine={false}
                            axisLine={false}
                            width={42}
                            tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                          />
                          <Tooltip
                            formatter={(value) => [
                              `${(Number(value) * 100).toFixed(2)}%`,
                              'Probability',
                            ]}
                            labelFormatter={(value) => `${value === 4 ? '4+' : value} jumps`}
                            contentStyle={tooltipStyle}
                          />
                          <Bar
                            dataKey="probability"
                            fill="var(--accent)"
                            isAnimationActive={false}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <ChartAccessibleSummary
                      title="Number of jumps by maturity"
                      data={state.jumpCounts}
                      xKey="jumps"
                      xLabel="Jump count"
                      xFormat={(value) => (value === 4 ? '4 or more' : value.toFixed(0))}
                      series={[
                        {
                          key: 'probability',
                          label: 'Probability',
                          format: (value) => `${(value * 100).toFixed(2)}%`,
                        },
                      ]}
                    />
                    <figcaption>Poisson jump-count probabilities.</figcaption>
                  </figure>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
