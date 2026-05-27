---
phase: 49-ios-speaker-route-fix
plan: 02
type: execute
status: complete
completed: 2026-05-27
requirements:
  - IOS-01
  - IOS-02
  - IOS-03
  - IOS-04
must_haves_verified: true
deps_changed: false
operator_signal: approved
---

# Plan 49-02 — Device validation SUMMARY

Device-validated the Phase 49 iOS silent-loop fix on real hardware against the
five ROADMAP success criteria. Result: **approved**, with one row deferred
(Scenario E — Android — no device available).

## What was verified

| Scenario | Requirement | Result |
|----------|-------------|--------|
| A — iOS Safari, silent ON, no headphones | IOS-01 (primary) | pass |
| B — iOS Safari, headphones connected | IOS-02 (no regression) | pass |
| C — iOS Safari, silent OFF, no headphones | IOS-03 (no regression) | pass |
| D — iOS Safari, lock + background | ROADMAP criterion #5 | pass (unchanged from pre-Phase-49) |
| E — Android Chrome | IOS-04 (primary non-iOS) | **deferred — no device** |
| F — Desktop browser (macOS) | IOS-04 (secondary non-iOS) | pass |

Per-scenario detail in `49-02-DEVICE-VALIDATION.md`.

## Plan 01 revisions made during this checkpoint

The silent-loop PCM required **two revisions** during the Plan 02 device validation
checkpoint — the locked spec D-05 explicitly anticipated this ("final value
resolved at plan time with one device-test pass"). Three iterations were needed
to reach inaudibility on iOS Safari hardware:

| Rev | Commit | Format | Outcome on iPhone |
|-----|--------|--------|-------------------|
| v1 | `9712202` | 8-bit / 8 kHz / 200 samples / full-amp square wave | Loud continuous buzz |
| v2 | `167b4e3` | 8-bit / 8 kHz / 200 samples / ±1 LSB sine (-48 dBFS) | Quieter, still audible |
| v3 | `c49765d` | 16-bit / 22050 Hz / 200 samples / ±1 LSB sine (-90 dBFS) | **Silent** |

### Root cause uncovered during iteration

**iOS Safari ignores `HTMLMediaElement.volume`** — long-standing iOS WebKit
behavior. `SILENT_LOOP_VOLUME = 0.0001` is a no-op on iOS; the element plays at
full system volume. The fix had to encode attenuation into the PCM samples
themselves (the v3 16-bit revision). The `volume = 0.0001` line is retained for
Android Chrome and desktop browsers where the attribute is honored — defense in
depth.

## Disposition vs requirements

| Requirement | Status |
|-------------|--------|
| IOS-01 | ✓ verified (Scenario A) |
| IOS-02 | ✓ verified (Scenario B) |
| IOS-03 | ✓ verified (Scenario C) |
| IOS-04 | ◐ partially verified — F desktop passes; E Android deferred (no device) |
| ROADMAP success criterion #5 | ✓ verified (Scenario D) |

## Invariants held

- **DEPS-01** — `git diff package.json` empty across all three revisions.
- **QUAL-01** — full suite 1288 passing across all three revisions; `npm run build` exit 0.
- **D-04 NO-CHANGE** — `useAudioCues.ts`, `useAudioCues.test.tsx`, `vitest.setup.ts` untouched in all three revisions.
- **D-05** — WAV is decodable, not pure silence (contains ±1 LSB samples), iOS Safari classifies as a "real" track.

## Deferred items (carry to milestone deferred items table)

- **IOS-04 Android verification**: Scenario E (Android Chrome) not run; deferred until operator has Android hardware access. The Phase 49 fix is non-iOS-specific (the silent-loop element is constructed on all platforms; only iOS Safari is the routing target), so the risk is low — but documented as unverified for honesty.

## Surprises worth flagging

- **Service worker cache** intercepted the bundle twice during iteration. Each PCM revision required manually unregistering the SW + clearing caches on the iPhone before the new build took effect. Worth a milestone retro entry: PWA SW silently masks new builds during device validation, costing iteration loops.
- **iOS volume ignored** is the kind of platform quirk that's easy to miss during planning. The locked decision D-05 referenced "volume near-zero" without flagging that the attribute is a no-op on the one platform the feature targets. Worth documenting as a known iOS gotcha for future audio work.

## Files touched in this plan

- `.planning/phases/49-ios-speaker-route-fix/49-02-DEVICE-VALIDATION.md` (created)
- `.planning/phases/49-ios-speaker-route-fix/49-02-SUMMARY.md` (this file)
- `src/audio/audioEngine.ts` (two revisions: v2 commit `167b4e3`, v3 commit `c49765d`)

No other files modified; no dependencies added or removed.

## Operator signal

`approved` — phase ready to close. Android (IOS-04 partial) acknowledged as deferred.
