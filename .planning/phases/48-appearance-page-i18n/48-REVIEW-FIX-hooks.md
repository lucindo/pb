---
status: partial
chunk: hooks
review_source: 48-REVIEW-hooks.md
applied: 12
skipped: 0
deferred: 1
note: |
  Report reconstructed by orchestrator from fixer-agent return summary —
  the fixer's worktree was cleaned up before its untracked REVIEW-FIX file
  could be moved into the main repo. All commits below are present on
  `main` and verified via `git log --grep="^fix(48-hooks-"`.
---

# Phase 48 — `hooks` chunk fix report

## Applied (12)

Commit range: `f0e85b5..c81c4cc` (12 commits, fast-forwarded from `98234e0`).

### Headline fixes

- **WR-01** — NaviKriya stale settings: added `settingsRef` mirror; `nkStart` reads `settingsRef.current` inside lead-in `onComplete`. Picked option (b) — preserves user intent that settings changed mid-lead-in take effect for that session.
- **WR-04** — favicon double-apply on mount: Effect A bails when `theme === 'system'`, Effect B owns the system branch — mirrors existing `useTheme` pattern.
- **WR-06** — install prompt rejection: `try/catch` around `prompt()`; nulls `deferredPrompt` either way so a rejected prompt does not leave a one-shot ref live for retry rejections.
- **IN-02** — `++ref.current`: normalized 5 sites in `useAudioCues.ts` + `useWakeLock.ts`. The `reconstructEngine` call site split into write-then-read to preserve captured-value semantics.

Remaining 8 fixes (WR-02, WR-03, WR-05, IN-03–IN-07) applied per reviewer's recommended approach; see `git log --grep="^fix(48-hooks-"` for individual commit messages.

## Deferred (1)

| ID    | Rationale |
|-------|-----------|
| IN-01 | Picker factory consolidation. Unresolved design question — factory should default to which pattern: `useCueChoice`'s single-source-of-truth or the legacy local state mirror? Migrating 8 hooks + 8 test files with semantic divergence requires a dedicated refactor task, not a code-fix pass. |

## Memory-rule application

- `[[feedback_no_design_locking]]` — WR-03 and IN-07 used clarifying comments instead of runtime asserts that would lock tunable cross-module relationships.
- `[[feedback_design_logic_separation]]` — no design tokens or visual styles touched; hooks chunk is pure lifecycle/state.
- General hygiene — all source comments avoid finding-ID refs; finding IDs appear only in commit messages.

## Verification

`npx tsc --noEmit` passed after every commit. Vitest deferred to orchestrator-level run.
