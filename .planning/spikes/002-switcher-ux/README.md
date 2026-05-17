---
spike: 002
name: switcher-ux
type: comparison
validates: "Given the multi-practice shell, when the practice switcher is rendered as (a) bottom tab bar, (b) top segmented control, or (c) launch/home screen, then one feels right for a calm, mid-practice breathing app"
verdict: PENDING
related: [001]
tags: [navigation, ux, comparison, switcher]
---

# Spike 002: Switcher UX

## What This Validates

**Given** the multi-practice shell from spike 001,
**when** the practice switcher is rendered as (a) a bottom tab bar, (b) a top segmented
control, or (c) a launch/home screen,
**then** one mechanism feels right for a calm breathing app where the user commits to one
practice at a time.

Comparison spike — same shell content, three switchers, head-to-head.

## Research

No library research — all three are standard navigation patterns. Design rationale:

| Approach | Pattern | Pros | Cons |
|----------|---------|------|------|
| A · Bottom tab bar | Persistent mobile tab bar | Thumb-reachable; always visible; mobile-native; both practices feel equal | Permanent chrome competes with the calm orb; implies frequent switching the app doesn't want; scales poorly past ~5 practices |
| B · Top segmented control | iOS-style pill toggle at top | Compact; out of the breathing field of view; clearly "pick one"; light-weight | Less thumb-reachable; still always-present chrome; caps at ~3-4 practices |
| C · Home / launch screen | Practice picker → enter a practice | Zero chrome during practice; reads as "choose, then focus"; scales to many practices; matches a deliberate, calm intent | One extra tap to start; switching practices needs a back step; less "app-like" |

**Chosen approach:** decided by operator verification, not pre-chosen — that is the
purpose of this spike. Built all three as a head-to-head harness.

**Constraint applied to every variant** (from spike 001): navigation locks while a
session is in progress. Tab bar / segmented control disable; the home-screen "← Practices"
back button disables.

## How to Run

```
open .planning/spikes/002-switcher-ux/index.html
```

No build step. React 19 + htm + Tailwind from CDN (network needed on first open).

## What to Expect

- A dark **harness bar** at the very top with three buttons: `A · Bottom tab bar`,
  `B · Top segmented`, `C · Home screen`. This bar is NOT part of the product — it is the
  comparison control. Click to swap the switcher under it.
- Below it, the same two-practice shell (Resonant Breathing + Navi Kriya) rendered with
  the selected switcher.
- `Start` begins a session and animates the orb; while running, the switcher locks.
  `End session` unlocks it.
- A theme toggle (☾/☀) on the harness bar, to feel each variant in light and dark.

### Things to try

1. Flip between A / B / C and just sit with each — which one fades away and lets the orb
   be the focus?
2. In each, start a session and confirm switching is locked, then end it.
3. Variant C: notice the extra "choose → enter" step. Does that deliberate beat feel
   right for a calm practice, or like friction?
4. Imagine a third and fourth practice added later — which variant still holds up?

## Observability

None — this is a pure feel comparison. Judgment is the operator's.

## Investigation Trail

- v1 — Built all three switchers against one shared `PracticeContent` so only the
  navigation chrome differs. Harness bar lets the operator flip between them live for a
  true head-to-head rather than three separate files.

## Results

_Pending operator head-to-head verdict — which switcher wins, and why._
