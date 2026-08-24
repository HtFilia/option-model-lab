# Option Model Lab contributor guide

Before changing product or quantitative behavior, read:

- `docs/PRODUCT.md`;
- `docs/ARCHITECTURE.md`;
- `docs/QUANT_CONVENTIONS.md`;
- `docs/ROADMAP.md`;
- `docs/COMPUTATION_BOUNDARIES.md` when changing execution placement.

## Shared rules

- Do not silently clamp invalid financial inputs.
- Keep educational copy outside large React components and use progressive disclosure.
- Prefer concrete, model-specific code over universal pricing, calibration, or transport abstractions.
- Keep the frontend fully static, root-deployable to GitHub Pages, and hash-routed.
- Do not make local development or the static site depend on production DNS or API availability.

## Frontend

- Keep frontend quantitative logic under `frontend/src/quant` framework-independent and directly unit-testable.
- Put API configuration and model-specific transport under `frontend/src/api`; do not fetch arbitrary URLs from React components.
- Keep fast, control-driven calculations local. Follow the documented placement audit before moving work remotely.
- For meaningful frontend changes, run type checking, linting, formatting verification, unit tests, the Playwright smoke test, and a production build from `frontend/`.

## Backend

- Keep FastAPI transport under `backend/app/api` and quantitative functions under `backend/app/quant`.
- Use Pydantic for explicit model-specific request limits; public expensive operations must be bounded server-side.
- Keep the service stateless and deterministic where practical. Do not add storage, authentication, queues, or deployment platforms without a demonstrated requirement.
- When TypeScript and Python overlap, maintain shared reference fixtures and documented numerical tolerances.
- For meaningful backend changes, run Ruff check/format verification and pytest from `backend/`; validate the Docker build when Docker is available.
