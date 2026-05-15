# Phase 15: SettingsDialog Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 15-settingsdialog-shell
**Areas discussed:** Stub picker contract, State plumbing scope, Gear placement + Disable-vs-hide, Dialog inner layout + Close + Auto-close + Focus return

---

## Stub picker contract — file shape

| Option | Description | Selected |
|--------|-------------|----------|
| 4 sub-components (Theme/Variant/Timbre/Language Picker), bodies stubbed | One file per dim; Phase 16-19 fills its own file; SettingsDialog untouched in feature phases | ✓ |
| Single `<PickerSlot>` shell + 4 inline usages in SettingsDialog | One typed shell; feature phases edit SettingsDialog | |
| Plain `<button>`/`<div>` placeholders, no abstraction | Minimum code now; max change per feature phase | |
| Render OPTIONS arrays as radio groups, onChange unwired | Visually complete; feels half-done if user opens dialog at v1.1.0 | |

**User's choice:** 4 sub-components (Recommended).
**Notes:** Highest downstream leverage — Phase 16-19 each ships a self-contained picker file edit without re-editing the dialog shell.

---

## Stub picker contract — prop interface

| Option | Description | Selected |
|--------|-------------|----------|
| `{ disabled: boolean }` only — stub reads `loadPrefs()` internally | Self-owns prefs read/write; SettingsDialog passes `disabled={inSessionView}` only | ✓ |
| `{ value, onChange, disabled }` — controlled by parent | SettingsDialog/App threads value+onChange for 4 dims | |
| `{ disabled, onChange? }` hybrid | Reads internally, bubbles change up; adds unneeded prop | |
| Zero props — context/hook for `inSessionView` | Requires building a context abstraction for one consumer | |

**User's choice:** `{ disabled: boolean }` only.
**Notes:** Phase 16-19 adds `onChange` + `savePrefs()` inside the picker file — no new props at call site.

---

## Stub picker contract — file location

| Option | Description | Selected |
|--------|-------------|----------|
| `src/components/` flat alongside existing dialogs | Mirrors v1.0.1 convention; zero project-wide reshuffle | ✓ |
| `src/components/settings/` sub-folder | New folder convention | |
| `src/features/settings/` feature-folder | Project-wide convention change | |

**User's choice:** `src/components/` flat.

---

## Stub picker contract — stub body content

| Option | Description | Selected |
|--------|-------------|----------|
| Label + current stored value (read-only text), e.g. `Theme: system` | Reads `loadPrefs()`; honest; useful; Phase 16-19 swaps for real control | ✓ |
| Label + `Coming soon` placeholder | Wastes the `loadPrefs()` read | |
| Label + disabled `<button>(not yet)` | Looks interactive; may confuse user | |
| Label only | Cleanest stub; least informative | |

**User's choice:** Label + current stored value.

---

## State plumbing scope — App.tsx React state

| Option | Description | Selected |
|--------|-------------|----------|
| Only `settingsDialogOpen: boolean` — mirror Reset/Learn pattern | App owns open/close boolean; no prefs state in App at Phase 15 | ✓ |
| Open boolean + prefs state hoisted to App | Contradicts picker contract decision | |
| No App state — dialog component owns open boolean via DOM ref | Breaks prop-driven open contract | |

**User's choice:** Only `settingsDialogOpen: boolean`.

---

## State plumbing scope — savePrefs() calls at Phase 15

| Option | Description | Selected |
|--------|-------------|----------|
| No — zero `savePrefs()` calls at Phase 15 | Read-only stubs; Phase 16-19 each wires `savePrefs()` inside its own picker | ✓ |
| Yes — defensive seed on first mount | Phase 14 D-17 already handles read-time fallback; seed is redundant | |

**User's choice:** No `savePrefs()` at Phase 15.

---

## Gear placement

| Option | Description | Selected |
|--------|-------------|----------|
| Top-left of breathing column, mirroring LearnAnchor on top-right | Symmetric pair; reuses LearnAnchor in-column absolute positioning | ✓ |
| Top-right of column, paired with LearnAnchor (stack/row) | Mobile cramping; LearnAnchor currently owns top-right alone | |
| Inside `StatsFooter` row, next to Reset button | StatsFooter may not be visible at fresh first-load | |
| Floating fixed bottom-right viewport corner | Breaks in-column convention; mobile-keyboard awkward | |

**User's choice:** Top-left of breathing column.

---

## Disable vs hide on session

| Option | Description | Selected |
|--------|-------------|----------|
| Disable in place (`aria-disabled`, no-op click) — mirror LearnAnchor D-03 | Visible grayed-out; SR announces "unavailable"; defense in depth | ✓ |
| Hide entirely (unmount) during session | Layout shift; loses LearnAnchor consistency | |
| `visibility: hidden` (CSS) | Third attribute path mismatched with LearnAnchor and v1.0.1 dialogs | |

**User's choice:** Disable in place.

---

## Trigger component name

| Option | Description | Selected |
|--------|-------------|----------|
| `SettingsAnchor` — mirrors LearnAnchor naming | Sibling files scan as a pair | ✓ |
| `GearButton` | Names the icon, not the function | |
| `SettingsTrigger` | Doesn't carry forward the `*Anchor` vocabulary | |

**User's choice:** `SettingsAnchor`.

---

## Dialog inner layout

| Option | Description | Selected |
|--------|-------------|----------|
| Single column, 4 sections stacked: Theme → Variant → Timbre → Language | Matches REQ ordering CUST-01/03/02/I18N-01; no group headers | ✓ |
| Two groups: `Appearance` (Theme, Variant) + `Sound & Language` (Timbre, Language) | More locked copy to maintain | |
| Three groups: `Appearance` / `Audio` / `Language` | Single-item groups awkward | |
| Tabbed: Appearance / Audio / Language tabs | Over-engineered for 4 pickers | |

**User's choice:** Single column, 4 sections stacked.

---

## Close affordance

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit Close button + Esc + backdrop click — Reset+Learn hybrid | Mobile-friendly visible button + native Esc + backdrop cancel | ✓ |
| Esc + backdrop only — LearnDialog pattern | Utility dialog wants visible Close | |
| Top-right X icon + Esc + backdrop | Visually busy alongside four picker sections | |

**User's choice:** Explicit Close button + Esc + backdrop.

---

## Auto-close on session start

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-close when `inSessionView` flips true — mirror Reset/Learn WR-09 | Defense in depth; carry-forward of App.tsx:265-271 | ✓ |
| Stay open, pickers disable in place | Overlay obscures breathing UI; breaks WR-09 | |
| No special handling | Worst UX; contradicts WR-09 | |

**User's choice:** Auto-close.

---

## Focus return

| Option | Description | Selected |
|--------|-------------|----------|
| Back to `SettingsAnchor` (trigger) — native `<dialog>` default + ref handling | Phase 15 adds no explicit focus management | ✓ |
| Focus first picker on open, return to trigger on close | Override native default; no UX win for non-destructive panel | |
| Focus h2 heading on open — ARIA dialog convention | Modest win; more code | |

**User's choice:** Back to `SettingsAnchor` via native default.

---

## Claude's Discretion

- Exact `max-w` of dialog (`max-w-md` vs `max-w-lg`) — planner picks based on visual fit of four sections plus Close button. Recommend `max-w-md` matching ResetStatsDialog `max-w-sm` family with one step up for height accommodation.
- Exact stroke / fill of gear-icon SVG path — planner picks; constraint is "matches LearnAnchor book SVG style: 24×24 viewBox, stroke `currentColor`, `strokeWidth=1.8`, `strokeLinecap=round`, `strokeLinejoin=round`, no fill".
- Test framing per picker (one `it` confirming current value renders, plus disabled prop wiring) — planner picks exact test names and assertion shape.
- Commit packaging within Phase 15 (single plan likely; possibly split into "shell + anchor wiring" commit then "4 picker stubs" commit, planner decides).

## Deferred Ideas

- Section headers / dialog grouping — declined; revisit v1.2+ if dim count grows.
- Top-right X icon for close — declined; revisit if user testing flags missed Close button.
- Tabbed dialog layout — declined; revisit only if dim count exceeds ~6.
- `savePrefs()` defensive seed on mount — declined per Phase 14 D-17 carry-forward.
- lucide-react / heroicons for gear — declined per zero-deps invariant.
- Phase 19 reconciliation: `pt-BR` (hyphen) vs `pt_BR` (underscore in REQ I18N-05) — carried forward to Phase 19 plan, surfaced in CONTEXT.md `<deferred>`.
