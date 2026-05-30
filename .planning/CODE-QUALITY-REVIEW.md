# Code Quality Review — Full `src/` Maintainability Audit

> Scope: entire non-test source tree (`src/**/*.ts`, `src/**/*.tsx`), 14,716 lines.
> Method: strict maintainability audit — abstraction quality, file sprawl, spaghetti growth,
> duplication, and "code-judo" simplification opportunities. Behavior-preserving only.
> Intended use: input to a new GSD milestone (maintainability / tech-debt paydown).

## Executive summary

The **architecture is healthy**. Layer separation is real (domain has zero React/DOM imports),
no file exceeds 1k lines, the primitives / `SessionClock` / `schedule()`-dispatch designs are
genuinely good, and `unknown`-boundary coercion at the storage edge is appropriate. There are
**no architectural blockers**.

However, there are two structural regressions, one large cross-cutting tax that actively misleads
maintainers, and several high-value behavior-preserving deletions.

Key metric: **3,782 of 14,716 non-test source lines (26%) are comments, carrying ~1,329
planning-artifact references** (`D-xx`, `Phase NN`, `WR-xx`, `Blocker #N`, `Pitfall N`, etc.) —
roughly one planning-process token for every 11 lines of source.

### Priority order

| # | Finding | Severity | Risk | Est. lines removed |
|---|---------|----------|------|--------------------|
| 1 | Three byte-identical `record*Session` storage functions | Structural regression | Low | ~140 |
| 2 | View-model layer is an adapter that adapts an adapter | Structural regression | Low | ~150 |
| 3 | Comments are a planning changelog, not explanation (codebase-wide) | Cross-cutting tax | Low | ~300+ |
| 4 | Two parallel HRV/NK session stacks, no shared shell | Duplication | Medium | ~150 |
| 5 | `SessionFrame` is two types fused into an optional bag | Boundary/type | Medium | — |
| 6 | Lower-priority cleanups (batch) | Modularity | Low | ~80 |

Highest-leverage single move: **#3** (strip planning tags) — removes hundreds of misleading
lines, changes no behavior, and makes every other finding easier to see.

---

## 1. Structural regression — three byte-identical `record*Session` functions

**Files:** `src/storage/practices.ts:279-423`, `src/storage/stats.ts:111-148`

`recordResonantSession`, `recordStretchSession`, and `recordNaviKriyaSession` are **identical
line-for-line** except (a) the slice key (`resonant` / `stretch` / `naviKriya`) and (b) NK folding
one extra `roundsCompleted` field. The NaN guard, the `COUNT_THRESHOLD_MS` early-return, the
`elapsedSeconds` / `now` / `next` construction, and the read-merge-write envelope are copy-pasted
~40 lines × 3, plus a 4th near-copy in `stats.ts`. The three `save*Settings`
(`practices.ts:216-268`) repeat the same shape again.

A fix to the NaN guard or the threshold semantics must currently be applied in **four** places.
The comments themselves admit it ("DS-WR-06 parity", "modeled exactly on recordResonantSession").

**Remedy:**

```ts
function recordPracticeSession(
  sliceKey: 'resonant' | 'stretch' | 'naviKriya',
  elapsedMs: number, isComplete: boolean, deps: StorageDeps,
  extra?: (stats: PersistedStats) => Partial<PersistedStats>,
): PersistedStats
```

The three public functions become one-line wrappers; NK passes the `roundsCompleted` merge as
`extra`. Collapses ~140 lines to ~40 and single-sources the guard logic. Same move for
`savePracticeSettings(sliceKey, settings, deps)`.

---

## 2. Structural regression — the view-model layer is an adapter that adapts an adapter

**Files:** `src/app/appControllerAdapters.ts` (entire 238-line file), `src/app/appViewModel.ts:166-245`,
`src/app/sessionPresentation.ts:14-75`

`useAppViewModel` → `appControllerAdapters.create*FromControllers` →
`appViewModel.create*ViewModel` → `sessionPresentation.get*` is **four hops, two of which are pure
field-copying with zero logic.**

- `createPracticeSessionViewModelFromControllers` (`appControllerAdapters.ts:86-122`) destructures a
  controller and re-passes the same fields into `createPracticeSessionViewModel`, which
  re-destructures the *same* fields again into `BreathingPresentationInput`.
- `createAppNavigationViewModel` / `createAppDialogsViewModel` (`:213-237`) copy objects
  field-for-field into an identical shape.
- The `…ViewState` arg interfaces in `appViewModel.ts:166-196` re-declare the `…PresentationInput`
  shapes from `sessionPresentation.ts:14-75` almost verbatim.

**Remedy:** Delete `appControllerAdapters.ts` entirely; inline the field extraction at the
`create*ViewModel` call sites in `useAppViewModel.ts` (the hook already holds the controllers).
Merge the redundant `ViewState` / `PresentationInput` interfaces so `createPracticeSessionViewModel`
consumes presentation inputs directly. Removes one file + ~150 lines of forwarding with no behavior
change.

**Related:** The `kind`-tagged union is the keeper — but the *producers* still branch on raw
`activePractice` in 5 places (`appViewModel.ts:204,273-296,325-333`, `PracticeSessionView.tsx:26`,
`useAppViewModel.ts:107-143`) instead of leveraging it. Collapse the three separate
`activePractice === 'naviKriya'` ternaries in `createPracticeControlsViewModel` into one block.

---

## 3. Cross-cutting tax — comments are a planning changelog, not explanation

**Worst offenders:** `src/hooks/useAudioCues.ts` (**56% comments**), `src/audio/audioEngine.ts`,
`src/hooks/useSessionEngine.ts` (47%), `src/domain/sessionController.ts`, `src/storage/storage.ts`,
`src/storage/practices.ts`.

26% of all source is comments, and ~1,329 of those lines reference planning artifacts a future
reader **cannot access**: `revision 2 Blocker #1`, `Plan 06 D-34`, `WR-05`, `Pitfall 3`,
`kitchen-sink fix 2026-05-10`, `formerly at L164-165`, `mirror stop() L420-421`.

Several cross-references are **already stale** — `useAudioCues.ts` cites "L213-222" for the
`handleResume` gate, but `handleResume` is at lines 228-237. This violates the project's own
standing rule (memory: *no design locking*): comments must not anchor downstream-modifiable values,
deleted-code refs, or stale future-tense notes.

The damage isn't volume — much of the *why* is valuable (iOS gesture-token sequencing in
`audioEngine.ts:480-493`, the TOCTOU envelope essay, the silent-WAV rationale). The damage is the
**decision-ID shorthand**: a reader can't tell a load-bearing invariant from archaeology, and the
stale line-refs actively lie about what's current.

**Remedy:** Mechanical strip-the-tags pass. Keep the prose, drop the
`D-xx` / `WR-xx` / `Phase NN` / `Blocker` / `Pitfall N` / `spike NNN` prefixes and every
`formerly at L###` / `mirror X L###` cross-ref. State invariants in present tense (e.g. "Null
engineRef before awaiting close() so a racing start() can't deref a closing AC."). Move historical
rationale to git messages or a single `docs/audio-architecture.md`. Removes ~300 lines from
`useAudioCues.ts` alone; highest-ROI, lowest-risk change available.

---

## 4. Duplication — two parallel HRV/NK session stacks with no shared shell

**Files:**
- HRV: `src/hooks/useBreathingSessionController.ts`, `useSessionEngine.ts`, `useAudioCues.ts`
- NK: `src/hooks/useNaviKriyaSessionController.ts`, `useNKEngine.ts`, `useNaviKriyaAudio.ts`

The two **controllers** are ~60-70% structural copies: identical
`leadInTimeoutsRef` / `clearLeadInTimeouts` (`useBreathingSessionController.ts:86,153-156` ≈
`useNaviKriyaSessionController.ts:81,93-96`), identical unmount cleanup, the same
`requestEnd` / `confirmEnd` / `cancelEnd` end-dialog trio, the same `endDialogOpen` state, the same
`loadPrefs().timbre` capture, the same record-on-complete `elapsedSec * 1000` boundary, the same
wake-lock threading.

**Remedy:** Extract `useSessionShell` owning lead-in scheduling + end-dialog state + wake-lock +
record-on-complete + timbre capture, parameterized by an engine adapter. The two controllers shrink
to their genuinely-different bits (HRV's reanchor bridge; NK's per-OM cue toggle).

**Do NOT** force-unify the engines below this — the rAF + worker-heartbeat driver vs the
`setTimeout` chain is essential difference; merging them would add abstraction without deleting
branches.

**Related, smaller:** The callback-identity ref+effect pairs (`useAudioCues.ts:197-207`, the
`sessionReanchorRef` bridge at `useBreathingSessionController.ts:98-121`) are a hook-ordering
workaround. A single shared `useEventCallback` (mirror-into-ref + stable wrapper) deletes ~6-8
hand-rolled ref/effect pairs and the prose explaining the dance.

---

## 5. Boundary/type — `SessionFrame` is two types fused into an optional bag

**Files:** `src/domain/sessionMath.ts:6-21`, `src/domain/stretchRamp.ts:43-50`,
`src/domain/sessionAudio.ts:108-135,169-170`

`SessionFrame` declares six stretch-only fields as optional (`cycleStartSec?`, `currentBpm?`,
`stage?`, …); `StretchSessionFrame extends SessionFrame` and re-declares the same six as
**required**. So HRV frames carry ghost optionals they never set, and every consumer pays a
`?? plan.inhaleSec` fallback. The optionality hides the real invariant: a frame is *either*
uniform-HRV *or* per-segment-stretch.

**Remedy:** Make `SessionFrame` carry only shared fields; model the variants as a discriminated
union (`kind: 'hrv' | 'stretch'`). Every `?? plan.x` fallback at the boundary disappears, and the
type system starts enforcing which fields are real.

**Companion:** `walkFutureCues` (`sessionAudio.ts:108-135`) re-implements cycle-stride and
active-segment math that already lives in `sessionMath.ts:23-49` and `stretchRamp.ts:221-256` — the
comments admit "mirrors L221-256." Extract `findActiveSegment(segments, cycleIndex)` and
`phaseOffsetFor(...)` so the three copies become one.

---

## 6. Lower-priority cleanups (batch into one pass — not blocking)

- **`OrbShape.tsx:469-499`** — the `SPIRITUAL_EYE_HALOS.map` and `V1_HALOS.map` blocks are identical
  JSX differing only in the array; pick the array, render one `.map`. The
  `variant === 'spiritual-eye' ? … : …` disc-bg ternary is recomputed at 4 call sites — extract
  `discBgFor(variant)`. (The file is *not* a 1k risk — well-decomposed; ~210 of 594 lines are
  comments.)
- **`asRecord` reimplemented in 4 files** (`practices.ts:55`, `prefs.ts:154`, `settings.ts:23`,
  `stats.ts:70`) — hoist one copy to `storage.ts`.
- **Validation cast `(X_OPTIONS as readonly string[]).includes(v)`** repeated ~10× in `settings.ts`
  + `naviKriyaSettings.ts` (one site widens to `unknown[]`, inconsistent) — one
  `isMember<T>(options, v): v is T` helper.
- **`PracticeControlsView.tsx:10-24`** carries two `audio` props disambiguated by an 11-line "this
  comment is the contract" doc — rename at the VM boundary (`practiceControls.audio` vs
  `resumeAnnouncement`) so a type, not prose, holds the invariant.
- **`sessionController.ts:74-100`** — `lockedSettings` (synthetic lead-in plan) vs `selectedSettings`
  (restore config) are both typed `SessionSettings`; the load-bearing distinction survives only in a
  7-line comment. Name the field for its role (`audioPlanSettings` / `restoreSettings`).
- **Shared validation predicates** — `naviKriyaSettings.ts:30-48` re-implements the
  `typeof number && Number.isFinite && Number.isInteger` idiom already in `settings.ts:183-215`.
  Extract `isPositiveInteger(v, { multipleOf? })`.

---

## What is explicitly NOT a problem (do not "fix")

- **File sizes** — nothing is near the 1k cliff; the largest files are large from comment volume,
  not tangled logic. `OrbShape.tsx` is already well-decomposed.
- **Settings forms** (`ResonantSettingsForm` / `StretchSettingsForm` / `NaviKriyaSettingsForm`) —
  correctly factored over shared primitives; a config-driven schema form would be *over*-engineering
  given their materially different shapes. Leave them.
- **`unknown`-boundary coercion** in storage — appropriate trust-boundary pattern; no `any`, no
  unguarded casts.
- **The HRV/NK engine drivers** — rAF+worker vs setTimeout-chain is essential difference; do not
  unify below the proposed `useSessionShell`.
- **`NKShape.tsx`** — thin, correct delegation to `OrbShape` via `nkPhase`; good separation.

---

## Suggested milestone shape

Behavior-preserving tech-debt paydown. Recommended phase grouping (each independently shippable,
each verifiable by "tests still green + no behavior change"):

1. **Comment de-archaeology** (#3) — mechanical strip-the-tags pass across `src/`. Biggest ROI,
   lowest risk, unblocks reading for everything else.
2. **Storage de-duplication** (#1) — collapse `record*Session` / `save*Settings`; hoist `asRecord`;
   add `isMember` / `isPositiveInteger` helpers (part of #6).
3. **View-model layer flattening** (#2) — delete `appControllerAdapters.ts`, merge redundant
   interfaces, single-source the per-practice dispatch.
4. **Session-stack shell** (#4) — extract `useSessionShell` + `useEventCallback`.
5. **Domain frame model** (#5) — `SessionFrame` discriminated union + `walkFutureCues` de-dup.
6. **Component/leftover cleanups** (#6 remainder).

Phases 1–3 are low-risk and high-value; 4–5 are the deeper structural wins and warrant their own
discuss/plan cycle.
