# Pitfalls Research

**Domain:** v1.3 Release Polish — adding 5 features (LICENSE/README, Forrest native-app links, labels-vs-icons toggle, PT-BR native-speaker review, PWA install with full offline) to an existing shipped HRV breathing SPA (React + Vite + TS, local-only, base-path `/hrv/`).
**Researched:** 2026-05-15
**Confidence:** HIGH (PWA section verified against Vite PWA docs + WebKit bug tracker + Safari 18.4 release notes; project-specific pitfalls verified against PROJECT.md / MILESTONES.md / RETROSPECTIVE.md / index.html / vite.config.ts)

This document is scoped to mistakes specific to adding **these** features to **this** system. Generic web pitfalls are omitted. The PWA feature (#5) is the highest-risk and is treated first and at the most depth.

---

## Critical Pitfalls

### Pitfall 1: Service-worker scope / manifest path mismatch under the `/hrv/` base

**What goes wrong:**
The app is served from `base: '/hrv/'`, not domain root. A service worker can only control URLs **at or below its own directory**. If the SW file lands at `/sw.js` (root) it cannot control `/hrv/*` pages; if the manifest `start_url`/`scope` say `/` while the app lives at `/hrv/`, the installed PWA either fails to register, controls nothing, or launches to a 404. The result is a "PWA" that installs but never goes offline — the failure is silent in dev and only appears in the prod build on the real host.

**Why it happens:**
PWA tutorials assume root deployment. `vite-plugin-pwa` mostly auto-derives paths from Vite `base`, but the manifest `scope`, `start_url`, and `id` still need to resolve to `/hrv/`, and a hand-rolled `navigator.serviceWorker.register()` call defaults `scope` to the SW file's own directory. Deploying to a subpath is exactly the case the plugin's own issue tracker (#263, #764) shows people getting wrong.

**How to avoid:**
- Use `vite-plugin-pwa` (build-time dependency — allowed; runtime invariant intact, and PROJECT.md already flags this) so SW + manifest emit under `base` automatically. Do **not** hand-roll the SW registration.
- Explicitly set manifest `scope: '/hrv/'`, `start_url: '/hrv/'`, `id: '/hrv/'`. Do not leave them defaulted.
- Confirm the emitted `sw.js` and `manifest.webmanifest` land under `dist/` referenced through `/hrv/` (not `/`).
- Reference manifest assets the same way the favicon already does — via `%BASE_URL%` substitution or plugin-managed paths — so a future `base` change does not silently break them (the established Phase 12 D-04 pattern).

**Warning signs:**
- `npm run build` then a root-served static preview "works" — but the real host serves under `/hrv/` and DevTools → Application → Service Workers shows "no SW" or scope `/`.
- Lighthouse PWA audit reports "start_url is not in scope" or "does not respond with 200 when offline."
- Installed app launches to a blank page or 404.

**Phase to address:** PWA phase (manifest + SW setup task). Verify this first, before any caching-strategy work.

---

### Pitfall 2: Stale-cache trap — installed PWA serves an outdated app shell after deploy

**What goes wrong:**
A precache service worker keeps serving the previously cached `index.html` + JS bundle. After a deploy, returning users get the **old** app indefinitely (or until they manually clear storage). For this app that means a shipped bug fix, a translation correction, or a new theme never reaches an installed user — the worst kind of regression because it is invisible to the team (their browser updated) and permanent for the user.

**Why it happens:**
The point of a precache SW is cache-first delivery; without an explicit update strategy the old SW stays in the `waiting` state and the old cache stays authoritative. Hashed asset filenames help with sub-resources but the SW itself and the cache manifest still need to roll over.

**How to avoid:**
- Use `vite-plugin-pwa` with `registerType: 'autoUpdate'`. This forces Workbox `skipWaiting: true` + `clientsClaim: true` (a new SW takes control immediately) and `cleanupOutdatedCaches: true` (default in `generateSW` mode — purges prior-version caches).
- Accept the documented `autoUpdate` tradeoff: it can reload a tab and lose in-progress input. For this app the only stateful surface is a running breathing session, and a mid-session reload is bad. **Recommendation:** `autoUpdate` + an "is a session running?" guard that defers the reload until the session ends / the app is idle. Document this as an explicit decision in the phase plan.
- Alternative: `prompt`-for-update with a calm "update available" affordance — heavier UI work, weaker fit for a hands-off app.

**Warning signs:**
- After a deploy, a hard refresh shows new content but a normal revisit shows old content.
- DevTools → Application → Service Workers shows a SW stuck in "waiting to activate."
- Post-deploy operator UAT: old copy / old behavior persists on a device that had the PWA installed.

**Phase to address:** PWA phase (SW update-strategy task). Must be decided at planning, not discovered at UAT.

---

### Pitfall 3: iOS Safari PWA standalone-mode audio / Wake Lock regressions vs a browser tab

**What goes wrong:**
The app's two hands-off pillars — Web Audio cues and Screen Wake Lock — can behave **differently** in an iOS Home Screen ("Add to Home Screen") standalone PWA than in a Safari tab, and the difference only appears on a real device. Two verified facts:
- **Wake Lock**: was *broken* in iOS Home Screen Web Apps from iOS 16.4 through 18.3.1 (WebKit bug 254545) and only **fixed in iOS/iPadOS 18.4** (Safari 18.4 release notes, March 31, 2025). Users on iOS < 18.4 who install the PWA get **no wake lock at all** even though the same code works in a Safari tab on the same device.
- **Audio**: WebKit has a long-standing class of standalone-PWA audio bugs (WebKit 198277, Apple Developer Forums thread 762582) where audio stops when the standalone app loses foreground / the device sleeps. This compounds the project's *already-deferred* iOS Safari mid-page audio-session-loss carry-forward (Override SC1).

**Why it happens:**
iOS treats a standalone PWA as a separate runtime from the Safari tab, with its own (more restrictive) lifecycle. Wake Lock progressive enhancement means a missing API degrades *silently* — exactly the failure that hides until real-device UAT. jsdom cannot model any of this.

**How to avoid:**
- Keep Wake Lock strictly progressive-enhancement (it already is — two-ref pattern, idempotent release). No new code needed; the new risk is only "does standalone mode change behavior."
- Treat "installed PWA on iOS" as a **distinct UAT target** separate from "Safari tab on iOS." Both must be walked through on a real device before the PWA feature is declared done.
- Set milestone expectations: on iOS < 18.4 the installed PWA will not hold the screen awake. Decide whether that is an acceptable shipped state (likely yes — document as a known limitation) or whether to detect standalone mode (`navigator.standalone` / `display-mode: standalone` media query) and show guidance.
- Do **not** assume audio + wake lock that passed v1.0/v1.1/v1.2 tab-mode UAT still pass in standalone mode — re-verify.

**Warning signs:**
- jsdom/Vitest suite is fully green but the installed app on a physical iPhone lets the screen sleep mid-session, or audio cuts when the screen locks.
- UAT was done in a Safari tab only and the "PWA" box was checked from that.

**Phase to address:** PWA phase — explicit real-device UAT task with iOS standalone mode as a named target. Directly mirrors the v1.0 retro lesson: "jsdom polyfill semantics ≠ real WebKit audio session semantics; manual real-device UAT is not optional for audio + wake lock + visibility flows."

---

### Pitfall 4: Service worker interfering with the pre-paint inline scripts (theme FOUC + per-theme favicon)

**What goes wrong:**
`index.html` runs a single combined pre-paint inline script (Phase 16 theme FOUC + Phase 21 per-theme favicon — both read `localStorage` synchronously before first paint). A precache SW serves a cached copy of `index.html`. If the SW caches a stale `index.html`, the inline script the user runs is stale too — a theme/favicon logic fix never reaches installed users. Separately, if `index.html` is served via a SW navigation-fallback that strips or reorders head content, the FOUC script could be delayed past first paint, reintroducing the exact FOUC the Phase 16/21 inline script exists to prevent.

**Why it happens:**
The inline script lives *inside* the precached HTML document, so it inherits every staleness and fallback-routing pitfall of the HTML itself. Teams think of the SW as caching "assets" and forget the inline `<script>` is now also cache-governed.

**How to avoid:**
- The Pitfall 2 fix (`autoUpdate` + `cleanupOutdatedCaches`) covers staleness — but explicitly verify it covers `index.html` and its inline script, not just hashed JS.
- Keep the inline script inline (do not let a PWA refactor move it to an external file — an external file is independently cacheable and adds a round-trip, worsening FOUC).
- Confirm the SW navigation fallback returns the **precached `index.html` verbatim** (Workbox `navigateFallback` to the app shell) with head + inline script intact.
- After the PWA phase, re-run the theme-FOUC and favicon-FOUC checks (no flash on reload) **in installed standalone mode**, not just in a tab.

**Warning signs:**
- Theme/favicon flash on launch of the installed PWA even though a browser tab shows no flash.
- A theme or favicon logic change ships but installed users still see the old behavior.

**Phase to address:** PWA phase (SW caching task) — add "inline pre-paint script survives precache + navigation fallback, no FOUC in standalone" to its success criteria.

---

### Pitfall 5: Editing the frozen-EN `LOCKED_COPY` during the PT-BR native-speaker review

**What goes wrong:**
The PT-BR review touches translation strings. The `LOCKED_COPY` module holds claim-safe medical/branding copy guarded by a frozen-EN byte-equality `.toBe()` snapshot (`lockedCopy.test.ts`, Phase 19 D-12). A reviewer or implementer "improving wording" can touch the **EN** side of locked copy, or restructure the locked module, breaking the byte-equality guard — and the per-commit green-gate (`tsc && lint && build && test`) fails the commit. Worse, if someone "fixes" the test to make it pass, the claim-safe positioning silently drifts.

**Why it happens:**
A translation pass naturally invites copy edits; the boundary between "translatable UI string" and "frozen claim-safe string" is not visually obvious in a diff. The native-speaker reviewer is not necessarily aware of the LOCKED_COPY contract.

**How to avoid:**
- Brief the reviewer explicitly: the disclaimer / "inspired by Forrest's teachings" line / medical-safety copy is **frozen** — review the PT-BR rendering for accuracy but do not propose EN changes; flag concerns instead of editing.
- The byte-equality test is the backstop — if it fails, treat that as a **stop signal**, never as a test to update. State this in the phase plan.
- Scope the review commits to the translatable catalog slices only; keep `LOCKED_COPY` and `lockedCopy.test.ts` out of the files-modified set for review tasks.
- The v1.1 retro confirms the guard works (it survived PT-BR churn once already) — the risk is a human bypassing it, not the guard failing.

**Warning signs:**
- `lockedCopy.test.ts` `.toBe()` assertion fails in the green-gate.
- A review commit's diff touches `LOCKED_COPY` or `lockedCopy.test.ts`.

**Phase to address:** PT-BR review phase — phase plan must name LOCKED_COPY as out-of-scope and the byte-equality failure as a stop signal.

---

## Moderate Pitfalls

### Pitfall 6: Icon-only In/Out mode failing accessibility (no screen-reader text)

**What goes wrong:**
The labels-vs-icons toggle, in icon-only mode, replaces the localized "In"/"Out" / "Puxa"/"Solta" text with arrow icons. If the icons carry no accessible name, screen-reader users — and the existing `aria-live` phase announcements — lose the breathing-phase cue entirely, making the app unusable hands-off for blind users in icon mode.

**Why it happens:**
Decorative-looking SVG arrows are easy to ship with no `aria-label` / visually-hidden text. The implementer sees a working icon and moves on.

**How to avoid:**
- Icon mode is a **visual** change only: keep a visually-hidden text node (or `aria-label`) carrying the localized "In"/"Out" word so assistive tech and the existing `aria-live` region are unchanged regardless of toggle state.
- Verify the existing phase-announcement `aria-live` path still emits the word, not the icon, in icon mode.

**Warning signs:** VoiceOver/NVDA reads nothing (or "image") for the breathing phase in icon mode; a jsdom a11y assertion finds an element with no accessible name.

**Phase to address:** Labels-vs-icons toggle phase.

---

### Pitfall 7: Arrow icons that don't read clearly across the 3 visual variants or under reduced-motion

**What goes wrong:**
The In/Out indicator renders inside 3 shape variants (Orb, Square, Diamond). An arrow tuned against the Orb may be illegible inside the Diamond's clip-path, clash with the Square, or — under `prefers-reduced-motion`, where the shape does a gradient crossfade instead of scaling — fail to communicate direction because the motion that reinforced "in vs out" is gone.

**Why it happens:**
The toggle is designed and eyeballed against the default Orb only; the matrix (3 shapes × 2 motion modes × 5 palettes × 2 toggle states) is large and easy to under-test.

**How to avoid:**
- Review the icon in all 3 variants and in reduced-motion mode before declaring done — reduced-motion is the hardest case because the icon must carry direction *alone*.
- Confirm icon contrast holds across all 5 palettes (the v1.1 WCAG luminance contrast guard is the precedent for a per-palette check).
- Keep the arrow shape simple and unambiguous (clear up/down direction) rather than ornamental.

**Warning signs:** Operator UAT in a non-Orb variant or reduced-motion mode finds the cue ambiguous; the icon "looks fine" only in the default Orb.

**Phase to address:** Labels-vs-icons toggle phase (UAT task spanning the variant × motion matrix).

---

### Pitfall 8: localStorage `prefs` schema mistake when adding the indicator-mode field

**What goes wrong:**
The toggle adds a new field to the `Envelope.prefs` shape. Mistakes: bumping `STATE_VERSION` unnecessarily (triggers the refuse-downgrade write contract against other tabs/versions), failing to add a per-field `coerceSettings` fallback (an unknown/old stored value yields an invalid mode or crashes), or breaking the forward-compat spread-then-override read.

**Why it happens:**
Schema changes feel like they need a version bump; in this codebase they explicitly do not — v1.1 (prefs fields) and v1.2 (4 stretch fields) both added fields with **no `STATE_VERSION` bump** via per-field coercion.

**How to avoid:**
- Follow the established pattern exactly: add the field, add an `isValid<X>` predicate + `coerceSettings` per-field fallback (default to "labels" mode), **do not** bump `STATE_VERSION`. Phase 8 D-01/D-04a + Phase 22 STRETCH-07 are the reference.
- Old envelopes with no indicator field must coerce to the default — test that case explicitly.

**Warning signs:** A `STATE_VERSION` change in the diff; an old-envelope coercion test missing; the cross-tab `storage` listener misbehaving after the change.

**Phase to address:** Labels-vs-icons toggle phase (persistence task).

---

### Pitfall 9: FOUC if indicator mode is not applied pre-paint — or unnecessary pre-paint complexity if it is

**What goes wrong:**
If the persisted indicator mode (labels vs icons) is read only after React mounts, a user who chose "icons" sees the text labels flash for a frame on every load, then they swap to icons — a visible FOUC, the class of bug the theme/favicon inline scripts exist to prevent. The inverse mistake: adding pre-paint inline-script complexity when the indicator is not even on screen at load.

**Why it happens:**
Indicator mode feels like ordinary React state, unlike theme which is "obviously" a pre-paint concern. The In/Out cue may only render once a session is running.

**How to avoid:**
- Resolve the assumption first: **is the In/Out indicator on screen before a session starts?** If the indicator only appears after the Start gesture, no FOUC is reachable and pre-paint handling is unnecessary — do not add it speculatively.
- If the indicator *is* visible at first paint, apply the mode via the existing pre-paint inline-script slot in `index.html` (theme + favicon already use it — the v1.2-established FOUC slot).

**Warning signs:** Reload with "icons" chosen shows a one-frame flash of text labels; or a PR adds inline-script complexity for an indicator that is never rendered pre-session.

**Phase to address:** Labels-vs-icons toggle phase — resolve the "indicator on screen pre-session?" question during planning.

---

### Pitfall 10: Maskable icon safe-zone, missing apple-touch-icon, theme-color meta

**What goes wrong:**
- A maskable icon that fills the full canvas gets its edges (or the breathing-orb logo) clipped when Android applies a circular/squircle mask — the icon looks cropped.
- No `apple-touch-icon` means iOS uses a low-quality screenshot of the page as the home-screen icon.
- A missing or wrong `theme-color` meta makes the iOS standalone status bar / Android toolbar clash with the app's themed background.

**Why it happens:**
The app currently ships only an SVG favicon. PWA install needs raster PNG icons at specific sizes, a maskable variant respecting the ~80% center safe-zone, an explicit `apple-touch-icon`, and a `theme-color`. The maskable safe-zone is the most-missed detail.

**How to avoid:**
- Generate maskable icons with the logo art confined to the central ~80% safe-zone.
- Provide `apple-touch-icon` (180×180 PNG) explicitly in `index.html` head.
- Set a `theme-color` meta — and note it is theme-dependent: this app has 5 palettes, and iOS does not reliably update `theme-color` live per palette in standalone mode. Pick one neutral value (or accept it matches only the default theme). Do not over-invest in per-palette `theme-color` switching.
- `vite-plugin-pwa`'s asset-generator can produce the icon set; verify the maskable output in a maskable-icon previewer.

**Warning signs:** Android home-screen icon looks clipped; iOS home-screen icon is a page screenshot; status bar color clashes with the app background.

**Phase to address:** PWA phase (icon/manifest assets task).

---

### Pitfall 11: Forrest native-app links — dead, region-locked, or claim-weakening

**What goes wrong:**
- App Store / Play Store URLs rot or are region-locked; a tapped link 404s or shows "not available in your country."
- The new links are added to the Learn surface *bypassing the `LearnDialog` locked-copy contract* — e.g. inline near the disclaimer with new surrounding copy that subtly reframes the app.
- New link copy ("Get Forrest's official app") drifts the claim-safe positioning by implying endorsement or medical benefit.

**Why it happens:**
App Store links are assumed permanent; they are not. The Learn surface already has a locked-copy contract (Phase 6 D-12) and a disable-not-hide anchor contract (D-18) — a new link added casually can violate either.

**How to avoid:**
- Verify the actual current Resonant Breathing iPhone + Android store URLs at implementation time; prefer canonical store landing URLs (these geo-redirect gracefully) over hard region-coded ones. Treat link verification like the Phase 12 canonical-amazon-URL fix.
- Add the links *inside* the existing `LearnDialog` structure, respecting its locked-copy contract — new link labels are translatable UI strings, but any surrounding framing copy near the disclaimer must not weaken the claim-safe positioning.
- Keep link copy descriptive and neutral ("Forrest Knutson's Resonant Breathing app"), not benefit-claiming.
- These are external links — if a store removes the app the link dies; accept that as low-severity link rot, same as the existing YouTube/book links.

**Warning signs:** A store link 404s or region-blocks in UAT; the Learn diff touches locked copy or adds benefit-claiming language near the disclaimer.

**Phase to address:** Forrest native-app links phase.

---

### Pitfall 12: README claiming medical benefits / wrong LICENSE

**What goes wrong:**
- The README, written freshly, describes the app with health/medical-benefit language ("improves heart rate variability," "reduces anxiety," "therapeutic") — violating the project's hard claim-safe constraint that the in-app copy is carefully guarded for.
- The LICENSE is incompatible with a "Forrest-Knutson-inspired" claim-safe hobby project — e.g. a license implying an endorsement, or one that conflicts with the project's intent to reference (not reuse) Forrest's branding/assets.

**Why it happens:**
The README lives *outside* the i18n catalog and the `LOCKED_COPY` guard — none of the existing claim-safe machinery protects it. It is the single most likely place for medical claims to leak in. License choice is often an afterthought copy-pasted from another repo.

**How to avoid:**
- Write the README claim-safe by the same rules as in-app copy: "guided breathing practice," "inspired by Forrest Knutson's teachings," explicit "not medical advice" disclaimer. Reuse the exact frozen disclaimer phrasing where possible.
- Choose a permissive OSS license (MIT is the conventional fit for a hobby webapp; it makes no endorsement or warranty claims). The LICENSE covers *this project's code only* — it must not imply rights over Forrest's name, content, or the Resonant Breathing apps. Add a short README note clarifying that Forrest Knutson references are attribution/inspiration only.
- Have the README reviewed against the claim-safe constraint before merge — treat it like locked copy even though no automated guard covers it.

**Warning signs:** README draft contains "treats," "cures," "clinically," "therapeutic," "medical benefit"; LICENSE chosen without considering the Forrest-attribution boundary.

**Phase to address:** LICENSE + README phase (smallest blast radius — ordered first per the operator-ordered milestone).

---

## Minor Pitfalls

### Pitfall 13: Stale `// TODO: native-speaker review` markers after the PT-BR pass

**What goes wrong:** The PT-BR review (I18N-07) corrects translations but leaves the 76 `// TODO: native-speaker review` markers behind, so the codebase still signals "unreviewed" after the work is done.

**How to avoid:** The phase's definition-of-done explicitly includes removing every reviewed marker; a `grep -rc "native-speaker review" src/` at phase close must return 0. Marker removal happens in the same commit as the correction so the two never drift.

**Phase to address:** PT-BR review phase.

---

### Pitfall 14: Breaking `Record<LocaleId, UiStrings>` type completeness

**What goes wrong:** A reviewer renames a key or drops a string in the PT-BR catalog; the `Record<LocaleId, UiStrings>` type no longer fully aligns and `tsc` fails — or, if a key is added EN-only, PT-BR is silently incomplete.

**How to avoid:** The strict `Record<LocaleId, UiStrings>` type already enforces structural completeness — let `tsc` in the green-gate be the guard. Reviewers edit *values*, never *keys*. Phase plan: keys are frozen for the review task.

**Phase to address:** PT-BR review phase.

---

### Pitfall 15: PT-BR translation length overflowing fixed-width UI

**What goes wrong:** A more accurate native PT-BR phrase is longer than its machine-translated predecessor and overflows a button, chip, or the In/Out indicator — Portuguese commonly runs ~15-30% longer than English.

**How to avoid:** Operator UAT walks the PT-BR UI on a narrow mobile viewport after the review (the v1.1 retro already established "expect a fix-now translation deviation commit"). Pay specific attention to the new labels-vs-icons picker and the new Forrest-link labels.

**Phase to address:** PT-BR review phase (UAT) — and cross-check the labels-vs-icons + Forrest-links phases produce PT-BR strings of sane length.

---

### Pitfall 16: Sibling-clone picker pattern broken by the new toggle

**What goes wrong:** The labels-vs-icons picker is implemented divergently instead of as a verbatim sibling clone of the existing SettingsDialog pickers (Theme/Variant/Timbre/Language) and their `use*Choice` hooks — inconsistent UX, harder review, lost the v1.1 "sibling-pattern verbatim cloning ships fast" advantage.

**How to avoid:** Clone an existing picker + its `use*Choice` hook verbatim as the starting point; only the option set and the persisted field differ. This is an explicitly verified cross-milestone pattern (v1.1 retro key lesson #4).

**Phase to address:** Labels-vs-icons toggle phase.

---

### Pitfall 17: vite-plugin-pwa disabled in dev — prod-only surprises

**What goes wrong:** The SW is disabled in `vite dev` by default, so the entire PWA surface (install, offline, caching, the FOUC interaction, scope) is untested until a prod build. Bugs surface only after deploy.

**How to avoid:** Test the prod build locally — `npm run build && npx vite preview` — and exercise install + offline + SW update there. `vite-plugin-pwa` supports `devOptions.enabled: true` to run the SW in dev for debugging; use it deliberately, but the authoritative check is `vite preview` on the prod build, served under the `/hrv/` path. Add prod-build PWA verification to the phase's success criteria.

**Phase to address:** PWA phase (verification task).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hand-roll `navigator.serviceWorker.register()` instead of `vite-plugin-pwa` | No build-time dependency | Manual base-path/scope handling, manual precache manifest, manual cache-busting — Pitfalls 1/2/4 reappear as bespoke code | Never — the build-time dep is allowed; runtime invariant is intact |
| `registerType: 'autoUpdate'` with no in-session guard on reload | Simplest update path | A deploy can reload a tab mid-breathing-session | Acceptable only with a session-running guard that defers the reload |
| Move the index.html inline FOUC script to an external file during the PWA refactor | "Cleaner" HTML | External file is independently cached + adds a round-trip → reintroduces FOUC | Never — keep it inline |
| Per-palette `theme-color` meta switching in standalone mode | Pixel-perfect status bar per theme | iOS does not reliably update `theme-color` live in standalone; high effort, low/no payoff | Skip — pick one neutral value |
| Skip iOS-standalone real-device UAT, rely on Safari-tab UAT | Faster phase close | Standalone audio/wake-lock regressions ship undetected (Pitfall 3) | Never for this app — hands-off audio is the core value |
| Bump `STATE_VERSION` for the new indicator-mode prefs field | Feels "correct" | Triggers refuse-downgrade write against other versions/tabs unnecessarily | Never — use per-field coercion (v1.1/v1.2 precedent) |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Service worker + Vite `base: '/hrv/'` | SW at root, manifest `scope`/`start_url` = `/` | Explicit `scope`/`start_url`/`id` = `/hrv/`; verify emitted files resolve under `/hrv/` |
| Service worker + precached `index.html` | Stale shell served forever after deploy | `registerType: 'autoUpdate'` → `skipWaiting` + `clientsClaim` + `cleanupOutdatedCaches` |
| SW navigation fallback + inline FOUC script | Fallback strips/reorders head, FOUC returns | `navigateFallback` to verbatim precached `index.html`; re-verify FOUC in standalone |
| App Store / Play Store deep links | Hard region-coded URL 404s / geo-blocks | Use canonical store landing URLs that geo-redirect; verify both at implementation time |
| iOS "Add to Home Screen" | Expecting `beforeinstallprompt` (does not exist on iOS) | No install-prompt API on iOS — at most show passive "Add to Home Screen" guidance; never build an install button that assumes the event |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Precaching oversized assets | Slow first install, large storage footprint | Precache only the app shell + hashed JS chunks; audio is runtime-synthesized so there are no audio files to cache (an advantage here) | Large icon sets / any future bundled assets |
| iOS PWA storage quota eviction | Installed PWA loses `localStorage` (settings/stats) after storage pressure | iOS evicts PWA storage more aggressively than a tab; the existing silent-fallback envelope already degrades gracefully — no new code, but set the expectation in docs | Long-idle installed PWA on a storage-constrained device |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Service worker caching with no scope discipline | A too-broad SW scope could intercept unrelated paths if `/hrv/` shares an origin with other apps | Keep SW `scope` tight to `/hrv/`; never widen to `/` |
| LICENSE implying rights over Forrest's brand/apps | Misrepresents the attribution boundary; reputational/legal ambiguity | MIT (or similar) covering *this code only* + explicit README note that Forrest references are attribution/inspiration, his apps/branding are his |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Icon-only In/Out with no fallback word for screen readers | Blind users lose the breathing cue entirely in icon mode | Always keep a visually-hidden localized word; icon mode is visual-only |
| Ambiguous arrow icon under reduced-motion | Reduced-motion users cannot tell inhale from exhale | Verify direction reads from the icon *alone* (no motion) before shipping |
| Auto-update SW reload mid-session | A breathing session is interrupted by a surprise reload | Defer the SW-triggered reload until the session ends / app idle |
| Installed PWA on iOS < 18.4 silently not holding screen awake | User's screen sleeps mid hands-off session | Document as a known limitation; optionally detect standalone mode and advise |

## "Looks Done But Isn't" Checklist

- [ ] **PWA install:** Often missing — verify the prod build served under `/hrv/` actually goes offline (DevTools offline + reload), not just that the manifest validates.
- [ ] **PWA update:** Often missing — verify a *second* deploy reaches an already-installed instance (rebuild, redeploy, confirm new content without manual cache clear).
- [ ] **PWA on iOS:** Often missing — verify in *installed standalone mode on a real iPhone*, not a Safari tab: audio cues + wake lock + theme/favicon FOUC.
- [ ] **Maskable icon:** Often missing — verify the logo sits inside the ~80% safe-zone in a maskable-icon previewer.
- [ ] **apple-touch-icon:** Often missing — verify `index.html` has an explicit 180×180 `apple-touch-icon` (else iOS uses a page screenshot).
- [ ] **Labels-vs-icons toggle:** Often missing — verify icon mode across all 3 variants × reduced-motion × 5 palettes, and that screen readers still announce In/Out.
- [ ] **PT-BR review:** Often missing — verify all 76 `// TODO: native-speaker review` markers are removed (`grep` returns 0) and `LOCKED_COPY` is byte-identical.
- [ ] **README:** Often missing — verify no medical/therapeutic claims; disclaimer present; Forrest-attribution boundary stated.
- [ ] **Forrest links:** Often missing — verify both store URLs resolve (not 404 / not region-blocked) and respect the `LearnDialog` locked-copy contract.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stale SW serving old shell after deploy (no autoUpdate) | HIGH | Hard to remediate retroactively — installed users may stay stale until manual clear; a corrected SW only reaches them after the old SW updates itself. Prevent, do not recover. |
| Wrong SW scope (`/` vs `/hrv/`) | LOW (pre-ship) | Fix manifest `scope`/`start_url`/`id`, rebuild, re-verify under `/hrv/` — cheap if caught before users install |
| `LOCKED_COPY` byte-equality test failing | LOW | Revert the locked-copy edit; the test failure *is* the recovery signal — never edit the test |
| Medical claim shipped in README | LOW (technically) | Edit README, commit — no installed-state coupling; but reputationally costly if it shipped publicly |
| Icon-only mode inaccessible | LOW | Add visually-hidden localized word; small fix |
| Installed PWA wake-lock dead on iOS < 18.4 | N/A (platform) | Cannot fix in app code (WebKit bug 254545); document as a known limitation / carry-forward |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. SW scope / manifest path mismatch under `/hrv/` | PWA phase | DevTools → Application shows SW controlling `/hrv/`; Lighthouse PWA audit passes start_url-in-scope |
| 2. Stale-cache trap after deploy | PWA phase | Second deploy reaches an already-installed instance with no manual clear |
| 3. iOS standalone audio / Wake Lock regression | PWA phase | Real-device UAT in *installed standalone mode* on iPhone — audio + wake lock |
| 4. SW interfering with pre-paint inline script | PWA phase | No theme/favicon FOUC on installed-PWA launch; a logic fix reaches installed users |
| 5. Editing frozen-EN `LOCKED_COPY` during PT-BR review | PT-BR review phase | `lockedCopy.test.ts` byte-equality `.toBe()` stays green; review diff excludes `LOCKED_COPY` |
| 6. Icon-only In/Out inaccessible | Labels-vs-icons phase | Screen-reader announces In/Out in icon mode; a11y assertion finds an accessible name |
| 7. Arrow unclear across variants / reduced-motion | Labels-vs-icons phase | UAT across 3 variants × reduced-motion × 5 palettes |
| 8. `prefs` schema migration mistake | Labels-vs-icons phase | No `STATE_VERSION` bump; old-envelope coerces-to-default test passes |
| 9. FOUC if indicator mode not pre-paint | Labels-vs-icons phase | Resolve "indicator on screen pre-session?"; if yes, inline-script slot; no flash on reload |
| 10. Maskable icon / apple-touch-icon / theme-color | PWA phase | Maskable previewer shows logo in safe-zone; explicit apple-touch-icon + theme-color in head |
| 11. Dead / region-locked / claim-weakening Forrest links | Forrest native-app links phase | Both store URLs resolve; links inside `LearnDialog` locked-copy contract; neutral copy |
| 12. README medical claims / wrong LICENSE | LICENSE + README phase | README has no medical/therapeutic claims + disclaimer present; MIT-style license + attribution note |
| 13. Stale `native-speaker review` markers | PT-BR review phase | `grep -rc "native-speaker review" src/` returns 0 |
| 14. `Record<LocaleId, UiStrings>` completeness broken | PT-BR review phase | `tsc` green-gate passes; keys frozen for the review |
| 15. PT-BR length overflows fixed-width UI | PT-BR review phase | Operator UAT on narrow mobile viewport, incl. new picker + new link labels |
| 16. Sibling-clone picker pattern broken | Labels-vs-icons phase | New picker + hook are verbatim siblings of an existing pair |
| 17. SW disabled in dev — prod-only surprises | PWA phase | `npm run build && vite preview` under `/hrv/` exercises install + offline + update |

## Testable in jsdom/Vitest vs Requires Real-Device UAT

**Highest-leverage section for the PWA feature** — jsdom has no service worker, no install lifecycle, and no real WebKit audio session. Be explicit about the boundary so the phase plan does not over-promise automated coverage.

**Testable under Vitest/jsdom (automated green-gate):**
- Manifest JSON content/shape — assert `scope`/`start_url`/`id` = `/hrv/`, icon entries present, maskable variant declared (a plain JSON-parse + assertion test, the same shape as `favicon.sync.test.ts`).
- The new `prefs` indicator-mode field: `isValid*` predicate, `coerceSettings` fallback, old-envelope coercion, no `STATE_VERSION` bump — full domain-layer coverage.
- Labels-vs-icons picker rendering + `use*Choice` hook behavior (sibling-clone of existing picker tests).
- Icon-mode accessible-name presence (jsdom can assert the visually-hidden word / `aria-label` exists).
- `LOCKED_COPY` byte-equality (existing `lockedCopy.test.ts`).
- `Record<LocaleId, UiStrings>` completeness (via `tsc` in the green-gate).
- Optional sync-guard test that manifest `theme-color` / icon colors match `faviconPalette` if shared (generalizes `favicon.sync.test.ts`).

**NOT testable in jsdom — requires `vite preview` prod build and/or real-device UAT:**
- Service worker registration, scope enforcement, precache, offline fetch — jsdom has no SW runtime. Verify via `vite preview` + Chrome DevTools (offline reload).
- SW update / `skipWaiting` / stale-cache rollover after a second deploy — manual deploy-twice UAT.
- iOS "Add to Home Screen" install + standalone launch — real iPhone only.
- Standalone-mode audio behavior (WebKit 198277 class) — real iPhone, installed PWA.
- Standalone-mode Wake Lock (working only iOS ≥ 18.4 per WebKit 254545) — real iPhone, installed PWA; ideally one device < 18.4 and one ≥ 18.4.
- Theme / favicon FOUC in installed standalone mode — real-device visual check.
- Maskable icon masking result — maskable-icon previewer + real Android home screen.
- Arrow-icon legibility across variants × reduced-motion × palettes — operator visual UAT.

**Process precedent:** the v1.0 retro lesson — "jsdom polyfill semantics ≠ real WebKit audio session semantics; manual real-device UAT is not optional for audio + wake lock + visibility flows" — applies directly. The PWA phase must budget a real-device UAT task as a first-class deliverable, not a "v1.x carry-forward."

## Sources

- [Vite PWA — Register Service Worker / base path guidance](https://vite-pwa-org.netlify.app/guide/register-service-worker) — HIGH
- [Vite PWA — Auto Update strategy (skipWaiting / clientsClaim / cleanupOutdatedCaches)](https://vite-pwa-org.netlify.app/guide/auto-update.html) — HIGH
- [Vite PWA — Getting Started / PWA requirements](https://vite-pwa-org.netlify.app/guide/) — HIGH
- [vite-plugin-pwa Issue #263 — Manifest / Service Worker in subdirectory](https://github.com/vite-pwa/vite-plugin-pwa/issues/263) — MEDIUM (community confirmation of the subpath pitfall)
- [vite-plugin-pwa Issue #764 — Service Worker scope with subpath access](https://github.com/vite-pwa/vite-plugin-pwa/issues/764) — MEDIUM
- [WebKit Bug 254545 — Wake Lock API does not work in Home Screen Web Apps (fixed iOS 18.4)](https://bugs.webkit.org/show_bug.cgi?id=254545) — HIGH
- [WebKit Bug 198277 — Audio stops when standalone web app is not in foreground](https://bugs.webkit.org/show_bug.cgi?id=198277) — HIGH
- [Apple — Safari 18.4 Release Notes (Wake Lock in Home Screen Web Apps)](https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes) — HIGH
- [iOS Audio Lockscreen Problem in PWA — Apple Developer Forums thread 762582](https://developer.apple.com/forums/thread/762582) — MEDIUM
- [PWA iOS Limitations and Safari Support guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — MEDIUM
- Project context: `.planning/PROJECT.md`, `.planning/MILESTONES.md`, `.planning/RETROSPECTIVE.md`, `index.html`, `vite.config.ts` — HIGH

---
*Pitfalls research for: v1.3 Release Polish — adding LICENSE/README, Forrest native-app links, labels-vs-icons toggle, PT-BR native-speaker review, and PWA install to the HRV breathing webapp*
*Researched: 2026-05-15*
</content>
