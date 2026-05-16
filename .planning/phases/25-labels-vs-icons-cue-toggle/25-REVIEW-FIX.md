---
phase: 25-labels-vs-icons-cue-toggle
fixed_at: 2026-05-15T22:24:00Z
review_path: .planning/phases/25-labels-vs-icons-cue-toggle/25-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 25: Code Review Fix Report

**Fixed at:** 2026-05-15T22:24:00Z
**Source review:** .planning/phases/25-labels-vs-icons-cue-toggle/25-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (0 critical, 4 warning)
- Fixed: 4
- Skipped: 0

All four Warning-severity findings were fixed. No Critical findings were
reported. The five Info findings (IN-01..IN-05) were out of scope
(`fix_scope: critical_warning`) and were not addressed.

Green gate verified before committing: `tsc -b` clean, `eslint .` clean
(one pre-existing unrelated `react-refresh/only-export-components` warning
in `App.tsx`, not introduced by these fixes), `vite build` succeeds, and
all 958 tests across 64 test files pass.

## Fixed Issues

### WR-01: `useVisualCue` exposes a non-persisting `setCue` that silently loses writes

**Files modified:** `src/hooks/useVisualCue.ts`
**Commit:** 0bcad8d
**Applied fix:** Dropped `setCue` from both the return type annotation
(`{ cue: CueStyleId }`) and the returned object value. The raw `useState`
setter is retained internally for the cross-tab and same-tab sync effects,
with an added comment clarifying it is intentionally not exposed. Verified
no caller used the setter — `App.tsx` destructures only `cue`, and
`useVisualCue.test.ts` reads only `result.current.cue`. The hook surface
now matches `useVisualVariant`, which it claims to mirror.

### WR-02: Decorative `CueGlyph` SVGs lack `focusable="false"`

**Files modified:** `src/components/CueGlyph.tsx`
**Commit:** 796958b (combined with WR-03 — same file)
**Applied fix:** Added `focusable="false"` alongside the existing
`aria-hidden="true"` on both the arrow-mode and nose-mode `<svg>` elements,
preventing the SVGs from becoming keyboard tab stops on IE11 / legacy Edge.

### WR-03: `preview` prop conflates two behaviors and emits a fragile a11y node

**Files modified:** `src/components/CueGlyph.tsx`
**Commit:** 796958b (combined with WR-02 — same file)
**Applied fix:** Replaced the hardcoded English `'T'` labels-preview
character with `phaseLabel.charAt(0)`, so a localized build shows the first
character of the localized option name. The arrow-mode and nose-mode
branches now render their `sr-only` span only when `!preview`, so picker
swatches emit no accessibility node and no longer depend on an ancestor's
`aria-hidden` to neutralize a semantically-wrong accessible name. The
existing test `labels preview renders a single "T"` (passes `phaseLabel="Text"`)
still passes since `"Text".charAt(0) === "T"`. Updated the `CueGlyphProps`
doc comment to match the new behavior.

**Note:** WR-02 and WR-03 both modify `src/components/CueGlyph.tsx`. Their
changes were applied together and committed as a single atomic commit
(796958b) with a message documenting both findings, since the two edits
cannot be separated into independent commits without one commit leaving
the file in an intermediate state.

### WR-04: Test asserts `aria-disabled="false"` relying on a React serialization detail

**Files modified:** `src/components/SettingsDialog.test.tsx`
**Commit:** 07ac9a7
**Applied fix:** Per the review's recommended option, kept the
`aria-disabled={disabled}` form in `CuePicker` and the existing test
assertion, and added a code comment in `SettingsDialog.test.tsx` marking
the literal-`"false"` serialization as load-bearing. The comment documents
that a future refactor to `aria-disabled={disabled || undefined}` would
drop the attribute and require flipping the assertion. This is a
test-robustness improvement, not a product change.

---

_Fixed: 2026-05-15T22:24:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
