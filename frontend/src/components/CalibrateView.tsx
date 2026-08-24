import { useMemo, useState } from 'react';
import { BlockMath } from 'react-katex';
import { OptionTypeToggle, ParameterControl } from './LabControls';
import { ImpliedVolatilitySurface } from './ImpliedVolatilitySurface';
import {
  noArbitrageBounds,
  QuantError,
  solveImpliedVolatility,
  type ImpliedVolatilityResult,
  type OptionType,
} from '../quant/blackScholes';

interface CalibrationInputs {
  type: OptionType;
  spot: number;
  strike: number;
  timeToMaturity: number;
  riskFreeRate: number;
  dividendYield: number;
  marketPrice: number;
}

const defaultInputs: CalibrationInputs = {
  type: 'call',
  spot: 100,
  strike: 100,
  timeToMaturity: 1,
  riskFreeRate: 0.05,
  dividendYield: 0.02,
  marketPrice: 9.227,
};

function contractAndMarket(inputs: CalibrationInputs) {
  return {
    option: {
      type: inputs.type,
      strike: inputs.strike,
      timeToMaturity: inputs.timeToMaturity,
    },
    market: {
      spot: inputs.spot,
      riskFreeRate: inputs.riskFreeRate,
      dividendYield: inputs.dividendYield,
    },
  };
}

function statusLabel(result: ImpliedVolatilityResult): string {
  switch (result.status) {
    case 'converged':
      return 'Converged';
    case 'boundary-zero-volatility':
      return 'Lower boundary · zero volatility';
    case 'boundary-unbounded-volatility':
      return 'Upper boundary · unbounded volatility';
    case 'bracket-failure':
      return 'No bracket found';
    case 'maximum-iterations':
      return 'Iteration limit reached';
  }
}

export function CalibrateView() {
  const [inputs, setInputs] = useState<CalibrationInputs>(defaultInputs);

  const boundsState = useMemo(() => {
    try {
      const { option, market } = contractAndMarket(inputs);
      return { bounds: noArbitrageBounds(option, market), error: null };
    } catch (error) {
      return {
        bounds: null,
        error: error instanceof QuantError ? error.message : 'The contract inputs are invalid.',
      };
    }
  }, [inputs]);

  const solverState = useMemo(() => {
    try {
      const { option, market } = contractAndMarket(inputs);
      return {
        solution: solveImpliedVolatility({ option, market, marketPrice: inputs.marketPrice }),
        error: null,
      };
    } catch (error) {
      if (error instanceof QuantError && error.code === 'PRICE_OUTSIDE_BOUNDS') {
        return {
          solution: null,
          error:
            'This market price violates the European option’s no-arbitrage bounds. At that price, a static combination of cash and the underlying would dominate the option, so no Black–Scholes volatility can reproduce it.',
        };
      }
      return {
        solution: null,
        error:
          error instanceof QuantError
            ? error.message
            : 'The implied-volatility solver could not evaluate this scenario.',
      };
    }
  }, [inputs]);

  const update = <Key extends keyof CalibrationInputs>(key: Key, value: CalibrationInputs[Key]) => {
    setInputs((current) => ({ ...current, [key]: value }));
  };

  return (
    <main id="main-content" className="page-shell lab-page calibrate-page">
      <section className="lab-intro">
        <div>
          <p className="eyebrow">Black–Scholes · Calibrate</p>
          <h1>Which volatility explains this market price?</h1>
        </div>
        <p>
          Pricing runs from parameters to value. Calibration reverses that direction: hold the
          contract and market state fixed, then solve for the parameter that matches an observed
          price.
        </p>
      </section>

      <div className="lab-workspace calibration-workspace">
        <section className="input-panel" aria-labelledby="inverse-inputs-heading">
          <div className="panel-heading">
            <div>
              <p className="section-index">Observed quote</p>
              <h2 id="inverse-inputs-heading">Inverse inputs</h2>
            </div>
            <div className="panel-actions">
              <span className="live-calculation-label">
                <i aria-hidden="true" /> Updates automatically
              </span>
              <button
                className="quiet-button"
                type="button"
                onClick={() => setInputs(defaultInputs)}
              >
                Reset
              </button>
            </div>
          </div>

          <OptionTypeToggle value={inputs.type} onChange={(value) => update('type', value)} />
          <ParameterControl
            id="calibrate-spot"
            label="Spot"
            symbol="S"
            value={inputs.spot}
            min={20}
            max={200}
            step={1}
            explanation="Today’s underlying price is observable and held fixed in the inversion."
            onChange={(value) => update('spot', value)}
          />
          <ParameterControl
            id="calibrate-strike"
            label="Strike"
            symbol="K"
            value={inputs.strike}
            min={20}
            max={200}
            step={1}
            explanation="The contractual exercise price."
            onChange={(value) => update('strike', value)}
          />
          <ParameterControl
            id="calibrate-time"
            label="Time to maturity"
            symbol="T"
            value={inputs.timeToMaturity}
            min={0.05}
            max={5}
            step={0.05}
            suffix="yr"
            explanation="A positive year fraction is required because volatility is unidentified at expiry."
            onChange={(value) => update('timeToMaturity', value)}
          />
          <ParameterControl
            id="calibrate-rate"
            label="Risk-free rate"
            symbol="r"
            value={inputs.riskFreeRate}
            min={-5}
            max={15}
            step={0.25}
            scale={100}
            suffix="%"
            explanation="The continuously compounded discount rate."
            onChange={(value) => update('riskFreeRate', value)}
          />
          <ParameterControl
            id="calibrate-dividend"
            label="Dividend yield"
            symbol="q"
            value={inputs.dividendYield}
            min={-2}
            max={12}
            step={0.25}
            scale={100}
            suffix="%"
            explanation="The continuously compounded yield carried by the underlying."
            onChange={(value) => update('dividendYield', value)}
          />
          <ParameterControl
            id="market-price"
            label="Market option price"
            symbol="Vₘ"
            value={inputs.marketPrice}
            step={0.01}
            explanation="The observed target that the Black–Scholes price must reproduce."
            onChange={(value) => update('marketPrice', value)}
            showSlider={false}
          />
        </section>

        <section className="output-panel calibration-output" aria-live="polite">
          <div className="bounds-panel">
            <p className="section-index">Feasibility first</p>
            <h2>No-arbitrage bounds</h2>
            {boundsState.bounds ? (
              <>
                <div className="bounds-equation">
                  <span>{boundsState.bounds.lower.toFixed(6)}</span>
                  <span aria-hidden="true">≤</span>
                  <strong>market price</strong>
                  <span aria-hidden="true">≤</span>
                  <span>{boundsState.bounds.upper.toFixed(6)}</span>
                </div>
                <p>
                  The solver checks these model-independent economic bounds before searching for a
                  volatility. Boundary prices have special limiting solutions.
                </p>
              </>
            ) : (
              <div className="educational-error" role="alert">
                <strong>The bounds cannot be computed yet.</strong>
                <p>{boundsState.error}</p>
              </div>
            )}
          </div>

          {solverState.error ? (
            <div className="educational-error" role="alert" data-testid="solver-error">
              <strong>No implied volatility exists for these inputs.</strong>
              <p>{solverState.error}</p>
              {boundsState.bounds ? (
                <p>
                  Enter a price between {boundsState.bounds.lower.toFixed(6)} and{' '}
                  {boundsState.bounds.upper.toFixed(6)}, inclusive.
                </p>
              ) : null}
            </div>
          ) : null}

          {solverState.solution ? (
            <div className="solver-result" data-testid="solver-result">
              <div className="solution-hero">
                <div>
                  <p className="section-index">Solved parameter</p>
                  <span className="solution-value" data-testid="implied-volatility">
                    {Number.isFinite(solverState.solution.impliedVolatility)
                      ? `${(solverState.solution.impliedVolatility * 100).toFixed(6)}%`
                      : '∞'}
                  </span>
                  <small>annualized implied volatility</small>
                </div>
                <div className={solverState.solution.converged ? 'status-good' : 'status-warning'}>
                  <i aria-hidden="true" /> {statusLabel(solverState.solution)}
                </div>
              </div>

              <dl className="diagnostic-list">
                <div>
                  <dt>Repriced option</dt>
                  <dd>{solverState.solution.repricedValue.toFixed(10)}</dd>
                </div>
                <div>
                  <dt>Residual</dt>
                  <dd>{solverState.solution.residual.toExponential(3)}</dd>
                </div>
                <div>
                  <dt>Iterations</dt>
                  <dd>{solverState.solution.iterations}</dd>
                </div>
                <div>
                  <dt>Final bracket</dt>
                  <dd>
                    [{solverState.solution.bracket[0].toFixed(8)},{' '}
                    {Number.isFinite(solverState.solution.bracket[1])
                      ? solverState.solution.bracket[1].toFixed(8)
                      : '∞'}
                    ]
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </section>
      </div>

      <ImpliedVolatilitySurface
        type={inputs.type}
        market={{
          spot: inputs.spot,
          riskFreeRate: inputs.riskFreeRate,
          dividendYield: inputs.dividendYield,
        }}
        onSelectQuote={(point) =>
          setInputs((current) => ({
            ...current,
            strike: point.strike,
            timeToMaturity: point.timeToMaturity,
            marketPrice: point.marketPrice,
          }))
        }
      />

      <section className="calibration-explainer">
        <div>
          <p className="section-index">Forward problem</p>
          <BlockMath math="\sigma \longrightarrow V_{BS}(\sigma)" />
          <p>Choose volatility, then calculate the option value.</p>
        </div>
        <div>
          <p className="section-index">Inverse problem</p>
          <BlockMath math="V_{mkt} \longrightarrow \sigma_{impl}" />
          <p>Observe a price, then solve numerically for the volatility that reproduces it.</p>
        </div>
        <div>
          <p className="section-index">Why Heston is different</p>
          <p>
            Every surface cell above is still one quote and one unknown, solved independently. A
            multi-parameter model such as Heston fits many quotes jointly, chooses bounds and
            weights, and minimizes an objective that may have competing parameter combinations. That
            is optimization, not a collection of scalar inversions.
          </p>
        </div>
      </section>
    </main>
  );
}
