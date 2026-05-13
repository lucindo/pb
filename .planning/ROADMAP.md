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
- [ ] **Phase 16: Themes** - CSS custom-property token system (`data-theme`); FOUC-prevention inline script; Light / Dark / System + 3 named palettes
- [ ] **Phase 17: Visual Variants** - Orb (default) + 2 alternate visual variants; render-only; disabled while `inSessionView`; reduced-motion contract preserved
- [ ] **Phase 18: Audio Timbres** - 4 synthesized timbre presets wired into `cueSynth`; captured at session start; disabled while `inSessionView`
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
  - [ ] 16-04-PLAN.md — ThemePicker radiogroup UI + App.tsx useTheme wire-up + phase close (REQUIREMENTS/STATE/ROADMAP/SUMMARY) + human visual checkpoint
**UI hint**: yes

### Phase 17: Visual Variants
**Goal**: Users can choose between the default Orb and 2 alternate visual variants; the selection persists and the picker is disabled during active sessions.
**Depends on**: Phase 15
**Requirements**: VARIANT-01, VARIANT-02, VARIANT-03, VARIANT-04, VARIANT-05, VARIANT-06, VARIANT-07
**Success Criteria** (what must be TRUE):
  1. Opening SettingsDialog and selecting a variant (e.g. Square or Ring) immediately updates the visual guide to the selected style when not in session; the Orb default is unchanged for users who never open the picker (zero regression — VARIANT-02).
  2. The variant picker is disabled while `inSessionView` is true; the active variant is captured at session start and does not change mid-session (avoids rAF frame-identity collision — VARIANT-03).
  3. Every variant renders the 3-2-1 lead-in countdown digit correctly through the existing `leadInDigit` prop path (VARIANT-05).
  4. Every variant applies the `prefers-reduced-motion: reduce` fixed-mid-scale + crossfade fallback equivalent to the existing orb contract (VARIANT-04).
  5. Selected variant persists across reloads via `Envelope.prefs.variant`; `tsc && lint && build && test` exit 0 (VARIANT-07).
**Plans**: TBD
**UI hint**: yes

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
**Plans**: TBD

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
**Plans**: TBD
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
| 16. Themes | v1.1 | 3/4 | In Progress|  |
| 17. Visual Variants | v1.1 | 0/? | Not started | - |
| 18. Audio Timbres | v1.1 | 0/? | Not started | - |
| 19. Language Switching | v1.1 | 0/? | Not started | - |
</content>
