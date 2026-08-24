# Option Model Lab — Product Specification

## 1. Product vision

Option Model Lab is an interactive educational web application for understanding option pricing models through their motivations, assumptions, mathematical structure, calibration, numerical behavior, and limitations.

The application is not intended to be a trading platform, production pricer, or market-data terminal.

Its central teaching principle is:

> Every model exists because another model fails somewhere.

Instead of presenting pricing models as an isolated catalogue, the application should show how models are related and which market phenomena motivated their development.

The product should let a user move continuously between four perspectives:

- **Theory** — what the model assumes and how it is derived.
- **Intuition** — how its parameters affect distributions, smiles, prices, and Greeks.
- **Calibration** — how market observations imply model parameters.
- **Model risk** — what the model still fails to represent and what alternative models may imply.

The application must remain understandable without requiring the user to remember information from previous screens.

---

## 2. Target users

Primary users are:

- quantitative-finance students;
- software engineers learning derivatives pricing;
- junior quants;
- experienced finance professionals wanting a visual refresher;
- recruiters or interviewers evaluating the repository as a portfolio project.

The application should assume familiarity with basic probability and derivatives, but not with every pricing model.

A user should be able to understand the essential idea of a model without reading its full mathematical derivation.

Advanced mathematical detail must remain available through progressive disclosure.

---

## 3. Product positioning

This project is **not**:

- an option-price calculator with many input fields;
- a Bloomberg substitute;
- a trading application;
- a backtesting platform;
- a production risk engine;
- an exhaustive encyclopedia of derivatives models.

It is an **interactive model laboratory**.

A concise positioning statement is:

> An interactive laboratory for understanding how option pricing models evolve, what market phenomena they explain, how they are calibrated, and what assumptions they introduce.

---

## 4. Core learning loop

For every model, the user should be able to answer:

1. What problem motivated this model?
2. What assumption of the previous model was relaxed or changed?
3. What are the model's equations?
4. What does each parameter mean economically and mathematically?
5. What market behavior does the model reproduce?
6. How is the model calibrated?
7. What are its principal limitations?
8. Which models solve some of those limitations?
9. What three ideas should I remember?

Every model page should support this learning loop consistently.

---

## 5. Main application modes

### 5.1 Learn

Purpose: understand the model.

The page should progressively expose:

- historical motivation;
- intuition;
- mathematical formulation;
- assumptions;
- parameter interpretation;
- typical asset classes and products;
- known strengths;
- known limitations;
- related models;
- optional derivations.

Mathematical depth must be progressive.

Recommended hierarchy:

1. one-sentence intuition;
2. essential equations;
3. parameter explanations;
4. expandable derivation;
5. deeper numerical or theoretical notes.

The default view should never feel like a textbook page.

---

### 5.2 Explore

Purpose: develop intuition by changing parameters manually.

The user directly manipulates model parameters and market inputs.

Changes should update relevant visualizations with minimal perceived latency.

Examples:

- spot;
- strike;
- maturity;
- volatility;
- interest rate;
- dividend yield;
- Heston correlation;
- Heston mean reversion;
- SABR vol-of-vol.

The UI must connect each parameter to an observable consequence.

A parameter control should ideally include:

- symbol;
- human-readable name;
- current value;
- sensible range;
- one-line interpretation;
- visual consequence.

The user must understand that manual parameter exploration is **not calibration**.

---

### 5.3 Calibrate

Purpose: explain the inverse problem.

The application provides a market dataset or synthetic market scenario.

The user should see:

- the market observations;
- model parameters being calibrated;
- parameter bounds;
- objective function;
- selected quotes;
- weighting convention;
- initial guess;
- convergence state;
- calibrated parameters;
- model vs market fit;
- residuals.

Calibration must not be represented as a generic identical workflow for every model.

Each model should expose only calibration concepts that make sense for that model.

Examples:

- Black-Scholes: implied-volatility inversion;
- SABR: smile calibration for a maturity;
- Heston: surface calibration;
- Local Vol: surface-to-local-vol reconstruction;
- Rough Bergomi: stochastic-volatility calibration with expensive numerical pricing.

---

### 5.4 Compare

This mode may be introduced after the first models are complete.

Purpose: expose model risk.

The user should be able to compare two compatible models under the same market conditions.

Possible comparisons:

- implied-volatility smile;
- option prices;
- Greeks;
- terminal distributions;
- simulated paths;
- calibration residuals;
- responses to scenarios.

The key lesson is:

> Two models can fit the same vanilla market and still imply different dynamics or exotic prices.

---

## 6. Model lineage

Models should be connected through a visible conceptual graph.

The initial target lineage is:

```text
Black-Scholes
├── Local Vol
├── Heston
│   └── Rough Heston
├── Merton Jump Diffusion
└── Stochastic Local Vol

Black / Black-76
└── SABR

Heston / forward variance models
└── Rough Bergomi
```

This graph is conceptual, not a claim of strict historical derivation in every edge.

Each relation should explain *why* the models are connected.

Examples:

- `relaxes_constant_volatility`
- `adds_stochastic_volatility`
- `adds_jumps`
- `adds_path_dependence`
- `changes_underlying_state_variable`
- `uses_rough_volatility`

---

## 7. Initial model scope

### Milestone 1

Only:

- Black-Scholes.

The application shell and UX should already be close to production quality.

### Milestone 2

Add:

- Heston.

Use this milestone to discover genuinely reusable abstractions.

### Milestone 3

Add:

- Local Vol;
- Merton Jump Diffusion;
- SABR.

### Milestone 4

Add model comparison and model-risk workflows.

### Milestone 5

Advanced models:

- Rough Bergomi;
- optionally Rough Heston;
- optionally Stochastic Local Vol.

Do not implement advanced models until the simpler models and interaction patterns are stable.

---

## 8. Initial product scope: Black-Scholes vertical slice

The first complete version must support European calls and puts.

### Learn

Include:

- historical context;
- core assumptions;
- risk-neutral intuition;
- lognormal diffusion;
- Black-Scholes PDE;
- closed-form solution;
- implied volatility;
- limitations;
- links to Local Vol, Heston, and jump models.

### Explore

Inputs:

- option type;
- spot;
- strike;
- time to maturity;
- volatility;
- risk-free rate;
- continuous dividend yield.

Outputs:

- price;
- delta;
- gamma;
- vega;
- theta;
- rho.

Interactive visualizations:

- payoff at maturity;
- option value versus spot;
- one selectable Greek versus spot.

### Calibration

For Black-Scholes, teach implied-volatility inversion.

Inputs:

- market option price;
- option contract;
- market inputs except volatility.

Outputs:

- implied volatility;
- solver diagnostics;
- repriced option;
- pricing residual.

Explain clearly why this is different from calibrating a multi-parameter stochastic-volatility model.

---

## 9. UX principles

### Minimal by default

Only information required for the current task should be visible.

Advanced material must be expandable.

### Progressive disclosure

Show intuition before derivation.

Show one important chart before several secondary charts.

### Persistent context

The user should always be able to see:

- current model;
- current mode;
- essential model lineage;
- current market scenario.

### Immediate causality

When a parameter moves, the user should see what changed and why.

### Memory reinforcement

Every model should end with:

#### Remember these three things

Exactly three concise takeaways.

### Explicit transitions

Every model should include:

#### What this model still cannot explain

and:

#### Where to go next

This is central to the product.

### Responsive and keyboard-friendly

The app should work on desktop and tablet/mobile sizes.

The desktop experience is the priority for dense charts.

Controls must remain keyboard accessible.

---

## 10. Visual design direction

The product should feel:

- technical;
- quiet;
- precise;
- modern;
- minimal;
- not corporate-dashboard-like.

Avoid:

- excessive cards;
- gradients used as decoration;
- large KPI dashboards;
- unnecessary animations;
- visual noise;
- finance-terminal aesthetics.

Prefer:

- generous whitespace;
- strong typography;
- restrained borders;
- clear chart hierarchy;
- concise labels;
- mathematical notation rendered consistently.

Animations should communicate transitions, not decorate the page.

---

## 11. Data strategy

The initial application should use reproducible local datasets.

Examples:

- flat volatility surface;
- equity-index-like negative skew;
- FX-like smile;
- rate-like smile;
- jump/event-like scenario.

Datasets may be synthetic.

Synthetic data must be labelled as such.

Do not add live market-data integrations in the initial milestones.

Reasons:

- reproducibility;
- no licensing constraints;
- deterministic tests;
- no network dependency;
- simpler GitHub Pages deployment.

---

## 12. Non-goals

Until explicitly revisited, do not add:

- authentication;
- user accounts;
- databases;
- cloud persistence;
- real-time market data;
- portfolio management;
- trading or order execution;
- backtesting;
- microservices;
- Kubernetes;
- Kafka;
- Redis;
- production-scale distributed computing;
- machine learning;
- GPU requirements.

Any new infrastructure must be justified by a concrete product requirement or measured performance issue.

---

## 13. Success criteria

The project is successful if a user can:

- explain why Black-Scholes exists and what it assumes;
- explain why Heston was introduced after interacting with both;
- distinguish parameter exploration from calibration;
- understand why calibration fit does not eliminate model risk;
- manipulate parameters and immediately observe their effects;
- reproduce numerical results deterministically;
- navigate between related models without losing conceptual context.

As a portfolio project, the repository should also demonstrate:

- quantitative correctness;
- numerical testing;
- clean domain separation;
- thoughtful UX;
- restraint in architecture;
- documented engineering decisions.
