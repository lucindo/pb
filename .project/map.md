# Overview

Pattern Breathing is a calm, browser-based breathing timer for anyone who wants guided
paced breathing: pick a pattern (presets Box-4, 4-7-8, 1-4-2, or a custom one), run it with
a visual ring and optional sound cues. No accounts, no backend — settings, prefs, and stats
live in `localStorage`. UI in English and pt-BR. Installable as an offline-capable PWA served
under `/pb/`, and wrapped separately as native desktop apps (macOS/Windows/Linux) via
Pake/Tauri that load the live site.

# Stack

- **Language**: TypeScript ~6.0 (strict), React 19, Vite 8 + `@vitejs/plugin-react`, Tailwind 4 (`@tailwindcss/vite`), `vite-plugin-pwa`, `@fontsource-variable/inter`.
- **Runtime**: browser (ESM, `"type": "module"`); one Web Worker (`src/hooks/lookaheadHeartbeat.worker.ts`).
- **Test**: Vitest 4 + Testing Library, `jsdom` environment, setup in `vitest.setup.ts`, config in `vite.config.ts` (`test:`); tests are co-located `*.test.ts(x)` under `src/`.
- **Lint**: ESLint 10 (`eslint.config.js`) + `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.
- **Commands**: `npm run dev`, `npm run build` (`tsc -b` then `vite build`), `npm run test` / `npm run test:run`, `npm run lint`, `npm run preview`.
- **CI/CD**: `.github/workflows/deploy.yml` (web, on `v*` tags) and `desktop.yml` (Pake installers, on `desktop-v*` tags); both also `workflow_dispatch`.

# Repo map

| Path | Contents |
|---|---|
| `src/main.tsx`, `src/index.css` | React entry and global CSS import. |
| `src/app/` | Screens and app-level view models: `App.tsx`, `ScreenRouter`, `PracticeScreen` / `PracticeSessionView` / `PracticeSettingsView` / `PracticeControlsView`, `BreathingSessionSurface`, `EndSessionDialogView`, `useAppNavigation`, `appViewModel` / `useAppViewModel`, `sessionPresentation`, `setupCardSummary`, `appTestHarness`; `pages/` holds `AppSettingsPage` and `LearnPage`. |
| `src/domain/` | Pure session logic: `breathingPlan`, `presets`, `sessionAudio`, `sessionController`, `sessionLifecycle`, `sessionMath`, `settings`; barrel `index.ts`. |
| `src/audio/` | Web Audio: `audioEngine`, `cueSynth` / `boundaryCueSynth`, `sessionClock` / `swappableSessionClock`, `previewContext`, `cueStore`, `timbres`, `silentLoopBypass`, `audioStatus`, `audioConstants`. |
| `src/hooks/` | Hooks bridging domain/audio to UI: `useSessionEngine`, `useBreathingSessionController`, `useAudioCues`, `useAudioHealth`, `useCueScheduler`, `useWakeLock`, `useTheme`, `useLocale`, `useUiStringsContext`, `useFavicon`, `usePrefersReducedMotion`, `useBeforeInstallPrompt`, `useBypassSilentMode`, `useIsStandaloneOrPhone`, `usePreferenceChoice`, `leadInCountdown`, `lookaheadHeartbeat.worker`. |
| `src/components/` | Presentational components: `BreathingRing`, `SetupCard`, `SessionReadout`, `SessionActionRow`, `SessionCompletionHeadline`, `PatternBreathingSettingsForm`, `Settings*` (sheet, panel body, rows, stepper, toggle, stats section), `EndSessionDialog` / `ConfirmDialog` / `useModalDialog`, `ThemePicker`, `LanguagePicker`, `TimbrePicker`, `MuteToggle`, `LearnPanel`, `IosInstallSteps`, anchors; `icons/` (SVG icon components) and `primitives/` (`IconButton`, `PageShell`, `PickerCardGrid`, `SectionCard`, `SegmentedControl` / `SegmentedField`, `Toggle`, `TopAppBar`). |
| `src/storage/` | `localStorage` persistence with per-field validation: `storage` (versioned envelope, cross-tab handling), `settings`, `prefs`, `stats`, `installDismissed`; barrel `index.ts`. |
| `src/content/` | UI copy: `strings` (en / pt-BR, incl. `OPEN_ENDED_GLYPH`), `learnContent`, `lockedCopy` (guarded by `lockedCopy.test.ts`). |
| `src/styles/` | `theme.css`, `faviconPalette` (synced with `index.html` / `public/favicon.svg` by `favicon.sync.test.ts`), contrast/alpha probe tests. |
| `public/` | `favicon.svg`, `apple-touch-icon.png`, PWA icons (`pwa-*`, `pwa-maskable-*`). |
| `assets/icons/` | Source SVGs (`icon.svg`, `icon-maskable.svg`) for the PWA icons. |
| `.github/workflows/` | `deploy.yml` (web build + GitHub Pages) and `desktop.yml` (Pake/Tauri installers: macOS universal, Windows x64, Linux deb/rpm/AppImage). |
| `index.html` | Entry HTML: pre-paint theme script reading the stored `prefs.theme`, viewport meta, favicon colors. |
| `vite.config.ts` | Vite / Tailwind / PWA / Vitest config; `base: '/pb/'`; injects short git SHA + build date (falls back outside git). |
| `versions.json` | Released web versions; `official` names the ref built at the site root. |
| `.project/` | `map.md` (this file), `state.md`, `config.md`. |
