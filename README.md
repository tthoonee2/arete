# Arête

Commodity price protection for businesses: paid caps and floors on exchange benchmarks, with the full premium due upfront and cash settlement every month.

> **Prototype.** Prices and curves are illustrative. Nothing is bought or sold. Not an offer or financial advice. The static site still uses browser-local demo accounts and positions; production auth and persistence are not included in this pass.

## Product pages

| Page | What it does |
|---|---|
| Overview | Alpine terrain, platform overview and payout explainer |
| Price | Paid-protection quote builder with 25 markets, volume, month range, limit and optional payout cap |
| Budget lock | Cost and payout chance for a budgeted price, plus an 80% bill-range chart |
| Markets | Forward curves for 25 exchange benchmarks |
| Risk desk | Book KPIs, coverage, mark-to-market, stress test, alerts and CSV export |
| Basis lab | Correlation, R², minimum-variance hedge ratio and residual basis risk |
| Developers | API reference and an in-browser console |
| Institutions | White-label widget preview connected to the quote flow |
| Trust | Intended operating model, comparison and FAQ |

## Engineering layout

```text
index.html                       generated single-file site
src/
  body.html                      existing page markup
  budget.html                    Budget lock component
  app.js                         legacy UI, charts, desk and 3D scene
  budget.js                      Budget lock controller
  accessibility.js               keyboard, slider and dialog improvements
  style.css                      original design system
  improvements.css               responsive, print and Budget lock styles
  mountain-assets.html           local generated mountain cache (not committed)
  vendor/GLTFLoader.js           local Three.js r128 loader cache (not committed)
packages/pricing/
  browser.js                     shared pure JavaScript pricing engine
  markets.json                   shared market definitions for JS and Python
  test/pricing.test.js           parity, bounds, monotonicity and upfront-premium tests
apps/api/
  main.py                        FastAPI markets, curves and quotes
  pricing.py                     pure Python pricing counterpart
  tests/                         API tests and 200-case JS golden suite
tools/build.py                   assembles index.html from source modules
tests/journey.spec.js            browser journey and mobile checks
.github/workflows/ci.yml         lint, unit, API, build and browser CI
.github/workflows/pages.yml      builds and deploys the static site
```

The build removes the legacy pricing block from the executed bundle and uses `packages/pricing/browser.js` as the single browser implementation. Both engines use the same high-precision normal CDF and support paid protection only. Every quote requires a positive upfront premium; zero-cost structures and later customer payments are not supported. API quotes include a curve snapshot ID, model version, curve timestamp and server expiry.

## Run the site

```bash
python tools/build.py
python -m http.server 8000
# open http://localhost:8000
```

Opening the generated `index.html` directly also works. GitHub Pages rebuilds it during deployment, so a generated local copy does not need to be committed with every source change.

## Run the API

```bash
python -m pip install -r apps/api/requirements.txt
uvicorn apps.api.main:app --reload
# OpenAPI: http://localhost:8000/docs (if using port 8000)
```

Example:

```bash
curl -X POST http://localhost:8000/v1/quotes \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: example-quote-001' \
  -d '{"market":"brent","side":"ceiling","structure":"paid","limit":72.5,"cap":88,"volume_per_month":8000,"start_month":1,"months":6}'
```

Endpoints:

- `GET /health`
- `GET /v1/markets`
- `GET /v1/markets/{id}/curve`
- `POST /v1/quotes` (requires `Idempotency-Key`)

The in-memory idempotency and snapshot stores are suitable for local development only. Replace them with durable shared storage before running multiple production workers.

## Verification

```bash
npm install
npm run lint
npm test
npm run test:api
npm run build
npx playwright install chromium
npm run test:browser
```

The browser tests cover Budget lock calculation and quote transfer, the main price-to-protection-to-risk-desk journey, keyboard slider attributes, and a 375px mobile overflow check.

## Mountain scene

The landing page renders a 23,262-triangle alpine horn generated with Tripo API and embedded as a GLB during the build. `src/mountain-assets.html` and `src/vendor/GLTFLoader.js` are local caches; when either is absent, the builder retrieves the public mountain source or the pinned Three.js r128 loader source recorded in `tools/build.py`. The deployed HTML is self-contained and makes no mountain model or loader request. A sampled 256×256 height grid aligns camera collision and waypoints with the model. World-space granite/snow shading, clouds, snow particles, ambient motion, scroll choreography and fine-pointer parallax run in Three.js; no mountain textures are downloaded. The scene retains a static fallback for reduced motion or unavailable WebGL.

## Licence

All rights reserved. No licence is granted to use, copy or distribute this code without permission.
