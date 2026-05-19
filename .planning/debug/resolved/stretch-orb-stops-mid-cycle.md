---
status: resolved
trigger: "At the end of a stretch session the breathing orb freezes on the last exhale before the countdown reaches zero — the session stops abruptly mid breath cycle instead of completing the in-flight in/out cycle the way the HRV practice does."
created: 2026-05-19T00:00:00Z
updated: 2026-05-19T04:00:00Z
---

## Current Focus

hypothesis: getStretchFrame's DS-WR-03 completion clamp (stretchRamp.ts:189-193) pins elapsedInSegment to `endMs - startMs - cycleMs/2` for the entire final half-cycle, freezing the rendered frame at the start of the last exhale while the countdown (computed from unclamped elapsedMs) keeps ticking. HRV's getSessionFrame has no such clamp — it advances the frame freely up to a `Math.ceil`-rounded-up completionMs.
test: Read both frame functions; simulate the cool-down completion math for a 5/5/5 session.
expecting: Clamp pins phaseProgress at the inhale->exhale boundary for the last cycleMs/2 of the session.
next_action: Diagnosis complete — return ROOT CAUSE FOUND.

## Symptoms

expected: When a stretch session's countdown reaches zero, the breathing orb completes the in-flight in/out cycle before stopping — matching HRV behavior, where no new cycle starts once the countdown is exhausted but the current cycle finishes cleanly.
actual: At the end of the practice the orb froze on the last exhale BEFORE the countdown reached zero — the session stops abruptly mid-cycle rather than animating the current breath cycle to completion.
errors: None reported.
reproduction: Test 4 in UAT — run a full stretch session to completion and watch the orb on the final cool-down segment.
started: Discovered during UAT for Phase 34. Stretch session run path added in plan 34-05; end-of-session handling in App.tsx / sessionController.

## Eliminated

- hypothesis: completeIfNeeded / endSession diverge between stretch and HRV
  evidence: sessionController.completeIfNeeded uses the SAME `lastFrame.isComplete` gate for both paths (line 161). The divergence is entirely inside the frame computation (getStretchFrame vs getSessionFrame), not the controller.
  timestamp: 2026-05-19T00:00:00Z

## Evidence

- timestamp: 2026-05-19T00:00:00Z
  checked: src/domain/sessionMath.ts getSessionFrame (HRV path), lines 32-47
  found: HRV completion uses a SEPARATE threshold from the countdown. `remainingMs` derives from `plan.totalMs` (configured duration); `isComplete` uses `completionMs = Math.ceil(plan.totalMs / plan.cycleMs) * plan.cycleMs` — the configured total rounded UP to the next whole cycle boundary. cycleIndex/phaseProgress advance freely with elapsedMs the entire time. So when the countdown hits zero (at totalMs) the orb keeps animating until completionMs (>= totalMs), completing the in-flight cycle.
  implication: HRV deliberately decouples "countdown reaches zero" from "session complete", and never clamps the rendered frame — that is the graceful-finish behaviour the user expects.

- timestamp: 2026-05-19T00:00:00Z
  checked: src/domain/stretchRamp.ts getStretchFrame, lines 206-210
  found: Stretch completion uses ONE value for both: `sessionEndMs` = last segment's endMs. `remainingMs = max(0, sessionEndMs - safeElapsedMs)` AND `isComplete = safeElapsedMs >= sessionEndMs`. buildStretchSegments already snaps every segment to a whole cycle count (line 104-107), so sessionEndMs IS a cycle boundary — completion fires exactly at the cycle boundary, which is correct on its own.
  implication: isComplete timing is fine. The freeze must come from elsewhere in getStretchFrame.

- timestamp: 2026-05-19T00:00:00Z
  checked: src/domain/stretchRamp.ts getStretchFrame DS-WR-03 clamp, lines 180-193
  found: For a bounded final segment, `elapsedInSegment = Math.min(rawElapsedInSegment, activeSeg.endMs - activeSeg.startMs - activeSeg.cycleMs/2)`. This clamp was added to stop a phantom extra in-phase cycle when elapsed lands EXACTLY on endMs. But the clamp ceiling is `segmentSpan - cycleMs/2` — half a cycle short of the end. Once safeElapsedMs passes `sessionEndMs - cycleMs/2`, elapsedInSegment is PINNED. From that instant cycleElapsedMs, phaseProgress, and phase are all frozen.
  implication: The clamp over-corrects. Instead of clamping only the exact endpoint, it freezes the rendered frame for the entire final HALF-cycle (the last exhale).

- timestamp: 2026-05-19T00:00:00Z
  checked: Simulated 5/5/5 stretch session, cool-down at 6 bpm (cycleMs 10000ms, 50:50 ratio)
  found: clamp ceiling = 300000 - 5000 = 295000ms. At that elapsedInSegment the last cycle (#29, starts 290000) has cycleElapsed = 5000 = inhaleMs exactly => phase 'out', phaseProgress frozen at the exhale START. The clamp engages at elapsedMs = sessionEndMs - 5000 and isComplete only fires 5000ms later at sessionEndMs. For the full final 5s the orb is frozen at the start of the last exhale while remainingMs counts 0:05 -> 0:00.
  implication: Exact reproduction of the reported symptom — "orb froze on the last exhale BEFORE the countdown reached zero".

## Resolution

root_cause: getStretchFrame's DS-WR-03 completion clamp (src/domain/stretchRamp.ts:189-193) pins `elapsedInSegment` to `segmentSpan - cycleMs/2` for any bounded final segment. This freezes the rendered breath frame (phase, phaseProgress, cycleElapsedMs) at the start of the last exhale for the entire final half-cycle, while the countdown (remainingMs) and isComplete continue from the UNCLAMPED safeElapsedMs. The HRV path (getSessionFrame) has no such clamp and instead decouples completion from the countdown by rounding the configured total UP to a whole cycle (`Math.ceil(totalMs/cycleMs)*cycleMs`), letting the frame advance freely until that boundary — so HRV finishes the in-flight cycle gracefully. The DS-WR-03 clamp was a fix for a phantom extra cycle at the exact endMs landing, but `-cycleMs/2` over-corrects: it should clamp only the exact `endMs` boundary, not pull the ceiling back by a half cycle.
fix: (find_root_cause_only mode — not applied)
verification: (not applied)
files_changed: []
