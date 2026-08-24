# Option Model Lab — Architecture

## 1. Architectural objective

The initial application must be fully static and deployable through GitHub Pages.

"Static" means that the hosting layer serves HTML, CSS, JavaScript, and assets.

It does **not** mean the application is non-interactive.

Pricing, Greeks, lightweight simulations, calibration, and chart updates may execute locally in the browser.

The architecture should optimize for:

- simplicity;
- deterministic behavior;
- fast interaction;
- testability;
- separation of quantitative logic from presentation;
- easy GitHub Pages deployment;
- gradual evolution only when justified.

---

## 2. Initial technology direction

Recommended initial stack:

- React;
- TypeScript;
- Vite;
- KaTeX for mathematics;
- a mature browser charting library;
- Vitest for unit tests;
- Playwright for a small number of end-to-end smoke tests;
- Markdown or MDX for educational content where appropriate;
- GitHub Actions;
- GitHub Pages.

Do not introduce a backend in the initial architecture.

Do not introduce WebAssembly in the initial architecture.

Do not introduce Web Workers until a measured computation would otherwise hurt UI responsiveness.

---

## 3. Architectural principle

The most important dependency direction is:

```text
UI / Features
      │
      ▼
Quantitative domain
```

The quantitative domain must not depend on React.

The React application may call the quant engine.

The quant engine must be usable from a TypeScript test without mounting any UI.

For example, code conceptually equivalent to this must be possible:

```ts
const result = priceBlackScholes(option, market);
```

No pricing equation should live inside a React component.

---

## 4. Suggested initial repository structure

This is a starting point, not a mandatory final structure.

```text
option-model-lab/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router/
│   │   └── layout/
│   │
│   ├── quant/
│   │   ├── instruments/
│   │   ├── market/
│   │   ├── models/
│   │   │   └── black-scholes/
│   │   ├── pricing/
│   │   ├── calibration/
│   │   ├── risk/
│   │   └── numerical/
│   │
│   ├── features/
│   │   ├── learn/
│   │   ├── explore/
│   │   ├── calibrate/
│   │   └── compare/
│   │
│   ├── components/
│   ├── content/
│   │   └── models/
│   └── styles/
│
├── tests/
├── docs/
│   ├── PRODUCT.md
│   ├── ARCHITECTURE.md
│   ├── QUANT_CONVENTIONS.md
│   └── ROADMAP.md
├── AGENTS.md
├── package.json
├── vite.config.ts
└── .github/
    └── workflows/
```

Codex may propose a smaller structure for the first vertical slice.

Prefer fewer folders until multiple concepts genuinely require separation.

---

## 5. Domain boundaries

### 5.1 Instruments

Responsible for contracts.

Initial object:

- European option.

Typical fields:

- call or put;
- strike;
- time to maturity.

Do not embed market state or model parameters in the instrument.

---

### 5.2 Market state

Responsible for observable market inputs.

Initial fields:

- spot;
- risk-free rate;
- continuous dividend yield.

Volatility is model-dependent in interpretation.

For Black-Scholes, volatility may be supplied as a model parameter or as an implied-volatility result.

---

### 5.3 Models

A model defines a stochastic or pricing assumption.

Do not assume every future model has:

- the same parameter structure;
- an analytic price;
- a simulation;
- the same calibration procedure;
- the same Greeks implementation.

Avoid a large inheritance hierarchy.

Start with concrete implementations.

Only extract interfaces after at least two models demonstrate a real common abstraction.

---

### 5.4 Pricing

Pricing algorithms should be distinguishable from models where useful.

Future examples include:

- analytic formula;
- Fourier integration;
- Monte Carlo;
- finite differences.

A model and a numerical method are not necessarily the same concept.

Avoid architecture that assumes `one model = one pricer`.

---

### 5.5 Calibration

Calibration is an inverse problem.

Different models may expose fundamentally different calibration workflows.

The calibration layer should eventually represent:

- observed target data;
- objective function;
- parameter bounds;
- initial guess;
- optimizer;
- diagnostics;
- calibrated result.

Do not build a generic framework before the Black-Scholes implied-volatility workflow and Heston calibration reveal the required abstractions.

---

### 5.6 Risk

The risk layer contains Greeks and sensitivity calculations.

For Black-Scholes, analytic Greeks are preferred.

Later models may use:

- analytic formulas;
- finite differences;
- automatic differentiation;
- Monte Carlo estimators.

The API should not prematurely assume all Greeks are computed by the same method.

---

## 6. Model metadata

The application will eventually need structured metadata describing models.

Examples:

- display name;
- family;
- parameter definitions;
- capabilities;
- related models;
- assumptions;
- limitations.

Do not create an over-general model registry in Milestone 1.

For Black-Scholes, a simple local definition is sufficient.

After Heston is implemented, review duplication and introduce metadata only where it removes real repetition.

---

## 7. Educational content

Long-form educational content must not be embedded directly in large React components.

Content may be stored as Markdown/MDX or structured content files.

Interactive components may reference this content.

A possible later organization is:

```text
src/content/models/
├── black-scholes/
│   ├── overview.md
│   ├── assumptions.md
│   ├── calibration.md
│   └── limitations.md
└── heston/
```

Do not fragment tiny pieces of content into many files merely to satisfy this example.

Optimize for readability.

---

## 8. State management

Start with React local state and composition.

Do not introduce Redux.

Do not introduce Zustand until state genuinely needs to be shared across distant features.

Market-scenario state may later justify a lightweight global store.

That decision must follow observed complexity.

---

## 9. Performance strategy

The application should remain responsive while calculations run.

Use the following escalation path:

### Tier 1 — Main thread

Use for calculations that are effectively instantaneous:

- Black-Scholes;
- analytic Greeks;
- small vectorized chart calculations;
- lightweight implied-volatility inversion.

### Tier 2 — Web Worker

Introduce when calibration or simulation produces visible UI blocking.

Workers should communicate through typed request/result messages.

The UI must display calculation state instead of freezing.

### Tier 3 — Algorithmic optimization

Before changing languages:

- profile;
- reduce repeated work;
- reuse computed quantities;
- vectorize loops where appropriate;
- use typed arrays;
- use common random numbers where relevant.

### Tier 4 — WebAssembly

Consider Rust/WASM only for a demonstrated bottleneck such as advanced Monte Carlo or rough-volatility simulation.

### Tier 5 — Backend

A remote computation service is a last architectural escalation.

It requires a concrete need that cannot reasonably be met in-browser.

The existence of advanced mathematics alone is not sufficient justification.

---

## 10. GitHub Pages deployment

The application must build to static assets.

Vite base-path handling must support project pages such as:

```text
https://<user>.github.io/<repository>/
```

Routing must work when deployed below a repository subpath.

Prefer routing that does not require server-side URL rewrites unless the GitHub Pages deployment explicitly handles fallback behavior.

The production build must be testable locally before deployment.

GitHub Actions should:

1. install dependencies from the lockfile;
2. run type checking;
3. run linting;
4. run unit tests;
5. build the application;
6. deploy the build artifact to GitHub Pages.

Deployment must not require secrets beyond GitHub's normal Pages permissions.

---

## 11. Numerical computation and charts

Charts must consume numerical results from the quant layer or a dedicated feature-level transformation layer.

Chart components must not independently reimplement pricing equations.

For chart curves, prefer batched calculations that reuse invariant inputs.

Example:

```text
spot grid
   ↓
quant pricing function
   ↓
series of prices / Greeks
   ↓
chart
```

---

## 12. Error handling

Quantitative functions should validate obvious invalid inputs and return or throw typed errors consistently.

Examples:

- non-positive spot;
- non-positive strike;
- negative time to maturity;
- negative volatility where invalid;
- market option price outside no-arbitrage bounds during implied-vol inversion.

The UI should turn quantitative validation errors into educational messages.

Do not silently clamp financially invalid inputs unless the UI explicitly documents that behavior.

---

## 13. Testing strategy

### Unit tests

The quant engine should have strong deterministic coverage.

Initial Black-Scholes tests must include:

- known reference prices;
- call-put parity;
- analytic Greeks versus finite-difference approximations;
- limiting behavior;
- invalid inputs;
- implied-volatility inversion.

### Component tests

Use sparingly for important interaction logic.

### End-to-end tests

Keep the initial Playwright suite small.

Example smoke flow:

1. open Black-Scholes Explore;
2. change volatility;
3. verify option price changes;
4. change option type;
5. navigate to Calibrate;
6. solve for implied volatility.

### Numerical tolerances

Tests must use explicitly documented absolute or relative tolerances.

Do not use arbitrary broad tolerances merely to make tests pass.

---

## 14. Accessibility

Interactive controls must:

- have labels;
- be keyboard accessible;
- expose meaningful value text;
- not communicate meaning through color alone.

Charts should have titles and textual interpretation.

Mathematical notation should not be the sole explanation of a concept.

---

## 15. Security and privacy

The initial application has:

- no authentication;
- no personal data;
- no persistent user storage requirement;
- no backend.

Avoid introducing analytics or third-party scripts unless explicitly requested later.

---

## 16. Architecture decision rule

Before adding infrastructure, ask:

> Which current product requirement or measured engineering problem does this solve?

If the answer is hypothetical future scale, do not add it.

The architecture should demonstrate deliberate restraint.

---

## 17. Post-Heston abstraction review

Heston is the second implemented model and provides the first evidence for reviewing shared concepts. The review deliberately keeps the quantitative implementations concrete:

- Black–Scholes pricing, Greeks, and implied-volatility inversion remain in their own quant modules.
- Heston characteristic-function pricing, seeded path generation, and bounded calibration remain Heston-specific.
- No universal `PricingModel`, generic optimizer framework, or model plugin registry is introduced.

The repetition that is currently safe and useful to share is limited to presentation-level controls, chart styling, European option and market-state types, and model-aware navigation. These are common user-interface and contract concepts rather than claims that every future model has the same pricing or calibration API.

The Heston calibration runs in a model-specific Web Worker because the deterministic bounded fit takes long enough to create a visible main-thread pause. This is a measured Tier 2 performance use, not infrastructure for hypothetical future models.

Revisit the abstraction boundary only after another implemented model exposes concrete duplication in pricing, calibration diagnostics, or model metadata.

---

## 18. Initial comparison workflow

The first Compare experience is a feature-level composition of the existing concrete quant APIs. It does not define a shared model interface.

The comparison transformation:

1. prices one at-the-money call with Heston;
2. solves the equivalent Black–Scholes implied volatility;
3. holds that scalar volatility fixed;
4. evaluates both existing pricers across strikes and spot scenarios;
5. returns presentation-ready series to React.

This boundary keeps pricing and inversion independently testable, prevents chart components from reimplementing equations, and makes the experiment reproducible. The comparison is light enough for the main thread and therefore does not use the calibration worker.

---

## 19. Merton Jump Diffusion boundary

The third model retains the concrete architecture established by Black–Scholes and Heston:

- the Poisson-mixture pricer and terminal-density calculation are framework-independent quant functions;
- smile, density, jump-count, fixture, and calibration transformations live in one Merton feature module;
- educational copy remains in one structured content module;
- React owns only controls, disclosure, and presentation.

The Merton calibration uses a bounded coordinate search local to this model. Its small deterministic fixture completes without a perceptible pause, so it remains on the main thread. This does not justify extracting the Heston simplex search into a generic optimizer or moving all calibration into workers.

## 20. SABR boundary

SABR remains distinct from the equity spot models:

- `src/quant/sabr.ts` accepts a forward, strike, maturity, discount factor, and concrete α, β, ρ, ν parameters without importing React;
- it returns the Hagan lognormal implied-volatility approximation and prices European options with Black-76;
- smile, maturity-slice, fixture, and bounded one-expiry calibration transformations live in `src/features/sabrLab.ts`;
- the React views own only local interaction state and presentation.

The first SABR slice implements neither shifted nor normal SABR. It therefore rejects nonpositive forwards and strikes explicitly. Calibration fixes β and fits α, ρ, and ν to equal-weight volatility RMSE. The small deterministic coordinate search runs synchronously because it completes without a visible pause; it does not share a generic optimizer with Heston or Merton.

## 21. Local Vol boundary

Local Vol is surface-driven rather than parameter-calibrated:

- `src/quant/localVol.ts` implements constrained SSVI total variance, its analytic derivatives, and the forward-log-moneyness Dupire formula without React;
- `src/features/localVolLab.ts` owns deterministic sparse quotes, total-variance interpolation, finite-difference reconstruction, and chart transformations;
- the React views own only surface controls, reconstruction settings, and presentation.

The controlled synthetic source uses power-law SSVI with \(\phi(\theta)=\eta/\sqrt{\theta}\). It validates sufficient calendar and butterfly-arbitrage margins through five years. Sparse quotes are interpolated by a four-by-four tensor Lagrange polynomial in log-moneyness and square-root time. Centered finite differences reconstruct first and second derivatives. Invalid calendar growth or density is reported rather than clamped.

This slice does not add a local-vol PDE solver. Vanilla values are read consistently from the source implied surface with Black–Scholes, while the numerical model implementation is the Dupire surface-to-local-vol reconstruction itself. A PDE or Monte Carlo path engine should be added only when a later comparison or exotic-learning experiment requires dynamics-based repricing.
