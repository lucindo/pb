# Phase 30: Multi-Practice Architecture & Switcher - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 30-multi-practice-architecture-switcher
**Areas discussed:** Navi Kriya placeholder, Settings reorganization, Switcher labels & styling, Stats footer scope

---

## Navi Kriya placeholder

### Q: When the user selects Navi Kriya in Phase 30, what should the practice screen show?

| Option | Description | Selected |
|--------|-------------|----------|
| Structural scaffold | Real practice-screen layout — switcher, heading, empty controls slot, stub Start; Phase 31 swaps in engine/orb/controls | ✓ |
| 'Coming soon' placeholder | Short 'Navi Kriya — coming soon' message; Phase 31 rebuilds the screen | |
| Minimal label only | Just the practice name with empty body | |

**User's choice:** Structural scaffold

### Q: Should Phase 30 define the Navi Kriya settings data model, or defer it to Phase 31?

| Option | Description | Selected |
|--------|-------------|----------|
| Define data model now | NaviKriyaSettings type + defaults + validators + coercer wired into per-practice persistence; PRACTICE-02 fully satisfied for both practices | ✓ |
| Defer to Phase 31 | Phase 30 ships only resonant settings; NK settings shape completes in Phase 31 | |

**User's choice:** Define data model now

---

## Settings reorganization

### Q: After the chrome/practice split, where should per-practice controls live?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep inline on home | Per-practice controls stay inline below the orb; SettingsForm becomes practice-aware; chrome stays in the gear dialog | ✓ |
| Move to a practice dialog | Per-practice controls move into their own dialog/screen; two dialogs total | |

**User's choice:** Keep inline on home

### Q: Should the per-practice controls area carry a heading naming the active practice?

| Option | Description | Selected |
|--------|-------------|----------|
| Add practice heading | Inline controls area gets a heading naming the active practice; new copy string | ✓ |
| No heading | Switcher pill above already names the practice; controls stay unlabelled | |

**User's choice:** Add practice heading

---

## Switcher labels & styling

### Q: What text should the two switcher pills carry?

| Option | Description | Selected |
|--------|-------------|----------|
| Full names | 'Resonant Breathing' / 'Navi Kriya' — clearest for first-time users | ✓ |
| Short names | 'Resonant' / 'Navi Kriya' — more compact but less self-explanatory | |

**User's choice:** Full names

### Q: How should the disabled-during-session switcher look?

| Option | Description | Selected |
|--------|-------------|----------|
| Dimmed in place | Visible but non-interactive (opacity + not-allowed cursor); matches chrome pickers; no layout shift | ✓ |
| Dimmed + hint | Dimmed plus 'End session to switch' hint; extra copy string and visual noise | |
| Hidden during session | Switcher removed while a session runs; layout shifts on start/end | |

**User's choice:** Dimmed in place

---

## Stats footer scope

### Q: With per-practice stats, what should the home-screen StatsFooter show?

| Option | Description | Selected |
|--------|-------------|----------|
| Active practice only | Shows only the active practice's stats; swaps on switch | ✓ |
| Both side by side | Shows both practices' stats at once; busier footer; NK column all zeros in Phase 30 | |

**User's choice:** Active practice only

### Q: With per-practice stats, what should the reset action wipe?

| Option | Description | Selected |
|--------|-------------|----------|
| Active practice only | Reset wipes only the active practice's stats; dialog copy names the practice | ✓ |
| All practices | One reset wipes every practice's stats at once | |

**User's choice:** Active practice only

---

## Claude's Discretion

- Component-level structure of the practice-aware `SettingsForm` (generic vs per-practice components).
- Exact pill visual treatment (spike-002 pattern is the starting point).
- Switch-transition animation, if any — kept open; no decision forced.

## Deferred Ideas

- Navi Kriya engine, session loop, cue sounds, live on-screen count, NK controls UI — Phase 31.
- Per-practice + shared Learn content and PT-BR localization of all new copy — Phase 32.
- A third/fourth practice — Future requirement PRACTICE-F1.
- v1.x carry-forward tech debt — remains deferred (STATE.md Deferred Items).
