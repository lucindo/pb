# Phase 55: Comment de-archaeology - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Strip planning-artifact archaeology from `src/` comments and rephrase the load-bearing *why* as present-tense invariants. In scope: tag prefixes (`D-xx`, `WR-xx`, `Phase NN`, `Blocker #N`, `Pitfall N`, `spike NNN`, dated "kitchen-sink fix" notes) and every stale line-number cross-reference (`formerly at L###`, `mirror X L###`, any `L###` citation). Behavior-preserving — comments only; no executable code, types, or values change.

Maps to COMMENT-01 + COMMENT-02. ~1,329 archaeology lines across 77 non-test source files + 61 test files. Worst offenders: `src/hooks/useAudioCues.ts` (56% comments), `src/audio/audioEngine.ts`, `src/hooks/useSessionEngine.ts` (47%), `src/domain/sessionController.ts`, `src/storage/storage.ts`, `src/storage/practices.ts`.

NOT in scope: deleting/rewriting tests (Phase 61 TEST-02), any code de-duplication (Phases 56–60), the 19 `// TODO: native-speaker review` markers (I18N-04 carry-forward).
</domain>

<decisions>
## Implementation Decisions

### Test-file comment scope
- **D-01:** Strip planning-tag comments inside test files (356 lines / 61 files) in THIS phase, applying the same drop-the-tag / keep-the-why rule as source. Phase 55 is one codebase-wide comment sweep — comment-stripping is not split by file type.
- **D-02:** Phase 55 does NOT delete or rewrite any test. Deleting garbage tests stays with TEST-01 (per-phase, in the phases that touch the code) and TEST-02 (Phase 61 standalone sweep). When a test comment encodes behavior-under-test via a Phase ref (e.g. `// D-07: rewritten — Phase 20 relabels primary button to 'Cancel'`), keep the behavior statement in present tense, drop the `D-07` / `Phase 20` tags.

### Load-bearing cut boundary
- **D-03:** Keep-vs-cut test: does the prose explain something a future editor would BREAK if they didn't know it?
  - **Yes → keep, rephrased to a present-tense invariant.** Example: `// D-05: default true preserves Phase 49 shipped bypass posture` → "default true preserves the no-silent-mode bypass users rely on."
  - **No (records only what changed / parity / modeling) → delete the whole line.** Examples to delete outright: `modeled exactly on recordResonantSession`, `DS-WR-06 parity`, `kitchen-sink fix 2026-05-10`.
- **D-04:** Not conservative (don't keep history-narrating prose just because it's prose) and not aggressive (don't cut genuinely-helpful invariant context — the audit states "much of the *why* is valuable": iOS gesture-token sequencing in `audioEngine.ts`, the TOCTOU envelope, the silent-WAV rationale all stay, rephrased).

### Historical-rationale destination
- **D-05:** Pure historical rationale (non-invariant narrative: "tried X in Phase 52, it desynced, removed the clamp") is **deleted outright** — git log, ROADMAP/PROJECT.md, and DISCUSSION-LOGs already hold it.
- **D-06:** Do NOT create `docs/audio-architecture.md` or any new history doc — a new essay would become the next archaeology and can drift stale. The *invariant* portions of the big audio essays stay inline (rephrased, per D-03), only the residual history leaves.

### Spike-geometry provenance
- **D-07:** For spike-geometry comments (e.g. `// Spike 010 CheckMarker (index.html L1006-1014): 32x32 / 24-viewBox` in `OrbShape.tsx`, `TimbrePicker.tsx`, `LearnPanel.tsx`, `SettingsToggleRow.tsx`, `NKSessionReadout.tsx`): delete the `L###` line-ref AND the `spike 010 / index.html` pointer (those files were removed in Phase 36 — the refs already point at nothing). If the magic number is non-obvious, keep a present-tense note of WHAT it controls ("disc sized to 20% of orb"), never WHERE it came from.
- **D-08:** The locked geometry *values* themselves are untouched ([[spike_locked_values]]) — only their provenance comments change.

### Verification (Claude's discretion, bounded by milestone gate)
- **D-09:** Because comments cannot change runtime behavior, the BEHAVIOR-01 gate is satisfied structurally: verify by confirming every changed line is comment-only (no token change to executable code/types/values), plus the standard green gate `tsc` + `lint` + `build` + curated test suite (QUAL-01). Special care on trailing comments attached to code lines (`defaultValue: true, // D-05: …`) — edit the comment without touching the value.

### Claude's Discretion
- Per-comment wording of the rephrased present-tense invariants.
- Order of files / batching across the sweep.
- Whether a borderline magic-number note is "non-obvious enough" to warrant a what-it-controls line (D-07).
</decisions>

<specifics>
## Specific Ideas

- The audit's own remedy phrasing is the model for present-tense invariants: "Null engineRef before awaiting close() so a racing start() can't deref a closing AC."
- At least one stale ref actively lies and must go: `useAudioCues.ts` cites "L213-222" for the `handleResume` gate, which actually lives at 228-237.
- The tag taxonomy to strip is enumerated in the audit and COMMENT-01: `D-xx`, `WR-xx`, `Phase NN`, `Blocker #N`, `Pitfall N`, `spike NNN`, dated kitchen-sink notes; plus all `L###` cross-refs (COMMENT-02).
</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements & audit
- `.planning/REQUIREMENTS.md` — COMMENT-01 (strip planning tags, rephrase to present-tense invariant) + COMMENT-02 (strip stale line-refs); cross-cutting TEST-01, BEHAVIOR-01, QUAL-01.
- `.planning/CODE-QUALITY-REVIEW.md` §3 "Cross-cutting tax — comments are a planning changelog, not explanation" — the driving audit finding, worst-offender list, remedy ("mechanical strip-the-tags pass; state invariants in present tense").

### Standing rules (memory)
- [[no_design_locking]] — comments must not anchor downstream-modifiable values, deleted-code refs, or stale future-tense notes (this phase's whole reason).
- [[feedback_tests_not_truth_app_is_simple]] — tests are not the gate; behavior is; the suite is in scope for curation.
- [[spike_locked_values]] — spike-locked values apply verbatim; provenance comments may be relaxed (D-07/D-08).
- [[no_spike_wrapup_skill]] — Phase 36 deleted the spike-findings skill + spike source files; their `L###` refs are dead.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — this is a deletion/rephrasing pass, no new abstractions.

### Established Patterns
- Trailing-comment idiom (`defaultValue: true, // D-05: …`) is common — strip the tag in place without touching the code token.
- Block-comment "essays" cluster in the audio layer (`useAudioCues.ts`, `audioEngine.ts`, `useSessionEngine.ts`); these carry the highest ratio of keep-rephrase (invariants) to delete (history).

### Integration Points
- No runtime integration points — comments are inert. The only "integration" is the green gate (`tsc`/`lint`/`build`/test) which must stay 0-exit on every commit.
</code_context>

<deferred>
## Deferred Ideas

- Deleting/rewriting garbage tests → Phase 61 (TEST-02) + per-phase TEST-01.
- The 19 `// TODO: native-speaker review` markers → I18N-04 carry-forward (out of v2.3 scope).
- Storage / view-model / shell / frame / component de-duplication → Phases 56–60.

### Reviewed Todos (not folded)
- None.
</deferred>

---

*Phase: 55-comment-de-archaeology*
*Context gathered: 2026-05-30*
