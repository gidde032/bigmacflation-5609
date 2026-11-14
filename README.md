# Big MacFlation

CSCI 5609 narrative visualization project using Svelte 5, SvelteKit 2, TypeScript, and D3 7.

## Prerequisites

- Node.js 20.19+ or 22.12+
- npm

## Commands

```sh
npm ci
npm run dev
npm run check
npm run build
npm test
npm run preview
```

`npm test` builds the static site and runs the dependency-free shell contract tests. The development server prints its local URL. `npm run preview` serves the static production build for local review.

Responsive CSS contract tests cover layout structure but do not replace a visual review. Check the rendered shell at 390 × 844 (portrait) and 844 × 390 (landscape) after layout changes.

## Data

The canonical CSV files, [`bigmac_clean.csv`](bigmac_clean.csv) and [`bigmac_cpi_merged.csv`](bigmac_cpi_merged.csv), live at the repository root, with byte-for-byte browser copies in `static/data/`. The merged file joins local Big Mac prices with the World Bank indicator FP.CPI.TOTL (Consumer price index, 2010 = 100); [`scripts/build_bigmac_cpi_merged.py`](scripts/build_bigmac_cpi_merged.py) rebuilds it from the cleaned Big Mac data and the checked-in CPI snapshot at [`scripts/world_bank_cpi.csv`](scripts/world_bank_cpi.csv). Saudi Arabia's 2004 `local_price` is corrected from 2.4 to 9.0 because 2.4 was the USD price, not the local-currency price.

The affordability map measures how many Big Macs one day of GDP per capita buys (GDP per capita ÷ 365 ÷ local Big Mac price); its country geometry comes from `world-atlas/countries-110m.json`, based on Natural Earth.

## Adding a chart

The three charts—`BumpChart`, `AffordabilityMap`, and `InflationComparison`—each have their own `.chart-region` in `src/routes/+page.svelte`. Add new chart components under `src/lib/components` and keep pure logic in `src/lib/*.ts`. Put browser-served assets or data under `static` and reference them using SvelteKit's `base` path when building URLs.

## GitHub Pages

The static build uses the production base path /bigmacflation-5609, writes the SvelteKit shell to build/index.html, and includes a 404.html fallback. The GitHub Pages workflow configures Pages, builds the site, and uploads only the build directory as the deployment artifact. In the repository’s Pages settings, set the deployment source to **GitHub Actions** so Pages serves that artifact rather than the branch README.
