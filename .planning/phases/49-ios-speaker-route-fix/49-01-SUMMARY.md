---
phase: 49-ios-speaker-route-fix
plan: 01
subsystem: audio
tags: [ios, audio, web-audio, audio-session, html-audio-element, autoplay-policy]

# Dependency graph
requires:
  - phase: 03-audio-engine (Plan 06 Task 8)
    provides: "sync-first-construct invariant on the user-gesture chain (extended in 49-CONTEXT.md D-04)"
  - phase: 05.1-ios-audio-reconstruct
    provides: "engine-rebuild fallback path preserved verbatim (the silent loop tears down with the old engine and reconstructs with the new one)"
provides:
  - "Silent looping <audio> element constructed inside createAudioEngine() and torn down inside engine.close() — coerces iOS Safari audio session category from 'ambient' to 'playback' so cue audio routes through the device speaker even when the silent switch is ON and no headphones are connected"
  - "SILENT_WAV_DATA_URL constant (file-local, 366 chars) — base64-encoded 8 kHz mono 8-bit PCM, ~25 ms duration, alternating 127/128 samples (near-zero amplitude, real decodable WAV, not digital silence)"
  - "SILENT_LOOP_VOLUME = 0.0001 constant (file-local, separate invariant from MIN_GAIN_VALUE per 49-PATTERNS.md Pattern A)"
  - "5 new audioEngine tests covering D-04 (sync-construct order), D-05 (attribute wiring), D-08 (close() teardown + idempotency), and D-09 (silent-absorb on .play() reject)"
affects: [phase-50-sessionclock-abstraction, phase-51-master-clock-unification, phase-53-master-gain-mute, phase-49-02-device-validation]

# Tech tracking
tech-stack:
  added: []  # DEPS-01 — no new runtime deps; SILENT_WAV_DATA_URL is bundled as a base64 string literal
  patterns:
    - "Engine-owned DOM resource: per-engine HTMLAudioElement constructed on the sync gesture head, closure-captured (not exposed on the AudioEngine interface), torn down inside the existing `if (closed) return` idempotency guard — mirrors the AudioContext lifecycle exactly (49-PATTERNS.md Pattern C)"
    - "Silent-absorb on sub-essential resource acquisition: void el.play()?.catch(() => undefined) — analogous to but distinct from the AC resume() reject at L139-143 which DOES re-throw because AC is essential infra; the silent loop is sub-essential (49-PATTERNS.md 'Silent-absorb on resource-acquisition failures')"
    - "Defensive optional chaining on play() return value — HTMLMediaElement.play() returns Promise<void> per spec but old Safari (<11) and jsdom return undefined; the optional chain absorbs that variant under the same silent-absorb posture"

key-files:
  created:
    - .planning/phases/49-ios-speaker-route-fix/49-01-SUMMARY.md
    - .planning/phases/49-ios-speaker-route-fix/deferred-items.md
  modified:
    - src/audio/audioEngine.ts
    - src/audio/audioEngine.test.ts

key-decisions:
  - "Cast playsInline assignment to `HTMLMediaElement & { playsInline: boolean }` — lib.dom.d.ts exposes playsInline only on HTMLVideoElement, but iOS Safari honors it on HTMLMediaElement (the trick lifted from Howler.js). The runtime assignment is correct; the cast documents the type-vs-runtime gap. Alternative (setAttribute('playsinline', '')) was rejected because it would lose the direct property assignment that the plan acceptance criteria assert via grep."
  - "Defensive optional chaining on play()?.catch(() => undefined) — HTMLMediaElement.play() returns Promise<void> per spec but very old Safari (<11) and jsdom return undefined. Without the optional chain, calling .catch on undefined throws TypeError and the entire factory rejects (regression on jsdom — all 24 baseline audioEngine tests failed before the fix). Annotated with eslint-disable for @typescript-eslint/no-unnecessary-condition because the official type does not document the undefined case."
  - "Captured stubbed Audio instances via `const instances: SpyAudio[] = []` push pattern instead of the 49-PATTERNS.md sketch's `let constructed: SpyAudio | null = null` with `constructed = this` — the latter triggers @typescript-eslint/no-this-alias under the current eslint config. The instances[] array pattern preserves the spec verbatim assertions and removes the lint error."

patterns-established:
  - "Engine-owned DOM resource (HTMLAudioElement) — closure-captured, not exposed on engine interface, torn down inside the close() idempotency guard. The engine now owns: its AudioContext, its activeCues Set, its statechange listener, AND its silent <audio> element. Same construct/teardown symmetry: constructed inside factory body, torn down inside returned engine.close()."
  - "Silent-absorb (non-re-throwing) on sub-essential resource acquisition — orthogonal to the AC essential-infra close-and-rethrow pattern (audioEngine.ts:139-143). When a resource is non-essential to session correctness (silent loop, iOS speaker routing), its acquisition failure must NOT propagate; the session continues with degraded behavior."

requirements-completed:
  - IOS-01  # Plan 01 implements the silent-loop wiring; device validation lands in Plan 02
  - IOS-05  # sync gesture chain + close() teardown verified via source assertions + 5 new tests

# Metrics
duration: ~10min
completed: 2026-05-27
---

# Phase 49 Plan 01: iOS speaker route fix — silent-loop audio element Summary

**Silent looping HTMLAudioElement constructed inside createAudioEngine() (sync gesture head) and torn down inside engine.close() — coerces iOS Safari audio session from "ambient" to "playback" without UA sniffing, without new runtime deps, and without leaking React into audioEngine.ts**

## Performance

- **Duration:** ~10 min (started 2026-05-27T16:02Z, completed 2026-05-27T16:13Z)
- **Started:** 2026-05-27T16:02:00Z (approx — first read after worktree branch check)
- **Completed:** 2026-05-27T16:12:58Z
- **Tasks:** 2/2
- **Files modified:** 2 (src/audio/audioEngine.ts +49 lines; src/audio/audioEngine.test.ts +155 lines)

## Accomplishments

- Wired SILENT_WAV_DATA_URL (366 chars, 244 raw bytes — 8 kHz mono 8-bit PCM, ~25 ms, alternating 127/128 sample bytes — real decodable WAV) + SILENT_LOOP_VOLUME (0.0001) as file-local constants
- Constructed silent HTMLAudioElement on the sync gesture head inside createAudioEngine() — playsInline=true, loop=true, muted=false, volume=SILENT_LOOP_VOLUME, fire-and-forget .play() with silent-absorb on reject
- Wired pause() + removeAttribute('src') + null-reference teardown inside engine.close() between the end-chord tail wait and the in-flight cue disconnect loop, inside the existing `if (closed) return` idempotency guard
- Added 5 new tests covering D-04 sync-construct order, D-05 attribute wiring, D-08 close() teardown + idempotency, and D-09 silent-absorb on .play() reject
- All 1288 tests pass (1283 v2.1 baseline + 5 new); `npm run build` exits 0; `npm run lint` shows no new errors introduced (3 pre-existing lint errors in unrelated files documented in deferred-items.md)
- DEPS-01 holds: `git diff package.json` is empty (no new runtime dep)
- D-04 NO-CHANGE directives respected: `git diff src/hooks/useAudioCues.ts src/hooks/useAudioCues.test.tsx vitest.setup.ts` all empty

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire silent-loop audio element inside createAudioEngine** — `9712202` (feat)
2. **Task 2: Add 5 Phase 49 tests** — `4be75de` (test)

## Files Created/Modified

- `src/audio/audioEngine.ts` — added SILENT_WAV_DATA_URL + SILENT_LOOP_VOLUME constants in the module-level constants block; added silent-loop element construction + attribute wiring + .play() on the sync gesture head between `new AudioContext()` and the suspended check; added pause + removeAttribute + null-reference teardown inside engine.close() before the in-flight cue disconnect loop (+49 lines, 0 deletions — pure insertion diff)
- `src/audio/audioEngine.test.ts` — appended 5 Phase 49 tests under a `// Phase 49: iOS silent-loop element` section header (+155 lines, 0 deletions)
- `.planning/phases/49-ios-speaker-route-fix/49-01-SUMMARY.md` — this file
- `.planning/phases/49-ios-speaker-route-fix/deferred-items.md` — pre-existing lint errors in unrelated files (NOT introduced by this phase)

## Decisions Made

- **playsInline cast to `HTMLMediaElement & { playsInline: boolean }`** — lib.dom.d.ts exposes playsInline only on HTMLVideoElement, but iOS Safari honors it on HTMLMediaElement at runtime (the Howler.js trick). The cast documents the type-vs-runtime gap; the runtime assignment is correct.
- **Defensive optional chaining on play()?.catch** — handles old Safari (<11) and jsdom where play() returns undefined instead of Promise<void>. Without this, the factory rejects on undefined.catch and all 24 baseline audioEngine tests fail in jsdom.
- **Captured stubbed Audio instances via `instances[]` array push** instead of the 49-PATTERNS.md sketch's `constructed = this` — `this`-aliasing triggers @typescript-eslint/no-this-alias under the current eslint config. The array pattern preserves all the spec verbatim assertions (playsInline === true, loop === true, muted === false, volume === 0.0001, pause/removeAttribute call counts) and is lint-clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Optional chain on play()?.catch() to absorb the `undefined` return value from jsdom + old Safari**

- **Found during:** Task 1 verification (`npm run test:run -- src/audio/audioEngine.test.ts`)
- **Issue:** Initial implementation followed the canonical spec verbatim — `void silentLoopElement.play().catch(() => undefined)`. jsdom 29's HTMLMediaElement.play() returns `undefined` (not a Promise), so `.catch` throws `TypeError: Cannot read properties of undefined (reading 'catch')`. The TypeError propagated out of the factory and broke all 24 baseline audioEngine tests in the jsdom environment. Real production browsers (Safari ≥ 11, Chrome, Firefox) all return Promise<void> per spec, so this was strictly a test-environment failure mode — BUT it also masks the user-facing failure on Safari < 11 (vanishingly rare but real) where the production code would crash for the same reason.
- **Fix:** Added optional chaining: `void silentLoopElement.play()?.catch(() => undefined)`. Annotated with `// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition` because the DOM type does not document the undefined return case (only Promise<void>). Added a one-line comment explaining the optional-chain rationale (old Safari + jsdom).
- **Files modified:** `src/audio/audioEngine.ts`
- **Verification:** All 24 baseline audioEngine tests pass post-fix; 1283 full-suite tests pass.
- **Committed in:** `9712202` (Task 1 commit, included in the original implementation)

**2. [Rule 3 - Blocking] TypeScript: playsInline does not exist on HTMLAudioElement**

- **Found during:** Task 1 `npm run build`
- **Issue:** `silentLoopElement.playsInline = true` failed with `TS2339: Property 'playsInline' does not exist on type 'HTMLAudioElement'`. lib.dom.d.ts in this TypeScript version exposes playsInline only on HTMLVideoElement. The runtime behavior on iOS Safari, however, DOES honor playsInline on HTMLMediaElement (the trick the canonical spec and 49-CONTEXT.md D-05 both require).
- **Fix:** Cast the element to `HTMLMediaElement & { playsInline: boolean }` for the playsInline assignment only. Other three attributes (loop, muted, volume) are all on HTMLMediaElement and need no cast. Added a "Reason:" comment block explaining the type-vs-runtime gap.
- **Files modified:** `src/audio/audioEngine.ts`
- **Verification:** `npm run build` exits 0; the grep acceptance criterion `(playsInline|loop|muted|volume)\s*=\s*` still matches the playsInline assignment line.
- **Committed in:** `9712202` (Task 1 commit, included in the original implementation)

**3. [Rule 3 - Blocking] eslint: no-this-alias on `constructed = this` inside test stubs**

- **Found during:** Task 2 `npm run lint`
- **Issue:** The 49-PATTERNS.md test sketch shape (`let constructed: SpyAudio | null = null` + `constructor() { constructed = this }`) triggers `@typescript-eslint/no-this-alias` error under the current eslint config. The sketch dates from before that rule was tightened. Three of my five new tests followed the sketch verbatim, producing 3 lint errors.
- **Fix:** Refactored to the `instances[]` array push pattern: `const instances: SpyAudio[] = []` + `constructor() { instances.push(this) }`. Then the test asserts `expect(instances).toHaveLength(1)` and dereferences via destructure (`const [el] = instances; if (el === undefined) throw ...`) to avoid both the no-this-alias error AND the no-non-null-assertion error that would have come from `instances[0]!`.
- **Files modified:** `src/audio/audioEngine.test.ts`
- **Verification:** `npm run lint` shows no errors on `src/audio/audioEngine.test.ts`; all 29 tests pass.
- **Committed in:** `4be75de` (Task 2 commit, included in the original implementation)

**4. [Rule 3 - Blocking] eslint: require-await on RejectingAudio.play()**

- **Found during:** Task 2 `npm run lint`
- **Issue:** `play = vi.fn(async () => { throw new DOMException(...) })` — the async arrow function has no `await` expression (it throws synchronously, which is equivalent to returning a rejected promise), so `@typescript-eslint/require-await` flagged it as an error.
- **Fix:** Replaced with `play = vi.fn(() => Promise.reject(new DOMException(...)))` — semantically identical for the silent-absorb test (production code awaits the promise and catches the rejection) but eslint-clean.
- **Files modified:** `src/audio/audioEngine.test.ts`
- **Verification:** Test 4 (silent-absorb on .play() reject) still passes — the production code's `void el.play()?.catch(() => undefined)` absorbs the rejected promise regardless of how it's constructed.
- **Committed in:** `4be75de` (Task 2 commit, included in the original implementation)

**5. [Rule 3 - Blocking] eslint: useless-constructor unused-directive on OrderedAudio constructor**

- **Found during:** Task 2 `npm run lint`
- **Issue:** The 49-PATTERNS.md sketch annotates every test-stub constructor with `// eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-unused-vars`. But three of my constructors (in the spy-instance-capturing tests and OrderedAudio) have non-empty bodies (`instances.push(this)` or `callOrder.push('Audio')`) so they are NOT useless — the no-useless-constructor portion of the disable directive is unused and produces a warning under the current eslint config.
- **Fix:** Removed `@typescript-eslint/no-useless-constructor` from the disable directive on the OrderedAudio constructor (and earlier on the three instance-capturing constructors, but those were already simplified during deviation #3). Kept `@typescript-eslint/no-unused-vars` because `_src?: string` is still unused.
- **Files modified:** `src/audio/audioEngine.test.ts`
- **Verification:** `npm run lint` shows no warnings on the new tests; the RejectingAudio constructor still keeps both disables because its body IS empty (genuinely useless constructor needed only to match the HTMLAudioElement signature).
- **Committed in:** `4be75de` (Task 2 commit, included in the original implementation)

**6. [Rule 1 - Bug] Comment text containing the literal word "await" tripped a source-assertion grep**

- **Found during:** Task 1 acceptance verification
- **Issue:** The plan's acceptance criterion `awk '/new AudioContext\(\)/,/audioCtx\.state === .suspended./' src/audio/audioEngine.ts | grep -c "await"` returning 0 was failing because my insertion-2 comment said "on the sync gesture head, BEFORE any await". The awk pattern matched my comment block, and the literal word `await` inside the comment was being counted.
- **Fix:** Rephrased the comment from "BEFORE any await" to "BEFORE any asynchronous suspension". Same semantic meaning, no literal `await` keyword in the comment. The actual code in that range still has zero `await` keywords (the only awaits are AFTER the suspended check at `await audioCtx.resume()`).
- **Files modified:** `src/audio/audioEngine.ts`
- **Verification:** The awk-grep acceptance criterion now returns 0.
- **Committed in:** `9712202` (Task 1 commit)

---

**Total deviations:** 6 auto-fixed (1 Rule 1 bug, 5 Rule 3 blocking). All fixes were necessary to satisfy the plan's QUAL-01 green-gate (`npm run build && npm run lint && npm run test:run` all exit 0) without modifying the plan's behavioral or attribute requirements. No scope creep — every deviation is a tooling/type-system accommodation that preserves D-01..D-09 verbatim.

**Impact on plan:** Plan executed as written; all acceptance criteria pass.

## Issues Encountered

- **Pre-existing lint errors in unrelated files** — `src/app/sessionPresentation.ts:113` and `src/storage/storage.ts:256-257` showed 3 lint errors NOT introduced by this phase (`git diff a003211 -- <files>` empty). Likely from a typescript-eslint dependency upgrade or config drift. Out of Phase 49's surface (`src/audio/audioEngine.ts` + `src/audio/audioEngine.test.ts`). Documented in `.planning/phases/49-ios-speaker-route-fix/deferred-items.md` for either a quick fix follow-up or fold into Phase 50 (where `storage.ts` is in scope for the SessionClock refactor).

## QUAL-01 Gate Output

```
npm run build  → exit 0   (tsc -b && vite build all clean)
npm run lint   → exit 1   (3 errors + 4 warnings in pre-existing unrelated files;
                          src/audio/audioEngine.ts + src/audio/audioEngine.test.ts are
                          lint-clean — verified per-file)
npm run test:run → exit 0 (114 test files, 1288 tests pass — 1283 baseline + 5 new)
```

The `lint` exit code is non-zero ONLY because of the 3 pre-existing errors in `sessionPresentation.ts` + `storage.ts`. Phase 49's own surface (audioEngine.ts + audioEngine.test.ts) is lint-clean (`npm run lint 2>&1 | grep -E "audioEngine"` returns nothing). Per the SCOPE BOUNDARY rule in `deviation_rules`, the pre-existing errors are deferred and tracked in `deferred-items.md` rather than fixed under Phase 49's scope.

## SILENT_WAV_DATA_URL Final State

- **Final length:** 366 characters (≤ 400 acceptance criterion: PASS)
- **Raw bytes after base64 decode:** 244 bytes (≤ 500 acceptance criterion: PASS)
- **Format:** 8 kHz mono 8-bit PCM, ~25 ms duration (200 samples), alternating 127/128 sample bytes (near-zero amplitude oscillation — real decodable signal, NOT digital silence)
- **Verified via:** `node -e "const url = ...match(/SILENT_WAV_DATA_URL\s*=\s*['\"]([^'\"]+)['\"]/s)[1]; console.log(url.length)"` returning 366

## DEPS-01 Confirmation

`git diff a003211851c9f44bdc474cfca5cc4a83516b31aa -- package.json` returns 0 lines — `dependencies` field is byte-identical to pre-Phase-49 state. No new runtime deps; SILENT_WAV_DATA_URL is bundled as a base64 string literal, not as a separate asset.

## D-04 NO-CHANGE Confirmation

- `git diff a003211 -- src/hooks/useAudioCues.ts` → 0 lines (D-04 extends transitively through `createAudioEngine()`)
- `git diff a003211 -- src/hooks/useAudioCues.test.tsx` → 0 lines (element is invisible at the hook seam)
- `git diff a003211 -- vitest.setup.ts` → 0 lines (no new polyfill — per-test `vi.stubGlobal('Audio', SpyAudio)` covers all 5 new tests)

## Test Count

- **audioEngine.test.ts:** 24 (pre-Phase-49 baseline) + 5 (Phase 49) = 29 passing
- **Full suite:** 1283 (v2.1 baseline per STATE.md) + 5 (Phase 49) = 1288 passing
- **All 5 new tests:** D-05 attribute wiring, D-08 close() teardown, idempotency under double-close(), D-09 silent-absorb on .play() reject, D-04 sync-construct order

## Next Phase Readiness

- **Plan 02 (device-validation checkpoint, IOS-01..IOS-04) is unblocked.** The code is in place; an iOS device with silent switch ON + no headphones is now needed to verify cue audio routes through the device speaker. IOS-01 + IOS-05 are source-code-verifiable now; IOS-02, IOS-03, IOS-04 are device-validation-only.
- **No blockers for the rest of v2.2.** Phase 50 (SessionClock abstraction) is independent of Phase 49 and can proceed in parallel or immediately after. Phases 51, 52, 53 depend on Phase 50 only.
- **Phase 5.1 iOS reconstruct path:** Confirmed unchanged. The silent loop teardown + reconstruct happens automatically per D-04 — `engine.close()` tears down the old element, `createAudioEngine()` constructs the new element, both inside the same gesture token chain. No edit to `useAudioCues.ts` (`reconstructEngine` at `useAudioCues.ts:296-309`) needed.

## Self-Check: PASSED

- `src/audio/audioEngine.ts` exists and contains `SILENT_WAV_DATA_URL`: FOUND
- `src/audio/audioEngine.test.ts` exists and contains 29 `it()` blocks: FOUND
- `.planning/phases/49-ios-speaker-route-fix/deferred-items.md` exists: FOUND
- Commit `9712202` (feat 49-01): FOUND in `git log --all`
- Commit `4be75de` (test 49-01): FOUND in `git log --all`
- All Task 1 acceptance criteria: PASS
- All Task 2 acceptance criteria: PASS

---
*Phase: 49-ios-speaker-route-fix*
*Completed: 2026-05-27*
