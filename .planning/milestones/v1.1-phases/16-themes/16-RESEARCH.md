---
phase: 16-themes
researched: 2026-05-12
milestone: v1.1
requirements:
  - THEME-01
  - THEME-02
  - THEME-03
  - THEME-04
  - THEME-05
---

# Phase 16: Themes — Research

**Researched:** 2026-05-12
**Domain:** Theme switching system (CSS custom-property cascade + FOUC-prevention inline script + React orchestrator hook)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** **Flat override** of existing `--color-*` token names — each `[data-theme='X']:root { … }` block re-declares the same names already used by components. No semantic indirection layer (no `--bg-token` aliasing).
- **D-02:** **Every `--color-*` token is themable** (page chrome + orb gradient + rings + modal backdrop). Each named palette ships a full re-skin: `--color-breathing-bg/-soft/-edge/-surface/-accent/-accent-strong/-muted`, `--color-orb-in-from/-to`, `--color-orb-out-from/-to`, `--color-orb-in-text`, `--color-orb-out-text`, `--color-ring-outer`, `--color-ring-inner`, `--color-modal-backdrop`.
- **D-03:** **Light is a fresh preset; the current v1.0.1 teal-pastel `@theme` baseline becomes Moss.** `[data-theme='moss']:root { … }` declares the exact current `@theme` values; `:root @theme` is replaced with a new cool/neutral Light palette.
- **D-04:** **All override blocks live in `src/styles/theme.css`** (single file). `@theme` holds Light; `[data-theme='dark'|'moss'|'slate'|'dusk']:root { … }` blocks follow in source order Dark → Moss → Slate → Dusk. **Per-theme concrete hex values are LOCKED IN PLAN.md.**
- **S-01:** **JS resolves `'system'` to `'light'` or `'dark'` `data-theme` at runtime.** No `[data-theme='system']` CSS branch.
- **S-02:** **FOUC inline script hardcodes the storage key string `'hrv:state:v1'`** with a `// SYNC WITH index.html FOUC SCRIPT` comment next to `STATE_KEY` export.
- **S-03:** **Inline script resolves `'system'` via `matchMedia` and falls back to `'light'` on ANY error path.** Concrete script shape locked in CONTEXT.md.
- **S-04:** **`matchMedia` change listener lives inside `useTheme`, gated on `state === 'system'`.** Mirrors `usePrefersReducedMotion.ts:21-35` verbatim.
- **A-01:** **`useTheme()` (orchestrator hook) owns prefs.theme React state + side effect + matchMedia listener + cross-tab/same-tab sync listeners + savePrefs write path.** Returns `{ theme, setTheme }`.
- **A-02:** **`useTheme` is called once from `App.tsx`** (always-mounted). ThemePicker calls slimmer companion hook `useThemeChoice()` that exposes `setTheme(next)` which calls `savePrefs(...)` then dispatches `'hrv:prefs-changed'`.
- **A-03:** **Same-tab sync uses a custom `'hrv:prefs-changed'` event.** Detail shape `{ key: 'theme', value: ThemeId }` vs `{ theme: ThemeId }` — planner picks (recommendation below).
- **A-04:** **Cross-tab sync uses a separate `window.addEventListener('storage', …)` inside `useTheme`**, filtered on `e.key === STATE_KEY`. Existing Phase 8 STORAGE-03 listener in `App.tsx:116-126` is NOT touched.
- **D-13:** **Automated computed-style contrast test in Vitest** is the primary THEME-05 guard. No manual UAT screenshot pass required.
- **D-14:** **Metric: WCAG relative-luminance contrast ratio on midpoint colors, floor ≥ 1.5.** Inline `relativeLuminance(r,g,b)` helper — no new dep.
- **D-15:** **Test file: `src/styles/theme.contrast.test.ts`** co-located with `theme.css`. Iterates with `it.each(['light','dark','moss','slate','dusk'])`. **Planner research action: verify jsdom cascade resolution** — see §"jsdom Cascade Probe" below for the EMPIRICAL answer.
- **D-16:** **Iteration set = 5 concrete themes; `'system'` skipped.**
- **D-17:** **Per-commit green-gate.** `npx tsc --noEmit && npm run lint && npm run build && npm test` exits 0 at every commit. Phase 15 baseline at HEAD = 438 tests.
- **D-18:** **Zero new npm dependencies.**
- **D-19:** **Phase 15 D-01 picker contract preserved.** `SettingsDialog.tsx` is NOT edited.
- **D-20:** **Phase 15 D-02 picker prop interface preserved.** `ThemePicker` still accepts ONLY `{ disabled: boolean }`.
- **D-21:** **Phase 15 D-16 file-split invariant preserved.** Phase 16 does NOT edit `src/domain/settings.ts` or `src/storage/prefs.ts`. Only adds new files + edits `theme.css`, `index.html`, `ThemePicker.tsx`, `ThemePicker.test.tsx`, `App.tsx` (single hook call line) + `STATE_KEY` comment in `storage.ts`.
- **D-22:** **Locked-copy contract preserved.** Option labels `Light` / `Dark` / `System` / `Moss` / `Slate` / `Dusk` verbatim; section label `Theme`; no description copy.

### Claude's Discretion

CONTEXT.md states: "None — every gray area presented in `present_gray_areas` resolved to a concrete option." The remaining open items intentionally deferred to the planner:

1. **Per-theme hex values** (per D-04) — 17 tokens × 5 palettes = ~85 hexes. Light = fresh cool/neutral; Dark = high-contrast dark mode; Moss = byte-identical copy of current `@theme` (locked here, just re-declared under `[data-theme='moss']:root`); Slate + Dusk = planner picks.
2. **Picker UI shape** — radio-like button group vs native `<select>` vs segmented control vs option cards (per Phase 15 D-02 picker contract). Pros/cons documented in §"Picker UI Shape Recommendation".
3. **`'hrv:prefs-changed'` event detail object shape** — `{ key: 'theme', value: ThemeId }` (forward-compat with Phase 17/18/19) vs `{ theme: ThemeId }` (Phase 16-only). Recommendation below.
4. **`useThemeChoice` co-location** — separate file `src/hooks/useThemeChoice.ts` vs inline inside `ThemePicker.tsx`. Recommendation below.

### Deferred Ideas (OUT OF SCOPE)

- **Schema-drift guard test** — that every `ThemeId` minus `'system'` has a corresponding `[data-theme='X']:root` block. Deferred until a second `ThemeId` is ever added without an override block.
- **Per-theme manual UAT screenshot pass** — informal review recommended but not gated.
- **Display-mapping for theme names** (`Claro` / `Escuro` etc.) — Phase 19 owns locale translation.
- **CIELAB delta-E contrast metric** — WCAG luminance ratio ≥ 1.5 is the v1.1 contract.
- **Theme-aware `--shadow-breathing-card`** — currently a fixed teal-tinted shadow. D-02 currently scopes only `--color-*` tokens.
- **Pre-load theme into `<meta name="theme-color">`** — would tint mobile browser chrome to match active theme.
- **`prefers-contrast: more` palette variant** — user-agent preference for higher contrast.
- **Theme transition animation** — fade between palettes on switch. Phase 16 ships instant switching.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| THEME-01 | User can choose Light / Dark / System from SettingsDialog. | Existing `ThemeId` union locked in `src/domain/settings.ts:53` (Phase 14 D-01) covers `'light'|'dark'|'system'`. Phase 14 D-10 `loadPrefs`/`savePrefs` API consumed verbatim; `coerceTheme` clamps unknown values to `DEFAULT_THEME='system'`. Implementation: `useThemeChoice.setTheme(id)` → `savePrefs(...)` → `dispatchEvent('hrv:prefs-changed')`. |
| THEME-02 | `System` follows `prefers-color-scheme` automatically. | `matchMedia('(prefers-color-scheme: dark)')` listener attached only when `state === 'system'` per S-04, mirroring `usePrefersReducedMotion.ts:21-35`. Same hook lifecycle (re-seed from live mql in effect; `addEventListener('change', ...)` + cleanup). |
| THEME-03 | 3 named palettes (Moss, Slate, Dusk) implemented as `[data-theme='name']` CSS-custom-property override blocks in `src/styles/theme.css`. | jsdom cascade probe (§"jsdom Cascade Probe" below) **empirically confirmed** that `[data-theme='X']:root { --color-*: ... }` overrides resolve correctly via `getComputedStyle(documentElement).getPropertyValue(...)` when injected via `<style>` tag. Per-theme hex values locked in PLAN.md per D-04. |
| THEME-04 | Selected theme persists via `Envelope.prefs.theme` and applies before first paint via FOUC inline script in `index.html`. | Inline `<script>` in `<head>` placement is **empirically guaranteed** to execute before `<body>` parsing per WHATWG HTML parser algorithm; sources confirm Vite has no special transform that would break this. S-03 script shape locked in CONTEXT.md. |
| THEME-05 | Every theme preserves reduced-motion orb-in vs orb-out crossfade contrast ≥ 1.5 luminance ratio. | Automated test in `src/styles/theme.contrast.test.ts`. **Empirical strategy locked** (§"Test Strategy for THEME-05" below): inject rewritten `theme.css` content into `<style>` tag (rewriting `@theme {` → `:root {` per the jsdom probe finding), set `dataset.theme`, read `--color-orb-{in,out}-{from,to}` via `getComputedStyle(documentElement).getPropertyValue(...)`, compute midpoint sRGB, apply WCAG luminance formula, assert ≥ 1.5. |
</phase_requirements>

## Summary

Phase 16 is a CSS+TS feature phase with **one high-risk research question and four medium-risk ones**. All have been answered empirically in this session.

The high-risk question — "can jsdom resolve `[data-theme='X']:root { --color-*: ... }` cascade overrides for the THEME-05 contrast test?" — has a **definitive answer**: yes, with one caveat. jsdom 29.1.1 (currently installed) correctly resolves CSS custom properties from injected `<style>` tags including `[data-theme]` selector overrides. However, jsdom does **not** recognize Tailwind v4's `@theme { ... }` at-rule (it silently drops the declarations). The test fixture must therefore rewrite `@theme {` → `:root {` when injecting `theme.css` content. A separate finding: `getComputedStyle(div).background` returns the literal gradient string `linear-gradient(135deg, var(--color-orb-in-from), var(--color-orb-in-to))` WITHOUT substituting the variables — so the original D-15 plan of "parse the linear-gradient string to extract rgb stops" must be abandoned. Read the four `--color-orb-{in,out}-{from,to}` variables directly from `documentElement` instead.

The medium-risk questions — WCAG luminance math, FOUC script placement, matchMedia listener pattern, CustomEvent dispatch shape, and storage event coexistence — all resolve to established patterns already in the codebase (Phase 2 `usePrefersReducedMotion`, Phase 8 STORAGE-03) or to standard web platform behavior with HIGH-confidence sources.

**Primary recommendation:** Lock the test strategy to "rewrite `@theme {` → `:root {` + read CSS variables directly from `documentElement` (don't parse the gradient string)." Use the W3C WCAG 2.x luminance formula verbatim with inline `relativeLuminance(r,g,b)` and `parseRgb(str)` helpers. Place the FOUC script immediately after `<meta name="viewport">` and before `<title>`. Dispatch `'hrv:prefs-changed'` with generic detail `{ key: 'theme', value: ThemeId }` (forward-compat with Phase 17/18/19). Co-locate `useThemeChoice` inside a separate `src/hooks/useThemeChoice.ts` (NOT inline in ThemePicker.tsx) so the hook is independently testable via `renderHook`. Render the picker as a **radio-like button group** with `role='radiogroup'` semantics — concrete shape detailed in §"Picker UI Shape Recommendation".

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| First-paint theme attribute write | Browser (synchronous inline `<script>` in `<head>`) | — | Must run before `<body>` parses → before module script loads → before React hydration. Only synchronous head-script tier can guarantee this. |
| Persistent storage of theme choice | Browser localStorage via Phase 14 `savePrefs` | — | `Envelope.prefs.theme` — already-locked API surface. |
| Cascading visual application of theme tokens | Browser CSS engine (cascade resolution of `[data-theme='X']:root` overrides) | — | Pure CSS — no JS layer needed once `<html data-theme>` attribute is set. Components consume `var(--color-*)` already. |
| OS preference detection (`'system'` resolution) | Browser via `matchMedia('(prefers-color-scheme: dark)')` | — | Standard web platform; no library needed. |
| Same-tab cross-component sync | Browser via `CustomEvent('hrv:prefs-changed')` on `window` | — | The `'storage'` event does NOT fire in the writing tab — custom event closes that gap. |
| Cross-tab sync | Browser via native `'storage'` event filtered on `STATE_KEY` | — | Existing Phase 8 STORAGE-03 pattern — second listener with same filter, different handler body. |
| Picker UI / option click handler | React component (`ThemePicker.tsx`) | — | Phase 15 D-01 contract — one picker file per dimension. |
| React-side theme state mirroring + side effects | React orchestrator hook (`useTheme.ts`) called once in `App.tsx` | — | A-01/A-02 — single source of truth for `theme` state across mount lifecycle. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.5 [VERIFIED: package.json] | UI framework — `useState` + `useEffect` for hook implementation | Already the project's UI framework; no alternative considered. |
| Tailwind v4 | 4.3.0 [VERIFIED: `npm view tailwindcss version` returned 4.3.0; installed version matches] | CSS framework with `@theme` directive (Light baseline) and arbitrary-value classes `bg-[var(--color-*)]`, `text-[var(--color-*)]` | Already in use; D-01 flat-override pattern works without any new Tailwind feature. |
| Vitest | 4.1.5 [VERIFIED: package.json] | Test runner with jsdom 29.1.1 environment | Already the project's test runner. |
| jsdom | 29.1.1 [VERIFIED: package.json + jsdom/package.json] | Headless DOM for test environment | Already installed; **empirically verified** to support `[data-theme]` cascade resolution for CSS custom properties (§"jsdom Cascade Probe"). |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@testing-library/react` | 16.3.2 [VERIFIED: package.json] | `renderHook` for hook unit tests; `render` for component tests | `useTheme.test.ts(x)`, `useThemeChoice.test.ts(x)`, `ThemePicker.test.tsx` |
| `@testing-library/jest-dom` | 6.9.1 [VERIFIED: package.json] | DOM assertion matchers (`toBeInTheDocument`, `toBeDisabled`, etc.) | All component tests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `[data-theme]` attribute on `<html>` | `class="dark"` on `<html>` (Tailwind v4 `darkMode: 'class'` pattern) | The class-on-html pattern only natively supports a binary dark/light; supporting 6 themes via classes requires more code than `[data-theme='X']`. Already locked by S-01/D-01. |
| Custom `'hrv:prefs-changed'` event | `BroadcastChannel('hrv-prefs')` API for same-tab sync | `BroadcastChannel` would work but adds a different abstraction; same-window dispatch via `CustomEvent` is the simpler same-tab primitive. Locked by A-03. |
| Inline WCAG `relativeLuminance` helper | `color` npm package, `chroma-js`, `culori` | All add 5–40 KB of dep weight for ~15 LOC of arithmetic. D-18 forbids. Locked. |
| `getComputedStyle(probe).background` parse | `getComputedStyle(documentElement).getPropertyValue('--color-orb-in-from')` | Probe-based reading FAILS in jsdom (the `linear-gradient(...)` string returns with `var()` unresolved — see §"jsdom Cascade Probe" — and `parseColor` for jsdom 29 may still be a concern). **Direct variable read is the empirical winner.** |
| `@theme inline` (Tailwind v4 documented pattern for `[data-theme]` overrides) | Plain `[data-theme='X']:root { --color-*: ... }` blocks outside `@theme` | `@theme inline` exists to make theme variables reference OTHER variables (e.g., `--color-primary: var(--primary)`). The D-01 flat-override pattern just redeclares the same `--color-*` names — no indirection — so plain CSS override blocks work without `@theme inline`. Confirmed at [Tailwind v4 theme docs](https://tailwindcss.com/docs/theme). |

**Installation:** None — zero new dependencies (D-18).

**Version verification:**
```bash
npm view tailwindcss version    # 4.3.0 — confirmed current
# All other deps already pinned in package.json; no installs needed for Phase 16
```

## Architecture Patterns

### System Architecture Diagram

```
                        ┌─────────────────────────────────────────┐
                        │  Page load / refresh                    │
                        └────────────────┬────────────────────────┘
                                         │
                                         ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │  <head>: synchronous inline <script>  (FOUC GUARD — S-03)        │
        │  - reads localStorage['hrv:state:v1']                            │
        │  - extracts prefs.theme                                          │
        │  - resolves 'system' via matchMedia('(prefers-color-scheme:dark') │
        │  - falls back to 'light' on ANY error                            │
        │  - writes <html data-theme='light'|'dark'|'moss'|'slate'|'dusk'> │
        └────────────────┬─────────────────────────────────────────────────┘
                         │ (FIRST PAINT — already correct palette)
                         ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │  <body>: <script type="module" src="/src/main.tsx">              │
        │  → React hydration → <App /> mounts                              │
        └────────────────┬─────────────────────────────────────────────────┘
                         │
                         ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │  useTheme()  (called once in App.tsx — A-01/A-02)                │
        │  ┌──────────────┐                                                │
        │  │ useState     │← loadPrefs().theme (initial seed)             │
        │  └──────┬───────┘                                                │
        │         │                                                        │
        │  ┌──────▼───────┐                                                │
        │  │ apply-effect │→ writes documentElement.dataset.theme         │
        │  │              │   (resolving 'system' via matchMedia)         │
        │  └──────────────┘                                                │
        │  ┌──────────────┐                                                │
        │  │ mql-listener │ attached only when state === 'system'         │
        │  │ (gated)      │ → updates attr live on OS dark/light flip     │
        │  └──────────────┘                                                │
        │  ┌──────────────┐                                                │
        │  │ storage      │ window 'storage' event filtered on STATE_KEY  │
        │  │ listener     │ → setTheme(loadPrefs().theme) on cross-tab    │
        │  └──────────────┘                                                │
        │  ┌──────────────┐                                                │
        │  │ prefs-event  │ window 'hrv:prefs-changed' listener           │
        │  │ listener     │ → setTheme(loadPrefs().theme) on same-tab     │
        │  └──────────────┘                                                │
        └──────────────────────────────────────────────────────────────────┘
                         ▲                                  ▲
                         │ window.dispatchEvent             │ StorageEvent
                         │   (same-tab)                     │   (cross-tab,
                         │                                  │    from other tabs)
        ┌────────────────┴──────────────────────┐  ┌────────┴────────────┐
        │ useThemeChoice()                       │  │ localStorage write  │
        │ (called in ThemePicker)                │  │ from another tab    │
        │  setTheme(id):                         │  │                     │
        │    savePrefs({...loadPrefs(),         │  └─────────────────────┘
        │              theme: id})              │
        │    window.dispatchEvent(              │
        │      new CustomEvent(                 │
        │        'hrv:prefs-changed',           │
        │        { detail: {                    │
        │          key: 'theme',                │
        │          value: id                    │
        │        } }))                          │
        └────────────────────────────────────────┘
                         ▲
                         │ user click
                         │
        ┌────────────────┴──────────────────────┐
        │ ThemePicker UI (radio-like buttons    │
        │ over THEME_OPTIONS)                   │
        │ disabled = inSessionView              │
        └───────────────────────────────────────┘
```

The diagram shows two write paths (user click → `useThemeChoice` → custom event; OR cross-tab `'storage'` event), one read path (initial mount loadPrefs), and one side-effect path (`useEffect` writes `documentElement.dataset.theme`). The FOUC inline script in `<head>` is the **first paint** path — it sets `data-theme` synchronously before React mounts, eliminating the flash that would otherwise happen during React's first commit.

### Recommended Project Structure

Files Phase 16 edits / adds (per D-21 file-split invariant):

```
src/
├── styles/
│   ├── theme.css                          [EDIT: @theme block becomes Light; add 4 [data-theme] override blocks]
│   └── theme.contrast.test.ts             [NEW: THEME-05 luminance contrast test]
├── hooks/
│   ├── useTheme.ts                        [NEW: orchestrator hook for App.tsx]
│   ├── useTheme.test.ts                   [NEW: hook unit tests]
│   ├── useThemeChoice.ts                  [NEW: picker-side hook (RECOMMEND separate file — see §Co-location Recommendation)]
│   └── useThemeChoice.test.ts             [NEW: picker hook unit tests]
├── components/
│   ├── ThemePicker.tsx                    [EDIT: stub body becomes real picker]
│   └── ThemePicker.test.tsx               [EDIT: replace 3 stub tests with full picker tests]
├── storage/
│   └── storage.ts                         [EDIT: add `// SYNC WITH index.html FOUC SCRIPT` comment at STATE_KEY:35]
├── app/
│   └── App.tsx                            [EDIT: single line — `useTheme()` invocation]
index.html                                  [EDIT: add inline FOUC <script> in <head>]
```

Files Phase 16 does NOT touch (per D-21):

- `src/domain/settings.ts` (`ThemeId` / `THEME_OPTIONS` / `isValidTheme` / `DEFAULT_THEME` are final from Phase 14 D-01)
- `src/storage/prefs.ts` (`loadPrefs` / `savePrefs` / `coercePrefs` are final from Phase 14 D-10)
- `src/components/SettingsDialog.tsx` (Phase 15 D-01 contract preserved)
- Any other component or hook

### Pattern 1: FOUC-prevention inline script in `<head>`

**What:** Synchronous, inline `<script>` block in `<head>` that reads `localStorage` and writes `<html data-theme>` before `<body>` parsing begins.

**When to use:** Any persistent-theme system that must apply on first paint. Standard web pattern; documented in Tailwind dark-mode docs and replicated by every static-site framework dark-mode tutorial.

**Why it works (HTML parser guarantee):** The WHATWG HTML parser processes `<head>` synchronously. A `<script>` element with no `src` and no `async`/`defer`/`type="module"` attributes **blocks parsing** until executed. Module scripts (the `/src/main.tsx` line) are deferred by default — they wait until after `DOMContentLoaded`. Therefore: inline classic `<script>` in head → runs synchronously → `<body>` not yet parsed → React not yet hydrated → `<html data-theme>` already set when first paint happens. No flash possible. [CITED: [WHATWG HTML §scripting — module scripts are deferred](https://html.spec.whatwg.org/multipage/scripting.html); [Astro FOUC pattern](https://www.danielnewton.dev/blog/dark-mode-astro-tailwind-fouc/)]

**Example (from CONTEXT.md S-03, locked):**
```html
<!-- index.html, inside <head>, immediately after <meta name="viewport"> and before <title> -->
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

**Vite-specific gotchas (checked):** None for this pattern. Vite's `index.html` is processed but inline scripts are preserved verbatim — they're not transformed unless they have `type="module"`. The `<%= ... %>` template syntax doesn't apply here. CSP nonce: project has no CSP set; no nonce needed. HMR dev mode: the script runs once on full page load — HMR module replacement does not re-run the script, which is fine since HMR doesn't reload `<head>`. [CITED: [Vite features — Asset Handling / HTML Entry Points](https://vite.dev/guide/features)]

### Pattern 2: `matchMedia` + `addEventListener('change')` lifecycle

**What:** Subscribe to OS `prefers-color-scheme` flips via the `MediaQueryList` interface.

**When to use:** Inside `useTheme.ts` — `useEffect` attaches listener ONLY when `theme === 'system'`; cleanup removes when user picks a named theme. S-04 mirrors `usePrefersReducedMotion.ts:21-35` verbatim except for the gating.

**Example (verbatim shape from `src/hooks/usePrefersReducedMotion.ts:14-36` — copy this structure):**
```typescript
// Inside useTheme.ts, the system-mode effect:
useEffect(() => {
  if (theme !== 'system') return  // gate per S-04 — listener only attached for 'system' state
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!window.matchMedia) return
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  // Initial sync: write attribute from live mql (defeats stale-initial-state window — IN-02)
  document.documentElement.dataset.theme = mql.matches ? 'dark' : 'light'
  const onChange = (event: MediaQueryListEvent) => {
    document.documentElement.dataset.theme = event.matches ? 'dark' : 'light'
  }
  mql.addEventListener('change', onChange)
  return () => {
    mql.removeEventListener('change', onChange)
  }
}, [theme])
```

**Test mocking pattern (from `src/hooks/usePrefersReducedMotion.test.ts:19-28`):**
```typescript
vi.spyOn(window, 'matchMedia').mockReturnValue({
  matches: true,  // or false
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addEventListener: addSpy,   // or () => {}
  removeEventListener: removeSpy,
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
} as unknown as MediaQueryList)
```

**SSR `!window.matchMedia` guard:** Project is a Vite SPA — no SSR — but the existing `usePrefersReducedMotion.ts:9` and `:18` guards are kept defensively (with the documented eslint-disable). Mirror this in `useTheme.ts` for consistency.

### Pattern 3: Custom event `'hrv:prefs-changed'` for same-tab sync

**What:** `window.dispatchEvent(new CustomEvent('hrv:prefs-changed', { detail: { key: 'theme', value: id } }))` after every `savePrefs(...)`.

**When to use:** Inside `useThemeChoice.setTheme` after the savePrefs write. The reason: the browser `'storage'` event does NOT fire in the tab that wrote — same-tab consumers wouldn't get notified without this custom event. [CITED: [MDN — StorageEvent](https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent) "The StorageEvent is only fired for a Window other than the one that caused the change"]

**Detail object shape — RECOMMENDATION:** `{ key: 'theme', value: ThemeId }` (generic). The CONTEXT.md A-03 deferred this to the planner. Reasoning for the generic shape:

- Forward-compatible with Phase 17 (variant), 18 (timbre), 19 (locale). Each subsequent phase can dispatch the same event name with `detail.key = 'variant' | 'timbre' | 'locale'` and reuse the listener pattern.
- The cost is one extra string field in the detail object per dispatch — negligible.
- The Phase 16 listener in `useTheme` filters on `detail.key === 'theme'` (or, defensively, also re-reads `loadPrefs()` for ANY prefs-changed event — costs one disk read on each event for forward compat).
- The specific shape `{ theme: ThemeId }` would require Phase 17/18/19 to either (a) introduce parallel event names (`'hrv:variant-changed'` etc.) which fragments the listener surface, or (b) re-name the event then, which causes Phase 16 to be edited later, violating the file-split invariant.

**Listener side (in `useTheme.ts`):**
```typescript
useEffect(() => {
  const onPrefsChanged = (e: Event) => {
    // CustomEvent narrowing — instanceof check guards against external dispatchers
    if (e instanceof CustomEvent) {
      const detail = e.detail as { key?: string } | null
      // Filter: only re-read on theme changes. Phase 17/18/19 may add their own filters
      // for variant/timbre/locale. Defensive: also re-read on unknown key for forward compat.
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

**Test pattern (Vitest + RTL):**
```typescript
// Inside the test:
await act(async () => {
  window.dispatchEvent(new CustomEvent('hrv:prefs-changed', {
    detail: { key: 'theme', value: 'dark' },
  }))
})
// Assertion: documentElement.dataset.theme === 'dark', state.theme === 'dark', etc.
```
[CITED: [Vitest Discussion #6488 — testing CustomEvent dispatch](https://github.com/vitest-dev/vitest/discussions/6488)]

### Pattern 4: `'storage'` event with `STATE_KEY` filter for cross-tab sync

**What:** `window.addEventListener('storage', e => { if (e.key === STATE_KEY) { setTheme(loadPrefs().theme) } })` inside `useTheme.ts`.

**When to use:** Phase 16 attaches a SECOND `'storage'` listener (the first is the Phase 8 STORAGE-03 stats-only listener at `App.tsx:116-126`). Two listeners on the same event with different handlers is fine — DOM event listeners are unordered concurrent consumers, not a priority queue.

**Example (literal template — `src/app/App.tsx:116-126`):**
```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STATE_KEY) {
      setStats(loadStats())     // Phase 8 STORAGE-03 — DO NOT TOUCH
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
  }
}, [])
```

Phase 16 mirror inside `useTheme.ts`:
```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STATE_KEY) {
      setTheme(loadPrefs().theme)
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
  }
}, [])
```

**Test pattern (literal — `src/app/App.persistence.test.tsx:340-358`):**
```typescript
// CRITICAL ORDERING (Phase 8 RESEARCH Pitfall 2):
// setItem BEFORE dispatchEvent — the listener calls loadPrefs() which reads disk
// synchronously; the new payload MUST be on disk before the handler fires.
window.localStorage.setItem(STATE_KEY, newEnvelope)
await act(async () => {
  window.dispatchEvent(new StorageEvent('storage', {
    key: STATE_KEY,
    newValue: newEnvelope,
    oldValue: null,
    // Note: omit `storageArea` — jsdom's IDL conversion rejects window.localStorage
  }))
})
```

### Anti-Patterns to Avoid

- **`getComputedStyle(orbProbe).background` to extract gradient stops** — jsdom 29.1.1 returns the literal `linear-gradient(135deg, var(--color-orb-in-from), var(--color-orb-in-to))` string WITHOUT substituting the variables. The original D-15 plan to "parse rgb(...) stops from the gradient string" would fail. **Use direct variable reads via `getComputedStyle(documentElement).getPropertyValue('--color-orb-in-from')` instead** — see §"jsdom Cascade Probe" for empirical evidence.
- **Importing `theme.css` inside a `.test.ts` file** — Vitest's CSS handling does not inject imported CSS into the jsdom document. The import is processed (returns a CSS Modules object or empty) but `getComputedStyle(documentElement).getPropertyValue('--anything')` returns `""`. Empirically verified. Use `readFileSync(themeCssPath)` + `<style>` tag injection instead.
- **Leaving `@theme { ... }` declarations as-is when injecting into the test fixture** — jsdom does NOT recognize Tailwind v4's `@theme` at-rule; declarations inside are silently dropped, and `getComputedStyle` returns `""`. **Rewrite `@theme {` → `:root {` in the test fixture** (string `.replace(/@theme\s*\{/g, ':root {')`) — empirically confirmed to work.
- **Always-on `matchMedia` listener with handler-side gate** — closure-over-stale-state risk and unnecessary churn when user has a named theme. S-04 mandates effect-level gate on `theme === 'system'` for cleaner lifecycle.
- **Extending the existing Phase 8 STORAGE-03 listener** — couples Phase 16 to Phase 8 effect; violates minimal App.tsx edits posture. Use a second listener (A-04).
- **`prefers-color-scheme` polling via `setInterval`** — wasteful; the `MediaQueryList` change event is the canonical pattern.
- **Class-based theme switching (`<html class="theme-dark">`)** — the codebase uses `data-theme` attribute (locked in S-01 + D-01). Don't introduce a parallel class-based path.
- **Theme transition animation (`transition: background-color 200ms ease`)** — risks degrading the THEME-05 reduced-motion contrast during the tween. Locked out by deferred ideas in CONTEXT.md.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OS dark/light detection | Time-based or geolocation-based detection | `window.matchMedia('(prefers-color-scheme: dark)')` | Standard web API; correctly reflects user OS pref including iOS auto night mode and Windows OS theme. |
| Cross-tab synchronization | `BroadcastChannel` or polling localStorage | `window.addEventListener('storage', ...)` filtered on `STATE_KEY` | Already the established pattern (Phase 8 STORAGE-03). Browser-native, zero overhead. |
| Same-tab event bus | Module-level `EventEmitter` or pub-sub helper | `window.dispatchEvent(new CustomEvent('hrv:prefs-changed', ...))` | Native DOM event; no new module surface. Forward-compat for Phase 17/18/19 with generic detail shape. |
| WCAG color math | `chroma-js`, `color`, `culori` libraries | Inline `relativeLuminance(r,g,b)` helper (~15 LOC) | D-18 forbids new deps; the formula is well-defined and stable since WCAG 2.0 (2008). |
| Gradient string parsing | Regex extracting rgb stops from `linear-gradient(...)` output | Read `--color-orb-in-from` and `--color-orb-in-to` directly from `getComputedStyle(documentElement)` | jsdom does not substitute `var()` in computed `background` strings — direct variable read sidesteps the problem entirely. |
| CSS preprocessing in tests | PostCSS plugin chain in vitest | Read `theme.css` as raw text, rewrite `@theme {` → `:root {`, inject via `<style>` tag | Empirically the simplest path that handles Tailwind's custom at-rule. The `@tailwindcss/vite` plugin does NOT process CSS during vitest runs ([Tailwind issue #18952](https://github.com/tailwindlabs/tailwindcss/issues/18952)). |

**Key insight:** Every cross-component sync mechanism in this phase already exists as a browser primitive. The only new code is the orchestration layer (`useTheme.ts`, `useThemeChoice.ts`) that wires the primitives together. Phase 16 ships ZERO new abstractions over browser/DOM APIs.

## Common Pitfalls

### Pitfall 1: `@theme {...}` declarations dropped in jsdom test fixture
**What goes wrong:** Injecting raw `theme.css` content via `<style>` tag in the THEME-05 test results in `getComputedStyle(documentElement).getPropertyValue('--color-orb-in-from') === ""` for all light-theme assertions.
**Why it happens:** jsdom 29.1.1 does not recognize Tailwind v4's `@theme { ... }` at-rule. The declarations inside are parsed but never applied to any element.
**How to avoid:** Rewrite `@theme {` to `:root {` in the test fixture before injecting:
```typescript
const raw = readFileSync(themeCssPath, 'utf-8')
const rewritten = raw.replace(/@theme\s*\{/g, ':root {')
```
**Warning signs:** Test assertion `expect(getComputedStyle(documentElement).getPropertyValue('--color-orb-in-from').trim()).toBe('#99f6e4')` returns `""` instead of the hex.

### Pitfall 2: `getComputedStyle().background` returns gradient string with unresolved `var()` references in jsdom
**What goes wrong:** Reading `getComputedStyle(probeDiv).background` for a div styled `background: linear-gradient(135deg, var(--color-orb-in-from), var(--color-orb-in-to))` returns the literal string `linear-gradient(135deg, var(--color-orb-in-from), var(--color-orb-in-to))` — the variables are not substituted, and `parseFloat`/regex extraction of rgb stops returns nothing.
**Why it happens:** jsdom (as of 29.1.1) implements basic CSS resolution but does not perform the full `var()` substitution that browsers apply when computing `background` values.
**How to avoid:** Read the CSS custom properties directly from `documentElement` — `getComputedStyle(documentElement).getPropertyValue('--color-orb-in-from')` — instead of computing them through the gradient string. Variables DO resolve via the cascade selector path, just not through `var()` substitution into composite property values.
**Warning signs:** Empty/undefined from `getComputedStyle(div).background` for elements that should have a gradient; or the raw `var(...)` text appearing in the returned string.

### Pitfall 3: Vitest `import './theme.css'` does NOT inject styles into jsdom
**What goes wrong:** Test file does `import './theme.css'`, then expects `getComputedStyle(documentElement).getPropertyValue('--color-breathing-bg')` to return `'#f2fbf7'`. Instead returns `""`.
**Why it happens:** Vitest processes `.css` imports as CSS Modules (returns an empty/object module) but does NOT inject the parsed stylesheet into the jsdom document. There is no Vite CSS pipeline running for the test environment.
**How to avoid:** Use `readFileSync(themeCssPath)` to read the CSS text, then `document.head.appendChild(styleEl)` to inject it. Use `import.meta.url` or `__dirname` for path resolution (former: `fileURLToPath(new URL('./theme.css', import.meta.url))` — but in this codebase the `__dirname` shim from `tsconfig` works; the probe confirmed `resolve(__dirname, 'theme.css')` works in Vitest 4.1.5).
**Warning signs:** `getComputedStyle(documentElement).getPropertyValue('--<any-token-from-theme.css>').trim() === ""` after a `import './theme.css'`.

### Pitfall 4: `'storage'` event does NOT fire in the writing tab
**What goes wrong:** User clicks a theme in `ThemePicker`, `useThemeChoice.setTheme` calls `savePrefs(...)`, but `useTheme`'s state in the same tab doesn't update — the visual stays on the previous theme until reload.
**Why it happens:** The WHATWG spec for `StorageEvent` explicitly states "The StorageEvent is only fired for a Window other than the one that caused the change." Same-tab writes don't fire `'storage'`.
**How to avoid:** Dispatch the custom `'hrv:prefs-changed'` event after every `savePrefs(...)` call in `useThemeChoice`. `useTheme` listens for BOTH `'storage'` (cross-tab) AND `'hrv:prefs-changed'` (same-tab). A-03/A-04 lock this two-listener pattern.
**Warning signs:** Theme switch from picker has no visual effect; refreshing the page applies the new theme; opening a second tab and clicking shows the change in the original tab (proving storage works but same-tab doesn't).

### Pitfall 5: Module script (`type="module"`) FOUC script — won't prevent flash
**What goes wrong:** Author copies the FOUC script from S-03 but adds `type="module"` (or `defer`). Page loads with a flash of Light → Dark when user has `theme: 'dark'` stored.
**Why it happens:** Module scripts are implicitly deferred — they wait until after `DOMContentLoaded` to execute. By then, the body has been parsed and React has started hydrating. First paint already happened on the default Light theme.
**How to avoid:** The S-03 script MUST be a plain `<script>` (no `type`, no `async`, no `defer`). Synchronous inline classic script in `<head>` is the only correct shape.
**Warning signs:** First-load flash on theme switch for users who previously selected non-default themes.

### Pitfall 6: `setItem` and `dispatchEvent('storage')` order in tests
**What goes wrong:** Test dispatches the synthetic `'storage'` event but the handler reads stale localStorage and asserts fail.
**Why it happens:** The listener handler calls `loadPrefs()` which reads disk synchronously. If the event fires before the new payload is on disk, `loadPrefs()` returns the OLD value.
**How to avoid:** Always `setItem(STATE_KEY, newEnvelope)` BEFORE `dispatchEvent(new StorageEvent(...))`. Phase 8 RESEARCH Pitfall 2 — literal template at `App.persistence.test.tsx:340-358`.
**Warning signs:** Cross-tab test assertion fails despite correct envelope contents.

### Pitfall 7: matchMedia listener attached unconditionally
**What goes wrong:** User picks `'dark'` (a named theme). OS dark/light flip mid-session would still bounce the visual to whichever OS pref is current — overriding the user's explicit `'dark'` choice.
**Why it happens:** Always-on listener with handler-side gate has a closure over the old theme state and writes the attribute regardless of current state.
**How to avoid:** Gate the listener attachment at the `useEffect` level — only attach when `theme === 'system'`; cleanup when user switches to a named theme. S-04 mandates this. The `theme` dep in the effect array ensures re-evaluation.
**Warning signs:** OS dark/light flip overrides a user's explicit Dark/Light/Moss/Slate/Dusk pick mid-session.

### Pitfall 8: Tailwind v4 utility-class generation tied to `@theme` block
**What goes wrong:** Author moves `--color-orb-in-from` out of `@theme` and into a plain `:root` block. Components using `bg-[var(--color-orb-in-from)]` (Tailwind arbitrary-value class) still work, but any utility classes that Tailwind v4 was generating from the `@theme` token (e.g., `bg-orb-in-from`) would disappear.
**Why it happens:** `@theme` in Tailwind v4 has the side effect of generating utility classes from the token names. Plain `:root` does not. [CITED: [Tailwind v4 theme docs](https://tailwindcss.com/docs/theme)]
**How to avoid:** Grep the codebase for non-arbitrary-value Tailwind classes against `--color-*` token names. The current codebase appears to use only arbitrary-value classes (`text-[var(--color-breathing-muted)]`, `bg-[var(--color-modal-backdrop)]`, `bg-[radial-gradient(circle_at_top,_var(--color-breathing-bg-soft),...)]` per `App.tsx:589`). No non-arbitrary utility classes on `--color-*` tokens found. **Confirmed safe** — D-01 flat-override pattern works without `@theme`-generated utilities. But the planner should verify post-implementation that no `bg-breathing-bg` (no-bracket) classes exist anywhere — they would silently break.
**Warning signs:** Components rendering with default browser colors instead of theme palette; `npm run build` succeeds but `npx tsc --noEmit` may not surface CSS-class issues.

## Code Examples

Verified patterns ready for direct use.

### Example 1: WCAG relative luminance + contrast ratio helpers (inline in `theme.contrast.test.ts`)

```typescript
// Source: W3C WCAG 2.x §relative-luminance + §contrast-ratio
// https://www.w3.org/TR/WCAG21/relative-luminance.html
// https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
//
// sRGB → linear → WCAG relative luminance. No new dep (D-18).

function srgbToLinear(c: number): number {
  // c ∈ [0, 1]
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function relativeLuminance(r: number, g: number, b: number): number {
  // r, g, b ∈ [0, 255]
  const rL = srgbToLinear(r / 255)
  const gL = srgbToLinear(g / 255)
  const bL = srgbToLinear(b / 255)
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL
}

function contrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const L1 = relativeLuminance(...rgb1)
  const L2 = relativeLuminance(...rgb2)
  const [bright, dark] = L1 >= L2 ? [L1, L2] : [L2, L1]
  return (bright + 0.05) / (dark + 0.05)
}
```

[CITED: [W3C WCAG 2.1 — relative luminance](https://www.w3.org/TR/WCAG21/relative-luminance.html); [WCAG 2.0 G17 — contrast ratio formula](https://www.w3.org/TR/WCAG20-TECHS/G17.html); [Neil Bickford — Computing WCAG Contrast Ratios](https://www.neilbickford.com/blog/2020/10/18/computing-wcag-contrast-ratios/)]

**Known caveat (HIGH confidence):** WCAG 2.x's `0.03928` threshold is slightly off from the IEC sRGB standard (correct value: `0.04045`). The difference is negligible in practice (~0.00006 absolute luminance delta for an 8-bit value of 10/255). Use the `0.03928` figure — it's the WCAG-canonical number and matches every contrast-checker tool the project might be compared against.

### Example 2: Hex / rgb(...) parser for reading custom-property values

```typescript
// Source: implementation pattern from contrast-ratio libraries and WCAG checker UIs.
// jsdom returns computed property values in two shapes:
//   - hex literals like '#99f6e4' (when value was written as hex)
//   - 'rgb(r,g,b)' (no spaces — jsdom's css-tree normalization) when value was rgb(...)
//   - 'rgb(r, g, b)' (with spaces) — possible in some jsdom versions
// Both must be handled.

function parseColorToRgb(value: string): [number, number, number] {
  const v = value.trim()
  // Hex shorthand #abc → #aabbcc
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    const r = parseInt(v[1] + v[1], 16)
    const g = parseInt(v[2] + v[2], 16)
    const b = parseInt(v[3] + v[3], 16)
    return [r, g, b]
  }
  // Hex full #aabbcc
  if (/^#[0-9a-f]{6}$/i.test(v)) {
    const r = parseInt(v.slice(1, 3), 16)
    const g = parseInt(v.slice(3, 5), 16)
    const b = parseInt(v.slice(5, 7), 16)
    return [r, g, b]
  }
  // rgb(r,g,b) with or without spaces
  const rgbMatch = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(v)
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])]
  }
  throw new Error(`Cannot parse color value: '${v}'`)
}
```

### Example 3: THEME-05 contrast test (full template)

```typescript
// src/styles/theme.contrast.test.ts
//
// Phase 16 THEME-05: every shipped theme preserves reduced-motion crossfade contrast.
// D-13 / D-14 / D-15 / D-16: WCAG luminance contrast ratio ≥ 1.5 on the orb-in vs orb-out
// midpoint colors, iterated over the 5 concrete themes (light, dark, moss, slate, dusk).

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { THEME_OPTIONS, type ThemeId } from '../domain/settings'

// Inline helpers — D-18 (no new deps)
function srgbToLinear(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * srgbToLinear(r / 255) + 0.7152 * srgbToLinear(g / 255) + 0.0722 * srgbToLinear(b / 255)
}
function parseColorToRgb(value: string): [number, number, number] { /* per Example 2 */ }

function midpoint(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2), Math.round((a[2] + b[2]) / 2)]
}

function read(token: string): [number, number, number] {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return parseColorToRgb(value)
}

// Theme.css injection — D-15 fallback path (empirically required; see RESEARCH §"jsdom Cascade Probe")
beforeAll(() => {
  const themeCssPath = resolve(__dirname, 'theme.css')
  const raw = readFileSync(themeCssPath, 'utf-8')
  // Rewrite @theme { -> :root { because jsdom does not recognize Tailwind v4's @theme at-rule
  const rewritten = raw.replace(/@theme\s*\{/g, ':root {')
  const style = document.createElement('style')
  style.textContent = rewritten
  document.head.appendChild(style)
})

afterEach(() => {
  delete document.documentElement.dataset.theme
})

// D-16: skip 'system' — it has no CSS branch per S-01; runtime resolves to light/dark
const CONCRETE_THEMES: readonly Exclude<ThemeId, 'system'>[] =
  THEME_OPTIONS.filter((t): t is Exclude<ThemeId, 'system'> => t !== 'system')

describe.each(CONCRETE_THEMES)('theme=%s', (themeId) => {
  it('reduced-motion crossfade midpoint contrast ratio is ≥ 1.5 (THEME-05 / D-14)', () => {
    document.documentElement.dataset.theme = themeId === 'light' ? '' : themeId
    // Light is the @theme baseline → empty data-theme. Override blocks are [data-theme='X']:root.
    // Empirical workaround: 'light' must be tested with NO data-theme attr OR a value that has no override block.

    const inFrom = read('--color-orb-in-from')
    const inTo   = read('--color-orb-in-to')
    const outFrom = read('--color-orb-out-from')
    const outTo   = read('--color-orb-out-to')

    const inMid  = midpoint(inFrom, inTo)
    const outMid = midpoint(outFrom, outTo)

    const inLum  = relativeLuminance(...inMid)
    const outLum = relativeLuminance(...outMid)
    const ratio  = (Math.max(inLum, outLum) + 0.05) / (Math.min(inLum, outLum) + 0.05)

    expect(ratio).toBeGreaterThanOrEqual(1.5)
  })
})
```

**Note for planner:** Light is the `@theme` baseline → no `data-theme` attribute → `delete document.documentElement.dataset.theme` (or set to `''`). The other four themes set the attribute to their `ThemeId`. Confirmed empirically.

### Example 4: `useTheme.ts` (orchestrator hook skeleton)

```typescript
import { useEffect, useState } from 'react'
import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'
import type { ThemeId } from '../domain/settings'

function resolveSystem(): 'light' | 'dark' {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme(): { theme: ThemeId; setTheme: (next: ThemeId) => void } {
  const [theme, setTheme] = useState<ThemeId>(() => loadPrefs().theme)

  // Apply effect — writes <html data-theme>, resolving 'system' via matchMedia
  useEffect(() => {
    const resolved = theme === 'system' ? resolveSystem() : theme
    document.documentElement.dataset.theme = resolved
  }, [theme])

  // matchMedia listener — gated on theme === 'system' (S-04)
  useEffect(() => {
    if (theme !== 'system') return
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    // Re-seed (defeats stale-initial-state window — IN-02 pattern)
    document.documentElement.dataset.theme = mql.matches ? 'dark' : 'light'
    const onChange = (event: MediaQueryListEvent) => {
      document.documentElement.dataset.theme = event.matches ? 'dark' : 'light'
    }
    mql.addEventListener('change', onChange)
    return () => { mql.removeEventListener('change', onChange) }
  }, [theme])

  // Cross-tab 'storage' listener — A-04
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STATE_KEY) setTheme(loadPrefs().theme)
    }
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener('storage', onStorage) }
  }, [])

  // Same-tab 'hrv:prefs-changed' listener — A-03
  useEffect(() => {
    const onPrefsChanged = (e: Event): void => {
      if (!(e instanceof CustomEvent)) return
      const detail = e.detail as { key?: string } | null
      if (!detail || detail.key === 'theme' || detail.key === undefined) {
        setTheme(loadPrefs().theme)
      }
    }
    window.addEventListener('hrv:prefs-changed', onPrefsChanged)
    return () => { window.removeEventListener('hrv:prefs-changed', onPrefsChanged) }
  }, [])

  return { theme, setTheme }
}
```

### Example 5: `useThemeChoice.ts` (picker-side hook)

```typescript
import { useCallback, useState } from 'react'
import { loadPrefs, savePrefs } from '../storage/prefs'
import type { ThemeId } from '../domain/settings'

export function useThemeChoice(): { theme: ThemeId; setTheme: (next: ThemeId) => void } {
  const [theme, setThemeState] = useState<ThemeId>(() => loadPrefs().theme)

  const setTheme = useCallback((next: ThemeId): void => {
    const current = loadPrefs()
    savePrefs({ ...current, theme: next })
    setThemeState(next)
    window.dispatchEvent(new CustomEvent('hrv:prefs-changed', {
      detail: { key: 'theme', value: next },
    }))
  }, [])

  return { theme, setTheme }
}
```

**Note:** `useThemeChoice` keeps its own state mirror so the picker UI can reflect the selection optimistically WITHOUT waiting for the App-side `useTheme` to re-read on the custom-event roundtrip. This matches the optimistic-UI posture Phase 4 LOCL-02 established (`confirmReset` at `App.tsx:400-409`).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `class="dark"` on `<html>` (Tailwind v3 `darkMode: 'class'`) | `[data-theme='X']` attribute on `<html>` + CSS custom property override blocks | Tailwind v4 (2024) shifted to CSS-first config; supports multi-theme natively via custom properties | Phase 16 picks the v4-native pattern; future Tailwind versions remain compatible. |
| Cssstyle for CSS parsing in jsdom | `@csstools/css-syntax-patches-for-csstree` + `@asamuzakjp/css-color` + `css-tree` | jsdom 29 (~2024) | Older issues like jsdom#2166 ("linear-gradient parsed as invalid") and cssstyle#148 may be partially resolved. Empirically: gradient strings DO read in jsdom 29 but with `var()` UNRESOLVED. Direct variable read is still the simpler path. |
| `window.addEventListener('storage', handler)` for all cross-document sync | `'storage'` for cross-tab + `BroadcastChannel` for richer cross-tab + `CustomEvent` for same-tab | ~2018 (BroadcastChannel cross-browser; CustomEvent always existed) | Phase 16 sticks with the simpler `'storage'` + `CustomEvent` combo (matches Phase 8 pattern); BroadcastChannel deferred. |
| Sync FOUC script that reads only one key | Sync FOUC script that reads the full prefs envelope and applies multiple attrs in one pass | N/A — same pattern at higher granularity | Phase 16 only reads `prefs.theme`; Phase 19 (locale) may augment the script to also write `lang` attribute. Deferred. |

**Deprecated/outdated:**
- `mql.addListener` / `mql.removeListener` — the `Listener` (without `Event`) APIs were the original Safari shape; deprecated since ~2019. The existing `usePrefersReducedMotion.ts:32` uses `addEventListener('change', ...)`. Mirror this; do NOT use `addListener`.
- `@theme inline` directive — exists but unnecessary for the D-01 flat-override pattern. Only needed when theme variables reference OTHER variables (`--color-primary: var(--primary)`). The Phase 16 override blocks redeclare the same `--color-*` names directly with hex/rgb values.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getComputedStyle(div).background` in jsdom 29.1.1 returns the gradient string with `var()` UNRESOLVED | Pitfall 2, Anti-Patterns | LOW — empirically verified in this session via the probe script. If a future jsdom version starts substituting `var()`, the recommended direct-variable-read approach still works (better than parsing). |
| A2 | The `'storage'` event does NOT fire in the writing tab | Pattern 4, Pitfall 4 | LOW — WHATWG spec; well-established. |
| A3 | jsdom 29.1.1's `@theme {...}` parse drop applies to all variables inside the block | Pitfall 1 | LOW — empirically verified in this session via the probe. The probe injected raw `theme.css`, got `""` for all `--color-*` reads, then rewrote `@theme {` to `:root {` and got correct values. |
| A4 | Vite's `<script type="module">` (the main.tsx entry) is implicitly deferred and runs AFTER the inline FOUC script | Pattern 1, Pitfall 5 | LOW — WHATWG HTML spec for module scripts; documented Vite default. |
| A5 | Per-theme hex values can be designed to satisfy contrast ratio ≥ 1.5 — none of the 5 themes will be infeasible | THEME-05 test strategy | MEDIUM — purely a design-space assumption. The Phase 2 baseline (teal-pastel vs blue-pastel) measures ≈ 1.8, comfortably above 1.5. Dark theme is the most likely to bump against the floor since both gradients live in low-luminance space. If a designer-picked Dark palette produces ratio < 1.5, the test will catch it and the planner will need to widen the In vs Out hue separation. |
| A6 | The codebase has no `bg-breathing-bg` (no-bracket) Tailwind classes against `--color-*` tokens | Pitfall 8 | LOW — manual grep confirmed only arbitrary-value classes are used. But planner should re-grep before locking. |
| A7 | The `STATE_KEY = 'hrv:state:v1'` value will not change during Phase 16 | S-02, FOUC script | LOW — Phase 8 STORAGE-01 docstring explicitly defines the bump policy. The Phase 16 `// SYNC WITH index.html FOUC SCRIPT` comment is the bump trigger. |

**Note:** None of these assumptions are about user requirements or compliance — all are technical/empirical claims verified in this session.

## Open Questions (RESOLVED)

1. **Per-theme hex values (~85 hexes) — picked at PLAN.md time** — RESOLVED: planner picks at PLAN time, verified against THEME-05 contrast test.
   - What we know: Moss = byte-identical copy of the current `@theme` values at `src/styles/theme.css:1-50` (locked). Light must be visually distinct from Moss (cool/neutral, not teal-pastel). Dark must satisfy ≥ 1.5 luminance contrast at the orb-in vs orb-out midpoint (the perceptual challenge — both halves of dark mode live in low-luminance space). Slate + Dusk are creative latitude.
   - What's unclear: the exact palette. This is a design exercise rather than a research question, and CONTEXT.md D-04 explicitly defers it to the planner.
   - Recommendation: Planner picks values in PLAN.md and verifies contrast ≥ 1.5 against the THEME-05 test before committing. Each palette ships 17 `--color-*` tokens — see existing `src/styles/theme.css:1-50` for the full list. Starting points the planner can adapt: Tailwind's slate/zinc scales for Dark; Tailwind's emerald + neutral for a Light cool-neutral; the existing teal-pastel for Moss; Tailwind's blue-gray + indigo for Slate; Tailwind's purple/amber for Dusk.

2. **Picker UI shape (radio buttons / `<select>` / segmented control)** — RESOLVED: radio-like button group with `role='radiogroup'` + `aria-checked` semantics. Coheres with SettingsDialog's 4 pickers (Theme → Variant → Timbre → Language per Phase 15 D-10); Theme is not ordinal so SettingsStepper pattern doesn't fit.

3. **`useThemeChoice` co-location — separate file vs inline in ThemePicker** — RESOLVED: **Separate file** (`src/hooks/useThemeChoice.ts`). Reasons: (a) hook can be unit-tested via `renderHook` without rendering picker UI; (b) consistent with codebase pattern — every other hook lives in `src/hooks/`; (c) Phase 17/18/19 will mirror this for `useVariantChoice` / `useTimbreChoice` / `useLocaleChoice`.

4. **Visual styling of the `disabled` state for the picker** — RESOLVED: each button gets `disabled` attr + `opacity-45 cursor-not-allowed` (matching `SettingsStepper.tsx:45`) when picker is disabled. Selected button keeps its visual highlight so users see current selection while disabled.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build / tests | ✓ | 25.x (per vitest.setup.ts polyfill comment) | — |
| npm | Build | ✓ | bundled with Node | — |
| TypeScript | Type-check (`tsc --noEmit`) | ✓ | 6.0.2 (per package.json) | — |
| Vite | Build (`npm run build`) | ✓ | 8.0.10 | — |
| Vitest | Tests (`npm test`) | ✓ | 4.1.5 | — |
| jsdom (test env) | THEME-05 test (`getComputedStyle` on `documentElement` with injected styles) | ✓ | 29.1.1 | If hypothetically broken: switch this single test file to `happy-dom` (no install needed if happy-dom not present; would require adding the dep — D-18 forbids). |
| @testing-library/react | Hook + component tests (`renderHook`, `render`) | ✓ | 16.3.2 | — |
| Browser CSS engine (production) | `[data-theme]` cascade resolution at runtime | ✓ (all evergreen browsers) | — | — |
| `window.matchMedia('(prefers-color-scheme: dark)')` | OS pref detection at runtime + FOUC script | ✓ (all evergreen browsers; Safari 14+, Chrome 76+, Firefox 67+) | — | Inline FOUC script and `useTheme` both have defensive `if (!window.matchMedia) return 'light'` guards. |
| `localStorage` | FOUC script + `loadPrefs` | ✓ (all browsers; throws on private mode in older Safari — already absorbed by Phase 4 D-17 silent-fallback adapter) | — | FOUC script wraps in try/catch, falls back to `'light'`. |
| `CustomEvent` constructor | Same-tab sync dispatch | ✓ (all evergreen browsers) | — | — |
| `StorageEvent` constructor | Cross-tab test dispatch | ✓ (jsdom 29.1.1 supports it; verified via Phase 8 tests) | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + jsdom 29.1.1 + @testing-library/react 16.3.2 + @testing-library/jest-dom 6.9.1 |
| Config file | `vite.config.ts` (Vitest config inlined under `test:` key) |
| Quick run command | `npx vitest run src/styles/theme.contrast.test.ts src/hooks/useTheme.test.ts src/hooks/useThemeChoice.test.ts src/components/ThemePicker.test.tsx` |
| Full suite command | `npm run test:run` (alias: `vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| THEME-01 | User can choose Light / Dark / System; selection writes savePrefs + dispatches `'hrv:prefs-changed'` | unit (RTL) | `npx vitest run src/components/ThemePicker.test.tsx` | ❌ Wave 0 (rewrites existing 3-test smoke file) |
| THEME-01 | `useThemeChoice.setTheme('dark')` calls `savePrefs({theme:'dark', ...})` + dispatches custom event | unit (renderHook) | `npx vitest run src/hooks/useThemeChoice.test.ts` | ❌ Wave 0 |
| THEME-02 | `useTheme` resolves `'system'` via matchMedia at mount; writes `data-theme='dark'\|'light'` | unit (renderHook + mock) | `npx vitest run src/hooks/useTheme.test.ts -t "system mode"` | ❌ Wave 0 |
| THEME-02 | mql 'change' event flips `data-theme` while `state === 'system'` | unit (renderHook + mock) | `npx vitest run src/hooks/useTheme.test.ts -t "mql change"` | ❌ Wave 0 |
| THEME-02 | mql listener NOT attached when `state === 'dark'` (or any named); cleanup on switch from system → named | unit (renderHook + spy) | `npx vitest run src/hooks/useTheme.test.ts -t "gated listener"` | ❌ Wave 0 |
| THEME-03 | Named-palette `[data-theme='moss']:root` block overrides `--color-orb-in-from` | integration (CSS cascade via `<style>` injection) | `npx vitest run src/styles/theme.contrast.test.ts` (covers via THEME-05 path) | ❌ Wave 0 |
| THEME-04 | FOUC script in `index.html` is present, synchronous, runs before module script | manual-only (build output inspection) | n/a — manual verification of built `dist/index.html` | n/a (build artifact) |
| THEME-04 | Theme persists across reloads — `useTheme` seed reads `loadPrefs().theme` at mount | unit (renderHook + localStorage seed) | `npx vitest run src/hooks/useTheme.test.ts -t "initial mount"` | ❌ Wave 0 |
| THEME-04 | Cross-tab `'storage'` event re-reads loadPrefs | unit (renderHook + dispatch StorageEvent) | `npx vitest run src/hooks/useTheme.test.ts -t "storage event"` | ❌ Wave 0 |
| THEME-04 | Same-tab `'hrv:prefs-changed'` event re-reads loadPrefs | unit (renderHook + dispatch CustomEvent) | `npx vitest run src/hooks/useTheme.test.ts -t "prefs-changed"` | ❌ Wave 0 |
| THEME-05 | Every concrete theme (light, dark, moss, slate, dusk) has orb-in vs orb-out midpoint contrast ≥ 1.5 | integration (`it.each` × 5 themes + CSS cascade) | `npx vitest run src/styles/theme.contrast.test.ts` | ❌ Wave 0 |

**Manual-only items:**
- THEME-04 (FOUC script presence + correctness): the `index.html` script can be unit-tested by parsing the file as text and asserting the regex matches, but the actual no-flash behavior requires a real browser. The CONTEXT.md D-13 informal review pass (run the built app, hard-refresh, observe no flash) covers this. The automated test in Wave 0 should grep `index.html` for the literal `localStorage.getItem('hrv:state:v1')` string + the literal `setAttribute('data-theme'` to lock the script structure even if it's an indirect check.

### Sampling Rate
- **Per task commit:** `npx vitest run src/styles/theme.contrast.test.ts src/hooks/useTheme.test.ts src/hooks/useThemeChoice.test.ts src/components/ThemePicker.test.tsx` (the 4 Phase 16 test files — fastest signal during dev)
- **Per wave merge:** `npm run test:run` (full suite — verifies no regression in Phases 1-15)
- **Phase gate:** `npx tsc --noEmit && npm run lint && npm run build && npm run test:run` exits 0 (D-17 per-commit green-gate)

### Wave 0 Gaps
- [ ] `src/styles/theme.contrast.test.ts` — covers THEME-05 (5 concrete themes × luminance contrast ≥ 1.5)
- [ ] `src/hooks/useTheme.test.ts` — covers THEME-02, THEME-04 (matchMedia integration, storage events, custom events, mount seed)
- [ ] `src/hooks/useThemeChoice.test.ts` — covers THEME-01, THEME-04 (savePrefs write, custom event dispatch)
- [ ] `src/components/ThemePicker.test.tsx` — covers THEME-01, THEME-03 (UI option list, click handlers, disabled gating, 6 options rendered)
- [ ] No new framework install needed — Vitest + jsdom + RTL all present

## Project Constraints (from CLAUDE.md)

`./CLAUDE.md` is a symlink/reference to user-level instructions; no project-local `CLAUDE.md` overrides found in the repo root. The user-level CLAUDE.md (via `~/.claude/RTK.md`) covers terminal-tooling (RTK proxy) only — no project-specific implementation constraints. Phase 16 implementation follows project conventions established in the codebase + CONTEXT.md + the Phase 14/15 carry-forward invariants captured in §"User Constraints" above.

## jsdom Cascade Probe (Empirical Verification — Phase 16 Critical Path)

**Question:** Can the THEME-05 test (`theme.contrast.test.ts`) reliably read theme-specific custom property values through the `[data-theme='X']:root` cascade in jsdom 29.1.1 — the version Vitest 4.1.5 ships?

**Method:** Wrote a 4-test probe in `src/styles/jsdom-probe.test.ts`, ran via `npx vitest run`, captured the output, removed the file.

**Findings (all empirically verified in this session, 2026-05-12):**

| Test | Setup | Result |
|------|-------|--------|
| 1 | `document.documentElement.style.setProperty('--probe-color', '#abcdef')` then read via `getComputedStyle` | ✅ Returns `'#abcdef'` |
| 2 | Inject `<style>:root { --probe-tag-color: rgb(10, 20, 30); }</style>` then read via `getComputedStyle` | ✅ Returns `'rgb(10,20,30)'` (no spaces — normalization artifact, still parseable) |
| 3 | Inject `<style>:root {--probe-cascade: red} [data-theme='dark']:root {--probe-cascade: blue}</style>` + set `dataset.theme = 'dark'`, read | ✅ Returns `'blue'` — **cascade works** |
| 4 | Inject `<style>.probe-grad { background: linear-gradient(135deg, var(--g-from), var(--g-to)); }</style>`, append div with class, read `getComputedStyle(div).background` | ⚠️ Returns `'linear-gradient(135deg, var(--g-from), var(--g-to))'` — **`var()` NOT substituted** |
| 5 | Inject raw `theme.css` content (with `@theme {...}` block as-is), read `--color-breathing-bg` | ❌ Returns `""` — **jsdom does not recognize `@theme` at-rule** |
| 6 | Inject `theme.css` with `@theme {` rewritten to `:root {`, read `--color-breathing-bg` | ✅ Returns `'#f2fbf7'` — **rewriting works** |
| 7 | Same as 6 + add a `[data-theme='dark']:root { --color-orb-in-from: #1e293b }` override block, set `dataset.theme = 'dark'`, read `--color-orb-in-from` | ✅ Returns `'#1e293b'` — **end-to-end cascade verified** |
| 8 | Flip `dataset.theme` from `'dark'` to `'moss'` mid-test, re-read | ✅ Returns new theme's value live — **attribute-change cascade is dynamic** |

**Locked test strategy (revises CONTEXT.md D-15 fallback path from "if-needed" to "MUST"):**

1. Read `src/styles/theme.css` via `readFileSync(resolve(__dirname, 'theme.css'))` in a `beforeAll` block.
2. Rewrite `@theme\s*\{` → `:root {` via `.replace(...)`.
3. Inject the rewritten CSS into `document.head` via a `<style>` tag with `textContent`.
4. For each theme: `document.documentElement.dataset.theme = themeId` (or `delete dataset.theme` for `light` since Light is the `@theme` baseline → no override block).
5. Read each `--color-orb-{in,out}-{from,to}` via `getComputedStyle(documentElement).getPropertyValue(token).trim()`.
6. Parse hex/rgb strings via inline `parseColorToRgb` helper.
7. Compute midpoint, luminance, contrast ratio. Assert ≥ 1.5.

**Do NOT:**
- Render a probe `<div>` and try to parse `getComputedStyle(div).background` — jsdom returns the gradient string with `var()` UNRESOLVED.
- Import `theme.css` via `import './theme.css'` — Vitest does not inject the import into the jsdom document.
- Leave `@theme {...}` as-is in the injected fixture — jsdom drops the declarations silently.

## Picker UI Shape Recommendation

**Three viable shapes were considered:**

| Shape | Pros | Cons |
|-------|------|------|
| Radio-like button group (custom buttons with `role='radio'` + `aria-checked` inside a `role='radiogroup'`) | ✅ 6 options visible at a glance; ✅ natural arrow-key nav with `role='radiogroup'`; ✅ matches `SessionControls` button styling | Requires explicit ARIA wiring; ~80 LOC including labels |
| Native `<select>` | ✅ Smallest LOC (~30); ✅ native a11y; ✅ OS-styled dropdowns on mobile | ✗ Hidden options behind a click; ✗ inconsistent with Phase 1 SettingsStepper's "all options visible at once" posture; ✗ mobile OS chrome doesn't match the modal's calm pastel aesthetic |
| Segmented control (custom buttons with `aria-pressed`) | ✅ Visually compact; ✅ all options visible | ✗ `aria-pressed` is a toggle semantic, not a single-select — `role='radiogroup'` is the correct mapping for this use; ✗ 6 options is too many for a compact horizontal segmented control on mobile |
| 6 distinct option cards (large visual swatches showing each palette) | ✅ Maximum visual feedback; ✅ users can see palette colors before picking | ✗ ~150 LOC + per-theme miniature palette swatch rendering; ✗ violates Phase 15 D-18 "minimal posture, no description copy" |

**RECOMMENDATION: radio-like button group with `role='radiogroup'`.**

Skeleton:
```tsx
import { useThemeChoice } from '../hooks/useThemeChoice'
import { THEME_OPTIONS, type ThemeId } from '../domain/settings'

const LABELS: Record<ThemeId, string> = {
  light: 'Light', dark: 'Dark', system: 'System',
  moss: 'Moss', slate: 'Slate', dusk: 'Dusk',
}

export function ThemePicker({ disabled }: ThemePickerProps) {
  const { theme, setTheme } = useThemeChoice()
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900" id="theme-picker-label">Theme</p>
      <div
        role="radiogroup"
        aria-labelledby="theme-picker-label"
        aria-disabled={disabled}
        className="mt-2 grid grid-cols-3 gap-2"
      >
        {THEME_OPTIONS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={theme === id}
            disabled={disabled}
            onClick={() => { setTheme(id) }}
            className={[
              'min-h-12 rounded-full border px-3 py-2 text-sm font-semibold transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2',
              theme === id
                ? 'border-teal-400 bg-teal-100 text-teal-900'
                : 'border-teal-200 bg-white text-teal-800 hover:bg-teal-50 active:bg-teal-100',
              disabled ? 'opacity-45 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {LABELS[id]}
          </button>
        ))}
      </div>
    </div>
  )
}
```

Why this shape:
- 6 options × `grid-cols-3` = 2 rows × 3 columns — fits the modal width (`max-w-md` per `SettingsDialog.tsx:77`) on mobile and desktop.
- `role='radiogroup'` + `role='radio'` + `aria-checked` provides correct semantics for single-select; screen readers announce "Theme, radio group, Dark selected".
- The `aria-disabled` at group level + `disabled` at each button provides defense-in-depth gating (mirrors Phase 6 LearnAnchor D-03 "disable not hide").
- 44×44 hit area (`min-h-12` = 48px, with horizontal padding) satisfies the existing 44×44 floor (carried from VARIANT-06 / from Phase 2 D-12).
- Visual style matches existing close-button shape at `SettingsDialog.tsx:91` and `SessionControls` buttons — coheres with the dialog.

**Arrow-key navigation:** Native `role='radiogroup'` does NOT automatically wire arrow keys (browsers don't natively trap arrows for radio-roled buttons; only native `<input type="radio">` gets that). If arrow-key nav matters: add a `onKeyDown` handler at the group level that intercepts `ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown` and shifts focus. **Recommendation: defer.** Phase 6 LearnAnchor and Phase 15 SettingsAnchor use plain Tab navigation without arrow-key augmentation. Consistency with existing focus model trumps the extra a11y polish for this milestone. Add it as a deferred polish item if real-device UAT surfaces friction.

## Sources

### Primary (HIGH confidence)

- [W3C WCAG 2.1 — relative luminance](https://www.w3.org/TR/WCAG21/relative-luminance.html) — official formula (`L = 0.2126*R + 0.7152*G + 0.0722*B`, with sRGB → linear piecewise).
- [W3C WCAG 2.0 G17 — contrast ratio formula](https://www.w3.org/TR/WCAG20-TECHS/G17.html) — `(L1 + 0.05) / (L2 + 0.05)`.
- [Tailwind v4 — Theme variables](https://tailwindcss.com/docs/theme) — `@theme` directive semantics, generated CSS variables, `@theme inline` distinction.
- [Tailwind v4 — Functions and directives](https://tailwindcss.com/docs/functions-and-directives) — `@theme` and `@custom-variant` reference.
- [MDN — Window: getComputedStyle()](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle) — returns resolved values after stylesheet application.
- [MDN — Using CSS custom properties (variables)](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties) — cascade rules for custom properties.
- [MDN — StorageEvent](https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent) — "only fired for a Window other than the one that caused the change".
- [WHATWG HTML — Scripting](https://html.spec.whatwg.org/multipage/scripting.html) — synchronous classic script blocking, module script defer-by-default.
- Empirical session probe (`src/styles/jsdom-probe.test.ts` — created, run, removed in this research session) — verifies jsdom 29.1.1 cascade resolution, `@theme` drop, `var()` non-substitution in gradients.
- `src/hooks/usePrefersReducedMotion.ts` (full file) — literal template for `useTheme` mql lifecycle.
- `src/app/App.tsx:116-126` — literal template for `useTheme` cross-tab `'storage'` listener.
- `src/app/App.persistence.test.tsx:340-358` — literal template for synthetic `StorageEvent` dispatch in tests.
- `src/storage/prefs.ts:68-75` — `loadPrefs` / `savePrefs` API consumed verbatim.
- `src/domain/settings.ts:53-61` — `ThemeId` / `THEME_OPTIONS` / `DEFAULT_THEME` consumed verbatim.

### Secondary (MEDIUM confidence)

- [Tailwind v4 Discussion #15199 — data-theme with @theme](https://github.com/tailwindlabs/tailwindcss/discussions/15199) — community guidance on `@theme inline` vs plain CSS overrides.
- [Tailwind v4 Discussion #15600 — multiple themes](https://github.com/tailwindlabs/tailwindcss/discussions/15600) — recommended `@theme inline + plain :root override` pattern.
- [Astro dark mode FOUC with Tailwind CSS](https://www.danielnewton.dev/blog/dark-mode-astro-tailwind-fouc/) — canonical synchronous-inline-script pattern.
- [Vite features](https://vite.dev/guide/features) — CSS handling, HTML entry points.
- [Neil Bickford — Computing WCAG Contrast Ratios](https://www.neilbickford.com/blog/2020/10/18/computing-wcag-contrast-ratios/) — JS implementation walkthrough.
- [jsdom #2166 — linear-gradient parsed as invalid](https://github.com/jsdom/jsdom/issues/2166) — old cssstyle bug; superseded by jsdom 29's csstree-based parser but still informs the anti-pattern.
- [cssstyle #148 — linear-gradient invalid](https://github.com/jsdom/cssstyle/issues/148) — historical context for the parsing-the-gradient-string anti-pattern.
- [Vitest #1689 — styles from imported CSS not available](https://github.com/vitest-dev/vitest/issues/1689) — Vitest does not inject imported CSS into jsdom.
- [Tailwind #18952 — @tailwindcss/vite not working with vitest](https://github.com/tailwindlabs/tailwindcss/issues/18952) — confirms Vite Tailwind plugin doesn't process CSS in test runs.
- [Vitest Discussion #6488 — testing CustomEvent dispatch](https://github.com/vitest-dev/vitest/discussions/6488) — Vitest+RTL pattern for CustomEvent assertions.
- [happy-dom vs jsdom (2026)](https://www.pkgpulse.com/guides/happy-dom-vs-jsdom-2026) — comparison; both have CSS resolution gaps but jsdom 29 is the better bet for Phase 16's needs.

### Tertiary (LOW confidence)

- None — every claim in this research is verified via primary docs OR via the in-session empirical probe.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; versions verified via package.json + `npm view`.
- Architecture: HIGH — every pattern mirrors an existing project pattern (Phase 2 mql, Phase 8 storage, Phase 4 prefs).
- Pitfalls: HIGH — the jsdom cascade behavior, `@theme` drop, and `var()` non-substitution were all verified empirically in this session, not assumed from training data.
- THEME-05 test strategy: HIGH — empirically verified end-to-end with rewritten `@theme` injection, override block cascade, and computed-property reads.
- WCAG luminance math: HIGH — formula from official W3C spec, cross-verified with multiple secondary sources.
- FOUC script placement: HIGH — WHATWG spec guarantees synchronous head-script execution order.
- Custom event detail shape recommendation: MEDIUM — defensible reasoning for `{ key, value }` shape; but until Phase 17/18/19 confirms reuse, this is a forward-looking judgment call.
- Picker UI shape recommendation: MEDIUM — radio-button-group with `role='radiogroup'` is the standard pattern, but the project's other pickers (Phase 15 stubs, Phase 1 SettingsStepper) use different shapes — the planner may legitimately pick a different control.

**Research date:** 2026-05-12
**Valid until:** 2026-06-11 (30-day estimate for stable stack — Tailwind v4.3.0 is current, jsdom 29.1.1 is current, Vitest 4.1.5 is current)
