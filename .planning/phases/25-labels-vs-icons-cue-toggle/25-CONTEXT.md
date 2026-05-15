# Phase 25: Labels-vs-Icons Cue Toggle - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a 5th SettingsDialog picker (`cue` prefs dimension) controlling how the in-orb
In/Out breathing-phase indicator is rendered. Three modes: **Text** (today's
localized word, default), **Arrow** (directional chevron icon), **Nose** (a
nose-airflow drawing). Renders in the phase-label slot of OrbShape / SquareShape /
DiamondShape. Mirrors the established Phase 14/17/18/19 prefs-dimension pattern
(envelope field + coerce + picker + hook pair). No new capability beyond the cue
picker — this clarifies HOW the cue modes are designed, persisted, and made
accessible.

**Scope note:** Phase 25 was expanded from binary (labels vs icons) to a 3-way
picker during this discussion (operator decision). ROADMAP.md Phase 25 goal +
success criteria and REQUIREMENTS.md CUE-01/02/03 were updated 2026-05-15 to
match. The phase name "Labels-vs-Icons Cue Toggle" and slug are kept as a
historical label.

</domain>

<decisions>
## Implementation Decisions

### Cue Picker — Modes & Default
- **D-01:** 3-way cue picker. Modes: Text (default) / Arrow / Nose drawing. Internal default id is `'labels'` (Text) — FIXED per success criterion 5; arrow + nose ids are Claude's discretion (`'arrow'` / `'nose'` suggested). `DEFAULT_CUE = 'labels'` → users who never open SettingsDialog get today's exact rendering, zero regression.
- **D-02:** Scope expanded binary → 3-way during discussion. ROADMAP.md + REQUIREMENTS.md already updated (2026-05-15) — downstream agents read the updated 3-mode wording.

### Arrow Mode
- **D-03:** Arrow style = mockup candidate **F** ("soft solid chevron") — filled, rounded chevron, no thin strokes (best contrast at small size / on busy gradients). Direction: **Up = In, Down = Out** (operator-confirmed).
- **D-04:** Icon-only on screen — no visible word paired with the arrow.

### Nose-Drawing Mode
- **D-05:** Drawing = mockup candidate **D2** — nose outline (two bridge ridges + nostril tip) with two straight arrows below pointing up toward the nostrils (In) / down away (Out). Chosen over D1 (curved airflow) and D3 (minimal nostrils) for legibility at small size and across the Square/Diamond variants.
- **D-06:** Drawing derives from operator-supplied flaticon nose+airflow breathing reference screenshots (2026-05-15). All candidates rendered in `25-cue-icon-mockup.html`.

### Cue Rendering
- **D-07:** The cue swap applies ONLY to the active In/Out phase label. The lead-in 3-2-1 countdown digit (`OrbLeadIn` and the Square/Diamond equivalents) is UNCHANGED in all 3 modes — it shows the numeral regardless of cue setting.
- **D-08:** SVG sized to today's text-label footprint (the `text-5xl`/`sm:text-6xl` slot). Colors via the existing `--color-orb-in-text` / `--color-orb-out-text` tokens. **Static** — the icon/drawing has no animation of its own; orb scale already conveys breath motion. No reduced-motion-specific branch needed for the cue glyph itself.
- **D-09:** Accessibility (CUE-03) — Arrow and Nose modes render an `aria-hidden` SVG plus visually-hidden localized In/Out text, so screen readers still announce the word. The shape root `role="img"` aria-label (`${breathingShapeAriaLabel}: ${phaseLabel}`) and the existing `aria-live` phase announcements stay unchanged — `phaseLabel` still resolves from `strings.inhale` / `strings.exhale`.

### SettingsDialog Picker
- **D-10:** New `CuePicker` component mirrors `VariantPicker` posture verbatim — `role="radiogroup"`, `{ disabled, strings, sectionLabel }` prop contract (no value prop — Phase 15 D-02), token-only colors, 44px hit area, optimistic-UI local state.
- **D-11:** Placement — directly after `VariantPicker`. New SettingsDialog order: Theme, Variant, **Cue**, Timbre, Language (groups the two visual pickers).
- **D-12:** Section label EN = **"Cue style"** (new `strings.settings.cueLabel`). Option labels EN = **"Text" / "Arrow" / "Nose"**. PT-BR values machine-translated, each carrying `// TODO: native-speaker review` (resolved by the Phase 26 sweep).

### Persistence (CUE-02)
- **D-13:** New `cue` field on `UserPrefs` (`src/storage/prefs.ts`). Add `CueStyleId` type, `CUE_OPTIONS`, `isValidCue`, `coerceCue`, `DEFAULT_CUE = 'labels'` to `src/domain/settings.ts`, mirroring the variant dimension. Per-field coerce — a drifted `cue` value does not discard theme/timbre/variant/locale. **NO `STATE_VERSION` bump.**
- **D-14:** Sync — new `useCueChoice` (picker-side) + App-side orchestrator hook pair, mirroring `useVariantChoice` / `useVisualVariant`. Uses the shared `hrv:prefs-changed` CustomEvent with `detail.key === 'cue'`. App passes the chosen cue to `BreathingShape` alongside `variant`.

### Claude's Discretion
- Internal id strings for the arrow/nose modes (`'arrow'`/`'nose'` suggested; `'labels'` for the default is FIXED).
- Final SVG path data for the F chevron and the D2 nose — the mockup gives the design direction; final path tuning + a per-variant (Orb/Square/Diamond) legibility check happens during implementation. Operator wants a visual-review pass before lock (see Specific Ideas).
- Whether `cue` is captured-at-Start (variant/timbre precedent) or live-reactive — planner decides; variant precedent = capture at Start.
- EN string key names under `UiStrings`.

### Folded Todos
- **"Add labels vs icons toggle for session indicator"** (`.planning/todos/2026-05-15-add-labels-vs-icons-toggle-for-session-indicator.md`, area: ui, match score 0.9) — this todo IS Phase 25. Folded entirely into scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — CUE-01 / CUE-02 / CUE-03 (updated 2026-05-15 for the 3-way scope).
- `.planning/ROADMAP.md` — Phase 25 detail: goal + 5 success criteria (updated 2026-05-15).

### Pattern precedents to mirror
- `src/hooks/useVariantChoice.ts` — picker-side choice hook; clone for `useCueChoice`.
- `src/hooks/useVisualVariant.ts` — App-side orchestrator hook; clone for the cue dimension.
- `src/components/VariantPicker.tsx` — picker component posture; clone for `CuePicker`.
- `src/storage/prefs.ts` — `UserPrefs` envelope + per-field coerce pattern; add the `cue` field.
- `src/domain/settings.ts` — `isValidVariant` / `coerceVariant` / `DEFAULT_VARIANT` / `VARIANT_OPTIONS` pattern; add the cue equivalents.

### Design reference
- `.planning/phases/25-labels-vs-icons-cue-toggle/25-cue-icon-mockup.html` — rendered SVG candidates. **F** (soft solid chevron) and **D2** (nose + straight arrows) are the chosen designs.

No external ADRs/specs — requirements fully captured in the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/VariantPicker.tsx` — clone for `CuePicker`: radiogroup + inline swatch pattern, token-only colors, 44px hit area, `useVariantChoice` consumption.
- `src/hooks/useVariantChoice.ts` / `src/hooks/useVisualVariant.ts` — clone as `useCueChoice` + the App-side cue orchestrator.
- `src/storage/prefs.ts` — `UserPrefs` interface + `coercePrefs` get a 5th `cue` field; `DEFAULT_PREFS` gets `cue: DEFAULT_CUE`.
- `src/domain/settings.ts` — add `CueStyleId` union, `CUE_OPTIONS`, `isValidCue`, `coerceCue`, `DEFAULT_CUE` (~near the variant block, lines 118-126).
- `src/components/OrbShape.tsx` — `OrbBody` phase-label `<span>` (~lines 122-133) is where Text/Arrow/Nose switches; `phaseLabel` derives at line 39. `SquareShape.tsx` / `DiamondShape.tsx` have the parallel label slot.
- `src/components/BreathingShape.tsx` — variant dispatcher; add a `cue` prop threaded to all 3 shape components.
- `src/content/strings.ts` — `UiStrings['settings']` gets `cueLabel`; a new `UiStrings['cue']` group holds the 3 option labels (EN + PT-BR).

### Established Patterns
- Prefs dimension: per-field non-throwing coerce-and-fallback, no `STATE_VERSION` bump (Phase 14 D-10/D-17).
- `hrv:prefs-changed` CustomEvent — one event name, `{ key, value }` detail, key-filtered consumers (Phase 17 D-22). The cue consumer filters `detail.key === 'cue' || detail.key === undefined`.
- Picker prop contract: `{ disabled, strings, sectionLabel }` only — no value prop (Phase 15 D-02). `inSessionView` threads in as `disabled`.
- Variant/timbre are captured at session Start via a ref (Phase 17 `sessionVariantRef`) — cue likely follows this.
- New PT-BR strings carry an inline `// TODO: native-speaker review` marker — the Phase 26 sweep depends on it.
- The lead-in shares the orb-center slot; `OrbLeadIn` renders the countdown digit independently — the cue toggle must not touch it (D-07).

### Integration Points
- `useLocale()` in `App.tsx` resolves per-locale `strings`; `CuePicker` consumes `strings.cue` + `strings.settings.cueLabel` through the same prop flow as the other 4 pickers — no new wiring.
- The App-side cue orchestrator feeds the chosen cue into `BreathingShape` alongside `variant`.
- Tests to add/update: `CuePicker.test.tsx`, `prefs` tests, `settings.test.ts`, `OrbShape` / `SquareShape` / `DiamondShape` tests, `SettingsDialog.test.tsx`, `strings` / locale tests.

</code_context>

<specifics>
## Specific Ideas

- Arrow design = mockup candidate **F** (soft solid chevron). Nose design = mockup candidate **D2** (nose outline + straight up/down arrows).
- Direction semantics: **Up = In, Down = Out** (operator-confirmed).
- Operator supplied 2 flaticon nose+airflow reference screenshots (2026-05-15) — these drove the Nose mode.
- Operator wants a **visual-review loop on the final SVGs during implementation**: open a rendered mockup → pick/tweak → confirm before lock — same loop used for the palette redesigns. The planner should build in a checkpoint to render the chosen F + D2 SVGs across all 3 variants for operator approval.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. The binary→3-way expansion was a deliberate, scoped scope-change with ROADMAP.md + REQUIREMENTS.md updated, not deferred work.

### Reviewed Todos (not folded)
- "Add Forrest native app links to Learn page" — already delivered by Phase 24; matched only on generic keywords.
- "Add license to repo and update README" — already delivered by Phase 23.

</deferred>

---

*Phase: 25-labels-vs-icons-cue-toggle*
*Context gathered: 2026-05-15*
