# Roadmap: HRV Breathing WebApp

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 + 5.1 (shipped 2026-05-11)
- ✅ **v1.0.1 Code Review Patch** — Phases 7–12 (shipped 2026-05-12)
- ✅ **v1.1 Customization** — Phases 13–19 (shipped 2026-05-15)
- ✅ **v1.2 BPM Stretch** — Phases 20–22 (shipped 2026-05-15)
- ✅ **v1.3 Release Polish** — Phases 23–27 (shipped 2026-05-16)
- ✅ **v1.4 Install Helper** — Phases 28–29 (shipped 2026-05-16)
- ✅ **v1.5 Multi-Practice** — Phases 30–35 (shipped 2026-05-19)
- ✅ **v2.0 New Design** — Phases 36–41, 44, 45 (shipped 2026-05-25)
- 🚧 **v2.1 Kuthasta and Settings Switches** — Phases 46–48 (in progress, started 2026-05-25)

## Phases

### v2.1 Kuthasta and Settings Switches (Phases 46–48)

- [ ] **Phase 46: Kuthasta orb variant** — Ship spike 012 V5 Halo Flame as a third `?breathingShape=spiritual-eye` value, verbatim per spike-locked tokens, no persistence (operator UATs in real app)
- [ ] **Phase 47: Persistable feature-flag preferences** — Promote the four query-string-only flags (`breathingShape` / `ringCue` / `orbIdle` / `switcherIcon`) to persisted user prefs via the per-field `coerceSettings` fallback (no `STATE_VERSION` bump)
- [ ] **Phase 48: Appearance page + i18n** — New full-page Appearance surface reached via the App Settings header right-chevron, composing existing `SegmentedControl` + `SettingsToggleRow` primitives, with EN + PT-BR copy for every new string

<details>
<summary>✅ v2.0 New Design (Phases 36, 37, 38, 39, 40, 41, 44, 45) — SHIPPED 2026-05-25</summary>

- [x] Phase 36: Housekeeping bookkeeping reset (9/9 plans) — completed 2026-05-20
- [x] Phase 37: Stats UI removal (3/3 plans) — completed 2026-05-21
- [x] Phase 38: Variant removal (4/4 plans) — completed 2026-05-21
- [x] Phase 39: Theme simplification (5/5 plans) — completed 2026-05-21
- [x] Phase 40: Timbre preview cue (4/4 plans) — completed 2026-05-21 (4 empirical UAT items operator-confirmed at milestone close 2026-05-25)
- [x] Phase 41: Spike 010 Mono Zen — full implementation (spike-loop J1–J18; absorbed planned Phases 42 + 43) — completed 2026-05-25 at `d2b886b`
- [x] Phase 44: Final polish (7/7 plans) — completed 2026-05-25
- [x] Phase 45: Ring progress-cue toggle (3/3 plans, post-Phase-44 add-on; default flipped to `progress-arc` post-UAT) — completed 2026-05-25

Numbering gaps (42/43) are intentional: those originally-planned phases were absorbed into Phase 41 via the spike-loop format. Full detail: `.planning/milestones/v2.0-ROADMAP.md`.
</details>

<details>
<summary>✅ v1.5 Multi-Practice (Phases 30–35) — SHIPPED 2026-05-19</summary>

- [x] Phase 30: Multi-Practice Architecture & Switcher (4/4 plans)
- [x] Phase 31: Navi Kriya Engine & Session (6/6 plans)
- [x] Phase 32: Learn & Localization (3/3 plans)
- [x] Phase 33: Close gap — PRACTICE-02 resonant settings persistence (1/1 plans)
- [x] Phase 34: Stretch as a Distinct Practice (11/11 plans)
- [x] Phase 35: Flute Cue Timbre (2/2 plans)

Full detail: `.planning/milestones/v1.5-ROADMAP.md`
</details>

<details>
<summary>✅ v1.4 Install Helper (Phases 28–29) — SHIPPED 2026-05-16</summary>

- [x] Phase 28: Phone Install Banner (3/3 plans)
- [x] Phase 29: Settings Install Entry & Localization (3/3 plans)

Full detail: `.planning/milestones/v1.4-ROADMAP.md`
</details>

<details>
<summary>✅ v1.3 Release Polish (Phases 23–27) — SHIPPED 2026-05-16</summary>

- [x] Phase 23: License & README (1/1 plans)
- [x] Phase 24: Forrest Native-App Links (1/1 plans)
- [x] Phase 25: Labels-vs-Icons Cue Toggle (5/5 plans)
- [x] Phase 26: PT-BR Native-Speaker Review (1/1 plans)
- [x] Phase 27: PWA Install & Offline (3/3 plans)

Full detail: `.planning/milestones/v1.3-ROADMAP.md`
</details>

Earlier milestones (v1.0 → v1.2) are archived under `.planning/milestones/` — see `v1.0-ROADMAP.md`, `v1.0.1-ROADMAP.md`, `v1.1-ROADMAP.md`, `v1.2-ROADMAP.md` and the matching `*-REQUIREMENTS.md`.

## Phase Details

### Phase 46: Kuthasta orb variant
**Goal**: User can see the spike-012 V5 Halo Flame Kuthasta orb in the real app by appending `?breathingShape=spiritual-eye` to the URL, so the operator can visually UAT the locked design before deciding to surface it through Settings.
**Depends on**: Nothing (first v2.1 phase — extends the existing `BREATHING_SHAPE_FLAG` union by one variant; touches `OrbShape.tsx` + `theme.css` + `featureFlags.ts` only)
**Requirements**: KUTH-01, KUTH-02, KUTH-03, KUTH-04
**Success Criteria** (what must be TRUE):
  1. User loads the app with `?breathingShape=spiritual-eye` (or alias `kuthasta` / `star`) and the practice orb renders with the warm-cool gold halo gradient, opalescent indigo radial-gradient centre disc, and a small white 5-point star centred on the disc.
  2. User toggling between Light and Dark themes sees the orb re-tint to each theme's spike-012-locked per-theme palette (light gold/indigo set vs. dark gold/indigo set) with no FOUC and no halo geometry change.
  3. User running an HRV / Stretch / Navi session on the Kuthasta orb sees every existing orb affordance unchanged — breath scale animation, outer ring + progress-arc OR outer-inner cue, idle still/ambient, lead-in countdown, completion checkmark, reduced-motion freeze.
  4. User passing an unrecognized `?breathingShape=` value continues to see the production `orb-halo` default (no broken state).
  5. Operator can switch live between `?breathingShape=orb-halo` / `minimal-rings` / `spiritual-eye` per-tab without rebuild and decide whether to promote Kuthasta to a persisted preference in Phase 48.
**Plans**: 3 plans
  - [x] 46-01-PLAN.md — Extend `BreathingShapeVariant` union + add spiritual-eye alias clause to `BREATHING_SHAPE_FLAG.parse` (+ vitest cases). [KUTH-01]
  - [x] 46-02-PLAN.md — Add 10 spike-012 V5 `--color-*-spiritual-eye` tokens to `theme.css` (5 per theme: halo-1/2, disc, disc-strong, star fill/stroke; halo-3 reused). [KUTH-04]
  - [x] 46-03-PLAN.md — Wire `StarGlyph` + `SPIRITUAL_EYE_HALOS` + three-way halo branch in `OrbContainer`; per-call-site `discBg` + child dispatch (Star replaces Cue for Running); operator visual UAT checkpoint. [KUTH-02, KUTH-03]
**UI hint**: yes

### Phase 47: Persistable feature-flag preferences
**Goal**: User-selectable values for the four feature flags (`breathingShape`, `ringCue`, `orbIdle`, `switcherIcon`) persist across browser sessions via the existing localStorage envelope, while query-string overrides continue to work per-tab for development. This is the data-layer foundation the Phase 48 Appearance UI binds to.
**Depends on**: Phase 46 (the `'spiritual-eye'` variant must already exist in the `BreathingShapeVariant` union so the persisted-prefs layer can store and validate it)
**Requirements**: PREFS-01, PREFS-02, PREFS-03, PREFS-04
**Success Criteria** (what must be TRUE):
  1. User who changes any of the four flag values (via a test setter or, after Phase 48, via the Appearance UI) sees the chosen value applied on the next full page reload — no query string needed.
  2. User loading the app with a query string for any of the four flags (e.g., `?ringCue=outer-inner`) sees the query-string value win over the persisted preference for that tab only; the persisted preference is not overwritten by the query string.
  3. User landing on the app for the first time (no persisted prefs) sees the production defaults — `orb-halo` / `progress-arc` / `ambient` / `switcherIcon=false` — byte-identical to v2.0 behaviour; returning users with an empty/missing prefs slice see the same defaults with no FOUC.
  4. User whose persisted envelope contains a corrupted or unknown value for any of the four fields (e.g., a future `breathingShape` value rolled back to today's build) sees the field coerce to its default on read without throwing, with the v2.0 forward-compat envelope contract (Phase 8 D-01 spread-then-override + refuse-downgrade write) intact — no `STATE_VERSION` bump.
  5. Developer query-string workflow (`?breathingShape=` / `?orbIdle=` / `?ringCue=` / `?switcherIcon=`) keeps the existing alias + case-insensitive parsing behaviour for all four flags; per-tab override never persists to the envelope.
**Plans**: TBD

### Phase 48: Appearance page + i18n
**Goal**: User can navigate from App Settings to a new Appearance page via a right-chevron in the header, change orb / cue / breathing-effect / switcher-icon settings on that page using familiar primitives, and see the changes apply live across the app and persist across sessions — with EN and PT-BR copy for every new string.
**Depends on**: Phase 47 (the Appearance UI binds to the persisted-prefs setters and reads from the same resolver; without Phase 47 there would be nothing to set or to persist)
**Requirements**: APPEAR-01, APPEAR-02, APPEAR-03, APPEAR-04, APPEAR-05, APPEAR-06, I18N-01, I18N-02, I18N-03
**Success Criteria** (what must be TRUE):
  1. User on the App Settings page sees a `>` right-chevron in the header trailing slot (alongside the existing back-chevron leading slot) and can tap it to navigate to the new Appearance page; returning via the Appearance left-chevron restores focus to the App Settings right-chevron source.
  2. User on the Appearance page sees two sections — **Orb Style** with an Orb segmented picker (minimal / halo / kuthasta) and a Cue segmented picker (progress arc / rings), and **Visual** with a Breathing effect toggle (off=still, on=ambient) and a Switcher icons toggle (off=text-only, on=icon+label) — rendered with the same `SegmentedControl` and `SettingsToggleRow` primitives used by `LanguagePicker` and elsewhere.
  3. User selecting any picker option or toggling either switch sees the persisted preference update immediately and the change applied live across every surface that consumes the flag (practice orb, ring cue, idle behaviour, switcher labels) on the next render — no reload, no nav-back required.
  4. User loads the Appearance page in either Light or Dark theme and on either mobile or desktop and sees the same Mono Zen chrome as App Settings — `bg-soft` surface, `borderSoft` borders, `accent-strong` section labels, locked spacing/typography, mobile-bottom-sheet-vs-desktop-modal pattern preserved.
  5. User switching the locale picker to PT-BR sees every new Appearance string (page title, section headers, picker option labels, toggle labels) rendered in PT-BR with native-quality strings carrying the `// TODO: native-speaker review` marker per the Phase 26 workflow; the frozen-EN `LOCKED_COPY` byte-equality guard and `Record<LocaleId, UiStrings>` type-completeness guard both still pass.
**Plans**: TBD
**UI hint**: yes

## Progress

| Milestone | Phase Range | Plans | Status | Completed |
| --------- | ----------- | ----- | ------ | --------- |
| v1.0 MVP | 1–6 + 5.1 | 30 | Complete | 2026-05-11 |
| v1.0.1 Code Review Patch | 7–12 | 12 | Complete | 2026-05-12 |
| v1.1 Customization | 13–19 | 47 | Complete | 2026-05-15 |
| v1.2 BPM Stretch | 20–22 | 8 | Complete | 2026-05-15 |
| v1.3 Release Polish | 23–27 | 11 | Complete | 2026-05-16 |
| v1.4 Install Helper | 28–29 | 6 | Complete | 2026-05-16 |
| v1.5 Multi-Practice | 30–35 | 27 | Complete | 2026-05-19 |
| v2.0 New Design | 36–41, 44, 45 | 35 + 18 spike-loop items | Complete | 2026-05-25 |
| v2.1 Kuthasta and Settings Switches | 46–48 | 0/3+TBD | In progress | — |

### v2.1 Phase Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 46. Kuthasta orb variant | 3/3 | Complete    | 2026-05-26 |
| 47. Persistable feature-flag preferences | 0/TBD | Not started | — |
| 48. Appearance page + i18n | 0/TBD | Not started | — |
