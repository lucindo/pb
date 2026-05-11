# Milestones

## v1.0 MVP (Shipped: 2026-05-11)

**Delivered:** A hands-off HRV breathing webapp with accurate session timing, polished accessible visual guide, optional generated audio cues, local memory + practice stats, mobile wake-lock resilience, and a claim-safe Forrest Knutson learning surface.

**Phases:** 7 (Phases 1, 2, 3, 4, 5, 5.1 INSERTED, 6)
**Plans:** 30 (29 with SUMMARY.md; Plan 05-04 manual UAT logged via 05-04-UAT-LOG.md)
**Timeline:** 2026-05-08 → 2026-05-11 (3 days)
**Codebase:** ~9,032 LOC TypeScript/TSX/CSS in `src/`
**Tests:** 363/363 Vitest pass, `tsc --noEmit` exit 0, `npm run build` exit 0 (2026-05-10)
**Commits:** 334 total on `main` (55 `feat(` commits)

### Key accomplishments

1. **Configurable session timing** — BPM 1–7 (0.5 steps), 4 inhale/exhale ratios (50:50, 40:60, 30:70, 20:80), 5–60 min in 5-min steps or unlimited. Single accurate clock drives continuous inhale/exhale alternation with no pauses; timed completion + manual end paths both clean up cleanly.
2. **Polished accessible visual guide** — Orb with stacked gradient layers + two static reference rings + in-orb large phase label, fluid `clamp()` sizing, reduced-motion fixed-mid-scale + gradient crossfade branch, native `<dialog>` end-session confirm with locked copy, focus-visible rings, 44×44 hit-area floor.
3. **Optional generated audio cues** — FakeAudioContext-tested `cueSynth` + `lookaheadScheduler`, AC lifecycle + mute fade + lead-in scheduling, dual-anchor scheduling for phase-aligned cues, MuteToggle with morphing reconstruction affordance for iOS recovery.
4. **Local memory + practice stats** — Silent-fallback localStorage envelope, per-field validate-and-fallback restore on mount, persisted setters, single-write-site stats record with idempotency guard, StatsFooter (count + total minutes + last session), ResetStatsDialog wipes stats only.
5. **Mobile hands-off resilience** — Progressive-enhancement Wake Lock with two-ref pattern (sentinel + wasAcquired), match-pair sentinel guard, idempotent release, visibility re-acquire across 3 App.tsx call sites.
6. **Hands-off polish (Phase 5.1 INSERTED)** — iOS Safari audio engine reconstruction + dual-anchor re-anchor (D-29..D-44) + gesture-attached resume affordance; Safari desktop orb max-scale visual fix via explicit-positioning pattern on `.orb` + outer-ring spans.
7. **Learning + claim-safe positioning** — Page-level `LearnAnchor` (D-18 disable-not-hide contract during session view) + native `<dialog>` `LearnDialog` with Forrest YouTube/Website-Trainings/Mastering-Meditation-book/curated videos, locked `inspired by Forrest's teachings` phrase, two-line disclaimer.

### Carry-forwards to v1.x

| Item | Source |
|------|--------|
| iOS Safari mid-page audio recovery after lock/unlock | Override SC1 (user-signed 2026-05-10) — OS-level audio session loss |
| Firefox Desktop orb scale-animation flicker | Override FF-01 (user-signed 2026-05-10) — root remedy needs CSS keyframes |
| S2 Android Chrome wake lock real-device UAT | Phase 5 Plan 04 — physical device unavailable |
| iOS Safari Pitfall 6 — phone-call interrupted state | Phase 3 Open Question 5 / Assumption A6 |
| Inner-ring UX symmetry (Issue B) | Phase 5.1 — separate planning candidate |

Known deferred items at close: 5 functional carry-forwards + 2 procedural artifact gaps (Phase 5 missing VERIFICATION.md, Phase 02/03 VERIFICATION.md status `human_needed` after 5.1 Task 4 cross-browser sweep closed all items). See `.planning/STATE.md` Deferred Items.

### Audit

`.planning/milestones/v1.0-MILESTONE-AUDIT.md` — PASSED 23/23 requirements satisfied, 7/7 cross-phase flows wired.

---
