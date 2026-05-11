# Phase 3: Optional Generated Audio Cues - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 adds an optional Web Audio cue layer that consumes the existing `SessionFrame` from `useSessionEngine` and plays soft, generated bowl/gong-like tones aligned to inhale/exhale phase boundaries. Audio is mutable via an inline control next to the primary Start/End button and ships ON by default for first visits. Phase 3 also introduces a brief 3-2-1 pre-session lead-in (numerals shown in the orb area, with a soft tick per number distinct from the In/Out gongs) so audio + visual settle together before session t=0.

The phase boundary is fixed by `.planning/ROADMAP.md`. Out of scope for Phase 3: persistence of the audio preference (Phase 4 / `LOCL-01`), volume control (v2 `AUDI-03`), multiple sound packs / alternate timbres (v2 `CUST-01`), Wake Lock (Phase 5), learning content (Phase 6), pause/resume, any change to the Phase 1 timing math or lifecycle, and any change to Phase 2 visual/orb behavior beyond the new countdown numerals shown in the orb area pre-session. Audio MUST consume `SessionFrame` (no parallel timing source) and the visual session MUST remain fully usable when muted, when AudioContext init fails, or when audio is unavailable in the browser.

</domain>

<decisions>
## Implementation Decisions

### Sound Design
- **D-01:** Each phase boundary triggers a single soft mallet-strike cue with natural exponential bowl-like decay across the phase. No sustained drone, no fade-in swell — strike-and-decay only.
- **D-02:** In and Out cues use two distinct pitches (not just two timbres, not the same cue both phases).
- **D-03:** Pitch direction is locked: In = higher pitch, Out = lower pitch.
- **D-04:** Cues are generated entirely in-browser via Web Audio API. No bundled audio files, no external/hosted audio. Reaffirms `PROJECT.md` constraint.

### Mute Toggle
- **D-05:** The mute control lives inline next to the primary Start/End button, always visible (idle and running). It does NOT live in the settings panel and does NOT float in a corner.
- **D-06:** The icon is a standard speaker (filled = sound on) / speaker-with-slash (muted) pair. Bell metaphor and text-only toggle were considered and rejected for v1.
- **D-07:** First-visit default is audio ON. User mutes if unwanted.
- **D-08:** Mute toggle behavior:
  - Mute mid-cue: applies a soft fade-out tail to the active cue (not an abrupt cut).
  - Unmute mid-phase: waits for the next In/Out boundary to fire the next cue. No mid-phase strike on unmute.

### AudioContext Init & Failure
- **D-09:** AudioContext is created (or resumed) inside the Start session click handler — always a user-gesture path. Mid-session unmute uses the already-running context. AC is NOT created on first unmute alone or lazily on first scheduled cue.
- **D-10:** If AudioContext creation fails or the browser blocks audio, the session runs visuals-only and the mute icon shows a disabled (struck-through) state. Tooltip / aria description explains audio is unavailable. No inline notice, no error toast.
- **D-11:** AudioContext is closed on session end (manual end, completion, or modal-confirm end). Next Start re-creates a fresh context.

### Sync Model & Lead-In
- **D-12:** Cues are scheduled on the AudioContext clock using a 1-cue lookahead. On each phase change (and on session start), the next cue is scheduled at its exact `audioCtx.currentTime + Δ` derived from the breathing plan. Sample-accurate next cue, simpler than full pre-schedule, handles `extendTimedSession` and end naturally.
- **D-13:** Phase 3 introduces a 3-2-1 pre-session lead-in: pressing Start triggers a brief lead-in BEFORE the session timing clock starts at t=0. Phase 1 SESS-05 (one accurate continuous in-session clock with no pauses) is preserved — the lead-in is pre-session, not within the session.
- **D-14:** Lead-in copy is locked: large Arabic numerals `3`, `2`, `1` shown one per second in the orb area (where the In/Out phase label normally appears). At t=0, numerals are replaced by the first In phase label and the first In gong fires. No "Begin" word.
- **D-15:** Each countdown numeral is accompanied by a soft tick that is clearly distinguishable from the In/Out bowl cues (e.g., wood-block / muted tap rather than a quieter version of the bowl tone). The tick is part of the audio path and respects the mute toggle.
- **D-16:** End-of-session audio: when a timed session reaches `isComplete`, the last In/Out cue decays naturally and the session falls to silence as the readout switches to `Session complete`. There is NO distinct closing-bell cue. Manual End session also produces no special closing cue.

### Claude's Discretion
The following technical choices are explicitly left to research/planning:
- Specific In and Out frequencies (e.g., A4/A3, exact Hz values).
- Decay curve shape and length, attack envelope, harmonic content / partials of the bowl tone.
- Specific tick timbre (wood-block vs muted tap vs short noise burst) — the lock is only that it is clearly distinct from the bowl cues.
- Mute fade-out duration (target band: short — order of 100–300 ms — but exact value not locked).
- AudioContext options (`sampleRate`, `latencyHint`).
- iOS/Safari quirks handling (webkit-prefixed AC, silent-switch behavior) — handle as needed within D-09/D-10 framing.
- Background-tab behavior (visibilitychange) — not discussed; planner picks consistent with SESS-05 (visual timing keeps running) and a calming experience (e.g., audio may continue or suspend, but session timing must not drift).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope And Constraints
- `.planning/PROJECT.md` — Defines audio direction (generated tones, soft Tibetan gong/bowl, fades across each phase, sound is optional, mutable). Forbids bundled/external audio assets.
- `.planning/ROADMAP.md` — Defines Phase 3 goal, fixed boundary, requirements mapping (`AUDI-01`, `AUDI-02`), and success criteria. Confirms Phase 4 owns persistence and Phase 5 owns Wake Lock.

### Requirements
- `.planning/REQUIREMENTS.md` — Defines `AUDI-01` (generated soft gong/bowl-like cues aligned to In/Out phase changes) and `AUDI-02` (mute support; visual guide must work alone). Also defines deferred items: v2 `AUDI-03` (volume), v2 `CUST-01` (alternate audio timbres), Phase 4 `LOCL-01` (audio preference persistence).

### Carrying Forward From Prior Phases
- `.planning/phases/01-configurable-session-timing/01-CONTEXT.md` — Locked timing/copy decisions Phase 3 must respect: D-09 phase + clock readout, D-11 `End session` button copy, D-14 timed-only confirmation, D-16 `In` / `Out` phase labels, D-17 `Open-ended` duration, and the SESS-05 single-continuous-in-session-clock invariant the lead-in (D-13) is framed against.
- `.planning/phases/02-visual-guide-accessible-responsive-interface/02-CONTEXT.md` — Locks the orb visual contract (D-01 through D-08), reduced-motion behavior (D-05/D-06/D-07), and the End-session modal (D-10 through D-14). Phase 3's pre-session countdown reuses the in-orb large display position established by Phase 2 D-03 (`In`/`Out` label rendered centered inside the orb).

### Web Audio API
- MDN `Web Audio API` overview — primary reference for `AudioContext`, `OscillatorNode`, `GainNode`, `BiquadFilterNode`, scheduled `start(when)` calls, and autoplay-policy gesture handling. (External; planner pulls specific URLs during research.)
- MDN `prefers-reduced-motion` — already in use in Phase 2; Phase 3 audio is INDEPENDENT of motion preference (no automatic mute under reduced motion).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useSessionEngine.ts` and the `SessionFrame` shape from `src/domain/sessionMath.ts` already provide `phase`, `phaseLabel`, `phaseProgress`, `cycleIndex`, `isComplete`, and the running clock. Phase 3 audio MUST consume this frame; no parallel timer.
- `src/domain/breathingPlan.ts` exposes `cycleMs`, `inhaleMs`, `exhaleMs`, `totalMs` — the data needed to compute the next phase boundary in `audioCtx.currentTime` for the 1-cue lookahead scheduler (D-12).
- `src/components/SessionControls.tsx` is the inline composition surface for the new mute icon button — inline-near-Start/End placement (D-05) means the mute control is a sibling of the existing primary action, sharing the same row/strip.
- `src/components/BreathingShape.tsx` renders the orb and the in-orb large phase label (Phase 2 D-03). The 3-2-1 numerals (D-14) reuse this position by swapping the label for `3` / `2` / `1` during pre-roll. The orb itself stays at neutral state (no scaling) during the lead-in.
- `src/app/App.tsx` is the composition point that wires session state, modal state, and now the lead-in state machine + audio engine lifecycle.
- `src/styles/theme.css` exposes existing tokens; no new theme tokens are anticipated for audio (audio is invisible) beyond a possible muted/disabled state for the speaker icon.

### Established Patterns
- **Single-frame data flow:** every visible session element derives from `SessionFrame`. Audio scheduling is the first non-visual consumer — it must hook into the same frame transitions (or compute boundaries from the same plan) without spawning parallel intervals.
- **Hooks for cross-cutting concerns:** Phase 2 introduced `usePrefersReducedMotion`. A `useAudioCues` hook (or similarly scoped hook) is the natural shape for the AudioContext lifecycle + scheduler, kept testable with a stubbed AC.
- **Test infrastructure:** `vitest.setup.ts` already polyfills `HTMLDialogElement` and `matchMedia`. Phase 3 will likely add an AudioContext stub; tests should follow the Phase 2 pattern of asserting behavior through hook output / accessible names rather than implementation.
- **Tailwind v4 + theme tokens:** styling baseline is unchanged. Mute icon uses theme accent + a disabled state for the AudioContext-failed branch (D-10).
- **44×44 hit-area floor (Phase 2 D-17):** the new mute icon button must meet this floor, like every other tappable control.
- **`motion-reduce:` independence:** audio cues are NOT bound to `prefers-reduced-motion`. Reduced-motion users still get audio if they want it, and motion-OK users still get to mute audio.

### Integration Points
- `src/app/App.tsx` — adds (a) lead-in state (`'lead-in' | 'running' | …`) before transitioning into the existing `useSessionEngine.start()`, (b) audio engine instantiation/teardown coordinated with session start/end, (c) mute state + handler passed to the new toggle button.
- `src/components/SessionControls.tsx` — extends to host the inline mute toggle alongside the primary Start/End action (D-05).
- `src/components/BreathingShape.tsx` — accepts a pre-roll display mode to render `3` / `2` / `1` in place of the In/Out label during lead-in (D-14). The orb itself stays neutral during pre-roll.
- New: `src/audio/` (or similar) — encapsulates AudioContext lifecycle, oscillator/gain construction, the 1-cue lookahead scheduler, and the mute fade. Specific module shape is planner discretion.

</code_context>

<specifics>
## Specific Ideas

- The user explicitly wants a strike-and-decay envelope (D-01) — like a struck Tibetan bowl decaying naturally — rather than a slow swell or sustained pad. The "fades gently across the phase" wording in PROJECT.md is realized by the natural decay tail of the strike, not a separate fade-in.
- The user explicitly wants two distinct pitches (D-02) with In = higher and Out = lower (D-03). Reason: clearest auditory phase signal even without watching the orb; matches breath-rising / breath-releasing intuition.
- The user explicitly wants audio ON by default on first visit (D-07). Reason: audio is part of the core guided experience this phase delivers; users mute if unwanted rather than discovering via opt-in.
- The user explicitly chose a 3-2-1 lead-in WITH audio (D-13/D-14/D-15) — a silent visual-only countdown was rejected. The tick must be DISTINCT from the In/Out gong (D-15) so listeners do not mistake the countdown for an early phase cue.
- The user explicitly chose NO closing-bell cue (D-16) — the last phase decays naturally and the session falls to silence. Reason: keeps the experience calm and avoids over-ceremony; the visual `Session complete` message is the clear end signal.
- Mute fade-out (D-08) is locked because the user explicitly does not want abrupt audio cuts when toggling mute mid-cue.

</specifics>

<deferred>
## Deferred Ideas

- **Volume control / cue loudness slider** — tracked as v2 `AUDI-03` in `REQUIREMENTS.md`. Phase 3 ships at one well-tuned default volume.
- **Audio preference persistence across visits** — owned by Phase 4 (`LOCL-01`). Phase 3 keeps the mute state in memory only; refresh resets to default ON.
- **Alternate sound packs / timbres / pitches** — tracked as v2 `CUST-01`. Phase 3 ships one bowl/gong default.
- **Closing-bell at session end** — explicitly rejected for v1 in this phase (D-16). May be revisited later as part of CUST-01 or an end-of-session experience iteration.
- **Lead-in length / "Begin" word / 1-2 second settling pause** — Phase 3 ships locked 3-2-1 with Arabic numerals (D-14). Alternative lead-ins (longer countdown, settling pause, spelled-out numerals) are not in scope.
- **Audio cues respecting `prefers-reduced-motion`** — explicitly NOT linked. Reduced-motion users still get full audio. A future accessibility iteration could add a separate `prefers-reduced-data` or in-app audio-defaults preference if user feedback warrants it.
- **End-session button pressed during lead-in** — not deeply discussed; planner should choose a sensible default (e.g., cancel back to idle, settings restored). Captured here so it is not lost.
- **Background-tab audio behavior** (visibilitychange) — not deeply discussed; planner picks consistent with SESS-05 (timing must not drift) and a calming experience.

</deferred>

---

*Phase: 03-optional-generated-audio-cues*
*Context gathered: 2026-05-09*
</content>
</invoke>