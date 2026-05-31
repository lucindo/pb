# Plan — Test-Quality Remediation

Goal: trim ~1,500 lines of design-locking + bloat and add ~8 behavioral tests so the
suite protects behavior and survives refactors. Source: full-codebase test-quality audit.

## Roadmap

### 0. Source-code changes (refactors — gate dependent test cleanup)

Production-code edits, not test edits. Kept separate so the test work stays pure-test.
Each must leave the full suite green on its own before the dependent test cleanup runs.

- [x] `useTimbreChoice` / `useLocaleChoice` folded onto `usePreferenceChoice` (`TimbrePicker`/`LanguagePicker` now call it directly); both clone hooks + test files deleted; behavior unchanged, suite green (1341)
  - `useCueChoice` deliberately NOT folded — it sources `cue` from `useVisualCue` for live external/cross-tab reflection; `usePreferenceChoice` is local-state-only, so folding would change behavior. Hook + test kept.

### 1. Close critical test gaps (safety-relevant — do first) — DONE (+6 tests, 1347 green)

- [x] Muted session proven silent — mute button drives master gain → 0 and back to 1 (App.audio Test 14 strengthened; the true silence mechanism, since cues keep scheduling by design)
- [x] close() defers AC teardown until the end-chord tail finishes — end-chord test now asserts `audioCtx.close` not called before the deferral await, called after (deleting the await fails it)
- [x] close() disconnects in-flight cue envelopes (node-leak guard) — seed in-flight cue → close() → `envelope.disconnect()` ran
- [x] resume() iOS `InvalidStateError` fans `onSuspend` at the engine level; NotAllowedError does NOT and does not throw
- [x] setMuted Safari fallback — master gain lacking `cancelAndHoldAtTime` anchors via cancelScheduledValues + setValueAtTime, ramps to 0
- [x] storage write fails open when the inner version re-read throws — inner `getItem` throws + `setItem` still fires with the right payload
- [x] lead-in→running audioAnchor handoff — dispatched cues anchored at the `firstInAudioTime` returned by `audio.start()` (earliest cue sits at the anchor, not near 0)

### 2. Fix missing edge cases on risky logic — DONE (+15 tests, 1362 green)

- [x] `getNaviKriyaBackCount` throws on non-multiple-of-4 / 0 / negative / non-integer / NaN / Infinity (it.each)
- [x] `estimateNaviKriyaDurationSec` seconds formula pinned on a non-default fixture (200/slow/2 → 1526s)
- [x] targetSec trim wins over the `minCues` floor — caps the walk below the floor (1 < 2) at the session end
- [x] cue `phaseDurationSec === 3×τ` boundary: at exactly 3×τ stays strike (1 call); just past → sustain (2 calls)
- [x] mid-ramp `getStretchFrame` — interior ramp segment reports stage="ramp" and BPM strictly between initial/target
- [x] `useBeforeInstallPrompt` prompt()-rejection clears `deferredPrompt`, no throw, no dismissal saved
- [x] `useFavicon` re-applying the same theme does NOT replace the `<link>` node (flicker guard)
- [x] open-ended elapsed counts up over time (advances into 0:01–0:09; exact second left loose)
- [x] NK sub-threshold early-end records nothing (parity with resonant 30s floor)
- [x] mute survives a remount — toggle → unmount → fresh App reads persisted mute

### 3. Rewrite or delete design-locking tests — SAFE GROUP DONE (−25 tests, 1337 green)

Done (behavior covered elsewhere, verified green):
- [x] Deleted call-count/order/construction-order locks: audioEngine double-schedule negative-control (own comment admitted it proved nothing), sync-construct-order, the 6-test "Phase 52 constants" LOOKAHEAD+typeof+literal-type describe; sessionClock "exactly one statechange listener"
- [x] Deleted add/remove-listener bookkeeping: useTheme (named-theme non-subscribe + unmount cleanup), useBeforeInstallPrompt Test 8, useIsStandaloneOrPhone Test 6, usePrefersReducedMotion subscribe/cleanup
- [x] Stripped DOM/SVG geometry pins: OrbShape stroke color/width + star vertex-count (kept arc-renders / polygon-renders / reduced-motion); App.session checkmark polyline → "Session complete" headline; MuteToggle "renders a button" + icon element-counts; CueGlyph path-count/animation-absence/fill-stroke (kept aria-hidden + phaseLabel parity)
- [x] Deleted tautologies: sessionAudio "constants are numbers"; settings.test duration `*60000` (never called the fn); redundant `CUE_OPTIONS` deep-equal (isValidCue covers membership)

Kept by decision (domain contracts, NOT design-locking — pushed back on audit):
- breathingPlan `BPM_OPTIONS`/`RATIO_OPTIONS`/`DURATION_OPTIONS` and `DEFAULT_CUE` — input-domain/default contracts; a change is a real product change worth a red test

Deferred — delicate, reviewed pass needed (coverage/scope risk):
- [ ] Rewrite `useAudioCues.test.tsx` white-box tests against the interface (generation counter, `_listeners`/prototype-spy, spy-arg/call-count/union-array, callback-identity block)
- [ ] Rewrite `useWakeLock.test.tsx` WAKELOCK-01 against behavior (sentinel released, request ≤once)
- [ ] Rewrite `App.audio.test.tsx` D-42 to drop AudioContext construction-count; keep label outcome
- [ ] Review `appViewModel.test.ts` VM-shape assertions (audit says delete bulk — wholesale file delete needs a look)
- [ ] `storage.test.ts` bare `STATE_VERSION===3` pins + `strings.test.ts:200-203` orphan-key — minor, revisit with §5 content pass

### 4. Delete weak tests

- [ ] Collapse CueHandle.cancel suite to one behavior + one idempotency test (`audioEngine.test.ts:843-903`)
- [ ] Collapse nkCueSynth "doesn't throw"/shape-repeat tests to one parametrized smoke (`nkCueSynth.test.ts:96-182`)
- [ ] Delete tautological math tests: `stretchRamp.test.ts:148`, `settings.test.ts:329-334` (wrong unit, never calls the fn), `sessionAudio.test.ts:285`
- [ ] Fix/replace weak clock asserts: `useSessionEngine.test.tsx:469-489` (assert tracks mock clock), `:262-306` (assert frame frozen post-unmount instead of console-spy)
- [ ] Delete tautologies-against-non-existent-features: `useVisualCue.test.ts:138-182`; `MuteToggle.test.tsx:27`; parametrize `OrbShape.test.tsx:37-47`

### 5. Cut bloat

- [ ] `useAudioCues.test.tsx` → ~600-800 lines: hoist the ~6× duplicated `SpyableAC` mock, force-top-up 7→2 tests (`:1588-1851`), merge WR-04/WR-05 (`:2052-2181`)
- [ ] `stretchRamp.test.ts` 716→~450: collapse 4 GAP-3 orb-freeze tests to one parametrized, dedupe 6 `computeStretchTotalSec` GAP-1 tests to one+null, delete `not.toBeCloseTo(0.167)` dead-bug anchor
- [ ] Content tests: delete literal-copy change-detectors (`lockedCopy.test.ts` bulk, `learnContent.test.ts:35-88,136-158`, `strings.test.ts:157-199`); keep invariant guards (clinical-verbs, URL-scheme, cross-locale URL identity, non-empty exhaustiveness loops)
- [x] Delete the timbre/locale clone test files — done in §0; `usePreferenceChoice.test.ts` is sole owner of the contract (`useCueChoice.test.ts` retained — hook not folded)
- [ ] De-fragment App.* suite (2:1): consolidate "end timed session" (3 files→1), "start session" (3→1), "open-ended skips modal" (3→1); remove `App.test.tsx` CUE-01 duplication
- [ ] `cueSynth.test.ts:383-493` per-timbre explosion → one "every timbre → N oscillators, doesn't throw"
- [ ] `prefs.test.ts`: delete "Phase 47 RED" scaffold (`:487-512`), dedupe triplicated `kuthasta` alias (keep one)

### 6. Verify

- [ ] Full suite green after each section; net test LOC down ~1,500; ratio moved off the 1.5:1 smell line
