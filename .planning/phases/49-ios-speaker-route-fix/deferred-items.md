# Phase 49 Deferred Items

Out-of-scope findings discovered during Phase 49 execution.

## Pre-existing lint errors (NOT introduced by Phase 49)

Discovered at execute time (verified against base `a003211851c9f44bdc474cfca5cc4a83516b31aa` — diff is empty for these files):

- `src/app/sessionPresentation.ts:113:60` — `@typescript-eslint/no-unnecessary-type-conversion` (Passing a string to String() does not change the type or value of the string)
- `src/storage/storage.ts:256:64` — `@typescript-eslint/restrict-template-expressions` (Invalid type "number" of template literal expression)
- `src/storage/storage.ts:257:30` — `@typescript-eslint/restrict-template-expressions` (Invalid type "3" of template literal expression)

These were green at the time Phase 48 closed (1283 tests pass); the lint changes are likely from a typescript-eslint dependency upgrade or a config drift. They sit in `src/app/` and `src/storage/` — entirely outside Phase 49's surface (`src/audio/audioEngine.ts` + `src/audio/audioEngine.test.ts`).

Phase 49's surface itself is lint-clean.

## Pre-existing lint warnings (4, deferred — unused eslint-disable directives)

- `src/hooks/useAudioCues.ts:178:7` (react-hooks/exhaustive-deps)
- `src/hooks/useAudioCues.ts:264:11` (no-console)
- `src/hooks/useWakeLock.ts:122:7` (react-hooks/exhaustive-deps)
- `src/storage/storage.ts:254:9` (no-console)

Same disposition: not introduced by Phase 49.

## Recommended follow-up

Either a quick fix follow-up phase (mechanical 3-error fix in `sessionPresentation.ts` + `storage.ts`) or fold into the v2.2 Phase 50 SessionClock refactor (`storage.ts` is in scope there). Phase 49 leaves them deferred to keep its diff minimal.
