---
phase: 48-appearance-page-i18n
chunk: components-main
fixed_at: 2026-05-26T00:00:00.000Z
review_path: .planning/phases/48-appearance-page-i18n/48-REVIEW-components-main.md
iteration: 1
findings_in_scope: 14
fixed: 12
skipped: 2
status: partial
---

# Phase 48: Code Review Fix Report — components/ (main chunk)

**Fixed at:** 2026-05-26
**Source review:** `.planning/phases/48-appearance-page-i18n/48-REVIEW-components-main.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 14
- Fixed: 12 (1 Critical + 7 Warnings + 4 Info)
- Skipped: 2 (both Info, both with documented rationale)

## Fixed Issues

### CR-01: Hard-coded English aria-label in NKShape bypasses UiStrings catalog

**Files modified:** `src/content/strings.ts`, `src/components/NKShape.tsx`, `src/components/NKShape.test.tsx`
**Commit:** `8078a95`
**Applied fix:** Added `orbAriaLabel(count, phaseLabel)` formatter to
`practice.nkReadout` in both `en` and `pt-BR`. NKShape now reads the
localized template via the `nkReadoutStrings` prop already in scope.
Added a PT-BR regression test that asserts the full localized sentence.

### WR-01: NK session readout uses identical aria-label on both wrapper and inner live region

**Files modified:** `src/components/NKSessionReadout.tsx`, `src/components/NKSessionReadout.test.tsx`
**Commit:** `80f7775`
**Applied fix:** Added `announcementAriaLabel` to `nkReadout` strings
(landed in the CR-01 commit alongside `orbAriaLabel`). Inner FeedbackCount
now uses `strings.announcementAriaLabel`; outer `<section>` keeps
`readoutAriaLabel`. Mirrors the HRV `SessionReadout` two-label pattern.
New test asserts the `role="status"` inner region is named distinctly.

### WR-02: FeedbackTime live region announces every per-second timer tick

**Files modified:** `src/components/FeedbackTime.tsx`, `src/components/FeedbackTime.test.tsx`
**Commit:** `9beb1b6`
**Applied fix:** Switched `aria-live="polite"` → `aria-live="off"` on the
FeedbackTime wrapper. `role="status"` preserved for landmark navigation.
Updated the existing live-region test to assert the new value.

### WR-03: Stepper changeBy wraps via Array#at when guard is bypassed

**Files modified:** `src/components/SettingsStepper.tsx`
**Commit:** `5598c74`
**Applied fix:** Replaced `options.at(selectedIndex + offset)` with an
explicit `if (next < 0 || next >= options.length) return` guard followed
by a positive-index lookup. Out-of-range is now always a no-op, not a
silent wrap.

### WR-04: OrbShape silently ignores `frame` when `nkPhase` is also provided

**Files modified:** `src/components/OrbShape.tsx`
**Commit:** `8f3b452`
**Applied fix:** Added `process.env.NODE_ENV !== 'production'` console.warn
when both `nkPhase` and `frame` are passed. Full discriminated-union
refactor across the 3 callers (`BreathingSessionSurface`,
`NaviKriyaSessionSurface`, `OrbPicker`) is deferred — the reviewer listed
the warn-vs-discriminated-union as alternatives, and the dormant-bug
classification doesn't justify the broader API change at this iteration.

### WR-05: useModalDialog re-invokes onAfterOpen on non-memoized callback

**Files modified:** `src/components/useModalDialog.ts`
**Commit:** `7090a04`
**Applied fix:** Moved `onAfterOpen` to a ref kept fresh by its own
useEffect. The open effect now depends only on `[open]` and calls
`onAfterOpenRef.current?.(dialog)`. Callback now fires exactly once per
false→true transition regardless of caller memoization.

### WR-06: SetupCard maps items using `it.label` as React key

**Files modified:** `src/components/SetupCard.tsx`, `src/components/SetupCard.test.tsx`, `src/app/setupCardSummary.ts`
**Commit:** `486f108`
**Applied fix:** Added required `id: string` field to `SetupCardItem`.
React key switched to `it.id` (locale-independent). Updated
`buildSetupCardSummary` to emit ids (`bpm`/`ratio`/`duration`/
`initialBpm`/`targetBpm`/`rounds`/`frontCount`/`omLength`) for all 3
practice shapes. Test fixtures updated.

### WR-07: LearnPanel uses paragraph TEXT as React key

**Files modified:** `src/components/LearnPanel.tsx`
**Commit:** `0fb5eb3`
**Applied fix:** Changed `key={paragraph}` to `key={i}` for the
`explainer.forrest.body.split('\n\n').map(...)` rendering.

### IN-01: LanguagePicker orphan id

**Files modified:** `src/components/LanguagePicker.tsx`, `src/components/SettingsPanelBody.test.tsx`
**Commit:** `03df2bc`
**Applied fix:** Dropped the `id="language-picker-label"` attribute from
the section label (no consumer referenced it via aria-labelledby).
Updated `SettingsPanelBody.test.tsx` to locate the language sublabel via
the radiogroup's parent (instead of the now-removed id selector).

### IN-02: OrbShape halo lists use array index as React key

**Files modified:** `src/components/OrbShape.tsx`
**Commit:** `0c065cb`
**Applied fix:** `V1_HALOS.map((h, i) => <div key={i} ...>)` →
`V1_HALOS.map((h) => <div key={h.token} ...>)` for both the V1 and
spiritual-eye halo lists. Matches the project's content-derived key
idiom.

### IN-04: SettingsPanelBody depends on Vite globals without defensive fallback

**Files modified:** `src/components/SettingsPanelBody.tsx`
**Commit:** `00e25ca`
**Applied fix:** Replaced the raw template with
`[__APP_VERSION__, __APP_BUILD_SHA__, __APP_BUILD_DATE__].filter(non-empty).join(' · ') || 'unknown'`.
A misconfigured build no longer surfaces the literal
"undefined · undefined · undefined".

### IN-05: CuePicker passes the picker option label as `phaseLabel` to CueGlyph preview

**Files modified:** `src/components/CueGlyph.tsx`, `src/components/CueGlyph.test.tsx`, `src/components/CuePicker.tsx`
**Commit:** `6550168`
**Applied fix:** Added optional `previewLabel?: string` prop to CueGlyph;
labels-mode preview uses `previewLabel ?? phaseLabel.charAt(0)` so
existing callers keep the same behaviour. CuePicker now passes
`previewLabel={label.charAt(0)}` explicitly. Existing test
("renders 'T', not 'Text'") still passes via the default;
a new test covers the override path.

## Skipped Issues

### IN-03: LearnAnchor / SettingsAnchor remain focusable when "disabled"

**File:** `src/components/LearnAnchor.tsx:13-25`, `src/components/SettingsAnchor.tsx:13-25`
**Reason:** The reviewer's recommendation reads
"**No change required if intentional.** If accessibility audit wants a louder
signal, consider…". Both files carry inline documentation flagging the
`aria-disabled + no-op onClick` pattern as deliberate (keeps tab order
stable, SR announces "dimmed"). No behaviour change applied at this
iteration — the explicit "no change required" disposition combined with
the in-source documentation made any change premature.
**Original issue:** Pressing Enter/Space on a "disabled" anchor sends no
signal — no visible/audible feedback for the no-op.

### IN-06: Inline px-style values throughout instead of Tailwind utilities

**Files:** `FeedbackTime.tsx`, `FeedbackCount.tsx`, `SetupCard.tsx`, `SettingsSheet.tsx`, `SettingsSectionHeader.tsx`, `SessionReadout.tsx`
**Reason:** The reviewer explicitly classifies this as **"Not a defect under
this codebase's conventions"** — the inline `style={{ fontSize: 22, ... }}`
blocks are verbatim spike transcription per the spike-implementation-fidelity
discipline (and the FeedbackCount.tsx comment block calls this out).
Centralizing into a shared `typographyTokens.ts` would:
1. Add a design-lock anchor that violates [[feedback_no_design_locking]]
   (the rule against new tests/code anchoring downstream-modifiable
   Tailwind classes, hex, or design tokens), and
2. Diverge from [[feedback_spike_locked_values]] / [[project_v16_visual_locks]],
   which require spike-locked values to be applied verbatim per surface.
**Original issue:** Spike-locked numeric values exist as duplicated literals;
future redesign find/replace might miss any of them.

---

_Fixed: 2026-05-26_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
