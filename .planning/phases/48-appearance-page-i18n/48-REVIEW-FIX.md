---
phase: 48-appearance-page-i18n
fixed_at: 2026-05-26T09:37:00Z
review_path: .planning/phases/48-appearance-page-i18n/48-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 48: Code Review Fix Report

**Fixed at:** 2026-05-26T09:37:00Z
**Source review:** `.planning/phases/48-appearance-page-i18n/48-REVIEW.md`
**Iteration:** 1
**Fix scope:** critical + warning (info findings out of scope)

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03)
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: Duplicated private `SectionCard` component — chrome will drift

**Files modified:**
- `src/components/primitives/SectionCard.tsx` (new — shared primitive)
- `src/components/primitives/index.ts` (barrel export added)
- `src/app/pages/AppearancePage.tsx` (local copy removed, import added)
- `src/components/SettingsPanelBody.tsx` (local copy removed, import added)

**Commit:** `3cf352d`

**Applied fix:** Extracted the spike-locked card chrome (border-soft 1px + surface bg + 20px radius) from the two duplicated private functions into a new shared `SectionCard` primitive at `src/components/primitives/SectionCard.tsx` with the exact same signature (`padding: string`, `children: ReactNode`). Visual output is byte-identical to the prior inline copies. `LearnPanel.tsx`'s structurally-different variant (no `padding` prop) was intentionally left alone per reviewer note.

This consolidates the spike-locked design source of truth: any future v2.x update to the card chrome now flows through one component instead of two private copies that would silently desync.

### WR-02: Dead `id` attribute on OrbPicker / RingCuePicker label `<p>`

**Files modified:**
- `src/components/OrbPicker.tsx` (removed `id="orb-picker-label"`)
- `src/components/RingCuePicker.tsx` (removed `id="ring-cue-picker-label"`)

**Commit:** `dbd8c4a`

**Applied fix:** Removed the dead `id` attributes from both pickers' `<p>` sublabels. `SegmentedControl` labels its radiogroup via `aria-label` (not `aria-labelledby`), so the ids were unreferenced — a paste-and-rename inheritance from `LanguagePicker`. `LanguagePicker.tsx` was intentionally NOT touched per phase scope (its matching dead id belongs to a separate phase).

Chose the minimal-surgical option (a) from the reviewer's suggested fixes: just remove the dead attribute. The conditional `sectionLabelHidden ? 'sr-only' : ...` class logic is preserved so the pickers retain parity with `LanguagePicker`'s behavior for any future `sectionLabelHidden=true` consumers.

### WR-03: Marker-guard `label:` allowlist pattern is too broad

**Files modified:**
- `src/content/content.no-review-markers.test.ts` (rewrote allowlist + added regression tests)

**Commit:** `69fdbbb`

**Applied fix:** Replaced the shape-based regex allowlist (which fired on any `label:` / `theme:` line anywhere in `src/content/**.ts`) with a block-scope tracker. The new `findUnreviewedMarkers(text, file)` function walks each file line-by-line maintaining a stack of currently-open `<key>: {` block names. A marker is allowed iff the value line below it lives inside one of two structural contexts:

1. Any descendant of an `appearance: {` block (covers all appearance.* PT-BR keys); OR
2. The `theme:` value line directly under `appSettings.sections` (D-01 renamed key).

Added 4 new tests that lock the guard's behavior:
- WR-03 regression #1: a stray `label:` marker outside appearance.* still fails the guard.
- WR-03 regression #2: a stray `theme:` marker outside `appSettings.sections` still fails the guard.
- Positive: a marker inside any descendant of `appearance:` is allowed.
- Positive: a marker above `theme:` inside `appSettings.sections` is allowed.

Per `[[feedback_no_design_locking]]`: the tracker no longer anchors on specific key names (halo, kuthasta, rings, etc.) — only on block-scope shape. Future additions or renames inside `appearance.*` require zero test changes.

## Verification

### Per-fix verification (3-tier strategy)

| Finding | Tier 1 (re-read) | Tier 2 (tsc + targeted tests) |
|---------|------------------|-------------------------------|
| WR-01 | passed | `tsc --noEmit` clean; `SettingsPanelBody.test.tsx` + `AppearancePage.test.tsx` → 21/21 |
| WR-02 | passed | `OrbPicker.test.tsx` + `RingCuePicker.test.tsx` + `AppearancePage.test.tsx` → 19/19 |
| WR-03 | passed | `tsc --noEmit` clean; `content.no-review-markers.test.ts` → 5/5 (1 original + 4 new) |

### Full pre-commit gate (aggregate, after all fixes)

| Gate | Result |
|------|--------|
| `npm run test:run` | 115 test files / **1278 tests passed** |
| `npm run build` | succeeded; `dist/` generated (index-BdZsLNx3.js 311 KiB, gzip 92 KiB) |
| `npm run lint` | clean (no output) |

All three gates green. Aggregate state is clean — no regressions introduced, no new lint warnings, no type errors.

### Memory-rule compliance check

- `[[feedback_design_logic_separation]]` — WR-01 + WR-02 are pure design/markup changes; no state machines, audio, persistence, or business logic touched. WR-03 touches a test file only.
- `[[project_v16_visual_locks]]` — WR-01's extracted `SectionCard` preserves byte-identical visual output (same inline styles, same `padding` API); no v1.6 rejected alternates reintroduced.
- `[[project_dark_theme_token_collapse]]` — WR-01's `SectionCard` retains the explicit `border: 1px solid var(--color-border-soft)` rule needed for dark/dusk theme legibility.
- `breathing.inhale/exhale label width` — not touched (only `appearance.*` and `appSettings.sections.theme` markers were in scope).
- `[[feedback_use_lsp_for_renames]]` — no symbol renames performed; all changes were file-local or single-import additions.
- `[[feedback_no_design_locking]]` — WR-03's new block-scope tracker REMOVES anchoring on specific key names (was: 12 hardcoded key regexes; now: 2 structural shape patterns); strictly improves the no-design-locking property.

## Skipped Issues

None. All 3 in-scope warnings were fixed.

Info findings (IN-01 through IN-05) were intentionally out of scope per the `critical_warning` fix policy:
- IN-01: focus-restoration effect — flagged for documentation/follow-up.
- IN-02: missing behavioral test for `returningFromAppearance` propagation — additive only.
- IN-03: partial-tautology test — refactor to make assertion meaningful.
- IN-04: missing `controlsDisabled` guard on back callbacks — defensive hardening.
- IN-05: PT-BR `'Sinal do anel'` translation flagged for I18N-04 native-speaker review pass.

---

_Fixed: 2026-05-26T09:37:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
