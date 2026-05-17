# Navi Kriya Practice

The second Forrest Knutson practice — an app-paced OM-counting meditation. Unlike
Resonant Breathing, it is **not breath-synced**; the app keeps the count.

## Requirements

Non-negotiable:

- **App-paced.** The app ticks each OM at the chosen OM-length tempo; the user chants
  along. It is NOT tap-to-count and NOT self-paced.
- **Auto-advance.** The session flows front → back → next round automatically, marking
  each transition with sound. No pause-for-user between phases.
- **Fixed 4:1 front:back ratio.** 1 round = front OMs + back OMs where back = front / 4.
  Default is 100 front / 25 back.
- **Configurable:** number of rounds (default 3) and OM length (fast / medium / slow).
- **Four cue roles:** front marker, back marker, per-OM tick (user-toggleable), and an
  end-of-practice chord.
- Practice sounds route through the existing **`src/audio/audioEngine.ts` + timbres** in
  the real build (the spike used ad-hoc Web Audio tones only because the engine wiring
  was out of spike scope).

## How to Build It

### Practice settings (Navi Kriya's per-practice control set)

```ts
interface NaviKriyaSettings {
  frontCount: number      // base front OM count, default 100; back is frontCount / 4
  omLength: 'fast' | 'medium' | 'slow'
  rounds: number          // default 3
  perOmCue: boolean       // audible tick on each OM
}
```

Keep `frontCount` to multiples of 4 so the back count is always an integer.

### The session engine

A self-rescheduling timer chain — one OM per tick. Phase machine: `front → back` within a
round, looped for `rounds`, then `done`. Proven shape from spike 003
(`sources/003-navi-kriya-practice/index.html`):

```
start():       phase=front, round=1, count=0; play frontMarker; schedule(LEAD_MS)
onOm():        count++; if perOmCue play tick
               target = phase==='front' ? frontCount : backCount
               if count < target:           schedule(omMs)
               else if phase==='front':     phase=back, count=0; play backMarker; schedule(LEAD_MS)
               else if round < rounds:      round++, phase=front, count=0; play frontMarker; schedule(LEAD_MS)
               else:                        phase=done; play endCue; stop
```

- `omMs` = OM-length seconds × 1000, captured at session start.
- `LEAD_MS` ≈ 700ms — a gap after a marker sound before the phase's first OM, so the
  marker and first tick do not collide.
- Pause = cancel the pending timer; Resume = reschedule.

In React, hold the mutable engine record in a `useRef` and mirror `{phase, round, count}`
into state for display. See the spike source for the exact `setTimeout`/ref pattern.

### Tempo (OM length)

Real reference: **Forrest's follow-along video runs ~1 round (125 OM) in ~4m30s ≈
2.16s per OM.** The spike's final provisional seed is `fast 1.75 / medium 2.5 / slow 4`
seconds. **Finalize these values during the build** — keep them easy to adjust.

### Display

The orb does not breathe here — it pulses once per OM. Show a large `count / target`
counter, the phase label (FRONT / BACK), and round `N / total`. A pop + expanding-ring
animation per OM gives the count a heartbeat.

### Sounds

Four distinct roles. In the spike (Web Audio, for reference only):
front marker = ascending two-tone, back marker = descending two-tone, per-OM tick = soft
short sine, end = low three-note chord. In the real build, express these through
`audioEngine` + the selected timbre.

## What to Avoid

- **Do not breath-sync Navi Kriya.** It is a counting practice — the orb's breathing
  animation and the Resonant inhale/exhale model do not apply.
- **Do not reuse the spike's ad-hoc Web Audio tones** in production — route through
  `audioEngine`/timbres so the practice respects the user's timbre choice.
- **Do not hard-code the tempo.** The 1.75/2.5/4s values are provisional; the real pace
  (~2.16s/OM) must be confirmed and the values kept adjustable.
- **Do not allow non-multiple-of-4 front counts** — the back count would be fractional.

## Constraints

- Fixed 4:1 front:back ratio — not user-overridable.
- A full default practice is long: 3 rounds × 125 OM × ~2.5s ≈ 15+ minutes. The build
  UI should surface an estimated total time, and offer small counts for quick testing.
- Web Audio (and the real `audioEngine`) must be initialized inside a user gesture — the
  first "Start" tap — due to browser autoplay policy.

## Origin

Synthesized from spikes: 003 (navi-kriya-practice).
Source files available in: sources/003-navi-kriya-practice/.
