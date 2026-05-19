---
phase: quick-260519-bee
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/hooks/useNKEngine.ts
  - src/hooks/useNKEngine.test.tsx
  - src/content/strings.ts
autonomous: true
requirements: [NK-07]
must_haves:
  truths:
    - "useNKEngine no longer exposes pause() or resume()"
    - "controls.pause / controls.resume strings no longer exist (EN, PT-BR, interface)"
    - "Audio resume strings (strings.resume) remain intact"
    - "npm run test:run passes; npm run build / tsc succeeds; lint adds no new problems"
  artifacts:
    - path: "src/hooks/useNKEngine.ts"
      provides: "NK engine without pause/resume"
      contains: "end"
    - path: "src/content/strings.ts"
      provides: "controls block without pause/resume keys"
    - path: "src/hooks/useNKEngine.test.tsx"
      provides: "NK engine tests without pause/resume cases"
  key_links:
    - from: "src/hooks/useNKEngine.ts"
      to: "NKEngineApi interface"
      via: "interface members and returned object stay in sync"
      pattern: "pause|resume"
---

<objective>
Remove orphaned Navi Kriya pause/resume code and strings. The NK-07 requirement was
amended from "pause, resume, and end" to "end" only at the v1.5 milestone audit —
Navi Kriya intentionally mirrors HRV's no-pause flow (commit c19c0e1). The pause()/
resume() engine callbacks, their interface members, the controls.pause/controls.resume
strings, and the tests covering them are now dead code.

Purpose: Remove dead code that no UI references — keeps the NK engine surface honest.
Output: useNKEngine.ts, useNKEngine.test.tsx, and strings.ts with all pause/resume
artifacts removed; full test/build/lint suite green.
</objective>

<execution_context>
@$HOME/.claude-personal-personal/get-shit-done/workflows/execute-plan.md
@$HOME/.claude-personal-personal/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

<interfaces>
<!-- Engine surface before removal (src/hooks/useNKEngine.ts). After removal the
     interface and the returned object both drop pause/resume; everything else stays. -->

export interface NKEngineApi {
  nkPhase: 'idle' | 'front' | 'back' | 'done'
  nkRound: number
  nkCount: number
  nkRunning: boolean
  start(this: void, settings: NaviKriyaSettings, callbacks: NKAudioCallbacks, onComplete: NKOnComplete): void
  pause(this: void): void   // REMOVE
  resume(this: void): void  // REMOVE
  end(this: void): void
  toggleCue(this: void, on: boolean): void
}
</interfaces>

CONFIRMED via grep: no production file references `controls.pause`, `controls.resume`,
or the engine's `pause`/`resume`. All other `.resume()` hits across the codebase
(App.tsx, audioEngine.ts, useAudioCues.ts, audio test files) are the UNRELATED
AudioContext audio-resume path and the `strings.resume` ('Resume audio') key used
by MuteToggle — those MUST NOT be touched. The only engine pause/resume callers are
the two test cases in useNKEngine.test.tsx removed by this plan.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove pause/resume from the NK engine</name>
  <files>src/hooks/useNKEngine.ts</files>
  <action>
    In src/hooks/useNKEngine.ts, remove all pause/resume artifacts:
    1. In the `NKEngineApi` interface (~lines 80-81): delete the `pause(this: void): void`
       and `resume(this: void): void` members. Keep `start`, `end`, `toggleCue`.
    2. Delete the `pause` useCallback (~lines 230-238) and the `resume` useCallback
       (~lines 240-247), including the CR-01 comment block (~lines 226-229) that
       exists solely to explain pause/resume done-phase behavior.
    3. In the returned object (~lines 288-298): remove the `pause,` and `resume,` keys.
       Keep `nkPhase, nkRound, nkCount, nkRunning, start, end, toggleCue`.
    4. The WR-02 comment on `NKEngineRecord.pendingDelayMs` (~lines 48-51) and the
       WR-02 reschedule reference exist only to explain resume() — `pendingDelayMs`
       itself is still written by `schedule()`. KEEP the `pendingDelayMs` field and
       its assignment in `schedule()`, but trim the comment so it no longer references
       resume() (it now just documents that schedule records the pending delay).
       Do NOT delete the field — `schedule()` still sets it.
    5. Leave `start`, `end`, `toggleCue`, `schedule`, `stepOm`, the timer/lead-in
       machinery, and the unmount-cleanup effect fully intact.
    The CR-01 done-phase guard tech-debt item is moot once resume() is gone — verify
    no other code path depends on that guard (grep confirms only resume() used it).
  </action>
  <verify>
    <automated>grep -nE 'pause|resume' src/hooks/useNKEngine.ts | grep -v '^[0-9]*:.*pendingDelayMs' || echo "CLEAN"; npx tsc --noEmit 2>&1 | grep -i 'useNKEngine' || echo "TSC-CLEAN"</automated>
  </verify>
  <done>No `pause`/`resume` identifiers remain in useNKEngine.ts; `pendingDelayMs` field retained; tsc reports no errors for the file.</done>
</task>

<task type="auto">
  <name>Task 2: Remove pause/resume test cases</name>
  <files>src/hooks/useNKEngine.test.tsx</files>
  <action>
    In src/hooks/useNKEngine.test.tsx:
    1. Replace the "NK-01: calling start/pause/resume/end before start() does not throw"
       test (~lines 78-91) — it calls `result.current.pause()` and `result.current.resume()`.
       Either remove the whole `it(...)` block, or if a pre-start null-guard test is
       still wanted, narrow it to only exercise `end()` (which is still no-op-safe
       before start) and rename it to "NK-01: calling end() before start() does not throw".
       Prefer removing the block entirely — `end()`'s null guard is already exercised
       implicitly elsewhere; keep the file minimal.
    2. Remove the entire "NK-07: pause/resume/end behavior" test (~lines 221-279) which
       calls `result.current.pause()` and `result.current.resume()`. NK-07 is now
       end-only; the end()/onComplete(isComplete:false) path is already covered by the
       existing flow but is no longer tested here — if you want to preserve end()
       coverage, add a small focused "NK-07: end() resets to idle and fires onComplete
       with isComplete:false" test that starts, advances past the lead-in, calls end(),
       and asserts idle reset + onComplete. Otherwise remove the block.
    3. Keep NK-01 traversal, NK-02, NK-03, NK-06 tests untouched.
  </action>
  <verify>
    <automated>grep -nE '\.(pause|resume)\(' src/hooks/useNKEngine.test.tsx || echo "CLEAN"</automated>
  </verify>
  <done>No `.pause()` or `.resume()` engine calls remain in the test file; remaining NK tests unchanged.</done>
</task>

<task type="auto">
  <name>Task 3: Remove controls.pause/controls.resume strings and run full verification</name>
  <files>src/content/strings.ts</files>
  <action>
    In src/content/strings.ts, remove ONLY the controls.pause / controls.resume pair:
    1. Interface `controls` block (~lines 17-24): delete the comment line
       "// Phase 31 (NK-07): Navi Kriya session pause/resume affordance." and the
       `readonly pause: string` / `readonly resume: string` members.
       Keep `startSession`, `endSession`, `cancel`.
    2. EN `controls` block (~lines 202-208): delete `pause: 'Pause',` and `resume: 'Resume',`.
    3. PT-BR `controls` block (~lines 385-391): delete `pause: 'Pausar',` and
       `resume: 'Continuar',`.
    4. CRITICAL — do NOT touch the unrelated audio strings: `strings.resume`
       ('Resume audio' / 'Retomar áudio', ~lines 278/461) and the audio-paused
       strings (~lines 280/463). Those are a DIFFERENT top-level key used by
       MuteToggle and must stay. Only the `controls.pause`/`controls.resume` pair
       is in scope.
    Then run the full verification suite (see <verify>).
  </action>
  <verify>
    <automated>grep -nE '\b(pause|resume)\b' src/content/strings.ts | grep -i control || echo "CONTROLS-CLEAN"; grep -n "Resume audio" src/content/strings.ts && npm run test:run && npm run build</automated>
  </verify>
  <done>controls.pause/controls.resume removed from interface + EN + PT-BR; `strings.resume` ('Resume audio') retained; `npm run test:run` passes; `npm run build` (tsc) succeeds.</done>
</task>

</tasks>

<verification>
- `grep -rnE 'controls\.(pause|resume)' src/` returns nothing.
- `grep -nE '\.(pause|resume)\(' src/hooks/useNKEngine.test.tsx` returns nothing.
- `npm run test:run` — all tests pass.
- `npm run build` — tsc type-check succeeds (removed interface members are type-checked).
- `npm run lint` — problem count does not exceed the pre-existing ~56-problem baseline
  (the removal must not ADD lint problems; pre-existing baseline issues are not in scope).
- `strings.resume` ('Resume audio' / 'Retomar áudio') still present in strings.ts.
</verification>

<success_criteria>
- pause()/resume() callbacks, their NKEngineApi interface members, and their returned
  object keys removed from useNKEngine.ts; engine still exposes start/end/toggleCue.
- controls.pause/controls.resume removed from the strings interface, EN, and PT-BR.
- Orphaned pause/resume test cases removed from useNKEngine.test.tsx.
- Audio `strings.resume` and audio-paused strings untouched.
- test:run, build/tsc green; lint baseline not increased.
</success_criteria>

<output>
After completion, create `.planning/quick/260519-bee-remove-orphaned-nk-pause-resume-code-and/260519-bee-01-SUMMARY.md`
</output>
