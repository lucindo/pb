# Deferred Items — Phase 3

Out-of-scope items discovered during execution that should NOT be auto-fixed in
the discovering plan (per `<deviation_rules>` SCOPE BOUNDARY).

## From Plan 02 (audioEngine + useAudioCues)

| Item | File:Line | Discovered During | Notes |
|------|-----------|-------------------|-------|
| Pre-existing lint error: `react-hooks/set-state-in-effect` | `src/app/App.tsx:22:7` | Plan 02 lint check | Phase 2 code, predates Phase 3. App.tsx will likely be touched by Plan 04 (audio wiring) — fix opportunistically there. |
| Pre-existing lint error: `react-hooks/set-state-in-effect` | `src/hooks/usePrefersReducedMotion.ts:22:5` | Plan 02 lint check | Phase 2 code (commit `b980093` "fix(02): IN-02"). The setState was added intentionally to defeat a stale-initial-state window for matchMedia subscription — keeping the fix may be load-bearing for the F-IN-02 mitigation in Phase 2's UI-review backlog. Belongs to a Phase 2 follow-up, not Phase 3. |
| Pre-existing lint error: `'_options' is defined but never used` | `vitest.setup.ts:93:17` | Plan 02 lint check | Plan 01 polyfill code (commit `3e879cb`). The constructor signature `constructor(_options?: AudioContextOptions)` documents the AC API surface even though the polyfill doesn't act on options. Trivial to fix (remove the param) but not load-bearing for Plan 02. |

These are tracked here so the verifier and future plans can see them; none affect
Plan 02's success criteria or its `<verification>` gates.
