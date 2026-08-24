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
import { priceSabr, SabrError, type ForwardOptionType, type SabrParameters } from '../quant/sabr';
import { OptionTypeToggle, ParameterControl } from './LabControls';

interface ExploreInputs {
  type: ForwardOptionType;
  forward: number;
  strike: number;
  timeToMaturity: number;
  discountFactor: number;
}
const defaultInputs: ExploreInputs = {
  type: 'call',
  forward: 0.03,
  strike: 0.03,
  timeToMaturity: 2,
  discountFactor: 0.96,
};
const tooltipStyle = {
  border: '1px solid var(--strong-line)',
  borderRadius: 2,
  background: 'var(--chart-surface)',
  color: 'var(--ink)',
  fontSize: 13,
};

export function SabrExploreView() {
  const [inputs, setInputs] = useState(defaultInputs);
  const [parameters, setParameters] = useState<SabrParameters>(defaultSabrParameters);
  const state = useMemo(() => {
    try {
      return {
        result: priceSabr({ ...inputs, parameters }),
        smile: buildSabrSmile(
          inputs.forward,
          inputs.discountFactor,
          inputs.timeToMaturity,
          parameters,
        ),
        term: buildSabrTermSlices(inputs.forward, parameters),
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        smile: [],
        term: [],
        error:
          error instanceof SabrError || error instanceof Error
            ? error.message
            : 'The SABR scenario is invalid.',
      };
    }
  }, [inputs, parameters]);
  const updateInput = <K extends keyof ExploreInputs>(key: K, value: ExploreInputs[K]) =>
    setInputs((current) => ({ ...current, [key]: value }));
  const updateParameter = <K extends keyof SabrParameters>(key: K, value: SabrParameters[K]) =>
    setParameters((current) => ({ ...current, [key]: value }));
  const atmVol = state.smile[Math.floor(state.smile.length / 2)]?.flatVolatility ?? 0;

  return (
    <main id="main-content" className="page-shell lab-page sabr-explore-page">
      <section className="lab-intro">
        <div>
          <p className="eyebrow">SABR · Explore</p>
          <h1>Shape a forward smile live.</h1>
        </div>
        <p>
          Every slider reprices immediately. Read α as level, β as elasticity, ρ as skew, and ν as
          curvature—then inspect how strike and maturity views disagree with a flat Black quote.
        </p>
      </section>
      <div className="lab-workspace sabr-explore-workspace">
        <section className="input-panel" aria-labelledby="sabr-parameters-heading">
          <div className="panel-heading">
            <div>
              <p className="section-index">Scenario</p>
              <h2 id="sabr-parameters-heading">SABR inputs</h2>
            </div>
            <button
              className="quiet-button"
              type="button"
              onClick={() => {
                setInputs(defaultInputs);
                setParameters(defaultSabrParameters);
              }}
            >
              Reset
            </button>
          </div>
          <OptionTypeToggle value={inputs.type} onChange={(value) => updateInput('type', value)} />
          <ParameterControl
            id="sabr-alpha"
            label="Volatility level"
            symbol="α"
            value={parameters.alpha}
            min={0.5}
            max={10}
            step={0.25}
            scale={100}
            suffix=""
            explanation="Sets the local volatility scale; α is not itself a Black volatility unless β = 1."
            onChange={(v) => updateParameter('alpha', v)}
          />
          <ParameterControl
            id="sabr-beta"
            label="Elasticity"
            symbol="β"
            value={parameters.beta}
            min={0}
            max={1}
            step={0.05}
            explanation="Controls how forward diffusion scales with level: β = 0 is normal-like and β = 1 is lognormal-like."
            onChange={(v) => updateParameter('beta', v)}
          />
          <ParameterControl
            id="sabr-rho"
            label="Correlation"
            symbol="ρ"
            value={parameters.rho}
            min={-0.95}
            max={0.95}
            step={0.05}
            explanation="Correlates forward and volatility shocks; it is not the interest-rate Greek rho."
            onChange={(v) => updateParameter('rho', v)}
          />
          <ParameterControl
            id="sabr-nu"
            label="Vol of volatility"
            symbol="ν"
            value={parameters.nu}
            min={0}
            max={1.5}
            step={0.05}
            explanation="Makes the volatility level random; larger ν generally lifts smile curvature."
            onChange={(v) => updateParameter('nu', v)}
          />
          <details className="market-input-disclosure">
            <summary>Forward contract and discounting</summary>
            <ParameterControl
              id="sabr-forward"
              label="Forward"
              symbol="F"
              value={inputs.forward}
              min={0.5}
              max={10}
              step={0.1}
              scale={100}
              suffix="%"
              explanation="The modeled positive forward rate or price, not spot."
              onChange={(v) => updateInput('forward', v)}
            />
            <ParameterControl
              id="sabr-strike"
              label="Strike"
              symbol="K"
              value={inputs.strike}
              min={0.5}
              max={10}
              step={0.1}
              scale={100}
              suffix="%"
              explanation="Strike in the same units as the forward."
              onChange={(v) => updateInput('strike', v)}
            />
            <ParameterControl
              id="sabr-time"
              label="Time to maturity"
              symbol="T"
              value={inputs.timeToMaturity}
              min={0.25}
              max={10}
              step={0.25}
              suffix="yr"
              explanation="The Hagan correction is first order in maturity."
              onChange={(v) => updateInput('timeToMaturity', v)}
            />
            <ParameterControl
              id="sabr-discount"
              label="Discount factor"
              symbol="D"
              value={inputs.discountFactor}
              min={0.7}
              max={1.05}
              step={0.005}
              explanation="Present-value factor kept separate from forward dynamics."
              onChange={(v) => updateInput('discountFactor', v)}
            />
          </details>
        </section>
        <section className="output-panel" aria-live="polite">
          {state.error || !state.result ? (
            <div className="educational-error" role="alert">
              <strong>The SABR scenario cannot be evaluated.</strong>
              <p>{state.error}</p>
            </div>
          ) : (
            <>
              <div className="result-heading">
                <div>
                  <p className="section-index">Black-76 value</p>
                  <h2>
                    {inputs.type === 'call' ? 'Call' : 'Put'} value{' '}
                    <span data-testid="sabr-price">
                      {(state.result.price * 10000).toFixed(3)} bp
                    </span>
                  </h2>
                </div>
                <p>The Hagan approximation supplies the strike-specific Black volatility.</p>
              </div>
              <dl className="metric-strip sabr-metrics">
                <div>
                  <dt>Implied volatility</dt>
                  <dd data-testid="sabr-volatility">
                    {(state.result.impliedVolatility * 100).toFixed(3)}%
                  </dd>
                  <small>lognormal Black quote</small>
                </div>
                <div>
                  <dt>ATM volatility</dt>
                  <dd>{(atmVol * 100).toFixed(3)}%</dd>
                  <small>same expiry</small>
                </div>
                <div>
                  <dt>Log moneyness</dt>
                  <dd>{Math.log(inputs.forward / inputs.strike).toFixed(4)}</dd>
                  <small>ln(F/K)</small>
                </div>
                <div>
                  <dt>β convention</dt>
                  <dd>{parameters.beta.toFixed(2)}</dd>
                  <small>fixed elasticity</small>
                </div>
              </dl>
              <div className="charts-stack">
                <figure className="chart-panel">
                  <div className="chart-heading">
                    <div>
                      <h3>Implied volatility versus strike</h3>
                      <p>SABR smile against a flat ATM Black volatility.</p>
                    </div>
                    <span className="chart-legend">
                      <i aria-hidden="true" /> SABR σ
                    </span>
                  </div>
                  <div className="chart-canvas" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={state.smile}>
                        <CartesianGrid
                          stroke="var(--chart-grid)"
                          vertical={false}
                          strokeDasharray="2 5"
                        />
                        <XAxis
                          dataKey="strikePercent"
                          tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
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
                          labelFormatter={(v) => `Strike ${Number(v).toFixed(2)}%`}
                          contentStyle={tooltipStyle}
                        />
                        <ReferenceLine
                          x={inputs.forward * 100}
                          stroke="var(--warm)"
                          strokeDasharray="4 4"
                        />
                        <Line
                          name="SABR σ"
                          dataKey="impliedVolatility"
                          stroke="var(--accent)"
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          name="Flat ATM σ"
                          dataKey="flatVolatility"
                          stroke="var(--quiet)"
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <figcaption>Black lognormal implied volatility by strike.</figcaption>
                </figure>
                <figure className="chart-panel">
                  <div className="chart-heading">
                    <div>
                      <h3>Call value versus strike</h3>
                      <p>Present value in basis points under SABR and a flat ATM quote.</p>
                    </div>
                  </div>
                  <div className="chart-canvas" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={state.smile}>
                        <CartesianGrid
                          stroke="var(--chart-grid)"
                          vertical={false}
                          strokeDasharray="2 5"
                        />
                        <XAxis
                          dataKey="strikePercent"
                          tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                          tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                        />
                        <YAxis
                          tickFormatter={(v) => `${(Number(v) * 10000).toFixed(0)}`}
                          width={48}
                          tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(v, n) => [`${(Number(v) * 10000).toFixed(2)} bp`, n]}
                          contentStyle={tooltipStyle}
                        />
                        <Line
                          name="SABR price"
                          dataKey="sabrPrice"
                          stroke="var(--accent)"
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          name="Flat price"
                          dataKey="flatPrice"
                          stroke="var(--quiet)"
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <figcaption>Black-76 call value from the two volatility assumptions.</figcaption>
                </figure>
                <figure className="chart-panel">
                  <div className="chart-heading">
                    <div>
                      <h3>Strike slices across maturity</h3>
                      <p>A compact K–T view: 75%, 100%, and 125% of forward.</p>
                    </div>
                  </div>
                  <div className="chart-canvas" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={state.term}>
                        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                        <XAxis
                          dataKey="maturity"
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
                  <figcaption>
                    Three moneyness slices reveal maturity effects without pretending one slice is a
                    calibrated surface.
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
