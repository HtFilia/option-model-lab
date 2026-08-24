# Option Model Lab

[![Frontend and Pages](https://github.com/HtFilia/option-model-lab/actions/workflows/pages.yml/badge.svg)](https://github.com/HtFilia/option-model-lab/actions/workflows/pages.yml)
[![Backend CI](https://github.com/HtFilia/option-model-lab/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/HtFilia/option-model-lab/actions/workflows/backend-ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB)](https://www.python.org/)

**[Open the live interactive lab →](https://pricing.lucaslebihan.dev/)**

Option Model Lab is an interactive educational laboratory for understanding why option-pricing
models exist, how their parameters shape outputs, how calibration works, and where each model
fails. It currently covers Black–Scholes, Heston, Merton Jump Diffusion, SABR, and Local Vol through
Learn, Explore, Calibrate, and Compare experiences.

This is an educational project, not a trading platform or production pricer.

## Architecture at a glance

This repository is a small monorepo with independent tools:

```text
frontend/  React + TypeScript + Vite → static GitHub Pages site
backend/   FastAPI + Pydantic + NumPy/SciPy → stateless computation API
```

The browser remains the primary execution environment for fast and interactive calculations.
Black–Scholes, Greeks, implied-volatility inversion, model exploration, and visual transformations
do not need the API. The first remote slice is the measured, user-triggered Heston calibration:

```text
React → typed API client → POST /api/v1/heston/calibrate → Python engine
```

If the API is unavailable, the Heston screen explicitly uses the numerically matched TypeScript
engine in a Web Worker. The rest of the static application remains usable. The placement audit and
measurements are in [`docs/COMPUTATION_BOUNDARIES.md`](docs/COMPUTATION_BOUNDARIES.md).

## Run the frontend only

Requires Node.js 20.19 or newer.

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. This mode needs no DNS, Internet connection, VPS, certificate, or
reverse proxy. Remote Heston calibration falls back visibly to the browser implementation.

## Run the backend

Requires Python 3.12 or newer.

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[dev]'
.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Check `http://127.0.0.1:8000/health`. Interactive API documentation is available at `/docs` outside
production.

## Run the full local application

Start the backend as above in one terminal, then start the frontend in another. The committed Vite
development configuration automatically uses:

```text
http://localhost:5173 → http://127.0.0.1:8000
```

Local development never calls `api.pricing.lucaslebihan.dev` by default. Production builds use
`https://api.pricing.lucaslebihan.dev` through the single `VITE_API_BASE_URL` configuration
boundary. These public URLs are not secrets.

## Verify the frontend

```bash
cd frontend
npm ci
npm run typecheck
npm run lint
npm run format:check
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

The production output is `frontend/dist`. Numerical tolerances and their rationale are documented
in [`frontend/tests/NUMERICAL_TOLERANCES.md`](frontend/tests/NUMERICAL_TOLERANCES.md).

## Verify the backend

After installing `backend[dev]`:

```bash
cd backend
.venv/bin/ruff check .
.venv/bin/ruff format --check .
.venv/bin/python -m pytest
docker build --tag option-model-lab-backend:local .
```

The backend is stateless. Quantitative functions live under `backend/app/quant` and are tested
directly without HTTP; routes only validate and translate model-specific requests.

## Production boundaries

- `https://pricing.lucaslebihan.dev/` is a root-based static GitHub Pages build.
- `https://api.pricing.lucaslebihan.dev` is the intended public API address on the VPS.
- Caddy terminates HTTPS and reverse-proxies privately to FastAPI.
- GitHub Actions verifies frontend and backend independently; no workflow deploys to the VPS yet.

Deployment preparation is documented under [`deploy/`](deploy/). The governing product,
architecture, roadmap, and numerical conventions are in [`docs/`](docs/).
