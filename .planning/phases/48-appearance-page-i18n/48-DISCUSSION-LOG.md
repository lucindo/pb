# Phase 48: Appearance page + i18n — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `48-CONTEXT.md` — this log preserves the deliberation.

**Date:** 2026-05-26
**Phase:** 48-appearance-page-i18n
**Mode:** discuss (default, interactive)
**Areas selected by operator:** Naming collisions, EN picker / toggle copy, Picker component split vs inline, Routing + focus restoration (all 4 of 4 presented)

## Gray Area Selection

| Area | Selected | Notes |
|------|----------|-------|
| Naming collisions | ✓ | Two collisions: "Appearance" page title vs section header; "Cue" picker name overlap |
| EN picker / toggle copy | ✓ | Final user-visible labels for 4 controls + page chrome |
| Picker component split vs inline | ✓ | 4 controls — dedicated components or inline? |
| Routing + focus restoration | ✓ | `AppScreen` union extension + focus restoration to right-chevron |

## Discussion

### Area 1: Naming collisions

**Q1: Collision A — "Appearance" page title vs the existing "Appearance" section header on App Settings (currently holds ThemePicker).**

Options:
- Rename App Settings section to "Theme" — Frees the "Appearance" name; the section only contains ThemePicker, so "Theme" is more accurate.
- Leave both as "Appearance" — Accept the duplication; users see "Appearance" on both surfaces.
- Rename new page to "Display" — Departs from APPEAR-02; would need to amend the locked requirement.

**Selected:** Rename App Settings section to "Theme".

**Q2: Collision B — "Cue" picker on new page (`ringCue`: arc/rings) vs existing "Cue style" picker under Feedback (inhale/exhale: text/arrow/nose).**

Options:
- Rename new picker to "Ring cue" — Picker on Appearance reads "Ring cue"; existing "Cue style" unchanged. Lowest blast radius.
- Rename existing Feedback picker to "Breath cue" — Picker under Feedback becomes "Breath cue"; new one just "Cue".
- Both: rename to "Ring cue" + "Breath cue" — Maximum clarity; two EN + two PT-BR strings to update on both sides.

**Selected:** Rename new picker to "Ring cue".

---

### Area 2: EN picker / toggle copy

**Q3: Orb picker label + 3 option labels (controls `breathingShape`).**

Options:
- Orb / Halo / Minimal / Kuthasta — Short, matches internal vocabulary + operator's mental model (Kuthasta familiar to Forrest's audience).
- Style / Halo orb / Rings only / Spiritual eye — Slightly more descriptive but breaks operator-locked Kuthasta vocabulary.
- Orb / Halo / Minimal / Star — Uses the casual "Star" alias; more accessible to general meditators.

**Selected:** Orb / Halo / Minimal / Kuthasta.

**Q4: Ring cue picker label + 2 option labels (controls `ringCue`).**

Options:
- Ring cue / Arc / Rings — Concise; matches Phase 45 default-flip vocabulary.
- Ring cue / Progress arc / Outer-inner — Literal but jargon-y.
- Ring cue / Single arc / Two rings — Friendly descriptors; new vocabulary.

**Selected:** Ring cue / Arc / Rings.

**Q5: Toggle labels for Visual section (controls `orbIdle` + `switcherIcon`).**

Options:
- "Breathing effect" / "Switcher icons" — Verbatim from APPEAR-04; no sub-text (existing SettingsToggleRow as-is).
- "Idle breathing" / "Practice icons" — More precise but more cognitive load.
- Same labels + sub-text descriptions — Requires extending SettingsToggleRow primitive (breaks compose-existing-primitives rule).

**Selected:** "Breathing effect" / "Switcher icons" (no sub-text).

**Q6: Page chrome — page title, back-chevron ARIA, right-chevron ARIA on App Settings.**

Options:
- "Appearance" / "Back to Settings" / "Appearance settings"
- "Appearance" / "Settings" / "Open appearance settings"
- "Appearance" / "Back" / "Appearance"

**Selected:** "Appearance" / "Back to Settings" / "Appearance settings".

**Q7: Section headers on the new page.**

Options:
- "Orb Style" / "Visual" — Verbatim from APPEAR-03 + APPEAR-04.
- "Orb" / "Visual effects" — Shorter, avoids label echo with picker.
- "Orb Style" / "Practice display" — Clearer that toggles affect practice surface chrome.

**Selected:** "Orb Style" / "Visual".

---

### Area 3: Picker component split vs inline

**Q8: How should the four new controls be packaged?**

Options:
- Dedicated OrbPicker + RingCuePicker (toggles stay inline) — 2 new component files; segmented pickers follow LanguagePicker convention.
- All four extracted — 4 new component files; toggle wrappers are nearly trivial.
- All inline on AppearancePage — Zero new component files; breaks "one picker = one component" convention.
- All four extracted + extract AppearancePageBody — 5 new files; mirrors SettingsPanelBody/AppSettingsPage split.

**Selected:** Dedicated OrbPicker + RingCuePicker (toggles stay inline).

**Q9: Where should the two extracted picker files live?**

Options:
- src/components/ alongside LanguagePicker — Matches existing picker location convention.
- src/app/pages/AppearancePage/ as a sub-folder — Co-locates but breaks convention.
- src/components/appearance/ as a new subfolder — Could grow but slight inconsistency.

**Selected:** src/components/ alongside LanguagePicker.

---

### Area 4: Routing + focus restoration

**Q10: How should the new Appearance screen plug into the routing state machine?**

Options:
- Add 'appearance' to AppScreen union; onAppearanceOpen / onBackToAppSettings callbacks — Clean, type-safe, mirrors existing onLearnOpen / onSettingsOpen.
- Nest Appearance inside appSettings with sub-state — Less plumbing but couples the two pages.
- Add 'appearance' to AppScreen but reuse onBackToPractice — Simpler but breaks success criterion 1 (focus restoration to App Settings right-chevron).

**Selected:** Add 'appearance' to AppScreen union; onAppearanceOpen / onBackToAppSettings callbacks.

**Q11: How should focus be restored to the App Settings right-chevron when the user returns from Appearance?**

Options:
- Sentinel state in useAppNavigation + conditional focus on AppSettingsPage mount — One small field; one conditional in existing useEffect.
- Pass a focusTarget prop to AppSettingsPage — Pushes decision up to router; more wiring.
- Don't restore — always focus back-chevron — Simpler but misses success criterion 1.

**Selected:** Sentinel state in useAppNavigation + conditional focus on AppSettingsPage mount.

---

### Wrap-up

**Q12: Explore more gray areas or write context?**

Selected: **I'm ready for context** — remaining details (PT-BR draft refinements, exact section spacing, AppearancePage test scope details, popstate handling) fall to Claude's discretion in PLAN.md.

## Deferred Ideas Captured

- PT-BR native-speaker review (Future Requirement I18N-04, separate operator pass per Phase 26 D-01).
- `SettingsToggleRow` sub-description slot (declined to honor compose-existing-primitives rule).
- URL hash / browser history integration (out of scope; ScreenRouter stays in-memory).
- Per-practice flag overrides (out of scope; flags are app-wide).
- Live preview affordance beyond the actual app (Phase 47 reactive flow satisfies APPEAR-05).
- DevTools / `?devPrefs=1` operator helpers (declined in Phase 47 D-12).
- Section divider chrome / illustrations / preview thumbnails (inherits locked spike-010 chrome).
- Surfacing existing Feedback section on Appearance page (out of scope).

## Claude's Discretion (carried into CONTEXT.md)

- Exact `appearance.*` shape inside `UiStrings` (key naming/grouping).
- Whether right-chevron ARIA shortens after surrounding-context review.
- `onBackToAppSettings` vs reusing `onSettingsOpen`.
- `useAppNavigation` sentinel storage (`useState<boolean>` vs `useRef<boolean>`).
- AppearancePage section/card chrome (inline duplication vs extracted helper from `SettingsPanelBody`).
- Mobile vs desktop chrome (inherited from `PageShell` + `TopAppBar`).
- PT-BR draft refinements during plan/execute (markers are what lock I18N-02).
