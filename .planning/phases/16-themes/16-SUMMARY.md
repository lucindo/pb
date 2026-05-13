---
phase: 16
completed: 2026-05-13
plans: 4
requirements:
  - THEME-01
  - THEME-02
  - THEME-03
  - THEME-04
  - THEME-05
---

# Phase 16: Themes — Phase Summary

## Summary

Phase 16 delivered a complete 6-theme switching system (Light, Dark, System + Moss, Slate, Dusk) for the HRV Breathing WebApp. The system uses CSS custom-property flat overrides (`[data-theme='X']:root` blocks in `theme.css`) so existing Tailwind v4 utility classes work across all palettes with zero TSX changes. A synchronous ES5 IIFE inline script in `<head>` reads `localStorage['hrv:state:v1']` and writes `<html data-theme>` before React hydrates, eliminating the flash of wrong theme on reload (FOUC prevention). The `useTheme` hook mounted in `App.tsx` orchestrates the DOM attribute, OS `prefers-color-scheme` tracking via a gated `matchMedia` listener, and cross-tab + same-tab sync. The `useThemeChoice` hook (called from `ThemePicker`) handles the picker-side write path. An automated WCAG luminance contrast test (`theme.contrast.test.ts`) guards the THEME-05 reduced-motion orb crossfade perceptibility floor (≥ 1.5 ratio) across all 5 concrete palettes on every commit. Zero new npm dependencies introduced across all 4 plans.

## Plans

### 16-01 — CSS Theme Token System (theme.css rewrite + contrast guard)

Rewrote the `@theme` block to a new cool/neutral Light palette (distinct from the v1.0.1 teal-pastel). Appended four `[data-theme='X']:root` override blocks (Dark, Moss, Slate, Dusk) each re-declaring all 17 `--color-*` tokens. Moss is byte-identical to v1.0.1 except `--color-orb-out-*` (adjusted from blue-200/indigo-50 → blue-500/blue-200 to clear the ≥ 1.5 WCAG contrast floor that the original pair failed). Created `src/styles/theme.contrast.test.ts` with 5-iteration WCAG luminance guard. Delivered THEME-03 and THEME-05.

Key outputs: `src/styles/theme.css`, `src/styles/theme.contrast.test.ts`. Commits: `43c9a5e` (RED test), `a14d60d` (GREEN CSS + test finalized).

### 16-02 — useTheme + useThemeChoice Hooks

Created `src/hooks/useTheme.ts` (App-side orchestrator with 4-effect split: apply, gated mql, storage listener, prefs-changed listener) and `src/hooks/useThemeChoice.ts` (picker-side companion with `useCallback([])` stable setter, optimistic state mirror, `savePrefs` + `hrv:prefs-changed` dispatch). Added 16 tests (10 for `useTheme`, 6 for `useThemeChoice`). Delivered the runtime plumbing for THEME-01, THEME-02, and THEME-04.

Key outputs: `src/hooks/useTheme.ts`, `src/hooks/useTheme.test.ts`, `src/hooks/useThemeChoice.ts`, `src/hooks/useThemeChoice.test.ts`.

### 16-03 — FOUC Inline Script + Storage SYNC Comment

Inserted a synchronous ES5 IIFE `<script>` in `index.html` `<head>` (no `type`/`async`/`defer`) that reads `localStorage['hrv:state:v1']`, validates the `prefs.theme` value against an allowlist `['light','dark','moss','slate','dusk']`, resolves `'system'` via `matchMedia`, and writes `document.documentElement.setAttribute('data-theme', t)` before `<body>` parses. Added a `// SYNC WITH index.html FOUC SCRIPT` comment above `STATE_KEY` in `storage.ts` (S-02). Delivered THEME-04 pre-paint contract.

Key outputs: `index.html` (line 7-8), `src/storage/storage.ts` (lines 35-36 comment).

### 16-04 — ThemePicker Radiogroup UI + App.tsx Wire-up + Phase Close

Replaced the Phase 15 stub `ThemePicker` body with a real radiogroup: 6 native `<button role="radio">` buttons inside `<div role="radiogroup">`, consuming `useThemeChoice` internally. Selected state: 3-channel signal (border-2 accent, bg-soft fill, accent-strong text). Preserved `{ disabled: boolean }` prop interface (D-20). Rewrote `ThemePicker.test.tsx` with 8 tests. Added `useTheme()` invocation to `App.tsx` (1 import + 1 call, return value unused). Updated phase close artifacts (REQUIREMENTS.md, STATE.md, ROADMAP.md, this file).

Key outputs: `src/components/ThemePicker.tsx`, `src/components/ThemePicker.test.tsx`, `src/app/App.tsx`.

## Locked Decisions Honored

- **D-01 (flat override):** `[data-theme='X']:root` blocks re-declare existing `--color-*` names; no semantic indirection. Honored in plan 01.
- **D-02 (all tokens themable):** All 17 `--color-*` tokens (bg, surface, accent, orb gradients, rings, backdrop) re-declared per palette. Honored in plan 01.
- **D-03 (Light ≠ v1.0.1 teal; Moss = v1.0.1 byte-identical):** Light is a new cool/neutral preset; Moss is the old teal-pastel (15 tokens byte-identical; 2 adjusted for THEME-05). Honored in plan 01.
- **D-04 (hexes in theme.css, single file):** All palette hexes locked in plan 01 PLAN.md and `src/styles/theme.css`. Honored in plan 01.
- **S-01 (JS resolves 'system' to concrete light/dark):** No `[data-theme='system']` CSS branch. `useTheme` writes `data-theme='dark'` or `'light'` when state is `'system'`. Honored in plan 02 + 03.
- **S-02 (SYNC comment next to STATE_KEY):** 2-line `// SYNC WITH index.html FOUC SCRIPT` block above `export const STATE_KEY`. Honored in plan 03.
- **S-03 (ES5 IIFE with catch-all fallback):** Inline script uses `var`, `.indexOf()`, IIFE, try/catch defaulting to `'light'`. Honored in plan 03.
- **S-04 (gated mql listener):** `useEffect([theme])` attaches `matchMedia` listener only when `theme === 'system'`; cleanup removes it on named-theme switch. Honored in plan 02.
- **A-01 (useTheme owns all state + side effects):** `useTheme` is the single owner of `ThemeId` React state and all DOM writes. Honored in plan 02.
- **A-02 (split hooks):** `useTheme` (always-mounted) vs `useThemeChoice` (dialog-open lifecycle). Honored in plan 02.
- **A-03 (custom event bus `hrv:prefs-changed`):** `{ key: 'theme', value: ThemeId }` detail shape — forward-compat for Phase 17/18/19. Honored in plan 02 + 04.
- **A-04 (cross-tab storage listener in useTheme):** Separate `window.addEventListener('storage')` filtered on `STATE_KEY`; does not touch the Phase 8 STORAGE-03 listener in App.tsx. Honored in plan 02.
- **D-13 (automated contrast guard is primary THEME-05 gate):** `theme.contrast.test.ts` runs in CI on every commit; no per-theme manual UAT required. Honored in plan 01.
- **D-14 (WCAG ratio floor ≥ 1.5):** All 5 themes pass the luminance contrast floor. Honored in plan 01.
- **D-15 (test file: theme.contrast.test.ts):** File exists; uses `describe.each` over the 5 concrete themes. Honored in plan 01.
- **D-16 ('system' skipped from contrast test):** `THEME_OPTIONS.filter(t => t !== 'system')` — 5 iterations only. Honored in plan 01.
- **D-17 (per-commit green-gate):** `tsc && lint && build && test` exit 0 at every commit boundary throughout all 4 plans. Honored in plans 01-04.
- **D-18 (zero new npm deps):** No `npm install` across all 4 plans. Color math (sRGB → luminance) is inline in the test file. Honored in plans 01-04.
- **D-19 (SettingsDialog.tsx not edited in Phase 16):** `git diff src/components/SettingsDialog.tsx` is empty. Honored in plan 04.
- **D-20 (ThemePickerProps: only { disabled: boolean }):** The interface has exactly one property. Internal setter from `useThemeChoice`. Honored in plan 04.
- **D-21 (domain/settings.ts + prefs.ts not edited):** `ThemeId`, `THEME_OPTIONS`, `loadPrefs`, `savePrefs` consumed as final. Honored across all plans.
- **D-22 (locked option labels: Light/Dark/System/Moss/Slate/Dusk verbatim):** Labels derived as `id.charAt(0).toUpperCase() + id.slice(1)` — no display-mapping Record needed. Honored in plan 04.

## Test Counts

| Milestone | Count |
|-----------|-------|
| Pre-Phase-16 baseline (after Phase 15) | 466 |
| Plan 01 additions | +5 (theme.contrast.test.ts: 5 iterations) |
| Plan 02 additions | +16 (useTheme.test.ts: 10, useThemeChoice.test.ts: 6) |
| Plan 03 additions | 0 (no new test files; existing 10 storage tests pass) |
| Plan 04 additions | +8 (ThemePicker.test.tsx: 8 tests replacing 3 stubs; net +5) |
| **Final total** | **487 (before stub replacement) → 492 after** |

Note: The Phase 15 stub tests for ThemePicker (3 tests) were replaced by 8 new tests (net +5). The plan projected ≥ 466 + 16 + 7 = ≥ 489; actual final count is 492.

## Files Modified

| File | Plan | Change |
|------|------|--------|
| `src/styles/theme.css` | 16-01 | @theme → Light; +4 [data-theme] override blocks |
| `src/styles/theme.contrast.test.ts` | 16-01 | NEW: 5-iteration WCAG luminance guard |
| `src/hooks/useTheme.ts` | 16-02 | NEW: App-side orchestrator hook |
| `src/hooks/useTheme.test.ts` | 16-02 | NEW: 10 tests |
| `src/hooks/useThemeChoice.ts` | 16-02 | NEW: picker-side companion hook |
| `src/hooks/useThemeChoice.test.ts` | 16-02 | NEW: 6 tests |
| `index.html` | 16-03 | +FOUC inline script in <head> |
| `src/storage/storage.ts` | 16-03 | +SYNC comment above STATE_KEY |
| `src/components/ThemePicker.tsx` | 16-04 | Stub → real radiogroup picker |
| `src/components/ThemePicker.test.tsx` | 16-04 | 3 stub tests → 8 real tests |
| `src/components/SettingsDialog.test.tsx` | 16-04 | Update Landmine 7 assertion for new picker |
| `src/app/App.tsx` | 16-04 | +useTheme() import + invocation |
| `.planning/REQUIREMENTS.md` | 16-04 | THEME-01..05 → Done |
| `.planning/STATE.md` | 16-04 | Phase 16 complete; current → Phase 17 |
| `.planning/ROADMAP.md` | 16-04 | Phase 16 [x]; 4/4 plans listed |
| `.planning/phases/16-themes/16-SUMMARY.md` | 16-04 | NEW: this file |

## Carry-Forward

From `CONTEXT.md` §"Deferred Ideas":

- **Arrow-key navigation in radiogroup** — deferred to v1.2+. UI-SPEC §5 locked Tab-only for v1.1 consistency with existing pickers.
- **Schema-drift guard test** — deferred until a second `ThemeId` is added without an override block.
- **Theme-aware `--shadow-breathing-card`** — Phase 16 D-02 scopes `--color-*` only; teal-tinted shadow stays palette-independent.
- **`<meta name="theme-color">` mobile-chrome tint** — deferred polish phase.
- **CIELAB delta-E contrast metric** — WCAG luminance ratio ≥ 1.5 is the v1.1 floor; CIELAB deferred to v1.2+.
- **Theme transition animation** — instant switching preserved; tween risks degrading THEME-05 contract.
- **Color-swatch / mini-card option preview** — Phase 15 D-18 "no description copy" carried.

## Next Phase

**Phase 17: Visual Variants** — Orb (default) + 2 alternate visual variants; render-only; disabled while `inSessionView`. The hook pattern established in Phase 16 (`useThemeChoice` / `useTheme`) is the template Phase 17 will mirror with `useVariantChoice` and any App-side variant orchestrator. The `'hrv:prefs-changed'` event bus is reused with `{ key: 'variant', value: VisualVariantId }`.

Phase 16 unblocks Phase 17, 18, and 19 independently (all depend on Phase 15 shell; Phase 16 adds the theme system that the dialog now renders at first open).
