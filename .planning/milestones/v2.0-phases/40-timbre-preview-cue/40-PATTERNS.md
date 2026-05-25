# Phase 40: Timbre preview cue — Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 6 (4 NEW + 2 EDIT)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/audio/previewContext.ts` (NEW) | pure-audio-module | request-response (sync fire-and-forget) | `src/audio/cueSynth.ts` (header + per-timbre dispatch) + `src/audio/audioEngine.ts:123-143` (user-gesture AC creation) | role-match (composite: 2 analogs — first time a singleton AC is held cross-render, but bare-function-export module style is exact) |
| `src/audio/previewContext.test.ts` (NEW) | unit-test (FakeAudioContext) | request-response | `src/audio/cueSynth.test.ts` lines 1-17 (scaffold), 405-454 (per-timbre dispatch coverage) | exact |
| `src/audio/previewContext.no-audioengine-import.test.ts` (NEW — Claude's Discretion: may absorb into `previewContext.test.ts`) | structural-drift-guard | file-I/O (readFileSync) + regex match | `src/content/content.no-removed-themes.test.ts` (Phase 39 — full structural twin); secondary: `content.no-variants.test.ts`, `content.no-stats-ui.test.ts`, `theme.no-hardcoded-classes.test.ts` | exact (pattern); novel (subject = import graph, not content tokens — minor adaptation) |
| `src/components/TimbrePicker.tsx` (EDIT, ~3 lines at line 19 + line 55) | component (radiogroup) | request-response (onClick handler) | itself, line 55 — the existing onClick is the target site | exact (edit-in-place) |
| `src/components/TimbrePicker.test.tsx` (EDIT, +3 wiring cases) | wiring-test (RTL + userEvent) | request-response | itself, lines 58-70 (click → side effect) + lines 96-108 (disabled=true → no side effect) | exact |
| `.planning/phases/40-timbre-preview-cue/40-HUMAN-UAT.md` (NEW) | UAT-doc | doc | `.planning/phases/37-stats-ui-removal/37-HUMAN-UAT.md` (most recent in-tree HUMAN-UAT.md) | role-match (frontmatter+structure exact; per-phase test items vary) |

---

## Pattern Assignments

### `src/audio/previewContext.ts` (NEW — pure-audio-module, request-response)

**Primary analog (module shape):** `src/audio/cueSynth.ts` (header style + bare-function-export style)
**Secondary analog (AudioContext lifecycle):** `src/audio/audioEngine.ts:123-143`

#### Imports pattern — verbatim from `src/audio/cueSynth.ts:17-18`

```typescript
import { TIMBRE_PRESETS, type TimbrePreset } from './timbres'
import type { TimbreId } from '../domain/settings'
```

Phase 40 only needs `TimbreId` + the per-timbre dispatch function. The minimal import block:

```typescript
import { scheduleInCueForTimbre } from './cueSynth'
import type { TimbreId } from '../domain/settings'
```

**Zero React imports.** Mirrors `cueSynth.ts:1` rule: *"Pure Web Audio synthesis builders. Zero React imports."*

#### Header WHY-only comment pattern — model after `src/audio/cueSynth.ts:1-15`

`cueSynth.ts` header style:

```typescript
// Pure Web Audio synthesis builders. Zero React imports.
// Mirrors the pure-builder + lookup-table pattern of src/domain/breathingPlan.ts.
//
// Phase 18 D-02: Bowl preset DSP recipes now live in src/audio/timbres.ts
// (TIMBRE_PRESETS.bowl). cueSynth dispatches per-timbre via
// scheduleInCueForTimbre / scheduleOutCueForTimbre [...]
```

Phase 40 header should carry the three D-01/D-02/D-03 WHY comments per CONTEXT D-15 (Claude's Discretion):
- D-01 singleton-reuse rationale (PREV-05 latency target — first-tap creation cost paid once)
- D-02 resume-on-every-tap rationale (iOS Safari + Chrome auto-suspend gap)
- D-03 omit-phaseDurationSec rationale (each preset's natural decay envelope IS the audition shape)

#### Core pattern — module-level singleton + lazy ensure + resume + schedule

**Lifecycle reference:** `src/audio/audioEngine.ts:123-143` shows the user-gesture-attached pattern Phase 40 reuses (but in a singleton instead of per-session). Verbatim excerpt:

```typescript
// Lines 123-129 — gesture-attached AudioContext construction
/** Create a new AudioContext + engine. MUST be called from a user-gesture path (D-09).
 *  Throws (rejects) if AudioContext construction fails (D-10 caller branch). */
export async function createAudioEngine(opts: AudioEngineOptions): Promise<AudioEngine> {
  // D-09: AudioContext is constructed here, which is invoked synchronously from the
  // Start session click handler in App.tsx (Plan 04). The browser autoplay policy MUST
  // see a fresh user-gesture chain or AC will start in 'suspended'.
  const audioCtx = new AudioContext()

// Lines 131-143 — suspended-state resume + failure handling
if (audioCtx.state === 'suspended') {
  try {
    await audioCtx.resume()
  } catch (err) {
    await audioCtx.close().catch(() => undefined)
    throw err
  }
}
```

**Phase 40 deviation from audioEngine:**
- `createAudioEngine` is `async` and `await`s `resume()` before returning. Phase 40 (per D-02 + D-12) calls `ctx.resume()` synchronously and does NOT await — fire-and-forget. The schedule call follows in the same microtask. Document the deviation inline (Web Audio scheduling tolerates same-tick `resume()` + `scheduleInCueForTimbre()`).
- `audioEngine.ts:140` closes the AC on `resume()` rejection. Phase 40 deliberately does NOT close the singleton on rejection — preview is best-effort, no fallback path is needed, and closing would defeat the singleton-reuse latency goal.

**Singleton + ensure helper shape (suggested — planner picks exact helper names per D-15):**

```typescript
let ctx: AudioContext | null = null

function ensurePreviewContext(): AudioContext {
  if (ctx === null) {
    // First tap — gesture-attached creation (every entry point is onClick).
    ctx = new AudioContext()
  }
  return ctx
}
```

#### Per-timbre dispatch signature — verbatim from `src/audio/cueSynth.ts:198-207`

```typescript
export function scheduleInCueForTimbre(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
  phaseDurationSec?: number,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  return scheduleBowlCue(audioCtx, when, destination, preset, 'in', phaseDurationSec)
}
```

**Phase 40 call-site (consume verbatim, D-03 omits `phaseDurationSec`):**

```typescript
scheduleInCueForTimbre(ctx, ctx.currentTime, ctx.destination, timbre)
```

The `when = ctx.currentTime` argument is the "play immediately" Web Audio idiom — same shape audioEngine uses for boundary cues, but with the in-session lead-time arg removed since this is a one-shot.

#### Public surface — single bare-function export (D-06)

Mirrors `cueSynth.ts` export style — every `export function` is a top-level bare function, never a class or default object. The full Phase 40 surface:

```typescript
export function playInhalePreview(timbre: TimbreId): void {
  const ctx = ensurePreviewContext()
  if (ctx.state === 'suspended') {
    // D-02: don't await — same-tick resume + schedule is supported by Web Audio.
    // (Cast to void documents the deliberate fire-and-forget.)
    void ctx.resume()
  }
  scheduleInCueForTimbre(ctx, ctx.currentTime, ctx.destination, timbre)
}
```

`ensurePreviewContext()` and the suspended-state check stay module-private — `previewContext.ts` exports exactly one function (D-06).

---

### `src/audio/previewContext.test.ts` (NEW — unit-test, FakeAudioContext)

**Analog:** `src/audio/cueSynth.test.ts` (full structural twin)
**Polyfill:** `vitest.setup.ts:138-277` `FakeAudioContext` (already installed globally; nothing to add)

#### Imports + scaffold — verbatim from `src/audio/cueSynth.test.ts:1-17`

```typescript
import { describe, expect, it, vi } from 'vitest'

import {
  scheduleInCue,
  scheduleInCueForTimbre,
  scheduleOutCue,
  scheduleOutCueForTimbre,
  scheduleTick,
  type CueHandle,
} from './cueSynth'
import { TIMBRE_OPTIONS } from '../domain/settings'
import { TIMBRE_PRESETS } from './timbres'

// Test helper: relies on FakeAudioContext polyfill installed by vitest.setup.ts.
function createAc(): AudioContext {
  return new AudioContext()
}
```

**Phase 40 adaptation:** test target is `playInhalePreview`, which holds an internal singleton AC — so tests must spy via `vi.spyOn(window, 'AudioContext')` or stub `AudioContext` per-test, OR reset the singleton between tests. Two clean options (planner picks):

1. **Module-level reset hook** — export `__resetForTest()` (named with `__` prefix, like the existing `audioEngine` test pattern would use a `vi.resetModules()` boundary). Each `beforeEach` calls `vi.resetModules()` and re-imports.
2. **`vi.spyOn(window, 'AudioContext')`** to intercept the `new AudioContext()` call and grab the instance for assertions.

Recommend option (1) `vi.resetModules()` + dynamic re-import per test — keeps `previewContext.ts` free of test-only exports.

#### Per-timbre coverage pattern — model after `src/audio/cueSynth.test.ts:412-437`

The existing `it.each(TIMBRE_OPTIONS)` per-timbre pattern is the analog for D-10(a) "one cue per call with correct TimbreId":

```typescript
describe('scheduleInCueForTimbre (all timbres)', () => {
  it.each(TIMBRE_OPTIONS)('%s: oscillator count equals preset.partials.length', (timbre) => {
    const ac = createAcForTimbre()
    const oscSpy = vi.spyOn(ac, 'createOscillator')
    scheduleInCueForTimbre(ac, 1.0, ac.destination, timbre)
    expect(oscSpy).toHaveBeenCalledTimes(TIMBRE_PRESETS[timbre].partials.length)
  })
```

**Phase 40 D-10(a) test case (mocking `scheduleInCueForTimbre`):**

```typescript
import * as cueSynth from './cueSynth'

it.each(TIMBRE_OPTIONS)('%s: playInhalePreview calls scheduleInCueForTimbre once with the right TimbreId, phaseDurationSec=undefined', (timbre) => {
  const spy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
  playInhalePreview(timbre)
  expect(spy).toHaveBeenCalledTimes(1)
  expect(spy).toHaveBeenCalledWith(
    expect.any(Object),     // ctx
    expect.any(Number),     // when (= ctx.currentTime)
    expect.any(Object),     // ctx.destination
    timbre,                 // TimbreId
    undefined,              // phaseDurationSec omitted — D-03 natural decay
  )
})
```

#### FakeAudioContext `_simulateSuspend` pattern for D-10(b)

`vitest.setup.ts:234-237` exposes a test hook:

```typescript
_simulateSuspend = (): void => {
  this.state = 'suspended'
  this._fireStateChange()
}
```

Phase 40 D-10(b) test ("ctx.resume() invoked when initial ctx.state === 'suspended'"):

```typescript
it('calls ctx.resume() when the singleton AudioContext is suspended on tap', () => {
  // Drive the FakeAudioContext into 'suspended' before the first tap.
  // (Construct via `new AudioContext()` once, simulate suspend, then call playInhalePreview.)
  // Use vi.spyOn(window, 'AudioContext') to capture the singleton instance.
  const acInstances: AudioContext[] = []
  vi.spyOn(window, 'AudioContext').mockImplementation(function (this: AudioContext) {
    const real = new (Object.getPrototypeOf(window.AudioContext).constructor as typeof AudioContext)()
    acInstances.push(real)
    return real
  } as never)
  playInhalePreview('bowl')
  const ctx = acInstances[0]!
  // Simulate iOS Safari auto-suspend BEFORE the next tap, then re-tap.
  ;(ctx as unknown as { _simulateSuspend: () => void })._simulateSuspend()
  const resumeSpy = ctx.resume as ReturnType<typeof vi.fn>
  resumeSpy.mockClear()
  playInhalePreview('bowl')
  expect(resumeSpy).toHaveBeenCalledTimes(1)
})
```

(Planner may simplify if `vi.resetModules()` + per-test `new AudioContext()` instance capture is cleaner.)

#### Singleton-reuse assertion for D-10(c)

```typescript
it('reuses the same AudioContext instance across N consecutive playInhalePreview calls', () => {
  const acCtor = vi.spyOn(window, 'AudioContext')
  playInhalePreview('bowl')
  playInhalePreview('bell')
  playInhalePreview('sine')
  playInhalePreview('flute')
  expect(acCtor).toHaveBeenCalledTimes(1)  // singleton — created once on first tap
})
```

#### Natural-decay assertion for D-10(d) — verifies `phaseDurationSec === undefined`

Covered by the D-10(a) test's last positional arg `undefined`. May also be split into its own assertion for clarity (planner picks).

---

### `src/audio/previewContext.no-audioengine-import.test.ts` (NEW — structural-drift-guard)

**Analog (exact):** `src/content/content.no-removed-themes.test.ts` (Phase 39, full structural twin)
**Pattern lineage:** Phase 26 I18N-07 → Phase 37 STATS-05 → Phase 38 VAR-06 → Phase 39 THM-01..03

**Claude's Discretion (per CONTEXT D-11 / D-15 first bullet):** absorb into `previewContext.test.ts` as one extra case, OR keep as its own file. Recommend: keep as own file (`*.no-*.test.ts` naming convention is established, future contributors will find it via `find src -name "*.no-*.test.*"`).

#### Imports pattern — verbatim from `src/content/content.no-removed-themes.test.ts:44-51`

```typescript
// Reason: node:fs and node:path are available in the Vitest jsdom test environment.
// tsconfig.app.json has types:["vite/client"] which excludes @types/node; the triple-slash
// reference adds Node.js type coverage for this test-only file without altering tsconfig.app.json.
/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
```

#### Phase 40 adaptation — narrow scope to a single file

The Phase 39 guard scans 4 directories recursively for 12 token types. Phase 40 is far narrower: scan ONE file (`src/audio/previewContext.ts`) for forbidden imports. The minimal Phase 40 guard shape:

```typescript
/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PREVIEW_PATH = resolve(__dirname, 'previewContext.ts')

// Phase 40 D-11: PREV-03 (preview plays when muted) is locked structurally.
// `let muted` lives only in audioEngine.ts:160 inside the createAudioEngine
// closure — no exported setter, no module-level state. Proving previewContext.ts
// imports neither ./audioEngine nor any module that re-exports the engine's
// muted state proves the preview cannot be muted by setMuted.
//
// Future "helpfully wire engine into preview" refactors fail this test loudly.
// Deleting this file is the intentional unlock — record rationale in that
// phase's SUMMARY.

const FORBIDDEN_IMPORTS: Array<{ label: string; pattern: RegExp }> = [
  // Direct engine import — the primary lock for PREV-03.
  { label: "import from './audioEngine'", pattern: /from\s+['"]\.\/audioEngine['"]/ },
  // Cover relative-path variants in case previewContext.ts ever moves.
  { label: "import from '../audio/audioEngine'", pattern: /from\s+['"]\.\.\/audio\/audioEngine['"]/ },
  // D-15 Claude's Discretion: cover the indirect path (useAudioCues hook re-exports mute state).
  // Minimal lock per CONTEXT D-11 is './audioEngine'; the hook ban is the wider net.
  { label: "import from '../hooks/useAudioCues'", pattern: /from\s+['"]\.\.\/hooks\/useAudioCues['"]/ },
]

describe('Phase 40 drift-guard: previewContext.ts must not import audioEngine (PREV-03 structural lock)', () => {
  it('previewContext.ts imports neither ./audioEngine nor any module that re-exports muted state', () => {
    const text = readFileSync(PREVIEW_PATH, 'utf-8')
    const hits: string[] = []
    for (const f of FORBIDDEN_IMPORTS) {
      if (f.pattern.test(text)) hits.push(f.label)
    }
    expect(
      hits,
      `previewContext.ts contains forbidden import(s) — PREV-03 structural invariant violated:\n${hits.join('\n')}`,
    ).toEqual([])
  })
})
```

#### "WHY this file exists" header pattern — verbatim shape from `content.no-removed-themes.test.ts:36-40`

```typescript
// WHY this file exists (CONTEXT D-06): Phase 39 collapsed the 5-palette theme system
// to 3 options (light / dark / system) per the spike-010 visual lock. This drift-guard
// locks that done-state against future regressions. It is the lock — any future phase
// that re-introduces a deprecated palette (or claims one of these reserved names)
// explicitly deletes this file with rationale recorded in that phase's SUMMARY.
// Deleting this file is the intentional unlock.
```

Phase 40 header should carry an equivalent block keyed to D-11 + PREV-03.

---

### `src/components/TimbrePicker.tsx` (EDIT — ~3 lines)

**Edit site:** `src/components/TimbrePicker.tsx:19` (add import) + `src/components/TimbrePicker.tsx:55` (onClick handler)

#### Current state — `src/components/TimbrePicker.tsx:19-20`

```typescript
import { TIMBRE_OPTIONS, type TimbreId } from '../domain/settings'
import { useTimbreChoice } from '../hooks/useTimbreChoice'
```

#### Current state — `src/components/TimbrePicker.tsx:48-60` (the button body)

```tsx
return (
  <button
    key={id}
    type="button"
    role="radio"
    aria-checked={selected}
    disabled={disabled}
    onClick={() => { setTimbre(id) }}
    className={`${baseClasses} ${selected ? selectedClasses : unselectedClasses}`}
  >
    {label}
  </button>
)
```

#### Phase 40 edit shape (D-04) — surgical, ~3 lines

**Add import (after line 20):**

```typescript
import { playInhalePreview } from '../audio/previewContext'
```

**Change onClick at line 55:**

```tsx
onClick={() => { setTimbre(id); playInhalePreview(id) }}
```

That is the entire UI diff. No JSX restructure, no prop changes (D-17 still holds), no `useTimbreChoice` change.

#### WHY D-04 picks this site (not a wrapping of `setTimbre`, not a `useEffect`)

- **Not wrapping `setTimbre`:** Phase 18 D-16 invariant — timbre body stays in TimbrePicker.tsx + useTimbreChoice.ts; folding audio into setTimbre would couple storage + audio. Preserve separation.
- **Not `useEffect(() => playInhalePreview(timbre), [timbre])`:** D-05 — `useTimbreChoice` carries cross-tab `storage` listeners (Phase 8/16/14 pattern); an effect would emit preview audio from an inactive tab when timbre changes elsewhere.
- **Preserves Phase 43 verbatim carry-forward:** TimbrePicker.tsx travels into the new App Settings page unchanged; preview wiring rides along.

---

### `src/components/TimbrePicker.test.tsx` (EDIT — +3 wiring cases)

**Analog:** itself (`src/components/TimbrePicker.test.tsx`) — existing tests provide the exact patterns.

#### Existing setup (imports + helpers) — `src/components/TimbrePicker.test.tsx:1-30`

```typescript
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TimbrePicker } from './TimbrePicker'
import { STATE_KEY } from '../storage'
import type { TimbreId } from '../domain/settings'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

function seedTimbre(timbre: TimbreId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre, locale: 'en' },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}

beforeEach(() => { window.localStorage.clear() })

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})
```

#### Mock pattern for `playInhalePreview` — `vi.mock` at top of file

```typescript
vi.mock('../audio/previewContext', () => ({
  playInhalePreview: vi.fn(),
}))
import { playInhalePreview } from '../audio/previewContext'
```

(Hoist the `vi.mock` call ABOVE the `TimbrePicker` import per Vitest hoisting semantics — the mock factory must register before the component module evaluates its imports.)

#### D-10(e) — tap fires playInhalePreview with the right id

Mirror the existing "clicking writes to disk" pattern at `src/components/TimbrePicker.test.tsx:58-70`:

```typescript
// Existing analog (lines 58-70):
it('clicking an option writes the new timbre to disk (savePrefs via useTimbreChoice)', async () => {
  seedTimbre('bowl')
  const user = userEvent.setup()
  render(<TimbrePicker disabled={false} strings={EN_STRINGS_FIXTURE.timbres} sectionLabel={EN_STRINGS_FIXTURE.settings.timbreLabel} />)
  const sineButton = screen.getByRole('radio', { name: 'Sine' })
  await user.click(sineButton)
  // ... assertion
})
```

**Phase 40 D-10(e) addition:**

```typescript
it('clicking an option fires playInhalePreview with the new TimbreId (D-04 onClick wiring)', async () => {
  seedTimbre('bowl')
  const user = userEvent.setup()
  render(<TimbrePicker disabled={false} strings={EN_STRINGS_FIXTURE.timbres} sectionLabel={EN_STRINGS_FIXTURE.settings.timbreLabel} />)
  const sineButton = screen.getByRole('radio', { name: 'Sine' })
  await user.click(sineButton)
  expect(playInhalePreview).toHaveBeenCalledTimes(1)
  expect(playInhalePreview).toHaveBeenCalledWith('sine')
})
```

#### D-10(f) — disabled tap does NOT invoke preview spy (PREV-04 wiring)

Mirror `src/components/TimbrePicker.test.tsx:96-108`:

```typescript
// Existing analog (lines 96-108):
it('when disabled=true, clicking a button does NOT write to disk', async () => {
  seedTimbre('bowl')
  const user = userEvent.setup()
  render(<TimbrePicker disabled={true} strings={EN_STRINGS_FIXTURE.timbres} sectionLabel={EN_STRINGS_FIXTURE.settings.timbreLabel} />)
  const fluteButton = screen.getByRole('radio', { name: 'Flute' })
  await user.click(fluteButton)
  // ... assertion that storage was not written
})
```

**Phase 40 D-10(f) addition:**

```typescript
it('when disabled=true, clicking a button does NOT invoke playInhalePreview (PREV-04)', async () => {
  seedTimbre('bowl')
  const user = userEvent.setup()
  render(<TimbrePicker disabled={true} strings={EN_STRINGS_FIXTURE.timbres} sectionLabel={EN_STRINGS_FIXTURE.settings.timbreLabel} />)
  const fluteButton = screen.getByRole('radio', { name: 'Flute' })
  await user.click(fluteButton)
  expect(playInhalePreview).not.toHaveBeenCalled()
})
```

#### D-10(g) — same-id re-tap fires preview (re-audition semantics)

Novel case; no exact existing analog (existing tests don't repeat clicks). Combine click-then-click pattern with the D-10(e) assertion:

```typescript
it('tapping the currently-selected timbre fires playInhalePreview again (re-audition — D-09)', async () => {
  seedTimbre('bell')
  const user = userEvent.setup()
  render(<TimbrePicker disabled={false} strings={EN_STRINGS_FIXTURE.timbres} sectionLabel={EN_STRINGS_FIXTURE.settings.timbreLabel} />)
  const bellButton = screen.getByRole('radio', { name: 'Bell' })
  await user.click(bellButton)
  await user.click(bellButton)
  expect(playInhalePreview).toHaveBeenCalledTimes(2)
  expect(playInhalePreview).toHaveBeenNthCalledWith(1, 'bell')
  expect(playInhalePreview).toHaveBeenNthCalledWith(2, 'bell')
})
```

---

### `.planning/phases/40-timbre-preview-cue/40-HUMAN-UAT.md` (NEW)

**Analog:** `.planning/phases/37-stats-ui-removal/37-HUMAN-UAT.md` (most recent in-tree HUMAN-UAT.md)

#### Frontmatter + structure — verbatim from `37-HUMAN-UAT.md:1-13`

```markdown
---
status: resolved
phase: 37-stats-ui-removal
source: [37-VERIFICATION.md]
started: 2026-05-20T22:14:00Z
updated: 2026-05-20T22:25:00Z
---

## Current Test

[resolved]

## Tests

### 1. WR-01 — orphan i18n keys (naviKriyaStatsEmptyBody, naviKriyaControlsPlaceholder)
expected: ...
result: ...
```

#### Phase 40 adaptation — 4 items per CONTEXT D-13

- **Item 1 — Cue correctness:** Tap each timbre once. Confirm correct inhale cue at A4 (440 Hz, sine fundamental for all four presets per Phase 18 TIMBRE-05 / D-21). [PREV-01]
- **Item 2 — Mute irrelevance:** Mute via MuteToggle (in-session toggle should NOT affect preview because preview is outside any session and never imports audioEngine). Open Settings; tap timbres — cues remain audible. [PREV-03 empirical confirmation of D-11 structural lock]
- **Item 3 — Rapid-tap overlap feel:** Tap across 3-4 timbres in quick succession. Brief polyphonic overlap is expected (D-08). No glitches / no silence / no crashes. [D-08 empirical]
- **Item 4 — iOS Safari standalone-PWA cold-start (HIGH-SIGNAL):** Open the app fresh on iOS Safari (or installed standalone PWA). Open Settings BEFORE starting any session in this app launch. Tap a timbre — the cue plays. (This exercises the cold AudioContext creation + resume + first oscillator schedule on the platform that historically breaks audio invariants — D-01 + D-02.) [Closest to v1.x carry-forward audio bug surface]

Initial status: `pending` (not `resolved`) — operator marks `resolved` after running each item on real hardware.

---

## Shared Patterns

### Pure-audio-module style (zero React)

**Source:** `src/audio/cueSynth.ts:1`, `src/audio/audioEngine.ts:1-3`, `src/audio/nkCueSynth.ts`, `src/audio/timbres.ts:1`
**Apply to:** `src/audio/previewContext.ts`

Every file under `src/audio/` opens with a comment block declaring purity:

```typescript
// Pure Web Audio synthesis builders. Zero React imports.
```

Then exports bare functions or pure data records. No classes, no default exports, no React imports.

### User-gesture-attached AudioContext creation

**Source:** `src/audio/audioEngine.ts:123-143`
**Apply to:** `src/audio/previewContext.ts` (singleton lazy-create)

The invariant (Phase 5/5.1, Phase 9, Phase 27 PWA-03): `new AudioContext()` MUST be called inside a click/tap handler. The autoplay policy will mark the context `'suspended'` (or refuse outright) otherwise. Phase 40's preview entry point IS a tap onClick — the singleton's first-creation is gesture-attached by construction.

### Drift-guard-as-lock (file-scan + regex)

**Source:** `src/content/content.no-removed-themes.test.ts` (Phase 39), `src/content/content.no-variants.test.ts` (Phase 38 VAR-06), `src/content/content.no-stats-ui.test.ts` (Phase 37 STATS-05), `src/styles/theme.no-hardcoded-classes.test.ts`
**Apply to:** `src/audio/previewContext.no-audioengine-import.test.ts` (D-11)

The pattern: a Vitest spec uses `readFileSync` + regex/substring matchers against production-source text to assert a structural invariant. Lineage: Phase 26 I18N-07 → 37 STATS-05 → 38 VAR-06 → 39 THM-01..03 → 40 PREV-03. Deleting the file is the intentional unlock; future phases that legitimately need to change the invariant delete the guard and record the rationale in their SUMMARY.

### `vi.mock` hoisting for module replacement in component tests

**Source:** No existing TimbrePicker.test.tsx case yet (the file currently uses real `useTimbreChoice` + real `savePrefs`); analogous patterns exist in tests that intercept `import` boundaries. Closest precedent in this codebase: not used in `TimbrePicker.test.tsx` today.
**Apply to:** `src/components/TimbrePicker.test.tsx` (D-10 e/f/g additions)

Standard Vitest pattern — declare the mock above the import block:

```typescript
vi.mock('../audio/previewContext', () => ({
  playInhalePreview: vi.fn(),
}))
import { playInhalePreview } from '../audio/previewContext'
// ... later, in tests:
expect(playInhalePreview).toHaveBeenCalledWith('sine')
```

### FakeAudioContext-based unit testing

**Source:** `vitest.setup.ts:138-277` (global polyfill, installed Phase 3); `src/audio/cueSynth.test.ts` (consumer)
**Apply to:** `src/audio/previewContext.test.ts`

No new test infrastructure needed. `new AudioContext()` inside the module-under-test transparently constructs a `FakeAudioContext`. Test hooks `_simulateSuspend()` / `_simulateInterrupted()` / `_simulateResumeReject()` are available for state-transition coverage (D-10(b) uses `_simulateSuspend`).

### Atomic-commit ordering per Tiger Style

**Source:** Phase 36/37/38/39 PATTERNS precedent + Tiger Style (Phase 7 D-09 / Phase 11 D-17 / Phase 12 D-15)
**Apply to:** Phase 40 plan splits

Suggested commit order (per CONTEXT D-15 Claude's Discretion):

1. `feat(40): add previewContext module + unit tests` — `src/audio/previewContext.ts` + `src/audio/previewContext.test.ts`. Pure audio module lands first, no UI dependency.
2. `feat(40): wire TimbrePicker onClick to playInhalePreview` — `src/components/TimbrePicker.tsx` (3-line edit) + `src/components/TimbrePicker.test.tsx` (+3 wiring cases).
3. `test(40): lock PREV-03 via structural import-graph guard` — `src/audio/previewContext.no-audioengine-import.test.ts` (or absorb into commit 1 if planner picks the single-file route).
4. `docs(40): add HUMAN-UAT.md` — `.planning/phases/40-timbre-preview-cue/40-HUMAN-UAT.md`.

Per-commit gate: `tsc && lint && build && test` all pass.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All 6 files have at least a role-match analog in-tree. The novel-but-traceable piece is the **module-level AudioContext singleton** in `previewContext.ts` — no existing in-tree module holds an AC across renders (audioEngine.ts creates fresh contexts per `createAudioEngine` call, scoped to the session). The lifecycle parts (gesture-attached `new AudioContext()`, suspended-state resume) come from `audioEngine.ts:123-143`; the singleton-reuse rationale is novel-by-design (D-01 PREV-05 latency budget) and warrants the WHY-only header comment per CONTEXT D-15. |

---

## Metadata

**Analog search scope:**
- `src/audio/` (cueSynth.ts, cueSynth.test.ts, audioEngine.ts, timbres.ts, nkCueSynth.ts) — pure-audio-module style + per-timbre dispatch surface + AC lifecycle
- `src/components/TimbrePicker.tsx` + `TimbrePicker.test.tsx` — UI edit site + existing test patterns
- `src/hooks/useTimbreChoice.ts` — read-only confirmation that setTimbre has no audio side-effects
- `src/content/content.no-*.test.ts` (4 files) + `src/styles/theme.no-hardcoded-classes.test.ts` — drift-guard-as-lock lineage
- `vitest.setup.ts` — FakeAudioContext polyfill + test hooks
- `.planning/phases/37-stats-ui-removal/37-HUMAN-UAT.md` — most recent in-tree HUMAN-UAT analog

**Files scanned:** 11 (6 production source + 4 test analogs + 1 doc analog)
**Pattern extraction date:** 2026-05-21
