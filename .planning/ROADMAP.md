# Roadmap: HRV Breathing WebApp

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 + Phase 5.1 INSERTED (shipped 2026-05-11)
- ✅ **v1.0.1 Code Review Patch** — Phases 7–12 (shipped 2026-05-12)
- 📋 **v1.1 (planned)** — Appearance/Settings umbrella (themes/CUST-01, timbres/CUST-02, visual variants/CUST-03, language/I18N-01), PWA install (PWA-01), BPM stretch session (PATT-02), plus v1.x carry-forwards (S2 Android Chrome UAT, iOS audio recovery, Firefox flicker)

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

<details>
<summary>✅ v1.0.1 Code Review Patch (Phases 7–12) — SHIPPED 2026-05-12</summary>

- [x] **Phase 7: Strict Type & Lint Baseline** (4/4 plans) — completed 2026-05-11 — `tsconfig` strict + `strictTypeChecked` + `exhaustive-deps` error enforcement; 48 production lint errors fixed inline.
- [x] **Phase 8: Storage Forward-Compat & Cross-Tab UI Sync** (2/2 plans) — completed 2026-05-11 — Envelope spread-then-override, refuse-downgrade write, cross-tab `storage` listener.
- [x] **Phase 9: Audio + Wake Lock Lifecycle Hardening** (2/2 plans) — completed 2026-05-11 — Reconstruction generation counter, boundary-cue clamp, lead-in null-on-closed, per-cue node disconnect, defensive state-change handler, dead `'starting'` removal, wake-lock in-flight guard.
- [x] **Phase 10: Hooks Identity & Effect Hygiene** (2/2 plans) — completed 2026-05-12 — `mutedRef` stabilization, status-only deps on App rAF effects, per-phase frame identity, rAF cancel-guard ordering, explicit ref-updater deps.
- [x] **Phase 11: Domain, UI Contracts & Accessibility** (1/1 plans) — completed 2026-05-12 — Boundary validation in `extendTimedSession`, `SessionReadout` lead-in placeholder, symmetric auto-close for Learn/Reset dialogs, `MuteToggle` resume-mode a11y.
- [x] **Phase 12: Assets, Content & Hygiene Cleanup** (1/1 plans) — completed 2026-05-12 — Favicon `%BASE_URL%` fix, canonical amazon.com book URL, `isValid<X>` predicate relocation to `domain/settings`, `formatLastSessionDate` JSDoc, HYGIENE-01 docs-only flip (Overtaken by Phase 9 AUDIO-02).

Archive: `.planning/milestones/v1.0.1-ROADMAP.md`
Audit: `.planning/milestones/v1.0.1-MILESTONE-AUDIT.md` — PASSED 27/27
Requirements: `.planning/milestones/v1.0.1-REQUIREMENTS.md`
Phase artifacts: `.planning/milestones/v1.0.1-phases/`

</details>

### 📋 v1.1 (planned)

- [ ] Phase 13+: TBD by `/gsd-new-milestone` after v1.0.1 closeout (Appearance/Settings umbrella, PWA install, BPM stretch session, v1.x carry-forwards)

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
| 9. Audio + Wake Lock Lifecycle Hardening           | v1.0.1    | 2/2            | Complete    | 2026-05-12 |
| 10. Hooks Identity & Effect Hygiene                | v1.0.1    | 2/2            | Complete    | 2026-05-12 |
| 11. Domain, UI Contracts & Accessibility           | v1.0.1    | 1/1            | Complete    | 2026-05-12 |
| 12. Assets, Content & Hygiene Cleanup              | v1.0.1    | 1/1            | Complete    | 2026-05-12 |
