# Roadmap: HRV Breathing WebApp

## Overview

The v1 roadmap builds toward one trustworthy hands-off HRV breathing guide: first the configurable session timing loop, then the polished accessible visual experience, optional synchronized sound, local memory and stats, mobile hands-off resilience, and finally the learning/positioning content that makes the app shareable without medical or endorsement creep.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Configurable Session Timing** - Users can configure and run accurate timed or unlimited breathing sessions. (completed 2026-05-09)
- [x] **Phase 2: Visual Guide & Accessible Responsive Interface** - Users can comfortably follow the breathing guide through a polished, accessible UI on mobile and desktop. (completed 2026-05-09)
- [ ] **Phase 3: Optional Generated Audio Cues** - Users can add or mute soft phase-aligned audio cues without losing visual guidance.
- [ ] **Phase 4: Local Memory & Practice Stats** - Users can keep convenience settings and simple local practice history under their control.
- [ ] **Phase 5: Mobile Hands-Off Resilience** - Users get best-effort screen-awake behavior during running sessions where browsers support it.
- [ ] **Phase 6: Learning & Claim-Safe Positioning** - Users can understand the practice context and reach Forrest Knutson resources without medical claims or implied endorsement.

## Phase Details

### Phase 1: Configurable Session Timing
**Goal**: Users can configure and run accurate timed or unlimited inhale/exhale breathing sessions from the main app screen.
**Depends on**: Nothing (first phase)
**Requirements**: SESS-01, SESS-02, SESS-03, SESS-04, SESS-05, BREA-01, BREA-02, BREA-03
**Success Criteria** (what must be TRUE):
  1. User can choose BPM, inhale/exhale ratio, and timed or unlimited duration using the supported v1 options.
  2. User can start a session from the main app screen and immediately see the active inhale or exhale phase.
  3. User can end/reset a running session without stale session state carrying over.
  4. Timed sessions complete automatically, while unlimited sessions continue until the user ends them.
  5. Inhale and exhale phases alternate continuously from one accurate session clock with no pauses.
**Plans**: 4 plans
Plans:
- [x] 01-01-PLAN.md — Create React/Vite foundation and pure timing domain math.
- [x] 01-02-PLAN.md — Implement session lifecycle rules and engine hook.
- [x] 01-03-PLAN.md — Build main-screen setting steppers and start/end controls.
- [x] 01-04-PLAN.md — Complete running readout, breathing shape, extension, completion, and timed-end confirmation.
**UI hint**: yes

### Phase 2: Visual Guide & Accessible Responsive Interface
**Goal**: Users can comfortably follow the breathing guide through polished synchronized visuals, readable phase labels, and accessible controls across mobile and desktop browsers.
**Depends on**: Phase 1
**Requirements**: GUID-01, GUID-02, GUID-03, GUID-04, MOBL-01
**Success Criteria** (what must be TRUE):
  1. User can follow a polished breathing animation that stays synchronized with the current inhale/exhale phase.
  2. User can always read the current phase as text, independent of color or animation.
  3. User with reduced-motion preference sees a calmer session display that still communicates phase changes.
  4. User can operate settings and session controls with labels, keyboard access, visible focus states, and non-color-only cues.
  5. User can use the app comfortably on mobile and desktop layouts without the practice flow breaking.
**Plans**: 4 plans
Plans:
- [x] 02-01-PLAN.md — Polyfill HTMLDialogElement + matchMedia in vitest.setup.ts and add the usePrefersReducedMotion hook (test infrastructure for Plans 02 and 04).
- [x] 02-02-PLAN.md — Refine BreathingShape into the polished orb (stacked gradient layers, two static reference rings, in-orb large phase label, fluid clamp() sizing, reduced-motion fixed-mid-scale branch) and extend theme.css with Phase 2 tokens.
- [x] 02-03-PLAN.md — Hide BPM/Ratio steppers while running, drop the redundant in-readout phase label, upgrade focus rings to focus-visible on theme accent, add motion-reduce guards, lock 44x44 hit-area floors.
- [x] 02-04-PLAN.md — Replace window.confirm with a native <dialog>-based EndSessionDialog (focus on Keep going, Esc cancels, backdrop closes, timing keeps running), wire App.tsx state machine, migrate Phase 1 confirm-spy tests.
**UI hint**: yes

### Phase 3: Optional Generated Audio Cues
**Goal**: Users can optionally follow soft generated inhale/exhale audio cues that align with the visual session guide.
**Depends on**: Phase 2
**Requirements**: AUDI-01, AUDI-02
**Success Criteria** (what must be TRUE):
  1. User can hear soft generated gong/bowl-like cues when inhale and exhale phases change.
  2. Audio cues align with the active breathing phase rather than drifting away from the visual guide.
  3. User can mute audio cues and continue the full session using visual guidance alone.
**Plans**: 5 plans
Plans:
- [x] 03-01-PLAN.md — Test infrastructure (FakeAudioContext polyfill) + pure cueSynth + lookaheadScheduler modules with unit tests.
- [x] 03-02-PLAN.md — audioEngine service (AC lifecycle + mute fade + lead-in scheduling) + useAudioCues React hook with hook tests.
- [x] 03-03-PLAN.md — MuteToggle component (D-05/D-06/D-10) + SessionControls inline composition + BreathingShape leadInDigit prop (D-14).
- [x] 03-04-PLAN.md — App.tsx integration (appPhase state machine, lead-in orchestration, dual-anchor audio scheduling, four end paths) + App.audio.test.tsx integration tests.
- [x] 03-05-PLAN.md — Manual UAT checkpoints (bowl-cue tuning, mute-fade smoothness, tick distinctness, AC-failure path, iOS real-device behavior, full acceptance sign-off).
**UI hint**: yes

### Phase 4: Local Memory & Practice Stats
**Goal**: Users can return to convenient saved settings and see simple local practice context while retaining control over stored data.
**Depends on**: Phase 3
**Requirements**: LOCL-01, LOCL-02, LOCL-03
**Success Criteria** (what must be TRUE):
  1. User's last BPM, ratio, duration, and audio preference are restored locally between visits.
  2. User can see basic local practice stats: total sessions, total minutes, and last session.
  3. User can reset locally saved settings and stats when they want a clean slate.
  4. Practice stats remain local and descriptive, without account creation or health-outcome claims.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Mobile Hands-Off Resilience
**Goal**: Users can start a mobile-friendly hands-off session that attempts to keep the screen awake where browser support allows.
**Depends on**: Phase 4
**Requirements**: MOBL-02
**Success Criteria** (what must be TRUE):
  1. User can start a running session that requests Wake Lock on supported browsers.
  2. During supported running sessions, the screen is kept awake without additional user interaction.
  3. Ending, resetting, or completing a session releases hands-off screen-awake behavior cleanly.
**Plans**: TBD
**UI hint**: yes

### Phase 6: Learning & Claim-Safe Positioning
**Goal**: Users can understand the app's HRV/resonance-style breathing context and reach Forrest Knutson learning resources through calm, claim-safe in-app content.
**Depends on**: Phase 5
**Requirements**: LEARN-01, LEARN-02, LEARN-03, LEARN-04
**Success Criteria** (what must be TRUE):
  1. User can access a prominent link to Forrest Knutson's YouTube channel.
  2. User can access curated links to selected HRV breathing explanation videos.
  3. User can read a brief in-app explanation of resonance-style breathing and the app's timing rules.
  4. User sees copy that frames the app as guided breathing practice, not medical advice or diagnosis.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Configurable Session Timing | 4/4 | Complete    | 2026-05-09 |
| 2. Visual Guide & Accessible Responsive Interface | 4/4 | Complete    | 2026-05-09 |
| 3. Optional Generated Audio Cues | 0/5 | Not started | - |
| 4. Local Memory & Practice Stats | 0/TBD | Not started | - |
| 5. Mobile Hands-Off Resilience | 0/TBD | Not started | - |
| 6. Learning & Claim-Safe Positioning | 0/TBD | Not started | - |
