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
import { blackScholesPrice, type OptionType } from '../quant/blackScholes';
import { HestonError, priceHeston, type HestonParameters } from '../quant/heston';
import {
  buildHestonSmile,
  defaultHestonParameters,
  simulateHestonVolatilityPaths,
} from '../features/hestonLab';
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
  timeToMaturity: 1,
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

export function HestonExploreView() {
  const [inputs, setInputs] = useState<ExploreInputs>(defaultInputs);
  const [parameters, setParameters] = useState<HestonParameters>(defaultHestonParameters);

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
      const result = priceHeston({ option, market, parameters });
      const blackScholesPriceAtInitialVariance = blackScholesPrice({
        option,
        market,
        volatility: Math.sqrt(parameters.initialVariance),
      });
      return {
        result,
        blackScholesPrice: blackScholesPriceAtInitialVariance,
        smile: buildHestonSmile(market, parameters, inputs.timeToMaturity, inputs.type),
        paths: simulateHestonVolatilityPaths(
          parameters,
          Math.max(inputs.timeToMaturity, 0.25),
          80,
          20_240_127,
        ),
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        blackScholesPrice: null,
        smile: [],
        paths: [],
        error: error instanceof HestonError ? error.message : 'The Heston scenario is invalid.',
      };
    }
  }, [inputs, parameters]);

  const updateInput = <Key extends keyof ExploreInputs>(key: Key, value: ExploreInputs[Key]) =>
    setInputs((current) => ({ ...current, [key]: value }));
  const updateParameter = <Key extends keyof HestonParameters>(
    key: Key,
    value: HestonParameters[Key],
  ) => setParameters((current) => ({ ...current, [key]: value }));

  return (
    <main id="main-content" className="page-shell lab-page heston-explore-page">
      <section className="lab-intro">
        <div>
          <p className="eyebrow">Heston · Explore</p>
          <h1>Move variance. Watch the smile respond.</h1>
        </div>
        <p>
          Manual exploration is not calibration. Move one parameter at a time and connect its
          economic role to the implied-volatility curve and seeded volatility paths.
        </p>
      </section>

      <div className="lab-workspace heston-explore-workspace">
        <section className="input-panel" aria-labelledby="heston-parameters-heading">
          <div className="panel-heading">
            <div>
              <p className="section-index">Scenario</p>
              <h2 id="heston-parameters-heading">Heston inputs</h2>
            </div>
            <button
              className="quiet-button"
              type="button"
              onClick={() => {
                setInputs(defaultInputs);
                setParameters(defaultHestonParameters);
              }}
            >
              Reset
            </button>
          </div>

          <OptionTypeToggle value={inputs.type} onChange={(value) => updateInput('type', value)} />
          <ParameterControl
            id="heston-v0"
            label="Initial variance"
            symbol="v₀"
            value={parameters.initialVariance}
            min={0.005}
            max={0.16}
            step={0.005}
            explanation="Sets today’s variance; √v₀ mostly anchors the short end of the surface."
            onChange={(value) => updateParameter('initialVariance', value)}
          />
          <ParameterControl
            id="heston-theta"
            label="Long-run variance"
            symbol="θ"
            value={parameters.longRunVariance}
            min={0.005}
            max={0.16}
            step={0.005}
            explanation="The variance level toward which paths revert; √θ anchors longer maturities."
            onChange={(value) => updateParameter('longRunVariance', value)}
          />
          <ParameterControl
            id="heston-kappa"
            label="Mean reversion"
            symbol="κ"
            value={parameters.meanReversion}
            min={0.2}
            max={5}
            step={0.1}
            suffix="/yr"
            explanation="Controls how quickly variance forgets v₀ and returns toward θ."
            onChange={(value) => updateParameter('meanReversion', value)}
          />
          <ParameterControl
            id="heston-xi"
            label="Volatility of variance"
            symbol="ξ"
            value={parameters.volatilityOfVariance}
            min={0.05}
            max={1.2}
            step={0.05}
            explanation="Makes variance paths more erratic and adds curvature to the smile."
            onChange={(value) => updateParameter('volatilityOfVariance', value)}
          />
          <ParameterControl
            id="heston-correlation"
            label="Spot/variance correlation"
            symbol="ρ"
            value={parameters.correlation}
            min={-0.95}
            max={0.5}
            step={0.05}
            explanation="Negative correlation creates the familiar downward equity skew."
            onChange={(value) => updateParameter('correlation', value)}
          />

          <details className="market-input-disclosure">
            <summary>Contract and market inputs</summary>
            <ParameterControl
              id="heston-spot"
              label="Spot"
              symbol="S"
              value={inputs.spot}
              min={50}
              max={150}
              step={1}
              explanation="Current underlying price and center of the displayed strike range."
              onChange={(value) => updateInput('spot', value)}
            />
            <ParameterControl
              id="heston-strike"
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
              id="heston-time"
              label="Time to maturity"
              symbol="T"
              value={inputs.timeToMaturity}
              min={0.25}
              max={3}
              step={0.25}
              suffix="yr"
              explanation="Maturity used for pricing and for the displayed smile slice."
              onChange={(value) => updateInput('timeToMaturity', value)}
            />
            <ParameterControl
              id="heston-rate"
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
              id="heston-dividend"
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
          {state.error || !state.result || state.blackScholesPrice === null ? (
            <div className="educational-error" role="alert">
              <strong>The Heston scenario cannot be evaluated.</strong>
              <p>{state.error}</p>
            </div>
          ) : (
            <>
              <div className="result-heading">
                <div>
                  <p className="section-index">Fourier value</p>
                  <h2>
                    {inputs.type === 'call' ? 'Call' : 'Put'} value{' '}
                    <span data-testid="heston-price">{state.result.price.toFixed(6)}</span>
                  </h2>
                </div>
                <p>
                  Black–Scholes at the flat initial volatility √v₀ gives{' '}
                  {state.blackScholesPrice.toFixed(6)}.
                </p>
              </div>

              <dl className="metric-strip heston-metrics">
                <div>
                  <dt>Initial volatility</dt>
                  <dd>{(Math.sqrt(parameters.initialVariance) * 100).toFixed(2)}%</dd>
                  <small>√v₀</small>
                </div>
                <div>
                  <dt>Long-run volatility</dt>
                  <dd>{(Math.sqrt(parameters.longRunVariance) * 100).toFixed(2)}%</dd>
                  <small>√θ</small>
                </div>
                <div>
                  <dt>vs flat Black–Scholes</dt>
                  <dd>{(state.result.price - state.blackScholesPrice).toFixed(4)}</dd>
                  <small>price difference</small>
                </div>
                <div>
                  <dt>Feller margin</dt>
                  <dd>{state.result.fellerMargin.toFixed(4)}</dd>
                  <small>
                    {state.result.fellerSatisfied ? 'condition satisfied' : 'condition violated'}
                  </small>
                </div>
                <div>
                  <dt>Quadrature</dt>
                  <dd>{state.result.integrationEvaluations}</dd>
                  <small>integrand evaluations</small>
                </div>
                <div>
                  <dt>Correlation</dt>
                  <dd>{parameters.correlation.toFixed(2)}</dd>
                  <small>spot / variance shocks</small>
                </div>
              </dl>

              <div className="charts-stack">
                <figure className="chart-panel">
                  <div className="chart-heading">
                    <div>
                      <h3>Implied-volatility smile</h3>
                      <p>Heston prices inverted quote by quote through Black–Scholes.</p>
                    </div>
                    <span className="chart-legend">
                      <i aria-hidden="true" /> Heston implied σ
                    </span>
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
                          name="Heston implied σ"
                          type="monotone"
                          dataKey="hestonVolatility"
                          stroke="var(--accent)"
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          name="Flat √v₀"
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
                  <ChartAccessibleSummary
                    title="Implied-volatility smile"
                    data={state.smile}
                    xKey="strike"
                    xLabel="Strike"
                    xFormat={(value) => value.toFixed(0)}
                    series={[
                      {
                        key: 'hestonVolatility',
                        label: 'Heston implied volatility',
                        format: (value) => `${(value * 100).toFixed(2)}%`,
                      },
                      {
                        key: 'flatVolatility',
                        label: 'Flat initial volatility',
                        format: (value) => `${(value * 100).toFixed(2)}%`,
                      },
                    ]}
                  />
                  <figcaption>
                    Implied volatility against strike for the selected maturity.
                  </figcaption>
                </figure>

                <figure className="chart-panel">
                  <div className="chart-heading">
                    <div>
                      <h3>Seeded instantaneous-volatility paths</h3>
                      <p>The same shocks are reused so parameter comparisons remain causal.</p>
                    </div>
                    <span className="chart-legend path-legend">4 paths · seed 20240127</span>
                  </div>
                  <div className="chart-canvas" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={state.paths}
                        margin={{ top: 10, right: 12, bottom: 4, left: 4 }}
                      >
                        <CartesianGrid
                          stroke="var(--chart-grid)"
                          vertical={false}
                          strokeDasharray="2 5"
                        />
                        <XAxis
                          dataKey="time"
                          stroke="var(--chart-axis)"
                          tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
                          tickLine={false}
                          axisLine={{ stroke: 'var(--chart-grid)' }}
                          tickFormatter={(value) => `${Number(value).toFixed(1)}y`}
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
                            String(name).replace('path', 'Path '),
                          ]}
                          labelFormatter={(value) => `Time ${Number(value).toFixed(2)} years`}
                          contentStyle={tooltipStyle}
                        />
                        <ReferenceLine
                          y={Math.sqrt(parameters.longRunVariance)}
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
                  <ChartAccessibleSummary
                    title="Seeded instantaneous-volatility paths"
                    data={state.paths}
                    xKey="time"
                    xLabel="Time"
                    xFormat={(value) => `${value.toFixed(2)} years`}
                    series={[
                      {
                        key: 'path1',
                        label: 'Path 1',
                        format: (value) => `${(value * 100).toFixed(2)}%`,
                      },
                      {
                        key: 'path2',
                        label: 'Path 2',
                        format: (value) => `${(value * 100).toFixed(2)}%`,
                      },
                      {
                        key: 'path3',
                        label: 'Path 3',
                        format: (value) => `${(value * 100).toFixed(2)}%`,
                      },
                      {
                        key: 'path4',
                        label: 'Path 4',
                        format: (value) => `${(value * 100).toFixed(2)}%`,
                      },
                    ]}
                  />
                  <figcaption>
                    Full-truncation Euler paths for intuition only; pricing uses Fourier inversion.
                  </figcaption>
                </figure>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
