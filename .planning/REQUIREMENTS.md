# Requirements: HRV Breathing WebApp — v2.0 New Design

**Defined:** 2026-05-20
**Core Value:** Users can start a hands-off Forrest Knutson practice — HRV breathing, Stretch, or Navi Kriya — and comfortably follow accurate, uninterrupted guidance through synchronized visuals and optional sound.

**Design contract:** `.planning/spikes/MANIFEST.md` Requirements (spike 010 Monochrome Zen visual system, 12+ operator decisions locked across 14 iterations on 2026-05-19 → 2026-05-20).

## v2.0 Requirements

Requirements for the v2.0 New Design milestone. Each maps to exactly one phase.

### HOUSE — Housekeeping bookkeeping (Phase 36)

Procedural debt closeout — restores v1.5 phase directories from git, backfills the missing artifacts, then re-archives. No user-visible behavior change.

- [x] **HOUSE-01**: Phase 12 `VALIDATION.md` is written (Nyquist coverage gap fill from `12-01-PLAN.md`); status `passed`.
- [x] **HOUSE-02**: Phase 12 `SECURITY.md` is written (threat model extracted from `12-01-PLAN.md` inline notes); status `passed`.
- [x] **HOUSE-03**: Phase 33 `VALIDATION.md` is written; status `passed`.
- [x] **HOUSE-04**: Phase 35 `VALIDATION.md` is written; status `passed`.
- [x] **HOUSE-05**: Phase 31 `VERIFICATION.md` frontmatter is re-flipped from `human_needed` to `passed` (all 9 items operator-confirmed in `31-HUMAN-UAT.md`).
- [x] **HOUSE-06**: Phase 32 / 33 / 34 / 35 SUMMARY `requirements-completed` frontmatter is populated from VERIFICATION.md evidence (cross-check the audit table).
- [x] **HOUSE-07**: Legacy `VERIFICATION.md` frontmatter is re-flipped from `human_needed` to `passed` for Phases 02, 03, 05, 15, 18 (operator-confirmed at the time per milestone records).
- [x] **HOUSE-08**: Phase 28-01 / 28-03 SUMMARY drift is corrected (field count + superseded `SafariNavigator` reference removed; code is canonical).
- [x] **HOUSE-09**: A regression test exists exercising the full v1 → v2 → v3 chained `migrateEnvelope` ladder (returning user with a v1 flat envelope migrates losslessly across both bumps in a single read).
- [x] **HOUSE-10**: Restored v1.5 phase directories are re-archived to `.planning/milestones/v1.5-phases/` after backfill (clean working tree, no stray `D` files).
- [x] **HOUSE-11**: The root `CLAUDE.md` is removed from the repository (`git rm CLAUDE.md`). It pointed to the `spike-findings-hrv` skill which is being removed alongside it (HOUSE-12).
- [x] **HOUSE-12**: The `.claude/skills/spike-findings-hrv/` directory and all its contents (SKILL.md, references/, sources/ — 22 tracked files total) are removed from the repository. The skill won't be used during v2.0 build — spike implementation patterns either landed in v1.5 or are now codified in `.planning/spikes/MANIFEST.md` Requirements.
- [x] **HOUSE-13**: `.claude/` is added to `.gitignore` (single-line entry — covers `scheduled_tasks.lock`, `settings.local.json`, `worktrees/`, and any future Claude Code per-project files). This prevents the directory from being re-committed by accident.
- [x] **HOUSE-14**: All Phase 36 commits are pushed to `origin/main` after phase close. Phase 36 changes are docs + bookkeeping only (no source code), so the push happens inside the phase rather than waiting for milestone close — `CLAUDE.md` + `.claude/skills/spike-findings-hrv/` are removed from `origin/main`, and the v1.5 backfill commits land publicly so the GSD baseline is reset for v2.0.

### STATS — Stats UI removal (Phase 37)

Anti-gamification stance from spike-010. Computation + persistence stay; the visible surface goes.

- [ ] **STATS-01**: `StatsFooter.tsx` is removed from the app shell.
- [ ] **STATS-02**: `ResetStatsDialog.tsx` is removed from the app shell.
- [ ] **STATS-03**: The "Reset stats" affordance is removed from Practice Settings (per-practice `resetPracticeStats` UI control).
- [ ] **STATS-04**: `recordSession()` continues to compute + persist stats to `localStorage` (regression test confirms — open app, complete a session, reload, confirm stats incremented in the envelope).
- [ ] **STATS-05**: No user-visible "12 MIN TODAY · STREAK 5d" or equivalent stat surface appears anywhere in the UI (audit Idle, Running, Complete, Learn, App Settings).

### VAR — Variant removal (Phase 38)

Drop the Square + Diamond shape variants. Orb only. User-visible variant picker goes away.

- [ ] **VAR-01**: `Square` shape variant is removed from `BreathingShape.tsx` and the `Variant` union.
- [ ] **VAR-02**: `Diamond` shape variant is removed from `BreathingShape.tsx` and the `Variant` union.
- [ ] **VAR-03**: The variant picker is removed from the user `SettingsDialog`.
- [ ] **VAR-04**: `sessionVariantRef` Start-capture invariant is removed (single-orb shape — no longer needed).
- [ ] **VAR-05**: Persisted `variant: 'square' | 'diamond'` is coerced to `'orb'` on read via `coerceSettings` (forward-compat — no `STATE_VERSION` bump).
- [ ] **VAR-06**: All variant-specific tokens / CSS / strings are deleted (zero leftover references in `theme.css`, EN/PT-BR catalogs, or test fixtures).

### THM — Theme simplification (Phase 39)

Collapse 5-palette + system → 2-palette + system. ThemePicker becomes Light / Dark / System.

- [ ] **THM-01**: `Moss` palette is removed from `theme.css` + the `ThemeId` union.
- [ ] **THM-02**: `Slate` palette is removed.
- [ ] **THM-03**: `Dusk` palette is removed.
- [ ] **THM-04**: `ThemePicker` is reduced to `Light` / `Dark` / `System` (3 options total; `System` follows OS).
- [ ] **THM-05**: Persisted `theme: 'moss' | 'slate' | 'dusk'` is coerced to `'system'` on read; the user pref re-persists as `'system'` going forward (forward-compat — no `STATE_VERSION` bump).
- [ ] **THM-06**: The `faviconPalette` set is reduced to `light` + `dark` only (system resolves to OS-active palette at runtime).
- [ ] **THM-07**: `favicon.sync.test.ts` is updated to guard the 2-palette mapping (drift-guard intact).
- [ ] **THM-08**: WCAG luminance contrast guard regenerated for the new 2-palette + system surface.

### PREV — Timbre preview cue (Phase 40) — NEW (not in spike)

Operator-added: switching the Timbre selection in App Settings plays the inhale cue once at the current pitch as an audible preview.

- [ ] **PREV-01**: Switching the Timbre selection in App Settings plays the inhale cue once at the current pitch.
- [ ] **PREV-02**: Preview routes through the existing `cueSynth` scheduler (same code path as in-session cues).
- [ ] **PREV-03**: Preview plays even when the current `MuteToggle` is muted (this is a preview, not a session cue — operator can audition without unmuting).
- [ ] **PREV-04**: Preview is only triggered outside an active session (App Settings is inaccessible during a session in the redesign anyway).
- [ ] **PREV-05**: Preview latency is acceptable (≤ 100 ms from picker tap to first audio sample on commodity hardware).

### TOK — Mono Zen palette + tokens (Phase 41)

Apply the spike-010 light + dark palettes and introduce the new token vocabulary.

- [ ] **TOK-01**: Light palette tokens applied — `bg #f3f5f7`, `surface #ffffff`, `accent #5d6877` (cool slate), per spike-010.
- [ ] **TOK-02**: Dark palette tokens applied — `bg #1a1d24`, `surface #252932`, `accent #b4bac4` (cool dimmed mid-slate; explicitly NOT bleached white), per spike-010.
- [ ] **TOK-03**: `borderSoft` token is added to the theme vocabulary (addresses the dark-theme token-collapse pattern from spike-008).
- [ ] **TOK-04**: `textSoft` token is added (used by top-bar icons and the new MuteToggle chrome).
- [ ] **TOK-05**: `orbHalo1` / `orbHalo2` / `orbHalo3` rgba tokens are introduced (replace previous orb gradient + ring tokens).
- [ ] **TOK-06**: `onAccent` token is added (used for the breath label rendered inside the centre disc).
- [ ] **TOK-07**: Semibold Inter typography is applied app-wide (replaces existing weight).
- [ ] **TOK-08**: WCAG luminance contrast guard passes on the new light + dark palettes (≥ 1.5 on orb In/Out midpoints; ≥ 4.5 AA on all text-against-surface combinations).

### ORB — New orb implementation (Phase 42)

Rebuild the orb per spike-010: three-layer halo + centre disc with the in-disc breath label, two dev-toggled shapes, preserved ring cues.

- [ ] **ORB-01**: Orb is rebuilt as a three-layer translucent-halo (using `orbHalo1/2/3` tokens) + solid centre disc with asymmetric border-radii (organic-puddle feel).
- [ ] **ORB-02**: The breath label (In/Out, localized) is rendered inside the centre disc in `onAccent` color.
- [ ] **ORB-03**: V1 (Orb-halo) shape variant ships behind `VITE_BREATHING_SHAPE=orb-halo`.
- [ ] **ORB-04**: V2 (Minimal) shape variant ships — single accent disc + faint halo, behind `VITE_BREATHING_SHAPE=minimal-rings`.
- [ ] **ORB-05**: `VITE_BREATHING_SHAPE` dev toggle (build-time env var; same shape as `VITE_SWITCHER_TREATMENT` from spike-007).
- [ ] **ORB-06**: `VITE_ORB_IDLE_BEHAVIOR=still|ambient` dev toggle — `still` = no animation + empty disc; `ambient` = gentle scale animation + no In/Out label.
- [ ] **ORB-07**: End-of-phase outer ring cue is always visible during a Running session (marks end-of-inhale).
- [ ] **ORB-08**: End-of-phase inner ring cue appears only during the exhale phase (marks end-of-exhale).
- [ ] **ORB-09**: Both ring cues are hidden on Idle (A) and Complete (C) screens — even when ambient-breath idle is active.
- [ ] **ORB-10**: `MuteToggle.tsx:52` chrome updated from `border-[var(--color-breathing-accent)]` + `text-[var(--color-breathing-accent-strong)]` to `borderSoft` + `textSoft` (matches top-bar icon weight); hit area stays 44 px (size-11) — only colour classes change.
- [ ] **ORB-11**: Both V1 and V2 carry the same end-of-phase ring cue contract (ORB-07/08/09).

### UX — Five-surface redesign (Phase 43)

The full visual + interaction redesign across all five app surfaces, plus the V3 install banner, desktop layout, and no-jiggle invariant.

- [ ] **UX-01**: A new App Settings page exists, opened by the gear icon in the top app bar. Sections: Appearance, Language, Audio, About.
- [ ] **UX-02**: The theme picker moves from the Practice Settings sheet to App Settings (Appearance section).
- [ ] **UX-03**: Idle screen renders a 2×3 Grid SetupCard showing the active practice's settings — 1 row for 3-setting practices (HRV/Navi), 2 rows for Stretch's 6 settings.
- [ ] **UX-04**: The whole Grid SetupCard is the tap target → opens the Practice Settings sheet. A right-chevron affordance is vertically centred to the card.
- [ ] **UX-05**: Practice Settings opens as a bottom sheet on mobile and a center modal on desktop (responsive breakpoint).
- [ ] **UX-06**: Practice Settings sheet content per practice — HRV/Stretch: BPM + Ratio + Duration steppers + Cue timbre + Cue sound. Navi: Front OM count + Rounds + Cue timbre + Cue sound + Per-OM tick.
- [ ] **UX-07**: Running screen renders the orb breathing (In/Out inside disc) with practice-specific feedback under the orb — HRV uses a time-based primitive (large remaining time + small pace caption); Stretch and Navi share a `FeedbackCount` primitive (big primary number + small "of N" mid + small uppercase tracked context line).
- [ ] **UX-08**: Running screen disables the practice switcher (consistent with v1.5 behavior).
- [ ] **UX-09**: Running screen exposes End + Mute controls only.
- [ ] **UX-10**: Complete screen renders the orb (still + subtle check marker in centre disc), the line "Session complete · Take a moment", and Done + Mute controls. (Operator may drop this screen at implementation — decision deferred per spike-010.)
- [ ] **UX-11**: Learn surface is reorganized: info icon in the top app bar opens it; sections cover About Forrest, per-practice intros, and Resources.
- [ ] **UX-12**: V3 inline-card install banner replaces the current `InstallBanner.tsx` — rounded `surface` card with `borderSoft` border, app-icon glyph on the left, two-line content (title + locked `bannerText` sub-line "Add to your home screen for offline use"), tap-to-install affordance with right chevron, plus a small dismiss X.
- [ ] **UX-13**: Install banner is mobile-only + idle-only (never on desktop, never during Running / Complete); renders below the top app bar so the orb position doesn't shift on appear/dismiss.
- [ ] **UX-14**: Install banner action label branches on `isIOS` — "Install" (Android / Chrome triggers `deferredPrompt`) vs "How to install" (iOS expands the existing `IosInstallSteps` panel below the card).
- [ ] **UX-15**: Desktop layout — locked mobile design renders inside a centered column: 520 px wide for practice screens (A/B/C), 600 px for Learn + App Settings. Orb scales up to 320 px diameter.
- [ ] **UX-16**: Practice Settings becomes a center modal at desktop sizes (instead of a bottom sheet).
- [ ] **UX-17**: No-jiggle invariant — every screen state (Idle / Running / Complete) fits inside the viewport at all supported sizes without vertical scrolling.
- [ ] **UX-18**: No-jiggle invariant — switching practices (HRV ↔ Stretch ↔ Navi) does not cause vertical layout shifts of the orb, switcher, or controls.
- [ ] **UX-19**: No-jiggle invariant — phase transitions (A ↔ B ↔ C) do not cause vertical layout shifts.
- [ ] **UX-20**: Top app bar icons (info + gear) use `borderSoft` + `textSoft` — same visual weight as the MuteToggle chrome (ORB-10).
- [ ] **UX-21**: All five surfaces verified at the smallest device width (320 px) in EN + PT-BR, including the wordiest practice (Stretch's 6-setting Idle SetupCard).
- [ ] **UX-22**: `LOCKED_COPY` strings (`install.*`, claim-safe disclaimers, Forrest framing) carry verbatim through the redesign; frozen-EN byte-equality guard intact.

### POLISH — Final polish (Phase 44)

Closeout sweep — code review, test cleanup, comment audit, refactoring, security re-review, readability.

- [ ] **POLISH-01**: Full-codebase `/gsd-code-review --all --fix` sweep — zero Warning-severity findings open at milestone close.
- [ ] **POLISH-02**: 28 Info-severity findings from the 2026-05-16 deep code review are dispositioned (each: fixed, deferred-with-reason, or marked obsolete by the redesign).
- [ ] **POLISH-03**: Test cleanup — Vitest test names are tight; redundant tests removed; no flake. Final test count documented.
- [ ] **POLISH-04**: Comment audit (Tiger Style) — no narration of WHAT; only WHY-comments survive (constraints, invariants, surprising behavior, workarounds).
- [ ] **POLISH-05**: Refactoring pass — any duplication or boundary violations introduced by the redesign are resolved.
- [ ] **POLISH-06**: Security re-review — `/gsd-secure-phase 44` on the full milestone surface; new attack surfaces (preview audio path, new env vars, dev toggles) reviewed.
- [ ] **POLISH-07**: Readability pass — file/function/token names align with the new mono-zen vocabulary; no leftover references to dropped variants/themes.
- [ ] **POLISH-08**: Zero net-new runtime dependencies (carrying the v1.0.1 invariant — `dependencies` stays `react` + `react-dom`).
- [ ] **POLISH-09**: Per-commit green-gate maintained throughout v2.0 (`tsc && lint && build && test` exits 0 on every commit on `main`).

## Future Requirements

Deferred to v2.x+ or later. Tracked but not in the v2.0 roadmap.

### Stats display
- **STATSDISPLAY-01**: Stats display surface (re-introduce after a deliberate anti-gamification-compatible design decision — calm, non-comparative, no streaks/leaderboards).

### iOS audio recovery
- **IOSAUD-01**: iOS Safari mid-page audio recovery after lock/unlock (Override SC1, OS-level audio session loss). Single v2.0 carry-forward known bug — needs more investigation.
- **IOSAUD-02**: iOS Safari Pitfall 6 — phone-call interrupted state (domain overlap with IOSAUD-01).

### Wake lock
- **WAKELOCK-01**: iOS standalone-PWA Wake Lock < 18.4 detect-and-warn (WebKit bug 254545 — product decision still pending).
- **WAKELOCK-02**: S2 Android Chrome wake-lock real-device UAT (physical device unavailable — deferred until accessible).

### Complete screen
- **COMPLETE-01**: Drop the Complete screen entirely (operator decision deferred to Phase 43 implementation; if kept, no further work needed).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts, login, cloud sync, profiles | Local-only, low-friction stance carries from v1.0 |
| Medical / therapeutic / diagnostic claims | Guided breathing practice, not health advice |
| Biofeedback (camera pulse, HR sensors, HRV measurement) | Future exploration, not v2.0 |
| Streaks, leaderboards, achievements, gamified pressure | Anti-gamification stance (spike-010); calm history only |
| Unlicensed Forrest Knutson logos / protected assets | Permission-dependent; text + link references only |
| Native mobile/watch apps and health platform integrations | Web-first is the project motivation |
| Large content library, voice coaching, ads, intrusive monetization | Distracts from the focused breathing guide |
| Stats display surface in v2.0 | Anti-gamification stance — computation continues, display deferred to a future deliberate decision |
| Multi-column desktop layout | Design intentionally stays consistent with mobile — centered column only (spike-010) |
| User-facing shape variant picker | Removed — `VITE_BREATHING_SHAPE` is dev-only (spike-010) |
| User-facing orb idle behavior picker | Removed — `VITE_ORB_IDLE_BEHAVIOR` is dev-only (spike-010) |
| User-facing switcher A/B treatment picker | Already dev-only since v1.5 — `VITE_SWITCHER_TREATMENT` carries unchanged |
| Re-introduction of Square / Diamond shape variants | Spike-010 rejected; Orb-family only |
| Re-introduction of Moss / Slate / Dusk themes | Spike-010 rejected; light + dark + system only |
| Firefox Desktop orb scale-animation flicker (Override FF-01) | Dropped permanently — old `.orb` keyframes don't survive Phase 42 rewrite; cross-browser testing happens against new orb code |

## Traceability

Each v2.0 requirement maps to exactly one phase. Mapping locked by the roadmapper on 2026-05-20.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HOUSE-01 | Phase 36 | Complete |
| HOUSE-02 | Phase 36 | Complete |
| HOUSE-03 | Phase 36 | Complete |
| HOUSE-04 | Phase 36 | Complete |
| HOUSE-05 | Phase 36 | Complete |
| HOUSE-06 | Phase 36 | Complete |
| HOUSE-07 | Phase 36 | Complete |
| HOUSE-08 | Phase 36 | Complete |
| HOUSE-09 | Phase 36 | Complete |
| HOUSE-10 | Phase 36 | Complete |
| HOUSE-11 | Phase 36 | Complete |
| HOUSE-12 | Phase 36 | Complete |
| HOUSE-13 | Phase 36 | Complete |
| HOUSE-14 | Phase 36 | Complete |
| STATS-01 | Phase 37 | Planned |
| STATS-02 | Phase 37 | Planned |
| STATS-03 | Phase 37 | Planned |
| STATS-04 | Phase 37 | Planned |
| STATS-05 | Phase 37 | Planned |
| VAR-01 | Phase 38 | Planned |
| VAR-02 | Phase 38 | Planned |
| VAR-03 | Phase 38 | Planned |
| VAR-04 | Phase 38 | Planned |
| VAR-05 | Phase 38 | Planned |
| VAR-06 | Phase 38 | Planned |
| THM-01 | Phase 39 | Planned |
| THM-02 | Phase 39 | Planned |
| THM-03 | Phase 39 | Planned |
| THM-04 | Phase 39 | Planned |
| THM-05 | Phase 39 | Planned |
| THM-06 | Phase 39 | Planned |
| THM-07 | Phase 39 | Planned |
| THM-08 | Phase 39 | Planned |
| PREV-01 | Phase 40 | Planned |
| PREV-02 | Phase 40 | Planned |
| PREV-03 | Phase 40 | Planned |
| PREV-04 | Phase 40 | Planned |
| PREV-05 | Phase 40 | Planned |
| TOK-01 | Phase 41 | Planned |
| TOK-02 | Phase 41 | Planned |
| TOK-03 | Phase 41 | Planned |
| TOK-04 | Phase 41 | Planned |
| TOK-05 | Phase 41 | Planned |
| TOK-06 | Phase 41 | Planned |
| TOK-07 | Phase 41 | Planned |
| TOK-08 | Phase 41 | Planned |
| ORB-01 | Phase 42 | Planned |
| ORB-02 | Phase 42 | Planned |
| ORB-03 | Phase 42 | Planned |
| ORB-04 | Phase 42 | Planned |
| ORB-05 | Phase 42 | Planned |
| ORB-06 | Phase 42 | Planned |
| ORB-07 | Phase 42 | Planned |
| ORB-08 | Phase 42 | Planned |
| ORB-09 | Phase 42 | Planned |
| ORB-10 | Phase 42 | Planned |
| ORB-11 | Phase 42 | Planned |
| UX-01 | Phase 43 | Planned |
| UX-02 | Phase 43 | Planned |
| UX-03 | Phase 43 | Planned |
| UX-04 | Phase 43 | Planned |
| UX-05 | Phase 43 | Planned |
| UX-06 | Phase 43 | Planned |
| UX-07 | Phase 43 | Planned |
| UX-08 | Phase 43 | Planned |
| UX-09 | Phase 43 | Planned |
| UX-10 | Phase 43 | Planned |
| UX-11 | Phase 43 | Planned |
| UX-12 | Phase 43 | Planned |
| UX-13 | Phase 43 | Planned |
| UX-14 | Phase 43 | Planned |
| UX-15 | Phase 43 | Planned |
| UX-16 | Phase 43 | Planned |
| UX-17 | Phase 43 | Planned |
| UX-18 | Phase 43 | Planned |
| UX-19 | Phase 43 | Planned |
| UX-20 | Phase 43 | Planned |
| UX-21 | Phase 43 | Planned |
| UX-22 | Phase 43 | Planned |
| POLISH-01 | Phase 44 | Planned |
| POLISH-02 | Phase 44 | Planned |
| POLISH-03 | Phase 44 | Planned |
| POLISH-04 | Phase 44 | Planned |
| POLISH-05 | Phase 44 | Planned |
| POLISH-06 | Phase 44 | Planned |
| POLISH-07 | Phase 44 | Planned |
| POLISH-08 | Phase 44 | Planned |
| POLISH-09 | Phase 44 | Planned |

**Coverage:**
- v2.0 requirements: 87 total (HOUSE 14 + STATS 5 + VAR 6 + THM 8 + PREV 5 + TOK 8 + ORB 11 + UX 22 + POLISH 9)
- Mapped to phases: 87
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-20*
*Last updated: 2026-05-20 after roadmap creation (phase mapping locked)*
