# Map — Pattern Breathing (pb)

## Overview

A browser-based pattern-breathing timer. The user picks a named preset (Box-4,
Weiss/4-7-8, 1-4-2) or dials a custom four-phase pattern — inhale, hold-in,
exhale, hold-out, each a whole-second duration scaled by a `multiplier` — sets a
round count or open-ended, and breathes along with per-phase audio and visual
cues. No accounts, no backend: settings and stats live in `localStorage`.
Installable as an offline-capable PWA, and wrapped as native desktop installers
by a separate CI workflow. Bilingual EN / PT-BR.

## Stack

- **Language / runtime:** TypeScript (`~6.0.2`, strict), React 19, browser only, ES2023.
- **Build:** Vite 8 (`vite.config.ts`), Tailwind CSS v4 via `@tailwindcss/vite`,
  PWA via `vite-plugin-pwa` (Workbox `generateSW`, `autoUpdate`). Base path `/pb/`.
- **Test:** Vitest + Testing Library + jsdom. Config in `vite.config.ts`; setup in
  `vitest.setup.ts`. Tests are colocated (`*.test.ts` / `*.test.tsx`).
- **Lint:** ESLint (`eslint.config.js`) — typescript-eslint + React Hooks + React Refresh.
- **Web APIs:** `AudioContext`, `<dialog>`, Page Visibility, Wake Lock, Web Worker, `localStorage`.
- **Deps:** `react`, `react-dom`, `@fontsource-variable/inter` (self-hosted). No others.
- **Commands:** `npm run dev` · `npm test` (watch) · `npm run test:run` · `npm run lint` · `npm run build` · `npm run preview`.
- **Entry:** `index.html` → `src/main.tsx` → `src/app/App.tsx`.

## Repo map

| Path | Holds |
|------|-------|
| `src/app/` | React composition. `App.tsx` (shell) → `ScreenRouter` routes `practice`/`learn`/`appSettings`. `PracticeScreen` + `PracticeSessionView` + `BreathingSessionSurface` host the session; `PracticeControlsView`, `PracticeSettingsView`, `EndSessionDialogView`. State via `useAppViewModel` (+ `useStatsPanel`, `useBreathingPrimaryClick`) and `useAppNavigation`; pure builders in `appViewModel`, `sessionPresentation`, `setupCardSummary`. `pages/` = `LearnPage`, `AppSettingsPage`. `appTestHarness.ts` seeds state for tests. |
| `src/domain/` | Pure logic, no upward imports; barrel `index.ts`. `settings.ts` (`BreathPhase`, `PatternSettings`, bounds, coercers, defaults), `presets.ts` (`PRESETS`, `resolvePreset`, `applyPreset`), `breathingPlan.ts`, `sessionMath.ts` (`getSessionFrame`, `getCompletionSec`), `sessionController.ts`, `sessionLifecycle.ts`, `sessionAudio.ts`. |
| `src/hooks/` | `useSessionEngine` (rAF lookahead) + `useBreathingSessionController`; audio via `useAudioCues` → `useCueScheduler` + `useAudioHealth`; `leadInCountdown`, `lookaheadHeartbeat.worker.ts`. Prefs/env: `useTheme`, `useLocale`, `useBypassSilentMode`, `usePreferenceChoice`, `usePrefersReducedMotion`, `useWakeLock`, `useFavicon`, `useUiStringsContext`, `useBeforeInstallPrompt`, `useIsStandaloneOrPhone`. |
| `src/audio/` | Web Audio layer. `audioEngine` (scheduling, lookahead, `SAFE_LEAD_SEC`) over `cueStore` (in-flight set, prune/cancel/dedup); `cueSynth` (per-phase strikes + sustained hold pad + shared tone-node builders), `boundaryCueSynth` (lead-in tick, end chord), `timbres`, `sessionClock` + `swappableSessionClock`, `audioStatus`, `previewContext`, `silentLoopBypass`, `audioConstants`. |
| `src/components/` | UI. `BreathingRing` (fixed ring, `ProgressArcLayer`, `HoldProgressBar`, phase label), `SessionReadout`, `FeedbackTime`, `SetupCard`, `SessionActionRow`, `SessionCompletionHeadline`. Settings: `PatternBreathingSettingsForm`, `SettingsSheet`, `SettingsPanelBody`, `SettingsStatsSection`, `Settings*` row/stepper/toggle parts. Dialogs: `ConfirmDialog`, `EndSessionDialog`, `useModalDialog`. Pickers: Theme/Timbre/Language. `IosInstallSteps`, `LearnAnchor`/`LearnPanel`, `MuteToggle`. `primitives/` (shell, cards, segmented control, toggle, app bar), `icons/`. |
| `src/content/` | Typed copy. `strings.ts` (EN + PT-BR, `OPEN_ENDED_GLYPH`), `learnContent.ts` (About sections per locale), `lockedCopy.ts` (medical-advice + affiliation lines). |
| `src/storage/` | Flat `localStorage` envelope; barrel `index.ts`. `storage.ts` (read/write, version + downgrade guard), `settings.ts` (pattern settings coercer), `stats.ts`, `prefs.ts` (`UserPrefs`, `loadPrefs`, prefs-changed event), `installDismissed.ts`. |
| `src/styles/` | `theme.css` (Mono Zen palette, light/dark) + `faviconPalette.ts`. |
| `public/` | PWA icons (`pwa-*.png`, maskable variants), `apple-touch-icon.png`, `favicon.svg`. |
| `assets/icons/` | SVG masters (`icon.svg`, `icon-maskable.svg`) for the PNGs in `public/`. |
| `.github/workflows/` | `deploy.yml` — tag-triggered multi-version GitHub Pages deploy under `/pb/`, driven by `versions.json`. `desktop.yml` — Pake/Tauri wrapper building macOS/Windows/Linux installers. |
| root | `index.html` (viewport lock, FOUC pre-paint script), `vite.config.ts`, `vitest.setup.ts`, `eslint.config.js`, `tsconfig*.json`, `versions.json`. |
