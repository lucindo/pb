---
phase: 11-domain-ui-contracts-accessibility
created: 2026-05-11
milestone: v1.0.1
requirements:
  - DOMAIN-01
  - UI-01
  - UI-02
  - A11Y-01
---

# Phase 11 Context: Domain, UI Contracts & Accessibility

<domain>
Tighten four boundary contracts so invalid inputs throw at the boundary, UI state cannot drift between session views, and `MuteToggle` carries semantically correct attributes when the audio engine needs resume. Fix-only patch — no user-facing behavior changes, no scope creep. Lives in `src/domain/sessionController.ts` (DOMAIN-01), `src/components/SessionReadout.tsx` + the App `<SessionReadout>` wiring (UI-01), an App-level subscribe-and-reflect effect alongside the existing `endDialogOpen` one (UI-02), and `src/components/MuteToggle.tsx` + the App sr-only resume-hint region (A11Y-01). All four reqs ship in a single plan, single wave; App.tsx is touched by UI-01 + UI-02 + A11Y-01 at non-overlapping line ranges so tasks serialize cleanly inside one plan.
</domain>

<decisions>

### DOMAIN-01 — extendTimedSession boundary validation

- **D-01:** Add a runtime allowlist throw — `if (!(DURATION_OPTIONS as readonly DurationOption[]).includes(durationMinutes)) throw new RangeError(...)` — at the top of the numeric branch in `extendTimedSession` (`src/domain/sessionController.ts:59-69`). KEEP the parameter type as `durationMinutes: number`. Chosen over (a) narrowing the param to `DurationOption`, and (b) the belt-and-suspenders combined type-narrow + runtime-check. Rationale: smallest diff at the caller boundary, no `SettingsForm.onExtendDuration` prop-type churn, no risk of regressing a callsite that legitimately holds a `number` from a stepper. WR-01's failure mode — that invalid values discover failure deep inside `createBreathingPlan` — is fully closed by a boundary throw regardless of whether the parameter type narrows. Throws same `RangeError` class so callers' existing catch sites are unchanged.

- **D-02:** Check ordering inside `extendTimedSession`: (1) reject `state.lockedSettings.durationMinutes === 'open-ended'` (existing throw, unchanged), (2) NEW allowlist check — `!(DURATION_OPTIONS as readonly DurationOption[]).includes(durationMinutes)` → `throw new RangeError('durationMinutes must be one of DURATION_OPTIONS')` (or equivalent — final wording is planner's), (3) existing `Number.isFinite` / `<=` comparison check. Allowlist failure fires BEFORE the numeric comparison, so `extendTimedSession(running, 13)` throws the allowlist message rather than the misleading "must be greater" message. Same `RangeError` class — no new exception subclass introduced.

- **D-03:** Test geography: EXTEND `src/domain/sessionController.test.ts` (existing — describes `extendTimedSession` at lines 79-93). Add one new case for a non-allowlist finite numeric value (e.g. `7` or `13`). Existing cases at lines 88-93 (15→15, 15→10, `Infinity`, `'open-ended'`) preserved verbatim — they still pass since the allowlist check fires AFTER the open-ended check and is independent of the `<=` comparison. Co-locate per Phase 9 D-14 / Phase 10 D-20 (no new test file).

### UI-01 — SessionReadout lead-in placeholder contract

- **D-04:** Add a NEW prop `isLeadInPlaceholder?: boolean` to `SessionReadoutProps` (`src/components/SessionReadout.tsx:5-9`). Chosen over (a) a component-local `ReadoutStatus = SessionStatus | 'lead-in'` widened union, and (b) extending the domain `SessionStatus` union. Rationale: lead-in is owned by App's `appPhase` state, not by the engine's `SessionState` discriminated union — polluting `SessionStatus` would force every exhaustive switch on it to handle a state that the domain never produces. A boolean prop documents the placeholder contract at the component boundary without leaking the UI-only concept into the domain layer. JSDoc on the prop locks the contract.

- **D-05:** Internal behavior when `isLeadInPlaceholder === true`: branch FIRST inside the component, BEFORE the existing `status === 'idle' && frame === null && message === undefined` early-return and the `showTimeChip = status !== 'complete' && frame !== null` gate. Render the timer chip directly from `frame` (Remaining/Elapsed label + formatted duration). Ignore the `status` and `message` props. The caller commits to providing a non-null `frame` when `isLeadInPlaceholder` is true (typed-only contract — no runtime assertion throw, per discussion option 3 reject). The component commits to rendering the chip regardless of status. App-side: drop the existing `status={appPhase === 'lead-in' ? 'idle' : state.status}` hack at `src/app/App.tsx:583` — App now passes `status={state.status}` straight through and `isLeadInPlaceholder={appPhase === 'lead-in'}`.

- **D-06:** Test geography: NEW file `src/components/SessionReadout.test.tsx` — `SessionReadout` currently has no test file (structural gap-fill, same posture as Phase 10 D-20 exception for `useSessionEngine.test.ts`). Lock ~3-4 cases: (1) `isLeadInPlaceholder=true` + non-null frame → timer chip rendered (label + formatted duration); (2) `isLeadInPlaceholder=true` + status `'complete'` + non-null frame → timer chip still rendered (the headline does NOT win); (3) `isLeadInPlaceholder=false` + status `'complete'` + non-null frame → headline rendered, chip hidden (regression lock for the existing `showTimeChip` gate); (4) `isLeadInPlaceholder` absent + status `'idle'` + null frame + no message → component returns null (existing early-return preserved).

### UI-02 — Dialog auto-close on in-session transition

- **D-07:** Single App-level `useEffect` watching `[inSessionView]`. When `inSessionView` flips to true, force-close BOTH `learnDialogOpen` and `resetDialogOpen` via their respective setters. ONE effect, two setState calls inside. Chosen over (a) two separate effects (one per dialog) — React's reconciler suppresses no-op setState updates, so no perf win, just more code, and (b) open-guard-only via adding an `inSessionView` early-return to `onResetClick` — that doesn't satisfy WR-09's "cannot remain open" requirement under any future race where the dialog is open AND `appPhase` transitions to `'lead-in'` programmatically. Mirror the EndSessionDialog pattern at `App.tsx:247-253` verbatim (subscribe-and-reflect; identical `// Reason:` annotation + `// eslint-disable-next-line react-hooks/set-state-in-effect`).

- **D-08:** Existing `onLearnClick` open-guard at `App.tsx:396-399` (`if (inSessionView) return`) is PRESERVED as defense in depth. The reactive close effect (D-07) is the second line of defense for any race where the dialog is already open when `inSessionView` flips. `onResetClick` does NOT gain a symmetric open-guard — the Reset button is only reachable from `StatsFooter` which is hidden when `inSessionView` is true (App.tsx:621), so reaching `onResetClick` mid-session would itself be a bug. The reactive close still catches it.

- **D-09:** Test geography: EXTEND `src/app/App.dialog.test.tsx` (existing). Mirror the `WR-01 auto-close` pattern at line 259 (`auto-closes the modal when the session completes underneath it`). Add ~2 cases inside `describe('end-session confirmation modal (App integration)')` or a new sibling `describe('WR-09 in-session dialog auto-close')` block: (1) LearnDialog open → user clicks Start → `learnDialogOpen` flips to false; (2) ResetStatsDialog open → user clicks Start → `resetDialogOpen` flips to false. Co-locate per Phase 9 D-14.

### A11Y-01 — MuteToggle resume-mode describedby

- **D-10:** App-level sr-only `role="status" aria-live="polite"` region at `App.tsx:605-611` gains an `id="mute-toggle-resume-hint"` attribute. MuteToggle gains a NEW required prop `resumeHintId: string` (the id name is owned by App, where the live region lives — not hard-coded in two files, per discussion option 2 reject). App passes `resumeHintId="mute-toggle-resume-hint"` through `SessionControls` to `MuteToggle`. Inside MuteToggle (`src/components/MuteToggle.tsx`): `aria-describedby={needsResume ? resumeHintId : undefined}` — conditional, attached only when `needsResume` is true. Rejects option 3 (always-set describedby) because some screen readers announce "description:" with empty content when the live region text is empty (the empty-string fallback at `App.tsx:610`).

- **D-11:** SessionControls prop plumbing: `SessionControls` already forwards `needsResume`, `muted`, `audioAvailable`, `onMuteToggle` to `MuteToggle`. ADD `resumeHintId` to `SessionControlsProps` and forward it the same way. No other consumers of `SessionControls` exist (App is the only callsite). The MuteToggle `aria-pressed={needsResume ? undefined : muted}` line at `MuteToggle.tsx:37` is PRESERVED — already correct per Plan 06 D-32, NOT a Phase 11 delta.

- **D-12:** Test geography: EXTEND `src/components/MuteToggle.test.tsx` (existing). Add ~2 cases: (1) `needsResume=true` + `resumeHintId="x"` → button has `aria-describedby="x"`; (2) `needsResume=false` + `resumeHintId="x"` → button has NO `aria-describedby` attribute (use `not.toHaveAttribute('aria-describedby')`). Existing aria-pressed regression locks at MuteToggle.test.tsx already cover the `aria-pressed` half of A11Y-01 (no change needed there).

### Plan packaging

- **D-13:** Single plan, single wave, four task groups. Files barely overlap: DOMAIN-01 → `sessionController.ts` + `.test.ts`; UI-01 → `SessionReadout.tsx` + NEW `SessionReadout.test.tsx` + App line ~576-585; UI-02 → App new effect adjacent to existing 247-253 + `App.dialog.test.tsx`; A11Y-01 → `MuteToggle.tsx` + `MuteToggle.test.tsx` + App line 605-611 + `SessionControls.tsx` plumbing. App.tsx is the only multi-touch file but the three edits land at non-overlapping line ranges, so they serialize cleanly inside one plan. Chosen over (a) two plans (domain/contract + a11y wiring) and (b) four plans (one per REQ): splitting wouldn't reduce risk — same review surface, same test green-gate cadence, no inter-task isolation gain. Mirrors Phase 10 D-16 single-plan rationale.

- **D-14:** Task ordering inside the plan (planner final, recommended starting point): (1) DOMAIN-01 — sessionController.ts allowlist throw + test extension (zero coupling to UI tasks; safest first); (2) UI-01 — SessionReadout prop + NEW test file + App wiring at line 576-585 (independent of UI-02 effect); (3) UI-02 — App new useEffect + dialog test extension (touches App in a different region than task 2); (4) A11Y-01 — MuteToggle prop + SessionControls plumbing + App id attribute + MuteToggle test extension. Each task commits independently; `tsc --noEmit` + `npm run lint` + `npm run build` + Vitest stay green between tasks (per D-19 carry-forward).

### Carry-forward invariants

- **D-15:** Phase 7 D-04 — any new `// eslint-disable-next-line react-hooks/*` MUST carry a `// Reason:` annotation. UI-02's new subscribe-and-reflect effect (D-07) needs `// eslint-disable-next-line react-hooks/set-state-in-effect` with `// Reason: subscribe-and-reflect — dialog visibility mirrors external session view; setting local state from this trigger effect is the documented React pattern, identical posture to the EndSessionDialog auto-close at App.tsx:247-253 (WR-01).`

- **D-16:** Phase 9 D-14 / Phase 10 D-20 — co-locate new contract tests in existing `*.test.{ts,tsx}` neighbors. EXCEPTION: `src/components/SessionReadout.test.tsx` is NEW (per D-06) because the component currently has no test file — structural gap-fill, same posture as Phase 10's exception for `useSessionEngine.test.ts`. UI-02 / A11Y-01 / DOMAIN-01 all co-locate in existing files.

- **D-17:** Phase 10 D-21 — every commit boundary inside Phase 11: `tsc --noEmit` exits 0, `npm run lint` exits 0, `npm run build` exits 0, full Vitest suite passes (391/391 baseline post-Phase-10 + ~6-8 new cases → target ~397-399). A commit that breaks any is rolled back, not patched-forward.

- **D-18:** Milestone invariant from PROJECT.md — no user-facing behavior change. DOMAIN-01: a value that previously threw `RangeError` from `createBreathingPlan` now throws `RangeError` from `extendTimedSession` one frame up the stack — same error class, callers' catch sites unchanged. UI-01: the lead-in placeholder timer chip continues to render identically (App is now passing `state.status` verbatim instead of overriding to `'idle'`, but the new `isLeadInPlaceholder` short-circuit produces the same visual output). UI-02: the dialog force-close fires only on a race that today's open-guard already prevents from the happy path — manual UAT confirms no visual change in normal flow. A11Y-01: `aria-describedby` is a screen-reader-only delta; sighted users see no change.

</decisions>

<canonical_refs>

**REQUIREMENTS / specs:**
- `.planning/REQUIREMENTS.md` §"Domain" (line 72) — DOMAIN-01 source-of-truth, traces to REVIEW.md §WR-01.
- `.planning/REQUIREMENTS.md` §"UI Contracts" (lines 77-80) — UI-01 (traces §WR-08) + UI-02 (traces §WR-09).
- `.planning/REQUIREMENTS.md` §"Accessibility" (line 84) — A11Y-01 (traces §IN-06).
- `REVIEW.md` (repo root, v1.0 full-codebase review) — §WR-01 (`extendTimedSession` boundary), §WR-08 (`SessionReadout` lead-in contract), §WR-09 (in-session dialog visibility), §IN-06 (`MuteToggle` resume attributes).

**Carry-forward CONTEXT files:**
- `.planning/phases/07-strict-type-lint-baseline/07-CONTEXT.md` — D-04 (`// Reason:` annotation policy for any new `react-hooks/*` disable; cited in D-15 for the UI-02 effect); D-09 (per-commit `tsc` / lint / build / Vitest gate, cited in D-17).
- `.planning/phases/09-audio-wake-lock-lifecycle-hardening/09-CONTEXT.md` — D-14 (co-locate test contracts in existing `*.test.{ts,tsx}` neighbors; cited in D-03, D-09, D-12, D-16).
- `.planning/phases/10-hooks-identity-effect-hygiene/10-CONTEXT.md` — D-16 (single-plan packaging rationale for inter-locked small fixes; cited in D-13); D-20 (test-geography new-file exception for structural gap-fills; cited in D-16); D-21 (per-commit green-gate invariant; cited in D-17).

**Project-level:**
- `.planning/PROJECT.md` §"Current Milestone: v1.0.1 Code Review Patch" — "tests pass at v1.0 close — patch must not regress" invariant + "no user-facing features" constraint (cited in D-18).
- `.planning/ROADMAP.md` §"Phase 11: Domain, UI Contracts & Accessibility" — Goal + Success Criteria 1..5.
- `.planning/STATE.md` — Phase 10 closeout + Phase 11 entry; 391/391 Vitest baseline.

**Source under edit:**
- `src/domain/sessionController.ts:59-88` — `extendTimedSession`. D-01 allowlist throw lands AFTER line 65 (open-ended throw) and BEFORE line 67 (`Number.isFinite` / `<=` check) per D-02.
- `src/domain/settings.ts:2` (`DurationOption` type) + `:28-42` (`DURATION_OPTIONS` allowlist) — imported by `sessionController.ts` for the new check. The `as readonly DurationOption[]` assertion at `settings.ts:59` is the existing pattern; D-01 reuses it verbatim.
- `src/components/SessionReadout.tsx:5-50` — full file. D-04 adds `isLeadInPlaceholder?: boolean` to `SessionReadoutProps`; D-05 adds the early-branch render before line 12.
- `src/components/MuteToggle.tsx:10-47` — D-11 adds `resumeHintId: string` to `MuteToggleProps`; D-10 adds `aria-describedby={needsResume ? resumeHintId : undefined}` adjacent to the existing `aria-pressed` at line 37.
- `src/components/SessionControls.tsx` — D-11 plumbing: add `resumeHintId: string` to props, forward to `<MuteToggle>`.
- `src/app/App.tsx:247-253` — existing EndSessionDialog subscribe-and-reflect effect (template for D-07's new effect).
- `src/app/App.tsx:396-399` — existing `onLearnClick` open-guard (preserved as defense in depth per D-08).
- `src/app/App.tsx:576-585` — `<SessionReadout>` callsite. D-05 drops the `status={appPhase === 'lead-in' ? 'idle' : state.status}` hack and adds `isLeadInPlaceholder={appPhase === 'lead-in'}`.
- `src/app/App.tsx:592-600` — `<SessionControls>` callsite. D-11 adds `resumeHintId="mute-toggle-resume-hint"` to the prop list.
- `src/app/App.tsx:605-611` — sr-only `role="status" aria-live="polite"` region. D-10 adds `id="mute-toggle-resume-hint"`.

**Test files under edit:**
- `src/domain/sessionController.test.ts:79-93` — existing `extendTimedSession` `describe` block. D-03 adds one non-allowlist finite-numeric case alongside the existing 4.
- `src/components/SessionReadout.test.tsx` — NEW per D-06 (~3-4 cases).
- `src/app/App.dialog.test.tsx:154-280` — existing `'end-session confirmation modal (App integration)'` block + line 259 `auto-closes...WR-01` template. D-09 extends with ~2 WR-09 cases.
- `src/components/MuteToggle.test.tsx` — existing. D-12 adds ~2 conditional-describedby cases.

**Reference patterns already in the codebase:**
- `src/app/App.tsx:247-253` — EndSessionDialog subscribe-and-reflect effect with annotated `eslint-disable-next-line react-hooks/set-state-in-effect`. D-07's new UI-02 effect mirrors this verbatim.
- `src/app/App.dialog.test.tsx:259` — existing `auto-closes the modal when the session completes underneath it (WR-01)` test case. D-09's new WR-09 cases mirror its setup + assertion shape.
- `src/components/MuteToggle.tsx:37` — existing `aria-pressed={needsResume ? undefined : muted}` ternary. D-10's `aria-describedby={needsResume ? resumeHintId : undefined}` follows the identical conditional-attribute pattern.
- `src/domain/settings.ts:59` — existing `(DURATION_OPTIONS as readonly DurationOption[]).includes(...)` allowlist check in `validateSettings`. D-01 reuses this exact assertion shape — single source of truth for the allowlist check across both validators.

</canonical_refs>

<code_context>

**Reusable assets:**
- `DURATION_OPTIONS` allowlist at `src/domain/settings.ts:28-42` + `DurationOption` type at line 2 — already exported. D-01 imports `DURATION_OPTIONS` + `DurationOption` into `sessionController.ts` (the existing imports there already pull `SessionSettings` from `./settings`; just add the two new symbols).
- `validateSettings`-style allowlist assertion pattern at `settings.ts:59` (`(DURATION_OPTIONS as readonly DurationOption[]).includes(settings.durationMinutes)`) — D-01 reuses verbatim, no new abstraction needed.
- `SessionStatus` union (`src/domain/sessionController.ts:7`) — `'idle' | 'running' | 'complete'`. UNCHANGED — D-04 (boolean prop) is the precise reason this stays untouched.
- `setEndDialogOpen` subscribe-and-reflect useEffect at `App.tsx:247-253` — D-07's new UI-02 effect mirrors this body, deps, eslint-disable annotation, and Reason-comment style verbatim.
- `aria-live="polite"` resume-hint region at `App.tsx:605-611` — already wired; D-10 only adds the `id` attribute.
- `SessionControls` already forwards `needsResume`, `muted`, `audioAvailable`, `onMuteToggle` → MuteToggle. D-11 piggybacks `resumeHintId` on the same forwarding pattern.

**Integration points:**
- `src/app/App.tsx:6-12` import block already imports `SessionReadout`, `ResetStatsDialog`, `LearnDialog`, `MuteToggle` (transitively via `SessionControls`). DOMAIN-01 adds no new imports in App.tsx (the throw fires inside sessionController).
- `src/domain/sessionController.ts:5` already imports from `./settings`; D-01 widens the import to include `DURATION_OPTIONS` (and `DurationOption` if a local type annotation is added, planner's call).
- `src/app/App.tsx:142` (`const inSessionView = appPhase !== 'idle'`) — already declared; D-07's new effect reuses this binding as its dep.
- `App.tsx:594` (`<SessionControls>` JSX) — D-11 adds one new prop `resumeHintId="mute-toggle-resume-hint"`.

**Test geography:**
- EXTEND: `src/domain/sessionController.test.ts` — ~1 new case for DOMAIN-01 (D-03).
- NEW: `src/components/SessionReadout.test.tsx` — ~3-4 cases for UI-01 (D-06). Structural gap-fill.
- EXTEND: `src/app/App.dialog.test.tsx` — ~2 cases for UI-02 (D-09).
- EXTEND: `src/components/MuteToggle.test.tsx` — ~2 cases for A11Y-01 (D-12).
- Estimated test delta: ~8-9 cases → 391 → ~399-400.

</code_context>

<deferred>

- **Belt-and-suspenders DOMAIN-01** (combined narrowed `DurationOption` param type + runtime allowlist throw) — considered then rejected. Type narrowing would force a churn at every `extendTimedSession` callsite that today legitimately holds a `number` (e.g. SettingsForm's onExtendDuration handler). Runtime throw alone closes WR-01's failure mode without that churn. Revisit in v1.x if a TypeScript-only guarantee becomes valuable (e.g. when v1.1 Appearance/Settings umbrella tightens the SessionSettings type surface).

- **Component-local `ReadoutStatus = SessionStatus | 'lead-in'` union (UI-01)** — considered then rejected in favor of the `isLeadInPlaceholder` boolean (D-04). Pollutes the component-boundary type with a four-state union when only one branch behaves differently. Reconsider if a second non-`idle/running/complete` state ever needs the same placeholder treatment.

- **Domain `SessionStatus` union extension to `'lead-in'` (UI-01)** — considered then rejected. lead-in is owned by App's `appPhase`, not by the engine's `SessionState`; widening the domain union would force every exhaustive switch on `SessionStatus` (including those inside `useSessionEngine`) to handle a state the engine never produces. Out of character for this codebase.

- **Open-guard-only fix for UI-02** (add `inSessionView` early-return to `onResetClick`, skip the reactive close effect) — considered then rejected. Doesn't satisfy WR-09's "cannot remain open" language under any race where the dialog opens AND `inSessionView` flips concurrently. The reactive close is the second line of defense; open-guards remain (D-08) as the first.

- **Always-set `aria-describedby` on MuteToggle (A11Y-01)** — considered then rejected. The aria-live region text is the empty string when not in needs-resume; some screen readers announce "description:" with empty content on focus. Conditional describedby (D-10) avoids the dangling pointer.

- **Hard-coded `mute-toggle-resume-hint` id string in both App.tsx and MuteToggle.tsx (A11Y-01)** — considered then rejected in favor of plumbing the id through `resumeHintId` (D-10, D-11). Hard-coding is two-file string coupling under future renames.

- **Multiple plans for Phase 11** (two: domain/contract + a11y; or four: one per REQ) — considered then rejected. Files barely overlap; App.tsx multi-touch lands at non-overlapping line ranges; single plan keeps review surface minimal. Same rationale as Phase 10 D-16.

- **Dedicated `InvalidDurationError extends RangeError` subclass (DOMAIN-01)** — considered then rejected. Would let callers distinguish allowlist-failure from comparison-failure via `instanceof`. Costs an extra exported symbol + a tightened test expectation for what is fundamentally one new throw at one site. Re-evaluate in v1.x if multiple downstream consumers need granular catch sites.

- **Reduced-motion BreathingShape boundary cue todo** (`.planning/todos/2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md`) — reviewed during cross-reference. Tangential — Phase 11 doesn't touch BreathingShape's reduced-motion render path. Stays in v1.x backlog.

- **Favicon 404 todo** (`.planning/todos/2026-05-11-missing-favicon-404-in-console.md`) — reviewed during cross-reference. Owned by ASSETS-01 in Phase 12, not Phase 11.

</deferred>
