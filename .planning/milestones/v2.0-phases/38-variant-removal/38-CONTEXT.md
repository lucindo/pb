# Phase 38: Variant removal — Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Reduce the shape vocabulary to **Orb-only** — drop `Square` and `Diamond` from code / tokens / picker / Start-capture so the Phase 42 orb rewrite has exactly one shape to dispatch to. Single-orb family is the user-facing surface; the dev-toggled V1 (orb-halo) / V2 (minimal-rings) split is Phase 42's `VITE_BREATHING_SHAPE` env var, not a user pref.

**In scope:**
- Delete `src/components/SquareShape.tsx` + `SquareShape.test.tsx`
- Delete `src/components/DiamondShape.tsx` + `DiamondShape.test.tsx`
- Delete `src/components/VariantPicker.tsx` + `VariantPicker.test.tsx`
- Delete `src/components/BreathingShape.tsx` + `BreathingShape.test.tsx` — collapse 3 App.tsx call-sites to direct `<OrbShape ... />` (D-03)
- Delete `src/hooks/useVisualVariant.{ts,test.ts}` and `src/hooks/useVariantChoice.{ts,test.ts}` — no consumers after picker + Start-capture removal (D-02)
- Delete `variant` field from `UserPrefs` / `DEFAULT_PREFS` / `coercePrefs` in `src/storage/prefs.ts` (D-01)
- Delete `VisualVariantId` / `VARIANT_OPTIONS` / `isValidVariant` / `DEFAULT_VARIANT` from `src/domain/settings.ts` (D-01)
- Remove `VariantPicker` import + render from `src/components/SettingsDialog.tsx`; remove `strings.variants` and `strings.settings.variantLabel` from `UiStrings` type + EN + PT-BR catalogs in `src/content/strings.ts` (D-05)
- Remove `sessionVariantRef` / `sessionVariant` state + capture-at-Start sites + tidy-clears + `liveVariant` reads + JSX `variant={sessionVariant ?? liveVariant}` props from `src/app/App.tsx` (VAR-04)
- Delete `[data-variant='square']` / `[data-variant='diamond']` CSS blocks from `src/styles/theme.css` (and the orphaned `[data-variant='orb']` selector if the attribute is no longer emitted)
- Surgical strip of variant branches in `src/app/App.session.test.tsx`, `src/app/App.audio.test.tsx`, `src/app/App.locale.test.tsx`, `src/app/App.test.tsx`, `src/app/App.wakeLock.test.tsx`, `src/components/SettingsDialog.test.tsx`, and any other tests that import or exercise the dropped names
- Add a VAR-06 fs-scan drift-guard test (D-04) — analog to `src/content/content.no-stats-ui.test.ts`
- Persisted-coercion drop: removing the field from `UserPrefs` means a returning user with persisted `prefs.variant: 'square'|'diamond'|'orb'` lands on `'orb'` implicitly — the unknown key is ignored on read via Phase 8 D-01 envelope tolerance; the default orb shape is the only render path (D-01)

**Out of scope (other phases):**
- `VITE_BREATHING_SHAPE=orb-halo|minimal-rings` dev toggle — Phase 42
- New orb implementation (three-layer halo + centre disc) — Phase 42
- `borderSoft` / `textSoft` / `orbHalo1/2/3` / `onAccent` tokens — Phase 41
- Theme palette collapse (Moss/Slate/Dusk removal) — Phase 39
- `OrbShape.tsx` internal redesign — Phase 42
- `STATE_VERSION` bump — explicitly NOT bumped (VAR-05 + per-field coercion stance)
- `NKShape.tsx` and Navi Kriya shape — outside the variant axis
- Removing `data-variant` HTML attribute writer if one exists at the App level — defer to plan-time audit; if Phase 17 D-16 holds ("no global attribute write — variant is render-local"), there is nothing to remove
- `shapeConstants.ts` (`MIN_SCALE`/`MAX_SCALE`/`MID_SCALE`) — kept; consumed by `OrbShape` for breathing math (only the comment reference to "OrbShape / SquareShape / DiamondShape" updates)

</domain>

<decisions>
## Implementation Decisions

### Persisted-pref disposition
- **D-01:** **Delete the `variant` field entirely from `UserPrefs` / `DEFAULT_PREFS` / `coercePrefs` / `loadPrefs`**, AND delete `VisualVariantId` / `VARIANT_OPTIONS` / `isValidVariant` / `DEFAULT_VARIANT` from `src/domain/settings.ts`. A returning user with persisted `prefs.variant: 'square'|'diamond'|'orb'` reads via `coercePrefs` which no longer references the key — Phase 8 D-01 envelope tolerance preserves the unknown key on the persisted object but `loadPrefs` ignores it on read; the rendered shape is always Orb. **VAR-05 satisfied implicitly** (the field disappears, the only render path is Orb) rather than via an explicit `'square'|'diamond' → 'orb'` value coercion. No `STATE_VERSION` bump. Matches Phase 37 D-02/D-03 (delete dead data-layer surface when consumers go) and Phase 35 chime→flute precedent for surface renames (only here it is a surface delete, not rename). On a future cross-tab write that overwrites the envelope, the unknown `prefs.variant` would also be preserved via Phase 8 D-01 spread-then-override; the field is harmless residue.
   - **Wording note (informational):** REQUIREMENTS VAR-05 phrasing says "coerced via `coerceSettings`" — the actual coercer used by current `prefs.variant` is `coerceVariant` (inside `coercePrefs` in `src/storage/prefs.ts`); `coerceSettings` lives in `src/storage/settings.ts` and handles BPM/ratio/duration. The intent is unchanged ("forward-compat read, no STATE_VERSION bump") and D-01 satisfies it; the planner may surface the wording fix in `REQUIREMENTS.md` as a sidecar tidy.

### Dead-hook disposition
- **D-02:** **Delete `src/hooks/useVisualVariant.{ts,test.ts}` and `src/hooks/useVariantChoice.{ts,test.ts}`.** Once `VariantPicker` (the writer) and App.tsx's `liveVariant` subscription + `sessionVariantRef` capture (the readers) are removed, both hooks are dead code. Phase 37 D-02/D-03 precedent: delete the hook/data-layer surface when no consumer remains. Phase 42 does not reintroduce a per-user shape pref — `VITE_BREATHING_SHAPE` is a build-time env var, not a hook.

### BreathingShape.tsx wrapper disposition
- **D-03:** **Collapse `BreathingShape.tsx` to direct `<OrbShape />` call sites.** Delete `src/components/BreathingShape.{tsx,test.tsx}`. Replace the 3 App.tsx call sites (lines ~1012, ~1021, ~1031) with `<OrbShape cue={...} frame={...} leadInDigit={...} strings={strings.breathing} />`. Tiger Style — no premature abstraction kept around for Phase 42's benefit; Phase 42 will introduce a different wrapper (env-driven V1/V2 dispatch) so this wrapper has no preservation value. `NKShape.tsx` stays untouched (it lives outside the HRV/Stretch variant axis; per spike-001/spike-007 it is the Navi Kriya practice surface).

### VAR-06 audit mechanism
- **D-04:** **Add a fs-scan VAR-06 drift-guard test** in the spirit of `src/content/content.no-stats-ui.test.ts` (Phase 37 D-09/D-10) and `src/content/content.no-review-markers.test.ts` (Phase 26 D-12 / I18N-07). Single Vitest case that fails CI if forbidden tokens appear in any non-test file under `src/components/`, `src/app/`, `src/content/`, and `src/styles/`. The test file lives in a location chosen by the planner — `src/content/content.no-variants.test.ts` is the closest analog; planner may pick `src/components/no-variants.test.ts` or similar if path scoping reads cleaner. The test file itself is excluded via filename filter (matches the no-stats-ui scaffold).
- **D-05:** **Forbidden token list (case-sensitive unless flagged):**
  - Plain substring: `SquareShape`, `DiamondShape`, `VariantPicker`, `VisualVariantId`, `useVisualVariant`, `useVariantChoice`, `coerceVariant`, `isValidVariant`, `VARIANT_OPTIONS`, `DEFAULT_VARIANT`
  - Regex: `/variant:\s*['"]square['"]/`, `/variant:\s*['"]diamond['"]/`
  - Regex (CSS): `/\[data-variant=['"]?(square|diamond)['"]?\]/`
  - Type/string remnants in strings.ts: `/variants\s*:/` inside a `UiStrings`-shaped object literal — planner picks a precise-enough form during plan-phase (the simpler scan: ban the two display strings `'Square'`, `'Diamond'`, `'Quadrado'`, `'Losango'` from `src/content/strings.ts`)
- **D-06:** **Exit-ramp policy (mirrors Phase 37 D-11):** if a future deliberate phase ever reintroduces a shape variant, that phase explicitly deletes this drift-guard test with rationale logged in its SUMMARY. The test is the lock; deleting it is the unlock.
- **D-07:** **Surface coverage:** the four scanned roots (`src/components/`, `src/app/`, `src/content/`, `src/styles/`) cover render paths (components + app), i18n catalogs (content), and CSS tokens (styles). Test files (`*.test.ts` / `*.test.tsx`) excluded via filename filter; the guard file itself is excluded by its own filename.

### i18n strings disposition
- **D-08:** **Clean cut** — delete the `UiStrings.variants` block (type + EN + PT-BR catalogs) and `UiStrings.settings.variantLabel` from `src/content/strings.ts`. Per Phase 37 D-01 precedent: re-introduction (if Phase 42's dev toggle ever escapes to a user pref) will design fresh copy + key shape anyway; keeping orphan strings risks rot and unused-export lint noise. The Phase 26 `content/no-review-markers.test.ts` drift-guard stays intact (no review markers are introduced — the strings disappear entirely). `LOCKED_COPY` byte-equality guard untouched (variant strings are not Forrest/medical claim-safe copy).

### Test retention
- **D-09:** **Delete-with-component policy** — `SquareShape.test.tsx`, `DiamondShape.test.tsx`, `VariantPicker.test.tsx`, `BreathingShape.test.tsx`, `useVisualVariant.test.ts`, `useVariantChoice.test.ts` are all deleted in the same commit as their source files (matches Phase 37 D-06).
- **D-10:** **Surgically strip** variant branches from cross-cutting tests — `src/app/App.session.test.tsx`, `App.audio.test.tsx`, `App.locale.test.tsx`, `App.test.tsx`, `App.wakeLock.test.tsx`, `src/components/SettingsDialog.test.tsx`, `src/storage/prefs.test.ts`, plus any `import { ... } from '../domain/settings'` that pulls `VisualVariantId` / variant helpers. Keep the rest of those files intact.

### Plan structure (Claude's Discretion)
- File-level commit grouping (single atomic vs split component-deletes / data-layer / i18n / App.tsx / drift-guard) — planner chooses based on git-history clarity. Tiger Style "small atomic commits" + Phase 36 PATTERNS favor split.
- Exact filename + scoped roots for the drift-guard test — planner follows the closest analog (`content.no-stats-ui.test.ts`).
- Order of plan files within the phase (suggested: 1) component + hook + picker deletion + App.tsx call-site collapse, 2) domain/storage + i18n cleanup, 3) CSS/theme cleanup, 4) drift-guard test) — planner may merge or reorder if dependency analysis flips the order.
- Whether to inline-ban `'Square'` / `'Diamond'` / `'Quadrado'` / `'Losango'` display strings or rely on the UiStrings type-removal alone for catalog drift — planner picks the cleaner banlist shape during PATTERNS pass.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spike & milestone alignment
- `.planning/spikes/MANIFEST.md` §Requirements — "Variant app-configuration is removed" + "two shape variants behind a developer toggle" lock the single-orb user surface; the V1/V2 dev toggle is Phase 42's responsibility, not 38's.
- `.planning/PROJECT.md` §Current Milestone: v2.0 New Design — frames Phase 38 alongside 37/39/41/42/43 so the planner understands sequencing (38 lands before 41/42 surface redesigns; depends on 37 stats-UI strip which is already shipped).
- `.planning/ROADMAP.md` §Phase 38 — goal + 4 ROADMAP success criteria (VAR-01..04, VAR-05 coercion, VAR-06 zero-leftover).
- `.planning/REQUIREMENTS.md` §VAR — VAR-01..06 normative statements (note D-01 wording correction: `coerceVariant` not `coerceSettings`).

### Pattern analogs (planner reuses these in PATTERNS.md)
- `src/content/content.no-stats-ui.test.ts` — Phase 37 STATS-05 drift-guard. The structural analog for the VAR-06 drift-guard (D-04). Same fs-scan shape, four-root scope, filename-filter test-exclusion, regex+substring forbidden-token list.
- `src/content/content.no-review-markers.test.ts` — Phase 26 I18N-07 original drift-guard precedent.
- `.planning/phases/37-stats-ui-removal/37-CONTEXT.md` — direct precedent for delete-with-component policy (D-06), surgical-strip pattern (D-07), i18n clean-cut (D-01), data-layer dead-code deletion (D-02/D-03). The planner's strongest analog for plan shape.
- `.planning/phases/37-stats-ui-removal/37-PATTERNS.md` (if it exists at plan time) — file-level commit grouping precedent for v2.0 milestone.
- `.planning/milestones/v1.5-phases/35-flute-cue-timbre/35-CONTEXT.md` — rename + storage-coercion precedent (chime → flute via per-field `coerceTimbre`); structurally similar to D-01 except Phase 38 *deletes* the field rather than coerces values.

### Codebase touchpoints (full path list — feeds the planner directly)
- `src/domain/settings.ts` (L117-125) — delete `VisualVariantId` type, `VARIANT_OPTIONS`, `isValidVariant`, `DEFAULT_VARIANT`
- `src/storage/prefs.ts` (L15, L20, L30, L38, L50, L57-59, L78) — delete `variant` field on `UserPrefs`, `DEFAULT_PREFS`, `coercePrefs`, the standalone `coerceVariant` export, and the `VisualVariantId` import
- `src/storage/prefs.test.ts` — strip variant cases
- `src/components/BreathingShape.tsx` + `BreathingShape.test.tsx` — delete (D-03)
- `src/components/SquareShape.tsx` + `SquareShape.test.tsx` — delete
- `src/components/DiamondShape.tsx` + `DiamondShape.test.tsx` — delete
- `src/components/VariantPicker.tsx` + `VariantPicker.test.tsx` — delete
- `src/components/SettingsDialog.tsx` (L8, L95) + `SettingsDialog.test.tsx` — remove `VariantPicker` import, render, and any reset/select test branches
- `src/components/shapeConstants.ts` — keep (consumed by OrbShape); only the docstring comment listing "OrbShape / SquareShape / DiamondShape" updates
- `src/hooks/useVisualVariant.{ts,test.ts}` — delete (D-02)
- `src/hooks/useVariantChoice.{ts,test.ts}` — delete (D-02)
- `src/app/App.tsx` (L35 import; L224 `useVisualVariant`/`liveVariant`; L286-293 sessionVariantRef + state; L295-299 captured-cue NOT touched; L472, L487, L491-492, L509, L557 dep array, L664, L670-671, L819, L869-870, L927 dep array, L938, L1001 comment + JSX L1012/1021/1031) — strip variant capture/render/dep-array threads; replace `<BreathingShape variant={...} />` call sites with `<OrbShape />`
- `src/app/App.session.test.tsx`, `App.audio.test.tsx`, `App.locale.test.tsx`, `App.test.tsx`, `App.wakeLock.test.tsx` — strip variant-axis branches (D-10)
- `src/content/strings.ts` (L46-47, L210-211, L372-373, plus any `settings.variantLabel` rows) — delete `variants` block + `variantLabel` EN + PT-BR rows (D-08)
- `src/styles/theme.css` (L403-470 approx) — delete `[data-variant='square']` and `[data-variant='diamond']` CSS blocks; audit `[data-variant='orb']` if present and drop if the attribute is no longer emitted
- `src/audio/cueSynth.ts` — verify only one reference (L58 comment about "Square wave" oscillator — unrelated to variant; do not change)
- `src/components/NKShape.tsx`, `CueGlyph.tsx`, `CuePicker.tsx`, `TimbrePicker.tsx`, `LanguagePicker.tsx`, `ThemePicker.tsx` — check imports; only delete what specifically references `VisualVariantId` or the dropped pickers
- **NEW** `src/content/content.no-variants.test.ts` (or planner's chosen analog filename) — VAR-06 drift-guard test (D-04..D-07)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/content/content.no-stats-ui.test.ts`** — the load-bearing analog for the VAR-06 drift-guard. Already validated in Phase 37 (1255/1255 tests pass). Same fs-scan loop, same test-file exclusion, same forbidden-token-list shape. Reuse the structure verbatim with a different scoped-roots list (add `src/styles/`) and a different forbidden-token set.
- **Phase 8 D-01 envelope tolerance** — `readEnvelope` spread-then-override pattern preserves unknown keys on disk. Deleting `prefs.variant` from `UserPrefs` does NOT break a returning user with `{prefs: {variant: 'square', ...}}` on disk; the field is just ignored on read and harmlessly preserved on the next write.
- **`OrbShape.tsx`** — kept untouched (Phase 42 will redesign its internals); after this phase it becomes the only shape that the App renders directly.
- **Phase 14 per-field `coerceX` non-throwing pattern** — established by `coerceTheme`/`coerceTimbre`/`coerceCue`/`coerceLocale` in `src/storage/prefs.ts`. After D-01, only four coercers remain in `coercePrefs`; the function shape is otherwise unchanged.

### Established Patterns
- **Typed catalog with frozen-EN guard** (Phase 19 I18N + Phase 26 I18N-07) — removing the `UiStrings.variants` block from the type AND both catalogs is the type-safe clean path; the type system catches every stale consumer at compile time.
- **`LOCKED_COPY` byte-equality guard** (Phase 19) — variant display strings ('Square'/'Diamond'/'Quadrado'/'Losango') are NOT in `LOCKED_COPY`, so deletion is safe without touching that guard.
- **Per-practice + shared chrome split** (Phase 30 PRACTICE-01..06) — variant was shared chrome; deleting it keeps the app-wide chrome surface (theme / timbre / cue / locale) and per-practice slices intact.
- **Atomic commit per logical change scoped `(38)`** (Tiger Style, reinforced by Phase 36/37 PATTERNS) — small, focused commits.
- **Drift-guard-as-lock pattern** (Phase 26 I18N-07, Phase 37 STATS-05) — runtime fs-scan test makes the absence-invariant survive future contributions; deleting the test is the explicit unlock for future re-introduction.

### Integration Points
- **App.tsx render gate** (~L1001-1035) — `{appPhase === 'idle' && (<BreathingShape ... />)}` and the symmetric running/complete paths. Each call site passes `variant={sessionVariant ?? liveVariant}` plus `cue`, `frame`, `leadInDigit`, `strings`. After D-03 they become `<OrbShape cue={sessionCue ?? liveCue} frame={...} leadInDigit={...} strings={strings.breathing} />` — `OrbShape` already accepts this exact prop shape.
- **App.tsx `useVisualVariant` import + `liveVariant` destructure** (L35, L224) — disappears with the hook deletion (D-02). Any dep arrays that include `liveVariant` (e.g. L557, L927) shrink correspondingly.
- **`sessionVariantRef` + `sessionVariant` state machine** (~L292-293, L472, L491-492, L670-671, L819, L869-870, L938) — all capture/clear/setter sites disappear since with one shape there is no capture invariant. VAR-04 satisfied.
- **`SettingsDialog.tsx` (L8 import, L95 render)** — `VariantPicker` line goes; the inner layout comment (L93) updates to "Theme → Cue → Timbre → Language order". `SettingsDialog.test.tsx` likely has `variants` strings shape in fixture data — strip those.
- **Comment debt** — `BreathingShape.tsx` references "Phase 17 D-09/D-10" / `sessionVariantRef`; gone with the file. Any other place that comments about variant capture (`App.tsx` lines 286-293, 487, 509, 670-671, 1001) updates or removes per Tiger Style WHY-only — the WHY no longer applies after a single-shape collapse.

</code_context>

<specifics>
## Specific Ideas

- The drift-guard test (D-04..D-07) is the load-bearing artifact of this phase — it's how "Orb-only" survives Phase 42 + future contributors. Treat as a first-class deliverable.
- VAR-06's "zero leftover references" is the hardest single bit. The drift-guard + a `git grep -i square\|diamond src/` audit at the close of plan execution are the belt-and-suspenders pair.
- Phase 42 will benefit from this phase's cleanup being merciless: any leftover `VisualVariantId` import, dead `[data-variant=...]` selector, or stale string would force Phase 42 to either re-delete it OR thread the new env-driven dispatcher through obsolete scaffolding.

</specifics>

<deferred>
## Deferred Ideas

- **`VITE_BREATHING_SHAPE` dev toggle (V1 orb-halo / V2 minimal-rings)** — Phase 42, not 38. Phase 38 collapses to direct `<OrbShape />`; Phase 42 introduces a new env-driven wrapper that dispatches between two new shape variants. The wrapper-and-toggle pair is Phase 42's surface, not 38's.
- **`VITE_ORB_IDLE_BEHAVIOR` dev toggle (still / ambient)** — Phase 42, not 38.
- **`OrbShape.tsx` redesign (three-layer translucent-halo + solid centre disc, asymmetric border-radii, in-disc breath label)** — Phase 42.
- **REQUIREMENTS.md `coerceSettings` → `coerceVariant` wording fix** — informational tidy; the planner may surface it as a sidecar requirements-correction commit, or defer to a future docs sweep. Doesn't change behavior.
- **`shapeConstants.ts` filename rename** — currently named generically; could become `orbConstants.ts` once Square/Diamond are gone. Tiger Style "small atomic" suggests the rename is incidental; defer unless the planner wants to bundle it.
- **Inner-ring UX symmetry** — already a v1.x carry-forward dropped at v2.0 scoping (PROJECT.md says "naturally superseded by Phase 42 new orb"). Not a Phase 38 concern.

</deferred>

---

*Phase: 38-variant-removal*
*Context gathered: 2026-05-20*
