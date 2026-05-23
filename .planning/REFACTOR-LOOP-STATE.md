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
| A | Theme tokens: elevation + scrim + destructive (formerly B). Route `EndSessionDialog` off its hardcoded hex through the new destructive token. | **implemented — awaiting operator approval** |
| B | Design-primitive component library (`Card`, `Pill`, `SegmentedControl`, `IconButton`, `Eyebrow`, `ArrowLink`, `Stepper`, `Toggle`) + icon/glyph library (centralized SVGs). | pending |
| C | `PageShell` + `TopAppBar` primitives. Extract `AppHeader` (currently inline in `AppScreen.tsx`) into a real component. | pending |
| D | Surface routing: introduce `appScreen` state (`'practice' \| 'learn' \| 'appSettings'`), add `ScreenRouter`. `LearnDialog` / `SettingsDialog` migrate to `LearnPage` / `AppSettingsPage` composed from primitives + PageShell. | pending |
| E | Unified `PickerCardGrid<T>` primitive — collapses `CuePicker` / `LanguagePicker` / `ThemePicker` / `TimbrePicker` into one data-driven component. | pending |
| F | Cleanup pass: `shapeConstants.ts` single-source-of-truth (TS↔CSS), `PracticeContext` provider replacing prop drilling, `UiStrings` surface-vocabulary rename plan, App.*.test.tsx vs. unit-test overlap audit, `CueGlyph` inline-style → className, presentation-safe type re-exports. | pending |
| G | Dead-code purge — delete `LearnDialog`, `SessionReadout`, `NKSessionReadout`, `StatusPanel`, `SettingsAnchor`, `LearnAnchor`, `SettingsDialog` (and tests) once their replacements are live. (Originally Item A; moved here after verifying all of them still have live importers in current state.) | pending |

---

## Current focus

**Item:** A — Theme tokens + EndSessionDialog destructive color
**Step:** 4 (implemented + committed, awaiting operator approval)

### Implementation summary

**Files changed (3):**
- `src/styles/theme.css` — added `--shadow-card`, `--shadow-modal`, `--scrim-modal`, `--color-destructive`, `--color-destructive-hover`, `--color-destructive-active`, `--color-destructive-on` to both `@theme` (light) and `[data-theme='dark']:root` (dark). Updated the "deferred destructive token" comment block to mark it as closed.
- `src/components/EndSessionDialog.tsx` — swapped the three hardcoded hex values (`#bf616a` / `#a85459` / `#92444c`) for `var(--color-destructive)` / `var(--color-destructive-hover)` / `var(--color-destructive-active)`. Text color now uses `var(--color-destructive-on)`.
- `src/styles/theme.contrast.test.ts` — added a per-theme WCAG AA-large contrast test (`destructive` vs `destructive-on` ≥ 3.0).

**Verification:**
- `npx tsc --noEmit`: clean
- `npm test -- --run src/styles/theme.contrast.test.ts`: 6/6 (was 4/4 — added 2 new tests, one per theme)
- `npm test -- --run src/components/EndSessionDialog.test.tsx`: 11/11
- `npm test -- --run` full suite: 85 files, 1086 tests, all pass

**Visual impact**
- Light theme: byte-equivalent (destructive token hex = previous hardcoded hex)
- Dark theme: same hex carries over — Nord Aurora red reads on both Polar Night and Snow Storm backdrops; can be re-tuned if real-device testing flags low contrast.

**Commit:** `refactor(tokens): add elevation/scrim/destructive theme tokens; route EndSessionDialog through destructive token`

---

## History

(no items completed yet — Item A in awaiting-approval)

---

## Pinned rules

- Chat mode only — no AskUserQuestion pickers
- Architecture refactors only — NOT design work
- No new persisted fields, no new audio gates, no domain changes
- Update this file on every step transition
- Commit this file with each step transition so the resume prompt always lands on truth
