# Requirements: HRV Breathing WebApp — v2.3 Maintainability

**Defined:** 2026-05-29
**Core Value:** Users can start a hands-off Forrest Knutson practice and follow accurate, uninterrupted guidance through synchronized visuals and optional sound.
**Source audit:** `.planning/CODE-QUALITY-REVIEW.md`

> **Milestone gate (applies to every requirement):** **no user-facing behavior change.** A change is correct because the app behaves identically — verified by reasoning from behavior / running the app — NOT because a test suite stays green. Per [[feedback_tests_not_truth_app_is_simple]], the test suite is itself in scope: keep/fix the tests that protect real behavior, delete the stale / old-decision-locking / drift-guard cruft. `tsc` + `lint` + `build` stay green; the curated suite passes (garbage removed, not preserved).

## v1 Requirements

Behavior-preserving structural cleanup. Each maps to exactly one phase (test curation TEST-01, behavior gate BEHAVIOR-01, and green-gate QUAL-01 are cross-cutting — verified in every phase).

### Comments (de-archaeology — audit #3)

- [ ] **COMMENT-01**: Planning-artifact tags (`D-xx`, `WR-xx`, `Phase NN`, `Blocker #N`, `Pitfall N`, `spike NNN`, dated "kitchen-sink fix" notes) are removed from all `src/` comments; load-bearing rationale is rephrased as present-tense explanation of the invariant.
- [ ] **COMMENT-02**: Stale code cross-references in `src/` comments (`formerly at L###`, `mirror X L###`, and any line-number citation) are removed.

### Storage (de-duplication — audit #1 + #6)

- [ ] **STORAGE-01**: The three byte-identical `record*Session` functions collapse into one parameterized `recordPracticeSession`; the public `recordResonantSession` / `recordStretchSession` / `recordNaviKriyaSession` become thin wrappers (NK passes its extra `roundsCompleted` merge); the NaN guard, `COUNT_THRESHOLD_MS` early-return, and read-merge-write envelope are single-sourced.
- [ ] **STORAGE-02**: The three `save*Settings` functions collapse into one parameterized `savePracticeSettings(sliceKey, settings, deps)`.
- [ ] **STORAGE-03**: `asRecord` is hoisted to a single definition in `storage.ts`; the duplicate copies in `practices.ts` / `prefs.ts` / `settings.ts` / `stats.ts` are removed.
- [ ] **STORAGE-04**: A single `isMember<T>(options, v): v is T` predicate replaces the repeated `(X_OPTIONS as readonly string[]).includes(v)` validation casts in `settings.ts` + `naviKriyaSettings.ts` (including the inconsistent `unknown[]` widening).
- [ ] **STORAGE-05**: A single `isPositiveInteger(v, { multipleOf? })` predicate replaces the duplicated `typeof number && Number.isFinite && Number.isInteger` idiom shared by `settings.ts` and `naviKriyaSettings.ts`.

### View-model (layer flattening — audit #2)

- [ ] **VIEWMODEL-01**: `src/app/appControllerAdapters.ts` is deleted; the field extraction it performed is inlined at the `create*ViewModel` call sites in `useAppViewModel` (which already holds the controllers).
- [ ] **VIEWMODEL-02**: The redundant `…ViewState` arg interfaces and `…PresentationInput` shapes are merged so `createPracticeSessionViewModel` consumes presentation inputs directly (no field-for-field re-declaration).
- [ ] **VIEWMODEL-03**: Per-practice dispatch is single-sourced on the existing `kind`-tagged union — the duplicated `activePractice === 'naviKriya'` branches in `createPracticeControlsViewModel` collapse into one block.

### Session shell (shared stack — audit #4)

- [ ] **SHELL-01**: A shared `useSessionShell` hook owns lead-in scheduling, end-dialog state (`requestEnd`/`confirmEnd`/`cancelEnd` + `endDialogOpen`), wake-lock threading, record-on-complete, and timbre capture — parameterized by an engine adapter; the HRV and NK controllers shrink to their genuinely-different bits. The rAF/worker-heartbeat vs `setTimeout`-chain engine drivers are NOT unified.
- [ ] **SHELL-02**: A single shared `useEventCallback` (mirror-into-ref + stable wrapper) replaces the hand-rolled ref+effect callback-identity pairs (e.g. `useAudioCues` callback refs, the `sessionReanchorRef` bridge).

### Domain frame (type model — audit #5)

- [ ] **FRAME-01**: `SessionFrame` carries only shared fields; the HRV and stretch variants are modeled as a `kind: 'hrv' | 'stretch'` discriminated union (stretch-only fields required on the stretch variant, absent on HRV); the `?? plan.x` fallbacks at consumers disappear.
- [ ] **FRAME-02**: `walkFutureCues` cycle-stride / active-segment math is de-duplicated against `sessionMath` + `stretchRamp` via shared `findActiveSegment(segments, cycleIndex)` + `phaseOffsetFor(...)` helpers (three copies → one).

### Component & leftover cleanups (audit #6 remainder)

- [ ] **CLEANUP-01**: In `OrbShape.tsx` the identical `SPIRITUAL_EYE_HALOS.map` / `V1_HALOS.map` JSX blocks render via one `.map` over a selected array; the `variant === 'spiritual-eye' ? … : …` disc-bg ternary is extracted to a single `discBgFor(variant)` used at all call sites.
- [ ] **CLEANUP-02**: The two `audio` props in `PracticeControlsView` are disambiguated by name at the VM boundary (e.g. `practiceControls.audio` vs `resumeAnnouncement`) so a type, not an 11-line doc comment, holds the contract.
- [ ] **CLEANUP-03**: `sessionController` `lockedSettings` / `selectedSettings` are renamed for their role (e.g. `audioPlanSettings` / `restoreSettings`) so the load-bearing distinction lives in the name, not a 7-line comment.

### Tests (curation — operator: tests are not the gate)

- [ ] **TEST-01** _(cross-cutting, verified in every phase)_: Each refactor phase audits the tests covering the code it touches — keep/fix tests that protect real user-visible behavior, delete stale / old-decision-locking / drift-guard tests that only pass because they assert the wrong thing. No code is contorted to keep a garbage test green.
- [ ] **TEST-02**: A standalone audit of tests NOT tied to any refactor area above — garbage, stale, and decision-locking tests are deleted with evidence; what remains protects real behavior. Progress is not measured by test count.

### Cross-cutting gates

- [ ] **BEHAVIOR-01** _(cross-cutting, verified in every phase)_: No user-facing behavior change across the milestone — the app behaves identically on desktop and mobile (HRV, Stretch, Navi Kriya). Verified by behavior reasoning / running the app.
- [ ] **QUAL-01** _(cross-cutting, verified in every phase)_: `tsc` + `lint` + `build` exit 0 on every commit; the curated test suite passes; `dependencies` stays `react` + `react-dom` (zero net-new runtime deps).

## Future Requirements

Deferred — tracked, not in this roadmap.

### Carry-forwards (not v2.3 scope)

- **I18N-04**: PT-BR native-speaker review of v2.1 `appearance.*` strings (removes the 15 `// TODO: native-speaker review` markers).
- **WAKELOCK-CF**: iOS standalone-PWA Wake Lock < 18.4 detect-and-warn product decision; S2 Android Chrome wake-lock real-device UAT (physical device dependent).
- **AMBIENT-F1**: Continuous ambient layer — seed at `.planning/seeds/continuous-ambient-layer.md`; trigger is an aesthetic-direction or sample-content addition.

## Out of Scope

Explicitly excluded — documented to prevent scope creep.

| Item | Reason |
|------|--------|
| Any user-facing feature change | Milestone is behavior-preserving cleanup only |
| File-size splits / "1k-line" refactors | Audit found nothing near the cliff; large files are large from comments, not tangled logic |
| Unifying the HRV/NK engine drivers (rAF+worker vs setTimeout) | Essential difference; merging adds abstraction without deleting branches (audit "do not fix") |
| Refactoring the three settings forms into a config-driven schema | Correctly factored over shared primitives; a schema form would be over-engineering (audit "do not fix") |
| Changing the `unknown`-boundary coercion at the storage edge | Appropriate trust-boundary pattern; no `any`, no unguarded casts (audit "do not fix") |
| Rewriting `NKShape.tsx` | Thin, correct delegation to `OrbShape`; good separation (audit "do not fix") |
| Measuring progress by test count or preserving green tests as a goal | Tests are not the source of truth; behavior is ([[feedback_tests_not_truth_app_is_simple]]) |

## Traceability

Populated during roadmap creation (phases continue from v2.2; numbering starts at **Phase 55**).

| Requirement | Phase | Status |
|-------------|-------|--------|
| COMMENT-01 | — | Pending |
| COMMENT-02 | — | Pending |
| STORAGE-01 | — | Pending |
| STORAGE-02 | — | Pending |
| STORAGE-03 | — | Pending |
| STORAGE-04 | — | Pending |
| STORAGE-05 | — | Pending |
| VIEWMODEL-01 | — | Pending |
| VIEWMODEL-02 | — | Pending |
| VIEWMODEL-03 | — | Pending |
| SHELL-01 | — | Pending |
| SHELL-02 | — | Pending |
| FRAME-01 | — | Pending |
| FRAME-02 | — | Pending |
| CLEANUP-01 | — | Pending |
| CLEANUP-02 | — | Pending |
| CLEANUP-03 | — | Pending |
| TEST-01 | (cross-cutting) | Pending |
| TEST-02 | — | Pending |
| BEHAVIOR-01 | (cross-cutting) | Pending |
| QUAL-01 | (cross-cutting) | Pending |

**Coverage:**
- v1 requirements: 21 total (17 phase-mapped + 4 cross-cutting)
- Mapped to phases: TBD by roadmapper
- Unmapped: 0 (target)

---
*Requirements defined: 2026-05-29*
*Last updated: 2026-05-29 after v2.3 milestone init*
