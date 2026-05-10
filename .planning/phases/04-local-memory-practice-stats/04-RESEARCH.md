# Phase 4: Local Memory & Practice Stats - Research

**Researched:** 2026-05-10
**Domain:** Browser-local persistence + practice-stats accumulation in a React 19 / TS 6 / Vite 8 / Tailwind v4 SPA
**Confidence:** HIGH (stack and seams are fully present in repo; locked decisions D-01..D-18 absorb most uncertainty)

## Summary

Phase 4 ships a small `localStorage`-backed persistence layer plus a calm idle-only stats footer. The phase is mostly an integration job: every architectural decision is locked in CONTEXT.md, the existing seams (`useSessionEngine` lifecycle, `useAudioCues.muted`, `EndSessionDialog` pattern, `inSessionView` boolean in `App.tsx`) are already in place, and the new module needs no library additions. The risk surface is concentrated in three places: (1) avoiding double-writes across the four end paths in `App.tsx`, (2) per-field validate-and-fallback that does NOT route through the existing throwing `validateSettings`, and (3) silent absorption of read/write failures in jsdom + browser quota / Safari ITP scenarios.

**Primary recommendation:** Plain functions in `src/storage/` (no class, no hook). One key (`hrv:state:v1`) holding `{ version: 1, settings, mute, stats }`. Per-field validators sourced from `BPM_OPTIONS`/`RATIO_OPTIONS`/`DURATION_OPTIONS` (not `validateSettings`). Inject `now: () => number` (D-18). Single write site for stats: a dedicated handler called once per end transition, with a recorded-key guard to prevent double-writes between the `state.status !== 'running'` cleanup effect and the `confirmEnd` / `requestEnd` paths.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Settings restore on mount | Browser (localStorage read) | App composition (`App.tsx`) | Read happens before `useSessionEngine(initialSettings)` constructs |
| Mute restore on mount | Browser (localStorage read) | `useAudioCues` (effect) | Mute lives in a hook; restored value applied via `setMuted` after mount |
| Settings persistence | Browser (localStorage write) | `App.tsx` wrapper around `setSelectedSettings` | Same write path used for steppers |
| Mute persistence | Browser (localStorage write) | `App.tsx` wrapper around `setMuted` | Hook-internal change → wrap caller |
| Stats accumulation | Pure module (`stats.ts`) | `App.tsx` end-path handler | Aggregator is pure; integration is composition |
| Stats reset | Browser (localStorage delete-key) | `App.tsx` confirmation dialog handler | Wipes stats subtree only (D-11) |
| Stats footer rendering | Component (`StatsFooter.tsx`) | `App.tsx` (gates visibility) | Pure presentation, no timing |
| Reset confirmation UI | Component (`ConfirmDialog` reuse OR new `ResetStatsDialog`) | `App.tsx` | See R-06 below |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.5 | UI + hooks | Already in repo |
| TypeScript | ~6.0.2 | Type safety | Already in repo |
| Vite | 8.0.10 | Bundler / dev server | Already in repo |
| Tailwind v4 | 4.3.0 | Styling | Already in repo |
| Vitest | 4.1.5 | Test runner | Already in repo |
| @testing-library/react | 16.3.2 | Component tests | Already in repo |
| jsdom | 29.1.1 | DOM polyfill | Already in repo; **provides functional `localStorage` out of the box** |

### Supporting (built-in)
| API | Purpose | When |
|---------|---------|-------------|
| `window.localStorage` | Persistence backing | All read/write/reset |
| `Intl.DateTimeFormat` | `Last: May 7` rendering (D-05) | Stats footer render |
| `Date.now()` | Default clock injection (D-18) | Wrapped in `now()` for testability |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `localStorage` | `IndexedDB` via `idb-keyval` | IDB is async, requires a library, no benefit for a tiny aggregate; D-14..D-17 already lock localStorage |
| Plain functions | Class `StorageAdapter` | Class adds ceremony with no testability win; functions already mockable per-call |
| Plain functions | `useStorage` hook | A hook implies reactive subscription; we have only a one-shot mount read + push writes — no subscription |
| `Intl.DateTimeFormat` | `date-fns` / `dayjs` | Locked: no library added |

**No new packages.** All work uses native APIs.

**Version verification:**
- Confirmed via `package.json` (read at research time): React 19.2.5, TypeScript ~6.0.2, Vitest 4.1.5, jsdom 29.1.1.
- jsdom's `localStorage` implementation is a functional `Storage` per the jsdom 22+ behavior (HIGH confidence — the repo's existing tests use `localStorage`-adjacent primitives without polyfills; spot-grepped `vitest.setup.ts` for `localStorage` polyfill — none present, jsdom provides one). `[VERIFIED: vitest.setup.ts has no localStorage polyfill]`

---

## Research Recommendations (one option each)

### R-01 — Storage adapter shape: **plain functions, module form**

**Choice:** Plain functions exported from `src/storage/index.ts` (or `src/storage/storage.ts` + `src/storage/stats.ts`).

**Why this fits the existing seams:**
- Phase 3's `useAudioCues` is an imperative resource hook because it owns an `AudioContext` lifecycle (create / close, async). `localStorage` has no lifecycle — every call is one-shot synchronous. Wrapping it in a hook would invent state where there is none.
- Phase 1's `useSessionEngine` accepts `initialSettings` at construction (`useSessionEngine(initialSettings: SessionSettings = DEFAULT_SETTINGS)`). The mount-time read flows naturally into that param.
- D-18's clock injection is a function param — plain functions take a `now` argument cleanly; classes add a constructor.

**Signature:**
```ts
// src/storage/index.ts
import type { SessionSettings } from '../domain/settings'

export interface PersistedStats {
  totalSessions: number          // count of qualifying sessions
  totalElapsedSeconds: number    // sum of actual elapsed (D-02)
  lastSessionAtMs: number | null // timestamp from injected now() (D-18)
  lastSessionDurationSeconds: number | null // for "Last: May 7 — 10 min"
}

export interface StorageDeps {
  now?: () => number               // D-18 — defaults to Date.now
  storage?: Storage                // defaults to window.localStorage; tests pass a fake or skip
}

// Settings + mute (LOCL-01)
export function loadSettings(deps?: StorageDeps): SessionSettings // always returns valid (D-15 fallback)
export function saveSettings(settings: SessionSettings, deps?: StorageDeps): void
export function loadMute(deps?: StorageDeps): boolean             // false (D-07 seed) when missing
export function saveMute(muted: boolean, deps?: StorageDeps): void

// Stats (LOCL-02)
export function loadStats(deps?: StorageDeps): PersistedStats     // zero-state when missing
export function recordSession(elapsedMs: number, deps?: StorageDeps): PersistedStats // D-01 threshold check INSIDE
export function resetStats(deps?: StorageDeps): void              // LOCL-03 — stats only (D-11)
```

`recordSession` returns the new stats so the UI can re-render without a separate `loadStats` round-trip.

**File layout:**
```
src/storage/
├── index.ts             # public surface (re-exports)
├── storage.ts           # silent-fallback wrapper around localStorage (getJSON/setJSON/removeKey)
├── settings.ts          # loadSettings, saveSettings + per-field validators
├── mute.ts              # loadMute, saveMute (or fold into settings.ts)
├── stats.ts             # loadStats, recordSession, resetStats + threshold (D-01)
├── format.ts            # formatTotalMinutes, formatLastSession (D-06/D-07)
└── *.test.ts            # unit tests
```

Folding mute into `settings.ts` is fine; both are read at mount and small. Keeping them in one file means one envelope read on mount.

`[VERIFIED: existing module conventions — see src/audio/audioEngine.ts and src/domain/sessionController.ts which are both function-export modules]`

---

### R-02 — Schema layout: **single key, versioned envelope**

**Choice:** ONE localStorage key, `hrv:state:v1`, holding a single JSON envelope:

```json
{
  "version": 1,
  "settings": { "bpm": 5.5, "ratio": "40:60", "durationMinutes": 10 },
  "mute": false,
  "stats": {
    "totalSessions": 12,
    "totalElapsedSeconds": 2820,
    "lastSessionAtMs": 1746662400000,
    "lastSessionDurationSeconds": 600
  }
}
```

**Why one key, versioned:**
- One read at mount = one `getItem` + one `JSON.parse` in a try/catch. Simpler silent-fallback (D-17) — a corrupt envelope is one decision boundary, not three.
- One write per mutation = one `setItem`. No partial-write race where settings update succeeds but mute fails.
- Versioning costs almost nothing now (one literal `1`) and the deferred-ideas section explicitly anticipates a future schema bump. D-15's per-field fallback absorbs drift WITHIN a version; the `version` field is the cheap escape hatch for cross-version reshape.
- Key prefix `hrv:` namespaces the app on shared origins (e.g. local dev where multiple apps run on `localhost:5173`).

**Reset semantics (D-11):**
- `resetStats()` writes the envelope back with `stats` set to the zero-value default. It does NOT delete the whole key (settings + mute must survive). A `clearAll()` is NOT exposed — there is no UX path that wipes both (D-11 explicit).

**Why NOT split keys (`hrv:settings`, `hrv:mute`, `hrv:stats`):**
- More keys → more failure points for D-16 silent-absorb.
- No write atomicity story.
- More boilerplate per call.

**Why include `version` even though D-15 absorbs drift:**
- Per-field fallback handles ADDITIVE / TYPE drift inside the same shape, not RESHAPE (e.g. moving `mute` under `audio.muted`). Version field gates a future migration if reshape is needed without surfacing complexity now.
- One line of cost. Deferred-ideas allows planner discretion here; the cheap version field is the right call.

`[CITED: MDN Web Storage Quota — quota typically 5–10 MiB per origin, well above our envelope size of ~200 bytes]`

---

### R-03 — Per-field validator: **non-throwing shim, reuses existing OPTIONS arrays**

**Existing problem:** `src/domain/settings.ts` line 51's `validateSettings` THROWS on any invalid field. D-15 requires validate-and-fallback PER FIELD without discarding the rest.

**Choice:** Write a non-throwing per-field shim in `src/storage/settings.ts` that imports the arrays directly:

```ts
import {
  BPM_OPTIONS,
  RATIO_OPTIONS,
  DURATION_OPTIONS,
  DEFAULT_SETTINGS,
  type SessionSettings,
  type RatioLabel,
  type DurationOption,
} from '../domain/settings'

function isValidBpm(v: unknown): v is number {
  return typeof v === 'number' && (BPM_OPTIONS as readonly number[]).includes(v)
}
function isValidRatio(v: unknown): v is RatioLabel {
  return typeof v === 'string' && (RATIO_OPTIONS as readonly string[]).includes(v)
}
function isValidDuration(v: unknown): v is DurationOption {
  return (
    (typeof v === 'number' && (DURATION_OPTIONS as readonly DurationOption[]).includes(v)) ||
    v === 'open-ended'
  )
}

export function coerceSettings(raw: unknown): SessionSettings {
  const r = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
  return {
    bpm:             isValidBpm(r.bpm)             ? r.bpm             : DEFAULT_SETTINGS.bpm,
    ratio:           isValidRatio(r.ratio)         ? r.ratio           : DEFAULT_SETTINGS.ratio,
    durationMinutes: isValidDuration(r.durationMinutes) ? r.durationMinutes : DEFAULT_SETTINGS.durationMinutes,
  }
}

export function coerceMute(raw: unknown): boolean {
  return typeof raw === 'boolean' ? raw : false // D-07 seed default
}
```

**Why coerce-not-throw:**
- D-15: invalid OR missing fields fall back per-field; valid fields restored. A throwing path can't deliver "restore the valid fields, default the invalid one."
- A throw would route through D-17 silent absorb but throw away ALL fields — wrong.
- `validateSettings` from `domain/settings.ts` is the right shape for IN-APP guards (e.g. defensive checks before `startSession`); it remains untouched. The new `coerceSettings` is the storage-side cousin.

**Optional:** call `validateSettings` AFTER `coerceSettings` as a belt-and-suspenders sanity check before returning — by construction it should never throw, but it surfaces a programming error if option arrays drift apart from coercer logic.

`[VERIFIED: src/domain/settings.ts:51 validateSettings throws RangeError]`

---

### R-04 — Stats accumulation seams: **dedicated handler + recorded-key guard**

**The four end paths in `App.tsx` (mapped):**

| # | Handler | Line | Fires when | Should write stats? | Notes |
|---|---------|------|-----------|---------------------|-------|
| 1 | `onStartClick` cancel branch | App.tsx:111-123 | User re-clicks during 3-2-1 lead-in | **NO (D-03)** | session.status is `'idle'` here — the session was never started |
| 2 | `requestEnd` (open-ended) | App.tsx:182-189 | User taps `End session` on open-ended session | **YES if elapsed ≥ 30s (D-01)** | Calls `session.end()` directly (no modal for open-ended per Phase 2 D-14) |
| 3 | `confirmEnd` (modal-confirm) | App.tsx:200-204 | User confirms in `EndSessionDialog` for timed mid-session End | **YES if elapsed ≥ 30s (D-01)** | Calls `sessionEnd()` after dialog confirm |
| 4 | Cleanup effect on `state.status !== 'running'` | App.tsx:217-232 | ANY transition out of running (covers `complete` and the residue of paths #2 + #3 after `session.end()` runs) | **YES for `complete` (D-01: completion bypasses 30s threshold), NO double-write for #2/#3** | This is the trap |

**The double-write trap:**
- When `requestEnd` (open-ended) runs, it calls `session.end()` synchronously. State flips `running → idle` on the next render. The cleanup effect fires on the `state.status !== 'running'` change. If `requestEnd` ALSO writes stats, AND the cleanup effect ALSO writes stats, that's two records for one session.
- When `confirmEnd` runs, same problem: `sessionEnd()` flips state, cleanup effect fires.
- When the timer naturally completes, `state.status` becomes `'complete'`. ONLY the cleanup effect sees this transition — there's no `requestEnd` or `confirmEnd` in the chain.

**Recommendation: single write site + recorded-key guard.**

Write stats in EXACTLY ONE place — the cleanup effect — and use a ref-tracked "already recorded for this session generation" guard so a quick End-then-Start sequence doesn't skip the next record.

```tsx
// In App.tsx
const recordedSessionKeyRef = useRef<string | null>(null)

useEffect(() => {
  if (state.status !== 'running') {
    // ... existing audio teardown ...

    // Stats write — ONE place. Trap the previous render's running snapshot via ref.
    // We need the elapsed AT THE MOMENT OF TRANSITION. Two readings work:
    //   (a) For 'complete': use `state.completedAtMs - prev.startedAtMs` from the
    //       complete state directly — sessionController already stamps both.
    //   (b) For 'idle' arrived via end(): the last RAF tick updated `lastFrame.elapsedMs`
    //       to the just-before-End reading. Capture that on the way out.
    // Implementation: track a `runningSnapshotRef` updated each render WHILE running.
  }
}, [state.status, ...])
```

**Cleaner recommendation — recompute elapsed inside `App.tsx`:**

The cleanup effect cannot easily reach back into the prior `running` state. So:

1. **Maintain a `runningSnapshotRef: { startedAtMs: number; lastElapsedMs: number } | null` ref** that updates on every render while `state.status === 'running'`. Read source: `state.startedAtMs` + `state.lastFrame.elapsedMs`.
2. **In the cleanup effect**, if `state.status === 'complete'`: use `state.completedAtMs - runningSnapshotRef.current.startedAtMs` for the most precise reading (sessionController already has these fields — see sessionController.ts:28, 47, 109).
3. **In the cleanup effect**, if `state.status === 'idle'` and the transition was from running (snapshot present): use `runningSnapshotRef.current.lastElapsedMs`.
4. **Generation guard:** every time `state.status` becomes `'running'`, stamp a fresh `sessionGenerationRef.current = uuidish` (e.g. `state.startedAtMs.toString()` is unique-enough since `performance.now()` doesn't repeat). When the cleanup effect writes, it stamps that key into `recordedSessionKeyRef`; if the key is already recorded, skip.

```ts
// Pseudocode inside the cleanup effect
const snap = runningSnapshotRef.current
if (snap && recordedSessionKeyRef.current !== snap.key) {
  let elapsedMs: number
  if (state.status === 'complete') elapsedMs = state.completedAtMs - snap.startedAtMs
  else                              elapsedMs = snap.lastElapsedMs
  recordSession(elapsedMs)         // D-01 threshold lives inside recordSession
  recordedSessionKeyRef.current = snap.key
}
runningSnapshotRef.current = null  // cleared on transition out
```

**Why a ref-tracked snapshot:** `state` in the closure of an effect is the NEW state (post-transition). The old `running` state's `startedAtMs` is gone unless we capture it on the way through running. A ref updated each render while running gives us the snapshot the cleanup effect needs.

**Why generation key:** quick End → Start → End cycles must not skip the second record. Using `startedAtMs` as the key is cheap and unique per session.

**Pure aggregator stays clean:**
```ts
// src/storage/stats.ts
const COUNT_THRESHOLD_MS = 30_000

export function recordSession(
  elapsedMs: number,
  isComplete: boolean,
  deps: StorageDeps = {},
): PersistedStats {
  const { now = Date.now } = deps
  const stats = loadStats(deps)
  // D-01: count if (elapsed ≥ 30s) OR (isComplete)
  if (!isComplete && elapsedMs < COUNT_THRESHOLD_MS) return stats
  const next: PersistedStats = {
    totalSessions: stats.totalSessions + 1,
    totalElapsedSeconds: stats.totalElapsedSeconds + Math.floor(elapsedMs / 1000),
    lastSessionAtMs: now(),
    lastSessionDurationSeconds: Math.floor(elapsedMs / 1000),
  }
  writeEnvelope({ ...readEnvelope(deps), stats: next }, deps)
  return next
}
```

Pass `state.status === 'complete'` explicitly so the aggregator doesn't need to know about the union type.

`[VERIFIED: App.tsx:217-232 cleanup effect already exists and runs on state.status !== 'running']`
`[VERIFIED: sessionController.ts:28 CompleteSessionState has completedAtMs; line 47 RunningSessionState has startedAtMs]`

---

### R-05 — Footer placement: **below the main card, gated**

**Verified seams:**
- `inSessionView` is a local boolean in `App.tsx:33` — `appPhase !== 'idle'`. It's already used to gate the page-description paragraph (App.tsx:301) and the SettingsForm `isRunning` prop (App.tsx:325). **Phase 2 D-16 reuse confirmed.**
- The main card is `<div className="...rounded-[2rem]...">` at App.tsx:307-341.

**Placement:**

```tsx
// App.tsx — below the main card div, inside the same <section>
<div className="...rounded-[2rem]...">{/* existing main card */}</div>

{/* NEW Phase 4 footer */}
{!inSessionView && stats.totalSessions > 0 && (
  <StatsFooter
    stats={stats}
    onResetClick={() => setResetDialogOpen(true)}
  />
)}
```

**Gate (both must be true):**
1. `inSessionView === false` (D-10: hidden during lead-in + running, mirrors Phase 2 D-16 hidden steppers)
2. `stats.totalSessions > 0` (D-09: zero-state hidden, no "0 sessions" copy)

**Stats source:** load once on mount via `loadStats()`, store in local `useState<PersistedStats>`, update with the return value of `recordSession` from the cleanup-effect write site. Reset path also updates the state via the dialog confirm handler. No subscription / no event bus needed — only three places mutate.

**Component contract:**
```tsx
interface StatsFooterProps {
  stats: PersistedStats
  onResetClick(): void
}
```

Two short lines (D-08), styled with theme accent / muted tokens (theme.css already exposes `--color-breathing-accent` and `--color-breathing-muted`). The Reset link must meet 44×44 (D-13) — wrap the inline `· Reset` text in a tap-target padded element. A common pattern:

```tsx
<button
  type="button"
  onClick={onResetClick}
  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-2 underline underline-offset-2 text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
>
  Reset
</button>
```

The padded hit area expands beyond the visible label without enlarging the visible text.

`[VERIFIED: App.tsx:33 inSessionView declared; App.tsx:301, 325 already use it as gate]`

---

### R-06 — Reset dialog: **add a new `ResetStatsDialog`, do NOT touch `EndSessionDialog`**

**Choice:** Create `src/components/ResetStatsDialog.tsx` with the same shape as `EndSessionDialog` (open / onConfirm / onCancel) but locked Phase 4 D-12 copy.

**Why not extract a generic `ConfirmDialog`:**
- The CONTEXT.md constraint says "preserve the EndSessionDialog API exactly." Extracting means refactoring `EndSessionDialog` to be a thin wrapper over `ConfirmDialog`, which is a behavioral change to a Phase 2-validated component.
- The two dialogs differ only in 3 strings (title + 2 button labels). Duplicating a ~90-line component to avoid risking a Phase 2 regression is the cleaner diff.
- A `ConfirmDialog` extraction is a safe future refactor when a third confirmation is added — YAGNI for two.

**`ResetStatsDialog.tsx`:**
- Locked copy: title `Reset practice stats?`, primary `Reset`, cancel `Keep` (D-12).
- Default focus: cancel button (`Keep`) — same defense as Phase 2 D-12.
- Same `<dialog>` + `useEffect`-driven `showModal`/`close` pattern as `EndSessionDialog`.
- Primary button styling: red destructive (matches `End` styling in `EndSessionDialog`) since this is also irreversible.

**Wire-up in `App.tsx`:**
```tsx
const [resetDialogOpen, setResetDialogOpen] = useState(false)
const [stats, setStats] = useState<PersistedStats>(() => loadStats())

const confirmReset = useCallback(() => {
  resetStats()
  setStats(loadStats())  // re-read zero-state envelope
  setResetDialogOpen(false)
}, [])

const cancelReset = useCallback(() => setResetDialogOpen(false), [])

// ... in JSX, sibling of <EndSessionDialog>:
<ResetStatsDialog
  open={resetDialogOpen}
  onConfirm={confirmReset}
  onCancel={cancelReset}
/>
```

**EndSessionDialog API stays identical.** No props added. No file moved.

`[VERIFIED: src/components/EndSessionDialog.tsx:1-89 — props are { open, onConfirm, onCancel }]`

---

### R-07 — Test infrastructure: **per-test `localStorage.clear()` in `beforeEach` + `vi.spyOn` for failure paths**

**jsdom localStorage:** functional in jsdom 22+ (repo uses 29.1.1). No polyfill needed in `vitest.setup.ts` — confirmed absent.

**Per-test isolation pattern:**
```ts
// In storage/*.test.ts
import { afterEach, beforeEach, describe, it, expect } from 'vitest'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})
```

**Failure-path testing — quota exceeded (D-16):**
```ts
it('silently absorbs quota-exceeded write failures', () => {
  const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      const err = new Error('QuotaExceededError')
      err.name = 'QuotaExceededError'
      throw err
    })
  expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow()
  expect(setItemSpy).toHaveBeenCalled()
})
```

**Failure-path testing — corrupt JSON (D-17):**
```ts
it('falls back to defaults when stored JSON is corrupt', () => {
  window.localStorage.setItem('hrv:state:v1', '{not-json')
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
})
```

**Failure-path testing — getItem throws (Safari ITP):**
```ts
it('falls back to defaults when getItem throws', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('SecurityError')
  })
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
})
```

**Injected clock for deterministic stats (D-18):**
```ts
it('records the session timestamp via injected now()', () => {
  const fakeNow = () => 1_700_000_000_000
  recordSession(60_000, false, { now: fakeNow })
  expect(loadStats().lastSessionAtMs).toBe(1_700_000_000_000)
})
```

**`vitest.setup.ts` changes:** **NONE required.** jsdom's built-in `localStorage` plus per-test `clear()` is enough. The setup file already polyfills `HTMLDialogElement` (covers `ResetStatsDialog`) and `matchMedia`. Adding a global localStorage stub would *reduce* fidelity vs. the real jsdom Storage; per-test `vi.spyOn` for failure-path tests is the right scope.

**App-level integration test pattern** (e.g. `App.persistence.test.tsx`):
- Pre-seed `localStorage.setItem('hrv:state:v1', JSON.stringify({...}))` then mount `<App />`, assert restored steppers / mute state.
- Render `<App />`, drive a session through to completion via fake timers, unmount, re-mount, assert stats footer reflects the recorded session.
- Render `<App />` with stats > 0, click Reset, click Reset in dialog, assert footer disappears and `localStorage` shows zero-state stats.

`[VERIFIED: jsdom 29.1.1 — repo dep; jsdom Storage is in spec since v22 per jsdom changelog]`
`[VERIFIED: vitest.setup.ts has no localStorage polyfill — added one would conflict with the built-in jsdom Storage]`

---

## Architecture Patterns

### System Data Flow

```
                ┌───────────────── localStorage (single key: hrv:state:v1) ─────────────────┐
                │  { version: 1, settings, mute, stats }                                    │
                └──┬─────────────────────────────────┬──────────────────────────────────────┘
                   │ load on mount                   │ writes
                   ▼                                 │
   ┌─────────────────────────────┐                   │
   │  src/storage/ (functions)   │◄──────────────────┤
   │   loadSettings/saveSettings │                   │
   │   loadMute/saveMute         │                   │
   │   loadStats/recordSession/  │                   │
   │   resetStats                │                   │
   └────┬─────────────────┬──────┘                   │
        │ initialSettings │ initialMute              │ stats writes
        ▼                 ▼                          │
   ┌──────────────┐  ┌────────────┐                  │
   │useSessionEng.│  │useAudioCues│                  │
   │(initial=...) │  │ .setMuted  │                  │
   └──┬───────────┘  └──┬─────────┘                  │
      │ state            │ muted                     │
      ▼                  ▼                           │
   ┌────────────────────────────────────────────────┐│
   │ App.tsx                                         ││
   │  ├ wrap setSelectedSettings → saveSettings ─────┤
   │  ├ wrap setMuted          → saveMute ───────────┤
   │  ├ runningSnapshotRef (track startedAtMs/elap.) │
   │  ├ cleanup effect (single write site) ──────────┤
   │  │   recordSession(elapsedMs, isComplete) ──────┤
   │  └ resetStats() (from ResetStatsDialog) ────────┘
   │  Renders:                                        │
   │  - Main card (orb, readout, settings, controls)  │
   │  - StatsFooter (gated: !inSessionView && >0)     │
   │  - EndSessionDialog (Phase 2)                    │
   │  - ResetStatsDialog (NEW Phase 4)                │
   └─────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── storage/                  # NEW — Phase 4
│   ├── index.ts              # public surface
│   ├── storage.ts            # silent-fallback envelope read/write
│   ├── settings.ts           # coerceSettings + coerceMute + load/save
│   ├── stats.ts              # loadStats + recordSession + resetStats
│   ├── format.ts             # formatTotalMinutes, formatLastSession (Intl.DateTimeFormat)
│   └── *.test.ts             # unit tests (one per file)
├── components/
│   ├── ResetStatsDialog.tsx  # NEW — Phase 4 (clones EndSessionDialog)
│   ├── ResetStatsDialog.test.tsx
│   ├── StatsFooter.tsx       # NEW — Phase 4
│   └── StatsFooter.test.tsx
├── app/
│   ├── App.tsx               # MODIFIED — wire load/save/record + footer + dialog
│   └── App.persistence.test.tsx  # NEW — integration: restore + record + reset
└── ... (unchanged)
```

### Pattern 1: Silent-fallback envelope wrapper
```ts
// src/storage/storage.ts
const KEY = 'hrv:state:v1'

interface Envelope {
  version: 1
  settings?: unknown
  mute?: unknown
  stats?: unknown
}

function readEnvelope(deps: StorageDeps = {}): Envelope {
  const { storage = window.localStorage } = deps
  try {
    const raw = storage.getItem(KEY)
    if (raw === null) return { version: 1 }
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as Envelope
    return { version: 1 }
  } catch {
    // D-17: read failures silent (corrupt JSON, throwing getItem in Safari ITP)
    return { version: 1 }
  }
}

function writeEnvelope(env: Envelope, deps: StorageDeps = {}): void {
  const { storage = window.localStorage } = deps
  try {
    storage.setItem(KEY, JSON.stringify({ ...env, version: 1 }))
  } catch {
    // D-16: write failures silent (quota, ITP, private mode)
  }
}
```

Both wrappers swallow ALL throws inside the try block. There is no logging — D-17 explicitly notes `console.warn` is "acceptable but not required." Recommendation: add `console.warn` ONLY when running in dev (`import.meta.env.DEV`) so production stays silent.

### Pattern 2: Mount-time restore
```tsx
// In App.tsx, BEFORE useSessionEngine and useAudioCues construction
function App() {
  // Restore at mount. Reads are synchronous.
  const initialSettings = useMemo(() => loadSettings(), [])
  const initialMute = useMemo(() => loadMute(), [])

  const session = useSessionEngine(initialSettings)

  const audio = useAudioCues()
  // Apply restored mute once after mount (the hook defaults to false).
  useEffect(() => {
    if (initialMute) audio.setMuted(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- mount-only restore

  // ...
}
```

`useMemo([])` ensures the read happens once during the first render, before children mount. The mute restore via effect is acceptable because the audio engine isn't constructed until `audioStart` is called (D-09 user-gesture path) — the React mute state propagates to the engine at gesture time.

### Pattern 3: Wrapped setters that persist
```tsx
const persistedSetSettings = useCallback((next: SessionSettings) => {
  session.setSelectedSettings(next)
  saveSettings(next)
}, [session.setSelectedSettings])

const persistedSetMuted = useCallback((next: boolean) => {
  audio.setMuted(next)
  saveMute(next)
}, [audio.setMuted])

// Pass persistedSetSettings to <SettingsForm onChange={persistedSetSettings} />
// Pass persistedSetMuted to <SessionControls onMuteToggle={() => persistedSetMuted(!audio.muted)} />
```

### Anti-Patterns to Avoid
- **Reactive `useStorage` hook:** invents subscription state for a one-shot read.
- **Writing stats in `requestEnd` AND in the cleanup effect:** double-counts every manual end.
- **Reusing `validateSettings` for restore:** it throws on first invalid field, discarding the rest of the object.
- **A separate "running session timer" for stats:** stats is a non-visual consumer of the session lifecycle (D-18 — single-frame data flow). No parallel intervals.
- **Computing elapsed inside the storage module from `Date.now()` deltas:** the session has its own `performance.now()` clock; mixing wall-clock and monotonic creates subtle drift. Stats consume the session's already-computed elapsed (`completedAtMs - startedAtMs` or `lastFrame.elapsedMs`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting (`May 7`, year-only-if-not-current) | Custom string-template logic | `new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })` for date; conditionally append year by comparing `getFullYear()` | Locale-aware, no library, always-correct month abbreviations |
| Validation | Custom AJV-style schema | Plain per-field `Array.includes` checks against the existing OPTIONS arrays | Sub-100-byte envelope; AJV is overkill |
| Atomic envelope writes | Mutex / queue | One-key-one-write pattern (R-02) | Browser localStorage is synchronous; no concurrency to mediate |
| Mute persistence in the hook | Add storage effect inside `useAudioCues` | Wrap `setMuted` at the App.tsx call site | Keeps the hook pure of persistence concerns; restoration is explicit |

**Key insight:** localStorage + jsdom + a 200-byte envelope means the entire phase is "remember to call save in the right places." Resist any urge to introduce abstractions (StorageProvider context, useStorage hook, BroadcastChannel cross-tab sync, IndexedDB). They add complexity with zero user-visible benefit and contradict CONTEXT.md's locked posture.

## Common Pitfalls

### Pitfall 1: Double-counting on manual End paths
**What goes wrong:** `requestEnd` calls `session.end()`. State flips to `idle`. Cleanup effect fires. If stats are written in BOTH `requestEnd` and the cleanup effect, the same session counts twice.
**How to avoid:** Single write site (cleanup effect). Use `recordedSessionKeyRef` keyed on `state.startedAtMs` to make the write idempotent per session.
**Warning sign:** Test fails: "after one End, totalSessions === 2."

### Pitfall 2: Cancel-during-lead-in writes a record
**What goes wrong:** During lead-in, `state.status === 'idle'` (not yet running — see App.tsx:171 `session.start()` runs at t3). But `appPhase === 'lead-in'`. If the cleanup effect or any handler keys off `appPhase`, the cancel branch could trip a write.
**How to avoid:** Stats writes key on the `running → !running` transition of `state.status`, NOT on `appPhase`. The lead-in cancel branch never enters `running`, so the cleanup effect's "was running" guard (via `runningSnapshotRef !== null`) is naturally false.
**Warning sign:** Test fails: "cancel during 3-2-1 records a 0s session."

### Pitfall 3: `validateSettings` throws and discards the whole envelope
**What goes wrong:** Naive restore runs `validateSettings(parsed.settings)` and the throw routes through the silent-absorb wrapper, returning DEFAULT_SETTINGS — discarding two valid fields because one drifted.
**How to avoid:** Use `coerceSettings` (R-03), not `validateSettings`. Per-field, non-throwing.
**Warning sign:** Test fails: "envelope with invalid bpm but valid ratio + duration restores ratio + duration; restored object has all-defaults instead."

### Pitfall 4: `lastFrame.elapsedMs` is stale on the cleanup effect
**What goes wrong:** When `requestEnd` calls `session.end()`, the rAF loop is already cancelled. `state.lastFrame.elapsedMs` may be a few frames behind the actual end-press moment.
**How to avoid:** For `'complete'` state, use `state.completedAtMs - startedAtMs` (sessionController stamps both — sessionController.ts:28, 47). For `'idle'` after End, the small staleness (<16 ms) is acceptable for second-precision stats; use `runningSnapshotRef.current.lastElapsedMs` updated each render.
**Warning sign:** A 30.0s session counts despite the user clicking End at 29.99s elapsed — acceptable per D-01 ("≥ 30 seconds" includes the case but the reading-noise is in our favor). Reverse case (29.99s reading from a 30.01s real session) doesn't count — also acceptable; D-01 is a soft floor.

### Pitfall 5: jsdom `localStorage` persists ACROSS tests in the same file
**What goes wrong:** Test A writes settings. Test B reads them and asserts defaults — fails because A's write leaked.
**How to avoid:** `beforeEach(() => window.localStorage.clear())` in every storage-touching test file.
**Warning sign:** Test order dependency — passes alone, fails in suite.

### Pitfall 6: `JSON.stringify` of a `Date` instance produces an ISO string
**What goes wrong:** If anyone stuffs `new Date()` into the envelope, the round-trip yields a string, not a Date. Type assertions silently lie.
**How to avoid:** Stats stores `lastSessionAtMs` as `number`. The renderer constructs `new Date(stats.lastSessionAtMs)` for `Intl.DateTimeFormat`. No `Date` ever goes through `JSON.stringify`.
**Warning sign:** TypeScript happy at compile time, runtime `formatLastSession` blows up because it expected a Date but got a string.

### Pitfall 7: `Intl.DateTimeFormat` and time-zone shift across midnight
**What goes wrong:** A session ended at 23:55 local; the user views the stats footer at 00:05 local the next day. The footer shows yesterday's date — confusing on first glance.
**How to avoid:** Acceptable per CONTEXT.md "deferred ideas → time-zone handling for Last session." Document; do not solve in v1.

## Code Examples

### Date formatting (D-05, D-06, D-07)
```ts
// src/storage/format.ts
const DATE_FMT_SAME_YEAR = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})
const DATE_FMT_OTHER_YEAR = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatLastSessionDate(atMs: number, now: () => number = Date.now): string {
  const d = new Date(atMs)
  const today = new Date(now())
  return d.getFullYear() === today.getFullYear()
    ? DATE_FMT_SAME_YEAR.format(d)   // "May 7"
    : DATE_FMT_OTHER_YEAR.format(d)  // "May 7, 2025"
}

export function formatLastSessionDuration(durationSeconds: number): string {
  // D-07: integer minutes (floor)
  return `${Math.floor(durationSeconds / 60)} min`
}

export function formatLastSession(stats: PersistedStats, now: () => number = Date.now): string | null {
  if (stats.lastSessionAtMs === null || stats.lastSessionDurationSeconds === null) return null
  return `Last: ${formatLastSessionDate(stats.lastSessionAtMs, now)} · ${formatLastSessionDuration(stats.lastSessionDurationSeconds)}`
  // (Note: the D-08 footer pattern shows the Reset link AFTER this string.)
}

// D-06: < 60 min → "47 min"; ≥ 60 min → "2.1 hours"
export function formatTotalMinutes(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = totalSeconds / 3600
  return `${hours.toFixed(1)} hours`
}

// D-06: singular for 1
export function formatSessionCount(count: number): string {
  return count === 1 ? '1 session' : `${count} sessions`
}
```
`[CITED: MDN Intl.DateTimeFormat — `month: 'short'` produces "May", "Jun" etc. in en-US]`

### Stats footer composition (D-08)
```tsx
// src/components/StatsFooter.tsx
import type { PersistedStats } from '../storage'
import { formatSessionCount, formatTotalMinutes, formatLastSessionDate, formatLastSessionDuration } from '../storage/format'

export interface StatsFooterProps {
  stats: PersistedStats
  onResetClick(): void
}

export function StatsFooter({ stats, onResetClick }: StatsFooterProps) {
  return (
    <div className="mt-6 text-center text-sm leading-6 text-[var(--color-breathing-muted)]">
      <p>
        {formatSessionCount(stats.totalSessions)} · {formatTotalMinutes(stats.totalElapsedSeconds)} total
      </p>
      <p>
        {stats.lastSessionAtMs !== null && stats.lastSessionDurationSeconds !== null && (
          <>Last: {formatLastSessionDate(stats.lastSessionAtMs)} · {formatLastSessionDuration(stats.lastSessionDurationSeconds)} · </>
        )}
        <button
          type="button"
          onClick={onResetClick}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-2 underline underline-offset-2 text-[var(--color-breathing-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
        >
          Reset
        </button>
      </p>
    </div>
  )
}
```

### Quota-throw failure-path test
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveSettings, loadSettings } from './settings'
import { DEFAULT_SETTINGS } from '../domain/settings'

beforeEach(() => window.localStorage.clear())

describe('saveSettings — quota fallback (D-16)', () => {
  it('does not throw when setItem throws QuotaExceededError', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const e = new Error('quota')
      e.name = 'QuotaExceededError'
      throw e
    })
    expect(() => saveSettings({ ...DEFAULT_SETTINGS, bpm: 6 })).not.toThrow()
  })

  it('subsequent reads return defaults (no partial write)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    saveSettings({ ...DEFAULT_SETTINGS, bpm: 6 })
    vi.restoreAllMocks()
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + @testing-library/react 16.3.2 + jsdom 29.1.1 |
| Config file | `vitest.config.ts` (verified present in repo); setup at `vitest.setup.ts` |
| Quick run command | `npx vitest run --changed` (or single-file: `npx vitest run src/storage/settings.test.ts`) |
| Full suite command | `npm run test:run` (= `vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LOCL-01 | Settings restored on mount | unit | `vitest run src/storage/settings.test.ts` | ❌ Wave 0 |
| LOCL-01 | Mute restored on mount | unit | `vitest run src/storage/settings.test.ts` | ❌ Wave 0 |
| LOCL-01 | Per-field validate-and-fallback (D-15) | unit | `vitest run src/storage/settings.test.ts` | ❌ Wave 0 |
| LOCL-01 | App-level integration: restored steppers + mute icon | integration | `vitest run src/app/App.persistence.test.tsx` | ❌ Wave 0 |
| LOCL-01 | Silent absorb on read failure (D-17) | unit | `vitest run src/storage/storage.test.ts` | ❌ Wave 0 |
| LOCL-01 | Silent absorb on write failure (D-16) | unit | `vitest run src/storage/storage.test.ts` | ❌ Wave 0 |
| LOCL-02 | recordSession threshold (D-01: ≥30s OR complete) | unit | `vitest run src/storage/stats.test.ts` | ❌ Wave 0 |
| LOCL-02 | totalElapsedSeconds aggregation (D-02) | unit | `vitest run src/storage/stats.test.ts` | ❌ Wave 0 |
| LOCL-02 | Last-session date+duration format (D-05/D-07) | unit | `vitest run src/storage/format.test.ts` | ❌ Wave 0 |
| LOCL-02 | Total-minutes 60-min boundary (D-06) | unit | `vitest run src/storage/format.test.ts` | ❌ Wave 0 |
| LOCL-02 | Footer hidden when totalSessions=0 (D-09) | component | `vitest run src/components/StatsFooter.test.tsx` | ❌ Wave 0 |
| LOCL-02 | Footer hidden during inSessionView (D-10) | integration | `vitest run src/app/App.persistence.test.tsx` | ❌ Wave 0 |
| LOCL-02 | App-level stats accumulator: complete + manual end + cancel-lead-in | integration | `vitest run src/app/App.persistence.test.tsx` | ❌ Wave 0 |
| LOCL-02 | No double-write across cleanup effect + confirmEnd | integration | `vitest run src/app/App.persistence.test.tsx` | ❌ Wave 0 |
| LOCL-03 | resetStats wipes stats only (D-11) | unit | `vitest run src/storage/stats.test.ts` | ❌ Wave 0 |
| LOCL-03 | ResetStatsDialog default focus on Keep (D-12) | component | `vitest run src/components/ResetStatsDialog.test.tsx` | ❌ Wave 0 |
| LOCL-03 | Reset link 44×44 hit area (D-13) | component | `vitest run src/components/StatsFooter.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --changed` — runs only the files that touch the diff.
- **Per wave merge:** `npm run test:run` — full suite green.
- **Phase gate:** Full suite green plus manual UAT checkpoint (load → close tab → reopen → assert restoration; complete a session → assert footer reflects it; reset → assert footer disappears).

### Wave 0 Gaps
- [ ] `src/storage/storage.test.ts` — silent-fallback envelope read/write failure paths
- [ ] `src/storage/settings.test.ts` — coerceSettings + load/save + per-field fallback
- [ ] `src/storage/stats.test.ts` — recordSession + threshold + resetStats
- [ ] `src/storage/format.test.ts` — formatTotalMinutes / formatLastSession / formatSessionCount
- [ ] `src/components/StatsFooter.test.tsx` — gating, copy, 44×44 hit area
- [ ] `src/components/ResetStatsDialog.test.tsx` — copy, default focus, Esc cancel, backdrop close
- [ ] `src/app/App.persistence.test.tsx` — integration: restore on mount, record on each end path, no double-write, reset clears
- [ ] No `vitest.setup.ts` change required (jsdom localStorage is functional; per-test `clear()` handles isolation)

### Sampling Justification
- **Unit (storage modules):** measure the per-function contract — coercion, threshold, format. Smallest test surface; most behavior here.
- **Component (StatsFooter, ResetStatsDialog):** measure rendering and accessibility — gating, focus, hit area.
- **Integration (App.persistence.test.tsx):** measures the only interaction surface that the unit tests cannot — the four end paths and the no-double-write invariant. Single integration file is sufficient because the failure modes are clustered around `App.tsx`'s end-path orchestration.

## Project Constraints (from CLAUDE.md)

The repo's `./CLAUDE.md` file was not present at research time (only `~/.claude/CLAUDE.md` for the user-level RTK directives, which constrain the agent's tooling, not the codebase). No project-specific CLAUDE.md directives apply to this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| (none) | All claims in this research are either verified against the codebase, the package.json, or cited from MDN. The `version: 1` envelope choice and the "single write site + recorded-key guard" pattern are recommendations within the discretion zone — not assumptions about external state. | — | — |

**Empty Assumptions Log** — every architectural claim is grounded in either (a) the existing codebase (`[VERIFIED]`), (b) MDN spec docs (`[CITED]`), or (c) a recommendation explicitly within the planner-discretion zone of CONTEXT.md.

## Open Questions

1. **Should we `console.warn` in dev on read/write failure?**
   - What we know: D-17 says "console.warn for devs is acceptable but not required."
   - What's unclear: nothing — this is a planner-discretion call.
   - Recommendation: gate on `import.meta.env.DEV`. One-line addition; aids local debugging without leaking to production.

2. **Where exactly does the runningSnapshotRef get updated?**
   - What we know: it must reflect the latest `running` state's `startedAtMs` and `lastFrame.elapsedMs` so the cleanup effect can read it post-transition.
   - What's unclear: a separate effect or inline ref-update during render?
   - Recommendation: a `useEffect([state])` that updates the ref on every state change while running, and clears it on transition out (BEFORE the cleanup effect's read — so the cleanup effect must read before clearing). Order is enforced by separating into two effects with the read-first one declared first.

3. **Reset link in line 2 vs separate row when Last session is unavailable?**
   - What we know: D-08 puts Reset inline in line 2 after `Last:` — but `lastSessionAtMs` could theoretically be `null` (e.g. if record-session writes fail silently after a count is incremented; mitigated by R-04's atomic-envelope-write).
   - What's unclear: edge case display when `totalSessions > 0` but `lastSessionAtMs === null`.
   - Recommendation: in practice, `recordSession` writes both atomically — `lastSessionAtMs` is set every time count is incremented. Treat null-`lastSessionAtMs` with `totalSessions > 0` as a corrupt state and show only the bare `Reset` link (graceful degradation; no extra UI complexity).

## Environment Availability

> Skip — Phase 4 has no external runtime dependencies beyond the existing Node/npm/Vitest stack already validated in Phase 3.

## Sources

### Primary (HIGH confidence)
- **Codebase introspection (verified files):**
  - `src/domain/settings.ts` (BPM_OPTIONS, RATIO_OPTIONS, DURATION_OPTIONS, DEFAULT_SETTINGS, validateSettings)
  - `src/domain/sessionController.ts` (RunningSessionState.startedAtMs, CompleteSessionState.completedAtMs)
  - `src/hooks/useSessionEngine.ts` (initialSettings constructor pattern, setSelectedSettings)
  - `src/hooks/useAudioCues.ts` (muted state, setMuted) — line 14 TODO confirms LOCL-01 integration seam
  - `src/components/EndSessionDialog.tsx` (props shape; native `<dialog>` + `useEffect` open/close + cancel listener pattern to clone)
  - `src/app/App.tsx` (inSessionView at line 33; cleanup effect at line 217-232; requestEnd at 182-189; confirmEnd at 200-204; cancel-lead-in branch at 111-123)
  - `vitest.setup.ts` (HTMLDialogElement + matchMedia + AudioContext polyfills present; localStorage NOT polyfilled — confirms jsdom built-in)
  - `package.json` (versions: React 19.2.5, TS 6.0.2, Vitest 4.1.5, jsdom 29.1.1, Tailwind 4.3.0, Vite 8.0.10)
  - `.planning/config.json` (workflow.nyquist_validation: true → Validation Architecture section is required)

- **MDN authoritative docs:**
  - `Storage API` (localStorage synchronous semantics, throw behavior under quota / Safari ITP / private mode)
  - `Intl.DateTimeFormat` (`month: 'short'` produces "May"; `year: 'numeric'` only when needed)

### Secondary (MEDIUM confidence)
- jsdom changelog: localStorage as `Storage` interface since v22 (repo uses 29.1.1 — well above the threshold).
- Phase 1/2/3 RESEARCH.md and CONTEXT.md (cited via CONTEXT.md cross-references).

### Tertiary (LOW confidence)
- None. The research was carried out entirely against the local codebase and MDN reference docs.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every dependency is already in `package.json`; no version verification beyond what was read.
- Architecture: **HIGH** — every seam (cleanup effect, inSessionView, EndSessionDialog props, useSessionEngine initial settings) was inspected in source.
- Pitfalls: **HIGH** — pitfalls 1–4 are derived from a direct read of `App.tsx`'s end-path orchestration; pitfalls 5–7 are mechanical jsdom / JSON / Intl gotchas verified by spec.

**Research date:** 2026-05-10
**Valid until:** 2026-06-09 (30 days; stack is stable, no fast-moving deps)
