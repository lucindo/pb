# Roadmap: HRV Breathing WebApp

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 + 5.1 (shipped 2026-05-11)
- ✅ **v1.0.1 Code Review Patch** — Phases 7–12 (shipped 2026-05-12)
- ✅ **v1.1 Customization** — Phases 13–19 (shipped 2026-05-15)
- ✅ **v1.2 BPM Stretch** — Phases 20–22 (shipped 2026-05-15)
- ✅ **v1.3 Release Polish** — Phases 23–27 (shipped 2026-05-16)
- ✅ **v1.4 Install Helper** — Phases 28–29 (shipped 2026-05-16)
- ✅ **v1.5 Multi-Practice** — Phases 30–35 (shipped 2026-05-19)
- ✅ **v2.0 New Design** — Phases 36–41, 44, 45 (shipped 2026-05-25)
- ✅ **v2.1 Kuthasta and Settings Switches** — Phases 46–48 (shipped 2026-05-26)
- ✅ **v2.2 Audio Sync** — Phases 49, 49.1, 50–54 (shipped 2026-05-29)
- 🚧 **v2.3 Maintainability** — Phases 55–61 (in progress)

## Phases

### v2.3 Maintainability (Phases 55–61) — IN PROGRESS

Behavior-preserving tech-debt paydown from the full `src/` maintainability audit (`.planning/CODE-QUALITY-REVIEW.md`). Architecture is healthy — this is deletion + consolidation, not redesign. **Verification gate on every phase: no user-facing behavior change.** Tests are NOT the gate — a refactor is correct because the app behaves identically (verified by reasoning from behavior / running the app), not because a suite stays green; the test suite is itself in scope for curation (keep/fix real-behavior tests, delete stale / decision-locking / drift-guard cruft).

- [ ] **Phase 55: Comment de-archaeology** — strip planning-tag comments + stale line-refs across `src/`; keep load-bearing *why* in present tense
- [ ] **Phase 56: Storage de-duplication** — collapse `record*Session` / `save*Settings`; hoist `asRecord`; add `isMember` / `isPositiveInteger`
- [ ] **Phase 57: View-model layer flattening** — delete `appControllerAdapters.ts`; merge redundant VM interfaces; single-source per-practice dispatch
- [ ] **Phase 58: Session-stack shell** — extract `useSessionShell` + `useEventCallback` (engine drivers stay separate)
- [ ] **Phase 59: Domain frame model** — `SessionFrame` discriminated union + `walkFutureCues` de-dup
- [ ] **Phase 60: Component/leftover cleanups** — `OrbShape` map/ternary collapse; named VM audio props; role-named session settings
- [ ] **Phase 61: Test-suite garbage sweep** — standalone audit of tests not tied to any refactor area; delete garbage/stale/decision-locking with evidence

## Phase Details

### Phase 55: Comment de-archaeology
**Goal**: A maintainer reading any `src/` file sees present-tense explanations of load-bearing invariants, with no planning-process archaeology or stale line-references to wade through. (Audit #3 — biggest ROI, lowest risk, unblocks reading for every later phase.)
**Depends on**: Nothing (first phase of the milestone; should land before 56–60 because it unblocks reading)
**Requirements**: COMMENT-01, COMMENT-02 (+ cross-cutting TEST-01, BEHAVIOR-01, QUAL-01)
**Success Criteria** (what must be TRUE):
  1. No `src/` comment carries a planning-artifact tag — `D-xx`, `WR-xx`, `Phase NN`, `Blocker #N`, `Pitfall N`, `spike NNN`, or a dated "kitchen-sink fix" note; load-bearing rationale that was attached to such a tag survives as a present-tense statement of the invariant (verifiable by grep across `src/`).
  2. No `src/` comment cites a line number or deleted-code location (`formerly at L###`, `mirror X L###`, etc.) — including the already-stale `useAudioCues.ts` "L213-222" ref.
  3. The app behaves identically on desktop and mobile across HRV, Stretch, and Navi Kriya — comment edits touch no executable code (no user-facing behavior change).
  4. Tests covering the touched files are audited: any test asserting on comment text or planning tags is deleted; no real-behavior test is weakened. `tsc` + `lint` + `build` exit 0; the curated suite passes; `dependencies` stays `react` + `react-dom`.
**Plans**: TBD

**Plans:**
- [ ] 55-01-PLAN.md — De-archaeologize src/hooks comments (densest; useAudioCues 150 hits)
- [ ] 55-02-PLAN.md — De-archaeologize src/audio comments (preserve iOS/TOCTOU/silent-WAV invariants)
- [ ] 55-03-PLAN.md — De-archaeologize src/domain comments
- [ ] 55-04-PLAN.md — De-archaeologize src/storage comments (mostly delete parity/modeling)
- [ ] 55-05-PLAN.md — De-archaeologize src/components comments (spike-geometry provenance, keep values)
- [ ] 55-06-PLAN.md — De-archaeologize src/app/content/styles + root (skip 12 I18N markers)
- [ ] 55-07-PLAN.md — Strip tags in audio/components/content/domain test comments (no test deletion)
- [ ] 55-08-PLAN.md — Strip tags in hooks/storage/app/styles + top-level test comments (no test deletion)

### Phase 56: Storage de-duplication
**Goal**: A change to the session-record guard logic or settings-persistence shape is made in exactly one place — the three byte-identical `record*Session` and `save*Settings` families collapse to single parameterized helpers, and the scattered storage-edge predicates have one definition each. (Audit #1 + #6 helpers.)
**Depends on**: Phase 55 (cleaner comments make the duplication and its single-source target legible); otherwise independent
**Requirements**: STORAGE-01, STORAGE-02, STORAGE-03, STORAGE-04, STORAGE-05 (+ cross-cutting TEST-01, BEHAVIOR-01, QUAL-01)
**Success Criteria** (what must be TRUE):
  1. One `recordPracticeSession(sliceKey, …, extra?)` single-sources the NaN guard, the `COUNT_THRESHOLD_MS` early-return, and the read-merge-write envelope; `recordResonantSession` / `recordStretchSession` / `recordNaviKriyaSession` are thin wrappers (NK passes its `roundsCompleted` merge), and the near-copy in `stats.ts` no longer duplicates the logic.
  2. One `savePracticeSettings(sliceKey, settings, deps)` backs all three former `save*Settings` functions; `asRecord` exists once in `storage.ts` with the duplicates in `practices.ts` / `prefs.ts` / `settings.ts` / `stats.ts` removed.
  3. A single `isMember<T>` predicate replaces the repeated `(X_OPTIONS as readonly string[]).includes(v)` casts (including the inconsistent `unknown[]` widening), and a single `isPositiveInteger(v, { multipleOf? })` replaces the duplicated finite-integer idiom in `settings.ts` + `naviKriyaSettings.ts`.
  4. The app behaves identically: sessions still record (count + minutes + last-session + NK rounds), settings still persist per practice across reloads, and corrupt-field coercion on read is unchanged across HRV, Stretch, and Navi Kriya (no user-facing behavior change).
  5. Tests covering storage are audited — record/persist/coerce behavior tests are kept or repointed at the collapsed helpers; tests that only locked the old duplicated structure are deleted. `tsc` + `lint` + `build` exit 0; the curated suite passes; deps stay `react` + `react-dom`.
**Plans**: TBD

### Phase 57: View-model layer flattening
**Goal**: The view-model path is one logical hop instead of an adapter that adapts an adapter — `appControllerAdapters.ts` is gone, the redundant interfaces are merged, and per-practice dispatch reads the existing tagged union once. (Audit #2.)
**Depends on**: Phase 55 (reading the forwarding layers is easier post-strip); independent of 56
**Requirements**: VIEWMODEL-01, VIEWMODEL-02, VIEWMODEL-03 (+ cross-cutting TEST-01, BEHAVIOR-01, QUAL-01)
**Success Criteria** (what must be TRUE):
  1. `src/app/appControllerAdapters.ts` no longer exists; the field extraction it performed is inlined at the `create*ViewModel` call sites in `useAppViewModel` (which already holds the controllers).
  2. The `…ViewState` arg interfaces and `…PresentationInput` shapes are merged so `createPracticeSessionViewModel` consumes presentation inputs directly — no field-for-field re-declaration of the same shape.
  3. Per-practice dispatch is single-sourced on the existing `kind`-tagged union: the duplicated `activePractice === 'naviKriya'` branches in `createPracticeControlsViewModel` collapse into one block.
  4. The app behaves identically across all three practices and all surfaces (Idle / Running / Complete / Learn / App Settings) — the same view state reaches the same components (no user-facing behavior change).
  5. Tests covering the view-model layer are audited — behavior-level VM tests are kept or repointed; tests that only asserted the deleted forwarding hops are removed. `tsc` + `lint` + `build` exit 0; the curated suite passes; deps stay `react` + `react-dom`.
**Plans**: TBD
**UI hint**: yes

### Phase 58: Session-stack shell
**Goal**: The HRV and Navi Kriya session controllers share one shell for everything they do identically (lead-in, end-dialog, wake-lock, record-on-complete, timbre capture), shrinking each to its genuinely-different bits — without unifying the essentially-different engine drivers below it. (Audit #4 — deeper structural win; warrants its own discuss/plan cycle.)
**Depends on**: Phase 55 (comment strip clarifies the parallel stacks); benefits from but does not require 57
**Requirements**: SHELL-01, SHELL-02 (+ cross-cutting TEST-01, BEHAVIOR-01, QUAL-01)
**Success Criteria** (what must be TRUE):
  1. A shared `useSessionShell` hook owns lead-in scheduling, the `requestEnd`/`confirmEnd`/`cancelEnd` + `endDialogOpen` end-dialog trio, wake-lock threading, record-on-complete, and timbre capture — parameterized by an engine adapter; the HRV and NK controllers retain only their genuinely-different logic (HRV's reanchor bridge, NK's per-OM cue toggle).
  2. The rAF/worker-heartbeat (HRV) and `setTimeout`-chain (NK) engine drivers remain separate and unmerged (audit "do not fix").
  3. A single shared `useEventCallback` (mirror-into-ref + stable wrapper) replaces the hand-rolled ref+effect callback-identity pairs (`useAudioCues` callback refs, the `sessionReanchorRef` bridge).
  4. The app behaves identically: lead-in countdown, end-session dialog, wake-lock acquire/release, completion recording, and timbre selection all work as before across HRV and Navi Kriya on desktop and mobile (no user-facing behavior change).
  5. Tests covering the session controllers are audited — lifecycle/behavior tests are kept or repointed at the shared shell; tests locking the old duplicated controller structure are deleted. `tsc` + `lint` + `build` exit 0; the curated suite passes; deps stay `react` + `react-dom`.
**Plans**: TBD

### Phase 59: Domain frame model
**Goal**: A `SessionFrame` is honestly typed as *either* uniform-HRV *or* per-segment-stretch via a discriminated union, so the type system enforces which fields are real and the `?? plan.x` fallbacks disappear; the cycle-stride / active-segment math lives in one place. (Audit #5 — deeper structural win; independent domain work; warrants its own discuss/plan cycle.)
**Depends on**: Phase 55; independent of 56–58 (pure domain layer)
**Requirements**: FRAME-01, FRAME-02 (+ cross-cutting TEST-01, BEHAVIOR-01, QUAL-01)
**Success Criteria** (what must be TRUE):
  1. `SessionFrame` carries only shared fields; the HRV and stretch variants are a `kind: 'hrv' | 'stretch'` discriminated union (stretch-only fields required on the stretch variant, absent on HRV), and the `?? plan.inhaleSec`-style fallbacks at consumers are gone.
  2. `walkFutureCues` no longer re-implements cycle-stride / active-segment math — it shares `findActiveSegment(segments, cycleIndex)` + `phaseOffsetFor(...)` with `sessionMath` + `stretchRamp` (three copies become one).
  3. The app behaves identically: HRV and Stretch sessions produce the same per-frame timing, the same BPM ramp, and the same phase-aligned audio cues as before (no user-facing behavior change).
  4. Domain tests are audited — frame-math and cue-walk behavior tests are kept or repointed at the union + shared helpers; tests asserting the old optional-bag shape are deleted. `tsc` + `lint` + `build` exit 0; the curated suite passes; deps stay `react` + `react-dom`.
**Plans**: TBD

### Phase 60: Component/leftover cleanups
**Goal**: The remaining lower-priority duplications are batched away — `OrbShape` renders its halos and disc background from one source instead of repeated blocks/ternaries, and two contract-by-comment seams become contract-by-name. (Audit #6 remainder.)
**Depends on**: Phase 55; independent of 56–59 (best batched after the structural phases so it sweeps true leftovers)
**Requirements**: CLEANUP-01, CLEANUP-02, CLEANUP-03 (+ cross-cutting TEST-01, BEHAVIOR-01, QUAL-01)
**Success Criteria** (what must be TRUE):
  1. In `OrbShape.tsx` the `SPIRITUAL_EYE_HALOS.map` / `V1_HALOS.map` blocks render via one `.map` over a selected array, and the `variant === 'spiritual-eye' ? … : …` disc-bg ternary is extracted to a single `discBgFor(variant)` used at all call sites.
  2. The two `audio` props in `PracticeControlsView` are disambiguated by name at the VM boundary (e.g. `practiceControls.audio` vs `resumeAnnouncement`) so a type — not an 11-line doc comment — holds the contract.
  3. `sessionController`'s `lockedSettings` / `selectedSettings` are renamed for their role (e.g. `audioPlanSettings` / `restoreSettings`) so the load-bearing distinction lives in the name, not a 7-line comment.
  4. The app behaves identically: all three orb variants (minimal / halo / kuthasta) render the same in every state, the resume announcement and controls still wire correctly, and lead-in/restore session config is unchanged (no user-facing behavior change).
  5. Tests covering these surfaces are audited — render/behavior tests are kept; tests locking the old duplicated blocks or comment-contracts are deleted. `tsc` + `lint` + `build` exit 0; the curated suite passes; deps stay `react` + `react-dom`.
**Plans**: TBD
**UI hint**: yes

### Phase 61: Test-suite garbage sweep
**Goal**: With each prior phase having already pruned the tests tied to the code it touched, a standalone sweep removes the remaining orphan garbage — stale, drift-guard, and old-decision-locking tests that survive only because they assert the wrong thing — leaving a suite that protects real behavior and isn't measured by count. (Standalone; intentionally LAST.)
**Depends on**: Phases 55–60 (per-phase pruning has already removed the area-tied cruft, so only true orphans remain for this sweep)
**Requirements**: TEST-02 (+ cross-cutting TEST-01, BEHAVIOR-01, QUAL-01)
**Success Criteria** (what must be TRUE):
  1. Tests NOT tied to any of the Phase 55–60 refactor areas are audited; each garbage / stale / decision-locking test deleted is removed with a recorded reason (what real behavior, if any, it failed to protect).
  2. Every test that remains protects a real, user-observable behavior — no test is kept solely to hold a count, and no production code was contorted to satisfy a false assertion.
  3. The app behaves identically on desktop and mobile across HRV, Stretch, and Navi Kriya — the sweep touches tests only (no user-facing behavior change).
  4. `tsc` + `lint` + `build` exit 0; the curated suite passes (smaller is fine — progress is not measured by test count); `dependencies` stays `react` + `react-dom`.
**Plans**: TBD

<details>
<summary>✅ v2.2 Audio Sync (Phases 49, 49.1, 50–54) — SHIPPED 2026-05-29</summary>

- [x] Phase 49: iOS speaker route fix (2/2 plans) — completed 2026-05-27
- [x] Phase 49.1: Advanced Settings + bypass-silent-mode toggle (3/3 plans) — completed 2026-05-27
- [x] Phase 50: SessionClock / scheduler abstraction (7/7 plans) — completed 2026-05-28
- [x] Phase 51: Master clock unification (5/5 plans) — completed 2026-05-28
- [x] Phase 52: Visibility-resume clamp + lookahead scheduling (6/6 plans; clamp later superseded by Phase 54) — completed 2026-05-28
- [x] Phase 53: Master-gain mute (implemented directly) — completed 2026-05-29
- [x] Phase 54: Background-audio continuity + clamp removal (implemented directly) — completed 2026-05-29

Full detail: `.planning/milestones/v2.2-ROADMAP.md` · Audit: `.planning/milestones/v2.2-MILESTONE-AUDIT.md`
</details>

<details>
<summary>✅ v2.1 Kuthasta and Settings Switches (Phases 46–48) — SHIPPED 2026-05-26</summary>

- [x] Phase 46: Kuthasta orb variant (3/3 plans) — completed 2026-05-26
- [x] Phase 47: Persistable feature-flag preferences (4/4 plans) — completed 2026-05-26
- [x] Phase 48: Appearance page + i18n (4/4 plans) — completed 2026-05-26

Full detail: `.planning/milestones/v2.1-ROADMAP.md`
</details>

<details>
<summary>✅ v2.0 New Design (Phases 36, 37, 38, 39, 40, 41, 44, 45) — SHIPPED 2026-05-25</summary>

- [x] Phase 36: Housekeeping bookkeeping reset (9/9 plans) — completed 2026-05-20
- [x] Phase 37: Stats UI removal (3/3 plans) — completed 2026-05-21
- [x] Phase 38: Variant removal (4/4 plans) — completed 2026-05-21
- [x] Phase 39: Theme simplification (5/5 plans) — completed 2026-05-21
- [x] Phase 40: Timbre preview cue (4/4 plans) — completed 2026-05-21 (4 empirical UAT items operator-confirmed at milestone close 2026-05-25)
- [x] Phase 41: Spike 010 Mono Zen — full implementation (spike-loop J1–J18; absorbed planned Phases 42 + 43) — completed 2026-05-25 at `d2b886b`
- [x] Phase 44: Final polish (7/7 plans) — completed 2026-05-25
- [x] Phase 45: Ring progress-cue toggle (3/3 plans, post-Phase-44 add-on; default flipped to `progress-arc` post-UAT) — completed 2026-05-25

Numbering gaps (42/43) are intentional: those originally-planned phases were absorbed into Phase 41 via the spike-loop format. Full detail: `.planning/milestones/v2.0-ROADMAP.md`.
</details>

<details>
<summary>✅ v1.5 Multi-Practice (Phases 30–35) — SHIPPED 2026-05-19</summary>

- [x] Phase 30: Multi-Practice Architecture & Switcher (4/4 plans)
- [x] Phase 31: Navi Kriya Engine & Session (6/6 plans)
- [x] Phase 32: Learn & Localization (3/3 plans)
- [x] Phase 33: Close gap — PRACTICE-02 resonant settings persistence (1/1 plans)
- [x] Phase 34: Stretch as a Distinct Practice (11/11 plans)
- [x] Phase 35: Flute Cue Timbre (2/2 plans)

Full detail: `.planning/milestones/v1.5-ROADMAP.md`
</details>

<details>
<summary>✅ v1.4 Install Helper (Phases 28–29) — SHIPPED 2026-05-16</summary>

- [x] Phase 28: Phone Install Banner (3/3 plans)
- [x] Phase 29: Settings Install Entry & Localization (3/3 plans)

Full detail: `.planning/milestones/v1.4-ROADMAP.md`
</details>

<details>
<summary>✅ v1.3 Release Polish (Phases 23–27) — SHIPPED 2026-05-16</summary>

- [x] Phase 23: License & README (1/1 plans)
- [x] Phase 24: Forrest Native-App Links (1/1 plans)
- [x] Phase 25: Labels-vs-Icons Cue Toggle (5/5 plans)
- [x] Phase 26: PT-BR Native-Speaker Review (1/1 plans)
- [x] Phase 27: PWA Install & Offline (3/3 plans)

Full detail: `.planning/milestones/v1.3-ROADMAP.md`
</details>

Earlier milestones (v1.0 → v1.2) are archived under `.planning/milestones/` — see `v1.0-ROADMAP.md`, `v1.0.1-ROADMAP.md`, `v1.1-ROADMAP.md`, `v1.2-ROADMAP.md` and the matching `*-REQUIREMENTS.md`.

## Progress

| Milestone | Phase Range | Plans | Status | Completed |
| --------- | ----------- | ----- | ------ | --------- |
| v1.0 MVP | 1–6 + 5.1 | 30 | Complete | 2026-05-11 |
| v1.0.1 Code Review Patch | 7–12 | 12 | Complete | 2026-05-12 |
| v1.1 Customization | 13–19 | 47 | Complete | 2026-05-15 |
| v1.2 BPM Stretch | 20–22 | 8 | Complete | 2026-05-15 |
| v1.3 Release Polish | 23–27 | 11 | Complete | 2026-05-16 |
| v1.4 Install Helper | 28–29 | 6 | Complete | 2026-05-16 |
| v1.5 Multi-Practice | 30–35 | 27 | Complete | 2026-05-19 |
| v2.0 New Design | 36–41, 44, 45 | 35 + 18 spike-loop items | Complete | 2026-05-25 |
| v2.1 Kuthasta and Settings Switches | 46–48 | 11 | Complete | 2026-05-26 |
| v2.2 Audio Sync | 49–54 | 23 (+ 53/54 direct) | Complete | 2026-05-29 |
| v2.3 Maintainability | 55–61 | TBD | In progress | — |

### v2.3 Phase Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 55. Comment de-archaeology | 0/TBD | Not started | - |
| 56. Storage de-duplication | 0/TBD | Not started | - |
| 57. View-model layer flattening | 0/TBD | Not started | - |
| 58. Session-stack shell | 0/TBD | Not started | - |
| 59. Domain frame model | 0/TBD | Not started | - |
| 60. Component/leftover cleanups | 0/TBD | Not started | - |
| 61. Test-suite garbage sweep | 0/TBD | Not started | - |
