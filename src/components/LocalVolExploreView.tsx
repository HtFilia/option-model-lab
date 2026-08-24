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
import { blackScholesPrice, type OptionType } from '../quant/blackScholes';
import {
  LocalVolError,
  ssviImpliedVolatility,
  ssviLocalVolatility,
  ssviNoArbitrageMargins,
  type SsviParameters,
} from '../quant/localVol';
import { OptionTypeToggle, ParameterControl } from './LabControls';

interface Inputs {
  type: OptionType;
  spot: number;
  strike: number;
  timeToMaturity: number;
  riskFreeRate: number;
  dividendYield: number;
}
const defaults: Inputs = {
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

export function LocalVolExploreView() {
  const [inputs, setInputs] = useState(defaults);
  const [parameters, setParameters] = useState<SsviParameters>(defaultLocalVolSurfaceParameters);
  const state = useMemo(() => {
    try {
      const forward =
        inputs.spot *
        Math.exp((inputs.riskFreeRate - inputs.dividendYield) * inputs.timeToMaturity);
      const k = Math.log(inputs.strike / forward);
      const impliedVolatility = ssviImpliedVolatility({
        logMoneyness: k,
        timeToMaturity: inputs.timeToMaturity,
        parameters,
      });
      const local = ssviLocalVolatility({
        logMoneyness: k,
        timeToMaturity: inputs.timeToMaturity,
        parameters,
      });
      const price = blackScholesPrice({
        option: { type: inputs.type, strike: inputs.strike, timeToMaturity: inputs.timeToMaturity },
        market: {
          spot: inputs.spot,
          riskFreeRate: inputs.riskFreeRate,
          dividendYield: inputs.dividendYield,
        },
        volatility: impliedVolatility,
      });
      const slice = buildLocalVolSlice(parameters, inputs.timeToMaturity);
      const term = [0.25, 0.5, 1, 2, 3, 5].map((time) => ({
        time,
        impliedVolatility: ssviImpliedVolatility({
          logMoneyness: k,
          timeToMaturity: time,
          parameters,
        }),
        localVolatility: ssviLocalVolatility({ logMoneyness: k, timeToMaturity: time, parameters })
          .localVolatility,
      }));
      return {
        forward,
        k,
        impliedVolatility,
        local,
        price,
        slice,
        term,
        margins: ssviNoArbitrageMargins(parameters),
        error: null,
      };
    } catch (error) {
      return {
        forward: null,
        k: null,
        impliedVolatility: null,
        local: null,
        price: null,
        slice: [],
        term: [],
        margins: null,
        error:
          error instanceof LocalVolError || error instanceof Error
            ? error.message
            : 'The local-vol scenario is invalid.',
      };
    }
  }, [inputs, parameters]);
  const updateInput = <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
    setInputs((current) => ({ ...current, [key]: value }));
  const updateParameter = <K extends keyof SsviParameters>(key: K, value: SsviParameters[K]) =>
    setParameters((current) => ({ ...current, [key]: value }));
  return (
    <main id="main-content" className="page-shell lab-page local-vol-explore-page">
      <section className="lab-intro">
        <div>
          <p className="eyebrow">Local Vol · Explore</p>
          <h1>Turn a surface into state dynamics.</h1>
        </div>
        <p>
          Manual controls shape an arbitrage-constrained synthetic surface. The selected vanilla
          price comes from its implied quote; Dupire reveals the instantaneous local volatility at
          the corresponding state.
        </p>
      </section>
      <div className="lab-workspace local-vol-workspace">
        <section className="input-panel" aria-labelledby="local-vol-controls">
          <div className="panel-heading">
            <div>
              <p className="section-index">Controlled SSVI surface</p>
              <h2 id="local-vol-controls">Surface inputs</h2>
            </div>
            <button
              className="quiet-button"
              type="button"
              onClick={() => {
                setInputs(defaults);
                setParameters(defaultLocalVolSurfaceParameters);
              }}
            >
              Reset
            </button>
          </div>
          <OptionTypeToggle value={inputs.type} onChange={(v) => updateInput('type', v)} />
          <ParameterControl
            id="local-atm"
            label="ATM volatility"
            symbol="σATM"
            value={parameters.atmVolatility}
            min={10}
            max={35}
            step={1}
            scale={100}
            suffix="%"
            explanation="Sets the ATM total-variance slope θ(T)=σ²ATM T."
            onChange={(v) => updateParameter('atmVolatility', v)}
          />
          <ParameterControl
            id="local-rho"
            label="Surface skew"
            symbol="ρ"
            value={parameters.rho}
            min={-0.7}
            max={0.7}
            step={0.05}
            explanation="Tilts total variance across forward log-moneyness."
            onChange={(v) => updateParameter('rho', v)}
          />
          <ParameterControl
            id="local-eta"
            label="Surface curvature"
            symbol="η"
            value={parameters.eta}
            min={0}
            max={1.5}
            step={0.05}
            explanation="Controls the power-law SSVI wings within explicit no-arbitrage bounds."
            onChange={(v) => updateParameter('eta', v)}
          />
          <ParameterControl
            id="local-time"
            label="Time to maturity"
            symbol="T"
            value={inputs.timeToMaturity}
            min={0.25}
            max={5}
            step={0.25}
            suffix="yr"
            explanation="Selects the surface slice and Dupire time coordinate."
            onChange={(v) => updateInput('timeToMaturity', v)}
          />
          <details className="market-input-disclosure">
            <summary>Option and market inputs</summary>
            <ParameterControl
              id="local-spot"
              label="Spot"
              symbol="S"
              value={inputs.spot}
              min={70}
              max={130}
              step={1}
              explanation="Current underlying spot."
              onChange={(v) => updateInput('spot', v)}
            />
            <ParameterControl
              id="local-strike"
              label="Strike"
              symbol="K"
              value={inputs.strike}
              min={60}
              max={150}
              step={1}
              explanation="Maps into forward log-moneyness k=ln(K/F)."
              onChange={(v) => updateInput('strike', v)}
            />
            <ParameterControl
              id="local-rate"
              label="Risk-free rate"
              symbol="r"
              value={inputs.riskFreeRate}
              min={-2}
              max={10}
              step={0.25}
              scale={100}
              suffix="%"
              explanation="Continuously compounded rate used for forward and discounting."
              onChange={(v) => updateInput('riskFreeRate', v)}
            />
            <ParameterControl
              id="local-dividend"
              label="Dividend yield"
              symbol="q"
              value={inputs.dividendYield}
              min={0}
              max={8}
              step={0.25}
              scale={100}
              suffix="%"
              explanation="Continuous yield used to construct the forward."
              onChange={(v) => updateInput('dividendYield', v)}
            />
          </details>
        </section>
        <section className="output-panel" aria-live="polite">
          {state.error || state.price === null || !state.local ? (
            <div className="educational-error" role="alert">
              <strong>The surface cannot be evaluated.</strong>
              <p>{state.error}</p>
            </div>
          ) : (
            <>
              <div className="result-heading">
                <div>
                  <p className="section-index">Surface-consistent vanilla</p>
                  <h2>
                    {inputs.type === 'call' ? 'Call' : 'Put'} value{' '}
                    <span data-testid="local-vol-price">{state.price.toFixed(6)}</span>
                  </h2>
                </div>
                <p>
                  This vanilla value uses the selected implied surface quote; local volatility is
                  the diffusion consistent with all such quotes.
                </p>
              </div>
              <dl className="metric-strip local-vol-metrics">
                <div>
                  <dt>Implied volatility</dt>
                  <dd>{((state.impliedVolatility ?? 0) * 100).toFixed(3)}%</dd>
                  <small>lifetime Black quote</small>
                </div>
                <div>
                  <dt>Local volatility</dt>
                  <dd data-testid="local-volatility">
                    {(state.local.localVolatility * 100).toFixed(3)}%
                  </dd>
                  <small>instantaneous at K,T</small>
                </div>
                <div>
                  <dt>Forward</dt>
                  <dd>{state.forward?.toFixed(3)}</dd>
                  <small>spot carry</small>
                </div>
                <div>
                  <dt>Log moneyness</dt>
                  <dd>{state.k?.toFixed(4)}</dd>
                  <small>ln(K/F)</small>
                </div>
                <div>
                  <dt>Density margin</dt>
                  <dd>{state.local.densityDenominator.toFixed(4)}</dd>
                  <small>must stay positive</small>
                </div>
                <div>
                  <dt>SSVI constraints</dt>
                  <dd>{state.margins?.satisfied ? 'Pass' : 'Fail'}</dd>
                  <small>sufficient conditions</small>
                </div>
              </dl>
              <div className="charts-stack">
                <figure className="chart-panel">
                  <div className="chart-heading">
                    <div>
                      <h3>Implied and local volatility versus strike</h3>
                      <p>Same surface slice, different meanings.</p>
                    </div>
                  </div>
                  <div className="chart-canvas" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={state.slice}>
                        <CartesianGrid
                          stroke="var(--chart-grid)"
                          vertical={false}
                          strokeDasharray="2 5"
                        />
                        <XAxis
                          dataKey="strike"
                          tickFormatter={(v) => Number(v).toFixed(0)}
                          tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                        />
                        <YAxis
                          tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                          width={48}
                          tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(v, n) => [`${(Number(v) * 100).toFixed(3)}%`, n]}
                          labelFormatter={(v) => `Normalized strike ${Number(v).toFixed(1)}`}
                          contentStyle={tooltipStyle}
                        />
                        <ReferenceLine x={100} stroke="var(--warm)" strokeDasharray="4 4" />
                        <Line
                          name="Implied σ"
                          dataKey="impliedVolatility"
                          stroke="var(--warm)"
                          dot={false}
                          strokeWidth={2.2}
                          isAnimationActive={false}
                        />
                        <Line
                          name="Local σ"
                          dataKey="sourceLocalVolatility"
                          stroke="var(--accent)"
                          dot={false}
                          strokeWidth={2.5}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <figcaption>
                    Normalized forward-centered strike slice at the selected maturity.
                  </figcaption>
                </figure>
                <figure className="chart-panel">
                  <div className="chart-heading">
                    <div>
                      <h3>Selected moneyness across maturity</h3>
                      <p>
                        The K–T surface changes both the market quote and instantaneous diffusion.
                      </p>
                    </div>
                  </div>
                  <div className="chart-canvas" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={state.term}>
                        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                        <XAxis
                          dataKey="time"
                          tickFormatter={(v) => `${v}y`}
                          tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                        />
                        <YAxis
                          tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                          width={48}
                          tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(v, n) => [`${(Number(v) * 100).toFixed(3)}%`, n]}
                          contentStyle={tooltipStyle}
                        />
                        <Line
                          name="Implied σ"
                          dataKey="impliedVolatility"
                          stroke="var(--warm)"
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          name="Local σ"
                          dataKey="localVolatility"
                          stroke="var(--accent)"
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <figcaption>Term slices at the selected forward log-moneyness.</figcaption>
                </figure>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
