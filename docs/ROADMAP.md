# Option Model Lab — Roadmap

## Guiding rule

Development proceeds through complete vertical slices.

Do not implement many incomplete models in parallel.

A milestone is complete only when its quantitative logic, tests, educational content, interactions, and deployment are coherent.

---

# Milestone 0 — Repository and product skeleton

## Objective

Create the smallest maintainable application skeleton and establish engineering constraints.

## Deliverables

- React + TypeScript + Vite application;
- GitHub Pages-compatible production build;
- basic responsive shell;
- basic routing;
- math rendering;
- selected chart library;
- linting;
- formatting;
- type checking;
- Vitest;
- minimal Playwright setup;
- CI workflow;
- Pages deployment workflow;
- documentation files in `docs/`;
- `AGENTS.md`.

## Acceptance criteria

- clean checkout can be installed from the lockfile;
- tests run locally;
- production build succeeds;
- deployment works under repository subpath;
- empty application shell is accessible and responsive;
- no backend or database exists.

---

# Milestone 1 — Black-Scholes vertical slice

## Objective

Prove the complete product concept with one model.

## Learn

Provide:

- historical context;
- intuition;
- assumptions;
- risk-neutral dynamics;
- closed-form formula;
- essential derivation;
- implied volatility explanation;
- limitations;
- related-model links;
- three-item memory summary.

## Explore

Support:

- call and put;
- spot;
- strike;
- maturity;
- volatility;
- risk-free rate;
- dividend yield.

Display:

- price;
- delta;
- gamma;
- vega;
- theta;
- rho.

Charts:

- payoff at maturity;
- price versus spot;
- selectable Greek versus spot.

Interactions must feel immediate.

## Calibrate

Implement Black-Scholes implied-volatility inversion.

Display:

- target market price;
- no-arbitrage bounds;
- implied volatility;
- repriced value;
- residual;
- convergence diagnostics.

## Quant tests

Include:

- known reference prices;
- put-call parity;
- analytic Greeks against finite differences;
- expiry behavior;
- zero-volatility behavior;
- invalid inputs;
- implied-volatility recovery.

## UX acceptance criteria

A user should be able to explain:

- what volatility means in Black-Scholes;
- why implied volatility is an inverse problem;
- why one constant volatility cannot describe a market smile.

---

# Milestone 2 — Heston vertical slice

## Objective

Introduce stochastic volatility and validate the application's ability to support a structurally different model.

## Learn

Explain:

- what Black-Scholes fails to reproduce;
- stochastic variance;
- mean reversion;
- leverage effect;
- volatility of volatility;
- equity skew;
- Feller condition;
- remaining continuous-path limitation.

## Explore

Parameters:

- \(v_0\);
- \(\theta\);
- \(\kappa\);
- vol-of-vol;
- spot/variance correlation.

Visualizations should make parameter effects intuitive.

Possible charts:

- implied-volatility smile;
- variance paths;
- terminal distribution;
- price/Greek comparison versus Black-Scholes.

## Pricing

Implement a numerically validated European-option pricer.

Prefer a Fourier-based method appropriate for Heston vanillas.

Document the exact characteristic-function and integration conventions.

## Calibration

Use a small deterministic volatility-surface fixture.

Show:

- initial parameters;
- bounds;
- objective;
- model versus market;
- residuals;
- calibrated parameters;
- convergence diagnostics.

Move expensive calibration into a Web Worker only if profiling shows UI blocking.

## Engineering review

After both Black-Scholes and Heston exist:

- identify true duplicated domain concepts;
- introduce only the abstractions justified by both models;
- review model metadata needs;
- review shared chart and parameter-control patterns.

Do not preserve abstractions that make either model harder to understand.

---

# Milestone 3 — Broaden model families

Add models one at a time.

## 3A — Merton Jump Diffusion

Teaching objective:

- continuous diffusion versus jump risk;
- fat tails;
- event/gap risk;
- short-maturity behavior.

Interactive objective:

- jump intensity;
- jump-size mean;
- jump-size dispersion.

Show how a model can change terminal tails while preserving simple vanilla pricing structure.

---

## 3B — SABR

Teaching objective:

- forward-based modelling;
- smile parametrization;
- \(\alpha,\beta,\rho,\nu\);
- rates/FX context;
- ATM approximation and calibration.

Do not force SABR into the same conceptual workflow as equity stochastic-volatility models.

---

## 3C — Local Vol

Teaching objective:

- exact fit of today's vanilla surface;
- state-dependent deterministic volatility;
- Dupire;
- difference between static surface fit and future smile dynamics.

Implementation objective:

- use a controlled synthetic arbitrage-clean surface;
- clearly separate interpolation/differentiation errors from model theory.

---

# Milestone 4 — Compare and model risk

## Objective

Make the project explain why calibration is not the end of the modelling problem.

Add a comparison workflow for compatible models.

Possible comparisons:

- Black-Scholes versus Heston;
- Heston versus Local Vol;
- Heston versus jump diffusion.

Show:

- market fit;
- implied-volatility surfaces;
- terminal distributions;
- Greeks;
- scenario responses.

Introduce the principle:

\[
\text{same vanilla calibration}
\not\Rightarrow
\text{same dynamics}.
\]

If an educational exotic is introduced, keep it intentionally simple and use it only to demonstrate model risk.

---

# Milestone 5 — Advanced volatility models

## 5A — Rough Bergomi

Teaching objectives:

- forward variance;
- Volterra memory;
- Hurst parameter;
- non-Markovianity;
- short-maturity skew;
- distinction between roughness and jumps.

Numerical objectives:

- reference Monte Carlo implementation;
- seeded reproducibility;
- discretization diagnostics;
- conditional Monte Carlo where appropriate;
- Web Worker execution;
- performance profiling.

Only after the reference implementation is validated should optimizations be considered.

Possible later optimizations:

- hybrid scheme;
- FFT-based convolution;
- multi-factor Markovian approximation;
- WASM.

Do not add Rust/WASM merely for portfolio signalling.

---

## 5B — Rough Heston

Optional.

Teaching objective:

- fractional/Volterra extension of Heston;
- fractional Riccati structure;
- comparison with rough Bergomi.

Only implement if it adds a distinct educational story rather than model-count inflation.

---

# Milestone 6 — Polish

Possible improvements:

- shareable URL-encoded scenarios;
- richer keyboard navigation;
- better mobile layouts;
- model-map transitions;
- accessibility audit;
- performance audit;
- bundle-size audit;
- documentation diagrams;
- contributor guide;
- recorded screenshots or GIFs for the GitHub README.

---

# Explicitly deferred

Until justified by a new requirement:

- user authentication;
- database;
- remote backend;
- real-time market data;
- cloud jobs;
- distributed computation;
- machine learning;
- production exotic library;
- portfolio aggregation;
- trade storage;
- live P&L;
- deployment beyond static hosting.

---

# Definition of done for every model

A model is not complete merely because its formula is implemented.

It is complete when the repository contains:

- documented motivation;
- assumptions;
- equations;
- parameter interpretation;
- limitations;
- related-model links;
- numerical implementation;
- deterministic tests;
- interactive exploration;
- calibration explanation where applicable;
- three-item memory summary;
- appropriate UX;
- no unexplained numerical conventions.
