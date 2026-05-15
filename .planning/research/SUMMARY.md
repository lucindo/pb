# Project Research Summary

**Project:** HRV Breathing WebApp — v1.3 Release Polish
**Domain:** Polish milestone for a shipped local-only HRV breathing SPA — repo distribution-readiness + an installable offline-capable PWA + content/UX polish
**Researched:** 2026-05-15
**Confidence:** HIGH

## Executive Summary

v1.3 Release Polish is a **polish milestone, not a feature expansion** — five tightly-scoped additions that make an already-shipped ~19k-LOC breathing webapp distribution-ready. The four research streams (STACK, FEATURES, ARCHITECTURE, PITFALLS) converged strongly: none of the five features touches the breathing engine, timing, or audio scheduling, and the existing architecture is fixed — every new file follows an existing sibling-clone template already in the tree. The single most important framing for the roadmapper is the **two-tier scope split**: only feature #5 (PWA install) and feature #3 (labels-vs-icons toggle) carry real engineering scope; features #1 (LICENSE + README), #2 (Forrest native-app links), and #4 (PT-BR native-speaker review) are docs/content/translation tasks with effectively zero or trivial code risk.

The recommended approach for the two engineering features is conservative and pattern-driven. For #5, use **`vite-plugin-pwa` v1.3.0 as a build-time `devDependency`** in `generateSW` (Workbox precache) mode — a hand-rolled service worker is a footgun and buys nothing for a backendless static SPA. Critically, this preserves the project's zero-net-new-**runtime**-deps invariant: `package.json` `dependencies` stays at `react` + `react-dom`; the plugin emits build artifacts (`sw.js`, a Workbox runtime chunk, `registerSW.js`, the manifest) into `dist/` only — the same category as the existing `@tailwindcss/vite` and `@vitejs/plugin-react` build-time plugins. For #3, the toggle is a verbatim 5th sibling-clone of the existing SettingsDialog pickers (Theme/Variant/Timbre/Language), and its two arrow glyphs are **two hand-written inline SVG components — no icon library** (any icon-set package would be a runtime dependency and violate the invariant).

The dominant risk is concentrated almost entirely in the PWA phase: the **`/hrv/` Vite base path interacting with service-worker scope and the manifest `start_url`/`scope`** (get it wrong and the PWA installs but silently never goes offline), the **stale-cache trap** (an installed PWA serving an outdated shell forever after deploy), and **iOS Safari standalone-mode audio/Wake-Lock regressions** that only appear on a real device and that jsdom cannot model. Mitigation is well-understood — explicit `scope`/`start_url`/`id` set to `/hrv/`, `registerType: 'autoUpdate'` with an in-session reload guard, and a **first-class real-device UAT task** treating "installed PWA on iOS" as a distinct test target. Two cross-cutting sequencing rules emerged: #4 (PT-BR review) must run **after** #2 and #3 so the one native-speaker pass also covers the new PT-BR strings they introduce; and the operator's smallest-blast-radius ordering (#1 -> #2 -> #3 -> #4 -> #5) is sound and preserved verbatim.

> **Note for the orchestrator (stale PROJECT.md):** PROJECT.md states the tech stack as "React 18 + Vite + TypeScript". The Stack researcher verified the **actual** shipped stack is **React 19.2 + Vite 8.0 + TypeScript 6 (strict)** + Tailwind CSS 4.3. The PROJECT.md "Tech stack" line should be corrected during requirements/roadmap; the v1.3 plan must target React 19.2 / Vite 8.0 / TS 6 (this also matters for the `vite-plugin-pwa@^1.3.0` peer-dep — v1.3.0 is the first release declaring Vite 8 support).

## Key Findings

### Recommended Stack

See [STACK.md](./STACK.md). The existing baseline is fixed and not re-researched. v1.3 adds exactly **one build-time package** and **zero runtime dependencies**. Only feature #5 has a genuine stack question; #1/#2/#4 add nothing; #3 ships hand-written inline SVG components, not a package.

**Core technologies (additions for v1.3):**
- `vite-plugin-pwa` `^1.3.0`: generates the Web App Manifest + a Workbox `generateSW` service worker precaching the app shell — **build-time `devDependency` only**, de-facto Vite PWA standard, v1.3.0 (2026-05-05) is the first release supporting Vite 8. Runtime-deps invariant preserved.
- `@vite-pwa/assets-generator` (run-once via `npx`): one-shot CLI generating the maskable 512x512, apple-touch 180x180, and 192/512 PWA icons from a single SVG source — no install footprint, commit the PNG outputs to `public/`.
- Two inline SVG React components (no package): the in-orb In/Out arrow glyphs for feature #3 — `currentColor`-aware so they inherit the existing `--color-breathing-*` token cascade, Tailwind-styleable, jsdom-testable.

### Expected Features

See [FEATURES.md](./FEATURES.md). This is a polish milestone — the "MVP" is the milestone's must-ship core. All five features are P1.

**Must have (table stakes — the v1.3 core):**
- MIT `LICENSE` + a user-facing README — repo distribution-readiness; README must be written claim-safe (no medical/therapeutic language) and state the Forrest-attribution boundary.
- Two Forrest native-app store links (iOS App Store + Google Play) on the existing LearnDialog surface — honest pointer to the original Resonant Breathing apps.
- Labels-vs-icons picker — default `'labels'` (preserves current UX byte-for-byte), persisted, all 3 visual variants, reduced-motion safe, with sr-only localized In/Out text for a11y.
- All ~76-91 PT-BR `// TODO: native-speaker review` markers resolved and removed by a real native-speaker pass.
- Installable offline PWA — manifest + maskable/apple-touch icons + app-shell precaching service worker; full offline session verified on Android Chrome and iOS Safari.

**Should have (competitive, low-risk in-milestone differentiators):**
- Official store badge artwork (Apple + Google) instead of plain text links — only if badge-guideline compliance and theme fit are confirmed; styled text links are an acceptable fallback.
- Custom `beforeinstallprompt` install button on Android/desktop — optional; a correct manifest already makes the app installable via the browser's native UI.
- iOS "Add to Home Screen" mini-guide (Share-icon illustration) — iOS has no install prompt API.

**Defer (explicitly NOT v1.3):**
- A third UI language — a separate i18n milestone.
- Push / reminder notifications — contradicts the calm, no-pressure philosophy (PROJECT.md Out of Scope).
- Deep-linking / Smart App Banner to the native apps — requires assets/association files this project does not own.

### Architecture Approach

See [ARCHITECTURE.md](./ARCHITECTURE.md). The existing layer model (app / components / hooks / domain / content / storage / `index.html` pre-paint scripts) is **fixed** — v1.3 adds files into existing folders, no new folders, no layer redesign. Each new file follows a proven sibling-clone template. Two architectural patterns dominate v1.3: the **sibling-clone picker** (a new SettingsDialog picker = cloning an existing picker's 4-file set: domain enum + prefs field + 2 hooks + component, never abstracting a generic picker) and the **`vite-plugin-pwa` generateSW precache** (Workbox auto-generates a service worker that precaches the hashed build output).

**Major components / integration surfaces:**
1. Feature #3 toggle — new `IndicatorPicker.tsx` + `useIndicatorChoice`/`useIndicator` hooks (clones of VariantPicker / useVisualVariant), a new `indicator` field in `domain/settings.ts` + `storage/prefs.ts` (no `STATE_VERSION` bump — per-field coercion), and a consumer edit threading an `indicator?` prop through `BreathingShape` into all 3 shapes (OrbShape/SquareShape/DiamondShape, each renders its own In/Out label). Recommendation: **live-swappable** (not capture-at-start) — it is a pure glyph swap; SettingsDialog is disabled in-session anyway. Flag this as a one-line operator decision.
2. Feature #5 PWA — `VitePWA()` added to `vite.config.ts` plugins, manifest + apple-touch-icon `<link>`s in `index.html` (via `%BASE_URL%`), a one-shot `registerSW({ immediate: true })` in `main.tsx` (no stateful hook needed for `autoUpdate`), and new static PNG icon assets in `public/`. Note the **two coexisting icon systems**: the existing dynamic per-theme favicon (browser tab, unchanged) and the new static single-neutral PWA install icon set (home screen) — they do not conflict; document the split.
3. Features #1/#2/#4 — repo-root files (`LICENSE`, `README.md`) and `pt-BR`-only edits to the `learnContent.ts` / `strings.ts` catalogs; no logic, no hooks, no new components.

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md). The PWA feature is the highest-risk by a wide margin; jsdom has no service worker, no install lifecycle, and no real WebKit audio session.

1. **Service-worker scope / manifest path mismatch under `/hrv/`** — a SW at root cannot control `/hrv/*`; a manifest with `start_url`/`scope` = `/` launches the installed app at a 404. Avoid: use `vite-plugin-pwa` (auto-derives paths from Vite `base`), explicitly set manifest `scope`/`start_url`/`id` to `/hrv/`, and verify emitted `dist/` files resolve under `/hrv/`. Never hand-roll SW registration.
2. **Stale-cache trap** — a precache SW serves the old app shell forever after a deploy; a shipped fix never reaches installed users. Avoid: `registerType: 'autoUpdate'` (forces `skipWaiting` + `clientsClaim` + `cleanupOutdatedCaches`) — plus an "is a session running?" guard that defers the reload until the session ends, so a deploy never interrupts a breathing session.
3. **iOS Safari standalone-mode audio / Wake-Lock regressions** — Wake Lock was broken in iOS Home Screen Web Apps before iOS 18.4 (WebKit 254545); standalone-PWA audio can stop on foreground loss (WebKit 198277). These differ from Safari-tab behavior and only appear on a real device. Avoid: treat "installed PWA on iOS" as a distinct first-class real-device UAT target; document iOS < 18.4 wake-lock loss as a known limitation.
4. **SW interfering with the pre-paint inline scripts (theme + favicon FOUC)** — the `index.html` inline FOUC script is inside the precached HTML, so it inherits its staleness/fallback risks. Avoid: keep the script inline (do not externalize during the PWA refactor), confirm `navigateFallback` returns the precached `index.html` verbatim, and re-verify no-FOUC in installed standalone mode.
5. **Editing the frozen-EN `LOCKED_COPY` during the PT-BR review** — a translation pass naturally invites copy edits; touching the EN side breaks the byte-equality guard. Avoid: brief the reviewer that the disclaimer / "inspired by Forrest" copy is frozen, scope review commits to `pt-BR` catalog slices only, and treat a `lockedCopy.test.ts` failure as a **stop signal**, never a test to update.

Also flagged for the engineering features: icon-only In/Out mode must keep a **visually-hidden localized word** with `aria-hidden` on the decorative SVG (`aria-label` is the documented "last-resort code smell" — not the primary mechanism); the arrow must read clearly across 3 variants x reduced-motion x 5 palettes; and the new `prefs` field must use per-field coercion with **no `STATE_VERSION` bump** (v1.1/v1.2 precedent).

## Implications for Roadmap

Based on research, the suggested phase structure is a **clean 1:1 mapping — 5 features -> 5 phases (Phases 23-27)**, preserving the operator's smallest-blast-radius ordering verbatim. Each feature is cohesive and independently shippable.

### Phase 23: LICENSE + README
**Rationale:** Smallest blast radius — repo root only, zero `src/` files, the green-gate passes trivially. Operator-ordered first; pure docs, zero code risk.
**Delivers:** An MIT `LICENSE` file + an updated user-facing README.
**Addresses:** Feature #1 (table stakes — repo distribution-readiness).
**Avoids:** Pitfall 12 — README medical/therapeutic claims; wrong LICENSE. README written claim-safe (reuse the frozen disclaimer phrasing), MIT chosen, Forrest-attribution boundary stated explicitly.
**License recommendation:** **MIT** — permissive, OSI-approved, ~20 lines, its all-caps `AS IS`/no-liability clause is exactly the legal shield a no-warranty hobby breathing app wants; a "non-commercial" license would be the wrong instinct (not OSI-approved, legally vague). Copyright line: `Copyright (c) 2026 Renato Lucindo`.

### Phase 24: Forrest native-app links
**Rationale:** Additive content/UI change; reuses the existing `LearnLink` model + link-render pattern in `learnContent.ts` / `LearnDialog.tsx`. Runs before #4 because it introduces new PT-BR strings.
**Delivers:** Two outbound store links (iOS + Android) on the Learn surface, EN + PT-BR.
**Addresses:** Feature #2 (table stakes).
**Avoids:** Pitfall 11 — dead/region-locked links and claim-weakening copy. Verify both store URLs resolve at implementation time (Google Play package ID confirmed: `com.johngoodstadt.knutson.meditation`; the Apple numeric App ID must be confirmed at planning). Keep new links inside the LearnDialog locked-copy contract; app-store link labels are translatable strings, **not** locked copy (anti-pattern: do not add them to `lockedCopy.ts`).

### Phase 25: Labels-vs-icons toggle
**Rationale:** The largest UI change and the milestone's integration hotspot — the only feature touching SettingsDialog, the persistence envelope, i18n, all 3 visual variants, reduced-motion, AND a11y simultaneously. Runs before #4 because it introduces new PT-BR strings.
**Delivers:** A 5th SettingsDialog radiogroup picker switching the in-orb In/Out cue between text labels and arrow icons.
**Uses:** Two hand-written inline SVG components (no library — invariant).
**Implements:** The sibling-clone picker pattern — clone VariantPicker + useVisualVariant + the domain/prefs surface verbatim; default `'labels'`; no `STATE_VERSION` bump; recommend **live-swappable** (operator may override for strict Variant-consistency — one-line decision).
**Avoids:** Pitfalls 6-9 and 16 — a11y (visually-hidden localized In/Out text + `aria-hidden` SVG, not `aria-label`); arrow legibility across 3 variants x reduced-motion x 5 palettes; correct prefs schema (per-field coercer, no version bump); resolve "is the indicator on screen pre-session?" to decide whether pre-paint handling is needed; verbatim sibling-clone.

### Phase 26: PT-BR native-speaker review (I18N-07)
**Rationale:** Sequenced **after Phases 24 and 25** so the single native-speaker pass reviews ALL pending markers in one round — including the new PT-BR strings #2 and #3 introduce. Reviewing earlier would force a second review pass. This is a content-quality pass, not a build — "done" is a definition.
**Delivers:** All `// TODO: native-speaker review` markers (~76-91 — count grew with v1.2 stretch strings + #2/#3 additions) resolved and removed; PT-BR reads naturally to a native speaker.
**Addresses:** Feature #4 (table stakes — closes the I18N-07 carry-forward).
**Avoids:** Pitfalls 5, 13, 14, 15 — do not edit frozen-EN `LOCKED_COPY` (byte-equality test is a stop signal); `grep` for the marker must return 0 at close; `Record<LocaleId, UiStrings>` keys frozen (edit values only); UAT on a narrow mobile viewport for PT-BR length overflow.

### Phase 27: PWA install (PWA-01)
**Rationale:** Most novel surface — a new build-time dependency, a new binary-asset class, and the manifest/scope gotcha. Placed last so the rest of the app is frozen and verified before service-worker caching wraps it.
**Delivers:** A Web App Manifest + maskable/apple-touch icons + a Workbox `generateSW` service worker; full offline session capability; standalone display mode.
**Uses:** `vite-plugin-pwa` `^1.3.0` (build-time `devDependency`), `@vite-pwa/assets-generator` (run-once).
**Implements:** The generateSW precache pattern — `registerType: 'autoUpdate'`, precache the whole bundle, no runtime caching (the app makes zero network calls during a session), `registerSW()` once in `main.tsx`.
**Avoids:** Pitfalls 1-4, 10, 17 — explicit manifest `scope`/`start_url`/`id` = `/hrv/`; `autoUpdate` + in-session reload guard for the stale-cache trap; maskable-icon 80% safe-zone + explicit apple-touch-icon + `theme-color`; prod-build verification via `npm run build && vite preview` under `/hrv/`. The phase plan MUST budget a first-class real-device UAT task (iOS standalone + Android Chrome) as a named deliverable.

### Phase Ordering Rationale

- **Smallest-blast-radius first** — the operator ordering (#1 docs -> #2 content/UI -> #3 the big UI change -> #4 content review -> #5 the most novel surface) is sound; the architecture researcher confirmed no cross-feature dependency forces a different order.
- **PT-BR review (#4) must follow #2 and #3** — both add new `// TODO: native-speaker review` markers; the "grep for marker count == 0" done-signal is only meaningful once all marker-producing phases have landed. This is the one ordering refinement the research surfaced and it is already reflected in the operator sequence.
- **PWA (#5) last** — service-worker caching should wrap a frozen, verified app; doing it earlier means re-verifying offline behavior after every subsequent change.
- **Each feature = one cohesive, independently shippable phase** — Phases 23-27, continuing from v1.2's Phase 22.

### Research Flags

Phases likely needing deeper research / a dedicated planning pass:
- **Phase 27 (PWA):** The only phase that genuinely warrants extra care. Not because PWA tooling is poorly documented (it is well-documented — confidence is HIGH), but because the **`/hrv/` base-path vs SW-scope interaction, the iOS standalone-mode audio/Wake-Lock landmines, and the SW-vs-pre-paint-FOUC-script interaction** are project-specific and not testable in jsdom. The phase plan must budget a **first-class real-device UAT task** (iOS standalone + Android Chrome) as a named deliverable, not a carry-forward — directly mirroring the v1.0 retro lesson.
- **Phase 25 (toggle):** Light flag only — the picker pattern is established and proven 4x, but the plan should explicitly resolve two open questions at planning: (a) live-swappable vs capture-at-start (research recommends live), and (b) "is the In/Out indicator on screen before a session starts?" (decides whether pre-paint FOUC handling is needed).

Phases with standard patterns (no research-phase needed):
- **Phase 23 (LICENSE + README):** Pure docs; MIT is the settled recommendation.
- **Phase 24 (Forrest links):** Verbatim reuse of the existing `LearnLink` pattern; only input needed is the confirmed Apple App Store URL.
- **Phase 26 (PT-BR review):** Process/content task; the guards (`lockedCopy.test.ts`, `tsc` completeness, marker grep) are already in place.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | PWA tooling, base-path interaction, Vite 8 peer-dep, and icon spec verified against official Vite PWA docs, the plugin's GitHub issues (#918/#923/#263), MDN, and web.dev. v1.3.0 (2026-05-05) confirmed as the Vite-8-compatible release. |
| Features | HIGH | Install UX, app-store badge conventions, a11y patterns, and licensing verified against MDN / web.dev / Apple + Google official guidelines. One MEDIUM spot: the Apple App Store numeric ID for Forrest's Resonant Breathing app could not be directly retrieved — must be confirmed at planning. |
| Architecture | HIGH | The codebase was read directly; every v1.3 file maps to an existing sibling-clone template. PWA integration verified against vite-plugin-pwa 1.3.0. |
| Pitfalls | HIGH | PWA pitfalls verified against Vite PWA docs, the WebKit bug tracker (254545, 198277), and Safari 18.4 release notes; project-specific pitfalls verified against PROJECT.md / MILESTONES.md / RETROSPECTIVE.md / `index.html` / `vite.config.ts`. |

**Overall confidence:** HIGH

### Gaps to Address

- **Apple App Store URL for Forrest's Resonant Breathing app** — the Google Play package ID is confirmed (`com.johngoodstadt.knutson.meditation`); the Apple numeric App ID was not directly retrievable. Handle during Phase 24 planning: search the App Store for "Resonant Breathing" by Forrest Knutson / Meditative Mellows and confirm the canonical store URL before implementation.
- **PROJECT.md stack line is stale** — it says "React 18 + Vite + TypeScript"; the actual stack is React 19.2 + Vite 8.0 + TypeScript 6. Correct PROJECT.md during requirements/roadmap; ensure all v1.3 planning targets the real versions (load-bearing for the `vite-plugin-pwa@^1.3.0` peer-dep).
- **Marker count drift** — PROJECT.md cites 76 PT-BR markers; the catalogs currently hold ~91 (v1.2 stretch strings added more), and Phases 24/25 will add a few more. The Phase 26 done-signal must be "grep returns 0", not a fixed number.
- **Operator decisions to confirm at planning** — (1) toggle live-swappable vs capture-at-start (research recommends live); (2) PWA SW update strategy `autoUpdate` vs `prompt` (research recommends `autoUpdate` + in-session reload guard); (3) Forrest store links as official badge artwork vs styled text links (badges preferred if guideline-compliant); (4) whether to ship an Android/desktop `beforeinstallprompt` install button (research recommends deferring — a correct manifest suffices).

## Sources

### Primary (HIGH confidence)
- [Vite PWA — Getting Started / Service Worker Precache / generateSW / Auto Update](https://vite-pwa-org.netlify.app/guide/) — devDependency install, manifest generation, globPatterns, skipWaiting/clientsClaim/cleanupOutdatedCaches, base-path derivation
- [vite-plugin-pwa releases — v1.3.0 (2026-05-05)](https://github.com/vite-pwa/vite-plugin-pwa/releases) and [Vite 8 support Issues #918 / #923](https://github.com/vite-pwa/vite-plugin-pwa/issues/918) — current version, Vite 8 peer-dependency support
- [MDN — Making PWAs installable / Define your app icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) — install criteria, iOS ignores manifest icons, apple-touch-icon precedence, 80% maskable safe zone
- [web.dev — Web app manifest / Installation prompt](https://web.dev/learn/pwa/web-app-manifest) — manifest fields, maskable safe zone, beforeinstallprompt
- [WebKit Bug 254545 — Wake Lock in Home Screen Web Apps (fixed iOS 18.4)](https://bugs.webkit.org/show_bug.cgi?id=254545), [Bug 198277 — standalone audio foreground loss](https://bugs.webkit.org/show_bug.cgi?id=198277), [Safari 18.4 Release Notes](https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes)
- [Apple App Store Marketing Resources](https://developer.apple.com/app-store/marketing/guidelines/) and [Google Play Badge Guidelines](https://partnermarketinghub.withgoogle.com/brands/google-play/visual-identity/badge-guidelines/) — official, unmodified badge artwork rules
- [choosealicense.com](https://choosealicense.com/) — MIT recommendation for permissive hobby projects
- Codebase read directly — settings.ts, prefs.ts, useVariantChoice.ts, useVisualVariant.ts, VariantPicker.tsx, SettingsDialog.tsx, BreathingShape.tsx, OrbShape.tsx, LearnDialog.tsx, learnContent.ts, lockedCopy.ts, lockedCopy.test.ts, strings.ts, App.tsx, index.html, vite.config.ts, package.json; .planning/PROJECT.md, MILESTONES.md, RETROSPECTIVE.md

### Secondary (MEDIUM confidence)
- [vite-plugin-pwa Issues #263 / #764 — Manifest / SW in a subdirectory](https://github.com/vite-pwa/vite-plugin-pwa/issues/263) — community confirmation of the subpath/scope pitfall, corroborated by docs
- [PWA iOS Limitations and Safari Support guide (2026)](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) and [firt.dev — iOS PWA Compatibility](https://firt.dev/notes/pwa-ios/) — iOS quirks: no beforeinstallprompt, storage quota, apple-touch-icon
- [Resonant Breathing — Google Play listing](https://play.google.com/store/apps/details?id=com.johngoodstadt.knutson.meditation) — confirms Forrest Knutson app + Android package ID
- [A11Y Collective — ARIA labels](https://www.a11y-collective.com/blog/aria-labels/) — aria-label as a "last-resort code smell"; sr-only text preferred

### Tertiary (LOW confidence)
- Apple App Store numeric ID for Forrest's Resonant Breathing app — not directly retrievable; must be confirmed during Phase 24 planning

---
*Research completed: 2026-05-15*
*Ready for roadmap: yes*
