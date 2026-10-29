# Architecture

## Frontend and pricing

`src/` contains the original prototype markup, styling and controller. `tools/build.py` replaces the legacy pricing block with `packages/pricing/browser.js`, injects the Budget lock view, and appends accessibility and Budget lock controllers. The output remains a dependency-free single HTML file.

The shared JavaScript engine owns market definitions, forward curves, Black-76 and Bachelier pricing, monthly average-option approximation, continuous zero-cost collar solving, settlement and seeded bill-range simulation. `packages/pricing/markets.json` is the API's shared market-definition source.

## API

`apps/api/pricing.py` mirrors the JavaScript calculations. The golden suite compares both implementations across 200 deterministic cases at an absolute tolerance of `1e-6`.

`apps/api/main.py` provides validated FastAPI endpoints. Quotes include model and curve provenance and expire after 60 seconds. An idempotency key replays the original quote for an identical request and returns HTTP 409 if the key is reused with different inputs.

The current stores are deliberately small, process-local prototype components:

- No production authentication or tenant isolation.
- No durable quote, position or idempotency storage.
- No distributed locking, rate limiting or background workers.
- No live curve ingestion. All responses identify the data as illustrative.

## Accessibility and responsive UI

The enhancement layer adds numeric slider ARIA state, modal focus containment, keyboard Escape handling, visible focus styles, coarse-pointer target sizing, reduced-motion support, improved contrast, mobile layouts and print output. Browser journeys verify the main Budget lock and quote paths, including a 375px viewport overflow check.

## Delivery

GitHub Actions runs syntax checks, JavaScript tests, Python/API tests, the static build and Chromium browser journeys. GitHub Pages can build the static artifact with `python3 tools/build.py` and publish the repository root; generated `index.html` is not committed.

## CI configuration

The verified workflow configuration is supplied with this change as `ci.yml` in the repository root until the connected GitHub account grants workflow-file permission. Move it to `.github/workflows/ci.yml` to enable it.
