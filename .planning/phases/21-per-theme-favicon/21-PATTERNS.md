# Phase 21: Per-Theme Favicon - Pattern Map

**Mapped:** 2026-05-15
**Files analyzed:** 5 new/modified files
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/hooks/useFavicon.ts` (new) | hook | event-driven | `src/hooks/useVisualVariant.ts` | exact (role + flow) |
| `index.html` (modified) | config / pre-paint script | event-driven (read-once) | `index.html:7-8` self (existing inline script) | exact (extend in place) |
| Shared favicon color map module (new, e.g. `src/styles/faviconPalette.ts` or `src/domain/faviconPalette.ts`) | utility / constant | transform | `src/domain/settings.ts` (THEME_OPTIONS const + types) | role-match |
| `src/hooks/useFavicon.test.ts` (new) | test | event-driven | `src/hooks/useTheme.test.ts` | exact (role + flow) |
| `src/styles/favicon.sync.test.ts` (new sync guard) | test | file-I/O | `src/styles/theme.contrast.test.ts` | exact (reads + parses theme.css) |

**Note:** `public/favicon.svg` is referenced only as the SVG-template basis (D-03). Per D-03 no new static files land in `public/`; the existing `public/favicon.svg` stays as the default-favicon fallback for the `<link>` href attribute at `index.html:5`. The SVG markup is recolored at runtime, not as a file.

## Pattern Assignments

### `src/hooks/useFavicon.ts` (hook, event-driven)

**Analog:** `src/hooks/useVisualVariant.ts` (best match — App-side orchestrator hook with NO React-managed UI state return needed, just side-effect-on-event). For the `'system'` matchMedia resolution, borrow from `src/hooks/useTheme.ts` Effect 2.

**Why useVisualVariant over useTheme:** useVisualVariant is the lean version of the orchestrator pattern — it keeps Effects 3+4 (cross-tab `storage` + same-tab `hrv:prefs-changed`) and drops Effects 1+2. useFavicon needs the same two listeners PLUS a system-resolution path, so it sits between the two. Copy useVisualVariant's skeleton, then graft useTheme's Effect 2 matchMedia logic for the `'system'` case (D-05).

**Header doc-comment pattern** — every hook in `src/hooks/` opens with a `// src/hooks/<name>.ts` banner stating phase, role, and architecture. Mirror this. Example from `useVisualVariant.ts:1-9`:
```typescript
// src/hooks/useVisualVariant.ts
//
// Phase 17 Plan 04: App-side orchestrator hook for the variant dimension.
// Mirror of useTheme minus Effects 1+2 (D-16: variant is render-local, not OS-driven).
```

**Imports pattern** (`useVisualVariant.ts:10-14`):
```typescript
import { useEffect, useState } from 'react'

import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'
import type { VisualVariantId } from '../domain/settings'
```
For useFavicon, additionally import the shared favicon color map and `ThemeId` from `../domain/settings`.

**Core re-resolve pattern — derive favicon from theme, then write the `<link>` href.** useVisualVariant only calls `setVariant(loadPrefs().variant)`. useFavicon's handler instead re-reads `loadPrefs().theme`, resolves it, and writes the favicon. The favicon-apply helper is the new logic; the listener wiring is copied verbatim.

**Cross-tab `storage` listener** (copy verbatim from `useVisualVariant.ts:19-30`, swap the handler body):
```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STATE_KEY) {
      applyFavicon(loadPrefs().theme)   // <-- new handler body
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
  }
}, [])
```

**Same-tab `hrv:prefs-changed` listener** (copy verbatim from `useVisualVariant.ts:34-46`, filter on `'theme'`):
```typescript
useEffect(() => {
  const onPrefsChanged = (e: Event): void => {
    if (!(e instanceof CustomEvent)) return
    const detail = e.detail as { key?: string } | null
    if (!detail || detail.key === 'theme' || detail.key === undefined) {
      applyFavicon(loadPrefs().theme)
    }
  }
  window.addEventListener('hrv:prefs-changed', onPrefsChanged)
  return () => {
    window.removeEventListener('hrv:prefs-changed', onPrefsChanged)
  }
}, [])
```
**Important:** filter on `detail.key === 'theme'` — the favicon dimension rides the *theme* event (CONTEXT D-04), NOT a new `'favicon'` key. `useThemeChoice.ts:42` dispatches `{ key: 'theme', value: next }`; useFavicon listens to that same dispatch — no new event introduced (FAVI-02).

**`'system'` resolution pattern** (graft from `useTheme.ts:38-55`, Effect 2). When `loadPrefs().theme === 'system'`, the favicon must follow the resolved `light`/`dark` (D-05). Reuse the gated-matchMedia shape:
```typescript
const MQL_QUERY = '(prefers-color-scheme: dark)'   // module-level, copied from useTheme.ts:24

// inside applyFavicon or a gated effect:
if (theme === 'system') {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!window.matchMedia) { /* fall back to 'light' */ }
  const mql = window.matchMedia(MQL_QUERY)
  const resolved = mql.matches ? 'dark' : 'light'
  // ...and attach mql 'change' listener so the favicon updates live, mirroring useTheme.ts:48-55
}
```
**Decision for the planner:** useTheme.ts:38-55 attaches/tears down the matchMedia `change` listener ONLY in `'system'` mode (S-04 gate, dep `[theme]`). useFavicon should mirror this — but since useFavicon may not hold `theme` in React state (it has no UI to render), the planner must decide whether useFavicon keeps a `useState<ThemeId>` purely to drive the S-04 gate dependency (recommended — matches useTheme exactly and keeps the matchMedia listener correctly gated) or attaches matchMedia unconditionally and no-ops when theme is named. The useTheme S-04 gate is the proven pattern; prefer it.

**Return value:** useFavicon is a pure side-effect hook (writes the `<link rel="icon">` href, like useTheme writes `data-theme`). It can return `void` — App.tsx calls `useTheme()` bare at `App.tsx:144` with no destructure. Mirror that call shape.

**`<link>` element acquisition:** the favicon-apply helper must `document.querySelector('link[rel="icon"]')` (the element at `index.html:5`) and set its `.href`. Guard for `null` (jsdom test host may not have it) — same defensive posture as `useTheme.ts:43` guards `window.matchMedia`.

---

### `index.html` (config, pre-paint inline script — extend in place per D-06)

**Analog:** the existing Phase 16 THEME-04 inline script at `index.html:7-8` — extend this exact `<script>`, do not add a second one.

**Current state** (`index.html:5,7-8`):
```html
<link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />
...
<!-- Phase 16 THEME-04: pre-paint theme attribute. SYNC WITH src/storage/storage.ts STATE_KEY. -->
<script>(function(){try{var raw=localStorage.getItem('hrv:state:v1');var t=raw&&(JSON.parse(raw).prefs||{}).theme;if(t==='system'||!t||['light','dark','moss','slate','dusk'].indexOf(t)<0){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(_){document.documentElement.setAttribute('data-theme','light');}})();</script>
```

**Extension pattern (D-06/D-07):** the script already resolves `t` to a concrete `light|dark|moss|slate|dusk` (the `system`/invalid branch already collapses to `light|dark`). After the existing `setAttribute('data-theme',t)` line, add:
1. A hardcoded 5-entry hex map keyed by the same 5 theme ids (D-07 — the script runs before `theme.css` loads, so tokens are unreadable).
2. Build a `data:image/svg+xml,...` URI from the SVG circle template with the per-theme fill substituted.
3. `document.querySelector('link[rel="icon"]').setAttribute('href', dataUri)` — or `getElementById` if an `id` is added to the `<link>`.

**SYNC comment pattern** — `index.html:7` carries `<!-- ... SYNC WITH src/storage/storage.ts STATE_KEY. -->`. The reciprocal note lives at `storage.ts:35-36`:
```
// SYNC WITH index.html FOUC SCRIPT — when bumping the :v1 suffix, update the
// hardcoded 'hrv:state:v1' string in index.html's <head> theme-resolve script.
```
**Apply this convention to the new color map:** add a `<!-- SYNC WITH <color-map-module> / src/styles/theme.css --color-breathing-accent-strong -->` comment next to the inline hex map, and a reciprocal `// SYNC WITH index.html FAVICON SCRIPT` comment in the shared color-map module and/or `theme.css`. This mirrors the bidirectional STATE_KEY sync note exactly.

**Catch-block fallback pattern:** the existing script's `catch(_)` falls back to `data-theme='light'`. Extend the catch to also set a `light`-palette favicon (or leave the static `%BASE_URL%favicon.svg` default) — keep the try/catch single-block, do not add a second try.

**`%BASE_URL%` constraint:** `vite.config` sets `base: '/hrv/'` (CONTEXT canonical refs). The static `<link href="%BASE_URL%favicon.svg">` uses the `%BASE_URL%` token. A runtime `data:` URI is self-contained and needs no base prefix — but if the planner instead chooses to point at static files, paths must be `%BASE_URL%`-aware. D-03 chose the data-URI route, so this is informational only.

---

### Shared favicon color map module (utility / constant)

**Analog:** `src/domain/settings.ts` — the project's home for theme-id types and the `THEME_OPTIONS` frozen const array.

**Pattern from `settings.ts:53-61`:**
```typescript
export type ThemeId = 'light' | 'dark' | 'system' | 'moss' | 'slate' | 'dusk'
export const THEME_OPTIONS = ['light', 'dark', 'system', 'moss', 'slate', 'dusk'] as const satisfies readonly ThemeId[]
export function isValidTheme(v: unknown): v is ThemeId { /* ... */ }
export const DEFAULT_THEME: ThemeId = 'system'
```

**Recommended shape for the color map** — a `Record` keyed by the 5 *concrete* theme ids (exclude `'system'`, which resolves to `light|dark`):
```typescript
// SYNC WITH src/styles/theme.css --color-breathing-accent-strong  AND  index.html FAVICON SCRIPT
export const FAVICON_COLORS: Record<Exclude<ThemeId, 'system'>, string> = {
  light: '#5e81ac',
  dark:  '#81a1c1',
  moss:  '#35a77c',
  slate: '#3760bf',
  dusk:  '#f6c177',
}
```
The `Exclude<ThemeId, 'system'>` keying mirrors `theme.contrast.test.ts:132` `THEME_05_FLOORS: Record<Exclude<ThemeId, 'system'>, number>` — established project pattern for "the 5 concrete palettes."

**Placement (Claude's discretion per CONTEXT):** the inline `index.html` script *cannot* `import` an ES module (it runs before `main.tsx`), so the inline script must hardcode the map by hand regardless — only `useFavicon` and the sync test can import a shared module. Options:
- `src/styles/faviconPalette.ts` — co-located with `theme.css`, the color source of truth.
- `src/domain/settings.ts` — extend the existing theme-domain file.
A dedicated `src/styles/faviconPalette.ts` (also exporting the SVG template string) is the cleanest single source for `useFavicon` + the sync test. The inline script's hand-copy is the irreducible duplication D-07 explicitly accepts and guards with the sync test.

---

### `src/hooks/useFavicon.test.ts` (test, event-driven)

**Analog:** `src/hooks/useTheme.test.ts` — exact match (renderHook on an event-driven orchestrator hook with localStorage + matchMedia + custom-event coverage).

**`seedPrefs` helper pattern** (`useTheme.test.ts:10-18`):
```typescript
function seedPrefs(theme: string): void {
  window.localStorage.setItem(
    STATE_KEY,
    JSON.stringify({
      version: 1,
      prefs: { theme, timbre: 'bowl', variant: 'orb', locale: 'en' },
    }),
  )
}
```

**`matchMedia` mock pattern** (`useTheme.test.ts:23-40`) — the 8-field `makeMqlMock(matches, opts)` stub with `addEventListener`/`removeEventListener` capture hooks. Copy verbatim for the `'system'`-resolution tests.

**beforeEach/afterEach reset** (`useTheme.test.ts:42-51`) — `window.localStorage.clear()` + `vi.restoreAllMocks()`. For useFavicon, also reset the `<link rel="icon">` href between tests, and ensure the jsdom document has a `<link rel="icon">` element to query (jsdom does not load `index.html`; the test must inject one in `beforeEach`).

**Test cases to mirror** from `useTheme.test.ts`:
- seeds favicon from `loadPrefs().theme` at mount (named theme) — analog of lines 54-59.
- `'system'` + matchMedia true/false → resolves to dark/light favicon — analog of lines 61-75.
- live update on matchMedia `change` event in system mode — analog of lines 77-94.
- cross-tab `storage` event with `STATE_KEY` swaps favicon — analog of lines 118-144.
- ignores `storage` event with unrelated key — analog of lines 146-164.
- same-tab `hrv:prefs-changed` with `key:'theme'` swaps favicon — analog of lines 166-184.
- ignores `hrv:prefs-changed` with `key:'variant'` — analog of lines 186-200.

Assertion target: instead of `document.documentElement.dataset.theme`, assert on `document.querySelector('link[rel="icon"]')?.getAttribute('href')` (expect it to contain the per-theme hex, e.g. `expect(href).toContain('5e81ac')` or the URL-encoded form).

---

### `src/styles/favicon.sync.test.ts` (test, file-I/O — D-07 sync guard)

**Analog:** `src/styles/theme.contrast.test.ts` — exact match: it reads `theme.css` from disk, parses `--color-breathing-accent-strong` per theme, and asserts against it. This is the established "test reads CSS source of truth" pattern.

**Node fs import + triple-slash reference** (`theme.contrast.test.ts:7-14`):
```typescript
/// <reference types="node" />
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
```
The `/// <reference types="node" />` is required because `tsconfig.app.json` excludes `@types/node` — copy this line verbatim into the new test.

**Reading `theme.css` tokens** — `theme.contrast.test.ts:99-121` injects the stylesheet into jsdom and reads tokens via `getComputedStyle`. For a pure string-compare sync test you have two viable approaches:
1. **CSS-injection + getComputedStyle** (heavier, but exactly the contrast-test pattern): inject `theme.css` (with the `@theme {` → `:root {` rewrite at line 103 — jsdom 29 drops Tailwind v4 `@theme` rules), set `data-theme` per palette (lines 144-148: `'light'` = no attribute, others = `data-theme='X'`), then `readToken('--color-breathing-accent-strong')`.
2. **Plain regex parse** (lighter, sufficient for a sync guard): `readFileSync` the css, regex-extract each `[data-theme='X']` block's `--color-breathing-accent-strong: #xxxxxx;`. Light's value lives in the base `@theme` block (`theme.css:58`), the other 4 in `[data-theme='moss'|'slate'|'dusk'|'dark']:root` blocks (`theme.css:138,199,247,308`).

Approach 2 is recommended for a sync guard — simpler, no jsdom cascade quirks, and the assertion is the literal hex string match D-07 wants.

**`describe.each` over concrete themes** (`theme.contrast.test.ts:124-140`):
```typescript
const CONCRETE_THEMES = THEME_OPTIONS.filter(
  (t): t is Exclude<ThemeId, 'system'> => t !== 'system',
)
describe.each(CONCRETE_THEMES)('theme=%s', (themeId) => {
  it('inline favicon color matches theme.css --color-breathing-accent-strong', () => {
    // assert FAVICON_COLORS[themeId] === <hex parsed from theme.css for themeId>
  })
})
```

**Assertion target:** the shared `FAVICON_COLORS` map (the single source `useFavicon` consumes) AND the hardcoded hex map literal inside `index.html`. The test should parse `index.html` too (regex-extract the inline map) so it catches drift in BOTH the shared module and the hand-copied inline script — D-07 explicitly wants the inline map guarded. Read `index.html` with `readFileSync(resolve(__dirname, '../../index.html'), 'utf-8')`.

**Current `--color-breathing-accent-strong` token values in `theme.css`** (for cross-check; D-02):
```
theme.css:58   --color-breathing-accent-strong: #5e81ac;   (base / light)
theme.css:138  --color-breathing-accent-strong: #81a1c1;   ([data-theme='dark'])
theme.css:199  --color-breathing-accent-strong: #35a77c;   ([data-theme='moss'])
theme.css:247  --color-breathing-accent-strong: #3760bf;   ([data-theme='slate'])
theme.css:308  --color-breathing-accent-strong: #f6c177;   ([data-theme='dusk'])
```

## Shared Patterns

### Dual-event cross-tab / same-tab sync
**Source:** `src/hooks/useTheme.ts:57-89`, `src/hooks/useVisualVariant.ts:19-46`
**Apply to:** `useFavicon.ts`
Every prefs-driven orchestrator hook attaches TWO listeners with empty-deps `useEffect`s:
- `storage` event filtered on `e.key === STATE_KEY` (cross-tab; does NOT fire in the writing tab — Pitfall 4).
- `hrv:prefs-changed` CustomEvent filtered on `detail.key === '<dimension>' || detail.key === undefined` (same-tab; the sole same-tab sync primitive). The `undefined`/falsy-detail branch is a forward-compat "re-read all" path — keep it.
Both handlers re-read `loadPrefs()` synchronously (Pitfall 6: handler reads disk on the event, so the writer must `setItem` BEFORE dispatching).

### `'system'` theme resolution via gated matchMedia
**Source:** `src/hooks/useTheme.ts:24, 38-55`
**Apply to:** `useFavicon.ts` (D-05)
`MQL_QUERY = '(prefers-color-scheme: dark)'` module constant. matchMedia listener attached ONLY when `theme === 'system'` (S-04 gate, effect dep `[theme]`), re-seeded on mount (IN-02), torn down on switch to a named theme. `window.matchMedia` is defensively null-guarded for jsdom test hosts (`useTheme.ts:43`).

### SYNC comment convention for hand-maintained cross-file constants
**Source:** `index.html:7` ↔ `src/storage/storage.ts:35-36` (bidirectional STATE_KEY note)
**Apply to:** the favicon color map — `index.html` inline map ↔ shared color-map module ↔ `theme.css` tokens. Add reciprocal `SYNC WITH ...` comments at every site, AND back them with the automated `favicon.sync.test.ts` (D-07: "no hardcoded values without a sync guard" — `code_context` established pattern).

### Hook header doc-comment
**Source:** every file in `src/hooks/` (`useTheme.ts:1-16`, `useVisualVariant.ts:1-9`, `useThemeChoice.ts:1-21`)
**Apply to:** `useFavicon.ts`
Open with `// src/hooks/useFavicon.ts`, then phase number, role ("App-side orchestrator hook"), and a short architecture note. Reference the analog (`useVisualVariant` / `useTheme`) and the relevant decisions (D-04, D-05).

### Test-reads-source-of-truth
**Source:** `theme.contrast.test.ts` (reads `theme.css`), `theme.no-hardcoded-classes.test.ts` (scans `.tsx` files)
**Apply to:** `favicon.sync.test.ts`
`/// <reference types="node" />` + `readFileSync(resolve(__dirname, ...))`. Iterate the 5 concrete palettes via `THEME_OPTIONS.filter(t => t !== 'system')` typed as `Exclude<ThemeId, 'system'>` (`theme.contrast.test.ts:124-126, 132`).

### App.tsx hook mounting
**Source:** `src/app/App.tsx:144` — `useTheme() // ...orchestrates <html data-theme> writes...`
**Apply to:** mount `useFavicon()` bare (no destructure) on the line after `useTheme()` in `App.tsx`. useFavicon is a side-effect hook like useTheme — no return value to consume.

## No Analog Found

None. Every file in scope has a strong existing analog in the codebase.

## Metadata

**Analog search scope:** `src/hooks/`, `src/styles/`, `src/domain/`, `src/storage/`, `src/app/`, `index.html`, `public/`
**Files scanned:** index.html, useTheme.ts, useThemeChoice.ts, useVisualVariant.ts, useTheme.test.ts, theme.contrast.test.ts, theme.no-hardcoded-classes.test.ts, storage.ts, prefs.ts, settings.ts, public/favicon.svg, theme.css (grep)
**Pattern extraction date:** 2026-05-15
