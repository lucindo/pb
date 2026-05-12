---
phase: 12-assets-content-hygiene-cleanup
plan: 01
subsystem: hygiene
tags: [favicon, vite-base-url, amazon, predicate-extraction, jsdoc, docs-only]

requires:
  - phase: 09-audio-wake-lock-lifecycle-hardening
    provides: AUDIO-02 caller-side past-time clamp at App.tsx:200/:342/:546 that depends on audio.audioNow (overtakes HYGIENE-01)
  - phase: 11-domain-ui-contracts-accessibility
    provides: 400/400 Vitest baseline; per-commit green-gate posture (D-17)
provides:
  - HYGIENE-01 closed as "Overtaken (by Phase 9 AUDIO-02)" in REQUIREMENTS.md traceability + REVIEW.md §IN-02 [2026-05-12 update] addendum
  - HYGIENE-03 one-line JSDoc above formatLastSessionDate documenting the test-only `now` seam
  - ASSETS-01 new public/favicon.svg (114 bytes, single-color teal orb) + index.html %BASE_URL% href; dist/index.html resolves to /hrv/favicon.svg
  - CONTENT-01 book.url canonical amazon.com /dp/B0CCFWP4W8 URL (Forrest's verbatim YouTube-description link, linkId preserved); test assertions synced
  - HYGIENE-02 shared isValidBpm/isValidRatio/isValidDuration predicates relocated to src/domain/settings.ts; storage/settings.ts imports them; new src/domain/settings.test.ts (9 cases)
affects: [v1.0.1-milestone-closeout, verify-phase-12, complete-milestone-v1.0.1]

tech-stack:
  added: []
  patterns:
    - "%BASE_URL% Vite HTML substitution for base-path-safe asset hrefs"
    - "Domain-layer single-source-of-truth predicates with (v: unknown): v is T narrowing; storage layer imports them"
    - "Structural gap-fill new test file pattern for source files without prior test geography (Phase 10 D-20 / Phase 11 D-16 / Phase 12 D-10)"

key-files:
  created:
    - public/favicon.svg
    - src/domain/settings.test.ts
    - REVIEW.md
    - .planning/phases/12-assets-content-hygiene-cleanup/12-01-SUMMARY.md
  modified:
    - .planning/REQUIREMENTS.md
    - index.html
    - src/storage/format.ts
    - src/content/learnContent.ts
    - src/content/learnContent.test.ts
    - src/components/LearnDialog.test.tsx
    - src/domain/settings.ts
    - src/storage/settings.ts

key-decisions:
  - "HYGIENE-01 closed as docs-only flip (Overtaken by Phase 9 AUDIO-02) — literal removal of audioNow would break AUDIO-02 caller-side clamp at App.tsx:200/:342/:546 (CONTEXT D-01/D-02)"
  - "Favicon literal hex #0f766e (--color-breathing-accent resolved value) inlined in SVG; CSS custom properties do not apply inside externally-loaded favicons (CONTEXT D-03)"
  - "Forrest's full Amazon URL preserves the linkId Associates tag — it is his tag (not ours), so the LearnDialog 'Not affiliated with Forrest Knutson' disclaimer at line 171 stays accurate and is NOT EDITED (CONTEXT D-05/D-06)"
  - "Predicate signatures use (v: unknown): v is T for domain reuse from coerceSettings — narrowing-to-never side-effect in validateSettings handled by a single-line eslint-disable with // Reason: (preserves D-09 byte-identical throw message format)"
  - "New domain/settings.test.ts is a structural gap-fill (no prior test geography for that source file) — same exception posture as Phase 10 D-20 useSessionEngine.test.tsx and Phase 11 D-16 SessionReadout.test.tsx"

patterns-established:
  - "Pattern: Single-line JSDoc above a function signature to mark a test-only seam — `/** @param now Test-only seam — ... */` form (src/storage/format.ts:42)"
  - "Pattern: REQUIREMENTS.md 'Overtaken (by Phase N <REQ-ID>)' status cell for cross-phase reconciliation — replaces 'Pending' without removing the row or breaking phase totals"
  - "Pattern: REVIEW.md `[YYYY-MM-DD update]` addendum line under an existing finding when later phases reconcile it — preserves the frozen 2026-05-11 snapshot while making the cross-phase reality readable"
  - "Pattern: Domain-side `(v: unknown): v is T` predicate + `(field as unknown is NOT cast at call site)` — when validating a domain-typed input, the predicate's negative branch narrows to `never`; the call site uses the field directly and an inline eslint-disable + Reason annotation on the template-literal line preserves the message format"

requirements-completed:
  - ASSETS-01
  - CONTENT-01
  - HYGIENE-01
  - HYGIENE-02
  - HYGIENE-03

duration: ~10 min
completed: 2026-05-12
---

# Phase 12 Plan 01: Assets, Content & Hygiene Cleanup Summary

**Five-task cleanup landing the last v1.0.1 patch — favicon ships under Vite base-path, amzn.to short URL replaced with Forrest's verbatim amazon.com /dp/B0CCFWP4W8 canonical, predicate duplication eliminated via domain/storage extraction (9 new tests), JSDoc seam for formatLastSessionDate, and HYGIENE-01 closed as Overtaken-by-Phase-9-AUDIO-02 in two cross-cited docs.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-12T03:46Z (approx — Task 1 staging)
- **Completed:** 2026-05-12T03:56Z (Task 5 commit + verify)
- **Tasks:** 5 / 5
- **Files modified:** 11 (3 created, 8 modified). One previously-untracked file (REVIEW.md) staged in Task 1.

## Accomplishments

- **HYGIENE-01 docs-only closure:** REQUIREMENTS.md HYGIENE-01 row status flipped from `Pending` → `Overtaken (by Phase 9 AUDIO-02)`. REVIEW.md §IN-02 received a verbatim `[2026-05-12 update]` addendum citing App.tsx:549 and 12-CONTEXT.md. Phase 9 AUDIO-02's caller-side past-time clamp at App.tsx:200/:342/:546 depends on `audio.audioNow()`, so literal removal (the ROADMAP-draft posture) would have broken the AUDIO-02 contract — the docs flip records that cross-phase reality so the milestone audit reads HYGIENE-01 as closed-no-op.
- **HYGIENE-03 JSDoc seam:** One-line `/** @param now Test-only seam — ... */` JSDoc added at `src/storage/format.ts:42`, between the existing D-05 `//` comment and the `formatLastSessionDate` signature. Zero behaviour change; documents the test-only nature of the `now: () => number = Date.now` injection seam that `format.test.ts` already exercises.
- **ASSETS-01 favicon ships:** New `public/favicon.svg` (114 bytes) — single-color teal orb `<circle cx="16" cy="16" r="14" fill="#0f766e"/>` matching `--color-breathing-accent` resolved hex. `index.html:5` href: `/favicon.svg` → `%BASE_URL%favicon.svg`. Production `dist/index.html` resolves to `href="/hrv/favicon.svg"` and `dist/favicon.svg` is byte-identical to source. No `<script>`, `<foreignObject>`, `onload=`, `xlink:href`, or `<animate>` elements (T-12-01 mitigation gate clean).
- **CONTENT-01 honest book URL:** `src/content/learnContent.ts:60` `book.url` swapped from `https://amzn.to/3RTAVqi` to Forrest's verbatim YouTube-description Amazon URL: `https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US`. The `linkId` is Forrest's Associates tag (not ours), so the LearnDialog disclaimer at line 171 ("Independent project. Not affiliated with Forrest Knutson.") remains accurate and was NOT edited (D-06). Two existing test assertions (`learnContent.test.ts:53–54` and `LearnDialog.test.tsx:120`) updated to the canonical URL.
- **HYGIENE-02 predicate extraction:** `isValidBpm` / `isValidRatio` / `isValidDuration` relocated from file-private `src/storage/settings.ts:20–33` declarations to exported functions on `src/domain/settings.ts`. `validateSettings` rewritten to call them — RangeError throw class + message templates (``\`Unsupported BPM: ${String(settings.bpm)}\``, ``\`Unsupported ratio: ${settings.ratio}\``, ``\`Unsupported duration: ${String(settings.durationMinutes)}\``) preserved byte-for-byte (D-09). Storage imports pruned (`BPM_OPTIONS`/`RATIO_OPTIONS`/`DURATION_OPTIONS`/`RatioLabel`/`DurationOption` no longer imported). New `src/domain/settings.test.ts` with **9 it() cases across 3 describe blocks** tagged `(HYGIENE-02 D-08)` locks the predicate contract at the domain layer (structural gap-fill — same posture as Phase 10 D-20 / Phase 11 D-16).
- **Test-count progression preserved:** 400 → 409 (within the planned 406–409 target range). Every commit boundary green on tsc/lint/build/vitest (D-15).

## Task Commits

Each task was committed atomically with per-commit green gate (tsc/lint/build/vitest exit 0):

1. **Task 1: HYGIENE-01 docs-only flip** — `a0d887a` (docs)
   - `.planning/REQUIREMENTS.md` HYGIENE-01 row: `Pending` → `Overtaken (by Phase 9 AUDIO-02)`
   - `REVIEW.md` §IN-02: append `[2026-05-12 update] Overtaken by Phase 9 AUDIO-02 — \`audio.audioNow()\` is the documented seam for the caller-side past-time clamp at App.tsx:549. HYGIENE-01 closed-no-op in 12-CONTEXT.md.`
2. **Task 2: HYGIENE-03 JSDoc** — `3be5777` (docs)
   - `src/storage/format.ts:42`: one-line JSDoc above `formatLastSessionDate` documenting the test-only `now` seam
3. **Task 3: ASSETS-01 favicon + base-url** — `311fb77` (feat)
   - NEW `public/favicon.svg` (114 bytes, single `<circle fill="#0f766e"/>`)
   - `index.html:5` href: `/favicon.svg` → `%BASE_URL%favicon.svg`
4. **Task 4: CONTENT-01 book URL** — `ddf0275` (feat)
   - `src/content/learnContent.ts:60` book.url → canonical amazon.com /dp/B0CCFWP4W8 URL
   - Test assertions synced in `learnContent.test.ts` and `LearnDialog.test.tsx`
   - LearnDialog.tsx disclaimer NOT EDITED (D-06)
5. **Task 5: HYGIENE-02 predicate relocation + new domain test** — `2c8126d` (refactor)
   - `src/domain/settings.ts`: export 3 predicates + rewrite `validateSettings` to call them
   - `src/storage/settings.ts`: delete locals, import shared names, prune unused option-list/type imports
   - NEW `src/domain/settings.test.ts` (9 cases, 3 describe blocks)

**Plan metadata commit:** SUMMARY.md committed separately by the orchestrator after this agent returns (worktree-mode policy).

_Note: Task 5 was TDD — RED step (test file with imports targeting non-existent exports) verified by failing `npm run build` mid-task; GREEN landed in the same commit per CONTEXT D-15 "every commit boundary green" rule._

## Files Created/Modified

**Created:**
- `public/favicon.svg` — single-color teal orb favicon glyph (114 bytes), matches resolved `--color-breathing-accent`
- `src/domain/settings.test.ts` — 9 it() cases across 3 describe blocks locking the predicate contract at the domain layer
- `REVIEW.md` — was previously untracked in main; staged + committed alongside the REQUIREMENTS row flip in Task 1

**Modified:**
- `.planning/REQUIREMENTS.md` — HYGIENE-01 traceability row status: `Pending` → `Overtaken (by Phase 9 AUDIO-02)`; phase totals line unchanged
- `index.html` — line 5 favicon href: `/favicon.svg` → `%BASE_URL%favicon.svg`
- `src/storage/format.ts` — line 42 new JSDoc above `formatLastSessionDate`
- `src/content/learnContent.ts` — line 60 book.url → canonical amazon.com /dp/B0CCFWP4W8 URL
- `src/content/learnContent.test.ts` — line 53–54 assertion updated to canonical URL + traceability tag `(CONTENT-01 D-05)`
- `src/components/LearnDialog.test.tsx` — line 120 href assertion updated to canonical URL
- `src/domain/settings.ts` — three new exported predicates; `validateSettings` body calls them (RangeError + message format byte-identical)
- `src/storage/settings.ts` — predicates deleted, import block pruned to `{ DEFAULT_SETTINGS, isValidBpm, isValidRatio, isValidDuration, type SessionSettings }`; `coerceSettings` body unchanged

## Decisions Made

All five plan-level decisions executed exactly as written in 12-CONTEXT.md (D-01 through D-15). One micro-decision during execution:

- **Where to put the predicate exports in src/domain/settings.ts:** Between `DEFAULT_SETTINGS` (lines 44–48) and `validateSettings` (now line 65) — per plan Step B. This ordering keeps the constants → defaults → predicates → validator narrative readable and preserves all line numbers downstream of `validateSettings` predictably.
- **9 it() cases (not 6 or 8):** Per the PATTERNS.md skeleton and the planned 6–9 bound, used the maximum case-count to cover wrong-type, NaN/Infinity, and out-of-range branches per predicate. Lands at exactly 409 total tests — within the 406–409 target range (D-15).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Inline eslint-disable on validateSettings ratio throw (template-expression-on-never)**
- **Found during:** Task 5 (HYGIENE-02 predicate relocation, green-gate verify pass after Step C/D)
- **Issue:** The new `isValidRatio: (v: unknown): v is RatioLabel` predicate's user-defined narrowing means that calling it on `settings.ratio: RatioLabel` and taking the negative branch causes TypeScript to narrow `settings.ratio` to `never` in the throw block. The original `Array.includes()` call did NOT narrow (Array.includes is not a type guard), so the existing `${settings.ratio}` template-literal expression was previously a `string` union (`RatioLabel`) and lint-clean. After the predicate-call rewrite, the same expression becomes `${never}`, which trips `@typescript-eslint/restrict-template-expressions`.
- **Why this matters:** The plan's automated verify gate explicitly requires the throw line to be byte-identical (`grep -cF 'throw new RangeError(\`Unsupported ratio: ${settings.ratio}\`)' src/domain/settings.ts | grep -q '^1$'`). CONTEXT D-09 mandates "throw class + message format preserved byte-for-byte". Casting `settings.ratio` to `string` or using `String(settings.ratio)` in the template would break the verify gate. Casting at the call site (`isValidRatio(settings.ratio as unknown)`) would break the call-site verify gate (`grep -c 'if (!isValidRatio(settings.ratio))'`).
- **Fix:** Added a 4-line `// Reason:` comment block followed by `// eslint-disable-next-line @typescript-eslint/restrict-template-expressions` immediately above the offending throw line. Lint passes; the throw line itself is byte-identical to the planned form; runtime behaviour is preserved (the predicate is unreachable on a true `RatioLabel` input — only bypassed-type-system callers trigger the throw, in which case the original runtime stringification still produces a meaningful error like "Unsupported ratio: 99:1"). BPM and duration use `${String(...)}` in their messages so were unaffected by the narrow.
- **Files modified:** `src/domain/settings.ts` (one disable + Reason annotation on the ratio throw block only)
- **Verification:** `npm run lint` exit 0; all three plan-level verify-line greps for the throw lines return 1 (fixed-string match); `npm test -- --run` reports 409/409 green. The disable is `@typescript-eslint/restrict-template-expressions` — NOT a `react-hooks/*` disable — so CONTEXT D-14 / must-have-truth #11 ("No new react-hooks/* ESLint disables") is satisfied.
- **Committed in:** `2c8126d` (Task 5 commit)

**2. [Rule 3 - Blocking] Vitest --reporter=basic flag unsupported in installed Vitest version**
- **Found during:** Task 1 (first green-gate run)
- **Issue:** The plan's `<verify>` automated lines use `npm test -- --run --reporter=basic 2>&1 | tail -5 | grep -qE 'Test Files.*passed'`. The installed Vitest version errors with `Failed to load custom Reporter from basic` / `ERR_LOAD_URL` — `basic` is no longer a built-in reporter alias (likely removed in a Vitest major).
- **Fix:** Used `npm test -- --run 2>&1 | grep -E "Test Files|Tests "` instead. The default reporter still runs the full suite and emits a `Test Files  N passed (N)` / `Tests  N passed (N)` summary line that I matched on. The substantive green-gate (the suite running and passing) is preserved; only the reporter shape differs.
- **Files modified:** None — verification-shim only; no source changes.
- **Verification:** All 5 commits gated by `Test Files passed` / `Tests passed` lines printed at the expected counts (400 / 400 / 400 / 400 / 409). Final suite at HEAD: 29 test files, 409 passing tests, 0 failing.
- **Committed in:** N/A (verification-shim, no source delta)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug fix, 1 Rule 3 blocking-tooling shim)
**Impact on plan:** Both deviations were necessary to land the plan-as-written. Deviation 1 (template-expression lint) is a direct side-effect of D-08's mandated `(v: unknown): v is T` predicate signature combined with D-09's byte-identical throw-message requirement — there is no clean rewrite that satisfies both AND lint without an inline disable + Reason. Deviation 2 (Vitest reporter) is a tooling-version drift in the verify gate; the actual `npm test -- --run` baseline runs cleanly. Zero scope creep, zero behaviour delta beyond the planned outcomes.

## Issues Encountered

- **`npx tsc --noEmit` did not catch the RED state in Task 5 mid-task** — the incremental build cache returned clean even though the test file imported non-existent exports. `npm run build` (which runs `tsc -b` against the project references) DID report the three TS2305 errors, so I used the build output to confirm RED before moving to GREEN. Not a blocker, just a tooling note: project-references `tsc -b` is more reliable than `tsc --noEmit` for RED verification when the test file is newly introduced.
- **REVIEW.md is untracked in main:** copied it from the main repo's worktree (`../../../REVIEW.md`) into the agent worktree at the start of Task 1, then staged + committed it. This was flagged in the orchestrator's pre-flight context and handled per instructions.

## User Setup Required

None — no external service configuration, no new environment variables, no dashboard steps. The favicon asset materialises automatically on next `npm run build` / next deploy.

## Next Phase Readiness

- **Phase 12 ready for `/gsd-verify-phase 12`:** five tasks committed, SUMMARY.md ready (this file), all five ROADMAP Phase 12 success criteria satisfied (per the cross-task plan-level verification in the PLAN's `<verification>` section).
- **Milestone v1.0.1 ready for closeout** (D-17): after verify-phase + any UAT, the orchestrator can run `/gsd-complete-milestone`. This plan introduced no milestone-archival edits and no v1.1 placeholders (per D-17).
- **One housekeeping todo for the verify-phase pass:** `.planning/todos/pending/2026-05-11-missing-favicon-404-in-console.md` can be moved to `.planning/todos/completed/` (folded into ASSETS-01 per D-03). Not done by this executor — orchestrator/verifier owns the todo-folder lifecycle.
- **README.md is out of scope** (not in `files_modified`): line 37 there still references `amzn.to/3RTAVqi`. Can be updated as a docs-housekeeping pass in v1.x if desired; not blocking milestone closeout.

## Cross-Link References

- **CONTEXT D-01 / D-02** (HYGIENE-01 docs-only flip rationale): `.planning/phases/12-assets-content-hygiene-cleanup/12-CONTEXT.md`
- **REVIEW.md §IN-02** with `[2026-05-12 update]` addendum: `REVIEW.md` lines 385–391
- **AUDIO-02 caller-side clamp** (the consumer that overtakes HYGIENE-01): `src/app/App.tsx:200`, `:342`, `:546`; `src/hooks/useAudioCues.ts:58`, `:378`, `:390` (audioNow still exported and consumed)
- **CONTEXT D-15 per-commit green-gate** carry-forward: Phase 7 D-09 / Phase 11 D-17 → Phase 12 D-15

## Self-Check: PASSED

- All 5 task commits exist in `git log`:
  - `a0d887a` Task 1 HYGIENE-01 (verified)
  - `3be5777` Task 2 HYGIENE-03 (verified)
  - `311fb77` Task 3 ASSETS-01 (verified)
  - `ddf0275` Task 4 CONTENT-01 (verified)
  - `2c8126d` Task 5 HYGIENE-02 (verified)
- All claimed created files exist:
  - `public/favicon.svg` (verified, 114 bytes, ≤ 250 byte gate)
  - `src/domain/settings.test.ts` (verified, 9 it() cases, 3 describe blocks)
  - `REVIEW.md` (verified, staged in Task 1)
- All five plan-level verification points (per `<verification>` section) pass at HEAD.
- 29 test files / 409 passing tests at HEAD; tsc/lint/build/vitest all exit 0.

---

*Phase: 12-assets-content-hygiene-cleanup*
*Completed: 2026-05-12*
