# Phase 27: PWA Install & Offline - Research

**Researched:** 2026-05-16
**Domain:** Progressive Web App — vite-plugin-pwa, Workbox generateSW, Web App Manifest, iOS Safari PWA
**Confidence:** HIGH (stack verified, plugin source read, virtual-module client code read, sw registration behavior verified)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use `vite-plugin-pwa` in `generateSW` mode — Workbox auto-generates the service worker from a precache glob. No hand-written service worker.
- **D-02:** `vite-plugin-pwa` enters as a build-time (`devDependencies`) dependency only. `dependencies` stays exactly `react` + `react-dom`.
- **D-03:** `registerType: 'autoUpdate'` — silent auto-update, no UI. A running session is never touched (the page keeps its old JS until a reload).
- **D-04:** `cleanupOutdatedCaches` enabled.
- **D-05:** Manifest `name` = `"HRV Breathing"`.
- **D-06:** Manifest `short_name` = `"HRV Breathing"`.
- **D-07:** Manifest `theme_color` = `#5e81ac` (light accent); `background_color` = light surface. Static single set.
- **D-08 (numbering from CONTEXT):** Manifest `start_url`/`scope` must match the `/hrv/` Vite `base`. Dominant risk.
- **D-09 (numbering from CONTEXT):** No offline indicator — zero net-new UI.
- **D-10 (numbering from CONTEXT):** iOS < 18.4 Wake Lock limitation documented as known limitation in README only. No runtime detection or warning UI.
- **Install icon artwork (Claude's Discretion):** Static, neutral, single icon set: 192px + 512px PNG, maskable safe-zone-padded variant, 180px Apple touch icon; orb-based, lands in `public/`.
- **Precache glob scope (Claude's Discretion):** generateSW default glob; runtime-generated audio and `data:`-URI dynamic favicon need no precaching.

### Claude's Discretion

- Exact icon artwork design (orb-based, neutral, consistent with `public/favicon.svg` circle).
- `globPatterns` specifics — researcher and planner confirm the default covers the shell.

### Deferred Ideas (OUT OF SCOPE)

- Per-theme PWA install icons.
- Runtime caching beyond the app shell.
- In-app custom PWA install button / prompt UX.
- In-app offline indicator.
- In-app Wake Lock warning UI.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PWA-01 | User can install the app to their home screen / desktop — Web App Manifest with correct `start_url`/`scope` for the `/hrv/` base path, maskable icons, and an Apple touch icon. | Manifest auto-defaults `start_url` and `scope` to Vite `base` (`/hrv/`); icon paths must be relative (not absolute) to resolve under subdirectory; Apple touch icon requires hand-authoring `<link>` in `index.html` (plugin does NOT inject it automatically). |
| PWA-02 | User can run a started breathing session fully offline — a service worker precaches the app shell and all static assets. | `generateSW` with default `globPatterns: ['**/*.{js,wasm,css,html}']` covers the full Vite build output; icons in `public/` added via `includeAssets`; runtime-generated audio (Web Audio API) and `data:`-URI favicon need no precaching. |
| PWA-03 | The installed app updates to the latest deployed version without serving a stale app shell, and an update never interrupts a running breathing session. | `autoUpdate` mode fires `window.location.reload()` ONLY when the virtual module is imported; using `injectRegister: 'auto'` WITHOUT importing the virtual module means SW activates silently (new SW takes control via `skipWaiting`+`clientsClaim`) but the current page is NOT reloaded — it keeps old JS until user next opens the app. `cleanupOutdatedCaches: true` (already the Workbox default, just confirmed explicit). |

</phase_requirements>

---

## Summary

Phase 27 adds PWA installability and full offline capability to the HRV breathing app via `vite-plugin-pwa@1.3.0` (Vite 8 peer dep confirmed), operating in `generateSW` mode with `registerType: 'autoUpdate'`. The build system generates the service worker automatically from a precache glob; no hand-written SW code is required.

The dominant risk — confirmed by source-code inspection — is the icon `src` path in the manifest. Paths written as `/pwa-192x192.png` resolve to the server root (missing `/hrv/`) while relative paths `pwa-192x192.png` correctly resolve under the manifest's own URL (`/hrv/manifest.webmanifest`). The `scope` and `start_url` fields auto-default to Vite's `base` value (`/hrv/`) and do NOT need explicit overrides. The plugin automatically injects the `<link rel="manifest">` tag into `index.html` at build time — it must NOT be hand-added. The `<link rel="apple-touch-icon">` and all `apple-mobile-web-app-*` meta tags MUST be hand-added to `index.html`.

The session-interruption concern with `autoUpdate` is resolved by a deliberate implementation choice: do NOT import the `virtual:pwa-register` module. The reload logic (`window.location.reload()`) lives in the virtual module's client code; when the virtual module is absent, the plugin falls back to `injectRegister: 'script'` which only registers the SW. The SW activates silently via `skipWaiting`+`clientsClaim` but the current page is NEVER reloaded mid-session. The updated shell is served on the next app open.

The iOS Wake Lock limitation in standalone PWA mode (WebKit bug 254545) was fixed in iOS 18.4 (shipped 2025-03-31). iOS < 18.4 devices cannot use Wake Lock in standalone mode — document as known limitation.

**Primary recommendation:** Use `vite-plugin-pwa@1.3.0` in `devDependencies`, `generateSW` strategy, `registerType: 'autoUpdate'`, do NOT import virtual:pwa-register, use relative icon `src` paths, and hand-add iOS meta tags to `index.html`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Web App Manifest generation | Build tool (vite-plugin-pwa) | — | Plugin generates `manifest.webmanifest` from config at build time |
| Service worker generation | Build tool (Workbox via plugin) | — | `generateSW` mode; no runtime hand-written SW |
| Service worker registration | Browser (auto-injected script) | — | `injectRegister: 'auto'` injects `<script src="registerSW.js">` into HTML |
| Precache of static assets | Service worker (Workbox runtime) | — | SW intercepts fetches; serves from cache when offline |
| Install icon artwork | Static assets (`public/`) | — | PNGs placed in `public/`, referenced by manifest at relative paths |
| iOS meta tags (standalone behavior) | HTML entry point (`index.html`) | — | Plugin does NOT inject these; must be hand-authored |
| Manifest `<link>` injection | Build tool (vite-plugin-pwa) | — | Plugin auto-injects `<link rel="manifest">` into built HTML |
| Wake Lock (standalone iOS < 18.4) | Documentation only | — | API unavailable in standalone mode pre-18.4; document as limitation |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite-plugin-pwa | 1.3.0 | Generates SW + manifest at build time | Officially supports Vite 8 (peer dep: `^8.0.0`); published 2026-05-05; zero-config generateSW mode |
| workbox-build | 7.4.1 | Underlying SW generation (bundled by plugin) | Peer dep of vite-plugin-pwa; same version Google uses for Workbox CLI |
| workbox-window | 7.4.1 | SW registration client library (bundled by plugin) | Same peer dep; MUST be in `devDependencies` only |

[VERIFIED: npm registry — `npm view vite-plugin-pwa version` → `1.3.0`, peerDeps include `vite: '^3.1.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0'`]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vite-pwa/assets-generator | ^1.0.0 | Programmatic icon generation | Optional — NOT used in this phase; icons are manually created as PNGs |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual PWA icon PNGs | `@vite-pwa/assets-generator` | Generator requires source SVG at ≥512px; overkill for a single icon set; manual gives exact control |
| `injectRegister: 'auto'` (recommended) | `injectRegister: 'script'` or `'inline'` | All three result in the same behavior when no virtual module is imported; `auto` is idiomatic |

**Installation:**
```bash
npm install --save-dev vite-plugin-pwa
```

**Version verification:** [VERIFIED: `npm view vite-plugin-pwa version` → `1.3.0`, published 2026-05-05]

---

## Architecture Patterns

### System Architecture Diagram

```
User Opens App
     │
     ▼
Browser fetches /hrv/ (GitHub Pages / host)
     │
     ├── First load: No SW → server delivers index.html + assets
     │        │
     │        └── SW installs → precaches all shell assets
     │
     └── Subsequent load: SW scope /hrv/ intercepts navigation
              │
              ├── Assets in precache → serve from cache (OFFLINE OK)
              └── SW update check runs in background
                       │
                       ├── No update → session continues normally
                       └── Update available → new SW installs silently
                                  │
                                  ├── skipWaiting → new SW activates
                                  ├── clientsClaim → new SW takes control
                                  └── NO location.reload() (no virtual module imported)
                                           │
                                           └── Next app open → new SW serves updated shell
```

### Recommended Project Structure (additions only)

```
public/
├── favicon.svg          # existing — visual reference for icon artwork
├── pwa-192x192.png      # NEW — standard PWA icon
├── pwa-512x512.png      # NEW — standard + splash PWA icon
├── pwa-maskable-192x192.png  # NEW — maskable safe-zone variant (192px)
├── pwa-maskable-512x512.png  # NEW — maskable safe-zone variant (512px)
└── apple-touch-icon.png # NEW — 180px Apple touch icon

src/
└── (no new files — SW registration handled by plugin's injected script)

vite.config.ts           # MODIFIED — add VitePWA() plugin
index.html               # MODIFIED — add iOS meta tags + apple-touch-icon link
```

### Pattern 1: VitePWA() Plugin Configuration

**What:** Register `vite-plugin-pwa` in `vite.config.ts` with `generateSW` strategy.
**When to use:** Single build step; no custom SW routing logic needed.
**Example:**
```typescript
// Source: vite-plugin-pwa source code analysis + Context7 docs
// File: vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/hrv/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'generateSW',      // default; explicit for clarity
      registerType: 'autoUpdate',     // D-03
      // Do NOT import virtual:pwa-register — reload is in the virtual module
      // Without the import, injectRegister falls back to 'script' automatically
      injectRegister: 'auto',         // injects <script src="registerSW.js"> if no virtual import

      // Assets to include in precache beyond the build glob
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-192x192.png',
        'pwa-maskable-512x512.png',
      ],

      manifest: {
        name: 'HRV Breathing',        // D-05
        short_name: 'HRV Breathing',  // D-06
        description: 'Guided HRV breathing sessions — inhale, exhale, relax.',
        theme_color: '#5e81ac',       // D-07: light accent
        background_color: '#eceff4',  // D-07: light surface (Nord Snow Storm 0)
        display: 'standalone',
        // start_url and scope intentionally omitted — they default to Vite's base
        // ('/hrv/'), which is the correct value. Explicit redundancy is avoided.
        icons: [
          {
            src: 'pwa-192x192.png',   // RELATIVE path — resolves under /hrv/
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',   // RELATIVE path
            sizes: '512x512',
            type: 'image/png',
          },
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
        // Default globPatterns: ['**/*.{js,wasm,css,html}']
        // Extend to include icon PNGs and SVG
        globPatterns: ['**/*.{js,wasm,css,html,png,svg}'],
        cleanupOutdatedCaches: true,    // D-04
        // navigateFallback: 'index.html' is the plugin default — correct for SPA
        // skipWaiting + clientsClaim are auto-set by registerType: 'autoUpdate'
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

### Pattern 2: iOS PWA Meta Tags in index.html

**What:** Hand-authored meta tags for iOS standalone mode install quality.
**When to use:** Required — vite-plugin-pwa does NOT inject these.
**Example:**
```html
<!-- Source: vite-plugin-pwa minimal requirements docs + MDN -->
<head>
  <!-- Existing favicon and theme script ... -->

  <!-- PWA: plugin auto-injects <link rel="manifest"> at build — DO NOT hand-add -->

  <!-- iOS install icon — MUST use %BASE_URL% to survive any base change -->
  <link rel="apple-touch-icon" href="%BASE_URL%apple-touch-icon.png" sizes="180x180">

  <!-- iOS standalone mode identity -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="HRV Breathing">
  <!-- Status bar: 'default' = white; 'black' = black; 'black-translucent' = transparent -->
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

  <!-- Android/Chrome theme color -->
  <meta name="theme-color" content="#5e81ac">
  <!-- iOS PWA name (fallback) -->
  <meta name="application-name" content="HRV Breathing">
</head>
```

### Pattern 3: Service Worker Registration (NO virtual module import)

**What:** Do NOT import `virtual:pwa-register` or `virtual:pwa-register/react`.
**When to use:** Required for D-03 "session never interrupted" — the reload lives in the virtual module.
**Example:**
```typescript
// src/main.tsx — NO change needed
// The plugin injects <script src="/hrv/registerSW.js"> into the built HTML via injectRegister: 'auto'
// That script registers the SW but does NOT call window.location.reload() on update.
// Importing the virtual module would trigger location.reload() on sw 'activated' event.
// Therefore: do NOT add any virtual:pwa-register import to src/main.tsx.
```

### Pattern 4: Maskable Icon Safe Zone

**What:** Maskable icons require content within the inner 80% circle ("safe zone") — the OS clips the outer 10% on each edge to create shape-masks.
**When to use:** Required for `purpose: 'maskable'` icons to display correctly on Android/Chrome.
**Specification:**
- Canvas: 192×192 px (or 512×512 px)
- Safe zone: center circle of diameter = 80% of canvas = 153.6px (192) or 409.6px (512)
- The orb SVG from `public/favicon.svg` is a circle with `r="14"` on a 32×32 canvas → center `cx="16" cy="16"`
- Scale up with adequate padding: place a colored circle at center occupying ≤80% of canvas

### Anti-Patterns to Avoid

- **Absolute icon src paths:** `src: '/pwa-192x192.png'` resolves to the server root (not `/hrv/pwa-192x192.png`). Use `src: 'pwa-192x192.png'` (relative path — resolves relative to manifest location at `/hrv/manifest.webmanifest`). [VERIFIED: plugin source `src/assets.ts` reads icon src paths as-is; `src/api.ts` serializes manifest as raw JSON]
- **Importing virtual:pwa-register in a session-based app:** The virtual module's `activated` event listener calls `window.location.reload()`. This interrupts any running session. Do not import it.
- **Hand-adding `<link rel="manifest">`:** The plugin injects this at build time via `transformIndexHtml`. Adding it manually creates a duplicate. [VERIFIED: plugin `src/html.ts` `generateWebManifest` function injects the link]
- **Explicit `start_url: '/hrv/'` + `scope: '/hrv/'` in config:** These are the auto-defaults from Vite's `base`. Writing them explicitly is redundant but harmless. They are included in the config example above as comments only.
- **Setting `navigateFallback: '/hrv/index.html'`:** The default `'index.html'` is relative to the SW scope; Workbox resolves it correctly as `/hrv/index.html` when scope is `/hrv/`. Overriding with the absolute path also works, but the default is correct.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker precaching | Custom fetch event listener + cache strategy | Workbox (via vite-plugin-pwa generateSW) | Cache versioning, cleanup, hash-busting, update detection — all non-trivial |
| Manifest generation | Manual `manifest.webmanifest` file | VitePWA manifest config | Plugin links manifest to build, injects `<link>`, keeps it in sync with Vite base |
| SW registration | Manual `navigator.serviceWorker.register()` in HTML | `injectRegister: 'auto'` | Plugin-injected `registerSW.js` handles scope, type, and workbox-window wiring |
| Maskable icon generation | Canvas API or manual Photoshop export | Manually create PNG with correct safe-zone margins | For a single orb icon, manual creation is faster than setting up `@vite-pwa/assets-generator` |

**Key insight:** The entire SW lifecycle (install, activate, precache, cleanup, update detection) is generated boilerplate — Workbox encodes years of correctness lessons that are easy to get wrong manually (cache versioning, stale-while-revalidate nuance, update race conditions).

---

## Common Pitfalls

### Pitfall 1: Absolute icon paths in manifest

**What goes wrong:** Icons at `/pwa-192x192.png` resolve to the server root. The browser requests `https://lucindo.github.io/pwa-192x192.png` (404) instead of `https://lucindo.github.io/hrv/pwa-192x192.png`.
**Why it happens:** Manifest icon `src` values are serialized as-is by the plugin. The plugin does NOT prepend the base path. [VERIFIED: plugin source `src/api.ts` → `generateWebManifestFile` = `JSON.stringify(options.manifest)`]
**How to avoid:** Use RELATIVE paths (`pwa-192x192.png`, not `/pwa-192x192.png`). The manifest is served at `/hrv/manifest.webmanifest`, so relative paths resolve correctly under `/hrv/`.
**Warning signs:** Browser DevTools → Application → Manifest shows icon load errors.

### Pitfall 2: Importing virtual:pwa-register causes session reload

**What goes wrong:** A running breathing session is interrupted mid-breath by a hard reload.
**Why it happens:** The `registerSW` function from `virtual:pwa-register` attaches an `activated` event listener that calls `window.location.reload()` when `event.isUpdate === true`. [VERIFIED: plugin source `/dist/client/build/register.js` inspected directly]
**How to avoid:** Do NOT import `virtual:pwa-register` or `virtual:pwa-register/react` anywhere in `src/`. The `injectRegister: 'auto'` fallback injects a simple `registerSW.js` script that only calls `navigator.serviceWorker.register()` without reload logic.
**Warning signs:** App reloads during a session when the SW updates.

### Pitfall 3: Service worker scope mismatch

**What goes wrong:** SW registered with scope `/` cannot control pages under `/hrv/`; PWA offline behavior silently broken.
**Why it happens:** If `VitePWA({ base: '/' })` or no base is provided, the SW gets scope `/` instead of `/hrv/`.
**How to avoid:** The plugin reads `viteConfig.base` automatically — `base: '/hrv/'` in `vite.config.ts` propagates to the SW scope. Do NOT override `scope` in the VitePWA config unless intentionally changing it.
**Warning signs:** DevTools → Application → Service Workers shows a SW with scope `/` when app is at `/hrv/`.

### Pitfall 4: Per-commit green gate: TypeScript and the virtual module ambient types

**What goes wrong:** `tsc -b` fails with "cannot find module 'virtual:pwa-register'" even though we're not importing it.
**Why it happens:** Only relevant if someone imports the virtual module and needs ambient types.
**How to avoid:** Since we are NOT importing `virtual:pwa-register`, no additional `/// <reference types="vite-plugin-pwa/client" />` or tsconfig adjustment is needed. [VERIFIED: `tsconfig.app.json` includes `"types": ["vite/client"]`; `vite/client` does not declare virtual:pwa-register; only needed if imported]
**Warning signs:** `tsc -b` errors about missing module on a virtual:pwa-register import.

### Pitfall 5: Stale shell served after failed SW update

**What goes wrong:** Old cached HTML serves stale JS hashes; app fails to load.
**Why it happens:** Old SW cache entries not cleaned up after update.
**How to avoid:** `cleanupOutdatedCaches: true` (D-04) — Workbox deletes precache entries from previous SW installations. This is actually the default in the plugin's workbox config (confirmed from source: `defaultWorkbox.cleanupOutdatedCaches: true`), but it is documented explicitly for clarity.
**Warning signs:** Console shows "Failed to fetch" for hashed asset URLs in an updated deployment.

### Pitfall 6: iOS Safari `apple-touch-icon` not found

**What goes wrong:** iOS shows a screenshot thumbnail at install time instead of the icon.
**Why it happens:** Apple ignores the manifest `icons` array for the install icon on iOS. It reads `<link rel="apple-touch-icon">` from the HTML instead.
**How to avoid:** Hand-add `<link rel="apple-touch-icon" href="%BASE_URL%apple-touch-icon.png" sizes="180x180">` to `index.html`. Use `%BASE_URL%` consistent with the existing favicon pattern (Phase 12 D-04).
**Warning signs:** iOS home screen icon is a scaled-down screenshot rather than the app icon.

### Pitfall 7: Wake Lock broken in iOS standalone mode (< 18.4)

**What goes wrong:** Screen dims mid-session on iOS < 18.4 in standalone PWA mode.
**Why it happens:** WebKit bug 254545 — Wake Lock API did not work in Home Screen Web Apps prior to iOS 18.4. [VERIFIED: WebKit Bugzilla — bug fixed, iOS 18.4 shipped 2025-03-31]
**How to avoid:** Document as known limitation. The app already treats Wake Lock as progressive enhancement; this is consistent with that stance (D-09 in CONTEXT.md).
**Warning signs:** The app already handles Wake Lock unavailability gracefully (Phase 5 two-ref pattern).

---

## Code Examples

### Complete vite.config.ts with VitePWA

```typescript
// Source: vite-plugin-pwa source code (src/options.ts) + Context7 verified patterns
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

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
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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

### index.html additions (iOS PWA meta tags)

```html
<!-- Source: vite-plugin-pwa minimal requirements docs; Phase 12 D-04 %BASE_URL% pattern -->
<!-- Add to <head> after existing favicon <link> -->

<!-- Apple touch icon for iOS install (plugin does NOT inject this) -->
<link rel="apple-touch-icon" href="%BASE_URL%apple-touch-icon.png" sizes="180x180">

<!-- iOS standalone mode -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="HRV Breathing">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

<!-- Chrome/Android theme color (also used for browser tab color) -->
<meta name="theme-color" content="#5e81ac">
```

### Orb icon SVG for PNG rasterization

```svg
<!-- Source: public/favicon.svg scaled up; orb-based consistent with app visual -->
<!-- 512x512 canvas; orb fills 80% safe zone for maskable variant -->
<!-- Standard (non-maskable): fill entire canvas / no padding needed -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background for non-maskable: transparent or colored -->
  <!-- Orb circle: cx/cy=256 (center), r=220 (fills canvas without padding) -->
  <circle cx="256" cy="256" r="220" fill="#5e81ac"/>
</svg>

<!-- Maskable variant: safe zone = 80% of 512px = 409.6px radius = ~205px -->
<!-- Orb must fit within r=205 from center -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Colored background fills the full canvas (required for maskable) -->
  <rect width="512" height="512" fill="#eceff4"/>
  <!-- Orb within safe zone -->
  <circle cx="256" cy="256" r="185" fill="#5e81ac"/>
</svg>
```

---

## autoUpdate: Reload Behavior Deep-Dive

This section answers the specific concern in D-03 ("a running session is never touched").

### Mechanism (VERIFIED from plugin source)

The reload logic lives in the virtual module's client code (`/dist/client/build/register.js`):

```javascript
// Inside virtual:pwa-register's registerSW()
if (auto) {   // auto = registerType === 'autoUpdate'
  wb.addEventListener("activated", (event) => {
    if (event.isUpdate || event.isExternal) {
      if (onNeedReload)
        onNeedReload();
      else
        window.location.reload();  // <-- THIS IS THE RELOAD
    }
  });
}
```

**When NOT importing the virtual module:**
- `injectRegister: 'auto'` falls back to injecting `<script src="/hrv/registerSW.js">` in built HTML
- That script calls `navigator.serviceWorker.register('/hrv/sw.js', { scope: '/hrv/' })`
- It does NOT attach the `activated` event listener
- `skipWaiting: true` + `clientsClaim: true` (auto-set by `registerType: 'autoUpdate'`) cause the new SW to activate and take control silently
- **The page is NOT reloaded.** The current page continues running with old JS.
- On next app open (or manual refresh), the new SW serves the updated shell.

**Conclusion:** D-03 is satisfied by NOT importing `virtual:pwa-register`. The Workbox SW activates silently; the page keeps old JS for the duration of any running session.

### Session lifecycle across an update

1. User has app open, breathing session running.
2. A new build is deployed.
3. Browser checks for SW update in the background (≈ every 24h + on navigation).
4. New SW downloads, installs, activates (skipWaiting → activate immediately).
5. New SW claims control of the page (clientsClaim).
6. **The page is NOT reloaded** (no virtual module listener).
7. Session continues. The page keeps old cached JS.
8. User ends session, closes tab, reopens app → new SW serves updated shell.

---

## iOS Standalone PWA Specifics

### Required index.html tags for quality install experience

| Tag | Purpose | Notes |
|-----|---------|-------|
| `<link rel="apple-touch-icon">` | Install icon on iOS | Must be 180px PNG; plugin does NOT inject |
| `apple-mobile-web-app-capable` | Enables standalone mode | Still needed alongside manifest `display: standalone` |
| `apple-mobile-web-app-title` | App name in standalone header | Overrides manifest `name` |
| `apple-mobile-web-app-status-bar-style` | Status bar style | `black-translucent` lets app color show through |
| `theme-color` meta | Browser/Android tab color | Mirrors `theme_color` in manifest |

[VERIFIED: firt.dev iOS PWA compatibility notes; vite-plugin-pwa minimal requirements docs]

### iOS Wake Lock (standalone mode)

- **iOS < 16.4:** Wake Lock API not available in any context.
- **iOS 16.4 – 18.3:** Wake Lock API available in **browser** but NOT in standalone (Home Screen) PWA mode (WebKit bug 254545).
- **iOS ≥ 18.4:** Wake Lock API works in standalone mode. [VERIFIED: WebKit Bugzilla bug 254545, marked FIXED for iOS/iPadOS 18.4, shipped 2025-03-31]
- **Action:** Document in README that Wake Lock is unavailable in standalone mode on iOS < 18.4. No runtime detection or UI (D-09).

### iOS Standalone Mode Audio (existing behavior)

- The existing audio engine (Web Audio API, `cueSynth + lookaheadScheduler`) runs correctly in iOS standalone mode for active foreground sessions.
- Known carry-forward: OS-level audio session loss on lock/unlock (Override SC1 — v1.x carry-forward, not in scope for Phase 27).
- The real-device iOS UAT must verify audio plays correctly in the installed standalone PWA context.

### Real-Device iOS UAT Plan

The following cannot be tested in Vitest/jsdom and MUST be verified on a real iOS device:

| # | Scenario | Pass Criteria |
|---|----------|--------------|
| iOS-1 | Install via Safari Share → Add to Home Screen | App icon appears correctly; opens in standalone mode (no browser chrome) |
| iOS-2 | Launch from Home Screen, disable network, start session | Session runs; audio cues play; orb animates — fully offline |
| iOS-3 | Run a 2-minute session, then put device to sleep (no session interruption expected) | Session resumes correctly on wake if iOS ≥ 18.4; screen dims on iOS < 18.4 (documented behavior) |
| iOS-4 | Check app icon on Home Screen | Correct orb icon, not a screenshot thumbnail |
| iOS-5 | Check status bar in standalone mode | Theme color visible; no browser address bar |
| iOS-6 | Verify app name on Home Screen | Shows "HRV Breathing" |

---

## Precache Glob: What's Covered

The `generateSW` workbox default globPatterns is `['**/*.{js,wasm,css,html}']`.
[VERIFIED: Workbox documentation — developer.chrome.com/docs/workbox/reference/workbox-build/]

For this project, extending to `['**/*.{js,wasm,css,html,png,svg}']` covers:

| File Type | Example | Covered By |
|-----------|---------|------------|
| JS bundles | `assets/index-[hash].js` | `js` glob |
| CSS | `assets/index-[hash].css` | `css` glob |
| HTML shell | `index.html` | `html` glob |
| Static PNGs | `pwa-192x192.png`, `apple-touch-icon.png` | `png` glob (also in includeAssets) |
| SVG favicon | `favicon.svg` | `svg` glob (also in includeAssets) |
| Manifest | `manifest.webmanifest` | Added to precache automatically by plugin |

**NOT precached (correct):**
- Runtime-generated audio — synthesized via Web Audio API at session time; no file to cache.
- `data:` URI favicon — generated inline in the pre-paint script; no file fetch.
- `sw.js` itself — excluded by Workbox automatically.
- `registerSW.js` — excluded automatically.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-written `sw.js` with fetch listeners | Workbox generateSW (tool-generated precache) | ~2017 | Eliminates cache versioning bugs; one config key |
| `vite-plugin-pwa@0.x` | `vite-plugin-pwa@1.x` | 2025 | Vite 7/8 support; API stabilized |
| `purpose: 'any maskable'` (single icon entry) | Separate `purpose: 'any'` and `purpose: 'maskable'` entries | ~2022 | Better icon selection by OS; `any maskable` was shorthand |

**Deprecated/outdated:**
- `workbox-webpack-plugin`: replaced by `vite-plugin-pwa` for Vite projects.
- `apple-mobile-web-app-status-bar-style` with `theme-color` meta: status bar style replaced by `theme-color` meta on iOS 15+, but the `apple-mobile-web-app-status-bar-style` tag is still needed for control over translucency.

---

## Runtime State Inventory

> Greenfield PWA addition — no rename or migration. No runtime state affected.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — localStorage stores user prefs (not PWA state) | None |
| Live service config | None — no external services | None |
| OS-registered state | No existing SW registered at `/hrv/` | None (first install) |
| Secrets/env vars | None relevant to PWA | None |
| Build artifacts | `dist/` regenerated on every build | None |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install | ✓ | (project runs) | — |
| npm | Package install | ✓ | — | — |
| vite-plugin-pwa | Build step | ✗ (not yet installed) | 1.3.0 target | — |
| Real iOS device | iOS UAT | ASSUMED | — | iOS Simulator (limited: no SW in Simulator in XCode < 14) |

**Missing dependencies with no fallback:**
- `vite-plugin-pwa` — install step is Wave 0 task 1.

**Missing dependencies with fallback:**
- Real iOS device for UAT — iOS Simulator can verify install flow but may not fully simulate standalone-mode service worker behavior; real device preferred.

---

## Validation Architecture

> `workflow.nyquist_validation: true` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | `vite.config.ts` (test section) |
| Quick run command | `vitest run` |
| Full suite command | `vitest run` (single suite; 65 test files, 959 tests as of Phase 26) |

### What Is and Is NOT Testable in Vitest/jsdom

| Area | Testable in Vitest/jsdom | Reason |
|------|--------------------------|--------|
| Manifest JSON correctness | YES (snapshot / value test on config) | Config is a JS object; can be imported and asserted |
| `vite.config.ts` plugin registration | PARTIAL (type-check only) | Can assert VitePWA is in plugins array |
| Service worker registration | NO | No SW runtime in jsdom |
| Offline serving from precache | NO | Requires browser SW runtime |
| Install flow (Add to Home Screen) | NO | OS-level gesture |
| iOS standalone mode | NO | Requires real device |
| Wake Lock in standalone mode | NO | OS/browser capability |
| autoUpdate reload behavior | NO | Requires live SW + page |
| Green gate: `tsc -b` | YES | Verifies vite.config.ts compiles |
| Green gate: `vite build` | YES | Verifies plugin executes, manifest emitted |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PWA-01 | Web App Manifest exists with correct fields | build artifact check | `vite build && ls dist/manifest.webmanifest` | ❌ Wave 0 (build artifact assertion) |
| PWA-01 | `start_url` = `/hrv/` | build artifact check | Inspect `dist/manifest.webmanifest` content | ❌ Wave 0 |
| PWA-01 | `scope` = `/hrv/` | build artifact check | Inspect `dist/manifest.webmanifest` content | ❌ Wave 0 |
| PWA-01 | Icon files exist in dist | build artifact check | `ls dist/pwa-192x192.png dist/pwa-512x512.png` | ❌ Wave 0 |
| PWA-01 | `manifest.webmanifest` linked in built HTML | build artifact check | `grep 'manifest' dist/index.html` | ❌ Wave 0 |
| PWA-01 | Apple touch icon linked in index.html | unit test or file check | `grep apple-touch-icon dist/index.html` | ❌ Wave 0 |
| PWA-01 | iOS meta tags in built HTML | build artifact check | `grep apple-mobile-web-app dist/index.html` | ❌ Wave 0 |
| PWA-02 | SW file generated in dist | build artifact check | `ls dist/sw.js dist/workbox-*.js` | ❌ Wave 0 |
| PWA-02 | Audio not in precache | manual verification | Inspect SW precache manifest | Manual |
| PWA-03 | `cleanupOutdatedCaches` in generated SW | build artifact check | `grep cleanupOutdatedCaches dist/sw.js` | ❌ Wave 0 |
| PWA-03 | No `location.reload()` in registerSW.js | build artifact check | `grep -v location.reload dist/registerSW.js` | ❌ Wave 0 |
| PWA-01/02/03 | iOS standalone install + offline + audio | Real-device iOS UAT | Manual | Manual |

### Sampling Rate

- **Per task commit:** `tsc -b && eslint . && vite build && vitest run` (existing green-gate invariant)
- **Per wave merge:** Full suite `vitest run` (959+ tests must pass)
- **Phase gate:** Build artifact checks + real-device iOS UAT before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] Install `vite-plugin-pwa`: `npm install --save-dev vite-plugin-pwa`
- [ ] Create icon PNGs: `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/pwa-maskable-192x192.png`, `public/pwa-maskable-512x512.png`, `public/apple-touch-icon.png`
- [ ] No new Vitest test files required — PWA artifacts are verified as build artifacts, not unit-tested

---

## Security Domain

> `security_enforcement` not explicitly set to false — section required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in this app |
| V3 Session Management | no | No server-side session |
| V4 Access Control | no | No protected resources |
| V5 Input Validation | no | No new user input in Phase 27 |
| V6 Cryptography | no | SW precache hashes handled by Workbox |
| V9 Communications | yes | HTTPS required for SW registration; already enforced by host (GitHub Pages serves HTTPS only) |

### Known Threat Patterns for PWA Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SW serving stale/malicious cached content | Tampering | `cleanupOutdatedCaches: true`; Workbox cache integrity via URL hash busting |
| Manifest spoofing / misleading PWA identity | Spoofing | Manifest is a static build artifact; HTTPS host integrity |
| Offline cache poisoning | Tampering | Workbox precache only includes build-time hashed assets; no dynamic fetch |

**No new attack surface** is introduced by this phase beyond the standard PWA threat model. The app has no auth, no sensitive data, and no network requests beyond its own static assets.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Real iOS device is available for the Phase 27 UAT | Environment Availability | UAT cannot be completed; phase success criterion not met |
| A2 | `background_color: '#eceff4'` is the correct light surface color (Nord Snow Storm 0) | vite.config.ts example | Visual mismatch between splash screen and app background; fix is a one-line config change |
| A3 | `black-translucent` is the right iOS status bar style | index.html additions | Status bar may appear incorrectly; fix is a one-attribute change |

**All other claims in this research were verified or cited — no user confirmation needed.**

---

## Open Questions (RESOLVED)

1. **`background_color` exact hex value**
   - What we know: D-07 says "light-theme surface"; the light palette uses Nord Snow Storm 0 = `#eceff4`
   - What's unclear: The exact hex is not locked in CONTEXT.md — researcher chose `#eceff4` as the Nord light surface
   - Recommendation: [ASSUMED] Use `#eceff4` (Nord Snow Storm 0); operator can override with a one-line config change at review

2. **Icon artwork: color fill for the orb**
   - What we know: Claude's Discretion; orb-based; consistent with `public/favicon.svg` (teal `#0f766e` circle)
   - What's unclear: CONTEXT.md says "orb-based, neutral" but the favicon uses a teal fill, while the theme_color is `#5e81ac` (light accent blue)
   - Recommendation: [ASSUMED] Use `#5e81ac` (light accent, same as theme_color) for icon fill — creates visual consistency with the install identity. The existing favicon teal (`#0f766e`) is the default fallback color, not the design color.

---

## Sources

### Primary (HIGH confidence)

- [vite-plugin-pwa source — src/options.ts](https://raw.githubusercontent.com/vite-pwa/vite-plugin-pwa/main/src/options.ts) — default manifest fields, scope derivation, defaultWorkbox config, autoUpdate → skipWaiting+clientsClaim wiring [VERIFIED: source read directly]
- [vite-plugin-pwa source — src/html.ts](https://raw.githubusercontent.com/vite-pwa/vite-plugin-pwa/main/src/html.ts) — manifest link injection, registerSW script injection [VERIFIED: source read directly]
- [vite-plugin-pwa source — src/api.ts](https://raw.githubusercontent.com/vite-pwa/vite-plugin-pwa/main/src/api.ts) — manifest JSON serialization (no base-path prepending) [VERIFIED: source read directly]
- [vite-plugin-pwa dist — client/build/register.js](unpacked from npm) — complete virtual module client code showing reload is conditional on virtual module import [VERIFIED: npm pack + tar inspection]
- [npm registry — vite-plugin-pwa@1.3.0](https://www.npmjs.com/package/vite-plugin-pwa) — version 1.3.0, Vite 8 peer dep confirmed [VERIFIED: npm view]
- [WebKit Bugzilla 254545](https://bugs.webkit.org/show_bug.cgi?id=254545) — Wake Lock in standalone mode fixed in iOS 18.4 [VERIFIED: bug status FIXED]
- [Workbox docs — workbox-build reference](https://developer.chrome.com/docs/workbox/reference/workbox-build/) — default globPatterns `['**/*.{js,wasm,css,html}']` [CITED]

### Secondary (MEDIUM confidence)

- [Context7 — vite-plugin-pwa patterns](https://context7.com/vite-pwa/vite-plugin-pwa) — registerType autoUpdate config, globPatterns config, generateSW strategy [VERIFIED via Context7 CLI]
- [Chrome for Developers — Handling service worker updates](https://developer.chrome.com/docs/workbox/handling-service-worker-updates) — skipWaiting + clientsClaim reload timing [CITED]
- [vite-plugin-pwa minimal requirements docs](https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html) — required HTML tags [CITED]
- [firt.dev iOS PWA compatibility](https://firt.dev/notes/pwa-ios/) — iOS meta tags, Wake Lock support since iOS 16.4 [CITED]

### Tertiary (LOW confidence)

- [vite-plugin-pwa GitHub issues #713, #263, #396](https://github.com/vite-pwa/vite-plugin-pwa/issues/713) — icon path / base path community reports (overridden by source code verification — source is authoritative)

---

## Metadata

**Confidence breakdown:**

- vite-plugin-pwa version + Vite 8 compat: HIGH — npm registry verified
- Plugin configuration patterns: HIGH — source code read directly
- Virtual module reload behavior: HIGH — client/build/register.js read directly
- Manifest scope/start_url auto-default to base: HIGH — options.ts source read
- Icon path behavior (relative vs absolute): HIGH — api.ts + assets.ts source read
- iOS meta tags required: HIGH — official docs + firt.dev
- Wake Lock iOS 18.4 fix: HIGH — WebKit Bugzilla verified
- Default globPatterns: HIGH — Chrome for Developers Workbox docs
- `background_color` hex: LOW — assumed from Nord palette, not explicitly specified in CONTEXT.md
- Icon fill color: LOW — assumed from theme_color for consistency

**Research date:** 2026-05-16
**Valid until:** 2026-08-16 (stable — vite-plugin-pwa 1.x API, iOS behavior)
