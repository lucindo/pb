# Pattern Breathing (pb)

## Overview

A calm, browser-based breathing timer for slow-paced (resonance / HRV) breathing
practice. No accounts, no tracking, no backend, no medical claims — open a tab,
pick a rate, and breathe. The practice protocol is inspired by Forrest Knutson's
HRV teaching (independent and unaffiliated). Currently ships a single practice —
**HRV / Resonant** (resonance timer) with its own settings and local stats —
the lean base this repo is being repurposed onto for pattern-breathing work.
Installable as an offline-capable PWA.

> History: imported from a three-practice HRV app. The **Stretch** (BPM ramp) and
> **Navi Kriya** (OM-counting) practices were stripped out; only HRV survives. Some
> single-practice scaffolding from that abstraction is still vestigial (see PLAN.md).

## Stack

- **Language / runtime:** TypeScript 5+ (tsconfig targets `~6.0.2`), React 19, browser only.
- **Build:** Vite 8 (`vite.config.ts`), Tailwind CSS v4 via `@tailwindcss/vite`, PWA via `vite-plugin-pwa` (Workbox `generateSW`, auto-update).
- **Test:** Vitest 4 + Testing Library + jsdom (`vitest.setup.ts`). ~91 test files colocated next to source (~1000 tests).
- **Lint:** ESLint 10 (`eslint.config.js`) — TypeScript + React Hooks + React Refresh rule packs.
- **Key deps:** `react` / `react-dom` 19, `@fontsource-variable/inter`. No runtime backend deps.
- **Web APIs used:** `AudioContext` (generated cues), `<dialog>` (modals), Page Visibility / Wake Lock, `localStorage`.
- **Commands:** `npm run dev` · `npm test` (watch) · `npm run test:run` (single pass) · `npm run lint` · `npm run build` · `npm run preview`.
- **Entry:** `index.html` → `src/main.tsx` → `src/app/App.tsx`. Version `2.4.2`.

## Repo map

| Path | Holds |
|------|-------|
| `src/app/` | React entry. `App.tsx` wires the page and owns session state; `PracticeScreen` + `PracticeSessionView` host the breathing surface (`BreathingSessionSurface`); `PracticeControlsView` / `PracticeSettingsView`, `appViewModel` + nav hooks, `ScreenRouter`, `sessionPresentation`, `setupCardSummary`; `pages/` route screens (`Learn`, `AppSettings`, `Advanced`, `Stats`). |
| `src/components/` | UI: `OrbShape` (`orb-halo` / `minimal-rings` / `spiritual-eye`) + `CueGlyph` guide, readouts, `ResonantSettingsForm` + `Settings*` form parts, `SettingsSheet`, dialogs, `Learn` anchor/panel, install steps, and Theme/Cue/Orb/Ring/Timbre/Language pickers. `primitives/`, `icons/`. |
| `src/domain/` | Pure logic (barrel `index.ts`): `breathingPlan`, `sessionMath`, `sessionController`, `sessionLifecycle`, `sessionAudio`, `settings`. |
| `src/hooks/` | Session engine `useSessionEngine` (rAF lookahead) + `useBreathingSessionController`; audio-cue hooks, `useWakeLock`, `useTheme`, `useVisualCue`, `useFeatureFlags`, `useLocale`, `leadInCountdown`, PWA-install hooks, `lookaheadHeartbeat.worker.ts`. |
| `src/audio/` | Web Audio layer: `audioEngine`, `audioStatus`, `cueSynth`, `nkCueSynth` (HRV lead-in tick + end chord — name is vestigial), `timbres`, `sessionClock` (+ `swappableSessionClock`), `previewContext`, `silentLoopBypass`, `audioConstants`. |
| `src/content/` | Typed copy: `learnContent`, `strings` (EN / PT-BR), `lockedCopy`. |
| `src/storage/` | `localStorage` wrappers (barrel `index.ts`): `practices` (per-practice settings + stats, single `resonant` slice), `settings`, `stats`, `prefs`, `installDismissed`, `storage`. |
| `src/styles/` | `theme.css` ("Mono Zen" palette, light/dark) + favicon palette sync (`faviconPalette.ts`). |
| `src/featureFlags.ts` | Query-param flags: `switcherIcon` (consumer deleted — vestigial), `breathingShape`, `orbIdle`, `ringCue`, `bypassSilentMode`. |
| `.github/workflows/deploy.yml` | Tag-triggered multi-version GitHub Pages deploy. |
| `dist/` | Build output (gitignored content). |

## Constraints

- **No backend / telemetry / analytics / third-party scripts.** Settings and stats stay in `localStorage` on-device.
- **Not medical advice** — guided breathing practice only; no diagnostic or clinical claims in copy.
- **Single session engine.** `useSessionEngine` (rAF lookahead) drives the breathing timer. The earlier second engine (`useNKEngine`, setTimeout metronome for Navi Kriya) was removed with that practice.
- **TypeScript strict, no `any`.** See `AGENTS.md` language profile (strict tsconfig, discriminated unions, Result types at boundaries, refactor functions over 70 lines).
- **Wake Lock is progressive enhancement** — sessions must run correctly when it's unavailable (e.g. iOS < 18.4 standalone PWA, WebKit bug 254545).
- **Honor `prefers-reduced-motion`** — visual guide swaps animation for a static crossfade.
- **Multi-version Pages deploy:** tags are short form `vX.Y` (must match `package.json.version` first two segments); `versions.json` drives the root `official` redirect; the append-versions-json commit-back uses `[skip ci]` and the workflow has no `push: branches` trigger (loop guard). See `deploy.yml` header warning.
