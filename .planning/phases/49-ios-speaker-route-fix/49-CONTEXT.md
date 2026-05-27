# Phase 49: iOS speaker route fix - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Coerce iOS Safari's audio session category from "ambient" to "playback" so a user on iOS Safari with the silent switch ON and no headphones connected hears app cue audio through the device speaker. Technique: a silent looping `<audio playsInline>` element started on the same user-gesture chain that constructs the `AudioContext`, torn down on `AudioContext` close. Closes long-standing iOS routing quirk (`audio-animation-three-clocks-diagnosis.md` issue #6).

Out of scope (future v2.2 phases): SessionClock abstraction (Phase 50), master clock unification (Phase 51), visibility-resume clamp + lookahead scheduling (Phase 52), master-gain mute (Phase 53). Continuous ambient layer (AMBIENT-F1) is a deferred forward-looking seed that would naturally subsume this trick — captured, not in scope here.

</domain>

<decisions>
## Implementation Decisions

### Element ownership
- **D-01:** The silent `<audio>` element lives **inside `createAudioEngine()`** — constructed programmatically as `new Audio(silentWavDataUrl)` immediately after `new AudioContext()` in the same synchronous head of the factory, before any `await`. Element lifecycle is owned by the engine: started by the gesture-chain `play()` inside `createAudioEngine()`, paused + nulled inside `engine.close()`. Preserves the engine's "Zero React imports" invariant (`audioEngine.ts:1`). Hooks and components stay unchanged.

### iOS gating strategy
- **D-02:** **Always-on, no UA gating.** The silent loop runs on every browser/platform that successfully constructs an `AudioContext`. Zero UA sniffing — spec hint "either gate by user-agent, or just accept that other platforms cheaply have a silent loop running — measure first" is resolved in favor of the simpler code path. Validation (IOS-04) will measure non-iOS regression; if measurable, the gate is reintroduced as a follow-up.

### Silent buffer source
- **D-03:** **Inline base64 data URL of a tiny real WAV** stored as a module-level constant in `audioEngine.ts`. Format: 8 kHz mono PCM, ~0.1 s of near-zero amplitude samples (real decodable content per spec — NOT digital silence). No `public/` asset, no `OfflineAudioContext` runtime rendering, no encoder helper. Constant is exported only if a test needs to assert on it; otherwise file-local.

### Phase 5.1 reconstruction interaction
- **D-04:** **Mirror engine lifecycle exactly** — a new `<audio>` element is constructed per `createAudioEngine()` call and torn down inside that engine's `close()`. During `reconstructEngine()` (`useAudioCues.ts:310`+), the old element pauses + detaches with the old engine's close, and the new element starts inside the new engine's construction — **inside the same gesture token that constructs the new `AudioContext`** (the sync-first-construct invariant from Plan 06 Task 8 — `useAudioCues.ts:296-309` — extends to the new element's `.play()` call: no awaits between `new AudioContext()`, `new Audio(...)`, and `audioElement.play()` on the construction head). Brief iOS session-category drop window between old-element pause and new-element play is accepted as ~ms-scale and consistent with the existing reconstruct beat.

### Element wiring (locked by spec, restated for downstream agents)
- **D-05:** Audio element attributes: `playsInline=true`, `loop=true`, `muted=false`, `volume` near-zero but non-zero (suggested starting value `0.0001`; final value resolved at plan time with one device-test pass to confirm iOS still treats it as a "real" track). Source MUST be a real decodable WAV (not empty / not pure-silence).
- **D-06:** The `.play()` call MUST happen on the user-gesture chain head, before any `await`. Pattern mirrors `new AudioContext()` invariant: same gesture-token-consuming rule applies to media-element autoplay policy.
- **D-07:** No autoplay on page load. The element is `new Audio(...)` constructed only inside `createAudioEngine()` (which is itself only callable from a gesture chain via `useAudioCues.start()` / `reconstructEngine()`). No DOM presence before the first Start click.
- **D-08:** Teardown: `engine.close()` pauses the element, clears its `src` (to release the decode buffer), and drops the reference. Done before `await audioCtx.close()` in the existing close sequence (insert before the existing in-flight-cue disconnect loop at `audioEngine.ts:317`).

### Failure-mode handling
- **D-09:** If the element's `.play()` promise rejects (autoplay policy regression, codec issue, etc.), **silent absorb** — same posture as `audioEngine.ts:139-143` (resume rejection on AC) and `useAudioCues.ts:257-269` (start failure). The session proceeds; iOS silent-switch users simply don't get speaker routing — i.e., behavior is no worse than pre-Phase-49. No new `audioStatus` state is introduced; the existing `'failed'` / `'needs-resume'` state machine is untouched.

### Claude's Discretion
- Exact base64 WAV byte sequence (any near-zero-amplitude valid mono PCM, ≤ 500 bytes).
- The precise `volume` near-zero value (0.0001 is the default; one device-test pass at plan time can adjust).
- Whether the silent-WAV constant is exported (for testability) or file-local — planner picks.
- Element teardown order inside `close()` relative to the in-flight-cue disconnect loop, as long as it runs before `audioCtx.close()`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 49 spec (the most important doc)
- `.planning/todos/2026-05-27-ios-speaker-route-audio-element-fix.md` — full problem statement, solution constraints (playsInline, loop, muted=false, near-zero volume, real decodable source, teardown on AC close, gesture chain), and validation criteria. **Plan and execute against this verbatim** — it acts as a spike-lock for this phase.

### Diagnosis + milestone context
- `.planning/notes/audio-animation-three-clocks-diagnosis.md` §#6 — iOS speaker-only-with-headphones diagnosis: "iOS Safari's 'ambient' audio session category defaults to silent-switch-respecting routing. Standard workaround: silent `<audio playsInline>` to coerce a 'playback' session."
- `.planning/notes/audio-clock-milestone-proposal.md` — v2.2 milestone proposal; Phase 49 is the quick-shipping front-runner, independent of Phases 50–53.

### Requirements + roadmap
- `.planning/ROADMAP.md` "Phase 49: iOS speaker route fix" — Goal, Depends on, Requirements list, Cross-cutting verification (DEPS-01, QUAL-01), and 5 Success Criteria.
- `.planning/REQUIREMENTS.md` §"iOS Audio Routing (Phase 49 — iOS speaker route fix)" — locked requirements IOS-01..IOS-05 (verbatim acceptance criteria).

### Engine architecture (read before touching audioEngine.ts)
- `src/audio/audioEngine.ts:1-26` — engine ownership contract + "Zero React imports" invariant + D-09 user-gesture rule + D-10 AC-failure fallback + D-11 close() teardown contract.
- `src/hooks/useAudioCues.ts:296-309` — Plan 06 Task 8 iOS gesture-preservation invariant for `reconstructEngine` (sync-first AC construct, no await before AC); D-04 above extends this rule to the new `<audio>` element.

### Forward-looking seed (deferred)
- `.planning/seeds/continuous-ambient-layer.md` (AMBIENT-F1) — would subsume the silent-loop trick when ever shipped. Captured here so the planner does NOT design Phase 49 to be removable later — it stays the canonical fix until/unless that seed activates.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`createAudioEngine` factory** (`src/audio/audioEngine.ts:125`): the single user-gesture chain entry. Sync head constructs `new AudioContext()` before any `await`; D-01/D-04 plug `new Audio(...)` + `.play()` into this same sync head.
- **`engine.close()`** (`src/audio/audioEngine.ts:281-325`): idempotent teardown with statechange listener removal + end-chord tail deferral. D-08 inserts element teardown before the in-flight cue disconnect loop at line 317.
- **D-11 close contract** + **Pitfall 8 in-flight tail handling**: existing pattern lets in-flight cue tails ring out via already-scheduled audio-thread ramps; the silent loop teardown is simpler (just `pause()` + clear `src`) and runs before that path.

### Established Patterns
- **Zero React imports in `audioEngine.ts`** (file header): D-01 preserves this — `new Audio()` is a DOM API, not React.
- **Sync-first-construct on gesture chain**: `new AudioContext()` must run before any `await` to preserve the gesture activation token (`useAudioCues.ts:296-309`). D-04 extends the rule: `new Audio(...)` + `.play()` must also run sync-first, before any `await audioCtx.resume()`.
- **Silent-absorb on resource-acquisition failures**: AC construction failure (D-10), AC resume failure (D-09 in engine resume), start() catch (`useAudioCues.ts:257-269`). D-09 follows the same posture — no new error UX surface for the silent loop.
- **Per-engine resource ownership**: every engine instance owns its `AudioContext`, its `activeCues` Set, its statechange listener. D-04 adds the silent `<audio>` element to that ownership list.

### Integration Points
- **`createAudioEngine()` sync head**: insert `new Audio(SILENT_WAV_DATA_URL)` + element configuration + `void audioElement.play().catch(...)` between `new AudioContext()` (`audioEngine.ts:129`) and the existing `audioCtx.state === 'suspended'` resume check (`audioEngine.ts:136`).
- **`engine.close()`**: insert element teardown (`pause()` + `removeAttribute('src')` + null reference) inside the close() body before the activeCues disconnect loop at `audioEngine.ts:317`.
- **No changes** to `useAudioCues.ts`, `App.tsx`, `cueSynth.ts`, or any component — the element is fully encapsulated inside the engine.
- **Tests**: new tests live alongside `audioEngine.test.ts` (verify element is constructed/played on `createAudioEngine`, paused/cleared on `close()`, sync-construct order is preserved on reconstruct). `useAudioCues.test.tsx` reconstruct tests need no behavior change because the element is invisible at the hook seam.

</code_context>

<specifics>
## Specific Ideas

- "Howler.js bakes this trick in internally; we are stealing the pattern without taking the dep." (canonical spec) — the implementation reference point.
- Cross-cutting: `DEPS-01` (no new runtime deps — `dependencies` stays `react` + `react-dom`) and `QUAL-01` (per-commit green-gate `tsc && lint && build && test` holds on every commit). The base64 WAV constant is bundle-only; no new npm deps.

</specifics>

<deferred>
## Deferred Ideas

- **Continuous ambient layer (AMBIENT-F1)** — `.planning/seeds/continuous-ambient-layer.md`. Would naturally subsume this trick (a real continuously-playing audio source has the same iOS-session-coercion side effect). Out of scope for Phase 49.
- **UA-based re-gating** — if non-iOS regression is measured under IOS-04, reintroduce a gate as a follow-up. Not designed-for now (per D-02).
- **Phases 50–53 (SessionClock + clock unification + lookahead + master-gain mute)** — out of scope; tracked in ROADMAP.md v2.2 milestone.

</deferred>

---

*Phase: 49-ios-speaker-route-fix*
*Context gathered: 2026-05-27*
