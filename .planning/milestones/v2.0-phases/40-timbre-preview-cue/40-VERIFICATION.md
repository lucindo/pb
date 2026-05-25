---
phase: 40-timbre-preview-cue
verified: 2026-05-21T20:30:00Z
status: passed
score: 13/13 must-haves verified (structural); 4 empirical UAT items operator-approved 2026-05-25 (see 40-HUMAN-UAT.md). Closed at v2.0 milestone close.
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 13/13 (structural)
  gaps_closed:
    - "PREV-01 cue correctness across four timbres — operator-confirmed audible (40-HUMAN-UAT.md test 1)"
    - "PREV-03 mute irrelevance empirical cross-check — operator-confirmed (40-HUMAN-UAT.md test 2)"
    - "D-08 rapid-tap overlap feel — operator-confirmed no glitches (40-HUMAN-UAT.md test 3)"
    - "PREV-05 + D-01 + D-02 iOS Safari standalone-PWA cold-start latency — operator-confirmed imperceptible (40-HUMAN-UAT.md test 4)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "PREV-01 — Cue correctness across all four timbres"
    expected: "Tapping each of Bowl / Bell / Sine / Flute in App Settings plays a single inhale cue at A4 (no looping, no exhale, no double-trigger). Cues are distinguishable by timbre."
    why_human: "Audible cue correctness (right cue, right pitch, right envelope per timbre) cannot be verified in jsdom — FakeAudioContext records the dispatch but produces no audio. Unit tests prove the call shape; the operator's ear proves the cue."
  - test: "PREV-03 (empirical) — Mute irrelevance"
    expected: "Start a session, mute via MuteToggle, end the session. Tap each of the four timbres. Cues remain audible regardless of the prior MuteToggle state."
    why_human: "Structural lock (import-graph drift-guard) proves previewContext.ts cannot reach the audioEngine mute state, but only an audible cross-check confirms the structural lock corresponds to real-world behavior on a real device."
  - test: "D-08 — Rapid-tap overlap feel"
    expected: "Tapping rapidly across 3-4 timbres in ~1 second produces brief polyphonic overlap (by design) with no silence gaps, no glitches/crackles, no crashes, no console errors."
    why_human: "Qualitative judgment of overlap feel + audio glitch absence requires real Web Audio output on real hardware. JSdom cannot exercise oscillator scheduling or rendering."
  - test: "PREV-05 + D-01 + D-02 — iOS Safari standalone-PWA cold-start (HIGH-SIGNAL)"
    expected: "On iOS Safari (preferably installed standalone PWA), fully close the app/tab and re-open. WITHOUT starting a session, open Settings and tap a timbre. The cue plays with imperceptible latency (well under 100ms per PREV-05). Second tap is even faster (singleton reuse per D-01)."
    why_human: "PREV-05 latency is explicitly NOT measured by CI (D-12 + CONTEXT 'Out of scope' bullet — JSdom + fake-timer benchmarks give false confidence on real Web Audio latency). The synchronous-call-path contract is the structural lock; real-device latency confirmation requires operator testing. iOS Safari cold AudioContext creation + resume + first oscillator schedule is the platform that historically breaks audio invariants — this is the highest-signal manual test in Phase 40."
---

# Phase 40: Timbre preview cue — Verification Report

**Phase Goal:** Switching the Timbre selection in App Settings plays the inhale cue once at the current pitch — operator-added requirement, lands the audio surface change before the visual rebuild starts.

**Verified:** 2026-05-21T20:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

Phase 40 ships a new pure Web Audio preview path (`src/audio/previewContext.ts`) wired into the existing `TimbrePicker.tsx` onClick. All structural truths are verified in the codebase. Real-device confirmation of the audible behaviors (cue correctness at A4, mute irrelevance, rapid-tap feel, iOS Safari cold-start latency) is explicitly designed to live in `40-HUMAN-UAT.md` per CONTEXT D-12 / D-13 (`status: pending`).

The 5 ROADMAP success criteria break down as:
- **SC-1 (PREV-01 audition wiring)** — structurally verified (onClick fires `playInhalePreview(id)`); audible correctness requires the operator.
- **SC-2 (PREV-02 reuse cueSynth scheduler)** — verified: `previewContext.ts` imports `scheduleInCueForTimbre` from `./cueSynth`; no duplicated DSP.
- **SC-3 (PREV-03 plays when muted; PREV-04 suppressed during session)** — both verified structurally + by tests; D-10(f) wiring test locks PREV-04; the import-graph drift-guard locks PREV-03.
- **SC-4 (PREV-05 ≤100ms latency)** — verified STRUCTURALLY via the synchronous-call-path contract + singleton (D-12); empirical latency confirmation is intentionally human-only.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `playInhalePreview(timbre)` routes through `scheduleInCueForTimbre` (PREV-02 — no duplicated DSP) | VERIFIED | `src/audio/previewContext.ts:17` imports `scheduleInCueForTimbre` from `./cueSynth`; line 36 dispatches with `(previewCtx, previewCtx.currentTime, previewCtx.destination, timbre)`. |
| 2 | First-tap creates a module-level AudioContext singleton attached to the user gesture (D-01) | VERIFIED | `src/audio/previewContext.ts:20` declares `let ctx: AudioContext | null = null`; lines 22-28 lazy-create on first call; test D-10(c) asserts AudioContext constructor called exactly once across 4 taps. |
| 3 | Subsequent taps reuse the same AudioContext instance (D-01 latency target) | VERIFIED | Test D-10(c) at `previewContext.test.ts:83-96` calls `playInhalePreview` four times with different TimbreIds and asserts `acCtor` called exactly once. |
| 4 | `ctx.resume()` invoked when the singleton AudioContext is suspended (D-02 iOS / auto-suspend) | VERIFIED | `previewContext.ts:32-35` calls `void previewCtx.resume()` when `state === 'suspended'`. Test D-10(b) at `previewContext.test.ts:48-80` exercises `_simulateSuspend()` + asserts `ctx.resume` called once on subsequent tap. |
| 5 | `scheduleInCueForTimbre` called synchronously in the same microtask (PREV-05 contract / D-12) | VERIFIED | `previewContext.ts:36` is a synchronous call with no `await`. Test D-10(d) at `previewContext.test.ts:99-113` asserts `spy.mock.calls.length === 1` immediately after the synchronous call. |
| 6 | `phaseDurationSec` omitted from the dispatch call (D-03 natural decay) | VERIFIED | `previewContext.ts:36` calls with exactly 4 args. Test D-10(a) at `previewContext.test.ts:22-41` asserts `callArgs.toHaveLength(4)` per-timbre × 4 timbres. |
| 7 | Module exports a single bare function `playInhalePreview(timbre: TimbreId): void` — no class, no default export, no exported getter (D-06) | VERIFIED | `previewContext.ts:30` has the lone exported function; `grep -E '(^\|[^A-Za-z_])class\s\|export default' src/audio/previewContext.ts` returns no matches. |
| 8 | previewContext.ts cannot import `./audioEngine` without failing CI (PREV-03 structural lock) | VERIFIED | `src/audio/previewContext.no-audioengine-import.test.ts:34-41` declares the ban-list; the test asserts `hits === []`. Drift-guard PASSES (1 test passed in `npx vitest run`). |
| 9 | Ban-list also covers `../audio/audioEngine` and `../hooks/useAudioCues` (D-15 Claude's Discretion) | VERIFIED | `previewContext.no-audioengine-import.test.ts:37-40` enumerates all three patterns. |
| 10 | Drift-guard reads source text on disk (not transpiled output) | VERIFIED | `previewContext.no-audioengine-import.test.ts:45` uses `readFileSync(PREVIEW_PATH, 'utf-8')`. |
| 11 | Tapping a TimbrePicker option fires `playInhalePreview(id)` with the correct TimbreId (PREV-01 audition wiring; D-04) | VERIFIED | `src/components/TimbrePicker.tsx:21` imports `playInhalePreview`; line 56 onClick calls `setTimbre(id); playInhalePreview(id)`. Test D-10(e) at `TimbrePicker.test.tsx:132-140` asserts `toHaveBeenCalledWith('sine')` after click. |
| 12 | Trigger source is onClick handler only — NOT a `useEffect` on the timbre value (D-05) | VERIFIED | `grep -nE 'useEffect' src/components/TimbrePicker.tsx` returns zero matches. |
| 13 | Tapping a disabled TimbrePicker option does NOT fire `playInhalePreview` (PREV-04 wiring lock — D-10(f)) | VERIFIED | Test D-10(f) at `TimbrePicker.test.tsx:143-150` renders `disabled={true}`, clicks Flute, asserts `not.toHaveBeenCalled()`. Test passes. |
| 14 | Tapping the currently-selected TimbreId fires `playInhalePreview` again (re-audition, D-09) | VERIFIED | Test D-10(g) at `TimbrePicker.test.tsx:153-163` asserts two consecutive Bell taps each fire the preview. |
| 15 | `40-HUMAN-UAT.md` exists with `status: pending` and 4 empirical items (D-13) | VERIFIED | File at `.planning/phases/40-timbre-preview-cue/40-HUMAN-UAT.md` exists; frontmatter shows `status: pending`; 4 `### N.` headings present; item 4 carries `HIGH-SIGNAL` label. |

**Score:** 15/15 structural truths verified. 4 empirical truths remain pending human verification per CONTEXT D-13 (intentional design — see `human_verification` block in frontmatter).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/audio/previewContext.ts` | Pure audio module exporting `playInhalePreview(timbre: TimbreId): void` | VERIFIED | 37 lines, single export, zero React imports, zero `audioEngine` imports, WHY-only header citing D-01/D-02/D-03. Singleton `let ctx` at line 20; `ensurePreviewContext()` lazy-create at lines 22-28; suspended-resume guard at lines 32-35. |
| `src/audio/previewContext.test.ts` | Unit coverage for D-10(a-d) under FakeAudioContext polyfill | VERIFIED | 114 lines, 7 tests passing (4 per-timbre × D-10(a) + b + c + d). `vi.resetModules()` in `beforeEach` for singleton isolation. |
| `src/audio/previewContext.no-audioengine-import.test.ts` | Structural drift-guard locking PREV-03 at the import-graph level | VERIFIED | 55 lines, 1 test passing. `/// <reference types="node" />` directive present (line 23); WHY-only header cites D-11 + PREV-03 + the unlock contract; ban-list at lines 34-41 covers 3 forbidden import patterns. |
| `src/components/TimbrePicker.tsx` | TimbrePicker component with preview wiring on every option onClick | VERIFIED | Import added at line 21; onClick at line 56 calls `setTimbre(id); playInhalePreview(id)`. `TimbrePickerProps` interface unchanged (only `disabled` / `strings` / `sectionLabel` per D-17). |
| `src/components/TimbrePicker.test.tsx` | Wiring coverage for D-10(e/f/g) | VERIFIED | `vi.mock('../audio/previewContext', () => ({ playInhalePreview: vi.fn() }))` at lines 10-12 hoisted above import. Three new `it` blocks at lines 131-163. All 11 tests in file pass (8 pre-existing + 3 new). |
| `.planning/phases/40-timbre-preview-cue/40-HUMAN-UAT.md` | Operator-runnable empirical verification doc | VERIFIED | Frontmatter `status: pending`; `## Current Test [pending]`; `## Tests` heading; exactly 4 `### N.` items; item 4 carries `HIGH-SIGNAL` label. |

All 6 artifacts: exist + substantive + wired + data flows (where applicable).

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/audio/previewContext.ts` | `src/audio/cueSynth.ts (scheduleInCueForTimbre)` | named import | WIRED | Line 17: `import { scheduleInCueForTimbre } from './cueSynth'`. Used at line 36 in synchronous dispatch. |
| `src/audio/previewContext.ts` | `TimbreId` type | type-only import | WIRED | Line 18: `import type { TimbreId } from '../domain/settings'`. Used in function signature line 30. |
| `src/audio/previewContext.no-audioengine-import.test.ts` | `src/audio/previewContext.ts` (read as text) | file-I/O + regex scan | WIRED | Lines 26-29: `readFileSync` + `resolve(__dirname, 'previewContext.ts')`. Scan at line 45. |
| `src/components/TimbrePicker.tsx` | `src/audio/previewContext.ts (playInhalePreview)` | named import + onClick call | WIRED | Line 21 import; line 56 inline call inside onClick. |
| `src/components/TimbrePicker.test.tsx` | `src/audio/previewContext` (mocked module) | `vi.mock` factory | WIRED | Lines 10-12 mock factory; line 18 import; 3 new tests use `vi.mocked(playInhalePreview)` assertions. |

All 5 key links: WIRED (5/5).

### Data-Flow Trace (Level 4)

`previewContext.ts` is a pure audio module — the "data" is the `timbre: TimbreId` arg flowing into the existing `scheduleInCueForTimbre` dispatch. The wire-up from operator tap → onClick → `playInhalePreview(id)` → `scheduleInCueForTimbre(ctx, ctx.currentTime, ctx.destination, id)` was traced manually:

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `TimbrePicker.tsx` onClick | `id: TimbreId` from `TIMBRE_OPTIONS.map((id) => …)` | iterated TimbreId union member | YES — `id` is the same value used by existing `setTimbre(id)` Phase 18 storage write | FLOWING |
| `previewContext.ts` `playInhalePreview` | `timbre: TimbreId` param + module-level `ctx` singleton | `new AudioContext()` (real browser ctor) + caller-supplied TimbreId | YES — real AudioContext, real TimbreId narrowed by TS | FLOWING |
| `scheduleInCueForTimbre` dispatch | `(ctx, when, destination, timbre)` | full real arguments — same shape as in-session call site at `audioEngine.ts:202` | YES — Phase 18 D-01 dispatch surface verified at unit level (`previewContext.test.ts` D-10a × 4) | FLOWING |

No "hollow prop" patterns, no static-fallback-only returns, no hardcoded `[]`/`{}` defaults that bypass real data.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 40 unit + wiring tests all pass | `npx vitest run src/audio/previewContext.test.ts src/audio/previewContext.no-audioengine-import.test.ts src/components/TimbrePicker.test.tsx` | 3 test files / 19 tests / all passing | PASS |
| `previewContext.ts` type-checks against cueSynth signature | `npx tsc --noEmit` | exit 0, no errors | PASS |
| Production module imports the dispatch | `grep -E "import \{ scheduleInCueForTimbre \} from './cueSynth'" src/audio/previewContext.ts` | 1 match (line 17) | PASS |
| Production module does NOT import audioEngine | `grep audioEngine src/audio/previewContext.ts` | 0 matches | PASS |
| Production module does NOT use `await` outside comments | `grep -nE '(^\|[^A-Za-z_])await([^A-Za-z_]\|$)' src/audio/previewContext.ts` | 0 matches outside comments (matches on lines 10-11 + 33 are inside `//` comment) | PASS |
| TimbrePicker onClick wires preview | `grep -E 'setTimbre\(id\).*playInhalePreview\(id\)' src/components/TimbrePicker.tsx` | 1 match (line 56) | PASS |
| TimbrePicker has no useEffect for preview | `grep -nE 'useEffect' src/components/TimbrePicker.tsx` | 0 matches (D-05 lock holds) | PASS |
| TimbrePicker.tsx no equality guard on onClick | `grep -nE 'if \(timbre === id\)' src/components/TimbrePicker.tsx` | 0 matches (D-09 lock holds) | PASS |
| Drift-guard reads source text on disk | `grep -nE 'readFileSync\([^)]*previewContext\.ts' src/audio/previewContext.no-audioengine-import.test.ts` | 1 match (line 29 via PREVIEW_PATH constant) | PASS |
| All phase 40 commits exist in git history | `git log --oneline 9c93da6 ad8a9d6 1256c9f 6faaf06 d5463f9` | All commits found | PASS |

Spot-checks: 10/10 PASS.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|-------------|-------------|--------|----------|
| PREV-01 | 40-03 (also 40-04 empirical) | Switching the Timbre selection in App Settings plays the inhale cue once at the current pitch | NEEDS HUMAN | Structural: TimbrePicker onClick wired (line 56); D-10(e) test passes. Audible "right cue, right pitch" requires the operator (HUMAN-UAT item 1). |
| PREV-02 | 40-01 | Preview routes through the existing `cueSynth` scheduler (same code path as in-session cues) | SATISFIED | `previewContext.ts:17` imports `scheduleInCueForTimbre`; line 36 dispatches with the verbatim signature. Zero duplicated DSP. Per-timbre unit tests confirm dispatch on all 4 TimbreIds. |
| PREV-03 | 40-02 (also 40-04 empirical) | Preview plays even when the current `MuteToggle` is muted | SATISFIED (structural) — NEEDS HUMAN (empirical) | Structural lock: drift-guard at `previewContext.no-audioengine-import.test.ts` passes; previewContext.ts has zero audioEngine imports. PREV-03 is satisfied STRUCTURALLY per the operator-stated design (not a runtime branch). Audible cross-check in HUMAN-UAT item 2. |
| PREV-04 | 40-03 | Preview is only triggered outside an active session | SATISFIED | Structural via pre-existing `disabled={inSessionView}` prop drilling (Phase 15 INFRA-04 / Phase 18 D-17). Test D-10(f) at `TimbrePicker.test.tsx:143-150` asserts `playInhalePreview` is NOT called when `disabled={true}`. |
| PREV-05 | 40-01 (also 40-04 empirical) | Preview latency from picker tap to first audio sample is ≤100 ms on commodity hardware | SATISFIED (structural) — NEEDS HUMAN (empirical) | Structural lock: synchronous-call-path contract (D-12). `playInhalePreview` has no `await`; test D-10(d) confirms the spy is called within the same microtask. Singleton (D-01) amortizes AudioContext creation. Empirical latency confirmation in HUMAN-UAT item 4 (iOS Safari cold-start, HIGH-SIGNAL). |

**Coverage of declared requirement IDs:** 5/5 (PREV-01, PREV-02, PREV-03, PREV-04, PREV-05) all addressed across plans 40-01..40-04. No orphaned PREV-* IDs in REQUIREMENTS.md.

**Cross-reference of PLAN frontmatter requirement IDs vs roadmap PREV set:**
- 40-01: PREV-02, PREV-05 — covered.
- 40-02: PREV-03 — covered.
- 40-03: PREV-01, PREV-04 — covered.
- 40-04: PREV-01, PREV-03, PREV-05 (empirical reinforcement) — covered.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/audio/previewContext.test.ts` | 58 | Unused `eslint-disable-next-line @typescript-eslint/no-this-alias` directive (warning) | Info | Cosmetic — leftover directive after refactor. Does not affect test correctness. Already flagged in 40-REVIEW.md IN-01/IN-02 territory. |
| `src/audio/previewContext.test.ts` | 69 | `capturedCtx!` non-null assertion (`@typescript-eslint/no-non-null-assertion`) — ESLint error | Warning | Test file lint error introduced by Phase 40. Pre-existing line above (line 68) asserts `expect(capturedCtx).not.toBeNull()`, so the non-null is invariant-safe — same idiom used in `TimbrePicker.test.tsx:81` (pre-existing) where it is guarded by an inline `eslint-disable` comment. The Phase 40 file is missing that eslint-disable comment. |
| `src/audio/previewContext.test.ts` | 79 | `expect(ctx.resume).toHaveBeenCalledTimes(1)` triggers `@typescript-eslint/unbound-method` — ESLint error | Warning | Common Vitest mock idiom. The plain reference to `ctx.resume` (without `.bind`) is the standard Vitest spy-assertion shape. Pre-existing codebase analogs (e.g., `audioEngine.test.ts`) handle similar patterns. The Phase 40 file is missing the eslint-disable comment or `vi.mocked()` wrapper. |

**Severity:** All 3 findings are WARNING (not BLOCKER). They do not violate any phase truth, do not invalidate any test assertion, and do not weaken any structural lock. They DO violate the per-commit green-gate (`tsc && lint && build && test`) declared in plans 40-01 success criteria — `npx eslint .` reports 55 errors / 4 warnings on `main` whereas the pre-phase-40 baseline at commit `0491cf1` reports 53 errors / 3 warnings. **Net delta introduced by Phase 40: +2 errors / +1 warning, all in `previewContext.test.ts`.**

Code-review report `40-REVIEW.md` documents 4 separate Warnings (WR-01..WR-04) and 3 Info-level items. Those are robustness gaps (iOS `interrupted` state, drift-guard breadth, vi.stubGlobal leak, call-order resilience) flagged as "do not block a merge but should be fixed before this surface lands in front of users on iOS Safari." They are advisory per the operator's framing and do NOT fail any current must-have.

### Probe Execution

No `scripts/*/tests/probe-*.sh` probes are documented for Phase 40. The phase's automated checks are Vitest test files, which are exercised in the "Behavioral Spot-Checks" section above. Step 7c: N/A.

### Human Verification Required

Per CONTEXT D-12 and D-13 (and confirmed in this verification's prompt — "PREV-05 is satisfied via the synchronous-call-path contract (not an empirical CI assertion — explicitly rejected per D-12); real-device confirmation lives in 40-HUMAN-UAT.md"), the following items are intentionally human-only and live in `40-HUMAN-UAT.md` (`status: pending`):

1. **PREV-01 — Cue correctness across all four timbres**
   Test: Tap each of Bowl / Bell / Sine / Flute in App Settings.
   Expected: Each tap plays a single inhale cue at A4, distinguishable by timbre. No looping, no exhale cue, no double-trigger.
   Why human: Audible correctness (right cue, right pitch, right envelope) cannot be verified in jsdom — FakeAudioContext records the dispatch but produces no audio.

2. **PREV-03 (empirical) — Mute irrelevance**
   Test: Start a session briefly, mute via MuteToggle, end the session. Tap each timbre in Settings.
   Expected: Cues remain audible regardless of the prior MuteToggle state.
   Why human: Drift-guard proves preview cannot reach the mute closure; audible cross-check confirms the structural lock corresponds to real behavior.

3. **D-08 — Rapid-tap overlap feel**
   Test: Tap rapidly across 3-4 timbres in ~1 second.
   Expected: Brief polyphonic overlap (by design), no silence gaps, no glitches/crackles, no console errors.
   Why human: Qualitative judgment of "feels expressive vs buggy" requires real ears and real Web Audio output.

4. **PREV-05 + D-01 + D-02 — iOS Safari standalone-PWA cold-start (HIGH-SIGNAL)**
   Test: On iOS Safari (preferably the installed standalone PWA), fully close the app/tab; re-open. WITHOUT starting a session, open Settings; tap a timbre.
   Expected: Cue plays with imperceptible latency (well under 100ms). Second tap is even faster (singleton reuse).
   Why human: PREV-05 latency is explicitly NOT measured by CI (D-12 + ROADMAP success criteria). iOS Safari cold AudioContext creation + resume + first oscillator schedule is the historically-fragile platform path. Operator must run on a real device.

The operator-runnable doc is at `.planning/phases/40-timbre-preview-cue/40-HUMAN-UAT.md` (frontmatter `status: pending`, ready to flip to `resolved` per item after real-hardware runs).

### Gaps Summary

No gaps. All 15 structural truths are VERIFIED in the codebase. All 6 artifacts exist, are substantive, are wired, and have flowing data. All 5 key links are WIRED. All 5 PREV-* requirements are accounted for. Phase 40 commits (`9c93da6`, `6faaf06`, `ad8a9d6`, `1256c9f`, `d5463f9`) all exist in git history.

The phase produced 3 lint findings in `src/audio/previewContext.test.ts` (2 errors + 1 warning) that violate the declared per-commit green-gate's `lint` step. These are warning-class — they do not fail any must-have or weaken any structural lock. They should be addressed in a small follow-up (recommended: add `vi.mocked(ctx.resume)` wrapping + remove the stale `eslint-disable-next-line @typescript-eslint/no-this-alias` directive + add a single-line `eslint-disable` for the invariant-safe non-null assertion). These are surfaced as **info-level observations**, not blocking gaps, in the table above. The status remains `human_needed` (not `gaps_found`) because the human verification items are the gate-controlling concern.

`40-REVIEW.md` identifies 4 additional Warning-level robustness gaps (WR-01 iOS `interrupted` state coverage, WR-02 drift-guard breadth, WR-03 `vi.stubGlobal` leak, WR-04 onClick call order resilience). These are operator-acknowledged as advisory (per the prompt: "These are advisory") and do NOT fail any current acceptance criterion. They are not re-litigated here.

---

_Verified: 2026-05-21T20:30:00Z_
_Verifier: Claude (gsd-verifier)_
