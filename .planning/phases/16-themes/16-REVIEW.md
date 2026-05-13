---
phase: 16-themes
reviewed: 2026-05-13T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - index.html
  - src/storage/storage.ts
  - src/styles/theme.css
  - src/hooks/useTheme.ts
  - src/hooks/useThemeChoice.ts
  - src/components/ThemePicker.tsx
  - src/app/App.tsx
  - src/styles/theme.contrast.test.ts
  - src/hooks/useTheme.test.ts
  - src/hooks/useThemeChoice.test.ts
  - src/components/ThemePicker.test.tsx
  - src/components/SettingsDialog.test.tsx
findings:
  critical: 0
  blocker: 0
  warning: 6
  info: 5
  total: 11
status: warnings
---

# Phase 16: Themes — Code Review Report

**Reviewed:** 2026-05-13
**Depth:** standard
**Files Reviewed:** 12
**Status:** warnings (no blockers; multiple correctness/coverage gaps)

## Summary

The Phase 16 wiring is structurally correct: the FOUC inline script is synchronous classic ES5 with the right allowlist, the `'hrv:state:v1'` literal is duplicated in both required sites with the SYNC comment in place, the 4-effect split in `useTheme` matches the contract (S-01/S-04 + A-03/A-04), and all four locked invariants (D-18..D-21) hold. The orb-midpoint contrast guard runs across the 5 concrete palettes and the D-03 Moss orb-out shift (`#bfdbfe/#eef2ff` → `#3b82f6/#bfdbfe`) is documented inline.

However, the implementation has several quality and coverage defects that warrant fixing before downstream phases mirror this template: hardcoded teal/slate Tailwind utilities inside `ThemePicker.tsx` defeat per-theme recoloring of the picker's unselected state and section label; `useThemeChoice` does not subscribe to the cross-tab/same-tab event bus that `useTheme` exposes, so a picker mounted while another tab writes goes visually stale; the test suite has gaps around the S-04 "system → named" transition cleanup, around the publicly-exposed `useTheme().setTheme` returned setter (which has zero call sites), and around the FOUC allowlist drift surface (the SYNC comment only covers the `:v1` key suffix, not the allowlist). None of these are correctness or security blockers; they are quality issues that the next picker phase (17/18/19) will inherit if not addressed now.

## Warnings

### WR-01: ThemePicker introduces hardcoded teal/slate classes that bypass the [data-theme] cascade

**File:** `src/components/ThemePicker.tsx:22`, `src/components/ThemePicker.tsx:33`
**Issue:** The section label uses `text-slate-900` (line 22) and unselected option buttons use `border border-teal-200 bg-white text-teal-800 hover:bg-teal-50 active:bg-teal-100` (line 33). These are static Tailwind palette classes — they do not resolve to `var(--color-*)` and therefore do not recolor when `[data-theme]` switches. The selected-state classes on line 32 correctly use `var(--color-breathing-accent)` / `var(--color-breathing-bg-soft)` / `var(--color-breathing-accent-strong)`, producing the asymmetry that the *currently selected* button retints per theme while the five *unselected* buttons stay teal/white in every palette. On Dark/Dusk this is most jarring (selected button shifts to teal-on-dark / amber-on-violet while neighbors remain teal-on-white). D-02 explicitly scopes "every `--color-*` token is themable"; the picker is the first new component built on top of that contract and partially defeats it.
**Fix:** Replace unselected classes with theme-token equivalents — `border-[var(--color-breathing-muted)] bg-[var(--color-breathing-surface)] text-[var(--color-breathing-accent-strong)] hover:bg-[var(--color-breathing-bg-soft)]` and replace `text-slate-900` on the label with `text-[var(--color-breathing-accent-strong)]` (or another already-themed token). Same pattern Phase 17/18/19 will copy.

### WR-02: useThemeChoice does not subscribe to hrv:prefs-changed or storage events — local state goes stale under cross-source writes

**File:** `src/hooks/useThemeChoice.ts:27-46`
**Issue:** `useThemeChoice` seeds its `theme` mirror from `loadPrefs()` once at mount (line 28) and updates it only via its own `setTheme` (line 38). If the picker is mounted (Settings dialog open) and a write arrives from another tab (`storage` event) or from another picker instance / future caller (`hrv:prefs-changed`), the App-side `useTheme` updates `<html data-theme>` correctly, but the picker's `theme` mirror does not — so `aria-checked` and the selected-button highlight stay on the OLD value while the page chrome shifts. The race is rare (requires picker open + concurrent write) but is a real UI inconsistency, and Phase 17/18/19 will copy this hook shape.
**Fix:** Add two listeners inside `useThemeChoice` (same shape as `useTheme` effects 3+4) that call `setThemeState(loadPrefs().theme)` on `storage` (filtered on `STATE_KEY`) and `hrv:prefs-changed` (filtered on `detail.key === 'theme' || detail.key == null`). Suppress the picker's own self-dispatch echo via a ref-flag set immediately before `dispatchEvent(...)` and cleared in the listener.

### WR-03: useTheme returns a setTheme that has zero external call sites — dead public API surface

**File:** `src/hooks/useTheme.ts:26`, `src/hooks/useTheme.ts:91`
**Issue:** The hook returns `{ theme, setTheme }` but `App.tsx:139` discards the return value (`useTheme()` with no destructure) and no other module imports the hook. The `setTheme` exposed in the public shape is only used internally by event handlers to write React state. A typed `setTheme` setter visible to callers invites accidental misuse — a caller could call `useTheme().setTheme('dark')` and bypass `savePrefs`, producing RAM-only state that vanishes on reload. The Plan-02 summary's A-01/A-02 split is explicit that the picker uses `useThemeChoice` for writes, not `useTheme.setTheme`.
**Fix:** Either (a) narrow the return type to `void` (or `{ theme: ThemeId }`) and remove the publicly-exposed `setTheme`, keeping the React state setter strictly internal; or (b) rename the public setter to make the no-persist semantics explicit (e.g., `_reseedFromDisk`). Update the JSDoc at the top of the file to match.

### WR-04: useTheme.test.ts has no test for the S-04 system→named cleanup path

**File:** `src/hooks/useTheme.test.ts:107-116`
**Issue:** The "cleans up matchMedia listener on unmount when theme is system" test only covers the unmount cleanup case. The S-04 contract is stricter: the listener must also be torn down when the user *switches away* from `'system'` to a named theme while the hook stays mounted (cleanup of effect 2 because dep `[theme]` changes). No test exercises that transition. A future regression that forgets `dep [theme]` on effect 2 (e.g., switching to empty deps) would not be caught — the test suite would stay green while the mql listener keeps firing in `'dark'` mode and stomping on the user's selection.
**Fix:** Add a test that seeds `'system'`, renders the hook, dispatches `hrv:prefs-changed { key: 'theme', value: 'dark' }` (or simulates via an additional re-render that toggles state), and asserts `removeEventListener('change', ...)` was called with the same callback.

### WR-05: useTheme.test.ts does not exercise the publicly returned setTheme

**File:** `src/hooks/useTheme.test.ts` (entire file)
**Issue:** None of the 10 tests call `result.current.setTheme(...)` and assert that the hook's state + DOM attribute update. State updates are tested only via the storage and `hrv:prefs-changed` event paths. If `setTheme` is intentionally part of the public API (see WR-03), it has zero direct coverage; if it is intentionally internal-only, the hook signature is misleading. Either way the test surface and the type surface disagree.
**Fix:** Either (a) reconcile by removing `setTheme` from the public return per WR-03; or (b) add one direct test: `act(() => result.current.setTheme('dusk'))`, then assert both `result.current.theme === 'dusk'` and `document.documentElement.dataset.theme === 'dusk'`.

### WR-06: FOUC allowlist drift is unguarded — schema mismatch with THEME_OPTIONS silently swallowed

**File:** `index.html:8`, `src/storage/storage.ts:35-36`
**Issue:** The inline boot script's allowlist `['light','dark','moss','slate','dusk']` is the second hardcoded literal Phase 16 introduces (alongside `'hrv:state:v1'`), but the SYNC comment in `storage.ts:35-36` only mentions "when bumping the `:v1` suffix, update the hardcoded `'hrv:state:v1'` string". It does not mention the allowlist. If a future phase widens `THEME_OPTIONS` (e.g., adds `'aurora'` per the deferred "schema-drift guard test"), saved `theme: 'aurora'` will hit the FOUC allowlist's `indexOf(...) < 0` branch and resolve to `matchMedia` → `'light'`/`'dark'` for first paint. After hydration, `useTheme` would correctly apply `'aurora'` via the `data-theme` attribute, producing a single-frame flash. The CONTEXT calls this out as Deferred but the literal in `index.html` has no comment trail at all linking it back to `THEME_OPTIONS` — a future agent maintaining `domain/settings.ts` has no breadcrumb.
**Fix:** Extend the SYNC comment in `storage.ts:35-36` (and the inline `index.html` comment at line 7) to call out the two coupled literals separately: (a) the `:v1` key suffix, (b) the `THEME_OPTIONS`-minus-`'system'` allowlist. Optionally add a build-time assertion in a test file (e.g., grep `index.html` for the allowlist and `assertEqual(parsedAllowlist, THEME_OPTIONS.filter(t => t !== 'system'))`) — zero deps required.

## Info

### IN-01: useThemeChoice.setTheme dispatches CustomEvent + savePrefs even when value did not change

**File:** `src/hooks/useThemeChoice.ts:32-44`
**Issue:** Clicking the already-selected radio runs `loadPrefs() → savePrefs → setThemeState → dispatchEvent` with no value change, producing a redundant disk write and event. Not a correctness bug (writes are idempotent, listeners short-circuit on identical state) but noisy on the bus and in localStorage telemetry.
**Fix:** Add an early-return at the top: `if (next === theme) return` (closure-stale-safe because the optimistic mirror is always synced with the most recent setTheme). Or compare against a fresh `loadPrefs().theme` if stricter cross-tab semantics are desired.

### IN-02: useTheme effect 4 CustomEvent.detail is cast through `unknown` to `{ key?: string } | null` with no shape guard

**File:** `src/hooks/useTheme.ts:79-83`
**Issue:** `e.detail as { key?: string } | null` is an unchecked cast — if a third-party caller dispatches `new CustomEvent('hrv:prefs-changed', { detail: 'theme' })` (a bare string), `detail.key === undefined` evaluates true (because `'theme'.key` is `undefined`), and the handler re-reads `loadPrefs().theme`. Harmless because `loadPrefs()` always returns a valid `UserPrefs`, but the trust boundary is implicit. Phase 17/18/19 reusing the same event bus may dispatch shapes the planner did not anticipate.
**Fix:** Tighten the guard: `const detail = (e.detail && typeof e.detail === 'object') ? (e.detail as { key?: unknown }) : null; const key = typeof detail?.key === 'string' ? detail.key : undefined`. Then branch on the narrowed `key`.

### IN-03: theme.contrast.test.ts asserts contrast floor but does not pin the D-03 Moss orb-out shift

**File:** `src/styles/theme.contrast.test.ts:128-150`
**Issue:** The test confirms `ratio ≥ 1.5` for each of the 5 themes. It does not pin the specific Moss orb-out tokens that were shifted from v1.0.1 (`#bfdbfe/#eef2ff` → `#3b82f6/#bfdbfe`, per `theme.css:60-65`). A future palette edit that silently restores the original (failing-contrast) values for sentimental "v1.0.1 byte-identical" reasons would either bring the test back to 1.087 (caught) or accidentally land a different >1.5 pair (not caught — drift from documented intent). The plan-01 SUMMARY claims "15 byte-identical, 2 shifted" but there is no test guarding the byte-identity of the other 15 either.
**Fix:** Optional Info-level — add a guard test asserting the exact two-token shift, or document in `theme.css` (next to the existing comment) that the Moss palette is *deliberately* not byte-identical with v1.0.1 and the contrast test is the sole runtime guard.

### IN-04: theme.contrast.test.ts reads tokens directly instead of parsing the gradient string

**File:** `src/styles/theme.contrast.test.ts:138-141`
**Issue:** The CONTEXT/SUMMARY describe the test as parsing `linear-gradient(135deg, rgb(...), rgb(...))` from `getComputedStyle(...).background`. The implementation correctly skips that fragile path and reads `--color-orb-in-from`/`-to` directly. Documentation drift only — the test is sound (in fact more reliable, because it sidesteps jsdom's gradient resolution), but the CONTEXT block 16-CONTEXT.md "D-15" still describes the parsing approach.
**Fix:** Update the CONTEXT-comment in the test header (lines 1-6) and/or `16-CONTEXT.md` D-15 to reflect the simpler "read CSS custom properties directly" approach.

### IN-05: useTheme imports STATE_KEY from `'../storage'` barrel while sibling code uses direct path

**File:** `src/hooks/useTheme.ts:21`
**Issue:** Minor inconsistency — `loadPrefs` is imported from `'../storage/prefs'` (direct), `STATE_KEY` from `'../storage'` (barrel). Both resolve, but the direct/barrel mix makes refactoring (e.g., shaking the barrel) harder to audit. App.tsx uses the barrel for both. Style point only.
**Fix:** Pick one — either move `STATE_KEY` to the direct import path (`'../storage/storage'`) or change `loadPrefs` to come through the barrel. Trivial, optional.

## Locked Invariant Check

| Invariant | Status | Evidence |
|-----------|--------|----------|
| **D-18** (zero new npm dependencies) | PASS | Test files use only existing deps (vitest, @testing-library/*) plus Node built-ins (`node:fs`, `node:path` for theme.css read); no `package.json` change in scope. |
| **D-19** (`SettingsDialog.tsx` NOT edited) | PASS | `src/components/SettingsDialog.tsx` body unchanged from Phase 15; only `SettingsDialog.test.tsx` Landmine 7 assertion was updated to match the new picker UI (allowed per scope statement). |
| **D-20** (`ThemePickerProps = { disabled: boolean }` only) | PASS | `src/components/ThemePicker.tsx:13-15` — interface has exactly one property; `setTheme` sourced from internal `useThemeChoice()` (line 18), not props. |
| **D-21** (`domain/settings.ts` + `storage/prefs.ts` unchanged) | PASS | Both files inspected — no Phase 16 markers. `ThemeId`, `THEME_OPTIONS`, `isValidTheme`, `DEFAULT_THEME`, `loadPrefs`, `savePrefs`, `coercePrefs` consumed verbatim from Phase 14. |

---

_Reviewed: 2026-05-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
