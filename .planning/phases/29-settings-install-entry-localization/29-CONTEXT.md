# Phase 29: Settings Install Entry & Localization - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Users on any browser where PWA installation is actually possible can reach a persistent install affordance inside `SettingsDialog` — including desktop Chrome/Edge and phones where the Phase 28 banner was already dismissed. All install copy (the Phase 28 banner block plus the new Settings entry) is finalized for both EN and PT-BR.

Covers requirements INSTALL-06 and INSTALL-07. Builds directly on Phase 28: the `useBeforeInstallPrompt` / `useIsStandaloneOrPhone` hooks, the `InstallBanner` component, and the `UiStrings.install` copy block (EN final, PT-BR draft) already exist.

</domain>

<decisions>
## Implementation Decisions

### Settings entry placement & form
- **D-01:** The install entry sits in `SettingsDialog`'s single column **below the Language picker, above the Close button** — last block before Close. The 5 customization pickers (Theme → Variant → Cue → Timbre → Language) stay grouped; install reads as a separate app-level utility.
- **D-02:** Form is a **single labeled action row** — a section label plus one action, mirroring how each picker has a `sectionLabel`. Not the whole `InstallBanner` component, not plain text + link.
- **D-03:** Section label copy direction is **"Install for offline use"** — benefit-describing, banner-style one-liner (longer than the one-word picker labels). Final EN/PT-BR wording locked in the localization pass.
- **D-04:** When the app is already installed (standalone display mode), the install entry is **hidden entirely** — no row, no "installed" confirmation. Satisfies INSTALL-06's installed-mode absence (SC4). `useIsStandaloneOrPhone` already detects standalone.

### iOS path inside the dialog
- **D-05:** On iOS the install steps **inline-expand within `SettingsDialog`**, below the install row — the same inline-expand pattern as the Phase 28 banner (D-05 of Phase 28). No nested/sub-dialog (no modal-on-modal), no always-expanded steps.
- **D-06:** The iOS step content (numbered Share → Add to Home Screen steps + the inline iOS Share glyph) is **extracted into a shared component** that both `InstallBanner` and the Settings entry render. One source of truth — no copy drift between the two surfaces.
- **D-07:** On Android (and desktop Chrome/Edge), the install row triggers the native prompt via the captured `beforeinstallprompt`. After install completes, standalone detection flips and the **entry hides on next dialog open (re-gate)**. If the prompt is consumed without installing, the row remains. Never a dead/clickable-but-broken button.

### Desktop / no-install browsers
- **D-08:** The Settings install entry is shown **only when an install path actually exists** — `beforeinstallprompt` was captured (Chrome/Edge, desktop or mobile) OR the platform is iOS. Desktop Firefox/Safari (no `beforeinstallprompt`, no PWA-install mechanism) see **no entry at all** — never a dead end. Mirrors Phase 28 D-08 ("no banner with a dead button").
- **D-09:** Desktop Chrome/Edge get the **identical native-prompt install button** as Android — form factor (phone vs desktop) does not change the Settings path; only browser install *capability* does.
- **D-10:** **INSTALL-06 clarification:** INSTALL-06 literally says the entry is present "including desktop". Intent is interpreted as "present wherever installation is possible." Desktop Chrome/Edge are covered; desktop Firefox/Safari intentionally show nothing because no install path exists. Planner and verifier should treat D-08 as the correct INSTALL-06 behavior, not a coverage gap.

### PT-BR copy finalization
- **D-11:** PT-BR install copy is finalized via the **Phase 26-style native-speaker review process** — draft PT-BR strings carry review markers, get finalized to native quality, and the existing fs-scan drift-guard test (`content.no-review-markers.test.ts` pattern) confirms the done-state.
- **D-12:** The localization pass covers **all install copy** — the Phase 28 banner `UiStrings.install` block AND the new Settings entry strings — finalized together in one consistent review (INSTALL-07 spans both surfaces).
- **D-13:** **Claude drafts** the native-quality PT-BR translations (applying the Phase 26 RPM/VFC glossary and short-label discipline); the **operator reviews and approves** before review markers are removed.

### Claude's Discretion
- Exact final wording of the EN + PT-BR install-entry label/copy — direction is locked (D-03: "Install for offline use" style), exact strings settled in implementation/copy pass.
- Whether the shared iOS-steps component (D-06) lives in `src/components/` as a standalone file or alongside `InstallBanner` — planner decides; constraint: both surfaces import the same component.
- How the Settings install row's installability state is wired (lift `useBeforeInstallPrompt` to a shared owner, context, or prop-drill from `App.tsx`) — planner decides; constraint: banner and Settings entry observe the same captured prompt.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` §"Phase 29: Settings Install Entry & Localization" — goal, 4 success criteria, dependency on Phase 28
- `.planning/REQUIREMENTS.md` — INSTALL-06, INSTALL-07; note the Out-of-Scope table (no desktop banner, no banner re-surfacing after dismissal, no install analytics). INSTALL-06 is clarified by D-10 above.

### Phase 28 carry-forward (the foundation this phase extends)
- `.planning/phases/28-phone-install-banner/28-CONTEXT.md` — Phase 28 decisions D-01..D-10 (banner placement, iOS inline-expand, locale handoff)
- `.planning/phases/28-phone-install-banner/28-SUMMARY.md` files (28-01/02/03) — what was built
- `src/components/InstallBanner.tsx` — Android-button + iOS-inline-steps component; the iOS steps + `IOsShareIcon` are the extraction target for D-06
- `src/hooks/useBeforeInstallPrompt.ts` — captures `beforeinstallprompt`, exposes `triggerInstall` (replays the native prompt)
- `src/hooks/useIsStandaloneOrPhone.ts` — standalone (installed) + phone/iOS detection; gates D-04/D-08
- `src/content/strings.ts` — `UiStrings.install` block (EN final, PT-BR draft) — the localization pass finalizes the PT-BR slot

### Localization process precedent
- `.planning/phases/26-pt-br-native-speaker-review/` — Phase 26 native-speaker review: review-marker convention + `content.no-review-markers.test.ts` fs-scan drift-guard. D-11 reuses this mechanism.

No external ADRs/specs — requirements fully captured in ROADMAP/REQUIREMENTS and the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/SettingsDialog.tsx` — native `<dialog>`, single-column layout, order Theme → Variant → Cue → Timbre → Language → Close. Each picker takes `strings` + `sectionLabel`/`disabled`. The install row mounts here, below `LanguagePicker` (D-01), as a labeled action row matching the picker rhythm (D-02).
- `src/components/InstallBanner.tsx` — iOS inline-expand steps + `IOsShareIcon`; the steps content is extracted into a shared component for D-06.
- `src/hooks/useBeforeInstallPrompt.ts`, `src/hooks/useIsStandaloneOrPhone.ts` — install capability + standalone/iOS detection; reused unchanged for the Settings gate.
- `src/hooks/useLocale.ts` — `{ locale, uiStrings }`; the Settings entry consumes `uiStrings.install`.
- `src/content/strings.ts` — `UiStrings` nested catalog; add Settings-entry strings to the `install` block, finalize PT-BR for the whole block.

### Established Patterns
- UI strings never inline in components — all banner + Settings install copy routes through `strings.ts` (D-02 of `strings.ts` header).
- `SettingsDialog` D-05: single `onClose` prop, not a destructive action — the install row is non-destructive, fits this pattern.
- `SettingsDialog` threads `inSessionView` as `disabled` to all pickers; the install row should follow the same in-session disabled contract if applicable.
- Phase 26 review-marker + fs-scan drift-guard test is the locked done-state mechanism for PT-BR copy (D-11).

### Integration Points
- New install-row block inside `SettingsDialog.tsx` below `LanguagePicker`, gated on: installable (`beforeinstallprompt` captured OR iOS) AND not standalone.
- Shared iOS-steps component extracted from `InstallBanner.tsx`, imported by both `InstallBanner` and the Settings entry.
- `useBeforeInstallPrompt` state must be observable by both the banner (in `App.tsx`) and the Settings entry — planner decides the wiring (shared owner / context / prop-drill).

</code_context>

<specifics>
## Specific Ideas

- The Settings entry deliberately reuses Phase 28's inline-expand iOS pattern rather than introducing a sub-dialog — `SettingsDialog` is already a modal `<dialog>`, and modal-on-modal was explicitly rejected.
- "Install for offline use" framing (D-03) ties the install action to the concrete benefit (offline sessions) delivered by the Phase 27 PWA service worker.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Desktop install banners, banner re-surfacing after dismissal, and install analytics remain out of scope per the REQUIREMENTS.md Out-of-Scope table.

</deferred>

---

*Phase: 29-Settings Install Entry & Localization*
*Context gathered: 2026-05-16*
