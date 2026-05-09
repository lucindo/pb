# Phase 3: Optional Generated Audio Cues - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 03-optional-generated-audio-cues
**Areas discussed:** Cue envelope & sound design, Mute toggle placement & default, AudioContext init, Sync model & first-cycle behavior

---

## Cue Envelope & Sound Design

### Q1 — Cue envelope shape

| Option | Description | Selected |
|--------|-------------|----------|
| Strike + natural decay | Single soft mallet strike at the phase-change boundary, exponential bowl-like decay across the phase. | ✓ |
| Slow swell + slow fade | Cue fades IN across first portion of phase, holds, fades OUT before next phase. | |
| Strike + sustained tail | Sharp attack at boundary, then sustained quiet tail through phase before next strike. | |

**User's choice:** Strike + natural decay
**Notes:** Bowl/gong-authentic; tail tapers naturally into next strike. Realizes the PROJECT.md "fades gently across the phase" wording via natural decay rather than a separate fade-in.

### Q2 — In vs Out cue distinction

| Option | Description | Selected |
|--------|-------------|----------|
| Two distinct pitches | Higher pitched bowl on In, lower on Out (or vice versa). | ✓ |
| Same pitch, different timbre | Same fundamental, slightly different harmonic content. | |
| Identical cue both phases | One sound at every boundary; user reads phase from orb. | |

**User's choice:** Two distinct pitches
**Notes:** Clearest auditory phase signal without listening to envelope.

### Q3 — Pitch direction

| Option | Description | Selected |
|--------|-------------|----------|
| Higher = In, lower = Out | Inhale rising pitch matches body lifting/expanding. | ✓ |
| Lower = In, higher = Out | Inverse convention. | |
| You decide | Defer to research/planning. | |

**User's choice:** Higher = In, lower = Out

### Q4 — Continue or further locks?

| Option | Description | Selected |
|--------|-------------|----------|
| Move on to mute toggle | Sound design covered; specific frequencies/decay left to planner. | ✓ |
| Lock specific pitch references | Pin specific notes/Hz before moving on. | |
| Lock cue duration relative to phase | Decide overlap vs no-overlap with next phase. | |

**User's choice:** Move on to mute toggle

---

## Mute Toggle Placement & Default

### Q1 — Where does the mute control live?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline near Start/End button | Speaker icon next to or below primary action; always visible. | ✓ |
| In settings panel above start | Lives with BPM/ratio/duration; hidden during running per Phase 2 D-16. | |
| In settings AND visible while running | Lives in settings idle; small icon stays visible during running. | |
| Floating corner icon | Speaker icon fixed in corner of practice surface. | |

**User's choice:** Inline near Start/End button

### Q2 — Default state on first visit

| Option | Description | Selected |
|--------|-------------|----------|
| OFF by default | First-time user opts in by tapping unmute. Safest for shared/quiet contexts. | |
| ON by default | First-time user gets full guided experience including audio. | ✓ |
| OFF, prompt once | Starts muted with one-time hint. | |

**User's choice:** ON by default
**Notes:** Audio is part of the core guided experience this phase delivers.

### Q3 — Mute icon visual treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Speaker on / speaker-muted icon | Standard speaker with diagonal slash when muted. | ✓ |
| Bell on / bell-off icon | Bell icon flips between filled / struck-through. | |
| Text toggle "Sound: on/off" | Text-only button. | |

**User's choice:** Speaker on / speaker-muted icon

### Q4 — Continue or further locks?

| Option | Description | Selected |
|--------|-------------|----------|
| Move on to AudioContext init | Toggle covered; sizing/aria details to planner. | ✓ |
| Lock toggle behavior during running | Decide silent vs fade on mute mid-session. | |
| Lock label copy | Pin exact aria-label / tooltip strings. | |

**User's choice:** Move on to AudioContext init
**Notes:** Mute fade locked under sync-model area later (D-08 in CONTEXT.md).

---

## AudioContext Init

### Q1 — When is AudioContext created/resumed?

| Option | Description | Selected |
|--------|-------------|----------|
| On Start session click only | AC created/resumed inside Start handler — always a user gesture. | ✓ |
| On Start OR first unmute | AC initializes whichever user gesture comes first. | |
| Lazy on first cue scheduled | Risks autoplay block; simpler in code, riskier behavior. | |

**User's choice:** On Start session click only

### Q2 — If AudioContext init fails / is blocked

| Option | Description | Selected |
|--------|-------------|----------|
| Silent fallback | Visuals only; mute icon stays in muted state; no error. | |
| Silent + icon disabled | Visuals only; icon shows disabled/struck-through state with tooltip. | ✓ |
| Inline notice | Small inline message ("Audio unavailable in this browser"). | |

**User's choice:** Silent + icon disabled

### Q3 — Context lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Close on session end | AC closed in endSession; next Start re-creates. | ✓ |
| Suspend on end, resume on next start | AC reused across sessions; suspended when idle. | |
| Created once, lives until tab close | Single AC for page lifetime. | |

**User's choice:** Close on session end

### Q4 — Continue or further locks?

| Option | Description | Selected |
|--------|-------------|----------|
| Move on to sync model | Init/failure/lifecycle covered; AC options to planner. | ✓ |
| Lock background-tab behavior | Decide visibilitychange handling. | |
| Lock iOS/Safari quirks handling | Discuss webkit-prefixed AC, silent-mode switch. | |

**User's choice:** Move on to sync model
**Notes:** Background-tab + iOS/Safari quirks captured in CONTEXT.md `<deferred>` and Claude's Discretion respectively.

---

## Sync Model & First-Cycle Behavior

### Q1 — How are cues scheduled vs the visual clock?

| Option | Description | Selected |
|--------|-------------|----------|
| Schedule ahead on AudioContext clock | Pre-schedule all boundaries; reschedule on extend. | |
| Trigger reactively on phase change | useEffect on SessionFrame.phase; inherits rAF jitter. | |
| Hybrid: schedule next cue from each tick | 1-cue lookahead; sample-accurate next; handles extend/end. | ✓ |

**User's choice:** Hybrid: schedule next cue from each tick

### Q2 — First cue timing

| Option | Description | Selected |
|--------|-------------|----------|
| At t=0 (session start) | First In strike fires immediately on Start. | |
| At first phase transition (In→Out) | No cue at t=0; first sound is Out strike. | |
| Short pre-roll | Brief silence before first cue. | ✓ |

**User's choice:** Short pre-roll
**Notes:** Triggered the SESS-05 invariant check — pre-roll must sit pre-session.

### Q3 — Pre-roll mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| Visual runs; audio joins at first In→Out | Visual at t=0; audio silent through first In, joins at first boundary. | |
| Visual runs; short fixed silent window | Visual at t=0; audio silent for fixed window. | |
| Visual + audio both wait for pre-roll | Lead-in before session t=0; SESS-05 preserved (lead-in is pre-session). | ✓ |

**User's choice:** Visual + audio both wait for pre-roll
**Notes:** Required reframing — lead-in is pre-session, not within session, so SESS-05 (one accurate continuous in-session clock with no pauses) is preserved.

### Q4 — Lead-in form

| Option | Description | Selected |
|--------|-------------|----------|
| Silent 3-2-1 countdown numerals | Numerals only, no audio during countdown. | |
| Countdown with soft tick per number | 3-2-1 with quiet tick per number, distinct from gong. | ✓ |
| Brief settling pause, no countdown | ~2s of stillness before session begins. | |
| You decide exact lead-in | Lock the rule; planner picks duration/treatment. | |

**User's choice:** Countdown with soft tick per number

### Q5 — Mid-session unmute behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Wait for next phase boundary | Queues audio to next In→Out / Out→In. | |
| Strike immediately at unmute | Fires cue right away even mid-phase. | |
| Wait for next boundary; soft fade on mute | Wait + fade-out tail on mute. | ✓ |

**User's choice:** Wait for next boundary; soft fade on mute

### Q6 — Continue or further locks?

| Option | Description | Selected |
|--------|-------------|----------|
| Move on — write CONTEXT.md | All 4 areas covered. | |
| Lock countdown copy | Pin exact numerals + tick relationship. | ✓ |
| Lock end-of-session audio behavior | Closing bell or natural fade. | |

**User's choice:** Lock countdown copy

### Q7 — Countdown numerals copy

| Option | Description | Selected |
|--------|-------------|----------|
| 3 / 2 / 1 (Arabic numerals) | Large Arabic numerals in orb area. | ✓ |
| 3 / 2 / 1 then "Begin" | Numerals + transition word at t=0. | |
| Three / Two / One | Spelled-out numerals. | |

**User's choice:** 3 / 2 / 1 (Arabic numerals)

### Q8 — Countdown tick timbre

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct from gongs | Soft wood-block / muted tap, clearly NOT bowl. | ✓ |
| Quieter version of In gong | Same bowl, attenuated. | |
| You decide | Lock distinguishability only. | |

**User's choice:** Distinct from gongs

### Q9 — Anything else before writing?

| Option | Description | Selected |
|--------|-------------|----------|
| Write CONTEXT.md — done | Ready for plan-phase. | |
| Lock end-of-session audio (closing bell?) | Final cue or natural fade. | ✓ |
| Lock countdown skip / restart behavior | End during countdown handling. | |

**User's choice:** Lock end-of-session audio

### Q10 — End-of-session audio

| Option | Description | Selected |
|--------|-------------|----------|
| Final closing bell | Distinct closing cue on timer-driven completion. | |
| Last phase cue fades naturally, then silence | No special end cue; natural decay then silence. | ✓ |
| Final closing bell on timed AND manual end | Closing bell regardless of end path. | |
| You decide | Lock there IS an end cue on timed; planner picks. | |

**User's choice:** Last phase cue fades naturally, then silence
**Notes:** Keeps experience calm; visual `Session complete` is the clear end signal.

### Q11 — Ready to write?

| Option | Description | Selected |
|--------|-------------|----------|
| Write it | All locked. | ✓ |
| One more thing | Add another lock. | |

**User's choice:** Write it

---

## Claude's Discretion

- Specific In/Out frequencies (Hz / notes).
- Decay curve, attack envelope, harmonic content of bowl tone.
- Specific tick timbre — only the distinguishability from bowl is locked.
- Mute fade-out duration (target: short, ~100–300 ms band).
- AudioContext options (`sampleRate`, `latencyHint`).
- iOS/Safari webkit-prefixed AC and silent-switch handling.
- Background-tab visibilitychange behavior (must not drift session timing).
- End session pressed during lead-in — sensible default (likely cancel to idle).

## Deferred Ideas

- Volume control (v2 `AUDI-03`).
- Audio preference persistence (Phase 4 `LOCL-01`).
- Alternate sound packs / timbres (v2 `CUST-01`).
- Closing-bell at session end (rejected for v1; may revisit under CUST-01).
- Longer countdowns / settling pause / spelled-out numerals.
- Audio coupled to `prefers-reduced-motion` (explicitly NOT linked).
</content>
</invoke>
