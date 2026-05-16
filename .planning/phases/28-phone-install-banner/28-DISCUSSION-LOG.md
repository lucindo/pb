# Phase 28: Phone Install Banner - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 28-Phone Install Banner
**Areas discussed:** Placement & session behavior, iOS instruction format, First-appearance timing, Copy & localization handoff

---

## Placement & session behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Hide while breathing | Banner disappears when a session starts, returns at idle | ✓ |
| Stay visible always | Banner stays through idle and session | |

**User's choice:** Hide while breathing

| Option | Description | Selected |
|--------|-------------|----------|
| Document flow below content | Normal element at page bottom, scrolls with content | ✓ |
| Fixed to viewport bottom | Pinned to bottom edge of screen | |

**User's choice:** Document flow below content

| Option | Description | Selected |
|--------|-------------|----------|
| Icon + text + action + dismiss | App icon, one-line text, action, dismiss control | ✓ |
| Text + action + dismiss | No icon — leanest | |

**User's choice:** Icon + text + action + dismiss

| Option | Description | Selected |
|--------|-------------|----------|
| X icon | Small × button at the banner's edge | ✓ |
| 'Not now' text button | Explicit labeled text button | |

**User's choice:** X icon

---

## iOS instruction format

| Option | Description | Selected |
|--------|-------------|----------|
| Tap-to-expand inline | Slim by default; action expands step list in-place below the banner | ✓ |
| Always-inline steps | Steps always shown — taller iOS banner | |
| Small sheet/dialog | Modal sheet reusing existing dialog pattern | |

**User's choice:** Tap-to-expand inline

| Option | Description | Selected |
|--------|-------------|----------|
| Text + Share glyph | Numbered text steps with the iOS Share icon inline | ✓ |
| Plain numbered text | Numbered text steps, no icons | |

**User's choice:** Text + Share glyph

---

## First-appearance timing

| Option | Description | Selected |
|--------|-------------|----------|
| Immediately on load | Banner shows as soon as the page loads | ✓ |
| After first completed session | Banner shows only after the user finishes a session | |

**User's choice:** Immediately on load

| Option | Description | Selected |
|--------|-------------|----------|
| Hold banner until event fires | Android banner appears only once `beforeinstallprompt` is captured; no event = no banner | ✓ |
| Show banner, button waits | Banner appears immediately; install button disabled until event arrives | |

**User's choice:** Hold banner until event fires

---

## Copy & localization handoff

| Option | Description | Selected |
|--------|-------------|----------|
| strings.ts now, EN final + PT-BR draft | Add `install` block to `UiStrings`; EN final, PT-BR draft for Phase 29 review | ✓ |
| Hardcode EN in the banner component | Phase 28 English-only inline; Phase 29 lifts into strings.ts | |

**User's choice:** strings.ts now, EN final + PT-BR draft

| Option | Description | Selected |
|--------|-------------|----------|
| Wire to useLocale now | Banner reads `uiStrings` via `useLocale` in Phase 28 | ✓ |
| English-only until Phase 29 | Banner English regardless of locale until Phase 29 | |

**User's choice:** Wire to useLocale now

---

## Claude's Discretion

- Phone-vs-desktop detection method (viewport width / pointer-coarse media query / UA)
- `localStorage` key/shape for dismissal persistence
- Standalone (installed) detection mechanism

## Deferred Ideas

None — discussion stayed within phase scope.
