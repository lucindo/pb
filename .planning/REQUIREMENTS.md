# Requirements: HRV Breathing WebApp — v1.2 BPM Stretch

**Defined:** 2026-05-15
**Core Value:** Users can start a hands-off HRV breathing session and comfortably follow accurate, uninterrupted inhale/exhale guidance through synchronized visuals and optional sound.

**Milestone goal:** Ship the BPM stretch session pattern (warm-up → sub-perceptual ramp → cool-down) on the existing one-clock SessionFrame, and close two small UX gaps surfaced during v1.1.

**Phase ordering:** Smallest-blast-radius first — 999.2 lead-in button polish → 999.1 per-theme favicon → PATT-02 BPM stretch. Continues v1.1 phase numbering (starts at Phase 20).

## v1.2 Requirements

Requirements for v1.2 release. Each maps to roadmap phases.

### Session Start Polish

- [x] **LEAD-01**: User cannot click Start while the lead-in countdown is in flight; the button is disabled and visually reflects the in-flight state (no double-start).

### Favicon

- [ ] **FAVI-01**: User has a per-palette favicon variant for each of the 5 themes (Light, Dark, Moss, Slate, Dusk).
- [ ] **FAVI-02**: User's favicon swaps when the active theme changes via SettingsDialog (same-tab + cross-tab).
- [ ] **FAVI-03**: User's persisted-theme favicon is applied on initial page load (no flash of the default favicon).

### BPM Stretch

- [ ] **STRETCH-01**: User can choose a BPM stretch session mode from the session settings surface.
- [ ] **STRETCH-02**: User can pick `initialBpm` and `targetBpm` from the existing BPM grid (1–7 in 0.5 increments).
- [ ] **STRETCH-03**: User can pick `holdInitialSeconds` (warm-up at initialBpm) and `holdTargetSeconds` (cool-down at targetBpm).
- [ ] **STRETCH-04**: User runs a stretch session whose BPM walks from initialBpm → targetBpm in sub-perceptual steps strictly < 0.5 BPM along the existing one-clock SessionFrame.
- [ ] **STRETCH-05**: User can run a stretch session whose total duration is `hold initial + ramp + hold target`, or open-ended at the target hold.
- [ ] **STRETCH-06**: User sees BPM stretch mode disabled when total duration is below the minimum gate that makes the ramp meaningful.
- [ ] **STRETCH-07**: User's stretch settings persist across reloads via the localStorage envelope (refuse-downgrade write, forward-compat read).
- [ ] **STRETCH-08**: User hears phase-aligned audio cues across the ramp — dual-anchor scheduling (Phase 3 D-13/D-14) holds across BPM changes.

## Future Requirements

Deferred to a later release. Tracked but not in v1.2 roadmap.

### Session

- **SESS-06**: User can pause and resume a running session.

### Breath Settings

- **BREA-04**: User can preview derived inhale and exhale seconds before starting.

### Audio

- **AUDI-03**: User can adjust cue volume.

### Local Memory & Stats

- **LOCL-04**: User can view a short recent-session list.

### Mobile & Responsive Use

- **MOBL-03**: User sees a Wake Lock fallback explanation when unsupported or rejected.

### PWA & Offline

- **PWA-01**: User can install or use the app offline (Web App Manifest + service worker + maskable icons + Apple touch icon). Deferred to v2; revisit after v1.2.

### v1.x Carry-Forwards (Tech Debt)

- PT-BR native-speaker review for 76 `// TODO: native-speaker review` markers (I18N-07).
- iOS Safari mid-page audio recovery after lock/unlock (Override SC1, OS-level audio session loss).
- Firefox Desktop orb scale-animation flicker (Override FF-01, needs CSS keyframes root remedy).
- S2 Android Chrome wake-lock real-device UAT (Phase 5 Plan 04 — physical device unavailable).
- iOS Safari Pitfall 6 — phone-call interrupted state (Phase 3 Open Question 5).
- Inner-ring UX symmetry (Issue B, Phase 5.1) — separate planning candidate.
- Phase 12 `VALIDATION.md` + `SECURITY.md` retroactive close (advisory; threat model inlined in `12-01-PLAN.md`).
- Aesthetic palette refresh follow-ups (deferred behind 16.3 thorough redesign; revisit if new gaps surface).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Accounts, login, cloud sync, profiles, or backend user data | v1 stays local-only, private, low-friction |
| Medical, therapeutic, or diagnostic claims | App presents guided breathing practice, not health advice |
| Biofeedback (camera pulse, HR/HRV sensors) | Out of v1 scope; revisit post-PWA |
| Streaks, leaderboards, gamified pressure | History stays simple and calm |
| Unlicensed Forrest Knutson logos / protected assets | Branding requires permission context |
| Native mobile/watch apps and health platform integrations | Web-first; native adds scope and privacy complexity |
| Pause/resume mid-session (SESS-06) | Out of v1.2; revisit after stretch ships |
| Cue volume control (AUDI-03) | Out of v1.2 — mute is enough for now |
| Per-segment audio cue variants for the stretch ramp | Single cue contract per session; stretch reuses existing dual-anchor scheduling unchanged |
| Mid-session BPM swap (manual or stretch) outside the planned ramp | Stretch ramp is the only sanctioned mid-session BPM change; manual swap remains next-session-only (consistent with v1.1 timbre/variant rule) |
| Visual indicator of current ramp BPM during session | Ramp must remain sub-perceptual; a visible BPM readout would defeat the purpose |
| Custom favicon assets beyond the 5 palette variants | Per-theme variants only; no marketing/PWA icons in v1.2 (those land with PWA-01) |

## Traceability

Which phases cover which requirements. Filled during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LEAD-01 | Phase 20 | Complete |
| FAVI-01 | Phase 21 | Pending |
| FAVI-02 | Phase 21 | Pending |
| FAVI-03 | Phase 21 | Pending |
| STRETCH-01 | Phase 22 | Pending |
| STRETCH-02 | Phase 22 | Pending |
| STRETCH-03 | Phase 22 | Pending |
| STRETCH-04 | Phase 22 | Pending |
| STRETCH-05 | Phase 22 | Pending |
| STRETCH-06 | Phase 22 | Pending |
| STRETCH-07 | Phase 22 | Pending |
| STRETCH-08 | Phase 22 | Pending |
