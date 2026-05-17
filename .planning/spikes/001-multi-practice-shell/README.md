---
spike: 001
name: multi-practice-shell
type: standard
validates: "Given a tabbed shell hosting Resonant + Navi Kriya stubs, when I switch practices, then each practice keeps its own settings/stats while theme/audio/language stay shared — and the app doesn't feel bloated"
verdict: VALIDATED
related: [002]
tags: [architecture, navigation, multi-practice, react, shell]
---

# Spike 001: Multi-Practice Shell

## What This Validates

**Given** a tabbed shell hosting two practices (Resonant Breathing + a Navi Kriya stub),
**when** I switch between them,
**then** each practice keeps its own settings and stats while theme/language (shared
chrome) apply app-wide — and the combined app does not feel bloated.

This is the kill-test for "one app with multiple practices" vs. "a separate sibling app."

## Research

No external libraries — pure React UI, so no library research. One domain note:

- **Navi Kriya is modeled as a STUB.** It is given 2 knobs (pace in s/breath, repetition
  count) against Resonant's 3 (BPM, ratio, duration) to honor the operator's "fewer
  options" description. The stub's *practice fidelity is not validated here* — this spike
  is about the shell. The real Navi Kriya phase shape must be confirmed separately before
  any build.
- **State partition observed from the real codebase** (`src/domain/settings.ts`): session
  settings (bpm/ratio/duration/mode) are inherently *per-practice*, while theme, timbre,
  visual variant, cue style, and locale are *app-wide chrome*. The spike mirrors that
  split — per-practice `settings`+`stats`, shared `theme`+`locale`.

## How to Run

```
open .planning/spikes/001-multi-practice-shell/index.html
```

No build step. React 19 + htm + Tailwind load from CDN (needs network on first open).

## What to Expect

- A single-screen app with a **bottom tab bar**: `Resonant Breathing` | `Navi Kriya`.
- Each tab shows that practice's **own** orb, settings panel, and stats panel.
  Navi Kriya visibly has fewer settings.
- Shared chrome in the header: a theme toggle (☾/☀) and a language toggle (EN/PT) —
  changing either applies to **both** practices.
- `Start` runs a session; the orb animates; an elapsed timer counts. Sessions
  auto-complete at the planned duration and bump that practice's stats.
- Switching tabs while a session runs **leaves it running in the background** — the tab
  bar shows a green ● on practices with a live session, and the event log records it.
- An **event log** at the bottom colour-codes every action by category
  (`switch` / `session` / `setting` / `shared`) so state isolation is observable, not
  just felt.

### Things to try (to feel the architecture)

1. Change Resonant BPM → switch to Navi Kriya → change its pace → switch back.
   Resonant's BPM is preserved. (per-practice isolation)
2. Toggle theme on one tab → switch tabs. Theme persists. (shared chrome)
3. Start a session → the tab bar locks (🔒 "switching disabled"). End the session
   to unlock it. Navigation and an active session are mutually exclusive.
4. Ask yourself: does carrying two practices' settings + stats make the app feel
   heavier, or is it fine?

## Observability

Built-in event log (bottom panel). Categories: `app`, `switch`, `setting`, `session`,
`shared`. No export — the log is short-lived and read on-screen.

## Investigation Trail

- v1 — Built the shell with a bottom tab bar as the baseline switcher (spike 002
  compares tab bar against other mechanisms). Initial v1 kept sessions running across
  tab switches rather than pausing/discarding them, surfacing the "is my session still
  alive?" ambiguity as an open question for the operator.
- v2 — Operator verdict: do **not** keep sessions alive across switches. Instead, **lock
  navigation while a session is in progress** — the tab bar disables, showing
  "🔒 session in progress — switching disabled." A session must be ended before changing
  practices. This removes background-session state entirely and makes "one practice
  active at a time" a hard invariant.

## Results

**VALIDATED.** Hosting two practices in one app is viable and does not feel bloated —
per-practice settings/stats stay cleanly isolated while theme and locale behave as shared
app-wide chrome. The architecture mirrors the existing `src/domain/settings.ts` split
(session settings per-practice; theme/timbre/variant/cue/locale app-wide).

**Key decision captured:** navigation and an active session are mutually exclusive. The
tab bar locks during a session; no background/multi-session state exists. This both
simplifies the architecture (one active practice, one possible session) and avoids a
confusing UX. Promoted to a MANIFEST requirement.

**Carried into spike 002:** the switcher mechanism (bottom tab bar vs. alternatives) is
the remaining open question — the spike 002 comparison must account for the lock-during-
session behavior in each variant.
