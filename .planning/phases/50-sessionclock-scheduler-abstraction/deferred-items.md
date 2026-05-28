# Phase 50 Deferred Items

Out-of-scope discoveries during execution. Tracked here per the executor SCOPE BOUNDARY rule — not fixed in this plan because they predate any Phase 50 file change.

## Pre-existing lint errors on baseline 9f784d7

Verified by running `pnpm lint` against the unmodified `9f784d7` (Phase 50 plan-creation commit) checkout. None of these are introduced by Plan 50-01:

| File | Line | Rule | Notes |
|------|------|------|-------|
| `src/app/sessionPresentation.ts` | 113:60 | `@typescript-eslint/no-unnecessary-type-conversion` | Passing a string to `String()` does not change type/value. |
| `src/storage/storage.ts` | 256:64 | `@typescript-eslint/restrict-template-expressions` | Invalid type "number" of template literal expression. |
| `src/storage/storage.ts` | 257:30 | `@typescript-eslint/restrict-template-expressions` | Invalid type "3" of template literal expression. |

Plus 4 `Unused eslint-disable directive` warnings across `src/hooks/useAudioCues.ts`, `src/hooks/useWakeLock.ts`, `src/storage/storage.ts`.

**Disposition:** Out of scope for Plan 50-01. Should be addressed by a quick-task or future polish phase; surfacing here so they're not lost. `pnpm test:run` and `pnpm build` both still exit 0 — only `pnpm lint` fails, and the failure existed before Plan 50-01 began.
