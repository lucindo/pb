---
phase: 25-labels-vs-icons-cue-toggle
verified: 2026-05-15T22:10:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Visually confirm Arrow (candidate F) and Nose (candidate D2) glyphs render correctly across Orb, Square, and Diamond variants in a live browser session"
    expected: "Chevron points up on In phase and down on Out phase; nose drawing shows up-arrows on In and down-arrows on Out; all render legibly in all 3 shape variants with correct color token application"
    why_human: "SVG path rendering, glyph legibility, and color-token fidelity in actual browser cannot be verified by static code analysis. The operator checkpoint in Plan 05 satisfied this, but per verification protocol the finding is recorded for human sign-off."
  - test: "Confirm cue change persists across a real browser reload — set cue to Arrow, reload the page, open SettingsDialog and verify Arrow is still selected"
    expected: "Arrow option shows aria-checked=true after reload; the running session uses the Arrow cue glyph"
    why_human: "localStorage round-trip behavior in a real browser environment (not jsdom) requires manual exercise"
---

# Phase 25: Labels vs Icons Cue Toggle — Verification Report

**Phase Goal:** Users can choose how the in-orb In/Out breathing cue is shown — text labels, directional arrow icons, or a nose-airflow drawing.
**Verified:** 2026-05-15T22:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | A SettingsDialog picker with three options (Text/Arrow/Nose) exists and is positioned between Variant and Timbre | ✓ VERIFIED | `SettingsDialog.tsx:87` — `<CuePicker>` inserted after `<VariantPicker>`, before `<TimbrePicker>`; section label "Cue style" from `strings.settings.cueLabel`; picker order comment updated to "Theme → Variant → Cue → Timbre → Language" |
| 2 | In 'labels' mode the in-orb phase label renders exactly as before — zero regression | ✓ VERIFIED | `CueGlyph.tsx:71-79` — labels branch returns the byte-identical `<span>` with `text-5xl font-semibold tracking-tight` class and phase color token; 958/958 tests pass including all pre-Phase-25 shape tests |
| 3 | In 'arrow' mode the phase slot renders a visually-hidden localized In/Out word plus an aria-hidden chevron SVG (up for In, down for Out) | ✓ VERIFIED | `CueGlyph.tsx:83-99` — arrow branch: `<svg aria-hidden="true">` with candidate-F path, `<span className="sr-only">{phaseLabel}</span>`; up path for In, down path for Out per D-03; no hardcoded hex |
| 4 | In 'nose' mode the phase slot renders a visually-hidden localized In/Out word plus an aria-hidden nose+arrows SVG (up for In, down for Out) | ✓ VERIFIED | `CueGlyph.tsx:102-132` — nose branch: `<svg aria-hidden="true">` with candidate-D2 nose outline paths + direction arrows, `<span className="sr-only">{phaseLabel}</span>`; arrow direction determined by phase |
| 5 | Cue modes render correctly in all 3 variants (Orb, Square, Diamond) | ✓ VERIFIED | `OrbShape.tsx`, `SquareShape.tsx`, `DiamondShape.tsx` each have exactly 1 `<CueGlyph` in the *Body phase slot; `BreathingShape.tsx` passes `cue={cue}` to all 3 shapes in the switch (grep confirms 3 instances); LeadIn functions carry no `cue` param (D-07) |
| 6 | The lead-in 3-2-1 countdown digit is unchanged in all 3 cue modes | ✓ VERIFIED | D-07 enforced: comments in each shape file confirm `OrbLeadIn`/`SquareLeadIn`/`DiamondLeadIn` do NOT receive `cue`; code search confirms no cue-on-leadin reference |
| 7 | User's cue-style choice persists across reloads via the existing localStorage prefs envelope, with no STATE_VERSION bump | ✓ VERIFIED | `prefs.ts:55-57` — `coerceCue()` added; `UserPrefs.cue: CueStyleId` field present; `coercePrefs` includes `cue: coerceCue(r.cue)`; `grep -c "STATE_VERSION" prefs.ts` returns 0; missing `cue` key in pre-Phase-25 envelopes coerces to `'labels'` transparently |
| 8 | App reads the live cue via useVisualCue, captures it at session Start (sessionCueRef), and passes the captured-or-live cue to BreathingShape | ✓ VERIFIED | `App.tsx:19` — `useVisualCue` imported; `App.tsx:172` — `const { cue: liveCue } = useVisualCue()`; `App.tsx:219-220` — `sessionCueRef` + `sessionCue` state; `App.tsx:380-381` — captured at Start; `App.tsx:358-359, 554-555` — cleared at both session-end sites; `App.tsx:689` — `cue={sessionCue ?? liveCue}` passed to BreathingShape |
| 9 | Changing the cue mid-session does not alter the running cue; the new cue applies to the next session | ✓ VERIFIED | `App.tsx:686-689` — `sessionCue ?? liveCue` pattern: `sessionCue` is frozen at Start and cleared only on session end; mid-session `useVisualCue` re-reads update `liveCue` only, which is masked by the non-null `sessionCue` |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/domain/settings.ts` | CueStyleId type, CUE_OPTIONS, isValidCue, DEFAULT_CUE | ✓ VERIFIED | All 4 exports present at lines 128-136; DEFAULT_CUE = 'labels' |
| `src/storage/prefs.ts` | UserPrefs.cue field, coerceCue, DEFAULT_PREFS.cue | ✓ VERIFIED | cue field at line 31; coerceCue at line 55; DEFAULT_CUE in DEFAULT_PREFS at line 39; five-known-keys comment updated |
| `src/content/strings.ts` | settings.cueLabel + cue group (labels/arrow/nose) in EN and PT-BR | ✓ VERIFIED | cueLabel at line 38 (interface), 162 (EN); cue group at lines 55-57 (interface), 179-183 (EN), 287+304-307 (PT-BR with 4 TODO review markers) |
| `src/hooks/useCueChoice.ts` | Picker-side hook: { cue, setCue } — writes envelope + dispatches event | ✓ VERIFIED | Exports `useCueChoice`; dispatches `hrv:prefs-changed` with `{ key: 'cue', value: next }`; merged write `savePrefs({ ...current, cue: next })` |
| `src/hooks/useVisualCue.ts` | App-side orchestrator hook — subscribes to hrv:prefs-changed + cross-tab storage | ✓ VERIFIED | Listens on `detail.key === 'cue' || detail.key === undefined || !detail` (line 38); listens on `e.key === STATE_KEY` for cross-tab; seeds from `loadPrefs().cue` |
| `src/components/CueGlyph.tsx` | Cue-mode renderer: labels span / arrow SVG / nose SVG + sr-only text | ✓ VERIFIED | All 3 branches present; aria-hidden on both SVGs; sr-only span in arrow and nose branches; no hardcoded hex; static glyph (no animation elements); preview prop added for picker swatches |
| `src/components/CuePicker.tsx` | Radiogroup picker for the cue dimension | ✓ VERIFIED | role=radiogroup; aria-labelledby="cue-picker-label" (distinct from variant-picker-label); consumes useCueChoice; maps over CUE_OPTIONS; CueGlyph preview per option |
| `src/components/BreathingShape.tsx` | cue prop threaded to all 3 shapes | ✓ VERIFIED | `cue?: CueStyleId` in props (default 'labels'); `cue={cue}` passed to SquareShape, DiamondShape, OrbShape in switch (3 occurrences) |
| `src/components/OrbShape.tsx` | OrbBody branches phase slot on cue prop via CueGlyph | ✓ VERIFIED | 1 `<CueGlyph` in OrbBody; OrbLeadIn untouched |
| `src/components/SquareShape.tsx` | SquareBody branches phase slot on cue prop via CueGlyph | ✓ VERIFIED | 1 `<CueGlyph` in SquareBody; SquareLeadIn untouched |
| `src/components/DiamondShape.tsx` | DiamondBody branches phase slot on cue prop via CueGlyph | ✓ VERIFIED | 1 `<CueGlyph` in DiamondBody; DiamondLeadIn untouched |
| `src/components/SettingsDialog.tsx` | CuePicker rendered between VariantPicker and TimbrePicker | ✓ VERIFIED | Import present; strings prop type includes `'cue'`; CuePicker at line 87 between VariantPicker (86) and TimbrePicker (88) |
| `src/app/App.tsx` | useVisualCue consumption + sessionCueRef capture-at-Start + cue prop to BreathingShape | ✓ VERIFIED | useVisualCue imported (line 19), consumed (line 172); sessionCueRef (line 219), sessionCue state (line 220); captured at Start (lines 380-381); cleared at 2 session-end sites (lines 358-359, 554-555); `cue={sessionCue ?? liveCue}` at line 689 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/storage/prefs.ts coercePrefs` | `src/domain/settings.ts coerceCue/isValidCue` | per-field coerce import | ✓ WIRED | `coerceCue(r.cue)` at line 73; `isValidCue` and `DEFAULT_CUE` imported |
| `src/hooks/useCueChoice.ts setCue` | `hrv:prefs-changed CustomEvent` | `window.dispatchEvent` with `detail.key === 'cue'` | ✓ WIRED | `new CustomEvent('hrv:prefs-changed', { detail: { key: 'cue', value: next } })` at line 41 |
| `src/hooks/useVisualCue.ts` | `hrv:prefs-changed listener` | key-filtered re-read of `loadPrefs().cue` | ✓ WIRED | `detail.key === 'cue' || detail.key === undefined` filter at line 38; re-reads `loadPrefs().cue` |
| `src/components/BreathingShape.tsx` | `OrbShape / SquareShape / DiamondShape` | `cue={cue}` prop threading | ✓ WIRED | 3 occurrences of `cue={cue}` in the variant switch |
| `src/components/OrbShape.tsx` (and Square/Diamond) | `src/components/CueGlyph.tsx` | phase-slot render | ✓ WIRED | `<CueGlyph cue={cue} phase={frame.phase} phaseLabel={phaseLabel} />` in each *Body |
| `src/components/CuePicker.tsx` | `src/hooks/useCueChoice.ts` | state + write path | ✓ WIRED | `useCueChoice` imported and consumed for `{ cue, setCue }` |
| `src/components/SettingsDialog.tsx` | `src/components/CuePicker.tsx` | render placement after VariantPicker | ✓ WIRED | `<CuePicker disabled={inSessionView} strings={strings.cue} sectionLabel={strings.settings.cueLabel} />` at line 87 |
| `src/app/App.tsx` | `src/components/BreathingShape.tsx` | cue prop | ✓ WIRED | `cue={sessionCue ?? liveCue}` at line 689 |
| `src/app/App.tsx` | `src/hooks/useVisualCue.ts` | live cue read | ✓ WIRED | `import { useVisualCue }` at line 19; `const { cue: liveCue } = useVisualCue()` at line 172 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `CueGlyph.tsx` | `cue` prop, `phase` prop, `phaseLabel` prop | Passed from OrbBody/SquareBody/DiamondBody; ultimately from `sessionCue ?? liveCue` in App.tsx | Yes — sessionCue set from `liveCue` at Start; liveCue from `loadPrefs().cue`; coercePrefs reads localStorage | ✓ FLOWING |
| `CuePicker.tsx` | `{ cue, setCue }` from `useCueChoice()` | `useCueChoice` seeds from `loadPrefs().cue`; writes via `savePrefs` + event dispatch | Yes — reads and writes real localStorage envelope | ✓ FLOWING |
| `App.tsx` → `BreathingShape` | `sessionCue ?? liveCue` | `sessionCue` captured from `liveCue` at Start; `liveCue` from `useVisualCue` which reads `loadPrefs().cue` | Yes — real localStorage read on mount and on prefs-changed/storage events | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes | `npx vitest run` | 958/958 tests pass, 64/64 test files | ✓ PASS |
| No hardcoded hex in CueGlyph | `grep -E "#[0-9a-fA-F]{3,6}" CueGlyph.tsx` | No output | ✓ PASS |
| No STATE_VERSION in prefs.ts | `grep -c "STATE_VERSION" prefs.ts` | 0 | ✓ PASS |
| coerceCue wired in coercePrefs | `grep -n "coerceCue" prefs.ts` | Lines 55 (definition) and 73 (call site) | ✓ PASS |
| CuePicker distinct DOM id | `grep 'cue-picker-label' CuePicker.tsx` | Present; `grep -c "variant-picker-label" CuePicker.tsx` = 0 | ✓ PASS |
| BreathingShape passes cue to all 3 shapes | `grep -c "cue=" BreathingShape.tsx` | 3 | ✓ PASS |
| CueGlyph used once per shape file | `grep -c "<CueGlyph" OrbShape.tsx SquareShape.tsx DiamondShape.tsx` | 1 / 1 / 1 | ✓ PASS |
| sessionCue cleared on both session-end paths | `grep -n "setSessionCue(null)" App.tsx` | Lines 359 and 555 | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` files; phase is not a migration/tooling phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| CUE-01 | 25-01, 25-03, 25-04, 25-05 | User can choose in-orb cue via 3-option SettingsDialog picker | ✓ SATISFIED | CuePicker exists in SettingsDialog; 3 radio options (Text/Arrow/Nose); CueGlyph renders all 3 modes across all 3 shape variants; wired end-to-end through App.tsx |
| CUE-02 | 25-01, 25-02 | Choice persists across reloads via existing localStorage prefs envelope; no STATE_VERSION bump | ✓ SATISFIED | `UserPrefs.cue` field with per-field `coerceCue` coercion; pre-Phase-25 envelopes migrate transparently; `grep STATE_VERSION prefs.ts` = 0 |
| CUE-03 | 25-03, 25-05 | Arrow and drawing modes keep accessible localized In/Out announcement (sr-only text + aria-hidden SVG); render correctly across all 3 variants and under reduced-motion | ✓ SATISFIED | `CueGlyph.tsx` — both arrow and nose branches: `aria-hidden="true"` on SVG + `<span className="sr-only">{phaseLabel}</span>`; static glyph (no animation/reduced-motion branch needed); 1 CueGlyph per shape file |

All 3 required phase requirement IDs (CUE-01, CUE-02, CUE-03) are satisfied. No orphaned requirements detected — REQUIREMENTS.md maps all three to Phase 25.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/hooks/useVisualCue.ts` | 16 | `setCue` exposed in return type but is raw `useState` setter — does not persist; effectively a dead/misleading API surface | ⚠️ Warning | Latent data-loss-shaped API (WR-01 from code review); App.tsx correctly destructures only `cue`, so no current caller exercises the broken setter. If a future caller uses it, changes will silently revert on the next prefs-changed event. |
| `src/components/CueGlyph.tsx` | 89, 108 | `aria-hidden="true"` SVGs lack `focusable="false"` | ⚠️ Warning | Legacy IE11/pre-Chromium Edge keyboard focus trap (WR-02 from code review). No impact on modern browsers. |
| `src/components/CueGlyph.tsx` | 77 | `preview` mode renders hardcoded `'T'` regardless of locale | ⚠️ Warning | In PT-BR the picker swatch shows 'T' while the option label reads 'Texto' — minor cosmetic inconsistency in picker preview only; in-orb rendering unaffected (WR-03 from code review). |

No `TBD`, `FIXME`, or `XXX` markers found in any phase-modified files. The `// TODO: native-speaker review` markers in `src/content/strings.ts` are the established Phase 19 I18N-07 convention for PT-BR strings awaiting Phase 26 sweep — not unresolved debt for this phase (IN-05 from code review, expected and intentional).

Anti-patterns classified as Warnings only — no Blockers. All three warnings were already documented in 25-REVIEW.md (WR-01, WR-02, WR-03) and rated advisory (0 critical, 4 warning). They do not block the phase goal.

### Human Verification Required

#### 1. Arrow and Nose glyph visual review across all 3 shape variants

**Test:** Start the dev server (`npm run dev`). Open SettingsDialog. For each of the 3 variants (Orb, Square, Diamond), select cue = Arrow, start a session, and observe a full In/Out cycle. Then repeat for cue = Nose. Then verify cue = Text shows the localized word exactly as before.

**Expected:** Arrow chevron points UP on In phase and DOWN on Out phase. Nose drawing shows up-arrows on In and down-arrows on Out. Both glyphs render legibly inside the orb/square/diamond clip region with correct theme-token coloring. Text mode is zero-regression.

**Why human:** SVG path rendering, glyph legibility within the Diamond's tighter clip region, and color-token fidelity under each of the 5 themes require visual inspection in a real browser. The operator checkpoint in Plan 05 (commit 2f4f561) already completed this review and resulted in approval after one CuePicker preview tweak. This item is recorded per verification protocol but the operator has already signed off on the glyphs.

#### 2. localStorage persistence across a real browser reload

**Test:** Open the app in a real browser. Open SettingsDialog, select cue = Arrow. Close the dialog. Reload the page (`Cmd+R`). Open SettingsDialog again.

**Expected:** The Arrow option shows `aria-checked="true"`. Start a session — the running orb shows the chevron glyph, not the text label.

**Why human:** The coercePrefs/loadPrefs localStorage round-trip is fully unit-tested in jsdom, but actual browser localStorage behavior (serialization, cross-tab, quota) requires real browser exercise.

---

## Gaps Summary

No gaps found. All 9 observable truths are VERIFIED. All 13 artifacts exist, are substantive, and are wired. All 9 key links are active. All 3 requirement IDs (CUE-01, CUE-02, CUE-03) are satisfied. The full test suite (958 tests, 64 files) passes.

The two human verification items are standard browser-behavior checks that cannot be resolved by static analysis. The operator visual review was already completed as part of Plan 05 Task 3 (approved in commit 2f4f561 after one iteration); the human_needed status reflects protocol requirements for a complete verification record.

---

_Verified: 2026-05-15T22:10:00Z_
_Verifier: Claude (gsd-verifier)_
