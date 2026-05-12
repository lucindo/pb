# Feature Research — v1.1 Customization

**Domain:** HRV breathing / guided paced-breathing web app — customization layer
**Researched:** 2026-05-12
**Confidence:** HIGH for theme and audio timbre UX patterns (multiple verified sources); MEDIUM for visual variant UX (fewer direct comparisons at this scope level); MEDIUM for i18n UX patterns (general-web evidence is solid; meditation-specific evidence is thinner).

> **Scope note:** v1.0 table stakes (timing engine, orb, audio cues, stats, wake lock, Learn surface)
> are already shipped and validated. This file covers only the four v1.1 target features plus the
> inner-ring UX symmetry warm-up. References to v1.0 code are dependency callouts, not re-research.

---

## Feature Landscape

### Table Stakes (Users Expect These)

These are the minimum behaviors users assume each customization feature has. Missing them means the
feature feels unfinished or untrustworthy.

| Feature | Why Expected | Complexity | v1.1 Notes |
|---------|--------------|------------|------------|
| Theme persists across sessions | Users set a theme once and expect it to survive a page reload, browser close, and revisit. Any app that resets to the default every session feels broken. | LOW | Extend existing `Envelope` in `storage/storage.ts`; add `theme?: string` field. Coerce on read like existing `settings`/`mute` fields. |
| Theme respects OS dark/light preference as a default | System dark mode is widely expected as a first-class default in 2026. Breathing apps in particular are used in dark environments at night. | LOW | Detect `prefers-color-scheme` with `matchMedia`; apply `system` as the shipping default. Requires named CSS custom-property tokens to exist for both modes. |
| Audio timbre cue sounds like the named timbre | If the UI says "Bowl" the sound must be recognizably bowl-like; if it says "Bell" it must have the attack character of a bell. Mislabeled timbres destroy trust. | MEDIUM | Each timbre is a distinct synthesized preset in `cueSynth.ts`. Parameters (fundamental Hz, partial ratios, decay constant, oscillator waveform) fully define the character. No samples required. |
| Selected timbre persists | Same expectation as theme: choose once, remember forever. | LOW | Add `timbre?: string` to `Envelope`. Coerce with a valid-timbre allowlist guard like the existing `isValidBpm`/`isValidRatio` pattern in `domain/settings.ts`. |
| Visual variant matches the label | If the label says "Orb" the user sees an orb; "Square" should produce a square. | LOW | Scoped to the `BreathingShape.tsx` component plus a variant-router. The outer session layout, ring positions, and data-phase attributes are unchanged. |
| Selected visual variant persists | Same persistence expectation. | LOW | Add `visualVariant?: string` to `Envelope`. Coerce on read. |
| Language setting persists and applies immediately | Users who choose a non-default language expect it to hold across sessions. In-session language switching should not interrupt the running breath loop. | LOW | Add `language?: string` to `Envelope`. The session engine and timing are language-independent — only UI labels and `learnContent.ts` are affected. |
| Settings surface is reachable without touching the running session | Users must be able to preview customization options at any time, including before starting a session, without accidentally pausing or ending a session. | LOW | The existing SettingsForm is rendered only in the idle/stopped state. Customization pickers live in the same settings panel — no new surface needed unless scope expands. |

### Differentiators (Competitive Advantage)

Features that go beyond the expected baseline and distinguish this app in the crowded breathing space.

| Feature | Value Proposition | Complexity | v1.1 Notes |
|---------|-------------------|------------|------------|
| Named calm-palette themes beyond light/dark | Apps like Lungy offer 20 themes; Breathwrk adjusts palette by time of day. Named themes ("Moss", "Slate", "Dusk") let users associate the app with a personal mood without the complexity of custom color pickers. | MEDIUM | Implement as CSS-custom-property token sets on `:root[data-theme='moss']` etc. Each theme overrides the full `--color-breathing-*` and `--color-orb-*` token set from `theme.css`. Three to five themes is the right count: enough choice, no decision paralysis. |
| Fully synthesized alternate timbres — no sample files | Lungy and iBreathe use recorded samples. Generating all timbres from Web Audio API partials keeps the bundle unchanged and eliminates licensing risk. | MEDIUM | `cueSynth.ts` already follows a `scheduleBowlCue(fundamentalHz, decayTau, partials)` pattern. Each new timbre is a named `TimbrePreset` constant (different Hz, different waveform, different partial stack). Thin wrapper; no architectural change. |
| Alternate visual style that works under reduced-motion | A non-orb variant (e.g. a breathing square or expanding ring) that is legible at MID_SCALE constant size works equally well for reduced-motion users — the variant itself can be the differentiation rather than the scale animation. | MEDIUM | `BreathingShape.tsx` routes on `frame.phase` and the `visualVariant` prop. Each variant is a self-contained component that receives the same `SessionFrame` input. Outer structure (rings, data-phase, scale math) remains unchanged unless the variant explicitly opts out. |
| Language switching without a page reload | Many web i18n implementations require a reload to swap bundles. If language switching is instant (swap string constants in React state), it feels more native-app-like and reinforces the local-first, zero-server positioning. | MEDIUM | Viable because the content corpus is small. English strings are already mostly inline; the Learn surface strings are section-keyed in `learnContent.ts`. A locale constant + a locale-keyed string map achieves instant switching without a framework. |
| Inner-ring symmetry (warm-up) | The inner ring currently appears only during the Out phase (Out-phase arrival cue). Making it symmetric — a ring appears during In phase at the outer boundary, and during Out phase at the inner boundary — creates a satisfying mirror that rewards attention without adding controls or cognitive load. | LOW | Pure CSS + `BreathingShape.tsx` change. Adds `orb-ring--in-arrival` that fades in only at `[data-phase='in']`. Mirrors the existing `[data-phase='out'] .orb-ring--inner` pattern. [2026-05-12 update] Symmetric-cue framing rejected at discuss-phase; actual scope is reduced-motion `.orb-ring--inner { display: none }`. See `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md` D-01. |

### Anti-Features (Explicitly Out of Scope)

Features that appear adjacent to customization but must be rejected to preserve the project's core value.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Custom color picker / user-defined themes | Power users often want "their" color. | Custom pickers are complex UI, increase test surface, can produce low-contrast or inaccessible combos that violate WCAG, and shift focus from breathing to tinkering. Breaks the "calm" contract. | Offer 3-5 curated named themes that are pre-tested for contrast. Leave the picker to v2+ if demand is validated. |
| Gamification: streaks, badges, level-up for sessions | Users familiar with Headspace/Calm expect retention mechanics. Research shows streaks in meditation apps frequently become a source of anxiety rather than motivation (MetaFilter survey, Smartico analysis). | Directly conflicts with PROJECT.md Out of Scope: "Streaks, leaderboards, achievements, social sharing, or gamified pressure — history should stay simple and calm." | Keep the existing neutral stats: total sessions, total minutes, last session. That gives encouragement without performance pressure. |
| Social sharing of session results | "Share your session" is a common app feature. | Requires no account, no cloud, no social graph — all out of scope. Sharing a screenshot is always possible without app support. | No action needed. |
| Theme auto-switch by time of day | Breathwrk does time-aware palettes. | Adds complexity (clock polling, edge cases at midnight, DST), no direct user request surfaced, and reduces user control of the environment they've chosen. | "System" mode (prefers-color-scheme) already handles the common day/night shift. Named themes are chosen explicitly. |
| Audio volume slider | Users often ask for fine-grained volume control. | PEAK_GAIN (0.18) in `cueSynth.ts` is already conservative and well below headroom limit. A volume slider requires an extra gain node in the signal chain, a persistent value, and UI surface that adds nothing for most users. Mobile OS volume controls handle the rest. | Mute toggle (already shipped). Optional future consideration only if user-reported audio-too-loud complaints emerge. |
| Per-phase audio timbre (different sound for In vs. Out) | "Make the In sound different from the Out sound" is a natural extension. | In/Out are already distinguished by fundamental frequency: A4 (440 Hz) In vs. A3 (220 Hz) Out — the pitch difference IS the timbre distinction. Adding per-phase picker doubles the UI surface for minimal gain. | One session-wide timbre preset. The Hz distinction is preserved within any timbre by continuing the A4/A3 fundamental split. |
| Animated transition when switching visual variants | Smooth cross-fade between orb and breathing square. | The session engine drives the animation through `requestAnimationFrame`. A cross-fade between two competing animation loops risks frame-identity collision and rAF cancellation complexity. | Switch variants only from the settings panel (idle state only). No mid-session variant switching in v1.1. |
| Language switching during an active session | Swap language while breathing. | Causes a UI re-render of all string content mid-session, potentially disrupting focus. No practical need — language choice is set-and-forget. | Language applies on next session start. Display language can switch immediately in the UI, but the decision is confirmed before a session begins. |
| In-app audio preview / playback button for timbres | "Play sample" to audition each timbre before selecting. | Requires user gesture to unlock AudioContext (existing iOS constraint). A preview button in the settings panel is a second gesture path separate from session-start unlock and risks duplicating the audio engine bootstrap complexity. | Show the timbre name with a short descriptor ("Bell — bright attack, fast fade" vs. "Bowl — warm strike, long sustain"). Name + description is sufficient for 3-4 timbres. |
| Unlicensed asset-based timbres (OGG/MP3 samples) | Higher fidelity bowls from bundled samples. | Licensing risk; bundle size jump; asset management; no offline-first guarantee without service worker. | Stay synthesized via Web Audio API. The existing cueSynth bowl is already rated positively in UAT. Alternate synthesized timbres expand choice without any of these costs. |
| Medical or therapeutic framing for customization | "Teal theme for focus, blue for sleep, amber for anxiety relief." | Medical claims are explicitly out of scope. Color-mood associations are speculative. | Name themes by palette character (Moss, Slate, Dusk) not by claimed outcome. |

---

## Feature Dependencies

```
Envelope (storage/storage.ts)
    ├──extends──> Theme persistence (add `theme?: string`)
    ├──extends──> Timbre persistence (add `timbre?: string`)
    ├──extends──> Visual variant persistence (add `visualVariant?: string`)
    └──extends──> Language persistence (add `language?: string`)

domain/settings.ts predicate pattern
    ├──mirrors──> isValidTheme() — allowlist guard for stored theme value
    ├──mirrors──> isValidTimbre() — allowlist guard for stored timbre value
    ├──mirrors──> isValidVisualVariant() — allowlist guard
    └──mirrors──> isValidLanguage() — allowlist guard

storage/settings.ts coercer pattern
    ├──mirrors──> coerceTheme() — non-throwing, falls back to DEFAULT_THEME
    ├──mirrors──> coerceTimbre() — non-throwing, falls back to DEFAULT_TIMBRE
    ├──mirrors──> coerceVisualVariant() — non-throwing, falls back to DEFAULT_VISUAL_VARIANT
    └──mirrors──> coerceLanguage() — non-throwing, falls back to DEFAULT_LANGUAGE

cueSynth.ts (CUST-02)
    ├──requires──> scheduleInCue / scheduleOutCue remain the public API
    ├──adds──> TimbrePreset type (name, in-params, out-params)
    └──adds──> scheduleInCue(ctx, when, dest, phaseDuration, preset)
                 — default preset = existing BOWL behavior (zero regression)

BreathingShape.tsx (CUST-03)
    ├──requires──> SessionFrame (unchanged — all variants consume same input)
    ├──adds──> visualVariant prop (string union)
    └──adds──> variant-router that delegates to variant-specific sub-components

learnContent.ts (I18N-01)
    ├──already has──> section-keyed shape (hrv, timing, forrest) — i18n-stable by design
    └──adds──> locale-keyed map: { en: LEARN_CONTENT, es: LEARN_CONTENT_ES, ... }

theme.css (CUST-01)
    ├──already has──> --color-breathing-*, --color-orb-* token set
    └──adds──> [data-theme='moss'], [data-theme='slate'], [data-theme='dusk'] token overrides

Inner-ring UX symmetry (warm-up, no feature flag)
    ├──requires──> BreathingShape.tsx — add [data-phase='in'] .orb-ring--outer fade-in rule
    └──purely──> CSS + minimal JSX change; no storage, no settings model touch
```

[2026-05-12 update] The rule add shown above (`[data-phase='in'] .orb-ring--outer` fade-in) was rejected; actual implementation is reduced-motion `.orb-ring--inner { display: none }` inside the existing `@media (prefers-reduced-motion: reduce)` block. See `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md` D-03.

### Dependency Notes

- **Storage schema bumps for all four customization fields are safe:** the existing `Envelope` `spread-then-override` read pattern (STORAGE-01) and `refuse-downgrade` write guard (STORAGE-02) remain valid. New optional fields on the envelope require only coercer functions and valid-value guards — the same pattern as `settings`/`mute`/`stats`.
- **cueSynth.ts is the chokepoint for CUST-02:** the `scheduleBowlCue` private function accepts `fundamentalHz` and `defaultDecayTau` already. A `TimbrePreset` struct that bundles those parameters is a minimal addition. The existing BOWL preset becomes the default, preserving byte-identical behavior when no preset is specified.
- **BreathingShape.tsx is the chokepoint for CUST-03:** the component already accepts `frame` (SessionFrame) and `leadInDigit`. Adding a `visualVariant` prop and a router is low-risk because the orb implementation is already fully encapsulated in `BreathingShapeBody`. Variant sub-components are new siblings, not modifications.
- **learnContent.ts is already i18n-structured:** the `hrv`/`timing`/`forrest` section keys were explicitly designed as "i18n-stable identifiers for future locale swap" (comment at line 2 of `learnContent.ts`). Adding a locale map `{ en: LEARN_CONTENT }` and shipping one additional locale (Spanish is the highest-value second language for a global English-content yoga/breathing audience) is the minimal I18N-01 implementation.
- **Inner-ring symmetry has zero dependency risk:** it is a pure CSS + JSX addition to `BreathingShape.tsx`. It does not touch the storage model, the audio engine, the settings domain, or the timing engine. It is a warm-up task precisely because of this isolation. [2026-05-12 update] Implementation is pure CSS only (no JSX addition); a single rule inside the existing `@media (prefers-reduced-motion: reduce)` block with no BreathingShape.tsx edit. See `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md` D-03.
- **Theme switching must not use Tailwind `dark:` class variants:** the existing `theme.css` uses CSS custom properties under `@theme { }` (Tailwind v4 convention). Named themes should follow the same custom-property pattern on a `[data-theme]` attribute on `<html>` or the app root — not Tailwind class variants, which would require rewriting all consumer classes.

---

## v1.1 Feature Set

### Ship in v1.1

These are the four milestone features plus the warm-up.

- [x] **Inner-ring UX symmetry** — Add `[data-phase='in']` CSS rule mirroring the existing `[data-phase='out'] .orb-ring--inner` pattern. Also applies the outer ring fade-in on In to create symmetric arrival cues. Pure CSS + BreathingShape.tsx. Zero storage touch. Low-risk warm-up. [2026-05-12 update] Feature shipped as reduced-motion `.orb-ring--inner` suppression; the symmetric-arrival framing is annotated here but not implemented. See `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md` D-01.
- [ ] **CUST-01: Theme switching** — Light / Dark / System (OS default) + 2-3 named palette themes. Picker in SettingsForm. Persisted to `Envelope.theme`. Applied via `data-theme` attribute on root. CSS custom-property token overrides in `theme.css`.
- [ ] **CUST-02: Audio timbres** — 3-4 named synthesized presets (Bowl, Bell, Sine, Chime). Default = existing Bowl (zero regression). `TimbrePreset` struct in `cueSynth.ts`. Persisted to `Envelope.timbre`. Picker in SettingsForm.
- [ ] **CUST-03: Visual variants** — 2-3 named visual styles for the session guide (Orb/default, Square, Ring). Each variant consumes `SessionFrame` unchanged. Persisted to `Envelope.visualVariant`. Picker in SettingsForm.
- [ ] **I18N-01: Language switching** — EN default + 1 additional locale (Spanish recommended). Locale-keyed string map for UI labels and `learnContent.ts` sections. Persisted to `Envelope.language`. Picker in SettingsForm or a dedicated header control. No framework dependency (custom hook + string map).

### Defer to v1.x

- [ ] PWA install / service worker (PWA-01) — deferred from earlier v1.1 plan; independent of customization.
- [ ] Additional locales beyond EN+ES — add only if usage data or explicit requests surface.
- [ ] Additional visual variants beyond 3 — same trigger.
- [ ] Audio preview button — only if user confusion about timbre names is reported.
- [ ] Import/export of local settings (JSON) — useful for privacy-conscious users, not v1.1 priority.

### Future (v2+)

- [ ] Custom color picker / user-defined themes — after named themes are validated.
- [ ] Per-phase audio configuration — only if the single-timbre model proves insufficient.
- [ ] Platform health integrations — Apple Health, Google Fit.
- [ ] Sensor-based HRV biofeedback.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Inner-ring UX symmetry | LOW-MEDIUM | LOW | P0 (warm-up, land first) [2026-05-12 update] Priority/value/cost unchanged; scope reduced to one CSS rule per `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md` D-03. |
| CUST-01: Theme (light/dark/system) | HIGH | LOW | P1 |
| CUST-01: Named palette themes (2-3) | MEDIUM | MEDIUM | P1 |
| CUST-02: Audio timbres (Bowl + 2-3 more) | MEDIUM | MEDIUM | P1 |
| CUST-03: Visual variants (Orb + 1-2 more) | MEDIUM | MEDIUM | P1 |
| I18N-01: Language switching (EN + ES) | MEDIUM | MEDIUM | P1 |
| Storage schema extension for all 4 fields | HIGH (enabler) | LOW | P0 (prerequisite) |
| isValid<X> / coerce<X> guards for new fields | HIGH (correctness) | LOW | P0 (prerequisite) |

**Priority key:**
- P0: Must land before feature work (infrastructure)
- P1: Ship in v1.1
- P2: After v1.1 validation
- P3: v2+

---

## Competitor Customization Analysis

| Dimension | iBreathe | Lungy | Breathwrk | The Breathing App | Our v1.1 Approach |
|-----------|----------|-------|-----------|-------------------|-------------------|
| Themes | Dark interface (accessibility note); no named palette themes | 20 themes (generative visual styles, not color palettes) | Time-aware bright/muted palette | No theme control | Light / Dark / System + 3 named calm palettes |
| Audio timbre options | 4 interval indicator sounds (not described in detail) | Real-time generative audio, not swappable timbres | Multiple preset sounds | One warm/bright sound | 3-4 synthesized presets: Bowl (default), Bell, Sine, Chime |
| Visual style options | Single breathing shape | 20 real-time generative visuals (3D, particle) | Multiple animations | Single breathing ball | 2-3 static variants: Orb (default), Square, Ring |
| Language support | English only (iOS system locale not surfaced in search) | Not surfaced | Not surfaced | English only | EN (default) + ES in v1.1 |
| Settings persistence | Yes (iOS app conventions) | Yes | Yes | Yes | Yes — all four fields added to existing Envelope |
| In-session customization | Some settings adjustable mid-session | Visual selectable before session | Not mid-session in free tier | Not mid-session | No mid-session variant/language switching in v1.1 |

---

## Implementation Dependency Map for Roadmap

This section summarizes which v1.0 code surfaces each feature touches, to inform phase sequencing.

### CUST-01: Themes
- **Touches:** `src/styles/theme.css` (new `[data-theme]` token blocks), `src/app/App.tsx` (apply `data-theme` attr to root), `src/components/SettingsForm.tsx` (theme picker), `src/storage/storage.ts` (Envelope field), `src/storage/settings.ts` (coerceTheme), `src/domain/settings.ts` (isValidTheme, DEFAULT_THEME).
- **Does NOT touch:** timing engine, audio engine, session controller, stats.
- **Risk:** Tailwind v4 `@theme` block interaction — new token overrides must follow the same CSS custom-property convention, not Tailwind class variants.

### CUST-02: Audio Timbres
- **Touches:** `src/audio/cueSynth.ts` (TimbrePreset type + preset constants + updated `scheduleInCue`/`scheduleOutCue` signatures), `src/hooks/useAudioCues.ts` (pass active preset through), `src/components/SettingsForm.tsx` (timbre picker), storage chain (Envelope + coerceTimbre + isValidTimbre).
- **Does NOT touch:** lookaheadScheduler logic, audioEngine.ts reconstruction, mute toggle, wake lock.
- **Risk:** FakeAudioContext test polyfill — any new oscillator node type used by alternate timbres must be supported or stubbed in `vitest.setup.ts`.

### CUST-03: Visual Variants
- **Touches:** `src/components/BreathingShape.tsx` (visualVariant prop + variant router + new variant sub-components), `src/components/SettingsForm.tsx` (variant picker), storage chain.
- **Does NOT touch:** session engine, audio, timing, stats.
- **Risk:** Each new variant must handle `leadInDigit` (the 3-2-1 countdown orb path) and `reducedMotion` correctly. The orb handles both; new variants must follow the same contract.

### I18N-01: Language Switching
- **Touches:** `src/content/learnContent.ts` (locale-keyed map), new `src/i18n/strings.ts` (or equivalent) for UI label strings, `src/components/LearnDialog.tsx` (consume locale strings), `src/components/SettingsForm.tsx` (language picker), storage chain (Envelope + coerceLanguage + isValidLanguage).
- **Does NOT touch:** timing engine, audio, visual animation, stats model.
- **Risk:** `learnContent.ts` strings for the Spanish locale require accurate translation. Machine translation is acceptable for v1.1 with a disclaimer-to-self; a native-speaker review is preferred before wider promotion.

### Inner-Ring UX Symmetry (warm-up)
- **Touches:** `src/styles/theme.css` (new `[data-phase='in'] .orb-ring--outer` opacity rule), `src/components/BreathingShape.tsx` (confirm `data-phase='in'` already set — it is, in the existing `data-phase={frame.phase}` attribute).
- **Does NOT touch:** anything else.
- **Risk:** Negligible. The In-phase outer-ring fade-in mirrors the exact CSS pattern of the Out-phase inner-ring fade-in. Only new CSS selector, no JS change required.

[2026-05-12 update] "Touches" reduced to `src/styles/theme.css` only — no `BreathingShape.tsx` edit (BreathingShape.tsx is listed in 13-CONTEXT.md canonical_refs "Source NOT edited"). Actual rule is `.orb-ring--inner { display: none }` inside the existing `@media (prefers-reduced-motion: reduce)` block; risk unchanged. See `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md` D-03.

---

## Sources

- Apple App Store: iBreathe – Relax and Breathe — feature set including 4 sound options, dark interface, dark mode. HIGH confidence. https://apps.apple.com/us/app/ibreathe-relax-and-breathe/id1296605806
- Jade Lizard Software (iBreathe developer site) — confirms ultra-minimal design philosophy. HIGH confidence. https://www.jadelizardsoftware.com/ibreathe
- Lungy app (App Store + press) — 20 generative visual themes, real-time synthesis, game-engine-driven. MEDIUM confidence (press coverage, not direct docs). https://www.lungy.app/ and https://apps.apple.com/us/app/lungy-breathing-health/id1545223887
- It's Nice That — Lungy design coverage confirming generative graphics and sound. MEDIUM confidence. https://www.itsnicethat.com/news/pi-a-lungy-digital-160123
- Breathwrk (official site + App Store) — time-aware palette, multiple animations, multiple sounds. HIGH confidence for feature set. https://www.breathwrk.com/
- Purrweb Meditation App Design guide — UX patterns for calm apps, soft shapes, minimal controls. MEDIUM confidence (design consultancy synthesis). https://www.purrweb.com/blog/designing-a-meditation-app-tips-step-by-step-guide/
- Enso Meditation Timer (App Store) — 12 exclusive synthesized chimes, IAP for additional bells. HIGH confidence for audio timbre count norms. https://apps.apple.com/us/app/ens%C5%8D-meditation-timer-bell/id840637879
- SmartInterface Design Patterns — language selector UX best practices. HIGH confidence (Vitaly Friedman / Smashing editorial). https://smart-interface-design-patterns.com/articles/language-selector/
- Smashing Magazine — language selector design patterns (placement, naming, no-reload patterns). HIGH confidence. https://www.smashingmagazine.com/2022/05/designing-better-language-selector/
- InTheMoment app — multilingual meditation app analysis, notes on instant language switching UX. MEDIUM confidence. https://inthemoment.app/articles/meditation-app-multiple-languages
- Tailwind CSS dark mode docs — class-based vs. media-query-based dark mode. HIGH confidence (official docs). https://tailwindcss.com/docs/dark-mode
- Medium: Multi-theme UI with Tailwind v4 and React — CSS custom property token override pattern for named themes. MEDIUM confidence (community tutorial, verified against Tailwind v4 docs). https://medium.com/render-beyond/build-a-flawless-multi-theme-ui-using-new-tailwind-css-v4-react-dca2b3c95510
- Smartico — gamification in mental wellness apps, streaks as anxiety source. MEDIUM confidence (industry analysis). https://www.smartico.ai/blog-post/gamification-mental-wellness-apps
- MetaFilter: "Meditation app that's not gamified" — user community expressing preference for non-gamified calm apps. MEDIUM confidence (community anecdote, multiple respondents). https://ask.metafilter.com/386087/Meditation-app-thats-not-gamified
- MDN Web Docs: Web Audio API Advanced Techniques — PeriodicWave for custom bell synthesis, parameter scheduling. HIGH confidence (official). https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques
- Big Human: Mindfulness App Design Trends 2026 — soft palettes, reduced visual complexity, calming animations. MEDIUM confidence (agency analysis). https://www.bighuman.com/blog/trends-in-mindfulness-app-design

---

*Feature research for: HRV breathing app — v1.1 Customization milestone*
*Researched: 2026-05-12*
