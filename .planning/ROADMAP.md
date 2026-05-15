# Roadmap: HRV Breathing WebApp

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 + Phase 5.1 INSERTED (shipped 2026-05-11)
- ✅ **v1.0.1 Code Review Patch** — Phases 7–12 (shipped 2026-05-12)
- 📋 **v1.1 Customization (planned)** — Phases 13–19 — inner-ring UX symmetry warm-up + prefs foundation + SettingsDialog shell + themes (CUST-01) + visual variants (CUST-03) + audio timbres (CUST-02) + language switching (I18N-01)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–6 + 5.1 INSERTED) — SHIPPED 2026-05-11</summary>

- [x] **Phase 1: Configurable Session Timing** (4/4 plans) — completed 2026-05-09
- [x] **Phase 2: Visual Guide & Accessible Responsive Interface** (4/4 plans) — completed 2026-05-09
- [x] **Phase 3: Optional Generated Audio Cues** (5/5 plans) — completed 2026-05-09
- [x] **Phase 4: Local Memory & Practice Stats** (4/4 plans) — completed 2026-05-10
- [x] **Phase 5: Mobile Hands-Off Resilience** (4/4 plans) — completed 2026-05-10 *(S2 Android Chrome UAT carry-forward to v1.x)*
- [x] **Phase 5.1: Hands-Off Resilience Polish (INSERTED 2026-05-10)** (5/5 plans) — completed 2026-05-10 *(iOS audio recovery + Firefox flicker carry-forward to v1.x)*
- [x] **Phase 6: Learning & Claim-Safe Positioning** (4/4 plans) — completed 2026-05-11

Archive: `.planning/milestones/v1.0-ROADMAP.md`
Audit: `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — PASSED 23/23
Requirements: `.planning/milestones/v1.0-REQUIREMENTS.md`

</details>

<details>
<summary>✅ v1.0.1 Code Review Patch (Phases 7–12) — SHIPPED 2026-05-12</summary>

- [x] **Phase 7: Strict Type & Lint Baseline** (4/4 plans) — completed 2026-05-11 — `tsconfig` strict + `strictTypeChecked` + `exhaustive-deps` error enforcement; 48 production lint errors fixed inline.
- [x] **Phase 8: Storage Forward-Compat & Cross-Tab UI Sync** (2/2 plans) — completed 2026-05-11 — Envelope spread-then-override, refuse-downgrade write, cross-tab `storage` listener.
- [x] **Phase 9: Audio + Wake Lock Lifecycle Hardening** (2/2 plans) — completed 2026-05-11 — Reconstruction generation counter, boundary-cue clamp, lead-in null-on-closed, per-cue node disconnect, defensive state-change handler, dead `'starting'` removal, wake-lock in-flight guard.
- [x] **Phase 10: Hooks Identity & Effect Hygiene** (2/2 plans) — completed 2026-05-12 — `mutedRef` stabilization, status-only deps on App rAF effects, per-phase frame identity, rAF cancel-guard ordering, explicit ref-updater deps.
- [x] **Phase 11: Domain, UI Contracts & Accessibility** (1/1 plans) — completed 2026-05-12 — Boundary validation in `extendTimedSession`, `SessionReadout` lead-in placeholder, symmetric auto-close for Learn/Reset dialogs, `MuteToggle` resume-mode a11y.
- [x] **Phase 12: Assets, Content & Hygiene Cleanup** (1/1 plans) — completed 2026-05-12 — Favicon `%BASE_URL%` fix, canonical amazon.com book URL, `isValid<X>` predicate relocation to `domain/settings`, `formatLastSessionDate` JSDoc, HYGIENE-01 docs-only flip (Overtaken by Phase 9 AUDIO-02).

Archive: `.planning/milestones/v1.0.1-ROADMAP.md`
Audit: `.planning/milestones/v1.0.1-MILESTONE-AUDIT.md` — PASSED 27/27
Requirements: `.planning/milestones/v1.0.1-REQUIREMENTS.md`
Phase artifacts: `.planning/milestones/v1.0.1-phases/`

</details>

### 📋 v1.1 Customization (planned)

- [x] **Phase 13: Inner-Ring UX Symmetry** - Reduced-motion inner-ring suppression — `.orb-layer--out` crossfade restored as sole substitute phase cue (completed 2026-05-12)
- [x] **Phase 14: Prefs Foundation** - Envelope `prefs?` field extension; `isValid*` / `coerce*` predicates for all four customization dimensions (completed 2026-05-12)
- [x] **Phase 15: SettingsDialog Shell** - Native `<dialog>` gear-triggered settings panel with stub pickers; `inSessionView` disable contract (completed 2026-05-13)
- [x] **Phase 16: Themes** - CSS custom-property token system (`data-theme`); FOUC-prevention inline script; Light / Dark / System + 3 named palettes (completed 2026-05-13)
- [x] **Phase 16.1: UI Token Migration (INSERTED 2026-05-13)** - Migrate hardcoded `text-slate-*`/`bg-teal-*`/`border-teal-*`/`text-white`/`bg-white` classes across ~16 components (Start/Stop button, dialogs, stepper, pickers) to `var(--color-breathing-*)` tokens so theme swaps rebind the full UI, not just the ThemePicker selected option (completed 2026-05-13)
- [x] **Phase 16.2: Palette Aesthetic Refresh (INSERTED 2026-05-13)** - UAT carry-forward from 16.1 plan 06: re-tune orb In/Out gradients per palette — Light Out (#f97316 too saturated), Moss Out (#3b82f6 too vivid blue), Slate Out (#6366f1 too vivid indigo), Dusk In (#ede9fe → #faf5ff too bright), Dusk Out (#d97706 softening). Pure theme.css palette retune; no .tsx touch (completed 2026-05-13 — smoke + text-legibility UAT approved; perceptual aesthetic UAT deferred to Phase 16.3 thorough theme revision)
- [x] **Phase 16.3: Thorough Theme Revision (INSERTED 2026-05-13)** - Interactive per-palette redesign sourcing each palette from a vetted open-source design system (Light=Nord Frost, Dark=Nord Polar Night, Moss=Everforest Light medium, Slate=Tokyo Night Day, Dusk=Rosé Pine Main). Replaces 16.1/16.2 ad-hoc aesthetic results with deliberately-curated palettes. Per-palette task cadence + per-palette UAT before commit. Honors THEME-05 ≥ per-palette floor and THEME-UI-01 token-binding contract. Closes ring-inner harmonization carry-forwards for Moss + Slate (completed 2026-05-13).
- [x] **Phase 17: Visual Variants** - Orb (default) + 2 alternate visual variants (Square + Diamond); render-only; disabled while `inSessionView`; reduced-motion contract preserved; sessionVariantRef capture-at-Start (D-09/D-10) — completed 2026-05-14
- [x] **Phase 18: Audio Timbres** - 4 synthesized timbre presets wired into `cueSynth`; captured at session start; disabled while `inSessionView` (completed 2026-05-14)
- [ ] **Phase 19: Language Switching** - EN + PT-BR; instant React state swap; locked claim-safe copy routed through translation pipeline with guardrail mechanism

## Phase Details

### Phase 13: Inner-Ring UX Symmetry
**Goal**: Under `prefers-reduced-motion: reduce`, the inner reference ring (`.orb-ring--inner`) is no longer rendered — the `.orb-layer--out` opacity crossfade remains the sole reduced-motion phase indicator (D-07 preserved).
**Depends on**: Phase 12 (v1.0.1 baseline — all phases complete)
**Requirements**: WARMUP-01
**Success Criteria** (what must be TRUE):
  1. Under `prefers-reduced-motion: reduce`, the inner reference ring is not drawn in any state (Out, In, lead-in).
  2. Out-phase inner-ring behavior under **normal motion** is pixel-identical to v1.0.1 baseline (only the reduced-motion branch changes).
  3. The change touches only CSS and `BreathingShape.tsx`; no storage, audio, timing, or hook files are modified.
  4. `tsc && lint && build && test` exit 0 after the change (per-commit green-gate maintained).
**Plans**: TBD
**UI hint**: yes

### Phase 14: Prefs Foundation
**Goal**: The storage envelope accepts customization preferences and the domain layer enforces valid values for every customization dimension, unblocking all downstream feature phases.
**Depends on**: Phase 13
**Requirements**: INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. Writing an `Envelope` with a `prefs` field round-trips correctly through `readEnvelope` / `writeEnvelope` without losing unknown fields (D-01 spread-then-override contract preserved).
  2. `isValidTheme`, `isValidTimbre`, `isValidVariant`, and `isValidLocale` predicates live in `src/domain/settings.ts` alongside existing `isValidBpm`/`isValidRatio`/`isValidDuration`; each rejects unknown values and accepts all valid enum members.
  3. `coerceTheme`, `coerceTimbre`, `coerceVariant`, and `coerceLocale` functions fall back to their respective `DEFAULT_*` constants when the stored value fails the predicate (non-throwing; same pattern as existing `coerceSettings`).
  4. All new predicates and coercers have Vitest coverage; `tsc && lint && build && test` exit 0.
**Plans**: 1 plan (single plan / single wave / three commits per D-13) — COMPLETE (plan 01: b4563aa, b156d03, 784c215)

### Phase 15: SettingsDialog Shell
**Goal**: A gear control in the idle/stopped view opens a native `<dialog>` settings panel that hosts stub pickers for all four customization dimensions, enforcing the `inSessionView` disable contract before any feature picker is wired.
**Depends on**: Phase 14
**Requirements**: INFRA-04
**Success Criteria** (what must be TRUE):
  1. A gear icon control is visible and reachable (keyboard + pointer) in the idle/stopped view; it is absent or hidden during an active session (`inSessionView` = true).
  2. Activating the gear control opens the `SettingsDialog`; focus is trapped inside the dialog (native `<dialog>` behavior); closing with Escape or a close button returns focus to the trigger.
  3. All four picker placeholders (theme, timbre, variant, language) render inside the dialog with stub labels and are visually disabled while `inSessionView` is true.
  4. The dialog pattern follows the native `<dialog>` + locked-copy conventions of `ResetStatsDialog` / `LearnDialog`; no new library dependency is introduced.
  5. `tsc && lint && build && test` exit 0.
**Plans**: 4 plans
  - [x] 15-01-PLAN.md — SettingsAnchor (gear trigger button, 44×44, aria-disabled in session)
  - [x] 15-02-PLAN.md — Four picker stubs (Theme/Variant/Timbre/Language; loadPrefs read-only)
  - [x] 15-03-PLAN.md — SettingsDialog shell (native <dialog>, Esc/backdrop/Close, picker disable threading)
  - [x] 15-04-PLAN.md — App.tsx integration + phase close (state/callbacks/JSX + REQUIREMENTS/STATE/ROADMAP/SUMMARY)
**UI hint**: yes

### Phase 16: Themes
**Goal**: Users can switch among Light, Dark, System, and 3 named palette themes; the chosen theme persists across reloads and is applied before first paint.
**Depends on**: Phase 15
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04, THEME-05
**Success Criteria** (what must be TRUE):
  1. Opening SettingsDialog and selecting Light, Dark, or System immediately applies the corresponding visual palette; System mode tracks the OS `prefers-color-scheme` media query without a manual override.
  2. Selecting any of the 3 named palettes (e.g. Moss, Slate, Dusk) applies the palette instantly via `data-theme` attribute on `<html>`; no utility class changes are needed in TSX.
  3. After a page reload, the previously selected theme is applied before React hydration (FOUC-prevention inline script in `index.html`; no visible flash of default theme).
  4. Under `prefers-reduced-motion: reduce`, the `.orb-layer--in` and `.orb-layer--out` opacity-crossfade hues remain perceptually distinguishable for every shipped theme (reduced-motion contrast contract preserved, per THEME-05).
  5. Zero new npm dependencies are introduced; `tsc && lint && build && test` exit 0.
**Plans**: 4 plans
  - [x] 16-01-PLAN.md — theme.css token overrides (Light @theme + Dark/Moss/Slate/Dusk [data-theme] blocks) + THEME-05 contrast guard test
  - [x] 16-02-PLAN.md — useTheme orchestrator hook + useThemeChoice picker setter hook + hook tests
  - [x] 16-03-PLAN.md — index.html FOUC inline script + storage.ts SYNC comment
  - [x] 16-04-PLAN.md — ThemePicker radiogroup UI + App.tsx useTheme wire-up + phase close
**UI hint**: yes

### Phase 16.1: UI Token Migration (INSERTED 2026-05-13)
**Goal**: Hardcoded color classes across user-facing components are migrated from Tailwind utility colors (`text-slate-*`, `bg-teal-*`, `border-teal-*`, `text-white`, `bg-white`) to `data-theme`-aware `var(--color-breathing-*)` tokens so a theme swap rebinds the full interface — not just the ThemePicker selected option.
**Depends on**: Phase 16
**Requirements**: THEME-UI-01 (added to REQUIREMENTS.md by plan 16.1-01)
**Reason for insertion**: Phase 16 human-verify checkpoint surfaced that data-theme swap leaves most UI elements visually unchanged because consumers reference fixed teal/slate Tailwind utilities instead of the new `--color-breathing-*` tokens. THEME-01..05 functional contracts pass, but user-perceived "theming" is broken. Inserted as gap closure before Phase 17 so visual variants build on a fully token-bound surface.
**Success Criteria** (what must be TRUE):
  1. Switching to Dark, Moss, Slate, or Dusk visibly rebinds the Start/Stop button, SettingsStepper, EndSessionDialog, ResetStatsDialog, LearnDialog, SettingsDialog chrome, ThemePicker unselected buttons, and other surveyed pickers — not just the ThemePicker selected option.
  2. No production component references a literal `text-slate-[0-9]`, `bg-slate-[0-9]`, `border-slate-[0-9]`, `text-teal-[0-9]`, `bg-teal-[0-9]`, `border-teal-[0-9]`, `text-white`, `bg-white`, `text-black`, or `bg-black` Tailwind class (verified via grep on `src/**/*.tsx`).
  3. All 5 concrete palettes (light, dark, moss, slate, dusk) continue to clear the THEME-05 ≥ 1.5 WCAG luminance contrast floor — no token re-tune regresses the existing automated guard.
  4. Zero new npm dependencies; `tsc && lint && build && test` exit 0 at every commit boundary.
  5. The accessibility surface (focus-visible rings, hit-area floors, aria-* attributes) is preserved across the migration — class composition changes only, not semantics.
**Plans**: 7 plans
  - [x] 16.1-01-PLAN.md — Wave 0 preflight: THEME-UI-01 in REQUIREMENTS + D-02 alpha-modifier probe + D-01 `--color-breathing-on-accent` token (5 palettes) + contrast guard extension (accent-strong vs on-accent) + D-04 regression-guard scaffold (RED, skipped)
  - [x] 16.1-02-PLAN.md — Wave 1 dialog chrome (Group B): SettingsDialog + EndSessionDialog + ResetStatsDialog + LearnDialog tokenized (~22 occurrences); destructive red preserved
  - [x] 16.1-03-PLAN.md — Wave 1 pickers (Group D): ThemePicker (closes WR-01 unselectedClasses) + TimbrePicker + VariantPicker + LanguagePicker labels and ternaries
  - [x] 16.1-04-PLAN.md — Wave 1 anchors + stepper + mute (Group P-STATE): SettingsAnchor + LearnAnchor (Reference site C migration shape) + SettingsStepper + MuteToggle; 3 of 5 D-02 alpha sites
  - [x] 16.1-05-PLAN.md — Wave 1 page chrome (Group E): App.tsx (5 sites incl. card-surface alpha) + BreathingShape (phase label + lead-in digit) + SessionReadout (7 sites incl. 2 alpha)
  - [x] 16.1-06-PLAN.md — Wave 2 primary action (Group A): SessionControls Start/Stop both layouts; first D-01 `--color-breathing-on-accent` consumer; per-palette UAT (approved post-remediation; F2+F3 fixed inline; F1/F4/F5/F6/F7 deferred to Phase 16.2)
  - [x] 16.1-07-PLAN.md — Wave 3 phase close: src/index.css D-03 + destructive text-white -> on-accent + guard test flip RED->GREEN + REQUIREMENTS/STATE/ROADMAP updates + SUMMARY
**UI hint**: yes

### Phase 16.2: Palette Aesthetic Refresh (INSERTED 2026-05-13)
**Goal**: Re-tune the per-palette orb In/Out gradient hex values in `src/styles/theme.css` so each palette's breathing-shape gradient feels visually integrated with its chrome — closing the 5 aesthetic findings raised in Phase 16.1 plan 06 per-palette UAT.
**Depends on**: Phase 16.1
**Requirements**: none (aesthetic polish — no new requirement; honors existing THEME-05 ≥ 1.5 contrast guard)
**Reason for insertion**: Phase 16.1 plan 06 per-palette UAT raised 7 findings. 2 (F2 link-tier collision, F3 dark lead-in digit) were 16.1-caused and fixed inline. 5 (F1/F4/F5/F6/F7) are Phase 16 palette retuning, explicitly out of 16.1 scope per CONTEXT.md.
**Findings to address:**
  - F1 Light Out: `--color-orb-out-from: #f97316` / `to: #fed7aa` — too saturated vs soft light palette
  - F4 Moss Out: `--color-orb-out-from: #3b82f6` / `to: #bfdbfe` — vivid blue clashes with moss greens
  - F5 Slate Out: `--color-orb-out-from: #6366f1` / `to: #a5b4fc` — vivid indigo too strong vs slate-grey
  - F6 Dusk In: `--color-orb-in-from: #ede9fe` / `to: #faf5ff` — near-white too bright vs deep purple
  - F7 Dusk Out: `--color-orb-out-from: #d97706` / `to: #fcd34d` — better but room to soften
**Success Criteria** (what must be TRUE):
  1. Each palette's orb In/Out gradient feels integrated with its chrome tokens (per-palette manual UAT approval — 5/5 palettes).
  2. THEME-05 ≥ 1.5 luminance contrast guard holds across all 5 palettes after retune (`theme.contrast.test.ts` exits 0).
  3. Changes touch ONLY `src/styles/theme.css` orb-{in,out}-{from,to,text} CSS custom properties; no `.tsx` files modified.
  4. `tsc && lint && build && test` exit 0; `theme.no-hardcoded-classes.test.ts` guard remains green.
**Plans**: 2 plans
  - [x] 16.2-01-PLAN.md — Retune Light/Moss/Slate Out + Dusk In/Out gradients (closes F1/F4/F5/F6/F7); THEME-05 ≥ 1.5 contrast guard re-verified (completed 2026-05-13 — 4 commits 565581a/fffa7ac/5eb446e/cc58998; ratios Light 1.59, Dark 4.85, Moss 2.36, Slate 3.68, Dusk 1.85)
  - [x] 16.2-02-PLAN.md — Smoke + text-legibility UAT (perceptual aesthetic UAT deferred to Phase 16.3 per operator decision) + phase close (STATE/ROADMAP/SUMMARY updates) (completed 2026-05-13)
**UI hint**: yes

### Phase 16.3: Thorough Theme Revision (INSERTED 2026-05-13)
**Goal**: Replace each palette's chrome + orb tokens with a deliberately-curated palette grounded in a named open-source design system (one source reference per theme — user supplies, agent maps). Interactive theme-by-theme execution with per-palette UAT before commit.
**Depends on**: Phase 16.2
**Requirements**: none (aesthetic redesign — honors existing THEME-05 ≥ 1.5 contrast guard and THEME-UI-01 token-binding contract)
**Reason for insertion**: Phase 16.2 closed with automated contrast gates green but perceptual UAT deferred. Operator opted for a thorough redesign sourcing each palette from a vetted open-source design system rather than continuing ad-hoc ratio-driven tuning. Replaces 16.1/16.2 aesthetic results with intentional curated palettes.
**Approach**: Interactive per-palette workflow. For each of 5 palettes (Light, Dark, Moss, Slate, Dusk) the operator names an open-source design-system reference (e.g. Catppuccin Frappe → Dark); the agent extracts the source palette via web fetch + research, maps chrome and orb tokens, runs THEME-05 contrast guard, presents a UAT smoke + visual integration check, then commits per-palette (B1 bisect cadence preserved from 16.2).
**Success Criteria** (what must be TRUE):
  1. Each palette's chrome + orb tokens are derived from a named open-source design system; the system + citation is recorded in the phase SUMMARY.
  2. THEME-05 ≥ 1.5 luminance contrast guard holds across all 5 palettes (`theme.contrast.test.ts` exits 0).
  3. THEME-UI-01 hardcoded-class guard remains green (`theme.no-hardcoded-classes.test.ts` exits 0 — no .tsx files touched).
  4. Per-palette UAT approval — 5/5 perceptual gate (the perceptual gate deferred from 16.2 is satisfied here against curated palettes, not ad-hoc retunes).
  5. `tsc && lint && build && test` exit 0 at every commit boundary (per-commit green-gate).
**Plans**: 7 plans
  - [x] 16.3-01-PLAN.md — Wave 0 preflight: pre-phase baseline (5 palette ratios + per-block md5) + mapping rubric dry-run worked example (Catppuccin Frappé → Dark default)
  - [x] 16.3-02-PLAN.md — Light palette redesign from Nord (Frost flavor) (interactive)
  - [x] 16.3-03-PLAN.md — Dark palette redesign from Nord (Polar Night flavor) (interactive)
  - [x] 16.3-04-PLAN.md — Moss palette redesign from Everforest (Light medium) (interactive); closes 16.2-01 ring-inner harmonization carry-forward
  - [x] 16.3-05-PLAN.md — Slate palette redesign from Tokyo Night Day (interactive); closes 16.2-01 ring-inner harmonization carry-forward
  - [x] 16.3-06-PLAN.md — Dusk palette redesign from Rosé Pine Main (interactive; coupled In+Out tune)
  - [x] 16.3-07-PLAN.md — Phase close: 16.3-SUMMARY.md + STATE/ROADMAP updates
**UI hint**: yes

### Phase 17: Visual Variants
**Goal**: Users can choose between the default Orb and 2 alternate visual variants; the selection persists and the picker is disabled during active sessions.
**Depends on**: Phase 15
**Requirements**: VARIANT-01, VARIANT-02, VARIANT-03, VARIANT-04, VARIANT-05, VARIANT-06, VARIANT-07
**Status**: Complete (2026-05-14)
**Success Criteria** (what must be TRUE):
  1. Opening SettingsDialog and selecting a variant (Square or Diamond) immediately updates the visual guide to the selected style when not in session; the Orb default is unchanged for users who never open the picker (zero regression — VARIANT-02).
  2. The variant picker is disabled while `inSessionView` is true; the active variant is captured at session start and does not change mid-session (avoids rAF frame-identity collision — VARIANT-03).
  3. Every variant renders the 3-2-1 lead-in countdown digit correctly through the existing `leadInDigit` prop path (VARIANT-05).
  4. Every variant applies the `prefers-reduced-motion: reduce` fixed-mid-scale + crossfade fallback equivalent to the existing orb contract (VARIANT-04).
  5. Selected variant persists across reloads via `Envelope.prefs.variant`; `tsc && lint && build && test` exit 0 (VARIANT-07).
**Plans**: 6 plans
  - [x] 17-01-PLAN.md — CSS + TSX + test-selector rename `.orb-ring--{outer,inner}` → `.shape-marker--{outer,inner}` (D-15 atlas): theme.css rule selectors + BreathingShape.tsx classNames + BreathingShape.test.tsx + App.session.test.tsx querySelectors
  - [x] 17-02-PLAN.md — OrbShape extraction from BreathingShape (verbatim Body + LeadIn move + `data-variant='orb'` attribute on roots + shapeConstants.ts MIN/MID/MAX_SCALE module + BreathingShape slimmed to pass-through + test migration)
  - [x] 17-03-PLAN.md — SquareShape (rounded-square 18%) + DiamondShape (rotated-square clip-path geometry) + 6 `[data-variant]` CSS overrides in theme.css (D-13 token reuse — no new color tokens). Note: originally planned as RingShape; swapped to DiamondShape during Plan 06 operator UAT iteration.
  - [x] 17-04-PLAN.md — useVisualVariant orchestrator hook (cross-tab `storage` + same-tab `'hrv:prefs-changed'` filtered on `detail.key === 'variant'`, no global attribute write per D-16) + useVariantChoice picker setter hook (verbatim mirror of useThemeChoice with type substitutions)
  - [x] 17-05-PLAN.md — BreathingShape full 3-way dispatcher (optional `variant?` prop, default `'orb'`, switch with Orb default fallback per defense-in-depth) + VariantPicker radiogroup body with inline shape swatches (Option A CSS-only for Orb + Square; polygon SVG for Diamond)
  - [x] 17-06-PLAN.md — App.tsx integration (useVisualVariant invocation + sessionVariantRef snapshot at startSession per D-10 + clear on session end + BreathingShape `variant={sessionVariantRef.current ?? liveVariant}` prop) + App.session.test.tsx VARIANT-03 capture-at-Start coverage + operator UAT (5 palettes × 3 variants + reduced-motion + cross-tab) + Ring → Diamond UAT deviation (6 commits) + phase close (REQUIREMENTS/ROADMAP/STATE/SUMMARY)
**UI hint**: yes
**UAT deviation**: Operator UAT-driven swap — variant 3 changed from Ring (annulus radial-gradient) to Diamond (rotated-square via clip-path on body + inscribed rotated-square markers via CSS-only override). `VisualVariantId` is `'orb' | 'square' | 'diamond'`. Old `'ring'` localStorage values coerce to `DEFAULT_VARIANT = 'orb'`.

### Phase 18: Audio Timbres
**Goal**: Users can choose among 4 named synthesized timbre presets; the selection is captured at session start and persists across reloads.
**Depends on**: Phase 15
**Requirements**: TIMBRE-01, TIMBRE-02, TIMBRE-03, TIMBRE-04, TIMBRE-05
**Success Criteria** (what must be TRUE):
  1. Opening SettingsDialog and selecting Bowl, Bell, Sine, or Chime changes the audio character of the session cues; Bowl default is byte-identical to v1.0.1 behavior for users who never open the picker (zero regression — TIMBRE-02).
  2. The timbre picker is disabled while `inSessionView` is true; the active timbre is captured at session start and is not swapped mid-session (avoids AUDIO-01 reconstruction-race risk — TIMBRE-03).
  3. Each timbre preserves the A4 (In) / A3 (Out) fundamental-frequency distinction within its own timbral character; In cues are perceptually higher than Out cues for every preset (TIMBRE-05).
  4. Selected timbre persists across reloads via `Envelope.prefs.timbre`; coerce-on-read falls back to `'bowl'` for unknown stored values (TIMBRE-04).
  5. Zero sample files or new npm dependencies are introduced; `FakeAudioContext` tests cover new `TimbrePreset` paths; `tsc && lint && build && test` exit 0.
**Plans**: 6 plans
  - [x] 18-01-PLAN.md — NEW `src/audio/timbres.ts` pure-data preset module (TimbrePreset interface + TIMBRE_PRESETS record; Bowl verbatim move per D-02; Bell/Sine/Chime per D-03/D-04/D-05; TIMBRE-05 A4/A3 invariant guard test per D-21) — TIMBRE-01/02/05
  - [x] 18-02-PLAN.md — NEW `src/hooks/useTimbreChoice.ts` picker-side hook (verbatim mirror of useVariantChoice with variant→timbre substitutions; CustomEvent `detail.key === 'timbre'` per D-18) — TIMBRE-04
  - [x] 18-03-PLAN.md — EDIT `src/audio/cueSynth.ts` (parameterize scheduleBowlCue + scheduleInCueForTimbre / scheduleOutCueForTimbre dispatch; KEEP scheduleInCue/scheduleOutCue as Bowl-only wrappers per D-01 option (a); scheduleTick UNCHANGED per D-07) + EDIT `src/audio/audioEngine.ts` (AudioEngineOptions.timbre required + sessionTimbre closure capture per D-08 + scheduleLeadIn/scheduleNextCue forward via dispatch) — TIMBRE-01/02/05
  - [x] 18-04-PLAN.md — EDIT `src/hooks/useAudioCues.ts` (timbreRef mirror of mutedRef + start(plan, timbre) pre-await capture per D-08 + reconstructEngine reads timbreRef.current per D-11) — TIMBRE-01/03
  - [x] 18-05-PLAN.md — EDIT `src/components/TimbrePicker.tsx` fill stub body (verbatim mirror of ThemePicker radiogroup + useTimbreChoice consumer per D-06; THEME-UI-01 token-binding preserved per D-19; 44×44 + a11y per D-20) — TIMBRE-01/04
  - [x] 18-06-PLAN.md — EDIT `src/app/App.tsx` (onStartClick reads loadPrefs().timbre and passes to audioStart(plan, capturedTimbre) per D-09/D-10; no sessionTimbreRef / no useAudioTimbre orchestrator per D-08/D-09) + App.session.test.tsx TIMBRE-03 capture-at-Start coverage + phase close (REQUIREMENTS/ROADMAP/STATE/SUMMARY) — TIMBRE-01..05
**UI hint**: yes

### Phase 19: Language Switching
**Goal**: Users can switch between English and PT-BR; the language switch is instant, does not interrupt a running session, and locked claim-safe copy is guarded against silent weakening by future locale contributions.
**Depends on**: Phase 15
**Requirements**: I18N-01, I18N-02, I18N-03, I18N-04, I18N-05, I18N-06, I18N-07
**Success Criteria** (what must be TRUE):
  1. Selecting PT-BR from the SettingsDialog immediately re-renders all UI labels (buttons, dialog copy, stats labels, settings form labels) in Portuguese without a page reload; the running breath loop is unaffected (I18N-02).
  2. The language picker is disabled while `inSessionView` is true (I18N-02 in-session guard); EN is the default and existing behavior is unchanged for users who never open the picker.
  3. Selected language persists across reloads via `Envelope.prefs.locale`; coerce-on-read falls back to `'en'` for unknown stored values (I18N-03).
  4. The Forrest claim-safe copy (`inspired by Forrest's teachings` and the two-line disclaimer) is routed through the PT-BR translation pipeline; a translation-key allowlist or locked-copy review checklist is present in the codebase so future locale contributions cannot silently alter D-12 positioning (I18N-06 guardrail — D-12 decision honored).
  5. PT-BR translations are present for v1.1 ship with `// TODO: native-speaker review` flags marking machine-translated strings as v1.x carry-forward (I18N-07); `tsc && lint && build && test` exit 0.
**Plans**: 9 plans
  - [x] 19-01-PLAN.md — strings.ts catalog (UiStrings interface + UI_STRINGS EN+PT-BR + LOCALE_DISPLAY_NAMES) + exhaustiveness tests
  - [x] 19-02-PLAN.md — useLocaleChoice picker-side hook (verbatim clone of useTimbreChoice with timbre→locale rename) + 6 hook tests
  - [x] 19-03-PLAN.md — learnContent locale-keyed shape + EN substring strip + PT-BR translation + lockedCopy module (3 entries × 2 locales) + frozen-EN snapshot guard test (D-02 .toBe byte-equality) + substring-absence guard
  - [x] 19-04-PLAN.md — useLocale orchestrator hook (3 effects: documentElement.lang write + cross-tab storage listener + same-tab hrv:prefs-changed listener) + 8 hook tests
  - [x] 19-05-PLAN.md — LanguagePicker radiogroup body (mirror of TimbrePicker chrome with LOCALE_DISPLAY_NAMES endonyms) + 9 picker tests including D-14 cross-UI endonym invariant
  - [x] 19-06-PLAN.md — Dialogs + anchors + toggle + pickers accept strings prop (9 components: SettingsDialog/EndSession/ResetStats/SettingsAnchor/LearnAnchor/MuteToggle/Theme/Variant/Timbre/LanguagePicker sectionLabel widening)
  - [x] 19-07-PLAN.md — Form + footer + controls + breathing accept strings prop (8 components: SettingsForm/SettingsStepper/SessionControls/StatsFooter/SessionReadout/BreathingShape/Orb/Square/DiamondShape); D-15 template-fn aria-labels; Path A wedge for phase label
  - [ ] 19-08-PLAN.md — App.tsx wires useLocale + resolves catalogs + drills slices to 15 consumers; App.tsx:686 medical-advice migrated to lockedCopy.medicalAdviceLine; LearnDialog accepts learnContent + lockedCopy + strings props with locked-phrase paragraph composition
  - [ ] 19-09-PLAN.md — Phase close: App.locale.test.tsx integration smoke + manual UAT (cross-tab mid-session swap + PT-BR spot-check + persistence + in-session disable) + REQUIREMENTS/ROADMAP/STATE flips + SUMMARY + UAT log
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Configurable Session Timing | v1.0 | 4/4 | Complete | 2026-05-09 |
| 2. Visual Guide & Accessible Responsive Interface | v1.0 | 4/4 | Complete | 2026-05-09 |
| 3. Optional Generated Audio Cues | v1.0 | 5/5 | Complete | 2026-05-09 |
| 4. Local Memory & Practice Stats | v1.0 | 4/4 | Complete | 2026-05-10 |
| 5. Mobile Hands-Off Resilience | v1.0 | 4/4 | Complete | 2026-05-10 |
| 5.1. Hands-Off Resilience Polish | v1.0 | 5/5 | Complete | 2026-05-10 |
| 6. Learning & Claim-Safe Positioning | v1.0 | 4/4 | Complete | 2026-05-11 |
| 7. Strict Type & Lint Baseline | v1.0.1 | 4/4 | Complete | 2026-05-11 |
| 8. Storage Forward-Compat & Cross-Tab UI Sync | v1.0.1 | 2/2 | Complete | 2026-05-11 |
| 9. Audio + Wake Lock Lifecycle Hardening | v1.0.1 | 2/2 | Complete | 2026-05-11 |
| 10. Hooks Identity & Effect Hygiene | v1.0.1 | 2/2 | Complete | 2026-05-12 |
| 11. Domain, UI Contracts & Accessibility | v1.0.1 | 1/1 | Complete | 2026-05-12 |
| 12. Assets, Content & Hygiene Cleanup | v1.0.1 | 1/1 | Complete | 2026-05-12 |
| 13. Inner-Ring UX Symmetry | v1.1 | 1/1 | Complete   | 2026-05-12 |
| 14. Prefs Foundation | v1.1 | 1/1 | Complete | 2026-05-12 |
| 15. SettingsDialog Shell | v1.1 | 4/4 | Complete    | 2026-05-13 |
| 16. Themes | v1.1 | 5/4 | Complete    | 2026-05-13 |
| 16.1. UI Token Migration | v1.1 | 7/7 | Complete | 2026-05-13 |
| 16.2. Palette Aesthetic Refresh | v1.1 | 2/2 | Complete | 2026-05-13 |
| 16.3. Thorough Theme Revision | v1.1 | 7/7 | Complete | 2026-05-13 |
| 17. Visual Variants | v1.1 | 6/6 | Complete | 2026-05-14 |
| 18. Audio Timbres | v1.1 | 6/6 | Complete    | 2026-05-14 |
| 19. Language Switching | v1.1 | 7/9 | In Progress|  |
