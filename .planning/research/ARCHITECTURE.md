# Architecture Research

**Domain:** HRV breathing webapp — v1.1 Customization integration
**Researched:** 2026-05-12
**Confidence:** HIGH — based on direct codebase inspection of all source files at HEAD `3bdb69b`

## Integration Overview

v1.1 adds five customization features to the existing v1.0.1 baseline. Each maps to a specific set of integration points. The baseline architecture is not restructured — v1.1 extends it.

```
EXISTING (v1.0.1)                          v1.1 ADDITIONS
─────────────────────────────────────────────────────────────────────
src/domain/          (pure math, untouched) ← No v1.1 domain changes
src/hooks/
  useSessionEngine   (untouched)
  useAudioCues       (timbre ref injection)  ← CUST-02
  useWakeLock        (untouched)
  usePrefersReducedMotion (untouched)
src/components/
  BreathingShape     (variant dispatch)      ← CUST-03 + inner-ring fix [2026-05-12 update] The "inner-ring fix" is reduced-motion suppression in theme.css only; no BreathingShape.tsx edit. See `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md` D-01.
  SettingsForm       (unchanged)
  + NEW: SettingsDialog                     ← new: customization UI surface
src/audio/
  cueSynth           (new timbre presets)    ← CUST-02
  audioEngine        (timbre plumbing)       ← CUST-02
src/content/
  learnContent       (section-keyed, unchanged for v1.1)
  + NEW: uiStrings                          ← I18N-01
src/storage/
  storage            (prefs?: unknown field) ← additive envelope change
  settings           (unchanged)
  stats              (unchanged)
  + NEW: prefs                              ← CUST-01/02/03/I18N-01
src/styles/
  theme.css          (new theme blocks)      ← CUST-01
src/app/
  App                (prefs wiring)          ← CUST-01/02/03/I18N-01
```

## Feature-by-Feature Integration Points

### Warm-up: Inner-Ring UX Symmetry

Issue B carry-forward from Phase 5.1: the outer ring appears at `MAX_SCALE` as the "In phase arrival" visual cue, but the inner ring appears throughout the Out phase rather than appearing precisely at `MIN_SCALE` (the Out-phase arrival point). The fix is contained entirely in `src/components/BreathingShape.tsx`.

**Files touched:**
- `src/components/BreathingShape.tsx` — adjust inner-ring rendering or positioning so the ring appearance coincides with orb edge reaching `MIN_SCALE`
- `src/styles/theme.css` — possibly adjust `.orb-ring--inner` CSS rule if the fix requires a timing or opacity change

**What to preserve:**
- `[data-phase='out'] .orb-ring--inner { opacity: 1 }` CSS gate must remain (or equivalent)
- `BreathingShapeLeadIn` must mirror any `BreathingShapeBody` change per the existing D-22 invariant
- The `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2` centering pattern (WR-03 — spec-safe across older Safari)

**Risk:** LOW — isolated to one component, no hook or domain changes.

[2026-05-12 update] Issue B was reduced-motion-only in actual user UAT (2026-05-12); normal-motion inner-ring behavior is correct as-is. Fix is one CSS rule in `theme.css` `@media (prefers-reduced-motion: reduce)`, not BreathingShape.tsx. See `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md` D-01 / D-03.

---

### CUST-01: Theme System

**Approach:** Tailwind v4 `@theme` block per-theme override inside `src/styles/theme.css` plus a `data-theme` attribute on `<html>`. No external theme-provider library. This is the natural extension of the existing token system — the `@theme {}` block already defines all visual tokens, and `[data-theme='dark'] { ... }` blocks rebind them.

**Why `data-theme` attribute over class-based or React Context:**
- The existing `@theme {}` block is a single-root token definition. `[data-theme='dark']` selector overrides slot cleanly into the existing CSS structure.
- Attribute lives on `<html>` and all CSS consumers inherit it automatically — zero React re-renders for visual token changes.
- Tailwind v4 is CSS-first (no `tailwind.config.js` in this project) and CSS custom property inheritance is native.

**Files touched:**
- `src/styles/theme.css` — add `[data-theme='dark'] { ... }` blocks (and any additional named themes) that rebind `--color-breathing-bg`, `--color-breathing-accent`, `--color-orb-*`, `--color-ring-*` tokens
- `src/storage/prefs.ts` (NEW) — `loadPrefs`, `savePrefs`, `coercePrefs`
- `src/storage/storage.ts` — `Envelope` interface gets `prefs?: unknown` field
- `src/app/App.tsx` — read `loadPrefs()` at mount; set `document.documentElement.dataset.theme` reactively on prefs change; write `savePrefs()` on change
- `src/components/SettingsDialog.tsx` (NEW) — theme picker
- `src/components/BreathingShape.tsx` — zero changes; already reads from CSS variables exclusively

**No changes to:** `src/domain/`, `src/hooks/`, `src/audio/`, `src/content/`

---

### CUST-02: Audio Timbre System

**Approach:** Extend `cueSynth.ts` with timbre-dispatch functions above the existing `scheduleInCue`/`scheduleOutCue`/`scheduleTick`. The existing functions are preserved unchanged — the dispatch layer adds a selection indirection keyed by `TimbreId`.

**Files touched:**
- `src/audio/cueSynth.ts` — add `scheduleInCueForTimbre(timbre: TimbreId, audioCtx, when, destination, phaseDurationSec?)` and `scheduleOutCueForTimbre` dispatch functions. Bowl (`'bowl'`) routes to existing `scheduleInCue`/`scheduleOutCue`. A new `'chime'` timbre uses a simpler sine wave with a shorter decay. `'none'` returns a synthetic no-op `CueHandle` with a past `cleanupAt`.
- `src/audio/audioEngine.ts` — `createAudioEngine` receives a `timbre: TimbreId` option (default `'bowl'`). `scheduleLeadIn` and `scheduleNextCue` forward the timbre to cueSynth dispatch.
- `src/hooks/useAudioCues.ts` — add `timbreRef = useRef<TimbreId>('bowl')` alongside `mutedRef`. Thread timbre through `start(plan, timbre)` and replay `timbreRef.current` in `reconstructEngine` (same pattern as `mutedRef`).
- `src/app/App.tsx` — pass `prefs.timbre` to `audio.start(plan, prefs.timbre)` in `onStartClick`.

**Mid-session timbre change contract:**
Timbre is fixed at session start — do not allow live switching. Reasons: switching mid-session would require either AudioContext reconstruction (breaks dual-anchor, forces a new lead-in) or parallel audio graphs (unjustified complexity). The UX contract: disable the timbre picker in SettingsDialog while `inSessionView` is true (same pattern as BPM/ratio inputs in `SettingsForm`). The preference is stored immediately so the user can see the selection; it applies on the next `audio.start()`.

**Reconstruction contract:** `reconstructEngine` in `useAudioCues.ts` currently captures `mutedRef.current` synchronously before any `await`. Add the same capture for `timbreRef.current`:
```typescript
const currentTimbre = timbreRef.current  // captured before any await
// ...
newEngine = await createAudioEngine({ timbre: currentTimbre, onStateChange: handleStateChange })
```
This ensures the reconstructed engine uses the session's original timbre, not any prefs change the user may have made since session start.

**CueHandle contract is unchanged:** All timbres return `{ envelope, scheduledAt, cleanupAt }`. The `'none'` timbre returns a synthetic handle with `cleanupAt = when - 1` (immediately expired, pruned on first `pruneExpiredCues` call).

---

### CUST-03: Visual Variant System

**Approach:** `BreathingShape` dispatches to a variant component based on a new `variant` prop. All variants receive the same `SessionFrame` contract — no variant owns its own timing.

**Files touched:**
- `src/components/BreathingShape.tsx` — top-level `BreathingShape` receives `variant: VisualVariantId` prop (defaulting to `'orb'`) and dispatches to `BreathingShapeOrb` (current `BreathingShapeBody`, renamed) or new variant components. `BreathingShapeLeadIn` is shared across all variants (or each variant provides its own lead-in sub-component for the lead-in digit case).
- `src/app/App.tsx` — pass `prefs.variant` to `<BreathingShape variant={prefs.variant} ... />`

**Invariant — no variant owns timing:** All variants MUST derive their animation from `frame.phaseProgress` passed as a prop or CSS custom property. CSS animations on a variant are only for decorative effects (shimmer, color pulse) that do not need to be phase-accurate; phase-accurate motion is always JS-driven via the `liveFrame` rAF loop. This prevents the "multiple competing timers" anti-pattern.

**`usePrefersReducedMotion` hook:** Each animated variant subscribes to this hook per the existing pattern. The hook mounts only when there is an active frame, so subscription cost is proportional to usage.

**CSS tokens:** Variants read from the same `--color-orb-*` / `--color-ring-*` tokens in `theme.css`. New variant-specific tokens go in the same `@theme {}` block — no separate CSS files.

**No hook changes:** `useSessionEngine`, `useAudioCues`, `useWakeLock` are untouched.

---

### I18N-01: Language Switching

**Approach:** Add `src/content/uiStrings.ts` parallel to `learnContent.ts`. The `learnContent.ts` section-keyed shape (already I18N-ready per v1.0 D-12) is the model: a locale-keyed record of typed string objects.

**Files touched:**
- `src/content/uiStrings.ts` (NEW) — `UI_STRINGS` record keyed by `LocaleId`. Covers: button labels, dialog copy, stats labels, settings labels, disclaimer text, aria labels.
- `src/content/learnContent.ts` — no changes for v1.1 (English-only; locale-keying is deferred until a second locale lands).
- `src/components/` — components receive string props or a locale-strings slice from App
- `src/app/App.tsx` — selects `UI_STRINGS[prefs.locale]` and passes string objects to children

**RTL deferred:** The `dir` attribute on `<html>` is the extension point. No RTL layout changes in v1.1.

**No runtime i18n framework at v1.1:** At English-plus-one-locale stage, the typed record pattern from `learnContent.ts` is sufficient and zero-overhead. Add a framework (e.g., `react-i18next`) when locale count exceeds ~3 or pluralization/interpolation becomes needed. The typed-record call sites (`strings.button.start`) migrate to `t('button.start')` mechanically.

**Prop-drilling vs Context:** Prop-drill the locale strings from App for v1.1. A `LocaleContext` is appropriate when 3+ deep component trees need access; at v1.1 scope most string consumers are direct children of App or one level down.

---

### Settings UI Surface (SettingsDialog)

All four CUST/I18N features need a user-accessible UI. The v1.0.1 dialog pattern is clone-not-extract (`native <dialog>` + `modal-fade` class). `SettingsDialog` follows this pattern exactly.

**Files touched:**
- `src/components/SettingsDialog.tsx` (NEW) — native `<dialog>` with `modal-fade`; contains theme picker, timbre picker, variant picker, locale picker; `onClose` callback pattern identical to `LearnDialog`
- `src/app/App.tsx` — adds `settingsDialogOpen` state, `onSettingsClick`/`onSettingsClose` handlers; renders `<SettingsDialog prefs={prefs} onPrefsChange={setPrefs} open={...} onClose={...} />`; settings anchor disabled during `inSessionView` per D-03 disable-not-hide contract
- A settings trigger button or icon in the UI, positioned analogously to `LearnAnchor`

**During-session behavior:** SettingsDialog is disabled/hidden during `inSessionView`. Theme and locale changes apply immediately (CSS attr swap, string swap — no session-lifecycle dependency). Timbre and variant changes are stored immediately but the picker controls show a "applies next session" annotation or are disabled while running.

---

## Prefs Data Model

All four features share one prefs object stored as the `prefs` subtree of the existing envelope. One read, one write, one coercer, one type.

```typescript
// src/storage/prefs.ts

export type ThemeId = 'default' | 'dark'          // expand as themes land
export type TimbreId = 'bowl' | 'chime' | 'none'
export type VisualVariantId = 'orb' | 'ring-pulse' | 'minimal'
export type LocaleId = 'en'                        // expand per I18N-01

export interface UserPrefs {
  theme: ThemeId
  timbre: TimbreId
  variant: VisualVariantId
  locale: LocaleId
}

export const DEFAULT_PREFS: UserPrefs = {
  theme: 'default',
  timbre: 'bowl',
  variant: 'orb',
  locale: 'en',
}
```

## Envelope Schema Strategy

**No STATE_KEY or STATE_VERSION bump needed for v1.1.**

The existing D-01 spread-then-override in `readEnvelope` preserves unknown top-level fields:

```typescript
return { ...p, version: onDiskVersion }
```

Adding `prefs?: unknown` to the `Envelope` TypeScript interface is sufficient. The runtime already round-trips unknown fields. The write path stamps `STATE_VERSION = 1` on every write — the prefs subtree is carried along transparently.

**Backward compatibility (v1.0.1 client reads v1.1 envelope):** The v1.0.1 `coerceSettings`/`coerceMute`/`coerceStats` only look at their respective subtrees; `prefs` is silently ignored. Settings and stats survive intact.

**Forward compatibility (v1.1 client reads v1.0.1 envelope):** `prefs` is absent, so `coercePrefs(undefined)` returns `DEFAULT_PREFS`. No migration needed.

**Acceptable risk:** If a v1.0.1 browser overwrites a v1.1-written envelope, the `prefs` subtree is dropped (the v1.0.1 write path does not carry `prefs`). This is acceptable for v1.1: prefs are preferences (non-critical), and the next v1.1 read reconstructs from `DEFAULT_PREFS`.

**Anti-pattern to avoid:** Do NOT store prefs under a separate localStorage key (e.g., `hrv:prefs:v1`). That bypasses the STORAGE-01/02 forward-compat and refuse-downgrade guards, and the STORAGE-03 cross-tab listener only filters on `STATE_KEY`.

**If a future v1.2 feature requires a non-additive schema change** (e.g., renaming a prefs key), bump `STATE_VERSION` then and add migration logic in `readEnvelope` per the WR-05 dual-versioning convention documented in `storage.ts`.

## System Overview — v1.1 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          UI Layer                                │
│  BreathingShape(variant)   SettingsDialog   LearnDialog/others  │
│  driven by liveFrame       prefs pickers    (unchanged v1.0)    │
├─────────────────────────────────────────────────────────────────┤
│                       App.tsx (orchestrator)                    │
│  session + audio + prefs + dialog state                         │
│  document.documentElement.dataset.theme = prefs.theme           │
│  UI_STRINGS[prefs.locale] → passed to children                 │
├─────────────────────────────────────────────────────────────────┤
│                    Hooks Layer                                   │
│  useSessionEngine    useAudioCues(timbre)    useWakeLock         │
│  (unchanged)         timbreRef added         (unchanged)        │
├─────────────────────────────────────────────────────────────────┤
│                    Audio Layer                                   │
│  cueSynth: scheduleInCueForTimbre / scheduleOutCueForTimbre     │
│  audioEngine: createAudioEngine({ timbre, onStateChange })      │
├─────────────────────────────────────────────────────────────────┤
│              Domain Layer (UNTOUCHED)                           │
│  breathingPlan  sessionMath  sessionController  settings        │
├─────────────────────────────────────────────────────────────────┤
│                   Storage Layer                                  │
│  storage.ts: Envelope { version, settings?, mute?, stats?,      │
│              prefs? }   ← prefs?: unknown field added           │
│  prefs.ts (NEW): UserPrefs, coercePrefs, loadPrefs, savePrefs  │
│  settings.ts  stats.ts  format.ts  (unchanged)                 │
├─────────────────────────────────────────────────────────────────┤
│              Content + Style Layer                              │
│  theme.css: @theme {} + [data-theme='dark'] {} blocks          │
│  uiStrings.ts (NEW): UI_STRINGS[locale]                        │
│  learnContent.ts (unchanged for v1.1)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Changes

### Prefs Load/Save Flow

```
App mount
    ↓
loadPrefs() → coercePrefs(envelope.prefs) → DEFAULT_PREFS if absent
    ↓
prefs state = { theme, timbre, variant, locale }
    ├──→ document.documentElement.dataset.theme = prefs.theme  (CSS gate)
    ├──→ UI_STRINGS[prefs.locale] selected → passed to components
    ├──→ prefs.variant passed to <BreathingShape variant={...} />
    └──→ prefs.timbre available for audio.start() at next session start

User changes preference in SettingsDialog
    ↓
onPrefsChange(next) → setPrefs(next) → savePrefs(next) → writeEnvelope
    ├──→ Theme: document.documentElement.dataset.theme = next.theme (immediate)
    ├──→ Locale: UI_STRINGS[next.locale] re-selected (immediate)
    └──→ Timbre / variant: stored; applies at next session start only
```

### Timbre Session-Start Flow

```
onStartClick (user gesture)
    ↓
audio.start(plan, prefs.timbre)
    ↓
useAudioCues: timbreRef.current = timbre (captured synchronously)
    ↓
createAudioEngine({ timbre, onStateChange })
    ↓
scheduleLeadIn → scheduleInCueForTimbre(timbre, ...)
scheduleNextCue → dispatch to cueSynth by timbre
    ↓
[iOS lock-screen fires mid-session]
    ↓
reconstructEngine reads timbreRef.current (stable for session duration)
    → new createAudioEngine({ timbre: timbreRef.current, ... })
```

### Theme Data Flow

```
prefs.theme change
    ↓
document.documentElement.dataset.theme = next.theme
    ↓
CSS: [data-theme='dark'] rebinds --color-breathing-bg, --color-orb-*, etc.
    ↓
All components pick up new values via CSS variable inheritance
    ↓ (zero React re-renders for visual token changes)
```

## Dual-Anchor + Reconstruction Contract Safety

The Phase 3 dual-anchor scheduler and Phase 5.1 reconstruction contracts are preserved unchanged by all v1.1 features:

- **Theme changes:** CSS-only. No audio or engine interaction.
- **Visual variant changes:** React render output only. No timing or audio path.
- **Locale/language changes:** String swaps. No timing or audio path.
- **Timbre changes:** Captured at session start. Reconstruction reads `timbreRef.current` (stable for session duration) using the same synchronous-before-await capture as `mutedRef.current`.

The one new reconstruction obligation: `reconstructEngine` must capture and replay `timbreRef.current` the same way it already captures and replays `mutedRef.current`. This is a three-line addition — see the timbre section above.

## Suggested Build Order

### Phase A — Inner-ring UX symmetry (warm-up)

Smallest change, no new architecture, validates green-gate posture before the broader v1.1 changes. Issue B is a genuine UX bug.

1. Investigate exact inner-ring arrival timing in `src/components/BreathingShape.tsx`
2. Fix inner-ring coincidence with orb edge at `MIN_SCALE`; mirror in `BreathingShapeLeadIn` (D-22)
3. Possibly adjust `.orb-ring--inner` CSS in `src/styles/theme.css`
4. Green-gate: `tsc && lint && build && test`

[2026-05-12 update] Scope reduced — no timing investigation needed, no BreathingShape.tsx edit. One CSS rule (`.orb-ring--inner { display: none }`) under `@media (prefers-reduced-motion: reduce)` is the complete implementation. See `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md` D-03.

### Phase B — Envelope schema + prefs foundation

All four customization features write to `prefs`. Establishing the type, coercer, load/save, and `DEFAULT_PREFS` first means CUST-01/02/03/I18N-01 each build against a stable foundation.

1. Add `prefs?: unknown` to `Envelope` in `src/storage/storage.ts`
2. Create `src/storage/prefs.ts`: `UserPrefs`, `DEFAULT_PREFS`, `coercePrefs`, `loadPrefs`, `savePrefs`
3. Re-export from `src/storage/index.ts`
4. Wire `loadPrefs()` at App mount (no UI yet — just prefs state)
5. Tests: `src/storage/prefs.test.ts` — coerce fallback, round-trip, forward-compat with missing `prefs` field

### Phase C — Settings UI surface (SettingsDialog)

The dialog shell is needed before per-feature toggles can be tested end-to-end. Build with stub pickers first.

1. `src/components/SettingsDialog.tsx` — native `<dialog>` with `modal-fade`, stub controls
2. App.tsx wiring: `settingsDialogOpen` state, open/close handlers, disabled during `inSessionView`
3. Settings trigger button in the UI
4. Prefs write path: SettingsDialog callbacks → App `setPrefs` → `savePrefs`

### Phase D — Theme tokens (CUST-01)

CSS-only change with immediate visual feedback. Low risk of breaking existing tests.

1. Define `ThemeId` type in `src/storage/prefs.ts` (add to Phase B work)
2. Add theme token blocks to `src/styles/theme.css`
3. App.tsx reactive effect: `document.documentElement.dataset.theme = prefs.theme`
4. SettingsDialog: theme picker controls wired to prefs

### Phase E — Visual variants (CUST-03)

Component-only change. Builds on prefs foundation and SettingsDialog. No audio changes.

1. Rename `BreathingShapeBody` → `BreathingShapeOrb` (the default variant)
2. Add `variant` prop to `BreathingShape` public interface
3. Implement 1–2 additional variants driven by `frame.phaseProgress`
4. App.tsx: pass `prefs.variant` to `<BreathingShape>`
5. SettingsDialog: variant picker

### Phase F — Audio timbres (CUST-02)

Most technically involved because of the reconstruction replay requirement.

1. Add `scheduleInCueForTimbre`/`scheduleOutCueForTimbre` dispatch to `src/audio/cueSynth.ts`
2. Implement at least one additional timbre (e.g., `'chime'`)
3. Add `timbre` option to `createAudioEngine` in `src/audio/audioEngine.ts`
4. Add `timbreRef` to `useAudioCues`; thread timbre through `start()` and `reconstructEngine()`
5. App.tsx: pass `prefs.timbre` to `audio.start(plan, prefs.timbre)` in `onStartClick`
6. SettingsDialog: timbre picker
7. Tests: add timbre-dispatch unit tests in `src/audio/cueSynth.test.ts`

### Phase G — Language switching (I18N-01)

Widest surface area (touches every rendered string) but lowest technical risk. Do this last so string refactoring does not conflict with structural changes from earlier phases.

1. Create `src/content/uiStrings.ts` with `UI_STRINGS` record keyed by `LocaleId`
2. Audit all hardcoded strings in components
3. Thread locale strings from App
4. SettingsDialog: locale picker
5. Tests: each locale entry is complete and non-empty

## Component Responsibilities — v1.1 Changes

| Component | v1.0.1 Responsibility | v1.1 Change |
|-----------|----------------------|-------------|
| `BreathingShape` | Dispatch to body/lead-in | Dispatch by `variant` prop; inner-ring fix [2026-05-12 update] Inner-ring fix lives in `theme.css`, not `BreathingShape.tsx`. See `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md` D-01. |
| `BreathingShapeBody` | Single orb implementation | Renamed `BreathingShapeOrb`; behavior unchanged |
| `SettingsDialog` (NEW) | n/a | Theme / timbre / variant / locale pickers |
| `App.tsx` | Session orchestration | Prefs state; theme attr setter; timbre pass-through |
| `cueSynth.ts` | Bowl cue generation | Timbre dispatch table added above existing functions |
| `audioEngine.ts` | Stateful AC lifecycle | `timbre` option on `createAudioEngine` |
| `useAudioCues.ts` | Audio hook | `timbreRef` added; timbre threaded through `start`/`reconstructEngine` |
| `storage/prefs.ts` (NEW) | n/a | `UserPrefs` type, coerce, load, save |
| `storage/storage.ts` | Envelope r/w | `prefs?: unknown` field added to `Envelope` interface |
| `content/uiStrings.ts` (NEW) | n/a | Locale-keyed UI string records |
| `styles/theme.css` | Single default token set | Per-theme override blocks |

## Anti-Patterns to Avoid

### Anti-Pattern 1: Mid-Session Timbre Switch

**What goes wrong:** Applying a timbre change immediately mid-session requires either AudioContext reconstruction (breaks dual-anchor, forces a new lead-in) or a parallel audio graph (unjustified complexity).

**Prevention:** Disable the timbre picker in SettingsDialog while `inSessionView` is true, mirroring how BPM/ratio controls are disabled in `SettingsForm`. Store the selection immediately; apply at next `audio.start()`.

### Anti-Pattern 2: Theme Provider React Context

**What goes wrong:** A `ThemeContext` with a React Provider causes all subscribed components to re-render on theme change — unnecessary because theme tokens are CSS variables that components already read via `var(--token)`.

**Prevention:** Use `document.documentElement.dataset.theme` to gate CSS `[data-theme]` selectors. React state holds the selected `ThemeId` for persistence and picker binding; the DOM attribute is the CSS mechanism. No React Context needed.

### Anti-Pattern 3: Separate I18N Framework for v1.1

**What goes wrong:** Adding `react-i18next` or `formatjs` at English-plus-one-locale stage adds ~50 KB bundle weight, build configuration, and a new mental model for what is a typed-record lookup.

**Prevention:** Use the `learnContent.ts` section-keyed pattern extended to UI strings. The migration path is mechanical: `strings.button.start` call sites become `t('button.start')` when a framework is warranted.

### Anti-Pattern 4: Visual Variant Owns Its Own Timer

**What goes wrong:** A variant using CSS `animation-duration` tied to BPM creates a second competing timer. At 5.5 BPM the phase is ~5.45 s; a hardcoded `5s` animation drifts immediately and users notice when visual and audio cues diverge.

**Prevention:** All variants MUST derive phase-accurate motion from `frame.phaseProgress` (prop or CSS custom property `--phase-progress`). CSS animations on variants are only for decorative effects that do not need to be phase-accurate.

### Anti-Pattern 5: Prefs in a Separate localStorage Key

**What goes wrong:** A separate key (e.g., `hrv:prefs:v1`) bypasses the STORAGE-01/02 forward-compat and refuse-downgrade guards, and requires a second STORAGE-03 cross-tab listener.

**Prevention:** Store all prefs inside the existing `STATE_KEY` envelope under the `prefs` subtree. The D-01 spread-then-override in `readEnvelope` handles additive top-level fields transparently.

## Modified Files Summary

| File | Change | Risk |
|------|--------|------|
| `src/components/BreathingShape.tsx` | Inner-ring fix; variant dispatch | LOW [2026-05-12 update] BreathingShape.tsx receives no Phase 13 edit; `theme.css` carries the reduced-motion suppression change. See `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md` D-01. |
| `src/styles/theme.css` | Theme override blocks; possibly inner-ring CSS | LOW |
| `src/audio/cueSynth.ts` | Timbre dispatch table | MEDIUM |
| `src/audio/audioEngine.ts` | `timbre` option on `createAudioEngine` | MEDIUM |
| `src/hooks/useAudioCues.ts` | `timbreRef`; thread timbre through `start`/`reconstructEngine` | MEDIUM |
| `src/storage/storage.ts` | Add `prefs?: unknown` to `Envelope` | LOW |
| `src/storage/index.ts` | Re-export `prefs.ts` | LOW |
| `src/app/App.tsx` | Prefs state; theme attr setter; timbre pass-through; SettingsDialog wiring | MEDIUM |

## New Files

| File | Purpose |
|------|---------|
| `src/storage/prefs.ts` | `UserPrefs` type, `coercePrefs`, `loadPrefs`, `savePrefs` |
| `src/components/SettingsDialog.tsx` | Native `<dialog>` with preference pickers |
| `src/content/uiStrings.ts` | Locale-keyed UI string records |

## Untouched Files

`src/domain/` (all), `src/hooks/useSessionEngine.ts`, `src/hooks/useWakeLock.ts`, `src/hooks/usePrefersReducedMotion.ts`, `src/storage/settings.ts`, `src/storage/stats.ts`, `src/storage/format.ts`, `src/content/learnContent.ts`, `src/components/SettingsForm.tsx`, `src/components/SettingsStepper.tsx`, `src/components/SessionControls.tsx`, `src/components/SessionReadout.tsx`, `src/components/StatsFooter.tsx`, `src/components/LearnAnchor.tsx`, `src/components/LearnDialog.tsx`, `src/components/ResetStatsDialog.tsx`, `src/components/EndSessionDialog.tsx`, `src/main.tsx`

## Sources

- Direct codebase inspection at HEAD `3bdb69b`: `src/styles/theme.css`, `src/storage/storage.ts`, `src/audio/cueSynth.ts`, `src/audio/audioEngine.ts`, `src/hooks/useAudioCues.ts`, `src/components/BreathingShape.tsx`, `src/app/App.tsx`, `src/content/learnContent.ts`, `src/domain/settings.ts`, `src/storage/settings.ts`, `src/storage/index.ts`, `src/index.css`, `vite.config.ts`, `package.json`
- `.planning/PROJECT.md` — v1.1 milestone scope, envelope D-01 spread-then-override decision, strict baseline invariants, WR-05 dual-versioning convention
- `.planning/milestones/v1.0-research/ARCHITECTURE.md` — v1.0 architecture intent (historical context)
- Tailwind CSS v4 CSS-first configuration — `@tailwindcss/vite ^4.3.0` in `package.json`; no `tailwind.config.js` file confirms v4 CSS-first mode; `@theme {}` and per-selector override blocks are the v4 token mechanism

---
*Architecture research for: HRV breathing webapp v1.1 customization integration*
*Researched: 2026-05-12*
