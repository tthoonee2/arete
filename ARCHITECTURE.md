# Architecture

## Today (prototype)
Single static page. Everything runs in the browser: pricing engine, quote builder, risk desk, API console, 3D scene. State (demo sign-in, positions) lives in `localStorage`.

## Target
| Layer | Choice | Why |
|---|---|---|
| Web | Next.js or Astro, static marketing + app shell | Fast, SEO, component reuse |
| Pricing service | Python (FastAPI), the same Black-76/Bachelier engine | Keeps curves, vols and margin server-side |
| Market data | Licensed feeds: ICE, LME, Platts/Argus | Redistribution licences required for display |
| Auth | SSO/SAML + 2FA (e.g. Clerk, Auth0, WorkOS) | Institutional clients expect SSO |
| Database | Postgres (EU/CH region) | Quotes, positions, settlements, audit log |
| Hedging | Back-to-back on ICE/LME via a clearing broker | Desk never carries directional risk |
| Counterparty | Licensed partner bank or broker | Selling OTC options to SMEs needs authorisation |
| Settlement | Monthly batch on official averages; statements as PDF | Finance teams file statements |

## API (as shown in the Developers console)
- `GET /v1/markets`, `GET /v1/markets/{id}/curve`
- `POST /v1/quotes` — returns premium, breakdown, per-month detail, expiry
- `POST /v1/protections` — idempotent; status `pending_signature` → `active`
- `GET /v1/protections`, `GET /v1/settlements`
- Webhooks: `quote.expired`, `protection.placed`, `settlement.created`
