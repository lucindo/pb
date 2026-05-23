# Architecture refactor loop — live state

**What this is:** A 4-step propose/go/implement/approve loop, executing the architecture refactors that v2.0 needs before any redesign work can resume safely. After three operator-led refactor runs (commits `d2c50ed`, `6245525`, `c0ae572`) the codebase has clean view-model / hook / domain / audio / storage separation. These items finish that work and add the primitives needed to compose the v2.0 design.

**Resume prompt (stable — paste this after `/clear`):**

```
Read .planning/REFACTOR-LOOP-STATE.md and pick up where we left off. Chat mode only — no pickers.
```

---

## Workflow per item

1. **Propose** — I print: goal, scope (files), risk. Wait.
2. **Go / change** — Operator says "go" or proposes modifications.
3. **Implement** — I do the work, commit atomically, print a summary.
4. **Approve** — Operator reviews. "Next" advances; otherwise fix.

State below is updated after every step transition.

---

## Items (in execution order — A renumbered after architecture report revision)

| Tag | Item | Status |
|-----|------|--------|
| A | Theme tokens: elevation + scrim + destructive (formerly B). Route `EndSessionDialog` off its hardcoded hex through the new destructive token. | **proposed — awaiting go-ahead** |
| B | Design-primitive component library (`Card`, `Pill`, `SegmentedControl`, `IconButton`, `Eyebrow`, `ArrowLink`, `Stepper`, `Toggle`) + icon/glyph library (centralized SVGs). | pending |
| C | `PageShell` + `TopAppBar` primitives. Extract `AppHeader` (currently inline in `AppScreen.tsx`) into a real component. | pending |
| D | Surface routing: introduce `appScreen` state (`'practice' \| 'learn' \| 'appSettings'`), add `ScreenRouter`. `LearnDialog` / `SettingsDialog` migrate to `LearnPage` / `AppSettingsPage` composed from primitives + PageShell. | pending |
| E | Unified `PickerCardGrid<T>` primitive — collapses `CuePicker` / `LanguagePicker` / `ThemePicker` / `TimbrePicker` into one data-driven component. | pending |
| F | Cleanup pass: `shapeConstants.ts` single-source-of-truth (TS↔CSS), `PracticeContext` provider replacing prop drilling, `UiStrings` surface-vocabulary rename plan, App.*.test.tsx vs. unit-test overlap audit, `CueGlyph` inline-style → className, presentation-safe type re-exports. | pending |
| G | Dead-code purge — delete `LearnDialog`, `SessionReadout`, `NKSessionReadout`, `StatusPanel`, `SettingsAnchor`, `LearnAnchor`, `SettingsDialog` (and tests) once their replacements are live. (Originally Item A; moved here after verifying all of them still have live importers in current state.) | pending |

---

## Current focus

**Item:** A — Theme tokens + EndSessionDialog destructive color
**Step:** 1 (proposal posted, awaiting operator go-ahead)

### Proposal for Item A

**Goal**
Add the elevation / scrim / destructive-action tokens that the v2.0 design needs across surfaces. Route `EndSessionDialog` off its single hardcoded hex (`#bf616a`) through the new destructive tokens.

**Why first**
Purely additive — no functional code changes. Unblocks Item B (primitive library) because every card, modal, button needs these tokens. Zero risk to current behavior — current views keep working until the new primitives consume the tokens.

**Scope**
- `src/styles/theme.css` — add per-theme (light + dark) tokens: `--shadow-card`, `--shadow-modal`, `--scrim-modal`, `--color-destructive`, `--color-destructive-hover`, `--color-destructive-active`. Plus `--color-destructive-on` for text on destructive backgrounds.
- `src/components/EndSessionDialog.tsx` — replace `#bf616a` / `#a85459` / `#92444c` hardcoded hex with the new tokens.
- `src/components/EndSessionDialog.test.tsx` — no logic change needed; verify still passes.
- `src/styles/theme.contrast.test.ts` — extend the WCAG contrast guard to cover the destructive-on-destructive contrast pair.

**Risk**
Low. Color values for the destructive token can mirror the current hex (`#bf616a`) so the visual outcome is byte-equivalent in light theme. Dark-theme value is new — needs to look right; will pick a slightly desaturated value and let operator visual-check after.

**Files touched**
- M `src/styles/theme.css`
- M `src/components/EndSessionDialog.tsx`
- M `src/styles/theme.contrast.test.ts`

Commit message: `refactor(tokens): add elevation/scrim/destructive theme tokens; route EndSessionDialog through destructive token`

---

## History

(no items completed yet)

---

## Pinned rules

- Chat mode only — no AskUserQuestion pickers
- Architecture refactors only — NOT design work
- No new persisted fields, no new audio gates, no domain changes
- Update this file on every step transition
- Commit this file with each step transition so the resume prompt always lands on truth
