---
phase: 35
slug: flute-cue-timbre-replace-chime
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-20
---

# Phase 35 — Validation Strategy

_Backfilled retroactively for Phase 35 (shipped 2026-05-19). Frontmatter `created: 2026-05-20` reflects backfill date; the audited code surface is the Phase 35 implementation present in `main`._

> Per-phase validation contract. Phase 35 was a two-plan timbre-replacement phase: Plan 01 renamed the fourth cue timbre id `chime → flute` across the TimbreId union, EN/PT-BR display strings, TimbrePicker, and storage coercion (AUDIO-02 legacy-value remap); Plan 02 wired the spike-008 winning Flute DSP preset + an optional soft-attack envelope mode on the breathing cue synth (AUDIO-01). This VALIDATION.md regenerates the Nyquist coverage table from both plans' must-have truths and confirms each maps to at least one surviving Vitest assertion in current `main`. No gap-filling was required.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (with jsdom) + FakeAudioContext polyfill (Phase 3 invariant) |
| **Config file** | `vite.config.ts` (`test: { environment: 'jsdom', globals: true, setupFiles: './vitest.setup.ts' }`) |
| **Quick run command** | `npx vitest run src/audio src/storage/prefs.test.ts src/components/TimbrePicker.test.tsx src/content/strings.test.ts` |
| **Full suite command** | `npx tsc --noEmit && npm run lint && npm run build && npm test` |
| **Estimated runtime** | ~15 seconds (quick) / ~30 seconds (full gate at Phase 35 ship time) |

---

## Sampling Rate

- **After every task commit:** `npx vitest run src/audio src/storage/prefs.test.ts src/components/TimbrePicker.test.tsx`
- **After every plan wave:** Full gate (`npx tsc --noEmit && npm run lint && npm run build && npm test`)
- **Before `/gsd-verify-work`:** Full gate must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 35-01-T1 | 01 | 1 | AUDIO-01 (TimbreId/strings rename) | — | `TimbreId` union is a closed string literal type — type system enforces `'flute'` vs `'chime'` mismatches at compile time | unit + type-check | `npx vitest run src/content/strings.test.ts src/components/TimbrePicker.test.tsx` + `npx tsc --noEmit` (Phase 35 D-01: `TimbreId = 'bowl' \| 'bell' \| 'sine' \| 'flute'`; EN `'Flute'` / PT-BR `'Flauta'`) | ✅ extend | ✅ green |
| 35-01-T2 | 01 | 1 | AUDIO-02 (legacy `chime → flute` coercion) | — | `coerceTimbre` per-field path: known legacy literal remap → `isValidTimbre` allow-list → `DEFAULT_TIMBRE` fallback. No `obj[userKey]` dynamic lookup; no `eval`. Returns valid `TimbreId` always | unit (TDD RED → GREEN) | `npx vitest run src/storage/prefs.test.ts -t "coerceTimbre"` (cases: `'chime' → 'flute'` remap; unknown `'trumpet'`/`null`/`0` → `'bowl'`) | ✅ extend | ✅ green |
| 35-01-T3 | 01 | 1 | AUDIO-01 (TimbrePicker data-driven render) | — | Picker iterates `TIMBRE_OPTIONS` (static const) — no DOM injection of user input | unit | `npx vitest run src/components/TimbrePicker.test.tsx -t "labels"` (`['Bowl', 'Bell', 'Sine', 'Flute']` assertion; 8/8 cases) | ✅ extend | ✅ green |
| 35-02-T1 | 02 | 2 | AUDIO-01 (spike-008 Flute preset) | — | `TIMBRE_PRESETS.flute` is a compile-time const literal — no runtime construction from user input | unit | `npx vitest run src/audio/timbres.test.ts -t "flute preset matches spike-008 values"` (asserts harmonic partials `1.0→1.0 / 2.0→0.22 / 3.0→0.08`, decayTau 1.1/1.4, filter 4000 Hz / Q 0.4, peakGain 0.18, `attackSec 0.13`) | ✅ extend | ✅ green |
| 35-02-T2 | 02 | 2 | AUDIO-01 (`attackSec` interface + cueSynth soft-attack mode) | — | `attackSec` field is `number` in the `TimbrePreset` interface; cueSynth gates on `if (preset.attackSec > 0)` — strike path remains byte-identical when `attackSec === 0` | unit | `npx vitest run src/audio/cueSynth.test.ts -t "soft-attack"` and `-t "bowl strike unchanged"` (linear-ramp envelope path verified; strike path verified byte-identical via setValueAtTime call count + args) | ✅ extend | ✅ green |
| 35-02-T3 | 02 | 2 | AUDIO-01 (D-21 fundamentals guard preserved) | — | N/A | unit | `npx vitest run src/audio/timbres.test.ts -t "every preset uses A4/A3 fundamentals"` (iterative `fundamentalHzIn === 440 && fundamentalHzOut === 220` across all four presets) | ✅ extend | ✅ green |
| 35-02-T4 | 02 | 2 | AUDIO-01 (per-timbre engine routing) | — | `audioEngine.createAudioEngine({ timbre: 'flute' })` captures the preset choice at engine-construction time; per-engine cue dispatch tagged with the engine's timbre — no cross-engine leakage | integration | `npx vitest run src/audio/audioEngine.test.ts -t "independent capture"` (Bell + Flute engines dispatch with their own timbre ids; 0 cross-talk) | ✅ extend | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Coverage confirmed against current `main` (2026-05-20 backfill audit):**

- `src/domain/settings.ts` — `TimbreId = 'bowl' \| 'bell' \| 'sine' \| 'flute'`; `TIMBRE_OPTIONS` matches. Zero `'chime'` literals under `src/` except the intentional legacy-value reference at `src/storage/prefs.ts` (the `coerceTimbre` remap, documented with the AUDIO-02 comment).
- `src/audio/timbres.ts:49,68,84` — bowl/bell/sine each carry `attackSec: 0` (byte-identical to pre-AUDIO-01 strike behaviour).
- `src/audio/timbres.ts:92` — flute preset present with spike-008 harmonic recipe + `attackSec: 0.13`.
- `src/audio/cueSynth.ts:103` — `AUDIO-01 optional soft-attack mode` comment + `if (preset.attackSec > 0)` gate routing to `linearRampToValueAtTime(preset.peakGain, attackEnd)`.
- `src/storage/prefs.test.ts:117–118` — AUDIO-02 coercion test with documented intent comment.
- `src/audio/audioEngine.test.ts:440–449` — independent-capture test that proves Bell-engine cues do not leak into a Flute-engine schedule and vice versa.
- `35-VERIFICATION.md` (executed 2026-05-19 by gsd-verifier) scored 5/5 must-haves verified, all artifacts substantive, audio + storage + UI suites green (103/103 + 26/26 + 8/8 respectively). One human-listening item (perceptual distinctness of the Flute timbre) was logged as Manual-Only and operator-approved at Phase 35 ship — see Manual-Only Verifications below.

---

## Wave 0 Requirements

No Wave 0 gaps. Phase 35 landed on the existing Vitest + FakeAudioContext polyfill (Phase 3 D-13/D-14 invariant). All test files (`timbres.test.ts`, `cueSynth.test.ts`, `audioEngine.test.ts`, `prefs.test.ts`, `TimbrePicker.test.tsx`, `strings.test.ts`) pre-existed; Phase 35 extended each in lockstep with the source-code edits. D-11 milestone invariant (zero net-new runtime deps) preserved.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audible distinctness of the Flute timbre — the ~0.13 s soft breath onset is perceptually distinguishable from Bowl, Bell, and Sine (all of which use the strike envelope at `attackSec = 0`) | AUDIO-01 (perceptual aspect of "audibly distinct") | DSP code wiring is automated (linear-ramp envelope verified by `cueSynth.test.ts`), but perceptual distinctness — particularly whether Flute reads as a separate instrument vs Sine despite sharing harmonic-integer partials — requires human listening. No standard Vitest matcher captures perceptual judgment. | (1) `npm run dev`; (2) open Settings → Timbre; (3) cycle through Bowl, Bell, Sine, Flute while triggering In (A4) and Out (A3) cues; (4) confirm Flute has a noticeable soft breath onset (not an instant strike) and is clearly distinguishable from the other three timbres. ✅ Operator-approved at Phase 35 ship per `35-VERIFICATION.md` `Human Verification Required` block. |

---

## Validation Sign-Off

- [x] All tasks have automated `<verify>` or are scoped Manual-Only (Phase 35 has exactly one Manual-Only — Flute perceptual distinctness)
- [x] Sampling continuity: every automated must-have truth has at least one Vitest assertion (no 3 consecutive automated tasks without verify)
- [x] Wave 0 covers all MISSING references — N/A (all test files pre-existed; FakeAudioContext polyfill pre-existed since Phase 3)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] Pre-existing test baseline (1226 → 1251 → 1255) preserved across the Phase 35 wave per Phase 7 D-09 per-commit green-gate invariant
- [x] `nyquist_compliant: true` set in frontmatter — every automated must-have truth maps to a surviving Vitest assertion

**Approval:** verified 2026-05-20 (backfill — every Phase 35 must-have truth confirmed against the current `main` code surface; no gap-filling required, no test file added during this backfill audit)
