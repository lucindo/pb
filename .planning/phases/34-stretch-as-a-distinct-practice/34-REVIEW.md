---
phase: 34-stretch-as-a-distinct-practice
reviewed: 2026-05-18T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - src/app/App.tsx
  - src/app/App.persistence.test.tsx
  - src/app/App.session.test.tsx
  - src/app/App.settings.test.tsx
  - src/components/BooleanToggle.tsx
  - src/components/LearnDialog.tsx
  - src/components/PracticeToggle.tsx
  - src/components/PracticeToggle.test.tsx
  - src/components/SettingsForm.tsx
  - src/components/SettingsForm.stretch.test.tsx
  - src/content/strings.ts
  - src/content/strings.test.ts
  - src/domain/sessionController.ts
  - src/domain/sessionController.test.ts
  - src/domain/settings.ts
  - src/domain/settings.test.ts
  - src/domain/stretchRamp.ts
  - src/domain/stretchRamp.test.ts
  - src/hooks/useSessionEngine.ts
  - src/hooks/useSessionEngine.test.tsx
  - src/storage/practices.ts
  - src/storage/practices.test.ts
  - src/storage/settings.ts
  - src/storage/settings.test.ts
  - src/storage/storage.ts
  - src/storage/storage.test.ts
  - vite.config.ts
findings:
  critical: 1
  warning: 6
  info: 5
  total: 12
status: issues_found
---

# Phase 34: Code Review Report

**Reviewed:** 2026-05-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

Phase 34 promotes Stretch to a first-class practice: a third `PracticeToggle` pill, a `StretchSettings` slice in the per-practice storage envelope, a `coerceStretchSettings` coercer, `saveStretchSettings`/`recordStretchSession`, a v2→v3 migration ladder, and a dedicated `SettingsForm` branch. The core domain code (`stretchRamp.ts`, `sessionController.ts`) and storage layer (`practices.ts`, `storage.ts`) are well-guarded — non-throwing coercers, prototype-pollution protection, defensive `rampDurationMinutes` rejection. Test coverage is broad.

The most serious defect is a correctness gap between the displayed stretch session duration and the actual session length: `computeStretchTotalMs` sums the raw minute settings, but `buildStretchSegments` snaps each segment to a whole number of cycles, so the read-only "Duration" box and the real completion time can disagree by up to one cycle per segment. There are also several practice-isolation and copy bugs introduced by the stretch branch being layered on a resonant/naviKriya-shaped surface.

## Critical Issues

### CR-01: Stretch "Duration" display disagrees with the real session end

**File:** `src/domain/stretchRamp.ts:228-232` (and consumed at `src/components/SettingsForm.tsx:84-87`)
**Issue:** `computeStretchTotalMs` returns `(warmUpMinutes + rampDurationMinutes + coolDownMinutes) * 60_000` — a sum of the raw minute settings. The actual session, however, is governed by `buildStretchSegments`, which snaps **every** segment to a whole number of cycles via `Math.max(1, Math.round(requestedMs / cycleMs))` (lines 98-99). For any segment whose requested duration is not an exact multiple of `cycleMs`, the snapped duration differs from the requested duration. The ramp is split into `numSteps` segments, each snapped independently, so the rounding error compounds across many segments.

`getStretchFrame` derives `isComplete`/`remainingMs` from the **snapped** segment table (`sessionEndMs = segments[last].endMs`, lines 198-200), while the SettingsForm "Duration" box and any other consumer of `computeStretchTotalMs` show the **unsnapped** sum. A user who configures, e.g., warm-up 5 + ramp 5 + cool-down 5 at non-integer-cycle BPMs sees "15 min" but the session completes at a different elapsed time. This is a user-visible correctness defect: the headline duration is wrong.

The `stretchRamp.test.ts` cases that assert `computeStretchTotalMs` equals `30 * 60_000` only pass because their fixtures happen to use BPMs (4, 6) whose cycle lengths divide the minute durations evenly — the test suite does not exercise the drift case for `computeStretchTotalMs` even though it explicitly tests segment-table drift for `getStretchFrame` (the "does not complete early" CR-01 regression test).

**Fix:** Derive the displayed total from the same source of truth as completion — the snapped segment table:
```typescript
export function computeStretchTotalMs(settings: StretchSettings): number | null {
  if (settings.coolDownMinutes === 'open-ended') return null
  const segments = buildStretchSegments(settings)
  return segments[segments.length - 1]!.endMs
}
```
This guarantees the "Duration" box matches the elapsed time at which `getStretchFrame` reports `isComplete`. Add a `stretchRamp.test.ts` case with a drift-prone BPM (e.g. `initialBpm: 5.5`) asserting `computeStretchTotalMs` equals the last segment `endMs`.

## Warnings

### WR-01: LearnDialog shows the Navi Kriya videos heading for the Stretch practice

**File:** `src/components/LearnDialog.tsx:90-93`
**Issue:** For `activePractice === 'stretch'`, `practiceContentKey` falls back to `'resonant'` so resonant **content** is shown (lines 90-91). But `videosHeading` (line 93) is `activePractice === 'resonant' ? strings.videosHeading : strings.naviKriyaVideosHeading` — since stretch is not `'resonant'`, it takes the `else` branch and renders **"Selected Navi Kriya Videos"** as the heading above the resonant video links. The dialog shows resonant HRV videos under a Navi Kriya heading whenever the Stretch practice is active.
**Fix:** Make the heading match the content fallback:
```typescript
const videosHeading = practiceContentKey === 'resonant' ? strings.videosHeading : strings.naviKriyaVideosHeading
```
(Use `practiceContentKey`, the already-resolved content key, instead of the raw `activePractice`.)

### WR-02: `extendDuration` is wired to the Stretch practice but always throws and is silently swallowed

**File:** `src/app/App.tsx:1185` and `src/domain/sessionController.ts:104-106`
**Issue:** `SessionControls` / `SettingsForm` render for both `'resonant'` and `'stretch'`, and `SettingsForm` receives `onExtendDuration={session.extendDuration}` unconditionally. For a stretch session, `extendTimedSession` (sessionController.ts:104) throws `RangeError('Stretch sessions cannot be extended via durationMinutes')`, which `useSessionEngine.extendDuration` catches and turns into a no-op (useSessionEngine.ts:250-254). This is defensive and does not crash — but the stretch branch of `SettingsForm` only renders a **read-only** Duration stepper (`readOnly`, `onChange={() => undefined}`), so `onExtendDuration` is never actually invoked from the stretch UI. The wiring is dead/misleading: it implies stretch sessions are extendable when the practice deliberately is not. A future edit to the read-only Duration stepper could accidentally start invoking the swallowed-throw path.
**Fix:** Either document explicitly that `onExtendDuration` is inert for stretch, or pass a no-op for the stretch practice so the contract is clear at the call site: `onExtendDuration={activePractice === 'stretch' ? () => undefined : session.extendDuration}`.

### WR-03: Stretch session `selectedSettings` are silently replaced with synthetic lead-in settings

**File:** `src/domain/sessionController.ts:62-87` and `src/hooks/useSessionEngine.ts:88-94`
**Issue:** `startStretchSession` constructs a `leadInSettings` `SessionSettings` object (`bpm: initialBpm`, `ratio`, `durationMinutes: 'open-ended'`) and assigns it to **both** `selectedSettings` and `lockedSettings` of the running state. When the session ends, `endSession` (sessionController.ts:89-94) returns `{ status: 'idle', selectedSettings: cloneSettings(state.selectedSettings) }` — i.e. the synthetic open-ended lead-in settings. `useSessionEngine` then renders with `state.selectedSettings`, and `App.tsx:1182` passes `state.selectedSettings` as the `settings` prop to `SettingsForm`. For the resonant branch this is fine, but if the user is on the stretch practice when a session ends, `state.selectedSettings` is the synthetic `{ bpm: initialBpm, ratio, durationMinutes: 'open-ended' }` — which has no effect on the stretch UI (it reads `stretchSettings`), but means the *resonant* `selectedSettings` carried by the engine is now silently overwritten with stretch-derived values. Switching back to the resonant practice does not re-seed `selectedSettings` from `stretchSettings`, but the engine's idle `selectedSettings` is now whatever the last stretch session left behind, not the user's resonant config.
**Fix:** Either keep the engine's `selectedSettings` untouched for stretch starts (store the lead-in settings only in `lockedSettings`), or re-seed `selectedSettings` from `loadPractices().resonant.settings` on practice switch. At minimum, `onSwitchPractice` should restore the resonant `selectedSettings` so the resonant config is not clobbered by a prior stretch session.

### WR-04: `stretchRamp.test.ts` fixture comment contradicts its values

**File:** `src/domain/stretchRamp.test.ts:11-19`
**Issue:** The comment on `baseSettings` says "warm-up 5 + ramp 20 + cool-down 5 = 30 min", but the object has `warmUpMinutes: 5, rampDurationMinutes: 20, coolDownMinutes: 5` → 30 min total — that part is correct. However the header comment line 11 reads "warm-up 5 + ramp 20 + cool-down 5 = 30 min" while line 11's preamble says the fixture is "warm-up 5 + ramp 20 + cool-down 5". This is consistent. The genuine issue: the `numSteps` test (line 129-134) and the drift comment block (line 217-235) rely on cycle-aligned fixtures, so the suite never catches CR-01. Treat this as a coverage gap warning: add a drift fixture asserting `computeStretchTotalMs` against the segment table.
**Fix:** Add a regression test pairing `computeStretchTotalMs` with `buildStretchSegments(...).at(-1).endMs` for a non-cycle-aligned config.

### WR-05: `migrateEnvelope` v2→v3 seeds stretch settings from the resonant blob — guaranteed to fail coercion

**File:** `src/storage/storage.ts:108-133`
**Issue:** The v2→v3 ladder seeds `practices.stretch.settings` from `resonantSlice['settings']` — a `SessionSettings`-shaped blob (`{ bpm, ratio, durationMinutes }`). `coerceStretchSettings` then validates `initialBpm`, `targetBpm`, `warmUpMinutes`, `rampDurationMinutes`, `coolDownMinutes` — **none** of which exist on a resonant settings object. Every field except possibly `ratio` falls back to `DEFAULT_STRETCH_SETTINGS`. So the migration effectively always produces defaults for stretch settings; seeding from the resonant blob accomplishes nothing except carrying `ratio` across (and only when the resonant ratio happens to be valid). The comment claims the resonant blob "carries ramp fields" — it does not; resonant settings never had ramp fields (those were removed from `SessionSettings` in this same phase per D-01/D-02). This is a logic error in the migration: the seed source is wrong.
**Fix:** Seed `practices.stretch.settings` directly from `DEFAULT_STRETCH_SETTINGS` (or omit the `settings` key entirely and let `coercePractices` supply the default), and drop the misleading comment. If the intent was to preserve a pre-Phase-34 stretch blob that lived elsewhere, identify and read that actual source.

### WR-06: `roundsCompletedLabel` PT-BR string is wrong for the Stretch practice context

**File:** `src/content/strings.ts:494`
**Issue:** `stats.roundsCompletedLabel` for `pt-BR` is `'OMs na frente'` ("front OMs") — a Navi-Kriya-specific phrase. `StatsFooter` receives `showRounds={activePractice === 'naviKriya'}` (App.tsx:1270), so the label is only shown for Navi Kriya today and stretch is safe. But the EN value is `'Rounds'` (a generic word) while the PT-BR value is a NK-specific phrase — they are not translations of each other. Any future reuse of this label (e.g. a stretch rounds count) would surface an incorrect string, and the EN/PT-BR pair is already inconsistent.
**Fix:** Make the PT-BR value a genuine translation of "Rounds" (e.g. `'Rodadas'`, which is already used in `nkControls.roundsLabel`), or rename the key to reflect its NK-specific meaning.

## Info

### IN-01: Temporary 1-minute DURATION option still present

**File:** `src/domain/settings.ts:60-77`
**Issue:** `DURATION_OPTIONS` includes a `1` entry with the comment "TEMPORARY (testing aid)... Remove before release." This is unrelated to Phase 34 but is in a reviewed file and remains shippable debt.
**Fix:** Remove the `1` entry and its comment before release, or gate it behind a dev-only flag.

### IN-02: `SettingsForm` `practiceStrings` prop is declared but unused

**File:** `src/components/SettingsForm.tsx:42-43`
**Issue:** `practiceStrings: UiStrings['practice']` is declared in `SettingsFormProps` and passed by `App.tsx:1187`, but the component body never reads `practiceStrings`. Dead prop — was used by the Phase 30 NK placeholder heading that has since been removed.
**Fix:** Remove the `practiceStrings` prop from `SettingsFormProps` and the `App.tsx` call site.

### IN-03: `STRETCH_INITIAL_BPM_OPTIONS` typed as `readonly number[]` loses the literal-tuple narrowing

**File:** `src/domain/settings.ts:54-56`
**Issue:** `STRETCH_INITIAL_BPM_OPTIONS` is annotated `readonly number[]` rather than a `const`-asserted tuple, unlike its sibling `BPM_OPTIONS` (`... as const satisfies ...`). The `.filter` result cannot be `as const`, but the explicit `readonly number[]` annotation is broader than necessary and is inconsistent with the surrounding option arrays. Minor type-precision loss.
**Fix:** Acceptable as-is given `.filter` cannot preserve a tuple; optionally derive the tuple statically if the precise literal union is wanted downstream.

### IN-04: Misleading comment in `stretchRamp.ts` `numSteps` rationale

**File:** `src/domain/stretchRamp.ts:122-126`
**Issue:** The comment says "each step is strictly < 0.5 BPM by construction" and references dividing by `0.4999`. Using `0.4999` rather than `0.5` is what makes the step strictly less than 0.5, but the comment does not explain *why* `0.4999` (not `0.5`) — a future reader may "simplify" it to `0.5` and break the strict-inequality guarantee that `stretchRamp.test.ts:35-43` asserts.
**Fix:** Add one line: "`0.4999` (not `0.5`) so `ceil` yields enough steps that each step is strictly < 0.5 even when the span is an exact multiple of 0.5."

### IN-05: `BooleanToggle` prop names (`isStretch`/`stretchLabel`) are now domain-leaky

**File:** `src/components/BooleanToggle.tsx:1-7`
**Issue:** `BooleanToggle` is a generic iOS-style switch but its props are named `isStretch`, `stretchLabel`, `standardLabel`. Its only remaining consumer (`SettingsForm.tsx:285-291`) uses it for the Navi Kriya `perOmCue` On/Off toggle — the "stretch" naming is now stale and confusing since the Stretch practice no longer uses a mode toggle at all (D-01 retired the ModeToggle). The names mislead future readers into thinking this component is stretch-specific.
**Fix:** Rename props to generic terms: `value`/`offLabel`/`onLabel` (or `checked`/`uncheckedLabel`/`checkedLabel`).

---

_Reviewed: 2026-05-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
