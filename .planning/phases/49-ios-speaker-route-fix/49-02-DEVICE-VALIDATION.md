---
phase: 49-ios-speaker-route-fix
plan: 02
type: device-validation
build_under_test: c49765d (main; v3 16-bit PCM silent loop)
preview_url: http://192.168.15.57:4173/hrv/
operator_started: 2026-05-27
operator_signal: approved
---

# Phase 49 — Device Validation Matrix

Real-hardware verification of Plan 01's silent-loop fix against the five
ROADMAP success criteria. None of these scenarios are reachable in jsdom.

| Scenario | Device | OS Version | Browser Version | Result | Notes |
|----------|--------|------------|-----------------|--------|-------|
| A (IOS-01, silent ON + no HP) | iPhone (operator's) | iOS (current) | Safari (current) | pass | Routes through speaker as expected. Required two PCM revisions to remove audible artifact — see Iteration log below. Final v3 (16-bit) silent. |
| B (IOS-02, headphones) | iPhone (operator's) | iOS (current) | Safari (current) | pass | Routes through headphones; no speaker bleed. |
| C (IOS-03, silent OFF) | iPhone (operator's) | iOS (current) | Safari (current) | pass | Normal speaker playback; no regression. |
| D (criterion #5, lock + background) | iPhone (operator's) | iOS (current) | Safari (current) | pass | Behavior unchanged from pre-Phase-49 — audio stops on background, recovery flow (Phase 5.1) unchanged. Phase 49 introduces no regression. Pre-existing background-stop behavior is a separate Phase 5.1 question, not a Phase 49 gate. |
| E (IOS-04 Android) | n/a | n/a | n/a | deferred — no device | No Android hardware available at validation time. IOS-04 partially unverified pending operator access to an Android device. Surface in milestone deferred items table. |
| F (IOS-04 desktop) | macOS (operator's) | macOS (current) | (browser of choice) | pass | Normal playback, no audible artifact, no perceptible CPU impact. |

## Iteration log

The silent-loop element required **three PCM revisions** during the device-validation
checkpoint to land on a configuration that is inaudible on iOS Safari hardware:

| Rev | Format | Content | Outcome |
|-----|--------|---------|---------|
| v1 (Plan 01 initial, commit `9712202`) | 8-bit, 8 kHz, 200 samples, full-amp 127↔128 square wave | 4 kHz square wave looping every 25 ms | iOS: loud continuous buzz |
| v2 (first revision, commit `167b4e3`) | 8-bit, 8 kHz, 200 samples, ±1 LSB sine | -48 dBFS sine (8-bit floor), loop-continuous | iOS: quieter but still audible — different sound |
| v3 (second revision, commit `c49765d`) | **16-bit, 22050 Hz, 200 samples, ±1 LSB sine** | -90 dBFS sine, loop-continuous | **iOS: silent (approved)** |

### Root cause discovered during iteration

**iOS Safari ignores the `HTMLMediaElement.volume` attribute entirely** — long-standing
iOS WebKit behavior; media volume is controlled exclusively via hardware buttons.
Setting `el.volume = 0.0001` on iOS is a no-op; the element plays at full system
volume. Attenuation must therefore be encoded into the PCM samples themselves,
which is why v3 switched to 16-bit PCM (smallest non-zero amplitude is 1/32768 =
-90 dBFS, vs the 8-bit floor of 1/256 = -48 dBFS — 42 dB quieter).

`SILENT_LOOP_VOLUME = 0.0001` is retained as defense in depth: it's a no-op on
iOS (the platform this fix targets) but still attenuates on Android Chrome and
desktop browsers where the volume attribute IS honored.

D-05's locked phrasing — "volume near-zero but non-zero (suggested starting value
`0.0001`; final value resolved at plan time with one device-test pass to confirm
iOS still treats it as a 'real' track)" — anticipated tuning at device-test time,
which is exactly the path the checkpoint took. The spec's spirit ("near-zero
perceived loudness") is preserved; only the mechanism (PCM amplitude vs .volume
attribute) shifted to match iOS reality.

## Test build trail

- Implementation commits: `9712202` (v1 wire-up), `4be75de` (v1 tests), `fb06c8a` (v1 SUMMARY)
- Plan 02 revision commits: `167b4e3` (v2 PCM), `c49765d` (v3 PCM)
- All revisions: full suite 1288 passing, `npm run build` exit 0, `git diff package.json` empty (DEPS-01 holds).
- Served via `vite preview --host 0.0.0.0 --port 4173` → `http://192.168.15.57:4173/hrv/`.

## Disposition

| Requirement | Disposition |
|-------------|-------------|
| IOS-01 (silent switch ON + no HP → speaker) | **passed** (Scenario A) |
| IOS-02 (headphones → headphones) | **passed** (Scenario B) |
| IOS-03 (silent switch OFF → speaker) | **passed** (Scenario C) |
| IOS-04 (non-iOS no regression) | **partially passed**: F desktop passed; E Android deferred — no device |
| ROADMAP success criterion #5 (lock + background) | **passed** (Scenario D, unchanged from pre-Phase-49) |
| Operator resume signal | **approved** |

## Follow-ups

- **Android verification (IOS-04 completion):** when operator gains access to an Android device, re-run Scenario E and append result here. Until then, IOS-04 carries a `deferred — no device` mark in the milestone deferred items table.
- **Service worker cache invalidation:** the SW prevented the new bundle from loading on the iPhone twice during iteration, requiring manual `navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister())))` + cache wipe each time. Worth flagging in milestone retro: the PWA SW silently masking new builds is a recurring devvalidation friction point.
