# Phase 55: Comment de-archaeology - Research

**Researched:** 2026-05-30
**Domain:** Behavior-preserving comment-only refactor (TypeScript 6 / React 19 / Vite codebase)
**Confidence:** HIGH — decisions, toolchain, landmines, and the work-surface enumeration are all verified this session via live `grep`/`git grep` and a full read of the worst-offender file.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Strip planning-tag comments inside test files too, applying the same drop-the-tag / keep-the-why rule as source. Phase 55 is ONE codebase-wide comment sweep — comment-stripping is NOT split by file type.
- **D-02:** Phase 55 does NOT delete or rewrite any test. Deleting garbage tests stays with TEST-01 (per-phase) and TEST-02 (Phase 61). When a test comment encodes behavior-under-test via a Phase ref (e.g. `// D-07: rewritten — Phase 20 relabels primary button to 'Cancel'`), keep the behavior statement in present tense, drop the `D-07` / `Phase 20` tags.
- **D-03:** Keep-vs-cut test: does the prose explain something a future editor would BREAK if they didn't know it?
  - **Yes → keep, rephrased to a present-tense invariant.** Example: `// D-05: default true preserves Phase 49 shipped bypass posture` → `default true preserves the no-silent-mode bypass users rely on.`
  - **No (records only what changed / parity / modeling) → delete the whole line.** Delete outright: `modeled exactly on recordResonantSession`, `DS-WR-06 parity`, `kitchen-sink fix 2026-05-10`.
- **D-04:** Not conservative (don't keep history-narrating prose just because it's prose) and not aggressive (don't cut genuinely-helpful invariant context). The audit states "much of the *why* is valuable": iOS gesture-token sequencing in `audioEngine.ts`, the TOCTOU envelope, the silent-WAV rationale all STAY, rephrased.
- **D-05:** Pure historical rationale (non-invariant narrative: "tried X in Phase 52, it desynced, removed the clamp") is **deleted outright** — git log, ROADMAP/PROJECT.md, DISCUSSION-LOGs already hold it.
- **D-06:** Do NOT create `docs/audio-architecture.md` or any new history doc — a new essay becomes the next archaeology. Invariant portions of the big audio essays stay inline (rephrased per D-03); only residual history leaves.
- **D-07:** For spike-geometry comments (e.g. `// Spike 010 CheckMarker (index.html L1006-1014): 32x32 / 24-viewBox`): delete the `L###` line-ref AND the `spike 010 / index.html` pointer (those files were removed in Phase 36 — the refs point at nothing). If the magic number is non-obvious, keep a present-tense note of WHAT it controls ("disc sized to 20% of orb"), never WHERE it came from.
- **D-08:** The locked geometry *values* themselves are untouched ([[spike_locked_values]]) — only their provenance comments change.
- **D-09:** Because comments cannot change runtime behavior, BEHAVIOR-01 is satisfied structurally: verify by confirming every changed line is comment-only (no token change to executable code/types/values), PLUS the standard green gate `tsc` + `lint` + `build` + curated test suite (QUAL-01). Special care on trailing comments attached to code lines (`defaultValue: true, // D-05: …`) — edit the comment without touching the value.

### Claude's Discretion
- Per-comment wording of the rephrased present-tense invariants.
- Order of files / batching across the sweep.
- Whether a borderline magic-number note is "non-obvious enough" to warrant a what-it-controls line (D-07).

### Deferred Ideas (OUT OF SCOPE)
- Deleting/rewriting garbage tests → Phase 61 (TEST-02) + per-phase TEST-01.
- The `// TODO: native-speaker review` markers → I18N-04 carry-forward. **Do not touch these** (12 confirmed, all in `src/content/strings.ts`; an additional reference lives as a STRING in the marker-guard test — also leave it).
- Storage / view-model / shell / frame / component de-duplication → Phases 56–60. **Comment-only here; no code consolidation.**
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMMENT-01 | Planning-artifact tags (`D-xx`, `WR-xx`, `Phase NN`, `Blocker #N`, `Pitfall N`, `spike NNN`, dated "kitchen-sink fix" notes) removed from all `src/` comments; load-bearing rationale rephrased as present-tense invariant. | Verified per-tag totals + per-file/per-layer counts (below); mechanical strip procedure; keep-vs-cut tree (D-03/D-04). |
| COMMENT-02 | Stale code cross-references (`formerly at L###`, `mirror X L###`, any line-number citation) removed from `src/` comments. | 47 `L###` + 85 `mirror` + 2 `formerly` lines located; the confirmed lying ref (`useAudioCues.ts:267` cites `L213-222`; `handleResume` is actually at line 228). |
| TEST-01 (cross-cutting) | Audit tests covering touched code; keep/fix real-behavior tests, delete garbage. | Only test interaction here is comment-stripping inside test files (D-01) WITHOUT deletion (D-02). Verified: **no test asserts on comment text**; the marker-guard tests scan source for shipped string VALUES (safe). See Pitfall 3. |
| BEHAVIOR-01 (cross-cutting) | No user-facing behavior change. | Satisfied structurally by D-09: every changed line comment-only via git-diff token check; then green gate. |
| QUAL-01 (cross-cutting) | `tsc` + `lint` + `build` exit 0 per commit; curated suite passes; deps stay `react` + `react-dom`. | Exact gate commands documented. Zero net-new deps (deletion pass). |
</phase_requirements>

## Summary

Phase 55 is a **mechanical, comment-only sweep** across **255 TypeScript/TSX files** under `src/` — **135 non-test + 120 test files** (notably larger than the audit's stated "77 + 61"; the audit counted at an earlier commit and excluded smaller files). The task: strip planning-process archaeology (decision IDs, phase refs, plan refs, blocker/pitfall numbers, spike pointers, dated kitchen-sink notes) and every stale `L###` line-reference from comments, rephrasing genuinely load-bearing rationale into present-tense invariants. No executable token — code, type, value, or import — may change.

**Verified work surface (live grep, deduplicated by line):** **non-test = ~940 archaeology lines across 83 files; test = ~797 lines across 78 files; ~1,737 lines / 161 files total** (the audit's "~1,329" counted a smaller earlier tree; raw per-tag sums run higher because one line can match several tags). The surface is skewed: the **hooks layer (~390 non-test lines)** and **audio layer (~265)** hold the bulk of the *judgment-heavy* keep-rephrase prose; `src/hooks/useAudioCues.ts` alone carries **150 tag-matching lines** of `D-xx`/`Phase NN`/`WR-xx`/`Pitfall`/`Blocker`/`kitchen-sink` references in dense block-comment essays, and `audio/audioEngine.ts` carries 107. Test files hold ~797 raw tag lines but these are overwhelmingly mechanical strips with little keep-rephrase.

The work is unusually low-risk for a refactor because comments are inert: a correct change is provably behavior-preserving by inspecting the diff and confirming only comment tokens moved. The real risks are not runtime; they are (1) **collateral edits to trailing-comment code lines** (confirmed live: `useAudioCues.ts:431` ends in `setAudioStatus('unavailable') // WR-01-FIX: …`), (2) **over-cutting load-bearing "why"** the audit wants kept, (3) **JSDoc/TSDoc** blocks dense with `D-xx` (the `UseAudioCues` interface has `/** … D-10 … */` on nearly every member), and (4) **the marker-guard test family** — though verification confirms these fs-scan source for string *values*, not for comments, so comment edits don't break them.

The eslint flat config is `js.recommended` + `tseslint.strictTypeChecked` + react-hooks + react-refresh — **no `capitalized-comments`, `multiline-comment-style`, `spaced-comment`, or any comment-format rule** — so lint will not reflow or flag stripped comments. The green gate is `npm run build` (`tsc -b && vite build`) + `npm run lint` (`eslint .`) + `npm run test:run` (`vitest run`).

**Primary recommendation:** Plan a **per-layer wave sweep**, worst-offenders / highest-judgment first: **audio → hooks → domain → storage → components(spike) → app/content → tests**. Front-load the audio + hooks waves (where D-03 judgment dominates); batch the test files last as mostly-mechanical strips. Verify every commit with a git-diff comment-only check plus the green gate. The exact per-file counts are in the table below — the planner can size waves directly from them.

## Architectural Responsibility Map

No runtime architecture — comments are inert. "Tiers" here are codebase *layers*, which double as batch boundaries. Counts are **non-test archaeology lines, deduplicated** (verified live; a line matching multiple tags counted once).

| Capability (layer) | Archaeology lines / files (non-test) | Keep-rephrase density | Rationale |
|--------------------|--------------------------------------|------------------------|-----------|
| `src/hooks/` (useAudioCues, session controllers, engines, wakeLock) | **~390 / 28** | HIGH | `useAudioCues.ts` = 150 tag-lines alone; dense block essays + JSDoc; mix of invariant and history. Highest absolute volume. |
| `src/audio/` (audioEngine, clocks, cueSynth, timbres) | **~265 / 8** | HIGH | iOS gesture-token sequencing, TOCTOU envelope, silent-WAV rationale all STAY rephrased (D-04). Most judgment-heavy per line. |
| `src/storage/` (storage, practices, stats, prefs, settings) | **~98 / 7** | LOW (mostly delete) | "DS-WR-06 parity" / "modeled on recordResonantSession" → delete outright (D-03 cut side). |
| `src/components/` (OrbShape, MuteToggle, pickers, primitives, …) | **~87 / 55** | LOW-MED | Spike-geometry provenance (D-07/D-08) in **26 files** (not the 5 named in CONTEXT) — strip `L###` + `index.html`/spike pointer; keep values; keep what-it-controls if non-obvious. |
| `src/domain/` (sessionController, sessionMath, sessionAudio, stretchRamp, settings) | **~56 / 10** | MEDIUM | sessionController role-distinction prose is load-bearing; sessionAudio "mirrors L221-256" = delete. |
| `src/content/` (strings, learnContent) | **~16 / 3** | LOW | Standard strip. **NB: do NOT touch the 12 `// TODO: native-speaker review` markers in `strings.ts` (I18N-04).** |
| `src/styles/` (non-test) | **~8 / 1** | LOW | Minimal; most style archaeology is in the guard tests. |
| `src/app/` (App, view-models, presentation, pages) | **~7 / 20** | LOW | Surprisingly thin; standard strip. |
| Root (`src/featureFlags.ts`) | **~8 / 1** | LOW | Standard strip. |
| Test files (`*.test.ts(x)`, all layers) | **~797 / 78** | VERY LOW | D-01 strip / D-02 no-delete. Mechanical. Batch last. |

*(Per-layer dedup figures sum to ~935, matching the ~940 non-test grand total. Use grand totals for milestone framing, per-layer for wave sizing.)*

## Standard Stack

No new libraries. This is a deletion/rephrasing pass; the "stack" is the existing toolchain used as the verification gate.

### Core (existing — verification gate)
| Tool | Version (package.json) | Purpose | Status |
|------|------------------------|---------|--------|
| TypeScript | `~6.0.2` | `tsc -b` (part of `build`) — proves no type/import token changed | [VERIFIED: package.json] |
| ESLint | `^10.2.1` + `typescript-eslint ^8.58.2` (flat config, `strictTypeChecked`) | `npm run lint` (`eslint .`) — no comment-format rule | [VERIFIED: package.json + eslint.config.js] |
| Vite | `^8.0.10` | `npm run build` bundle | [VERIFIED: package.json] |
| Vitest | `^4.1.5` (jsdom, @testing-library/react) | `npm run test:run` (curated suite, QUAL-01) | [VERIFIED: package.json] |
| git | repo present | `git diff` token-level comment-only verification (D-09) | [VERIFIED] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual per-file editing | regex/sed mass-strip | REJECTED — D-03/D-04 require human judgment (keep-vs-cut, rephrase to invariant). A blind regex strips the prefix but cannot rephrase the *why*, and risks matching `L###`-like tokens inside identifiers/strings. Use grep only to *find*; edit by hand. Memory [[feedback_use_lsp_for_renames]] applies in spirit. |
| LSP rename | n/a | Not applicable — comments are not symbols. |

**Installation:** none. Net-new runtime deps must stay zero (QUAL-01: `dependencies` = `react` + `react-dom` only).

## Package Legitimacy Audit

Not applicable — this phase installs **zero** packages. QUAL-01 forbids net-new runtime deps. No registry verification needed.

## Architecture Patterns

### Comment categories → action (the core decision tree, D-03/D-04/D-05/D-07)

```
For each comment line/block containing a planning tag or L###:
│
├─ Is it a TRAILING comment on a code line? (e.g. setAudioStatus('unavailable') // WR-01-FIX: …)
│     → edit ONLY the text after `//`; never retype the code token (D-09 landmine).
│       Re-read the pre-`//` portion after editing — must be byte-identical.
│
├─ Does it explain something a future editor would BREAK if unaware? (D-03)
│     ├─ YES → KEEP, rephrase to present-tense invariant; drop the tag/ref
│     │         "// D-05: default true preserves Phase 49 shipped bypass posture"
│     │           →  "// default true preserves the no-silent-mode bypass users rely on"
│     └─ NO  → DELETE the whole comment line/block
│               parity/modeling/history: "DS-WR-06 parity", "modeled on
│               recordResonantSession", "kitchen-sink fix 2026-05-10",
│               "tried X in Phase 52, desynced, removed clamp"
│
└─ Is it a spike-geometry provenance comment? (D-07)
      → delete L### + spike/index.html pointer; KEEP the value (D-08);
        keep a what-it-controls note only if the number is non-obvious.
```

### Mechanical strip procedure (per file, repeatable)
1. `git grep -nE '<taxonomy pattern>' -- <file>` to locate every site (patterns in Validation Architecture).
2. Classify each site with the tree above.
3. **Leading block-comment tag:** remove the tag token; keep a real invariant (rephrased present tense); delete pure history.
4. **Trailing code-line comment:** edit only the substring after `//`; re-read the code token to confirm byte-identical.
5. **JSDoc/TSDoc (`/** … */`):** strip the tag tokens *within* prose; keep block structure (`@param`, closing `*/`) intact.
6. `git diff <file>` → confirm every `+`/`-` hunk touches only comment regions.

### Recommended batch structure (waves) — sized from verified counts
```
Wave 1  HOOKS        src/hooks/**            (~390 non-test lines / 28 files — useAudioCues 150, useSessionEngine, controllers; highest volume)
Wave 2  AUDIO        src/audio/**            (~265 / 8 — highest per-line judgment; isolate)
Wave 3  DOMAIN       src/domain/**           (~56 / 10 — keep sessionController role prose; delete "mirrors L###")
Wave 4  STORAGE      src/storage/**          (~98 / 7 — mostly delete: parity/modeling)
Wave 5  COMPONENTS   src/components/**        (~87 / 55 — D-07/D-08 spike geometry in 26 files)
Wave 6  APP+CONTENT  src/app/** src/content/** src/styles/** + root files (~39 — standard strip; SKIP the 12 I18N markers in strings.ts)
Wave 7  TESTS        **/*.test.ts(x)         (~797 / 78 — mechanical; D-01 strip, D-02 no-delete)
```
Each wave is independently committable (each file's diff is comment-only). Hooks + audio are the two waves where most D-03 judgment lives — keep them separate and review carefully. Tests batch last; high-volume but low-judgment. The planner may split Wave 1/Wave 7 by file-count into sub-waves (e.g. useAudioCues + useSessionEngine + audioEngine as their own plan given their density).

### Anti-Patterns to Avoid
- **Blind sed/regex mass-strip** — cannot rephrase to invariant; can corrupt code tokens; can match inside strings.
- **Touching the 12 `// TODO: native-speaker review` markers** in `strings.ts` — OUT OF SCOPE (I18N-04). Leave verbatim.
- **Editing the `REVIEW_MARKER = 'TODO: native-speaker review'` string literal** in `content.no-review-markers.test.ts` — it's a test STRING, not a comment.
- **Deleting/rewriting any test** (D-02) — even an obvious garbage one. That's Phase 61.
- **Inventing `docs/audio-architecture.md`** (D-06).
- **Changing a spike-locked geometry value** while editing its provenance comment (D-08).
- **"Improving" adjacent code** (AGENTS.md §3) — every changed line must be a comment line.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Find archaeology sites | A custom AST comment-extractor | `git grep -nE` with taxonomy patterns | Patterns are simple; grep locates; classification is human (D-03). |
| Prove comment-only diff | A bespoke behavior-diff harness | `git diff` + token reasoning, then `tsc`/`lint`/`build`/`test` | D-09 makes this structural; a stray code edit fails the gate, a comment edit never does. |
| Reformat stripped comments | A prettier/biome pass | nothing — eslint has no comment-format rule | Net-new tooling; risks reflowing untouched comments into the diff. |

**Key insight:** The verification is *cheaper* than the edit. "Did I break anything?" reduces to "is every diff hunk inside a comment?" — answerable by eye + the green gate. Spend effort on D-03 judgment, not tooling.

## Runtime State Inventory

This phase touches only inert comment text in source files.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None — comments never persist to localStorage/IndexedDB. | none |
| Live service config | None — no external services. | none |
| OS-registered state | None. | none |
| Secrets/env vars | None — no env var references the stripped tags. | none |
| Build artifacts | Vite/esbuild strips comments from the production bundle regardless; editing them does not change emitted JS. PWA precache hashes change only on *emitted*-byte change — they won't. | confirm `npm run build` green |

**Nothing found in any runtime category** — verified by reasoning (comments are inert, stripped at build, unreferenced by datastore/service/OS). The one genuine cross-surface concern — tests asserting on comment strings — was checked live and **does not exist** (see Pitfall 3 / TEST-01).

## Common Pitfalls

### Pitfall 1: Editing the code token on a trailing-comment line
**What goes wrong:** A line like `setAudioStatus('unavailable') // WR-01-FIX: …` (confirmed at `useAudioCues.ts:431`) or `lastTopUpCuesRef.current = cues // Phase 52 D-04: …` (`:668`) — line-oriented editing grabs the code and you silently flip a value or drop a comma.
**Why it happens:** Trailing comments share a line with executable code.
**How to avoid:** Edit only the substring after `//`. After saving, `git diff` the line and confirm the pre-`//` portion is byte-identical. `tsc`/`build` catches a syntax break but NOT a value flip — the diff check is the real guard (D-09).
**Warning signs:** A diff hunk whose `-`/`+` pair differs before the `//`.

### Pitfall 2: Over-cutting load-bearing "why"
**What goes wrong:** Deleting the iOS gesture-token sequencing essay (`useAudioCues.ts:480-493`, `audioEngine.ts`), the TOCTOU envelope, or the silent-WAV rationale the audit calls valuable.
**How to avoid:** Apply D-03 literally — "would a future editor BREAK something without this?" The `useAudioCues.ts` block at 480-493 (gesture-token ordering: `new AudioContext()` must be first sync op) is a textbook KEEP — rephrase to present tense, drop `Plan 06 Task 8 / kitchen-sink fix 2026-05-10` provenance.
**Warning signs:** Deleting prose that describes a *currently-true constraint* rather than a *past change*.

### Pitfall 3: Tests asserting on comment/tag text — VERIFIED ABSENT
**What was checked:** `grep` for tag tokens (`D-NN`, `Phase NN`, `WR-NN`, `spike`) inside `expect(...)`/`toContain`/`toMatch` string literals across all test files → **zero matches**. The marker-guard family (`content.no-review-markers.test.ts`, `content.no-removed-themes.test.ts`, `content.no-stats-ui.test.ts`, `content.no-variants.test.ts`, `theme.no-hardcoded-classes.test.ts`, etc.) fs-scans **source files** for banned shipped string VALUES / class names — NOT for comments. Confirmed by reading `content.no-review-markers.test.ts`: it scans `src/content/*.ts` for the literal `REVIEW_MARKER = 'TODO: native-speaker review'` outside an allowlisted block; it deliberately excludes `.test.ts` files so its own marker-string const doesn't self-trigger, and it stays green whether or not the markers exist.
**Residual care:** (a) when stripping comments *inside* these guard tests, do NOT touch their assertion string literals or the `REVIEW_MARKER` const; (b) the guard tests' OWN comments cite `Phase 26 D-12` / `Phase 48 D-18` / `WR-03` and WILL be stripped under D-01 — that's fine, the assertions don't read those comments.
**Resolution:** Assumption A3 is resolved — no comment-assertion test exists.

### Pitfall 4: JSDoc/TSDoc structural edits
**What goes wrong:** The `UseAudioCues` interface (`useAudioCues.ts:37-116`) has `/** … D-10 … Phase 51-02 (D-03) … */` on nearly every member. Mangling a block can detach editor hover docs (cosmetic) — no `tsc` rule enforces doc shape here, so the risk is hover quality, not a gate failure.
**How to avoid:** Keep `/** */` and `@param`/`@returns` structure intact; strip only archaeology tokens within prose. Don't leave a `/**` without its `*/`.

### Pitfall 5: Spike provenance `L###` + dead-file pointers (D-07) — BROADER than CONTEXT lists
**What goes wrong:** Leaving `index.html L1006-1014` refs that point at Phase-36-deleted files, or deleting the *value* note along with the provenance.
**Where (verified live):** 67 `spike`/`index.html` lines across **26 component files** — far more than CONTEXT's named 5. The set includes the named `OrbShape.tsx`, `TimbrePicker.tsx`, `LearnPanel.tsx`, `SettingsToggleRow.tsx`, `NKSessionReadout.tsx` PLUS `MuteToggle.tsx`, `CueGlyph.tsx`, `SettingsSectionHeader.tsx`, `FeedbackCount.tsx`, `SettingsSheet.tsx`, `SettingsPanelBody.tsx`, `SetupCard.tsx`, `PracticeToggle.tsx`, `FeedbackTime.tsx`, `SettingsStepper.tsx`, `SettingsSegmentedRow.tsx`, `SessionReadout.tsx`, `SettingsRow.tsx`, `SessionActionRow.tsx`, `ThemePicker.tsx`, and the `primitives/` files (`PageShell`, `TopAppBar`, `PickerCardGrid`, `SegmentedControl`, `SectionCard`, `Toggle`). The planner must scope Wave 5 to all 26, not 5. Many cite specific `index.html L###` (e.g. `OrbShape.tsx:146` "Spike 010 CheckMarker (index.html L1006-1014)", `MuteToggle.tsx:5` "spike 010 MuteButton, index.html lines 455-486").
**How to avoid:** Delete `L###` + `spike NNN`/`index.html` pointer; keep the geometry value (D-08); keep a what-it-controls note only if non-obvious.
**Warning signs:** Any surviving `index.html` or `spike` token in `src/components/`.

### Pitfall 6: The known actively-lying ref (COMMENT-02 exemplar)
Confirmed live: `useAudioCues.ts:267` comment says `Follows the same defensive-gate posture as handleResume (L213-222)` — but `handleResume` is defined at **line 228** (the `L213-222` was true at an earlier commit). This exact ref, and the related `formerly at L164-165` (lines 226, 253) and `mirror stop() L420-421 / L427 / L437 / L438` (lines 395-402), must all go. Treat ALL `L###` as presumptively stale — never "fix" a number, always delete the ref.

## Code Examples

Rephrasing model (verified sites + CONTEXT exemplars):

```ts
// BEFORE  (tag + dead provenance — useAudioCues.ts:7)
// muted defaults to the optional `initialMuted` parameter (Phase 4 D-14 / LOCL-01)
// or to false (Phase 3 D-07: first-visit audio is ON) when the parent does not supply a value.
// AFTER   (present-tense invariant)
// muted defaults to `initialMuted`, or false (first-visit audio is ON) when unset.

// BEFORE  (audit exemplar — the AC null-then-close dance, narrated as history)
// AFTER
// Null engineRef before awaiting close() so a racing start() can't deref a closing AC.

// BEFORE  (pure parity/modeling — DELETE whole line, D-03 cut side)
// DS-WR-06 parity — modeled exactly on recordResonantSession
// (line removed entirely)

// BEFORE  (lying cross-ref — useAudioCues.ts:267, COMMENT-02)
// Follows the same defensive-gate posture as handleResume (L213-222): engineRef null-gate + early return.
// AFTER
// Follows the same defensive-gate posture as handleResume: engineRef null-gate + early return.

// BEFORE  (spike provenance, D-07 — OrbShape.tsx:146)
// Spike 010 CheckMarker (index.html L1006-1014): 32x32 / 24-viewBox
// AFTER   (value note only, if non-obvious — else drop entirely)
// 32x32 check disc, 24 viewBox
```

## State of the Art

Not applicable — no external library/version landscape. The only "old vs new" axis is the codebase's own comment debt.

| Old (current codebase) | New (after phase) | Impact |
|------------------------|-------------------|--------|
| Comments are a planning changelog (`D-xx`/`Phase NN`/`L###`) | Comments state present-tense invariants only | A reader distinguishes load-bearing context from archaeology; stale refs stop lying. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The 135 non-test + 120 test split and the dedup totals (non-test ~940/83, test ~797/78) are authoritative for wave sizing. (Counts vary +-5% by exact tag pattern set; per-file `git grep -c` is the precise edit-volume signal.) | Summary / batching | Low — counted live this session. Differs from the audit's "77+61 / ~1,329" (earlier/narrower); re-run the Wave-0 grep at plan time only if the tree changed. [VERIFIED: live grep] |
| A2 | eslint has no comment-format rule that reflows/flags stripped comments. | Summary / toolchain | Low — `eslint.config.js` is `js.recommended` + `strictTypeChecked` + react-hooks + react-refresh; none touch comment text. [VERIFIED: eslint.config.js] |
| A3 | No test asserts on comment/tag string content. | Pitfall 3 | RESOLVED — grep for tag tokens inside `expect`/`toContain`/`toMatch` returned zero; marker-guard tests fs-scan source for shipped string values, confirmed by reading `content.no-review-markers.test.ts`. [VERIFIED: live grep + read] |
| A4 | Stripping comments does not change emitted bundle bytes. | Runtime State Inventory | Low — standard Vite/esbuild behavior; confirmed structurally by a green `npm run build`. [ASSUMED] |
| A5 | Per-file `git grep` hit counts (e.g. useAudioCues 150) approximate edit volume; the keep-vs-delete ratio is per-line judgment. | Batch sizing | Low — counts are line-hits not edit-decisions; they size waves, not outcomes. [VERIFIED: counts] / [ASSUMED: ratio] |

## Open Questions

1. **Exact keep-vs-delete ratio per file.**
   - What we know: total archaeology line-hits per file/layer (verified). `useAudioCues.ts` = 150 hits, audio ≈ 265, hooks ≈ 390, tests ≈ 797.
   - What's unclear: how many of those lines are KEEP-rephrase vs DELETE — per-line D-03 judgment, only knowable at edit time.
   - Recommendation: size waves from hit-counts; expect audio/hooks ~half keep-rephrase (the valuable essays), storage/tests ~mostly delete.

2. **Spike provenance scope.** RESOLVED — 26 component files (not CONTEXT's 5). Wave 5 must cover all 26 (list in Pitfall 5).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| TypeScript (`tsc -b`) | QUAL-01 gate (via `npm run build`) | ✓ (devDep) | ~6.0.2 | — |
| ESLint (`eslint .`) | QUAL-01 gate | ✓ (devDep) | ^10.2.1 | — |
| Vite (`build`) | QUAL-01 gate | ✓ (devDep) | ^8.0.10 | — |
| Vitest (`test:run`) | QUAL-01 gate | ✓ (devDep) | ^4.1.5 | — |
| git | D-09 comment-only diff proof | ✓ | repo present | — |
| installed node_modules | all gates | ⚠️ confirm | — | `npm install` (an untracked `pnpm-lock.yaml` is present — confirm manager; scripts call `./node_modules/...` directly so either works once installed) |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.5` (jsdom env, `@testing-library/react`) |
| Config file | `vite.config.ts` + `vitest.setup.ts` (repo root) |
| Quick run command | `npx vitest run <path>` for a touched file/layer |
| Full suite command | `npm run test:run` |
| Lint | `npm run lint` (`eslint .`) |
| Types + build | `npm run build` (`tsc -b && vite build`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | Exists? |
|--------|----------|-----------|-------------------|---------|
| COMMENT-01 | No planning tag remains in `src/` comments | grep gate | `git grep -nE '\b(D-[0-9]+|(DS-)?WR-[0-9]+|Phase [0-9]+|Plan [0-9]+|Blocker|Pitfall|spike[ -]?[0-9]+|kitchen.?sink)' -- 'src/**/*.ts' 'src/**/*.tsx'` → expect empty (or reviewed non-comment false positives) | grep gate |
| COMMENT-02 | No `L###`/`formerly`/`mirror L###` ref remains | grep gate | `git grep -nE '(\bL[0-9]{2,}|formerly at|mirror .*L[0-9])' -- 'src/**/*.ts' 'src/**/*.tsx'` → expect empty | grep gate |
| BEHAVIOR-01 | Every changed line comment-only | git-diff token check (D-09) | `git diff --word-diff=porcelain <file>` reviewed; plus the green gate | existing gate |
| QUAL-01 | Green gate, no new deps | gate run | `npm run build && npm run lint && npm run test:run` exit 0; `git diff package.json` empty | existing gate |

### Verified taxonomy line-counts (whole `src/`, incl. tests — raw, NOT deduplicated)
| Tag | Lines | | Tag | Lines |
|-----|-------|-|-----|-------|
| `D-NN` | 1039 | | `mirror` | 85 |
| `Phase NN` | 527 | | `Pitfall` | 68 |
| `Plan NN` | 181 | | `Blocker` | 65 |
| `WR-NN`/`DS-WR-NN` | 138 | | `L###` (COMMENT-02) | 47 |
| `revision N` | 46 | | `dated YYYY-MM-DD` | 23 |
| `spike NNN` | 22 | | `kitchen-sink` | 8 |
| | | | `formerly at` | 2 |

(Non-test subset, raw: `D-NN` 521, `Phase NN` 287, `Plan` 108, `WR` 77, `L###` 45, `mirror` 63, `spike` 17.) Raw sums exceed the dedup totals (non-test ~940, test ~797) because one line can match several tags.

### Top worst-offender files (verified `git grep -c`, sorted)
| File | Hits | | File | Hits |
|------|------|-|------|------|
| `hooks/useAudioCues.ts` | 150 | | `hooks/useSessionEngine.ts` | 32 |
| `audio/audioEngine.ts` | 107 | | `components/OrbShape.tsx` | 21 |
| `hooks/useAudioCues.test.tsx` | 105 | | `audio/cueSynth.ts` | 21 |
| `audio/audioEngine.test.ts` | 65 | | `storage/stats.ts` | 21 |
| `audio/sessionClock.ts` | 55 | | `domain/stretchRamp.ts` | 17 |
| `hooks/useSessionEngine.test.tsx` | 40 | | `domain/sessionAudio.ts` | 12 |
| `storage/prefs.test.ts` | 36 | | `domain/sessionController.ts` | 10 |
| `storage/storage.ts` | 33 | | (full table → Wave-0 grep #1) | |

### Sampling Rate
- **Per file edited:** `git diff <file>` (confirm comment-only) — every file.
- **Per commit / wave:** `npm run build && npm run lint && npm run test:run` exit 0.
- **Phase gate:** full suite green + both COMMENT-01/02 grep gates return empty (or reviewed false positives) before `/gsd:verify-work`.

### Wave 0 (optional refresh — already captured this session)
The enumeration below was run live; re-run only if the tree changed before planning:
```bash
# per-file hit counts, sorted worst-first
git grep -cE '\b(D-[0-9]+|(DS-)?WR-[0-9]+|Phase [0-9]+|Plan [0-9]+|revision [0-9]+|Blocker|Pitfall|spike[ -]?[0-9]+|kitchen.?sink|L[0-9]{2,}|formerly at|mirror)' -- 'src/**/*.ts' 'src/**/*.tsx' | sort -t: -k2 -rn
# confirm the 12 I18N markers (DO NOT TOUCH)
git grep -nE '// TODO: native-speaker review' -- src/content/strings.ts   # → 12
# confirm no comment-assertion test
git grep -nE "(toContain|toMatch|toBe|toEqual)\(.*\b(D-[0-9]+|Phase [0-9]+|WR-[0-9]+|spike)" -- '**/*.test.ts' '**/*.test.tsx'   # → empty (verified)
# enumerate all spike-geometry component files (Wave 5)
git grep -liE 'spike|index\.html' -- 'src/components/**/*.tsx'   # → 26 files
```

### Wave 0 Gaps
- [x] Per-file/per-layer archaeology counts — captured live (tables above).
- [x] Comment-assertion test check — VERIFIED none exist (A3 resolved).
- [x] I18N-04 marker location — 12 in `src/content/strings.ts` (do not touch); 1 string-const in the guard test (also leave).
- [x] Spike-geometry file list — 26 component files (CONTEXT's 5 + 21 more; full list in Pitfall 5).
- [ ] Confirm package manager (npm vs pnpm) so gate binaries exist — operator/planner.
- [ ] No framework install needed — Vitest/ESLint/tsc/Vite already in devDependencies.

## Security Domain

Not applicable to this phase's content (comment-only text edits introduce no auth, input, crypto, or access-control surface). No ASVS category is engaged. The one adjacent concern — a stripped comment might document a security-relevant invariant — is handled by D-03/D-04: a comment explaining a security constraint a future editor would break is KEPT as a present-tense invariant, not deleted (e.g. `useAudioCues.ts:424` "T-03-06: no raw stack to user-facing surfaces" — rephrase, keep the invariant).

## Project Constraints (from AGENTS.md / CLAUDE.md)

- **Surgical changes (§3):** touch only comment lines; do not "improve" adjacent code, formatting, or unrelated comments. Every changed line traces to COMMENT-01/02.
- **Simplicity first (§2):** no tooling, no new files (reinforces D-06).
- **TypeScript profile:** no behavior/type/value changes — the phase changes no code.
- **Goal-driven (§4):** success = green gate + COMMENT-01/02 grep gates empty + every diff comment-only.
- **No design locking ([[no_design_locking]]):** the entire phase rationale — comments must not anchor downstream-modifiable values, deleted-code refs, or stale notes.
- **Tests not truth ([[feedback_tests_not_truth_app_is_simple]]):** verified no comment-assertion test exists; if one surfaced, flag for Phase 61 — do not contort comments to keep it green (bounded by D-02: no deletion here).
- **LSP for renames ([[feedback_use_lsp_for_renames]]):** in spirit — text tools find, humans judge; no blind regex strip.
- **RTK proxy note:** `cat`/`ls`/`find` are hook-rewritten to compressed output and `find` rejects compound predicates; use `git grep`, `grep --include`, and the Read tool for reliable raw output during the sweep.

## Sources

### Primary (HIGH confidence)
- `.planning/phases/55-comment-de-archaeology/55-CONTEXT.md` — D-01..D-09, scope, taxonomy, spike-geometry list.
- `.planning/phases/55-comment-de-archaeology/55-DISCUSSION-LOG.md` — alternatives behind each decision.
- `.planning/REQUIREMENTS.md` — COMMENT-01/02, cross-cutting gates, Out of Scope.
- `.planning/CODE-QUALITY-REVIEW.md` §3 — driving audit, worst-offender list, remedy phrasing, the stale `useAudioCues.ts` example.
- `package.json`, `eslint.config.js`, `tsconfig.json`, `.planning/config.json` — verified toolchain, gate commands, no comment-format lint rule.
- **Live enumeration (this session):** file counts (135 non-test + 120 test = 255), per-tag raw totals, dedup grand totals (non-test ~940/83, test ~797/78), per-file & per-layer counts, comment-assertion-test check (none), I18N marker location (12 in strings.ts), spike provenance file list (26 components).
- **Full read of `src/hooks/useAudioCues.ts`** and `src/content/content.no-review-markers.test.ts` — confirmed trailing-comment landmines, the lying `L213-222` ref, JSDoc tag density, the gesture-token keep-essay, and the marker-guard mechanism.

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — milestone framing, BEHAVIOR-01-not-tests gate note.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Decisions / scope: HIGH — all 9 read verbatim from CONTEXT.md.
- Toolchain / gate / landmines: HIGH — verified from package.json, eslint.config.js, and full reads of the worst-offender file + a guard test.
- Work-surface enumeration: HIGH — file counts, per-tag totals, dedup grand totals, per-file & per-layer counts, comment-assertion-test check, I18N + spike locations all captured live.
- Procedure / batching: HIGH — derived from verified counts + decisions.

**Research date:** 2026-05-30
**Valid until:** 2026-06-29 (stable — internal codebase, no external dependency volatility). Re-run the Wave-0 grep at plan time only if the tree changed.
