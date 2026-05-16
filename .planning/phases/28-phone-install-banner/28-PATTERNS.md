# Phase 28: Phone Install Banner - Pattern Map

**Mapped:** 2026-05-16
**Files analyzed:** 8 (6 new files, 2 modified files)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/hooks/useIsStandaloneOrPhone.ts` | hook | event-driven | `src/hooks/usePrefersReducedMotion.ts` | exact |
| `src/hooks/useIsStandaloneOrPhone.test.ts` | test | — | `src/hooks/usePrefersReducedMotion.test.ts` | exact |
| `src/hooks/useBeforeInstallPrompt.ts` | hook | event-driven | `src/hooks/useWakeLock.ts` | role-match |
| `src/hooks/useBeforeInstallPrompt.test.ts` | test | — | `src/hooks/usePrefersReducedMotion.test.ts` | role-match |
| `src/storage/installDismissed.ts` | utility | CRUD | `src/storage/stats.ts` + `src/storage/storage.ts` | role-match |
| `src/storage/installDismissed.test.ts` | test | — | `src/storage/prefs.test.ts` | role-match |
| `src/components/InstallBanner.tsx` | component | request-response | `src/components/MuteToggle.tsx` | role-match |
| `src/components/InstallBanner.test.tsx` | test | — | `src/components/MuteToggle.test.tsx` | exact |
| `src/content/strings.ts` | config | — | `src/content/strings.ts` (self — extend) | exact |
| `src/app/App.tsx` | component | request-response | `src/app/App.tsx` (self — extend) | exact |

---

## Pattern Assignments

### `src/hooks/useIsStandaloneOrPhone.ts` (hook, event-driven)

**Analog:** `src/hooks/usePrefersReducedMotion.ts`

**Imports pattern** (lines 1-2):
```typescript
import { useEffect, useState } from 'react'
```

**Core matchMedia hook pattern** (lines 1-39 — full file):
```typescript
// Defensive guard for environments where matchMedia may be absent (e.g., jsdom without polyfill)
const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) {
      return false
    }
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) {
      return
    }
    const mql = window.matchMedia(QUERY)
    // IN-02: re-seed from the live MediaQueryList in case the OS preference
    // changed between the initial render commit and this mount-effect.
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

  return reduced
}
```

**Key adaptation notes for `useIsStandaloneOrPhone`:**
- Use two `useState` instances (one for `isStandalone`, one for `isPhone`)
- Use two separate `mql` objects inside `useEffect` (`STANDALONE_QUERY` and `PHONE_QUERY`)
- Add `SafariNavigator` interface augmentation: `interface SafariNavigator extends Navigator { standalone?: boolean }`
- `isStandalone` initializer and effect re-seed must OR-combine `mqlStandalone.matches || ((navigator as SafariNavigator).standalone === true)`
- Return `{ isStandalone, isPhone }` instead of a single boolean
- Both `eslint-disable react-hooks/set-state-in-effect` comments required for the effect's `setIsStandalone` / `setIsPhone` re-seed calls
- `STANDALONE_QUERY = '(display-mode: standalone)'`, `PHONE_QUERY = '(pointer: coarse)'`

---

### `src/hooks/useIsStandaloneOrPhone.test.ts` (test)

**Analog:** `src/hooks/usePrefersReducedMotion.test.ts`

**Imports pattern** (lines 1-4):
```typescript
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { usePrefersReducedMotion } from './usePrefersReducedMotion'
```

**matchMedia mock shape** (lines 19-28 — the canonical stub):
```typescript
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

**Per-query stub with `mockImplementation`** (lines 63-80 — multi-call discrimination):
```typescript
vi.spyOn(window, 'matchMedia').mockImplementation((media: string) => {
  callCount += 1
  const matches = callCount > 1
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return {
    matches,
    media,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList
})
```

**Key adaptation:** For `useIsStandaloneOrPhone.test.ts`, the `mockImplementation` must discriminate on the `query` string parameter to return different `matches` values for `'(display-mode: standalone)'` vs `'(pointer: coarse)'`:
```typescript
vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
  matches: query === '(pointer: coarse)',    // phone=true, standalone=false
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
} as unknown as MediaQueryList))
```

**Test structure to replicate** (lines 6-8, `afterEach`):
```typescript
afterEach(() => {
  vi.restoreAllMocks()
})
```

---

### `src/hooks/useBeforeInstallPrompt.ts` (hook, event-driven)

**Analog:** `src/hooks/useWakeLock.ts`

**Imports pattern** (lines 19-20):
```typescript
import { useCallback, useEffect, useRef } from 'react'
```

**Adaptation:** `useBeforeInstallPrompt` uses `useState` (not just `useRef`) because `deferredPrompt` must trigger a render when captured. Import `useCallback, useEffect, useState` from React.

**Non-standard browser API typing pattern** (lines 30-43 in `useWakeLock.ts`):
```typescript
// Pattern: declare local interface for non-standard/missing DOM types, then cast
// useWakeLock uses: if (!('wakeLock' in navigator)) return    ← absence guard
// useBeforeInstallPrompt needs:
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
}
```

**window event listener with cleanup** (lines 104-131 in `useWakeLock.ts`):
```typescript
useEffect(() => {
  const onVisibility = () => { ... }
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    // cleanup: null refs, release resources
  }
}, [request])
```

**useCallback with stable deps** (lines 44-83 in `useWakeLock.ts`):
```typescript
const request = useCallback(async (): Promise<void> => {
  if (!('wakeLock' in navigator)) return   // API-absent guard
  if (sentinelRef.current !== null) return // idempotent guard
  try { ... } catch { /* D-09: silent */ }
}, [])
```

**Key adaptation for `useBeforeInstallPrompt`:**
- `triggerInstall` must be `useCallback` with `[deferredPrompt]` dep (not `[]`) because it closes over `deferredPrompt` state
- Use `useState<BeforeInstallPromptEvent | null>(null)` for `deferredPrompt`
- Window event listeners `beforeinstallprompt` and `appinstalled` registered in `useEffect([], [])` (empty deps — mount/unmount only)
- Cast event to `BeforeInstallPromptEvent` inside the listener: `setDeferredPrompt(e as BeforeInstallPromptEvent)`
- `appinstalled` may need `window.addEventListener('appinstalled' as keyof WindowEventMap, handler)` for TS strict mode

---

### `src/hooks/useBeforeInstallPrompt.test.ts` (test)

**Analog:** `src/hooks/usePrefersReducedMotion.test.ts` (structure) + `src/hooks/useWakeLock.test.tsx` (imperative event pattern)

**Core test structure** (lines 1-8, 34-55):
```typescript
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

afterEach(() => {
  vi.restoreAllMocks()
})

// Pattern for imperative event simulation:
it('subscribes via addEventListener("change", ...) and cleans up on unmount', () => {
  const addSpy = vi.fn()
  const removeSpy = vi.fn()
  vi.spyOn(window, 'matchMedia').mockReturnValue({
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

**Key adaptation:** Use `vi.spyOn(window, 'addEventListener')` or capture the registered handler from `window.addEventListener` calls to simulate `beforeinstallprompt` and `appinstalled` firing. Use `act()` to flush state updates.

---

### `src/storage/installDismissed.ts` (utility, CRUD)

**Analog:** `src/storage/storage.ts` (silent-fallback posture) + `src/storage/stats.ts` (key naming convention)

**Key name pattern** (line 37 of `storage.ts`):
```typescript
export const STATE_KEY = 'hrv:state:v1'
```
New key follows the `hrv:` prefix convention: `'hrv:install-dismissed'`

**Silent-fallback try/catch pattern** (lines 87-135 of `storage.ts`):
```typescript
export function readEnvelope(deps: StorageDeps = {}): Envelope {
  const storage = deps.storage ?? window.localStorage
  try {
    const raw = storage.getItem(STATE_KEY)
    if (raw === null) return { ...EMPTY_ENVELOPE }
    // ...
  } catch {
    // D-17: read failures silent (corrupt JSON, throwing getItem in Safari ITP)
    return { ...EMPTY_ENVELOPE }
  }
}

export function writeEnvelope(env: Envelope, deps: StorageDeps = {}): void {
  const storage = deps.storage ?? window.localStorage
  try {
    // ...
    storage.setItem(STATE_KEY, payload)
  } catch {
    // D-16: write failures silent (quota, ITP, private mode).
  }
}
```

**Simplified adaptation** (no envelope, no deps injection needed — single boolean):
```typescript
// src/storage/installDismissed.ts
// Direct localStorage key — no envelope wrapping (see RESEARCH.md Pattern 4 rationale).
const INSTALL_DISMISSED_KEY = 'hrv:install-dismissed'

export function loadInstallDismissed(): boolean {
  try {
    return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true'
  } catch {
    return false   // D-17 silent fallback
  }
}

export function saveInstallDismissed(): void {
  try {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, 'true')
  } catch {
    // D-16: write failures silent
  }
}
```

---

### `src/storage/installDismissed.test.ts` (test)

**Analog:** `src/storage/prefs.test.ts`

**Setup/teardown pattern** (lines 29-36):
```typescript
beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})
```

**Silent-fallback test pattern** — test that `loadInstallDismissed()` returns `false` when `localStorage.getItem` throws:
```typescript
it('returns false when localStorage.getItem throws (D-17 silent fallback)', () => {
  vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
    throw new Error('ITP')
  })
  expect(loadInstallDismissed()).toBe(false)
})
```

---

### `src/components/InstallBanner.tsx` (component, request-response)

**Analog:** `src/components/MuteToggle.tsx`

**Imports pattern** (lines 1-10 of `MuteToggle.tsx`):
```typescript
// Pure presentational layer — receives props, emits callbacks. No hook calls.
import type { UiStrings } from '../content/strings'

export interface MuteToggleProps {
  muted: boolean
  audioAvailable: boolean
  strings: UiStrings['mute']
  onToggle(this: void): void
}
```

**Adaptation for `InstallBanner`:**
```typescript
import type { UiStrings } from '../content/strings'

export interface InstallBannerProps {
  isIOS: boolean
  onInstall(this: void): Promise<void>    // Android path
  onDismiss(this: void): void
  strings: UiStrings['install']
}
```

**Inline SVG pattern** (lines 62-83 of `MuteToggle.tsx`):
```typescript
function SpeakerIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5L6 9H2v6h4l5 4z" />
    </svg>
  )
}
```

**Button with 44px hit-area floor + focus-ring pattern** (line 52 of `MuteToggle.tsx`):
```typescript
<button
  type="button"
  aria-label={label}
  disabled={!audioAvailable}
  onClick={onToggle}
  className="grid size-11 min-h-11 min-w-11 place-items-center rounded-full border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] text-[var(--color-breathing-accent-strong)] shadow-sm transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
>
```

**Dismiss × button pattern** (from RESEARCH.md Code Examples — mirrors SettingsStepper pattern):
```tsx
<button
  type="button"
  aria-label={strings.dismiss}
  onClick={onDismiss}
  className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full text-[var(--color-breathing-muted)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
>
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
</button>
```

**Anchor for inline SVG icon (LearnAnchor.tsx lines 33-48)**:
```tsx
<svg
  aria-hidden="true"
  width="18"
  height="18"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.8"
  strokeLinecap="round"
  strokeLinejoin="round"
  className="sm:h-4 sm:w-4"
>
  <path d="..." />
</svg>
```

**iOS expand state:** `useState<boolean>(false)` for `iosStepsExpanded`. No hooks from the analog are needed in the component — `InstallBanner` is presentational; the expansion toggle is its only internal state.

---

### `src/components/InstallBanner.test.tsx` (test)

**Analog:** `src/components/MuteToggle.test.tsx`

**Imports + fixture pattern** (lines 1-9):
```typescript
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { InstallBanner, type InstallBannerProps } from './InstallBanner'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en
```

**Render helper pattern** (lines 11-24):
```typescript
function renderToggle(props: Partial<MuteToggleProps> = {}) {
  const onToggle = props.onToggle ?? vi.fn()
  const utils = render(
    <MuteToggle
      muted={props.muted ?? false}
      audioAvailable={props.audioAvailable ?? true}
      strings={props.strings ?? EN_STRINGS_FIXTURE.mute}
      onToggle={onToggle}
    />,
  )
  return { ...utils, onToggle }
}
```

**Adaptation for `InstallBanner`:**
```typescript
function renderBanner(props: Partial<InstallBannerProps> = {}) {
  const onInstall = props.onInstall ?? vi.fn().mockResolvedValue(undefined)
  const onDismiss = props.onDismiss ?? vi.fn()
  const utils = render(
    <InstallBanner
      isIOS={props.isIOS ?? false}
      onInstall={onInstall}
      onDismiss={onDismiss}
      strings={props.strings ?? EN_STRINGS_FIXTURE.install}
    />,
  )
  return { ...utils, onInstall, onDismiss }
}
```

**Click test pattern** (lines 56-59):
```typescript
it('clicking while audioAvailable=true invokes onToggle exactly once', async () => {
  const user = userEvent.setup()
  const { onToggle } = renderToggle({ muted: false, audioAvailable: true })
  await user.click(screen.getByRole('button', { name: 'Mute audio cues' }))
  expect(onToggle).toHaveBeenCalledTimes(1)
})
```

---

### `src/content/strings.ts` (config — modify existing)

**Analog:** `src/content/strings.ts` (self — extend)

**Nested interface extension pattern** (lines 12-133):
```typescript
export interface UiStrings {
  readonly app: { ... }
  readonly controls: { ... }
  // ... all existing blocks ...
  readonly learn: {
    readonly title: string
    readonly close: string
    readonly resourcesHeading: string
    readonly videosHeading: string
    readonly nativeAppsHeading: string
  }
  // ADD after learn:
  readonly install: {
    readonly bannerText: string
    readonly installButton: string
    readonly iosStepsButton: string
    readonly dismiss: string
    readonly iosStep1: string
    readonly iosStep2: string
    readonly iosStep3: string
  }
}
```

**Both locale slots pattern** — `UI_STRINGS` at line 135 uses `as const satisfies Readonly<Record<LocaleId, UiStrings>>`. Both `en` and `pt-BR` objects must be extended with `install` values. PT-BR values should be rough translations with a comment:
```typescript
// In the en locale object (after learn block):
install: {
  bannerText: 'Install for offline use',
  installButton: 'Install',
  iosStepsButton: 'How to install',
  dismiss: 'Dismiss install banner',
  iosStep1: '1. Tap the Share button below',
  iosStep2: "2. Scroll down and tap 'Add to Home Screen'",
  iosStep3: "3. Tap 'Add' to confirm",
},
// In the 'pt-BR' locale object (after learn block):
// DRAFT: Phase 29 will finalize PT-BR install copy
install: {
  bannerText: 'Instalar para uso offline',
  installButton: 'Instalar',
  iosStepsButton: 'Como instalar',
  dismiss: 'Dispensar banner de instalação',
  iosStep1: '1. Toque no botão Compartilhar abaixo',
  iosStep2: "2. Role para baixo e toque em 'Adicionar à Tela de Início'",
  iosStep3: "3. Toque em 'Adicionar' para confirmar",
},
```

---

### `src/app/App.tsx` (component — modify existing)

**Analog:** `src/app/App.tsx` (self — extend following existing composition patterns)

**New state at top of App** — following the existing useMemo/useState initialization pattern (lines 76-83):
```typescript
// Phase 4 LOCL-01 pattern: useMemo for synchronous single-read initializers
const initialSettings = useMemo<SessionSettings>(() => loadSettings(), [])
const initialMute = useMemo<boolean>(() => loadMute(), [])
// Phase 28 adaptation:
const [installDismissed, setInstallDismissed] = useState<boolean>(() => loadInstallDismissed())
```

**Hook composition pattern** (lines 168-175):
```typescript
// Existing hooks compose at the top of App:
const wakeLock = useWakeLock()
useTheme()
useFavicon()
const { locale, uiStrings } = useLocale()
// Phase 28 additions (same level):
const { isPhone, isStandalone } = useIsStandaloneOrPhone()
const { deferredPrompt, triggerInstall } = useBeforeInstallPrompt()
```

**useCallback dismiss handler** — following the `cancelEnd`/`cancelReset` pattern (lines 480-503):
```typescript
const handleInstallDismiss = useCallback(() => {
  saveInstallDismissed()
  setInstallDismissed(true)
}, [])
```

**Banner placement in JSX** — after `</section>` and before `</main>` (line 766-784 pattern), following the existing dialogs mount pattern:
```tsx
// After </section>, before </main>:
{showBanner && (
  <InstallBanner
    isIOS={isIOS}
    onInstall={triggerInstall}
    onDismiss={handleInstallDismiss}
    strings={uiStrings.install}
  />
)}
```

**showBanner computed boolean pattern** — following the `inSessionView` boolean (line 183):
```typescript
const inSessionView = appPhase !== 'idle'
// Phase 28 addition:
const isIOS = (navigator as SafariNavigator).standalone !== undefined
const showBanner =
  isPhone &&
  !isStandalone &&
  !installDismissed &&
  appPhase === 'idle' &&
  (isIOS || deferredPrompt !== null)
```

---

## Shared Patterns

### Silent-fallback localStorage pattern (D-16/D-17)
**Source:** `src/storage/storage.ts` lines 87-135 (readEnvelope) and lines 137-183 (writeEnvelope)
**Apply to:** `src/storage/installDismissed.ts`
```typescript
// Every localStorage read wrapped in try/catch; return safe default on error
try {
  return window.localStorage.getItem(KEY) === 'true'
} catch {
  return false   // D-17: silent fallback
}

// Every localStorage write wrapped in try/catch; swallow all errors
try {
  window.localStorage.setItem(KEY, 'true')
} catch {
  // D-16: write failures silent
}
```

### matchMedia defensive guard + mount reseed + change listener
**Source:** `src/hooks/usePrefersReducedMotion.ts` lines 1-39 (full file)
**Apply to:** `src/hooks/useIsStandaloneOrPhone.ts`
Three-part pattern:
1. `useState` initializer with `if (!window.matchMedia) return false` guard
2. `useEffect` re-seeds `setState(mql.matches)` on mount (closes stale-initial-state window)
3. `mql.addEventListener('change', onChange)` with cleanup

### Inline SVG icon convention
**Source:** `src/components/MuteToggle.tsx` lines 62-106, `src/components/LearnAnchor.tsx` lines 33-48
**Apply to:** `src/components/InstallBanner.tsx` (iOS Share glyph, dismiss × icon, app icon)
- Always `aria-hidden="true"` on `<svg>`
- `fill="none"`, `stroke="currentColor"`, explicit `strokeWidth` and `strokeLinecap`
- Fixed pixel `width`/`height` (16–20px for icons, 18px for anchor glyphs)
- 24×24 `viewBox`
- Named sub-functions (`function IOsShareIcon()`, `function DismissIcon()`)

### 44px hit-area floor on interactive elements
**Source:** `src/components/MuteToggle.tsx` line 52, `src/components/LearnAnchor.tsx` line 27
**Apply to:** `src/components/InstallBanner.tsx` (install button, dismiss button)
```typescript
// From MuteToggle.tsx — size-11 (44px) + min-h-11 + min-w-11:
className="grid size-11 min-h-11 min-w-11 place-items-center ..."
// From LearnAnchor.tsx — min-h-[44px] min-w-[44px]:
className="inline-flex min-h-[44px] min-w-[44px] items-center ..."
```

### focus-visible ring convention
**Source:** `src/components/MuteToggle.tsx` line 52, `src/components/LearnAnchor.tsx` line 27
**Apply to:** All interactive elements in `src/components/InstallBanner.tsx`
```typescript
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
```

### motion-reduce guard
**Source:** `src/components/MuteToggle.tsx` line 52 (`motion-reduce:transition-none`)
**Apply to:** Any `transition` class in `src/components/InstallBanner.tsx`

### UI strings routing through catalog (not inline)
**Source:** `src/content/strings.ts` header comment (line 3: "D-01 strings catalog separation: UI strings live here, not inline in components")
**Apply to:** `src/components/InstallBanner.tsx` — ALL user-visible text must come through `strings` prop (`UiStrings['install']`)

### React test render helper with partial props
**Source:** `src/components/MuteToggle.test.tsx` lines 11-24
**Apply to:** `src/components/InstallBanner.test.tsx`
Pattern: `function renderBanner(props: Partial<InstallBannerProps> = {})` with `vi.fn()` defaults for all callbacks.

### TypeScript non-standard API local interface pattern
**Source:** `src/hooks/useWakeLock.ts` (comment at top — local interface for non-standard APIs)
**Apply to:** `src/hooks/useBeforeInstallPrompt.ts` (`interface BeforeInstallPromptEvent extends Event`), `src/hooks/useIsStandaloneOrPhone.ts` (`interface SafariNavigator extends Navigator`)
Do NOT add to global namespace — declare locally within the hook file.

---

## No Analog Found

All 8 files (6 new, 2 modified) have analogs. No entries needed here.

---

## Metadata

**Analog search scope:** `src/hooks/`, `src/storage/`, `src/components/`, `src/content/`, `src/app/`
**Files scanned:** 12 source files read in full
**Pattern extraction date:** 2026-05-16
