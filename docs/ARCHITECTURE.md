# Architecture

## Current prototype

The deployable site remains a single static HTML file assembled by `tools/build.py`. UI state, demo sign-in and protections are browser-local. The site executes the shared package in `packages/pricing/browser.js`; the legacy block in `src/app.js` is excluded from the generated bundle.

## Pricing

- Pure JavaScript functions for Black-76, Bachelier, forwards, volatility, probability, non-negative settlement and bill-range simulation.
- Paid protection only: every quote has a positive upfront premium, with no zero-cost structures, later customer charges or margin calls.
- Pure Python counterpart in `apps/api/pricing.py` with no framework or I/O dependencies.
- Shared market constants in `packages/pricing/markets.json`.
- High-precision normal CDF implemented consistently in both languages.
- Golden tests compare 200 deterministic randomized quotes within `1e-6`.

Every API quote carries `snapshot_id`, `model_version`, `curve_as_of` and `expires_at`. Market curves are explicitly marked `illustrative`. The API enforces strip bounds, strike ordering, positive lognormal strikes and per-market volume limits. Quote writes require an idempotency key.

## API

FastAPI exposes versioned REST routes and generates OpenAPI from code:

- `GET /v1/markets`
- `GET /v1/markets/{id}/curve`
- `POST /v1/quotes`

Snapshots and idempotency records are process-local in this prototype. Production requires Postgres or another durable shared store, real identity, organisation roles, live licensed curves and a hosted secret store.

## Frontend

Budget lock is a separate markup, controller and style component wired by the existing hash router. It prices paid protection with the same shared package as the quote builder, then transfers the selected market, budget price, volume and period into that builder. Responsive styles preserve 44px coarse-pointer targets, keyboard sliders, reduced motion, visible focus and printable quote/results layouts.

The landing scene embeds a Tripo-generated GLB and a sampled height grid from `src/mountain-assets.html` during the build. The builder uses a local generated cache when present and otherwise retrieves the public build-time source; the deployed HTML remains self-contained and makes no mountain model request. Three.js r128 and its vendored MIT-licensed GLTFLoader render the model with world-space rock/snow shading. Existing cloud, snow, waypoint, scroll and fine-pointer systems share the scene clock, while reduced-motion and WebGL failures retain the static layout.

## Quality gates

GitHub Actions runs syntax checks, JavaScript unit tests, Python/API tests, a production build and Chromium journey tests. Browser tests cover the main place-protection flow and Budget lock on desktop and mobile.
