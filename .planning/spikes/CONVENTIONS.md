# Spike Conventions

Patterns and stack choices established across spike sessions. New spikes follow these
unless the question requires otherwise.

## Stack

- **Single self-contained `index.html` per spike.** No build step, no `npm install`.
- **React 19 + htm + Tailwind, all from CDN** — `react@19.0.0` and `react-dom@19.0.0`
  from esm.sh, `htm@3.1.1` for JSX-like syntax without a transpiler, Tailwind from
  `cdn.tailwindcss.com` with `darkMode: 'class'`.
- This mirrors the real app's stack (React 19 + Tailwind 4) closely enough to make spike
  UI feel representative, while staying buildless and disposable.

## Structure

- One spike = one directory `.planning/spikes/NNN-name/` with `index.html` + `README.md`.
- Run a spike with `open .planning/spikes/NNN-name/index.html` — network needed on first
  open for the CDN imports.

## Patterns

- **Comparison spikes use a harness bar.** When comparing UX variants, render all
  variants in one file with a top "harness bar" that swaps between them — a true live
  head-to-head beats separate files. The harness bar is visually distinct (dark) and
  labelled as NOT part of the product.
- **Built-in event log for state-isolation claims.** When a spike claims state is
  isolated/shared, add an on-screen colour-coded event log so the claim is observable,
  not just asserted.
- **Shared `PracticeContent`.** Switcher/navigation spikes keep the practice screen
  itself in one shared component so only the chrome under test differs.

## Domain notes (HRV app)

- Per-practice vs. shared-chrome split follows `src/domain/settings.ts`: session settings
  (bpm/ratio/duration/mode) are per-practice; theme/timbre/variant/cue/locale are
  app-wide.
- Navi Kriya's real mechanics are unspecified — spikes model it as a 2-knob stub.
