---
phase: 41-spike-mono-zen
status: shipped
subsystem: design-system + ui-surfaces + viewmodel
tags: [spike-010, mono-zen, visual-system, design-tokens, orb-rewrite, five-surface-redesign, locked-copy, drift-guard]

requires:
  - phase: 39-theme-simplification
    provides: 3-theme picker contract (light/dark/system) which Mono Zen palette replaces.
  - phase: 40-timbre-preview-cue
    provides: Audio preview surface that Mono Zen App Settings inherits unchanged.
  - spike: 010-mono-zen-light-dark
    provides: Locked visual system (tokens, typography, orb shape, 5-surface layouts) that this phase transcribes verbatim.
  - spike-manifest: .planning/spikes/MANIFEST.md
    provides: Operator-locked v2.0 feature decisions (palette, anti-gamification stance, variant removal, theme collapse, install banner disposition).

provides:
  - Mono Zen light + dark palette tokens (cool slate) replacing the prior Nord palette
  - New design tokens — borderSoft, textSoft, orbHalo1/2/3, onAccent, modalBackdrop
  - Self-hosted Inter Variable typography (semibold body, ultralight breath labels)
  - Three-layer halo + centre disc orb (organic-puddle asymmetric border-radii)
  - V2 minimal orb variant (single accent disc + faint halo) behind ?breathingShape=
  - Idle orb states (still + ambient) behind ?orbIdle= with reduced-motion compliance
  - SetupCard primitive (2×3 grid + chevron + whole-card tap target)
  - SettingsSheet primitive (mobile bottom-sheet / desktop center-modal, responsive)
  - FeedbackTime + FeedbackCount session-readout primitives
  - 4-section App Settings page (Appearance / Language / Feedback / About)
  - Desktop responsive layout (centered column 520/600 px, orb scaled to 320 px)
  - LOCKED_COPY carry-through across all 5 surfaces (verified J17)
  - Drift-guard test locking the orphan-cleanup deletion done-state (J18.8)
  - Mono Zen geometric flat PNG app icons (replaces prior photographic icons)

affects:
  - Every TSX component in src/components/ + src/app/ (visual tokens applied)
  - src/styles/theme.css (Mono Zen palette + new token vocabulary)
  - src/featureFlags.ts (query-string flags for breathingShape + orbIdle)
  - src/content/strings.ts (i18n key churn from operator copy dumps + orphan sweep)
  - src/storage/installDismissed.ts (kept active per operator A2 — banner removed but writers stay)
  - PWA precache size: 626.18 KiB → 514.18 KiB (−112 KiB, mostly from new geometric flat PNG icons)

tech-stack:
  added:
    - "@fontsource-variable/inter ^5.2.8 (runtime asset, not a code dep — woff2 files in dist/)"
  patterns:
    - "Spike-loop format: per-item propose/go/implement/approve 4-step cycle with state file commits between transitions"
    - "Query-string feature flags (vs VITE_* env vars) for per-tab variant toggling without rebuild"
    - "Drift-guard tests: fs-scan production files for forbidden patterns + sanity floor on scan count"
    - "View-model field deletion sweep: TS-enforced top-to-bottom (interface → derivation → callsite → tests)"

key-files:
  created:
    - src/components/SetupCard.tsx + SetupCard.test.tsx
    - src/components/SettingsSheet.tsx + SettingsSheet.test.tsx
    - src/components/FeedbackTime.tsx + FeedbackTime.test.tsx
    - src/components/FeedbackCount.tsx + FeedbackCount.test.tsx
    - src/components/SettingsSectionHeader.tsx + SettingsSectionHeader.test.tsx
    - src/components/SettingsSegmentedRow.tsx
    - src/components/SettingsToggleRow.tsx
    - src/components/primitives/TopAppBar.tsx + test
    - src/components/primitives/PageShell.tsx + test
    - src/components/primitives/IconButton.tsx + test
    - src/components/primitives/SegmentedControl.tsx + test
    - src/components/primitives/Stepper.tsx + test
    - src/components/primitives/Toggle.tsx + test
    - src/components/primitives/Pill.tsx + test
    - src/components/primitives/Eyebrow.tsx + test
    - src/components/primitives/ArrowLink.tsx + test
    - src/components/primitives/PickerCardGrid.tsx + test
    - src/components/icons/ (centralized SVG set)
    - src/app/PracticeScreen.tsx (extracted from monolith)
    - src/app/PracticeSessionView.tsx (extracted)
    - src/app/PracticeControlsView.tsx (extracted)
    - src/app/PracticeSettingsView.tsx (extracted) + PracticeSettingsView.test.tsx
    - src/app/BreathingSessionSurface.tsx (extracted)
    - src/app/NaviKriyaSessionSurface.tsx (extracted)
    - src/app/EndSessionDialogsView.tsx (extracted)
    - src/app/ScreenRouter.tsx + ScreenRouter.test.tsx
    - src/app/pages/LearnPage.tsx + LearnPage.test.tsx
    - src/app/pages/AppSettingsPage.tsx + AppSettingsPage.test.tsx
    - src/app/setupCardSummary.ts (per-practice formatter)
    - src/app/sessionPresentation.ts
    - src/app/appViewModel.ts + appViewModel.test.ts
    - src/app/useAppViewModel.ts
    - src/app/practiceCopy.ts + practiceCopy.test.ts
    - src/app/useAppNavigation.ts
    - src/components/SettingsAnchor.tsx + test
    - src/components/LearnAnchor.tsx + test
    - src/components/SessionActionRow.tsx
    - src/components/ModalDialogShell.tsx
    - src/components/SettingsFormShell.tsx
    - src/components/learnPanelModel.ts + test
    - src/hooks/useAmbientScale.ts + test
    - src/hooks/useModalDialog.ts
    - src/hooks/useFeatureFlags.ts + test
    - src/hooks/useUiStringsContext.tsx
    - src/content/content.no-removed-keys.test.ts (J18.8 drift guard)

  modified:
    - src/styles/theme.css (Mono Zen palette + new token vocabulary)
    - src/featureFlags.ts (added breathingShape + orbIdle query-string flags)
    - src/components/OrbShape.tsx (rebuilt with 3-halo + centre disc + idle dispatcher)
    - src/components/CueGlyph.tsx (in-orb cues consume currentColor)
    - src/components/NKShape.tsx (ramped to OrbContainer + on-accent disc text)
    - src/components/MuteToggle.tsx (re-tokenized to border-soft + text-soft, no shadow)
    - src/components/PracticeToggle.tsx (active/inactive treatment per spike)
    - src/components/SettingsPanelBody.tsx (4-section restructure + install row re-tokenized)
    - src/components/EndSessionDialog.tsx (re-tokenized to Mono Zen)
    - src/components/LearnPanel.tsx (SectionHeader + SectionCard pattern)
    - src/components/ThemePicker.tsx (color-swatch icons per spike L1831)
    - src/components/LanguagePicker.tsx (SegmentedControl)
    - src/components/CuePicker.tsx (PickerCardGrid)
    - src/components/TimbrePicker.tsx (Unicode glyphs per option)
    - src/components/ResonantSettingsForm.tsx (consumes new Stepper + SegmentedRow chrome)
    - src/components/StretchSettingsForm.tsx (consumes new chrome)
    - src/components/NaviKriyaSettingsForm.tsx (consumes new chrome + OM tick toggle re-row)
    - src/components/SessionReadout.tsx (wired to FeedbackTime + completion stack)
    - src/content/strings.ts (multiple operator copy dumps + orphan sweep)
    - src/audio/nkCueSynth.ts (NK tick volume bump 0.08 → 0.13 per J16 wrap-up)
    - public/* (Mono Zen geometric flat PNG app icons)
    - vite.config.ts (Inter font precache globs)

  deleted:
    - src/components/primitives/Card.tsx + Card.test.tsx (J18.1 — no consumer after Learn restructure)
    - src/components/BooleanToggle.tsx (J18.1 — replaced by SettingsToggleRow)
    - src/components/StatusPanel.tsx (J18.1 — replaced by FeedbackTime/FeedbackCount)
    - src/components/InstallBanner.tsx + test (J13 — banner removed per operator decision)

key-decisions:
  - "Spike-loop format replaced standard plan-phase for tightly-coupled visual work — per-item operator-in-the-loop cycle with mid-stream feedback dump absorption"
  - "ORB-05/06 dev toggles use query-string params (?breathingShape= / ?orbIdle=) instead of VITE_* env vars — per-tab toggling without rebuild"
  - "UX-12/13/14 install banner V3 dropped entirely — install kept only in App Settings (J13 deviation per [[v2-carryforward-disposition]])"
  - "Practice Settings sheet form fields source from real app domain, NOT spike's illustrative SETUP_SUMMARY (J10 OQ-1)"
  - "Theme picker keeps 3 options (Light/Dark/System) — operator validated all 3 during design (separate from this phase)"
  - "Cue picker options stay Text/Arrow/Nose — spike's Dot/Ring/Pulse/None was illustrative, existing CueGlyph kept"
  - "Audio section renamed to 'Feedback' per J16 commit 4ab2776"
  - "Ambient idle orb breathes 40:60 inhale:exhale at 5.5 BPM per J16 wrap-up"
  - "About row composes `${version} · ${sha} · ${date}` per J16 commit a9501fc"
  - "Complete screen kept (not dropped per UX-10 'may drop' note); Navi takeAMoment parity restored J17 commit 7d7ca2a"
  - "Resonant extend-duration affordance preserved in domain/viewmodel but intentionally unwired from any UI for congruence with Stretch+Navi running state"
  - "InstallDismissed storage kept alive (A2) — writers in useBeforeInstallPrompt persist on appinstalled + triggerInstall success; only the dead read in useAppViewModel was removed"

patterns-established:
  - "Spike-loop state file (4-step propose/go/implement/approve loop with per-transition commits)"
  - "Query-string feature flags via featureFlags.ts with default-on-junk + case-insensitive parsing"
  - "Per-component spike-locked value transcription verbatim (hex, weight, gap, radius) with downstream tests behavioral-only (no toHaveClass)"
  - "Drift-guard tests using node:fs to scan production files for forbidden patterns (existing Phase 38/39 pattern extended)"
  - "View-model field deletion via TS-enforced top-to-bottom sweep (interface → derivation → callsite → tests)"

requirements-completed:
  - TOK-01, TOK-02, TOK-03, TOK-04, TOK-05, TOK-06, TOK-07, TOK-08
  - ORB-01, ORB-02, ORB-03, ORB-04, ORB-05, ORB-06, ORB-07, ORB-08, ORB-09, ORB-10, ORB-11
  - UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08, UX-09, UX-10, UX-11, UX-15, UX-16, UX-17, UX-18, UX-19, UX-20, UX-21, UX-22
  - POLISH-07 (partial — orphan sweep), POLISH-08, POLISH-09

requirements-deviated:
  - "ORB-05 — VITE_BREATHING_SHAPE → ?breathingShape= query-string flag (operator decision at J5)"
  - "ORB-06 — VITE_ORB_IDLE_BEHAVIOR → ?orbIdle= query-string flag (operator decision at J6)"

requirements-dropped:
  - "UX-12 — V3 inline-card install banner: DROPPED per J13 operator decision; install stays only in App Settings"
  - "UX-13 — install banner mobile-only + idle-only: OBSOLETE (no banner)"
  - "UX-14 — install banner action label branches on isIOS: OBSOLETE (no banner)"

commit-range:
  start: d2c50ed  # 2026-05-23 — first refactor commit (extract presentation from App.tsx monolith)
  end: d2b886b   # 2026-05-24 — J18 closed; spike loop COMPLETE
  count: ~100+ atomic commits (refactor-loop items A-I + spike-loop items J1-J18 + ~50 J16 sub-commits + state-file transitions)

duration: 2 days (2026-05-23 → 2026-05-24)
shipped: 2026-05-24
---

# Phase 41: Spike 010 Mono Zen — Implementation Summary

## What landed

The complete spike-010 Monochrome Zen visual system, end-to-end across all 5 app surfaces. Replaces what was originally planned as 3 sequential phases (41 palette+tokens, 42 orb, 43 surface redesign) with a single tightly-coupled implementation using a spike-loop format optimized for operator-in-the-loop iteration.

## Performance

- **Duration:** 2 days (2026-05-23 refactor prep → 2026-05-24 spike-loop close)
- **Started:** 2026-05-23 (REFACTOR-LOOP items A-I — design-primitive library, PageShell + TopAppBar, view-model extraction)
- **Closed:** 2026-05-24T23:40:55-03:00 (commit `d2b886b` — J18 final audit + state transition)
- **Atomic commits:** ~100+ (refactor-loop items A-I + spike-loop items J1-J18 + ~50 J16 sub-commits + state-file transitions)
- **Test count:** 1255 (v1.5 close) → 1155 (Phase 41 close; net −100 from orphan deletions + test rewrites + drift-guard additions across the milestone)
- **Build size:** PWA precache 626.18 KiB (J16 baseline) → 514.18 KiB at close (−112 KiB)
- **Test files:** 107 at close (was 106 at J17 close; +1 from J18.8 drift-guard)

## Surface-by-surface delivery

**Practice — Idle (HRV / Stretch / Navi):**
- TopAppBar with 17px/600 title, leading Settings icon + trailing Learn icon
- PracticeToggle with active-pill (accent fill + on-accent text) per spike
- 3-halo + centre disc orb (idle: ambient or still per query flag)
- SetupCard primitive (whole-card tap → SettingsSheet)
- Start button (accent fill, no shadow, 15px/600/0.06em tracking)
- MuteToggle re-tokenized to border-soft + text-soft
- Medical-advice disclaimer (LOCKED_COPY, 11px/400/0.02em/nowrap/muted)
- Mobile install affordance: none (install lives in App Settings only per J13 deviation)

**Practice — Running:**
- Switcher disabled
- Orb body: 3-halo + centre disc, breath label inside disc in on-accent
- HRV readout: FeedbackTime (big remaining time + uppercase tracked BPM·ratio caption)
- Stretch readout: FeedbackTime with stage label (Warm-up / Stretch / Settle)
- Navi readout: FeedbackCount (big count + "/ N" mid + uppercase round·phase context)
- End button + Mute controls only
- Disclaimer fixed at bottom

**Practice — Complete:**
- Checkmark orb (still + subtle check marker in centre disc)
- "Session complete" headline + "Take a moment" subtitle (HRV + Stretch + Navi all parity, J17 fix)
- Done button + Mute controls
- Disclaimer fixed at bottom

**Settings sheet (per-practice, bottom-sheet mobile / center-modal desktop):**
- Title "Practice" (spike-locked) + per-practice subtitle from existing switcher headings
- HRV: BPM + Ratio + Duration steppers (Duration only when Running for extend)
- Stretch: full form (initial BPM / target BPM / ratio / warm-up / ramp / cool-down)
- Navi: Rounds + Front OMs + OM pace + OM tick toggle
- Close button (border-soft outline) — sheet also closes on backdrop, Esc, session start

**Learn page:**
- TopAppBar with chevron-back leading icon
- SectionHeader + SectionCard pattern per spike (eyebrow above each card)
- Per-practice description (section 1 + section 2), videos, native apps, resources
- LOCKED_COPY footer (inspired-by + affiliation lines)

**App Settings page:**
- TopAppBar with chevron-back leading icon
- 4 sections: Appearance (Theme picker with color swatches) / Language (SegmentedControl) / Feedback (CuePicker + TimbrePicker) / About (version composed `${v} · ${sha} · ${date}` + GitHub link + install row)
- Install row re-tokenized in J18.6 to Mono Zen quieter pairing (border-soft + text-soft, no shadow) — matches J12 MuteToggle treatment

**End-session dialog:**
- Re-tokenized to Mono Zen palette (J16 commit `2640981`)
- "End this session?" + "Keep going" cancel + "End" confirm

## What was deferred or dropped

**Dropped (per operator decision):**
- UX-12 / UX-13 / UX-14 — V3 inline-card install banner on practice surface. Install stays only in App Settings.

**Deferred to Phase 44 (POLISH):**
- POLISH-01 — Full-codebase `/gsd-code-review --all --fix` sweep
- POLISH-02 — 28 Info-severity findings from 2026-05-16 review disposition
- POLISH-03 — Test cleanup (test name tightening, redundancy removal)
- POLISH-04 — Tiger Style comment audit (WHY-only)
- POLISH-05 — Refactoring pass for any duplication / boundary violations introduced
- POLISH-06 — Security re-review (`/gsd-secure-phase 44`)

**Deferred to separate operator call:**
- J19 — Complete-screen distinct-surface decision (ship as separate surface vs keep current inline "Session complete" headline)

## Verification

- Per-commit green-gate maintained throughout: `npx tsc --noEmit -p tsconfig.app.json` clean + `npm run lint` clean + `npx vitest run` all pass + `npm run build` clean.
- J17 verified every visible string across all 5 surfaces (Practice idle/running/complete, Learn, App Settings, end-session dialog, settings sheet) against spike + operator dumps. Drift table produced 1 real fix + 6 dispositions.
- J18 swept the orphan cleanup queue (8 items, 7 atomic sub-commits + state transition), added drift-guard `src/content/content.no-removed-keys.test.ts` that locks the deletion done-state and was canary-tested end-to-end.

## Implementation log

Full per-item history in `41-SPIKE-LOOP-ARCHIVE.md` (the SPIKE-LOOP-STATE.md as-of phase close). Architecture-prep history in `.planning/REFACTOR-LOOP-STATE.md` (items A-I, 2026-05-23).
