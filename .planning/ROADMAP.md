# Roadmap: HRV Breathing WebApp

## Milestones

- â **v1.0 MVP** â Phases 1â6 + Phase 5.1 INSERTED (shipped 2026-05-11)
- â **v1.0.1 Code Review Patch** â Phases 7â12 (shipped 2026-05-12)
- â **v1.1 Customization** â Phases 13â19 + 16.1/16.2/16.3 INSERTED (shipped 2026-05-15)
- â **v1.2 BPM Stretch** â Phases 20â22 (shipped 2026-05-15)
- ð§ **v1.3 Release Polish** â Phases 23â27 (planning started 2026-05-15)

## Phases

<details>
<summary>â v1.0 MVP (Phases 1â6 + 5.1 INSERTED) â SHIPPED 2026-05-11</summary>

- [x] **Phase 1: Configurable Session Timing** (4/4 plans) â completed 2026-05-09
- [x] **Phase 2: Visual Guide & Accessible Responsive Interface** (4/4 plans) â completed 2026-05-09
- [x] **Phase 3: Optional Generated Audio Cues** (5/5 plans) â completed 2026-05-09
- [x] **Phase 4: Local Memory & Practice Stats** (4/4 plans) â completed 2026-05-10
- [x] **Phase 5: Mobile Hands-Off Resilience** (4/4 plans) â completed 2026-05-10 *(S2 Android Chrome UAT carry-forward to v1.x)*
- [x] **Phase 5.1: Hands-Off Resilience Polish (INSERTED 2026-05-10)** (5/5 plans) â completed 2026-05-10 *(iOS audio recovery + Firefox flicker carry-forward to v1.x)*
- [x] **Phase 6: Learning & Claim-Safe Positioning** (4/4 plans) â completed 2026-05-11

Archive: `.planning/milestones/v1.0-ROADMAP.md`
Audit: `.planning/milestones/v1.0-MILESTONE-AUDIT.md` â PASSED 23/23
Requirements: `.planning/milestones/v1.0-REQUIREMENTS.md`

</details>

<details>
<summary>â v1.0.1 Code Review Patch (Phases 7â12) â SHIPPED 2026-05-12</summary>

- [x] **Phase 7: Strict Type & Lint Baseline** (4/4 plans) â completed 2026-05-11 â `tsconfig` strict + `strictTypeChecked` + `exhaustive-deps` error enforcement; 48 production lint errors fixed inline.
- [x] **Phase 8: Storage Forward-Compat & Cross-Tab UI Sync** (2/2 plans) â completed 2026-05-11 â Envelope spread-then-override, refuse-downgrade write, cross-tab `storage` listener.
- [x] **Phase 9: Audio + Wake Lock Lifecycle Hardening** (2/2 plans) â completed 2026-05-11 â Reconstruction generation counter, boundary-cue clamp, lead-in null-on-closed, per-cue node disconnect, defensive state-change handler, dead `'starting'` removal, wake-lock in-flight guard.
- [x] **Phase 10: Hooks Identity & Effect Hygiene** (2/2 plans) â completed 2026-05-12 â `mutedRef` stabilization, status-only deps on App rAF effects, per-phase frame identity, rAF cancel-guard ordering, explicit ref-updater deps.
- [x] **Phase 11: Domain, UI Contracts & Accessibility** (1/1 plans) â completed 2026-05-12 â Boundary validation in `extendTimedSession`, `SessionReadout` lead-in placeholder, symmetric auto-close for Learn/Reset dialogs, `MuteToggle` resume-mode a11y.
- [x] **Phase 12: Assets, Content & Hygiene Cleanup** (1/1 plans) â completed 2026-05-12 â Favicon `%BASE_URL%` fix, canonical amazon.com book URL, `isValid<X>` predicate relocation to `domain/settings`, `formatLastSessionDate` JSDoc, HYGIENE-01 docs-only flip (Overtaken by Phase 9 AUDIO-02).

Archive: `.planning/milestones/v1.0.1-ROADMAP.md`
Audit: `.planning/milestones/v1.0.1-MILESTONE-AUDIT.md` â PASSED 27/27
Requirements: `.planning/milestones/v1.0.1-REQUIREMENTS.md`
Phase artifacts: `.planning/milestones/v1.0.1-phases/`

</details>

<details>
<summary>â v1.1 Customization (Phases 13â19 + 16.1/16.2/16.3 INSERTED) â SHIPPED 2026-05-15</summary>

- [x] **Phase 13: Inner-Ring UX Symmetry** (1/1 plans) â completed 2026-05-12 â Reduced-motion inner-ring suppression; `.orb-layer--out` crossfade restored as sole substitute phase cue (WARMUP-01).
- [x] **Phase 14: Prefs Foundation** (1/1 plans) â completed 2026-05-12 â Envelope `prefs?` field; `isValid*` / `coerce*` predicates for theme/timbre/variant/locale (INFRA-01..03).
- [x] **Phase 15: SettingsDialog Shell** (4/4 plans) â completed 2026-05-13 â Native `<dialog>` gear-triggered settings panel with stub pickers; `inSessionView` disable contract (INFRA-04).
- [x] **Phase 16: Themes** (5/4 plans) â completed 2026-05-13 â CSS custom-property token system (`data-theme`); FOUC-prevention inline script; Light / Dark / System + 3 named palettes (THEME-01..05, THEME-UI-01).
- [x] **Phase 16.1: UI Token Migration (INSERTED 2026-05-13)** (7/7 plans) â completed 2026-05-13 â Migrated hardcoded Tailwind classes across 16 components to `var(--color-breathing-*)` tokens; `theme.no-hardcoded-classes.test.ts` guard active; contrast guard extended with accent-strong vs on-accent iteration.
- [x] **Phase 16.2: Palette Aesthetic Refresh (INSERTED 2026-05-13)** (2/2 plans) â completed 2026-05-13 â UAT carry-forward from 16.1 plan 06; 4 atomic per-palette gradient retunes (Light F1, Moss F4, Slate F5, Dusk F6+F7); perceptual aesthetic UAT deferred to 16.3.
- [x] **Phase 16.3: Thorough Theme Revision (INSERTED 2026-05-13)** (7/7 plans) â completed 2026-05-13 â 5 palettes redesigned from named open-source design systems (Nord Frost, Nord Polar Night, Everforest Light, Tokyo Night Day, RosÃ© Pine Main); per-palette THEME-05 â¥ 1.5 hold; 5/5 perceptual UAT approved.
- [x] **Phase 17: Visual Variants** (6/6 plans) â completed 2026-05-14 â Orb (default) + Square (18% rounded) + Diamond (rotated-square clip-path); render-only via dispatcher + sibling-shape pattern; sessionVariantRef capture-at-Start; old `'ring'` localStorage values coerce to default (CUST-03).
- [x] **Phase 18: Audio Timbres** (6/6 plans) â completed 2026-05-14 â 4 synthesized timbre presets (Bowl default + Bell + Sine + Chime) via `scheduleInCueForTimbre` / `scheduleOutCueForTimbre` dispatch; timbre captured at session start; Bowl default byte-identical (TIMBRE-01..05).
- [x] **Phase 19: Language Switching** (9/9 plans) â completed 2026-05-15 â EN+PT-BR instant React state swap; typed `Record<LocaleId, UiStrings>` catalog; `useLocale` orchestrator hook; `LanguagePicker` radiogroup with native endonyms; frozen-EN byte-equality guard on `LOCKED_COPY`; locale-aware `formatLastSessionDate`; 76 `// TODO: native-speaker review` markers persist as I18N-07 v1.x carry-forward (I18N-01..07).

Archive: `.planning/milestones/v1.1-ROADMAP.md`
Requirements: `.planning/milestones/v1.1-REQUIREMENTS.md`
Phase artifacts: `.planning/milestones/v1.1-phases/`

</details>

<details>
<summary>â v1.2 BPM Stretch (Phases 20â22) â SHIPPED 2026-05-15</summary>

- [x] **Phase 20: Session Start Polish** (1/1 plans) â completed 2026-05-15 â Primary button relabels to `Cancel`/`Cancelar` during the lead-in countdown via a three-way ternary label; double-start affordance removed (LEAD-01).
- [x] **Phase 21: Per-Theme Favicon** (2/2 plans) â completed 2026-05-15 â Shared `faviconPalette` module (5 accent colors + SVG template) + `useFavicon` hook with dual-event cross-tab sync; pre-paint inline favicon script in `index.html`; no FOUC; `favicon.sync.test.ts` drift guard (FAVI-01/02/03).
- [x] **Phase 22: BPM Stretch Session** (5/5 plans) â completed 2026-05-15 â BPM stretch mode (Warm-up â Stretch ramp â Settle) on the one-clock SessionFrame; piecewise-constant `stretchRamp.ts` engine with sub-0.5-BPM steps + cycle-aligned segment table; mode picker + 5-field stretch block + 15-min gate hint + computed-total readout; stretch settings persist via the existing envelope; dual-anchor audio holds across the ramp; operator-UAT-driven UX redesign mid-checkpoint (STRETCH-01..08).

Archive: `.planning/milestones/v1.2-ROADMAP.md`
Requirements: `.planning/milestones/v1.2-REQUIREMENTS.md`

</details>

### ð§ v1.3 Release Polish (Phases 23â27) â IN PROGRESS

- [x] **Phase 23: LICENSE + README** â MIT `LICENSE` file added + a claim-safe, accurate README for repo distribution-readiness. (completed 2026-05-15)
- [x] **Phase 24: Forrest Native-App Links** â Two outbound Resonant Breathing store links (iOS + Android) on the Learn surface, EN + PT-BR. (completed 2026-05-15)
- [ ] **Phase 25: Labels-vs-Icons Cue Toggle** â A 5th SettingsDialog picker switching the in-orb In/Out cue between text labels, arrow icons, and a nose-airflow drawing, accessible across all 3 variants.
- [ ] **Phase 26: PT-BR Native-Speaker Review** â Every `// TODO: native-speaker review` marker resolved and removed by a native-speaker pass; locked-copy guards intact.
- [ ] **Phase 27: PWA Install & Offline** â Installable Web App Manifest + offline-capable service worker, verified on a real iOS device in installed standalone mode.

## Phase Details

### Phase 23: LICENSE + README
**Goal**: The repository is distribution-ready with proper licensing and an accurate, claim-safe README.
**Depends on**: Nothing (first v1.3 phase; smallest blast radius â repo root only, zero `src/` files)
**Requirements**: DOCS-01, DOCS-02
**Success Criteria** (what must be TRUE):
  1. The repository root contains a `LICENSE` file with the MIT License text and the copyright line `Copyright (c) 2026 Renato Lucindo`.
  2. The README accurately describes the app, its purpose, and the local dev/build setup (`npm install`, dev server, `npm run build`).
  3. The README states the project's claim-safe positioning â guided breathing practice, inspired by Forrest Knutson's teachings â and contains no medical, therapeutic, or diagnostic claims.
  4. The README clarifies the Forrest-attribution boundary: references to Forrest Knutson and Resonant Breathing are attribution/inspiration only; his name, content, and apps remain his.
  5. The per-commit green-gate (`tsc && lint && build && test`) still passes (this phase touches no `src/` files, so it passes trivially).
**Plans**: 1 plan

Plans:
- [x] 23-01-PLAN.md — Add MIT LICENSE file + refresh README.md for v1.3 accuracy and claim-safe positioning

### Phase 24: Forrest Native-App Links
**Goal**: Users can reach Forrest Knutson's native Resonant Breathing apps directly from the Learn surface.
**Depends on**: Phase 23
**Requirements**: LEARN-01
**Success Criteria** (what must be TRUE):
  1. A user can open Forrest Knutson's Resonant Breathing app on the iOS App Store from the Learn surface.
  2. A user can open Forrest Knutson's Resonant Breathing app on Google Play from the Learn surface.
  3. Both links open in a new tab/window and the link labels are localized in EN and PT-BR (new `pt-BR` labels carry the `// TODO: native-speaker review` marker).
  4. The new links sit inside the existing LearnDialog structure and do not alter or weaken the locked claim-safe copy; link copy stays neutral and descriptive (no benefit-claiming language).
**Plans**: 1 plan
**UI hint**: yes

Plans:
- [x] 24-01-PLAN.md — Add iOS App Store + Google Play "Resonant Breathing" links to LearnDialog (EN + PT-BR, claim-safe)

### Phase 25: Labels-vs-Icons Cue Toggle
**Goal**: Users can choose how the in-orb In/Out breathing cue is shown — text labels, directional arrow icons, or a nose-airflow drawing.
**Depends on**: Phase 24
**Requirements**: CUE-01, CUE-02, CUE-03
**Success Criteria** (what must be TRUE):
  1. A user can switch the in-orb In/Out cue between text labels, arrow icons, and a nose-airflow drawing via a new three-option picker in SettingsDialog.
  2. The user's cue-style choice persists across reloads via the existing localStorage prefs envelope, with no `STATE_VERSION` bump.
  3. In arrow and drawing modes, a screen reader still announces the localized In/Out word (visually-hidden localized text + `aria-hidden` SVG), and the existing `aria-live` phase announcements are unchanged.
  4. The arrow and drawing cues read clearly and unambiguously across all 3 visual variants (Orb, Square, Diamond), under `prefers-reduced-motion`, and across all 5 palettes.
  5. The default cue style is `'labels'` (Text), so users who never open SettingsDialog see today's exact rendering with zero regression.
**Plans**: TBD
**UI hint**: yes

### Phase 26: PT-BR Native-Speaker Review
**Goal**: The PT-BR translation reads naturally to a native speaker and the codebase no longer signals unreviewed strings.
**Depends on**: Phase 25 (must run after Phases 24 and 25 so the single native-speaker pass also covers the new PT-BR strings those phases introduce)
**Requirements**: I18N-07
**Success Criteria** (what must be TRUE):
  1. Every machine-translated PT-BR string in `src/content/` catalogs has been reviewed by a native speaker and corrected where needed.
  2. A `grep` for `// TODO: native-speaker review` across `src/content/` returns zero matches at phase close.
  3. The frozen-EN `LOCKED_COPY` byte-equality guard (`lockedCopy.test.ts`) stays green â the EN side of locked copy is untouched.
  4. The `Record<LocaleId, UiStrings>` type completeness holds â only PT-BR string values change, never keys; `tsc` in the green-gate passes.
  5. The reviewed PT-BR strings render without overflow on a narrow mobile viewport (including the new Phase 24 link labels and Phase 25 picker strings).
**Plans**: TBD

### Phase 27: PWA Install & Offline
**Goal**: Users can install the app to their home screen / desktop and run a breathing session fully offline.
**Depends on**: Phase 26 (and effectively all prior phases â service-worker caching must wrap a frozen, verified app)
**Requirements**: PWA-01, PWA-02, PWA-03
**Success Criteria** (what must be TRUE):
  1. A user can install the app to their home screen / desktop via the browser-native install affordance; the Web App Manifest has correct `scope`/`start_url`/`id` for the `/hrv/` base path, maskable icons, and an explicit Apple touch icon.
  2. A user can start and complete a breathing session fully offline â a service worker precaches the app shell and all static assets.
  3. After a redeploy, the installed app updates to the latest version without serving a stale shell, and a service-worker-triggered reload never interrupts a running breathing session.
  4. The theme and favicon pre-paint inline scripts still run with no FOUC in installed standalone mode.
  5. A first-class real-device UAT confirms install, offline session, audio cues, and wake-lock behavior on a physical iOS device in installed standalone mode (iOS < 18.4 standalone wake-lock loss documented as a known limitation, not a blocker).
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
| 13. Inner-Ring UX Symmetry | v1.1 | 1/1 | Complete | 2026-05-12 |
| 14. Prefs Foundation | v1.1 | 1/1 | Complete | 2026-05-12 |
| 15. SettingsDialog Shell | v1.1 | 4/4 | Complete | 2026-05-13 |
| 16. Themes | v1.1 | 5/4 | Complete | 2026-05-13 |
| 16.1. UI Token Migration | v1.1 | 7/7 | Complete | 2026-05-13 |
| 16.2. Palette Aesthetic Refresh | v1.1 | 2/2 | Complete | 2026-05-13 |
| 16.3. Thorough Theme Revision | v1.1 | 7/7 | Complete | 2026-05-13 |
| 17. Visual Variants | v1.1 | 6/6 | Complete | 2026-05-14 |
| 18. Audio Timbres | v1.1 | 6/6 | Complete | 2026-05-14 |
| 19. Language Switching | v1.1 | 9/9 | Complete | 2026-05-15 |
| 20. Session Start Polish | v1.2 | 1/1 | Complete | 2026-05-15 |
| 21. Per-Theme Favicon | v1.2 | 2/2 | Complete | 2026-05-15 |
| 22. BPM Stretch Session | v1.2 | 5/5 | Complete | 2026-05-15 |
| 23. LICENSE + README | v1.3 | 1/1 | Complete   | 2026-05-15 |
| 24. Forrest Native-App Links | v1.3 | 1/1 | Complete    | 2026-05-15 |
| 25. Labels-vs-Icons Cue Toggle | v1.3 | 0/? | Not started | - |
| 26. PT-BR Native-Speaker Review | v1.3 | 0/? | Not started | - |
| 27. PWA Install & Offline | v1.3 | 0/? | Not started | - |

## Backlog

*(none currently)*
