# Phase 31: Navi Kriya Engine & Session - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 31-navi-kriya-engine-session
**Areas discussed:** Counting screen visuals, Cue sound design, OM tempo values, Start & end session flow

---

## Counting screen visuals

### Main visual on the NK session screen

| Option | Description | Selected |
|--------|-------------|----------|
| Chosen variant shape, pulsing | Reuse the user's selected variant (Orb/Square/Diamond); it pulses once per OM instead of breathing. | ✓ |
| Dedicated counting visual | A distinct NK-only visual; the variant does not apply to Navi Kriya. | |
| Shape as quiet backdrop | Reuse the shape near-static; the large count is the focal point. | |

### Where the OM count sits

| Option | Description | Selected |
|--------|-------------|----------|
| Count inside the shape | Count number centered inside the shape — the In/Out glyph slot. | ✓ |
| Count below the shape | Shape stays clean; count is a separate readout below. | |
| Count inside, target as ratio | Count shown as 'current / target' inside the shape. | |

### Phase label / round / target placement

| Option | Description | Selected |
|--------|-------------|----------|
| Readout strip below shape | Compact strip below the shape: phase + round + target. | ✓ |
| Phase inside, rest below | Phase label inside the shape; round + target below. | |
| Phase + round only, no target | Just 'FRONT · Round 2 of 3' below the shape; no target shown. | |

### Per-OM pulse intensity

| Option | Description | Selected |
|--------|-------------|----------|
| Gentle scale pulse only | Soft scale-up-and-settle each OM; no extra elements. | ✓ |
| Pop + expanding ring | Scale pop plus a fading expanding ring (spike design). | |
| You decide | Planner matches resonant's motion vocabulary. | |

**User's choice:** Pulsing variant shape, count inside the shape, readout strip below, gentle scale pulse only.
**Notes:** Reduced-motion gets a static fallback per Phase 2 D-05/06/07 regardless.

---

## Cue sound design

### Relationship to the shared timbre choice

| Option | Description | Selected |
|--------|-------------|----------|
| All four use chosen timbre | Front/back markers, per-OM tick, end chord all render through the selected timbre. | ✓ |
| Markers fixed, tick uses timbre | Markers timbre-independent; only the tick follows the timbre. | |
| All four fixed | A fixed NK-only sound set; timbre picker applies only to resonant. | |

### Front vs. back marker distinction

| Option | Description | Selected |
|--------|-------------|----------|
| Ascending vs descending | Front = rising two-tone, back = falling two-tone (spike-003). | ✓ |
| Single vs double tone | Distinguished by note count rather than pitch direction. | |
| High vs low pitch | Front = higher single tone, back = lower single tone. | |

### Per-OM tick presence

| Option | Description | Selected |
|--------|-------------|----------|
| Soft, barely-there | Very quiet short tick; anchors rhythm without pulling focus. | ✓ |
| Clearly audible, gentle | A clearly present but gentle metronome. | |
| You decide | Planner tunes the tick level against the markers. | |

### End-of-practice cue

| Option | Description | Selected |
|--------|-------------|----------|
| Resolved chord | A low, settled multi-note chord that rings out. | ✓ |
| Single long tone | One sustained low tone that fades. | |
| You decide | Planner shapes a final, distinct end cue. | |

**User's choice:** All four cues through the chosen timbre; ascending/descending two-tone markers; soft barely-there tick; resolved low chord for the end cue.

---

## OM tempo values

### Tempo anchoring

| Option | Description | Selected |
|--------|-------------|----------|
| Medium = Forrest's real pace | Medium ≈ 2.16 s/OM — the default tempo is Forrest's actual follow-along pace. | ✓ |
| Use spike seed as-is | Ship fast 1.75 / medium 2.5 / slow 4 s. | |
| I'll give exact numbers | User provides the three values directly. | |

### Fast / slow spread

| Option | Description | Selected |
|--------|-------------|----------|
| Modest spread | fast ~1.75 / medium ~2.16 / slow ~3.0 s. | ✓ |
| Wide spread | fast ~1.5 / medium ~2.16 / slow ~3.5 s. | |
| You decide | Planner picks fast/slow around the ~2.16 s medium. | |

**User's choice:** Medium anchored to Forrest's measured ~2.16 s/OM pace; modest spread (fast ~1.75 / slow ~3.0 s); values kept in one adjustable constant, finalized in the build.

---

## Start & end session flow

### Start → first OM

| Option | Description | Selected |
|--------|-------------|----------|
| Brief settle, then marker | A few quiet seconds to set the phone down, then front marker → first OM. | ✓ |
| Front marker only | Front marker plays immediately on Start; no extra delay. | |
| 3,2,1 countdown | Reuse resonant's visible lead-in countdown. | |

### Natural completion screen

| Option | Description | Selected |
|--------|-------------|----------|
| Quiet completion state | The counting screen settles into a calm in-place 'complete' state. | |
| End dialog like resonant | Reuse the resonant EndSessionDialog pattern with a short summary. | ✓ |
| Silent return to start | End chord plays, screen returns to idle; stats recorded silently. | |

### Early-end stats recording

| Option | Description | Selected |
|--------|-------------|----------|
| Record what was done | Early end increments session count, adds completed rounds + elapsed minutes. | ✓ |
| Only completed sessions count | Stats record nothing for an early-ended session. | |
| Record rounds, not session count | Minutes + rounds added; session count only if ≥1 full round. | |

### Estimated duration placement

| Option | Description | Selected |
|--------|-------------|----------|
| By the controls | Live estimate next to the NK settings controls. | ✓ |
| On the start screen | A static 'about N minutes' near the Start button. | |
| Both places | Live by the controls plus a final estimate near Start. | |

**User's choice:** Brief quiet settle before the front marker (no 3,2,1 countdown); resonant-style end dialog on natural completion; early-ended sessions record what was done; live duration estimate shown next to the NK settings controls.

---

## Claude's Discretion

- Exact settle-delay length (~3–5 s starting point) and `LEAD_MS` finalization (~700 ms seed).
- Whether Navi Kriya gets its own engine hook or shares structure with `useSessionEngine`.
- Paused-state visuals (count freeze + calm paused indicator); reuse `SessionControls` posture.
- Exact cue synthesis parameters within the chosen timbre.
- Wake lock during a Navi Kriya session — reuse the existing `useWakeLock` enhancement.

## Deferred Ideas

- Per-practice + shared Learn content and PT-BR localization of all new copy — Phase 32 (LEARN-02/03, I18N-08).
- A third / fourth practice — Future requirement PRACTICE-F1.
- v1.x carry-forward tech debt — remains deferred (STATE.md `## Deferred Items`).
