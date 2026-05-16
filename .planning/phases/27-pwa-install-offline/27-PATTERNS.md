# Phase 27: PWA Install & Offline - Pattern Map

**Mapped:** 2026-05-16
**Files analyzed:** 5 (2 modified, 1 devDependency add, 5 new static assets)
**Analogs found:** 3 / 5 (vite.config.ts, index.html, package.json have direct analogs; public/ PNGs and src/main.tsx "no-change" are static/documented)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `vite.config.ts` | config | build-time transform | `vite.config.ts` (self — existing file) | exact (modification) |
| `index.html` | config / entry | request-response (HTML delivery) | `index.html` (self — existing file) | exact (modification) |
| `package.json` | config | build-time | `package.json` (self — existing file) | exact (modification) |
| `public/pwa-192x192.png` | static asset | file-I/O (served as-is) | `public/favicon.svg` | partial (same static-asset role, different format) |
| `public/pwa-512x512.png` | static asset | file-I/O | `public/favicon.svg` | partial |
| `public/pwa-maskable-192x192.png` | static asset | file-I/O | `public/favicon.svg` | partial |
| `public/pwa-maskable-512x512.png` | static asset | file-I/O | `public/favicon.svg` | partial |
| `public/apple-touch-icon.png` | static asset | file-I/O | `public/favicon.svg` | partial |
| `src/main.tsx` | entrypoint | request-response | `src/main.tsx` (self — NO CHANGE) | n/a |

---

## Pattern Assignments

### `vite.config.ts` (config, build-time transform)

**Analog:** `vite.config.ts` — existing file being modified, not replaced.

**Current file** (lines 1-14):
```typescript
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  base: '/hrv/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
  },
})
```

**Plugin registration pattern to copy:** Add `VitePWA` as the third element of `plugins[]`, after `react()` and `tailwindcss()`. The import goes in the existing import block. The `test` section is unchanged.

**Target pattern** (full modified file):
```typescript
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/hrv/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-192x192.png',
        'pwa-maskable-512x512.png',
      ],
      manifest: {
        name: 'HRV Breathing',
        short_name: 'HRV Breathing',
        description: 'Guided HRV breathing sessions — inhale, exhale, relax.',
        theme_color: '#5e81ac',
        background_color: '#eceff4',
        display: 'standalone',
        // start_url and scope intentionally omitted — auto-default to Vite base '/hrv/'
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,wasm,css,html,png,svg}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
  },
})
```

**Critical constraints:**
- Icon `src` values MUST be relative (no leading `/`) — absolute paths resolve to server root and 404 under `/hrv/`.
- `start_url` / `scope` MUST be omitted — the plugin reads `viteConfig.base` automatically; explicit overrides are redundant and fragile.
- Do NOT add `virtual:pwa-register` import anywhere — the reload logic lives inside the virtual module client code. Omitting the import means no mid-session reload.
- `cleanupOutdatedCaches: true` satisfies D-04 (stale shell purge on update).

---

### `index.html` (config / entry, request-response)

**Analog:** `index.html` — existing file being modified.

**Current file** (lines 1-16):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- Phase 16 THEME-04: pre-paint theme attribute. SYNC WITH src/storage/storage.ts STATE_KEY. -->
    <!-- SYNC WITH src/styles/faviconPalette.ts FAVICON_COLORS / src/styles/theme.css --color-breathing-accent-strong -->
    <script>(function(){...})();</script>
    <title>HRV Breathing</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Existing `%BASE_URL%` pattern** (line 5):
```html
<link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />
```
This is Phase 12 D-04 — all static asset hrefs in `<head>` use `%BASE_URL%` so they survive any future `base` change. The new Apple touch icon link MUST follow the same pattern.

**Tags to add** (insert after existing `<link rel="icon">`, before the pre-paint `<script>`):
```html
<!-- PWA: plugin auto-injects <link rel="manifest"> at build time — DO NOT add here -->

<!-- iOS install icon — MUST use %BASE_URL% (Phase 12 D-04 pattern) -->
<link rel="apple-touch-icon" href="%BASE_URL%apple-touch-icon.png" sizes="180x180">

<!-- iOS standalone mode -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="HRV Breathing">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

<!-- Chrome/Android browser tab + PWA theme color -->
<meta name="theme-color" content="#5e81ac">
```

**Critical constraint:** Do NOT add `<link rel="manifest">` manually — the plugin injects it at build time via `transformIndexHtml`. Duplicating it creates two manifest links.

---

### `package.json` (config, build-time)

**Analog:** `package.json` — existing file, single-line `devDependencies` addition.

**Current `devDependencies` block** (lines 18-37):
```json
"devDependencies": {
    "@eslint/js": "^10.0.1",
    "@tailwindcss/vite": "^4.3.0",
    ...
    "vite": "^8.0.10",
    "vitest": "^4.1.5"
  }
```

**Change:** Add `"vite-plugin-pwa": "^1.3.0"` to `devDependencies` only. `dependencies` stays exactly `react` + `react-dom` (D-02 zero net-new-runtime-deps invariant).

**Install command (not a file edit — run before editing):**
```bash
npm install --save-dev vite-plugin-pwa
```
`npm install --save-dev` modifies `package.json` and `package-lock.json` in one step. Do not hand-edit the version string; let npm resolve it.

---

### `public/` static icon assets (5 new PNG files)

**Analog:** `public/favicon.svg` — the only existing static asset in `public/`. It is the visual reference for icon artwork.

**Existing favicon source** (`public/favicon.svg`, line 1):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#0f766e"/></svg>
```
The favicon is a 32×32 canvas with a circle `r="14"` centered at `cx="16" cy="16"`. The fill color is teal `#0f766e` (the app's default-theme orb color). The install icons should use `#5e81ac` (light accent / `theme_color`) for install-identity consistency.

**Files to create:**

| File | Size | Description |
|---|---|---|
| `public/pwa-192x192.png` | 192×192 | Standard PWA icon; orb fills canvas |
| `public/pwa-512x512.png` | 512×512 | Standard PWA icon; orb fills canvas |
| `public/pwa-maskable-192x192.png` | 192×192 | Maskable variant; orb within 80% safe zone; colored background |
| `public/pwa-maskable-512x512.png` | 512×512 | Maskable variant; orb within 80% safe zone; colored background |
| `public/apple-touch-icon.png` | 180×180 | iOS install icon; same visual as standard icon |

**SVG source for PNG rasterization:**

Standard (non-maskable) — orb fills canvas, no padding required:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="240" fill="#5e81ac"/>
</svg>
```
Scale down to 192×192 for the 192px variant, 180×180 for apple-touch-icon.

Maskable variant — safe zone is inner 80% of canvas (409.6px diameter at 512px). Orb must fit within `r=205`. Background fills the full canvas (required by maskable spec):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#eceff4"/>
  <circle cx="256" cy="256" r="185" fill="#5e81ac"/>
</svg>
```
Scale down to 192×192 for the 192px maskable variant.

**Rasterization workflow:** Render each SVG at the target canvas size and export as PNG. Any SVG-to-PNG tool works (Inkscape CLI, browser screenshot, `sharp`, `resvg`). The output files must be placed directly in `public/` with the exact filenames listed above.

---

### `src/main.tsx` (entrypoint — NO CHANGE)

**Analog:** `src/main.tsx` — this file is the analog and the constraint.

**Current file** (lines 1-12):
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'

const rootEl = document.getElementById('root')
if (rootEl === null) throw new Error('Root element #root not found in index.html')
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Action:** No modification. The plugin's `injectRegister: 'auto'` injects `<script src="/hrv/registerSW.js">` into the built `index.html` at build time. That script handles SW registration without any import in `main.tsx`.

**Critical constraint:** Do NOT add `import { registerSW } from 'virtual:pwa-register'` or `import { useRegisterSW } from 'virtual:pwa-register/react'` to this file. Either import would activate the virtual module's `activated` event listener, which calls `window.location.reload()` when `isUpdate === true` — interrupting a running breathing session.

---

## Shared Patterns

### `%BASE_URL%` substitution (Phase 12 D-04)

**Source:** `index.html` line 5
**Apply to:** All new `<link>` and `<meta>` tags in `index.html` that reference `public/` assets

```html
<link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />
<!-- Pattern: href="%BASE_URL%<filename>" — Vite substitutes the base path at build time -->
<!-- New tag follows this pattern: -->
<link rel="apple-touch-icon" href="%BASE_URL%apple-touch-icon.png" sizes="180x180">
```

### Plugin registration in `plugins[]` array

**Source:** `vite.config.ts` line 8
**Apply to:** `VitePWA()` insertion in `vite.config.ts`

```typescript
plugins: [react(), tailwindcss()],
// Modified to:
plugins: [
  react(),
  tailwindcss(),
  VitePWA({ ... }),
],
```
Multiline expansion of `plugins[]` is idiomatic when a third plugin with a substantial config object is added.

### devDependencies-only placement (D-02 invariant)

**Source:** `package.json` lines 14-17
**Apply to:** `vite-plugin-pwa` package.json placement

```json
"dependencies": {
  "react": "^19.2.5",
  "react-dom": "^19.2.5"
},
```
`dependencies` must remain exactly these two packages. `vite-plugin-pwa` (and its transitive `workbox-build`, `workbox-window`) is build-time only and MUST appear in `devDependencies`.

### Green-gate verification (per-commit invariant)

**Source:** `package.json` scripts block (lines 6-12)
**Apply to:** Every commit during Phase 27

```json
"scripts": {
  "build": "tsc -b && vite build",
  "test:run": "vitest run",
  "lint": "eslint ."
}
```
Each commit must pass: `tsc -b && eslint . && vite build && vitest run`. The PWA additions must not break TypeScript compilation, ESLint, the build, or existing tests. The `vite build` step is especially important because it runs the plugin and verifies the manifest and SW are generated without errors.

---

## No Analog Found

No files fall into this category. All files being modified (`vite.config.ts`, `index.html`, `package.json`) are self-analogs (modifications to existing files). The static icon PNGs have no PNG analog but their visual specification is fully defined by the SVG excerpt above and the maskable safe-zone rule. `src/main.tsx` requires no change.

The RESEARCH.md Code Examples section provides complete, verified reference patterns for every integration point.

---

## Metadata

**Analog search scope:** `/Users/lucindo/Code/hrv/` — root config files, `public/`, `src/`
**Files scanned:** `vite.config.ts`, `index.html`, `package.json`, `public/favicon.svg`, `src/main.tsx`
**Pattern extraction date:** 2026-05-16
