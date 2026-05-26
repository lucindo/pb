# Phase 48: Appearance page + i18n - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship a new full-page **Appearance** surface — a sibling page to the existing **App Settings** page — that exposes the four feature-flag preferences that Phase 47 just made persistable (`breathingShape`, `ringCue`, `orbIdle`, `switcherIcon`) to end users. The page is reached from a `>` right-chevron added to the App Settings TopAppBar trailing slot. Two sections — **Orb Style** (Orb segmented picker + Ring cue segmented picker) and **Visual** (Breathing effect toggle + Switcher icons toggle) — composed entirely from existing primitives (`SegmentedControl`, `SettingsToggleRow`, `PageShell`, `TopAppBar`, `IconButton`, `ChevronRightIcon`, `ChevronBackIcon`). Changes apply live across the app via the Phase 47 choice hooks. Every new EN string ships with a PT-BR draft carrying `// TODO: native-speaker review` per the Phase 26 workflow.

**Touches (planned, not implemented in this phase):**

- `src/app/pages/AppearancePage.tsx` (new) + `AppearancePage.test.tsx` — the new page surface.
- `src/app/pages/AppSettingsPage.tsx` — add right-chevron `IconButton` (using existing `ChevronRightIcon` + existing `trailing` slot on `TopAppBar`); extend `onAppearanceOpen` prop + conditional focus on mount via a sentinel from `useAppNavigation`.
- `src/app/useAppNavigation.ts` (+ `.test.tsx`) — extend `AppScreen` union to add `'appearance'`; add `onAppearanceOpen` + `onBackToAppSettings` callbacks; add `returningFromAppearance` sentinel for focus restoration.
- `src/app/appViewModel.ts` + `appControllerAdapters.ts` (+ `.test.ts`) — propagate the new callbacks + sentinel through the view-model surface.
- `src/app/ScreenRouter.tsx` (+ `.test.tsx`) — add fourth `case 'appearance':` dispatch.
- `src/components/OrbPicker.tsx` (new) + `OrbPicker.test.tsx` — mirrors `LanguagePicker` verbatim; binds to `useBreathingShapeChoice`.
- `src/components/RingCuePicker.tsx` (new) + `RingCuePicker.test.tsx` — mirrors `LanguagePicker` verbatim; binds to `useRingCueChoice`.
- `src/content/strings.ts` — extend `UiStrings` with the `appearance.*` namespace + add EN catalog + add PT-BR catalog (with `// TODO: native-speaker review` markers); rename `appSettings.sections.appearance` → `appSettings.sections.theme` (EN + PT-BR).
- `src/components/SettingsPanelBody.tsx` — update one prop reference from `strings.appSettings.sections.appearance` → `strings.appSettings.sections.theme`.

**Strict non-goals for this phase** (deferred or out of scope):

- No new design-system primitive. No extension of `SettingsToggleRow` for sub-descriptions. No new `SectionCard` variant (reuse the inline pattern from `SettingsPanelBody`).
- No relocation of `ThemePicker` — it stays in the App Settings "Theme" section (renamed from "Appearance"). The new Appearance page does not touch theme.
- No relocation of the existing `CuePicker` (inhale/exhale text/arrow/nose) — it stays in the App Settings "Feedback" section. The new "Ring cue" picker (arc/rings) is a separate control.
- No PT-BR native-speaker pass (deferred to I18N-04 Future Requirement — separate operator pass per Phase 26 D-01 pattern).
- No env-var fallback or build-time toggle for the new controls (Phase 47 already promoted the four flags to persisted prefs; query string remains the per-tab dev override).
- No per-practice override of the four flags (app-wide chrome only — reaffirms Phase 47 D-12 deferred decision).
- No URL hash / browser-history integration (`ScreenRouter` is in-memory state today; not bumping that scope).
- No live-preview affordance beyond the actual live application via `useFeatureFlags` (APPEAR-05 is satisfied by the existing reactive choice-hook + same-tab `hrv:prefs-changed` event flow shipped in Phase 47).

</domain>

<decisions>
## Implementation Decisions

### Naming collisions

- **D-01:** Rename the existing App Settings section header `Appearance` → `Theme`. Frees the `Appearance` name for the new page. The section today contains only `ThemePicker`, so `Theme` is more accurate. EN + PT-BR string update only — rename the key `appSettings.sections.appearance` → `appSettings.sections.theme` in `UiStrings` and update the single consumer in `SettingsPanelBody.tsx`. PT-BR: `Aparência` → `Tema`.
- **D-02:** The new Appearance-page picker that controls `ringCue` is labeled **`Ring cue`** (not just `Cue` as the roadmap text suggests). Disambiguates from the existing **`Cue style`** picker under App Settings → Feedback (which controls inhale/exhale cue: text / arrow / nose). The label matches the internal `ringCue` identifier and the spike-011 vocabulary.

### EN copy

- **D-03:** **Orb picker** — label `Orb`; options `Halo` (`orb-halo`, current production default), `Minimal` (`minimal-rings`), `Kuthasta` (`spiritual-eye`). Uses the Sanskrit term familiar to Forrest's audience (operator's mental model from PROJECT.md); `Kuthasta` is also one of the documented aliases in `BREATHING_SHAPE_FLAG.parse`.
- **D-04:** **Ring cue picker** — label `Ring cue`; options `Arc` (`progress-arc`, current production default post-Phase-45), `Rings` (`outer-inner`). Concise enough for the segmented pill width on mobile.
- **D-05:** **Breathing effect toggle** — label `Breathing effect`. Off = `orbIdle: 'still'`, on = `orbIdle: 'ambient'`. Uses the existing `SettingsToggleRow` primitive as-is — **no sub-text**, no description slot, no new design-system work. The user infers the on/off semantics by toggling and observing live (APPEAR-05 + the live `useFeatureFlags` propagation from Phase 47).
- **D-06:** **Switcher icons toggle** — label `Switcher icons`. Off = `switcherIcon: false` (text-only practice switcher), on = `switcherIcon: true` (icon+label). Same primitive policy as D-05 — no sub-text.
- **D-07:** **Page chrome** — page title `Appearance`; back-chevron ARIA `Back to Settings`; right-chevron ARIA on App Settings (the one that opens the Appearance page) `Appearance settings`. Back-chevron label is more navigationally accurate than the existing `Close` pattern used on `AppSettingsPage` (which historically descended from a dialog).
- **D-08:** **Section headers** — `Orb Style` and `Visual`. Verbatim from APPEAR-03 + APPEAR-04. Title-case matches the existing App Settings section convention (`Appearance` / `Language` / `Feedback` / `About`).
- **D-09:** **PT-BR drafts** (apply per I18N-02 with `// TODO: native-speaker review` markers; operator does the native-speaker pass separately per I18N-04 Future Requirement / Phase 26 D-01 pattern):
  - Page title: `Aparência`
  - Back-chevron ARIA: `Voltar para Configurações`
  - Right-chevron ARIA on App Settings: `Configurações de aparência`
  - Section headers: `Estilo do orbe` / `Visual`
  - Orb picker: `Orbe` / `Halo` / `Mínimo` / `Kuthasta`
  - Ring cue picker: `Sinal do anel` / `Arco` / `Anéis`
  - Toggles: `Efeito de respiração` / `Ícones do alternador`
  - App Settings section rename: `Aparência` → `Tema`

### Componentization

- **D-10:** **Extract two dedicated picker components** — `OrbPicker.tsx` + `RingCuePicker.tsx`. Each mirrors `LanguagePicker.tsx` verbatim: read from its choice hook (`useBreathingShapeChoice` / `useRingCueChoice`), map options through `SegmentedControl`, expose `disabled` + `sectionLabel` + `sectionLabelHidden` props. The **two toggles stay inline** on `AppearancePage` — each is a `SettingsToggleRow` reading from its choice hook (`useOrbIdleChoice` / `useSwitcherIconChoice`) with a label-to-boolean adapter. Toggle wrappers would be near-empty paste-and-renames; inlining keeps the page file readable while honoring the established "one picker = one component" convention for the segmented controls.
- **D-11:** **File location** — `src/components/OrbPicker.tsx`, `src/components/OrbPicker.test.tsx`, `src/components/RingCuePicker.tsx`, `src/components/RingCuePicker.test.tsx`. Alongside `LanguagePicker`, `ThemePicker`, `CuePicker`, `TimbrePicker` — matches every existing picker location. No new subfolder.

### Routing + focus restoration

- **D-12:** **Extend `AppScreen` union** in `src/app/useAppNavigation.ts` to `'practice' | 'learn' | 'appSettings' | 'appearance'`. Add two callbacks:
  - `onAppearanceOpen()` — called by the new App Settings right-chevron; gated by `controlsDisabled` (mirrors `onSettingsOpen` / `onLearnOpen`).
  - `onBackToAppSettings()` — called by the Appearance back-chevron; sets `appScreen` back to `'appSettings'` (NOT `'practice'`), and sets the focus-restoration sentinel (D-13). Type-safe + symmetric with `onBackToPractice` from AppSettings.
  The existing `closeOnSessionView` effect already forces `'practice'` on session start — covers `'appearance'` for free (any value ≠ `'practice'` is reset).
  `ScreenRouter` gains a fourth `case 'appearance':` that renders `<AppearancePage onBack={vm.dialogs.onBackToAppSettings} />`.
- **D-13:** **Focus restoration sentinel** — `useAppNavigation` exposes a `returningFromAppearance: boolean` field. `onBackToAppSettings` sets it `true`; `onAppearanceOpen` and any other navigation reset it `false`. `AppSettingsPage`'s mount `useEffect` reads it: if `true`, focus the right-chevron `IconButton`'s underlying button via a new `buttonRef`; otherwise focus the back-chevron (current behaviour). The flag is cleared after consumption (set `false` in the same effect that consumed it, or by the next navigation). One small state field; one conditional in one existing effect. No new context, no global refs, no `useImperativeHandle`.

### Test coverage

- **D-14:** **Per-picker tests** — `OrbPicker.test.tsx` + `RingCuePicker.test.tsx` mirror `LanguagePicker.test.tsx`: render options, click each option, assert hook setter was called, assert disabled state respected.
- **D-15:** **AppearancePage integration test** — `AppearancePage.test.tsx` mounts the full page in `MemoryRouter`-equivalent harness: asserts page title renders, asserts back-chevron triggers `onBack`, asserts both pickers + both toggles render and propagate clicks through the choice-hook contract (covers APPEAR-05 live-update assertion at the page level). Toggle hooks may be mocked or use real `loadPrefs`/`savePrefs` per the existing `LanguagePicker.test.tsx` convention (planner picks per existing testing tradition).
- **D-16:** **Routing test** — extend `useAppNavigation.test.tsx` with: `onAppearanceOpen` transitions `'appSettings' → 'appearance'`; `onBackToAppSettings` transitions `'appearance' → 'appSettings'` AND sets `returningFromAppearance: true`; subsequent navigation clears the sentinel; `closeOnSessionView` resets `'appearance' → 'practice'`. Extend `ScreenRouter.test.tsx` with the new `'appearance'` case rendering `<AppearancePage />`.
- **D-17:** **Focus restoration test** — in `AppSettingsPage.test.tsx`, assert that with `returningFromAppearance: true` the right-chevron `IconButton` receives focus on mount; with `false` (default) the back-chevron is focused.
- **D-18:** **I18N drift-guard** — the existing `Record<LocaleId, UiStrings>` type-completeness guard (I18N-03) catches missing PT-BR keys at compile time. The existing `content.no-review-markers.test.ts` fs-scan currently asserts no `// TODO: native-speaker review` markers remain — Phase 48 introduces new markers, so the drift-guard must allowlist or scope them. **Planner picks** between (a) extending the drift-guard's allowlist by file/path (preferred, mirrors the file-scoped pattern), (b) adding an exception for the `appearance.*` namespace, or (c) flipping the guard to advisory until Phase 48's I18N-04 pass closes them. Whichever path: the LOCKED_COPY byte-equality guard (Phase 12 D-04) stays intact (Appearance copy is outside LOCKED_COPY).

### Claude's Discretion

- **Exact `appearance.*` shape inside `UiStrings`** — likely `appearance: { title, backChevron, sections: { orbStyle, visual }, orb: { label, options: { halo, minimal, kuthasta } }, ringCue: { label, options: { arc, rings } }, breathingEffect: { label }, switcherIcons: { label } }`. Planner may flatten or rename keys for ergonomics; the user-facing strings are locked in D-03..D-09.
- **Right-chevron ARIA on App Settings** — D-07 picks `Appearance settings` but the planner may shorten to `Appearance` once the surrounding `aria-label` context is reviewed; preserve the destination-describes-itself semantic.
- **`onBackToAppSettings` vs reusing `onSettingsOpen`** — D-12 prefers a dedicated callback for symmetry. Planner may collapse if it doesn't compromise the focus-restoration sentinel write site.
- **`useAppNavigation` sentinel storage** — D-13 picks a `useState<boolean>`. Planner may use a `useRef<boolean>` instead if it cleans up the consumption pattern; the contract (set on back, cleared after consumption) is the constraint.
- **AppearancePage section/card chrome** — planner reuses the inline `SectionCard` pattern from `SettingsPanelBody.tsx` (border-soft 1px + surface bg + 20px radius, padding configurable per section). May co-locate a tiny `SectionCard` helper in `AppearancePage.tsx` if `SettingsPanelBody`'s helper isn't exported; if exported, reuse; if not, the duplication is two lines and tolerated.
- **Mobile vs desktop chrome** — the `PageShell` + `TopAppBar` primitives already encode the mobile-bottom-sheet-vs-desktop-modal behaviour (APPEAR-06); planner doesn't need to add anything. Inherit verbatim.
- **PT-BR draft refinements** — D-09 lists drafts; final landing strings may be slightly different if a closer Portuguese idiom surfaces during plan/execute. The `// TODO: native-speaker review` marker is what locks the I18N-02 contract, not the specific draft phrase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope (locked requirements)

- `.planning/REQUIREMENTS.md` §"Appearance Page" (APPEAR-01..06) + §"Internationalization" (I18N-01..03) — the nine locked requirements for Phase 48.
- `.planning/ROADMAP.md` §"Phase 48: Appearance page + i18n" — phase goal, dependencies (Phase 47), success criteria 1–5.
- `.planning/PROJECT.md` §"Current Milestone: v2.1 Kuthasta and Settings Switches" — milestone goal; "App Settings right-chevron" + "Appearance page" + "i18n EN + PT-BR" bullets; "v2.1 operator-locked decisions" §APPEAR composes the existing primitives.

### Phase 47 dependency (the data-layer foundation Phase 48 binds to)

- `.planning/phases/47-persistable-feature-flag-preferences/47-CONTEXT.md` — Phase 47 decisions D-01..D-12. Phase 48 binds the new pickers/toggles to the four choice hooks shipped in Phase 47 (`useBreathingShapeChoice`, `useRingCueChoice`, `useOrbIdleChoice`, `useSwitcherIconChoice`) and inherits the resolver pipeline + same-tab/cross-tab sync. **Live-update behaviour (APPEAR-05) is satisfied by Phase 47's existing `hrv:prefs-changed` per-key dispatch + `useFeatureFlags` listener wiring — Phase 48 ships zero new sync plumbing.**
- `src/hooks/useBreathingShapeChoice.ts` + `useRingCueChoice.ts` + `useOrbIdleChoice.ts` + `useSwitcherIconChoice.ts` — the four hooks. Each returns `{ <field>, set<Field> }`. Phase 48 picker/toggle components consume these verbatim.

### i18n surface (LOCKED_COPY contract + drift-guards)

- `src/content/strings.ts` — `UiStrings` interface (line 134+ for `appSettings`); EN catalog (line 302+); PT-BR catalog (line 468+). Phase 48 extends `UiStrings` with `appearance.*` and adds parallel EN + PT-BR entries.
- `src/content/lockedCopy.ts` + `lockedCopy.test.ts` — `LOCKED_COPY` byte-equality guard. **Phase 48's new strings are added OUTSIDE `LOCKED_COPY`.** I18N-03 requires this guard stays green.
- `src/content/content.no-removed-keys.test.ts` — existing drift-guard for removed keys; the `appSettings.sections.appearance → sections.theme` rename in D-01 must update or extend the allowed-rename pattern if the test pins legacy keys.
- `src/content/content.no-review-markers.test.ts` (or equivalent) — existing fs-scan asserting no `// TODO: native-speaker review` markers remain. Phase 48 reintroduces markers under `appearance.*`; D-18 lists the three planner-pickable adaptations.
- `.planning/milestones/v1.1-phases/19-i18n/19-CONTEXT.md` — original i18n catalog architecture; typed `Record<LocaleId, UiStrings>` shape, `useLocale` orchestrator. **Phase 48 follows verbatim.**
- `.planning/milestones/v1.3-phases/26-pt-br-native-speaker-review/26-CONTEXT.md` (or equivalent — Phase 26 i18n) — the `// TODO: native-speaker review` workflow + the drift-guard removal pattern. **Phase 48 reintroduces markers and the I18N-04 future requirement is the operator's separate pass to remove them.**

### Page chrome + routing (the surface architecture)

- `src/app/pages/AppSettingsPage.tsx` — full file. The single-most-relevant precedent: `PageShell` + `TopAppBar` + `IconButton` with `ChevronBackIcon` in `leading`, `useEffect`-on-mount focus pattern. **Phase 48's `AppearancePage` is a paste-and-rename of this with a different body.**
- `src/app/pages/LearnPage.tsx` — second precedent for full-page surfaces.
- `src/app/useAppNavigation.ts` — full file. `AppScreen` union, `onLearnOpen` / `onSettingsOpen` / `onBackToPractice` pattern, `controlsDisabled` gate, `closeOnSessionView` reset. **Phase 48 extends with `'appearance'` + `onAppearanceOpen` + `onBackToAppSettings` + `returningFromAppearance` per D-12 + D-13.**
- `src/app/ScreenRouter.tsx` — full file. The 3-case switch. **Phase 48 adds the fourth case.**
- `src/app/appViewModel.ts` + `appControllerAdapters.ts` — propagation surface; Phase 48 threads the two new callbacks + sentinel through the view-model.
- `src/components/primitives/TopAppBar.tsx` — full file (~30 lines). `trailing` prop already exists. **Phase 48 uses it on App Settings, no primitive change.**
- `src/components/primitives/IconButton.tsx` — full file. `buttonRef` prop exists (used by AppSettingsPage today for back-chevron). **Phase 48 uses it for the new right-chevron focus target.**
- `src/components/icons/ChevronRightIcon.tsx` — already exists. **Phase 48 imports it; zero icon work.**

### Picker primitive + componentization precedent

- `src/components/LanguagePicker.tsx` — full file. **The exact template Phase 48's `OrbPicker` + `RingCuePicker` follow.** Consumes one choice hook, maps options to `SegmentedControl`, exposes `disabled` + `sectionLabel` + `sectionLabelHidden`.
- `src/components/ThemePicker.tsx` — secondary precedent (same shape, larger option set with glyphs).
- `src/components/primitives/SegmentedControl.tsx` — full file. Spike-010-locked chrome (rounded-full, bg-soft container, accent active state). **Phase 48 uses as-is.**
- `src/components/SettingsToggleRow.tsx` + `src/components/primitives/Toggle.tsx` — full files. Spike-010-locked iOS-style switch chrome. **Phase 48 uses as-is for the two Visual-section toggles.**
- `src/components/SettingsSectionHeader.tsx` + `src/components/SettingsPanelBody.tsx` (the inline `SectionCard` helper, lines 36-55) — section header + card chrome. **Phase 48's AppearancePage reuses the same chrome pattern.**

### Storage envelope contract (unchanged from Phase 47)

- `.planning/milestones/v1.0.1-phases/08-storage-forward-compat-cross-tab-ui-sync/08-CONTEXT.md` D-01..D-06a — envelope contract. **Phase 48 writes zero new envelope state; all persistence flows through the four choice hooks shipped in Phase 47.**

### Visual system locks (Mono Zen)

- `.planning/spikes/010-mono-zen-light-dark/` — spike-010 locked design system. **Phase 48 reuses tokens (`bg-soft`, `border-soft`, `accent-strong`, `surface`, `text-soft`); no new tokens, no chrome deviation.**
- `src/styles/theme.css` — token definitions. **Phase 48 does not edit.**

### Established conventions

- `[[project_dark_theme_token_collapse]]` (memory) — dark themes collapse `bg-soft === surface`; new controls need explicit `border-soft` borders to read. The reused `SegmentedControl` / `SettingsToggleRow` / `SectionCard` chrome already encode this; **Phase 48 has nothing to add but the planner should verify Appearance page render in dark theme during execution.**
- `[[project_v16_visual_locks]]` (memory) — v2.0 visual system is closed; rejected alternates do not get re-proposed. Phase 48 strictly composes existing primitives.
- `[[feedback_design_logic_separation]]` (memory) — design changes must not touch state machines, audio, persistence, business logic. Phase 48 is mostly a UI surface — the routing extension (D-12 + D-13) is the only logic touch and is scoped to navigation only.
- `[[project_breathing_label_width]]` (memory) — `breathing.inhale/exhale` labels must stay as short as EN `In`/`Out`. **N/A to Phase 48** — no new labels constrained by orb chrome width; the segmented pill labels (Halo/Minimal/Kuthasta and Arc/Rings) are confirmed to fit in the spike-010 SegmentedControl width budget (existing LanguagePicker handles `English`/`Português` in the same width).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`PageShell` + `TopAppBar` + `IconButton`** (`src/components/primitives/`) — the page chrome trio. Already encode mobile-bottom-sheet-vs-desktop-modal (`PageShell`), iOS safe-area inset (`TopAppBar`), and focusable round buttons (`IconButton.buttonRef`). Phase 48 imports them as-is — zero primitive work.
- **`ChevronRightIcon`** (`src/components/icons/ChevronRightIcon.tsx`) — already exists. Phase 48's right-chevron on App Settings imports it directly.
- **`ChevronBackIcon`** (`src/components/icons/ChevronBackIcon.tsx`) — already exists; used by AppSettingsPage and LearnPage for back navigation. Phase 48's AppearancePage uses it identically.
- **`SegmentedControl`** (`src/components/primitives/SegmentedControl.tsx`) — generic over a string-typed option set. Used by `LanguagePicker` (locale ids), `ThemePicker` (theme ids), `CuePicker` (cue style ids), `TimbrePicker` (timbre ids). Phase 48's `OrbPicker` + `RingCuePicker` use it for `BreathingShapeVariant` + `RingCueStyle` respectively.
- **`SettingsToggleRow`** (`src/components/SettingsToggleRow.tsx`) — iOS-style switch with label-left/switch-right chrome. Used by no current consumer surface (it's a recently-introduced primitive from spike-010 J14). Phase 48 is its first consumer site — the two Visual-section toggles render two `<SettingsToggleRow>` instances inline on AppearancePage.
- **`SettingsSectionHeader`** (`src/components/SettingsSectionHeader.tsx`) — section header chrome (accent-strong text + spacing). Used by `SettingsPanelBody` (4 sections). Phase 48's AppearancePage uses 2 instances.
- **The `SectionCard` inline pattern** (`src/components/SettingsPanelBody.tsx:36-55`) — `border-soft` 1px + `surface` bg + 20px radius, configurable padding. Currently inline in `SettingsPanelBody`. Phase 48 reuses the same shape; planner can either duplicate inline or extract a tiny helper (D-10 Claude's Discretion bullet).
- **Phase 47 choice hooks** (`src/hooks/useBreathingShapeChoice.ts` + `useRingCueChoice.ts` + `useOrbIdleChoice.ts` + `useSwitcherIconChoice.ts`) — each returns `{ <field>, set<Field> }` typed to its union/boolean. Each setter writes through `savePrefs` and dispatches `hrv:prefs-changed` with the per-flag `detail.key`. `useFeatureFlags` (consumed by the practice surface via `vm.featureFlags`) re-reads on the event — so picker/toggle clicks propagate live without any new orchestration.

### Established Patterns

- **One picker = one component file** — `LanguagePicker`, `ThemePicker`, `CuePicker`, `TimbrePicker` each live in their own file in `src/components/`. D-10 + D-11 extend this with `OrbPicker` + `RingCuePicker`.
- **Mount-focus the back-chevron on full-page surfaces** — `AppSettingsPage.tsx:32-36` and `LearnPage.tsx` both `useRef<HTMLButtonElement>` + `useEffect(() => buttonRef.current?.focus({ preventScroll: true }), [])`. Phase 48's `AppearancePage` follows verbatim. AppSettingsPage's existing mount-focus extends to read the `returningFromAppearance` sentinel (D-13).
- **`AppScreen` discriminator routed by `ScreenRouter`** — three-case switch today; the union extension adds a fourth case with no architectural change.
- **`controlsDisabled` gate on every onOpen callback** — `useAppNavigation.onSettingsOpen` and `onLearnOpen` both early-return if `controlsDisabled`. `onAppearanceOpen` follows verbatim. The closeOnSessionView effect handles the reverse (yank back to `'practice'` on session start) for any non-`'practice'` value.
- **`Pick<UiStrings, '...'>` strings prop pattern** — `AppSettingsPage` accepts the trimmed `Pick<UiStrings, 'appSettings' | 'install'>` (line 31). `AppearancePage` follows: accepts `Pick<UiStrings, 'appearance'>`.
- **`useUiStrings()` hook** (`src/hooks/useUiStringsContext.ts`) — single subscription point for the locale-aware string catalog. Both pages call it once and slice into props.
- **No-design-locking applied at data layer** (`[[feedback_no_design_locking]]`) — Phase 47 D-02 imports flag defaults from `featureFlags.ts` into `DEFAULT_PREFS` so the production default is defined once. Phase 48 inherits this: picker option ordering should map naturally to the type-union order; defaults are not re-anchored anywhere.

### Integration Points

- **`AppSettingsPage.tsx`** — extends with the right-chevron `IconButton`. New prop: `onAppearanceOpen`. New `useRef` for the right-chevron button. Conditional mount-focus reads `returningFromAppearance` from props (threaded through `vm.dialogs`).
- **`useAppNavigation.ts`** — extends the union + adds two callbacks + adds the sentinel field. Test file `useAppNavigation.test.tsx` extends with the three new transition assertions (D-16).
- **`appViewModel.ts`** — extends the `dialogs` view-model shape with `onAppearanceOpen`, `onBackToAppSettings`, `returningFromAppearance`. Adapter (`appControllerAdapters.ts:217`) propagates verbatim.
- **`ScreenRouter.tsx`** — fourth case dispatches `<AppearancePage onBack={vm.dialogs.onBackToAppSettings} />`.
- **`SettingsPanelBody.tsx`** — single consumer of `strings.appSettings.sections.appearance`. After D-01 rename, change one string reference (`strings.appSettings.sections.appearance` → `strings.appSettings.sections.theme`).
- **No touch to:** practice engine, audio, wake-lock, storage envelope, NK engine, breathing session engine, lead-in countdown, locale orchestrator, install banner. Pure UI + i18n surface + minor navigation extension.

</code_context>

<specifics>
## Specific Ideas

- Operator's mental model: **"this is the user-facing end of the v2.1 settings-switches story — Phase 47 made the data persist; Phase 48 makes it discoverable."** Phase 48 closes the visible loop on the milestone: the user now has a place to touch the four flags without typing a query string.
- The composition value is "**zero new design, zero new data layer, only new wiring**" — every primitive (`SegmentedControl`, `SettingsToggleRow`, `IconButton`, `PageShell`, `TopAppBar`, `SectionHeader`, the inline `SectionCard` chrome) is reused verbatim; every choice hook (Phase 47's four) is consumed as-is. The planner should NOT invent new abstractions. The two new picker components are paste-and-rename of `LanguagePicker`; the page is a paste-and-rename of `AppSettingsPage` chrome with a different body; the routing extension is symmetric paste-and-rename of `onLearnOpen` → `onAppearanceOpen`. **Boring on purpose** (echoing Phase 47).
- Operator pattern in spike-010 J14 (App Settings restructure) — "compose existing primitives, don't extend them" — is reaffirmed by D-05 + D-06 declining a `SettingsToggleRow` sub-text slot. If the absence of sub-text turns out to confuse users during real-app UAT, an operator OQ checkpoint can re-open the design-system question; not Phase 48 scope.
- The `Ring cue` / `Cue style` distinction (D-02) is a one-off naming clarification, not a precedent. The two pickers control unrelated concerns — the existing `cue` field is the inhale/exhale orb-centre cue; the new `ringCue` field is the ring-element cue around the orb perimeter.
- App Settings already calls the now-renamed "Theme" section "Appearance" because at Phase 39 the section only held the theme picker and the operator anticipated more visual controls might land there. v2.1 walked away from that prediction — the four new flags went on a sibling page, not into the existing section — so the rename is overdue.

</specifics>

<deferred>
## Deferred Ideas

- **PT-BR native-speaker review** — covered by I18N-04 Future Requirement; separate operator pass per Phase 26 D-01 pattern. Phase 48 ships drafts with markers; no scope creep into the review pass itself.
- **`SettingsToggleRow` sub-description slot** — declined in D-05/D-06 to honor the "compose existing primitives" rule. Reopen only if a future real-app UAT confirms label-only toggles confuse users.
- **URL hash / browser history integration** for the four-screen router — out of scope. `ScreenRouter` remains in-memory; back-button browser behaviour is unchanged.
- **Per-practice flag overrides** — out of scope. Orb / Ring cue / Idle / Switcher icons are app-wide chrome (like theme), not per-practice. Reaffirms Phase 47 D-12.
- **Live preview affordance** beyond the actual app — out of scope. APPEAR-05 is satisfied by the existing `useFeatureFlags` reactive resolver + `hrv:prefs-changed` event from Phase 47.
- **DevTools / `?devPrefs=1` operator helpers** — already declined in Phase 47 D-12; the Appearance page IS the user-facing surface that supersedes per-tab query-string overrides as the visual-test path.
- **Section divider chrome / illustrations / preview thumbnails** for the two segmented pickers — explicitly out of scope. Inherits the locked spike-010 SegmentedControl chrome verbatim.
- **Surfacing the existing Feedback section (CuePicker + TimbrePicker) on the new Appearance page** — out of scope. App Settings → Feedback stays where it is; Appearance page is strictly the four feature-flag controls.

</deferred>

---

*Phase: 48-appearance-page-i18n*
*Context gathered: 2026-05-26*
