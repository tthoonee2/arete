# Remaining roadmap

This pass implements pricing extraction and tests, the prototype FastAPI quote service, CI, Budget lock and mobile/accessibility refinements. The following plan items remain:

1. **Production identity and persistence** — real sign-up/sign-in, organisations and roles, durable Postgres records, server-backed protection storage and multi-worker-safe idempotency.
2. **Basis lab** — invoice upload, supplier/OCR extraction, line-item parsing, benchmark mapping, basis estimates and diagnostics. Never fabricate an OCR result when extraction fails.
3. **Risk operations** — fixed-price swap structures, alerting, settlement ingestion and jobs, billing/payments and production risk-desk workflows.
4. **Market data** — licensed public/exchange integrations, provenance, delayed/live status, settlement history and production curve controls.
5. **Terrain and localisation** — real terrain data and camera behaviour, complete translation catalogues and locale-specific number formatting.
6. **Hardening** — authentication tests, rate limiting, CSP and security headers, accessibility audit with assistive technology, observability, deployment configuration and disaster recovery.

These items should be scheduled separately rather than inferred from the prototype UI.
