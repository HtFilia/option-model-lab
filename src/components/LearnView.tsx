import { lazy, Suspense } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { blackScholesContent as content } from '../content/blackScholes';
import { ModelSectionNav } from './ModelSectionNav';
import { ScrollReveal } from './ScrollReveal';

const LearnVisuals = lazy(() =>
  import('./LearnVisuals').then((module) => ({ default: module.LearnVisuals })),
);

export function LearnView() {
  return (
    <main id="main-content" className="page-shell learn-page">
      <div className="learn-layout">
        <ModelSectionNav
          sections={content.navigation}
          modelSlug="black-scholes"
          modelName="Black–Scholes"
          modelIndex="01"
        />

        <div className="learn-content">
          <ScrollReveal id="overview" className="model-intro" aria-labelledby="learn-title">
            <p className="eyebrow">{content.eyebrow}</p>
            <h1 id="learn-title">{content.title}</h1>
            <p className="lead">{content.intuition}</p>
            <div className="context-line" aria-label="Model context">
              <span>European calls &amp; puts</span>
              <span>Analytic price</span>
              <span>Constant volatility</span>
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
            <p className="section-index">02 · Core idea</p>
            <div className="equation-header">
              <div>
                <h2>Move to a world where risk can be priced</h2>
                <p>
                  Under the risk-neutral measure, the expected growth rate becomes{' '}
                  <InlineMath math="r-q" />. Volatility remains the source of uncertainty.
                </p>
              </div>
              <div className="equation-panel" aria-label="Risk-neutral stock dynamics">
                <BlockMath math="dS_t=(r-q)S_t\,dt+\sigma S_t\,dW_t" />
              </div>
            </div>

            <details className="disclosure">
              <summary>See the assumptions that make this possible</summary>
              <ul className="assumption-list">
                {content.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </details>
          </ScrollReveal>

          <ScrollReveal id="intuition" className="reading-section learning-visual-section">
            <p className="section-index">03 · Visual intuition</p>
            <div className="visual-section-heading">
              <h2>{content.visualIntuition.title}</h2>
              <p>{content.visualIntuition.intro}</p>
            </div>
            <Suspense
              fallback={
                <div className="visual-loading" aria-live="polite">
                  Plotting the Black–Scholes learning scenarios…
                </div>
              }
            >
              <LearnVisuals />
            </Suspense>
          </ScrollReveal>

          <ScrollReveal id="equations" className="reading-section">
            <p className="section-index">04 · Essential equations</p>
            <h2>From diffusion to a closed-form price</h2>
            <p className="section-intro">
              A self-financing hedge removes the random shock. No-arbitrage then requires the hedged
              position to earn the risk-free rate.
            </p>
            <div className="equation-stack">
              <div>
                <span className="equation-label">Black–Scholes PDE</span>
                <BlockMath math="\frac{\partial V}{\partial t}+\frac{1}{2}\sigma^2S^2\frac{\partial^2V}{\partial S^2}+(r-q)S\frac{\partial V}{\partial S}-rV=0" />
              </div>
              <div>
                <span className="equation-label">Distance-to-strike terms</span>
                <BlockMath math="d_1=\frac{\ln(S/K)+(r-q+\tfrac12\sigma^2)T}{\sigma\sqrt{T}},\qquad d_2=d_1-\sigma\sqrt{T}" />
              </div>
              <div className="formula-pair">
                <div>
                  <span className="equation-label">Call</span>
                  <BlockMath math="C=Se^{-qT}N(d_1)-Ke^{-rT}N(d_2)" />
                </div>
                <div>
                  <span className="equation-label">Put</span>
                  <BlockMath math="P=Ke^{-rT}N(-d_2)-Se^{-qT}N(-d_1)" />
                </div>
              </div>
            </div>

            <details className="disclosure">
              <summary>Follow the essential derivation path</summary>
              <ol className="derivation-list">
                {content.derivation.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </details>

            <details className="disclosure">
              <summary>Decode the six inputs</summary>
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

          <ScrollReveal id="inversion" className="reading-section reading-grid">
            <div>
              <p className="section-index">05 · Inverse problem</p>
              <h2>Implied volatility runs the formula backward</h2>
            </div>
            <div className="prose-column">
              {content.impliedVolatility.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <a className="text-link" href="#/black-scholes/calibrate">
                Try the implied-volatility solver <span aria-hidden="true">→</span>
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal id="limitations" className="reading-section limitation-section">
            <p className="section-index">06 · Model risk</p>
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

          <ScrollReveal id="remember" className="memory-section" aria-labelledby="memory-title">
            <p className="section-index">Memory check</p>
            <h2 id="memory-title">Remember these three things</h2>
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
