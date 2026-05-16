# Phase 27: PWA Install & Offline - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the HRV breathing app an installable, offline-capable PWA:

- A **Web App Manifest** makes the app addable to home screen / desktop — correct `start_url`/`scope` for the `/hrv/` base path, maskable icons, Apple touch icon (PWA-01).
- A **service worker** precaches the app shell and all static assets so a started breathing session runs fully offline (PWA-02).
- **Updates** roll out without serving a stale app shell and never interrupt a running session (PWA-03).
- A **real-device iOS standalone-mode UAT** is a named deliverable of this phase — not a deferred carry-forward.

Out of scope: runtime caching beyond the app shell, per-theme PWA install icons, in-app custom install button/prompt UX (see REQUIREMENTS.md "Out of Scope" — PWA-specific rows).

</domain>

<decisions>
## Implementation Decisions

### Service Worker Generation
- **D-01:** Use `vite-plugin-pwa` in **`generateSW`** mode — Workbox auto-generates the service worker from a precache glob. No hand-written service worker. Justified: no backend, static shell, precache-only offline; `injectManifest` is only worth it for custom runtime caching/routing, which is explicitly out of scope.
- **D-02:** `vite-plugin-pwa` enters as a **build-time (`devDependencies`) dependency only**. The zero-net-new-*runtime*-deps invariant holds — `dependencies` stays exactly `react` + `react-dom`.

### Update Delivery
- **D-03:** `registerType: 'autoUpdate'` — **silent auto-update, no UI**. New service worker precaches in the background and applies on the next app load. A running session is never touched (the page keeps its old JS until a reload). No "refresh" toast / no net-new UI component.
- **D-04:** Enable `cleanupOutdatedCaches` so a superseded app shell is purged — satisfies PWA-03's "never serve a stale shell."

### Install Identity
- **D-05:** Manifest `name` = `"HRV Breathing"`; `short_name` = `"HRV Breathing"` (operator chose the full brand string over a truncating-safe abbreviation).
- **D-06:** Manifest `theme_color` / `background_color` = **light-palette values** (static single set). `background_color` = light-theme surface, `theme_color` = light accent (`#5e81ac`). Drives the iOS/Android splash + toolbar tint. Accepted mismatch: users who picked the dark theme see a light splash.
- **D-07:** Manifest `start_url` / `scope` must be set for the `/hrv/` Vite `base` — service-worker scope must match the base path (dominant Phase 27 risk per STATE.md).

### Offline Behavior
- **D-08:** **No offline indicator** — the app is fully self-contained after first load (precached shell, runtime-generated audio). Nothing degrades offline, so nothing is surfaced. Zero net-new UI.

### iOS Wake Lock Limitation
- **D-09:** iOS < 18.4 has no Wake Lock API (WebKit bug 254545) — in standalone PWA mode the screen can sleep mid-session. Handle as **document-only**: note it as a known limitation in README / Learn surface. **No runtime detection, no warning UI.** Consistent with the existing "Wake Lock is progressive enhancement" stance — the app already works without it.

### Claude's Discretion
- **Install icon artwork** — operator deferred to planning. Lock: a **static, neutral, single icon set** (192px + 512px PNG, a maskable safe-zone-padded variant, and a 180px Apple touch icon), orb-based to stay visually consistent with `public/favicon.svg` and the app's core orb visual. Exact artwork is the planner/researcher's call. New static assets land in `public/`.
- **Precache glob scope** — generateSW default (build output: JS/CSS/HTML/static assets). Planner confirms the glob covers everything the shell needs; runtime-generated audio and the `data:`-URI dynamic favicon are not files and need no precaching.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §PWA-01/02/03 — the three locked PWA requirements + the PWA-specific "Out of Scope" rows (no per-theme install icons, no runtime caching beyond shell, no custom in-app install prompt).
- `.planning/ROADMAP.md` "Phase 27: PWA Install & Offline" — goal + 5 success criteria.

### Project decisions & risk register
- `.planning/STATE.md` "Accumulated Context" — Roadmap Evolution note on Phase 27 sequencing, the `[Zero net-new runtime deps]` and `[PWA real-device UAT is first-class]` decisions, the `[Phase 27 risks]` blocker entry (`/hrv/` base-path vs SW scope, stale-cache trap, iOS standalone audio/Wake-Lock regressions), and the iOS < 18.4 Wake Lock Deferred Items row.
- `.planning/PROJECT.md` "Key Decisions" + "Constraints" — per-commit green-gate invariant (`tsc && lint && build && test` exits 0 at every commit), strict TS / `strictTypeChecked` floor, favicon `%BASE_URL%` substitution pattern (Phase 12 D-04).

### Codebase touchpoints
- `vite.config.ts` — `base: '/hrv/'`; `vite-plugin-pwa` is added here.
- `index.html` — `%BASE_URL%` substitution + pre-paint theme/favicon script; manifest `<link>` and Apple-touch `<link>` land here.
- `public/favicon.svg` — existing icon; visual reference for the install icon set.

No external ADRs — requirements fully captured in REQUIREMENTS.md + the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `public/favicon.svg` — the orb circle; visual reference / starting point for the static install icon artwork.
- `%BASE_URL%` HTML substitution pattern (`index.html`, Phase 12 D-04) — already used for the favicon; the manifest and Apple-touch `<link>` tags reuse it so they survive any future `base` change.

### Established Patterns
- **Zero net-new runtime deps** — `package.json` `dependencies` is exactly `react` + `react-dom`. `vite-plugin-pwa` MUST go in `devDependencies` only.
- **Per-commit green-gate** — every commit must pass `tsc -b && eslint . && vite build && vitest run`. PWA additions must keep all gates green.
- **Build command** — `tsc -b && vite build`; `vite-plugin-pwa` hooks the `vite build` step.
- **Stack reality** — React 19.2, Vite 8.0, TypeScript 6 (PROJECT.md's "React 18 + Vite" line is stale). `vite-plugin-pwa` version must satisfy the Vite 8 peer dependency.

### Integration Points
- `vite.config.ts` — `VitePWA({...})` plugin registration; manifest config + Workbox `generateSW` options live here.
- `index.html` — manifest link, `apple-touch-icon` link, `apple-mobile-web-app-*` meta tags.
- `public/` — net-new static icon assets (192/512 PNG, maskable, 180px Apple touch).
- Service-worker registration — `vite-plugin-pwa` virtual module wired into `src/main.tsx` (or via `injectRegister`).

### Not testable in jsdom
- Service worker, install flow, offline mode, and iOS standalone audio/Wake-Lock behavior cannot be verified under Vitest/jsdom. Phase 27 must budget a **real-device iOS standalone-mode UAT** as a named deliverable (mirrors the v1.0 audio/wake-lock real-device lesson).

</code_context>

<specifics>
## Specific Ideas

- Operator chose the full `"HRV Breathing"` brand string for `short_name` despite the truncation risk — brand consistency over launcher-fit.
- Strong lean throughout the discussion toward **zero net-new UI** — silent update, no offline indicator, no Wake-Lock warning. The PWA layer should be invisible; the app behaves identically, just installable and offline-capable.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

### Reviewed Todos (not folded)
The `todo.match-phase` query surfaced 3 todos by keyword overlap, all already shipped in earlier v1.3 phases — not folded:
- "Add Forrest native app links to Learn page" — shipped in Phase 24.
- "Add labels vs icons toggle for session indicator" — shipped in Phase 25.
- "Add license to repo and update README" — shipped in Phase 23.

</deferred>

---

*Phase: 27-pwa-install-offline*
*Context gathered: 2026-05-16*
