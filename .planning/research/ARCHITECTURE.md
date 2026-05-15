# Architecture Research

**Domain:** v1.3 Release Polish — 5-feature integration into a shipped React 18 + Vite + TS HRV breathing webapp
**Researched:** 2026-05-15
**Confidence:** HIGH (codebase read directly; PWA tooling verified against current vite-plugin-pwa 1.3.0)

> Scope note: the existing architecture is FIXED. This document maps how each of the 5 v1.3
> features *integrates* — it does not redesign layers, folders, or patterns. Every new file
> follows an existing sibling-clone template already in the tree.

## Standard Architecture

### Existing layer model (unchanged by v1.3)

```
┌──────────────────────────────────────────────────────────────────────┐
│  src/app/         App.tsx shell — owns state, wires hooks→components   │
├──────────────────────────────────────────────────────────────────────┤
│  src/components/  Presentational. SettingsDialog hosts 4 pickers.      │
│                   BreathingShape → OrbShape/SquareShape/DiamondShape   │
│                   render the in-orb In/Out label. LearnDialog.         │
├──────────────────────────────────────────────────────────────────────┤
│  src/hooks/       Adapters. useXChoice (picker write-path) +           │
│                   useX orchestrator (App-side live state + sync).      │
├──────────────────────────────────────────────────────────────────────┤
│  src/domain/      Pure modules. settings.ts: isValid*/coerce*,         │
│                   *_OPTIONS, DEFAULT_*, type unions.                   │
├──────────────────────────────────────────────────────────────────────┤
│  src/content/     i18n catalogs. strings.ts (UI_STRINGS),              │
│                   learnContent.ts (LEARN_CONTENT), lockedCopy.ts.      │
├──────────────────────────────────────────────────────────────────────┤
│  src/storage/     localStorage envelope. prefs.ts: UserPrefs +         │
│                   coercePrefs + loadPrefs/savePrefs.                   │
├──────────────────────────────────────────────────────────────────────┤
│  index.html       Pre-paint inline scripts (theme FOUC + favicon).     │
│                   %BASE_URL% substitution, Vite base='/hrv/'.          │
└──────────────────────────────────────────────────────────────────────┘
```

### Where each v1.3 feature touches the model

| Feature | Layers touched | New files | Modified files |
|---------|----------------|-----------|----------------|
| 1. LICENSE + README | repo root only | `LICENSE` | `README.md` |
| 2. Forrest native-app links | content + components | none | `learnContent.ts`, `strings.ts` (maybe), `LearnDialog.tsx` |
| 3. Labels-vs-icons toggle | domain + storage + hooks + components + content | `useIndicatorChoice.ts`, `useIndicator.ts`, `IndicatorPicker.tsx` (+ 3 tests) | `settings.ts`, `prefs.ts`, `SettingsDialog.tsx`, `strings.ts`, `OrbShape.tsx`, `SquareShape.tsx`, `DiamondShape.tsx`, `BreathingShape.tsx`, `App.tsx` |
| 4. PT-BR review | content only | none | `learnContent.ts`, `strings.ts` |
| 5. PWA install | build config + html + hooks/app + assets | `manifest` (plugin-generated), maskable + apple-touch icons, optional `useServiceWorker.ts` | `vite.config.ts`, `index.html`, `main.tsx`, `package.json` |

## Per-Feature Integration

### Feature 1 — LICENSE + README (smallest blast radius)

**Integration surface:** repo root only. Zero app-architecture impact — confirmed.

- `LICENSE`: new repo-root file. Not bundled, not copied into `public/`, not referenced by code.
- `README.md` already exists (7.1 KB, last touched v1.0). Update is prose only.
- No `src/` change, no test change, no build-graph change. The green-gate
  (`tsc && lint && build && test`) is unaffected — this phase passes trivially.

**Risk:** none. The only judgement call is license choice (MIT is the conventional
default for a local-only, no-backend webapp; defer the actual choice to the operator).

### Feature 2 — Forrest native-app links (Learn surface)

**Integration surface:** `src/content/learnContent.ts` + `src/components/LearnDialog.tsx` (+ `strings.ts` only if a new sub-section heading is wanted).

The Learn surface already has a structured link model. `LearnContent.links` is a
fixed-key object (`youtubeChannel`, `website`, `book`, `patreon`, `heroVideo`,
`keyVideos[]`). Each `LearnLink` is `{ label, url }`. The new Resonant Breathing
iPhone + Android app-store links are **two new keys** in that object.

**Steps:**
1. `learnContent.ts` — add two `LearnLink` keys (e.g. `iosApp`, `androidApp`) to the
   `LearnContent.links` interface and to **both** the `en` and `pt-BR` catalogs.
   The `satisfies Readonly<Record<LocaleId, LearnContent>>` typing makes a
   missing-locale or missing-key omission a compile error — both locales must land
   together.
2. `LearnDialog.tsx` — add two `<a>` elements following the verbatim existing link
   pattern (`target="_blank" rel="noopener noreferrer"`, `min-h-[44px]` hit area,
   token-bound focus ring, `text-[var(--color-breathing-accent)]`). Likely in the
   "Forrest Knutson Resources" sub-section alongside `youtubeChannel`/`website`/
   `book`/`patreon`, or a new sub-section if the operator wants visual separation.
   The D-12 link-order comment block in `LearnDialog.tsx` must be amended to record
   the new keys.
3. `strings.ts` — only needed if the new links sit in a *new* titled sub-section.
   `UiStrings['learn']` currently has `resourcesHeading` + `videosHeading`. If the
   app links join the existing Resources section, no `strings.ts` change is needed.

**Locked-copy vs translatable — the answer:**
- App-store **URLs** are NOT copy at all — they are `url` fields, identical across
  locales (the existing `youtubeChannel.url` is byte-identical in `en` and `pt-BR`).
- App-store **labels** ("Resonant Breathing for iPhone" etc.) are **translatable**,
  NOT locked copy. `lockedCopy.ts` deliberately holds only the 3 D-12 claim-safe
  entries (`inspiredByForrest`, `medicalAdviceLine`, `affiliationLine`) — "smallest
  blast radius" is an explicit D-03 decision. App-store link labels carry no
  medical/affiliation claim, so they belong in `learnContent.ts.links`, with a
  `// TODO: native-speaker review` marker on the `pt-BR` label (same convention as
  every other translatable string). They feed into Feature 4's review count.
- Precedent for the alternative: the existing `keyVideos` labels are kept in English
  with an explicit "Video title kept in English — no PT-BR title available" comment.
  App names *can* follow that posture if the operator prefers — but app-store
  listings are localized by the stores themselves, so a translated `pt-BR` label is
  the better default.

**Guardrail:** the `lockedCopy.test.ts` substring-absence guard asserts the locked
Forrest phrase never appears inside `forrest.body`. New app links do not interact
with that guard — keep the new keys out of `lockedCopy.ts` entirely.

### Feature 3 — Labels-vs-icons toggle (the 5th SettingsDialog picker)

This is a verbatim sibling-clone of the existing 4-picker pattern. The cleanest
template to clone is **Variant** (the most recent picker, Phase 17) — but with one
critical divergence on the capture-at-start question (see below).

**Picker anatomy (the 4 existing pickers, for reference):**

| Layer | Theme | Variant | Timbre | Language |
|-------|-------|---------|--------|----------|
| domain type/enum/validator/default | `ThemeId` / `isValidTheme` / `DEFAULT_THEME` | `VisualVariantId` / `isValidVariant` / `DEFAULT_VARIANT` | `TimbreId` / `isValidTimbre` / `DEFAULT_TIMBRE` | `LocaleId` / `isValidLocale` / `DEFAULT_LOCALE` |
| `prefs` field + coercer | `theme` / `coerceTheme` | `variant` / `coerceVariant` | `timbre` / `coerceTimbre` | `locale` / `coerceLocale` |
| picker-side write hook | `useThemeChoice` | `useVariantChoice` | `useTimbreChoice` | `useLocaleChoice` |
| App-side orchestrator hook | `useTheme` | `useVisualVariant` | (`timbreRef` lives in `useAudioCues`) | `useLocale` |
| component | `ThemePicker` | `VariantPicker` | `TimbrePicker` | `LanguagePicker` |
| live-swap vs capture-at-start | **live** | **capture-at-Start** | **capture-at-Start** | **live** |

**Sibling-clone steps for the new `indicator` picker** (suggested type
`IndicatorStyle = 'labels' | 'icons'`):

1. **`src/domain/settings.ts`** — add the enum surface, mirroring the
   `VisualVariantId` block exactly:
   ```ts
   export type IndicatorStyle = 'labels' | 'icons'
   export const INDICATOR_OPTIONS = ['labels', 'icons'] as const satisfies readonly IndicatorStyle[]
   export function isValidIndicator(v: unknown): v is IndicatorStyle {
     return typeof v === 'string' && (INDICATOR_OPTIONS as readonly string[]).includes(v)
   }
   export const DEFAULT_INDICATOR: IndicatorStyle = 'labels'  // current behavior = text labels
   ```
   `DEFAULT_INDICATOR = 'labels'` preserves today's exact rendering for every user
   who never opens SettingsDialog (zero-regression — same posture as Timbre's
   `bowl` default being byte-identical).

2. **`src/storage/prefs.ts`** — add `indicator` to the `UserPrefs` interface, to
   `DEFAULT_PREFS`, add a `coerceIndicator` (clone `coerceVariant`), and add
   `indicator: coerceIndicator(r.indicator)` to `coercePrefs`. **No `STATE_VERSION`
   bump** — the forward-compat spread-then-override read + refuse-downgrade write
   contract (Phase 8 D-01/D-04a) handles a new prefs field automatically; old
   envelopes coerce the missing field to `DEFAULT_INDICATOR` on read. This is the
   same no-bump path v1.2 stretch settings used.

3. **`src/hooks/useIndicatorChoice.ts`** (NEW) — clone `useVariantChoice.ts`
   verbatim. Returns `{ indicator, setIndicator }`. The setter does the 4-step
   write: fresh `loadPrefs()` → `savePrefs({ ...current, indicator: next })` →
   `setIndicatorState(next)` → `dispatchEvent(new CustomEvent('hrv:prefs-changed',
   { detail: { key: 'indicator', value: next } }))`. The `'hrv:prefs-changed'`
   event name and `{ key, value }` detail shape are reused as-is (D-22 — one event,
   N filtered consumers).

4. **`src/hooks/useIndicator.ts`** (NEW) — clone `useVisualVariant.ts` verbatim
   (the variant orchestrator, NOT `useTheme` — there is no global DOM attribute to
   write, the indicator is render-local). Two effects: cross-tab `storage` listener
   filtered on `STATE_KEY`, and same-tab `hrv:prefs-changed` listener filtered on
   `detail.key === 'indicator' || detail.key === undefined`.

5. **`src/components/IndicatorPicker.tsx`** (NEW) — clone `VariantPicker.tsx`. A
   2-column `grid` radiogroup (`grid-cols-2`, vs Variant's `grid-cols-3`) over
   `INDICATOR_OPTIONS`. Each option button can show a tiny preview swatch
   ("In" text vs a ↑ arrow glyph) above the label, matching VariantPicker's
   swatch-above-label layout. Props contract is the Phase 15 D-02 standard:
   `{ disabled, strings, sectionLabel }` — no `value` prop. State + write path come
   from `useIndicatorChoice()`.

6. **`src/components/SettingsDialog.tsx`** — add `<IndicatorPicker disabled={inSessionView}
   strings={strings.indicators} sectionLabel={strings.settings.indicatorLabel} />`.
   The D-10 picker-order comment must be amended. Decide placement: most natural is
   Variant → Indicator adjacency (both govern the breathing-shape visual). Also
   widen `SettingsDialogProps.strings` from
   `Pick<UiStrings, 'settings' | 'themes' | 'variants' | 'timbres'>` to include
   `'indicators'`.

7. **`src/content/strings.ts`** — add `indicatorLabel` to the `settings` sub-object,
   add a new `indicators: { labels: string; icons: string }` sub-object to the
   `UiStrings` interface, and supply `en` + `pt-BR` values. PT-BR values carry the
   `// TODO: native-speaker review` marker (feeds Feature 4).

8. **Consumer change — the in-orb In/Out render path.** The component that switches
   text vs arrow-icon is **`OrbShape.tsx`** (inner function `OrbBody`), and
   identically **`SquareShape.tsx`** and **`DiamondShape.tsx`** — all 3 sibling
   shapes render their own In/Out label independently (verified: each takes the same
   `frame`/`leadInDigit`/`strings` props from the `BreathingShape` dispatcher). The
   exact render site in `OrbShape.tsx` is the final `<span>` (lines ~122–133):
   `phaseLabel` is computed as `frame.phase === 'in' ? strings.inhale : strings.exhale`
   and rendered inside a `text-5xl/text-6xl` span. With the toggle, that span renders
   either the text label (current) or an arrow icon (↑ for In / ↓ for Out, or an
   inline SVG arrow).
   The `aria-label` on the shape root (`${strings.breathingShapeAriaLabel}:
   ${phaseLabel}`) must keep using the **text** `phaseLabel` regardless of the
   toggle, so assistive tech is unaffected — the icon is a visual swap only.
   `OrbLeadIn` (the 3-2-1 countdown) is unaffected — it renders a digit, not an
   In/Out label.

9. **`src/components/BreathingShape.tsx`** — the dispatcher. Add an
   `indicator?: IndicatorStyle` prop to `BreathingShapeProps` (optional with default
   `'labels'`, mirroring how `variant?` defaults to `'orb'`), and pass it through the
   `switch` to all 3 shapes. Each shape adds `indicator` to its props interface and
   branches the label span.

10. **`src/app/App.tsx`** — wire it. Two parts:
    - Call `const { indicator: liveIndicator } = useIndicator()` next to
      `useVisualVariant()` (~line 170).
    - Pass it to `<BreathingShape>` (~line 669).

**Capture-at-session-start vs live-swappable — the decision (#3 explicit ask):**

Variant and Timbre are captured-at-start because mid-session change would be
*disruptive to the practice* (the orb shape morphing, or a cue timbre changing,
mid-breath). Theme and Language are live because they are chrome, not the breathing
guide itself.

The labels-vs-icons indicator is a **borderline case** but the recommendation is
**live-swappable** (clone `useVisualVariant`, NOT a `sessionIndicatorRef`):
- It is purely a glyph swap inside the label span — no geometry change, no audio
  re-anchor, no animation interruption. A user toggling it mid-session sees the word
  "In" become "↑" with zero disruption to timing.
- SettingsDialog is **disabled during a session anyway** (`inSessionView` →
  `disabled` on every picker). A mid-session swap is therefore not reachable through
  the normal UI; live vs captured only differs for the cross-tab case (another tab
  changing the pref), where live is strictly better UX.
- Live is also **less code**: no `sessionIndicatorRef`/`setSessionIndicator` pair in
  App.tsx, no capture site in `onStartClick`, no clear site in the leave-running
  effect. App.tsx passes `liveIndicator` straight to `<BreathingShape>`.

If the operator instead wants strict consistency with the other shape dimension
(Variant), capture-at-start is a small additional step: add a
`sessionIndicatorRef`/`setSessionIndicator` pair and `indicator={sessionIndicator
?? liveIndicator}` exactly as `sessionVariant ?? liveVariant` does today (App.tsx
line 670). **Default recommendation: live.** Flag this as a one-line operator
decision at planning.

### Feature 4 — PT-BR native-speaker review

**Integration surface:** `src/content/strings.ts` (81 markers today) +
`src/content/learnContent.ts` (10 markers today) — 91 total. (PROJECT.md cites 76
from v1.1 close; the count grew because v1.2 added stretch strings, and Features 2 +
3 will add a few more before this phase runs.) Edits are **confined to the `pt-BR`
slices of the two catalogs**.

**Guardrails that MUST stay intact:**
1. **Frozen-EN `LOCKED_COPY` byte-equality guard** — `lockedCopy.test.ts` asserts
   the 3 EN locked strings byte-exact via `.toBe()`. The reviewer must NOT touch
   `lockedCopy.ts` `en` values. The `pt-BR` locked entries *can* be reviewed, but
   they carry `// LOCKED: back-translation = ...` comments and must keep
   back-translation parity — change them only with deliberate intent, and update the
   back-translation comment to match.
2. **Substring-absence guard** — `lockedCopy.test.ts` asserts the locked
   `inspiredByForrest` phrase never appears verbatim inside `forrest.body` for any
   locale. A reviewer rewording the `pt-BR` `forrest.body` must not accidentally
   reintroduce the exact locked phrase string.
3. **Em-dash guard** — `lockedCopy.test.ts` asserts `pt-BR.medicalAdviceLine`
   contains U+2014. Keep the em-dash if that line is reviewed.
4. **Template-function entries** — several `pt-BR` strings are functions
   (`leadInAriaLabel: (d) => ...`, stepper labels). The reviewer edits the string
   *body*, not the function signature — `strings.test.ts` + `tsc` enforce the shape.
5. **`Record<LocaleId, ...> satisfies` typing** — every catalog is
   `satisfies Readonly<Record<LocaleId, ...>>`. A missing or extra key is a compile
   error. The reviewer must not add/remove keys, only change `pt-BR` string values.
6. **Marker removal as done-signal** — once a string is reviewed, its
   `// TODO: native-speaker review` comment is deleted. A grep for the marker in
   `src/content/` reaching zero is the phase's done-signal. Keep the "Video title
   kept in English" comments (intentional non-translations, not pending reviews).

This phase touches no logic, no component, no test assertion values (only string
contents that tests may snapshot — re-check `strings.test.ts` if it asserts any
`pt-BR` literal before editing).

### Feature 5 — PWA install (full offline)

**Integration surface (the 5-point map):**

```
┌─ vite.config.ts ──── VitePWA() plugin added to plugins[] (build-time devDep)
├─ index.html ─────── manifest link + apple-touch-icon link + theme-color meta
│                      (plugin can inject most; explicit is clearer in this repo)
├─ SW registration ── plugin's virtual `registerSW` called once at app bootstrap
│                      (main.tsx) — NOT a stateful hook unless an
│                      update-available toast is wanted
├─ manifest ───────── start_url + scope + icons + display + theme_color
├─ public/ assets ─── maskable 192/512 icons + apple-touch-icon 180×180
└─ precache ───────── Workbox generateSW precaches the entire built bundle
```

**Recommendation: use `vite-plugin-pwa` (v1.3.0) in `generateSW` mode**, not a
hand-rolled service worker. v1.3.0 (released 2026-05-05) declares `vite ^8.0.0` in
peer deps, so it is compatible with this repo's Vite 8.0.10. It is a **build-time
devDependency only** — the zero-net-new-*runtime*-deps invariant holds (PROJECT.md
already flags this exact allowance). A hand-rolled SW is more code, more pitfalls
(cache versioning, precache-manifest hashing), and buys nothing here.

**1. `vite.config.ts`** — add `VitePWA({ ... })` to `plugins[]`:
- `registerType: 'autoUpdate'` — no in-app update prompt; the app is a single
  breathing screen, so silent update on next load is the calm choice.
- `workbox: { globPatterns: ['**/*.{js,css,html,svg}'] }` — precache the whole
  built bundle. There is **no backend and nothing dynamic to cache** (settings live
  in localStorage, audio is synthesized at runtime via Web Audio, never fetched).
  Precache-everything = full offline session use, which is the PWA-01 goal.
- Keep the `test` config block untouched — vitest config is in the same file; the
  PWA plugin must not run during tests (it is inert under vitest by default).

**2. `index.html`** — the plugin can auto-inject the manifest link, but this repo's
`index.html` already hand-manages `<link rel="icon">` and pre-paint scripts, so be
explicit and consistent:
- `<link rel="manifest" href="%BASE_URL%manifest.webmanifest" />` — use
  `%BASE_URL%` so it survives the Vite `base` (Phase 12 D-04 precedent).
- `<link rel="apple-touch-icon" href="%BASE_URL%apple-touch-icon.png" />` — iOS
  ignores the manifest `icons` for the home-screen icon; it needs this explicit tag.
- `<meta name="theme-color" content="..." />` — for the browser UI chrome color.
  Note this is a *static* meta; the existing per-theme favicon system is dynamic —
  see the icon-strategy decision below for how the two reconcile.

**3. Service-worker registration** — `vite-plugin-pwa` exposes a virtual module
`virtual:pwa-register`. Call `registerSW({ immediate: true })` **once** in
`src/main.tsx` at app bootstrap. With `registerType: 'autoUpdate'` there is no
update state to surface, so **no new hook is needed** — a `useServiceWorker` hook is
only justified if the operator wants an "update available / reload" toast, which
contradicts the calm-UI principle. Recommendation: register in `main.tsx`, no hook.

**4. Manifest `start_url` / `scope` vs Vite `base`** — this is the critical PWA
gotcha. The app is served under `base: '/hrv/'`. The manifest MUST agree:
- `start_url`: `'/hrv/'` or relative `'./'` (relative resolves against the
  manifest's own location — the safer choice, avoids hardcoding the base).
- `scope`: `'/hrv/'` or `'./'`.
- If `start_url`/`scope` omit the `/hrv/` prefix, the installed PWA opens at `/`
  (404 / wrong app) and the SW scope will not cover the app. `vite-plugin-pwa`
  derives these from Vite `base` automatically when not overridden —
  **prefer letting the plugin derive them** rather than hardcoding, so a future
  `base` change (the exact scenario Phase 12 D-04 guards against) stays correct.

**5. Icon strategy vs the existing 5-palette favicon system** — decision required:
- The existing favicon is **dynamic**: a per-theme inline SVG data-URI swapped at
  runtime by `useFavicon` + the pre-paint `index.html` script, sourced from
  `faviconPalette.ts` (5 accent colors). This is a `<link rel="icon">` mechanism.
- PWA install icons (`manifest.icons`, `apple-touch-icon`) are **static** — the OS
  reads them once at install time and never re-reads them. They **cannot** be
  per-theme. The home-screen icon is frozen at install.
- **Recommendation: ONE neutral install icon set**, not per-theme. Generate a
  192×192 + 512×512 maskable PNG (and a 180×180 apple-touch-icon) from a single
  brand-neutral version of the orb mark — pick one palette accent (the `light` theme
  `#5e81ac` is the natural default, matching the favicon fallback) or a
  theme-agnostic neutral. Maskable icons need ~20% safe-zone padding so Android's
  adaptive-icon mask does not clip the orb. These are static files in `public/`.
- This means the app has **two icon systems coexisting**: the dynamic per-theme
  favicon (browser tab, unchanged) and the static PWA install icon set (home
  screen, new). They do not conflict — different `<link>` rels, different lifecycle.
  Document this split so a future contributor does not try to "unify" them.
- Maskable PNGs cannot be inline SVG data-URIs — they must be real files. This is
  the only new binary-asset class v1.3 introduces (`public/` currently holds one
  `favicon.svg`).

**Precache / data-flow:** nothing dynamic. No backend, no API, no fetched audio.
Workbox `generateSW` precaches the hashed built bundle (`*.js/css/html/svg`); the SW
serves it cache-first on repeat visits → full offline session use. localStorage
(settings, stats, prefs) is independent of the SW and already works offline.

**Testing note:** the PWA plugin is build-only and inert under vitest — the existing
839 tests are unaffected. A manual UAT (install prompt, offline reload, icon on home
screen) is the right verification, mirroring the v1.0 wake-lock manual-UAT
precedent. A Lighthouse PWA audit is a useful done-check.

## Recommended Project Structure

No new folders. v1.3 adds files into existing layer folders:

```
src/
├── domain/settings.ts         # + IndicatorStyle enum surface (Feature 3)
├── storage/prefs.ts           # + indicator field + coerceIndicator (Feature 3)
├── hooks/
│   ├── useIndicatorChoice.ts  # NEW — picker write hook (clone useVariantChoice)
│   └── useIndicator.ts        # NEW — App-side orchestrator (clone useVisualVariant)
├── components/
│   └── IndicatorPicker.tsx    # NEW — 5th picker (clone VariantPicker)
├── content/
│   ├── strings.ts             # + indicators sub-object + PT-BR review (F3+F4)
│   └── learnContent.ts        # + iosApp/androidApp links + PT-BR review (F2+F4)
├── main.tsx                   # + registerSW() bootstrap call (Feature 5)
└── ...
public/
├── favicon.svg                # existing
├── pwa-192.png                # NEW maskable (Feature 5)
├── pwa-512.png                # NEW maskable (Feature 5)
└── apple-touch-icon.png       # NEW (Feature 5)
(repo root)
├── LICENSE                    # NEW (Feature 1)
├── README.md                  # updated (Feature 1)
└── vite.config.ts             # + VitePWA plugin (Feature 5)
```

## Architectural Patterns

### Pattern 1: Sibling-clone picker (Feature 3)

**What:** A new SettingsDialog picker is built by cloning the 4-file set of an
existing picker (domain enum + prefs field + 2 hooks + component), never by
abstracting a generic picker.
**When to use:** any new customization dimension.
**Trade-offs:** more files than a generic abstraction, but each picker's
locked-string contract and capture-vs-live policy is verifiable in isolation
(matches the project's clone-don't-extract principle). Already proven 4×.

### Pattern 2: `hrv:prefs-changed` event bus (Feature 3)

**What:** One CustomEvent name, `{ key, value }` detail shape. Picker-side hooks
dispatch; App-side orchestrator hooks filter on `detail.key`.
**When to use:** same-tab sync from a write-hook back to the App-side live state
(the native `storage` event does not fire in the writing tab).
**Trade-offs:** none here — the new `indicator` consumer slots in with zero new
event-bus surface.

### Pattern 3: vite-plugin-pwa generateSW precache (Feature 5)

**What:** Workbox auto-generates a service worker that precaches the hashed build
output; `registerType: 'autoUpdate'` updates silently.
**When to use:** static, backendless apps where the whole bundle is the cache set.
**Trade-offs:** a build-time devDependency; offline-after-first-visit only (no
runtime-fetch caching needed because there is nothing to fetch).

## Data Flow

### Indicator preference flow (Feature 3)

```
User picks in IndicatorPicker
    ↓
useIndicatorChoice.setIndicator(next)
    ↓  loadPrefs() → savePrefs({...current, indicator: next}) → setIndicatorState
    ↓  dispatchEvent('hrv:prefs-changed', {key:'indicator'})
    ↓
useIndicator (App-side) re-reads loadPrefs().indicator
    ↓
App.tsx <BreathingShape indicator={liveIndicator}>
    ↓
BreathingShape switch → OrbShape / SquareShape / DiamondShape
    ↓
label <span> renders text  OR  arrow icon  (aria-label always uses text)
```

### PWA offline flow (Feature 5)

```
First visit (online)
    ↓  registerSW() → SW installs → Workbox precaches built bundle
Repeat visit (online or OFFLINE)
    ↓  SW serves bundle cache-first
    ↓  App boots → localStorage (settings/stats/prefs) → full session, no network
```

## Recommended Build Order

The operator's smallest-blast-radius sequence is sound and is preserved verbatim.
Each feature is independent — no cross-feature dependency forces a different order.
One ordering refinement is called out below.

| Order | Feature | Phase | Blast radius | Rationale |
|-------|---------|-------|--------------|-----------|
| 1 | LICENSE + README | Phase 23 | repo root, 0 `src/` files | Zero code risk; green-gate passes trivially. Pure docs. |
| 2 | Forrest native-app links | Phase 24 | 2–3 content/component files | Additive; reuses the existing `LearnLink` model + link-render pattern. Adds a few PT-BR markers. |
| 3 | Labels-vs-icons toggle | Phase 25 | 3 new + 9 modified files | The largest UI change. Full sibling-clone of the picker pattern + 3-shape consumer edit. |
| 4 | PT-BR native-speaker review | Phase 26 | 2 content files (`pt-BR` only) | Sequenced AFTER 2 and 3 so it reviews ALL pending markers in one pass — including the new markers Features 2 and 3 introduce. Reviewing earlier would leave a second review pass. |
| 5 | PWA install | Phase 27 | build config + html + assets + 1 registration site | Most novel surface (new build-time dep, new asset class, manifest/scope gotcha). Last = the rest of the app is frozen and verified before SW caching wraps it. |

**Phase numbering:** continues from v1.2 — Phases 23–27 (PROJECT.md confirms v1.3
starts at Phase 23). 5 features → 5 phases is the natural 1:1 mapping; each feature
is cohesive and independently shippable.

**Ordering note worth flagging at planning:** Feature 4 (PT-BR review) is correctly
placed *after* Features 2 and 3 because both add new `pt-BR`
`// TODO: native-speaker review` markers. Running the review last means the native
speaker reviews the complete set once — the "grep for marker count == 0" done-signal
is only meaningful if all marker-producing phases have already landed.

## Anti-Patterns

### Anti-Pattern 1: Putting app-store link labels in `lockedCopy.ts`

**What people do:** treat the new Forrest app-store links as "Forrest-related =
must be locked."
**Why it's wrong:** `lockedCopy.ts` D-03 is deliberately scoped to exactly the 3
claim-safe entries. App-store labels carry no medical/affiliation claim; locking
them bloats the frozen-EN guard surface and blocks legitimate PT-BR translation.
**Do this instead:** new links go in `learnContent.ts.links` as normal translatable
`LearnLink` entries with a `// TODO: native-speaker review` marker on the `pt-BR`
label.

### Anti-Pattern 2: Per-theme PWA install icons

**What people do:** assume the 5-palette favicon system should extend to the PWA
install icon, generating 5 maskable icon sets.
**Why it's wrong:** the OS reads the install icon once at install time and never
re-reads it — "per-theme" is physically impossible for a home-screen icon. It also
multiplies the new binary-asset count 5×.
**Do this instead:** one neutral maskable icon set + one apple-touch-icon. The
dynamic per-theme favicon system stays untouched for the browser tab.

### Anti-Pattern 3: Hardcoding `start_url: '/hrv/'` in the manifest

**What people do:** write the literal base path into the manifest.
**Why it's wrong:** it duplicates the `base` value and breaks silently if `base`
ever changes — the exact failure Phase 12 D-04 (`%BASE_URL%` substitution)
established a pattern to avoid.
**Do this instead:** let `vite-plugin-pwa` derive `start_url`/`scope` from Vite
`base`, or use relative `'./'`.

### Anti-Pattern 4: Capture-at-start for the indicator toggle by reflex

**What people do:** copy the Variant `sessionVariantRef` capture machinery because
"the indicator also affects the breathing shape."
**Why it's wrong:** Variant captures at start because mid-session geometry change is
disruptive; the indicator is a pure glyph swap with no disruption, and SettingsDialog
is disabled in-session anyway. The capture machinery is dead weight here.
**Do this instead:** clone `useVisualVariant` (live), pass `liveIndicator` straight
to `BreathingShape`. (Operator may override for strict-consistency reasons — flag at
planning, but live is the default.)

### Anti-Pattern 5: A stateful `useServiceWorker` hook for autoUpdate registration

**What people do:** wrap SW registration in a React hook.
**Why it's wrong:** with `registerType: 'autoUpdate'` there is no update state to
render — a hook adds a component-tree dependency for a one-shot bootstrap call.
**Do this instead:** call `registerSW({ immediate: true })` once in `main.tsx`. A
hook is only justified if an update-available toast is wanted (it isn't, for a
calm-UI single-screen app).

## Integration Points

### Internal Boundaries

| Boundary | Communication | v1.3 change |
|----------|---------------|-------------|
| `useIndicatorChoice` ↔ `useIndicator` | `'hrv:prefs-changed'` CustomEvent (`{key:'indicator'}`) + cross-tab `storage` | New consumer of the existing event bus — no new event name. |
| `SettingsDialog` → `IndicatorPicker` | `{ disabled, strings, sectionLabel }` props (Phase 15 D-02) | New 5th picker child. |
| `App.tsx` → `BreathingShape` → 3 shapes | new `indicator?` prop threaded through dispatcher | Optional prop, default `'labels'` — pre-Phase-25 callers compile unchanged. |
| `prefs.ts` ↔ localStorage envelope | `coercePrefs` per-field fallback | New `indicator` field; no `STATE_VERSION` bump (forward-compat read). |
| Service worker ↔ built bundle | Workbox precache manifest | New: SW caches hashed bundle for offline. Independent of localStorage. |
| `index.html` ↔ build | `%BASE_URL%` substitution | New manifest + apple-touch-icon links join the existing favicon link. |

### External Services

| Service | Integration pattern | Notes |
|---------|---------------------|-------|
| Apple/Google app stores | static external `<a href>` in LearnDialog | Same `target="_blank" rel="noopener noreferrer"` pattern as existing Forrest links. URLs are locale-invariant. |
| Browser PWA install / SW | `vite-plugin-pwa` generateSW + manifest | Build-time devDependency only; runtime-deps invariant intact. |

## Scaling Considerations

Not applicable in the conventional sense — the app is local-only, single-user,
no backend. The v1.3 "scale" concern is **bundle growth**: the indicator picker adds
~3 small files; the PWA plugin adds build-time tooling and ~a few KB of SW glue to
the shipped output. None of this affects runtime performance of a single breathing
session. The precache set grows with every future asset added to `public/` — keep
`globPatterns` scoped to actual app assets.

## Sources

- Codebase read directly: `src/domain/settings.ts`, `src/storage/prefs.ts`,
  `src/hooks/useVariantChoice.ts`, `useThemeChoice.ts`, `useVisualVariant.ts`,
  `src/components/VariantPicker.tsx`, `SettingsDialog.tsx`, `BreathingShape.tsx`,
  `OrbShape.tsx`, `SessionReadout.tsx`, `LearnDialog.tsx`, `src/content/learnContent.ts`,
  `lockedCopy.ts`, `lockedCopy.test.ts`, `strings.ts`, `src/app/App.tsx`,
  `index.html`, `vite.config.ts`, `package.json` (HIGH confidence)
- `.planning/PROJECT.md`, `.planning/MILESTONES.md` — architecture decisions, phase
  history, v1.3 milestone definition (HIGH confidence)
- [vite-plugin-pwa GitHub](https://github.com/vite-pwa/vite-plugin-pwa) — generateSW
  strategy, autoUpdate registerType
- [vite-plugin-pwa releases](https://github.com/vite-pwa/vite-plugin-pwa/releases) —
  v1.3.0 (2026-05-05), Vite 8 peer-dependency support
- [Vite 8 support · Issue #918](https://github.com/vite-pwa/vite-plugin-pwa/issues/918) —
  Vite 8 compatibility confirmation
- [Vite Plugin PWA guide](https://vite-pwa-org.netlify.app/guide/) — manifest,
  scope, start_url derivation from base

---
*Architecture research for: v1.3 Release Polish — 5-feature integration*
*Researched: 2026-05-15*
