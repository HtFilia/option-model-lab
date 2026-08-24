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
import { comparisonContent } from '../content/compare';
import { defaultHestonParameters } from '../features/hestonLab';
import { buildBlackScholesHestonComparison } from '../features/modelComparison';
import type { OptionType } from '../quant/blackScholes';
import type { HestonParameters } from '../quant/heston';
import { OptionTypeToggle, ParameterControl } from './LabControls';

interface ComparisonInputs {
  type: OptionType;
  spot: number;
  strike: number;
  timeToMaturity: number;
  riskFreeRate: number;
  dividendYield: number;
}

const defaultInputs: ComparisonInputs = {
  type: 'call',
  spot: 100,
  strike: 110,
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

export function CompareView() {
  const [inputs, setInputs] = useState<ComparisonInputs>(defaultInputs);
  const [parameters, setParameters] = useState<HestonParameters>(defaultHestonParameters);

  const state = useMemo(() => {
    try {
      return {
        result: buildBlackScholesHestonComparison({
          type: inputs.type,
          strike: inputs.strike,
          timeToMaturity: inputs.timeToMaturity,
          market: {
            spot: inputs.spot,
            riskFreeRate: inputs.riskFreeRate,
            dividendYield: inputs.dividendYield,
          },
          hestonParameters: parameters,
        }),
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'The comparison scenario is invalid.',
      };
    }
  }, [inputs, parameters]);

  const updateInput = <Key extends keyof ComparisonInputs>(
    key: Key,
    value: ComparisonInputs[Key],
  ) => setInputs((current) => ({ ...current, [key]: value }));
  const updateParameter = <Key extends keyof HestonParameters>(
    key: Key,
    value: HestonParameters[Key],
  ) => setParameters((current) => ({ ...current, [key]: value }));

  return (
    <main id="main-content" className="page-shell lab-page compare-page">
      <section className="lab-intro compare-intro">
        <div>
          <p className="eyebrow">{comparisonContent.eyebrow}</p>
          <h1>{comparisonContent.title}</h1>
        </div>
        <p>{comparisonContent.introduction}</p>
      </section>

      <div className="compare-principle" role="note">
        <span aria-hidden="true">BS</span>
        <p>
          Match the Heston at-the-money call, freeze that Black–Scholes volatility, then move away
          from the fitted point.
        </p>
        <span aria-hidden="true">H</span>
      </div>

      <div className="lab-workspace compare-workspace">
        <section className="input-panel" aria-labelledby="compare-scenario-heading">
          <div className="panel-heading">
            <div>
              <p className="section-index">Shared experiment</p>
              <h2 id="compare-scenario-heading">One scenario, two models</h2>
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
            id="compare-strike"
            label="Scenario strike"
            symbol="K"
            value={inputs.strike}
            min={60}
            max={140}
            step={1}
            explanation="The contract used in the price and spot-response comparison; the calibration anchor remains ATM."
            onChange={(value) => updateInput('strike', value)}
          />
          <ParameterControl
            id="compare-time"
            label="Time to maturity"
            symbol="T"
            value={inputs.timeToMaturity}
            min={0.25}
            max={3}
            step={0.25}
            suffix="yr"
            explanation="Both models use this maturity, and Black–Scholes is rematched at its ATM quote."
            onChange={(value) => updateInput('timeToMaturity', value)}
          />
          <ParameterControl
            id="compare-xi"
            label="Heston vol of variance"
            symbol="ξ"
            value={parameters.volatilityOfVariance}
            min={0.05}
            max={1.2}
            step={0.05}
            explanation="Higher ξ usually adds curvature that one constant volatility cannot follow."
            onChange={(value) => updateParameter('volatilityOfVariance', value)}
          />
          <ParameterControl
            id="compare-correlation"
            label="Heston correlation"
            symbol="ρ"
            value={parameters.correlation}
            min={-0.95}
            max={0.5}
            step={0.05}
            explanation="Negative spot/variance correlation steepens the equity-style skew."
            onChange={(value) => updateParameter('correlation', value)}
          />

          <details className="market-input-disclosure">
            <summary>Variance and market inputs</summary>
            <ParameterControl
              id="compare-v0"
              label="Initial variance"
              symbol="v₀"
              value={parameters.initialVariance}
              min={0.005}
              max={0.16}
              step={0.005}
              explanation="Sets the Heston variance starting point."
              onChange={(value) => updateParameter('initialVariance', value)}
            />
            <ParameterControl
              id="compare-theta"
              label="Long-run variance"
              symbol="θ"
              value={parameters.longRunVariance}
              min={0.005}
              max={0.16}
              step={0.005}
              explanation="Sets the level toward which Heston variance reverts."
              onChange={(value) => updateParameter('longRunVariance', value)}
            />
            <ParameterControl
              id="compare-kappa"
              label="Mean reversion"
              symbol="κ"
              value={parameters.meanReversion}
              min={0.2}
              max={5}
              step={0.1}
              suffix="/yr"
              explanation="Controls how quickly variance moves toward its long-run level."
              onChange={(value) => updateParameter('meanReversion', value)}
            />
            <ParameterControl
              id="compare-spot"
              label="Spot"
              symbol="S"
              value={inputs.spot}
              min={60}
              max={140}
              step={1}
              explanation="Defines the current market and the at-the-money calibration strike."
              onChange={(value) => updateInput('spot', value)}
            />
            <ParameterControl
              id="compare-rate"
              label="Risk-free rate"
              symbol="r"
              value={inputs.riskFreeRate}
              min={-2}
              max={10}
              step={0.25}
              scale={100}
              suffix="%"
              explanation="Continuously compounded rate shared by both models."
              onChange={(value) => updateInput('riskFreeRate', value)}
            />
            <ParameterControl
              id="compare-dividend"
              label="Dividend yield"
              symbol="q"
              value={inputs.dividendYield}
              min={0}
              max={8}
              step={0.25}
              scale={100}
              suffix="%"
              explanation="Continuous dividend yield shared by both models."
              onChange={(value) => updateInput('dividendYield', value)}
            />
          </details>
        </section>

        <section className="output-panel" aria-live="polite">
          {state.error || !state.result ? (
            <div className="educational-error" role="alert">
              <strong>The comparison cannot be evaluated.</strong>
              <p>{state.error}</p>
            </div>
          ) : (
            <>
              <div className="result-heading compare-result-heading">
                <div>
                  <p className="section-index">Calibration anchor</p>
                  <h2>
                    Both models price the ATM call at{' '}
                    <span data-testid="comparison-anchor-price">
                      {state.result.anchorPrice.toFixed(6)}
                    </span>
                  </h2>
                </div>
                <p>
                  At K = {state.result.anchorStrike.toFixed(0)}, Black–Scholes uses the implied
                  volatility solved from the Heston price.
                </p>
              </div>

              <dl className="metric-strip comparison-metrics">
                <div>
                  <dt>Matched BS volatility</dt>
                  <dd data-testid="comparison-bs-volatility">
                    {(state.result.calibratedBlackScholesVolatility * 100).toFixed(2)}%
                  </dd>
                  <small>ATM-equivalent σ</small>
                </div>
                <div>
                  <dt>Black–Scholes value</dt>
                  <dd>{state.result.selectedBlackScholesPrice.toFixed(4)}</dd>
                  <small>selected K</small>
                </div>
                <div>
                  <dt>Heston value</dt>
                  <dd>{state.result.selectedHestonPrice.toFixed(4)}</dd>
                  <small>selected K</small>
                </div>
                <div>
                  <dt>Price disagreement</dt>
                  <dd data-testid="comparison-price-difference">
                    {state.result.selectedPriceDifference.toFixed(4)}
                  </dd>
                  <small>Heston minus BS</small>
                </div>
                <div>
                  <dt>Largest smile gap</dt>
                  <dd>{(state.result.maximumSmileDifference * 100).toFixed(2)} pts</dd>
                  <small>displayed strikes</small>
                </div>
                <div>
                  <dt>Feller margin</dt>
                  <dd>{state.result.fellerMargin.toFixed(4)}</dd>
                  <small>{state.result.fellerMargin >= 0 ? 'satisfied' : 'violated'}</small>
                </div>
              </dl>

              <div className="charts-stack compare-charts">
                <figure className="chart-panel">
                  <div className="chart-heading">
                    <div>
                      <h3>One fit point, an entire smile</h3>
                      <p>The lines meet at ATM. Away from it, Heston’s variance dynamics matter.</p>
                    </div>
                    <div className="dual-chart-legend" aria-hidden="true">
                      <span>
                        <i /> Heston implied σ
                      </span>
                      <span>
                        <i /> Black–Scholes σ
                      </span>
                    </div>
                  </div>
                  <div className="chart-canvas" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={state.result.strikePoints}
                        margin={{ top: 10, right: 12, bottom: 4, left: 4 }}
                      >
                        <CartesianGrid
                          stroke="var(--chart-grid)"
                          vertical={false}
                          strokeDasharray="2 5"
                        />
                        <XAxis
                          dataKey="strike"
                          tickFormatter={(value) => Number(value).toFixed(0)}
                          stroke="var(--chart-axis)"
                          tickLine={false}
                          axisLine={{ stroke: 'var(--chart-grid)' }}
                          tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
                        />
                        <YAxis
                          tickFormatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
                          stroke="var(--chart-axis)"
                          tickLine={false}
                          axisLine={false}
                          width={48}
                          tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            `${(Number(value) * 100).toFixed(2)}%`,
                            name,
                          ]}
                          labelFormatter={(value) => `Strike ${Number(value).toFixed(0)}`}
                          contentStyle={tooltipStyle}
                        />
                        <ReferenceLine
                          x={state.result.anchorStrike}
                          stroke="var(--warm)"
                          strokeDasharray="4 4"
                        />
                        <Line
                          name="Heston implied σ"
                          type="monotone"
                          dataKey="hestonImpliedVolatility"
                          stroke="var(--accent)"
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          name="Black–Scholes σ"
                          type="linear"
                          dataKey="blackScholesVolatility"
                          stroke="var(--quiet)"
                          strokeWidth={1.7}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <figcaption>Implied volatility by strike at the selected maturity.</figcaption>
                </figure>

                <figure className="chart-panel">
                  <div className="chart-heading">
                    <div>
                      <h3>Freeze the fit, then move spot</h3>
                      <p>The selected strike stays fixed. Black–Scholes σ is not recalibrated.</p>
                    </div>
                    <div className="dual-chart-legend" aria-hidden="true">
                      <span>
                        <i /> Heston price
                      </span>
                      <span>
                        <i /> Black–Scholes price
                      </span>
                    </div>
                  </div>
                  <div className="chart-canvas" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={state.result.spotPoints}
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
                          tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
                        />
                        <YAxis
                          tickFormatter={(value) => Number(value).toFixed(0)}
                          stroke="var(--chart-axis)"
                          tickLine={false}
                          axisLine={false}
                          width={48}
                          tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
                        />
                        <Tooltip
                          formatter={(value, name) => [Number(value).toFixed(4), name]}
                          labelFormatter={(value) => `Spot ${Number(value).toFixed(0)}`}
                          contentStyle={tooltipStyle}
                        />
                        <ReferenceLine x={inputs.spot} stroke="var(--warm)" strokeDasharray="4 4" />
                        <Line
                          name="Heston price"
                          type="monotone"
                          dataKey="hestonPrice"
                          stroke="var(--accent)"
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          name="Black–Scholes price"
                          type="monotone"
                          dataKey="blackScholesPrice"
                          stroke="var(--quiet)"
                          strokeWidth={1.7}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <figcaption>
                    Option value under spot scenarios with model parameters held fixed.
                  </figcaption>
                </figure>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="comparison-reading" aria-labelledby="comparison-reading-title">
        <div className="comparison-conditions">
          <div>
            <p className="section-index">Held constant</p>
            <ul>
              {comparisonContent.heldConstant.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="section-index">Allowed to differ</p>
            <ul>
              {comparisonContent.differences.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <p className="section-index">Read the experiment</p>
          <h2 id="comparison-reading-title">Calibration is not the end of model risk.</h2>
          <div className="comparison-lessons">
            {comparisonContent.lessons.map((lesson, index) => (
              <article key={lesson.title}>
                <span>0{index + 1}</span>
                <h3>{lesson.title}</h3>
                <p>{lesson.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
