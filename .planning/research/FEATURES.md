# Feature Research

**Domain:** v1.3 Release Polish for a shipped local-only HRV breathing webapp (React + Vite + TS)
**Researched:** 2026-05-15
**Confidence:** HIGH (PWA install UX, app-store badge conventions, a11y patterns, licensing — all verified against MDN / web.dev / Apple + Google official guidelines; MEDIUM on Forrest app-store URLs — Google Play package ID confirmed, Apple App Store numeric ID not directly retrievable and must be confirmed at planning)

This is a **polish milestone, not a feature expansion**. Five tightly-scoped additions make a shipped app distribution-ready. The research below treats "table stakes" as "what makes each addition actually correct/complete" and "anti-features" as "scope traps to explicitly refuse." None of the five features touches the breathing engine, timing, or audio scheduling.

---

## Feature 1 — LICENSE + README

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| A `LICENSE` file at repo root | A public hobby repo without a license is "all rights reserved" by default — confusing and unfriendly | LOW | MIT recommended: shortest, permissive, includes the all-caps no-warranty + no-liability clause by default. Single file, copyright line `Copyright (c) 2026 Renato Lucindo`. |
| README "what this is" + screenshot/GIF | First thing a visitor reads; the app is visual, so a screenshot communicates faster than prose | LOW | Reuse the PROJECT.md "What This Is" paragraph. One orb screenshot or short GIF. |
| README "run locally" (clone / `npm install` / `npm run dev`) | Anyone forking a Vite app expects the standard three commands | LOW | Already-standard Vite scripts; no new tooling. |
| Claim-safe / "not medical advice" line in README | The locked in-app disclaimer must be mirrored in the repo's front door; the project's defining constraint | LOW | Reuse the existing `LOCKED_COPY` two-line disclaimer verbatim. Do NOT paraphrase — drift risk. |
| "Inspired by Forrest Knutson's teachings" attribution, no protected branding | PROJECT.md Out-of-Scope: no unlicensed logos/assets; attribution is required and welcomed, branding is not | LOW | Text + plain links only. Same posture as the Learn surface. |
| Tech-stack one-liner | Contributors/forkers want to know React+Vite+TS before cloning | LOW | One line; matches PROJECT.md "Tech stack". |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Feature list grouped by capability (sessions / visuals / audio / themes / i18n / PWA) | Communicates the depth of a ~19k-LOC app that looks simple | LOW | Bulleted; derived from PROJECT.md validated requirements. |
| "Privacy: 100% local, no backend, no tracking" callout | A genuine, verifiable differentiator vs. most wellness apps; reassures users at a glance | LOW | True per PROJECT.md constraints — state it plainly. |
| Link to the live deployed app + the two Forrest native apps | Connects the README to both the running product and the original inspiration | LOW | Pairs naturally with Feature 2's store links. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Non-commercial / CC-style "no commercial use" license | Owner instinct to prevent others profiting from a hobby project | "Non-commercial" clauses are NOT OSI-approved, are legally vague, scare off contributors, and don't match a hobby project's actual goal | MIT — permissive, well-understood, no-warranty clause already covers liability. If stronger copyleft is desired, GPL-3.0; do not invent a custom NC license. |
| CONTRIBUTING.md, CODE_OF_CONDUCT, issue templates, badges-wall | "Real" open-source projects have them | Solo hobby project — process scaffolding nobody will use; pure scope creep in a polish milestone | One README. Add governance docs only if/when real contributors appear. |
| Auto-generated API/architecture docs | Documenting the ~19k-LOC internals feels thorough | Maintenance burden, instantly stale, not what a webapp visitor needs | Keep the rich internal docs in `.planning/`; README stays user-facing. |
| Changelog / release-notes file | Mirrors MILESTONES.md | `.planning/MILESTONES.md` already is the changelog | A one-line "see .planning/ for development history" link at most. |

**Recommended license: MIT.** Permissive, ~20 lines, OSI-approved, universally understood, and its all-caps `AS IS` / no-liability clause is exactly the legal shield a no-warranty hobby breathing app wants. A "non-commercial" license would be the wrong instinct — see anti-features.

---

## Feature 2 — Forrest Native-App Links on the Learn Surface

Forrest Knutson's free **Resonant Breathing** app exists on both stores. Google Play package ID confirmed: `com.johngoodstadt.knutson.meditation` → `https://play.google.com/store/apps/details?id=com.johngoodstadt.knutson.meditation`. The Apple App Store listing exists but its numeric App ID must be confirmed at planning time (search "Resonant Breathing" by Forrest Knutson / Meditative Mellows on the App Store).

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Two outbound links — iOS App Store + Google Play | The app is web-first; pointing power users to the official native apps is honest and useful | LOW | Add to the existing `LearnDialog` content alongside YouTube/Website/book links. New entries in `learnContent.ts`, same pattern. |
| Links open in a new tab/window, `rel="noopener noreferrer"` | Same as every other external link in the Learn dialog (YouTube, Amazon) | LOW | Match existing Learn link attributes exactly — consistency, not a new pattern. |
| Honest, claim-safe link copy | The Learn surface has locked claim-safe copy; new copy must not over-promise | LOW | e.g. "Forrest's free Resonant Breathing app — iPhone" / "— Android". No medical claims. Plain, factual. |
| EN + PT-BR strings for the new entries | Every UI string in the app is bilingual (I18N-01..06) | LOW | Two short labels per locale. Coordinate with Feature 4's PT-BR pass. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Official store badge artwork (Apple "Download on the App Store" + Google "Get it on Google Play") | Instantly recognizable, looks professional, and is the convention store guidelines actually expect | LOW–MEDIUM | Must use **unmodified official badge SVG/PNG** (Apple Marketing Resources; Google Play Partner Marketing Hub). Apple badge first when both shown; equal-or-larger sizing for the Play badge; do not recolor/resize/crop. Bundle artwork locally (project constraint: no externally-hosted assets) and respect the mandated clear-space. |
| A short "also available as native apps" framing sentence | Sets context — these are Forrest's apps, this web app is the inspired-redesign sibling | LOW | One sentence; reinforces the "inspired redesign, not a clone" positioning from PROJECT.md. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Smart App Banner / deep-link / "open in app" interception | "Seamless" hand-off to native | Requires the native apps' association files (which this project does not own/control), adds meta tags and platform-detection complexity; pure scope creep | Plain outbound links to the public store listings. The store handles "open vs install." |
| OS-sniffing to show only "your platform's" badge | Cleaner UI | Brittle UA detection, breaks on desktop, hides the other platform for households with mixed devices | Show both badges always — desktop users may be choosing for their phone. |
| Custom-designed badges / recolored to match the active theme | Visual harmony with the 5 themes | Violates Apple AND Google badge guidelines (no modification of color/proportion/elements) — a real compliance issue | Use official badges as-is. They sit fine on any theme background with the mandated clear-space. If a theming clash is unacceptable, fall back to plain styled text links. |
| Reviews, ratings, screenshots embedded from the stores | Richness | Requires store APIs, goes stale, adds weight to a lean offline app | Just the link/badge. The store page has all of that. |

---

## Feature 3 — Labels-vs-Icons Toggle (In-Orb Breathing Cue)

A 5th `SettingsDialog` radiogroup picker (joining Theme / Variant / Timbre / Language) switching the in-orb In/Out cue between **text labels** ("In"/"Out", localized) and **arrow icons** (directional — expand/up for inhale, contract/down for exhale). **This is the highest-dependency feature of the milestone** — it touches visual variants, i18n, a11y, and reduced-motion simultaneously.

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Default = **text labels** (current behavior) | v1.0/v1.1 shipped text; the default must preserve existing UX byte-for-byte for users who never open Settings (the TIMBRE-02 "Bowl byte-identical" precedent) | LOW | Default `'labels'`; coerce-on-read fallback for unknown stored values (Phase 14 INFRA pattern). |
| 5th radiogroup picker in SettingsDialog, identical to the existing 4 | The dialog already has 4 radiogroups; a 5th must match interaction, focus, and the `inSessionView` disable contract exactly | LOW–MEDIUM | Clone the existing picker component/pattern. No new dialog infrastructure. |
| Choice persists via the localStorage `Envelope.prefs` shape | Every other picker persists; this one must too | LOW | New field in the `prefs` envelope + domain validator + `coerceSettings` fallback. No `STATE_VERSION` bump (forward-compat read contract). |
| Icon mode has an accessible name on the cue (screen-reader gets "In"/"Out") | An icon-only cue must NOT lose the semantic label — WCAG. Research is unambiguous: visible-text > sr-only text > aria-label | MEDIUM | **Preferred: visually-hidden (`.sr-only`) localized "In"/"Out" text alongside the arrow, with `aria-hidden="true"` on the decorative SVG.** This survives machine translation and is the documented best practice. `aria-label` is the "last-resort code smell" fallback only. |
| Localized text labels in BOTH modes' a11y layer | Even in icon mode, the sr-only text must be localized (EN: In/Out, PT-BR: Puxa/Solta per the v1.1 UAT-2 decision) | LOW | Reuse the existing `In`/`Out` localized strings — no new translation for the words themselves. |
| Works across all 3 visual variants (Orb / Square / Diamond) | The cue renders inside every variant; the toggle must be variant-agnostic | MEDIUM | The In/Out cue is rendered by the shape dispatcher's shared layer — verify the icon swap lives at the cue layer, not per-variant. If the cue is currently variant-specific, this is the main implementation cost. |
| Honors reduced-motion | The existing reduced-motion path crossfades instead of scaling; arrow icons must not introduce motion that bypasses `prefers-reduced-motion` | MEDIUM | The arrow is a static directional glyph that swaps on phase change (In↔Out) — same crossfade treatment as the text label today. No spinning/sliding arrows. The icon is a *symbol*, not an *animation*. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Icon mode = language-neutral cue | An arrow needs no translation; useful for non-EN/PT-BR speakers and reduces in-orb text for a cleaner minimalist look | LOW | This is the genuine user value — pairs well with the meditative aesthetic. |
| Capture choice at session start (snapshot, like Variant/Timbre) | Consistency with `sessionVariantRef`/`timbreRef` — mid-session changes shouldn't mutate a running session | LOW–MEDIUM | Decide at planning: snapshot-at-Start (matches Variant/Timbre, CUST-03/TIMBRE precedent) vs. live-reactive. Snapshot is the established pattern and lower-risk. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Animated/morphing arrows (arrow grows, rotates, slides) | "More dynamic" | Conflicts with the orb's own scale animation, fights reduced-motion, adds motion the design deliberately avoids | Static directional glyph that crossfades on phase change — identical motion budget to today's text label. |
| A third option ("both icon + text") | "Why not let users have both" | Crowds the small in-orb space, undermines the picker's binary clarity, more layout/variant testing | Binary picker. The sr-only text already gives screen-reader users "both" semantically. |
| Custom icon set / per-theme icon styling | Visual richness | Scope creep; 5 themes × 3 variants × 2 cue arrows = a test-matrix explosion | One simple arrow pair (e.g. inline SVG, `currentColor`) that inherits the existing token color. |
| `aria-label` on the icon as the primary a11y mechanism | Less markup | Documented "code smell": inconsistent AT support, not picked up by machine translation | Visually-hidden localized text + `aria-hidden` on the SVG. `aria-label` only if a layout constraint truly blocks sr-only text. |
| Free-form "choose your own glyph/emoji" | Personalization | Infinite combinatorial surface, an a11y nightmare | Two curated arrows, full stop. |

---

## Feature 4 — PT-BR Native-Speaker Review (I18N-07)

76 strings carry `// TODO: native-speaker review`. This is a **content-quality pass, not a code feature** — "done" is a definition, not a build.

### Table Stakes ("Done" Looks Like This)

| Item | Why Expected | Complexity | Notes |
|------|--------------|------------|-------|
| All 76 markers resolved — every string read by a PT-BR native speaker, corrected if needed | The literal I18N-07 carry-forward; markers are a debt register | LOW (effort) / MEDIUM (coordination) | The work is reviewing, not engineering. A marker is removed only after a human PT-BR speaker signs off the string. |
| Every `// TODO: native-speaker review` comment removed | Markers must not outlive the review — leftover markers misrepresent state | LOW | Mechanical delete after each string is approved. |
| Translations read naturally to a native speaker (not literal machine output) | The whole point: machine translation is grammatically plausible but often stilted / wrong-register | LOW | Calm, warm, non-clinical register — matches the app's tone constraint. |
| Locked claim-safe copy stays claim-safe in PT-BR | The disclaimer / "inspired by" copy is frozen-EN guarded; the PT-BR equivalent must carry zero medical claims | LOW | If the review touches `LOCKED_COPY` PT-BR strings, re-verify against the claim-safe constraint and the `lockedCopy.test.ts` guard. |
| Domain-correct breathing vocabulary | "Inhale/exhale", "breaths per minute", "warm-up/stretch/settle", timbre names — terms a PT-BR meditator would actually recognize | LOW | Confirm v1.1 UAT-2 choices (In/Out → Puxa/Solta, Bowl → Taça) still hold; the reviewer is the authority. |
| UI doesn't break with corrected strings (length/layout) | PT-BR strings often run longer than EN; a fix could overflow a button or the in-orb cue | LOW–MEDIUM | Visual smoke-check after edits — especially the in-orb cue, picker labels, buttons. The frozen-EN byte-equality guard still passes (only PT-BR changes). |
| Full green-gate after edits (`tsc && lint && build && test`) | The per-commit invariant — string edits still run the gate | LOW | Translations live in a typed `Record<LocaleId, UiStrings>`; a dropped key is a compile error. |

### Differentiators

| Item | Value Proposition | Complexity | Notes |
|------|-------------------|------------|-------|
| Consistency pass — the same term translated the same way everywhere | A glossary-level review catches "BPM" / "breaths" rendered three different ways | LOW | The reviewer keeps a small term list while going through the 76. |
| Date/number formatting spot-check for the pt-BR locale | i18n review checklists flag locale formatting; `formatLastSessionDate(locale)` already exists | LOW | Confirm the existing locale-aware date formatting reads correctly to the reviewer; no code change expected. |

### Anti-Features

| Item | Why Requested | Why Problematic | Alternative |
|------|---------------|-----------------|-------------|
| Adding a third language while "in there anyway" | Momentum | Out of scope for a polish milestone; multiplies the review surface and test matrix | Finish PT-BR. New languages are a separate future milestone. |
| Adopting an i18n library / translation-management platform | "Proper" i18n tooling | The roll-your-own typed catalog works and is zero-runtime-dep; swapping it is a migration, not a polish | Keep the existing `Record<LocaleId, UiStrings>` catalog. |
| Re-translating EN copy / re-opening locked English strings | Review momentum | Frozen-EN is guarded by `lockedCopy.test.ts` for a reason — copy-drift protection | Touch PT-BR only. EN locked copy is immutable here. |
| Machine-re-translating with a "better" model and skipping the human | Faster | I18N-07 explicitly requires a *native speaker*; a better machine model is still not a native speaker | A human PT-BR speaker reviews. That is the requirement. |

---

## Feature 5 — PWA Install (Full Offline) — PWA-01

Web App Manifest + maskable icons + Apple touch icon + a service worker precaching the app shell for full offline session use. The app is **already an ideal PWA candidate**: single-purpose, local-only, no backend, no network calls during a session.

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `manifest.webmanifest` — name, short_name, start_url, scope, `display: standalone`, theme/background color, icons | The baseline of "installable"; Chrome's install criteria require it | LOW–MEDIUM | `vite-plugin-pwa` generates it. `theme_color`/`background_color` should pick a neutral palette value (the app has 5 themes — choose one stable default; the static manifest can't be per-theme). |
| Icon set — 192px + 512px, plus a **maskable** 512px icon | Android adaptive icons crop non-maskable icons badly; maskable is table stakes, not optional | LOW | Reuse/extend the existing favicon SVG → export PNGs with proper maskable safe-zone padding. |
| `apple-touch-icon` link + `apple-mobile-web-app-*` meta tags | iOS reads `apple-touch-icon` (overrides manifest icons if present); needed for a correct home-screen icon | LOW | Single 180×180 PNG + meta tags in `index.html`. iOS 26 opens home-screen sites as web apps even without a manifest, but the tags ensure the icon/title are right. |
| Service worker precaching the app shell (JS/CSS/HTML + icons) | "Full offline session use" is the stated goal — the SW must serve the shell with zero network | MEDIUM | `vite-plugin-pwa` + Workbox `generateSW`; `globPatterns` for js/css/html + the icon PNGs. The app already has no runtime network dependency, so a precache-only strategy is sufficient — no runtime caching handlers needed. |
| Offline = full session works (timing, orb, audio, settings, stats) | "Full offline session use" is the promise — the entire core experience must run with the network off | MEDIUM | Audio is synthesized (no asset fetch), state is localStorage, no backend — offline-capable by architecture. The SW just needs to serve the shell. Verify in DevTools "Offline." |
| Install affordance: rely on browser UI on desktop/Android; **explicit iOS instructions** | Chrome/Edge surface their own install affordance via `beforeinstallprompt`; iOS Safari has NO `beforeinstallprompt` and no auto-prompt | MEDIUM | iOS users must be told: tap Share → "Add to Home Screen." Show this hint **only in browser display-mode** (hide when already `standalone`). |
| Standalone display mode — no browser chrome once installed | Users expect an installed app to look like an app | LOW | `display: standalone` in the manifest delivers this on all platforms. |
| Update handling — a new deploy reaches installed users | A cached PWA can otherwise serve a stale build forever | LOW–MEDIUM | `vite-plugin-pwa` `registerType`: `autoUpdate` is simplest (refresh-on-next-load). `prompt` ("new version available — reload") is more correct for an app a user keeps open. Recommend `autoUpdate` for this lean single-page tool; flag at planning. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Custom in-app install button on Android/desktop (capture `beforeinstallprompt`, show own button) | More context/branding than the browser's generic affordance; lets the app *invite* installation | MEDIUM | Capture the deferred event, show a tasteful "Install" button, call `prompt()` on click. Must hide in `standalone` mode and when no event has fired. Genuinely nice — but optional. |
| iOS "Add to Home Screen" mini-guide (Share-icon illustration) | iOS install is non-obvious; a tiny visual guide meaningfully lifts iOS installs | LOW–MEDIUM | A small dismissible hint, or a line in Settings/Learn. Render only in iOS Safari + browser mode. |
| Maskable + monochrome icon / themed splash polish | Looks first-class on the home screen and at launch | LOW | The iOS splash is generated from `background_color` + icon; getting the safe-zone right is the main effort. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Aggressive install nag (modal/banner on first visit) | "Drive installs" | Hostile UX, especially before the user has tried the app; users dismiss and resent it | Quiet, dismissible affordance; let the user reach for it. Honor a "dismissed" flag. |
| Runtime caching strategies / background sync / periodic sync | "Proper offline-first" | The app has NO backend and NO runtime network requests — runtime caching handlers solve a problem that doesn't exist; background sync is unreliable on iOS anyway | Precache-only `generateSW`. There is nothing to runtime-cache. |
| Push notifications / "time to breathe" reminders | Engagement | Out of scope (PROJECT.md: no gamified pressure, calm tone); iOS push needs an installed PWA + is fiddly; adds a permission prompt | None. Reminders contradict the app's calm, low-pressure philosophy. |
| Hand-rolled service worker | "Full control" | SW lifecycle / precache-manifest bugs are notorious; reinventing Workbox is a footgun | `vite-plugin-pwa` (Workbox wrapper). Build-time dep only — the runtime-deps invariant holds. |
| Trying to make iOS behave like Android (force an install prompt) | Parity | iOS genuinely has no `beforeinstallprompt`; any "fix" is a hack | Detect iOS Safari, show manual instructions. Accept the platform difference. |
| `display: fullscreen` (hide the status bar) | "Immersive" | Hides the clock/battery; users mid-meditation may want them; `standalone` is the expected default | `display: standalone`. |

---

## Feature Dependencies

```
Feature 1 (LICENSE + README)
    └── independent — pure docs, zero code, smallest blast radius (operator-ordered first)

Feature 2 (Forrest store links)
    └──requires──> existing LearnDialog + learnContent.ts  (extend, don't rebuild)
    └──requires──> existing i18n catalog (EN + PT-BR strings for new entries)
    └──enhances──> Feature 1 (README can reuse the same two store links)

Feature 3 (Labels-vs-icons toggle)  ← HIGHEST DEPENDENCY FEATURE
    └──requires──> SettingsDialog (add 5th radiogroup, clone existing picker pattern)
    └──requires──> Envelope.prefs storage shape (new persisted field + domain validator + coerce-on-read)
    └──requires──> i18n catalog (sr-only "In"/"Out" must be localized; reuses existing words)
    └──requires──> all 3 visual variants (cue must render variant-agnostically)
    └──requires──> reduced-motion path (static glyph crossfade, no new motion)
    └──interacts──> a11y (sr-only localized text + aria-hidden SVG — NOT aria-label)

Feature 4 (PT-BR native-speaker review)
    └──requires──> i18n catalog (the 76 marked strings)
    └──interacts──> Feature 2 (review the new store-link PT-BR strings in the same pass)
    └──interacts──> Feature 3 (review/confirm the cue picker's PT-BR labels in the same pass)
    └──constrained-by──> frozen-EN lockedCopy.test.ts guard (touch PT-BR only)

Feature 5 (PWA install)
    └──requires──> build-time dep: vite-plugin-pwa (runtime-deps invariant still holds — flag at planning)
    └──requires──> icon assets (extend existing favicon SVG → maskable + apple-touch PNGs)
    └──enhances──> already-offline-capable architecture (synth audio + localStorage + no backend)
    └──independent of──> Features 2/3 (no shared surface)
```

### Dependency Notes

- **Feature 3 is the integration hotspot.** It is the only feature that simultaneously touches SettingsDialog, the persistence envelope, i18n, all 3 visual variants, reduced-motion, AND a11y. Plan it with the most care; verify the In/Out cue renders from a *shared* layer, not per-variant code.
- **Feature 4 should run after (or alongside the tail of) Features 2 and 3.** Both add new PT-BR strings; folding them into the single native-speaker pass avoids a second review round.
- **Feature 1 is genuinely independent** — pure docs, can land first (matching the operator ordering) with zero risk to the app.
- **Feature 5 is independent of 2/3/4** — no shared UI surface; its only coupling is the new build-time `vite-plugin-pwa` dependency, which must be explicitly flagged against the zero-net-new-*runtime*-deps invariant.

---

## MVP Definition

This is a polish milestone — the "MVP" is the milestone's must-ship core.

### Launch With (v1.3 core)

- [ ] **MIT `LICENSE` + user-facing README** — repo distribution-readiness; zero code risk
- [ ] **Two Forrest store links in LearnDialog** (official badges preferred; styled text links acceptable fallback) — honest pointer to the original native apps
- [ ] **Labels-vs-icons picker** — default `'labels'` (preserves current UX), persisted, all 3 variants, reduced-motion safe, sr-only localized a11y text
- [ ] **All 76 PT-BR markers resolved and removed** by a native-speaker review — closes the I18N-07 carry-forward
- [ ] **Installable offline PWA** — manifest + maskable/apple-touch icons + app-shell precaching SW; full offline session verified on Android Chrome and iOS Safari

### Add After Validation (in-milestone differentiators, low-risk)

- [ ] Official store badge artwork (vs. text links) for Feature 2 — if badge-guideline compliance + theme fit are confirmed
- [ ] Custom `beforeinstallprompt` install button on Android/desktop — if the browser-native affordance feels insufficient
- [ ] iOS "Add to Home Screen" mini-guide with a Share-icon illustration

### Future Consideration (explicitly NOT v1.3)

- [ ] Third UI language — a separate i18n milestone
- [ ] Push / reminder notifications — contradicts the calm, no-pressure philosophy (PROJECT.md Out of Scope)
- [ ] Deep-linking / Smart App Banner to the native apps — requires assets/association files this project doesn't own

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| MIT LICENSE + README | MEDIUM (repo-facing) | LOW | P1 |
| Forrest store links (text or badge) | MEDIUM | LOW | P1 |
| Forrest store **badge artwork** (vs text) | LOW–MEDIUM | LOW–MEDIUM | P2 |
| Labels-vs-icons picker (core: default+persist+variants+a11y) | MEDIUM | MEDIUM | P1 |
| PT-BR native-speaker review (76 markers) | HIGH (PT-BR users) | LOW build / MEDIUM coordination | P1 |
| PWA install — manifest + icons + offline SW | HIGH | MEDIUM | P1 |
| PWA — custom `beforeinstallprompt` install button | MEDIUM | MEDIUM | P2 |
| PWA — iOS Add-to-Home-Screen mini-guide | MEDIUM (iOS only) | LOW–MEDIUM | P2 |

**Priority key:** P1 = must ship for v1.3 · P2 = should ship if low-risk · P3 = future.

---

## Competitor Feature Analysis

| Feature | Forrest's native Resonant Breathing apps | Typical wellness web apps | Our v1.3 approach |
|---------|------------------------------------------|---------------------------|-------------------|
| Distribution | App Store / Google Play listings | Often closed-source, no license | MIT license + public README; link OUT to Forrest's store listings (honest sibling positioning) |
| Install | Native install via store | Bookmark only, or an aggressive PWA nag | Installable PWA; quiet affordance; explicit iOS instructions; no nag |
| Offline | Native = inherently offline | Many require network | Full offline by architecture (synth audio + localStorage + no backend) — the SW just precaches the shell |
| Breathing cue | Clean animation, tone-only option | Text or animation | Choice: localized text OR a language-neutral arrow icon; a11y preserved in both |
| Languages | Single language | Often EN-only | EN + PT-BR, native-speaker reviewed |
| Branding | Forrest's own branding | — | Claim-safe "inspired by Forrest's teachings"; no protected assets; official store badges used unmodified per guidelines |

---

## Sources

- [Choose an open source license — choosealicense.com](https://choosealicense.com/) — MIT recommendation for permissive hobby projects
- [FOSSA — How to Choose the Right Open Source License](https://fossa.com/blog/how-choose-right-open-source-license/) — permissive vs copyleft; non-commercial-clause caveats
- [MDN — Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) — install criteria, render iOS instructions only in browser mode
- [web.dev — Installation prompt](https://web.dev/learn/pwa/installation-prompt) — `beforeinstallprompt`, custom in-page install UI
- [MagicBell — PWA iOS Limitations and Safari Support (2026)](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — no `beforeinstallprompt` on iOS; manual Add-to-Home-Screen
- [firt.dev — iOS PWA Compatibility](https://firt.dev/notes/pwa-ios/) — `apple-touch-icon` overrides manifest icons; iOS 26 home-screen behavior
- [Vite PWA — Service Worker Precache guide](https://vite-pwa-org.netlify.app/guide/service-worker-precache) — `generateSW`, `globPatterns`, precache manifest
- [Vite + PWA: Handling Offline Caching Correctly (2026)](https://www.enjoytoday.cn/posts/vite-pwa-guide/) — `autoUpdate` vs `prompt`, caching strategies
- [Apple — App Store Marketing Resources & Identity Guidelines](https://developer.apple.com/app-store/marketing/guidelines/) — official badge artwork, black badge, App Store badge placed first
- [Google Play — Badge Guidelines (Partner Marketing Hub)](https://partnermarketinghub.withgoogle.com/brands/google-play/visual-identity/badge-guidelines/) — no badge modification, clear-space, equal-or-larger sizing, badge generator
- [Resonant Breathing — Google Play listing](https://play.google.com/store/apps/details?id=com.johngoodstadt.knutson.meditation) — confirms Forrest Knutson app + Android package ID
- [A11Y Collective — ARIA labels](https://www.a11y-collective.com/blog/aria-labels/) — `aria-label` as "last-resort code smell"
- [Medium — When to use aria-label or screen reader only text](https://medium.com/design-bootcamp/when-to-use-aria-label-or-screen-reader-only-text-cd778627b43b) — sr-only text survives machine translation; preferred over `aria-label`
- [W3C — Short i18n review checklist](https://www.w3.org/International/i18n-drafts/techniques/shortchecklist) — i18n review coverage, locale formatting
- [Idea Translations — How to Evaluate Translation Quality](https://ideatranslations.com/2025/08/05/how-to-evaluate-translation-quality-your-8-point-checklist/) — natural flow, native-speaker definition of "done"

---
*Feature research for: v1.3 Release Polish — HRV Breathing WebApp*
*Researched: 2026-05-15*
