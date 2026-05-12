# Pitfalls Research

**Domain:** HRV breathing webapp — v1.1 Customization (themes, audio timbres, visual variants, i18n)
**Researched:** 2026-05-12
**Confidence:** HIGH for envelope/audio/reduced-motion integration pitfalls (codebase directly inspected); HIGH for TypeScript strict-mode interaction pitfalls; MEDIUM for i18n bundle tree-shaking (WebSearch + Vite docs, not verified against a deployed instance of this codebase); MEDIUM for Tailwind v4 theme token scoping (WebSearch-confirmed, version-specific behavior).

---

## Critical Pitfalls

### Pitfall 1: Envelope schema bump that replaces the whole top-level object — losing unknown fields written by a newer build

**What goes wrong:**
When CUST-01 (themes) or CUST-02 (timbres) adds a new top-level field to the `Envelope` in `src/storage/storage.ts` (e.g. `theme?: unknown` or `timbre?: unknown`), an author unfamiliar with the STORAGE-01 spread-then-override invariant writes the new field by constructing a new object from scratch: `writeEnvelope({ version: STATE_VERSION, settings: env.settings, mute: env.mute, stats: env.stats, theme: newTheme })`. This silently drops any additional top-level keys a concurrent newer-tab has written. It also breaks the refuse-downgrade guard (D-04a): the inline re-read checks `currentVersion > STATE_VERSION` to abort, but a freshly-constructed object that forgets the on-disk version always stamps STATE_VERSION, making the guard a no-op.

**Why it happens:**
`readEnvelope` returns an `Envelope` typed with only the four known fields (`version`, `settings`, `mute`, `stats`). The static type does not surface unknown extra keys, so TypeScript does not warn when a developer destructures only the four known fields and re-assembles without the spread. The storage.ts comment warns against this but is easy to miss when adding a new field.

**How to avoid:**
Always add new top-level customization fields by spreading the existing envelope first and then overriding:
```typescript
// CORRECT — preserves any unknown fields from a concurrent newer build:
writeEnvelope({ ...env, theme: newTheme }, deps)

// WRONG — drops unknown fields and breaks the refuse-downgrade guard:
writeEnvelope({ version: STATE_VERSION, settings: env.settings, mute: env.mute, stats: env.stats, theme: newTheme }, deps)
```
Add a `theme?: unknown` (and equivalently `timbre?: unknown`) field to the `Envelope` interface in `storage.ts` at the same time the feature is added — that forces every write site to satisfy the static type and makes the spread pattern visible. Do NOT add `[k: string]: unknown` index signature to `Envelope` (storage.ts RESEARCH RQ-4 Option b already rejected this because it breaks the `Envelope`-assignable-to-discriminated-union contract elsewhere).

**Warning signs:**
- A `writeEnvelope` call that lists all four existing known fields by name instead of using `...env` spread.
- Tests that only assert the four known fields exist after a write, never asserting that an unknown fifth field survives a round-trip.

**Phase to address:**
CUST-01 (themes) — first phase that adds a new top-level envelope field. Establish the pattern once; CUST-02/I18N-01 inherit it.

---

### Pitfall 2: Audio timbre swap during a running session that breaks the dual-anchor reconstruction invariant

**What goes wrong:**
CUST-02 adds user-selectable audio timbres (alternate `cueSynth` parameters). A naive implementation wires the timbre selector to immediately close the current `AudioEngine` and open a new one mid-session. This triggers `reconstructEngine()` in `useAudioCues`, which fires `onReanchorRequiredRef.current?.(newEngine.now())`. The App-level `audioAnchorRef.current` is then re-set to the new AC's `currentTime` (≈ 0) minus the session-elapsed offset (kitchen-sink fix). If timbre changes are allowed freely while running, this reconstruction path fires repeatedly, each time re-anchoring the dual-clock alignment. Because reconstruction is async, a second timbre swap arriving before the first `createAudioEngine` awaits can arrive with a stale generation counter, causing the AUDIO-01 generation check to abort the second engine after it is already constructed — leaving `engineRef.current === null` mid-session (engine reference lost, no further cues fire).

Additionally, OscillatorNode instances that are already `start()`-ed and `stop()`-ed cannot be mutated; a timbre change affects only cues that have not yet been scheduled. If the timbre preference is applied by simply changing a module-level constant and then scheduling the next cue, the in-flight cue (already scheduled with old oscillator nodes) plays with the old timbre and the next plays with the new — producing a one-cycle seam. This is an audio UX concern, not a crash, but can be jarring.

**Why it happens:**
`cueSynth.ts` hard-codes `IN_FUNDAMENTAL_HZ = 440`, `OUT_FUNDAMENTAL_HZ = 220`, `PARTIALS`, decay time-constants, etc. as module-level constants. The clean API surface for timbre customization is to pass these as parameters to `scheduleBowlCue`. Authors taking a shortcut may instead mutate a shared config object mid-session or fully reconstruct the engine per timbre change.

**How to avoid:**
- Parameterize timbre as a pure value passed to the cue schedule functions — `scheduleInCue(ctx, when, dest, phaseDuration, timbreConfig)`. The `cueSynth` functions become stateless with respect to timbre; the engine receives `timbreConfig` at construction and passes it through. No module-level mutable state.
- Make timbre changes take effect at the next session start only (not mid-session). Persist the preference immediately but defer application. This eliminates the reconstruction race entirely.
- If mid-session timbre is a hard requirement, limit changes to the boundary between phases (when no cue is in-flight) and never trigger engine reconstruction — instead pass the new timbre config through `scheduleNextCue`. This is safe because each `scheduleNextCue` call creates fresh oscillator/gain nodes for the new cue.

**Warning signs:**
- `CUST-02` implementation closes and re-opens `AudioEngine` when the user changes timbre preference during a session.
- Timbre config is stored as a module-level `let` that is mutated at change time rather than passed as a parameter to schedule functions.

**Phase to address:**
CUST-02 (audio timbres). The `cueSynth` parameterization must be designed before any timbre UI is wired to avoid mid-session engine churn.

---

### Pitfall 3: Theme CSS tokens that silently destroy the reduced-motion gradient crossfade contract (D-07)

**What goes wrong:**
CUST-01 adds theme switching by defining alternate CSS custom property values (e.g. `--color-orb-in-from`, `--color-orb-in-to`, `--color-orb-out-from`, `--color-orb-out-to`). Under `prefers-reduced-motion: reduce`, the orb is locked at `MID_SCALE` and the SOLE phase indicator is the opacity crossfade between `.orb-layer--in` and `.orb-layer--out`. If a theme's "in" and "out" color tokens are perceptually indistinct from each other (e.g. both light pastels, or both the same hue), the crossfade becomes invisible to reduced-motion users — the only phase cue is gone.

The existing theme.css comment at line 25-27 documents this explicitly: "UAT-1: 'from' stops deepened one Tailwind step (teal-200 / blue-200) so the opacity crossfade between In and Out is perceptually readable under prefers-reduced-motion (where the orb is locked at MID_SCALE and the crossfade is the sole phase indicator per D-07)." A theme author adding new color tokens who does not know this context will ship a variant where reduced-motion users cannot follow the session.

A second sub-pitfall: theme switching that sets token values via a class on `<html>` or `<body>` (the common Tailwind pattern) can conflict with the `@media (prefers-reduced-motion: reduce)` rule in `theme.css`. Specifically, the existing rule:
```css
@media (prefers-reduced-motion: reduce) {
  dialog.modal-fade { transition: none !important; }
}
```
relies on cascade ordering with respect to Tailwind's `@theme` block. Adding class-based theme token overrides at a higher specificity can silently win over the `@media` rule if the override block is injected after `theme.css` in the stylesheet order.

**How to avoid:**
- Define a "theme contract": every theme MUST supply a perceptually distinct `--color-orb-in-from` vs `--color-orb-out-from` (minimum contrast delta, documented). Test each theme against the reduced-motion path explicitly — enable OS reduced-motion in system settings, load each theme, confirm the crossfade is visible without scale animation.
- Keep theme token overrides inside a `@layer` block at the same layer as `theme.css`'s `@theme`, or use `:root[data-theme="X"]` selectors that are lower specificity than `@media` rules. Do NOT use `!important` in theme override files.
- Never add a `transition: none !important` to `.orb-layer--in` or `.orb-layer--out` inside the reduced-motion block — these transitions are deliberately PRESERVED as the sole phase indicator under reduced-motion per D-07 and the comment at `theme.css:106-108`.

**Warning signs:**
- A new theme's in/out gradient stops differ only in lightness, not hue (reduced-motion crossfade is invisible).
- Theme CSS uses `!important` on transition or opacity rules.
- Reduced-motion UAT is skipped for new themes because "motion behavior is unchanged."

**Phase to address:**
CUST-01 (themes). The theme contract (perceptual crossfade requirement) must be the acceptance criterion before any theme ships.

---

### Pitfall 4: Theme token injection that clobbers `BreathingShape.tsx`'s dual MIN/MAX_SCALE sync contract (IN-01)

**What goes wrong:**
`BreathingShape.tsx` line 17-20 documents the `IN-01` sync contract: `--orb-scale-min`, `--orb-scale-max`, and `--orb-scale-mid` CSS tokens MUST stay in sync with the `MIN_SCALE`, `MAX_SCALE`, and `MID_SCALE` TypeScript constants. The TS side drives the breathing math (scale interpolation per `phaseProgress`); the CSS tokens are consumed by stylesheet fallbacks and the `motion-reduce` path.

A visual variant (CUST-03) that applies an alternate `--orb-scale-min` or `--orb-scale-max` via a CSS token override without updating the TS constants will create a mismatch: the orb scale animation follows the TS values while the reference rings (`.orb-ring--outer` at `-1.5px` inset, `.orb-ring--inner` at `MIN_SCALE * 100%`) are positioned against the CSS token values. The outer ring will appear to gap from the orb at peak inhale; the inner ring will not coincide with the orb at peak exhale. The `theme.css` comment at lines 17-20 and the `BreathingShape.tsx` comments at lines 17-20 document this explicitly, but authors adding CUST-03 variants may miss it.

**How to avoid:**
- If CUST-03 variants need alternate orb size ranges, change BOTH the TS constants AND the CSS tokens together in the same commit, and add a test that derives the orb-ring dimensions from the TS constants (not a hardcoded snapshot) to catch future divergence.
- Alternatively, keep `--orb-scale-min/max/mid` read-only (not part of the theme API) and instead vary `--orb-size` (the `clamp()` expression) as the only dimension a visual variant controls. This keeps the IN-01 contract isolated from the theme API.

**Warning signs:**
- A CUST-03 phase plan that changes orb scale range CSS tokens without a corresponding TS constant update.
- Test snapshots that capture ring pixel offsets from the old MIN_SCALE; these will silently drift if CSS tokens diverge.

**Phase to address:**
CUST-03 (visual variants). Write the dual-update requirement into the CUST-03 phase plan acceptance criteria.

---

### Pitfall 5: i18n string IDs that collide with the locked-copy contract for Forrest-claim-safe text

**What goes wrong:**
I18N-01 introduces a translation key lookup (e.g. `t('learn.forrest.body')`) that replaces static strings in `LearnDialog.tsx` and `learnContent.ts`. The Phase 6 D-12 contract locks two specific strings: the phrase `"inspired by Forrest's teachings"` and the two-line disclaimer. These are locked to prevent copy drift that could accidentally produce a health claim or drop the Forrest attribution.

If I18N-01 wraps these locked strings in the same translation function as all other UI copy, a future locale contributor can provide a translation key override that replaces the locked phrase with any content — silently breaking the claim-safe positioning contract. Locked strings that pass through a translation pipeline become effectively unlocked.

The existing `learnContent.ts` has a comment at line 6: "Disclaimer copy is intentionally inlined in `LearnDialog.tsx` per CONTEXT.md §Established Patterns — short copy stays inline; explainer lives in this asset. Do NOT add disclaimer strings to this module." This comment will need to be re-validated when I18N-01 runs.

**How to avoid:**
- Classify locked strings separately from translatable copy. Locked strings are constants in TS source, not translation keys. `LearnDialog.tsx` renders them directly from a `LOCKED_COPY` constant, not from `t()`.
- Translatable copy (section titles, generic labels) goes through the i18n pipeline. Locked copy (claim-safe phrases, the disclaimer) stays as hardcoded TS constants that are co-located with `LearnDialog.tsx`.
- Document this two-tier approach explicitly in the I18N-01 plan so locale contributors understand which strings are off-limits.

**Warning signs:**
- A translation key named `learn.forrest.claimPhrase` or `disclaimer.line1` — these indicate locked copy has entered the translation pipeline.
- `LearnDialog.tsx` no longer contains the literal string `"inspired by Forrest's teachings"` after I18N-01 lands.

**Phase to address:**
I18N-01 (language switching). The locked-copy audit must be the first step, before any string extraction.

---

### Pitfall 6: i18n lazy-loaded locale bundles that break Vitest test determinism via async initialization

**What goes wrong:**
The standard pattern for React i18n (react-i18next or similar) initializes the i18n library asynchronously at app bootstrap via `i18n.init({ ... })`, often with a `LanguageDetector` backend. Vitest tests that render components using `useTranslation()` or `t()` before init resolves will see the fallback key (e.g. `"learn.title"` rendered as the literal key string instead of the English label). This causes snapshot tests to fail non-deterministically or always produce key-based output.

Additionally, Vite tree-shaking for locale bundles requires that locale imports use static dynamic-import expressions (`import('./locales/en.json')`) rather than computed paths (`import(\`./locales/${lang}.json\``). Computed paths force Vite to include all matching files in the bundle as a dynamic chunk, defeating the lazy-load intent and inflating the production bundle.

The existing `learnContent.ts` uses a section-keyed shape (`hrv`, `timing`, `forrest`) described at line 3 as "i18n-stable identifiers for future locale swap." This is a good foundation, but any i18n library added in I18N-01 must be initialized synchronously in Vitest (via a test setup file) with the English locale to prevent the flakiness.

**How to avoid:**
- In `vitest.setup.ts` (the existing polyfill/setup file), initialize the i18n library synchronously with the English locale using a `resources` object instead of a backend loader. Never use the HTTP backend or filesystem backend in tests.
- Use static import expressions for each locale: `import('./locales/en.json')`, `import('./locales/ja.json')`. Never use template literals or computed variables in the import path.
- Keep `learnContent.ts`'s section keys (`hrv`, `timing`, `forrest`) as the namespacing anchor for any i18n namespace to avoid key collision with other parts of the UI.

**Warning signs:**
- A test renders a component that calls `t('key')` and the snapshot contains literal dot-notation key strings (`"learn.hrv.title"`) rather than English text.
- The i18n init call is `async` and not awaited in `vitest.setup.ts`.
- The Vite build output shows a large `locales-[hash].js` chunk that includes all locale files even though only one is loaded at startup.

**Phase to address:**
I18N-01 (language switching). The Vitest init setup is a blocking first step before any test file uses translation hooks.

---

### Pitfall 7: Theme class or data-attribute switching that introduces a FOUC on load

**What goes wrong:**
CUST-01 theme switching via a class on `<html>` (e.g. `class="theme-dark"`) or a `data-theme` attribute is applied by JavaScript after React hydration. On first paint the browser renders the default token values; the JavaScript then reads localStorage and applies the class. Users see a brief flash of the default theme (typically the green/teal palette) before the selected theme loads — perceptually jarring for a calm breathing app.

**Why it happens:**
React hydration is async relative to CSS variable application. By the time the `useEffect` that reads `localStorage` and sets `document.documentElement.dataset.theme` runs, the browser has already painted the default token values.

**How to avoid:**
- Inject a tiny inline `<script>` in `index.html` before the main bundle that reads the theme preference from `localStorage` and sets the class/attribute synchronously, before first paint. This is the standard FOUC prevention for theme switching.
- The script must be small and synchronous (no module, no `defer`) and handle the `localStorage` unavailable case (private browsing) by defaulting to the base theme silently.

**Warning signs:**
- Theme switching is wired entirely through a `useEffect` call.
- No inline script in `index.html` reads the theme before the React bundle loads.
- First paint in DevTools shows the default palette for one frame before the selected theme appears.

**Phase to address:**
CUST-01 (themes). Include the inline bootstrap script in the phase plan.

---

### Pitfall 8: Visual variant (CUST-03) that inadvertently drops the 44×44 hit-area or focus-visible ring floor

**What goes wrong:**
CUST-03 adds alternate visual styles to the orb or session controls. If an alternate variant changes the button sizing (e.g. a "compact" variant that shrinks `SessionControls` buttons) it can violate the 44×44 hit-area floor (Phase 2 D-17). Similarly, if a variant's CSS overrides include `outline: none` or reset Tailwind's `focus-visible:ring-*` utilities (to apply a custom focus style), the replacement may not meet the 3:1 contrast ratio or 2px thickness required by WCAG 2.4.7 / SC 2.4.13.

**How to avoid:**
- Define a component-level accessibility contract: buttons must have `min-width: 44px; min-height: 44px` as a non-negotiable base. Variants change aesthetics (color, border-radius, gradient) but never sizing or focus ring.
- If a variant introduces a custom focus indicator, test it against the WCAG 2.4.11 focus appearance requirement (3:1 contrast ratio against adjacent colors, 2px perimeter).
- Run the existing Vitest tests after each variant is applied — the `LearnAnchor.test.tsx`, `MuteToggle.test.tsx`, and `SessionControls.test.tsx` files assert on rendered structure; a variant that changes the element tree will break those assertions immediately.

**Warning signs:**
- A CUST-03 CSS file contains `outline: 0` or `outline: none` on any interactive element.
- Button dimensions are overridden in a variant stylesheet without a `min-width`/`min-height` floor.
- A variant is shipped without a keyboard-navigation smoke test.

**Phase to address:**
CUST-03 (visual variants). Add an a11y contract checklist to the CUST-03 acceptance criteria.

---

### Pitfall 9: `useCallback`/`useEffect` dependency drift when customization prefs are added to `App.tsx` state

**What goes wrong:**
Adding `theme`, `timbre`, or `locale` as React state in `App.tsx` creates new closure variables. If these variables are read inside existing `useCallback` or `useEffect` callbacks — even incidentally (e.g. a `console.debug` that references `theme` for debugging) — `react-hooks/exhaustive-deps: error` will require them in the dep array. Adding them to the dep array can cause existing phase-boundary effects or audio-scheduling effects to re-fire when the user changes a customization preference mid-session, producing spurious phase-boundary events or re-scheduled cues.

In the existing codebase, the `mutedRef` pattern (HOOKS-01) was introduced specifically because `muted` state in dep arrays caused `start` and `reconstructEngine` to re-create on every mute toggle. The same risk applies to any new top-level state that ends up in a closure used by timing-critical effects.

**How to avoid:**
- Use a `useRef` mirror pattern (same as `mutedRef`) for any customization state that timing-critical effects need to read without re-firing: `const themeRef = useRef(theme); useEffect(() => { themeRef.current = theme }, [theme])`. The timing effects read `themeRef.current` and do not list `theme` in their dep arrays (with the mandatory `// Reason:` annotation per Phase 7 D-04 policy).
- Keep new customization prefs out of `App.tsx` state where possible — prefer a dedicated context or a thin config module that timing effects never import.

**Warning signs:**
- A new `theme` or `timbre` state variable appears inside an existing `useCallback` or `useEffect` that was previously not re-created on theme changes.
- The ESLint `react-hooks/exhaustive-deps` rule requires a new dep to be added to a timing-critical dep array.
- Adding a theme to the dep array of the phase-boundary effect causes that effect to fire during a running session when the user changes themes.

**Phase to address:**
CUST-01 first (sets the architectural pattern); CUST-02 and CUST-03 inherit.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems specific to adding customization.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store theme preference inside `settings` subtree of envelope | No new envelope field needed | `coerceSettings` will strip unknown keys (per D-02 sub-key forward-compat is NOT guaranteed); theme pref survives only until `coerceSettings` is updated | Never — use a dedicated top-level field with spread-then-override write |
| Apply timbre change by mutating `cueSynth.ts` module-level constants | Simplest immediate implementation | Breaks test isolation (module-level state leaks between test files); cue synthesis is no longer pure | Never — parameterize timbre as a function argument |
| Translate locked Forrest claim strings through `t()` | All copy in one pipeline | Locked strings become editable by locale contributors; claim-safe positioning silently lost | Never |
| Use a `useEffect` to set `document.documentElement.dataset.theme` on mount | No HTML change needed | FOUC on first load for non-default themes | Acceptable for demo/spike; never for shipped theme |
| Rely on Tailwind's purge to eliminate unused theme token classes | Simpler build config | Alternate themes defined in JS objects (not class strings) may be purged if not safelisted | Never without explicit safelist |
| Wrap all locale imports in a computed path (`import(\`./locales/${lang}\`)`) | Single dynamic import for all locales | Vite cannot tree-shake; all locale bundles included in main chunk | Never — use per-locale static imports |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Envelope + new theme field | Construct whole new envelope object without spread | Always `{ ...env, theme: newValue }` — spread first, override second |
| cueSynth + timbre variants | Mutate module-level frequency/decay constants | Pass timbre config as call-time parameters to `scheduleBowlCue` |
| CSS theme tokens + reduced-motion | New theme has indistinct in/out gradient stops | Enforce perceptual contrast between `--color-orb-in-from` and `--color-orb-out-from` in every theme |
| CSS theme tokens + orb scale contract | Override `--orb-scale-min/max/mid` without updating `BreathingShape.tsx` TS constants | Either keep scale tokens read-only or update both token and TS constant in same commit |
| i18n + locked Forrest copy | Add locked phrases as translation keys | Keep locked strings as TS constants, not i18n keys |
| i18n + Vitest | Init i18n library asynchronously in `vitest.setup.ts` | Init synchronously with `resources` object in setup; never use a backend loader in tests |
| CUST-03 variants + focus ring | CSS variant resets `outline` without replacement | Variants change aesthetics, never hit-area or focus ring; keep `focus-visible:ring-*` utilities |
| New React state in App.tsx + timing effects | Add `theme` to existing timing-effect dep arrays | Use `useRef` mirror pattern (HOOKS-01 precedent) to decouple customization reads from timing deps |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Eagerly importing all locale bundles at startup | Bundle inflates by locale file size × locale count; main chunk increases | Static per-locale dynamic imports; load non-default locales only on demand | Immediately on first locale added beyond English |
| Re-rendering App on every timbre/theme read from `audioNow` | Audio-scheduling effects re-run on non-audio-related state changes; phantom cue scheduling | Keep customization state in a separate context or module-level config that timing effects never close over | When session has ≥1 customization pref in the timing-effect dep chain |
| Per-frame CSS variable writes for animated theme transitions | Forces style recalculation every rAF tick; battles the existing `will-change: transform` GPU promotion on `.orb` | Theme transitions (if any) must be CSS-only, not JS-driven; never write CSS variables inside the rAF tick | On any device running a 20+ minute session |
| LocalStorage write per timbre/theme change (not batched with session write) | Extra synchronous write per interaction; contention with the existing session-end batch write | Write customization prefs on user interaction (infrequent); this is fine — the pitfall is writing inside the rAF tick or the phase-boundary effect | If timbre change is wired to a per-frame update callback |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Accepting locale strings from URL query params or hash without sanitization | An attacker crafts a link with `?lang=<script>` or a locale key that injects HTML | Always validate locale codes against an explicit allowlist; locale code must match `/^[a-z]{2}(-[A-Z]{2})?$/` pattern before `i18n.changeLanguage()` |
| Injecting translated strings as `dangerouslySetInnerHTML` for rich text in locale files | XSS if locale files are user-editable or loaded from an untrusted source | Render translated strings as text content only; if rich text is needed, use a controlled markdown renderer with an HTML allowlist |
| Theme data-attribute value derived from unvalidated user input | Attribute injection in `document.documentElement.dataset.theme = userInput` | Validate against explicit theme name allowlist before setting |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Timbre change takes effect mid-breath | Jarring one-cycle audio seam between old and new timbre | Apply timbre at next session start; persist immediately, defer application |
| Theme change causes visible FOUC on page reload | Calm breathing context broken by flash of wrong theme | Inline sync bootstrap script reads localStorage before first paint |
| Language switch triggers session reset or loses settings | User's selected BPM/ratio/duration reverts to default | Language is presentation-only; settings envelope is separate from locale preference |
| Visual variant (CUST-03) removes the In/Out phase label text | Reduced-motion users lose both animation AND text phase indicator | Phase label text is always required; variants can style it but cannot remove it |
| Alternate theme with identical in/out orb colors confuses reduced-motion users | User cannot tell inhale from exhale — session is unusable | Theme contract requires perceptually distinct in/out tokens (enforced in UAT checklist) |

---

## "Looks Done But Isn't" Checklist

- [ ] **Envelope schema bump:** every new customization field is added to `Envelope` interface in `storage.ts`; all writes use `{ ...env, newField: value }` spread pattern; a round-trip test verifies unknown fields survive a write.
- [ ] **Audio timbre:** timbre parameters are function arguments to `scheduleBowlCue`, not module-level state; changing timbre mid-session does NOT reconstruct the `AudioEngine`; test isolation verified (no module-level mutation leaks between test files).
- [ ] **Reduced-motion crossfade contract:** every new theme has been manually tested with OS reduced-motion enabled; in/out gradient crossfade is visually distinguishable without orb scale animation; `.orb-layer--in`/`.orb-layer--out` opacity transitions are NOT in the `@media (prefers-reduced-motion: reduce)` suppression block.
- [ ] **Orb scale sync:** if CUST-03 changes `--orb-scale-min/max/mid`, both the CSS token AND `BreathingShape.tsx`'s `MIN_SCALE`/`MAX_SCALE`/`MID_SCALE` TS constants were updated in the same commit and the ring alignment visually verified.
- [ ] **Locked-copy audit:** `LearnDialog.tsx` still contains the literal string `"inspired by Forrest's teachings"` and the two-line disclaimer as TS source constants, not translation keys.
- [ ] **Vitest i18n init:** `vitest.setup.ts` initializes the i18n library synchronously with a `resources` object; no test snapshot contains raw dot-notation translation keys.
- [ ] **FOUC prevention:** `index.html` has a synchronous inline `<script>` (no `type="module"`) that reads the theme preference from `localStorage` and sets the theme attribute/class before first paint.
- [ ] **44×44 hit-area floor:** every CUST-03 variant is tested with keyboard navigation; buttons pass 44×44 minimum; `outline: none` is absent from variant CSS.
- [ ] **Timing-effect dep purity:** no customization state variable (`theme`, `timbre`, `locale`) appears in the dep arrays of the phase-boundary effect or audio scheduling effect without a `// Reason:` annotation and a `useRef` mirror.
- [ ] **Per-commit green gate:** `tsc && lint && build && test` passes on every commit landing customization code; no `// @ts-ignore` or `eslint-disable` annotations added without the Phase 7 D-04 `// Reason:` policy.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Envelope field lost due to pick-not-spread write | LOW (if caught in testing) / HIGH (if users have lost data) | Add spread, bump `STATE_VERSION`, write migration in `readEnvelope` that re-hydrates the field from a default if absent; add round-trip test |
| Audio timbre reconstruction race mid-session | MEDIUM | Remove engine reconstruction from timbre change path; make timbre apply at next session start; add test that verifies no reconstruction fires on timbre toggle |
| Theme breaks reduced-motion crossfade | LOW | Add perceptual contrast to the theme's in/out tokens; update the theme contract checklist |
| Locked copy entered translation pipeline | MEDIUM | Extract locked strings back to `LOCKED_COPY` constants in `LearnDialog.tsx`; audit all locale files for the claim-safe phrases; update I18N-01 plan |
| FOUC on theme load | LOW | Add inline sync script to `index.html`; verify in DevTools "disable cache" mode |
| Focus ring lost in CUST-03 variant | LOW-MEDIUM | Re-add `focus-visible:ring-*` utilities; test contrast ratio; verify 44×44 floor |
| Timing-effect dep drift | MEDIUM | Introduce `useRef` mirror for the offending state; add `// Reason:` annotation; verify no spurious phase-boundary events during running session |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Envelope spread-then-override for new fields | CUST-01 (first envelope field add) | Round-trip test: write with unknown fifth field, read back, assert field present |
| Audio timbre reconstruction race | CUST-02 design phase | Test: trigger timbre change during mock running session; assert `reconstructEngine` not called |
| Reduced-motion crossfade destruction | CUST-01 (theme contract) | Manual UAT with OS reduced-motion on; each theme variant |
| Orb scale TS/CSS sync | CUST-03 (visual variants) | Visual inspection of outer/inner ring alignment at peak inhale/exhale across variants |
| Locked-copy / i18n collision | I18N-01 first step (locked-copy audit) | Grep for literal locked strings in `LearnDialog.tsx` post-I18N-01 |
| Vitest i18n flakiness | I18N-01 setup | `vitest run` 10× in CI; zero translation-key-as-output failures |
| Theme FOUC | CUST-01 implementation | DevTools throttled 3G + disable cache + hard reload; no flash of default theme |
| 44×44 / focus-visible regression | CUST-03 (visual variants) | Keyboard-nav smoke test + existing `MuteToggle.test.tsx`/`SessionControls.test.tsx` pass |
| Timing-effect dep drift | CUST-01 (establishes pattern) | `react-hooks/exhaustive-deps: error` in lint; no new suppression annotations in timing effects |
| Per-commit green gate | Every CUST/I18N commit | `tsc && lint && build && test` exit 0 before merge |

---

## Sources

- `src/storage/storage.ts` — STORAGE-01 D-01 spread-then-override invariant and STORAGE-02 D-04a refuse-downgrade guard; WR-05 dual-versioning convention; Pitfall comments inline. HIGH confidence (direct codebase inspection).
- `src/audio/cueSynth.ts` — OscillatorNode lifecycle (fire-and-forget, cannot re-start), module-level frequency constants, `scheduleBowlCue` phaseDurationSec sustain logic. HIGH confidence (direct codebase inspection).
- `src/audio/audioEngine.ts` — reconstruction path, generation counter (AUDIO-01), engine null-before-await pattern, `mutedRef` posture for mid-session mute replay (D-35b). HIGH confidence (direct codebase inspection).
- `src/hooks/useAudioCues.ts` — HOOKS-01 `mutedRef` pattern, `reconstructGenerationRef` posture, `onReanchorRequiredRef` dual-anchor re-anchor. HIGH confidence (direct codebase inspection).
- `src/styles/theme.css` — D-07 deliberate PRESERVATION of `.orb-layer--out` opacity transition under reduced-motion; IN-01 dual-sync contract for `--orb-scale-min/max/mid`. HIGH confidence (direct codebase inspection).
- `src/components/BreathingShape.tsx` — IN-01 sync contract comments, `usePrefersReducedMotion` hook, MID_SCALE fixed-scale under reduced-motion. HIGH confidence (direct codebase inspection).
- `src/content/learnContent.ts` — section-keyed i18n-stable identifiers, "Do NOT add disclaimer strings to this module" constraint. HIGH confidence (direct codebase inspection).
- `src/domain/settings.ts` — `coerceSettings` strips sub-keys to `SessionSettings` shape; demonstrates why theme pref must NOT live inside the `settings` subtree. HIGH confidence (direct codebase inspection).
- MDN, OscillatorNode — "An OscillatorNode can only be started once; calling start() a second time throws an error." HIGH confidence. https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode
- MDN, Web Audio API — fire-and-forget source node pattern; oscillator type mutation via `type` property or `setPeriodicWave()` as the correct mid-session timbre mechanism. HIGH confidence. https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques
- W3C WAI WCAG 2.4.7 Focus Visible / SC 2.4.13 Focus Appearance — 44×44 minimum target size, 2px focus ring, 3:1 contrast ratio requirements. HIGH confidence. https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- Tailwind CSS — dark mode token strategy, class vs. media query, CSS variable design token pattern. MEDIUM confidence (version-specific; Tailwind v4 behavior confirmed via WebSearch). https://tailwindcss.com/docs/dark-mode
- Vite dynamic import tree-shaking discussion — computed-path dynamic imports disable tree-shaking. MEDIUM confidence (WebSearch; Vite GitHub discussion). https://github.com/vitejs/vite/discussions/13171
- react-i18next GitHub issue #1724 — language not set during Vitest tests when using LanguageDetector/HttpBackend. MEDIUM confidence (WebSearch; GitHub issue thread). https://github.com/i18next/react-i18next/issues/1724
- `.planning/milestones/v1.0-research/PITFALLS.md` — historical domain pitfalls for v1.0 baseline; provides context for what was already addressed and why. HIGH confidence (project source).

---
*Pitfalls research for: HRV breathing webapp — v1.1 Customization*
*Researched: 2026-05-12*
