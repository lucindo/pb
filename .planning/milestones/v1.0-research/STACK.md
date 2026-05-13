# Stack Research

**Domain:** Responsive HRV breathing / guided breathing web app
**Researched:** 2026-05-08
**Confidence:** HIGH for web platform stack and versions; MEDIUM for “standard 2025” ecosystem fit because this is a small consumer wellness app rather than a framework-prescribed domain.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2.6 | Component UI for session screen, settings, history, and learning hub | Use React because the app needs polished stateful UI but not server rendering. React 19 is current on npm and Context7 shows official docs for React 19.2.0. **Confidence: HIGH.** |
| TypeScript | 6.0.3 | Typed session math, settings schema, storage records, and audio/animation APIs | Precise timing apps benefit from explicit units and discriminated session states. Use branded/helper types for `seconds`, `bpm`, `ratio`, and `phase`. **Confidence: HIGH.** |
| Vite | 8.0.11 | Build tool and dev server for a static SPA | Use Vite instead of a full-stack framework because this app is local-only, has no accounts, and can be deployed as static files. Context7 docs verify Vite’s React/TypeScript pattern and strict TS config. **Confidence: HIGH.** |
| @vitejs/plugin-react | 6.0.1 | React integration for Vite | Official Vite React plugin is the standard path for React + Vite. Keep config minimal. **Confidence: HIGH.** |
| Tailwind CSS | 4.3.0 | Responsive styling, calming design tokens, dark mode, spacing/typography | Tailwind v4 with the official Vite plugin is a fast zero-runtime way to build responsive UI without adopting a component framework. Official Tailwind docs verify Vite integration via `@tailwindcss/vite`; npm reports 4.3.0 current. **Confidence: HIGH.** |
| @tailwindcss/vite | 4.3.0 | Tailwind compiler integration | Tailwind’s docs call the Vite plugin the most seamless integration path. **Confidence: HIGH.** |
| Native Web Audio API | Browser baseline; no npm package | Generated gong/bowl-like cues, envelopes, filters, gain, and precise cue scheduling | Use Web Audio directly. MDN verifies it is widely available and supports high-precision, low-latency timing, oscillators, buffers, filters, gain nodes, and scheduled parameters. This avoids unlicensed assets and avoids overweight music libraries. **Confidence: HIGH.** |
| Native `requestAnimationFrame` + `performance.now()` / RAF timestamp | Browser baseline; no npm package | Smooth synchronized breathing animation | Use RAF for visual updates and derive animation phase from a monotonic session clock, not React render cadence. MDN warns to use timestamps so animations do not run faster on high-refresh screens. **Confidence: HIGH.** |
| Native localStorage + IndexedDB | Browser baseline; no npm package for localStorage; Dexie optional below | Local-only persisted settings and history | Persist settings through Zustand/localStorage. Use IndexedDB only if history/export grows beyond simple totals. This matches the no-account/no-backend constraint. **Confidence: HIGH.** |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | 5.0.13 | App/session/settings state | Use for global app state and persisted settings. Context7 verifies `persist` middleware with versioned migrations to localStorage. Avoid putting the high-frequency timer tick in React/Zustand state; store session config/status only. **Confidence: HIGH.** |
| zod | 4.4.3 | Runtime validation for settings/history migrations | Use to validate localStorage/IndexedDB data before accepting it. This prevents corrupted user settings from breaking session start. **Confidence: HIGH for fit; version from npm.** |
| react-router | 7.15.0 | Client-side routes: `/`, `/session`, `/settings`, `/history`, `/learn` | Use if the learning hub and settings/history should have shareable URLs. If v1 is a single-screen app with modal panels, defer this. **Confidence: MEDIUM.** |
| motion | 12.38.0 | Non-critical UI transitions and route/panel polish | Use Motion for buttons, panels, onboarding, and learning hub transitions. Do **not** use it as the authoritative breath timing engine; authoritative progress should come from the session clock. Context7 verifies the current Motion React import pattern from `motion/react`. **Confidence: MEDIUM-HIGH.** |
| dexie | 4.4.2 | IndexedDB wrapper for session history | Use only if storing per-session history records, streaks, exports, or future richer analytics. Context7 verifies schema definitions and transactions. For v1 with only totals/recent sessions, localStorage may be enough. **Confidence: HIGH for IndexedDB use; MEDIUM for necessity.** |
| lucide-react | 1.14.0 | Small SVG icon set | Use for accessible UI icons: mute, settings, timer, history, info, external links. Avoid icon-heavy UI; breathing screen should remain calm. **Confidence: MEDIUM.** |
| @fontsource/inter | 5.2.8 | Self-hosted UI font | Use if the design wants a reliable, readable sans-serif without third-party font requests. Keeps privacy/local-only posture cleaner than loading Google Fonts. **Confidence: MEDIUM.** |
| vite-plugin-pwa | 1.3.0 | Optional installable/offline app | Defer unless offline installability is explicitly in scope. Add later for service worker caching of static assets and docs pages. **Confidence: MEDIUM.** |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest 4.1.5 | Unit tests for breathing math, ratio conversion, phase transitions, storage migrations | Prioritize deterministic tests for `bpm -> cycleMs`, inhale/exhale split, unlimited sessions, pause/resume, and cue schedule. |
| Playwright 1.59.1 | Browser/E2E tests across Chromium/WebKit/Firefox | Important for mobile Safari behavior, audio unlock after user gesture, responsive layout, and long-running session stability. |
| @testing-library/react 16.3.2 | Component tests | Use for settings forms, validation errors, and learning hub link rendering. Do not test timer precision through React component tests. |
| jsdom 29.1.1 | DOM environment for Vitest | Good for UI/storage tests; mock Web Audio and RAF explicitly. |
| ESLint 10.3.0 | Static analysis | Use strict TypeScript, React hooks rules, accessibility linting if configured. |
| Prettier 3.8.3 | Formatting | Keep formatting automated; no domain-specific caveats. |
| axe-core 4.11.4 | Accessibility checks | Use with Playwright or component tests to catch color contrast, labels, and dialog issues. |

## Installation

```bash
# Scaffold
npm create vite@latest hrv-breathing -- --template react-ts
cd hrv-breathing

# Core
npm install react@19.2.6 react-dom@19.2.6 zustand@5.0.13 zod@4.4.3
npm install tailwindcss@4.3.0 @tailwindcss/vite@4.3.0

# Routing / polish / optional storage
npm install react-router@7.15.0 motion@12.38.0 dexie@4.4.2 lucide-react@1.14.0 @fontsource/inter@5.2.8

# Dev dependencies
npm install -D vite@8.0.11 @vitejs/plugin-react@6.0.1 typescript@6.0.3 vitest@4.1.5 playwright@1.59.1 @testing-library/react@16.3.2 jsdom@29.1.1 eslint@10.3.0 prettier@3.8.3 axe-core@4.11.4
```

Minimal `vite.config.ts` pattern:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| React + Vite static SPA | Next.js / Remix / React Router framework mode | Use a full-stack/meta-framework only if the product later needs server rendering, accounts, payments, content CMS, or SEO-heavy editorial pages. For v1 it adds deployment and mental overhead without solving timing/audio needs. |
| Tailwind CSS v4 | CSS Modules | Use CSS Modules if the design is tiny and the team dislikes utility classes. Tailwind is faster for responsive polish and design tokens. |
| Native Web Audio API | Tone.js | Use Tone.js only if the app becomes a richer musical/sequencer product. For soft inhale/exhale cues, native oscillators/gain/filter envelopes are simpler, smaller, and easier to schedule exactly. |
| Native Web Audio API | howler.js | Use howler only for playback of licensed audio files. This project wants generated cues and no protected assets, so howler is unnecessary. |
| RAF + deterministic clock | CSS-only keyframes | Use CSS keyframes for decorative loops only. For configurable BPM/ratios/unlimited duration and audio sync, derive phase from JS monotonic time. |
| Zustand | Redux Toolkit | Use Redux only if the app grows into complex multi-domain workflows with devtools-heavy debugging needs. Zustand is enough for settings/session/history state. |
| localStorage + optional Dexie | Backend database / Supabase / Firebase | Use a backend only if accounts, cross-device sync, or clinician dashboards become requirements. v1 explicitly says local-only/no accounts. |
| Static TypeScript content for learning hub | Headless CMS / MDX pipeline | Use CMS/MDX later if non-developers need frequent content edits. For v1, a typed array of links/descriptions is safer and simpler. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `setInterval` / `setTimeout` as the authoritative session clock | Timer callbacks drift, are throttled, and do not align with display refresh. Long sessions need elapsed-time-derived phase, not incremented counters. | Store `sessionStartTime` and compute phase from `performance.now()`/RAF timestamp; schedule audio with `AudioContext.currentTime`. |
| React state updates every frame as the timing source | React rendering is not a real-time clock. Re-render pressure can cause visual jank and stale timing. | Imperative RAF loop writes CSS custom properties or refs; React stores config/status only. |
| Pre-recorded gong/bowl samples from the web | Licensing risk and larger bundle; user explicitly wants no unlicensed protected assets. | Generate soft cues with Web Audio oscillators, gain envelopes, filters, optional convolver only if using self-generated impulse buffers. |
| ScriptProcessorNode | MDN marks it deprecated and notes main-thread performance problems. | Use basic Web Audio nodes for v1; use AudioWorklet only if custom synthesis later requires off-main-thread DSP. |
| Heavy canvas/WebGL engines | Overkill for a calm breathing orb; can hurt battery and accessibility. | CSS/SVG transforms driven by RAF; use Canvas only if a specific visual concept requires it. |
| Full backend/auth stack | Violates local-only/no-accounts constraint and introduces privacy/security scope. | Static hosting plus local browser storage. |
| Medical/HRV analytics SDKs | Increases regulatory/claims risk and conflicts with “guided breathing” v1 scope. | Basic local stats: sessions completed, minutes practiced, last-used settings; include non-medical copy. |
| Google Analytics or invasive telemetry | Privacy mismatch for a meditation/breathing tool and not needed for local-only MVP. | No analytics in v1, or optional privacy-preserving aggregate analytics only after explicit product decision. |

## Stack Patterns by Variant

**If v1 is the simplest possible static app:**
- Use React + Vite + TypeScript + Tailwind + Zustand persist + native Web Audio + RAF.
- Store settings and aggregate stats in localStorage, with Zod validation.
- Defer Dexie, PWA, and React Router until history/learn pages need real routes.

**If v1 includes a dedicated learning hub and local session history:**
- Add React Router for `/learn` and `/history`.
- Add Dexie for per-session records: `{ id, startedAt, durationSeconds, bpm, ratio, completed, muted }`.
- Keep educational content as typed static data with external links to Forrest Knutson content; do not scrape/embed protected media.

**If offline/installable app becomes important:**
- Add `vite-plugin-pwa` after core behavior is stable.
- Cache only app shell and static learning content; avoid service-worker complexity during timing/audio implementation.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| React 19.2.6 | @vitejs/plugin-react 6.0.1, Vite 8.0.11 | Current npm versions. Use the Vite React TS template and avoid SSR assumptions. |
| Vite 8.0.11 | TypeScript 6.0.3 | Context7 Vite docs show strict TS config using `moduleResolution: "bundler"`, `jsx: "react-jsx"`, and DOM libs. |
| Tailwind CSS 4.3.0 | @tailwindcss/vite 4.3.0, Vite 8.0.11 | Official Tailwind docs verify Vite plugin integration: install both packages, add `tailwindcss()` to Vite plugins, import `@import "tailwindcss";`. |
| Zustand 5.0.13 | React 19.2.6 | Zustand persist middleware supports localStorage keys, versioning, and migrations. Use migrations for settings schema changes. |
| Dexie 4.4.2 | Browser IndexedDB | Use schema versioning from the start if storing session history. Avoid IndexedDB for tiny settings. |
| Motion 12.38.0 | React 19.2.6 | Import React APIs from `motion/react`. Use only for non-authoritative animations. |
| Playwright 1.59.1 | Chromium/WebKit/Firefox | Essential to validate mobile Safari-ish WebKit behavior for audio unlock and long sessions. |

## Domain-Specific Implementation Notes

1. **Timing engine:** calculate `cycleMs = 60_000 / bpm`, then split by ratio. For 1–7 BPM by 0.5 and ratios 50:50/40:60/30:70/20:80, all phase boundaries should be derived from elapsed monotonic time, not accumulated intervals.
2. **Audio cues:** create/resume `AudioContext` only after a user gesture. Generate cues with `OscillatorNode`/`GainNode`/`BiquadFilterNode`; schedule envelopes against `audioContext.currentTime` slightly ahead of boundaries.
3. **Visual sync:** RAF loop reads the same session clock and sets CSS variables like `--breath-progress`, `--phase-progress`, `--phase-name`. SVG/CSS transforms render the orb/ring.
4. **Storage:** settings go through Zustand persist + Zod. Session history can start as localStorage aggregate stats; move to Dexie if per-session records are required.
5. **Accessibility:** include mute, reduced motion support, visible text cues, high contrast, keyboard controls, and no audio autoplay. Respect `prefers-reduced-motion` by simplifying animation while preserving timing cues.

## Sources

- Context7 `/facebook/react/v19_2_0` — React current docs/ref behavior; refs should be accessed outside render for imperative timing loops. **Confidence: HIGH.**
- Context7 `/vitejs/vite/v8.0.10` — Vite React/TypeScript configuration and strict compiler options. **Confidence: HIGH.**
- Tailwind official docs, “Installing Tailwind CSS with Vite” — verified `tailwindcss` + `@tailwindcss/vite` plugin setup. https://tailwindcss.com/docs/installation/using-vite **Confidence: HIGH.**
- MDN Web Audio API — verified wide availability, audio graph model, oscillators/gain/filters, high-precision low-latency timing, and ScriptProcessorNode deprecation. https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API **Confidence: HIGH.**
- MDN `requestAnimationFrame()` — verified timestamp-based animation, high-refresh warning, and background throttling caveat. https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame **Confidence: HIGH.**
- Context7 `/pmndrs/zustand/v5.0.12` — verified persist middleware, localStorage key, versioning, migration patterns. **Confidence: HIGH.**
- Context7 `/websites/dexie` — verified IndexedDB schema/transaction patterns. **Confidence: HIGH.**
- Context7 `/websites/motion_dev` — verified Motion React `motion` component and animation prop model. **Confidence: MEDIUM-HIGH.**
- npm registry checks on 2026-05-08 — verified package versions: React 19.2.6, Vite 8.0.11, TypeScript 6.0.3, Tailwind 4.3.0, Zustand 5.0.13, Zod 4.4.3, Dexie 4.4.2, Motion 12.38.0, Playwright 1.59.1. **Confidence: HIGH for version numbers.**

---
*Stack research for: HRV breathing / guided breathing web app*
*Researched: 2026-05-08*
