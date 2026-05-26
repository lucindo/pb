---
phase: 260526-dse
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/NaviKriyaSessionSurface.tsx
  - src/app/NaviKriyaSessionSurface.test.tsx
  - src/app/sessionPresentation.ts
  - src/app/sessionPresentation.test.ts
  - src/app/appViewModel.ts
  - src/app/appControllerAdapters.ts
  - src/app/useAppViewModel.ts
  - src/app/setupCardSummary.ts
  - src/app/setupCardSummary.test.ts
  - src/app/App.session.test.tsx
autonomous: true
requirements:
  - 260526-dse-01  # Navi session-complete: orb checkmark + Done CTA + no config row
  - 260526-dse-02  # Stretch session-complete: no config row (parity with HRV)

must_haves:
  truths:
    - "When a Navi Kriya session completes, the OrbShape renders the white checkmark glyph (same CheckmarkGlyph used by HRV)"
    - "When a Navi Kriya session completes, the practice primary button reads 'Done' (not 'Start')"
    - "When a Navi Kriya session completes, tapping 'Done' dismisses completion and returns the surface to idle (Start reappears)"
    - "When a Navi Kriya session completes, the Rounds/Oms/Pace SetupCard summary row is NOT rendered"
    - "When a Stretch session completes, the warm-up/target/duration SetupCard summary row is NOT rendered"
    - "HRV session-complete behaviour is unchanged (orb checkmark, Done CTA, no card)"
  artifacts:
    - path: "src/app/NaviKriyaSessionSurface.tsx"
      provides: "Forwards showCompletion to OrbShape on the completion branch"
      contains: "showCompletion="
    - path: "src/app/sessionPresentation.ts"
      provides: "getNaviKriyaPrimaryAction with a 'done' branch when justCompleted"
      contains: "justCompleted"
    - path: "src/app/setupCardSummary.ts"
      provides: "Hides naviKriya + stretch summary cards on isComplete"
      contains: "isComplete"
    - path: "src/app/NaviKriyaSessionSurface.test.tsx"
      provides: "Regression test for orb checkmark + completion headline branch"
  key_links:
    - from: "src/app/NaviKriyaSessionSurface.tsx"
      to: "src/components/OrbShape.tsx"
      via: "showCompletion prop"
      pattern: "showCompletion=\\{presentation\\.showCompletionHeadline\\}"
    - from: "src/app/appControllerAdapters.ts"
      to: "src/app/sessionPresentation.ts (getNaviKriyaPrimaryAction)"
      via: "justCompleted: navi.justCompleted"
      pattern: "justCompleted: navi\\.justCompleted"
    - from: "src/app/appControllerAdapters.ts"
      to: "src/app/appViewModel.ts (createPracticeSettingsViewModel)"
      via: "stretch.isComplete + naviKriya.isComplete sources"
      pattern: "isComplete"
    - from: "src/app/useAppViewModel.ts (onNaviPrimaryClick)"
      to: "navi.clearCompletion"
      via: "primaryActions.naviKriya === 'done' branch"
      pattern: "primaryActions\\.naviKriya === 'done'"
---

<objective>
Fix the Navi Kriya session-complete UI regression where the post-finish state looked like the pre-session idle state (no orb checkmark, "Start" CTA, Rounds/Oms/Pace config row visible) instead of mirroring HRV's session-complete state (white checkmark in orb + "Done" CTA + no config row). Also fix the parallel Stretch regression (config row visible at completion) so all three practices share one completion presentation contract.

Purpose: The "Session complete / TAKE A MOMENT" headline already renders for Navi (NaviKriyaSessionSurface line 64), but three sibling signals never get plumbed: (a) OrbShape never receives `showCompletion`, (b) `getNaviKriyaPrimaryAction` has no `'done'` case so the CTA falls back to `'start'`, (c) `createPracticeSettingsViewModel` has no `isComplete` source for naviKriya/stretch so `setupCardSummary` keeps emitting the pre-session summary cards. The fix is purely view-layer plumbing — no session controller / state machine changes (honors `[[feedback_design_logic_separation]]`).

Output: View-layer prop forwarding + 2 small viewmodel additions + regression tests covering the three observable truths for both Navi and Stretch.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

# Bug observation (operator-reported regression)
The Navi practice post-session UI renders the pre-session idle UI: empty orb interior + Rounds/Oms/Pace SetupCard + Start button. The "Session complete / TAKE A MOMENT" headline IS rendered (so `presentation.showCompletionHeadline` is true). HRV's post-session UI is correct (checkmark in orb + Done button + no SetupCard).

# Root cause (read during planning)
Three independent view-layer plumbing gaps, each with a one-line fix:

1. **OrbShape checkmark not plumbed** — `src/app/NaviKriyaSessionSurface.tsx` (line 31-40) renders `<OrbShape … />` without `showCompletion={presentation.showCompletionHeadline}`. HRV's `BreathingSessionSurface.tsx` (line 38) does pass it. OrbShape itself already supports the prop (`src/components/OrbShape.tsx` line 109 — `if (showCompletion) { … <CheckmarkGlyph /> … }`). Phase 46 KUTH-03 already locked the checkmark visuals as byte-identical across variants.

2. **Primary action has no 'done' branch for Navi** — `src/app/sessionPresentation.ts` lines 152-160:
   ```
   export type NaviKriyaPrimaryAction = 'cancel' | 'end' | 'start'
   export function getNaviKriyaPrimaryAction(input: { starting; sessionActive }) {
     if (input.starting) return 'cancel'
     return input.sessionActive ? 'end' : 'start'
   }
   ```
   After a Navi session completes, `sessionActive` flips to false (`useNaviKriyaSessionController` derives it from `starting || nkPhase !== 'idle'` and `nkEnd()` is called on completion), so the function returns `'start'`. The signal we need (`justCompleted`) is already produced by the controller and already flows into `getNaviKriyaPresentation` (used at sessionPresentation.ts line 116). It just isn't plumbed into the primary-action helper or the controller-adapters call site.

3. **SetupCard summary not hidden on Navi/Stretch completion** — `src/app/setupCardSummary.ts`:
   - The `resonant` branch (lines 25-45) already hides on `settings.isRunning || settings.isComplete` → HRV works.
   - The `stretch` branch (lines 47-63) only hides on `isRunning` → after `breathing.inSessionView` flips to false at complete, the card re-renders.
   - The `naviKriya` branch (lines 65-72) has no completion guard at all and never hides.

   The viewmodel discriminated union (`AppPracticeSettingsViewModel` in `src/app/appViewModel.ts` lines 87-109) carries `isComplete` only on the `resonant` arm. The fix is to add `isComplete: boolean` to the `stretch` arm and the `naviKriya` arm, plumb the sources through `createPracticeSettingsViewModel` and `createPracticeSettingsViewModelFromControllers`, and tighten the gates in `setupCardSummary`.

# Stretch path verification (confirmed during planning)
Stretch routes through `BreathingSessionSurface` (gets the orb checkmark for free via existing `showCompletion` forwarding) AND through `getBreathingPrimaryAction` (gets the `'done'` CTA for free at status='complete'). The only Stretch gap is the SetupCard. The fix is therefore: full three-part fix for Navi, SetupCard-gate-only fix for Stretch.

# Existing signals (already in the data graph — DO NOT introduce new state)
- `navi.justCompleted: boolean` — already in `NaviKriyaSessionController` and already flows through `appControllerAdapters.ts` into the session viewmodel (line 116). Reuse it for the primary action AND for the new `naviKriya.isComplete` field.
- `breathing.session.state.status === 'complete' && !breathing.inSessionView` — already used to derive `resonant.isComplete` in `appControllerAdapters.ts` line 141. Reuse the exact same derivation for `stretch.isComplete` (stretch shares the breathing controller).
- `navi.clearCompletion(): void` — already exposed by the navi controller and already wired in `useAppViewModel.ts` line 77 for the practice switch. Reuse it for the new `'done'` CTA click path on Navi (analogous to `breathingResetSession` in `onBreathingPrimaryClick`).

# Files this plan reads
@src/app/NaviKriyaSessionSurface.tsx
@src/app/BreathingSessionSurface.tsx
@src/app/sessionPresentation.ts
@src/app/appViewModel.ts
@src/app/appControllerAdapters.ts
@src/app/useAppViewModel.ts
@src/app/setupCardSummary.ts
@src/components/OrbShape.tsx
@src/hooks/useNaviKriyaSessionController.ts
@src/hooks/useBreathingSessionController.ts

<interfaces>
<!-- Key contracts the executor needs. Already extracted; no codebase exploration required. -->

From src/components/OrbShape.tsx (line 44, 95, 109):
```typescript
export interface OrbShapeProps {
  // ...
  showCompletion?: boolean
}
// When showCompletion is true, OrbShape renders <OrbContainer><CheckmarkGlyph /></OrbContainer>
// — bypasses frame / leadInDigit / nkPhase branches.
```

From src/app/sessionPresentation.ts (line 152-160) — CURRENT (buggy):
```typescript
export type NaviKriyaPrimaryAction = 'cancel' | 'end' | 'start'
export function getNaviKriyaPrimaryAction(input: {
  starting: boolean
  sessionActive: boolean
}): NaviKriyaPrimaryAction {
  if (input.starting) return 'cancel'
  return input.sessionActive ? 'end' : 'start'
}
```

Target shape after fix:
```typescript
export type NaviKriyaPrimaryAction = 'cancel' | 'end' | 'start' | 'done'
export function getNaviKriyaPrimaryAction(input: {
  starting: boolean
  sessionActive: boolean
  justCompleted: boolean
}): NaviKriyaPrimaryAction {
  if (input.starting) return 'cancel'
  if (input.sessionActive) return 'end'
  if (input.justCompleted) return 'done'
  return 'start'
}
```
(`SessionPrimaryAction = BreathingPrimaryAction | NaviKriyaPrimaryAction` already contains `'done'` from the breathing arm — the label helper at line 186 already handles it. No string-table change needed.)

From src/app/appViewModel.ts (lines 87-109) — CURRENT viewmodel union:
```typescript
export type AppPracticeSettingsViewModel =
  | { kind: 'hidden' }
  | { kind: 'resonant'; settings; isRunning; isComplete; onChange; onExtendDuration }
  | { kind: 'stretch'; settings; isRunning; onChange }      // ← add isComplete
  | { kind: 'naviKriya'; settings; onChange }               // ← add isComplete
```

From src/app/appControllerAdapters.ts (line 77-80 + 141 + 145-149 + 150-153) —
the sources to forward. `breathing.session.state.status === 'complete' && !breathing.inSessionView`
is the derivation for both resonant AND stretch completion (they share the controller).
`navi.justCompleted` is the derivation for naviKriya.
</interfaces>

# Codebase conventions to honor
- All view components are pure functions of viewmodel; do not introduce internal state.
- `setupCardSummary` is the single source of truth for whether the SetupCard summary renders. Tighten gates there, do not add new conditionals in `PracticeSettingsView`.
- Existing tests use Vitest + RTL (`@testing-library/react`) and import `EN_STRINGS_FIXTURE` for string tables. Follow the same pattern in the new surface test (see `src/components/OrbShape.test.tsx` Test E for the checkmark assertion pattern: `container.querySelector('svg[viewBox="0 0 24 24"] polyline')`).
- `[[feedback_design_logic_separation]]` — this is a view-layer-only fix. Do NOT touch `useNaviKriyaSessionController`, `useBreathingSessionController`, the session domain (`src/domain/sessionController.ts`, `src/domain/naviKriyaSession.ts`), or audio.
- `[[feedback_no_design_locking]]` — tests assert behavioural facts (orb renders checkmark polyline, primary button text equals 'Done', SetupCard is not in the document) — DO NOT assert Tailwind classNames, hex colours, or specific DOM structure beyond what is load-bearing.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Wire showCompletion + done CTA + isComplete plumbing for Navi (RED→GREEN)</name>
  <files>
    src/app/NaviKriyaSessionSurface.tsx,
    src/app/NaviKriyaSessionSurface.test.tsx,
    src/app/sessionPresentation.ts,
    src/app/sessionPresentation.test.ts,
    src/app/appViewModel.ts,
    src/app/appControllerAdapters.ts,
    src/app/useAppViewModel.ts
  </files>
  <behavior>
    RED: write failing tests first; GREEN: minimal plumbing to pass them.

    Test 1 — NaviKriyaSessionSurface forwards completion to OrbShape (new file `src/app/NaviKriyaSessionSurface.test.tsx`):
      - Render `<NaviKriyaSessionSurface presentation={{ shape: { kind: 'orb', cue: 'nose', leadInDigit: null }, readout: null, showCompletionHeadline: true }} … />` with the existing string fixtures and variant flags.
      - Assert: `container.querySelector('svg[viewBox="0 0 24 24"] polyline')` is NOT null (the CheckmarkGlyph from OrbShape is rendered).
      - Assert: the "Session complete" headline text is rendered (regression guard so we do not accidentally collapse the existing branch).
      - Also add an idle-mode case: when `showCompletionHeadline: false` and `shape.kind === 'orb'` with no leadInDigit, the polyline selector returns null (negative control — proves the prop, not a global change, drives the checkmark).

    Test 2 — getNaviKriyaPrimaryAction returns 'done' on justCompleted (extend `sessionPresentation.test.ts`):
      - The existing block at lines 139-145 currently calls `getNaviKriyaPrimaryAction({ starting, sessionActive })`. Update the existing three cases to pass `justCompleted: false` (no behaviour change).
      - Add a new case: `getNaviKriyaPrimaryAction({ starting: false, sessionActive: false, justCompleted: true })` returns `'done'`.
      - Add: `getNaviKriyaPrimaryAction({ starting: false, sessionActive: false, justCompleted: false })` returns `'start'` (unchanged behaviour with explicit signal).
      - Add: `getNaviKriyaPrimaryAction({ starting: false, sessionActive: true, justCompleted: true })` returns `'end'` (sessionActive wins — a new session was started over a completion; defensive, but locks ordering).

    GREEN steps (implementation):
      a. `src/app/NaviKriyaSessionSurface.tsx`: at the existing OrbShape callsite (line 32-40), add `showCompletion={presentation.showCompletionHeadline}` as a sibling to the existing props. The completion branch in OrbShape will then render the CheckmarkGlyph instead of `null` (because `frame` is `null` and `leadInDigit` is `null` for that case).
      b. `src/app/sessionPresentation.ts`: widen `NaviKriyaPrimaryAction` to include `'done'`; add `justCompleted: boolean` to the input type; add the `if (input.justCompleted) return 'done'` branch positioned AFTER the sessionActive check and BEFORE the final `start` return. The label helper at line 175-189 already handles `'done'` from the breathing arm — no change needed there.
      c. `src/app/appControllerAdapters.ts` (line 77-80): pass `justCompleted: navi.justCompleted` to `getNaviKriyaPrimaryAction`.
      d. `src/app/appViewModel.ts` (line 87-109): add `isComplete: boolean` to the `naviKriya` arm of `AppPracticeSettingsViewModel`. Also add `isComplete: boolean` to the `naviKriya` source object in `PracticeSettingsSources` (line 241-244) and forward it in `createPracticeSettingsViewModel` (line 272-276).
      e. `src/app/appControllerAdapters.ts` (line 150-153): set `isComplete: navi.justCompleted` in the `naviKriya` source.
      f. `src/app/useAppViewModel.ts` (line 119-129): in `onNaviPrimaryClick`, add a `'done'` branch BEFORE the final `naviStart()` call that invokes `navi.clearCompletion` (already imported as `naviClearCompletion` at line 77). Pattern mirrors `onBreathingPrimaryClick`'s `'done'` branch at lines 110-115. Update the dependency array to include `naviClearCompletion`.

    DO NOT touch `NaviKriyaSessionController`, `useNaviKriyaSessionController`, session domain code, or audio. The completion signal is already produced; this task only forwards it through view-layer functions.
  </behavior>
  <action>
    Follow the RED→GREEN steps in `<behavior>`. Write all tests first, run them and confirm they fail with the documented selectors/expectations, then implement steps a-f. Keep the dependency array hygiene in the useCallback at `onNaviPrimaryClick` correct (add `naviClearCompletion`). Do not collapse Test 1 and Test 2 into one file — surface test belongs in `NaviKriyaSessionSurface.test.tsx`, action test extends `sessionPresentation.test.ts`. When updating the existing three primary-action assertions to add `justCompleted: false`, do not change their expected outputs.
  </action>
  <verify>
    <automated>npx vitest run src/app/NaviKriyaSessionSurface.test.tsx src/app/sessionPresentation.test.ts src/app/appControllerAdapters.test.ts src/app/appViewModel.test.ts src/app/useAppViewModel.test.ts 2>&1 | tail -40</automated>
  </verify>
  <done>
    - New file `src/app/NaviKriyaSessionSurface.test.tsx` exists with at least 2 cases (completion+idle), both passing.
    - `getNaviKriyaPrimaryAction` accepts `justCompleted` and returns `'done'` for the (false, false, true) tuple.
    - `AppPracticeSettingsViewModel` `naviKriya` arm has `isComplete: boolean`.
    - `appControllerAdapters.ts` plumbs `navi.justCompleted` into BOTH the primary-action call and the new `naviKriya.isComplete` source.
    - `onNaviPrimaryClick` has a `'done'` branch that calls `naviClearCompletion`; dep array updated.
    - All existing tests in the five files listed under verify still pass (no regressions to HRV / existing navi paths).
    - `grep -n 'showCompletion=' src/app/NaviKriyaSessionSurface.tsx` returns exactly one line (the OrbShape callsite).
    - `grep -n "if (input.justCompleted)" src/app/sessionPresentation.ts` returns exactly one match inside `getNaviKriyaPrimaryAction`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Hide SetupCard on Navi + Stretch completion (RED→GREEN) + end-to-end App.session regression test</name>
  <files>
    src/app/setupCardSummary.ts,
    src/app/setupCardSummary.test.ts,
    src/app/appViewModel.ts,
    src/app/appControllerAdapters.ts,
    src/app/App.session.test.tsx
  </files>
  <behavior>
    RED: write failing assertions first; GREEN: minimal viewmodel + setupCardSummary changes to pass them.

    Test 1 — `setupCardSummary.test.ts` (extend existing file): for both branches, add a case asserting `buildSetupCardSummary({ settings: { kind: 'stretch', isRunning: false, isComplete: true, … }, practice })` returns `null` (parallel to the existing resonant+isComplete case). Add the analogous case for `{ kind: 'naviKriya', isComplete: true, … }` returning `null`. Also add a negative-control case for naviKriya with `isComplete: false` returning the existing 3-item rounds/oms/pace summary (proves the gate, not a blanket return-null).

    Test 2 — `App.session.test.tsx` end-to-end Navi completion regression (new test): set up a Navi session, advance through completion (use the existing patterns in this file — find an existing navi-related test or follow the resonant pattern at line 92-108), and assert:
      - `screen.getByText('Session complete')` is visible.
      - `screen.getByRole('button', { name: 'Done' })` is visible (NOT 'Start').
      - The Rounds/Oms/Pace SetupCard summary is NOT in the document. Use the existing `Edit … settings` button as the proxy (see line 88 for the HRV proxy: `queryByRole('button', { name: /^Edit HRV Breathing settings$/ })` should be null). The Navi equivalent uses `practice.settingsSheet.editCardAriaLabel(practice.switcher.naviKriyaHeading)` — resolve the exact text via the string fixture, or query `getByRole('button', { name: /Edit .* Navi/i })` and assert `.queryByRole` returns null. DO NOT lock the exact class names or DOM structure — assert presence/absence only.
      - After clicking 'Done', the Start button reappears and the completion headline is gone (proves `clearCompletion` is wired).

    Note on the Stretch end-to-end test: Stretch's CTA + orb already work; the only Stretch fix is the SetupCard gate covered by the setupCardSummary.test.ts case above. Do not add a Stretch App.session test unless one is trivially adaptable from an existing pattern — the unit-level test is sufficient given the shared `breathing.session.state.status === 'complete' && !breathing.inSessionView` derivation is identical to resonant.

    GREEN steps (implementation):
      a. `src/app/setupCardSummary.ts`:
         - Stretch branch (line 47-63): change `if (settings.isRunning) return null` to `if (settings.isRunning || settings.isComplete) return null`.
         - NaviKriya branch (line 65-72): add `if (settings.isComplete) return null` BEFORE the existing `const n = settings.settings` line.
      b. `src/app/appViewModel.ts` (line 100-104): add `isComplete: boolean` to the `stretch` arm of `AppPracticeSettingsViewModel`. Add `isComplete: boolean` to the `stretch` source object in `PracticeSettingsSources` (line 236-240). Forward it in `createPracticeSettingsViewModel` (line 263-270).
      c. `src/app/appControllerAdapters.ts` (line 145-149): set `isComplete: breathing.session.state.status === 'complete' && !breathing.inSessionView` (extract to a `const completedAtIdle = …` if it improves readability, but a copy is acceptable since `resonant` uses the exact same expression at line 141).
      d. Verify the naviKriya `isComplete` plumbing from Task 1 is already wired; if not, this task completes it.

    Edge cases to preserve:
      - When `kind === 'hidden'` (active navi session in flight), early-return null path at line 21 is unchanged.
      - Switching practices while one is in a completed state already calls `naviClearCompletion()` (useAppViewModel line 157) — no change needed; the Done click path now also clears it.
  </behavior>
  <action>
    Follow the RED→GREEN order in `<behavior>`. For the App.session.test.tsx case, use the existing Navi test harness in the file (search for `start.*Navi` or the existing pattern that advances a navi session to completion — if no such harness exists, mirror the resonant completion test at line 92-108 but for the navi practice toggle). If the existing navi test infrastructure does not yet drive a completion (because the bug was undetected), add the minimum setup using `fireEvent.click` on the practice toggle to switch to Navi, the Start button, and `vi.advanceTimersByTime` to elapse rounds-worth of time — keep the new test under 30 lines. DO NOT assert against Tailwind class names, hex codes, or exact element trees; assert against accessible text and roles only (`[[feedback_no_design_locking]]`).
  </action>
  <verify>
    <automated>npx vitest run src/app/setupCardSummary.test.ts src/app/App.session.test.tsx src/app/appViewModel.test.ts src/app/appControllerAdapters.test.ts 2>&1 | tail -40</automated>
  </verify>
  <done>
    - `setupCardSummary.ts` stretch branch returns null on `isRunning || isComplete`; naviKriya branch returns null on `isComplete`.
    - `AppPracticeSettingsViewModel` `stretch` arm has `isComplete: boolean`.
    - `appControllerAdapters.ts` plumbs `breathing.session.state.status === 'complete' && !breathing.inSessionView` into both `resonant.isComplete` AND `stretch.isComplete`, and `navi.justCompleted` into `naviKriya.isComplete`.
    - `setupCardSummary.test.ts` covers the new completion-hides-card cases for both stretch and naviKriya (plus the naviKriya negative control).
    - `App.session.test.tsx` has a new Navi end-to-end test that asserts: orb checkmark polyline present, 'Done' button present, 'Start' button NOT present, Navi SetupCard edit affordance NOT present, and post-Done click returns to idle with 'Start' visible.
    - All existing tests in the four files listed under verify still pass.
    - `grep -n "isRunning || settings.isComplete" src/app/setupCardSummary.ts` returns matches for BOTH the resonant branch (existing) and the stretch branch (new).
    - `grep -c "if (settings.isComplete) return null" src/app/setupCardSummary.ts` shows the new naviKriya gate is present (at least one match for naviKriya in addition to any existing patterns).
  </done>
</task>

<task type="auto">
  <name>Task 3: Full-suite regression sweep + type-check + HRV/Navi/Stretch parity audit</name>
  <files></files>
  <action>
    Run the project's full test suite and type-check to confirm no regressions outside the changed surfaces, then perform a parity audit. Specifically:

    1. Run `npm run typecheck` (or `npx tsc --noEmit` if the script name differs — check `package.json` first) and confirm zero errors. The viewmodel union widening (adding `isComplete` to stretch + naviKriya arms) and the primary-action signature change (`justCompleted` parameter) are both compile-time-significant; any caller not updated in Tasks 1-2 will surface here.

    2. Run `npm test` (or the equivalent vitest invocation — confirm via `package.json` scripts). All tests pass.

    3. Run `npm run lint` (if present) to confirm no new lint violations — particularly `react-hooks/exhaustive-deps` on the updated `onNaviPrimaryClick` callback.

    4. Parity audit (read-only — do NOT modify code in this task): with the test suite green, manually inspect the three surface paths:
       - HRV (resonant): `BreathingSessionSurface` passes `showCompletion`; `getBreathingPrimaryAction` returns `'done'` at complete; `setupCardSummary` resonant branch hides at `isRunning || isComplete`. Confirmed unchanged.
       - Navi: `NaviKriyaSessionSurface` now passes `showCompletion`; `getNaviKriyaPrimaryAction` now returns `'done'` on `justCompleted`; `setupCardSummary` naviKriya branch now hides on `isComplete`.
       - Stretch: `BreathingSessionSurface` passes `showCompletion` (unchanged); `getBreathingPrimaryAction` returns `'done'` at complete (unchanged); `setupCardSummary` stretch branch now hides at `isRunning || isComplete`.

       Confirm via `grep` (read-only):
       - `grep -n "showCompletion" src/app/BreathingSessionSurface.tsx src/app/NaviKriyaSessionSurface.tsx` returns one match per file.
       - `grep -n "isComplete" src/app/setupCardSummary.ts` returns three hit sites (resonant, stretch, naviKriya).
       - `grep -n "isComplete" src/app/appViewModel.ts` returns at least three matches in the type union (resonant + stretch + naviKriya).

    5. If any step fails, FIX the underlying root cause and re-run. Do NOT mask failures with `as any`, `// eslint-disable`, or `expect.any(…)`. If a viewmodel test fixture in `appViewModel.test.ts` or `appControllerAdapters.test.ts` needs the new `isComplete` field added, update the fixture inline (these are test-only changes; do NOT add `isComplete` to any source viewmodel that does not legitimately need it).

    DO NOT touch the session controllers, the session domain, audio, or any non-view-layer code in this task. If a test failure points at a domain file, stop and re-read the bug observation — the fix is strictly view-layer.
  </action>
  <verify>
    <automated>npm run typecheck 2>&1 | tail -20 && npm test 2>&1 | tail -30 && grep -c "showCompletion" src/app/NaviKriyaSessionSurface.tsx && grep -c "isComplete" src/app/setupCardSummary.ts</automated>
  </verify>
  <done>
    - Typecheck: zero errors.
    - Full vitest suite: all tests pass (count visible in tail).
    - Lint (if configured): zero new warnings.
    - `grep -c "showCompletion" src/app/NaviKriyaSessionSurface.tsx` returns at least 1.
    - `grep -c "isComplete" src/app/setupCardSummary.ts` returns at least 3 (one per practice branch).
    - No changes outside the file set declared in `files_modified` (verify via `git diff --stat`).
  </done>
</task>

</tasks>

<verification>
End-to-end verification at the phase level (overall phase checks):

1. **Navi session-complete UI matches HRV's** (the bug observation): operator should be able to start a Navi session, let it complete, and visually confirm: white checkmark inside the orb's dark accent disc, "Done" button below, NO Rounds/Oms/Pace row, audio toggle icon present, disclaimer at bottom. Same shape as HRV's screenshot in the bug report.

2. **Stretch session-complete UI matches HRV's**: same as above for Stretch (no warm-up/target/duration row at completion).

3. **HRV unchanged**: HRV session-complete still shows checkmark + Done + no card + disclaimer.

4. **Done dismisses to idle**: Clicking Done on any of the three practices clears the completion state — Start button returns, checkmark disappears, SetupCard returns (for idle-state config).

5. **No domain / state-machine changes**: `git diff src/domain/ src/hooks/useNaviKriyaSessionController.ts src/hooks/useBreathingSessionController.ts src/audio/` returns empty.

6. **No design-token / spike-locked-value churn**: `git diff` shows zero changes to hex codes, Tailwind classNames in production files, or `theme.css`.
</verification>

<success_criteria>
Plan is successful when all three are true:

1. **Visual regression closed**: A real session run on each practice (HRV, Navi, Stretch) shows the post-completion state visually identical to the HRV "correct" screenshot in the bug report: checkmark inside orb + "Done" CTA + no practice-config SetupCard + audio toggle + disclaimer.

2. **Regression tests in place**: New tests added across `NaviKriyaSessionSurface.test.tsx`, `sessionPresentation.test.ts`, `setupCardSummary.test.ts`, and `App.session.test.tsx` would have caught the original bug (i.e., they fail on the pre-fix code and pass on the post-fix code). The end-to-end App.session.test.tsx test asserts the trifecta: orb checkmark polyline + 'Done' role-button + absence of the Navi edit-settings affordance.

3. **No collateral damage**: `npm run typecheck` clean, full vitest suite green, no changes to files outside `files_modified`, no changes to session controllers / domain / audio / styles / Tailwind classes / hex codes.
</success_criteria>

<output>
Create `.planning/quick/260526-dse-fix-navi-session-complete-state-missing-/260526-dse-SUMMARY.md` when done.
Summary should record:
- The three plumbing gaps that were closed (showCompletion prop forwarding, justCompleted-driven 'done' action, isComplete-gated SetupCard) and the one-line nature of each.
- Confirmation that Stretch was fixed in parallel (parity established across all three practices).
- Confirmation that the fix was view-layer-only (no domain / controller / audio changes), honoring `[[feedback_design_logic_separation]]`.
- The new test count added (target: 4-6 new tests across 4 files).
- Any unexpected fallout discovered during the typecheck pass (e.g., fixtures in `appViewModel.test.ts` that needed `isComplete` added to their stretch/naviKriya stubs).
</output>
