# Arête

Commodity price protection for businesses: caps, floors and zero-cost collars on exchange benchmarks, settled in cash every month.

> **Prototype.** Prices are indicative and generated in the browser. Nothing is bought or sold. Not an offer or financial advice.

## What's in the site

| Page | What it does |
|---|---|
| Overview | Real-time 3D Alpine terrain with a scroll-driven climb, platform overview, payout explainer |
| Price | Live quote builder: benchmark, volume, months, limit, cap, paid or zero-cost collar |
| Markets | 25 benchmarks (ICE, ICE Endex, LME, Platts/Argus-settled swaps) with 12-month curves |
| Risk desk | Book KPIs, coverage heatmap, mark-to-market, stress test, alerts, CSV export |
| Basis lab | Fit a supplier price to a benchmark: correlation, R², minimum-variance hedge ratio, basis risk |
| Developers | REST API reference with a console that runs the pricing engine in the browser |
| Institutions | White-label widget preview and embed snippet |
| Trust | Intended operating model, comparison, FAQ |

## Pricing model

- Monthly average-price options, Black-76 with a variance adjustment for averaging.
- Per-market forward curve with slope and seasonality; volatility term structure (Samuelson effect); quadratic skew in time-scaled log-moneyness.
- Regional spreads (PSV/THE/PEG vs TTF, diesel Med vs NWE, jet regrade) use a normal (Bachelier) model because they can go negative.
- Price = mid + bid/ask in volatility points + a fixed ticket fee per month. Zero-cost collars solve for the sold strike on the price grid.

## Repository layout

```
index.html                    built site (single file, deployable anywhere)
src/
  style.css                   design system
  body.html                   page markup
  app.js                      pricing engine, UI, 3D scene, platform modules
  terrain-assets.html         baked terrain (heights + textures) as data URIs
tools/
  build.py                    src/ -> index.html
  terrain/bake_procedural.py  current terrain: procedural + hydraulic erosion
  terrain/build_real_terrain.py  real Matterhorn from swisstopo (untested, see below)
  terrain/embed_assets.py     pack baked terrain into src/terrain-assets.html
.github/workflows/pages.yml   builds and deploys to GitHub Pages on push to main
```

## Run locally

Open `index.html` in a browser, or:

```bash
python -m http.server 8000   # then visit http://localhost:8000
```

## Deploy

Push to `main`, then in **Settings → Pages** set the source to **GitHub Actions**. The workflow rebuilds `index.html` from `src/` and publishes it.

## Making the mountain photoreal

The current terrain is procedural. For the real Matterhorn, use swisstopo's free data (swissALTI3D elevation + SWISSIMAGE aerial photos):

```bash
pip install -r tools/terrain/requirements.txt
python tools/terrain/build_real_terrain.py --out build/terrain
python tools/terrain/embed_assets.py build/terrain
python tools/build.py
```

`build_real_terrain.py` was written without access to the swisstopo API, so treat it as a starting point. Attribution required: © swisstopo.

## Licence

All rights reserved. No licence is granted to use, copy or distribute this code without permission.
