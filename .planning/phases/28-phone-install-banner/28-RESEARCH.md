# Phase 28: Phone Install Banner - Research

**Researched:** 2026-05-16
**Domain:** PWA install prompt APIs, browser detection, React hook patterns, localStorage persistence
**Confidence:** HIGH (core web APIs verified via MDN/web.dev; project patterns verified via codebase grep)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Banner hides while a breathing session is running and returns when the app is idle — show/hide is gated on session/app state.
- **D-02:** Banner is anchored in normal document flow at the bottom of the page (scrolls with content) — NOT fixed to the viewport bottom.
- **D-03:** Banner contents: app icon + one-line text + action (install button on Android / steps-trigger on iOS) + dismiss control.
- **D-04:** Dismiss control is a small `×` icon at the banner's edge.
- **D-05:** iOS banner stays slim by default; tapping the action expands the "Share → Add to Home Screen" step list inline, in-place below the banner. No modal/overlay.
- **D-06:** iOS steps are numbered text with the iOS Share glyph shown inline.
- **D-07:** Banner appears immediately on page load. iOS shows at once (no event needed). Android shows as soon as `beforeinstallprompt` is captured.
- **D-08:** On Android, the banner is held back until `beforeinstallprompt` fires — guarantees the install button is always functional. If the event never fires, no banner appears.
- **D-09:** Phase 28 banner copy lives in `src/content/strings.ts` — add an `install` block to the `UiStrings` interface. Both EN and PT-BR catalog slots must be populated: EN values are final, PT-BR values are a draft for Phase 29 review.
- **D-10:** The banner is wired to `useLocale()` and reads its copy from `uiStrings` in Phase 28.

### Claude's Discretion

- Phone-vs-desktop detection method — implementation detail; researcher/planner choose. Constraint: desktop must show no banner (SC5).
- `localStorage` key/shape for dismissal persistence — may reuse the existing `hrv:`-prefixed prefs object + `hrv:prefs-changed` pattern or a standalone key; planner decides.
- Standalone (installed) detection mechanism — `display-mode: standalone` media query and/or `navigator.standalone` for iOS; mirror the `usePrefersReducedMotion.ts` `matchMedia` hook pattern.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. INSTALL-06/07 are Phase 29.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INSTALL-01 | User on a phone browser (app not yet installed) sees a slim, dismissible install banner that never blocks the breathing flow | Detection hooks (`useIsPhone`, `useIsStandalone`); `appPhase === 'idle'` gate in App.tsx |
| INSTALL-02 | User on Android Chrome can tap the banner's install button to trigger the browser's native install prompt | `beforeinstallprompt` capture hook; `prompt()` call on user gesture |
| INSTALL-03 | User on iOS Safari sees guided "Share → Add to Home Screen" steps in the banner | iOS detection via `navigator.standalone` property presence; inline expand pattern (D-05/D-06) |
| INSTALL-04 | User who dismisses the banner never sees it again — dismissal persists across visits | Standalone `localStorage` key `hrv:install-dismissed`; read at hook mount |
| INSTALL-05 | User already running the app installed (standalone display mode) sees no install banner | `display-mode: standalone` media query + `navigator.standalone` (iOS) combined check |

</phase_requirements>

---

## Summary

Phase 28 installs a slim, dismissible install banner that guides phone users to add the PWA to their home screen. The implementation splits into two browser paths: Android Chrome (and Chrome/Edge-derived browsers) fires the `beforeinstallprompt` event, which the app captures, defers, and replays on button click. iOS Safari never fires this event; instead, the banner shows iOS-specific "Share → Add to Home Screen" numbered steps that expand inline on tap.

The core challenge is composing several independent boolean conditions into a single "should the banner be visible" gate: (1) device is a phone, (2) app is not already installed in standalone mode, (3) user has not previously dismissed, (4) app is not in a running session, and (5) on Android, the `beforeinstallprompt` event has been captured. Each condition maps naturally to a dedicated hook following the existing `usePrefersReducedMotion.ts` `matchMedia` pattern and the `useWakeLock.ts` imperative pattern for non-React browser events.

Dismissal persistence fits cleanly as a standalone `localStorage` key (`hrv:install-dismissed`) rather than extending the existing `hrv:state:v1` prefs envelope. The envelope extension path would require bumping `Envelope` interface, updating `coercePrefs`, and syncing the `index.html` FOUC script — disproportionate work for a single boolean that carries no cross-tab sync requirement.

**Primary recommendation:** Two new hooks (`useBeforeInstallPrompt` capturing the Android event; `useIsStandaloneOrPhone` for detection), one new component (`InstallBanner`), one standalone storage helper (`installDismissed.ts`), and one strings block addition in `strings.ts`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Android install prompt capture | Browser/Client hook | — | `beforeinstallprompt` is a window-level DOM event; must be captured in a React hook with `useEffect` |
| iOS instructions display | Browser/Client component | — | Pure UI — numbered steps + Share glyph; no API needed |
| Standalone/installed detection | Browser/Client hook | — | `window.matchMedia('(display-mode: standalone)')` + `navigator.standalone`; evaluated in browser only |
| Phone detection | Browser/Client hook | — | `window.matchMedia('(pointer: coarse)')` + width fallback |
| Dismissal persistence | Browser/Client (localStorage) | — | Same-tab read at mount; no server needed; mirrors existing `hrv:state:v1` posture |
| Banner visibility gating | App.tsx (composition) | — | `App.tsx` owns `appPhase`; banner gate condition reads `appPhase !== 'idle'` |
| Localized copy | `strings.ts` catalog | `useLocale()` hook | Established pattern for all UI text |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.6 | Component + hooks | Project standard [VERIFIED: npm registry] |
| TypeScript | 6.0.3 | Types; local `BeforeInstallPromptEvent` interface needed | Project standard [VERIFIED: codebase] |
| Tailwind CSS v4 | `@tailwindcss/vite ^4.3.0` | Utility classes for banner layout | Project standard [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-plugin-pwa | 1.3.0 | Already installed; provides manifest `display: standalone` that enables `beforeinstallprompt` | Phase 27 work; no changes needed in Phase 28 [VERIFIED: vite.config.ts] |
| Vitest + @testing-library/react | ^4.1.5 / ^16.3.2 | Unit tests for hooks and component | Project standard; all hooks have `.test.ts` pairs [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Standalone `hrv:install-dismissed` key | Extend `Envelope.prefs` | Envelope extension requires updating `Envelope` interface, `coercePrefs`, `prefs.ts`, and the `index.html` FOUC script — disproportionate blast radius for a single boolean |
| `pointer: coarse` media query | `window.innerWidth < 768` | Viewport-width fails when browser window is resized; `pointer: coarse` is semantically correct and Baseline-Widely-Available since December 2018 [CITED: developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/pointer] |
| `matchMedia('(pointer: coarse)')` for phone | `navigator.userAgent` sniffing | UA strings are unreliable and deprecated in favor of `navigator.userAgentData`; media query is stable |

**No new npm packages required.** All needed APIs are browser-native.

---

## Architecture Patterns

### System Architecture Diagram

```
Page Load
    │
    ├─► useBeforeInstallPrompt()
    │       window.addEventListener('beforeinstallprompt', ...)
    │       event.preventDefault()         ← captures the deferred prompt
    │       setState(deferredPrompt)        ← triggers banner to appear on Android
    │
    ├─► useIsStandaloneOrPhone()
    │       matchMedia('(display-mode: standalone)').matches
    │       || (navigator as SafariNavigator).standalone
    │       && matchMedia('(pointer: coarse)').matches
    │       → { isPhone, isStandalone }    ← each updates on mql 'change'
    │
    ├─► loadInstallDismissed()             ← reads 'hrv:install-dismissed' from localStorage
    │
    └─► App.tsx (composition layer)
            │
            ▼
        All conditions:
        isPhone && !isStandalone && !dismissed
        && appPhase === 'idle'
        && (isIOS || deferredPrompt !== null)
            │
            ▼
        <InstallBanner>
            ├── Android path: install button → deferredPrompt.prompt()
            │                                  → appinstalled event → hide permanently
            └── iOS path: expand button → inline numbered steps (D-05/D-06)
            └── × dismiss → saveInstallDismissed() → remove banner
```

### Recommended Project Structure
```
src/
├── hooks/
│   ├── useBeforeInstallPrompt.ts     # Android: capture event, expose prompt fn
│   ├── useBeforeInstallPrompt.test.ts
│   ├── useIsStandaloneOrPhone.ts     # Detect phone + standalone mode
│   └── useIsStandaloneOrPhone.test.ts
├── storage/
│   ├── installDismissed.ts           # load/save 'hrv:install-dismissed' key
│   └── installDismissed.test.ts
├── components/
│   ├── InstallBanner.tsx             # Banner UI (Android + iOS paths)
│   └── InstallBanner.test.tsx
└── content/
    └── strings.ts                    # Add UiStrings.install block (D-09)
```

### Pattern 1: `beforeinstallprompt` Capture Hook

**What:** Captures the non-React `beforeinstallprompt` window event into React state without a race on first paint.

**When to use:** Android Chrome/Edge path only. Returns `null` on iOS (event never fires).

**Key details verified from MDN:**
- `event.preventDefault()` suppresses the browser's own mini-infobar
- `prompt()` can only be called once per captured event; after `outcome` resolves, null the ref
- `appinstalled` fires after the user accepts the native dialog — use this to hide the banner permanently even if the user installed via browser UI, not via the banner button
- Event fires only on Chromium-based browsers (Chrome, Edge, Samsung Internet) on Android and desktop; not on Firefox, Safari, or iOS Chrome/Edge [CITED: web.dev/learn/pwa/installation-prompt]

```typescript
// Source: MDN + web.dev/learn/pwa/installation-prompt (adapted for project style)
// TypeScript DOM lib (TS 6.0.3) does NOT include BeforeInstallPromptEvent —
// must declare a local interface.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface UseBeforeInstallPrompt {
  deferredPrompt: BeforeInstallPromptEvent | null
  triggerInstall(this: void): Promise<void>
}

export function useBeforeInstallPrompt(): UseBeforeInstallPrompt {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onBeforeInstall = (e: Event): void => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = (): void => {
      setDeferredPrompt(null)
      // Phase 28: also save dismissed state so banner never reappears
      saveInstallDismissed()
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const triggerInstall = useCallback(async (): Promise<void> => {
    if (deferredPrompt === null) return
    const { outcome } = await deferredPrompt.prompt()
    setDeferredPrompt(null)       // prompt() is one-shot
    if (outcome === 'accepted') {
      saveInstallDismissed()      // suppress banner on next visit
    }
  }, [deferredPrompt])

  return { deferredPrompt, triggerInstall }
}
```

### Pattern 2: Standalone + Phone Detection Hook (mirrors `usePrefersReducedMotion`)

**What:** Uses `window.matchMedia` for both `(display-mode: standalone)` and `(pointer: coarse)` detection. Mirrors the exact defensive-guard + mount-reseed + change-listener pattern from `usePrefersReducedMotion.ts`.

**iOS standalone detection:** `navigator.standalone` is an Apple-specific property (type `boolean | undefined`). It is `true` when the PWA runs from the home screen, `false`/`undefined` otherwise. TypeScript's `lib.dom.d.ts` at TS 6.0.3 does **not** include this property — a local interface augmentation or cast is required. [CITED: developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/]

**display-mode: standalone** media query fires in all Chromium browsers and works for detecting the "already installed" state on Android. On iOS Safari, `matchMedia('(display-mode: standalone)')` support was added in iOS 16.4 but is still unreliable in older iOS; `navigator.standalone` is the reliable fallback. Use both.

```typescript
// Source: pattern mirrors src/hooks/usePrefersReducedMotion.ts exactly
// navigator.standalone is Apple-specific; not in TS DOM lib.
interface SafariNavigator extends Navigator {
  standalone?: boolean
}

const STANDALONE_QUERY = '(display-mode: standalone)'
const PHONE_QUERY = '(pointer: coarse)'

export interface UseIsStandaloneOrPhone {
  isStandalone: boolean
  isPhone: boolean
}

export function useIsStandaloneOrPhone(): UseIsStandaloneOrPhone {
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) return false
    return (
      window.matchMedia(STANDALONE_QUERY).matches ||
      ((navigator as SafariNavigator).standalone === true)
    )
  })

  const [isPhone, setIsPhone] = useState<boolean>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) return false
    return window.matchMedia(PHONE_QUERY).matches
  })

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) return
    const mqlStandalone = window.matchMedia(STANDALONE_QUERY)
    const mqlPhone = window.matchMedia(PHONE_QUERY)
    // IN-02: re-seed on mount (mirrors usePrefersReducedMotion pattern)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(
      mqlStandalone.matches || ((navigator as SafariNavigator).standalone === true)
    )
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsPhone(mqlPhone.matches)

    const onStandaloneChange = (): void => {
      setIsStandalone(
        mqlStandalone.matches || ((navigator as SafariNavigator).standalone === true)
      )
    }
    const onPhoneChange = (event: MediaQueryListEvent): void => {
      setIsPhone(event.matches)
    }
    mqlStandalone.addEventListener('change', onStandaloneChange)
    mqlPhone.addEventListener('change', onPhoneChange)
    return () => {
      mqlStandalone.removeEventListener('change', onStandaloneChange)
      mqlPhone.removeEventListener('change', onPhoneChange)
    }
  }, [])

  return { isStandalone, isPhone }
}
```

### Pattern 3: iOS Detection Inside the Hook

**What:** The banner needs to know whether to show the Android (button) path or the iOS (steps) path.

iOS detection: check if `(navigator as SafariNavigator).standalone !== undefined`. On any iOS Safari, this property exists as a boolean. On all other platforms it is `undefined`. This is a sync, non-reactive check — does not require its own state/effect.

```typescript
// Source: MDN Navigator docs + Apple developer docs
// Evaluated once per render — no effect needed; navigator.standalone doesn't change
const isIOS = (navigator as SafariNavigator).standalone !== undefined
```

### Pattern 4: Dismissal Storage

**What:** Standalone `localStorage` key, read once at mount; no cross-tab sync needed (banner is a per-device, one-time-dismiss feature).

**Key chosen:** `hrv:install-dismissed` — follows existing `hrv:` prefix convention [VERIFIED: storage.ts `STATE_KEY = 'hrv:state:v1'`]; does NOT extend the `hrv:state:v1` envelope (see rationale in Alternatives Considered).

```typescript
// src/storage/installDismissed.ts
// Simple raw localStorage key — no envelope wrapping needed.
// The same prefs-envelope infrastructure is not used here because:
//   1. No FOUC script dependency (no theme/favicon read needed pre-paint)
//   2. No cross-tab sync needed (dismissal is per-device, not per-tab)
//   3. No per-field coercion complexity — single boolean

const INSTALL_DISMISSED_KEY = 'hrv:install-dismissed'

export function loadInstallDismissed(): boolean {
  try {
    return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true'
  } catch {
    return false   // silent fallback — same D-17 posture as storage.ts
  }
}

export function saveInstallDismissed(): void {
  try {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, 'true')
  } catch {
    // D-17: write failures silent
  }
}
```

### Pattern 5: App.tsx Integration

**What:** Mount `InstallBanner` after the main app content in the `<main>` return, gated on all conditions.

```typescript
// Inside App.tsx return, after </section> and before </main>
// New state at top of App:
const [installDismissed, setInstallDismissed] = useState<boolean>(() => loadInstallDismissed())
const { isPhone, isStandalone } = useIsStandaloneOrPhone()
const { deferredPrompt, triggerInstall } = useBeforeInstallPrompt()
const isIOS = (navigator as SafariNavigator).standalone !== undefined

const showBanner =
  isPhone &&
  !isStandalone &&
  !installDismissed &&
  appPhase === 'idle' &&
  (isIOS || deferredPrompt !== null)

const handleDismiss = useCallback(() => {
  saveInstallDismissed()
  setInstallDismissed(true)
}, [])

// In JSX (after </section>, before </main>):
{showBanner && (
  <InstallBanner
    isIOS={isIOS}
    onInstall={triggerInstall}        // Android path
    onDismiss={handleDismiss}
    strings={uiStrings.install}
  />
)}
```

### Pattern 6: `UiStrings.install` Block (strings.ts, D-09)

**What:** Add an `install` sub-object to `UiStrings` following the existing nested-interface pattern. Both EN and PT-BR slots required (PT-BR is draft; Phase 29 finalizes).

```typescript
// Add to UiStrings interface:
readonly install: {
  readonly bannerText: string           // "Install for offline use"
  readonly installButton: string        // "Install" (Android)
  readonly iosStepsButton: string       // "How to install" (iOS expand trigger)
  readonly dismiss: string              // aria-label for × button
  readonly iosStep1: string             // "1. Tap the Share button (↑) below"
  readonly iosStep2: string             // "2. Scroll down and tap 'Add to Home Screen'"
  readonly iosStep3: string             // "3. Tap 'Add' to confirm"
}
```

### Anti-Patterns to Avoid

- **Never call `prompt()` outside a user-gesture handler:** `BeforeInstallPromptEvent.prompt()` must be called synchronously from a click handler (or within the same microtask chain). Calling it in a `useEffect` or `setTimeout` will silently fail or be blocked. [CITED: web.dev/learn/pwa/installation-prompt]
- **Never call `prompt()` twice on the same captured event:** After `prompt()` resolves, the event is consumed. Null the ref and wait for the next `beforeinstallprompt` to fire (if ever). [CITED: MDN BeforeInstallPromptEvent]
- **Do not use `appinstalled` as the only "hide banner" signal:** On Android, if the user accepted the native install dialog (triggered by the browser, not by the banner's button), `appinstalled` fires but `deferredPrompt.prompt()` was never called. The `appinstalled` listener must call `saveInstallDismissed()` to handle this path (already included in Pattern 1 above).
- **Do not test for `(display-mode: standalone)` alone on iOS:** iOS Safari added `display-mode` media query support in iOS 16.4 — it is unreliable on older devices. Always combine with `navigator.standalone` check for iOS.
- **Do not put install dismissal in the `hrv:state:v1` envelope:** Extending `Envelope` requires updating `storage.ts`, `prefs.ts`, and the `index.html` FOUC script. For a simple one-shot boolean, a standalone key is the correct pattern.
- **Never use User-Agent string sniffing for iOS detection:** `navigator.standalone !== undefined` is the canonical iOS Safari detection — it is property presence detection, not string matching. [ASSUMED]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Android install prompt | Custom dialog | `BeforeInstallPromptEvent.prompt()` | Browser handles the native install dialog; custom dialogs bypass OS-level install flows |
| iOS Share glyph | Icon font or image asset | Inline SVG (same pattern as `LearnAnchor.tsx`, `MuteToggle.tsx`) | Project uses inline SVG; no extra bundle weight; iOS Share icon is a simple square with upward arrow (see Code Examples) |
| Standalone detection | Page title/URL parsing | `matchMedia('(display-mode: standalone)')` + `navigator.standalone` | Platform-standard; no heuristics |
| localStorage persistence | Cookie, IndexedDB | `localStorage` direct read/write | Existing project pattern; no server; no quota concern for a single boolean |

**Key insight:** The browser does the heavy lifting for the Android install flow. The app only needs to capture, defer, and replay the event at the right moment.

---

## Common Pitfalls

### Pitfall 1: `beforeinstallprompt` fires before React mounts
**What goes wrong:** The event fires at or near page load, potentially before the React app is hydrated and the `useEffect` listener is registered. The captured event is lost and the Android banner never appears.

**Why it happens:** `beforeinstallprompt` timing is defined as "usually fires on page load" but there is no guarantee of exact timing relative to React mount. [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event]

**How to avoid:** The `useEffect` listener registration happens synchronously on mount (React 19 + concurrent mode renders fast). In practice, `beforeinstallprompt` fires slightly after DOMContentLoaded, which is after React has had time to mount. However, the `useState` initializer cannot read the event (it hasn't been captured yet). The `useEffect` pattern is correct — no workaround needed. If the event is missed (edge case), no banner appears on Android (D-08 explicitly accepts this: "if the event never fires, no banner appears").

**Warning signs:** Banner never appears on Android Chrome even when not installed. Likely means the event was missed or the PWA does not meet installability criteria.

### Pitfall 2: `prompt()` called outside a user-gesture chain
**What goes wrong:** The install dialog silently does not open, or an error is thrown, because the call is not within a user-gesture event handler.

**Why it happens:** Chrome enforces that `prompt()` is called synchronously in response to a user interaction. Calling it from a `useEffect`, `setTimeout`, or `Promise.then()` breaks the gesture chain.

**How to avoid:** The `triggerInstall` function returned by `useBeforeInstallPrompt` must be called directly from an `onClick` handler — not wrapped in additional async scaffolding. In `InstallBanner.tsx`, wire `onClick={() => { void triggerInstall() }}` directly.

### Pitfall 3: TypeScript strict mode and `BeforeInstallPromptEvent`
**What goes wrong:** `window.addEventListener('beforeinstallprompt', ...)` type-errors because TypeScript's DOM lib does not include this event. Without a local interface, the event argument is typed as `Event` and `event.preventDefault()` + `event.prompt()` are inaccessible.

**How to avoid:** Declare a local `interface BeforeInstallPromptEvent extends Event` with `prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>`. Cast the raw `Event` to this interface inside the listener. Follow the `useWakeLock.ts` precedent of typing non-standard APIs locally. [VERIFIED: TS 6.0.3 lib.dom.d.ts does not contain BeforeInstallPromptEvent or appinstalled event]

### Pitfall 4: `navigator.standalone` TypeScript error with strict mode
**What goes wrong:** `navigator.standalone` does not exist on the TypeScript `Navigator` interface. Accessing it directly fails `noImplicitAny` under strict mode.

**How to avoid:** Declare `interface SafariNavigator extends Navigator { standalone?: boolean }` and cast `navigator as SafariNavigator`. Do not add it globally to `Navigator` — avoid polluting the interface for a browser-specific extension. [VERIFIED: TS 6.0.3 lib.dom.d.ts does not include standalone on Navigator]

### Pitfall 5: Dismissal not surviving page reload
**What goes wrong:** `useState` initialized from `loadInstallDismissed()` correctly reads the persisted value — but only if the localStorage write completed before the reload. If `saveInstallDismissed()` is called and the tab is refreshed within the same tick, the write is synchronous (`localStorage.setItem` is sync) and will have completed.

**Why this is not an issue:** `localStorage.setItem` is synchronous and blocks; the data is persisted before `setInstallDismissed(true)` updates React state. No async race exists here.

### Pitfall 6: jsdom test environment lacks `matchMedia` for the new queries
**What goes wrong:** Tests for `useIsStandaloneOrPhone` fail with "not a function" because jsdom's `matchMedia` polyfill (installed in `vitest.setup.ts`) returns `matches: false` for any query but does not distinguish between different query strings.

**How to avoid:** Mock `window.matchMedia` per-test using `vi.spyOn(window, 'matchMedia').mockImplementation((query) => ...)` to return different `matches` values for `'(display-mode: standalone)'` vs `'(pointer: coarse)'`. Follow the exact mock shape from `usePrefersReducedMotion.test.ts` (lines 19-28) which already shows the correct `MediaQueryList` stub. [VERIFIED: vitest.setup.ts already installs a global matchMedia polyfill]

### Pitfall 7: `appinstalled` event not in TypeScript DOM lib
**What goes wrong:** `window.addEventListener('appinstalled', ...)` may type-error or require a cast because the `appinstalled` event is not in TypeScript's standard `WindowEventMap`.

**How to avoid:** Cast to `(e: Event) => void` or use a type assertion: `window.addEventListener('appinstalled' as keyof WindowEventMap, handler)`. Alternatively, declare `appinstalled` in a local `interface WindowEventMap { appinstalled: Event }` augmentation. [VERIFIED: TS 6.0.3 lib.dom.d.ts does not contain 'appinstalled' in WindowEventMap]

---

## Code Examples

Verified patterns from official sources and project codebase:

### iOS Share Glyph (inline SVG)
```tsx
// Source: iOS Share icon — box with upward arrow (standard representation)
// Style: aria-hidden, currentColor, mirrors MuteToggle.tsx / LearnAnchor.tsx pattern
function IOsShareIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* upward arrow from box */}
      <path d="M8 6L12 2L16 6" />
      <path d="M12 2v13" />
      <path d="M20 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5" />
    </svg>
  )
}
```

### Dismiss button (× icon)
```tsx
// Mirrors the compact icon-button pattern from SettingsStepper.tsx
// aria-label from uiStrings.install.dismiss
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

### matchMedia hook mock in tests (reuse pattern from usePrefersReducedMotion.test.ts)
```typescript
// Source: src/hooks/usePrefersReducedMotion.test.ts lines 19-28
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

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `window.navigator.standalone` alone for iOS detection | `navigator.standalone` + `display-mode: standalone` combined | iOS 16.4 (2023) | `display-mode` now partially works on iOS 16.4+ but is unreliable on older iOS; use both for safety |
| `beforeinstallprompt.userChoice` promise | `beforeinstallprompt.prompt()` return value | Chrome 76+ | Both work; `prompt()` return is the modern, simpler path; `userChoice` still exists as a property but `prompt()` returning the outcome directly is the documented current pattern [CITED: MDN BeforeInstallPromptEvent] |
| A2HS mini-infobar (browser-controlled) | Deferred prompt + custom banner | Chrome 76+ | Apps can now fully control the install UX by calling `e.preventDefault()` and storing the event |

**Deprecated/outdated:**
- `BeforeInstallPromptEvent.userChoice` as the primary decision-capture path: current MDN and web.dev documentation shows `const { outcome } = await prompt()` as the primary pattern. `userChoice` still exists but the docs lead with the `prompt()` return value.
- `navigator.userAgent` for iOS detection: `navigator.standalone` property presence is the canonical iOS Safari check.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `navigator.standalone !== undefined` reliably identifies iOS Safari (including Chrome/Firefox on iOS, which also run on WebKit) | Pattern 3, Pitfall 6 | If iOS Chrome also sets `navigator.standalone`, banner would show for iOS Chrome users too — which is correct behavior (iOS Chrome users also benefit from Add to Home Screen instructions) |
| A2 | `(pointer: coarse)` reliably excludes desktop users (SC5) even when a desktop has a touchscreen | Standard Stack | A hybrid laptop-with-touchscreen could match `pointer: coarse` if touch is the primary device. This is acceptable — those users can also install the PWA. The constraint is "desktop must show NO banner" for a typical desktop scenario; truly ambiguous hybrid devices receiving the banner is an acceptable edge case. |
| A3 | Anti-pattern "Never use User-Agent string sniffing for iOS detection" — UA sniffing is unreliable | Anti-Patterns | Well-established but marked assumed since the recommendation is from training knowledge |

**If this table is empty:** It is not empty — three assumptions are noted.

---

## Open Questions

1. **`beforeinstallprompt` on desktop Chrome**
   - What we know: The event fires on desktop Chrome/Edge as well as Android Chrome [CITED: MDN]. Desktop Chrome can install PWAs.
   - What's unclear: With `isPhone = matchMedia('(pointer: coarse)').matches`, desktop Chrome will not satisfy `isPhone`, so the banner won't appear on desktop — which satisfies SC5. This is the correct behavior. No action needed, but the planner should confirm this logic is documented in the component.
   - Recommendation: Note in `InstallBanner.tsx` JSDoc that the phone gate is what prevents desktop banner display.

2. **App icon to display in the banner**
   - What we know: D-03 specifies "app icon + one-line text + action + dismiss". The project has `pwa-192x192.png` and `pwa-512x512.png` in the public directory [VERIFIED: vite.config.ts `includeAssets`].
   - What's unclear: The correct `<img>` `src` path given the Vite base `/hrv/` — in-app `src` references use relative paths (`/hrv/pwa-192x192.png` or `./pwa-192x192.png`?).
   - Recommendation: Use `import.meta.env.BASE_URL + 'pwa-192x192.png'` (Vite-standard) or reference the existing favicon SVG inline. Planner should pick a size (e.g., 32×32 display in the slim banner).

3. **PT-BR draft quality for install strings**
   - What we know: D-09 requires draft PT-BR values; Phase 29 finalizes them.
   - What's unclear: How rough is "draft"? The existing pattern for draft strings uses English text with a LOCKED comment in other places; here it should be a rough translation attempt.
   - Recommendation: Use rough Portuguese translations (not English placeholders) so Phase 29 has something to review. Document in `strings.ts` with a comment `// DRAFT: Phase 29 will finalize PT-BR install copy`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| vite-plugin-pwa | PWA manifest (enables `beforeinstallprompt`) | ✓ | 1.3.0 | — (already installed Phase 27) |
| localStorage | Dismissal persistence | ✓ | Browser-native | Silent fallback (D-17 pattern already in codebase) |
| `window.matchMedia` | Standalone + phone detection | ✓ | Browser-native | jsdom polyfill in vitest.setup.ts already handles this |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (embedded in `vite.config.ts` under `test:`) |
| Quick run command | `npm test -- --run src/hooks/useBeforeInstallPrompt.test.ts src/hooks/useIsStandaloneOrPhone.test.ts src/storage/installDismissed.test.ts src/components/InstallBanner.test.tsx` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INSTALL-01 | Banner renders when `isPhone && !isStandalone && !dismissed && appPhase === 'idle'` | unit | `npm test -- --run src/components/InstallBanner.test.tsx` | ❌ Wave 0 |
| INSTALL-01 | Banner hidden when `appPhase !== 'idle'` | unit | same | ❌ Wave 0 |
| INSTALL-02 | Install button calls `deferredPrompt.prompt()` | unit | `npm test -- --run src/hooks/useBeforeInstallPrompt.test.ts` | ❌ Wave 0 |
| INSTALL-02 | `appinstalled` event hides the banner | unit | same | ❌ Wave 0 |
| INSTALL-03 | iOS path renders expand button, not install button | unit | `npm test -- --run src/components/InstallBanner.test.tsx` | ❌ Wave 0 |
| INSTALL-03 | Expanding iOS steps shows numbered list with Share glyph | unit | same | ❌ Wave 0 |
| INSTALL-04 | Dismiss button calls `saveInstallDismissed()` and banner unmounts | unit | same | ❌ Wave 0 |
| INSTALL-04 | `loadInstallDismissed()` returns true after save | unit | `npm test -- --run src/storage/installDismissed.test.ts` | ❌ Wave 0 |
| INSTALL-04 | Banner does not render when `loadInstallDismissed()` returns true | unit | `npm test -- --run src/components/InstallBanner.test.tsx` | ❌ Wave 0 |
| INSTALL-05 | Banner absent when `isStandalone === true` | unit | `npm test -- --run src/hooks/useIsStandaloneOrPhone.test.ts` | ❌ Wave 0 |
| INSTALL-05 | `useIsStandaloneOrPhone` returns `isStandalone: true` when `display-mode: standalone` matches | unit | same | ❌ Wave 0 |
| INSTALL-05 | `useIsStandaloneOrPhone` returns `isStandalone: true` when `navigator.standalone === true` | unit | same | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Run the 4 new test files in quick mode
- **Per wave merge:** `npm run test:run` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/hooks/useBeforeInstallPrompt.ts` + `.test.ts` — covers INSTALL-02
- [ ] `src/hooks/useIsStandaloneOrPhone.ts` + `.test.ts` — covers INSTALL-01 detection, INSTALL-05
- [ ] `src/storage/installDismissed.ts` + `.test.ts` — covers INSTALL-04 persistence
- [ ] `src/components/InstallBanner.tsx` + `.test.tsx` — covers INSTALL-01, 02, 03, 04, 05 UI

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no | Banner has no user text input; install/dismiss are button actions only |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Clickjacking via install banner UI | Spoofing | Banner is in normal document flow (D-02), not a fixed overlay; no `pointer-events` manipulation |
| Fake `beforeinstallprompt` via postMessage injection | Spoofing | Event only fires from browser runtime; cannot be faked from web content; no mitigation needed |

**No significant security surface** — install prompt is a browser-native API with no secrets, no authentication, no user data beyond a localStorage boolean.

---

## Sources

### Primary (HIGH confidence)
- [MDN: BeforeInstallPromptEvent](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent) — interface shape, `prompt()` return value, browser support
- [MDN: Window beforeinstallprompt event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event) — timing, when event fires, browser compatibility
- [web.dev: Installation Prompt](https://web.dev/learn/pwa/installation-prompt) — canonical capture/defer/replay pattern, `appinstalled` event
- [web.dev: PWA Detection](https://web.dev/learn/pwa/detection) — `getPWADisplayMode()` function, `appinstalled` event handling
- [MDN: pointer media feature](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/pointer) — `pointer: coarse` syntax, browser support, limitations
- [MDN: Trigger install prompt](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt) — complete TypeScript pattern
- `src/hooks/usePrefersReducedMotion.ts` — canonical matchMedia hook pattern [VERIFIED: codebase]
- `src/storage/storage.ts` — STATE_KEY, Envelope shape, D-16/D-17 silent-fallback posture [VERIFIED: codebase]
- `vite.config.ts` — VitePWA config, manifest `display: standalone`, scope `/hrv/` [VERIFIED: codebase]
- `src/content/strings.ts` — UiStrings nested-interface catalog pattern [VERIFIED: codebase]
- `vitest.setup.ts` — matchMedia polyfill, existing test infrastructure [VERIFIED: codebase]
- TypeScript TS 6.0.3 `lib.dom.d.ts` — confirmed absence of `BeforeInstallPromptEvent`, `navigator.standalone`, `appinstalled` in `WindowEventMap` [VERIFIED: grep on installed TypeScript]

### Secondary (MEDIUM confidence)
- [Apple Developer: Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) — `navigator.standalone` iOS property (via search result attribution)

### Tertiary (LOW confidence)
- PWA iOS limitations guide (magicbell.com) — iOS Safari standalone detection summary [WebSearch]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all packages verified via npm registry and project package.json
- Architecture: HIGH — based on verified MDN/web.dev APIs and direct codebase analysis
- TypeScript type gaps: HIGH — verified by grepping TS 6.0.3 lib.dom.d.ts
- Pitfalls: HIGH — cross-referenced MDN, web.dev, and codebase patterns
- iOS standalone detection: MEDIUM — `navigator.standalone` behavior on non-Safari iOS browsers (Chrome/Firefox on iOS use WebKit; property likely present but not confirmed by official Apple docs for non-Safari)

**Research date:** 2026-05-16
**Valid until:** 2026-08-16 (90 days — `beforeinstallprompt` is stable but still experimental; re-verify if Chrome ships major changes)
