# Pattern Breathing (pb)

## Overview

A calm, browser-based breathing timer. No accounts, no tracking, no backend, no
medical claims — open a tab, pick a rate, and breathe. Currently ships a single
slow-paced (resonance-style) breathing timer with its own settings and local
stats; this is the lean base the repo is being grown into a **pattern-breathing**
app. Installable as an offline-capable PWA.

> History: a spinoff copy of a three-practice HRV app. The Stretch and Navi Kriya
> practices were stripped out, the surviving practice was rebranded **Pattern
> Breathing** (all HRV/Resonant/Forrest naming removed), and the storage envelope
> was flattened to a single practice. Pattern-breathing functionality itself is
> not implemented yet — this is still the resonance timer under a new name.

## Stack

- **Language / runtime:** TypeScript 5+, React 19, browser only.
- **Build:** Vite 8 (`vite.config.ts`), Tailwind CSS v4 via `@tailwindcss/vite`, PWA via `vite-plugin-pwa` (Workbox `generateSW`, auto-update). Deploy base path `/pb/`.
- **Test:** Vitest + Testing Library + jsdom (`vitest.setup.ts`). ~72 colocated test files (~742 tests).
- **Lint:** ESLint (`eslint.config.js`) — TypeScript + React Hooks + React Refresh.
- **Web APIs:** `AudioContext` (generated cues), `<dialog>` (modals), Page Visibility / Wake Lock, `localStorage`.
- **Commands:** `npm run dev` · `npm test` (watch) · `npm run test:run` (single pass) · `npm run lint` · `npm run build` · `npm run preview`.
- **Entry:** `index.html` → `src/main.tsx` → `src/app/App.tsx`. Version `0.0.0`.

## Repo map

| Path | Holds |
|------|-------|
| `src/app/` | React entry. `App.tsx` wires the page and owns session state; `ScreenRouter` routes `practice` / `learn` / `appSettings`. `PracticeScreen` + `PracticeSessionView` host the breathing surface (`BreathingSessionSurface`); `PracticeControlsView` / `PracticeSettingsView`; `appViewModel` + `useAppViewModel` + `useAppNavigation`; `sessionPresentation`, `setupCardSummary`, `appTestHarness`. `pages/` = `LearnPage` (About) + `AppSettingsPage`. |
| `src/components/` | UI: `BreathingRing` (fixed-size ring + progress arc, no scale animation) + readouts (`SessionReadout`, `FeedbackTime`), `PatternBreathingSettingsForm` + `Settings*` form parts, `SettingsSheet`, `SettingsStatsSection`, dialogs, `LearnAnchor`/`LearnPanel`, install steps, Theme/Timbre/Language pickers. `primitives/`, `icons/`. |
| `src/domain/` | Pure logic (barrel `index.ts`): `breathingPlan`, `sessionMath`, `sessionController`, `sessionLifecycle`, `sessionAudio`, `settings`. |
| `src/hooks/` | Session engine `useSessionEngine` (rAF lookahead) + `useBreathingSessionController`; audio-cue hooks, `useWakeLock`, `useTheme`, `useLocale`, `useBypassSilentMode`, `usePreferenceChoice`, `leadInCountdown`, PWA-install hooks, `lookaheadHeartbeat.worker.ts`. |
| `src/audio/` | Web Audio layer: `audioEngine`, `audioStatus`, `cueSynth`, `boundaryCueSynth` (lead-in tick + end chord), `timbres`, `sessionClock` (+ `swappableSessionClock`), `previewContext`, `silentLoopBypass`, `audioConstants`. |
| `src/content/` | Typed copy: `learnContent` (one placeholder "What is Pattern Breathing" block), `strings` (EN / PT-BR), `lockedCopy` (medical-advice + affiliation micro-lines). |
| `src/storage/` | Flat `localStorage` envelope (barrel `index.ts`): `storage` (read/write/version guard), `settings` (settings + mute), `stats` (stats + record/reset), `prefs`, `installDismissed`. No per-practice nesting. |
| `src/styles/` | `theme.css` ("Mono Zen" palette, light/dark) + favicon palette sync (`faviconPalette.ts`). |
| `index.html` | FOUC pre-paint script — hardcodes `STATE_KEY` `'pattern-breathing:state:v1'` + `prefs.theme` path (keep in sync with `storage.ts`). |
| `.github/workflows/deploy.yml` | Tag-triggered multi-version GitHub Pages deploy under `/pb/`. |

## Storage shape

Single flat envelope at `localStorage['pattern-breathing:state:v1']`:
`{ version, settings?, mute?, stats?, prefs? }`. No migration ladder (new app).
`storage.ts` keeps a cross-tab downgrade guard (refuses to overwrite a
future-`version` envelope). Same-tab pref changes broadcast on the
`'pattern-breathing:prefs-changed'` CustomEvent.

## Constraints

- **No backend / telemetry / analytics / third-party scripts.** Settings and stats stay in `localStorage` on-device.
- **Not medical advice** — guided breathing practice only; no diagnostic or clinical claims. The `medicalAdviceLine` + `affiliationLine` in `lockedCopy.ts` are claim-safe locked copy (byte-equality test).
- **Single session engine.** `useSessionEngine` (rAF lookahead) drives the timer.
- **TypeScript strict, no `any`.** See `AGENTS.md` language profile.
- **Wake Lock is progressive enhancement** — sessions must run correctly when it's unavailable (e.g. iOS < 18.4 standalone PWA, WebKit bug 254545).
- **Honor `prefers-reduced-motion`** — visual guide swaps animation for a static crossfade.
- **Multi-version Pages deploy:** tags are short form `vX.Y` (must match `package.json.version` first two segments); `versions.json` drives the root `official` redirect; the append-versions-json commit-back uses `[skip ci]`. See `deploy.yml` header.
