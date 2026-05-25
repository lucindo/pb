# Phase 40: Timbre preview cue — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `40-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 40-timbre-preview-cue
**Areas discussed:** AudioContext lifecycle, Wiring location + Phase 43 portability, Rapid-tap/overlap + re-tap semantics, Test posture & coverage

---

## AudioContext lifecycle

### Q1 — Acquisition pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Module-level singleton | Dedicated `previewContext.ts` lazy-creates an AudioContext on first preview tap and reuses it forever. Resume if suspended. Never close. Easiest way to hit ≤100ms PREV-05 on tap N+1. | ✓ |
| Fresh AudioContext per tap | New `new AudioContext()` on every tap, `.close()` on cue end. Clean teardown but adds 5–20ms creation latency on every tap; overlap-window races. | |
| Share session context when alive, else lazy singleton | Reuse `audioEngine.audioCtx` when running; lazy-create otherwise. Dead branch since `inSessionView=true` gates the picker anyway (PREV-04). | |

**User's choice:** Module-level singleton.
**Notes:** Latency budget for PREV-05 is decisive; rejected branches were dead-code or budget-eaters.

### Q2 — Resume policy on suspended context

| Option | Description | Selected |
|--------|-------------|----------|
| Resume-if-suspended on every preview tap | `if (ctx.state === 'suspended') ctx.resume()` before scheduling. No-op on running contexts. Closes iOS + Chrome auto-suspend gaps. | ✓ |
| Resume only on first creation | Call `ctx.resume()` after `new AudioContext()`; trust it stays running. Vulnerable to browser-side auto-suspension. | |
| Skip resume entirely | Don't touch `ctx.state`. Risk of silent failure on iOS where suspended-context oscillators may never start. | |

**User's choice:** Resume-if-suspended on every preview tap.
**Notes:** Cheap when running; cheap to write; closes a known iOS gap.

### Q3 — Module placement

| Option | Description | Selected |
|--------|-------------|----------|
| New pure `src/audio/previewContext.ts` module | Sibling to cueSynth/audioEngine/nkCueSynth/timbres. Pure (no React); easiest to unit-test under FakeAudioContext. | ✓ |
| Inside `useTimbrePreview.ts` hook module top-level | Module-level singleton in a hook file. Couples React lifecycle naming to AudioContext lifecycle. | |
| Local inside TimbrePicker.tsx | Mixes UI + audio; violates `src/audio/` separation. | |

**User's choice:** Pure `src/audio/previewContext.ts` module.
**Notes:** Mirrors existing layering; testable in isolation.

### Q4 — phaseDurationSec value for preview

| Option | Description | Selected |
|--------|-------------|----------|
| Omit (natural decay) | Each preset's `decayTau*` runs to natural silence. Tightest audition shape; BPM-agnostic. | ✓ |
| Pass a fixed preview length (e.g., 2.0s) | Forces uniform ring-out per timbre. Artificially stretches short-decay timbres. | |
| Derive from currently-selected practice's BPM | Couples preview to practice settings; surprising scope creep for chrome control. | |

**User's choice:** Omit (natural decay).
**Notes:** Preview is BPM-agnostic; matches the start-of-session audio shape.

---

## Wiring location + Phase 43 portability

### Q5 — TimbrePicker → previewContext call shape

| Option | Description | Selected |
|--------|-------------|----------|
| Direct import + call inline in onClick | `onClick={() => { setTimbre(id); playInhalePreview(id); }}`. Preserves Phase 18 D-16 timbre body invariant. Survives Phase 43 verbatim. | ✓ |
| New `useTimbrePreview()` hook in `src/hooks/` | Returns `{ playInhalePreview }`. Adds a third file to the timbre body (light D-16 erosion). Hook overkill for stateless surface. | |
| Fold into `useTimbreChoice.setTimbre` | Wrap setTimbre to also fire preview. Surprising for non-UI consumers; couples write to audio side-effect. | |

**User's choice:** Direct import + inline call.
**Notes:** Minimal diff, preserves layering invariants, Phase 43-portable.

### Q6 — Trigger source

| Option | Description | Selected |
|--------|-------------|----------|
| Direct call in onClick handler | Fire-and-forget on user gesture. iOS-safe. Cross-tab `storage` events don't fan-out preview audio. | ✓ |
| `useEffect(() => playInhalePreview(timbre), [timbre])` | Decouples from UI source; fires on any timbre change — including cross-tab. Emits audio from inactive tabs. Bad. | |
| Custom event bus | Adds machinery for no benefit; doesn't fix cross-tab. | |

**User's choice:** Direct call in onClick handler.
**Notes:** Cross-tab fan-out concern is the decisive consideration.

### Q7 — PREV-04 enforcement mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Trust existing `disabled={inSessionView}` prop | Button non-interactive during session; onClick never fires; previewContext stays pure. | ✓ |
| Explicit session-state guard inside `playInhalePreview` | Pass `isSessionActive` or read a module flag. Couples pure audio to session lifecycle. | |
| Belt-and-suspenders (both) | Marginal redundancy; over-engineered for 5-requirement phase. | |

**User's choice:** Trust the existing `disabled={inSessionView}` prop.
**Notes:** Invariant already locked since Phase 18; PREV-04 satisfied structurally.

### Q8 — API surface of `previewContext.ts`

| Option | Description | Selected |
|--------|-------------|----------|
| Single function: `playInhalePreview(timbre: TimbreId): void` | One symbol. All lifecycle inside the module. Mirrors cueSynth/nkCueSynth style. | ✓ |
| Two functions: `getPreviewContext()` + `playInhalePreview` | Splits context acquisition from scheduling. YAGNI — only one caller. | |
| Class / object with methods | Doesn't match existing `src/audio/*` module style (bare exports). | |

**User's choice:** Single bare function.
**Notes:** Matches existing module style; minimal surface.

---

## Rapid-tap / overlap + re-tap semantics

### Q9 — Rapid-tap behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Let cues overlap naturally | Each tap schedules an independent oscillator graph; cueSynth self-cleans on `ended`. Cheapest implementation; polyphonic auditioning is expressive. | ✓ |
| Cancel prior preview before scheduling new | Track most-recent CueHandle; stop its envelope before new. Requires new cueSynth `stop(handle)` export — scope creep. | |
| Short debounce (e.g., 80ms) | Coalesce rapid taps so only last plays. Eats the PREV-05 latency budget on first tap of a burst. | |

**User's choice:** Let cues overlap naturally.
**Notes:** No new cueSynth exports; zero state; matches in-session behavior.

### Q10 — Re-tap same-timbre semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Fire on every tap (incl. same-id) | Unconditional `playInhalePreview(id)`. `setTimbre(id)` no-op write is benign. Matches "tap = audition" model. | ✓ |
| No-op on same-id tap (strict PREV-01) | `if (id !== timbre) playInhalePreview(id)`. Users who want to re-hear current timbre get silence — confusing. | |

**User's choice:** Fire on every tap.
**Notes:** Operator-intent of PREV-01 is audition, not strict change-detection.

---

## Test posture & coverage

### Q11 — Test file layout

| Option | Description | Selected |
|--------|-------------|----------|
| Split: `previewContext.test.ts` (unit) + `TimbrePicker.test.tsx` additions (wiring) | Mirrors existing `cueSynth.test.ts` + `TimbrePicker.test.tsx` separation. Covers lifecycle invariants AND UI wiring. | ✓ |
| Single integration test in `src/components/` | Mocks previewContext at picker level; leaves audio module uncovered as unit. | |
| Single file at audio layer (no UI integration) | PREV-04 wiring untested in CI; relies on hand-testing. | |

**User's choice:** Split layout.
**Notes:** Mirrors existing layering; full coverage of lifecycle + wiring.

### Q12 — PREV-03 (preview plays when muted)

| Option | Description | Selected |
|--------|-------------|----------|
| Structural test: previewContext.ts has no audioEngine import | Import-graph lock; mirrors drift-guard-as-lock pattern at import level. Locks invariant against future refactors. | ✓ |
| Behavioral test: spin up audioEngine, setMuted(true), assert preview still fires | Pulls audioEngine into preview test scope; introduces the very coupling we want to prove absent. | |
| Both | Belt-and-suspenders; modest extra test code. | |

**User's choice:** Structural import test.
**Notes:** Proves the absence of coupling, not just current behavior.

### Q13 — PREV-05 (≤100ms latency)

| Option | Description | Selected |
|--------|-------------|----------|
| Contract-based: assert synchronous code path | No `await`, no `setTimeout`, no debounce. Hardware latency dominated by `ctx.resume()` + oscillator start — well under 100ms. Empirical confirmation lives in HUMAN-UAT.md. | ✓ |
| Manual operator UAT only | No CI assertion; no regression net. | |
| Performance benchmark with fake timers | jsdom + fake timers don't reflect real Web Audio latency; gives false confidence. | |

**User's choice:** Contract-based.
**Notes:** Asserting *the contract* that produces ≤100ms is sounder than measuring a fake jsdom number.

### Q14 — Operator HUMAN-UAT.md

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — small `40-HUMAN-UAT.md` with 3–4 items | Cue correctness, mute irrelevance, rapid-tap feel, iOS Safari cold-start. Follows Phase 28/29 pattern. | ✓ |
| No — unit tests + structural assertions are enough | Skips iOS-specific resume behavior coverage. | |
| Defer to Phase 44 POLISH | Phase 40 ships unverified on real devices; risky given v1.x iOS audio carry-forward. | |

**User's choice:** Yes — small HUMAN-UAT.md.
**Notes:** Phase 28/29 precedent for audio/iOS-sensitive phases; cold-start iOS is the highest-signal manual test.

---

## Claude's Discretion

- Filename of structural import-graph test (`previewContext.no-audioengine-import.test.ts` vs absorbing it into `previewContext.test.ts`) — planner picks during PATTERNS pass.
- Internal helper names inside `previewContext.ts` (`ensurePreviewContext` / `resumeIfSuspended` / `getOrCreateContext`) — non-load-bearing.
- Plan-structure grouping (atomic-commit splits vs single combined commit) — Tiger Style + Phase 36–39 PATTERNS precedent favor split; suggested order documented in CONTEXT D-13/Claude's Discretion.
- Whether the structural import test also forbids `import * from '../hooks/useAudioCues'` — planner picks ban-list at PATTERNS time.
- Tiger Style WHY-only comment placement inside `previewContext.ts` — planner picks; the non-obvious WHYs are D-01 (singleton-reuse rationale), D-02 (resume-on-every-tap rationale), D-03 (omit-phaseDurationSec rationale).

## Deferred Ideas

- Exhale-cue preview, countdown-tick preview, end-chord preview — out of scope per PREV-01 (inhale-only).
- Master-volume / per-cue volume slider — out of scope; would compose at the destination boundary later.
- Visual feedback during preview (flash, waveform, haptic) — out of scope.
- Empirical CI latency benchmark for PREV-05 — explicitly rejected (D-12).
- Custom event bus for timbre changes — rejected during discussion (D-05 alternative).
- App Settings page where TimbrePicker will live — Phase 43 UX-01/02.
- `MuteToggle.tsx:52` chrome alignment to `borderSoft`/`textSoft` — Phase 42 ORB-10.
- Preview during running session — explicitly rejected by PREV-04.
