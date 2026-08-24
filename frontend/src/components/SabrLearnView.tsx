import { lazy, Suspense } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { sabrContent as content } from '../content/sabr';
import { ModelSectionNav } from './ModelSectionNav';
import { ScrollReveal } from './ScrollReveal';

const SabrLearnVisuals = lazy(() =>
  import('./SabrLearnVisuals').then((module) => ({ default: module.SabrLearnVisuals })),
);

export function SabrLearnView() {
  return (
    <main id="main-content" className="page-shell learn-page">
      <div className="learn-layout">
        <ModelSectionNav
          sections={content.navigation}
          modelSlug="sabr"
          modelName="SABR"
          modelIndex="04"
        />
        <div className="learn-content">
          <ScrollReveal id="overview" className="model-intro" aria-labelledby="sabr-title">
            <p className="eyebrow">{content.eyebrow}</p>
            <h1 id="sabr-title">{content.title}</h1>
            <p className="lead">{content.intuition}</p>
            <div className="context-line" aria-label="Model context">
              <span>Positive forwards</span>
              <span>Black-76 volatility</span>
              <span>Rates &amp; FX context</span>
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
            </div>
          </ScrollReveal>

          <ScrollReveal id="dynamics" className="reading-section">
            <p className="section-index">02 · Forward dynamics</p>
            <div className="equation-header">
              <div>
                <h2>Two correlated shocks, one forward measure</h2>
                <p>
                  The state variable is a forward <InlineMath math="F_t" />, so its drift vanishes
                  under the associated pricing measure.
                </p>
              </div>
              <div className="equation-stack compact-equations">
                <div>
                  <BlockMath math="dF_t=\alpha_t F_t^\beta dW_t^F" />
                </div>
                <div>
                  <BlockMath math="d\alpha_t=\nu\alpha_t dW_t^\alpha" />
                </div>
                <div>
                  <BlockMath math="d\langle W^F,W^\alpha\rangle_t=\rho\,dt" />
                </div>
              </div>
            </div>
            <details className="disclosure">
              <summary>See the modeling assumptions</summary>
              <ul className="assumption-list">
                {content.assumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          </ScrollReveal>

          <ScrollReveal id="parameters" className="reading-section">
            <p className="section-index">03 · Parameter map</p>
            <h2>Level, elasticity, skew, curvature</h2>
            <p className="section-intro">
              The four letters are compact, but they do different jobs.
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
              <h2>Shape the smile one role at a time</h2>
              <p>Switch β and ρ, then watch both strike shape and maturity behavior respond.</p>
            </div>
            <Suspense
              fallback={
                <div className="visual-loading" aria-live="polite">
                  Building the SABR smile…
                </div>
              }
            >
              <SabrLearnVisuals />
            </Suspense>
          </ScrollReveal>

          <ScrollReveal id="approximation" className="reading-section">
            <p className="section-index">05 · Hagan approximation</p>
            <h2>Return a market quote directly</h2>
            <p className="section-intro">{content.approximation.intro}</p>
            <div className="equation-stack">
              <div>
                <span className="equation-label">Log-moneyness transform</span>
                <BlockMath math="z=\frac{\nu}{\alpha}(FK)^{(1-\beta)/2}\log(F/K)" />
              </div>
              <div>
                <span className="equation-label">Correlation transform</span>
                <BlockMath math="x(z)=\log\!\left(\frac{\sqrt{1-2\rho z+z^2}+z-\rho}{1-\rho}\right)" />
              </div>
            </div>
            <details className="disclosure">
              <summary>Why ATM needs special numerical care</summary>
              <div className="disclosure-prose">
                <p>{content.approximation.atm}</p>
                <p>{content.approximation.convention}</p>
              </div>
            </details>
          </ScrollReveal>

          <ScrollReveal id="calibration" className="reading-section reading-grid">
            <div>
              <p className="section-index">06 · Inverse problem</p>
              <h2>Fit one expiry smile</h2>
            </div>
            <div className="prose-column">
              {content.calibration.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <a className="text-link" href="#/sabr/calibrate">
                Inspect the bounded fit <span aria-hidden="true">→</span>
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal id="limitations" className="reading-section limitation-section">
            <p className="section-index">07 · Model risk</p>
            <h2>A smooth fit can still be a bad surface</h2>
            <ul className="limitation-list">
              {content.limitations.map((item) => (
                <li key={item}>{item}</li>
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
                    <small>{model.status}</small>
                  )}
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal id="remember" className="memory-section" aria-labelledby="sabr-memory">
            <p className="section-index">Memory check</p>
            <h2 id="sabr-memory">Remember these three things</h2>
            <ol>
              {content.takeaways.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </ScrollReveal>
        </div>
      </div>
    </main>
  );
}
