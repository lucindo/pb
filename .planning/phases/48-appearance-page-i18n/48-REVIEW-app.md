---
phase: 48-appearance-page-i18n
reviewed: 2026-05-26T13:34:45Z
depth: deep
chunk: src/app
files_reviewed: 19
files_reviewed_list:
  - src/app/App.tsx
  - src/app/BreathingSessionSurface.tsx
  - src/app/EndSessionDialogsView.tsx
  - src/app/NaviKriyaSessionSurface.tsx
  - src/app/PracticeControlsView.tsx
  - src/app/PracticeScreen.tsx
  - src/app/PracticeSessionView.tsx
  - src/app/PracticeSettingsView.tsx
  - src/app/ScreenRouter.tsx
  - src/app/appControllerAdapters.ts
  - src/app/appViewModel.ts
  - src/app/pages/AppSettingsPage.tsx
  - src/app/pages/AppearancePage.tsx
  - src/app/pages/LearnPage.tsx
  - src/app/practiceCopy.ts
  - src/app/sessionPresentation.ts
  - src/app/setupCardSummary.ts
  - src/app/useAppNavigation.ts
  - src/app/useAppViewModel.ts
findings:
  critical: 0
  warning: 4
  info: 9
  total: 13
status: issues_found
---

# Phase 48 Chunk Review: `src/app/`

**Reviewed:** 2026-05-26T13:34:45Z
**Depth:** deep
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Adversarial deep review of the `src/app/` chunk (top-level shell, screen router, practice surface, page components, view-model builders, navigation hook, and copy helpers). Cross-file analysis was extended into sibling chunks (`components/`, `hooks/`, `domain/`, `content/`, `storage/`, `featureFlags`) to verify contract correctness at module boundaries — those files were *not* re-reviewed here.

No correctness or security blockers were found. State transitions in `useAppNavigation`, the discriminated unions in `appViewModel.ts`, and the cross-controller orchestration in `useAppViewModel.ts` hold together under the cases I traced (lead-in → running → complete → idle for breathing; idle → starting → front/back → done → idle for navi-kriya; navigation gates around `controlsDisabled`; locale → strings provider). Exhaustive TypeScript switches catch new `PracticeId`/`OmLength`/`SessionPrimaryAction` variants. No XSS surface, no `eval`/`innerHTML`/dangerous-set-inner-html, no hardcoded secrets, no unhandled async (only `void` of audio-resume click which is documented).

The findings below are all quality / latent-bug concerns: a navigation effect whose name oversells what it watches, a lint-disable that under-covers the multi-setState block, asymmetric primary-action plumbing between breathing and navi, a `kind: 'breathing'` discriminator that silently absorbs stretch sessions, and a few naming/structure smells that will bite the next maintainer.

## Warnings

### WR-01: `closeOnSessionView` only watches breathing — name implies all sessions

**File:** `src/app/useAppViewModel.ts:72-75`, `src/app/useAppNavigation.ts:18,28,32-39`
**Issue:** `useAppViewModel` passes `closeOnSessionView: breathing.inSessionView` to `useAppNavigation`. The hook's effect uses this to force `appScreen` back to `'practice'` whenever a session starts. But the value only reflects the *breathing* controller — navi-kriya sessions are not observed. Today this is safe because navi-start is only reachable from `PracticeScreen.SessionActionRow`, so the user is already on `'practice'` when a navi session starts. However:

- The variable name "closeOnSessionView" and the docstring ("force navigation back to the practice surface when **a session** starts") both promise an invariant the value does not provide.
- If any future surface (e.g., a deep-link, a service-worker resume, an externally-driven test harness) starts a navi session while `appScreen !== 'practice'`, the modal-less Learn/AppSettings/Appearance screen will stay mounted on top of the running navi session and the user will lose access to the End-Session button.
- `controlsDisabled = breathing.inSessionView || navi.sessionActive` is correctly composed for the *gating* checks in `onLearnOpen`/`onSettingsOpen`/`onAppearanceOpen`, but is not reused for the *eviction* effect.

**Fix:** Pass the OR of both controllers into the effect, matching the gate logic.
```ts
// useAppViewModel.ts
const appNavigation = useAppNavigation({
  controlsDisabled,
  closeOnSessionView: breathing.inSessionView || navi.sessionActive,
})
```
Optionally rename `closeOnSessionView` → `anySessionActive` in `UseAppNavigationArgs` so the name matches the contract.

---

### WR-02: `eslint-disable-next-line` covers one of two `setState` calls in the same effect

**File:** `src/app/useAppNavigation.ts:32-39`
**Issue:**
```ts
useEffect(() => {
  if (!closeOnSessionView) return
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setAppScreen('practice')
  setReturningFromAppearance(false)   // ← not covered by the disable
}, [closeOnSessionView])
```
`react-hooks/set-state-in-effect` flags every `setState` invocation inside an effect body. The `eslint-disable-next-line` directive only suppresses the very next line, so `setReturningFromAppearance(false)` is still in scope of the rule. Depending on the plugin's autofix sequencing this either (a) emits a lint error on CI today, or (b) silently lets future contributors add unrelated `setState` calls into the same block without revisiting the rationale. The justification in the comment ("the session-start signal owns this transition") applies to *both* setStates and they should both be acknowledged.

**Fix:** Wrap both calls under the disable so the rule's intent is honored explicitly.
```ts
useEffect(() => {
  if (!closeOnSessionView) return
  // Reason: force navigation back to the practice surface when a session starts;
  // setState inside effect is intentional — the session-start signal owns this transition.
  /* eslint-disable react-hooks/set-state-in-effect */
  setAppScreen('practice')
  setReturningFromAppearance(false)
  /* eslint-enable react-hooks/set-state-in-effect */
}, [closeOnSessionView])
```

---

### WR-03: `AppPracticeSessionViewModel` discriminator `kind: 'breathing'` silently absorbs stretch sessions

**File:** `src/app/appViewModel.ts:77-85,187-226`, `src/app/PracticeSessionView.tsx:26-50`
**Issue:** The session view-model is a 2-arm union: `{ kind: 'breathing' | 'naviKriya' }`. But there are *three* practices (`'resonant' | 'stretch' | 'naviKriya'`). `createPracticeSessionViewModel` branches only on `activePractice === 'naviKriya'`; everything else (including `'stretch'`) falls into the `'breathing'` arm. The downstream `PracticeSessionView` then renders `BreathingSessionSurface` for stretch sessions.

This is functionally fine today because the stretch path piggybacks on the breathing session controller (`useBreathingSessionController` exposes stretch frames with `currentBpm` + `stage`). But:

1. A reader scanning `PracticeSessionView` sees `if (session.kind === 'naviKriya') ... return <BreathingSessionSurface ... />` and reasonably concludes stretch is unsupported by this VM. The discriminator label *lies* about the runtime case it covers.
2. Adding a new practice that does **not** share the breathing controller (or splitting stretch into its own controller in a future phase) becomes a footgun — TypeScript will not flag the missing arm because `'stretch'` already falls through to `'breathing'`.
3. The `bpmUnit` prop is only passed to `BreathingSessionSurface` (line 45) — if stretch ever needed a different unit token the asymmetry is invisible from the discriminator.

**Fix:** Either rename the arm to reflect what it actually models, or extend the union so stretch is its own case (preferred for future-proofing).
```ts
// Option A (rename): kind: 'breathingOrStretch' | 'naviKriya'
// Option B (split):  kind: 'resonant' | 'stretch' | 'naviKriya'
//   and route stretch to BreathingSessionSurface explicitly in PracticeSessionView,
//   so the surface choice is a separate decision from the practice identity.
```
Option B aligns with `PracticeId` and lets exhaustive switches catch new practices.

---

### WR-04: `getVisibleNaviPhase` silently coerces `'idle'` and `'done'` to `'front'`

**File:** `src/app/sessionPresentation.ts:105-107,109-150`
**Issue:**
```ts
function getVisibleNaviPhase(phase: NaviKriyaPresentationInput['phase']): NaviKriyaPhase {
  return phase === 'back' ? 'back' : 'front'
}
```
The input phase is `'idle' | 'front' | 'back' | 'done'`. This function maps anything-not-back to `'front'`. It is called from `getNaviKriyaPresentation` on the `sessionActive && !starting` branch (line 120). Per the navi controller invariant `sessionActive = activePractice === 'naviKriya' && (starting || nkPhase !== 'idle')`, when this branch is reached `phase` should be `'front'`, `'back'`, or transiently `'done'` — but the coercion silently treats `'done'` as `'front'`. That means the readout will display the front-count target and `phase: 'front'` to NKSessionReadout, including the brief render between `setJustCompleted(true)` and `nkEnd()` resolving `nkPhase` to `'idle'`.

This is unlikely to be user-visible (the transient is one render), but the coercion masks state bugs: if a future change leaks `phase === 'done'` for longer than expected, the UI will lie rather than render an obviously-wrong state. The `'idle'` case is also dead in this branch — coercing it to `'front'` is silent rather than asserted.

**Fix:** Narrow the input type at the boundary (assert + throw for impossible cases, or use a tagged input that only carries the two visible phases). Minimum: log/throw on `'done'`/`'idle'` so the bug becomes loud if the invariant breaks.
```ts
function getVisibleNaviPhase(phase: 'front' | 'back' | 'done' | 'idle'): NaviKriyaPhase {
  if (phase === 'front' || phase === 'back') return phase
  // 'idle' and 'done' should never reach here per the sessionActive invariant.
  // Surface the violation rather than silently rendering the front target.
  throw new Error(`getVisibleNaviPhase: unexpected phase ${phase}`)
}
```
If throwing is too disruptive at this layer, at minimum return `'back'` for `'done'` so the visible state matches the last real phase, and log the violation.

## Info

### IN-01: `controls.audio.resumeHintId === ''` for navi while live region id stays valid — inconsistency by design but undocumented

**File:** `src/app/PracticeControlsView.tsx:15-31,38-47`, `src/app/PracticeScreen.tsx:87`, `src/app/appViewModel.ts:333-345`
**Issue:** `PracticeControlsView` takes both `controls` (with `controls.audio`, the per-practice audio toggle VM) and a separate `audio` prop (always `vm.audio`, the breathing audio VM). The mute button is fed `controls.audio`; the aria-live announcement region is fed `audio`. For navi, `controls.audio = naviAudio` with `resumeHintId: ''` and `needsResume: false` — so `MuteToggle` never reads the empty id (the `aria-describedby` branch is `needsResume ? resumeHintId : undefined`). Meanwhile the live region `<div id={audio.resumeHintId}>` always has the canonical id because it pulls from breathing's VM directly.

This works, but the prop topology is non-obvious: a reader expects the per-practice audio VM to be authoritative for everything audio-related. The dual-source plumbing is correct (breathing's audio status drives the global resume hint regardless of which practice is foregrounded) but undocumented at the component boundary.

**Fix:** Add a header comment to `PracticeControlsView` (or its props interface) calling out that `controls.audio` and `audio` come from different VMs by design and explaining why. Alternative: rename the `audio` prop to `globalAudio` or `audioStatus` to disambiguate at call sites.

---

### IN-02: Inline comment references sibling planning artifact (`see IN-01 in 48-REVIEW.md`)

**File:** `src/app/pages/AppSettingsPage.tsx:44-48`
**Issue:** The focus-effect comment ends with "see IN-01 in 48-REVIEW.md". Cross-referencing a phase-scoped review document from production code creates a stale-reference hazard: if the phase artifact is moved/renamed/superseded (which happens every phase), the comment becomes a dangling pointer. Phase reviews are not part of the long-term documentation surface.

**Fix:** Inline the relevant explanation directly into the comment (the IN-01 finding presumably described the one-shot ref-guard pattern needed if the router changes its mount behavior). Drop the phase-document reference.

---

### IN-03: `setupCardSummary.ts` returns `null` for three semantically different cases in one path

**File:** `src/app/setupCardSummary.ts:17-75`
**Issue:** `buildSetupCardSummary` returns `null` for: (a) `kind === 'hidden'`, (b) resonant `isRunning || isComplete`, (c) stretch `isRunning || isComplete`, (d) navi `isComplete`. The downstream `PracticeSettingsView` treats `null` as "hide the card" uniformly, but the three conditions are *semantically* distinct (hidden by navi-session, hidden by complete-state, hidden by running-state). When investigating a future regression the caller has no way to tell *why* the card is gone.

**Fix:** Either keep the null but add a typed discriminator (`{ kind: 'hidden', reason: 'navi-active' | 'running' | 'complete' }`) for diagnosability, or split into two helpers. Lower priority — this is a code-clarity nit.

---

### IN-04: Completion-headline JSX duplicated between `NaviKriyaSessionSurface` and `SessionReadout`

**File:** `src/app/NaviKriyaSessionSurface.tsx:65-92`, `src/components/SessionReadout.tsx:62-95`
**Issue:** The two completion blocks (the centered "Session complete" + uppercased "Take a moment" subtitle) are almost byte-identical: same fontSize/fontWeight/letterSpacing/marginTop, same color tokens, same role=status/aria-live/aria-atomic wrappers. The aria-label source differs (`nkReadoutStrings.readoutAriaLabel` vs `readoutStrings.readoutAriaLabel`) and the announcement aria-label is omitted in the navi copy. Any future change to the completion style (font, spacing, color) must be made twice and will silently drift between the two surfaces.

**Fix:** Extract a `SessionCompletionHeadline` presentational component in `components/` taking `{ ariaLabel, headline, subhead, announcementAriaLabel? }` and reuse from both surfaces.

---

### IN-05: Asymmetric primary-action handler dispatch between breathing and navi

**File:** `src/app/useAppViewModel.ts:105-135`
**Issue:** `onBreathingPrimaryClick` handles `'end'` and `'done'` explicitly and falls through to `breathingStartOrCancel()` for both `'start'` and `'cancel'`. `onNaviPrimaryClick` handles all four actions (`'cancel'`, `'end'`, `'done'`, `'start'`) with explicit branches. The breathing path's fallthrough makes it harder to read the action→callback mapping at a glance and means `'cancel'` and `'start'` share a runtime path that the type system cannot enforce. If `breathingStartOrCancel`'s internal branching ever drifts from `getBreathingPrimaryAction`'s state machine, the breathing UI will mis-route silently.

**Fix:** Mirror the navi dispatch pattern — make the breathing handler exhaustive on `SessionPrimaryAction` with an explicit `'cancel'` arm that calls a `breathingCancel` controller method (or simply call `breathingStartOrCancel` from two explicit branches so the action discriminator is visible at the call site).

---

### IN-06: `AppDialogsViewModel` carries navigation state, not just dialog state

**File:** `src/app/appViewModel.ts:46-55`, `src/app/ScreenRouter.tsx:13-18`
**Issue:** `AppDialogsViewModel` now contains `appScreen`, `onLearnOpen`, `onSettingsOpen`, `onAppearanceOpen`, `onBackToPractice`, `onBackToAppSettings`, `returningFromAppearance` — almost all of which are navigation, not dialogs. The only true dialog content is `endSessionDialogs`. The ScreenRouter comment already calls this out ("named `dialogs` for backwards compatibility … but it carries navigation state too"), which is an explicit admission of the naming smell.

**Fix:** Split into `AppNavigationViewModel` (appScreen + the six callbacks + returningFromAppearance) and `AppDialogsViewModel` (endSessionDialogs only). The `vm.dialogs` surface stays as a typed re-export for back-compat if there are external consumers.

---

### IN-07: `createNaviAudioToggleViewModel` returns `resumeHintId: ''` — a sentinel disguised as a real value

**File:** `src/app/appViewModel.ts:333-345`
**Issue:**
```ts
return {
  muted, audioAvailable,
  needsResume: false,
  resumeHintId: '',   // sentinel
  onMuteToggle,
}
```
The empty string is meaningful only because `MuteToggle.aria-describedby` is gated by `needsResume` (always `false` for navi). If a future change to `MuteToggle` ever reads `resumeHintId` outside the `needsResume` guard (or some other consumer reads the VM directly), `id=""` will land in the DOM as an invalid id attribute. Sentinels-by-stringly-typed-emptiness are an avoidable hazard.

**Fix:** Make `resumeHintId` optional on the toggle VM (`resumeHintId?: string`) so the absence is type-checked, or use `null` and force consumers to guard. Update `MuteToggle` to require both `needsResume === true` AND `resumeHintId != null` before emitting `aria-describedby`.

---

### IN-08: `onBackToAppSettings` unconditionally sets `returningFromAppearance: true`

**File:** `src/app/useAppNavigation.ts:64-67`
**Issue:** `onBackToAppSettings` is only wired to the AppearancePage back-chevron today, so the unconditional `setReturningFromAppearance(true)` is semantically correct. But the callback's contract is "navigate to appSettings" — the side-effect of flipping a focus-hint flag is invisible to the caller and bundled into the navigate verb. If a future entry point invokes this callback from a non-appearance surface (e.g., a programmatic deep-link, a test), the AppSettingsPage will incorrectly focus the right chevron instead of the back button.

**Fix:** Either rename to `onBackFromAppearance` to lock in the call-site constraint, or split into `setReturningFromAppearance(true)` + `navigateToAppSettings()` so the side-effect is owned by the appearance back-button explicitly.

---

### IN-09: `AppSettingsPage` rebuilds the `strings` wrapper object every render

**File:** `src/app/pages/AppSettingsPage.tsx:35-40`
**Issue:**
```ts
const allStrings = useUiStrings()
const strings = {
  appSettings: allStrings.appSettings,
  install: allStrings.install,
  appearance: allStrings.appearance,
}
```
The `strings` literal is rebuilt on every render even though `allStrings` itself is a stable reference (it comes from the context value, which is the same `vm.uiStrings` until locale changes). This is a no-op for correctness but defeats any `React.memo` on `SettingsPanelBody` if/when added, and obscures the intent. The same pattern appears nowhere else in the chunk — `AppearancePage` and `LearnPage` use scoped destructures (`const strings = useUiStrings().appearance`) instead.

**Fix:** Either wrap in `useMemo(..., [allStrings])` so the reference is stable, or restructure `SettingsPanelBody` to read each subsection from a single full-strings prop.

---

## Cross-Chunk References (informational)

The following imports from sibling chunks were consulted to verify contract correctness but were not re-reviewed:

- `components/{OrbShape, NKShape, NKSessionReadout, SessionReadout, SetupCard, SettingsSheet, EndSessionDialog, MuteToggle, SessionActionRow}` — prop shapes match call sites.
- `hooks/{useBreathingSessionController, useNaviKriyaSessionController, useAppNavigation, useFeatureFlags, useLocale, useOrbIdleChoice, useSwitcherIconChoice, useUiStringsContext}` — return types align with VM consumers.
- `domain/{settings, naviKriyaSession, naviKriyaSettings}` — `PracticeId`, `OmLength`, `StretchSettings`, `SessionSettings` shape checks pass; `getNaviKriyaPhaseTarget` accepts the narrowed `NaviKriyaPhase = 'front' | 'back'` correctly.
- `content/strings` — all keys read by the chunk exist in both `en` and `pt` payloads.
- `storage/practices` — `PracticeId` exhaustiveness verified.

---

_Reviewed: 2026-05-26T13:34:45Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Scope: src/app/ chunk only — sibling chunks (audio, components, domain, hooks, storage) reviewed in parallel by other agents._
