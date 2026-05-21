# Phase 40: Timbre preview cue — Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Add an audible inhale-cue preview to the Timbre picker — tapping a timbre option in the existing `SettingsDialog` (Phase 43 will move this picker into a new App Settings page; the preview wiring rides along verbatim) fires the inhale cue once at the locked A4 fundamental (`TIMBRE_PRESETS[timbre].fundamentalHzIn = 440 Hz`, Phase 18 TIMBRE-05 / D-21). The preview routes through the existing per-timbre dispatch `scheduleInCueForTimbre(audioCtx, when, dest, timbre, phaseDurationSec?)` in `src/audio/cueSynth.ts` (Phase 18 D-01) — no duplicated DSP, no new oscillator graph. The preview plays regardless of MuteToggle (PREV-03) because muting lives only inside the `audioEngine` instance (`audioEngine.ts:160 let muted`), and the preview path never imports `audioEngine` — PREV-03 is satisfied *structurally*, not by a runtime branch. The preview is suppressed during an active session (PREV-04) because TimbrePicker already receives `disabled={inSessionView}` from `SettingsDialog` (Phase 15 INFRA-04 / Phase 18 D-17) — the button is non-interactive, onClick never fires.

**In scope:**
- Add `src/audio/previewContext.ts` — new pure audio module, sibling to `cueSynth.ts` / `audioEngine.ts` / `nkCueSynth.ts`. Exports a single bare function `playInhalePreview(timbre: TimbreId): void`. Internally holds a module-level `let ctx: AudioContext | null = null` singleton + a lazy-create-or-reuse + resume-if-suspended helper.
- Edit `src/components/TimbrePicker.tsx` onClick — add a direct call to `playInhalePreview(id)` alongside the existing `setTimbre(id)`. Fire-and-forget. Synchronous.
- Add `src/audio/previewContext.test.ts` — unit tests under the existing `FakeAudioContext` polyfill (Phase 3): one cue per call, ctx.resume() invoked when suspended, singleton reuse across calls, natural decay (phaseDurationSec omitted).
- Edit `src/components/TimbrePicker.test.tsx` — add 2–3 wiring cases: tap fires `playInhalePreview(id)` with the right TimbreId (mock the module), tap during `disabled=true` does NOT invoke the preview spy (PREV-04), same-id re-tap fires the preview (re-audition semantics).
- Add a structural import-graph test (mechanism: planner picks shape — likely a small Vitest `fs.readFileSync` scan + regex, similar to Phase 39's `content.no-removed-themes.test.ts`) asserting `src/audio/previewContext.ts` imports neither `./audioEngine` nor any mute state. Locks PREV-03 against future refactors.
- Add `40-HUMAN-UAT.md` with 3–4 empirical items (cue correctness, mute irrelevance, rapid-tap overlap feel, iOS Safari cold-start).

**Out of scope (other phases):**
- New audio surfaces beyond the inhale preview (no exhale preview, no countdown-tick preview, no end-chord preview) — PREV-01 is inhale-only.
- Any change to `cueSynth.ts` internals, `TIMBRE_PRESETS`, oscillator graphs, or `audioEngine.ts`. Preview consumes the existing per-timbre dispatch as-is.
- The Phase 43 App Settings page surface where TimbrePicker will live in v2.0 (the picker file survives Phase 43; only its host container changes — no Phase 40 preview wiring needs to be re-done).
- A user-facing master-volume control / preview-volume slider. The preview plays through `ctx.destination` directly at the timbre's preset `peakGain`.
- Visual feedback during preview (no flash, no waveform animation, no haptic). The audible cue is the feedback.
- An empirical-CI latency benchmark for PREV-05 (jsdom + fake timers can't reflect real Web Audio latency). The synchronous-call-path contract is the load-bearing argument; real-device confirmation lives in `40-HUMAN-UAT.md`.
- Re-introduction of any non-inhale cue type into the preview surface (rejected as scope creep).

</domain>

<decisions>
## Implementation Decisions

### AudioContext lifecycle

- **D-01:** **Module-level singleton inside a new pure `src/audio/previewContext.ts`.** Lazy-create the `AudioContext` on the first preview tap (`new AudioContext()` is a user-gesture-allowed call because every entry point is a tap onClick — same invariant as v1.0.1 Phase 5/5.1 / Phase 9 audioEngine creation). Reuse the same context for every subsequent preview. Never `.close()` — context survives until tab teardown. Cheapest path to PREV-05 (≤100ms) on tap N+1 (no per-tap creation latency). Cost is one idle `AudioContext` per tab, which is negligible when no oscillator is active. Rejected alternative: fresh-per-tap (5–20ms creation latency on every tap eats the latency budget) and share-with-session (preview is gated by `inSessionView=true` per PREV-04 — session and preview never coexist, so the share branch is dead code).

- **D-02:** **Resume-if-suspended on every preview tap.** Before scheduling the cue: `if (ctx.state === 'suspended') ctx.resume()`. The tap itself is a user gesture, so resume is allowed. No-op cost when the context is already running. Closes the iOS Safari + Chrome-background-tab auto-suspend gap that bit v1.0.1 Phase 9 in a different code path. Fire `scheduleInCueForTimbre` synchronously after the `resume()` call (don't `await` — Web Audio scheduling tolerates a same-tick resume + schedule pair).

- **D-03:** **Omit `phaseDurationSec` in the preview call** → natural decay per preset. Each `TIMBRE_PRESETS[timbre]` carries its own `decayTau*` (~1.4s for Bowl, shorter for Bell/Sine, ~0.13s soft-attack + release for Flute per Phase 35 AUDIO-01); the natural envelope IS the audition shape. BPM/practice coupling explicitly rejected — the timbre picker is practice-agnostic chrome and the preview must stay so.

### Wiring location

- **D-04:** **Direct import + inline call in `TimbrePicker.tsx` onClick** — no new hook, no fold into `setTimbre`. `TimbrePicker.tsx` adds an import `import { playInhalePreview } from '../audio/previewContext'`; the onClick becomes `() => { setTimbre(id); playInhalePreview(id); }`. Preserves Phase 18 D-16 (timbre body still lives in `TimbrePicker.tsx` + `useTimbreChoice.ts`; the new file is an `src/audio/` peer, not a third file in the timbre body). Survives Phase 43 verbatim — the new App Settings page hosts the same TimbrePicker component, no preview re-wire.

- **D-05:** **Trigger source = onClick handler only.** Explicitly NOT a `useEffect(() => playInhalePreview(timbre), [timbre])`. The hook-based trigger would re-fire on cross-tab `storage` propagation through `useTimbreChoice` (Phase 8/16/14 pattern carries cross-tab listeners), causing the preview to emit audio from an inactive tab when the user changes timbre in another tab — bad. The onClick-only path attaches the preview to the user gesture, which also satisfies the iOS audio-gesture invariant in one move.

- **D-06:** **API surface of `previewContext.ts` = single function: `playInhalePreview(timbre: TimbreId): void`.** Fire-and-forget. All lifecycle (lazy-create + resume + schedule) stays inside the module. No exported `getPreviewContext()`, no class, no object. Mirrors the existing `src/audio/cueSynth.ts` and `nkCueSynth.ts` module style (bare function exports). Internal helpers (`ensurePreviewContext()` / `resumeIfSuspended()`) stay module-private.

### PREV-04 (no preview during active session)

- **D-07:** **Trust the existing `disabled={inSessionView}` invariant.** TimbrePicker buttons receive `disabled` + `aria-disabled` during a session (Phase 15 INFRA-04 / Phase 18 D-17); the browser refuses the click; onClick never fires; `playInhalePreview` is never called. PREV-04 is structurally satisfied by an invariant already locked since Phase 18. `previewContext.ts` stays pure — no session-state knowledge, no `isSessionActive` arg, no global flag. Verification is a single TimbrePicker test case asserting the preview spy is not invoked when `disabled={true}` is rendered.

### Rapid-tap / overlap + re-tap semantics

- **D-08:** **Let cues overlap naturally.** Each tap calls `scheduleInCueForTimbre(ctx, ctx.currentTime, ctx.destination, timbre)` independently; cueSynth spins up its own oscillator graph + envelope per call with its own `ended` cleanup (Phase 9 AUDIO-04 explicit-disconnect contract). Brief polyphonic overlap during rapid auditioning is *expressive*, not a defect — it matches how cueSynth already behaves in-session when cues queue at boundaries. Cost: zero state, zero handle tracking, no new `cueSynth` exports. Rejected: cancel-prior (would require a new `stop(handle)` cueSynth export — scope creep into a settled module); debounce (any debounce > 0ms eats the PREV-05 100ms latency budget on the first tap of a burst).

- **D-09:** **Fire on every tap, including same-id re-tap.** `onClick={() => { setTimbre(id); playInhalePreview(id); }}` — unconditional, no equality check. `setTimbre(id)` is a benign no-op write when id matches (savePrefs absorbs the identity write). The user model is "tap = audition" — selecting the currently-active timbre to re-hear it is a feature, not an accident. Strict literal reading of PREV-01 ("Switching the Timbre selection plays...") is interpreted as operator-intent for *audition* (not change-detection); the rationale in REQUIREMENTS.md PREV-01 ("operator-added requirement, lands the audio surface change") supports the audition reading.

### Test posture

- **D-10:** **Split test layout: `previewContext.test.ts` (unit) + `TimbrePicker.test.tsx` additions (wiring).** Unit cases at `src/audio/previewContext.test.ts` under the existing `FakeAudioContext` polyfill (Phase 3): (a) one `scheduleInCueForTimbre` call per `playInhalePreview` invocation, with the correct TimbreId arg, (b) `ctx.resume()` called when initial `ctx.state === 'suspended'`, (c) AudioContext is reused (same instance) across N consecutive calls, (d) `phaseDurationSec` arg is `undefined` (natural decay). Wiring cases added to `src/components/TimbrePicker.test.tsx` (via `vi.mock('../audio/previewContext')`): (e) tap fires `playInhalePreview` with the right id, (f) tap during `disabled={true}` does NOT invoke the preview spy (PREV-04 wiring), (g) same-id re-tap fires the preview (re-audition semantics — D-09). Mirrors the existing `cueSynth.test.ts` + `TimbrePicker.test.tsx` separation pattern.

- **D-11:** **PREV-03 (preview plays when muted) locked via structural import-graph test.** A small Vitest case reads the `src/audio/previewContext.ts` source and asserts it imports neither `./audioEngine` nor any module that re-exports the engine's `muted` state. Since `setMuted` lives ONLY inside the engine instance (`audioEngine.ts:160 let muted` closure), proving the import absence proves the preview cannot be muted by `setMuted`. Mirrors the drift-guard-as-lock pattern (Phase 26 I18N-07 / Phase 37 STATS-05 / Phase 38 VAR-06 / Phase 39 THM-01..03) at the import-graph level rather than the source-text level. Test filename: planner picks (`previewContext.no-audioengine-import.test.ts` is the closest analog naming; `previewContext.test.ts` could also absorb it as one extra case).

- **D-12:** **PREV-05 (≤100ms latency) locked via the synchronous-call-path contract** — NOT an empirical CI assertion. The argument: `playInhalePreview` calls `scheduleInCueForTimbre` synchronously in the same microtask (no `await`, no `setTimeout`, no debounce); browser-side latency is dominated by `ctx.resume()` (typically 10–40ms cold; 0–2ms warm) + oscillator scheduling — well under 100ms on commodity hardware. A unit test asserts the contract: spy on `scheduleInCueForTimbre`, call `playInhalePreview`, assert the spy was called within the same microtask (no `await` between). Empirical confirmation lives in `40-HUMAN-UAT.md`. JSdom + fake-timer benchmarks are explicitly rejected (give false confidence; don't reflect real Web Audio latency).

- **D-13:** **Produce a small `40-HUMAN-UAT.md` with 3–4 items.** (1) Tap each timbre once, confirm correct inhale cue at A4 (PREV-01). (2) Mute via MuteToggle, then tap timbres — cues still audible (PREV-03 empirical). (3) Tap rapidly across 3–4 timbres — overlap feels OK, no glitches (D-08 empirical). (4) iOS Safari standalone-PWA: tap a timbre *before* any session has run in this app launch — cue plays (the cold AudioContext + resume path; this is the iOS-sensitive case, closest to the v1.x carry-forward audio bug). Mirrors the Phase 28 / 29 HUMAN-UAT.md pattern.

### Claude's Discretion

- **Filename of the structural import-graph test** (`previewContext.no-audioengine-import.test.ts` vs absorbing it as one case inside `previewContext.test.ts`) — planner picks based on test-organization clarity during PATTERNS pass.
- **Internal helper names inside `previewContext.ts`** (`ensurePreviewContext()` / `resumeIfSuspended()` / `getOrCreateContext()` — exact names not load-bearing; planner picks).
- **Plan-structure grouping** (atomic commit splits vs single combined commit) — Tiger Style "small atomic commits" + Phase 36/37/38/39 PATTERNS precedent favor split. Suggested order: (1) `previewContext.ts` + `previewContext.test.ts` (pure audio module, no UI), (2) `TimbrePicker.tsx` wiring + `TimbrePicker.test.tsx` additions, (3) structural import-graph test (if its own file), (4) `40-HUMAN-UAT.md`. Planner may reorder if dependency analysis flips it.
- **Whether the structural import-graph test also forbids `import * from '../hooks/useAudioCues'`** (in case future refactor moves muted-state up to a hook) — planner picks the cleaner ban-list at PATTERNS time. The minimal lock is `./audioEngine`.
- **Tiger Style WHY-only comments inside `previewContext.ts`** — planner picks. The non-obvious WHYs that warrant comments: (a) the `D-01` singleton-reuse rationale (latency target), (b) the `D-02` resume-on-every-tap rationale (iOS/auto-suspend), (c) the `D-03` omit-phaseDurationSec rationale (natural decay). Constants and trivial helpers stay un-commented (identifiers do the work).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spike & milestone alignment
- `.planning/spikes/MANIFEST.md` §Requirements — operator-added requirement; not from spike-010 directly. Phase 40 is the audio surface change that lands before TOK (Phase 41).
- `.planning/PROJECT.md` §Current Milestone: v2.0 New Design — frames Phase 40 between procedural-debt closeout (36–39) and the visual rebuild (41–43).
- `.planning/ROADMAP.md` §Phase 40 — goal + 4 ROADMAP success criteria (PREV-01..05).
- `.planning/REQUIREMENTS.md` §PREV — PREV-01..05 normative statements (lines 65–73).

### Pattern analogs (planner reuses these in PATTERNS.md)
- `src/audio/cueSynth.ts:198–207` — `scheduleInCueForTimbre(audioCtx, when, destination, timbre, phaseDurationSec?)` — **the load-bearing API. Preview consumes this verbatim.** PREV-02 satisfied at the call-site, not by new DSP.
- `src/audio/audioEngine.ts:123–129, 160` — `createAudioEngine` shows the user-gesture-attached `new AudioContext()` pattern. Phase 40 reuses the same gesture-attachment invariant but in a separate singleton (the engine's context is per-session; the preview's is per-tab).
- `src/audio/cueSynth.test.ts` — example test scaffold under FakeAudioContext polyfill; structural twin for `previewContext.test.ts` (D-10).
- `src/components/TimbrePicker.tsx` — the only edit site for D-04 onClick wiring. Phase 18 D-16 invariant: timbre body stays in this file + `useTimbreChoice.ts`.
- `src/components/TimbrePicker.test.tsx` — host for D-10 wiring tests (e/f/g). Existing test patterns cover the radio-group + disabled-prop shape.
- `.planning/phases/35-flute-cue/` (in `.planning/milestones/v1.5-phases/`) — Phase 35 / AUDIO-01..02 is the most recent timbre work; Flute preset + soft-attack envelope mode on cueSynth. Reference for "how a small audio-path change is shaped" + the test scaffold.
- `.planning/phases/18-timbres/` (in `.planning/milestones/v1.1-phases/`) — Phase 18 TIMBRE-01..05 / D-01 / D-16 / D-17 / D-21 — the per-timbre dispatch, the locked A4/A3 fundamentals, and the "timbre body in TimbrePicker.tsx + useTimbreChoice.ts" invariant that D-04 preserves.
- `.planning/phases/39-theme-simplification/39-CONTEXT.md` — most recent CONTEXT.md; reference shape for Phase 40 CONTEXT structure + the drift-guard-as-lock pattern (D-11 mirrors D-03..D-06 at the import-graph level).

### Codebase touchpoints (full path list — feeds the planner directly)
- **NEW** `src/audio/previewContext.ts` — D-01 singleton + D-02 resume-if-suspended + D-06 `playInhalePreview(timbre)` bare-function export. Pure module (no React imports).
- **NEW** `src/audio/previewContext.test.ts` — D-10(a–d) unit cases under FakeAudioContext polyfill.
- **NEW** `src/audio/previewContext.no-audioengine-import.test.ts` (or absorbed into `previewContext.test.ts` — Claude's Discretion) — D-11 structural import-graph test.
- **NEW** `.planning/phases/40-timbre-preview-cue/40-HUMAN-UAT.md` — D-13 (3–4 empirical items).
- `src/components/TimbrePicker.tsx:55` — D-04 onClick edit: add `playInhalePreview(id)` call alongside `setTimbre(id)`. Import added at top of file.
- `src/components/TimbrePicker.test.tsx` — D-10(e–g) wiring case additions; `vi.mock('../audio/previewContext')` to spy on `playInhalePreview`.
- `src/audio/cueSynth.ts:198–207` — **READ ONLY** (no edits). The dispatch signature is the contract Phase 40 consumes.
- `src/audio/timbres.ts` — **READ ONLY**. `TIMBRE_PRESETS[timbre].fundamentalHzIn = 440` confirms PREV-01's "current pitch" semantics.
- `src/audio/audioEngine.ts:160` — **READ ONLY**. Locates the `let muted` closure that D-11's structural test proves the preview can't reach.
- `src/components/SettingsDialog.tsx:95` — **READ ONLY**. Confirms the `disabled={inSessionView}` prop wiring that D-07 / PREV-04 relies on.
- `src/hooks/useTimbreChoice.ts` — **READ ONLY**. Confirms `setTimbre` write semantics (no audio side-effects today; D-04 keeps it that way by NOT folding preview into setTimbre per the rejected option C).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`scheduleInCueForTimbre(audioCtx, when, destination, timbre, phaseDurationSec?)`** (`src/audio/cueSynth.ts:198`) — **the load-bearing reuse.** Phase 18 D-01 per-timbre dispatch surface; takes a session-captured TimbreId in the in-session caller (audioEngine.ts:202, 217). Phase 40 calls it with `phaseDurationSec` omitted (D-03) for natural decay. PREV-02 satisfied by reuse, not by new code.
- **`TIMBRE_PRESETS`** (`src/audio/timbres.ts:31`) — pure data record keyed by `TimbreId`, providing `fundamentalHzIn = 440` (A4) for every preset. No Phase 40 edits; the preview consumes the existing data unchanged.
- **`FakeAudioContext` polyfill** (in `vitest.setup.ts`, established Phase 3) — already covers all existing cueSynth tests. `previewContext.test.ts` (D-10) inherits the same polyfill setup; no new test infrastructure needed.
- **`AudioContext` user-gesture-attachment invariant** (Phase 5/5.1, Phase 9, Phase 27 PWA-03) — `new AudioContext()` must be called from a click/tap handler. The preview tap IS that gesture, so the D-01 singleton's first-time creation is gesture-attached by construction.
- **`useTimbreChoice` `{ timbre, setTimbre }` API** (`src/hooks/useTimbreChoice.ts:29`) — unchanged by Phase 40. D-04 keeps the preview call as a sibling of `setTimbre(id)` in onClick, not a wrapping/coupling of it.
- **`disabled={inSessionView}` prop drilling** (`src/components/SettingsDialog.tsx:95` → `TimbrePicker.tsx:54`) — Phase 15 INFRA-04 / Phase 18 D-17 invariant. D-07 / PREV-04 lean on this entirely — no new state management needed.

### Established Patterns
- **Pure-audio modules in `src/audio/`** (cueSynth.ts, nkCueSynth.ts, timbres.ts, audioEngine.ts) — bare function exports, zero React, all `AudioContext` lifecycle inside the module. D-06 mirrors this style for `previewContext.ts`.
- **Lazy-with-singleton pattern** — not previously used in this codebase for AudioContext (audioEngine.ts creates fresh contexts per session via `createAudioEngine`). Phase 40 introduces it deliberately for the preview surface; the WHY is the PREV-05 latency budget. Document the choice in a WHY-only comment per Tiger Style.
- **Drift-guard-as-lock** (Phase 26 I18N-07 / Phase 37 STATS-05 / Phase 38 VAR-06 / Phase 39 THM-01..03) — D-11 extends this pattern to the import-graph level. Future "helpfully wire engine into preview" refactors fail the test loudly.
- **Atomic commit per logical change scoped `(40)`** (Tiger Style, reinforced by Phase 36/37/38/39 PATTERNS) — small, focused commits in the suggested order from D-13/Claude's Discretion.
- **Per-commit green gate** (`tsc && lint && build && test`, Phase 7 D-09 / Phase 11 D-17 / Phase 12 D-15) — every commit on Phase 40 must pass; carries forward from v1.0.1.
- **HUMAN-UAT.md per audio/iOS-sensitive phase** (Phase 27 PWA-03, Phase 28 INSTALL-01..05, Phase 29 INSTALL-06..07) — D-13 follows this precedent for the iOS Safari cold-start path.

### Integration Points
- **TimbrePicker.tsx onClick** (`src/components/TimbrePicker.tsx:55`) — the one and only UI integration point. Edit shape: import `playInhalePreview` from `../audio/previewContext`; change `onClick={() => { setTimbre(id) }}` to `onClick={() => { setTimbre(id); playInhalePreview(id) }}`. ~3 lines changed.
- **Phase 43 App Settings page (UX-01/02)** — the TimbrePicker component is hoisted into a new App Settings page surface. The preview wiring travels with the component file unchanged (D-04 / D-05) — Phase 43 inherits Phase 40 with zero re-wire effort.
- **No audioEngine integration** — by design (D-11). The preview path and the session-audio path remain disjoint in the import graph. The structural test enforces this.
- **No interaction with v1.x carry-forward iOS audio recovery bug** — that bug is OS-level session loss after lock/unlock during a session. Phase 40's preview is outside sessions and short-lived; cold-start iOS coverage is handled by D-13 HUMAN-UAT item 4.

</code_context>

<specifics>
## Specific Ideas

- The D-11 structural import-graph test is the load-bearing artifact for PREV-03 — treat as a first-class deliverable, equal weight to the actual preview code. It's how the "preview plays when muted" invariant survives Phase 41+ refactors.
- The D-04 onClick edit is the smallest meaningful UI diff in the milestone so far (≈3 lines). The plan should not embellish — keep the TimbrePicker.tsx edit surgical.
- The D-01 singleton is the only place in the codebase that holds an `AudioContext` across renders/sessions. Document this WHY-only in the module header comment so future readers don't "fix" it by moving the context into `audioEngine.ts`.
- The HUMAN-UAT.md iOS Safari cold-start item (D-13 item 4) is the highest-signal manual test — covers AudioContext creation + resume + first oscillator schedule on the platform that historically breaks audio invariants. Don't skip it.
- Phase 40 is the only v2.0 phase between procedural cleanup (36–39) and the visual rebuild (41–43); keep the scope tight so it doesn't accumulate "while we're in the audio path" creep into Phase 41/42's chrome.

</specifics>

<deferred>
## Deferred Ideas

- **Exhale-cue preview** — explicitly out of scope per PREV-01 ("inhale cue once"). If ever wanted, would be a future product decision, not a Phase 40 extension.
- **Countdown-tick or end-chord preview surfaces** — out of scope; PREV-01 is inhale-only.
- **Master-volume / per-cue volume slider** — out of scope; preview plays at `TIMBRE_PRESETS[timbre].peakGain` through `ctx.destination` directly. If introduced later, it would compose at the destination boundary.
- **Visual feedback during preview** (flash, waveform animation, haptic) — out of scope; the audible cue is the only feedback.
- **Empirical CI latency benchmark for PREV-05** — explicitly rejected (D-12). If real-device latency regressions ever appear, the response is to instrument the path in production / dev-tools, not retrofit a jsdom benchmark.
- **Custom event bus for timbre changes** — rejected during discussion (D-05 alternative). If ever needed (e.g., Phase 43 surfacing a global "settings changed" announcement), it would be an independent concern.
- **App Settings page where TimbrePicker will live in v2.0** — **Phase 43** (UX-01/02). Phase 40 wiring carries forward verbatim.
- **`MuteToggle.tsx:52` chrome alignment to `borderSoft`/`textSoft`** — Phase 42 ORB-10 (carried from prior context).
- **Tone (volume) controls per timbre** — explicitly excluded by REQUIREMENTS.md §Out of Scope (no voice/audio depth beyond cue picker).
- **Preview during running session via some dev toggle** — explicitly rejected by PREV-04. The MuteToggle is the in-session audio control; the picker is not interactive during sessions.

</deferred>

---

*Phase: 40-timbre-preview-cue*
*Context gathered: 2026-05-21*
