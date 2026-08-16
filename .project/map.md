# Overview

Pattern Breathing is a calm, browser-based breathing timer: pick a pattern (Box-4, 4-7-8,
1-4-2, or custom), run it with a visual ring and optional audio cues, no accounts and no
backend — all state lives in `localStorage`. Installable as an offline-capable PWA, and
wrapped separately as unsigned native desktop apps (macOS/Windows/Linux) via Pake/Tauri
that just load the live site.

# Stack

- **Language**: TypeScript (strict), React 19, Vite 8 + `@vitejs/plugin-react`, Tailwind 4 (`@tailwindcss/vite`), `vite-plugin-pwa`.
- **Runtime**: browser (ESM, `"type": "module"`).
- **Test**: Vitest 4 + Testing Library (`jsdom` environment via `vitest.setup.ts`).
- **Lint**: ESLint 10 + `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.
- **Commands**: `npm run dev`, `npm run build` (`tsc -b` then `vite build`), `npm run test` / `test:run`, `npm run lint`, `npm run preview`.
- **CI/CD**: `.github/workflows/deploy.yml` (web, tag-gated) and `desktop.yml` (Pake/Tauri installers, `desktop-v*` tags).

# Repo map

| Path | Contents |
|---|---|
| `src/app/` | Screens and app-level view models — `App.tsx`, `ScreenRouter`, `PracticeScreen`/`PracticeSettingsView`/`PracticeControlsView`, `BreathingSessionSurface`, `EndSessionDialogView`, navigation (`useAppNavigation`), view-model factories (`appViewModel`, `useAppViewModel`), `sessionPresentation`, `setupCardSummary`; `src/app/pages/` holds `AppSettingsPage` and `LearnPage`. |
| `src/domain/` | Pure logic, zero upward imports: `breathingPlan`, `presets`, `sessionAudio`, `sessionController`, `sessionLifecycle`, `sessionMath`, `settings`; re-exported via `src/domain/index.ts`. |
| `src/audio/` | Web Audio engine and cue synthesis: `audioEngine`, `cueSynth`/`boundaryCueSynth` (one-way dependency), `sessionClock`/`swappableSessionClock`, `previewContext`, `cueStore`, `timbres`, `silentLoopBypass`, `audioStatus`. |
| `src/hooks/` | React hooks bridging domain/audio to UI: `useSessionEngine` (single session engine, rAF lookahead), `useBreathingSessionController`, `useAudioCues`, `useCueScheduler`, `useWakeLock`, `useTheme`, `useLocale`, `useFavicon`, `usePrefersReducedMotion`, `useBeforeInstallPrompt`, `useBypassSilentMode`, `useIsStandaloneOrPhone`, `usePreferenceChoice`, `leadInCountdown`; `lookaheadHeartbeat.worker.ts` is a Web Worker. |
| `src/components/` | Presentational components: `BreathingRing`, `SettingsSheet`/`SettingsPanelBody`/`SettingsStatsSection`/`SettingsRow`/`SettingsStepper`/etc., `PatternBreathingSettingsForm`, `SetupCard`, `SessionReadout`, `EndSessionDialog`/`ConfirmDialog`, `ThemePicker`, `LanguagePicker`, `TimbrePicker`, `MuteToggle`, `LearnPanel`/`LearnAnchor`, `IosInstallSteps`; `icons/` (SVG icon components) and `primitives/` (`IconButton`, `PageShell`, `PickerCardGrid`, `SectionCard`, `SegmentedControl`/`SegmentedField`, `Toggle`, `TopAppBar`). |
| `src/storage/` | `localStorage` persistence with per-field validation at the boundary: `storage` (envelope + cross-tab guard), `settings`, `prefs`, `stats`, `installDismissed`; re-exported via `src/storage/index.ts`. |
| `src/content/` | UI copy: `strings` (incl. `OPEN_ENDED_GLYPH`), `learnContent`, `lockedCopy` (byte-frozen medical-advice/affiliation text, enforced by `lockedCopy.test.ts`). |
| `src/styles/` | `theme.css` plus `faviconPalette` (must match `index.html`/`public/favicon.svg`, enforced by `favicon.sync.test.ts`) and contrast/alpha probe tests. |
| `public/` | PWA icons (`pwa-192x192.png`, `pwa-512x512.png` — must stay RGBA for Tauri Linux builds), `favicon.svg`, `apple-touch-icon.png`. |
| `assets/icons/` | Source SVGs (`icon.svg`, `icon-maskable.svg`) for generated PWA icons. |
| `.github/workflows/` | `deploy.yml` (web deploy, gated on `vX.Y` tags matching `package.json`) and `desktop.yml` (Pake/Tauri desktop installers). |
| `.project/` | `map.md` (this file), `state.md` (current status, settled decisions, hazards), `config.md` (active modes). |
| `versions.json` | Version manifest; `official` selects which ref is rebuilt at the site root. |
| `index.html` | Entry HTML; contains the FOUC pre-paint theme script (reads `storage.ts`'s state key and `prefs.theme` path directly) and the `maximum-scale=1, user-scalable=no` viewport lock. |
| `vite.config.ts` | Vite/PWA/Tailwind config; derives a build SHA + date via `git rev-parse` for the About row (falls back to `'dev'` outside git). |
