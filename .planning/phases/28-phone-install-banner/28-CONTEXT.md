# Phase 28: Phone Install Banner - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Phone users running the app in a browser (not installed) can discover and initiate PWA installation through a slim, dismissible banner. Android Chrome path triggers the native `beforeinstallprompt` dialog; iOS Safari path shows guided "Share → Add to Home Screen" steps. The banner never appears when the app is already installed (standalone display mode) or on desktop browsers, and once dismissed it never reappears (persisted in `localStorage`).

Covers requirements INSTALL-01 through INSTALL-05. The persistent SettingsDialog install entry and finalized PT-BR copy (INSTALL-06, INSTALL-07) belong to Phase 29.

</domain>

<decisions>
## Implementation Decisions

### Placement & session behavior
- **D-01:** Banner hides while a breathing session is running and returns when the app is idle — strongest "never blocks the flow" guarantee. Show/hide is gated on session/app state.
- **D-02:** Banner is anchored in normal document flow at the bottom of the page (scrolls with content) — NOT fixed to the viewport bottom. No overlap risk with the app UI / stats footer.
- **D-03:** Banner contents: app icon + one-line text + action (install button on Android / steps-trigger on iOS) + dismiss control.
- **D-04:** Dismiss control is a small `×` icon at the banner's edge.

### iOS instruction format
- **D-05:** iOS banner stays slim by default; tapping the action expands the "Share → Add to Home Screen" step list inline, in-place below the banner. No modal/overlay, no always-tall banner.
- **D-06:** iOS steps are numbered text with the iOS Share glyph shown inline so users recognize the button to tap.

### First-appearance timing
- **D-07:** Banner appears immediately on page load. iOS shows at once (no event needed). Android shows as soon as `beforeinstallprompt` is captured.
- **D-08:** On Android, the banner is held back until `beforeinstallprompt` fires — guarantees the install button is always functional. If the event never fires, no banner appears. No "show banner with a dead/disabled button" state.

### Copy & localization handoff
- **D-09:** Phase 28 banner copy lives in `src/content/strings.ts` — add an `install` block to the `UiStrings` interface. Because `UI_STRINGS` is `Record<LocaleId, UiStrings>`, both EN and PT-BR catalog slots must be populated: EN values are final, PT-BR values are a draft (rough translation / English placeholder) for Phase 29's native-speaker review to finalize.
- **D-10:** The banner is wired to `useLocale()` and reads its copy from `uiStrings` in Phase 28 — locale plumbing is complete now so Phase 29 only swaps in finished PT-BR text, no component refactor.

### Claude's Discretion
- Phone-vs-desktop detection method (viewport width / pointer-coarse media query / UA) — implementation detail; researcher/planner choose. Constraint: desktop must show no banner (SC5).
- `localStorage` key/shape for dismissal persistence — may reuse the existing `hrv:`-prefixed prefs object + `hrv:prefs-changed` pattern or a standalone key; planner decides.
- Standalone (installed) detection mechanism — `display-mode: standalone` media query and/or `navigator.standalone` for iOS; mirror the `usePrefersReducedMotion.ts` `matchMedia` hook pattern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` §"Phase 28: Phone Install Banner" — goal, 5 success criteria, dependency on Phase 27
- `.planning/REQUIREMENTS.md` — INSTALL-01..05 (Phase 28 scope), INSTALL-06/07 (Phase 29), and the Out-of-Scope table (no desktop banner, no re-surfacing after dismissal, no install analytics)

### PWA infrastructure (Phase 27)
- `vite.config.ts` — `vite-plugin-pwa` (`generateSW`, `registerType: 'autoUpdate'`), manifest (`display: standalone`, scope `/hrv/`, theme `#5e81ac`)

No external ADRs/specs — requirements fully captured in ROADMAP/REQUIREMENTS and the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/usePrefersReducedMotion.ts` — canonical `window.matchMedia` hook pattern (defensive `!window.matchMedia` guard, mount re-seed, `change` listener). Mirror this for a `display-mode: standalone` / phone-detection hook.
- `src/hooks/useLocale.ts` — supplies `{ locale, uiStrings }`; the banner consumes `uiStrings.install` (D-10).
- `src/content/strings.ts` — `UiStrings` nested-interface catalog; add an `install` sub-object (D-09). PT-BR values reviewed per the Phase 26 process.
- `src/storage/prefs.ts` / `loadPrefs` + `STATE_KEY` + `hrv:prefs-changed` CustomEvent — established cross-tab persisted-pref pattern, candidate home for dismissal state.

### Established Patterns
- UI strings never inline in components (D-01 in `strings.ts` header) — banner copy MUST route through the catalog.
- Dialogs (`SettingsDialog`, `LearnDialog`) are the app's overlay pattern — explicitly NOT used for iOS steps (D-05 chose inline expand instead).
- `App.tsx` composes top-level surfaces and owns `appPhase` (`idle` / `lead-in` / `running`) — the banner mounts here and reads app/session state for the hide-while-running gate (D-01).

### Integration Points
- New banner component mounted in `src/app/App.tsx` below the main app content, gated on: phone + not-standalone + not-dismissed + (Android: `beforeinstallprompt` captured) and hidden while `appPhase !== 'idle'`.
- New hook(s) for standalone/phone detection and `beforeinstallprompt` capture, alongside the existing `src/hooks/` set.

</code_context>

<specifics>
## Specific Ideas

- iOS steps reference the literal iOS **Share** glyph inline (D-06) — users must visually match the icon to Safari's toolbar button.
- Banner text is one line ("Install for offline use" style) — slim is a hard constraint; the iOS expand is the only thing that grows the banner's height, and only on tap.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Desktop install entry and finalized PT-BR copy are already roadmapped as Phase 29 (INSTALL-06, INSTALL-07), not deferred ideas.

</deferred>

---

*Phase: 28-Phone Install Banner*
*Context gathered: 2026-05-16*
