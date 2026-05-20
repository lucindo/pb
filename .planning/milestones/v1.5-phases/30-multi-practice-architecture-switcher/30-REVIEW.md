---
phase: 30-multi-practice-architecture-switcher
reviewed: 2026-05-17T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/domain/naviKriyaSettings.ts
  - src/domain/naviKriyaSettings.test.ts
  - src/components/PracticeToggle.tsx
  - src/components/PracticeToggle.test.tsx
  - src/content/strings.ts
  - src/content/strings.test.ts
  - src/storage/practices.ts
  - src/storage/practices.test.ts
  - src/storage/storage.ts
  - src/storage/storage.test.ts
  - src/storage/index.ts
  - src/app/App.tsx
  - src/components/SettingsForm.tsx
  - src/components/SettingsForm.stretch.test.tsx
  - src/components/ResetStatsDialog.tsx
  - src/app/App.persistence.test.tsx
  - src/app/App.dialog.test.tsx
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 30: Code Review Report

**Reviewed:** 2026-05-17T00:00:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 30 introduces the multi-practice architecture: a `practices` map envelope
(`{ resonant, naviKriya }`), a v1→v2 migration ladder, the `PracticeToggle`
segmented control, practice-aware `SettingsForm` dispatch, and a per-practice
stats reset. The coercion layer is well-guarded against prototype pollution and
the migration seam is lossless and idempotent.

The phase has one **structural correctness defect**: the app now keeps resonant
settings in *two* divergent locations. `App.tsx` continues to persist resonant
session settings through the legacy flat `env.settings` path (`saveSettings`)
while persisting resonant *stats* through the new `practices.resonant.stats`
subtree (`recordResonantSession`). Every `recordResonantSession` /
`resetPracticeStats` write re-emits a `practices.resonant.settings` slice that is
frozen at migration time and never updated — a permanently stale subtree. The
dedicated `saveResonantSettings` / `saveNaviKriyaSettings` writers exist but are
dead code. This is shippable-but-fragile for Phase 30 (nothing reads
`practices.resonant.settings` yet) and becomes a live data-loss bug the moment
Phase 31 wires the NK engine and starts trusting the subtree.

Remaining findings are localized: a non-idempotent `frontCount` rounding edge,
practice-name strings left untranslated in pt-BR, a `Math.floor` flooring
behavior worth confirming against spec, and several test-coverage gaps.

## Critical Issues

### CR-01: Resonant settings persisted to a different subtree than resonant stats — split-brain envelope

**File:** `src/app/App.tsx:85`, `src/app/App.tsx:327-330`, `src/storage/practices.ts:106-113`
**Issue:**
`App.tsx` reads resonant settings via `loadSettings()` (flat `env.settings`) and
persists them via `saveSettings(next)` (`src/storage/settings.ts:48` — writes
flat `env.settings`). But resonant *stats* are recorded via
`recordResonantSession` (`practices.resonant.stats`) and reset via
`resetPracticeStats` (`practices.resonant.stats`).

`recordResonantSession` / `resetPracticeStats` both do
`coercePractices(env.practices)` then write the *whole* practices map back
(`practices.ts:153-156`, `practices.ts:166-175`). The `practices.resonant.settings`
slice they re-emit is whatever `coercePractices` produced from the migration-time
snapshot — it is **never** refreshed when the user changes BPM/ratio/duration,
because `saveSettings` only touches `env.settings`.

Consequences:
1. The envelope holds two resonant-settings copies that diverge permanently
   after the first settings change followed by any session/reset.
2. `saveResonantSettings` (`practices.ts:106`) and `saveNaviKriyaSettings`
   (`practices.ts:115`) — the intended per-practice writers — are dead code; no
   production caller invokes them (verified: only `App.tsx` imports
   `loadPractices` and `recordResonantSession`).
3. Phase 31 will wire the NK engine and is expected to read
   `loadPractices().resonant.settings` / `.naviKriya.settings`; at that point the
   stale `resonant.settings` becomes a live wrong-data bug, and the resonant
   practice silently loses every settings change made after migration.

**Fix:** Make the persistence path practice-aware now, before Phase 31 builds on
it. Route resonant settings through the practices subtree so there is a single
source of truth:

```ts
// App.tsx — replace the flat saveSettings call
import { saveResonantSettings } from '../storage'

const persistedSetSettings = useCallback((next: SessionSettings) => {
  sessionSetSelectedSettings(next)
  saveResonantSettings(next)   // writes practices.resonant.settings
}, [sessionSetSelectedSettings])

// and seed initial settings from the practices subtree:
const initialSettings = useMemo<SessionSettings>(
  () => initialPractices.resonant.settings,
  [initialPractices],
)
```

If keeping the flat `env.settings` path is a deliberate Phase 30 scoping
decision, then `saveResonantSettings`/`saveNaviKriyaSettings` must be removed (so
no caller is misled into using a writer the app does not honor) and a code
comment must document that `practices.*.settings` is intentionally not
authoritative until Phase 31. Either way the current half-wired state is a
defect: a writer pair that exists, is exported, is tested, and is never called.

## Warnings

### WR-01: `coerceNaviKriyaSettings` frontCount rounding is not idempotent across the valid/invalid boundary

**File:** `src/storage/practices.ts:57-62`
**Issue:** `coerceNaviKriyaSettings` rounds a non-multiple-of-4 `frontCount` down
(`Math.floor(fc / 4) * 4`) but **discards** any value in `(0, 4)` because the
rounded result is `0`, falling back to the default `100`. This is inconsistent
with the rounding policy: `frontCount: 90` rounds to `88` (kept), but
`frontCount: 2` jumps all the way to `100` (default) rather than to the nearest
valid floor. A tampered or drifted value of `1`, `2`, or `3` produces a
surprising jump to the default instead of the smallest valid count (`4`). The
test at `practices.test.ts:83` locks the current behavior, so this is at minimum
an under-specified policy.
**Fix:** Decide and document one policy. If "round down to the nearest valid
multiple of 4, with a floor of 4" is intended:

```ts
if (typeof fc === 'number' && Number.isFinite(fc) && fc > 0) {
  const rounded = Math.floor(fc / 4) * 4
  frontCount = rounded > 0 ? rounded : 4
}
```

If the default-fallback for sub-4 values is intentional, add a code comment
stating that `(0,4)` deliberately falls back to the default rather than to `4`,
and add a `frontCount: 3` test asserting it.

### WR-02: pt-BR `practice` strings are untranslated English placeholders

**File:** `src/content/strings.ts:441-451`
**Issue:** The entire `practice` block under the `'pt-BR'` locale is verbatim
English: `toggleLabel: 'Switch practice'`, `naviKriyaHeader: 'Navi practice'`,
`naviKriyaControlsPlaceholder: 'Controls coming soon'`,
`naviKriyaStatsEmptyBody: 'Navi Kriya sessions will appear here...'`,
`resetStatsTitle: (n) => `Reset ${n} stats?``. A pt-BR user sees English copy in
the practice switcher, the NK header, the placeholder, and the reset dialog title.
The header `D-01` claims "PT-BR values reviewed by a native speaker in Phase 26"
— these Phase 30 additions never went through that review and break that
invariant. The string test (`strings.test.ts:182-189`) only checks `length > 0`,
so it cannot catch an untranslated-but-non-empty string.
**Fix:** Provide real pt-BR translations, e.g. `toggleLabel: 'Trocar prática'`,
`naviKriyaControlsPlaceholder: 'Controles em breve'`, `resetStatsTitle: (n) =>
`Zerar estatísticas de ${n}?``. `resonantName` / `naviKriyaName` may legitimately
stay as proper nouns (the test at `strings.test.ts:205` documents Navi Kriya as an
untranslated Sanskrit term) — but the surrounding UI copy must be localized.

### WR-03: stale `practices.resonant.settings` accumulates on every stats write

**File:** `src/storage/practices.ts:128-158`, `src/storage/practices.ts:163-176`
**Issue:** Direct consequence of CR-01 but worth calling out as its own
maintenance hazard: `recordResonantSession` and `resetPracticeStats` both
round-trip the entire `practices` map through `coercePractices` and write it
back. Because nothing keeps `practices.resonant.settings` in sync with the
authoritative flat `env.settings`, every completed session and every stats reset
re-stamps a stale settings slice onto disk. A developer inspecting the envelope in
DevTools will see a `practices.resonant.settings` that looks authoritative but is
not — a debugging trap.
**Fix:** Resolved by fixing CR-01 (single source of truth). If CR-01 is deferred,
add an explicit comment on `coercePractices` and on both write functions warning
that `practices.resonant.settings` is not authoritative in Phase 30.

### WR-04: cross-tab storage listener refreshes only stats, not `activePractice`

**File:** `src/app/App.tsx:171-183`
**Issue:** The `storage` event handler re-reads `loadPractices()` and updates
`resonantStats` / `naviKriyaStats`, but does **not** re-read `activePractice`. If
the user switches practice in another tab (`saveActivePractice` writes
`STATE_KEY`), this tab keeps rendering the old practice. The footer then shows the
*other* practice's stats slice relative to what the header/toggle display —
because `activeStats` (`App.tsx:216`) selects by the stale `activePractice` while
`resonantStats`/`naviKriyaStats` were just refreshed. The result is a visibly
inconsistent UI after a cross-tab switch. The existing STORAGE-03 comment
(`App.tsx:140-166`) only commits to "stats-only refresh", but `activePractice` is
new Phase 30 state living under the same key and was not considered.
**Fix:** Either also refresh `activePractice` in the listener:

```ts
const onStorage = (e: StorageEvent): void => {
  if (e.key === STATE_KEY) {
    const practices = loadPractices()
    setResonantStats(practices.resonant.stats)
    setNaviKriyaStats(practices.naviKriya.stats)
    setActivePractice(loadActivePractice())
  }
}
```

or, if cross-tab practice sync is intentionally out of scope, document that
decision in the STORAGE-03 comment block so it is a recorded gap rather than an
oversight.

### WR-05: NK Start-stub `min-h-11` falls short of the 44px hit-area floor used elsewhere

**File:** `src/components/SettingsForm.tsx:216`
**Issue:** The disabled Navi Kriya Start stub uses `min-h-11` (44px). That meets
the floor numerically, but every other primary button in this codebase uses
`min-h-12` (48px) — see `ResetStatsDialog.tsx:84` and the dialog hit-area test
(`App.dialog.test.tsx:152-160` asserts `min-h-12` on session-control-class
buttons), and `PracticeToggle.tsx:47` uses `min-h-[44px]` for a *segmented
control* pill, not a primary CTA. A disabled button is not interactive so this is
not a functional a11y failure, but when Phase 31 enables this button it will be
4px shorter than the resonant Start CTA it is meant to mirror, causing a layout
shift between practices.
**Fix:** Use `min-h-12` to match the resonant primary CTA and the established
48px convention, so the enabled-in-Phase-31 button needs no further change.

## Info

### IN-01: `isValidFrontCount` is exported and tested but has no production caller

**File:** `src/domain/naviKriyaSettings.ts:22-28`
**Issue:** `isValidFrontCount` is fully implemented and has a dedicated test
suite (`naviKriyaSettings.test.ts:10-38`), but `coerceNaviKriyaSettings`
(`practices.ts:57-62`) deliberately does *not* use it — it inlines a
round-down-instead-of-reject policy. So the only validator for the multiple-of-4
invariant is unused dead code in production. This is acceptable if Phase 31's NK
form will use it for input validation, but right now it is an exported function
with zero non-test callers.
**Fix:** No action required for Phase 30 if Phase 31 will consume it. Otherwise
remove it to avoid two competing frontCount-validation policies.

### IN-02: `PracticeToggle` `PracticeId` is a duplicated local type

**File:** `src/components/PracticeToggle.tsx:6`
**Issue:** `PracticeToggle.tsx` declares its own
`export type PracticeId = 'resonant' | 'naviKriya'`, duplicating the canonical
`PracticeId` from `src/storage/practices.ts:23`. The file comment (lines 1-4)
acknowledges this and says "plan 30-04 reconciles imports". The two definitions
are structurally identical today, so there is no bug — but if `practices.ts` ever
adds a third practice, the toggle's type silently drifts out of sync.
**Fix:** Import the canonical type: `import type { PracticeId } from
'../storage/practices'` and delete the local alias. The stated reconciliation
plan should be completed rather than left as a comment.

### IN-03: `PRACTICE_IDS` array can drift from the `PracticeId` union

**File:** `src/components/PracticeToggle.tsx:18`
**Issue:** `const PRACTICE_IDS: PracticeId[] = ['resonant', 'naviKriya']` is a
hand-maintained list. If a third practice id is added to the `PracticeId` union,
TypeScript will not flag the missing entry here — the toggle would silently render
only two of three practices.
**Fix:** Derive the list so the compiler enforces exhaustiveness, e.g.
`as const satisfies readonly PracticeId[]` paired with a `Record<PracticeId, ...>`
keyed source (the same `as const satisfies` pattern already used for
`OM_LENGTH_OPTIONS` in `naviKriyaSettings.ts:3`).

### IN-04: No test covers the resonant-vs-NK conditional rendering in `App.tsx`

**File:** `src/app/App.tsx:805-843`
**Issue:** `App.tsx` gates `SessionReadout` and `SessionControls` behind
`activePractice === 'resonant'` (lines 805, 829) — a deliberate guard against a
stale "Session complete" headline and a duplicate Start button leaking onto the NK
scaffold (per the inline comments). `SettingsForm.stretch.test.tsx` covers the
`SettingsForm` dispatch, and `PracticeToggle.test.tsx` covers the toggle in
isolation, but no App-integration test exercises switching to `naviKriya` and
asserting the readout/controls are absent. This load-bearing guard is unverified.
**Fix:** Add an App-integration test: render `<App />`, click the Navi Kriya pill,
assert `queryByRole('region', { name: 'Session readout' })` is null and that only
the disabled NK Start stub is present (no second enabled Start button).

---

_Reviewed: 2026-05-17T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
