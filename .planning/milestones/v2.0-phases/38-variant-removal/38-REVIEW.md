---
phase: 38-variant-removal
reviewed: 2026-05-21T00:00:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - src/app/App.locale.test.tsx
  - src/app/App.session.test.tsx
  - src/app/App.test.tsx
  - src/app/App.tsx
  - src/components/CueGlyph.tsx
  - src/components/CuePicker.tsx
  - src/components/NKShape.test.tsx
  - src/components/NKShape.tsx
  - src/components/OrbShape.tsx
  - src/components/SettingsDialog.test.tsx
  - src/components/SettingsDialog.tsx
  - src/components/shapeConstants.ts
  - src/content/content.no-variants.test.ts
  - src/content/strings.test.ts
  - src/content/strings.ts
  - src/domain/settings.test.ts
  - src/domain/settings.ts
  - src/hooks/useCueChoice.test.ts
  - src/hooks/useLocale.test.ts
  - src/hooks/useLocaleChoice.test.ts
  - src/hooks/useThemeChoice.test.ts
  - src/hooks/useTimbreChoice.test.ts
  - src/storage/prefs.test.ts
  - src/storage/prefs.ts
  - src/styles/theme.css
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 38: Code Review Report

**Reviewed:** 2026-05-21T00:00:00Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Phase 38 deleted `SquareShape`, `DiamondShape`, `VariantPicker`, `BreathingShape`, `useVisualVariant`, and `useVariantChoice` (plus their tests), collapsing the shape-dispatcher surface to Orb-only. The surviving edits are broadly clean: `UserPrefs` correctly has 4 fields, `domain/settings.ts` has no orphan variant symbols, `App.tsx` has no trace of `sessionVariantRef`/`liveVariant`/`VisualVariantId`, and the idle null-return guard in `OrbShape` is correctly placed after the `nkPhase` and `leadInDigit` checks.

Two issues require attention before shipping:

1. **CRITICAL** — Three test fixture helper functions in `App.session.test.tsx` still embed `variant: 'orb'` in their raw localStorage envelope objects. This is a stale field: `UserPrefs` no longer has a `variant` key, so the fixture silently injects an unknown field that `coercePrefs` discards. The tests pass today, but they validate against a prefs schema that no longer exists and will silently mislead future authors about the persisted envelope shape.

2. **WARNING** — `theme.css` comments at four locations name `BreathingShape.tsx` as the canonical home of the `MIN_SCALE`/`MAX_SCALE`/`MID_SCALE` TS constants. That file was deleted; the constants now live in `shapeConstants.ts`. The "keep in sync" guidance points at a non-existent file.

The VAR-06 drift-guard (`content.no-variants.test.ts`) is functionally correct and its self-exclusion logic is sound. Its scan roots (`components/`, `app/`, `content/`, `styles/`) intentionally omit `hooks/`, `storage/`, and `domain/`. This is a documented coverage gap (commented orphan strings in those directories are code-comments only, not executable); it is called out as a warning for visibility.

---

## Critical Issues

### CR-01: Stale `variant: 'orb'` field in test fixture helpers in `App.session.test.tsx`

**File:** `src/app/App.session.test.tsx:353`, `361`, `410`

**Issue:** The `seedCue`, `seedTimbre` helper functions, and the mid-session mutation envelope at line 410, all embed `variant: 'orb'` in the raw JSON they write to `localStorage`. `UserPrefs` has been trimmed to four fields (`theme`, `timbre`, `cue`, `locale`) by Phase 38 — the `variant` key is gone from the type, the default, and `coercePrefs`. The stale field is silently dropped by `coercePrefs` (which reads only the four known keys), so the tests pass. But:

- The fixtures misrepresent the persisted envelope schema to future readers.
- A correctness-regression test for the prefs migration path ("returning user with old `variant` key gets clean coercion") would be exercising the wrong precondition if it relied on these helpers.
- The `seedCue` helper at line 353 is used by at least one test that asserts cue-capture-at-Start behavior; having an extra unrecognized key in the envelope is not intrinsically wrong for coerce-and-fallback, but leaving orphan fields is confusing and inconsistent with every other test in the suite (all other `seedPrefs`/`DEFAULT_FULL_PREFS` fixtures use the correct 4-field shape).

**Fix:**
```typescript
// src/app/App.session.test.tsx

// BEFORE (line 351-355):
function seedCue(cue: CueStyleId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre: 'sine', variant: 'orb', cue, locale: 'en' },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}

// AFTER:
function seedCue(cue: CueStyleId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre: 'sine', cue, locale: 'en' },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}

// BEFORE (line 358-363):
function seedTimbre(timbre: TimbreId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre, variant: 'orb', locale: 'en' },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}

// AFTER:
function seedTimbre(timbre: TimbreId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre, locale: 'en' },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}

// BEFORE (line 408-411):
const fluteEnvelope = JSON.stringify({
  version: 1,
  prefs: { theme: 'system', timbre: 'flute', variant: 'orb', locale: 'en' },
})

// AFTER:
const fluteEnvelope = JSON.stringify({
  version: 1,
  prefs: { theme: 'system', timbre: 'flute', locale: 'en' },
})
```

---

## Warnings

### WR-01: Stale `BreathingShape.tsx` filename in `theme.css` sync comments

**File:** `src/styles/theme.css:74`, `78`, `79`, `80`, `420`

**Issue:** Five comment lines reference `src/components/BreathingShape.tsx` as the canonical location of the `MIN_SCALE`/`MAX_SCALE`/`MID_SCALE` TypeScript constants. `BreathingShape.tsx` was deleted in Phase 38. The constants now live in `src/components/shapeConstants.ts` and are imported by `OrbShape.tsx`. The "keep in sync with `BreathingShape.tsx`" directive in the `@theme` block and in the `@media (prefers-reduced-motion)` block points at a non-existent file, misdirecting any future maintainer who follows it.

**Fix:**
```css
/* Line 74 — in the @theme block comment: */
/* BEFORE: */
MIN_SCALE/MAX_SCALE/MID_SCALE in `src/components/BreathingShape.tsx`.

/* AFTER: */
MIN_SCALE/MAX_SCALE/MID_SCALE in `src/components/shapeConstants.ts`.

/* Lines 78–80 — the three inline keep-in-sync comments: */
/* BEFORE: */
--orb-scale-min: 0.58; /* keep in sync with MIN_SCALE in BreathingShape.tsx */
--orb-scale-max: 1.0; /* keep in sync with MAX_SCALE in BreathingShape.tsx */
--orb-scale-mid: 0.79; /* keep in sync with MID_SCALE in BreathingShape.tsx */

/* AFTER: */
--orb-scale-min: 0.58; /* keep in sync with MIN_SCALE in shapeConstants.ts */
--orb-scale-max: 1.0; /* keep in sync with MAX_SCALE in shapeConstants.ts */
--orb-scale-mid: 0.79; /* keep in sync with MID_SCALE in shapeConstants.ts */

/* Line 420 — reduced-motion block comment: */
/* BEFORE: */
- CR-01: Do NOT set `transform: none !important` here. BreathingShape sets the
  reduced-motion fixed scale via inline `transform: scale(var(--orb-scale-mid))`

/* AFTER: */
- CR-01: Do NOT set `transform: none !important` here. OrbShape (OrbBody) sets the
  reduced-motion fixed scale via inline `transform: scale(var(--orb-scale-mid))`
```

### WR-02: Dead `export { MID_SCALE }` in `NKShape.tsx`

**File:** `src/components/NKShape.tsx:113`

**Issue:** Line 113 re-exports `MID_SCALE` from `shapeConstants.ts` with the comment "for tests that need to verify the resting scale." `NKShape.test.tsx` does not import `MID_SCALE` from `NKShape` — nor does any other file in the project. The re-export is unused dead code. Any future test that does need the constant should import it directly from `./shapeConstants` rather than through `NKShape`, which is an indirect and misleading path.

**Fix:**
```typescript
// src/components/NKShape.tsx

// Remove lines 112-113:
// Export MID_SCALE for tests that need to verify the resting scale
export { MID_SCALE }
```

### WR-03: VAR-06 drift-guard scan does not cover `src/hooks/`, `src/storage/`, or `src/domain/`

**File:** `src/content/content.no-variants.test.ts:56-67`

**Issue:** The four scan roots are `components/`, `app/`, `content/`, and `styles/`. The directories `src/hooks/`, `src/storage/`, and `src/domain/` are not included. If a forbidden variant symbol (e.g., `useVariantChoice`, `coerceVariant`, `VisualVariantId`) were re-introduced in those directories, the guard would not catch it. At present this is low-risk — no executable code in those directories references the forbidden symbols — but it is a documented coverage gap. The hooks directory already has three comment-only references to deleted hooks (`useVariantChoice.ts` in `useLocaleChoice.ts:32` and `useTimbreChoice.ts:32`; `useVisualVariant.ts` in `useVisualCue.ts:4`) that the guard does not surface.

**Fix:** Extend the scan to include the missing roots, or explicitly document the out-of-scope directories as an accepted risk in the guard's header comment:

```typescript
// Option A — extend the scan roots:
const HOOKS_DIR   = resolve(__dirname, '..', 'hooks')
const STORAGE_DIR = resolve(__dirname, '..', 'storage')
const DOMAIN_DIR  = resolve(__dirname, '..', 'domain')

const SCAN_FILES: string[] = [
  ...collectFiles(COMPONENTS_DIR),
  ...collectFiles(APP_DIR),
  ...collectFiles(CONTENT_DIR),
  ...collectFiles(STYLES_DIR),
  ...collectFiles(HOOKS_DIR),
  ...collectFiles(STORAGE_DIR),
  ...collectFiles(DOMAIN_DIR),
]

// Option B — document the accepted gap in the guard header:
// Scan roots: src/components/, src/app/, src/content/, src/styles/
// NOT scanned: src/hooks/, src/storage/, src/domain/ — these contain only
// comment-only references to the deleted hooks and are accepted as out-of-scope.
// If a forbidden symbol re-enters those directories in executable code, update
// SCAN_FILES to add the corresponding root.
```

---

## Info

### IN-01: Stale `sessionVariantRef` reference in `App.session.test.tsx` comment

**File:** `src/app/App.session.test.tsx:381-382`

**Issue:** The TIMBRE-03 test comment reads "mirror of `sessionVariantRef` capture at line ~338 of App.tsx." `sessionVariantRef` was deleted in Phase 38; line ~338 of the current `App.tsx` is unrelated `wakeLock.request` code. The timbre analogue is `capturedTimbre` (a `const` local in `onStartClick`, currently around line 494 of `App.tsx`).

**Fix:**
```typescript
// BEFORE:
//     reads loadPrefs().timbre inside the user-gesture chain (mirror of sessionVariantRef
//     capture at line ~338 of App.tsx).

// AFTER:
//     reads loadPrefs().timbre inside the user-gesture chain (mirror of the
//     capturedTimbre local const in onStartClick, ~App.tsx:494).
```

### IN-02: Comment-only stale references to deleted hook files in `src/hooks/`

**File:** `src/hooks/useLocaleChoice.ts:32`, `src/hooks/useTimbreChoice.ts:32`, `src/hooks/useVisualCue.ts:4`

**Issue:** Three files in `src/hooks/` contain comment-only references to deleted files:
- `useLocaleChoice.ts:32` and `useTimbreChoice.ts:32`: "mirrors `useVariantChoice.ts` line 32"
- `useVisualCue.ts:4`: "Mirror of `useVisualVariant.ts`"

These files are not in the VAR-06 scan scope. The references are in comments, not executable code, so there is no runtime impact. They are maintenance debt that a future reader following the "mirror" cross-reference will find leads to a deleted file.

**Fix:** Update the cross-reference comments to name the actual analogous file. For `useLocaleChoice.ts` and `useTimbreChoice.ts`, the pattern is shared with `useCueChoice.ts` and `useThemeChoice.ts`; for `useVisualCue.ts`, the structural analog is now `useTheme.ts` or another surviving hook.

---

_Reviewed: 2026-05-21T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
