import { lazy, Suspense } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { hestonContent as content } from '../content/heston';
import { ModelSectionNav } from './ModelSectionNav';
import { ScrollReveal } from './ScrollReveal';

const HestonLearnVisuals = lazy(() =>
  import('./HestonLearnVisuals').then((module) => ({ default: module.HestonLearnVisuals })),
);

export function HestonLearnView() {
  return (
    <main id="main-content" className="page-shell learn-page">
      <div className="learn-layout">
        <ModelSectionNav
          sections={content.navigation}
          modelSlug="heston"
          modelName="Heston"
          modelIndex="02"
        />

        <div className="learn-content">
          <ScrollReveal id="overview" className="model-intro" aria-labelledby="heston-title">
            <p className="eyebrow">{content.eyebrow}</p>
            <h1 id="heston-title">{content.title}</h1>
            <p className="lead">{content.intuition}</p>
            <div className="context-line" aria-label="Model context">
              <span>European calls &amp; puts</span>
              <span>Fourier price</span>
              <span>Stochastic variance</span>
            </div>
          </ScrollReveal>

          <ScrollReveal id="motivation" className="reading-section reading-grid">
            <div>
              <p className="section-index">01 · Motivation</p>
              <h2>{content.motivation.title}</h2>
            </div>
            <div className="prose-column">
              {content.motivation.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <a className="text-link" href="#/black-scholes/learn/limitations">
                Revisit the Black–Scholes limitation <span aria-hidden="true">→</span>
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal id="variance" className="reading-section">
            <p className="section-index">02 · Risk-neutral dynamics</p>
            <div className="equation-header">
              <div>
                <h2>Variance becomes a second source of uncertainty</h2>
                <p>
                  Spot is driven by instantaneous variance <InlineMath math="v_t" />. Variance
                  itself is random, mean reverting, and correlated with the spot shock.
                </p>
              </div>
              <div className="equation-stack compact-equations">
                <div>
                  <BlockMath math="\frac{dS_t}{S_t}=(r-q)dt+\sqrt{v_t}\,dW_t^S" />
                </div>
                <div>
                  <BlockMath math="dv_t=\kappa(\theta-v_t)dt+\xi\sqrt{v_t}\,dW_t^v" />
                </div>
                <div>
                  <BlockMath math="d\langle W^S,W^v\rangle_t=\rho\,dt" />
                </div>
              </div>
            </div>
            <details className="disclosure">
              <summary>See the assumptions retained and changed</summary>
              <ul className="assumption-list">
                {content.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </details>
          </ScrollReveal>

          <ScrollReveal id="parameters" className="reading-section">
            <p className="section-index">03 · Parameter map</p>
            <h2>Five parameters divide the surface into roles</h2>
            <p className="section-intro">
              They interact, but each has a useful first-order interpretation. Variance parameters
              are displayed as variance in equations and as square-root volatility where intuition
              benefits.
            </p>
            <dl className="heston-parameter-map">
              {content.parameterLessons.map(([symbol, lesson]) => (
                <div key={symbol}>
                  <dt>{symbol}</dt>
                  <dd>{lesson}</dd>
                </div>
              ))}
            </dl>
            <details className="disclosure">
              <summary>Decode the exact parameter definitions</summary>
              <dl className="symbol-list">
                {content.parameters.map(([symbol, meaning]) => (
                  <div key={symbol}>
                    <dt>{symbol}</dt>
                    <dd>{meaning}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </ScrollReveal>

          <ScrollReveal id="intuition" className="reading-section learning-visual-section">
            <p className="section-index">04 · Visual intuition</p>
            <div className="visual-section-heading">
              <h2>See skew and stochastic variance emerge</h2>
              <p>
                Correlation reshapes the smile while seeded variance paths show what it means for
                volatility to be a state variable rather than a constant.
              </p>
            </div>
            <Suspense
              fallback={
                <div className="visual-loading" aria-live="polite">
                  Pricing the Heston learning scenarios…
                </div>
              }
            >
              <HestonLearnVisuals />
            </Suspense>
          </ScrollReveal>

          <ScrollReveal id="pricing" className="reading-section">
            <p className="section-index">05 · Numerical pricing</p>
            <h2>Closed characteristic function, numerical inversion</h2>
            <p className="section-intro">{content.pricing.intro}</p>
            <div className="equation-stack">
              <div>
                <span className="equation-label">European call</span>
                <BlockMath math="C=Se^{-qT}P_1-Ke^{-rT}P_2" />
              </div>
              <div>
                <span className="equation-label">Fourier recovery</span>
                <BlockMath math="P_j=\frac12+\frac1\pi\int_0^\infty \operatorname{Re}\!\left[\frac{e^{-iu\log K}f_j(u)}{iu}\right]du" />
              </div>
            </div>
            <details className="disclosure">
              <summary>Read the implementation convention</summary>
              <div className="disclosure-prose">
                <p>{content.pricing.convention}</p>
                <p>{content.pricing.approximation}</p>
              </div>
            </details>
            <details className="disclosure">
              <summary>{content.feller.title}</summary>
              <div className="disclosure-prose">
                <BlockMath math="2\kappa\theta\geq\xi^2" />
                <p>{content.feller.body}</p>
              </div>
            </details>
          </ScrollReveal>

          <ScrollReveal id="calibration" className="reading-section reading-grid">
            <div>
              <p className="section-index">06 · Inverse problem</p>
              <h2>One surface, five interacting unknowns</h2>
            </div>
            <div className="prose-column">
              {content.calibration.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <a className="text-link" href="#/heston/calibrate">
                Calibrate the synthetic surface <span aria-hidden="true">→</span>
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal id="limitations" className="reading-section limitation-section">
            <p className="section-index">07 · Model risk</p>
            <h2>What this model still cannot explain</h2>
            <ul className="limitation-list">
              {content.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
            <h3>Where to go next</h3>
            <div className="related-list">
              {content.relatedModels.map((model) => (
                <div key={model.name}>
                  <span>{model.name}</span>
                  <p>{model.relation}</p>
                  {'href' in model ? (
                    <a className="text-link" href={model.href}>
                      {model.status} <span aria-hidden="true">→</span>
                    </a>
                  ) : (
                    <small>Planned model</small>
                  )}
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal id="remember" className="memory-section" aria-labelledby="heston-memory">
            <p className="section-index">Memory check</p>
            <h2 id="heston-memory">Remember these three things</h2>
            <ol>
              {content.takeaways.map((takeaway) => (
                <li key={takeaway}>{takeaway}</li>
              ))}
            </ol>
          </ScrollReveal>
        </div>
      </div>
    </main>
  );
}
