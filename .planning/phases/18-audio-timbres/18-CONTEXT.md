---
phase: 18-audio-timbres
created: 2026-05-14
milestone: v1.1
requirements:
  - TIMBRE-01
  - TIMBRE-02
  - TIMBRE-03
  - TIMBRE-04
  - TIMBRE-05
---

# Phase 18: Audio Timbres - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 18 lands the **audio timbre preset system** on top of the Phase 14 typed prefs foundation + Phase 15 settings shell: four named synthesized timbres (Bowl default, Bell, Sine, Chime) selectable from the `TimbrePicker`, persisted via `Envelope.prefs.timbre`, and **captured at session start** so a mid-session pref change (cross-tab or otherwise) never swaps the active cue sound. Bowl preset reproduces v1.0.1 audio byte-identically (TIMBRE-02 zero-regression).

Deliverables:

1. **NEW** `src/audio/timbres.ts` — pure module, zero React imports. Exports:
   - `interface TimbrePreset { fundamentalHzIn: number; fundamentalHzOut: number; partials: ReadonlyArray<{ ratio: number; gain: number }>; decayTauIn: number; decayTauOut: number; filterFreqHz: number; filterQ: number; peakGain: number; oscillatorType: OscillatorType }` — pure data shape;
   - `TIMBRE_PRESETS: Readonly<Record<TimbreId, TimbrePreset>>` with the four locked DSP recipes (see D-02..D-05 below). Bowl preset values are the CURRENT `cueSynth.ts` module-level constants verbatim (`IN_FUNDAMENTAL_HZ`=440, `OUT_FUNDAMENTAL_HZ`=220, `PARTIALS`=1.0/2.76/5.4, `IN_DECAY_TIME_CONSTANT`=1.4, `OUT_DECAY_TIME_CONSTANT`=1.8, `FILTER_FREQ_HZ`=3000, `FILTER_Q`=0.5, `PEAK_GAIN`=0.18, `oscillatorType`='sine');
   - All fundamentals locked at A4 In / A3 Out (440/220 Hz) across all four presets per TIMBRE-05 — **overrides** research's per-timbre fundamental variation.
2. **EDIT** `src/audio/cueSynth.ts` — parameterize the existing `scheduleBowlCue` to accept a `TimbrePreset` argument instead of (or in addition to) loose `fundamentalHz` / `defaultDecayTau` args. Module-level Bowl constants either delete or stay as a backing reference exported by `timbres.ts`. Add `scheduleInCueForTimbre(audioCtx, when, destination, timbre, phaseDurationSec?)` and `scheduleOutCueForTimbre(...)` dispatch functions that look up `TIMBRE_PRESETS[timbre]` and call the parameterized scheduler. Existing `scheduleInCue` / `scheduleOutCue` either (a) become Bowl-only thin wrappers preserving their existing signatures for the bowl path (TIMBRE-02 byte-identical proof via signature stability) OR (b) are deleted and all callers migrate to `scheduleInCueForTimbre('bowl', ...)`. Planner picks final — both preserve byte-identical Bowl behavior; (a) keeps git diff smaller, (b) is cleaner long-term.
3. **EDIT** `src/audio/cueSynth.ts` `scheduleTick` — **unchanged** (D-07: lead-in tick stays fixed across all timbres).
4. **EDIT** `src/audio/audioEngine.ts`:
   - `AudioEngineOptions` gains `timbre: TimbreId` (required) — `createAudioEngine` constructs against the timbre captured for this session;
   - `scheduleLeadIn` forwards the timbre to `scheduleInCueForTimbre` for the first In cue (lead-in tick stays fixed per D-07);
   - `scheduleNextCue` forwards the timbre to `scheduleInCueForTimbre` / `scheduleOutCueForTimbre`;
   - the engine instance captures the timbre at construction and uses the same value for every subsequent cue (no `setTimbre` setter — capture-at-Start is the only mutation path per D-08/D-10).
5. **EDIT** `src/hooks/useAudioCues.ts`:
   - Add `timbreRef = useRef<TimbreId>(DEFAULT_TIMBRE)` parallel to `mutedRef` at `useAudioCues.ts:99-102`;
   - Thread `timbre` through `start(plan, timbre)` (caller passes `prefs.timbre` snapshot from App.tsx);
   - In `start`, set `timbreRef.current = timbre` synchronously BEFORE any `await` (mirror of `mutedRef` pre-await capture posture at `useAudioCues.ts:286-292`); pass `timbre` to `createAudioEngine({ timbre, onStateChange })`;
   - In `reconstructEngine` (`useAudioCues.ts:282-344`), read `timbreRef.current` synchronously BEFORE any `await` (mirror of `currentMuted = mutedRef.current` at line 292); pass that captured timbre to the new `createAudioEngine` call. Reconstruction inherits the session's original timbre — never re-reads `loadPrefs()` (D-11).
6. **EDIT** `src/components/TimbrePicker.tsx` — Phase 15 stub body (`Timbre: {prefs.timbre}` read-only text) becomes a real radiogroup over `TIMBRE_OPTIONS`. Each option button shows the name only (Bowl / Bell / Sine / Chime, capitalized via `id.charAt(0).toUpperCase() + id.slice(1)` — mirror of `ThemePicker.tsx:31`). No descriptor text, no SVG glyph, no audio preview button. `disabled` gated by Phase 15 D-02 contract. 44×44 hit area + `focus-visible` ring per the Phase 2 carry-forward a11y floor.
7. **NEW** `src/hooks/useTimbreChoice.ts` — picker-side companion hook mirroring `useVariantChoice.ts` (Phase 17). Reads `loadPrefs().timbre`, exposes `setTimbre(next)` that calls `savePrefs({ ...loadPrefs(), timbre: next })` then `window.dispatchEvent(new CustomEvent('hrv:prefs-changed', { detail: { key: 'timbre', value: next } }))`. Optimistic-UI local React state mirror so the picker reflects the new selection instantly.
8. **NO** `useAudioTimbre` orchestrator hook is needed in App.tsx — unlike `useVisualVariant` / `useTheme`, the App side does not need live timbre state. App reads `loadPrefs().timbre` once inside `onStartClick` at Start and passes it to `audio.start(plan, prefs.timbre)`. The picker-side `useTimbreChoice` owns the storage write + custom-event dispatch; no App-side listener consumes the event because timbre doesn't drive any idle-state visual or audible surface (no `data-timbre` attribute write, no idle preview). Phase 17 D-09's pair (`useVisualVariant` + `useVariantChoice`) collapses to a single picker-side hook for timbre.
9. **EDIT** `src/app/App.tsx`:
   - In `onStartClick` (currently at `App.tsx:303+`), read `prefs.timbre` via `loadPrefs().timbre` at the same call-site where `sessionVariantRef.current = liveVariant` fires (lines 328-333). Pass the captured value to `audioStart(plan, capturedTimbre)`. No `sessionTimbreRef` is needed — the `timbreRef` inside `useAudioCues` IS the session-scoped capture (D-10 mirror of `mutedRef`);
   - No App-side state for live timbre (no analog of `liveVariant` from `useVisualVariant`).
10. **NEW + EDIT** Vitest coverage:
    - `src/audio/timbres.test.ts` (NEW) — preset record exports all 4 keys, Bowl preset matches the existing `cueSynth.ts` module-level constants verbatim (snapshot or per-field equality), all 4 presets honor TIMBRE-05 A4/A3 fundamentals, `partials[0].ratio === 1.0` invariant;
    - `src/audio/cueSynth.test.ts` (EXTENDED) — existing 3-partial Bowl tests stay green (TIMBRE-02 byte-identical proof). Add `it.each(TIMBRE_OPTIONS)` parameterized blocks for `scheduleInCueForTimbre` / `scheduleOutCueForTimbre`: oscillator count = `preset.partials.length`, fundamental = preset's `fundamentalHzIn`/`Out`, decay envelope shape, cleanup math, sustain-floor activation at long phase durations (D-11);
    - `src/audio/audioEngine.test.ts` (EXTENDED) — `createAudioEngine({ timbre: 'bell', ... })` propagates timbre to `scheduleLeadIn` first-In cue and `scheduleNextCue`; engine-instance captures timbre once and ignores any subsequent mutation attempt (no setter exists);
    - `src/hooks/useAudioCues.test.tsx` (EXTENDED) — `start(plan, 'bell')` constructs engine with timbre='bell'; reconstruction re-uses the captured `timbreRef.current` even after a new `loadPrefs()` would return a different value;
    - `src/components/TimbrePicker.test.tsx` (EXTENDED) — radiogroup posture, selection writes to `loadPrefs` + dispatches `'hrv:prefs-changed'` with `detail.key === 'timbre'`, `disabled` prop gates aria-checked + click handler, name-only label per option;
    - `src/hooks/useTimbreChoice.test.ts` (NEW) — read/setter pair mirror of `useVariantChoice.test.ts`.
11. **NO** edits to `src/domain/settings.ts` — `TimbreId` / `TIMBRE_OPTIONS` / `isValidTimbre` / `DEFAULT_TIMBRE = 'bowl'` locked at Phase 14 D-01/D-04 (file-split invariant D-09).
12. **NO** edits to `src/storage/prefs.ts` — `loadPrefs` / `savePrefs` / `coerceTimbre` locked at Phase 14.
13. **NO** edits to `src/components/SettingsDialog.tsx` — Phase 15 D-01 (picker phases never re-edit the dialog).

**Not in scope (other phases / deferred):**
- Visual variants (`Phase 17` — DONE)
- Language switching (`Phase 19` — TIMBRE-stringification of picker labels stays English; Phase 19 owns translation)
- Mid-session timbre swap (REQUIREMENTS.md "Out of Scope" — `inSessionView` disable contract)
- In-app audio preview button (REQUIREMENTS.md "Out of Scope" — name-only sufficient per D-06)
- Per-phase timbre (different sound In vs Out — REQUIREMENTS.md "Out of Scope" — A4/A3 already distinguishes phases)
- Audio volume slider (REQUIREMENTS.md "Out of Scope" — mute toggle + OS volume cover it)
- Sample-based timbres / OGG/MP3 (REQUIREMENTS.md "Out of Scope" — Web Audio synthesis only)
- PeriodicWave / custom-waveform timbres — all 4 presets use `OscillatorType='sine'` + partial stacking. Reopens scope only if user feedback shows a preset needs character impossible to synthesize via partial-stacked sines.
- Per-timbre lead-in tick (D-07 keeps tick fixed)
- Per-timbre sustain-floor tuning (D-11 shares sustain logic across all timbres; per-timbre thresholds emerge automatically from each preset's `decayTauIn`/`Out`)

</domain>

<decisions>
## Implementation Decisions

### Preset architecture

- **D-01:** **`TIMBRE_PRESETS` record + parameterized `scheduleBowlCue`.** NEW `src/audio/timbres.ts` exports the `TimbrePreset` interface and a `Readonly<Record<TimbreId, TimbrePreset>>` constant. `cueSynth.ts`'s `scheduleBowlCue` is parameterized to accept a preset (replacing the loose `fundamentalHz` + `defaultDecayTau` args). Bowl preset uses the current `cueSynth.ts` module-level constants verbatim → TIMBRE-02 byte-identical Bowl proof. Adding a 5th timbre is data-only (no new function). Mirrors research §CUST-02. Chosen over (b) per-timbre `scheduleBellCue`/`scheduleSineCue`/`scheduleChimeCue` functions (4× function-shaped duplication; bowl path completely untouched but adds ~3 new code files) and (c) inline switch inside existing `scheduleInCue`/`scheduleOutCue` (smallest file count; largest diff inside the existing functions → TIMBRE-02 byte-identical harder to argue).

### Per-timbre DSP parameters

- **D-02:** **Bowl preset (default) = verbatim copy of existing `cueSynth.ts` constants.**
  - `fundamentalHzIn = 440` (A4), `fundamentalHzOut = 220` (A3) — TIMBRE-05.
  - `partials = [{ ratio: 1.0, gain: 1.0 }, { ratio: 2.76, gain: 0.4 }, { ratio: 5.4, gain: 0.15 }]` — current `PARTIALS` constant.
  - `decayTauIn = 1.4`, `decayTauOut = 1.8` — current `IN_DECAY_TIME_CONSTANT` / `OUT_DECAY_TIME_CONSTANT`.
  - `filterFreqHz = 3000`, `filterQ = 0.5` — current `FILTER_FREQ_HZ` / `FILTER_Q`.
  - `peakGain = 0.18` — current `PEAK_GAIN`.
  - `oscillatorType = 'sine'`.
  - TIMBRE-02 byte-identical proof = git diff shows the constants moved from module-level into the preset record with zero numeric changes.

- **D-03:** **Bell preset = soft hand-bell variant (3 partials, mildly inharmonic).**
  - `fundamentalHzIn = 440` (A4), `fundamentalHzOut = 220` (A3) — TIMBRE-05 (overrides research's `523`/`261` Hz C5/C4 — Phase 14 D-01 fundamentals are locked).
  - `partials = [{ ratio: 1.0, gain: 1.0 }, { ratio: 2.5, gain: 0.5 }, { ratio: 4.0, gain: 0.15 }]` — lightly inharmonic (2.5 ratio is not an integer harmonic) gives the "bell" character without being as sharp as 2.76 (which is bowl-specific) or as aggressive as the 4.16 inharmonic from research.
  - `decayTauIn = 0.8`, `decayTauOut = 1.1` — shorter than Bowl; Bell's character is in the attack envelope, not in long sustain.
  - `filterFreqHz = 5000`, `filterQ = 0.8` — brighter than Bowl (3kHz) but less than the research's 6kHz; Q=0.8 mild peak around the cutoff.
  - `peakGain = 0.18` (same as Bowl — consistent loudness across timbres for user expectation).
  - `oscillatorType = 'sine'`.
  - Distinct from Bowl via attack envelope + brighter filter + different partial ratios; same fundamental.
  - Chosen over (b) bright + inharmonic + faster decay (more "church bell"; risks being too sharp at low BPM) and (c) brighter + crisper + 5 partials (most distinct from Bowl; new design risk on multi-partial behavior).

- **D-04:** **Sine preset = pure single sine, soft + long.**
  - `fundamentalHzIn = 440` (A4), `fundamentalHzOut = 220` (A3) — TIMBRE-05 (overrides research's `528`/`264` Hz — Phase 14 D-01 fundamentals locked).
  - `partials = [{ ratio: 1.0, gain: 1.0 }]` — single partial, no overtones.
  - `decayTauIn = 1.5`, `decayTauOut = 2.0` — long sustain, pairs with breath cycle. Sustain-floor (D-11) will engage at moderate-low BPM since `defaultDecayTau * 3` ≈ 4.5s / 6s — appropriate behavior.
  - `filterFreqHz = 8000` (very gentle high-pass cleanup; pure sine has no upper partials so filter is near-transparent), `filterQ = 0.3` (mild).
  - `peakGain = 0.18` (same as Bowl).
  - `oscillatorType = 'sine'`.
  - Identity: nothing harmonic to mask, soft test-tone character, long sustain.
  - Chosen over (b) pure sine + short + tight (risk: low BPM goes silent before flip even with sustain-floor) and (c) sine + faint 2nd harmonic (compromises the "pure sine" identity).

- **D-05:** **Chime preset = windchime (4-5 partials, mild high-frequency shimmer).**
  - `fundamentalHzIn = 440` (A4), `fundamentalHzOut = 220` (A3) — TIMBRE-05.
  - `partials = [{ ratio: 1.0, gain: 1.0 }, { ratio: 2.76, gain: 0.4 }, { ratio: 5.4, gain: 0.15 }, { ratio: 7.6, gain: 0.08 }]` — Bowl partial stack + one extra high partial at 7.6× for shimmer. The 7.6 ratio adds the windchime "tingle" without being a full inharmonic series. Planner may experiment with adding a 5th partial at ~10.0× (gain 0.05) if dev-server smoke reveals the 4-partial shimmer is too subtle.
  - `decayTauIn = 1.0`, `decayTauOut = 1.4` — between Bell and Bowl; shorter than Bowl so the windchime feels "fast" but still has audible shimmer.
  - `filterFreqHz = 7000`, `filterQ = 1.0` — brighter than Bowl (lets the high partial through), mild peak around 7kHz emphasizes the shimmer.
  - `peakGain = 0.16` — slightly lower than Bowl/Bell/Sine because the extra high partial concentrates more energy in the perceived-loud high-frequency band (compensates for equal-loudness curve).
  - `oscillatorType = 'sine'`.
  - Chosen over (b) doorbell/tubular two-tone (1.5 perfect-fifth ratio risks confusing A4 In vs A3 Out distinction with a "ding-dong" interval cue) and (c) glockenspiel/music-box (3 odd-harmonic partials; tight + bright + short — too "plinky" for a breathing cue).

### TimbrePicker UI

- **D-06:** **Name-only radiogroup, mirroring ThemePicker.** Each option button renders the capitalized timbre name as plain text (`Bowl` / `Bell` / `Sine` / `Chime`) inside a `<button role='radio'>` with selected/unselected token-bound chrome (`var(--color-breathing-accent)` border, `var(--color-breathing-bg-soft)` selected bg). No descriptor text, no SVG glyph, no audio preview button (REQUIREMENTS.md "In-app audio preview button" explicitly excluded). The audio character is hidden until session start — same UX posture as `VariantPicker` (shape only visible after Start) and `ThemePicker` (color visible immediately, but that's because theme is a passive visual). Smallest diff; smallest Phase 19 i18n surface (4 timbre names only — no 8 descriptor strings × locale). Chosen over (b) name + short descriptor "Bowl — warm strike, long sustain" (research-preferred; longer copy → tighter Phase 19 surface) and (c) name + SVG glyph (new design work for 4 glyphs; novel UI surface vs ThemePicker mirror).

### Lead-in tick across timbres

- **D-07:** **Lead-in 3-2-1 tick stays fixed across all timbres** (1200Hz square wave + lowpass, current `scheduleTick` unchanged). The tick is intentionally distinct from any phase cue per Phase 3 D-15 — its perceptual role is "countdown / starting" not "phase cue with timbre character." Varying tick by timbre would dilute that perceptual separation. Smallest diff; Bowl byte-identical proof unaffected; preserves Phase 3 D-15 design intent. Chosen over (b) tick inherits timbre fundamental + waveform (risks losing countdown-vs-cue separation) and (c) different fixed tick per timbre (most code; least obvious user value).

### Capture-at-session-start + reconstruction (TIMBRE-03)

- **D-08:** **`timbreRef` inside `useAudioCues` is the single session-scoped capture site.** Mirror of `mutedRef` at `useAudioCues.ts:99-102`. Set synchronously inside `start(plan, timbre)` BEFORE any `await`; read synchronously inside `reconstructEngine` BEFORE any `await` (mirror of `currentMuted = mutedRef.current` at line 292). NO `sessionTimbreRef` on the App side (unlike Phase 17's `sessionVariantRef` which threads through props to `<BreathingShape variant=...>`) — the engine never re-reads the timbre after construction, so the ref-inside-hook is sufficient. Chosen over (b) `sessionTimbreRef` in App.tsx threaded through `audio.start(plan, capturedTimbre)` (App-side ref adds a parallel snapshot mechanism that diverges from the existing `mutedRef` pattern; sole consumer is `useAudioCues` which already has the ref) and (c) `useAudioTimbre` orchestrator hook + App-side capture (mirrors Phase 17 D-09 fully; over-engineered since timbre has no idle-state visual / audible surface that would justify a `liveTimbre` value in App render).

- **D-09:** **App reads `loadPrefs().timbre` once inside `onStartClick` and passes to `audioStart(plan, capturedTimbre)`.** No `useAudioTimbre` hook. App.tsx never holds React state for "live timbre." The picker writes through `useTimbreChoice` directly; the next `Start` click reads the fresh value from storage. Live cross-tab sync (a Phase 17 D-09 requirement for `data-variant` … wait, Phase 17 explicitly does NOT write a global attribute, but does use cross-tab sync to keep the `<VariantPicker>` in sync if a sibling tab changes the prefs) — for timbre, the picker self-reads `loadPrefs()` on mount via `useTimbreChoice` AND re-reads when `'hrv:prefs-changed'` fires (cross-tab sync is handled in `useTimbreChoice` by listening to `'storage'` + `'hrv:prefs-changed'`, the standard mirror of `useThemeChoice` / `useVariantChoice` patterns). The App side does not need live state because the audio engine receives the value only at Start.

- **D-10:** **Capture-at-Start fires inside the existing `onStartClick` handler in `App.tsx`** (currently `App.tsx:303+`), at the same call-site where `sessionVariantRef.current = liveVariant` fires (lines 328-333). One read of `loadPrefs().timbre` immediately before the `audioStart(plan, ...)` await. Mirror of Phase 17 D-10 timing — captured once at the user's Start click, frozen for the entire session including reconstruction. Project-wide "Next-session-only swap" decision (PROJECT.md Key Decisions). Chosen over (b) lazy capture inside the audio hook's `start` (the hook is already the capture site via `timbreRef` — the only thing App.tsx contributes is the `loadPrefs()` read, which is best done synchronously inside the click handler for symmetry with `sessionVariantRef` and `wakeLockRequest`).

- **D-11:** **Reconstruction inherits `timbreRef.current` — never re-reads `loadPrefs()`.** Phase 5.1 / Phase 9 audio reconstruction (background → foreground recovery) reads `timbreRef.current` synchronously before any await in `reconstructEngine` (mirror of `currentMuted = mutedRef.current` at `useAudioCues.ts:292`) and passes it to the new `createAudioEngine({ timbre: currentTimbre, ... })`. The session's original timbre is preserved across reconstruction — never the user's "since-then" prefs change. Mirror of Phase 17 D-11 (variant ref preserved across audio reconstruction) but for the audio dimension itself. Chosen over (b) reconstruction re-reads `loadPrefs().timbre` (couples audio reconstruction to user-prefs state; violates TIMBRE-03 "captured at session start") and (c) reconstruction re-snapshots from a fresh `loadPrefs()` read (same violation; introduces the surprise that an iOS auto-suspend recovery silently swaps timbre mid-session if the user opened the picker in another tab).

### Sustain-floor across timbres

- **D-12:** **Shared sustain-floor logic + thresholds; per-timbre threshold auto-derives from preset `decayTauIn`/`Out`.** The `PERCEPTUAL_SILENCE_TAU_MULT = 3`, `SUSTAIN_FLOOR_RATIO = 0.15`, `PHASE_END_FADE_OUT_TAU = 0.05`, `PHASE_END_FADE_OUT_LEAD_SEC = 0.2` module-level constants in `cueSynth.ts` stay shared across all 4 timbres. Each timbre's sustain-floor activation point automatically follows its own `defaultDecayTau` × 3 threshold: Bowl (1.4/1.8 → 4.2s/5.4s thresholds), Bell (0.8/1.1 → 2.4s/3.3s), Sine (1.5/2.0 → 4.5s/6.0s), Chime (1.0/1.4 → 3.0s/4.2s). Bowl behavior byte-identical (TIMBRE-02). Chosen over (b) per-timbre `sustainFloorRatio` / `fadeOutTau` / `fadeOutLeadSec` fields inside `TimbrePreset` (4× UAT for low-BPM behavior; only justified if a specific timbre sounds bad with shared values — defer until evidence) and (c) sustain-floor only for multi-partial timbres / off for Sine + Bell (introduces the exact silence-before-flip bug Phase 9 Bug 2 fixed; cannot relax without re-introducing the regression).

### Carry-forward invariants (load-bearing for Phase 18)

- **D-13:** **Per-commit green-gate** (Phase 7 D-09 / Phase 11 D-17 / Phase 12 D-15 / Phase 13 D-10 / Phase 14 D-14 / Phase 15 D-14 / Phase 16 / Phase 16.1 / Phase 16.2 / Phase 16.3 / Phase 17 D-17). `npx tsc --noEmit && npm run lint && npm run build && npm test` exits 0 at every commit boundary.

- **D-14:** **Zero new npm dependencies** (PROJECT.md v1.1 "Zero net-new runtime deps" invariant). Pure Web Audio API + TypeScript + Vitest with the existing `FakeAudioContext` polyfill (`vitest.setup.ts`). No PeriodicWave library, no DSP helper package — all 4 presets are partial-stacked sines.

- **D-15:** **Phase 14 D-09 file-split invariant preserved.** `src/domain/settings.ts` is NOT edited in Phase 18 (`TimbreId` / `TIMBRE_OPTIONS` / `isValidTimbre` / `DEFAULT_TIMBRE = 'bowl'` already locked Phase 14 D-01/D-04). `src/storage/prefs.ts` is NOT edited (`loadPrefs` / `savePrefs` / `coerceTimbre` already locked).

- **D-16:** **Phase 15 D-01 picker invariant preserved.** `src/components/SettingsDialog.tsx` is NOT edited in Phase 18. The timbre body lives entirely inside `TimbrePicker.tsx` + the new `useTimbreChoice.ts` hook.

- **D-17:** **Phase 15 D-02 picker prop contract preserved.** `TimbrePicker` accepts exactly `{ disabled: boolean }`. No new props at the `SettingsDialog` call site. Picker self-reads `loadPrefs()` and owns its own `savePrefs()` write path via `useTimbreChoice` (mirror of `useVariantChoice` / `useThemeChoice`).

- **D-18:** **`'hrv:prefs-changed'` CustomEvent contract reuse** (Phase 16 forward-decl at `useTheme.ts:76`; Phase 17 D-22). Phase 18 dispatches `new CustomEvent('hrv:prefs-changed', { detail: { key: 'timbre', value: next } })` from `useTimbreChoice.setTimbre`. No App-side listener consumes the event because timbre has no live-render surface (D-08); the picker hook's own optimistic-UI state mirror handles same-tab feedback. Cross-tab sync inside `useTimbreChoice` listens for both `'storage'` (cross-tab) and `'hrv:prefs-changed'` (same-tab, sibling SettingsDialog scenarios) filtered on `detail.key === 'timbre'`.

- **D-19:** **THEME-UI-01 token-binding guard remains green.** No hardcoded `text-{slate,teal}-*` / `bg-{slate,teal}-*` / `text-white` / `bg-white` Tailwind utilities in any new `.tsx` file. TimbrePicker chrome uses `var(--color-breathing-*)` tokens verbatim from ThemePicker. `theme.no-hardcoded-classes.test.ts` continues to exit 0.

- **D-20:** **A11y floor** (Phase 2 D-15/D-17/D-21 carry-forward + Phase 17 D-24). Picker buttons honor 44×44 hit area + `focus-visible` ring contracts. TimbrePicker mirrors ThemePicker's radiogroup a11y posture verbatim.

- **D-21:** **TIMBRE-05 A4/A3 fundamental invariant locked in tests.** A Vitest test in `timbres.test.ts` asserts that for every key in `TIMBRE_PRESETS`, `preset.fundamentalHzIn === 440 && preset.fundamentalHzOut === 220`. This is a guardrail against future preset additions silently varying the fundamental and breaking phase-distinction (the exact research mistake — research's Bell at 523/261 and Sine at 528/264 would have broken TIMBRE-05).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher + planner) MUST read these before planning or implementing.**

### Phase requirements + roadmap

- `.planning/ROADMAP.md` §"Phase 18: Audio Timbres" (lines 202-212) — Goal + 5 Success Criteria. SC1 Bowl byte-identical, SC2 in-session disable + capture-at-Start, SC3 A4/A3 distinction per timbre, SC4 persistence + coerce fallback, SC5 zero deps + FakeAudioContext coverage + green-gate.
- `.planning/REQUIREMENTS.md` §"Audio Timbres (CUST-02)" TIMBRE-01..05 (lines 39-43) — full requirement text + traceability rows (lines 114-118).
- `.planning/PROJECT.md` Key Decisions — "Next-session-only swap" + "Bowl default byte-identical" + "Zero net-new runtime deps" + "Per-commit green-gate" v1.1 invariants.

### Locked prior-phase contracts (read in full — agents must respect these)

- `.planning/phases/14-prefs-foundation/14-CONTEXT.md` — D-01 (`TimbreId = 'bowl' | 'bell' | 'sine' | 'chime'` locked) + D-04 (`DEFAULT_TIMBRE = 'bowl'`) + D-09 (file-split invariant: `domain/settings.ts` and `storage/prefs.ts` NOT edited downstream) + D-10 (coercer API surface).
- `.planning/phases/15-settingsdialog-shell/15-CONTEXT.md` — D-01..04 (picker contract + naming + stub) + D-08 (gear / picker disabled-in-session) + D-15 (zero new deps).
- `.planning/phases/16-themes/16-CONTEXT.md` — useTheme + useThemeChoice orchestrator/picker hook pair + `'hrv:prefs-changed'` CustomEvent contract forward-decl at `useTheme.ts:76`.
- `.planning/phases/17-visual-variants/17-CONTEXT.md` — D-09/D-10/D-11 capture-at-Start mechanism (mirrored for timbre via `timbreRef` inside `useAudioCues` per D-08 above) + D-22 `'hrv:prefs-changed'` reuse + D-23 THEME-UI-01 guard + D-24 a11y floor.

### Research (provides preset architecture; this CONTEXT overrides per-timbre fundamentals)

- `.planning/research/STACK.md` §2 "Audio Timbres (CUST-02)" (lines 113-213) — `TimbrePreset` interface + `TIMBRE_PRESETS` record + dispatch pattern. **NOTE:** research's per-timbre fundamentals (Sine 528/264, Bell 523/261) are SUPERSEDED by TIMBRE-05 — Phase 18 locks all 4 presets at A4 In / A3 Out (440/220 Hz). Research's `TimbreName = 'bowl' | 'sine' | 'bell'` is also SUPERSEDED by Phase 14 D-01 (`'bowl' | 'bell' | 'sine' | 'chime'`).
- `.planning/research/ARCHITECTURE.md` §"CUST-02: Audio Timbre System" (lines 83-104) — `scheduleInCueForTimbre` / `scheduleOutCueForTimbre` dispatch + `createAudioEngine({ timbre })` + `useAudioCues` `timbreRef` + `reconstructEngine` capture pattern. This is the authoritative integration spec for Phase 18 plumbing.
- `.planning/research/FEATURES.md` line 57 — in-app audio preview button explicitly excluded; name + (optional) descriptor sufficient → D-06 chose name-only.

### Source files Phase 18 directly touches or extracts from

- `src/audio/cueSynth.ts` (237 LOC) — Bowl synthesis source; `scheduleBowlCue` is the function parameterized per D-01. Module-level `IN_FUNDAMENTAL_HZ` (440), `OUT_FUNDAMENTAL_HZ` (220), `PARTIALS` (3 partials), `IN_DECAY_TIME_CONSTANT` (1.4), `OUT_DECAY_TIME_CONSTANT` (1.8), `FILTER_FREQ_HZ` (3000), `FILTER_Q` (0.5), `PEAK_GAIN` (0.18) — Bowl preset values per D-02 (verbatim move). `scheduleTick` lines 205-236 — **unchanged** per D-07. Sustain-floor constants `PERCEPTUAL_SILENCE_TAU_MULT` (3), `SUSTAIN_FLOOR_RATIO` (0.15), `PHASE_END_FADE_OUT_TAU` (0.05), `PHASE_END_FADE_OUT_LEAD_SEC` (0.2) — **shared** per D-12.
- `src/audio/audioEngine.ts` (263 LOC) — `createAudioEngine` signature extended with `timbre: TimbreId` per D-08. `scheduleLeadIn` lines 155-173 + `scheduleNextCue` lines 175-188 forward the captured timbre to the dispatch functions. Engine captures timbre once at construction; no setter (capture-at-Start is the only mutation path per D-10).
- `src/hooks/useAudioCues.ts` (395 LOC) — `mutedRef` at lines 99-102 is the mirror pattern for new `timbreRef`. `start` at lines 203-245 gains `timbre` parameter; pre-await capture into `timbreRef` per D-08. `reconstructEngine` at lines 282-344 reads `timbreRef.current` synchronously before any await per D-11 (mirror of `currentMuted = mutedRef.current` line 292).
- `src/components/TimbrePicker.tsx` (26 LOC) — Phase 15 stub. Phase 18 fills the body per D-06 (radiogroup mirror of ThemePicker).
- `src/components/ThemePicker.tsx` — radiogroup + savePrefs + custom-event posture to mirror for TimbrePicker.
- `src/hooks/useThemeChoice.ts` + `src/hooks/useVariantChoice.ts` — picker-side hook patterns to mirror for new `useTimbreChoice.ts`.
- `src/app/App.tsx` — `onStartClick` at lines 303+; `sessionVariantRef.current = liveVariant` site at line 332 is the call-site Phase 18 adds the `loadPrefs().timbre` read + `audioStart(plan, capturedTimbre)` per D-09/D-10.
- `src/domain/settings.ts` — `TIMBRE_OPTIONS` / `TimbreId` / `isValidTimbre` / `DEFAULT_TIMBRE = 'bowl'` locked Phase 14 — NOT edited in Phase 18.
- `src/storage/prefs.ts` — `loadPrefs` / `savePrefs` / `coerceTimbre` locked Phase 14 — NOT edited in Phase 18.

### Carry-forward test guards

- `src/styles/theme.no-hardcoded-classes.test.ts` (Phase 16.1-07) — THEME-UI-01 token-binding guard. Must stay green after TimbrePicker body fill (D-19).
- `vitest.setup.ts` — `FakeAudioContext` polyfill. All new audio tests run against the polyfill — no real `AudioContext` use.

### Test files Phase 18 extends or creates

- `src/audio/timbres.test.ts` (NEW) — preset record contents + TIMBRE-05 fundamental invariant guard (D-21).
- `src/audio/cueSynth.test.ts` (EXTENDED) — existing 3-partial Bowl tests stay green; add per-timbre `it.each(TIMBRE_OPTIONS)` blocks.
- `src/audio/audioEngine.test.ts` (EXTENDED) — `createAudioEngine({ timbre })` propagation + immutable session capture.
- `src/hooks/useAudioCues.test.tsx` (EXTENDED) — `start(plan, timbre)` propagation + reconstruction-preserves-timbre invariant.
- `src/components/TimbrePicker.test.tsx` (EXTENDED) — radiogroup + dispatch + disabled gate.
- `src/hooks/useTimbreChoice.test.ts` (NEW) — mirror of `useVariantChoice.test.ts`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`scheduleBowlCue` at `cueSynth.ts:74-171`** — already parameterized on `fundamentalHz` + `defaultDecayTau` + `phaseDurationSec`; widening to accept a full `TimbrePreset` is a mechanical change. Partials loop at lines 121-137, master envelope at lines 96-100, sustain-floor branch at lines 86-116 already drive off the per-call `defaultDecayTau` → per-timbre threshold (D-12) emerges automatically.
- **`mutedRef` pattern at `useAudioCues.ts:99-102`** — useRef + sync-on-effect mirror of React state, with synchronous-pre-await capture in `start` (line 223) and `reconstructEngine` (line 292). `timbreRef` clones this pattern verbatim per D-08.
- **`scheduleNextCue` boundary forwarder at `audioEngine.ts:175-188`** — already accepts `{ newPhase, audioTime, phaseDurationSec }`; engine retains the timbre at construction and forwards it to `scheduleInCueForTimbre` / `scheduleOutCueForTimbre` without adding a per-call `timbre` argument. Phase 18 plumbing in this function is the timbre lookup, not a signature change.
- **`useVariantChoice.ts` (Phase 17 Plan 04)** — picker-side hook with `loadPrefs` read + `savePrefs` write + `'hrv:prefs-changed'` dispatch + optimistic local React state. Mirror for `useTimbreChoice` is verbatim with `variant → timbre` rename.
- **`ThemePicker.tsx` radiogroup body** — name capitalization via `id.charAt(0).toUpperCase() + id.slice(1)`, selected/unselected token classes, focus-visible ring, `aria-checked` + `aria-labelledby` semantics. TimbrePicker mirrors this with 4 timbres in grid-cols-2 (2×2) or grid-cols-4 (1×4) — planner picks (4 timbres fits both; theme picker uses grid-cols-3 for 6 themes).

### Established Patterns

- **Phase 14 D-15 / Phase 15 D-15 / Phase 16 / Phase 17 D-18** — zero net-new npm deps. All new code uses existing Web Audio + React + Tailwind v4 + Vitest surfaces.
- **Phase 17 D-22** — `'hrv:prefs-changed'` CustomEvent reuse with `detail.key` filter. Phase 18 uses `detail.key === 'timbre'` (D-18).
- **Phase 9 AUDIO-01 reconstruction generation counter** — at `useAudioCues.ts:86`. Capture-at-start of timbre fits ON TOP of the existing generation-counter cancellation logic; no change to AUDIO-01 mechanics. The new `timbreRef` read at the top of `reconstructEngine` happens BEFORE the generation stamp, so a cancelled reconstruction's captured timbre is never used.
- **Phase 5.1 D-08 / Phase 9 mute fade-out** — the active-cue Set-based mute fade-out (`audioEngine.ts:88-103` + WR-08 Set at line 141) does not depend on the timbre; the envelope GainNode is the only thing the fade-out touches, and that's identical across timbres. No Phase 18 work needed for mute fade-out parity.

### Integration Points

- **App.tsx `onStartClick`** — adds one `loadPrefs().timbre` read + threads the value to `audioStart(plan, capturedTimbre)`. Mirror of the `sessionVariantRef.current = liveVariant` snapshot site at line 332 (D-10).
- **SettingsDialog.tsx** — NOT edited. The `<TimbrePicker disabled={inSessionView} />` slot is already wired from Phase 15.
- **Phase 19 (Language Switching)** — TimbrePicker label set is small (4 names, capitalized English). Phase 19 will route these through the `UiStrings` map. D-06 chose name-only specifically to keep this surface tiny.
- **iOS recovery path (Phase 5.1)** — reconstruction-preserves-timbre per D-11 covers the iOS visibility-suspend → user-tap-resume flow. No new branching needed in the visibility listener (`useAudioCues.ts:188-201`).

</code_context>

<specifics>
## Specific Ideas

- **Bell partials** — `1.0 / 2.5 / 4.0` (lightly inharmonic). 2.5 is the distinguishing ratio (not a Bowl harmonic; not as sharp as 4.16).
- **Sine partials** — single `1.0`-ratio partial. Filter is near-transparent (`8000 Hz / Q=0.3`) to clean any harmonics from `oscillatorType='sine'` quantization without coloring the pure tone.
- **Chime partials** — Bowl stack (`1.0 / 2.76 / 5.4`) + one extra high partial at `7.6` for shimmer. Planner may experiment with a 5th partial at ~10.0× if dev-server smoke reveals the 4-partial shimmer is too subtle. `peakGain` reduced to 0.16 to compensate equal-loudness.
- **Bowl preset** — copy module-level constants verbatim. TIMBRE-02 byte-identical proof = git diff shows numeric move, no numeric change.
- **TimbrePicker grid** — 4 buttons; planner picks `grid-cols-2` (2×2) vs `grid-cols-4` (1×4) after dev-server smoke. Both fit native `<dialog>` width comfortably.
- **Filter on Sine** — gentle high-cut (8kHz/Q=0.3) is near-transparent for a pure sine wave; included only for code-shape symmetry with the other 3 presets so the parameterized `scheduleBowlCue` doesn't need a "filter optional" branch.
- **TIMBRE-05 guard test** — `it('every preset uses A4/A3 fundamentals')` over `Object.values(TIMBRE_PRESETS)` asserting `preset.fundamentalHzIn === 440 && preset.fundamentalHzOut === 220`. Cheap, prevents future regression (D-21).

</specifics>

<deferred>
## Deferred Ideas

- **Per-timbre lead-in tick.** D-07 keeps the 1200Hz square tick fixed. Revisit only if user feedback shows the countdown "feels disconnected" from the chosen timbre.
- **Per-timbre sustain-floor tuning.** D-12 shares logic. Per-timbre `sustainFloorRatio` / `fadeOutTau` / `fadeOutLeadSec` fields on `TimbrePreset` could be added later if a specific timbre sounds bad at low BPM with shared values (no current evidence — defer to v1.x).
- **In-app audio preview button.** REQUIREMENTS.md "Out of Scope". Adds a second AudioContext unlock-gesture path; bundle complexity not justified for 4 timbres.
- **Per-timbre name + descriptor copy.** D-06 chose name-only. If user testing shows "Bowl/Bell/Sine/Chime" alone is unclear, add a one-line descriptor (research-preferred: "Bowl — warm strike, long sustain") in v1.x. Phase 19 i18n surface widens by 4 strings × locale.
- **Per-timbre SVG glyph in picker.** D-06 chose name-only. Mirror the VariantPicker shape-swatch posture if user feedback shows the names are ambiguous.
- **Visual cue highlight per timbre.** Tinting the active orb/variant by timbre identity. Out of Phase 18 scope; would couple audio + visual systems unnecessarily.
- **PeriodicWave / custom waveforms.** All 4 presets use `OscillatorType='sine'` + partial stacking. Revisit only if a future preset needs character impossible to synthesize via partial-stacked sines (e.g. a square-wave-like Chime).
- **More than 4 timbres.** `TIMBRE_OPTIONS` locked at 4 per Phase 14 D-01. Adding a 5th requires editing `src/domain/settings.ts` (Phase 14 D-09 invariant) + adding a preset to `TIMBRE_PRESETS`. The data-driven preset record (D-01) makes adding presets trivial — defer until validated demand.
- **Variant-style sibling files (`src/audio/bowl.ts` / `bell.ts` / etc).** Phase 17 went sibling-files for OrbShape/SquareShape/RingShape; Phase 18 stays with the preset-record approach because audio presets are pure data (8 numeric fields each), not component shapes. If future presets need imperative DSP code (e.g. PeriodicWave generation), revisit the sibling-file split.
- **Removing `scheduleInCue`/`scheduleOutCue` wrappers.** D-01 leaves the choice to planner — either keep them as Bowl-only thin wrappers for signature stability (smaller diff) OR delete and migrate all callers (cleaner long-term, slightly larger diff).
- **Phase 5.1 D-08 mute fade-out per-timbre tuning.** Mute fade-out uses a hard-coded `MUTE_FADE_TIME_CONSTANT = 0.05` (~150ms). Sine/Bell may want a longer fade for character coherence. Defer to v1.x — current fade is timbre-agnostic and works.

### Reviewed Todos (not folded)

- `2026-05-13-themes-aesthetic-refresh.md` (score 0.6, keyword match only) — concerns Phase 16.x palette aesthetic, addressed by Phase 16.3 closure. Not in Phase 18 scope.

</deferred>

---

*Phase: 18-audio-timbres*
*Context gathered: 2026-05-14 via /gsd-discuss-phase*
