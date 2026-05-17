---
spike: 003
name: navi-kriya-practice
type: standard
validates: "Given an app-paced Navi Kriya session at a chosen OM length, when it runs, then it metronome-ticks 100 front OMs then 25 back OMs per round for N rounds, marking each transition and the end with sound, and feels like a usable counting meditation"
verdict: PENDING
related: [001]
tags: [practice, navi-kriya, audio, counting]
---

# Spike 003: Navi Kriya Practice

## What This Validates

**Given** an app-paced Navi Kriya session at a chosen OM length,
**when** it runs,
**then** it metronome-ticks 100 front OMs then 25 back OMs per round across N rounds,
marking each front→back→round transition and the end with sound,
**and** it feels like a usable counting meditation rather than a mechanical timer.

This closes the open dependency flagged in spike 001 — Navi Kriya's real mechanics.

## Research

No library research — the operator is the domain authority on Navi Kriya. Key facts the
operator supplied:

- 1 round = 100 OM "front" + 25 OM "back". The base count can go higher; the **4:1
  front:back ratio is fixed**.
- Choices: number of rounds (default 3) and OM length (fast / medium / slow).
- The practice is **not breath-synced** — the app keeps count.
- App-paced (operator decision): the app ticks each OM at the OM-length tempo; the user
  chants along. Auto-advances front → back → next round with marker sounds.

**Open / seeded — needs operator tuning:** the seconds-per-OM for fast/medium/slow are
seeded at 3 / 5 / 8s. These are guesses — the spike exposes them so the operator can
confirm the right tempo for a real chant.

## How to Run

```
open .planning/spikes/003-navi-kriya-practice/index.html
```

No build step. React 19 + htm + Tailwind from CDN. **Sound:** Web Audio starts on the
first "Start practice" tap (browser autoplay requires a user gesture) — have sound on.

## What to Expect

- A **setup screen**: front OM count (4 / 8 / 20 / 100 — back is auto 4:1), OM length
  (fast 3s / medium 5s / slow 8s), rounds (1–5), a per-OM audible-cue toggle, and a live
  **estimated total time**.
- **Start practice** runs the session:
  - A **front marker** sound, then OMs tick one per OM-length interval. A big counter
    shows `count / target`; the orb pops and a ripple expands on each OM.
  - At 100 (front complete) → a **back marker** sound, counter resets, counts to 25.
  - Round complete → next round (front marker again), until all rounds done.
  - At the very end → a soft **end-of-practice** chord.
- Pause / Resume / End controls during the session.
- A **session log** records every phase transition so the structure is verifiable.

### Things to try

1. Run a quick round at front count **4** (back 1), fast — feel the full front→back→end
   shape in under a minute.
2. Toggle the per-OM cue off — is the practice still usable on marker sounds alone?
3. Try medium and slow — does the seeded 3/5/8s tempo feel right for chanting OM? Tell me
   the numbers you'd actually want.
4. Run the real default (100 / 3 rounds) for a bit — does app-pacing feel supportive or
   constraining? Are the four sounds (front / back / per-OM / end) distinct enough?

## Observability

On-screen session log — timestamps every start / phase transition / round / pause / end.
No export; the practice structure is short enough to read inline.

## Investigation Trail

- v1 — Built the app-paced engine: a self-rescheduling `setTimeout` chain (one OM per
  tick), front/back phase machine, round loop, four synthesized Web Audio cues (front
  marker = ascending two-tone, back marker = descending two-tone, per-OM tick = soft
  sine, end = low three-note chord). Front counts restricted to multiples of 4 so the
  back count is always an integer; small values (4/8/20) included so a full round is
  verifiable in seconds.

## Results

_Pending operator verification — does it feel like a meditation, and is the tempo right?_
