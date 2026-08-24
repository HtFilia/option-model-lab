# Option Model Lab contributor guide

Before changing product or quantitative behavior, read the four specifications in `docs/`.

- Keep quantitative logic framework-independent and directly unit-testable.
- Follow `docs/QUANT_CONVENTIONS.md`; do not silently clamp invalid financial inputs.
- Prefer concrete Black–Scholes code over abstractions for future models.
- Keep educational copy outside large React components and use progressive disclosure.
- Preserve a fully static GitHub Pages build and hash-based navigation.
- Run type checking, linting, unit tests, the smoke test, and a production build for meaningful changes.
