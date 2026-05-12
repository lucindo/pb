# Roadmap: HRV Breathing WebApp

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 + Phase 5.1 INSERTED (shipped 2026-05-11)
- 🛠️ **v1.0.1 Code Review Patch** — Phases 7–12 (fix-only, all 26 REVIEW.md findings)
- 📋 **v1.1 (planned, deferred)** — Appearance/Settings umbrella (themes/CUST-01, timbres/CUST-02, visual variants/CUST-03, language/I18N-01), PWA install (PWA-01), BPM stretch session (PATT-02), plus v1.x carry-forwards from v1.0

## Milestone v1.0.1 Preamble

**Scope:** Fix-only patch. No new user-facing features. 27 REQ-IDs map 1:1 to the 26 findings in `REVIEW.md` (5 Critical / 12 Warning / 9 Info). All phases must satisfy the global invariant: **`npm run test` continues to pass 363/363 Vitest tests with no regressions** (additive tests permitted; behavior changes that tighten contracts MUST add tests). Likewise, `npm run build` and `tsc --noEmit` must exit 0 at every phase boundary.

**Sequencing principle:** Phase 7 lands strict-mode TypeScript and strict-type-checked ESLint FIRST. Every subsequent phase writes code against that strict baseline, so latent null/index/return errors surface once and are fixed inline rather than re-surfacing per phase.

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–6 + 5.1 INSERTED) — SHIPPED 2026-05-11</summary>

- [x] **Phase 1: Configurable Session Timing** (4/4 plans) — completed 2026-05-09
- [x] **Phase 2: Visual Guide & Accessible Responsive Interface** (4/4 plans) — completed 2026-05-09
- [x] **Phase 3: Optional Generated Audio Cues** (5/5 plans) — completed 2026-05-09
- [x] **Phase 4: Local Memory & Practice Stats** (4/4 plans) — completed 2026-05-10
- [x] **Phase 5: Mobile Hands-Off Resilience** (4/4 plans) — completed 2026-05-10 *(S2 Android Chrome UAT carry-forward to v1.x)*
- [x] **Phase 5.1: Hands-Off Resilience Polish (INSERTED 2026-05-10)** (5/5 plans) — completed 2026-05-10 *(iOS audio recovery + Firefox flicker carry-forward to v1.x)*
- [x] **Phase 6: Learning & Claim-Safe Positioning** (4/4 plans) — completed 2026-05-11

Archive: `.planning/milestones/v1.0-ROADMAP.md`
Audit: `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — PASSED 23/23
Requirements: `.planning/milestones/v1.0-REQUIREMENTS.md`

</details>

### 🛠️ v1.0.1 Code Review Patch (in progress)

- [x] **Phase 7: Strict Type & Lint Baseline** (4/4 plans) — completed 2026-05-11 — Enable `tsconfig` `strict` + `@typescript-eslint` strict-type-checked + audit `exhaustive-deps` enforcement; fix all resulting compiler/lint errors inline.
- [x] **Phase 8: Storage Forward-Compat & Cross-Tab UI Sync** (2/2 plans) — completed 2026-05-11 — Preserve on-disk envelope version, refuse downgrade, listen for cross-tab `storage` events.
- [x] **Phase 9: Audio + Wake Lock Lifecycle Hardening** (2/2 plans) — completed 2026-05-11 — Reconstruction generation counter, boundary-cue clamp, lead-in null-on-closed, per-cue node disconnect, defensive state-change handler, dead `'starting'` removal, wake-lock in-flight guard.
- [x] **Phase 10: Hooks Identity & Effect Hygiene** — `mutedRef` to stabilize `start`/`reconstructEngine`; status-only deps on App rAF effects; per-phase frame identity in `useSessionEngine`; rAF cancel-guard ordering; explicit ref-updater deps. *(verification gaps_found 2026-05-11 — see 10-VERIFICATION.md; awaiting gap closure)* (completed 2026-05-12)
- [x] **Phase 11: Domain, UI Contracts & Accessibility** (1/1 plans) — completed 2026-05-12 — Boundary validation in `extendTimedSession`, `SessionReadout` lead-in placeholder contract, symmetric auto-close for Learn/Reset dialogs in-session, `MuteToggle` resume-mode a11y attributes.
- [x] **Phase 12: Assets, Content & Hygiene Cleanup** — Favicon `%BASE_URL%` fix, `amzn.to` link disclosure/canonicalization, prune dead `audioNow` from hook return, share `isValid<X>` predicates across validators, document `formatLastSessionDate` test-only seam. (completed 2026-05-12)

### 📋 v1.1 (planned, deferred)

- [ ] Phase 13+: TBD by `/gsd-new-milestone` after v1.0.1 ships (Appearance/Settings umbrella, PWA install, BPM stretch session, v1.x carry-forwards)

## Phase Details

### Phase 7: Strict Type & Lint Baseline
**Goal**: Land strict TypeScript + strict-type-checked ESLint as the compiler-enforced baseline for the rest of the milestone, fixing all resulting errors inline.
**Depends on**: Nothing (foundation phase; v1.0 milestone closed)
**Requirements**: BUILD-01, BUILD-02, BUILD-03
**Success Criteria** (what must be TRUE):
  1. `tsconfig.app.json` and `tsconfig.node.json` set `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitReturns: true`, `noFallthroughCasesInSwitch: true`; `tsc --noEmit` exits 0.
  2. `eslint.config.js` extends `tseslint.configs.strictTypeChecked` with `parserOptions.project` wired for type-aware rules; `npm run lint` exits 0 with all resulting errors fixed inline.
  3. `react-hooks/exhaustive-deps` is enforced at `error` level; every remaining `// eslint-disable` for that rule is annotated with justification (or removed).
  4. `npm run build` exits 0 and the full Vitest suite (363/363 at milestone start) continues to pass with no behavior change.
**Plans**: 4 plans (waves 1 → 2 → 3 → 4, strictly serial due to App.tsx + eslint.config.js file-overlap)
  - [x] 07-01-PLAN.md — tsconfig strict landing (BUILD-01); add `strict`/`noUncheckedIndexedAccess`/`noImplicitReturns` to both tsconfigs and fix the 12 surfaced TS2532/TS18048 errors in 4 test files (wave 1, 2 tasks)
  - [x] 07-02-PLAN.md — ESLint strictTypeChecked + projectService preset upgrade (BUILD-02 part 1); fix the 3 large production-rule clusters: `unbound-method` (24), `restrict-template-expressions` (16) + `no-confusing-void-expression` (6) + `no-misused-promises` (2) (wave 2, depends on 07-01, 3 tasks)
  - [x] 07-03-PLAN.md — Production singletons + 162 test-file errors + App.tsx:411 stale disable removal (BUILD-02 part 2 — first commit at which `npm run lint` exits 0); fix the 16 isolated production rule fires (no-unnecessary-condition × 6 incl. usePrefersReducedMotion typeof-window removal, no-unnecessary-type-assertion × 5, no-non-null-assertion × 1, no-useless-assignment × 1, exhaustive-deps × 1) and the ~162 test-file errors (typed JSON.parse helpers, annotated non-null assertions, FakeAudioContext require-await annotations) (wave 3, depends on 07-02, 2 tasks)
  - [x] 07-04-PLAN.md — react-hooks/exhaustive-deps `error` override + D-04 `// Reason:` annotation audit (BUILD-03); annotate the 2 surviving App.tsx set-state-in-effect disables and the new usePrefersReducedMotion.ts set-state-in-effect fire (wave 4, depends on 07-03, 2 tasks)

### Phase 8: Storage Forward-Compat & Cross-Tab UI Sync
**Goal**: Make the localStorage envelope safe to read/write across schema bumps and keep stats UI consistent when a second tab writes the envelope key.
**Depends on**: Phase 7 (writes against strict-typed baseline)
**Requirements**: STORAGE-01, STORAGE-02, STORAGE-03
**Success Criteria** (what must be TRUE):
  1. `readEnvelope` returns the on-disk `version` field (not an unconditional rewrite to `STATE_VERSION`); forward-compatible unknown fields are not silently dropped.
  2. `writeEnvelope` refuses to overwrite a future on-disk envelope (on-disk `version > STATE_VERSION` → no-op write); a Vitest case locks the no-downgrade contract.
  3. App-level `storage` event listener refreshes the stats display when another tab writes the envelope key; UI stays consistent across tabs in a manual two-window test.
  4. Existing 363/363 tests still pass; new tests cover read-preserve, write-refuse-downgrade, and cross-tab refresh.
**Plans**: 2 plans (wave 1 → wave 2; Plan 02 depends on Plan 01 because App.tsx storage listener relies on the post-Plan-01 adapter contracts)
  - [x] 08-01-PLAN.md — Storage adapter contract: STORAGE-01 readEnvelope D-01 spread-and-override + STORAGE-02 writeEnvelope D-04a nested-try-catch downgrade refusal + WR-07 comment update in stats.ts (wave 1, 3 tasks)
  - [x] 08-02-PLAN.md — Cross-tab UI refresh listener: STORAGE-03 App.tsx useEffect([]) `window` storage listener + STORAGE-03 cross-tab refresh & D-06a key-filter test cases in App.persistence.test.tsx (wave 2, depends on 08-01, 2 tasks)

### Phase 9: Audio + Wake Lock Lifecycle Hardening
**Goal**: Close the imperative-resource races and defensive gaps in audio reconstruction, boundary cue scheduling, lead-in projection, oscillator graph cleanup, state-change handling, and wake-lock acquisition.
**Depends on**: Phase 7
**Requirements**: AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04, AUDIO-05, AUDIO-06, WAKELOCK-01
**Success Criteria** (what must be TRUE):
  1. `useAudioCues.reconstructEngine` stamps a generation counter and bails out (closing the new engine) if `stop()` / unmount / a newer reconstruct ran during the `await createAudioEngine(...)`; `stop()` and unmount bump the same generation.
  2. The App boundary effect (or `notifyPhaseBoundary`) clamps `audioTime` to `engine.now() + SAFE_LEAD_SEC` so post-resume boundary cues are never silently dropped by the Web Audio "past-time → no-op" rule.
  3. `audioEngine.scheduleLeadIn` returns `null` when the engine is `closed`; `useAudioCues.start` propagates that null to its `number | null` return; partial-cue oscillator chains are explicitly disconnected via `osc.onended` so node retention does not grow across mute toggles.
  4. `handleStateChange` is null-safe end-to-end (or the `statechange` listener is attached only after the WR-06 resume completes); the dead `'starting'` member is removed from `AudioStatus`.
  5. `useWakeLock.request()` no-ops the second concurrent caller via an in-flight ref and cleanly releases a freshly-acquired sentinel if `release()` / unmount ran during the await; second-caller-leak and unmount-during-await scenarios are covered by Vitest.
  6. Full Vitest suite passes; new tests cover the reconstruction race, boundary clamp, lead-in `null`, oscillator disconnect, and wake-lock concurrency.
**Plans**: 2 plans (wave 1 engine-layer → wave 2 hook+App-layer; Plan 02 depends on Plan 01 for the SAFE_LEAD_SEC export and the scheduleLeadIn: number | null return type)
  - [x] 09-01-PLAN.md — Wave 1 engine-layer: AUDIO-02 engine-side clamp + `SAFE_LEAD_SEC` export, AUDIO-03 `scheduleLeadIn` returns null when closed, AUDIO-04 cueSynth `osc.onended { once: true }` chain disconnect, AUDIO-06 `AudioStatus` union tightening, WAKELOCK-01 in-flight ref + post-await sentinel handoff (wave 1, 3 tasks)
  - [x] 09-02-PLAN.md — Wave 2 hook+App-layer: AUDIO-01 `reconstructGenerationRef` + stop/unmount bumps + post-await bail, AUDIO-05 `handleStateChange` single null gate, AUDIO-03 hook-side null propagation, AUDIO-06 hook-side `setStatus('starting')` removal + docstring rewrite, AUDIO-02 caller-side clamp at App.tsx:504 (wave 2, depends on 09-01, 2 tasks)

### Phase 10: Hooks Identity & Effect Hygiene
**Goal**: Stabilize callback identity in `useAudioCues` and stop App-level rAF effects from re-running every animation frame, by splitting per-phase vs per-frame frame identity and switching effects to status-primitive deps.
**Depends on**: Phase 7 (strict baseline catches new dep-list errors); reads from same files as Phase 9 — Phase 10 runs after Phase 9 ships.
**Requirements**: HOOKS-01, HOOKS-02, HOOKS-03, HOOKS-04, HOOKS-05
**Success Criteria** (what must be TRUE):
  1. `useAudioCues.start()` and `reconstructEngine` read mute state via a `mutedRef` updated by an effect on `[muted]`; the `start` callback's identity is stable across mute toggles (verified by Testing Library render-count or callback-identity assertion).
  2. The App effect that cleans up audio/wake-lock/lead-in on leaving `running` depends on `state.status` (and small primitives), not on the per-frame `state` object; the running-snapshot writer moves off React effects (ref-write inside `useSessionEngine` or a stable callback).
  3. `useSessionEngine.currentFrame` returns the same memoized frame object across renders within the same `cycleIndex:phase`; a separate `liveFrame` (or equivalent) carries per-rAF `phaseProgress` for `BreathingShape`.
  4. The rAF loop's `cancelled` short-circuit runs at the top of `tick()` so an extra rAF firing after teardown returns immediately; the `App.tsx:80-82` ref-updater effect declares explicit `[session.currentFrame]` deps and passes `react-hooks/exhaustive-deps`.
  5. No regressions in the existing 363/363 suite; boundary cues still fire exactly once per phase transition (locked by existing tests and any added identity-stability tests).
**Plans**: 2 plans (10-01 shipped wave 1 — all five HOOKS-* requirements; 10-02 wave 2 gap closure for CR-01 BLOCKER + WR-01/WR-02 WARNINGs surfaced by 10-VERIFICATION.md)
  - [x] 10-01-PLAN.md — Single plan covering all five HOOKS-* requirements: Task 1 useSessionEngine (HOOKS-03 currentFrame memo + liveFrame split + HOOKS-04 top-of-tick cancel-guard + HOOKS-02 runningSnapshotRef ref-write inside rAF setState updater + EXTEND useSessionEngine.test.tsx); Task 2 useAudioCues (HOOKS-01 mutedRef on top of muted state + drop muted from start/reconstructEngine deps + EXTEND useAudioCues.test.tsx); Task 3 App.tsx (DELETE local runningSnapshotRef + DELETE running-snapshot effect at :412-420 + HOOKS-02 tighten cleanup deps to [state.status, ...] + D-05 BreathingShape & SessionReadout migration to session.liveFrame + HOOKS-05 verify sessionFrameRef updater at :81-84 passive)
  - [x] 10-02-PLAN.md — Gap closure (wave 2, depends_on [01]): Task 1 CR-01 fix in App.tsx:81-84 (sessionFrameRef sources from session.liveFrame to restore live elapsedMs for onAudioReanchorRequired); Task 2 CR-01 regression test in App.audio.test.tsx (asserts reconstruct-path audioAnchor math within +/- 0.05s of newAC.currentTime + remaining/1000); Task 3 WR-01 cancel-guard test hardening in useSessionEngine.test.tsx (vi.spyOn(console, error) + positive not.toHaveBeenCalledWith(stringContaining(unmounted))); Task 4 WR-02 stale comment fix at App.tsx:442-447 (replace "engine owns null-out" with engine-persists-on-transition-out claim cross-referencing useSessionEngine.ts:79-91)

### Phase 11: Domain, UI Contracts & Accessibility
**Goal**: Tighten small contracts at the domain/UI/a11y boundary so invalid inputs throw at the boundary, dialog state cannot drift into the session view, and `MuteToggle` carries semantically correct attributes in resume mode.
**Depends on**: Phase 7
**Requirements**: DOMAIN-01, UI-01, UI-02, A11Y-01
**Success Criteria** (what must be TRUE):
  1. `extendTimedSession` validates `durationMinutes` against `DURATION_OPTIONS` at the boundary (explicit throw OR narrowed `DurationOption` parameter type); failing values no longer require catching `RangeError` from deep inside `createBreathingPlan`.
  2. `SessionReadout` has an explicit contract for the lead-in placeholder case (idle status + non-null frame) — either an `isLeadInPlaceholder` prop or a `'lead-in'` status value — documented in `SessionReadoutProps` JSDoc and locked by a new Vitest case.
  3. `LearnDialog` and `ResetStatsDialog` cannot remain open while `inSessionView` is true; an App-level effect force-closes both on the transition; manual test confirms no visual change in the normal flow.
  4. `MuteToggle` removes `aria-pressed` and links `aria-describedby` to the App-level `aria-live` resume hint when `needsResume` is true; Testing Library asserts the attributes in both states.
  5. Full Vitest suite passes; new tests lock the domain throw, the readout contract, and the a11y attributes.
**Plans**: 1 plan (wave 1, single plan per D-13 — files barely overlap; App.tsx multi-touch lands at non-overlapping line ranges; four ordered task groups commit independently with the per-commit green-gate per D-17)
  - [x] 11-01-PLAN.md — All four REQ-IDs in one plan, four ordered task groups: Task 1 DOMAIN-01 sessionController.ts allowlist throw + sessionController.test.ts new case (D-01/D-02/D-03); Task 2 UI-01 SessionReadout isLeadInPlaceholder prop + NEW SessionReadout.test.tsx (3-4 cases) + App.tsx 576-585 wiring (D-04/D-05/D-06); Task 3 UI-02 new App-level subscribe-and-reflect useEffect on [inSessionView] mirroring the EndSessionDialog template at App.tsx:247-253 + App.dialog.test.tsx 2 new WR-09 cases (D-07/D-08/D-09); Task 4 A11Y-01 MuteToggle resumeHintId required prop + conditional aria-describedby + SessionControls plumbing + App.tsx id="mute-toggle-resume-hint" + resumeHintId="mute-toggle-resume-hint" forward + MuteToggle.test.tsx 2 new cases (D-10/D-11/D-12) (wave 1, 4 tasks; per-commit tsc/lint/build/vitest green-gate per D-17)

### Phase 12: Assets, Content & Hygiene Cleanup
**Goal**: Ship the non-behavioural cleanup items — favicon base-path fix, affiliate-link honesty, removal of dead API surface, shared validation predicates, and JSDoc on the test-only seam.
**Depends on**: Phase 7 (any code touched lands on the strict baseline)
**Requirements**: ASSETS-01, CONTENT-01, HYGIENE-01, HYGIENE-02, HYGIENE-03
**Success Criteria** (what must be TRUE):
  1. The favicon link in `index.html` resolves under Vite `base: '/hrv/'` in production (`%BASE_URL%favicon.svg` or relative `./favicon.svg`); `dist/index.html` inspection shows the correct href and a manual production-build smoke check shows the favicon loading without a 404.
  2. The "Mastering Meditation" link in `learnContent.ts` either uses a canonical `amazon.com/dp/...` URL OR `LearnDialog` discloses the affiliate relationship — the "Not affiliated with Forrest Knutson" disclaimer remains accurate.
  3. `useAudioCues` no longer returns `audioNow`; the `UseAudioCues` interface and return tuple are pruned with no consumer breakage in `App.tsx`.
  4. `isValidBpm` / `isValidRatio` / `isValidDuration` predicates are exported from `src/domain/settings.ts` and consumed by both `validateSettings` (throwing) and `coerceSettings` (silent-fallback); duplicated allow-list logic is removed.
  5. `formatLastSessionDate`'s `now: () => number = Date.now` injection seam is documented in JSDoc as test-only; full Vitest suite passes.
**Plans**: TBD

## Progress

| Phase                                              | Milestone | Plans Complete | Status      | Completed  |
| -------------------------------------------------- | --------- | -------------- | ----------- | ---------- |
| 1. Configurable Session Timing                     | v1.0      | 4/4            | Complete    | 2026-05-09 |
| 2. Visual Guide & Accessible Responsive Interface  | v1.0      | 4/4            | Complete    | 2026-05-09 |
| 3. Optional Generated Audio Cues                   | v1.0      | 5/5            | Complete    | 2026-05-09 |
| 4. Local Memory & Practice Stats                   | v1.0      | 4/4            | Complete    | 2026-05-10 |
| 5. Mobile Hands-Off Resilience                     | v1.0      | 4/4            | Complete    | 2026-05-10 |
| 5.1. Hands-Off Resilience Polish                   | v1.0      | 5/5            | Complete    | 2026-05-10 |
| 6. Learning & Claim-Safe Positioning               | v1.0      | 4/4            | Complete    | 2026-05-11 |
| 7. Strict Type & Lint Baseline                     | v1.0.1    | 4/4            | Complete    | 2026-05-11 |
| 8. Storage Forward-Compat & Cross-Tab UI Sync      | v1.0.1    | 2/2            | Complete    | 2026-05-11 |
| 9. Audio + Wake Lock Lifecycle Hardening           | v1.0.1    | 2/2            | Complete    | 2026-05-11 |
| 10. Hooks Identity & Effect Hygiene                | v1.0.1    | 2/2 | Complete    | 2026-05-12 |
| 11. Domain, UI Contracts & Accessibility           | v1.0.1    | 1/1            | Complete    | 2026-05-12 |
| 12. Assets, Content & Hygiene Cleanup              | v1.0.1    | 1/1 | Complete   | 2026-05-12 |
