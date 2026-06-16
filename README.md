# Pattern Breathing

A calm, browser-based breathing timer. No accounts, no tracking, no backend — open
a tab, pick a pattern, and breathe. Installable as an offline-capable PWA.

## Patterns

Each round runs four phases — **in · hold · out · hold** — guided by a ring and
optional sound cues. Three presets ship built in:

- **Box-4** — an even four-count through every phase.
- **4-7-8** — in for four, hold for seven, out for eight.
- **1-4-2** — a one-four-two ratio you stretch with the **Scale** control.

Change any field for a custom pattern. Set a fixed number of rounds, or leave it
open-ended.

## Develop

```
npm install
npm run dev        # Vite dev server
npm run test:run   # single test pass (npm test = watch)
npm run lint
npm run build      # production build
npm run preview
```

Stack: TypeScript, React 19, Vite 8, Tailwind v4, `vite-plugin-pwa`. Tests run on
Vitest + Testing Library + jsdom.

## Privacy

Everything stays in `localStorage` on your device — no backend, telemetry,
analytics, or third-party scripts. Guided breathing only; not medical advice.

## Deploy

Tag-triggered multi-version GitHub Pages deploy under `/pb/`
(see `.github/workflows/deploy.yml`).
