# Stack Research — v1.1 Customization Additions

**Domain:** HRV breathing web app — customization layer (themes, audio timbres, visual variants, i18n)
**Researched:** 2026-05-12
**Baseline:** React 18→19 + Vite 8 + TypeScript strict + Tailwind CSS 4.3.0 + Web Audio API + Vitest (shipped, do not re-research)
**Scope:** Stack ADDITIONS and DECISIONS for v1.1 only. Everything in this doc layers on top of the v1.0.1 green-gate baseline.
**Overall Confidence:** HIGH for Tailwind v4 theming (official docs + verified pattern); HIGH for audio timbre (native Web Audio, no deps); MEDIUM-HIGH for i18n (Lingui 6.0 is very new, known Vite integration friction)

---

## 1. Themes (CUST-01)

### Decision: `@theme inline` + `@layer base` per-theme CSS variable overrides, switched via `data-theme` on `<html>`

**No new npm dependency required.**

Tailwind v4 (already installed at 4.3.0) is CSS-first. Theme switching uses two directives already available in the existing `src/styles/theme.css` + `src/index.css` setup:

| Directive | Role |
|-----------|------|
| `@theme inline` | Declares semantic tokens as CSS custom property aliases. The `inline` keyword makes generated utilities reference the aliased var at the *use site*, not the declaration site — required for runtime reassignment to propagate correctly. |
| `@layer base [data-theme="X"] { ... }` | Overrides the aliased CSS vars per named palette. No utility class changes needed in TSX. |
| `@custom-variant dark (...)` | Wires the `dark:` Tailwind variant to the `data-theme="dark"` attribute if dark:utility classes are used. Not needed if all theme tokens are fully semantic and never use `dark:` inline. |

**Pattern (verified against official Tailwind v4 docs + multiple community posts):**

```css
/* src/styles/theme.css — extends existing @theme block */

/* Step 1: declare primitive palette (keep existing colors as defaults) */
@theme {
  /* existing tokens preserved */
  --color-breathing-bg: #f2fbf7;
  --color-breathing-accent: #0f766e;
  /* ... rest unchanged */
}

/* Step 2: declare semantic aliases via @theme inline */
@theme inline {
  --color-surface: var(--theme-surface);
  --color-accent:  var(--theme-accent);
  --color-text:    var(--theme-text);
  /* orb gradient tokens mapped the same way */
}

/* Step 3: define per-theme values in @layer base */
@layer base {
  /* default / light */
  :root, [data-theme="light"] {
    --theme-surface: #f2fbf7;
    --theme-accent:  #0f766e;
    --theme-text:    #0f172a;
  }

  [data-theme="dark"] {
    --theme-surface: #0f172a;
    --theme-accent:  #2dd4bf;
    --theme-text:    #f1f5f9;
  }

  [data-theme="dusk"] {         /* example third palette */
    --theme-surface: #1e1b2e;
    --theme-accent:  #a78bfa;
    --theme-text:    #e2e8f0;
  }
}
```

```tsx
// Theme switching — zero React library needed
function setTheme(name: 'light' | 'dark' | 'dusk') {
  document.documentElement.setAttribute('data-theme', name)
  localStorage.setItem('theme', name)
}
```

**Why `data-theme` attribute, not `.dark` class:**
- The project already uses `data-phase` attributes for orb state gating. `data-theme` is consistent with that idiom.
- Avoids CSS specificity fights between class-based selectors and Tailwind utilities.
- Supports N palettes (not just binary dark/light) without adding more class names.
- The Tailwind v4 official docs show `[data-theme=dark]` as an explicit first-class example.

**Why `@theme inline`, not plain `@theme`:**
The Tailwind v4 docs distinguish: plain `@theme` resolves variable references at the *definition* site (`:root`), so overriding the underlying CSS var in `@layer base` has no effect on the utility class output. `@theme inline` substitutes the variable *reference* directly into the utility's generated CSS, meaning `[data-theme="dark"]` overrides propagate correctly at runtime. This is the critical correctness requirement for multi-palette switching.

**FOUC prevention (no flash of wrong theme on load):**
```html
<!-- index.html — inline script before </head> prevents FOUC -->
<script>
  (function(){
    var t = localStorage.getItem('theme');
    if (t) document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```
This is the same pattern as the existing localStorage envelope — no React dependency, fires synchronously before paint.

**TypeScript for theme names:**
```ts
// src/domain/theme.ts  (pure domain — no React imports)
export type ThemeName = 'light' | 'dark' | 'dusk'
export const THEME_NAMES: readonly ThemeName[] = ['light', 'dark', 'dusk']
export function isValidTheme(v: unknown): v is ThemeName {
  return THEME_NAMES.includes(v as ThemeName)
}
```
Follows the existing `isValidBpm` / `isValidRatio` pattern in `src/domain/settings.ts`. Plugs into the localStorage coerce-and-fallback envelope naturally.

**No new npm packages needed for theming.**

---

## 2. Audio Timbres (CUST-02)

### Decision: Oscillator preset objects — pure Web Audio, zero new dependencies

The existing `cueSynth.ts` already implements a sophisticated multi-partial bowl synthesis engine with sustain-floor logic and per-cue disconnect cleanup. Audio timbre switching means offering alternative synthesis "recipes" that the same scheduling API (`scheduleInCue`, `scheduleOutCue`) can dispatch to.

**Architecture: preset record + dispatcher**

```ts
// src/audio/timbres.ts  — pure, zero React imports

export type TimbreName = 'bowl' | 'sine' | 'bell'

export interface TimbrePreset {
  readonly name: TimbreName
  readonly label: string         // display name for settings UI
  readonly fundamentalHzIn: number
  readonly fundamentalHzOut: number
  readonly partials: ReadonlyArray<{ ratio: number; gain: number }>
  readonly decayTauIn: number    // setTargetAtTime time constant — inhale
  readonly decayTauOut: number   // exhale
  readonly filterFreqHz: number
  readonly filterQ: number
  readonly peakGain: number
  readonly oscillatorType: OscillatorType  // 'sine' | 'triangle' | 'sawtooth' | 'square'
  readonly periodicWave?: { real: Float32Array; imag: Float32Array } // custom waveform
}

export const TIMBRE_PRESETS: Readonly<Record<TimbreName, TimbrePreset>> = {
  bowl: {
    name: 'bowl',
    label: 'Singing bowl',
    fundamentalHzIn: 440,         // A4
    fundamentalHzOut: 220,        // A3
    partials: [
      { ratio: 1.0,  gain: 1.0 },
      { ratio: 2.76, gain: 0.4 },
      { ratio: 5.4,  gain: 0.15 },
    ],
    decayTauIn: 1.4,
    decayTauOut: 1.8,
    filterFreqHz: 3000,
    filterQ: 0.5,
    peakGain: 0.18,
    oscillatorType: 'sine',
  },
  sine: {
    name: 'sine',
    label: 'Soft tone',
    fundamentalHzIn: 528,         // slightly different pitch feel
    fundamentalHzOut: 264,
    partials: [{ ratio: 1.0, gain: 1.0 }],  // pure sine, no overtones
    decayTauIn: 0.8,
    decayTauOut: 1.2,
    filterFreqHz: 8000,
    filterQ: 0.3,
    peakGain: 0.15,
    oscillatorType: 'sine',
  },
  bell: {
    name: 'bell',
    label: 'Bell',
    fundamentalHzIn: 523,         // C5
    fundamentalHzOut: 261,        // C4
    partials: [
      { ratio: 1.0,  gain: 1.0 },
      { ratio: 2.0,  gain: 0.6 },
      { ratio: 3.0,  gain: 0.25 },
      { ratio: 4.16, gain: 0.1 },  // inharmonic partial — bell character
    ],
    decayTauIn: 0.6,
    decayTauOut: 0.9,
    filterFreqHz: 6000,
    filterQ: 1.2,
    peakGain: 0.14,
    oscillatorType: 'sine',
  },
}

export const DEFAULT_TIMBRE: TimbreName = 'bowl'

export function isValidTimbre(v: unknown): v is TimbreName {
  return Object.keys(TIMBRE_PRESETS).includes(v as string)
}
```

**Why oscillator presets, not a sample bank:**
- Zero asset pipeline additions. No `public/audio/*.mp3` files, no fetch/decode overhead, no licensing questions.
- Fully consistent with the v1.0 decision: "Use built-in tones with mute support. Avoid sourcing audio assets" (D-04).
- Preset parameters (fundamentals, partials, decay) are pure data — testable with `FakeAudioContext`.
- The existing `scheduleBowlCue` function already receives `fundamentalHz` and `decayTau` — it can be parameterized to accept a `TimbrePreset` with minimal surgery.
- `PeriodicWave` / `createPeriodicWave()` is available for future custom waveforms (bell character via inharmonic partials uses it at the oscillator level), but all proposed presets work with `OscillatorType: 'sine'` + partial stacking, which the existing engine already does.

**Integration points:**
1. `cueSynth.ts`: accept optional `TimbrePreset` arg; fall back to current bowl constants.
2. `useAudioCues.ts`: pass preset from settings.
3. `src/domain/settings.ts`: add `timbre: TimbreName` field; extend `isValidTimbre` + `coerceSettings`.
4. `src/storage/`: extend envelope schema version (bump major version triggers refuse-downgrade guard).
5. Settings UI: `SettingsForm.tsx` adds a segmented control or `<select>` for timbre choice.

**No new npm packages needed for audio timbres.**

---

## 3. Visual Variants (CUST-03)

### Decision: SVG/CSS component variants selected by a `visualVariant` setting — zero new animation libraries

The current orb (`BreathingShape.tsx`) is a single CSS/SVG orb driven by inline `transform: scale(...)` from the RAF loop. Visual variants means offering 2–3 different visual component implementations that the session screen swaps by prop or setting.

**Architecture: variant lookup + lazy-loaded components**

```ts
// src/domain/visualVariant.ts
export type VisualVariantName = 'orb' | 'ring' | 'bar'
export const VISUAL_VARIANT_NAMES: readonly VisualVariantName[] = ['orb', 'ring', 'bar']
export function isValidVisualVariant(v: unknown): v is VisualVariantName {
  return VISUAL_VARIANT_NAMES.includes(v as VisualVariantName)
}
```

```tsx
// Session screen — variant dispatch
const VisualComponent = {
  orb:  BreathingShape,      // existing — no change
  ring: BreathingRing,       // new concentric-rings variant
  bar:  BreathingBar,        // new horizontal breath-bar variant
}[visualVariant]
```

Each variant receives the same `{ progress: number; phase: 'in' | 'out'; reducedMotion: boolean }` prop interface that `BreathingShape` already uses. The RAF loop, phase clock, and session engine are unchanged — only the visual consumer changes.

**Why no animation library (Motion/Framer):**
- The existing orb uses zero animation libraries and passes the green-gate with 409 tests. Adding Motion would increase bundle from ~70 KB gzip toward ~130+ KB gzip.
- CSS transitions + inline `transform` driven by RAF is the proven pattern. New variants follow it identically.
- Motion would require wrapping RAF-driven state changes in `useAnimationFrame` or similar, fighting the existing architecture.

**No new npm packages needed for visual variants.** (If a future variant genuinely requires spring physics or complex sequencing, `motion` 12.x is already listed as an alternative in v1.0 research.)

---

## 4. Language Switching (I18N-01)

### Decision: Roll-your-own section-keyed dispatcher — no i18n library for v1.1

**Summary:** The existing `learnContent.ts` shape (section-keyed, TypeScript-typed, statically bundled) is already the right foundation for v1.1 multi-language support. Adding an i18n library for v1.1 has more cost than benefit given the app's content profile.

**Recommendation: extend the existing section-keyed pattern, no new library.**

The app has two categories of user-visible strings:

| String category | Examples | v1.1 approach |
|----------------|----------|---------------|
| UI chrome (short, stable) | "Inhale", "Exhale", "Mute", "Settings", "Start", BPM labels | Typed `strings.ts` content file, keyed by locale + key |
| Long-form explainer text | LearnDialog sections (hrv, timing, forrest) | Already in `learnContent.ts` section-keyed shape; extend with a per-locale map |

**Pattern:**

```ts
// src/content/strings.ts
export type LocaleKey = 'en' // add 'es' | 'pt' | 'ja' etc. as new locales ship

export interface UiStrings {
  readonly inhale: string
  readonly exhale: string
  readonly mute: string
  readonly unmute: string
  readonly settings: string
  readonly startSession: string
  // ... etc
}

export const UI_STRINGS: Readonly<Record<LocaleKey, UiStrings>> = {
  en: {
    inhale: 'Inhale',
    exhale: 'Exhale',
    mute: 'Mute',
    // ...
  },
}

// src/content/learnContent.ts — already section-keyed
// Add: export const LEARN_CONTENT_BY_LOCALE: Record<LocaleKey, LearnContent> = { en: LEARN_CONTENT }
```

```ts
// src/domain/locale.ts
export type LocaleName = 'en'
export const LOCALE_NAMES: readonly LocaleName[] = ['en']
export function isValidLocale(v: unknown): v is LocaleName { ... }

// src/hooks/useLocale.ts
export function useLocale(): { locale: LocaleName; setLocale: (l: LocaleName) => void } { ... }
```

**Why not react-i18next (i18next v26.1.0 + react-i18next v17.0.7):**
- Combined gzipped bundle: ~22 kB added to the bundle (i18next ~15 kB + react-i18next ~7 kB). Current bundle is ~70 kB gzip. That is a ~31% bundle increase for infrastructure v1.1 does not need.
- The i18next HTTP backend, pluralization engine, namespace system, and interpolation features are not used by this app. The app has ~30 UI strings and 3 static explainer sections. There is nothing to interpolate, no pluralization, no lazy loading.
- react-i18next requires `initReactI18next`, an `I18nProvider` wrapper, and string-keyed `t()` calls throughout — all of which need to thread through strict TypeScript type declarations. This is higher integration cost than typed content files for this content volume.
- The i18next ecosystem adds `// eslint-disable` pressure on hooks rules (async `init`, `i18n.changeLanguage` side effects) that conflicts with the `react-hooks/exhaustive-deps: error` invariant.

**Why not Lingui 6.0.1 (the bundle-size winner at ~3 kB runtime):**
- Lingui requires a **build-time extraction + compilation step** (`lingui extract` + `lingui compile`). This adds a CI script and a `lingui.config.ts` to the project. The per-commit green-gate would need to include `lingui compile` — or the compiled catalogs must be checked in.
- Lingui v6 (released May 2026) is very new. Known Vite friction: the `@lingui/babel-plugin-lingui-macro` must be threaded through `@vitejs/plugin-react`'s `babel.plugins` option; the SWC path has open issues with `.ts`/`.mjs` files. Both paths require non-trivial Vite config surgery.
- The `Trans` macro and `useLingui()` hook require wrapping components — changing every string-bearing component in the codebase is a wide diff at high risk of introducing lint/type regressions across 409 passing tests.
- For 3 locales and ~30 keys, the macro + catalog compilation workflow is significant infrastructure for minimal gain.
- **Use Lingui if:** the app ever ships 5+ locales, requires translator-friendly PO/XLIFF workflows, or needs ICU plural/gender messages. At that point the extraction workflow pays for itself.

**Why not React-intl / FormatJS:**
- 17.8 kB gzip, similar complexity as i18next, same "too big for this problem" conclusion.

**Roll-your-own correctness guarantees (the things i18n libraries provide):**
- **Type safety:** TypeScript enforces that every `LocaleName` has a full `UiStrings` record at compile time via `Record<LocaleName, UiStrings>`. Missing keys are compile errors.
- **Fallback:** `LocaleName` union is narrow; unknown locale values are coerced to `'en'` via the same `isValidLocale` + coerce pattern used for BPM/ratio.
- **Reactivity:** a `useState<LocaleName>` in App (or a minimal Zustand slice) drives re-renders; no provider wrapping needed beyond what React already provides.
- **localStorage persistence:** same envelope as settings — already versioned, forward-compatible.

**When to revisit:** When a second real locale ships with actual translations. At that point, evaluate Lingui first (smallest runtime, best translator workflow).

---

## 5. New Packages Summary

| Package | Version | Purpose | Condition |
|---------|---------|---------|-----------|
| *none* | — | All v1.1 customization is achievable with zero new runtime dependencies | All four features (themes, timbres, visual variants, i18n) use existing Tailwind v4, Web Audio API, and React patterns |

**Net new runtime dependencies: 0.**

---

## 6. What NOT to Add

| Avoid | Why | Instead |
|-------|-----|---------|
| `react-i18next` + `i18next` | +22 kB gzip for a problem solvable with typed content files | Roll-your-own `strings.ts` section-keyed dispatcher |
| `@lingui/react` + build pipeline | Lingui v6 is brand-new; Vite integration has known friction; catalog compilation adds CI complexity; overkill for ≤3 locales | Same roll-your-own approach; revisit for 5+ locales |
| `motion` / `framer-motion` | +60 kB gzip; fights the existing RAF+inline-transform architecture | CSS transitions + RAF loop (same as v1.0) |
| Tone.js | +200 kB+ gzip; designed for musical sequencers; overkill for cue synthesis | Native `OscillatorNode` + `GainNode` presets (same as v1.0) |
| Audio sample files (mp3/ogg) | Asset pipeline, licensing, fetch/decode latency, size | Oscillator preset parameters; pure Web Audio synthesis |
| `next-themes` | A React library for Next.js app theming; not applicable to Vite SPA | `data-theme` attribute + `localStorage` in a ~15-line vanilla TS module |
| Tailwind `darkMode: 'class'` (v3 config) | Does not exist in Tailwind v4; v4 is CSS-first | `@custom-variant dark` in CSS (no config file) |
| Separate `tailwind.config.ts` for themes | Tailwind v4 replaced `tailwind.config.js` with `@theme` in CSS | Extend `src/styles/theme.css` with `@theme inline` + `@layer base` blocks |
| New test framework or additional test utilities | 409 tests pass under Vitest + jsdom + FakeAudioContext polyfill | Extend existing setup; `TimbrePreset` objects test as pure data with existing FakeAudioContext |

---

## 7. Integration Points with Strict Baseline

All additions must hold `tsc && lint && build && test` green at every commit (D-09/D-15 invariant).

| Addition | Strict TS notes | Hook-rules notes |
|----------|-----------------|------------------|
| `domain/theme.ts` | Pure value types, `readonly` arrays, narrow union — no issues | No hooks |
| `domain/locale.ts` | Same pattern | No hooks |
| `domain/visualVariant.ts` | Same pattern | No hooks |
| `audio/timbres.ts` | `Float32Array` types for `periodicWave` if used; `OscillatorType` is already typed by `lib.dom.d.ts` | No hooks |
| `content/strings.ts` | `Readonly<Record<LocaleKey, UiStrings>>` — exhaustiveness checked at compile time | No hooks |
| `useLocale.ts` | `useState` + `localStorage` read in init (one-time); `setLocale` is a stable callback if wrapped in `useCallback` — `exhaustive-deps` will require it | Must satisfy `react-hooks/exhaustive-deps: error` |
| Theme `data-theme` setter | Vanilla TS, not a hook | N/A |
| Settings schema extension | New fields must go through `isValid*` + `coerceSettings`; version bump triggers refuse-downgrade guard on old storage | Storage envelope already handles new unknown fields via spread |
| `FakeAudioContext` in tests | New `TimbrePreset` data objects test as plain POJOs; `scheduleBowlCue` refactored to accept preset already covered by existing FakeAudioContext mock | No changes to test polyfill needed |

---

## 8. Version Reference

| Technology | Version | Status | Source |
|------------|---------|--------|--------|
| Tailwind CSS | 4.3.0 (installed) | Current as of 2026-05-09 | npm |
| @tailwindcss/vite | 4.3.0 (installed) | Matches Tailwind | npm |
| React | 19.x (installed) | Baseline | shipped |
| Vite | 8.x (installed) | Baseline | shipped |
| TypeScript | 6.x (installed) | Baseline | shipped |
| Web Audio API | Browser baseline | No npm package; Baseline Widely Available per MDN | MDN |
| @lingui/react | 6.0.1 | NOT USED in v1.1 — documented for future reference | npm |
| react-i18next | 17.0.7 | NOT USED in v1.1 — documented for future reference | npm |
| i18next | 26.1.0 | NOT USED in v1.1 — documented for future reference | npm |

---

## Sources

- Tailwind CSS v4 official docs, Dark Mode — `@custom-variant` syntax for `data-theme` attribute. https://tailwindcss.com/docs/dark-mode **Confidence: HIGH.**
- Tailwind CSS v4 official docs, Theme Variables — `@theme` vs `@theme inline` distinction, runtime CSS variable resolution. https://tailwindcss.com/docs/theme **Confidence: HIGH.**
- Multi-theme CSS variable pattern with `@layer base` per `[data-theme]`: https://medium.com/@kevstrosky/theme-colors-with-tailwind-css-v4-0-and-next-themes-dark-light-custom-mode-36dca1e20419 **Confidence: MEDIUM-HIGH** (verified against official @theme inline docs).
- Custom multi-variant pattern: https://dev.to/vrauuss_softwares/-create-custom-themes-in-tailwind-css-v4-custom-variant-12-2nf0 **Confidence: MEDIUM** (community article, consistent with official docs).
- simonswiss.com Tailwind v4 multi-theme strategy — semantic token separation: https://simonswiss.com/posts/tailwind-v4-multi-theme **Confidence: MEDIUM-HIGH.**
- Tailwind CSS GitHub Discussion #15600 — `@theme inline` correctness for runtime variable override: https://github.com/tailwindlabs/tailwindcss/discussions/15600 **Confidence: HIGH** (official repo discussion, Tailwind maintainers participate).
- MDN Web Audio API `createPeriodicWave()` — Fourier coefficient API, browser support (Baseline Widely Available since April 2021): https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createPeriodicWave **Confidence: HIGH.**
- MDN OscillatorNode — `type` property and `setPeriodicWave()`: https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode **Confidence: HIGH.**
- react-i18next + i18next bundle size (~22 kB gzip combined): Bundlephobia + multiple 2026 comparisons. https://bundlephobia.com/package/react-i18next + https://bundlephobia.com/package/i18next **Confidence: MEDIUM** (Bundlephobia page rendered JS not extractable; estimate from multiple secondary sources consistent).
- Lingui v6.0.1 React + Vite setup: https://lingui.dev/tutorials/setup-react **Confidence: HIGH** (official docs). Vite integration friction (TypeScript + macro compilation): https://github.com/lingui/js-lingui/issues/2236 **Confidence: MEDIUM** (open issue).
- npm version checks 2026-05-12: `@lingui/react` 6.0.1, `react-i18next` 17.0.7, `i18next` 26.1.0, `tailwindcss` 4.3.0 **Confidence: HIGH** (direct npm registry queries).

---
*Stack research for: HRV breathing web app — v1.1 customization layer*
*Researched: 2026-05-12*
