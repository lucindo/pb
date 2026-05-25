# Phase 45: Ring progress-cue toggle - Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 6 (4 in-scope code/tests + 2 plumbing call sites; +1 spike source)
**Analogs found:** 6 / 6 (all in-codebase except the renderer body, which comes verbatim from spike 011)

This phase is a transcription job, not a design job. The ROADMAP locked the math, the spike locked the render, and every plumbing pattern already exists in `src/featureFlags.ts` + `OrbShape.tsx` + the surface call-site chain. The planner's job per file is to point the executor at the exact analog block to mirror.

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
| --- | --- | --- | --- | --- |
| `src/featureFlags.ts` | feature-flag config | request-response (parse URL → enum) | (same file) `BREATHING_SHAPE_FLAG` + `ORB_IDLE_FLAG` | exact (same file, same shape) |
| `src/featureFlags.test.ts` | unit test | request-response | (same file) `breathingShape` + `orbIdle` test blocks | exact (same file, same shape) |
| `src/components/OrbShape.tsx` | view component (internal branch + new arc renderer) | render | (same file) existing `OrbContainer` outer/inner ring block (lines 303–333) + spike 011 `RingsB` (verbatim transcription) | exact for branch site; verbatim from spike for arc body |
| `src/components/OrbShape.test.tsx` | unit test (RTL) | render assertions | (same file) existing OrbShape DOM assertions + arrow-cue SVG selector (lines 72–78) | exact (same file, SVG-presence assertion pattern already in use) |
| `src/app/BreathingSessionSurface.tsx` | plumbing (prop forwarding) | prop pass-through | (same file) existing `variant` + `idleMode` props forwarded into `OrbShape` | exact (same file, same prop-shape) |
| `src/app/PracticeSessionView.tsx` + `src/app/PracticeScreen.tsx` | plumbing chain | prop pass-through | (same files) existing `variant={vm.featureFlags.breathingShape}` / `idleMode={vm.featureFlags.orbIdle}` chain | exact (drop-in third prop on the same chain) |

**Spike source (verbatim transcription target — not modified):** `.planning/spikes/011-ring-progress-cue/index.html` lines 179–229 (`RingsB` component).

## Pattern Assignments

### 1. `src/featureFlags.ts` (feature-flag config, request-response)

**Analog:** `src/featureFlags.ts` itself — the `BREATHING_SHAPE_FLAG` block is the exact shape to copy.

**Where to add the type** (current lines 7–8):
```typescript
export type BreathingShapeVariant = 'orb-halo' | 'minimal-rings'
export type OrbIdleBehavior = 'still' | 'ambient'
```
Add a sibling:
```typescript
export type RingCueStyle = 'outer-inner' | 'progress-arc'
```

**Where to extend the `FeatureFlags` interface** (current lines 10–14):
```typescript
export interface FeatureFlags {
  switcherIcon: boolean
  breathingShape: BreathingShapeVariant
  orbIdle: OrbIdleBehavior
}
```
Add `ringCue: RingCueStyle` as the fourth field.

**Flag spec pattern to copy verbatim** — `BREATHING_SHAPE_FLAG` (lines 62–71) is the literal template for `RING_CUE_FLAG`:
```typescript
const BREATHING_SHAPE_FLAG = {
  queryParam: 'breathingShape',
  defaultValue: 'orb-halo' as BreathingShapeVariant,
  parse(rawValue: string): BreathingShapeVariant | null {
    const v = rawValue.trim().toLowerCase()
    if (v === 'orb-halo' || v === 'orb' || v === 'halo') return 'orb-halo'
    if (v === 'minimal-rings' || v === 'minimal' || v === 'rings') return 'minimal-rings'
    return null
  },
} satisfies QueryFeatureFlagSpec<BreathingShapeVariant>
```
Map this 1:1 to a new `RING_CUE_FLAG` constant. Aliases per ROADMAP:
- `outer-inner` / `production` / `rings` / `default` → `'outer-inner'`
- `progress-arc` / `progress` / `arc` / `south` → `'progress-arc'`
- queryParam: `'ringCue'`, defaultValue: `'outer-inner'`.
- Trim + lowercase in `parse` (same as `BREATHING_SHAPE_FLAG`).

> Implementation note: `rings` appears in *both* alias lists (ROADMAP lines 240 + `breathingShape` line 67 already maps it to `minimal-rings`). That is fine — the two flags live in independent query params (`?breathingShape=` vs `?ringCue=`) and never share a parser. Mention it explicitly in the plan so the executor doesn't waste a cycle wondering about the duplication.

**Where to wire into `readFeatureFlags`** (current lines 84–90):
```typescript
export function readFeatureFlags(search: string): FeatureFlags {
  return {
    switcherIcon: readQueryFeatureFlag(search, SWITCHER_ICON_FLAG),
    breathingShape: readQueryFeatureFlag(search, BREATHING_SHAPE_FLAG),
    orbIdle: readQueryFeatureFlag(search, ORB_IDLE_FLAG),
  }
}
```
Add a fourth line:
```typescript
ringCue: readQueryFeatureFlag(search, RING_CUE_FLAG),
```

`read_first` for the executor: `src/featureFlags.ts` (the whole file, ~90 lines).

---

### 2. `src/featureFlags.test.ts` (unit test, request-response)

**Analog:** `src/featureFlags.test.ts` itself — the `orbIdle` test block (lines 85–101) is the closest in shape (default + parse + case-insensitive + invalid fallback). `breathingShape` block (lines 60–83) is the analog for alias coverage.

**Default-shape assertion to extend** (current lines 36–42):
```typescript
it('returns defaults for empty search', () => {
  expect(readFeatureFlags('')).toEqual({
    switcherIcon: false,
    breathingShape: 'orb-halo',
    orbIdle: 'ambient',
  })
})
```
Add `ringCue: 'outer-inner'` to the expected object.

**Alias coverage to mirror** (`breathingShape` block, lines 60–83):
```typescript
it('defaults breathingShape to orb-halo (V1)', () => {
  expect(readFeatureFlags('').breathingShape).toBe('orb-halo')
})

it('parses minimal-rings (V2) and its aliases', () => {
  expect(readFeatureFlags('?breathingShape=minimal-rings').breathingShape).toBe('minimal-rings')
  expect(readFeatureFlags('?breathingShape=minimal').breathingShape).toBe('minimal-rings')
  expect(readFeatureFlags('?breathingShape=rings').breathingShape).toBe('minimal-rings')
})

it('parses orb-halo (V1) and its aliases', () => {
  expect(readFeatureFlags('?breathingShape=orb-halo').breathingShape).toBe('orb-halo')
  expect(readFeatureFlags('?breathingShape=orb').breathingShape).toBe('orb-halo')
  expect(readFeatureFlags('?breathingShape=halo').breathingShape).toBe('orb-halo')
})

it('breathingShape is case-insensitive and trims whitespace', () => {
  expect(readFeatureFlags('?breathingShape=MINIMAL-RINGS').breathingShape).toBe('minimal-rings')
  expect(readFeatureFlags('?breathingShape=%20Minimal%20').breathingShape).toBe('minimal-rings')
})

it('falls back to default for invalid breathingShape values', () => {
  expect(readFeatureFlags('?breathingShape=junk').breathingShape).toBe('orb-halo')
})
```
Mirror exactly for `ringCue`:
- default `'outer-inner'`
- parse `'progress-arc'` + aliases `progress` / `arc` / `south`
- parse `'outer-inner'` + aliases `production` / `rings` / `default`
- case-insensitive + whitespace trim
- invalid → `'outer-inner'`

`read_first` for the executor: `src/featureFlags.test.ts` (lines 60–101 cover both analog blocks).

---

### 3. `src/components/OrbShape.tsx` (view component, render — internal branch)

**Analog (branch site):** `OrbContainer` ring block — `src/components/OrbShape.tsx` lines 303–333.
**Analog (new arc body):** `.planning/spikes/011-ring-progress-cue/index.html` lines 179–229 (`RingsB`).

**Existing ring block to keep byte-identical inside the `'outer-inner'` branch** (lines 303–333):
```tsx
{showRings && (
  <>
    <span
      aria-hidden="true"
      className="absolute"
      style={{
        inset: 0,
        border: '1.5px solid var(--color-breathing-accent)',
        borderRadius: '50%',
        opacity: ringOpacity,
      }}
    />
    {!reducedMotion && (
      <span
        aria-hidden="true"
        className="absolute"
        style={{
          width: innerSizePct,
          height: innerSizePct,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          border: '1.5px solid var(--color-breathing-accent)',
          borderRadius: '50%',
          opacity: innerVisible * ringOpacity,
          transition: RING_TRANSITION,
        }}
      />
    )}
  </>
)}
```
This stays exactly as-is on the `ringCue === 'outer-inner'` path (the default). The ROADMAP constraint "default `outer-inner` must render byte-identically to today" means: **do not refactor this block** — wrap it in `if/else` (or a ternary at the `<>...</>` parent), don't move it, don't rename `innerVisible` / `innerSizePct` / `ringOpacity`.

**Reduced-motion-mirror reference** (the inner ring is gated by `!reducedMotion` on line 315). The progress arc must mirror this: the new arc renderer also skips when `reducedMotion === true`. Faint outer track (the always-on `<span>` at lines 305–314) renders in **both** branches and **both** reduced-motion states — it is the shared back layer per spike README line 47 + line 104.

**Props plumbing for `ringCue`:**
- `OrbShapeProps` (lines 11–45) — add `ringCue?: RingCueStyle` with default `'outer-inner'`. Sit it near `variant` (line 30) and `idleMode` (line 35) for grouping with the other query-string-driven flags. Import `RingCueStyle` alongside `BreathingShapeVariant, OrbIdleBehavior` on line 5.
- Default in the destructure (current line 78: `variant = 'orb-halo'`) — add `ringCue = 'outer-inner'` for the same zero-regression guarantee.
- Thread into `OrbBody` (line 149 signature + line 174 call) — `OrbBody` is the only path that ever passes `showRings: true` to `OrbContainer` (line 167). All other call sites (`OrbLeadIn`, `OrbIdle`, `showCompletion`) pass `showRings={false}`, so `ringCue` does not affect them. Still safe to thread the prop through `OrbBodyProps` (line 141–147) so the type is consistent.
- `OrbContainerProps` (lines 257–269) — add `ringCue: RingCueStyle` field. Default value lives at the `OrbShape` boundary; deeper layers receive the resolved value.
- `OrbContainer` (line 271 destructure) — accept `ringCue` and branch the inner ring block on it.

**Verbatim transcription of `RingsB` body** (spike `index.html` lines 179–229):
```jsx
function RingsB({ phase, phaseProgress, reducedMotion, progressStrokeWidth }) {
  const r = 49.7
  const south = 50 + r
  const north = 50 - r
  const t = phase === 'in' ? phaseProgress : 1 - phaseProgress
  const showArc = !reducedMotion && t > 0

  let rightD = ''
  let leftD = ''
  if (t >= 1) {
    rightD = `M 50 ${south} A ${r} ${r} 0 0 0 50 ${north}`
    leftD  = `M 50 ${south} A ${r} ${r} 0 0 1 50 ${north}`
  } else if (t > 0) {
    const angleR = Math.PI / 2 - t * Math.PI
    const angleL = Math.PI / 2 + t * Math.PI
    const endXR = 50 + r * Math.cos(angleR)
    const endYR = 50 + r * Math.sin(angleR)
    const endXL = 50 + r * Math.cos(angleL)
    const endYL = 50 + r * Math.sin(angleL)
    rightD = `M 50 ${south} A ${r} ${r} 0 0 0 ${endXR.toFixed(4)} ${endYR.toFixed(4)}`
    leftD  = `M 50 ${south} A ${r} ${r} 0 0 1 ${endXL.toFixed(4)} ${endYL.toFixed(4)}`
  }

  return html`
    <>
      <span aria-hidden="true" class="absolute" style=${{
        inset: 0,
        border: '1.5px solid var(--color-breathing-accent)',
        borderRadius: '50%',
        opacity: V1_RING_OPACITY,
      }} />
      ${showArc && html`
        <svg aria-hidden="true" class="absolute pointer-events-none"
             viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"
             style=${{ inset: 0, width: '100%', height: '100%' }}>
          <path d=${rightD}
                stroke="var(--color-breathing-accent)" fill="none"
                strokeLinecap="round" strokeWidth=${progressStrokeWidth}
                vectorEffect="non-scaling-stroke" />
          <path d=${leftD}
                stroke="var(--color-breathing-accent)" fill="none"
                strokeLinecap="round" strokeWidth=${progressStrokeWidth}
                vectorEffect="non-scaling-stroke" />
        </svg>
      `}
    </>
  `
}
```

**TSX-conversion notes for the executor** (these are mechanical, not design choices):
1. `phase`, `phaseProgress`, `reducedMotion` are already in scope inside `OrbContainer` via `innerRingPhase` and `reducedMotion` props — pass `innerRingPhase` as `phase` and re-derive `phaseProgress` from the `OrbBody` caller (which already computes `progress` from `frame.phaseProgress` at lines 152–156). The cleanest threading is to add `arcProgress?: number` to `OrbContainerProps` and have `OrbBody` pass `progress` through, since `OrbContainer` itself does not see the `frame` object. Default `arcProgress` to `0` for the non-Running call sites.
2. `class=` becomes `className=`; `strokeLinecap` / `strokeWidth` / `vectorEffect` are already React-style here (and TSX accepts them as-is).
3. Drop `progressStrokeWidth` as a runtime prop — the ROADMAP locks 2.5 px ("Stroke … **2.5 px** (spike-locked default)"). Inline the literal `2.5`. (The spike's harness exposed a stroke picker; that was a depth-probe control, not a product surface.)
4. The faint outer `<span>` already renders unconditionally above the inner block at lines 305–314 — **do not duplicate it inside the `'progress-arc'` branch**. Only the SVG arc layer is new. The branch lives at the inner-ring `{!reducedMotion && ...}` site:
   ```tsx
   {ringCue === 'progress-arc' ? (
     <ProgressArcLayer phase={innerRingPhase} progress={arcProgress} reducedMotion={reducedMotion} />
   ) : (
     !reducedMotion && (
       /* existing inner ring span — bytes unchanged */
     )
   )}
   ```
   That keeps the outer track byte-identical for both ring cues and reduced-motion states, satisfying the ROADMAP's "byte-identically to today" constraint.
5. Inside `ProgressArcLayer`, the `showArc = !reducedMotion && t > 0` gate satisfies the ROADMAP's "Reduced-motion: do not render the progress arc" requirement. `t > 0` (rather than `t >= 0`) avoids rendering an invisible empty arc at the start of inhale.

**Spike-locked values — NOT negotiable, do not propose alternatives:**
- `viewBox="0 0 100 100"`, `r = 49.7`
- Stroke `2.5px`, `var(--color-breathing-accent)`, `fill="none"`, `stroke-linecap="round"`, `vector-effect="non-scaling-stroke"`
- Sweep flags inverted from intuition: right arc uses `sweep-flag=0`, left arc uses `sweep-flag=1`
- Dynamic endpoint arc paths — **no** `stroke-dasharray`, **no** `pathLength`, **no** combination with `vector-effect="non-scaling-stroke"` for partial fills (spike README's "Surprises" #2: Chrome renders these as broken segments)
- At `t >= 1` emit explicit semicircles to north `(50, 0.3)`; at `t = 0` (or under reduced-motion) emit nothing

`read_first` for the executor: `src/components/OrbShape.tsx` (whole file, ~388 lines) + `.planning/spikes/011-ring-progress-cue/index.html` lines 179–229 (`RingsB`) + spike README "Implementation guidance for the real build (Phase 45)" block.

---

### 4. `src/components/OrbShape.test.tsx` (unit test, RTL DOM assertions)

**Analog (SVG presence):** lines 72–78 — the arrow-cue test already uses `container.querySelector('svg[aria-hidden="true"]')` as its primary assertion.
**Analog (default-behavior preservation):** lines 26–30 — `OrbBody` smoke render at `frame.phase === 'in'`.

**SVG-presence pattern** (lines 72–78):
```tsx
it('cue="arrow", phase="in" renders an aria-hidden SVG in the phase slot', () => {
  const { container } = render(
    <OrbShape cue="arrow" frame={sampleFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
  )
  const svg = container.querySelector('svg[aria-hidden="true"]')
  expect(svg).not.toBeNull()
})
```
Mirror this for `ringCue: 'progress-arc'` — render `OrbShape` with the sample frame and `ringCue="progress-arc"`, then assert presence of the SVG and **two** `<path>` children. The arrow-cue test already adds an aria-hidden SVG to the disc, so the new test should target the arc SVG specifically (e.g. by `container.querySelectorAll('svg[aria-hidden="true"] path')` length === 2, or by a structural selector that distinguishes the ring-layer SVG from the cue-glyph SVG; if disambiguation gets hairy, scope to `viewBox="0 0 100 100"` since CueGlyph SVGs use a 24-viewBox per the CheckmarkGlyph precedent at OrbShape.tsx line 128).

**Default-behavior preservation pattern** (lines 26–30 — for the `'outer-inner'` assertion):
```tsx
it('renders the OrbBody when frame is provided and leadInDigit is null', () => {
  render(<OrbShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
  expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
})
```
For `ringCue: 'outer-inner'`: render with no `ringCue` prop (default), assert the existing outer + inner ring DOM is unchanged — the two `<span>` siblings with `border: '1.5px solid var(--color-breathing-accent)'` and `borderRadius: '50%'`. The cleanest assertion is `container.querySelectorAll('span[aria-hidden="true"]')` and verify the count and inline `style` properties. Equivalent: assert `container.querySelector('svg[aria-hidden="true"][viewBox="0 0 100 100"]')` is **null** (no arc SVG present).

**Reduced-motion suppression — existing pattern to lift from:** `OrbShape.tsx` line 315 (`!reducedMotion &&` gating the inner ring). The test for reduced-motion needs to mock `usePrefersReducedMotion` to return `true`. There is no existing test in `OrbShape.test.tsx` that mocks this hook — check if other test files do (e.g. `useBreathingSessionController.test.ts`) and follow that pattern. If no existing mock, the simplest path is `vi.mock('../hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => true }))` at the top of a dedicated `describe` block, then assert the arc SVG is absent.

`read_first` for the executor: `src/components/OrbShape.test.tsx` (the whole file, ~116 lines).

---

### 5. `src/app/BreathingSessionSurface.tsx` (plumbing, prop pass-through)

**Analog:** the existing `variant` + `idleMode` props in the same file (lines 6, 14–15, 23–24, 33–34).

**Existing prop-forwarding pattern** (lines 6–36):
```tsx
import type { BreathingShapeVariant, OrbIdleBehavior } from '../featureFlags'
// ...
export interface BreathingSessionSurfaceProps {
  presentation: BreathingPresentation
  breathingStrings: UiStrings['practice']['breathing']
  readoutStrings: UiStrings['practice']['readout']
  bpmUnit: string
  variant: BreathingShapeVariant
  idleMode: OrbIdleBehavior
}

export function BreathingSessionSurface({
  presentation,
  breathingStrings,
  readoutStrings,
  bpmUnit,
  variant,
  idleMode,
}: BreathingSessionSurfaceProps): ReactElement {
  return (
    <>
      <OrbShape
        cue={presentation.shape.cue}
        frame={presentation.shape.frame}
        leadInDigit={presentation.shape.leadInDigit}
        strings={breathingStrings}
        variant={variant}
        idleMode={idleMode}
        showCompletion={presentation.readout.showCompletionHeadline}
      />
```
Add `ringCue: RingCueStyle` to the import, to the interface (alongside `variant`/`idleMode`), to the destructure, and to the `<OrbShape>` JSX as `ringCue={ringCue}`. The shape is mechanical drop-in.

`read_first` for the executor: `src/app/BreathingSessionSurface.tsx` (whole file, ~60 lines).

---

### 6. `src/app/NaviKriyaSessionSurface.tsx` (plumbing, optional — see note)

**Analog:** same prop-forward pattern (lines 7, 15–17, 23–26, 35–36).

**ROADMAP nuance:** the ROADMAP says "thread `featureFlags.ringCue` into `OrbShape` at every Running-surface call site (`BreathingSessionSurface`, plus `NaviKriyaSessionSurface` if it routes through `OrbShape`)." NK *does* route through `OrbShape` (line 30), but only with `frame={null}` (line 32) — i.e. the `OrbLeadIn` or `OrbIdle` path, neither of which renders rings (`OrbShape.tsx` lines 105 / 196 hard-set `showRings={false}`). So the `ringCue` prop is moot here at runtime.

**Recommendation:** thread the prop for symmetry / type consistency (so `useFeatureFlags()` → `vm.featureFlags.ringCue` flows uniformly down both surfaces), but the visual behavior is unchanged on the NK surface. The executor can do this in the same plan as #5 — same pattern, same five-line diff.

`read_first` for the executor: `src/app/NaviKriyaSessionSurface.tsx` (whole file, ~92 lines).

---

### 7. `src/app/PracticeSessionView.tsx` + `src/app/PracticeScreen.tsx` (plumbing chain)

**Analog:** the existing `variant` + `idleMode` chain.

**`PracticeSessionView.tsx`** (current lines 3, 11–15, 17–21, 31–32, 43–44):
```tsx
import type { BreathingShapeVariant, OrbIdleBehavior } from '../featureFlags'
// ...
interface PracticeSessionViewProps {
  session: PracticeSessionViewModel
  variant: BreathingShapeVariant
  idleMode: OrbIdleBehavior
}

export function PracticeSessionView({
  session,
  variant,
  idleMode,
}: PracticeSessionViewProps): ReactElement {
  // ...
  <NaviKriyaSessionSurface
    // ...
    variant={variant}
    idleMode={idleMode}
  />
  // ...
  <BreathingSessionSurface
    // ...
    variant={variant}
    idleMode={idleMode}
  />
```
Add `ringCue: RingCueStyle` to the import, props interface, destructure, and forward into **both** surfaces.

**`PracticeScreen.tsx`** (current lines 71–75 — the chain origin):
```tsx
<PracticeSessionView
  session={vm.practiceSession}
  variant={vm.featureFlags.breathingShape}
  idleMode={vm.featureFlags.orbIdle}
/>
```
Add a sibling prop:
```tsx
ringCue={vm.featureFlags.ringCue}
```

The `useAppViewModel.ts` chain already exposes `featureFlags` on `AppViewModel` (line 183) — once `ringCue` is added to the `FeatureFlags` type (file #1 above), it lights up automatically through `vm.featureFlags.ringCue`. No edit to `useAppViewModel.ts` or `appViewModel.ts` is required.

`read_first` for the executor: `src/app/PracticeSessionView.tsx` (whole file, ~48 lines) + `src/app/PracticeScreen.tsx` lines 60–90 (the `<PracticeSessionView>` call) + `src/app/useAppViewModel.ts` line 54 (confirms `featureFlags = useFeatureFlags()` already in place — no change needed) and line 183 (confirms `featureFlags` exposed on the view model).

---

## Shared Patterns

### Query-string feature-flag spec
**Source:** `src/featureFlags.ts` lines 1–5 (`QueryFeatureFlagSpec<T>` interface), lines 46–54 (`readQueryFeatureFlag` helper), lines 62–82 (the two enum-flag specs `BREATHING_SHAPE_FLAG` + `ORB_IDLE_FLAG`).
**Apply to:** new `RING_CUE_FLAG` (file #1).

The interface is already exhaustively generic (any `T`, custom `parse`) — no new infrastructure required, just a fourth `satisfies QueryFeatureFlagSpec<RingCueStyle>` constant.

### Reduced-motion mirror
**Source:** `src/components/OrbShape.tsx` lines 315 (`{!reducedMotion && ...}` gating the inner ring) + `src/hooks/usePrefersReducedMotion` (consumed at line 150 of `OrbShape.tsx`).
**Apply to:** the new progress-arc layer (file #3). Suppression is `!reducedMotion && t > 0` per the spike README's "Reduced-motion: do not render the progress arc (mirrors production's inner-ring suppression). Faint outer track stays." Outer track must stay rendered in **both** ring cues and **both** reduced-motion states — this is already true in the existing code because the outer span sits **outside** the `!reducedMotion` gate (lines 305–314).

### Surface-level prop forwarding chain
**Source:** the `breathingShape` → `variant` chain:
- `src/featureFlags.ts` defines `BreathingShapeVariant`
- `src/hooks/useFeatureFlags.ts` exposes `FeatureFlags` via `useSyncExternalStore` (line 21)
- `src/app/useAppViewModel.ts` line 54 calls `useFeatureFlags()` and exposes it on `AppViewModel` at line 183
- `src/app/PracticeScreen.tsx` line 73 reads `vm.featureFlags.breathingShape` and passes it as `variant`
- `src/app/PracticeSessionView.tsx` lines 19, 31, 43 forwards `variant` to both surfaces
- `src/app/BreathingSessionSurface.tsx` line 23 + line 33 forwards `variant` to `OrbShape`
- `src/components/OrbShape.tsx` line 78 default `variant = 'orb-halo'` + threads it into `OrbContainer`

**Apply to:** `ringCue` — exact same six-link chain (files #1, #5, #6, #7 above).

---

## No Analog Found

None. Every file in the integration touchpoints list either has the analog in the same file (#1, #2, #3 branch site, #4, #5, #6, #7) or in the spike (the arc-renderer body is a verbatim transcription target, which is stronger than a codebase analog).

---

## Metadata

**Analog search scope:**
- `src/featureFlags.ts` + `src/featureFlags.test.ts` — direct same-file analogs
- `src/components/OrbShape.tsx` + `src/components/OrbShape.test.tsx` — branch site + assertion patterns
- `src/components/NKShape.tsx` — confirmed it routes through `OrbShape` but never on the rings-on path (no plumbing change needed beyond #6 for symmetry)
- `src/app/{PracticeScreen,PracticeSessionView,BreathingSessionSurface,NaviKriyaSessionSurface,useAppViewModel}.tsx` — full prop chain confirmed
- `src/hooks/useFeatureFlags.ts` — confirmed already correctly exposes `FeatureFlags` (the type is the only edit point upstream)

**Files scanned:** 12 source files (8 read in full, 4 grepped for specific symbols).

**Pattern extraction date:** 2026-05-25.
