# Phase 16: Themes — Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 11 (8 new, 7 modified; counts shared across .ts and .test.ts pairs)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/hooks/useTheme.ts` | hook (orchestrator) | event-driven (mql + storage + custom event) | `src/hooks/usePrefersReducedMotion.ts` (mql lifecycle) + `src/app/App.tsx:116-126` (storage listener) | exact (composite of two analogs) |
| `src/hooks/useTheme.test.ts` | hook test | event-driven | `src/hooks/usePrefersReducedMotion.test.ts` (mql mocks) + `src/app/App.persistence.test.tsx:340-358` (StorageEvent + CustomEvent dispatch in `act`) | exact |
| `src/hooks/useThemeChoice.ts` | hook (picker-side) | request-response (write + dispatch) | `src/storage/prefs.ts:68-75` (`savePrefs` consumer) — no direct hook analog; closest existing setter pattern | role-match |
| `src/hooks/useThemeChoice.test.ts` | hook test | request-response | `src/storage/prefs.test.ts:122-145` (savePrefs round-trip) + `usePrefersReducedMotion.test.ts` (renderHook scaffold) | role-match |
| `src/components/ThemePicker.tsx` | component (radiogroup picker) | request-response | `src/components/ResetStatsDialog.tsx:63-80` (button block styling) + `src/components/SettingsStepper.tsx:42-50` (disabled-button pattern) | role-match (no existing radiogroup) |
| `src/components/ThemePicker.test.tsx` | component test | request-response | `src/components/ResetStatsDialog.test.tsx:45-50` (click + `onConfirm` spy) | exact |
| `src/styles/theme.css` | config / stylesheet | n/a (CSS cascade) | self — existing `@theme` block (lines 1-50) is the structural template for the new override blocks | exact (file-in-place) |
| `src/styles/theme.contrast.test.ts` | test (computed-style probe) | batch (iterate themes) | `src/storage/storage.test.ts:79-107` (envelope probe pattern; one-test-per-invariant) | role-match (no existing CSS contrast test) |
| `index.html` | config (HTML entry) | n/a (synchronous boot script) | self — current 13-LOC stub | exact (file-in-place) |
| `src/app/App.tsx` | app-root edit | event-driven (hook invocation) | self — existing `useAudioCues(initialMute, ...)`, `useWakeLock()` lines 136-137 (hook invocation alongside existing hooks) | exact |
| `src/storage/storage.ts` | config edit (comment only) | n/a | self — existing `STATE_KEY` export at line 35 | exact (one-line comment add) |

---

## Pattern Assignments

### `src/hooks/useTheme.ts` (hook, event-driven orchestrator)

**Analog 1 — mql lifecycle:** `src/hooks/usePrefersReducedMotion.ts` (full file).

**Imports + initial state pattern** (`usePrefersReducedMotion.ts:1-13`):
```typescript
import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) {
      return false
    }
    return window.matchMedia(QUERY).matches
  })
```

**Mount-effect with mql re-seed + change listener + cleanup** (`usePrefersReducedMotion.ts:15-36`):
```typescript
useEffect(() => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!window.matchMedia) {
    return
  }
  const mql = window.matchMedia(QUERY)
  // IN-02: re-seed from the live MediaQueryList ... canonical pattern from MDN
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setReduced(mql.matches)
  const onChange = (event: MediaQueryListEvent) => {
    setReduced(event.matches)
  }
  mql.addEventListener('change', onChange)
  return () => {
    mql.removeEventListener('change', onChange)
  }
}, [])
```

**Adaptation for `useTheme`:**
- Replace `QUERY = '(prefers-reduced-motion: reduce)'` with `'(prefers-color-scheme: dark)'`.
- Gate the effect on `theme === 'system'` per Phase 16 S-04 — early return when `theme !== 'system'`; dep array becomes `[theme]` so cleanup re-runs on theme change.
- Side-effect body writes `document.documentElement.dataset.theme = mql.matches ? 'dark' : 'light'` (not setReduced) — this is the apply effect; carry forward the eslint-disable comments verbatim.
- Initial useState seed reads `loadPrefs().theme` (not `mql.matches`) — the orchestrator's React state is the `ThemeId`, not a boolean.

**Analog 2 — storage listener:** `src/app/App.tsx:116-126`.

**Cross-tab `'storage'` listener** (literal template):
```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STATE_KEY) {
      setStats(loadStats())
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
  }
}, [])
```

**Adaptation for `useTheme`:**
- Replace `setStats(loadStats())` with `setTheme(loadPrefs().theme)`.
- Empty deps `[]` correct — `setTheme` is stable from `useState`, `loadPrefs` + `STATE_KEY` are module-level imports.
- Import `STATE_KEY` from `'../storage/storage'` (the same export used at `App.tsx:33`).

**Analog 3 — apply effect (no direct codebase analog; new pattern grounded in dataset API):**
The "write `documentElement.dataset.theme` whenever React state changes" effect has no exact prior match in the codebase. The closest is the App-level Phase 8 `useEffect` shape at `App.tsx:116-126` (one effect per concern, empty/single-dep array). Use a dedicated `useEffect` with dep `[theme]`:
```typescript
useEffect(() => {
  if (theme === 'system') {
    // Resolved by the mql-gated effect; do not write here to avoid double-write
    return
  }
  document.documentElement.dataset.theme = theme
}, [theme])
```

**Custom-event listener** (RESEARCH.md §"Pattern 3" — no direct codebase analog yet; shape locked by RESEARCH):
```typescript
useEffect(() => {
  const onPrefsChanged = (e: Event) => {
    if (e instanceof CustomEvent) {
      const detail = e.detail as { key?: string } | null
      if (!detail || detail.key === 'theme' || detail.key === undefined) {
        setTheme(loadPrefs().theme)
      }
    }
  }
  window.addEventListener('hrv:prefs-changed', onPrefsChanged)
  return () => {
    window.removeEventListener('hrv:prefs-changed', onPrefsChanged)
  }
}, [])
```

**Imports** (mirror `usePrefersReducedMotion.ts:1` + `App.tsx:24-36`):
```typescript
import { useEffect, useState } from 'react'
import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage/storage'
import type { ThemeId } from '../domain/settings'
```

---

### `src/hooks/useTheme.test.ts` (hook test, event-driven)

**Analog 1 — mql mock + renderHook scaffold:** `src/hooks/usePrefersReducedMotion.test.ts`.

**Imports + afterEach + matchMedia mock shape** (`usePrefersReducedMotion.test.ts:1-9, 18-28`):
```typescript
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { usePrefersReducedMotion } from './usePrefersReducedMotion'

afterEach(() => {
  vi.restoreAllMocks()
})

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
vi.spyOn(window, 'matchMedia').mockReturnValue({
  matches: true,
  media: '(prefers-reduced-motion: reduce)',
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
} as unknown as MediaQueryList)
```

**addEventListener/removeEventListener spy assertion pattern** (`usePrefersReducedMotion.test.ts:34-55`):
```typescript
it('subscribes via addEventListener("change", ...) and cleans up on unmount', () => {
  const addSpy = vi.fn()
  const removeSpy = vi.fn()
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: false,
    addEventListener: addSpy,
    removeEventListener: removeSpy,
    // ...
  } as unknown as MediaQueryList)

  const { unmount } = renderHook(() => usePrefersReducedMotion())
  expect(addSpy).toHaveBeenCalledWith('change', expect.any(Function))

  unmount()
  expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function))
})
```

**Capture-and-fire change listener pattern** (`usePrefersReducedMotion.test.ts:88-113`):
```typescript
let captured: ((event: MediaQueryListEvent) => void) | null = null
vi.spyOn(window, 'matchMedia').mockReturnValue({
  matches: false,
  addEventListener: ((_type: string, listener: (event: MediaQueryListEvent) => void) => {
    captured = listener
  }) as MediaQueryList['addEventListener'],
  // ...
} as unknown as MediaQueryList)

const { result } = renderHook(() => usePrefersReducedMotion())
act(() => {
  captured?.({ matches: true } as MediaQueryListEvent)
})
expect(result.current).toBe(true)
```

**Analog 2 — storage event dispatch:** `src/app/App.persistence.test.tsx:340-358`.

**Setitem-before-dispatch ordering + omit storageArea** (literal template):
```typescript
// CRITICAL ORDERING: setItem BEFORE dispatchEvent — the listener calls loadPrefs()
// which reads disk synchronously; the new payload MUST be on disk before the handler fires.
window.localStorage.setItem(STATE_KEY, newEnvelope)

// Note: omit `storageArea` from StorageEventInit — jsdom rejects window.localStorage.
// eslint-disable-next-line @typescript-eslint/require-await
await act(async () => {
  window.dispatchEvent(new StorageEvent('storage', {
    key: STATE_KEY,
    newValue: newEnvelope,
    oldValue: null,
  }))
})
```

**CustomEvent dispatch in `act`** (RESEARCH §"Pattern 3" + `App.persistence.test.tsx:352-358` adapted):
```typescript
// eslint-disable-next-line @typescript-eslint/require-await
await act(async () => {
  window.dispatchEvent(new CustomEvent('hrv:prefs-changed', {
    detail: { key: 'theme', value: 'dark' },
  }))
})
// Assert: documentElement.dataset.theme === 'dark', result.current.theme === 'dark'
```

**Test cases to cover (matches Phase 16 CONTEXT.md item 8):**
1. Initial mount with stored `theme: 'dark'` writes `documentElement.dataset.theme === 'dark'`.
2. `setTheme('moss')` updates state, writes attribute, calls `savePrefs` (use `vi.spyOn(localStorage.__proto__, 'setItem')` or `window.localStorage.setItem` assertion).
3. `setTheme('system')` resolves via matchMedia mock (`matches: true` → writes `'dark'`).
4. mql `change` event fires only when state === `'system'` (capture-and-fire pattern).
5. mql listener cleanup on unmount AND on theme-switch from `'system'` to named (assert `removeSpy` after `setTheme('dark')`).
6. `'storage'` event with `key === STATE_KEY` re-reads via `loadPrefs`.
7. `'storage'` event with unrelated key is ignored.
8. `'hrv:prefs-changed'` CustomEvent re-reads.

---

### `src/hooks/useThemeChoice.ts` (hook, request-response write+dispatch)

**Analog — savePrefs consumer:** `src/storage/prefs.ts:68-75`.

**savePrefs API surface** (literal — Phase 16 consumes verbatim):
```typescript
export function loadPrefs(deps: StorageDeps = {}): UserPrefs {
  return coercePrefs(readEnvelope(deps).prefs)
}

export function savePrefs(prefs: UserPrefs, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, prefs }, deps)
}
```

**Hook skeleton** (composite — no existing setter-hook with dispatchEvent in codebase; pattern grounded in CONTEXT.md A-02/A-03):
```typescript
import { useCallback, useState } from 'react'
import { loadPrefs, savePrefs } from '../storage/prefs'
import type { ThemeId } from '../domain/settings'

export function useThemeChoice(): { theme: ThemeId; setTheme: (next: ThemeId) => void } {
  const [theme, setTheme] = useState<ThemeId>(() => loadPrefs().theme)
  const setThemeChoice = useCallback((next: ThemeId) => {
    setTheme(next)
    savePrefs({ ...loadPrefs(), theme: next })
    window.dispatchEvent(new CustomEvent('hrv:prefs-changed', {
      detail: { key: 'theme', value: next },
    }))
  }, [])
  return { theme, setTheme: setThemeChoice }
}
```

**Adaptation notes:**
- Use `useCallback([])` for `setTheme` to give a stable identity (matches `useAudioCues` pattern at `App.tsx:198-199` "function fields are wrapped in useCallback([]) so their identities are stable").
- The merge pattern `{ ...loadPrefs(), theme: next }` mirrors `savePrefs`'s own `{ ...env, prefs }` shape in `prefs.ts:74` — preserves other prefs fields (timbre/variant/locale).
- Custom event detail shape `{ key: 'theme', value: next }` is the RESEARCH.md recommendation (forward-compat for Phase 17/18/19).

---

### `src/hooks/useThemeChoice.test.ts` (hook test, request-response)

**Analog 1 — savePrefs round-trip assertion:** `src/storage/prefs.test.ts:122-145`.

**Round-trip pattern** (`prefs.test.ts:127-145`):
```typescript
it('round-trips a valid UserPrefs object', () => {
  const next: UserPrefs = { theme: 'dark', timbre: 'bell', variant: 'square', locale: 'pt-BR' }
  savePrefs(next)
  expect(loadPrefs()).toEqual(next)
})

it('preserves settings, mute, and stats fields when saving prefs (envelope merge)', () => {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 1,
    settings: { bpm: 4, ratio: '40:60', durationMinutes: 5 },
    mute: true,
    stats: { totalSessions: 3, ... },
  }))
  savePrefs({ theme: 'dark', timbre: 'bell', variant: 'square', locale: 'pt-BR' })
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as Record<string, unknown>
  expect(raw).toMatchObject({ settings: { bpm: 4 }, mute: true, stats: { totalSessions: 3 } })
})
```

**beforeEach/afterEach localStorage clear** (`prefs.test.ts:26-33`):
```typescript
beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})
```

**Analog 2 — renderHook + act:** `src/hooks/usePrefersReducedMotion.test.ts:10-13`.

**Test cases (per Phase 16 CONTEXT.md picker hook responsibilities):**
1. Initial `theme` matches `loadPrefs().theme` (seeded via `window.localStorage.setItem(STATE_KEY, ...)`).
2. `setTheme('dusk')` updates `result.current.theme`.
3. `setTheme('dusk')` writes via `savePrefs` (assert via `loadPrefs()` round-trip OR `JSON.parse(localStorage.getItem(STATE_KEY)!)` direct-disk-read).
4. `setTheme('dusk')` dispatches `'hrv:prefs-changed'` with `detail: { key: 'theme', value: 'dusk' }` (use `window.addEventListener('hrv:prefs-changed', spy)` + `expect(spy).toHaveBeenCalled()` + read `spy.mock.calls[0][0].detail`).
5. `setTheme('moss')` preserves the other prefs (settings/mute/stats untouched on disk — re-read envelope).

---

### `src/components/ThemePicker.tsx` (component, radiogroup)

**Analog 1 — button block styling:** `src/components/ResetStatsDialog.tsx:63-80` (Keep button — non-destructive style).

**Button class pattern** (`ResetStatsDialog.tsx:65-72`):
```typescript
<button
  ref={cancelButtonRef}
  type="button"
  onClick={onCancel}
  className="min-h-12 rounded-full border border-teal-200 bg-white px-5 py-2 text-base font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50 active:bg-teal-100 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
>
  Keep
</button>
```

**Analog 2 — disabled-button pattern:** `src/components/SettingsStepper.tsx:42-50`.

**Disabled class pattern** (`SettingsStepper.tsx:42-50`):
```typescript
<button
  type="button"
  aria-label={`Decrease ${label}`}
  className="grid size-12 min-h-11 min-w-11 place-items-center rounded-full border border-teal-200 bg-white text-2xl leading-none text-teal-800 shadow-sm transition hover:bg-teal-50 active:bg-teal-100 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
  disabled={disabled || disableDecrease || !canDecrease}
  onClick={() => { changeBy(-1) }}
>
  −
</button>
```

**Analog 3 — current ThemePicker stub:** `src/components/ThemePicker.tsx` (replace body, keep section-label markup).

**Section label markup to preserve** (`ThemePicker.tsx:20`):
```typescript
<p className="text-sm font-semibold text-slate-900">Theme</p>
```

**Adaptation for Phase 16 ThemePicker (composite from UI-SPEC §"Visual & Interaction Specifications" + above analogs):**

```typescript
import { THEME_OPTIONS, type ThemeId } from '../domain/settings'
import { useThemeChoice } from '../hooks/useThemeChoice'

export interface ThemePickerProps {
  disabled: boolean
}

export function ThemePicker({ disabled }: ThemePickerProps) {
  const { theme, setTheme } = useThemeChoice()
  return (
    <div>
      <p id="theme-picker-label" className="text-sm font-semibold text-slate-900">Theme</p>
      <div
        role="radiogroup"
        aria-labelledby="theme-picker-label"
        aria-disabled={disabled}
        className="mt-2 grid grid-cols-3 gap-2"
      >
        {THEME_OPTIONS.map((id) => {
          const selected = theme === id
          const label = id.charAt(0).toUpperCase() + id.slice(1)
          // Selected: 2px accent border + bg-soft fill + accent-strong text (UI-SPEC §3 table)
          // Not-selected: 1px teal-200 border + bg-white + teal-800 text (matches Close button pattern)
          const baseClasses = 'min-h-12 rounded-full px-3 py-2 text-sm font-semibold shadow-sm transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45'
          const stateClasses = selected
            ? 'border-2 border-[var(--color-breathing-accent)] bg-[var(--color-breathing-bg-soft)] text-[var(--color-breathing-accent-strong)]'
            : 'border border-teal-200 bg-white text-teal-800 hover:bg-teal-50 active:bg-teal-100'
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => { setTheme(id) }}
              className={`${baseClasses} ${stateClasses}`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

**Notes:**
- Prop interface unchanged (`{ disabled: boolean }`) per Phase 15 D-02 / Phase 16 D-20.
- Capitalize-first label derivation is allowed by Phase 16 D-22 ("`ThemeId` values capitalized for first character; no display-mapping function").
- `motion-reduce:transition-none` mirrors `ResetStatsDialog.tsx:69`, `SettingsStepper.tsx:45`, `SettingsDialog.tsx:91` — the codebase-wide reduced-motion gate.
- The `text-teal-800` / `border-teal-200` / `bg-teal-50` literals reuse the Phase 15 baseline; they coexist with the per-palette `var(--color-*)` cascade because Tailwind's `teal-*` palette is not in the themable token set (D-02 scopes only `--color-*` tokens). Selected-state classes USE the `var(--color-*)` indirection so they re-tint per palette.

---

### `src/components/ThemePicker.test.tsx` (component test)

**Analog 1 — click + spy pattern:** `src/components/ResetStatsDialog.test.tsx:45-50`.

**Click-and-assert pattern** (`ResetStatsDialog.test.tsx:8-17, 45-50`):
```typescript
function renderDialog(
  props: Partial<{ open: boolean; onConfirm: () => void; onCancel: () => void }> = {},
) {
  const onConfirm = props.onConfirm ?? vi.fn()
  const onCancel = props.onCancel ?? vi.fn()
  const utils = render(
    <ResetStatsDialog open={props.open ?? false} onConfirm={onConfirm} onCancel={onCancel} />,
  )
  return { ...utils, onConfirm, onCancel }
}

it('clicking Reset invokes onConfirm exactly once', async () => {
  const user = userEvent.setup()
  const { onConfirm } = renderDialog({ open: true })
  await user.click(screen.getByRole('button', { name: 'Reset' }))
  expect(onConfirm).toHaveBeenCalledTimes(1)
})
```

**Analog 2 — current stub test header:** `src/components/ThemePicker.test.tsx:1-10`.

**Test scaffold to preserve** (`ThemePicker.test.tsx:1-5`):
```typescript
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ThemePicker } from './ThemePicker'
```

**Test cases for Phase 16 ThemePicker (covers UI-SPEC §"Accessibility Contract" + CONTEXT.md item 9):**
1. Renders all 6 options as `getAllByRole('radio')` — assert length 6 and labels `Light`, `Dark`, `System`, `Moss`, `Slate`, `Dusk`.
2. Renders the `Theme` section label (carry-forward from stub test).
3. `aria-checked='true'` on the currently-stored theme; `false` on others. Seed via `window.localStorage.setItem(STATE_KEY, ...)` before render.
4. Clicking an option calls `savePrefs` (assert via direct-disk-read of `STATE_KEY` after click).
5. Clicking an option dispatches `'hrv:prefs-changed'` (use `window.addEventListener('hrv:prefs-changed', spy)`).
6. When `disabled=true`, all 6 buttons have `disabled` attribute (`expect(button).toBeDisabled()`); radiogroup has `aria-disabled='true'`.
7. Clicking a disabled option does NOT call `savePrefs` (no disk change).

---

### `src/styles/theme.css` (config, CSS cascade)

**Analog — self:** the existing `@theme` block at lines 1-50 is the structural template for the new override blocks.

**Current `@theme` block tokens** (lines 1-50 — all 17 `--color-*` tokens to be redeclared per palette):
```css
@theme {
  --color-breathing-bg: #f2fbf7;
  --color-breathing-bg-soft: #e4f6ef;
  --color-breathing-bg-edge: #f8fffc;
  --color-breathing-surface: #ffffff;
  --color-breathing-accent: #0f766e;
  --color-breathing-accent-strong: #115e59;
  --color-breathing-muted: #64748b;
  --shadow-breathing-card: 0 24px 80px rgb(15 118 110 / 0.12);
  /* orb sizing tokens — NOT themable */
  --orb-size: clamp(180px, 35vw, 360px);
  --orb-scale-min: 0.58;
  --orb-scale-max: 1.0;
  --orb-scale-mid: 0.79;
  /* orb gradient tokens — themable */
  --color-orb-in-from: #99f6e4;
  --color-orb-in-to: #ecfdf5;
  --color-orb-out-from: #bfdbfe;
  --color-orb-out-to: #eef2ff;
  --color-orb-in-text: #134e4a;
  --color-orb-out-text: #1e3a8a;
  /* ring tokens — themable */
  --color-ring-outer: rgb(153 246 228 / 0.6);
  --color-ring-inner: rgb(59 130 246 / 0.35);
  /* modal token — themable */
  --color-modal-backdrop: rgb(15 23 42 / 0.30);
}
```

**Edit plan (D-03/D-04):**
1. Replace the values inside `@theme { ... }` with the new Light palette hexes (planner picks).
2. Append four override blocks after the existing `@theme` block in source order Dark → Moss → Slate → Dusk:
```css
[data-theme='dark']:root {
  --color-breathing-bg: #...;
  /* ... 16 more tokens; SAME NAMES, different hexes ... */
}

[data-theme='moss']:root {
  /* BYTE-IDENTICAL copy of the current @theme values (D-03) */
  --color-breathing-bg: #f2fbf7;
  --color-breathing-bg-soft: #e4f6ef;
  /* ... etc ... */
}

[data-theme='slate']:root { /* planner hexes */ }
[data-theme='dusk']:root  { /* planner hexes */ }
```
3. Place the new blocks BEFORE the existing `.orb`, `.orb-layer--in`, `.orb-layer--out`, etc. rules (lines 52+) so the cascade resolution is straightforward (token redeclaration → consumer rules).
4. Do NOT touch the orb sizing tokens (`--orb-size`, `--orb-scale-*`) or `--shadow-breathing-card` — D-02 currently scopes only `--color-*` tokens.
5. Do NOT touch the `.orb*` rules (lines 52-120) — they consume the tokens via `var(--color-orb-in-from)` etc. and inherit re-tinting automatically.
6. Do NOT touch the reduced-motion `@media` block (lines 160-168) — theme-independent.

---

### `src/styles/theme.contrast.test.ts` (new test, batch over themes)

**Analog — envelope probe pattern:** `src/storage/storage.test.ts:79-107` (positive forward-compat probe per invariant).

**Probe pattern shape** (`storage.test.ts:79-97`):
```typescript
// Seed a v2-only envelope (no known subtrees) to isolate the version guard.
window.localStorage.setItem(STATE_KEY, JSON.stringify({
  version: 2, settings: { bpm: 4 }, prefs: { theme: 'dark' },
}))
const env = readEnvelope()
expect(env.version).toBe(2)
expect((env as unknown as Record<string, unknown>).prefs)
  .toEqual({ theme: 'dark' })
```

**Adaptation — Phase 16 contrast test (composite from RESEARCH.md §"Test Strategy for THEME-05" + Pitfall 1 + Pitfall 2):**

```typescript
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const THEMES = ['light', 'dark', 'moss', 'slate', 'dusk'] as const

let styleEl: HTMLStyleElement

beforeAll(() => {
  // Pitfall 1: rewrite @theme { → :root { so jsdom recognizes the rule.
  // Pitfall 3: import './theme.css' does NOT inject styles; readFileSync + <style> tag.
  const raw = readFileSync(resolve(__dirname, 'theme.css'), 'utf-8')
  const rewritten = raw.replace(/@theme\s*\{/g, ':root {')
  styleEl = document.createElement('style')
  styleEl.textContent = rewritten
  document.head.appendChild(styleEl)
})

afterAll(() => {
  styleEl.remove()
})

beforeEach(() => {
  delete document.documentElement.dataset.theme
})

// WCAG 2.x relative-luminance formula — inline per D-18 zero-deps.
function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function parseHexOrRgb(value: string): [number, number, number] {
  const trimmed = value.trim()
  // Match #rrggbb
  if (trimmed.startsWith('#') && trimmed.length === 7) {
    return [
      parseInt(trimmed.slice(1, 3), 16),
      parseInt(trimmed.slice(3, 5), 16),
      parseInt(trimmed.slice(5, 7), 16),
    ]
  }
  // Match rgb(r, g, b) or rgb(r g b)
  const m = /rgb\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(trimmed)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  throw new Error(`Unparseable color: ${value}`)
}

describe.each(THEMES)('orb-in vs orb-out contrast for [data-theme="%s"]', (theme) => {
  it('midpoint luminance contrast ratio >= 1.5', () => {
    document.documentElement.dataset.theme = theme
    const cs = getComputedStyle(document.documentElement)
    // Pitfall 2: read tokens directly — don't parse gradient string (var() is not substituted in jsdom).
    const inFrom = parseHexOrRgb(cs.getPropertyValue('--color-orb-in-from'))
    const inTo = parseHexOrRgb(cs.getPropertyValue('--color-orb-in-to'))
    const outFrom = parseHexOrRgb(cs.getPropertyValue('--color-orb-out-from'))
    const outTo = parseHexOrRgb(cs.getPropertyValue('--color-orb-out-to'))
    // Midpoint per-channel average
    const inMid: [number, number, number] = [
      (inFrom[0] + inTo[0]) / 2, (inFrom[1] + inTo[1]) / 2, (inFrom[2] + inTo[2]) / 2,
    ]
    const outMid: [number, number, number] = [
      (outFrom[0] + outTo[0]) / 2, (outFrom[1] + outTo[1]) / 2, (outFrom[2] + outTo[2]) / 2,
    ]
    const lIn = relativeLuminance(...inMid)
    const lOut = relativeLuminance(...outMid)
    const ratio = (Math.max(lIn, lOut) + 0.05) / (Math.min(lIn, lOut) + 0.05)
    expect(ratio).toBeGreaterThanOrEqual(1.5)
  })
})
```

**Notes:**
- `describe.each` (CONTEXT.md D-15 spec used `it.each` — `describe.each` is equivalent and gives clearer failure messages).
- Inline `relativeLuminance` and `parseHexOrRgb` helpers — no new dep (D-18).
- The `light` palette is the `@theme` block rewritten to `:root` — it applies when no `data-theme` is set OR explicitly via `[data-theme='light']:root` block (planner: add this block too OR rely on `:root` baseline; planner picks).

---

### `index.html` (config, HTML entry)

**Analog — self:** the current 13-LOC stub.

**Current state** (`index.html` full file, 13 lines):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HRV Breathing</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Edit (CONTEXT.md S-03 — locked verbatim):**
Insert the synchronous inline script immediately after `<meta name="viewport">` and before `<title>` (RESEARCH.md primary recommendation):
```html
<script>
(function(){
  try {
    var raw = localStorage.getItem('hrv:state:v1');
    var t = raw && (JSON.parse(raw).prefs || {}).theme;
    if (t === 'system' || !t || ['light','dark','moss','slate','dusk'].indexOf(t) < 0) {
      t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch(_) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
</script>
```

**Critical constraints (RESEARCH Pitfall 5):**
- NO `type="module"`.
- NO `async` / `defer`.
- Inline (no `src=`).

---

### `src/app/App.tsx` (single-line edit)

**Analog — self:** existing hook invocation pattern at lines 136-137.

**Reference excerpt** (`App.tsx:136-137`):
```typescript
const audio = useAudioCues(initialMute, onAudioReanchorRequired) // Phase 3 + Plan 06 D-35
const wakeLock = useWakeLock() // Phase 5: imperative resource — D-11/D-12 (no React state surface)
```

**Adaptation:**
- Add `useTheme()` invocation alongside these — the return value `{ theme, setTheme }` is NOT consumed by App; the hook is called for its side effects (CONTEXT.md item 6).
- Recommended placement: at the top of the `function App()` body, before `useSessionEngine` and the other side-effectful hooks, so the apply effect runs early in commit order. Concrete suggestion:
```typescript
import { useTheme } from '../hooks/useTheme'
// ... existing imports ...

export default function App() {
  useTheme() // Phase 16 THEME-01..04: orchestrates <html data-theme> writes, mql, cross-tab + same-tab sync
  // ... existing body unchanged ...
```
- NO new `useState` calls in App (Phase 15 D-05 / Phase 16 D-21 carry-forward — `useTheme` owns its internal state).
- Existing `STATE_KEY` import from `'../storage'` (line 33) is preserved — `useTheme` re-imports from `'../storage/storage'` (or `'../storage'` barrel; planner picks).

---

### `src/storage/storage.ts` (one-line comment addition)

**Analog — self:** existing `STATE_KEY` export at line 35.

**Reference excerpt** (`storage.ts:32-35`):
```typescript
// Tests should NOT depend on the literal STATE_KEY string; assert through the
// public load*/save* API where possible. ...
export const STATE_KEY = 'hrv:state:v1'
export const STATE_VERSION = 1 as const
```

**Edit (CONTEXT.md S-02):** add a `// SYNC WITH index.html FOUC SCRIPT` comment IMMEDIATELY above the `STATE_KEY` export. Example:
```typescript
// SYNC WITH index.html FOUC SCRIPT — when bumping the :v1 suffix, update the
// hardcoded 'hrv:state:v1' string in index.html's <head> theme-resolve script.
export const STATE_KEY = 'hrv:state:v1'
```

No semantic change. The existing version-bump comment block (lines 13-34) gives the rationale; the new comment is a single load-bearing pointer to the second copy of the literal.

---

## Shared Patterns

### Reduced-motion CSS gate

**Source:** `src/components/SettingsStepper.tsx:45`, `src/components/ResetStatsDialog.tsx:69`, `src/components/SettingsDialog.tsx:91`.

**Apply to:** every animated button in `ThemePicker.tsx` — specifically the `transition` declarations on hover/focus state classes.

**Pattern** (literal class fragment used by every existing animated button):
```
transition motion-reduce:transition-none
```

**Why it's load-bearing:** Phase 2 D-07 reduced-motion contract requires the orb crossfade to be the SOLE perceptual phase indicator under `prefers-reduced-motion: reduce`. Any picker animations that bleed past the reduced-motion gate would compete with that contract. The `motion-reduce:transition-none` Tailwind utility is the codebase-wide gate; ThemePicker buttons MUST include it.

---

### Focus-visible accent ring

**Source:** `src/components/ResetStatsDialog.tsx:69`, `src/components/SettingsStepper.tsx:45`, `src/components/SettingsDialog.tsx:91` — every focusable button in the modal stack.

**Apply to:** every option button in `ThemePicker.tsx`.

**Pattern** (literal class fragment):
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2
```

**Why it's load-bearing:** UI-SPEC §"Accessibility Contract" mandates focus indicator parity. `ring-breathing-accent` references `--color-breathing-accent` via Tailwind v4's arbitrary-value syntax, so the focus ring re-tints per palette automatically.

---

### Disabled-button class set

**Source:** `src/components/SettingsStepper.tsx:45,60`.

**Apply to:** every option button in `ThemePicker.tsx`.

**Pattern** (literal class fragment):
```
disabled:cursor-not-allowed disabled:opacity-45
```

**Combined with HTML `disabled` attribute on the `<button>` (browser-native click + Tab suppression) + `aria-disabled` on the `<div role='radiogroup'>` container (defense-in-depth from Phase 6 LearnAnchor D-03 "disable not hide").

---

### `STATE_KEY` filter + setItem-before-dispatch

**Source:** `src/app/App.tsx:116-126` (production listener) + `src/app/App.persistence.test.tsx:340-358` (test pattern).

**Apply to:** `useTheme.ts` storage listener AND `useTheme.test.ts` storage-event dispatch.

**Production pattern** (`App.tsx:116-126`):
```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STATE_KEY) {
      setStats(loadStats())
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
  }
}, [])
```

**Test ordering pattern** (`App.persistence.test.tsx:340-358`):
- `setItem` BEFORE `dispatchEvent` — the listener reads disk via `loadPrefs()`/`loadStats()`, so disk must reflect the new payload before the handler fires.
- Omit `storageArea` from `StorageEventInit` — jsdom rejects `window.localStorage` for that field.

**Why it's load-bearing:** Phase 16 attaches a SECOND `'storage'` listener to the same `window` event (RESEARCH Pitfall 6 / CONTEXT.md A-04). Two listeners on the same event are concurrent (not priority-queued); both must use the same filter shape to coexist without interference.

---

### matchMedia mock shape

**Source:** `src/hooks/usePrefersReducedMotion.test.ts:18-28`.

**Apply to:** `useTheme.test.ts` (every test that exercises the system-mode mql lifecycle).

**Pattern** (literal — full object shape required by `MediaQueryList`):
```typescript
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
vi.spyOn(window, 'matchMedia').mockReturnValue({
  matches: true,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
} as unknown as MediaQueryList)
```

**Why it's load-bearing:** Both legacy (`addListener`/`removeListener`) and modern (`addEventListener`/`removeEventListener`) APIs must be stubbed because the runtime check `if (!window.matchMedia)` only guards absence; once `matchMedia` is mocked the legacy fields are accessed by some browser polyfills. The Phase 2 reduced-motion test established the shape — Phase 16 reuses verbatim.

---

## No Analog Found

None — every Phase 16 file has at least a partial codebase analog. The closest "no-analog" item was the `setTheme` setter pattern in `useThemeChoice` (no existing hook in the codebase wraps `savePrefs` + `dispatchEvent`), but the underlying primitives (`savePrefs` from `prefs.ts`, `CustomEvent` from RESEARCH.md §"Pattern 3") are well-established and combine without surprise.

---

## Metadata

**Analog search scope:**
- `src/hooks/` (all 4 hooks + tests)
- `src/components/` (all 12 components, focus on `*Picker.tsx`, `SettingsStepper.tsx`, `ResetStatsDialog.tsx`, `SettingsDialog.tsx`)
- `src/app/App.tsx` + `src/app/App.persistence.test.tsx`
- `src/storage/` (`storage.ts`, `prefs.ts`, `prefs.test.ts`, `storage.test.ts`)
- `src/styles/theme.css`
- `src/domain/settings.ts`
- `index.html`

**Files scanned:** ~25 source files + ~20 test files (read targeted ranges).

**Pattern extraction date:** 2026-05-12
