# Option Model Lab

[![Verify and deploy](https://github.com/HtFilia/option-model-lab/actions/workflows/pages.yml/badge.svg)](https://github.com/HtFilia/option-model-lab/actions/workflows/pages.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](https://www.typescriptlang.org/)
[![Static deployment](https://img.shields.io/badge/deployment-GitHub%20Pages-222222)](https://pricing.lucaslebihan.dev/)

**[Open the live interactive lab →](https://pricing.lucaslebihan.dev/)**

An interactive educational laboratory for understanding why option-pricing models exist, how their parameters shape outputs, how calibration works, and where each model fails.

The laboratory currently covers Black–Scholes, Heston, Merton Jump Diffusion, SABR, and Local Vol through four modes:

- **Learn** — motivation, assumptions, risk-neutral dynamics, formulas, derivation path, implied volatility, and limitations through progressive disclosure.
- **Explore** — Black–Scholes prices and Greeks, Heston stochastic-variance intuition, Merton jump risk, SABR forward smiles, and Local Vol surface-to-diffusion behavior.
- **Calibrate** — scalar Black–Scholes inversion, bounded Heston and Merton fits, fixed-β SABR smile fitting, and Local Vol surface reconstruction with visible interpolation and differentiation error.
- **Compare** — match Black–Scholes to one Heston at-the-money quote, then expose price, smile, and spot-scenario disagreement.

This is an educational project, not a trading platform or production pricer.

## Run locally

Requires Node.js 20.19 or newer.

```bash
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite. Navigation uses URL hashes, so the static GitHub Pages build does not require server rewrites.

## Quality checks

```bash
cd frontend
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Numerical tolerances and their rationale are documented in [`frontend/tests/NUMERICAL_TOLERANCES.md`](frontend/tests/NUMERICAL_TOLERANCES.md).

## Architecture

Quantitative logic lives in `frontend/src/quant` and has no React dependency. Feature-level transformations build charts and comparisons from concrete model functions; there is deliberately no universal pricing-model or calibration abstraction. Heston uses Fourier quadrature, Merton uses a Poisson mixture, SABR uses the Hagan approximation with Black-76, and Local Vol reconstructs Dupire volatility from a constrained SSVI total-variance surface. Only the heavier Heston calibration needs a model-specific Web Worker. Educational copy remains in structured content modules rather than large React components.

The application is fully static. The Pages workflow installs from `frontend/package-lock.json`, type-checks, lints, runs unit and smoke tests, builds for the custom-domain root, and deploys `frontend/dist` using GitHub's standard Pages permissions.

The governing product, architecture, and numerical conventions are in [`docs/`](docs/).
