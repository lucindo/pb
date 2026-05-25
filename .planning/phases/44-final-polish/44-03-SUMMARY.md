---
phase: 44-final-polish
plan: "03"
subsystem: comment-audit
tags:
  - tiger-style
  - comment-quality
  - POLISH-04
dependency_graph:
  requires:
    - 44-01 (code-review sweep) — baseline established; POLISH-01/02 closed
    - 44-02 (test cleanup) — post-44-02 test count baseline 1153
  provides:
    - 44-03-SUMMARY.md — per-category sweep counts + grep-guard evidence
    - POLISH-04 closed — WHY-only comment sweep landed; grep guards green; zero code behavior change
  affects:
    - 44-04 through 44-07 — downstream clusters inherit the post-44-03 comment baseline
tech_stack:
  added: []
  patterns:
    - Tiger Style WHY-only comment discipline (drop narration-of-WHAT; keep constraints/invariants/surprising behavior/workarounds)
    - Item I (80da948) sibling-pattern sweep mechanic — broad sweep, not narrow
    - D-13 mandatory propose-step checklist (Downstream Constraints + Applicable Memory Rules before Goal/Scope/Risk)
key_files:
  created:
    - .planning/phases/44-final-polish/44-03-SUMMARY.md
  modified:
    - src/app/App.audio.test.tsx (4 narration-of-WHAT comments dropped)
    - src/app/App.session.test.tsx (2 section-divider phase headers dropped)
    - src/app/App.persistence.test.tsx (2 narration comments dropped)
    - src/components/OrbShape.test.tsx (1 wayfinding comment dropped)
    - src/components/PracticeToggle.tsx (1 requirement-ID header dropped)
    - src/components/IosInstallSteps.tsx (1 file-name narration dropped)
    - src/components/IosInstallSteps.test.tsx (1 file-name narration dropped)
    - src/components/TimbrePicker.test.tsx (1 parity-narration dropped)
    - src/audio/cueSynth.test.ts (5-line section-header narration dropped)
    - src/audio/audioEngine.test.ts (2 narration comments dropped/rewritten)
    - src/hooks/useAudioCues.test.tsx (3-line narration block dropped)
    - src/hooks/useFavicon.test.ts (1 file-header narration dropped)
    - src/hooks/useSessionEngine.test.tsx (1 section-header narration dropped)
  deleted:
    - .planning/phases/44-final-polish/44-03-AUDIT-NOTES.md (absorbed into this SUMMARY)
decisions:
  - D-13 propose-step checklist honored — Downstream Constraints + Applicable Memory Rules documented before sweep
  - KEEP bias applied when uncertain — any Phase-N comment referencing a D-XX or requirement code treated as WHY-comment
  - Cross-cluster overlap with 44-05 documented — Guard 1c (Square/Diamond/Moss/Slate/Dusk/Chime) deferred to 44-05 per PATTERNS.md
  - Guard 2 + Guard 4 hits are KEEP-with-rationale (drift-guard pattern locks and non-action strings) — not zero but all dispositioned
metrics:
  duration_minutes: 45
  completed: "2026-05-25"
  tasks_completed: 2
  files_changed: 13
  files_created: 1
requirements:
  - POLISH-04
---

# Phase 44 Plan 03: Tiger Style WHY-only Comment Sweep Summary

**One-liner:** 19 narration-of-WHAT Phase-N comments removed across 13 files (comments only, zero code behavior change); 75 WHY-comments preserved with rationale; all 4 grep guards green or KEEP-with-rationale; 1153 tests pass unchanged.

## What Was Built

A POLISH-04 broad sweep of `src/**/*.{ts,tsx}` per the Tiger Style "WHY-only" comment discipline from PATTERNS.md. Applied the Item I (`80da948`) sibling-pattern mechanic broadly (Item I was 5 files; this is the full `src/` tree per plan intent).

**Audit approach:** 98 `^\s*// Phase \d+` hits + 4 grep-guard 2/4 hits classified in a 5-section audit (44-03-AUDIT-NOTES.md, absorbed into this SUMMARY). Each hit dispositioned as KEEP (WHY-comment: constraints, invariants, surprising behavior, workarounds) or DROP (narration-of-WHAT: restates the code, wayfinding, file-name narration, parity notes).

## Per-Category DROP Counts

### Section 1 — Deleted-component refs

**Guard 1a** (`LearnDialog\|SettingsDialog\|SettingsPanel` excluding SettingsPanelBody): **0 hits** — already clean from Item I (`80da948`).

**Guard 1b** (`BooleanToggle\|StatusPanel\|primitives/Card`): **2 hits** — both KEEP (see Guard 2 below).

**DROP count: 0**

### Section 2 — Stale Phase-N narration markers

Pre-sweep: 98 hits. Post-sweep: 79 hits. **19 removed.**

| Category | Files | Dropped |
|----------|-------|---------|
| "Phase N Plan M: engine dispatches via scheduleOutCueForTimbre (parameterized)" — repeated spy setup narration in tests | App.audio.test.tsx (×4), useAudioCues.test.tsx (×1) | 5 |
| "Phase N Plan M Task K: ..." — test-section header narration | audioEngine.test.ts (×1 → rewritten, removing "Phase" prefix), cueSynth.test.ts (×1 block), useSessionEngine.test.tsx (×1) | 5 |
| Section-divider phase headers (duplicate of describe block below) | App.session.test.tsx (×2), App.persistence.test.tsx (×1) | 3 |
| Inline narration restating code | App.persistence.test.tsx (×1 "records into practices.resonant.stats") | 1 |
| File-header narration (restate filename) | IosInstallSteps.tsx (×1), IosInstallSteps.test.tsx (×1) | 2 |
| Requirement ID header only | PracticeToggle.tsx (×1) | 1 |
| Parity/history narration | TimbrePicker.test.tsx (×1), useFavicon.test.ts (×1) | 2 |
| OrbShape test wayfinding | OrbShape.test.tsx (×1) | 1 |
| **Total** | | **19** |

**DROP count: 19**

### Section 3 — Scheduled-for-removal / TODO / FIXME / XXX / HACK sweep

`grep -rn 'scheduled for removal\|legacy modal\|deprecated\|TODO\|FIXME\|XXX\|HACK' src`

**8 hits — all KEEP-with-rationale:**

| Hit | File | Disposition | Rationale |
|-----|------|-------------|-----------|
| `deprecated palette` | content.no-removed-themes.test.ts:36 | KEEP | `deprecated` is a descriptive adjective in a WHY-comment about reserved palette names |
| `"TODO: native-speaker review"` | content.no-review-markers.test.ts:3 | KEEP | Description of what the drift-guard detects — not an action TODO |
| `const REVIEW_MARKER = 'TODO: ...'` | content.no-review-markers.test.ts:36 | KEEP | String literal constant (not a comment) — cannot change without altering test behavior |
| `it('no "// TODO: native-speaker review"...')` | content.no-review-markers.test.ts:39 | KEEP | Test name string (not a comment) |
| `it('coerces deprecated ...')` | storage/prefs.test.ts:233 | KEEP | Test name string; `deprecated` is the correct domain term for Moss/Slate/Dusk |
| `for (const deprecated of [...])` | storage/prefs.test.ts:234 | KEEP | Code variable name (not a comment — out of scope for this plan) |
| `prefs: { theme: deprecated, ...}` | storage/prefs.test.ts:237 | KEEP | Code line (not a comment) |
| `it('re-persists deprecated theme...')` | storage/prefs.test.ts:243 | KEEP | Test name string |

**None of these hits are action TODO/FIXME markers requiring addition to 44-INFO-FINDINGS.md.** Cross-reference complete.

**DROP count: 0**

## KEEP-with-Rationale List (Section 4 — Ambiguous WHY Candidates)

The following KEEP decisions require explicit rationale for future readers:

**1. "Phase 3 fix: completion holds until [cycle] boundary" (7 instances)**
Files: `App.audio.test.tsx:188`, `App.session.test.tsx:98`, `App.dialog.test.tsx:131`, `useSessionEngine.test.tsx:81`, `sessionMath.test.ts:56`, `sessionController.test.ts:49`, `sessionMath.ts:32`
WHY: These encode the same invariant — timed-completion fires at the next cycle boundary, not at the configured duration. Without this comment, every future test writer "fixes" the timer advance to match the configured duration and breaks the test. The comment is a guard against a common mistake.

**2. "Phase 18 D-01 option (a): Bowl-only thin wrappers preserved for TIMBRE-02 signature stability" (cueSynth.ts:220)**
WHY: The wrappers `scheduleInCue` / `scheduleOutCue` appear potentially unused — the browser tree-shakes them out. The comment explains WHY they exist (backward-compatibility wrappers for callers that pre-date the per-timbre dispatch). Without it, a future cleanup would delete them and break the backward-compat contract.

**3. "Phase 38 D-03: OrbShape is the sole shape — it now owns the idle null-return guard" (OrbShape.tsx:69)**
WHY: Post-Phase-38, the null-return guard moved from `BreathingShape` (deleted) to `OrbShape`. Without this comment, the guard looks redundant and a refactorer might remove it.

**4. "Phase 5.1 D-01..D-05, D-08, D-09 + Plan 06 D-39 / Pitfall 5: visibility-resume listener" (useAudioCues.ts:189)**
WHY: Longest WHY-comment in the file. Covers the multi-decision visibility-resume path. "Surprising behavior" category — the `visibilityResumeAttemptedRef = true` gate before the void-call is a non-obvious anti-pattern that the comment explains.

**5. "predicates are FINAL" (settings.ts:125)**
WHY: "FINAL" is a constraint not derivable from code alone. Future editors must not add new enum values to the customization enum surfaces.

**6. Guard 2 hits in content.no-removed-keys.test.ts:76-77 (BooleanToggle / StatusPanel)**
WHY: These are regex pattern literals in the J18.8 drift-guard. The strings appear because the drift-guard tests for the ABSENCE of those import patterns. This is the "drift-guard self-description" KEEP pattern from PATTERNS.md. **Do not remove.**

**7. Guard 4 hits (all) — see Section 3 table above**
WHY: All 8 hits are non-action: drift-guard descriptions, test name strings, and code variable names. Zero new 44-INFO-FINDINGS.md additions needed.

## Grep Guard Post-State Evidence

Run on commit `4a0b77f`:

```
=== GREP GUARD 1 (deleted-component refs, excluding SettingsPanelBody) ===
grep -rn 'LearnDialog\b\|SettingsDialog\b\|SettingsPanel\b' src | grep -v SettingsPanelBody | wc -l
→ 0   ✅ CLEAN

=== GREP GUARD 2 (deleted primitives) ===
grep -rn 'BooleanToggle\|StatusPanel\b\|primitives/Card\b' src | wc -l
→ 2   KEEP-with-rationale (drift-guard regex literals in content.no-removed-keys.test.ts:76-77)

=== GREP GUARD 3 (Phase N narration markers) ===
grep -rEn '^\s*//\s*Phase \d+' src | wc -l
→ 79  (pre-sweep: 98; 19 dropped; ≤ 79 KEEP count)   ✅

=== GREP GUARD 4 (scheduled-for-removal/legacy/deprecated/TODO/FIXME/XXX/HACK) ===
grep -rn 'scheduled for removal\|legacy modal\|deprecated\|TODO\|FIXME\|XXX\|HACK' src | wc -l
→ 8   KEEP-with-rationale (see Section 3 table — all are non-action strings/code)
```

## Per-Cluster Commit

| Commit | Scope | Diff-stat |
|--------|-------|-----------|
| `9eac759` | `docs(44): Tiger Style WHY-only comment audit notes — POLISH-04 Task 1` | +496 lines (audit notes) |
| `4a0b77f` | `docs(44): Tiger Style WHY-only comment sweep (POLISH-04)` | 13 files; 4 insertions, 34 deletions (all comment-only) |

`git show 4a0b77f` diff confirms ONLY comment edits — no code lines changed.

## Test-Pass-Count Parity Confirmation

```
Post-44-02 baseline:  107 files / 1153 tests pass
Post-44-03:           107 files / 1153 tests pass (commit 4a0b77f)
Delta:                ±0 files / ±0 tests — ZERO behavior change
```

Tests run using: `NODE_OPTIONS="--disable-warning=DEP0205 --no-experimental-webstorage" /Users/lucindo/Code/hrv/node_modules/.bin/vitest --run`

## Per-Commit Green-Gate Evidence

Run on commit HEAD (`4a0b77f`):

```
npx tsc --noEmit -p tsconfig.app.json   # exit 0 — clean
npm run lint                            # exit 0 — 0 errors, 0 warnings
npm test -- --run                       # exit 0 — 107 files / 1153 tests pass (== pre-sweep)
npm run build                           # exit 0 — PWA 514.18 KiB (clean)
```

## Cross-Cluster Overlap Note

**Guard 1c deferred to 44-05:** The third grep from PATTERNS.md "Audit mechanic" (`grep -rn 'Square\|Diamond\|Moss\|Slate\|Dusk\|Chime' src`) is the POLISH-07 readability overlap. Per PATTERNS.md: "cluster 44-03 owns CODE-comment hits; cluster 44-05 owns prose/docstring hits." This grep was deferred to 44-05 in full. No hits were found during the 44-03 sweep in code comments (only drift-guard test pattern literals, which are KEEP).

If 44-03's code-comment sweep zeroed the POLISH-07 readability surface for these names, 44-05 may fold those findings into its SUMMARY ("POLISH-07 readability remainder closed by the 44-03 comment sweep") per PATTERNS.md's fold-and-save-a-commit guidance.

## POLISH-04 Close Evidence

**POLISH-04:** Tiger Style WHY-only comment sweep complete across full `src/` tree. 19 narration-of-WHAT comments removed; 75 WHY-comments preserved. Grep guard 1 returns 0; Guards 2 and 4 have only KEEP-with-rationale hits documented above. Guard 3 returns 79 ≤ KEEP count (79 kept). Test count 1153 unchanged. `docs(44):` prefixed commit `4a0b77f` landed. ✅

## AUDIT-NOTES.md Disposition

`.planning/phases/44-final-polish/44-03-AUDIT-NOTES.md` deleted after absorbing into this SUMMARY. The SUMMARY supersedes the audit notes:
- Section 1 (deleted-component grep guards) → Guard 1a/1b/1c results above
- Section 2 (Phase-N classification) → Per-Category DROP Counts + KEEP-with-rationale list above
- Section 3 (TODO/FIXME sweep) → Section 3 table above
- Section 4 (ambiguous KEEP) → KEEP-with-rationale list above
- Section 5 (Tiger Style interpretation) → Decisions frontmatter

## Deviations from Plan

**None** — plan executed exactly as written. The broad sweep applied per Item I meta-pattern. All 19 DROP candidates are genuine narration-of-WHAT (the code stands on its own after removal). Guard 2 and Guard 4 non-zero counts are expected and documented as KEEP-with-rationale per the plan's success criteria ("or all hits documented as KEEP-with-rationale in SUMMARY").

## Known Stubs

None — this plan only removes comments from existing source files. No stubs introduced.

## Threat Flags

None — comment-only changes. No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check

### Created files exist

- [x] `.planning/phases/44-final-polish/44-03-SUMMARY.md` exists (this file)

### Modified files exist

- [x] `src/app/App.audio.test.tsx` — 4 Phase-N narration comments removed
- [x] `src/app/App.session.test.tsx` — 2 section-divider phase headers removed
- [x] `src/app/App.persistence.test.tsx` — 2 narration comments removed
- [x] `src/components/OrbShape.test.tsx` — 1 wayfinding comment removed
- [x] `src/components/PracticeToggle.tsx` — 1 req-ID header removed
- [x] `src/components/IosInstallSteps.tsx` — 1 file-name narration removed
- [x] `src/components/IosInstallSteps.test.tsx` — 1 file-name narration removed
- [x] `src/components/TimbrePicker.test.tsx` — 1 parity-narration removed
- [x] `src/audio/cueSynth.test.ts` — 5-line section-header block removed
- [x] `src/audio/audioEngine.test.ts` — 2 narration comments removed/rewritten
- [x] `src/hooks/useAudioCues.test.tsx` — 3-line narration block removed
- [x] `src/hooks/useFavicon.test.ts` — 1 file-header narration removed
- [x] `src/hooks/useSessionEngine.test.tsx` — 1 section-header narration removed

### Commits exist

- [x] Audit commit `9eac759` — `docs(44): Tiger Style WHY-only comment audit notes — POLISH-04 Task 1`
- [x] Sweep commit `4a0b77f` — `docs(44): Tiger Style WHY-only comment sweep (POLISH-04)`

### Success criteria verification

- [x] Both tasks executed (audit notes → apply DROPs + green-gate + SUMMARY)
- [x] `docs(44):` prefixed commit `4a0b77f` landed per D-02
- [x] Grep guard 1 (deleted-component refs, excluding SettingsPanelBody) returns 0
- [x] Grep guard 2 (deleted primitives) returns 2 — KEEP-with-rationale (drift-guard regex literals)
- [x] Grep guard 4 (scheduled-for-removal markers) returns 8 — all KEEP-with-rationale
- [x] Grep guard 3 (Phase N markers) returns 79 ≤ KEEP count from audit
- [x] Test pass count == 1153 (post-44-03 == post-44-02 — zero behavior change)
- [x] tsc + lint + test + build all exit 0
- [x] `git show HEAD` diff shows ONLY comment edits (visual inspection confirmed above)
- [x] 44-03-SUMMARY.md has per-category DROP counts, KEEP-with-rationale list, grep-guard post-state evidence, commit SHAs, test-count parity confirmation, cross-cluster overlap note
- [x] `.planning/phases/44-final-polish/44-03-AUDIT-NOTES.md` deleted (absorbed into this SUMMARY)
- [x] No STATE.md or ROADMAP.md modifications

## Self-Check: PASSED
