---
phase: 15-settingsdialog-shell
created: 2026-05-12
milestone: v1.1
requirements:
  - INFRA-04
---

# Phase 15: SettingsDialog Shell - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 15 lands the **UI shell** for the four v1.1 customization dimensions: a gear control in the idle/stopped view opens a native `<dialog>` settings panel that hosts four stub pickers (theme, variant, timbre, language), enforcing the `inSessionView` disable contract before any feature picker is wired. Deliverables:

1. NEW `src/components/SettingsAnchor.tsx` — gear-icon trigger button placed top-left of the breathing column (symmetric pair with `LearnAnchor` top-right). Mirrors `LearnAnchor` shape: `{ disabled: boolean; onClick(): void }`, 44×44 hit area, focus-visible ring, aria-disabled in place during session.
2. NEW `src/components/SettingsDialog.tsx` — native `<dialog>` shell mirroring `ResetStatsDialog` posture: imperative `showModal()`/`close()` via ref, native `cancel` event handler for Esc, backdrop-click cancel, explicit Close button. Renders the four stub picker children in a single stacked column in the order **Theme → Variant → Timbre → Language**. Auto-closes when `inSessionView` flips true (WR-09 carry-forward).
3. NEW four stub picker files in `src/components/`: `ThemePicker.tsx`, `VariantPicker.tsx`, `TimbrePicker.tsx`, `LanguagePicker.tsx`. Each accepts `{ disabled: boolean }` only. Each self-reads `loadPrefs()` and displays its current stored value as read-only text. Bodies are stubbed — Phase 16-19 fills its respective file body without touching `SettingsDialog.tsx`.
4. App wiring in `src/app/App.tsx`: add `settingsDialogOpen: boolean` state (mirror `resetDialogOpen` / `learnDialogOpen` patterns); add `onSettingsClick` handler with `inSessionView` open-guard; render `<SettingsAnchor disabled={inSessionView} onClick={onSettingsClick} />` top-left of the centered breathing column container; render `<SettingsDialog open={settingsDialogOpen} onClose={...} inSessionView={inSessionView} />` at the dialog mount point. Add auto-close `useEffect` keyed on `inSessionView` (mirror `App.tsx:265-271`).
5. Vitest coverage: `SettingsAnchor.test.tsx` (disabled-during-session a11y), `SettingsDialog.test.tsx` (open/close, Esc, backdrop, auto-close on session start, focus return), one minimal test per picker file confirming current-value text renders.
6. Zero `savePrefs()` calls at Phase 15 — read-only stubs only. Phase 16-19 each wires `savePrefs()` inside its own picker file.

**Not in scope (Phase 16-19 owns):**
- Theme switching behavior + `<html data-theme>` + FOUC inline script (Phase 16 / THEME-01..05)
- Visual variant rendering (Phase 17 / VARIANT-01..07)
- Timbre presets in `cueSynth` (Phase 18 / TIMBRE-01..05)
- Language swap + `learnContent.ts` PT-BR (Phase 19 / I18N-01..05)
- Any `savePrefs()` write path inside dialog
- Any new React state in App.tsx beyond `settingsDialogOpen`

</domain>

<decisions>
## Implementation Decisions

### Picker contract — Phase 15 surface Phase 16-19 plug into

- **D-01:** Each customization dimension ships as its own component file at Phase 15 — **four files**: `src/components/ThemePicker.tsx`, `src/components/VariantPicker.tsx`, `src/components/TimbrePicker.tsx`, `src/components/LanguagePicker.tsx`. Phase 16-19 fills the body of its respective file; `SettingsDialog.tsx` is **not edited** in those phases. Chosen over (b) single `<PickerSlot>` shell + 4 inline usages in dialog (every feature phase would re-edit SettingsDialog) and (c) plain inline `<button>` placeholders (max change per feature phase) and (d) full radio-group OPTIONS render now (feels half-done if user opens dialog at v1.1.0 with no behavior wired).

- **D-02:** Each picker accepts exactly **`{ disabled: boolean }`** as its prop interface. Pickers self-read `loadPrefs()` internally to display the current value. Phase 16-19 adds `onChange` + `savePrefs()` **inside the picker file** — no new props at the `SettingsDialog` call site, no re-edit of the dialog. Chosen over (b) `{ value, onChange, disabled }` controlled-by-parent (would force SettingsDialog/App to read+thread state for 4 dims at Phase 15), (c) `{ disabled, onChange? }` hybrid (adds a prop Phase 15 doesn't need), and (d) zero-props with context hook (requires a context/hook abstraction Phase 15 must build for one consumer).

- **D-03:** All four picker files live **flat under `src/components/`** alongside `ResetStatsDialog`, `LearnDialog`, `EndSessionDialog`, etc. Mirrors v1.0.1 convention — zero project-wide reshuffle. Chosen over (b) `src/components/settings/` sub-folder (new convention for one feature) and (c) `src/features/settings/` feature-folder (project-wide convention change Phase 15 shouldn't bootstrap alone).

- **D-04:** Stub body at Phase 15 renders **label + current stored value as read-only text** — e.g. `Theme: system`. Each picker reads `loadPrefs()` and shows the active dimension value. Honest about not-yet-functional, useful info for user, and the `loadPrefs()` read is the same call Phase 16-19 will use — zero throwaway plumbing. Chosen over (b) `Coming soon` placeholder (wastes the `loadPrefs()` read), (c) disabled `<button>` `(not yet)` (looks interactive — may confuse user), (d) label only (cleanest stub but least informative).

### State plumbing scope — keep Phase 15 a pure-UI shell

- **D-05:** **Only React state added to `App.tsx` for Phase 15 is `settingsDialogOpen: boolean`.** Mirror of `resetDialogOpen` / `learnDialogOpen`. No prefs state in App at Phase 15 — Phase 16 adds whatever it needs (e.g. theme effect that writes `<html data-theme>`). Symmetric with `ResetStatsDialog` / `LearnDialog` wiring. Chosen over (b) hoisted prefs state in App (contradicts D-02 picker contract) and (c) dialog owns its own open boolean via DOM ref (breaks prop-driven open contract used by Reset/Learn).

- **D-06:** **Zero `savePrefs()` calls at Phase 15.** Stubs are read-only. Phase 16-19 each wires `savePrefs()` inside its own picker file. Phase 15 stays pure-UI shell. Test surface: no localStorage writes to mock for `SettingsDialog.test.tsx`. Phase 14 D-17 per-field-coerce already handles read-time fallback at `loadPrefs()`, so no defensive seed-on-mount needed (and would be a write surface Phase 15 doesn't own).

### Gear placement + disable behavior

- **D-07:** **Gear sits top-left of the breathing column**, symmetric with `LearnAnchor` top-right. Same in-column absolute positioning pattern (parent must provide `position: relative` — already in place for LearnAnchor at `src/app/App.tsx:586`). Reuses the LearnAnchor `min-h-[44px] min-w-[44px]` + focus-visible ring + backdrop-blur classes verbatim. Chosen over (b) stacking both controls on top-right (mobile cramping), (c) inside `StatsFooter` row (StatsFooter only renders post-session-stats — not visible at fresh first-load), (d) floating fixed bottom-right viewport corner (breaks in-column convention + mobile-keyboard awkwardness).

- **D-08:** **When `inSessionView` is true, the gear is disabled in place** (`aria-disabled="true"`, no-op click handler at JSX layer + App-level open-guard in `onSettingsClick`). Mirrors `LearnAnchor` D-03 + D-04 (44×44 floor preserved). Screen-reader announces "Settings (unavailable during session)". Chosen over (b) unmount entirely (layout shift entering/leaving session + loses LearnAnchor consistency) and (c) CSS `visibility: hidden` (third attribute path mismatched with both LearnAnchor and v1.0.1 dialogs).

- **D-09:** Trigger component name = **`SettingsAnchor`** — mirrors `LearnAnchor` naming. `src/components/SettingsAnchor.tsx`. Sibling files scan as a pair. Chosen over (b) `GearButton` (names the icon, not the function) and (c) `SettingsTrigger` (doesn't carry forward the `*Anchor` vocabulary).

### Dialog layout + close + auto-close + focus

- **D-10:** Dialog inner layout = **single column, 4 sections stacked**, in the order **Theme → Variant → Timbre → Language**. Visual dims first (Theme + Variant), then audio (Timbre), then text (Language). Matches REQ ordering CUST-01 / CUST-03 / CUST-02 / I18N-01. Mobile-first vertical scroll. **No group headers** — locked-copy surface stays minimal; Phase 16-19 only adds picker-internal copy, not section divider copy. Chosen over (b) two-group "Appearance" + "Sound & Language" headers (more locked copy to maintain), (c) three groups (single-item groups are awkward + two more strings for marginal hierarchy), (d) tabbed Appearance/Audio/Language (over-engineered for 4 pickers + keyboard Tab-vs-tabs confusion).

- **D-11:** Close affordance = **explicit Close button + native Esc + backdrop-click cancel** (Reset+Learn hybrid). The Close button is the primary mobile dismiss path (no Esc on touch). Esc is handled via the native `<dialog>` `cancel` event with `preventDefault()` to avoid double-fire (`ResetStatsDialog` Pitfall-5 mitigation carry-forward at `ResetStatsDialog.tsx:28-39`). Backdrop click detected via `event.target === dialogRef.current` (mirror `ResetStatsDialog.tsx:43-47`). Chosen over (b) Esc + backdrop only (LearnDialog pattern — utility dialog wants visible Close), (c) top-right X icon (visually busy alongside four picker sections).

- **D-12:** **Dialog auto-closes when `inSessionView` flips true.** `useEffect([inSessionView])` in App.tsx that calls `setSettingsDialogOpen(false)` when `inSessionView` becomes true. Mirror of `App.tsx:265-271` ResetStatsDialog auto-close, mirror of LearnDialog WR-09 auto-close. Defense in depth — gear is already disabled while `inSessionView`, but the lead-in timer can fire while dialog is open. Chosen over (b) dialog stays open / pickers disable in place (overlay obscures breathing UI), (c) no special handling (worst UX + contradicts WR-09 carry-forward).

- **D-13:** Focus return on close = **back to `SettingsAnchor` trigger** via native `<dialog>` default behavior. Phase 15 adds **no explicit focus management** — same posture as Reset/Learn. ResetStatsDialog DOES focus its Cancel button on open (`ResetStatsDialog.tsx:20`) because it has a destructive default to avoid; SettingsDialog has no destructive default, so we leave native behavior. Chosen over (b) focus first picker on open (override native — no UX win for a non-destructive panel), (c) focus h2 heading on open (ARIA convention — modest win, more code).

### Carry-forward invariants (load-bearing for Phase 15)

- **D-14:** **Per-commit green-gate** (Phase 14 D-14 / Phase 12 D-15 / Phase 11 D-17 / Phase 7 D-09). `npx tsc --noEmit && npm run lint && npm run build && npm test` exits 0 at every commit boundary. Roll-back, not patch-forward, on red. v1.0.1 + Phase 13 + Phase 14 baseline is 438 tests at HEAD; Phase 15 adds new tests without modifying existing ones.

- **D-15:** **Zero new npm dependencies** (PROJECT.md v1.1 "Zero net-new runtime deps" invariant + Phase 14 D-15 carry-forward). Pure React + Tailwind + Vitest + native `<dialog>`. No headless-ui, no Radix, no react-aria — native `<dialog>` already supplies focus trap, top-layer, inert background per the `ResetStatsDialog` / `LearnDialog` / `EndSessionDialog` precedent.

- **D-16:** **Phase 14 D-09 file-split invariant preserved.** `src/domain/settings.ts` (the predicates + OPTIONS arrays + DEFAULT_* constants Phase 14 locked) is NOT edited in Phase 15. `src/storage/prefs.ts` is NOT edited in Phase 15 (no new coercer, no savePrefs caller, no new export). Phase 15 ONLY adds new component files + edits `src/app/App.tsx` for trigger/dialog wiring.

- **D-17:** **WR-09 dialog auto-close on session-view entry** (carry-forward from v1.0.1 LearnDialog + ResetStatsDialog). Applied verbatim to SettingsDialog in D-12. App.tsx pattern at lines 255-271 is the literal template — same `useEffect` shape, same `setOpen(false)` call.

- **D-18:** **Locked-copy contract** carries forward (PROJECT.md claim-safe + Phase 4-12 D-* locked-copy posture). Phase 15 introduces five new visible strings — all final, claim-safe, no marketing language:
  - Dialog title: `Settings`
  - SettingsAnchor `aria-label` (idle): `Settings`
  - SettingsAnchor `aria-label` (disabled): `Settings (unavailable during session)`
  - Close button text: `Close`
  - Picker section labels: `Theme`, `Variant`, `Timbre`, `Language` (verbatim, no decoration).
  Read-only stub value format: `Theme: system`, `Variant: orb`, `Timbre: bowl`, `Language: en` — literal `loadPrefs()` value, no translation, no display-mapping. Phase 19 may later swap `en`/`pt-BR` for display names; Phase 15 ships the raw identifier to match Phase 14 D-08 BCP-47 lock.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements / specs

- `.planning/REQUIREMENTS.md` §"Infrastructure: Prefs Foundation" INFRA-04 (line 21) — the single Phase 15 requirement. Traceability table status `Pending` → `In progress` → `Done` on phase close.
- `.planning/ROADMAP.md` §"Phase 15: SettingsDialog Shell" — Goal + 5 Success Criteria. SC1 (gear visible idle / absent or hidden in session), SC2 (focus trap + Esc + return-to-trigger), SC3 (four picker placeholders disabled during session), SC4 (native `<dialog>` + locked-copy convention, no new lib), SC5 (`tsc && lint && build && test` exit 0).
- `.planning/PROJECT.md` — v1.1 milestone framing; "Zero net-new runtime deps" invariant (D-15); claim-safe / locked-copy contract (D-18).

### Carry-forward CONTEXT files (decisions Phase 15 inherits)

- `.planning/phases/14-prefs-foundation/14-CONTEXT.md` D-01 (enum union locks), D-02 (OPTIONS array pattern), D-03/04/05/06 (DEFAULT_* values), D-08 (BCP-47 hyphen LocaleId), D-09 (file split — Phase 15 MUST NOT edit `src/domain/settings.ts` or `src/storage/prefs.ts`), D-10 (loadPrefs/savePrefs API surface — Phase 15 consumes loadPrefs only), D-14 (per-commit green-gate), D-15 (zero new deps).
- `.planning/milestones/v1.0.1-phases/11-domain-ui-contracts-accessibility/11-CONTEXT.md` — domain-layer location; WR-09 dialog auto-close pattern source.
- `.planning/milestones/v1.0-phases/04-local-memory-practice-stats/` — silent-fallback envelope; Pitfall-5 cancel/close double-fire mitigation source for ResetStatsDialog.
- `.planning/milestones/v1.0.1-phases/08-storage-forward-compat-cross-tab-ui-sync/08-CONTEXT.md` — STORAGE-01 forward-compat (Phase 14 inherits, Phase 15 inherits transitively).

### Code patterns (read before implementing)

- `src/components/ResetStatsDialog.tsx` (84 LOC, full file) — literal template for SettingsDialog dialog ref + showModal/close + cancel event handler + backdrop-click cancel + button row. Carry-forward Pitfall-5 `preventDefault()` on cancel.
- `src/components/LearnDialog.tsx` (187 LOC) — second dialog pattern reference. Content-heavy variant; SettingsDialog is closer to ResetStats than Learn.
- `src/components/EndSessionDialog.tsx` (89 LOC) — third dialog reference for backdrop styling consistency.
- `src/components/LearnAnchor.tsx` (49 LOC, full file) — literal template for SettingsAnchor: 44×44 hit area, disabled vs enabled palette, aria-disabled, in-column absolute positioning, focus-visible ring. SettingsAnchor differs only in icon SVG (settings cog instead of book) and position class (`left-0` instead of `right-0`).
- `src/app/App.tsx` lines 142 (`inSessionView` derivation), 247-253 (EndSessionDialog auto-close pattern), 255-271 (WR-09 LearnDialog + ResetStats auto-close pattern — literal template for SettingsDialog auto-close), 391-399 (`onResetClick` with `inSessionView` open-guard — literal template for `onSettingsClick`), 414-417 (`onLearnClick` same pattern), 586 (LearnAnchor render site — SettingsAnchor mounts in same container).
- `src/storage/prefs.ts` lines 68-73 (`loadPrefs(deps)` — Phase 15 picker stubs call this with no args).

### Tests (mirror these for Phase 15)

- `src/components/ResetStatsDialog.test.tsx` — open/close, Esc cancel, backdrop click, button focus.
- `src/components/LearnAnchor.test.tsx` — disabled vs enabled aria, click handler gating, focus-visible.
- `src/storage/prefs.test.ts` — `loadPrefs()` round-trip; demonstrates the API SettingsPicker stubs consume.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`ResetStatsDialog` shape** — literal copy-paste template for `SettingsDialog` shell. Same dialogRef, same `useEffect([open])`, same `cancel` event handler with `preventDefault()`, same backdrop-click `event.target === dialogRef.current` check, same Tailwind class string (`modal-fade m-auto max-w-sm rounded-3xl border border-teal-100 bg-white p-0 shadow-[var(--shadow-breathing-card)] backdrop:bg-[var(--color-modal-backdrop)]`). SettingsDialog will likely need a larger `max-w` (`max-w-md` or `max-w-lg`) to host four sections; planner picks the exact value.

- **`LearnAnchor` shape** — literal copy-paste template for `SettingsAnchor`. Same `inline-flex min-h-[44px] min-w-[44px]` floor, same `aria-disabled` + conditional `onClick`, same enabled/disabled palette branch. Differences: icon SVG (settings cog stroke icon, hand-coded inline like the LearnAnchor book SVG — no icon library), `left-0` instead of `right-0`, aria-label `Settings` instead of `Learn`.

- **`loadPrefs()`** — Phase 14 D-10 just-in-time read; each picker calls `loadPrefs()` with no args and renders the relevant field as text. No caching needed at Phase 15 — picker mounts only when dialog opens.

- **`inSessionView` derivation at `App.tsx:142`** — `appPhase !== 'idle'`. SettingsAnchor consumes this same boolean for its `disabled` prop; SettingsDialog consumes it for the picker `disabled` prop AND the auto-close useEffect.

### Established Patterns

- **Native `<dialog>` + imperative showModal/close + cancel-event preventDefault** — three v1.0.1 dialogs (Reset, Learn, EndSession) all follow this shape. No new lib. Pitfall-5 (double-fire of cancel/close) mitigated by `preventDefault()` in the cancel handler.

- **In-column absolute positioning for floating controls** — LearnAnchor uses `absolute right-0 top-0` inside the centered breathing column. SettingsAnchor uses `absolute left-0 top-0` for symmetry. Parent container at `src/app/App.tsx:586` already has the required `position: relative` (LearnAnchor sets the contract — see LearnAnchor.tsx:5).

- **Dialog auto-close on `inSessionView` flip** — useEffect on `[inSessionView]`, sets dialog open boolean false. App.tsx:255-271 is the canonical pattern.

- **Open-guard inside trigger handler** — `onResetClick` / `onLearnClick` early-return if `inSessionView` (defense in depth alongside JSX `disabled`). `onSettingsClick` will follow the same shape.

- **Locked-copy claim-safe vocabulary** — every visible string is final, claim-safe, no marketing. Phase 15 introduces 5 strings, all locked in D-18.

### Integration Points

- **`src/app/App.tsx`** — single edit site at Phase 15:
  - Add import for `SettingsAnchor`, `SettingsDialog`
  - Add `const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)`
  - Add `onSettingsClick = useCallback(...)` with `inSessionView` early-return
  - Add `useEffect([inSessionView])` for auto-close (mirror App.tsx:255-271)
  - Render `<SettingsAnchor disabled={inSessionView} onClick={onSettingsClick} />` in the breathing-column container next to LearnAnchor render site (App.tsx:586)
  - Render `<SettingsDialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} inSessionView={inSessionView} />` at the dialog mount point alongside ResetStatsDialog / LearnDialog / EndSessionDialog

- **`src/components/`** — six new files: `SettingsAnchor.tsx`, `SettingsDialog.tsx`, `ThemePicker.tsx`, `VariantPicker.tsx`, `TimbrePicker.tsx`, `LanguagePicker.tsx` plus six matching `.test.tsx` files.

- **`src/storage/prefs.ts`** — **read-only consumer**. Phase 15 calls `loadPrefs()` from each picker file. No edit to prefs.ts; no new export added; D-09/D-16 file-split invariant preserved.

</code_context>

<specifics>
## Specific Ideas

- **Symmetric anchor pair as the v1.1 idle-view header.** LearnAnchor (top-right, book icon) + SettingsAnchor (top-left, gear icon) form a visual pair around the breathing column. Same hit area, same focus ring, same disabled-during-session behavior. This pair anchors the v1.1 customization surface visually without adding a header bar or nav.

- **Read-only stub bodies that survive into v1.1.0 ship.** If Phase 15 ships but Phase 16-19 slips past the milestone cut, the dialog opens and shows `Theme: system / Variant: orb / Timbre: bowl / Language: en` — accurate snapshot of current behavior, honest about not-yet-customizable. No "Coming soon" copy that would feel like marketing.

- **Picker file-per-dim split lets feature phases ship independently.** Phase 16 can land themes (fills `ThemePicker.tsx`) without Phase 17/18/19 touching SettingsDialog or each other. Reduces merge surface across feature phases.

</specifics>

<deferred>
## Deferred Ideas

- **Section headers / dialog grouping** (`Appearance` / `Sound & Language` etc.) — declined at D-10. If future v1.2+ adds more dimensions and the flat list becomes long, revisit grouping. Capture as a v1.2 ideation prompt, not a v1.1 backlog item.

- **Top-right X icon for close** — declined at D-11. If user testing shows the bottom Close button is missed, revisit.

- **Tabbed dialog layout** — declined at D-10. Same trigger: only revisit if dim count grows beyond ~6.

- **Snapshot tests for picker stubs** — not deferred per se, but the planner picks: behavior tests (open/close, disabled, current-value text) preferred over snapshots per project convention. No deferred work, just a planner-time choice.

- **`savePrefs()` defensive seed on mount** — declined at D-06. Phase 14 D-17 per-field-coerce handles read-time fallback; no seed needed.

- **lucide-react or heroicons for the gear icon** — declined at D-15 (zero new deps). Hand-coded inline SVG matching LearnAnchor's book SVG style.

- **Phase 19 reconciliation flag (carry-forward from Phase 14 D-08):** `LocaleId = 'pt-BR'` (BCP-47 hyphen) locked. REQ I18N-05 example uses `pt_BR` (underscore). Phase 19 plan MUST reconcile — either rename the map key to `'pt-BR'` to match `LocaleId`, or document the runtime-id-vs-map-key translation. Phase 15 ships the raw identifier `pt-BR` in the LanguagePicker stub display per D-08.

</deferred>

---

*Phase: 15-SettingsDialog Shell*
*Context gathered: 2026-05-12*
