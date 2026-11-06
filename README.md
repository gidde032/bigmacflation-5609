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

The canonical cleaned data file is [`bigmac_clean.csv`](bigmac_clean.csv) at the repository root. A byte-for-byte copy for browser access is at [`static/data/bigmac_clean.csv`](static/data/bigmac_clean.csv); update this served copy when the source CSV changes. Its production URL is `/bigmacflation-5609/data/bigmac_clean.csv`.

## Adding a chart

Put reusable chart components and helpers under `src/lib`. Add a Svelte component (for example, `src/lib/components/PriceRankings.svelte`), import it into `src/routes/+page.svelte`, and replace the matching labeled placeholder with the component. Put browser-served assets or data under `static` and reference them using SvelteKit's `base` path when building URLs.

## GitHub Pages

The static build uses the production base path `/bigmacflation-5609`, outputs to `build/`, and includes a `404.html` fallback for Pages. The workflow in `.github/workflows/deploy.yml` is prepared for GitHub Pages; no deployment has been run from this setup session.
