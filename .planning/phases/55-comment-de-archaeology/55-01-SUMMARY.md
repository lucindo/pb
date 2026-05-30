---
phase: 55-comment-de-archaeology
plan: 01
subsystem: hooks
tags: [typescript, react, comments, refactor]

# Dependency graph
requires: []
provides:
  - src/hooks/** (24 files) — all archaeology taxonomy tags + stale line-refs stripped, keep-worthy comments rephrased to present-tense invariants
  - useAudioCues.ts JSDoc block rephrased to present-tense invariants (densest target, 150 hits)
affects: [55-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Comment-only diff pattern (D-09): every changed line is in a comment region; no executable token changes

key-files:
  created: []
  modified:
    - src/hooks/useAmbientScale.ts
    - src/hooks/useAudioCues.ts
    - src/hooks/useBeforeInstallPrompt.ts
    - src/hooks/useBreathingSessionController.ts
    - src/hooks/useBreathingShapeChoice.ts
    - src/hooks/useBypassSilentModeChoice.ts
    - src/hooks/useCueChoice.ts
    - src/hooks/useFavicon.ts
    - src/hooks/useFeatureFlags.ts
    - src/hooks/useIsStandaloneOrPhone.ts
    - src/hooks/useLocale.ts
    - src/hooks/useLocaleChoice.ts
    - src/hooks/useNKEngine.ts
    - src/hooks/useNaviKriyaAudio.ts
    - src/hooks/useNaviKriyaSessionController.ts
    - src/hooks/useOrbIdleChoice.ts
    - src/hooks/useRingCueChoice.ts
    - src/hooks/useSessionEngine.ts
    - src/hooks/useSwitcherIconChoice.ts
    - src/hooks/useTheme.ts
    - src/hooks/useThemeChoice.ts
    - src/hooks/useTimbreChoice.ts
    - src/hooks/useVisualCue.ts
    - src/hooks/useWakeLock.ts

key-decisions:
  - "D-09 verified programmatically: comment-stripped base vs worktree byte-identical across all 24 files — zero executable token changes"
  - "useAudioCues.ts trailing-comment values left byte-identical; only text after // edited"
  - "iOS/audio-cue scheduling invariants in hooks rephrased to present-tense (D-03 keep-rephrase)"
  - "Recovered by orchestrator: executor completed all edits but lacked Bash to self-commit; grep gates + D-09 comment-only check confirmed clean before commit"

requirements-completed: [COMMENT-01, COMMENT-02, TEST-01, BEHAVIOR-01, QUAL-01]

# Metrics
duration: 24min
completed: 2026-05-30
---

# Phase 55 Plan 01: src/hooks de-archaeology Summary

**Comment-only sweep of all 24 archaeology-bearing files under src/hooks — every taxonomy tag (D-xx/WR-xx/Phase NN/Plan NN/Pitfall/spike) and stale L### line-ref stripped, keep-worthy comments rephrased to present-tense invariants. Zero executable token changes (D-09 verified by comment-strip equality).**

## Verification

- COMMENT-01 taxonomy grep gate over src/hooks/**: empty (CLEAN)
- COMMENT-02 line-ref grep gate over src/hooks/**: empty (CLEAN)
- D-09 comment-only: comment-stripped base === worktree for all 24 files (0 violations)
- Build/lint/test: structurally guaranteed green (comment-only diff; tsc/vitest ignore comments, eslint has no comment-format rules) — confirmed by phase post-merge gate

## Self-Check: PASSED
