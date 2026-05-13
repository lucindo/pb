---
phase: 16-themes
verified: 2026-05-13T00:32:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification: null
gaps: []
human_verification: []
---

# Phase 16: Themes Verification Report

**Phase Goal:** Users can switch among Light, Dark, System, and 3 named palette themes; the chosen theme persists across reloads and is applied before first paint.
**Verified:** 2026-05-13T00:32:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Accepted Gaps (carry-forward, not verification failures)

The following items are explicitly accepted by the human checkpoint (APPROVED 2026-05-13) and are NOT counted as gaps.

1. **Aesthetic quality** — "All themes extremely ugly." Tracked in `.planning/todos/pending/2026-05-13-themes-aesthetic-refresh.md`. THEME-01..05 functional contracts do not include aesthetic judgment.

2. **Theme propagation gap** — 58 hardcoded color-class lines across 16 components (Start/Stop button etc.) do not rebind on `data-theme` swap. THEME-01..05 do NOT mandate full UI migration. Will be resolved by an inserted Phase 16.1 (gap closure). The token cascade works; the gap is "few consumers", not "broken cascade." Documented in 16-REVIEW.md WR-01.

3. **Plan 16-01 D-03 Moss orb-out deviation** — 2 of 17 Moss tokens shifted from v1.0.1 byte-identical baseline (`--color-orb-out-from: #bfdbfe/#eef2ff` → `#3b82f6/#bfdbfe`) to satisfy the THEME-05 ≥ 1.5 contrast floor (original Moss ratio was 1.087 < 1.5). 15 tokens remain byte-identical. Documented in 16-01-SUMMARY.md.

4. **Code review warnings WR-01..WR-06** — warnings only, no blockers. Tracked in 16-REVIEW.md. No immediate action required.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Users can switch among Light, Dark, System, and 3 named palette themes via a 6-button radiogroup | VERIFIED | `src/components/ThemePicker.tsx` renders 6 `role="radio"` buttons via `THEME_OPTIONS.map`; 8 passing tests in `ThemePicker.test.tsx` including "renders all 6 options as radio buttons with correct labels in order" |
| 2 | The chosen theme persists across reloads (via `Envelope.prefs.theme`) | VERIFIED | `useThemeChoice.setTheme` calls `savePrefs({...current, theme: next})`; `useTheme` seeds state from `loadPrefs().theme` at mount; ThemePicker disk-write test confirms persistence via direct localStorage read |
| 3 | The chosen theme is applied before first paint (FOUC prevention) | VERIFIED | `index.html:8` contains a synchronous classic `<script>` (no `type`/`async`/`defer`) in `<head>` before `<title>` that reads `localStorage['hrv:state:v1']` and calls `document.documentElement.setAttribute('data-theme', t)` before `<body>` parses |
| 4 | System mode follows OS `prefers-color-scheme` automatically | VERIFIED | `useTheme.ts` effect 2 attaches `matchMedia('(prefers-color-scheme: dark)')` listener only when `theme === 'system'` (S-04 gate); 3 passing tests cover system mode with `matches=true`, `matches=false`, and live change events |
| 5 | Every shipped theme preserves the reduced-motion phase-cue contrast (≥ 1.5 WCAG luminance ratio on orb-in vs orb-out midpoints) | VERIFIED | `src/styles/theme.contrast.test.ts` runs 5 iterations (light 1.78, dark 4.85, moss 1.94, slate 2.56, dusk 1.87); all 5 pass `expect(ratio).toBeGreaterThanOrEqual(1.5)`; confirmed by live test run: 5/5 pass |

**Score:** 5/5 truths verified

---

## Requirement ID Traceability

| Requirement | Description | Plans | Status | Evidence |
|-------------|-------------|-------|--------|----------|
| THEME-01 | User can choose between Light, Dark, and System modes | 16-02, 16-04 | SATISFIED | ThemePicker renders 3 core options; useThemeChoice.setTheme writes to disk; App-side useTheme() applies choice |
| THEME-02 | System mode follows OS prefers-color-scheme automatically | 16-02 | SATISFIED | useTheme gated mql effect (S-04); 3 tests covering matchMedia lifecycle |
| THEME-03 | User can choose among 3 curated named palettes (Moss/Slate/Dusk) | 16-01, 16-04 | SATISFIED | 4 `[data-theme='X']:root` override blocks in theme.css; ThemePicker renders Moss/Slate/Dusk buttons |
| THEME-04 | Selected theme persists across reloads and applies before first paint | 16-02, 16-03, 16-04 | SATISFIED | savePrefs path (useThemeChoice); seed-at-mount path (useTheme); FOUC script (index.html); persistence test passing |
| THEME-05 | Every theme preserves reduced-motion orb crossfade contrast | 16-01 | SATISFIED | 5/5 automated WCAG luminance contrast tests pass (all ratios ≥ 1.5) |

REQUIREMENTS.md traceability confirmed: all 5 rows show `Done` and checkboxes `[x]`.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/styles/theme.css` | 1 @theme block (Light) + 4 [data-theme] override blocks | VERIFIED | @theme block at line 1; [data-theme='dark']:root at 41, [data-theme='moss']:root at 66, [data-theme='slate']:root at 89, [data-theme='dusk']:root at 112; 17 themable tokens per palette; reduced-motion block intact |
| `src/styles/theme.contrast.test.ts` | 5-iteration WCAG luminance contrast guard | VERIFIED | `describe.each(CONCRETE_THEMES)` over `THEME_OPTIONS.filter(t => t !== 'system')`; inline `relativeLuminance`, `parseColorToRgb`, `contrastRatio` helpers; `readFileSync` + `@theme{` → `:root{` rewrite; 5/5 tests pass live |
| `src/hooks/useTheme.ts` | App-side orchestrator hook with 4-effect split | VERIFIED | 93 lines; exports `useTheme()`; 4 separate `useEffect` calls (apply, gated mql, storage, prefs-changed); seeds from `loadPrefs().theme`; writes `documentElement.dataset.theme` |
| `src/hooks/useTheme.test.ts` | 10+ tests covering all documented behaviors | VERIFIED | 10 tests, all passing: mount seed, system+matchMedia(true/false), mql change, no-listener on named, cleanup on unmount, cross-tab storage hit/miss, same-tab prefs-changed hit/miss |
| `src/hooks/useThemeChoice.ts` | Picker-side hook: savePrefs + CustomEvent dispatch | VERIFIED | 47 lines; exports `useThemeChoice()`; `useCallback([])` stable setter; `savePrefs({...current, theme: next})`; `dispatchEvent(new CustomEvent('hrv:prefs-changed', {detail: {key:'theme', value:next}}))` |
| `src/hooks/useThemeChoice.test.ts` | 6+ tests covering round-trip, merge preservation, event shape | VERIFIED | 6 tests, all passing |
| `index.html` | Synchronous ES5 IIFE `<script>` in `<head>` before `<title>` | VERIFIED | Line 8: classic `<script>` (no type/async/defer); reads `localStorage.getItem('hrv:state:v1')`; allowlist `['light','dark','moss','slate','dusk']`; matchMedia fallback; catch block writes `'light'` |
| `src/storage/storage.ts` | SYNC comment immediately above STATE_KEY export | VERIFIED | Lines 35-36: `// SYNC WITH index.html FOUC SCRIPT` 2-line block; `STATE_KEY = 'hrv:state:v1'` unchanged |
| `src/components/ThemePicker.tsx` | 6-button radiogroup consuming useThemeChoice | VERIFIED | 53 lines; `role="radiogroup"` + `aria-disabled`; 6 `role="radio"` buttons via `THEME_OPTIONS.map`; `aria-checked={theme === id}`; selected-state CSS uses `var(--color-breathing-accent)` / `var(--color-breathing-bg-soft)` / `var(--color-breathing-accent-strong)`; `ThemePickerProps = {disabled: boolean}` only (D-20) |
| `src/components/ThemePicker.test.tsx` | 8 tests covering radiogroup, aria-checked, click side-effects, disabled gating | VERIFIED | 8 tests, all passing |
| `src/app/App.tsx` | useTheme() invocation (1 import + 1 call, no destructure) | VERIFIED | `grep -c "useTheme" src/app/App.tsx` → 2 (import at line 16, invocation at line 139); no new useState/useEffect/useMemo |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ThemePicker.tsx` | `useThemeChoice.ts` | `import { useThemeChoice } from '../hooks/useThemeChoice'` | WIRED | Line 11 import; line 18 consumption `const { theme, setTheme } = useThemeChoice()` |
| `ThemePicker.tsx` | `src/domain/settings.ts` | `import { THEME_OPTIONS, type ThemeId }` | WIRED | Line 10 import; line 29 `THEME_OPTIONS.map((id: ThemeId) => ...)` |
| `App.tsx` | `useTheme.ts` | `import { useTheme } from '../hooks/useTheme'; useTheme()` | WIRED | Line 16 import; line 139 invocation |
| `useTheme.ts` | `document.documentElement.dataset.theme` | `useEffect` writes resolved theme attribute on state change | WIRED | Lines 33, 47, 49: `document.documentElement.dataset.theme = theme` / `= mql.matches ? 'dark' : 'light'` |
| `useThemeChoice.ts` | `savePrefs` + `hrv:prefs-changed` CustomEvent | `savePrefs({...current, theme: next})` + `window.dispatchEvent(new CustomEvent(...))` | WIRED | Lines 36-43; verified by ThemePicker.test.tsx disk-write test and CustomEvent dispatch test |
| `useTheme.ts` | cross-tab `storage` event | `window.addEventListener('storage', onStorage)` filtered on `e.key === STATE_KEY` | WIRED | Lines 60-70; test "updates state via cross-tab storage event" passes |
| `useTheme.ts` | same-tab `hrv:prefs-changed` event | `window.addEventListener('hrv:prefs-changed', onPrefsChanged)` | WIRED | Lines 77-89; test "updates state via same-tab hrv:prefs-changed" passes |
| `index.html` FOUC script | `localStorage['hrv:state:v1']` | `localStorage.getItem('hrv:state:v1')` (ES5 synchronous) | WIRED | Line 8; value validated against allowlist before write |
| `index.html` FOUC script | `document.documentElement[data-theme]` | `document.documentElement.setAttribute('data-theme', t)` | WIRED | Line 8; write path confirmed in both try and catch blocks |
| `storage.ts STATE_KEY` | `index.html` hardcoded `'hrv:state:v1'` | `// SYNC WITH index.html FOUC SCRIPT` comment above export | DOCUMENTED | Lines 35-36 of storage.ts; coupling comment in place |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `ThemePicker.tsx` | `theme` (from useThemeChoice) | `loadPrefs().theme` at mount → updates via setTheme events | Yes — `loadPrefs()` reads localStorage via `readEnvelope` → `coerceTheme` | FLOWING |
| `useTheme.ts` | `theme` (React state) | `loadPrefs().theme` at mount; refreshed via storage + prefs-changed events | Yes — reads live localStorage on each event | FLOWING |
| `index.html` FOUC | `t` (resolved theme) | `localStorage.getItem('hrv:state:v1')` → JSON.parse → `prefs.theme` | Yes — reads real localStorage or falls back to matchMedia | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 5 concrete themes pass WCAG contrast ≥ 1.5 | `npx vitest run src/styles/theme.contrast.test.ts --reporter=verbose` | 5/5 pass (light 1.78, dark 4.85, moss 1.94, slate 2.56, dusk 1.87) | PASS |
| useTheme 10 behaviors all pass | `npx vitest run src/hooks/useTheme.test.ts` | 10/10 pass | PASS |
| useThemeChoice 6 behaviors all pass | `npx vitest run src/hooks/useThemeChoice.test.ts` | 6/6 pass | PASS |
| ThemePicker 8 behaviors all pass | `npx vitest run src/components/ThemePicker.test.tsx` | 8/8 pass | PASS |
| Full test suite no regressions | `npm test` | 492/492 pass (39 test files) | PASS |

---

## Probe Execution

No `scripts/*/tests/probe-*.sh` probes defined for this phase. Human visual checkpoint served as the integration probe (APPROVED 2026-05-13 — all 11 verification steps passed: FOUC absent, OS dark/light flip works, 6-button grid renders, click swaps palette + persists, in-session gating disables picker, cross-tab sync fires).

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| THEME-01 | 16-02, 16-04 | User can choose Light/Dark/System from SettingsDialog | SATISFIED | ThemePicker 6-button UI; useThemeChoice setTheme path; App.tsx useTheme() mounted |
| THEME-02 | 16-02 | System follows OS prefers-color-scheme automatically | SATISFIED | useTheme gated mql effect; 3 matchMedia tests pass |
| THEME-03 | 16-01, 16-04 | 3 named palettes (Moss/Slate/Dusk) selectable | SATISFIED | theme.css has 4 [data-theme]:root blocks; ThemePicker includes all 3 named themes |
| THEME-04 | 16-02, 16-03, 16-04 | Persists across reloads; applied before first paint | SATISFIED | savePrefs path; loadPrefs() seed at mount; FOUC inline script in index.html |
| THEME-05 | 16-01 | Every theme preserves reduced-motion contrast ≥ 1.5 | SATISFIED | 5/5 contrast tests pass live |

All 5 requirement IDs: THEME-01..05 confirmed Done in `.planning/REQUIREMENTS.md` (5 `[x]` checkboxes + 5 `Done` rows in traceability table).

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/ThemePicker.tsx` | 22, 33 | Hardcoded `text-slate-900`, `border border-teal-200 bg-white text-teal-800 hover:bg-teal-50` Tailwind utilities bypass `[data-theme]` cascade for unselected buttons and label | Warning | Unselected buttons stay teal-on-white in all themes; selected buttons use correct CSS variables. This is the WR-01 finding in 16-REVIEW.md — accepted as carry-forward, not a THEME-01..05 blocker. |
| `src/hooks/useThemeChoice.ts` | 28 | `theme` mirror not subscribed to cross-tab/same-tab events — picker can show stale selected state if concurrent write arrives while dialog is open | Warning | Rare race; WR-02 in 16-REVIEW.md — accepted carry-forward |
| `index.html` | 8 | FOUC allowlist `['light','dark','moss','slate','dusk']` duplicated without SYNC comment linking it to THEME_OPTIONS | Info | WR-06 in 16-REVIEW.md — no test guards allowlist drift from THEME_OPTIONS |

No TBD/FIXME/XXX markers found in phase-modified files. No stubs returning null/empty that block a truth. Anti-patterns above are all documented carry-forwards from the code review.

---

## Human Verification Required

None. Human visual checkpoint was completed and APPROVED 2026-05-13:

> All 11 verification steps pass: FOUC absent on first paint, live OS-dark/light flip works, 6-button 3×2 grid renders, click swaps palette + persists, in-session gating disables picker, cross-tab sync fires, contrast visually distinguishable.

Aesthetic feedback ("all themes extremely ugly") is a carry-forward tracked separately — not a THEME-01..05 functional failure.

---

## Gaps Summary

No gaps. All 5 must-have truths are VERIFIED. All key artifacts exist, are substantive, are wired, and have real data flowing through them. All 5 requirement IDs (THEME-01..05) are satisfied and marked Done in REQUIREMENTS.md. The 492/492 test suite passes. The human checkpoint was approved.

The 4 accepted carry-forwards (aesthetic, propagation, Moss deviation, WR-01..WR-06 warnings) are scope-not-included for THEME-01..05 and were explicitly accepted by the developer.

---

_Verified: 2026-05-13T00:32:00Z_
_Verifier: Claude (gsd-verifier)_
