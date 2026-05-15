---
phase: 16
plan: "02"
subsystem: hooks
tags: [hooks, theme, matchMedia, localStorage, CustomEvent, TDD]
dependency_graph:
  requires:
    - "14-01 (prefs foundation — loadPrefs/savePrefs/ThemeId/coerceTheme)"
    - "16-01 (CSS theme surface — [data-theme] attribute)"
  provides:
    - "useTheme: App-side theme orchestrator hook"
    - "useThemeChoice: picker-side setter hook"
  affects:
    - "16-04 (ThemePicker wires useThemeChoice)"
    - "16-03 (SettingsDialog mounts ThemePicker — indirect)"
tech_stack:
  added: []
  patterns:
    - "matchMedia lifecycle (usePrefersReducedMotion template with system gate added)"
    - "CustomEvent bus (hrv:prefs-changed) for same-tab prefs sync"
    - "useCallback([]) for stable setter identity (mirrors App.tsx persistedSetSettings)"
key_files:
  created:
    - src/hooks/useTheme.ts
    - src/hooks/useTheme.test.ts
    - src/hooks/useThemeChoice.ts
    - src/hooks/useThemeChoice.test.ts
  modified: []
decisions:
  - "Four-effect split inside useTheme (apply + gated mql + storage + prefs-changed) — one effect per concern, mirrors usePrefersReducedMotion and App.tsx separation"
  - "CustomEvent detail shape locked as { key: 'theme', value: ThemeId } — forward-compat for Phase 17/18/19 dispatches on same event name"
  - "useTheme does NOT call savePrefs — picker-side useThemeChoice owns the write path (A-01/A-02)"
  - "resolveSystem() helper inlined into the mql effect — eliminated unused function to satisfy ESLint no-unused-vars"
metrics:
  duration: "5 minutes"
  completed: "2026-05-13"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
  tests_added: 16
---

# Phase 16 Plan 02: Theme Hook Orchestration Layer Summary

Two hooks delivering theme orchestration from user picker click through to the cascading `[data-theme]` DOM attribute consumed by the CSS surface from plan 01.

## Hook Contracts

### `useTheme(): { theme: ThemeId; setTheme: (next: ThemeId) => void }`

**File:** `src/hooks/useTheme.ts`

**Responsibility:** App-side orchestrator. Owns React state + all DOM side effects + listener fleet. Stateless from App.tsx's perspective — called for its side effects on the `<html>` element.

**Four-effect split (D-21 comment for downstream reviewers):**

| Effect | Dep array | Responsibility |
|--------|-----------|----------------|
| Apply effect | `[theme]` | Writes `document.documentElement.dataset.theme = theme` for named themes; returns early when `theme === 'system'` (mql effect owns that write) |
| Gated mql effect | `[theme]` | Attaches `matchMedia('(prefers-color-scheme: dark)')` listener ONLY when `state === 'system'` (S-04). Re-seeds (IN-02) on attach for stale-initial-state safety. Cleanup on system→named switch. |
| Storage listener | `[]` | Cross-tab sync (A-04). `window.addEventListener('storage', ...)` filtered on `e.key === STATE_KEY`. Mirrors App.tsx STORAGE-03 pattern verbatim. |
| Prefs-changed listener | `[]` | Same-tab sync (A-03). `window.addEventListener('hrv:prefs-changed', ...)`. Re-reads `loadPrefs().theme` when `detail.key === 'theme'` or key is absent. Forward-compat: key-absent payloads treated as "re-read all prefs". |

**Imports:** `loadPrefs` from `'../storage/prefs'`, `STATE_KEY` from `'../storage'` (barrel), `type ThemeId` from `'../domain/settings'`.

### `useThemeChoice(): { theme: ThemeId; setTheme: (next: ThemeId) => void }`

**File:** `src/hooks/useThemeChoice.ts`

**Responsibility:** Picker-side companion (A-02). Called from `ThemePicker.tsx` (plan 04). Provides local React state (optimistic-UI for the picker) and a stable-identity setter.

**setTheme(next: ThemeId) call sequence:**
1. `loadPrefs()` — fresh read of current envelope (avoids stale closure from mount).
2. `savePrefs({ ...current, theme: next })` — preserves timbre/variant/locale (Phase 14 D-17 per-field isolation).
3. `setThemeState(next)` — optimistic local update (picker reflects change immediately).
4. `window.dispatchEvent(new CustomEvent('hrv:prefs-changed', { detail: { key: 'theme', value: next } }))` — signals useTheme to re-read and update `<html data-theme>`.

**useCallback([]) contract:** empty deps for stable setter identity — ThemePicker won't trigger re-renders when the hook re-renders for other reasons.

## CustomEvent Detail Shape — Locked

```ts
{ key: 'theme', value: ThemeId }
```

**Forward-compat note for Phase 17/18/19:** The same `'hrv:prefs-changed'` event name dispatches different keys per dimension:
- Phase 17 visual variants → `{ key: 'variant', value: VisualVariantId }`
- Phase 18 audio timbres → `{ key: 'timbre', value: TimbreId }`
- Phase 19 locale → `{ key: 'locale', value: LocaleId }`

`useTheme` filters on `detail.key === 'theme'`. Future hooks (useVariantChoice, etc.) follow the same `useThemeChoice` pattern with a different key. The event name `'hrv:prefs-changed'` is the stable bus; the `key` field routes to the correct handler.

The `detail.value` field carries the new value for potential logging/optimistic use but `useTheme` intentionally re-reads from disk (`loadPrefs()`) rather than trusting the event payload — this is T-16-02-01 tampering mitigation: the event is a signal, not an authority.

## Test Counts

| File | Tests | Coverage |
|------|-------|---------|
| `src/hooks/useTheme.test.ts` | 10 | Mount seed, system+matchMedia (true/false), mql change event, no-listener on named theme, listener cleanup on unmount, cross-tab storage event (hit/miss), same-tab prefs-changed (theme hit, variant miss) |
| `src/hooks/useThemeChoice.test.ts` | 6 | Initial seed, optimistic update, disk write, envelope merge preservation, CustomEvent detail shape, setter identity stability |
| **Total** | **16** | |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused `resolveSystem()` function caused ESLint `no-unused-vars` error**

- **Found during:** Task 1 GREEN verification (tsc + lint)
- **Issue:** The plan called for a `resolveSystem()` local helper but the implementation correctly inlined the matchMedia logic directly in the gated mql effect, leaving the helper unused.
- **Fix:** Removed the unused helper; matchMedia.matches ternary is inlined at the two call sites inside the gated effect.
- **Files modified:** `src/hooks/useTheme.ts`
- **Commit:** 7572845

**2. [Rule 1 - Bug] Unnecessary `as MediaQueryList['addEventListener']` cast in test caused lint error**

- **Found during:** Task 1 GREEN verification
- **Issue:** The cast was copied from usePrefersReducedMotion.test.ts but was flagged as unnecessary by `@typescript-eslint/no-unnecessary-type-assertion` (the function literal already satisfies the expected type).
- **Fix:** Replaced the cast with an explicit return type annotation on the arrow function (`): void =>`).
- **Files modified:** `src/hooks/useTheme.test.ts`
- **Commit:** 7572845

**3. [Rule 1 - Bug] TS2532 — `spy.mock.calls[0]` possibly undefined in useThemeChoice.test.ts**

- **Found during:** Task 2 full green-gate (`npm run build` runs `tsc -b`)
- **Issue:** `noUncheckedIndexedAccess` in tsconfig makes array index access return `T | undefined`. After `toHaveBeenCalledTimes(1)` assertion the access is safe but the compiler doesn't know.
- **Fix:** Added `!` non-null assertion with a `// Reason:` comment explaining the invariant.
- **Files modified:** `src/hooks/useThemeChoice.test.ts`
- **Commit:** f77cf5c

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All operations are local DOM mutation and localStorage read/write (same surface as Phase 14 prefs layer). Threat model coverage matches plan's STRIDE register — no unplanned threat surface.

## Self-Check: PASSED

Files exist:
- FOUND: src/hooks/useTheme.ts
- FOUND: src/hooks/useTheme.test.ts
- FOUND: src/hooks/useThemeChoice.ts
- FOUND: src/hooks/useThemeChoice.test.ts

Commits exist (from HEAD, 5 commits):
- f77cf5c: fix(16-02): fix TS2532 in useThemeChoice.test
- 9309e84: feat(16-02): implement useThemeChoice hook (GREEN)
- 9e90ef2: test(16-02): add failing tests for useThemeChoice hook (RED)
- 7572845: feat(16-02): implement useTheme hook (GREEN)
- 9bdccff: test(16-02): add failing tests for useTheme hook (RED)

Green-gate at final commit: tsc (0 errors) + lint (0 errors) + build (success) + test (482/482 pass).
