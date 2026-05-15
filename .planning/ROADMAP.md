# Roadmap: HRV Breathing WebApp

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 + Phase 5.1 INSERTED (shipped 2026-05-11)
- ✅ **v1.0.1 Code Review Patch** — Phases 7–12 (shipped 2026-05-12)
- ✅ **v1.1 Customization** — Phases 13–19 + 16.1/16.2/16.3 INSERTED (shipped 2026-05-15)
- 📋 **v1.2 BPM Stretch** — Phases 20–22 (in progress)

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

<details>
<summary>✅ v1.1 Customization (Phases 13–19 + 16.1/16.2/16.3 INSERTED) — SHIPPED 2026-05-15</summary>

- [x] **Phase 13: Inner-Ring UX Symmetry** (1/1 plans) — completed 2026-05-12 — Reduced-motion inner-ring suppression; `.orb-layer--out` crossfade restored as sole substitute phase cue (WARMUP-01).
- [x] **Phase 14: Prefs Foundation** (1/1 plans) — completed 2026-05-12 — Envelope `prefs?` field; `isValid*` / `coerce*` predicates for theme/timbre/variant/locale (INFRA-01..03).
- [x] **Phase 15: SettingsDialog Shell** (4/4 plans) — completed 2026-05-13 — Native `<dialog>` gear-triggered settings panel with stub pickers; `inSessionView` disable contract (INFRA-04).
- [x] **Phase 16: Themes** (5/4 plans) — completed 2026-05-13 — CSS custom-property token system (`data-theme`); FOUC-prevention inline script; Light / Dark / System + 3 named palettes (THEME-01..05, THEME-UI-01).
- [x] **Phase 16.1: UI Token Migration (INSERTED 2026-05-13)** (7/7 plans) — completed 2026-05-13 — Migrated hardcoded Tailwind classes across 16 components to `var(--color-breathing-*)` tokens; `theme.no-hardcoded-classes.test.ts` guard active; contrast guard extended with accent-strong vs on-accent iteration.
- [x] **Phase 16.2: Palette Aesthetic Refresh (INSERTED 2026-05-13)** (2/2 plans) — completed 2026-05-13 — UAT carry-forward from 16.1 plan 06; 4 atomic per-palette gradient retunes (Light F1, Moss F4, Slate F5, Dusk F6+F7); perceptual aesthetic UAT deferred to 16.3.
- [x] **Phase 16.3: Thorough Theme Revision (INSERTED 2026-05-13)** (7/7 plans) — completed 2026-05-13 — 5 palettes redesigned from named open-source design systems (Nord Frost, Nord Polar Night, Everforest Light, Tokyo Night Day, Rosé Pine Main); per-palette THEME-05 ≥ 1.5 hold; 5/5 perceptual UAT approved.
- [x] **Phase 17: Visual Variants** (6/6 plans) — completed 2026-05-14 — Orb (default) + Square (18% rounded) + Diamond (rotated-square clip-path); render-only via dispatcher + sibling-shape pattern; sessionVariantRef capture-at-Start; old `'ring'` localStorage values coerce to default (CUST-03).
- [x] **Phase 18: Audio Timbres** (6/6 plans) — completed 2026-05-14 — 4 synthesized timbre presets (Bowl default + Bell + Sine + Chime) via `scheduleInCueForTimbre` / `scheduleOutCueForTimbre` dispatch; timbre captured at session start; Bowl default byte-identical (TIMBRE-01..05).
- [x] **Phase 19: Language Switching** (9/9 plans) — completed 2026-05-15 — EN+PT-BR instant React state swap; typed `Record<LocaleId, UiStrings>` catalog; `useLocale` orchestrator hook; `LanguagePicker` radiogroup with native endonyms; frozen-EN byte-equality guard on `LOCKED_COPY`; locale-aware `formatLastSessionDate`; 76 `// TODO: native-speaker review` markers persist as I18N-07 v1.x carry-forward (I18N-01..07).

Archive: `.planning/milestones/v1.1-ROADMAP.md`
Requirements: `.planning/milestones/v1.1-REQUIREMENTS.md`
Phase artifacts: `.planning/milestones/v1.1-phases/`

</details>

### 📋 v1.2 BPM Stretch (Phases 20–22)

- [ ] **Phase 20: Session Start Polish** - Disable Start button during lead-in countdown; no double-start possible.
- [ ] **Phase 21: Per-Theme Favicon** - Each of the 5 palettes ships its own favicon variant; swaps on theme change and at load.
- [ ] **Phase 22: BPM Stretch Session** - Stretch mode with warm-up → sub-perceptual ramp → cool-down on the existing one-clock SessionFrame.

## Phase Details

### Phase 20: Session Start Polish
**Goal**: Users cannot accidentally double-start a session during the lead-in countdown
**Depends on**: Phase 19 (existing session flow)
**Requirements**: LEAD-01
**Success Criteria** (what must be TRUE):
  1. User sees the Start button visually disabled while `appPhase === 'lead-in'` is in flight
  2. User cannot click Start a second time during the 3-second lead-in countdown (no double-start, no re-trigger)
  3. User sees the Start button return to its normal enabled state when the session moves to the first In/Out cycle
**Plans**: TBD
**UI hint**: yes

### Phase 21: Per-Theme Favicon
**Goal**: Users see a favicon that matches their active palette in the browser tab and OS task switcher
**Depends on**: Phase 20
**Requirements**: FAVI-01, FAVI-02, FAVI-03
**Success Criteria** (what must be TRUE):
  1. User sees a distinct favicon variant for each of the 5 palettes (Light, Dark, Moss, Slate, Dusk) that differs visually in the browser tab
  2. User's favicon swaps immediately when they change theme via SettingsDialog, including across tabs (same-tab + cross-tab `storage` event)
  3. User's persisted-theme favicon is applied on initial page load with no flash of the default favicon before the correct one appears
**Plans**: TBD
**UI hint**: yes

### Phase 22: BPM Stretch Session
**Goal**: Users can run a BPM stretch session whose breathing rate walks sub-perceptually from a warm-up BPM to a target BPM and then holds, using the existing one-clock SessionFrame and dual-anchor audio scheduling
**Depends on**: Phase 21
**Requirements**: STRETCH-01, STRETCH-02, STRETCH-03, STRETCH-04, STRETCH-05, STRETCH-06, STRETCH-07, STRETCH-08
**Success Criteria** (what must be TRUE):
  1. User can enable stretch mode from the session settings surface and the mode picker is disabled (grayed out) when the configured session duration is below the minimum gate that makes the ramp meaningful
  2. User can pick `initialBpm` and `targetBpm` independently from the existing BPM grid (1–7 in 0.5 BPM increments) and pick `holdInitialSeconds` (warm-up) and `holdTargetSeconds` (cool-down) durations
  3. User runs a session whose BPM steps are strictly less than 0.5 BPM throughout the ramp — the transition is sub-perceptual and the step invariant is enforced by the engine on the existing one-clock SessionFrame
  4. User hears phase-aligned audio cues across the entire ramp — the dual-anchor scheduling (Phase 3 D-13/D-14) holds across every BPM step change with no scheduling gap or misalignment
  5. User's stretch settings (initialBpm, targetBpm, holdInitialSeconds, holdTargetSeconds) persist across reloads via the existing localStorage envelope (refuse-downgrade write, forward-compat read), and the total session duration shown reflects `hold initial + ramp + hold target`
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Configurable Session Timing | v1.0 | 4/4 | Complete | 2026-05-09 |
| 2. Visual Guide & Accessible Responsive Interface | v1.0 | 4/4 | Complete | 2026-05-09 |
| 3. Optional Generated Audio Cues | v1.0 | 5/5 | Complete | 2026-05-09 |
| 4. Local Memory & Practice Stats | v1.0 | 4/4 | Complete | 2026-05-10 |
| 5. Mobile Hands-Off Resilience | v1.0 | 4/4 | Complete | 2026-05-10 |
| 5.1. Hands-Off Resilience Polish | v1.0 | 5/5 | Complete | 2026-05-10 |
| 6. Learning & Claim-Safe Positioning | v1.0 | 4/4 | Complete | 2026-05-11 |
| 7. Strict Type & Lint Baseline | v1.0.1 | 4/4 | Complete | 2026-05-11 |
| 8. Storage Forward-Compat & Cross-Tab UI Sync | v1.0.1 | 2/2 | Complete | 2026-05-11 |
| 9. Audio + Wake Lock Lifecycle Hardening | v1.0.1 | 2/2 | Complete | 2026-05-11 |
| 10. Hooks Identity & Effect Hygiene | v1.0.1 | 2/2 | Complete | 2026-05-12 |
| 11. Domain, UI Contracts & Accessibility | v1.0.1 | 1/1 | Complete | 2026-05-12 |
| 12. Assets, Content & Hygiene Cleanup | v1.0.1 | 1/1 | Complete | 2026-05-12 |
| 13. Inner-Ring UX Symmetry | v1.1 | 1/1 | Complete | 2026-05-12 |
| 14. Prefs Foundation | v1.1 | 1/1 | Complete | 2026-05-12 |
| 15. SettingsDialog Shell | v1.1 | 4/4 | Complete | 2026-05-13 |
| 16. Themes | v1.1 | 5/4 | Complete | 2026-05-13 |
| 16.1. UI Token Migration | v1.1 | 7/7 | Complete | 2026-05-13 |
| 16.2. Palette Aesthetic Refresh | v1.1 | 2/2 | Complete | 2026-05-13 |
| 16.3. Thorough Theme Revision | v1.1 | 7/7 | Complete | 2026-05-13 |
| 17. Visual Variants | v1.1 | 6/6 | Complete | 2026-05-14 |
| 18. Audio Timbres | v1.1 | 6/6 | Complete | 2026-05-14 |
| 19. Language Switching | v1.1 | 9/9 | Complete | 2026-05-15 |
| 20. Session Start Polish | v1.2 | 0/? | Not started | - |
| 21. Per-Theme Favicon | v1.2 | 0/? | Not started | - |
| 22. BPM Stretch Session | v1.2 | 0/? | Not started | - |

## Backlog

*(none currently)*
