# Arête — name your price

A single-file commodity-protection prototype, now with a shared tested pricing core, a Budget lock journey and a FastAPI quote service. Market curves and volatility inputs are **illustrative**; this is not live market data or an execution venue.

## Run the prototype

```sh
npm run build
python3 -m http.server 4173
# open http://localhost:4173/index.html
```

The build assembles `index.html` from `src/` and `packages/pricing/browser.js`. `index.html` is generated and intentionally ignored. Open `#budget` for Budget lock, or `#price` for the original quote builder.

## Run the quote API

```sh
pip install -r apps/api/requirements.txt
uvicorn apps.api.main:app --reload
# OpenAPI: http://127.0.0.1:8000/docs
```

Endpoints:

- `GET /health`
- `GET /v1/markets`
- `GET /v1/markets/{market_id}/curve`
- `POST /v1/quotes` with an `Idempotency-Key` header

Quote responses carry a curve snapshot ID, model version, curve timestamp, quote expiry and `data_status: illustrative`. Snapshots and idempotency records are process-local and will be lost on restart; use one worker for local development. Set `ARETE_CORS_ORIGINS` to a comma-separated allowlist if a browser client needs cross-origin access.

## Verify

```sh
npm ci
npm run lint
npm test                 # pricing properties and golden values
npm run test:api         # API tests + 200 cross-language golden cases
npm run build
npx playwright install chromium
npm run test:browser     # Budget lock, quote journey, 375px mobile overflow
```

CI runs all of these checks on pull requests and pushes to `main`.

## Prototype boundaries

- Demo sign-in and protection records remain browser-local; production authentication and durable positions are not included.
- API quote snapshots are in-memory, not Postgres or Redis, and are unsuitable for multi-worker deployment.
- No live exchange data, invoices, payments, settlement jobs or real terrain data are connected.
- Black-76 / Bachelier pricing and bill simulations are illustrative and require independent model validation before financial use.

See [architecture](docs/ARCHITECTURE.md) and the [remaining roadmap](docs/ROADMAP.md).
