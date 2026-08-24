import { lazy, Suspense } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { mertonJumpContent as content } from '../content/mertonJump';
import { ModelSectionNav } from './ModelSectionNav';
import { ScrollReveal } from './ScrollReveal';

const MertonLearnVisuals = lazy(() =>
  import('./MertonLearnVisuals').then((module) => ({ default: module.MertonLearnVisuals })),
);

export function MertonLearnView() {
  return (
    <main id="main-content" className="page-shell learn-page">
      <div className="learn-layout">
        <ModelSectionNav
          sections={content.navigation}
          modelSlug="merton-jump-diffusion"
          modelName="Merton Jump Diffusion"
          modelIndex="03"
        />

        <div className="learn-content">
          <ScrollReveal id="overview" className="model-intro" aria-labelledby="merton-title">
            <p className="eyebrow">{content.eyebrow}</p>
            <h1 id="merton-title">{content.title}</h1>
            <p className="lead">{content.intuition}</p>
            <div className="context-line" aria-label="Model context">
              <span>European calls &amp; puts</span>
              <span>Poisson mixture</span>
              <span>Discontinuous spot</span>
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
              <a className="text-link" href="#/heston/learn/limitations">
                Contrast Heston’s continuous-path limitation <span aria-hidden="true">→</span>
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal id="dynamics" className="reading-section">
            <p className="section-index">02 · Risk-neutral dynamics</p>
            <div className="equation-header">
              <div>
                <h2>A smooth diffusion interrupted by random jumps</h2>
                <p>
                  <InlineMath math="N_t" /> counts events and <InlineMath math="J" /> multiplies
                  spot at each event. The compensator preserves the risk-neutral expected return.
                </p>
              </div>
              <div className="equation-stack compact-equations">
                <div>
                  <BlockMath math="\frac{dS_t}{S_{t^-}}=(r-q-\lambda\kappa_J)dt+\sigma dW_t+(J-1)dN_t" />
                </div>
                <div>
                  <BlockMath math="\log J\sim\mathcal N(\mu_J,\delta_J^2)" />
                </div>
                <div>
                  <BlockMath math="\kappa_J=\mathbb E[J-1]=e^{\mu_J+\delta_J^2/2}-1" />
                </div>
              </div>
            </div>
            <details className="disclosure">
              <summary>See the retained and new assumptions</summary>
              <ul className="assumption-list">
                {content.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </details>
          </ScrollReveal>

          <ScrollReveal id="parameters" className="reading-section">
            <p className="section-index">03 · Parameter map</p>
            <h2>Separate ordinary noise from event risk</h2>
            <p className="section-intro">
              Frequency, direction, and size dispersion have distinct first-order effects.
            </p>
            <dl className="heston-parameter-map merton-parameter-map">
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
              <h2>Watch probability leave the center</h2>
              <p>
                One control connects jump counts to terminal tails and short-maturity implied
                volatility.
              </p>
            </div>
            <Suspense
              fallback={
                <div className="visual-loading" aria-live="polite">
                  Building the jump mixture…
                </div>
              }
            >
              <MertonLearnVisuals />
            </Suspense>
          </ScrollReveal>

          <ScrollReveal id="pricing" className="reading-section">
            <p className="section-index">05 · Vanilla pricing</p>
            <h2>Condition on the number of jumps</h2>
            <p className="section-intro">{content.pricing.intro}</p>
            <div className="equation-stack">
              <div>
                <span className="equation-label">Poisson mixture</span>
                <BlockMath math="V=\sum_{n=0}^{\infty}e^{-\lambda T}\frac{(\lambda T)^n}{n!}V_n" />
              </div>
              <div>
                <span className="equation-label">Conditional variance</span>
                <BlockMath math="\operatorname{Var}[\log S_T\mid N_T=n]=\sigma^2T+n\delta_J^2" />
              </div>
            </div>
            <details className="disclosure">
              <summary>Read the implementation convention</summary>
              <div className="disclosure-prose">
                <p>{content.pricing.convention}</p>
                <p>{content.pricing.compensator}</p>
              </div>
            </details>
          </ScrollReveal>

          <ScrollReveal id="calibration" className="reading-section reading-grid">
            <div>
              <p className="section-index">06 · Inverse problem</p>
              <h2>Fit event-risk parameters to a short smile</h2>
            </div>
            <div className="prose-column">
              {content.calibration.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <a className="text-link" href="#/merton-jump-diffusion/calibrate">
                Calibrate the synthetic smile <span aria-hidden="true">→</span>
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
                    <small>{model.status}</small>
                  )}
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal id="remember" className="memory-section" aria-labelledby="merton-memory">
            <p className="section-index">Memory check</p>
            <h2 id="merton-memory">Remember these three things</h2>
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
