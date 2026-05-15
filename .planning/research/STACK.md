# Stack Research — v1.3 Release Polish Additions

**Domain:** Installable offline-capable static SPA (PWA) — v1.3 Release Polish milestone
**Researched:** 2026-05-15
**Baseline:** React 19.2 + Vite 8.0 + TypeScript 6 strict + Tailwind CSS 4.3 + Web Audio API + Vitest (shipped, do not re-research)
**Scope:** Stack ADDITIONS and DECISIONS for v1.3 only. Layers on top of the v1.2 green-gate baseline (`base: '/hrv/'`, 2 runtime deps, 839 tests).
**Confidence:** HIGH — PWA tooling, base-path interaction, and icon spec verified against official Vite PWA docs, GitHub issues, MDN, and web.dev. Features #1/#2/#4 are docs/content/UI-only with no dependency; #3 is UI-only.

---

## TL;DR for the roadmapper

- **Only feature #5 (PWA) has a real stack question.** Features #1 (LICENSE/README), #2 (Forrest app links), #4 (PT-BR review) add nothing. Feature #3 (labels-vs-icons toggle) needs **two hand-written inline SVG components** — no library, no dependency.
- **Recommended PWA tooling: `vite-plugin-pwa` v1.3.0 as a `devDependency` (build-time only).** Workbox-backed, supports Vite 8, and the zero-net-new-**runtime**-deps invariant is **preserved**.
- **Honesty caveat on the invariant:** vite-plugin-pwa emits a generated service worker (`sw.js`), Workbox runtime chunk(s), and a tiny `registerSW.js` that the *browser* downloads at runtime. These are **build outputs in `dist/`, not `package.json` `dependencies`.** The invariant is about declared runtime npm dependencies — that count stays at 2 (`react`, `react-dom`). Flag this category distinction to the operator at planning so there is no surprise. Same category as the existing `@tailwindcss/vite` / `@vitejs/plugin-react` build-time plugins.
- **Base-path sensitivity is the #1 integration risk.** This project ships under `base: '/hrv/'`. The plugin derives the SW file location, `registerSW.js`, and the manifest `<link>` from Vite `base` automatically — but manifest **`scope`** and **`start_url`** do **not** auto-inherit `base` and must be set explicitly to `/hrv/`. Get this wrong and the SW scope and the installed-app launch URL are wrong; offline silently fails.

---

## Recommended Stack

### Core Technologies (additions for v1.3)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `vite-plugin-pwa` | `^1.3.0` (released 2026-05-05) | Generates the Web App Manifest + a Workbox service worker; precaches the app shell for full offline use | De-facto standard for Vite PWAs. Workbox-backed precaching is battle-tested; hand-rolling a correct SW (content-hash cache busting, stale-cache cleanup, SPA navigation fallback) is error-prone. **Build-time `devDependency`** — adds nothing to `package.json` `dependencies`. Officially supports Vite 8 since the peer-deps fix in v1.3.0 (GitHub issues #918 / #923). |
| Workbox (`workbox-build`) | bundled transitively by `vite-plugin-pwa` | Service-worker generation engine behind the `generateSW` strategy | Pulled in **transitively as a devDependency of the plugin** — not added to `package.json` directly. Generates the precache manifest + SW with correct cache invalidation from Vite's content-hashed filenames. |

### Supporting Libraries / Tools

| Library / Tool | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vite-pwa/assets-generator` | latest `^1.x` | One-shot CLI: generates the maskable icon (512×512), Apple touch icon (180×180), and standard 192/512 PWA icons from a single SVG source | **Optional, build-time, run-once.** Run via `npx` (no install, zero footprint) or as a `devDependency` if regeneration will be frequent. Then commit the PNG outputs to `public/`. The project already has an SVG brand mark (`public/favicon.svg` + `faviconPalette.ts`) to use as the source image. |
| Inline SVG React components | n/a — no package | Two arrow/direction icons for feature #3 (in-orb In/Out cue) | **This is the answer for #3.** Two tiny `.tsx` components returning `<svg>`. Zero dependencies, Tailwind-styleable via `className`, `currentColor`-aware so they inherit theme tokens, tree-shakeable, testable under jsdom. See "Feature #3" section. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Workbox `generateSW` strategy | Auto-generates the entire service worker from plugin config | **Correct choice** for a 100%-static SPA with no custom runtime caching. Do NOT use `injectManifest` (custom SW source file) — this app has no backend, no API caching, no push handlers; `generateSW` precache fully covers the requirement. |
| `vite-plugin-pwa` `devOptions` | SW behavior during `npm run dev` | Leave `devOptions.enabled` OFF for normal dev so a cached shell does not pollute HMR. Test offline via `npm run build && npm run preview`. |

---

## Installation

```bash
# PWA tooling — BUILD-TIME devDependency ONLY. Does NOT touch package.json `dependencies`.
npm install -D vite-plugin-pwa@^1.3.0

# Icon generation — run-once, no install needed. Emits maskable + apple-touch + 192/512 icons.
npx @vite-pwa/assets-generator --preset minimal-2023 public/<source>.svg

# Features #1 (LICENSE/README), #2 (Forrest app links), #3 (labels-vs-icons toggle),
# #4 (PT-BR review): ZERO new packages. #3 ships two hand-written inline-SVG .tsx components.
```

**`package.json` after v1.3:** `dependencies` unchanged (`react`, `react-dom` — still 2). `devDependencies` gains `vite-plugin-pwa`. Invariant intact.

---

## Runtime bundle impact — the precise, honest answer

The constraint is **"zero net-new RUNTIME dependencies"** and the question explicitly asks what the plugin adds to the runtime bundle. Exact breakdown:

| Artifact | What it is | Counts against the invariant? |
|----------|------------|-------------------------------|
| `vite-plugin-pwa` in `package.json` | A `devDependency` | **No.** The invariant is about `package.json` `dependencies`. Build-time only. |
| `dist/sw.js` + `dist/workbox-<hash>.js` | Workbox-generated service worker + its runtime, emitted into `dist/` at build | **No** — *build outputs*, not declared dependencies. The browser downloads them, but they are NOT part of the app's main JS bundle and NOT in `package.json`. Workbox runtime is small; combined SW + Workbox runtime is typically ~15–25 KiB gzipped. The precache *manifest* lists app assets (one cited example: 5 entries / ~81 KiB of app files) — that is the app's own already-shipped assets, not new code. |
| `dist/registerSW.js` | Tiny (~1 KiB) auto-injected script that registers the SW | **No** — build output, injected into `index.html` by the plugin. |
| `dist/manifest.webmanifest` | The Web App Manifest JSON | **No** — static asset. |
| The app's own JS bundle (`index-<hash>.js`) | React app code | **Unchanged.** The plugin does NOT inject Workbox into the app bundle — the SW runs in a separate worker context. |

**Roadmapper wording:** State plainly in the plan — "PWA-01 adds `vite-plugin-pwa` as a **build-time `devDependency`**. It emits a service worker, a Workbox runtime chunk, and a small registration script into `dist/`; these are build artifacts, not runtime npm dependencies. The zero-net-new-runtime-deps invariant (`package.json` `dependencies` stays at `react` + `react-dom`) is preserved." This is the same category as the existing `@tailwindcss/vite` and `@vitejs/plugin-react` build-time plugins.

---

## Vite `base` path ⇄ Service Worker scope — critical integration detail

This project ships under `base: '/hrv/'` (`vite.config.ts`). A service worker can only control pages **at or below its own scope**, and scope defaults to the directory the SW file is served from. Getting this right is make-or-break for PWA-01.

| Concern | Auto-derived from Vite `base`? | Action required |
|---------|-------------------------------|-----------------|
| SW file location (`dist/sw.js`) | **Yes** — emitted under `base`, served at `/hrv/sw.js`. | None — SW scope becomes `/hrv/`, which correctly covers the whole app. |
| `registerSW.js` location + registration URL | **Yes** — plugin prepends `base`. | None. |
| `manifest.webmanifest` `<link>` in `index.html` | **Yes** — plugin injects `<link rel="manifest" href="/hrv/manifest.webmanifest">`. | None. |
| Manifest **`scope`** | **No** — does NOT auto-inherit `base`; defaults to `/` if unset. | **Set `scope: '/hrv/'` explicitly** in the `manifest` block of the plugin config. |
| Manifest **`start_url`** | **No** — defaults to `/` if unset. | **Set `start_url: '/hrv/'` explicitly** — otherwise the installed app launches at the wrong URL. |
| Manifest **`icons[].src`** paths | Relative paths resolve against the manifest's own URL | Verify resolved paths in the built `dist/manifest.webmanifest`. |

**Verification step for the plan:** After `npm run build`, inspect `dist/manifest.webmanifest` and `dist/index.html` and confirm every PWA path begins with `/hrv/`. Then `npm run preview` and check DevTools → Application → Service Workers shows scope `/hrv/`. This mirrors the project's existing `%BASE_URL%` favicon discipline (Phase 12 D-04) — base-path correctness is already a known project concern.

---

## Service worker caching strategy

For this app the strategy is the **simplest possible**, and that is correct:

- **Strategy:** `generateSW` (Workbox auto-generated SW). Default, no custom SW file to maintain.
- **Precache the full app shell:** HTML, JS, CSS, the SVG favicon, and the PWA icons. Default `globPatterns` covers `css/js/html`; **extend `globPatterns`** to include `svg,png,ico,webmanifest` so icons and favicon are precached.
- **Runtime caching: NONE needed.** The app has no backend, no API, no external audio (audio is synthesized at runtime via Web Audio API — PROJECT.md), and no remote fonts/images during a session. The Learn surface links to YouTube/App Store/Play Store, but those are outbound *navigations*, not in-app fetches. A started breathing session makes **zero network calls** — a precached shell delivers full offline capability with no runtime-caching config. The question's framing ("offline should be very achievable") is correct.
- **Navigation fallback:** Workbox's `navigateFallback` serves the precached `index.html` for SPA navigations offline. Set `navigateFallback: '/hrv/index.html'` (base-path aware).
- **Update behavior:** Recommend `registerType: 'autoUpdate'` — SW updates silently on next load. Calm UX, no update-prompt component to build, consistent with the app's no-friction ethos. The `prompt` alternative would require a new toast/dialog; not worth it for a static app.

---

## Manifest & icon requirements

Minimum viable manifest for installability + iOS:

| Manifest field | Value | Notes |
|----------------|-------|-------|
| `name` / `short_name` | "HRV Breathing" / "HRV Breathing" | |
| `start_url` | `/hrv/` | **Must be set explicitly** (base-path). |
| `scope` | `/hrv/` | **Must be set explicitly** (base-path). |
| `display` | `standalone` | Installed-app feel. |
| `theme_color` / `background_color` | One fixed default per the active palette — e.g. light-palette accent `#5e81ac` (matches the favicon accent already hardcoded in `index.html`). | The manifest is a static file — it cannot follow the live `data-theme`. Pick one sensible default; the in-app theme system is unaffected. |
| `icons` | 192×192 + 512×512 (`purpose: "any"`) **and** a 512×512 `purpose: "maskable"` | The maskable icon must keep its content inside the inner **80% safe zone** (centered circle, 40% radius) for Android adaptive masking. |

**iOS Safari quirks (verified, current as of 2026):**
- iOS Safari **ignores `manifest.icons`** for the home-screen icon — it uses the non-standard `<link rel="apple-touch-icon">` in `index.html` instead. **You must add an explicit `apple-touch-icon` link** (180×180 PNG, square, no transparency, no rounded corners — iOS rounds it itself). If present, the apple-touch-icon **overrides** manifest icons on iOS, so the 180×180 PNG must be the polished one. Add the `<link>` base-path-aware via `%BASE_URL%`, the same pattern as the existing favicon `<link>`.
- iOS runs service workers but with **tighter storage quotas** than Chrome — not a problem for a small static shell.
- iOS has **no install prompt / `beforeinstallprompt`** — users install via Share → "Add to Home Screen". Do not build install-prompt UI expecting iOS support. For v1.3 scope, a correct manifest + icons producing a proper standalone "Add to Home Screen" app is sufficient.

**Icon generation:** Use `@vite-pwa/assets-generator` (`minimal-2023` preset) once against an SVG source — it emits `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, and `apple-touch-icon-180x180.png` with correct padding. Commit the PNGs to `public/`.

---

## Feature #3 — Labels-vs-icons toggle: icon asset approach

**Recommendation: two hand-written inline SVG React components. No library. No dependency.** Unambiguously correct for this project:

- **Zero runtime dependency** — respects the invariant absolutely. An icon-set package (`lucide-react`, `react-icons`, `@heroicons/react`) would be a *runtime* `package.json` dependency and is therefore disallowed.
- **Only two icons needed** — an "inhale" (up/expand arrow) and an "exhale" (down/contract arrow). Pulling a whole icon library for two glyphs is unjustifiable even without the invariant.
- **Theme integration is free** — author the SVGs with `fill="currentColor"` / `stroke="currentColor"` so they inherit the `--color-breathing-*` token cascade exactly like the In/Out text labels do today.
- **Tailwind-friendly** — size/color via `className` (`w-*`, `h-*`, `text-*`).
- **Testable** — render under jsdom in Vitest like any component; consistent with the 839-test suite discipline.
- **Sibling-clone pattern fits** — #3 is a sibling-clone of the existing SettingsDialog radiogroup pickers (Theme/Variant/Timbre/Language). The new picker selects "Labels" vs "Icons"; the in-orb cue component branches on the preference. The preference rides the existing `Envelope.prefs` localStorage shape with a per-field `coerceSettings` fallback — **no `STATE_VERSION` bump**, exactly as Variant/Timbre/Language did (PROJECT.md Phase 19 / Phase 22 decisions).

**Where to put the SVGs:** small `.tsx` components under `src/components/` (or an `icons/` subfolder), each ~10–20 lines.

**Alternative considered:** static `.svg` files in `public/` referenced via `<img>`. Rejected — cannot inherit theme `currentColor`, cannot be unit-tested as components, and needs `%BASE_URL%` base-path handling. Inline components avoid all three problems.

---

## Features #1, #2, #4 — no stack impact (confirmed)

| Feature | Stack impact | Notes |
|---------|-------------|-------|
| #1 LICENSE + README | **None** | Add a `LICENSE` file (operator picks the license — MIT is the common default for a project like this; confirm with operator) and edit `README.md`. Pure docs. |
| #2 Forrest native-app links | **None** | New entries on the existing Learn surface (`learnContent.ts` / LearnDialog), styled like the existing YouTube/book links. Needs the App Store + Google Play URLs for "Resonant Breathing" — a content input, not a dependency. Honor the existing claim-safe / locked-copy discipline. |
| #4 PT-BR native-speaker review (I18N-07) | **None** | Edit the 76 machine-translated strings in the PT-BR catalog and remove the `// TODO: native-speaker review` markers. Process/content only. The frozen-EN `LOCKED_COPY` byte-equality guard is unaffected — it guards EN, not PT-BR. |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `vite-plugin-pwa` (`generateSW`) | Hand-rolled service worker (custom `sw.js`, manual cache versioning) | Only if caching logic the plugin cannot express is needed. **Not the case here** — a static SPA with no backend is the plugin's textbook use case. Hand-rolling means owning cache-name versioning, stale-cache cleanup, and SPA navigation fallback by hand — all of which Workbox does correctly. No upside, real risk. |
| `vite-plugin-pwa` `generateSW` strategy | `vite-plugin-pwa` `injectManifest` strategy | Use `injectManifest` only if custom SW code is required (push handlers, background sync, bespoke runtime caching). This app needs none of that. `generateSW` is simpler and sufficient. |
| `@vite-pwa/assets-generator` via `npx` (run-once) | Install it as a `devDependency` | Install it only if icon regeneration will be frequent. For a one-time icon mint, `npx` keeps `devDependencies` leaner. Either is fine — both are build-time. |
| Two inline SVG components (#3) | `lucide-react` / `react-icons` / `@heroicons/react` | **Never, for this project** — all are runtime dependencies and violate the invariant. Even absent the invariant, a library for two icons is over-engineering. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any runtime icon-library package (`lucide-react`, `react-icons`, `@heroicons/react`) | Adds a **runtime** `package.json` dependency — direct invariant violation; massive overkill for 2 icons | Two hand-written inline SVG `.tsx` components |
| `injectManifest` strategy / hand-rolled SW | Unneeded complexity; you own cache versioning + cleanup + navigation fallback manually | `generateSW` (default Workbox strategy) |
| Leaving `scope` / `start_url` unset in the manifest | They default to `/`, **not** `/hrv/` — the installed app launches at the wrong URL and the SW scope is wrong; offline silently fails | Explicitly set `scope: '/hrv/'` and `start_url: '/hrv/'` |
| Relying on `manifest.icons` for the iOS home-screen icon | iOS Safari ignores manifest icons for the home screen | Add an explicit `<link rel="apple-touch-icon">` (180×180 PNG) in `index.html` |
| Building an in-app install-prompt UI targeting iOS | iOS has no `beforeinstallprompt`; users install via Share → Add to Home Screen | A correct manifest + icons; optionally an Android/desktop-only install affordance (or none) |
| Adding the apple-touch-icon `<link>` with a hardcoded path | Project is base-path sensitive (`/hrv/`) | Use `%BASE_URL%` substitution, same pattern as the existing favicon `<link>` in `index.html` |
| Enabling `devOptions.enabled` for the SW during normal `npm run dev` | A cached shell pollutes HMR and confuses development | Test offline via `npm run build && npm run preview` |

## Stack Patterns by Variant

**If the operator wants an explicit "install app" button (Android/desktop):**
- Add a small component listening for the `beforeinstallprompt` event.
- iOS does not fire `beforeinstallprompt`, so the button must be feature-detected and hidden on iOS. Recommend keeping it out of v1.3 unless explicitly requested — a correct manifest already makes the app installable via the browser's native UI.

**If icon regeneration will be ongoing:**
- Install `@vite-pwa/assets-generator` as a `devDependency` with an npm script. Otherwise prefer `npx` run-once and commit the PNG outputs.

**If the operator later wants update-prompt UX instead of silent updates:**
- Switch `registerType` from `'autoUpdate'` to `'prompt'` and build a small "new version available" toast. Not recommended for v1.3 — `autoUpdate` needs zero UI and suits a calm static app.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `vite-plugin-pwa@^1.3.0` | Vite `^8.0.0` (project is on `vite@^8.0.10`) | v1.3.0 (2026-05-05) added Vite 8 to `peerDependencies` (issues #918 / #923). Earlier versions emit a peer-deps warning under Vite 8 — pin `^1.3.0` or newer. Declared peer range: `^3.1.0 \|\| ^4 \|\| ^5 \|\| ^6 \|\| ^7 \|\| ^8`. |
| `vite-plugin-pwa@^1.3.0` | React 19 / TypeScript 6 | Framework-agnostic build tooling; does not interact with the React or TS version. No conflict with `react@^19.2.5` / `typescript@~6.0.2`. |
| `@vite-pwa/assets-generator` | Standalone CLI | Run-once, no peer-dep coupling to the app. |
| Generated SW (Workbox) | All modern browsers; iOS Safari with tighter storage quota | Service Worker API broadly supported; iOS runs SWs with quota limits — fine for a small static shell. |

## New Packages Summary

| Package | Version | Type | Counts against zero-net-new-RUNTIME-deps? |
|---------|---------|------|--------------------------------------------|
| `vite-plugin-pwa` | `^1.3.0` | **`devDependency` (build-time)** | **No** — not a runtime dependency. Emits `dist/` build artifacts only. |
| `@vite-pwa/assets-generator` | `^1.x` | Build-time, run-once (prefer `npx`) | **No** — optional, not installed if run via `npx`. |
| *(none for #1/#2/#3/#4)* | — | — | — |

**Net new RUNTIME dependencies: 0. Invariant preserved.**

## Sources

- [vite-plugin-pwa releases — v1.3.0 (2026-05-05)](https://github.com/vite-pwa/vite-plugin-pwa/releases) — current version, Vite 8 peer-dep fix — HIGH
- [Vite 8 support · Issue #918](https://github.com/vite-pwa/vite-plugin-pwa/issues/918) and [Add Vite 8 to peerDependencies · Issue #923](https://github.com/vite-pwa/vite-plugin-pwa/issues/923) — Vite 8 compatibility timeline — HIGH
- [vite-plugin-pwa — npm](https://www.npmjs.com/package/vite-plugin-pwa) — version + install-as-devDependency confirmation — HIGH
- [Vite PWA — Getting Started](https://vite-pwa-org.netlify.app/guide/) — `devDependency` install, manifest generation — HIGH
- [Vite PWA — Service Worker Precache](https://vite-pwa-org.netlify.app/guide/service-worker-precache.html) — default precache globs (css/js/html), `generateSW` — HIGH
- [Vite PWA — generateSW (Workbox)](https://vite-pwa-org.netlify.app/workbox/generate-sw) — Workbox strategy, runtime caching is opt-in — HIGH
- [Manifest / Service Worker in subdirectory · Issue #263](https://github.com/vite-pwa/vite-plugin-pwa/issues/263) and [Support "base" path · Issue #4](https://github.com/vite-pwa/vite-plugin-pwa/issues/4) — base-path interaction, scope/start_url caveats — MEDIUM (community issues, corroborated by docs)
- [Vite PWA — PWA Assets Generator](https://vite-pwa-org.netlify.app/assets-generator/) and [CLI](https://vite-pwa-org.netlify.app/assets-generator/cli.html) — maskable 512×512 + apple-touch 180×180 generation, `minimal-2023` preset — HIGH
- [web.dev — Web app manifest](https://web.dev/learn/pwa/web-app-manifest) — manifest fields, maskable safe zone — HIGH
- [MDN — Define your app icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons) — iOS ignores manifest icons, apple-touch-icon precedence, 80% safe zone — HIGH
- [PWA iOS Limitations and Safari Support, 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) and [firt.dev — iOS PWA Compatibility](https://firt.dev/notes/pwa-ios/) — iOS quirks: no `beforeinstallprompt`, storage quota, apple-touch-icon — MEDIUM
- Project files read: `.planning/PROJECT.md`, `.planning/MILESTONES.md`, `index.html`, `vite.config.ts`, `package.json` — current `base: '/hrv/'`, 2 runtime deps, build-time plugin precedent — HIGH

---
*Stack research for: installable offline-capable static SPA (PWA) — HRV Breathing v1.3 Release Polish*
*Researched: 2026-05-15*
