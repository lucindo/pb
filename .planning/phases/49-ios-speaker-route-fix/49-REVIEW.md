---
phase: 49-ios-speaker-route-fix
reviewed: 2026-05-27T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/audio/audioEngine.ts
  - src/audio/audioEngine.test.ts
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 49: Code Review Report

**Reviewed:** 2026-05-27
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Phase 49 adds a silent-looping `HTMLAudioElement` inside `createAudioEngine()` to coerce iOS Safari's audio session category from "ambient" to "playback". The implementation follows the locked D-01..D-09 decisions: ownership inside the engine, construction on the sync gesture head, always-on (no UA gating), silent-absorb on `.play()` rejection, and teardown inside `close()`. Coverage for D-04, D-05, D-08 and D-09 is present and asserts the right invariants. Two PCM revisions (v1, v2) were required after device validation; v3 (16-bit / -90 dBFS sine) was approved on real iPhone hardware.

Adversarial review surfaces one Blocker — the silent-loop element leaks on the WR-06 AC-resume-failure path because the failure path closes the AudioContext and re-throws before reaching the `close()` teardown — plus three Warnings (test fakery accepts a wider attribute matrix than the production code commits to; comment-vs-data mismatches in the WAV constant; "sine" description doesn't match the actual quantized data) and three Info-level issues. The PCM is decodable, non-silent (contains 1 and -1 samples), loop-continuous, and not coupled to MIN_GAIN_VALUE — D-05 invariants hold. Idempotency of `close()` is correct (the `if (closed) return` guard at line 342 short-circuits before the silent-loop teardown block at lines 373-377, and the second `close()` call returns immediately without re-pausing or re-clearing src; tests at lines 517-543 prove this).

## Structural Findings (fallow)

No structural findings block was provided for this review.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Silent-loop element leaks on AC-resume-rejection (WR-06) path

**File:** `src/audio/audioEngine.ts:196-203`
**Issue:** The silent-loop `HTMLAudioElement` is constructed at line 170 and starts playing at line 189, BEFORE the `audioCtx.state === 'suspended'` resume check at line 196. If `audioCtx.resume()` rejects, the catch block at lines 199-202 closes the AudioContext and re-throws — but it never pauses the silent-loop element nor clears its `src`. Because `createAudioEngine` re-throws, the caller never gets back an engine handle, so `engine.close()` is never invoked. The element keeps playing (looping its near-silent buffer) and its decoded PCM buffer + DOM node stays referenced by the global media element registry until GC eventually collects the orphaned handle. The bug is the symmetric inverse of the WR-06 fix itself: that fix exists specifically to plug an AudioContext leak on the same path, and the comment at lines 193-195 explicitly cites the leak concern ("AC leaks (browsers cap concurrent ACs ~6 in Chrome)"). The new silent-loop element introduces a parallel leak that the existing fix does not catch. On iOS Safari this can also strand the audio session in 'playback' category with no engine to tear it down, which can degrade subsequent sessions if the user retries Start before the orphan is collected.

**Fix:**
```typescript
if (audioCtx.state === 'suspended') {
  try {
    await audioCtx.resume()
  } catch (err) {
    // Tear down the silent-loop element BEFORE closing the AC and re-throwing.
    // Mirrors the WR-06 invariant: any resource acquired on the sync construction
    // head must be released on every failure path that escapes createAudioEngine.
    if (silentLoopElement !== null) {
      silentLoopElement.pause()
      silentLoopElement.removeAttribute('src')
      silentLoopElement = null
    }
    await audioCtx.close().catch(() => undefined)
    throw err
  }
}
```

A regression test should be added that stubs `AudioContext` so `state === 'suspended'` and `resume()` rejects, then asserts the spied `Audio` instance's `pause()` and `removeAttribute('src')` were called once before the engine factory rejects.

## Warnings

### WR-01: WAV data URL violates RIFF chunk-size invariant (header claims 436 bytes, data is 442 bytes)

**File:** `src/audio/audioEngine.ts:117`
**Issue:** The base64-decoded WAV contains a malformed RIFF header. The 4-byte little-endian "RIFF chunk size" field at byte offset 4 holds `0xB401` (= 436 decimal). Per the RIFF spec this field must equal `total_file_size - 8` — for the actual 450-byte payload that should be 442. The file is 6 bytes short in the chunk-size declaration. The 'data' subchunk size (400) is correct and matches the 200 16-bit samples, so most decoders skip the RIFF size field and parse anyway (iOS Safari, Chrome, Firefox all tolerate the mismatch in practice — and device validation confirmed this works). But strict WAV validators / future iOS releases / linters that gate on header conformance may reject it, and D-05 explicitly requires "Source MUST be a real decodable WAV". A header-conformant file would close the regression-risk window for free.

**Fix:** Regenerate the WAV with a conformant header (RIFF chunk size = file size - 8 = 442 for a 450-byte file, or pad to 444 bytes so the RIFF size = 436 which would match the current header). Either approach is fine; the canonical fix is to make the data match the header rather than vice versa:
```python
# Regenerate: write RIFF size = total_bytes - 8 after constructing the buffer.
# Existing data chunk (400 bytes of samples) is fine; only the RIFF chunk size
# at bytes [4:8] needs to be re-written to 0x01BA (442 LE).
```
Add an assertion test that decodes the base64 and verifies `dataView.getUint32(4, true) === decoded.byteLength - 8`.

### WR-02: Module-level comment misdescribes the PCM data (claims "sine cycle"; data is a square-like wave)

**File:** `src/audio/audioEngine.ts:107-111`
**Issue:** Comment on lines 107-111 describes v3 as a "single ±1 LSB sine cycle (peak amplitude 1/32768 ≈ -90 dBFS)" and claims "sample 0 == sample 199 == 0, no boundary clicks". The boundary-zero claim is correct (verified by decoding). The "sine cycle" claim is not — decoding the 200 samples yields three runs: zeros [0..16], constant `+1` for samples [17..86] (70 samples), zeros [87..119], constant `-1` for samples [120..186] (67 samples), zeros [187..199]. This is effectively a low-amplitude DC-shifted square wave with two unequal pulse durations (asymmetric duty cycle), not a sine. At ±1 LSB the difference is acoustically irrelevant (any waveform quantized to ±1 LSB is indistinguishable from noise floor), so this is a documentation defect rather than a behavior defect — but the spec lock at D-05 is "near-zero non-zero amplitude … real decodable track" which is satisfied, while the comment claims something the data does not deliver. Future maintainers reading this comment may try to regenerate "a true sine" and unknowingly produce a different file (with different boundary characteristics).

**Fix:** Either (a) regenerate v3 as an actual sine (the samples would be the same set `{-1, 0, 1}` at this amplitude but distributed over a smooth phase, with the two non-zero runs being approximately equal length and roughly half the cycle apart), or (b) update the comment to accurately describe the data, e.g. "single low-amplitude pulse pair (≈70 samples at +1, then ≈67 samples at −1, with zero padding before/between/after), ±1 LSB peak, ~110 Hz fundamental." Option (b) is cheaper and avoids re-running device validation.

### WR-03: Comment claims "444 bytes / 592 base64 chars" — actual is 450 bytes / 600 chars

**File:** `src/audio/audioEngine.ts:111-112`
**Issue:** Lines 111-112 state "File is 444 bytes / 592 base64 chars (vs v1/v2's 244 / 480) — negligible bundle increase." Decoding shows the actual payload is 450 bytes (decoded) and the base64 string in `SILENT_WAV_DATA_URL` is 600 characters long (excluding the `data:audio/wav;base64,` prefix). The conclusion ("negligible bundle increase") is unchanged — 600 chars vs 480 is still negligible — but the documented numbers diverge from reality. This is the same class of issue as WR-02 (comment doesn't match the artifact) and increases the risk of a future maintainer re-encoding the file to "match the comment" and breaking the validated artifact.

**Fix:** Update lines 111-112 to "File is 450 bytes / 600 base64 chars (vs v1/v2's 244 / 480) — negligible bundle increase." Alternatively, drop the byte/char counts entirely from the comment; the documentation value-add over a one-line "negligible bundle cost" assertion is low.

### WR-04: Test stubs accept attribute-write semantics the production code never relies on

**File:** `src/audio/audioEngine.test.ts:458-488`
**Issue:** The `SpyAudio` class stubs `playsInline`, `loop`, `muted`, `volume` as plain instance fields. The production code at lines 175-178 assigns these properties on the live element AFTER constructing it; the test asserts the post-construction values reflect the assignments. However, the test does NOT verify the **type assertion** at line 175 — `playsInline` is typed only on `HTMLVideoElement` in `lib.dom.d.ts`, and the cast `(silentLoopElement as HTMLMediaElement & { playsInline: boolean })` is the workaround. If a future TS update tightens `HTMLAudioElement` to reject the cast (or the cast typo regresses to e.g. `playsinline` lowercase), the test still passes because `SpyAudio` accepts any property write. The test is friendly to a real regression: a developer could replace `playsInline = true` with `playsinline = true` (lowercase) and the assertion `expect(el.playsInline).toBe(true)` would fail correctly only because the spy is observed in TypeScript-property form. JS-property casing is what iOS Safari reads, so the camelCase form is what matters — but the test doesn't guard against a maintainer "fixing" the cast and accidentally dropping the assignment.

**Fix:** Add a focused test that asserts the cast still compiles and runs, e.g. capture the actual property descriptor set on the instance and verify `playsInline` is present as an own property after construction. A simpler fix: add an `Object.getOwnPropertyNames(el)` snapshot assertion confirming the four configured properties are set on the instance. Lowest-cost option: add a CI-level grep guard against the lowercase `playsinline` form in `src/audio/audioEngine.ts`.

## Info

### IN-01: `SILENT_WAV_DATA_URL` is module-private but the test file relies on it indirectly via the stubbed `Audio` constructor

**File:** `src/audio/audioEngine.ts:116-117`, `src/audio/audioEngine.test.ts:471`
**Issue:** The constant `SILENT_WAV_DATA_URL` is file-local (line 116, not exported). The tests stub `Audio` globally (lines 460-474, 491-504, etc.) and capture the constructor arg as `_src?: string` but never assert what value is passed. If the production code were accidentally changed to `new Audio()` (no arg), the silent-loop technique would silently fail at runtime on iOS (no source = no decoded buffer = no session coercion). Existing tests would still pass because `_src` is ignored. The D-03 comment explicitly says "Constant is exported only if a test needs to assert on it; otherwise file-local." — but D-05 also locks "Source MUST be a real decodable WAV (not empty / not pure-silence)", and that invariant is not currently testable from outside the module.

**Fix:** Either (a) export `SILENT_WAV_DATA_URL` and add a test asserting `new Audio` was called with the URL prefix `data:audio/wav;base64,`, or (b) capture the `_src` arg in the existing SpyAudio constructor (e.g. `constructor(src?: string) { instances.push({ instance: this, src }) }`) and assert it is non-empty and starts with `data:audio/wav;base64,`.

### IN-02: `silentLoopElement.muted = false` is the documented default — assignment is decorative but worth a one-line "why explicit" note

**File:** `src/audio/audioEngine.ts:177`
**Issue:** `HTMLMediaElement.muted` defaults to `false` per the HTML spec, so `silentLoopElement.muted = false` is a no-op assignment. The D-05 lock requires `muted=false` (presumably to keep the element "real" / non-silent from iOS's POV — a `.muted=true` element would defeat the session coercion). Explicit assignment for clarity is fine, but a future maintainer could reasonably delete it as "dead code" without realizing the spec lock. A short inline comment ("intentional re-assertion of default — D-05 lock; .muted=true defeats iOS session coercion") would prevent that regression.

**Fix:**
```typescript
// D-05 lock: explicitly false. .muted=true would defeat iOS session coercion
// (iOS treats muted elements as session-inactive). Default is already false;
// the explicit assignment guards against a future refactor toggling it.
silentLoopElement.muted = false
```

### IN-03: `SILENT_LOOP_VOLUME` constant is no-op on iOS yet retained — defense-in-depth rationale is buried in PCM revision comment

**File:** `src/audio/audioEngine.ts:113-114, 119`
**Issue:** Lines 113-114 document why `SILENT_LOOP_VOLUME = 0.0001` is retained on the v3 path: iOS ignores `.volume`, but Android Chrome and desktop honor it (defense in depth). The constant declaration at line 119 has a one-liner comment ("Phase 49 D-05: near-zero non-zero. NOT coupled to MIN_GAIN_VALUE — separate invariants") but does not surface the iOS-ignores rationale at the declaration site. A reader landing on line 119 via "go-to-definition" from line 178 has to scroll up 60 lines to find the rationale. Cross-platform-divergence rationale belongs at the constant, not buried in the revision history of an unrelated constant.

**Fix:** Move (or duplicate) the "iOS ignores .volume; this value attenuates Android/desktop only" sentence from lines 113-114 into the comment block above the `SILENT_LOOP_VOLUME` declaration at line 119:
```typescript
// Phase 49 D-05: near-zero non-zero. NOT coupled to MIN_GAIN_VALUE — separate
// invariants (49-PATTERNS.md Pattern A). iOS Safari ignores HTMLMediaElement.volume
// (hardware-controlled); on iOS, attenuation is in the PCM samples themselves
// (see SILENT_WAV_DATA_URL v3 note above). This constant attenuates Android Chrome
// and desktop only — defense in depth.
const SILENT_LOOP_VOLUME = 0.0001
```

---

_Reviewed: 2026-05-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
