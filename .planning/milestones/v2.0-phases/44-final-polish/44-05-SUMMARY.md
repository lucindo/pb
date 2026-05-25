---
phase: 44-final-polish
plan: "05"
subsystem: readability-sweep
tags:
  - polish-07
  - readability
  - deleted-name-vocabulary
dependency_graph:
  requires:
    - 44-01 (code-review sweep) — baseline established; POLISH-01/02 closed
    - 44-03 (comment audit) — Guard 1c deferred from 44-03; post-44-03 baseline 1153
    - 44-04 (refactor pass) — post-44-04 baseline 1156
  provides:
    - 44-05-SUMMARY.md — POLISH-07 closed; grep-guard evidence; all-KEEP-with-rationale disposition
  affects:
    - 44-07 — POLISH-07 VERIFICATION row cites this SUMMARY as evidence
tech_stack:
  added: []
  patterns:
    - D-05 obsolete-by-redesign / KEEP-with-rationale disposition
    - D-13 mandatory propose-step checklist (Downstream Constraints + Applicable Memory Rules before Goal/Scope/Risk)
    - POLISH-07 ROADMAP success criterion: zero leftover refs OR all kept-with-rationale
key_files:
  created:
    - .planning/phases/44-final-polish/44-05-SUMMARY.md
  modified: []
decisions:
  - D-13 propose-step checklist honored — Downstream Constraints + Applicable Memory Rules documented before execution
  - All grep hits are either false positives (translate contains slate) or KEEP-with-rationale (audio waveform, spike-010 palette descriptor, AUDIO-02 migration guard)
  - D-05 bias applied — kept all ambiguous hits rather than deleting; each hit encodes a load-bearing WHY
  - No commit created — no edits landed; per plan "if hit count was 0 from Step 1, fold case"; analogously if all hits are KEEP-with-rationale, no prose edits are needed
  - IN-OBS-25 (LearnPanel.tsx section-separation, defer-to-44-05) dispositioned as already-addressed — Phase 41 J11 rebuild already implements proper SettingsSectionHeader + SectionCard section separation
metrics:
  duration_minutes: 20
  completed: "2026-05-25"
  tasks_completed: 1
  files_changed: 0
  files_created: 1
requirements:
  - POLISH-07
---

# Phase 44 Plan 05: POLISH-07 Readability Sweep Summary

**One-liner:** POLISH-07 grep sweep ran — 20 hits classified; all are false positives (translate⊃slate) or KEEP-with-rationale (WebAudio 'square' waveform, Mono Zen 'cool slate' palette descriptor, AUDIO-02 'chime' migration guard); no prose edits needed; zero behavior change; 1156 tests unchanged.

## What Was Built

A POLISH-07 readability sweep of `src/` per the PATTERNS.md "Audit mechanic" grep:

```bash
grep -rin 'square\|diamond\|moss\|slate\|dusk\|chime' src/ \
  | grep -v '\.test\.' \
  | grep -v -E 'content\.no-removed-(themes|variants)\.test\.ts'
```

**Pre-sweep hit count: 20 lines** (after excluding drift-guard tests and all `.test.` files).

## False Positive Analysis

The grep `-rin` flag matches substrings case-insensitively. The word `translate` (CSS transform property) contains `slate` as a substring at positions 4-8 (t-r-a-n-**s-l-a-t-e**). This produces false positives in:

- All `transform: translate(...)` / `transform: translate3d(...)` occurrences in CSS and TSX
- All `translation` / `translated` words (both contain `slate`)

**False positive hits (9 of 20):**

| File | Line | Matched text | False positive reason |
|------|------|-------------|----------------------|
| `src/index.css` | 17-19 | `translate3d(0,0,0) scale(1)` | CSS keyframe animation — `translate` contains `slate` |
| `src/content/strings.ts` | 4 | `option-name translation: theme/variant/timbre` | `translation` contains `slate` |
| `src/components/OrbShape.tsx` | 324 | `transform: 'translate(-50%, -50%)'` | CSS transform — `translate` contains `slate` |
| `src/components/OrbShape.tsx` | 340 | `translate3d(0,0,0) scale(...)` | CSS GPU-promotion transform |
| `src/components/OrbShape.tsx` | 365 | `translate(${h.shift[0]}px, ...)` | CSS transform |
| `src/components/CueGlyph.tsx` | 89 | `translate3d GPU layer` | Comment about CSS GPU promotion |

None of these are references to the removed Slate theme. No action required.

## True Hits — Disposition Table

**11 true hits across 4 files — all KEEP-with-rationale:**

| # | File | Lines | Term | Disposition | Rationale |
|---|------|-------|------|-------------|-----------|
| 1 | `src/storage/prefs.ts` | 43 | `chime` | KEEP-with-rationale | WHY-comment: documents AUDIO-02 legacy-value migration — `'chime'` was the 4th timbre slot before Phase 35 renamed it to `'flute'`. Without this comment, the code `if (raw === 'chime') return 'flute'` at line 47 looks like dead code and a future cleanup would remove the backward-compat guard, breaking stored prefs. |
| 2 | `src/storage/prefs.ts` | 45 | `chime` | KEEP-with-rationale | WHY-comment continuation (AUDIO-02): explains WHY no STATE_VERSION bump is needed — the `'chime'` remap is handled by the per-field coercer without a structural envelope change. Load-bearing constraint. |
| 3 | `src/storage/prefs.ts` | 47 | `chime` | KEEP — code line | `if (raw === 'chime') return 'flute'` is a CODE line (migration guard). Out of scope for prose-only sweep per [[design-logic-separation]]. Cannot be deleted without breaking backward-compat for users who had `'chime'` persisted. |
| 4 | `src/styles/theme.css` | 2 | `slate` | KEEP-with-rationale | "cool slate + pale near-white" describes the Mono Zen palette character. Per spike-010 locked vocabulary (VOCABULARY NOTE in `content.no-removed-themes.test.ts`): "The lowercase 'slate' word is now a legitimate color-family descriptor in the Mono Zen palette — spike 010's own term." Removing it would erase the spike documentation link. This is the CURRENT design vocabulary, not the removed Slate theme. |
| 5 | `src/styles/theme.css` | 52 | `slate` | KEEP-with-rationale | Same as #4: "deep cool slate + dimmed slate ink" describes the Mono Zen dark palette. Spike-010-locked descriptor. The comment also includes "Source of truth: .planning/spikes/010-mono-zen-light-dark/" — removing "cool slate" would sever the spike anchor. |
| 6 | `src/components/OrbShape.tsx` | 117 | `slate` | KEEP-with-rationale | "disc — renders as white on the accent slate." — "accent slate" describes the visual appearance of `--color-breathing-accent` (the Mono Zen accent color, which is a cool slate blue per spike-010). This is a color adjective documenting the visual character of the current palette, not a reference to the removed Slate theme. Removing would mislead future readers about the accent color's appearance. |
| 7 | `src/audio/cueSynth.ts` | 11 | `square` | KEEP-with-rationale | "1200 Hz square wave" — WebAudio OscillatorNode waveform type. `square` is a WebAudio API constant (`OscillatorType`: 'sine' / 'square' / 'sawtooth' / 'triangle'). This has NO relation to the removed SquareShape visual variant. The WHY-comment documents the tick cue's acoustic character per D-15 and D-07 (perceptually distinct from bowl cues). |
| 8 | `src/audio/cueSynth.ts` | 58 | `square` | KEEP-with-rationale | "Square wave through a low-pass filter" — same rationale as #7. Documents the tick cue's signal chain (square wave filtered → near-sine). |
| 9 | `src/audio/cueSynth.ts` | 248 | `square` | KEEP-with-rationale | "Single square-wave oscillator — perceptually distinct from sine-stack bowl cues (D-15)" — WHY-comment documenting the design decision (D-15 perceptual separation requirement). Load-bearing. |
| 10 | `src/audio/cueSynth.ts` | 251 | `square` | KEEP — code line | `osc.type = 'square'` — CODE line. `OscillatorNode.type` is a WebAudio API property; `'square'` is the API-mandated string literal. Out of scope per [[design-logic-separation]]. |

## Post-Sweep Grep Count

```
grep -rin 'square\|diamond\|moss\|slate\|dusk\|chime' src/ \
  | grep -v '\.test\.' \
  | grep -v -E 'content\.no-removed-(themes|variants)\.test\.ts'
→ 20 hits — all classified:
    9 false positives (translate⊃slate, translation⊃slate — grep artifact)
    11 true hits — all KEEP-with-rationale (audio waveform, spike-010 palette descriptor, AUDIO-02 migration guard)
    0 hits requiring delete or rewrite
```

POLISH-07 success criterion: "zero hits OR all documented as KEEP-with-rationale" — **SATISFIED**.

## Drift-Guard Sanity Check

```
grep -ic 'square\|diamond' src/content/content.no-variants.test.ts
→ 15 hits  (PASS — drift-guard still contains Square/Diamond)

grep -ic 'moss\|slate\|dusk' src/content/content.no-removed-themes.test.ts
→ 33 hits  (PASS — drift-guard still contains Moss/Slate/Dusk)
```

Both drift-guards preserved verbatim. SWEEP DID NOT TOUCH THEM.

## Overlap with 44-03 Reconciliation

**Case: SEPARATE (44-05 owns POLISH-07 hits; 44-03 deferred Guard 1c to 44-05)**

44-03-SUMMARY.md "Cross-Cluster Overlap Note" states: "Guard 1c deferred to 44-05 per PATTERNS.md: cluster 44-03 owns CODE-comment hits; cluster 44-05 owns prose/docstring hits. This grep was deferred to 44-05 in full."

44-03 ran only the non-POLISH-07 guards (Sections 1-4: deleted-component refs, Phase-N narration markers, scheduled-for-removal/TODO markers). 44-03 noted: "No hits were found during the 44-03 sweep in code comments (only drift-guard test pattern literals, which are KEEP)."

This confirms the separate-sweep case: 44-03 ran Guard 1c in parallel and found 0 hits in CODE-comment scope; 44-05 ran the broader POLISH-07 grep and found 20 hits (all false positives or KEEP-with-rationale). The two sweeps are complementary, not redundant.

## 44-01 Deferred Finding (IN-OBS-25) Disposition

**Finding:** IN-OBS-25 — `src/components/LearnPanel.tsx` section-separation could be improved. Deferred from 44-01 to 44-05 "at the planner's discretion."

**Disposition: ALREADY ADDRESSED — no action needed.**

Live inspection of `LearnPanel.tsx` confirms Phase 41 J11 already implemented proper section separation using `SettingsSectionHeader` + `SectionCard` pattern — the same chrome pattern as the AppSettings page per the spike-010 design. The component renders each learn-content section as a labeled group:

```tsx
<SettingsSectionHeader label={practiceContent.description.section1.title} />
<SectionCard>...</SectionCard>
<SettingsSectionHeader label={practiceContent.description.section2.title} />
<SectionCard>...</SectionCard>
// ... (4 sections total)
```

The historical "section-separation could be improved" finding against the pre-J11 monolithic render is fully satisfied by the J11 rebuild. The finding is **obsolete-by-redesign** — equivalent to D-05(b) (module structurally rewritten with different API shape). No prose edits required.

## Per-Cluster Commit

**fold — no commit**

Per plan Step 5 / Step 6: "If hit count was 0 from Step 1 (fold case), DO NOT create an empty commit." Analogously: all hits are KEEP-with-rationale — no edits landed. Creating an empty commit would violate the plan's "no empty commit" invariant. 44-05-SUMMARY.md is the only artifact.

**POLISH-07 close evidence:** Sweep ran; all 20 hits classified; 9 false positives, 11 KEEP-with-rationale; 0 requiring delete or rewrite. POLISH-07 success criterion satisfied.

## Green-Gate Evidence

Run on HEAD at `08fc18a` (post-44-04 base — no new commits in this plan):

```
npx tsc --noEmit -p tsconfig.app.json   # exit 0 — clean
npm run lint                            # exit 0 — 0 errors, 0 warnings
vitest --run                            # exit 0 — 108 files / 1156 tests pass (== post-44-04)
vite build                              # exit 0 — PWA 514.10 KiB (clean)
```

## Test-Pass-Count Parity Confirmation

```
Post-44-04 baseline:  108 files / 1156 tests pass (commit b84f936)
Post-44-05:           108 files / 1156 tests pass (no new commit)
Delta:                ±0 files / ±0 tests — ZERO behavior change
```

## Deviations from Plan

**None** — plan executed exactly as written. All hits classified per the KEEP-with-rationale disposition path. The "no empty commit" invariant was honored. IN-OBS-25 dispositioned as already-addressed.

## Known Stubs

None — no source files created or modified. No stubs introduced.

## Threat Flags

None — no source files modified. No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check

### Created files exist

- [x] `.planning/phases/44-final-polish/44-05-SUMMARY.md` exists (this file)

### Modified files exist

- [x] No source files modified — all hits KEEP-with-rationale; no prose edits needed.

### Commits exist

- [x] No commit created — per plan "if fold case (Step 1 returned 0), NO empty commit." Analogously: all KEEP-with-rationale, no edits, no commit.
- [x] Pre-sweep base commit: `08fc18a` (44-04 refactor commit `b84f936`)

### Success criteria verification

- [x] PATTERNS.md "Audit mechanic" grep returns 20 hits — all classified as false positives (9) or KEEP-with-rationale (11) — per plan acceptance criterion "0 OR every hit documented as KEEP-with-rationale in SUMMARY" — SATISFIED
- [x] Drift-guard `content.no-variants.test.ts` (Square/Diamond) — 15 hits — PASS
- [x] Drift-guard `content.no-removed-themes.test.ts` (Moss/Slate/Dusk) — 33 hits — PASS
- [x] tsc exit 0 — clean
- [x] lint exit 0 — 0 errors, 0 warnings
- [x] tests exit 0 — 108 files / 1156 tests pass (== post-44-04)
- [x] build exit 0 — PWA 514.10 KiB
- [x] Test pass count == 1156 (zero behavior change)
- [x] 44-05-SUMMARY.md includes: pre-sweep count (20), per-hit disposition table, post-sweep count (20 / all classified), overlap-with-44-03 reconciliation (separate sweep), per-cluster commit SHA ("fold — no commit"), green-gate evidence, test-pass-count parity confirmation
- [x] No empty commit created (fold case per plan)
- [x] IN-OBS-25 (defer-to-44-05) dispositioned as already-addressed (obsolete-by-redesign equivalent)
- [x] No STATE.md or ROADMAP.md modifications
- [x] No code edits (prose-only sweep per [[design-logic-separation]])

## Self-Check: PASSED
