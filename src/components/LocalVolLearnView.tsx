import { lazy, Suspense } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import { localVolContent as content } from '../content/localVol';
import { ModelSectionNav } from './ModelSectionNav';
import { ScrollReveal } from './ScrollReveal';

const LocalVolLearnVisuals = lazy(() =>
  import('./LocalVolLearnVisuals').then((module) => ({ default: module.LocalVolLearnVisuals })),
);

export function LocalVolLearnView() {
  return (
    <main id="main-content" className="page-shell learn-page">
      <div className="learn-layout">
        <ModelSectionNav
          sections={content.navigation}
          modelSlug="local-vol"
          modelName="Local Vol"
          modelIndex="05"
        />
        <div className="learn-content">
          <ScrollReveal id="overview" className="model-intro" aria-labelledby="local-vol-title">
            <p className="eyebrow">{content.eyebrow}</p>
            <h1 id="local-vol-title">{content.title}</h1>
            <p className="lead">{content.intuition}</p>
            <div className="context-line">
              <span>European surface</span>
              <span>Continuous spot</span>
              <span>Exact static fit</span>
            </div>
          </ScrollReveal>
          <ScrollReveal id="motivation" className="reading-section reading-grid">
            <div>
              <p className="section-index">01 · Motivation</p>
              <h2>{content.motivation.title}</h2>
            </div>
            <div className="prose-column">
              {content.motivation.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </ScrollReveal>
          <ScrollReveal id="dynamics" className="reading-section">
            <p className="section-index">02 · Risk-neutral dynamics</p>
            <div className="equation-header">
              <div>
                <h2>Volatility becomes a map</h2>
                <p>
                  At each instant, <InlineMath math="\sigma_{loc}(S_t,t)" /> is determined by the
                  current state and time—there is no separate variance shock.
                </p>
              </div>
              <div className="equation-stack compact-equations">
                <div>
                  <BlockMath math="\frac{dS_t}{S_t}=(r-q)dt+\sigma_{loc}(S_t,t)dW_t" />
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
          <ScrollReveal id="surface" className="reading-section">
            <p className="section-index">03 · Surface first</p>
            <h2>Do not confuse two volatilities</h2>
            <p className="section-intro">
              The market quote and the diffusion coefficient answer different questions.
            </p>
            <dl className="heston-parameter-map">
              {content.surfaceLessons.map(([symbol, lesson]) => (
                <div key={symbol}>
                  <dt>{symbol}</dt>
                  <dd>{lesson}</dd>
                </div>
              ))}
            </dl>
            <div className="equation-stack">
              <div>
                <span className="equation-label">Total implied variance</span>
                <BlockMath math="w(k,T)=\sigma_{imp}^2(k,T)T,\qquad k=\log(K/F_T)" />
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal id="intuition" className="reading-section learning-visual-section">
            <p className="section-index">04 · Visual intuition</p>
            <div className="visual-section-heading">
              <h2>One surface, two volatility maps</h2>
              <p>
                Change skew and curvature; compare the quoted implied smile with the instantaneous
                local-vol slice it determines.
              </p>
            </div>
            <Suspense fallback={<div className="visual-loading">Reconstructing the surface…</div>}>
              <LocalVolLearnVisuals />
            </Suspense>
          </ScrollReveal>
          <ScrollReveal id="dupire" className="reading-section">
            <p className="section-index">05 · Dupire</p>
            <h2>Differentiate the surface into dynamics</h2>
            <p className="section-intro">{content.dupire.intro}</p>
            <div className="equation-stack">
              <div>
                <span className="equation-label">Call-price form</span>
                <BlockMath math="\sigma_{loc}^2(K,T)=\frac{2\left(\partial_T C+qC+(r-q)K\partial_K C\right)}{K^2\partial_{KK}C}" />
              </div>
            </div>
            <details className="disclosure">
              <summary>See the numerical convention</summary>
              <div className="disclosure-prose">
                <p>{content.dupire.numerical}</p>
                <p>{content.dupire.honesty}</p>
              </div>
            </details>
          </ScrollReveal>
          <ScrollReveal id="calibration" className="reading-section reading-grid">
            <div>
              <p className="section-index">06 · Reconstruction</p>
              <h2>Calibration without an optimizer</h2>
            </div>
            <div className="prose-column">
              {content.calibration.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <a className="text-link" href="#/local-vol/calibrate">
                Stress the reconstruction <span aria-hidden="true">→</span>
              </a>
            </div>
          </ScrollReveal>
          <ScrollReveal id="limitations" className="reading-section limitation-section">
            <p className="section-index">07 · Model risk</p>
            <h2>Exact fit is not the end</h2>
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
          <ScrollReveal id="remember" className="memory-section" aria-labelledby="local-vol-memory">
            <p className="section-index">Memory check</p>
            <h2 id="local-vol-memory">Remember these three things</h2>
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
