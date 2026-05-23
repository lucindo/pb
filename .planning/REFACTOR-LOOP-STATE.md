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
| A | Theme tokens: elevation + scrim + destructive. Route `EndSessionDialog` off its hardcoded hex through the new destructive token. | ✓ done — commit `0c1d372` |
| B | Design-primitive component library (`Card`, `Pill`, `SegmentedControl`, `IconButton`, `Eyebrow`, `ArrowLink`, `Stepper`, `Toggle`) + icon/glyph library (centralized SVGs). | **proposed — awaiting go-ahead** |
| C | `PageShell` + `TopAppBar` primitives. Extract `AppHeader` (currently inline in `AppScreen.tsx`) into a real component. | pending |
| D | Surface routing: introduce `appScreen` state (`'practice' \| 'learn' \| 'appSettings'`), add `ScreenRouter`. `LearnDialog` / `SettingsDialog` migrate to `LearnPage` / `AppSettingsPage` composed from primitives + PageShell. | pending |
| E | Unified `PickerCardGrid<T>` primitive — collapses `CuePicker` / `LanguagePicker` / `ThemePicker` / `TimbrePicker` into one data-driven component. | pending |
| F | Cleanup pass: `shapeConstants.ts` single-source-of-truth (TS↔CSS), `PracticeContext` provider replacing prop drilling, `UiStrings` surface-vocabulary rename plan, App.*.test.tsx vs. unit-test overlap audit, `CueGlyph` inline-style → className, presentation-safe type re-exports. | pending |
| G | Dead-code purge — delete `LearnDialog`, `SessionReadout`, `NKSessionReadout`, `StatusPanel`, `SettingsAnchor`, `LearnAnchor`, `SettingsDialog` (and tests) once their replacements are live. (Originally Item A; moved here after verifying all of them still have live importers in current state.) | pending |

---

## Current focus

**Item:** B — Design-primitive component library + icon/glyph library
**Step:** 1 (proposal posted, awaiting operator go-ahead)

### Proposal for Item B

**Goal**
Add a `src/components/primitives/` tree (one file per primitive) and a `src/components/icons/` tree (one file per glyph). Both are purely additive — no existing code modified. The primitives consume the tokens added in Item A. None are consumed by any surface yet; they become the toolkit for items C/D/E.

**Why now**
Item C (`PageShell` + `TopAppBar`) and beyond compose entirely from these primitives. Building them first means each later item is small (drops in a primitive composition) rather than a re-implementation. The v2.0 redesign drift happened because every surface re-built its own pill/card/eyebrow — this is the foundation that prevents that recurrence.

**Scope — primitives (`src/components/primitives/`)**

| File | Purpose | Rough API |
|------|---------|-----------|
| `Card.tsx` | Rounded surface w/ `--shadow-card`, configurable padding | `<Card padding="md" elevation="card\|modal\|none">…</Card>` |
| `Eyebrow.tsx` | Uppercase tracked muted section label | `<Eyebrow>ABOUT</Eyebrow>` |
| `IconButton.tsx` | Round white icon button (top-bar / close affordances) | `<IconButton icon={InfoIcon} label="..." onClick={...} size="md\|sm" />` |
| `Pill.tsx` | Single pill button (filled / outlined, active state) | `<Pill variant="filled\|outlined" active>label</Pill>` |
| `SegmentedControl.tsx` | Unified outer pill, N internal segments, filled-dark active | `<SegmentedControl options={...} value={...} onChange={...} renderGlyph?={...} />` |
| `Stepper.tsx` | Minimal `[−] value [+]` row, no container | `<Stepper value={...} onChange={...} min={...} max={...} step={...} renderValue?={...} />` |
| `Toggle.tsx` | iOS-style pill + knob | `<Toggle checked onChange={...} label="..." />` |
| `ArrowLink.tsx` | Bold accent text + trailing `→` glyph | `<ArrowLink href? onClick?>Watch the video</ArrowLink>` |
| `index.ts` | Re-export barrel | — |

Each primitive has a co-located `.test.tsx` (props → DOM render, no logic to test beyond that). Each uses tokens from `theme.css` — no inline hex, no Tailwind arbitrary color values.

**Scope — icons (`src/components/icons/`)**

Audit current inline SVGs (in `InstallBanner`, `MuteToggle`, `SettingsAnchor`, `LearnAnchor`, `CueGlyph`, `IosInstallSteps`, etc.) and migrate each to its own file under `src/components/icons/`. Standardized:
- 24×24 viewbox
- 1.5 stroke
- `stroke="currentColor"` and `fill="currentColor"` (or none) so color flows from CSS
- Named exports: `<InfoIcon />`, `<GearIcon />`, `<ChevronBackIcon />`, `<ChevronRightIcon />`, `<CloseIcon />`, `<SpeakerIcon />`, `<SpeakerMutedIcon />`, `<ShareIcon />` (iOS install), etc.
- One `index.ts` barrel

`CueGlyph.tsx` and timbre glyphs (Bowl/Bell/Sine/Flute) are NOT icons — they're styled visual elements that depend on cue style and orb state. They stay where they are; the icon library is for chrome icons only.

This step is a one-time consolidation pass — no existing consumer is rewired yet. That happens in items C/D/E as each surface gets rebuilt against the primitives.

**Risk**
Low. Pure addition. New files only. Existing files unchanged. Test coverage is per-primitive (each test renders the component in isolation and asserts on DOM/aria).

**Files touched (estimate)**
- New: `src/components/primitives/*.tsx` (~9 files) + `src/components/primitives/*.test.tsx` (~8 files) + `src/components/primitives/index.ts`
- New: `src/components/icons/*.tsx` (~8 files) + `src/components/icons/index.ts`
- No existing files modified

Commit message: `refactor(primitives): add design-primitive library + centralized icon set (no consumers yet)`

**Question for you before I start**
Do you want me to lock specific visual values now (corner radii, padding scales, segmented-control active fill = `--color-breathing-accent-strong`, etc.) or leave them as sensible defaults that you'll tune later when surfaces consume them? My default: use the existing token vocabulary with sensible Tailwind utilities; flag any value I had to invent in the implementation summary.

---

## History

| Item | Commit | Notes |
|------|--------|-------|
| A | `0c1d372` | Tokens + EndSessionDialog routed through destructive. Light byte-equivalent; dark visual TBD on real device. |

---

## Pinned rules

- Chat mode only — no AskUserQuestion pickers
- Architecture refactors only — NOT design work
- No new persisted fields, no new audio gates, no domain changes
- Update this file on every step transition
- Commit this file with each step transition so the resume prompt always lands on truth
