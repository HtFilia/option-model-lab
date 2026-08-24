import { useMemo, useState } from 'react';
import { LineChartPanel, type ChartPoint } from './LineChartPanel';
import { OptionTypeToggle, ParameterControl } from './LabControls';
import {
  europeanOptionPayoff,
  priceBlackScholes,
  QuantError,
  type BlackScholesResult,
  type OptionType,
} from '../quant/blackScholes';

interface ExploreInputs {
  type: OptionType;
  spot: number;
  strike: number;
  timeToMaturity: number;
  volatility: number;
  riskFreeRate: number;
  dividendYield: number;
}

type GreekKey = 'delta' | 'gamma' | 'vega' | 'theta' | 'rho';

const defaultInputs: ExploreInputs = {
  type: 'call',
  spot: 100,
  strike: 100,
  timeToMaturity: 1,
  volatility: 0.2,
  riskFreeRate: 0.05,
  dividendYield: 0.02,
};

const greekDisplay: Record<
  GreekKey,
  { label: string; unit: string; convert: (result: BlackScholesResult) => number; digits: number }
> = {
  delta: { label: 'Delta', unit: 'per 1 spot unit', convert: (result) => result.delta, digits: 3 },
  gamma: { label: 'Gamma', unit: 'per 1 spot unit', convert: (result) => result.gamma, digits: 4 },
  vega: {
    label: 'Vega',
    unit: 'per 1 volatility point',
    convert: (result) => result.vega * 0.01,
    digits: 3,
  },
  theta: {
    label: 'Theta',
    unit: 'per calendar day',
    convert: (result) => result.theta / 365,
    digits: 3,
  },
  rho: {
    label: 'Rho',
    unit: 'per 1 rate point',
    convert: (result) => result.rho * 0.01,
    digits: 3,
  },
};

function quantInput(inputs: ExploreInputs, spot = inputs.spot) {
  return {
    option: {
      type: inputs.type,
      strike: inputs.strike,
      timeToMaturity: inputs.timeToMaturity,
    },
    market: {
      spot,
      riskFreeRate: inputs.riskFreeRate,
      dividendYield: inputs.dividendYield,
    },
    volatility: inputs.volatility,
  };
}

function createSpotGrid(inputs: ExploreInputs): number[] {
  const reference = Math.max(inputs.spot, inputs.strike);
  const lower = Math.max(0.01, Math.min(inputs.spot, inputs.strike) * 0.4);
  const upper = reference * 1.6;
  const step = (upper - lower) / 64;
  return Array.from({ length: 65 }, (_, index) => lower + index * step);
}

export function ExploreView() {
  const [inputs, setInputs] = useState<ExploreInputs>(defaultInputs);
  const [greek, setGreek] = useState<GreekKey>('delta');

  const computation = useMemo(() => {
    try {
      const result = priceBlackScholes(quantInput(inputs));
      const spots = createSpotGrid(inputs);
      const payoff: ChartPoint[] = spots.map((spot) => ({
        spot,
        value: europeanOptionPayoff(inputs.type, spot, inputs.strike),
      }));
      const value: ChartPoint[] = [];
      const greekCurve: ChartPoint[] = [];
      for (const spot of spots) {
        const pointResult = priceBlackScholes(quantInput(inputs, spot));
        value.push({ spot, value: pointResult.price });
        greekCurve.push({ spot, value: greekDisplay[greek].convert(pointResult) });
      }
      return { result, payoff, value, greekCurve, error: null };
    } catch (error) {
      const message =
        error instanceof QuantError ? error.message : 'The model could not evaluate these inputs.';
      return { result: null, payoff: [], value: [], greekCurve: [], error: message };
    }
  }, [greek, inputs]);

  const update = <Key extends keyof ExploreInputs>(key: Key, value: ExploreInputs[Key]) => {
    setInputs((current) => ({ ...current, [key]: value }));
  };

  const currentGreek = greekDisplay[greek];
  const priceFormatter = (value: number) => value.toFixed(2);
  const greekFormatter = (value: number) => value.toFixed(currentGreek.digits);

  return (
    <main id="main-content" className="page-shell lab-page">
      <section className="lab-intro">
        <div>
          <p className="eyebrow">Black–Scholes · Explore</p>
          <h1>Change an assumption. Watch the price respond.</h1>
        </div>
        <p>
          Manual exploration builds intuition; it is not calibration. Move one input and connect the
          financial meaning to the price, hedge, and curve that change.
        </p>
      </section>

      <div className="lab-workspace">
        <aside className="input-panel" aria-label="Black–Scholes inputs">
          <div className="panel-heading">
            <div>
              <p className="section-index">Market scenario</p>
              <h2>Inputs</h2>
            </div>
            <button className="quiet-button" type="button" onClick={() => setInputs(defaultInputs)}>
              Reset
            </button>
          </div>

          <OptionTypeToggle value={inputs.type} onChange={(value) => update('type', value)} />
          <ParameterControl
            id="explore-spot"
            label="Spot"
            symbol="S"
            value={inputs.spot}
            min={20}
            max={200}
            step={1}
            explanation="The underlying price observed today."
            onChange={(value) => update('spot', value)}
          />
          <ParameterControl
            id="explore-strike"
            label="Strike"
            symbol="K"
            value={inputs.strike}
            min={20}
            max={200}
            step={1}
            explanation="The fixed exercise price in the option contract."
            onChange={(value) => update('strike', value)}
          />
          <ParameterControl
            id="explore-time"
            label="Time to maturity"
            symbol="T"
            value={inputs.timeToMaturity}
            min={0}
            max={5}
            step={0.05}
            suffix="yr"
            explanation="The year fraction remaining; this lab uses a simple 365-day year."
            onChange={(value) => update('timeToMaturity', value)}
          />
          <ParameterControl
            id="explore-volatility"
            label="Annualized volatility"
            symbol="σ"
            value={inputs.volatility}
            min={0}
            max={100}
            step={1}
            scale={100}
            suffix="%"
            explanation="The constant annualized width of returns assumed by the model."
            onChange={(value) => update('volatility', value)}
          />
          <ParameterControl
            id="explore-rate"
            label="Risk-free rate"
            symbol="r"
            value={inputs.riskFreeRate}
            min={-5}
            max={15}
            step={0.25}
            scale={100}
            suffix="%"
            explanation="A continuously compounded annual rate; negative values are valid."
            onChange={(value) => update('riskFreeRate', value)}
          />
          <ParameterControl
            id="explore-dividend"
            label="Dividend yield"
            symbol="q"
            value={inputs.dividendYield}
            min={-2}
            max={12}
            step={0.25}
            scale={100}
            suffix="%"
            explanation="A continuous annual yield paid by the underlying."
            onChange={(value) => update('dividendYield', value)}
          />
        </aside>

        <section className="output-panel" aria-live="polite">
          {computation.error || !computation.result ? (
            <div className="educational-error" role="alert">
              <strong>These inputs do not define a valid Black–Scholes scenario.</strong>
              <p>{computation.error}</p>
              <p>Financial inputs are not silently clamped. Correct the value to continue.</p>
            </div>
          ) : (
            <>
              <div className="result-heading">
                <div>
                  <p className="section-index">Model output</p>
                  <h2>
                    {inputs.type === 'call' ? 'Call' : 'Put'} value{' '}
                    <span data-testid="option-price">
                      {priceFormatter(computation.result.price)}
                    </span>
                  </h2>
                </div>
                <p>
                  All values use the active scenario. Greeks are analytic derivatives of the
                  Black–Scholes price.
                </p>
              </div>

              <dl className="metric-strip">
                <div>
                  <dt>Price</dt>
                  <dd>{priceFormatter(computation.result.price)}</dd>
                  <small>currency units</small>
                </div>
                <div>
                  <dt>Delta</dt>
                  <dd>{computation.result.delta.toFixed(4)}</dd>
                  <small>per 1 spot unit</small>
                </div>
                <div>
                  <dt>Gamma</dt>
                  <dd>{computation.result.gamma.toFixed(6)}</dd>
                  <small>per 1 spot unit</small>
                </div>
                <div>
                  <dt>Vega</dt>
                  <dd>{(computation.result.vega * 0.01).toFixed(4)}</dd>
                  <small>per 1 vol point</small>
                </div>
                <div>
                  <dt>Theta</dt>
                  <dd>{(computation.result.theta / 365).toFixed(4)}</dd>
                  <small>per calendar day</small>
                </div>
                <div>
                  <dt>Rho</dt>
                  <dd>{(computation.result.rho * 0.01).toFixed(4)}</dd>
                  <small>per 1 rate point</small>
                </div>
              </dl>

              <div className="charts-stack">
                <LineChartPanel
                  title="Payoff at maturity"
                  description={`At expiry, the ${inputs.type} keeps only intrinsic value; time value has disappeared.`}
                  data={computation.payoff}
                  currentSpot={inputs.spot}
                  valueLabel="Payoff"
                  valueFormatter={priceFormatter}
                />
                <LineChartPanel
                  title="Option value versus spot"
                  description="Before expiry the curve is smooth because there is still uncertainty and time value."
                  data={computation.value}
                  currentSpot={inputs.spot}
                  valueLabel="Option value"
                  valueFormatter={priceFormatter}
                />
                <div className="greek-chart-wrap">
                  <label htmlFor="greek-select">Greek versus spot</label>
                  <select
                    id="greek-select"
                    value={greek}
                    onChange={(event) => setGreek(event.currentTarget.value as GreekKey)}
                  >
                    {Object.entries(greekDisplay).map(([key, definition]) => (
                      <option key={key} value={key}>
                        {definition.label}
                      </option>
                    ))}
                  </select>
                  <LineChartPanel
                    title={`${currentGreek.label} versus spot`}
                    description={`${currentGreek.label} shows how the option’s sensitivity changes across moneyness, reported ${currentGreek.unit}.`}
                    data={computation.greekCurve}
                    currentSpot={inputs.spot}
                    valueLabel={currentGreek.label}
                    valueFormatter={greekFormatter}
                  />
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
