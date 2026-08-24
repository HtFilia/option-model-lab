# Option Model Lab backend

This directory contains the stateless computation API. FastAPI validates transport payloads under
`app/api`; framework-independent numerical implementations live under `app/quant`.

## Local setup

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[dev]'
.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Development defaults allow only `http://localhost:5173` and `http://127.0.0.1:5173`. Override
server configuration with `APP_ENV`, `ALLOWED_ORIGINS`, and `LOG_LEVEL`; origins are comma-separated
and wildcards are rejected.

## Endpoints

- `GET /health` returns `{"status":"ok"}`.
- `POST /api/v1/heston/calibrate` fits the bounded call surface sent by the frontend.

The Heston request accepts 5–50 quotes, at most 120 optimizer iterations, maturities up to 10 years,
and explicit numerical bounds. Quote prices are checked against discounted call no-arbitrage bounds.

## Checks

```bash
.venv/bin/ruff check .
.venv/bin/ruff format --check .
.venv/bin/python -m pytest
docker build --tag option-model-lab-backend:local .
```

The container listens on port 8000 internally as a non-root user. Publishing or reverse-proxying
that port is a deployment concern; the Dockerfile does not expose it publicly.
