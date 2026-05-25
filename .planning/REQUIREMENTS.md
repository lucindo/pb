# Requirements: HRV Breathing WebApp — v2.1 Kuthasta and Settings Switches

**Defined:** 2026-05-25
**Core Value:** Users can start a hands-off Forrest Knutson practice — HRV breathing, Stretch, or Navi Kriya — and comfortably follow accurate, uninterrupted guidance through synchronized visuals and optional sound.

## v2.1 Requirements

### Kuthasta Orb (KUTH)

Implements spike 012 V5 Halo Flame as a third `breathingShape` variant.

- [ ] **KUTH-01**: User can request the Kuthasta orb via `?breathingShape=spiritual-eye` (with aliases `kuthasta` / `star`); unrecognized values fall back to the existing `orb-halo` default per the established `featureFlags.ts` parser pattern.
- [ ] **KUTH-02**: The Kuthasta orb renders the spike-012 V5 locked design verbatim — warm-cool halo gradient (gold outer / tan mid / slate inner), opalescent indigo radial-gradient disc, small white 5-point star (20% of disc, sharp outer:inner ratio 2.5, point up).
- [ ] **KUTH-03**: Kuthasta variant honors all existing orb affordances unchanged — geometry (3-layer halo + 62% disc + outer ring), breath scale animation, ring cues (outer + progress-arc OR outer-inner), idle states (still / ambient), reduced-motion, lead-in countdown, completion checkmark.
- [ ] **KUTH-04**: Light and dark themes each render with their spike-012-locked per-theme palettes (light: `#4a5a96 → #34406f → #2a356a` disc + gold halos `rgba(202,166,98,0.48)` etc.; dark: `#6c7cb6 → #4a5a96 → #38477e` disc + gold halos `rgba(206,168,100,0.45)` etc.).

### Persistable Feature-Flag Preferences (PREFS)

Promotes the four query-string-only dev toggles to persisted user preferences.

- [ ] **PREFS-01**: User-selectable values for `breathingShape`, `ringCue`, `orbIdle`, and `switcherIcon` persist across browser sessions via the existing localStorage envelope.
- [ ] **PREFS-02**: Query-string values for any of the four flags override persisted preferences for that tab — the existing dev-override workflow continues to work without rebuild.
- [ ] **PREFS-03**: Resolution order on first paint is query-string > persisted preference > production default (`orb-halo` / `progress-arc` / `ambient` / `switcherIcon=false`); persisted defaults match current production behavior so returning users see no change unless they opt in.
- [ ] **PREFS-04**: Persisted preferences are added via the per-field `coerceSettings` fallback pattern (Phase 8 D-01) — no `STATE_VERSION` bump; missing fields coerce to defaults on read; corrupted values fall back without throwing.

### Appearance Page (APPEAR)

New full-page surface reached from the App Settings header right-chevron.

- [ ] **APPEAR-01**: User can tap a `>` chevron in the right slot of the App Settings header (`[ <  Settings  ]` → `[ <  Settings  > ]`) to navigate to the new Appearance page; the chevron is always visible on App Settings and behaves as `IconButton` per the existing primitive pattern.
- [ ] **APPEAR-02**: Appearance page renders as a sibling full-page surface (`PageShell` + `TopAppBar`) with header `[ <  Appearance  ]`; left-chevron returns to App Settings with focus restored to the right-chevron source.
- [ ] **APPEAR-03**: Appearance page **Orb Style** section contains two segmented pickers — **Orb** (minimal / halo / kuthasta) and **Cue** (progress arc / rings) — using the same `SegmentedControl` primitive as `LanguagePicker`.
- [ ] **APPEAR-04**: Appearance page **Visual** section contains two toggles — **Breathing effect** (off=still, on=ambient) and **Switcher icons** (off=text-only, on=icon+label) — using the same `SettingsToggleRow` primitive used elsewhere.
- [ ] **APPEAR-05**: Selecting a picker option or toggling a switch immediately updates the persisted preference and applies live across the app on the next render (no reload / no nav-back required).
- [ ] **APPEAR-06**: Appearance page visual chrome matches the locked Mono Zen visual system — same tokens (`bg-soft` surface, `borderSoft` borders, `accent-strong` section labels), spacing, typography, and the mobile-bottom-sheet-vs-desktop-modal pattern used by App Settings.

### Internationalization (I18N)

EN + PT-BR copy for the new surface.

- [ ] **I18N-01**: New page title, section headers, picker option labels, and toggle labels are added to the EN string catalog (`src/content/strings.ts`) with appropriate keys grouped under `appearance.*`.
- [ ] **I18N-02**: PT-BR catalog has parallel entries for every new EN key; new strings carry the `// TODO: native-speaker review` marker per the v1.3 / Phase 26 review workflow until the operator does the native-speaker pass.
- [ ] **I18N-03**: Frozen-EN `LOCKED_COPY` byte-equality guard (Phase 12 D-04) and `Record<LocaleId, UiStrings>` type-completeness guard remain intact; new copy is added outside the LOCKED_COPY surface (operator may relocate any specific string into LOCKED_COPY after review).

## Future Requirements

Deferred to v2.2 or later. Tracked but not in v2.1 roadmap.

### v2.x Carry-Forwards (Known Bugs)

- **CARRY-01**: iOS Safari mid-page audio recovery after lock/unlock (OS-level audio session loss).
- **CARRY-02**: S2 Android Chrome wake-lock real-device UAT (physical device unavailable).
- **CARRY-03**: iOS Safari Pitfall 6 phone-call interrupted state.
- **CARRY-04**: iOS standalone-PWA Wake Lock < 18.4 detect-and-warn product decision.

### Native-Speaker Review

- **I18N-04**: PT-BR native-speaker review of v2.1 strings (removes the `// TODO: native-speaker review` markers). Operator pass per Phase 26 D-01 pattern.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Stats UI re-introduction | v2.0 STATS-01..05 + spike-010 anti-gamification stance remains. `recordSession()` computation + persistence stay intact for future opt-in. |
| Square / Diamond shape variants | Removed permanently at v2.0 (VAR-01..06). The new Orb selector is orb-family only: minimal-rings / orb-halo / spiritual-eye. |
| Variant picker on the Practice Settings sheet | Practice Settings stays clean per spike-010 separation; orb variant lives on the new Appearance page only. |
| Per-practice orb variant configuration | Orb variant is app-wide chrome (like theme), not per-practice — mirrors the spike-001 split. |
| New ring-cue variants beyond the two shipped | Spike 011 explored several; only progress-arc + outer-inner shipped. New variants would be a separate spike + milestone. |
| Promoting `VITE_SWITCHER_TREATMENT` to a build-time toggle | The dev env var is replaced by the persisted `switcherIcon` preference; the env var goes away with this milestone (build-time → user-runtime). |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| KUTH-01 | Phase ? | Pending |
| KUTH-02 | Phase ? | Pending |
| KUTH-03 | Phase ? | Pending |
| KUTH-04 | Phase ? | Pending |
| PREFS-01 | Phase ? | Pending |
| PREFS-02 | Phase ? | Pending |
| PREFS-03 | Phase ? | Pending |
| PREFS-04 | Phase ? | Pending |
| APPEAR-01 | Phase ? | Pending |
| APPEAR-02 | Phase ? | Pending |
| APPEAR-03 | Phase ? | Pending |
| APPEAR-04 | Phase ? | Pending |
| APPEAR-05 | Phase ? | Pending |
| APPEAR-06 | Phase ? | Pending |
| I18N-01 | Phase ? | Pending |
| I18N-02 | Phase ? | Pending |
| I18N-03 | Phase ? | Pending |

**Coverage:**
- v2.1 requirements: 17 total
- Mapped to phases: 0 (populated by roadmapper)
- Unmapped: 17 ⚠️

---
*Requirements defined: 2026-05-25*
*Last updated: 2026-05-25 after initial definition*
