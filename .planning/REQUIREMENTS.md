# Requirements: HRV Breathing WebApp — v1.1 Customization

**Defined:** 2026-05-12
**Core Value:** Users can start a hands-off HRV breathing session and comfortably follow accurate, uninterrupted inhale/exhale guidance through synchronized visuals and optional sound.

**Milestone goal:** Add user-facing customization (themes, audio timbres, visual variants, language) on top of the v1.0.1 strict-baseline core, starting with inner-ring UX symmetry as a low-risk warm-up.

**Phase numbering:** continues from v1.0.1 last phase (Phase 12). v1.1 starts at Phase 13.

## v1.1 Requirements

Requirements for the Customization milestone. Each maps to roadmap phases.

### Warm-up: Inner-Ring UX Symmetry

- [ ] **WARMUP-01**: Under `prefers-reduced-motion: reduce`, the inner reference ring (`.orb-ring--inner`) is not rendered — `.orb-layer--out` opacity crossfade alone carries the substitute phase indicator (D-07). Pure CSS change in `src/styles/theme.css` `@media (prefers-reduced-motion: reduce)` block; no TSX, storage, audio, timing touch.

### Infrastructure: Prefs Foundation

- [x] **INFRA-01**: `Envelope` schema is extended with an optional `prefs` field carrying customization choices, using the existing D-01 spread-then-override write pattern so unknown fields from concurrent newer builds are preserved.
- [x] **INFRA-02**: `isValidTheme` / `isValidTimbre` / `isValidVariant` / `isValidLocale` allowlist predicates live in `src/domain/settings.ts` next to the existing `isValidBpm`/`isValidRatio`/`isValidDuration` predicates.
- [x] **INFRA-03**: `coerceTheme` / `coerceTimbre` / `coerceVariant` / `coerceLocale` non-throwing coercers live in `src/storage/` and fall back to `DEFAULT_*` constants when stored value fails the predicate.
- [x] **INFRA-04**: A new `SettingsDialog` opens from a gear control in the idle/stopped view, follows the native `<dialog>` + locked-copy pattern of `ResetStatsDialog` / `LearnDialog`, and hosts the four customization pickers (theme, timbre, variant, language).

### Themes (CUST-01)

- [x] **THEME-01**: User can choose between **Light**, **Dark**, and **System** modes from the SettingsDialog.
- [x] **THEME-02**: `System` mode follows the OS `prefers-color-scheme` media query automatically (no manual override required).
- [x] **THEME-03**: User can choose among 3 curated named palette themes (e.g. Moss / Slate / Dusk) in addition to Light/Dark/System, each implemented as a `[data-theme='name']` CSS-custom-property override block in `src/styles/theme.css`.
- [x] **THEME-04**: Selected theme persists across reloads via `Envelope.prefs.theme` and applies before first paint (FOUC-prevention inline script in `index.html`).
- [x] **THEME-05**: Every shipped theme preserves the reduced-motion phase-cue contrast contract — the `.orb-layer--in` / `.orb-layer--out` opacity-crossfade hues must remain perceptually distinguishable under `prefers-reduced-motion: reduce` for every theme.

### Theme UI Token Migration (THEME-UI-01)

- [x] **THEME-UI-01**: All user-facing TSX components reference `--color-breathing-*` tokens (or descendants thereof) for theme-shifting surfaces; no production `.tsx` references hardcoded `text-slate-*` / `bg-slate-*` / `border-slate-*` / `text-teal-*` / `bg-teal-*` / `border-teal-*` / `text-white` / `bg-white` / `text-black` / `bg-black` literal Tailwind classes (verified via grep on `src/**/*.tsx` excluding `*.test.tsx`). Destructive-danger styles (`bg-red-*`, `shadow-red-*/*`) are explicitly excluded — red conveys danger semantics and is intentionally palette-independent; foreground on destructive red is `var(--color-breathing-on-accent)` per D-01.

### Audio Timbres (CUST-02)

- [x] **TIMBRE-01**: User can choose among 4 named synthesized timbre presets (**Bowl** = default = current behavior, **Bell**, **Sine**, **Chime**) from the SettingsDialog.
- [x] **TIMBRE-02**: Default timbre selection is `Bowl` so existing v1.0.1 audio behavior is byte-identical for users who never open the picker (zero regression).
- [x] **TIMBRE-03**: Timbre picker is **disabled while `inSessionView`** — the selected timbre is captured at session start and is not swapped mid-session (next-session-only application). This avoids the AUDIO-01 reconstruction-race + dual-anchor re-anchor risk.
- [x] **TIMBRE-04**: Selected timbre persists across reloads via `Envelope.prefs.timbre`.
- [x] **TIMBRE-05**: Each timbre preserves the per-phase fundamental-frequency distinction (A4 In / A3 Out) within its own timbral character.

### Visual Variants (CUST-03)

- [x] **VARIANT-01**: User can choose between **Orb** (default), and 2 alternate visual variants (**Square**, **Diamond**) from the SettingsDialog.
- [x] **VARIANT-02**: Default variant is `Orb` so existing v1.0.1 visual behavior is unchanged for users who never open the picker (zero regression).
- [x] **VARIANT-03**: Variant picker is **disabled while `inSessionView`** — the selected variant is captured at session start and is not swapped mid-session (avoids rAF frame-identity collision).
- [x] **VARIANT-04**: Every variant honors `prefers-reduced-motion: reduce` (fixed mid-scale + crossfade fallback equivalent to the existing orb reduced-motion contract).
- [x] **VARIANT-05**: Every variant renders the 3-2-1 lead-in countdown digit correctly through the existing `leadInDigit` prop path.
- [x] **VARIANT-06**: Every variant honors the 44×44 hit-area floor and `focus-visible` ring contracts where interactive.
- [x] **VARIANT-07**: Selected variant persists across reloads via `Envelope.prefs.variant`.

### Language Switching (I18N-01)

- [x] **I18N-01**: User can choose between **EN** (English, default) and **PT-BR** (Portuguese, Brazil) from the SettingsDialog.
- [x] **I18N-02**: Language switch is instant — React state swap, no page reload — and does not interrupt the running breath loop. The picker is **disabled while `inSessionView`** so the in-session string surface does not re-render mid-breath.
- [x] **I18N-03**: Selected language persists across reloads via `Envelope.prefs.locale`.
- [x] **I18N-04**: A typed `Record<LocaleId, UiStrings>` map (roll-your-own, no framework dependency) covers all UI labels (buttons, dialog copy, stats labels, settings form labels).
- [x] **I18N-05**: `src/content/learnContent.ts` exposes a locale-keyed map (`{ en: LEARN_CONTENT_EN, pt_BR: LEARN_CONTENT_PT_BR }`) sharing the existing section-keyed shape.
- [x] **I18N-06**: The Forrest claim-safe copy (`inspired by Forrest's teachings` and the two-line disclaimer) IS routed through the translation pipeline (PT-BR translation provided). **NOTE:** This overrides the research recommendation that locked copy stay as TS constants — Planning must add a guardrail (e.g. translation-key allowlist, locked-copy review step) so future locale contributions cannot silently weaken the D-12 claim-safe positioning.
- [x] **I18N-07**: PT-BR translation is supplied for v1.1 ship; machine translation is acceptable with a `// TODO: native-speaker review` flag tracked as v1.x carry-forward.

## v1.x Carry-Forwards (deferred from earlier v1.1 plan)

| Item | Reason for defer |
|------|------------------|
| PWA install (PWA-01) — Web App Manifest + service worker | Out of v1.1 scope; revisit after customization milestone validation |
| BPM stretch session (PATT-02) | Out of v1.1 scope; revisit post-customization |
| iOS Safari mid-page audio recovery after lock/unlock | Carry-forward from v1.0 — OS-level audio session loss |
| Firefox Desktop orb scale-animation flicker | Carry-forward from v1.0 — root remedy needs CSS keyframes |
| S2 Android Chrome wake lock real-device UAT | Carry-forward from v1.0 — physical device unavailable |
| iOS Safari Pitfall 6 — phone-call interrupted state | Carry-forward from v1.0 — no mitigation planned for v1.x |
| Per-locale `learnContent.ts` native-speaker review | Triggered by I18N-07 |

## Out of Scope (v1.1)

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Custom color picker / user-defined themes | Complex UI; accessibility risk; tinker-trap; deferred to v2+ if validated demand |
| Theme auto-switch by time of day | `System` mode + `prefers-color-scheme` already covers day/night shift; clock-polling adds complexity for marginal value |
| Mid-session timbre or variant swap | Reconstruction race / rAF frame-identity collision; pickers disabled while `inSessionView` |
| Per-phase audio timbre (different sound In vs Out) | A4/A3 Hz already distinguishes phases within any timbre; doubles UI surface for low gain |
| Audio volume slider | Mute toggle + OS volume already cover it; PEAK_GAIN already conservative |
| In-app audio preview button | Re-introduces AudioContext unlock-gesture path duplication; name + descriptor sufficient |
| Sample-based timbres (OGG/MP3 assets) | Licensing risk + bundle bloat; Web Audio synthesis is preferred |
| Additional locales beyond EN + PT-BR | Add only on validated demand; framework supports N locales |
| Animated transitions between visual variants | rAF collision risk; settings-panel-only swap suffices |
| In-session language switching | Re-renders all strings mid-breath; picker disabled while `inSessionView` |
| Gamification (streaks, badges, leaderboards) | PROJECT.md Out of Scope — calm-first stance |
| Medical / therapeutic framing of customization choices | PROJECT.md Out of Scope — no health claims |
| New runtime npm dependencies | Research confirmed all v1.1 features achievable with zero net-new deps |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WARMUP-01 | Phase 13 | Pending |
| INFRA-01 | Phase 14 | Done |
| INFRA-02 | Phase 14 | Done |
| INFRA-03 | Phase 14 | Done |
| INFRA-04 | Phase 15 | Done |
| THEME-01 | Phase 16 | Done |
| THEME-02 | Phase 16 | Done |
| THEME-03 | Phase 16 | Done |
| THEME-04 | Phase 16 | Done |
| THEME-05 | Phase 16 | Done |
| THEME-UI-01 | Phase 16.1 | Done |
| TIMBRE-01 | Phase 18 | Complete |
| TIMBRE-02 | Phase 18 | Complete |
| TIMBRE-03 | Phase 18 | Complete |
| TIMBRE-04 | Phase 18 | Complete |
| TIMBRE-05 | Phase 18 | Complete |
| VARIANT-01 | Phase 17 | Done |
| VARIANT-02 | Phase 17 | Done |
| VARIANT-03 | Phase 17 | Done |
| VARIANT-04 | Phase 17 | Done |
| VARIANT-05 | Phase 17 | Done |
| VARIANT-06 | Phase 17 | Done |
| VARIANT-07 | Phase 17 | Done |
| I18N-01 | Phase 19 | Done |
| I18N-02 | Phase 19 | Done |
| I18N-03 | Phase 19 | Done |
| I18N-04 | Phase 19 | Done |
| I18N-05 | Phase 19 | Done |
| I18N-06 | Phase 19 | Done |
| I18N-07 | Phase 19 | Done |

**Coverage:**
- v1.1 requirements: 30 total
- Mapped to phases: 30/30
- Unmapped: 0

---
*Requirements defined: 2026-05-12*
*Last updated: 2026-05-14 — Phase 19 (Language Switching) closed; I18N-01..07 flipped to Done; EN+PT-BR shipped with `// TODO: native-speaker review` markers on PT-BR entries per I18N-07 carry-forward.*
