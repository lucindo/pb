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
- **Built-in event/session log for verifiable claims.** When a spike claims state is
  isolated/shared, or runs a multi-phase sequence, add an on-screen log so the behavior
  is observable, not just asserted (colour-coded for state spikes; timestamped phase
  transitions for sequence spikes).
- **Shared content component.** Switcher/navigation spikes keep the practice screen
  itself in one shared component so only the chrome under test differs.
- **Ref-held engine + mirrored state.** For timed/sequenced spikes, hold the mutable
  engine record in a `useRef` and mirror only the display fields into React state. Drive
  it with a self-rescheduling `setTimeout` chain.
- **Web Audio for cue sounds.** Synthesized oscillator tones (no audio files) are enough
  to validate sound design. Create the `AudioContext` lazily inside a user gesture (the
  first Start tap) — browser autoplay policy blocks earlier creation. Mirror the app's
  real synthesis path (`buildNKToneNodes` / `cueSynth`) so the spike audition matches what
  the production code can actually produce.
- **Measure the claim, don't trust the senses.** When a comparison spike's question is
  quantitative — "louder?", "longer?", "does it fit?" — compute a deterministic number,
  not an impression. Audio spikes (004/005) render each variant in an
  `OfflineAudioContext` and report true peak amplitude and −40 dB tail length; the
  switcher spike (007) computes per-pill width from real container padding. The verdict
  then rests on numbers + audition together.
- **Render candidates in their real context.** Comparison spikes show each candidate the
  way it will actually be seen — icons inside true iOS/Android mask shapes at home-screen
  sizes (006), the switcher inside true-size 320/360/390 px device frames in every theme
  and locale (007). Legibility-when-cropped / when-small is seen, not assumed.
- **Per-card shortlist toggle.** Comparison spikes give each candidate a `+ shortlist` /
  `+ picker` toggle plus a running summary of what is selected, so the operator's
  narrowing is captured in the harness.

## Tools & Libraries

- `react@19.0.0`, `react-dom@19.0.0` — from esm.sh.
- `htm@3.1.1` — JSX-like templating without a build step.
- Tailwind via `cdn.tailwindcss.com`, `darkMode: 'class'`.
- Web Audio API (built-in) for spike cue sounds — production routes through the app's
  own `src/audio/audioEngine.ts` instead.

## Domain notes (HRV app)

- Per-practice vs. shared-chrome split follows `src/domain/settings.ts`: session settings
  (bpm/ratio/duration/mode) are per-practice; theme/timbre/variant/cue/locale are
  app-wide.
- Navi Kriya's real mechanics are unspecified — spikes model it as a 2-knob stub.
