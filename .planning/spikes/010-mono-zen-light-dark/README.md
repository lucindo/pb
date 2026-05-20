---
spike: 010
name: mono-zen-light-dark
type: comparison
validates: "Given the practice screen rendered in tightened Mono Zen with paired light + dark variants (warm rice-paper, not bleached; warm near-black, not pure black), when the settings sheet opens with all real control types (stepper, segmented, visual picker, toggle, theme switch, accent + outlined buttons) while the orb stays visible above, then both variants read calm + clean and every control type stays legible without falling into the dark-theme token-collapse pattern"
verdict: VALIDATED — full visual system for v1.6 locked (see MANIFEST Requirements)
related: [009, 008, 002, 007]
tags: [ui, look-and-feel, palette, theme, mono-zen, controls, comparison]
---

# Spike 010: Mono Zen · Light & Dark — with realistic controls

## What This Validates

> **Given** the practice screen in tightened Monochrome Zen (from spike 009's verdict),
> rendered in paired **light** (warm rice-paper, not bleached) and **dark** (warm
> near-black, not pure black) variants;
> **when** the settings sheet opens with **all real practice-control types** —
> Stepper / SegmentedControl / VisualPicker / ToggleSwitch / ThemeSwitch / accent button /
> outlined secondary — *while the orb stays visible above the sheet*;
> **then** both variants read calm + clean, every control type stays legible, and no
> control disappears into a `bg-soft === surface` collapse on the dark variant.

This closes out the look-and-feel direction; the winner ships as the new `theme.css`
baseline replacing all six current themes (`light / dark / system / moss / slate / dusk`)
with `light / dark / system`.

## Research

### What was tightened from spike 009 (F)

| Token | 009 F (rejected as too bright) | 010 light (tightened) | Reason |
|-------|-------------------------------|------------------------|--------|
| `bg`       | `#fafafa` (bleached) | `#f1efea` (warm rice-paper) | Calm, not clinical |
| `surface`  | `#ffffff`            | `#f7f5f0`                   | Avoid pure white sheets |
| `bgEdge`   | `#ffffff`            | `#f6f4ef`                   | Soft warm radial edge |
| `accent`   | `#1a1a1a`            | `#2a2620` (warm ink)        | Ink, not laser print |
| `muted`    | `#9ca3af` (cool grey)| `#8a857c` (warm grey)       | Warmth pulled through every token |

### Dark variant — derived to match

| Token | Value | Reason |
|-------|-------|--------|
| `bg`       | `#0e0d10` | Warm near-black, not `#000000` — candle-lit rather than void |
| `surface`  | `#1a1820` | Subtle violet undertone, distinguishable from `bg` |
| `accent`   | `#e8e4d8` | Warm ivory ink, NOT bleached `#ffffff` — matches light variant's ink-warmth |
| `borderSoft` | `rgba(232,228,216,0.14)` | **Mandatory** — pre-empts the spike-008 token-collapse trap where dark controls vanished |

### Why a single typography family

Inter Variable (200 + 400) covers every weight needed. The ultralight 200 weight at 28–40 px
gives the meditation-app feeling without an extra serif. Single family = smaller load + less
visual noise (consistent with "zen by restraint").

### Control types covered

The settings sheet exposes every practice-control archetype the real app has plus the
new `ThemeSwitch` (the one chrome setting that replaces the multi-theme picker):

| Control          | Where it's used                | Why included |
|------------------|--------------------------------|--------------|
| `Stepper`        | BPM (3.0–8.0, step 0.5), Duration (1–30, step 1) | The real `SettingsStepper` for numeric knobs |
| `SegmentedControl` | Inhale:Exhale ratio (1:1 / 4:6 / 4:7 / 1:2) | Same primitive as the practice switcher (spike 007) |
| `VisualPicker`   | Cue timbre (Bowl / Bell / Sine / Flute) | The real `TimbrePicker` / `CuePicker` archetype |
| `ToggleSwitch`   | Cue sound, Per-breath tick     | The real `BooleanToggle` archetype |
| `ThemeSwitch`    | Light / Dark (only chrome knob now) | The new collapsed-theme picker |
| Accent button    | Done                           | Primary action |
| Outlined secondary | Reset stats, Close            | The bordered-on-transparent pattern that historically vanished on dark |

### Approaches considered and rejected

| Approach | Why considered | Why rejected |
|----------|----------------|--------------|
| Pure black/white on both ends | Most minimal | Reads sterile/clinical, not meditative. Warmth matters more than restraint here. |
| Light variant only, system follow for dark | Smaller surface area | Operator wants both shipped intentionally, not one + the OS's idea of dark |
| Full-screen settings page | More room for controls | Loses orb-always-on-display — explicitly preserved from spike 009 |
| Side-drawer settings | Orb stays visible | Less mobile-native than bottom sheet; tested poorly in spike 002 |

## How to Run

```bash
open .planning/spikes/010-mono-zen-light-dark/index.html
```

Keyboard: `1` for light, `2` for dark, `S` to toggle the settings sheet.

You can also flip between light and dark from inside the running app — open settings (S),
scroll to **Theme**, tap the other swatch. The harness updates and you stay in the same
spot, which makes the dark-↔-light parity test much faster than reloading.

## What to Expect

Two variants in the harness, marked A (light) and B (dark):

- **A. Mono Zen · Light** — warm rice-paper bg, soft warm-ink accent, ultralight breath
  label. Orb is a quiet warm grey gradient. The whole screen should feel like opening a
  book in morning light, not a Notes app.

- **B. Mono Zen · Dark** — warm near-black bg with a subtle violet-tinted surface, ivory
  ink accent (not bleached white), faint stone-grey orb. Should feel candle-lit, not pitch
  black. Every control in the settings sheet should remain visible.

For each variant:

- **Orb always on display.** When the settings sheet opens, the orb compresses (size 230
  → 150 px) and the breath label shrinks (40 → 28 px) but both stay visible above the
  sheet. The bottom sheet is capped at 58% of phone height and scrolls internally.

- **Full practice-settings sheet** with realistic controls:
  - Stepper × 2 (BPM, Duration)
  - SegmentedControl (Inhale:Exhale ratio)
  - VisualPicker (Cue timbre — Bowl/Bell/Sine/Flute)
  - ToggleSwitch × 2 (Cue sound, Per-breath tick)
  - ThemeSwitch (Light / Dark — live, switches the harness from inside the app)
  - Accent button (Done)
  - Outlined secondary × 2 (Reset stats, Close)

- **Token panel** on the right shows the active variant's recipe — every token with its
  hex swatch — plus an inventory of which control primitives the sheet exposes.

## Observability

The token panel is the forensic layer — palette values that need to land in
`src/styles/theme.css` are rendered live. The control-type inventory at the bottom of the
panel maps each visible primitive in the sheet to its real-app component name, so the
implementation phase can wire 1:1.

## Investigation Trail

### 2026-05-20 — first pass (warm rice-paper + ink, ultralight)

- Light bg pulled from `#fafafa` → `#f1efea` (warm rice-paper); surface from `#ffffff` →
  `#f7f5f0`. Ink accent pulled from `#1a1a1a` → `#2a2620` so it harmonises rather than
  cuts. Muted shifted from cool `#9ca3af` to warm `#8a857c`.
- Dark variant derived in parallel with the same warmth bias — `#0e0d10` near-black with a
  subtle violet tint in `surface`, ivory `#e8e4d8` accent. Explicit `borderSoft` at
  `rgba(232,228,216,0.14)` to pre-empt the spike-008 token-collapse pattern.
- Built the settings sheet as a compact bottom sheet (max 58% of phone height, internal
  scroll) so the orb stays on display.
- Exposed every real control archetype: Stepper × 2, SegmentedControl, VisualPicker,
  ToggleSwitch × 2, ThemeSwitch, accent button, outlined secondary × 2.

### 2026-05-20 — pivot to cool slate + semibold + layered-halo orb

Operator presented a reference image (cool-grey near-white bg, slate-grey halo orb with
darker centre disc, white "HOLD / 3" semibold text inside the disc) and asked to match
its colours/contrast for light, plus noted that the bright ivory dark accent was also too
bright. Pivots:

- **Palette family swap** — light variant pulled from "warm rice-paper + ink" to "cool
  slate + pale near-white": `bg` `#f1efea` → `#f3f5f7`, `surface` `#f7f5f0` → `#ffffff`,
  `accent` `#2a2620` (warm ink) → `#5d6877` (cool slate), `muted` `#8a857c` → `#969ba6`,
  `text` `#2a2620` → `#3a4150`. The whole light variant now sits in the cool blue-grey
  family from the reference, not the warm paper family from the first pass.
- **Dark variant rebalanced** — accent dimmed from a bright `#e8e4d8` ivory to a softer
  mid-slate `#a8aeb8`, so it stops competing with content. Background shifted from warm
  `#0e0d10` (with violet undertone) to cool `#1a1d24` to match the cool family.
- **Typography weight** — bumped heading from ultralight 200 → semibold 600 to match the
  reference's heavier focal text. Body stays at 400.
- **Orb redesigned** — replaced the single radial-gradient disc with **three layered
  translucent halos** (sized 100% / 86% / 74% of the orb area, with slightly asymmetric
  border-radii for an organic puddle feel, low-opacity slate fills) wrapped around a
  solid **centre disc** in the accent colour. Halos use new tokens
  `orbHalo1 / orbHalo2 / orbHalo3` (rgba), retiring the previous gradient tokens
  (`orbInFrom/To`, `orbOutFrom/To`, `orbInText`, `orbOutText`, `ringOuter`, `ringInner`).
- **Breath label moved inside the orb** — "In" / "Out" renders inside the centre disc in
  `onAccent` (white on light, dark slate on dark), matching the reference's "HOLD / 3"
  pattern. Below the orb is now just a compact timer line (`02:51` + `5.5 BPM`), not the
  phase label.
- **`ThemeSwitch` is live** — flipping it inside the running app re-renders both the
  switcher's variant and the harness's active candidate, so the light↔dark parity test is
  instant: open settings, tap Theme, every control re-renders in the other palette
  without anything vanishing.
- **Theme system still collapses** to `light / dark / system`; the custom `moss / slate /
  dusk` are removed.

### 2026-05-20 — third pass (no stats UI, mute next to Start, sizes tuned, dark contrast)

Operator feedback after iteration 2 reload:

- **Stats UI removed.** The "12 MIN TODAY · STREAK 5d" footer below Start and the
  "Reset stats" outlined button at the bottom of the settings sheet are both gone.
  Stats computation remains; the surface is removed while the operator decides whether
  a stats display belongs in the app (deliberately staying away from gamification cues).
- **MuteButton added next to Start** — 44 px (size-11) circle, accent border, surface
  bg, accent-strong stroke, inline 24 × 24 SVG with the real Speaker / Speaker-slash
  paths from `src/components/MuteToggle.tsx:62-106`. Layout mirrors
  `SessionControls.tsx:82` exactly: `flex items-center gap-3`, Start is `flex-1`,
  Mute is the fixed-width slot on the right. Click toggles between speaker and
  speaker-with-X.
- **Practice title above the switcher** bumped from 13 px @ 500 textSoft to 17 px @
  600 text — same heading family/weight as the breath label, so it reads as a real
  title rather than a caption.
- **Below-orb feedback texts** sized up: `02:51` 13 px → 17 px (still tabular-nums);
  `5.5 BPM` 10 px → 12 px (still uppercase tracked). Wider letter-spacing kept so the
  feedback line still feels like ambient telemetry rather than a primary number.
- **Dark contrast nudged**:

  | Token        | iter 2          | iter 3          | Δ |
  |--------------|-----------------|-----------------|---|
  | `text`       | `#d4d7dd`       | `#dde0e6`       | +9/+9/+9 (small lift) |
  | `textSoft`   | `#7a7d85`       | `#8a8d95`       | +16/+16/+16 (visible lift on secondary text) |
  | `muted`      | `#5c6068`       | `#6a6e76`       | +14/+14/+14 (telemetry line legible) |
  | `accent`     | `#a8aeb8`       | `#b4bac4`       | +12/+12/+12 (orb disc + Start CTA slightly brighter) |
  | `accentStrong` | `#c4c9d2`     | `#ccd0d9`       | +8/+7/+7 (icon stroke + ThemeSwitch active border) |

  All bumps stayed under "too bright" — the dark variant still feels candle-lit, not
  bleached. Re-checked by flipping ThemeSwitch back-and-forth: every control's contrast
  improved without anyone in the family becoming the loudest element.

### 2026-05-20 — fourth pass (mute icon reskinned to match top-bar icons)

Operator screenshot pointed out the bottom-right MuteButton's contrast was visibly
heavier than the top-left info + top-right gear icons. Cause:

- MuteButton was a faithful port of `src/components/MuteToggle.tsx:52`, which uses
  `border-[var(--color-breathing-accent)]` + `text-[var(--color-breathing-accent-strong)]`
  — full accent, not muted. Intentional in the production design (mute is prominent),
  but too heavy against the new mono-zen chrome where everything else is restrained.
- MiniIconButton (info + gear) uses `borderSoft` + `textSoft` — lighter.

Fix: MuteButton reskinned to `borderSoft` + `textSoft` so all three top/bottom icons
sit at the same visual weight. **Hit area kept at 44 px** (the real `MuteToggle.tsx`'s
size-11 spec — accessibility floor, not negotiable). Only the colour treatment changed.

This is a **deviation from the real component's classes** — flagged here so the build
phase knows to either:
  (a) update `MuteToggle.tsx` to the lighter treatment (consistent with new design),
  or (b) introduce a `muted-chrome` variant in the theme system.
Recommendation: (a). The new mono-zen chrome makes the accent-border treatment look
like a glaring outlier; ship with the lighter classes.

### 2026-05-20 — fifth pass (small fix: gear vs info icon parity)

Operator screenshot caught the gear `⚙` rendering visibly smaller than the info `ⓘ` —
unicode glyph optical sizes differ in the em-box even at the same font-size. Both icons
swapped to inline SVGs (24 × 24 viewBox, 2 px stroke, `currentColor`, sized to 18 × 18
inside the 36 px button) — the same approach as `src/components/MuteToggle.tsx:62`. Top
bar icons now sit at parity.

### 2026-05-20 — sixth pass (5 states · HRV / Stretch / Navi feedback split)

Operator scope-up: see the whole app surface in this design, not just the running
practice screen. Built the five-state harness:

- **01 Learn page** — destination of the info icon. Sectioned content: About (Forrest
  Knutson), Practices (one card per practice with a "Watch the practice video" link
  affordance), Resources (external links). Sectioned with quiet uppercase tracked
  headers; cards use `surface` + `borderSoft`.
- **02 App Settings page** — destination of the gear icon. **App-wide chrome only**,
  separated from per-practice config: Appearance (Theme — the binary light/dark, moved
  here from the Practice Settings sheet), Language (EN / PT-BR segmented), Audio
  (visual cue style + subtle haptics), About (version + GitHub link). The per-practice
  Practice Settings sheet stays a bottom sheet, accessed from the SetupCard on the Idle
  screen.
- **A Idle** — `SetupCard` in the variable-region slot under the orb shows the active
  practice's current setup as a 3-cell summary (PACE · RATIO · DURATION for HRV/Stretch,
  FRONT · BACK · ROUNDS for Navi) with a chevron — tap opens the Practice Settings
  sheet. Orb defaults to **still** with empty centre disc; harness has an `ambient
  breath` toggle to audition the gently-animating variant per operator's open question.
  Start + Mute at the bottom.
- **B Running** — orb animating, "In / Out" label inside the centre disc. Switcher is
  visibly disabled (`opacity 0.55`, `cursor: not-allowed`) per the locked
  navigation-mutex requirement. Practice-specific feedback under the orb:
  - **HRV** — `FeedbackHRV` time-based: large `02:51` + small `5.5 BPM · 1:1`.
  - **Stretch** — `FeedbackCount` count-based: big `2`, small ` of 5`, context line
    `Hamstring fold · 0:45 left` (pose + per-stretch time remaining).
  - **Navi** — `FeedbackCount` count-based: big `47`, small ` / 100`, context line
    `Round 1 of 3 · Front`. Same primitive as Stretch, different data shape.
  The Stretch / Navi feedback shares one `FeedbackCount` component — design parity
  with a single primitive, while HRV gets its own time-shape primitive.
- **C Complete** — orb still by default, **check-marker SVG** in the centre disc
  (subtle, no celebratory styling). Below: `Session complete` title + tiny `Take a
  moment` uppercase tracked line. Done button + Mute. No duration display, no streak,
  no badge — operator anti-gamification stance preserved.

Practice Settings sheet adjustments:
- ThemeSwitch removed (now lives in App Settings).
- Navi gets a different control set than HRV/Stretch: `Front OM count` stepper +
  `Rounds` stepper + `Per-OM tick` toggle, no BPM/Ratio/Duration. HRV/Stretch keep
  bpm/ratio/duration. Cue timbre VisualPicker + Cue sound toggle shared by all.

Navigation wired inside the harness:
- Info icon → Learn screen, gear icon → App Settings screen, both with a back arrow.
- SetupCard tap → Practice Settings bottom sheet (still works from A).
- Start (A) → Running (B), End session (B) → Complete (C), Done (C) → Idle (A).

Harness expanded:
- Screen selector (5 buttons: 01–05).
- Practice selector (3 buttons: HRV / Stretch / Navi) — visible only when screen is one
  of A/B/C.
- Orb selector (still / ambient breath) — visible only on A/C (B always breathes).
- Theme selector (existing A/B).
- Keyboard: `1`–`5` screens, `H`/`S`/`N` practice, `T` theme, `B` ambient.

Stretch's data shape is speculative — spike findings don't pin it down beyond "promoted
from HRV mode to top-level practice". The `2 of 5 · Hamstring fold · 0:45 left`
placeholder mirrors a paced-breath-with-pose-sequence interpretation; will need real
spec from the build phase. Marked as a deviation in the verdict block.

### 2026-05-20 — seventh pass (locks · orb dev-toggle · A/Idle variant exploration)

**Locked at this iteration** (committed to MANIFEST Requirements):

- Themes — light + dark only, mono-zen cool slate, semibold Inter.
- Learn page (01) — info-icon destination, sectioned content.
- App Settings page (02) — gear-icon destination; Appearance / Language / Audio /
  About. Theme picker is *only* here, not in the Practice Settings sheet.
- Practice Settings sheet — bottom sheet, per-practice controls (different shapes for
  HRV/Stretch vs Navi), `Done` button only (no Reset stats).
- B Running screen — orb breathing + In/Out inside disc + per-practice feedback
  primitive (HRV time-based, Stretch/Navi count-based via shared `FeedbackCount`).
- C Complete screen — locked at the design level; operator may drop the screen at
  implementation since A and C diverge only in the centre-disc check marker + a one-
  line "Session complete · Take a moment". Decision deferred to the build phase.
- **Orb still vs ambient breath** — both read well; the operator wants *both* shipped
  behind a developer-only environment toggle (e.g. `VITE_ORB_IDLE_BEHAVIOR=still|ambient`),
  same shape as the `VITE_SWITCHER_TREATMENT` flag from spike 007. Not in user-facing
  App Settings. Operator picks the final default from real-app testing.

**Open: A/Idle screen layout.** The single-row 3-cell SetupCard works for HRV (3
settings) and Navi (3 settings) but breaks for **Stretch (6 settings)**. Built five
candidate layouts in the harness (default practice = Stretch so the stress case lands
on screen by default):

| # | Variant | Card shape | CTA pattern |
|---|---------|-----------|-------------|
| V1 | Grid | 2 × 3 grid card — 1 row for HRV/Navi, 2 rows for Stretch | Whole-card tap + chevron |
| V2 | List | Vertical rows, label-left value-right (1 row per setting) | Whole-card tap + chevron on the first row only |
| V3 | Primary | Large total-duration metric + small secondary inline summary + explicit "✎ Adjust practice" outlined button | Explicit "Adjust" button (separated from the summary card) |
| V4 | Pills | Each setting is a free-standing pill chip (label + value), wrapping inline | Each pill is its own tap-to-edit target; no separate CTA |
| V5 | Narrative | Sentence-shaped summary ("10 min · 3 rounds of 5 stretches, 4 breaths each, at 5.5 BPM") with an inline "✎ Edit" affordance | Inline edit affordance in the corner of a one-line text card |

Each variant uses the locked Mono Zen chrome — only the variable-region content + CTA
pattern changes. The harness adds an `idle variant` row when screen=idle, plus keyboard
shortcuts `Q`/`W`/`E`/`R`/`Y` for V1–V5. Flip practice (`H`/`S`/`N`) while comparing
variants to see how each scales from 3 settings (HRV/Navi) to 6 (Stretch).

Trade-offs surfaced by the build:
- V1 (Grid) keeps the 3-setting card visually identical to before; Stretch becomes a
  slightly taller 2-row card. Predictable, scannable, low-novelty.
- V2 (List) is the most read-like-a-receipt option. Honest about the setting count but
  takes the most vertical room.
- V3 (Primary) elevates "total session time" as the answer to "is this what I want to
  do?", with everything else as supporting context. Closest to a CTA-driven design;
  separates summary-card from adjust-action.
- V4 (Pills) is the most mobile-native and allows tapping a *specific* setting to edit
  it (the Practice Settings sheet could scroll to that control). Highest interaction
  density.
- V5 (Narrative) reads as prose, not data. Pleasant for HRV ("5 min … at 5.5 BPM") but
  gets long for Stretch ("10 min · 3 rounds of 5 stretches, 4 breaths each, at
  5.5 BPM."). Soft, but less scannable.

**Verdict: V1 (Grid) wins.** Operator-selected. Reasons surfaced during audition:

- Scales transparently from 3 → 6 settings without changing visual language (1 row vs
  2 rows of the same cells).
- Whole-card tap + chevron is the lowest-friction CTA — no decision about *which*
  setting to edit, just "open the settings".
- Keeps continuity with the prior single-card design, so users with the pre-mono-zen
  app aren't relearning the surface.

Rejected:
- **V2 List** — readable but too vertical; pushes the Start button down on Stretch.
- **V3 Primary metric + Adjust button** — separating summary from CTA was clever but
  added an interaction step ("read summary, then tap Adjust"). The card-as-CTA in V1
  collapses that.
- **V4 Pills** — most mobile-native, but tapping a *specific* setting jumps you into a
  sheet that doesn't (yet) scroll-to-control. Could revisit if the Practice Settings
  sheet ever gains anchor-link scrolling.
- **V5 Narrative** — pleasant for HRV, gets long for Stretch's 6 settings; sentence
  shape is less scannable than the grid.

A/Idle layout is now committed to MANIFEST Requirements alongside the other locks. The
spike's exploration of the full app surface (5 screens × 3 practices × 2 themes ×
2 orb-idle behaviours × 5 idle layouts) is complete pending the operator's *final
exploration* topic.

### 2026-05-20 — eighth pass (breathing-shape variants · end-of-phase ring cue)

Operator scope: drop the existing Square + Diamond shape variants (keeping Orb as the
family base) and explore alternative breathing visuals. **Crucial mechanic to preserve**
— one the production Orb has and most meditation apps lack:

- An **outer boundary** marking end-of-inhale, always visible.
- An **inner boundary** marking end-of-exhale, visible *only during the exhale phase*.
- Together they let the user **pace by sight**: gauge distance + velocity to the next
  transition, not just feel the rhythm.

Operator explicitly invited non-orb interpretations (e.g. a lung filling up and down) —
the constraint isn't "must be a circle", it's "must give the user the end-of-phase cue
to time themselves against."

### Implementation engine

Replaced the CSS `@keyframes breathe-scale` with a shared `useBreathPhase` React hook:

- `PHASE_MS = 5500` ms (one inhale or exhale), full cycle 11 s ≈ 5.5 bpm.
- `easeInOutSine` curve — slow at the boundaries, faster mid-phase, matches the
  natural feel of breath (no linear lurch).
- Returns `{ phase, progress }`. `phase` is `'in'` / `'out'`, `progress` is `0 → 1`
  within the current phase.
- `computeScale(phase, progress)` maps to a `scale` value between `MIN_SCALE = 0.62`
  and `MAX_SCALE = 1.00` (matching `src/components/BreathingShape`'s tuning).
- All variants share the same hook + scale. Flipping variants mid-breath stays in
  sync — no clock drift across the comparison.
- The breath label flip (`In` / `Out` in B Running) also reads from the same hook, so
  the label changes the instant the phase changes.

### Variants built

| # | Variant | Outer cue | Inner cue | What breathes |
|---|---------|-----------|-----------|---------------|
| V1 | **Orb (halo)** — locked direction extended | Solid faint circle at max extent | Solid faint circle at min extent, fades in/out with phase | The 3 halos + accent disc scale together (the existing mono-zen orb, now with rings added) |
| V2 | **Minimal** | Same circle as V1 | Same circle as V1 | A single solid accent disc + faint halo (no asymmetric halo layers) — strictest restraint, closest to Calm-app aesthetic |
| V3 | **Lungs** | Two **dashed** ghost-outline lobes at max extent (always visible) | Two dashed ghost-outline lobes at min extent (exhale only) | Two organic lobes (asymmetric `border-radius`, soft-rounded petals) expand outward / contract inward symmetrically; label pill anchored between them |
| V4 | **Column** | A horizontal line near the top of the capsule, labelled **FULL** | A horizontal line at the rest-fill height, labelled **REST** (exhale only) | A fluid column inside a tall capsule; fill height rises with inhale, drops with exhale (high tide / low tide metaphor) |
| V5 | **Ripple** | Outer circle at full extent | Inner circle at min extent (exhale only) | Three intermediate concentric ripple rings scale outward/inward from a small central disc — pond-ripple feeling |

All five render the breath label (`In` / `Out` or the completion check) inside the
visual's focal element so it stays the focal point regardless of which shape is active.

### Harness additions

- New `shape` row (rose-pink buttons) — visible on A / B / C screens, hidden on Learn /
  Settings pages where there's no breath visual.
- Default screen is now **B Running** so the shape variants animate the moment the
  spike loads — operator can audition without clicking through.
- Keyboard: `Z` / `X` / `C` / `V` / `M` flip shape variants (chose this row to avoid
  collisions with already-bound keys: `B`=ambient, `N`=practice, `T`=theme, `H/S/N`
  practice letters).
- Side panel calls out that all five share the breath clock so flipping mid-cycle
  stays synced.

Awaiting operator verdict on which shape (or hybrid) becomes the locked breathing
visual for v1.6+.

### 2026-05-20 — ninth pass (V1 + V2 locked behind dev toggle · V1+ refinement explored)

Operator verdict: **lock V1 (Orb halo) and V2 (Minimal); ship both behind a dev
toggle** in the same shape as `VITE_SWITCHER_TREATMENT` / `VITE_ORB_IDLE_BEHAVIOR`.
Rejected V3 (Lungs), V4 (Column), V5 (Ripple) — kept in the file for future reference
but not shipped. Three follow-up adjustments:

**1. Ring cues hidden on Idle (A) and Complete (C).** Added a `showRings` prop to
   every variant (and the BreathingOrb dispatcher); IdleScreen and CompleteScreen pass
   `showRings: false`, RunningScreen leaves it at the default `true`. On A/C, even when
   the orb is ambient-breathing, no outer or inner boundary renders — the breath
   shape itself (halos / disc) still scales when ambient is on; only the targeting
   cues go quiet. Captured in MANIFEST as a hard requirement.

**2. V1+ refinement — "Orb refined" (id `orb-halo-refined`).** Operator flagged that
   V1's inner ring was hard to see at the start of exhale, because the disc and the
   inner ring share the same diameter (240 × 0.62 = 149 px = `size × discPct = size ×
   MIN_SCALE`) — when the orb is at full extent (end of inhale), the disc sits exactly
   where the inner ring fades in, occluding it. Refinements applied to a *new
   variant* (V1 stays untouched per "keep this version just in case"):

   - **Disc shrunk** 62 % → **56 %** of container — the disc now sits *inside* the
     inner-ring boundary at all times. When the inner ring fades in at exhale start,
     it's visible as a thin halo just outside the disc edge.
   - **Inner ring stroke** 1.5 px → **2 px** — easier to pick up against the orb's
     translucent halos.
   - **Inner ring opacity** 0.45 → **0.60** (when phase === 'out') — brighter when it
     matters.
   - **Inner ring transition** 600 ms → **350 ms** — fades in faster at exhale start.
   - **Label size** scaled down with the smaller disc (34 px → 30 px large, 22 px →
     20 px small) to keep the visual balance.
   - Outer ring and halos unchanged from V1.

   V1+ ships as a third option in the spike harness (between V1 and V2). Once
   operator audits and picks, the dev toggle's `orb-halo` option may switch to V1+
   (or stay on V1) — decision deferred. V2 unaffected.

**3. The other shapes (Lungs / Column / Ripple) stay in the spike file** for the
   record but are explicitly marked "kept for reference" in their hints. They will
   not be wired into the production app. Keyboard shortcuts adjusted accordingly:
   `Z` orb-halo, `X` orb-halo-refined, `C` minimal, `V` lungs, `F` column, `M` ripple.

End-of-phase ring cue still works correctly on V1+ — verified by walking through
phases: at end of inhale the disc sits inside the inner ring (which is invisible /
opacity 0), then exhale starts and the inner ring fades in around the disc within
350 ms, and the orb shrinks toward it over the rest of the 5.5 s phase.

### 2026-05-20 — tenth pass (V1+ overshoots → V1 stays · disclaimer added)

- **V1+ rejected** — operator audition verdict: "overshoots." The 56 % disc + 2 px /
  0.6-opacity inner ring made the cue too prominent against the meditative
  restraint. **V1 stays as the locked `orb-halo` variant** for the dev toggle. V1+
  remains in the spike file (`orb-halo-refined`) for reference; it will not ship.
- **Medical-advice disclaimer added** to the practice surface bottom (A / B / C).
  Single line, `Guided breathing practice — not medical advice.`, mirrors
  `src/content/lockedCopy.ts:22` (`LOCKED_COPY.en.medicalAdviceLine`) and the
  rendering shape from `src/app/App.tsx:1266`. In the spike it sits below the
  Start/End + Mute row inside `PracticeChrome`, styled small and discrete:

  - Font: Inter 400, 11 px, line-height 1.4, letter-spacing 0.02 em.
  - Color: `muted` token (so it sits softly against `bg`).
  - `white-space: nowrap` keeps it on a single line — the EN string fits easily on
    the 390-px phone-frame width with 20 px side padding. PT-BR back-translation
    locked in `lockedCopy.ts` is the same length range, so the nowrap holds.
  - Visible on all three practice screens (Idle / Running / Complete). Not added
    to Learn or App Settings (those are full-page destinations; the disclaimer
    belongs to the practice surface).

The visual spike is now feature-complete. All five app surfaces, both themes, both
shape variants (V1 + V2), the orb idle-behaviour toggle, the locked A/Idle layout,
and the disclaimer all render correctly. Final verdict block ready below.

### 2026-05-20 — eleventh pass (desktop validation)

Operator's closing ask before locking the spike: see + validate the design at the
desktop viewport.

**Approach** — render the locked mobile design in a centered column inside a wider
window mock. No multi-column re-layout (which would break the meditative focus); the
desktop view is the same design with a bigger orb and a center-modal settings sheet.

- **Outer window mock** — 1024 × 720 px with rounded corners + soft shadow,
  simulating PWA-on-desktop / a browser viewport. The page bg-gradient is repainted
  for the wider canvas (`radial-gradient(50% 70% at 50% 25%, …)`).
- **Inner centered column** — 520 px wide for practice screens (A / B / C), 600 px
  wide for Learn + App Settings (slightly wider since they're scrollable content
  lists, not the breathing surface).
- **Orb scales to 320 px diameter** via a new `large` prop on the V1 + V2 variants,
  with label scaled to 46 px to keep proportion. The end-of-phase ring cue scales
  with the orb. Halos + disc geometry are unchanged.
- **Switcher + controls width-capped to 400 px**, centered in the column — same look
  as mobile, just floating in more horizontal space rather than stretching.
- **Practice Settings becomes a center modal** instead of a bottom sheet at desktop
  sizes — `position: absolute; top/left: 50%; transform: translate(-50%, -50%)`,
  `max-width: 460 px`, rounded all corners, backdrop click closes. No drag handle (it
  was a mobile-affordance). Same control content otherwise.
- **Disclaimer + medical-advice line** stays at the bottom of the practice column,
  same styling.
- **Vertical layout holds** — Idle / Running / Complete all fit comfortably in
  720 px height with the larger orb, generous top padding, and the disclaimer at the
  bottom. No scroll, no jiggle when switching between practices or phases. (This is
  the "no vertical scroll, no vertical jiggle" requirement, captured in MANIFEST.)

**Harness** — added a `viewport` toggle (cyan buttons: Mobile / Desktop) in the top
row of the harness, before the theme switcher. Default stays mobile so the spike
loads to the now-familiar mobile view; one click swaps the entire stage to the
desktop window. All other selectors (screen / practice / shape / ambient / idle
variant) work the same on both viewports.

### Operator's milestone-bound checklist (for the v1.6 build)

Surfaced from this spike for the implementation phase, in addition to the design:

1. **Only two themes** — `light` and `dark`, default by `system`. Custom themes
   `moss / slate / dusk` are removed.
2. **Drop the user-visible `Variant` (orb / square / diamond) app configuration** —
   no shape picker in user-facing App Settings.
3. **Developer toggle for orb idle behaviour** — `VITE_ORB_IDLE_BEHAVIOR=still|ambient`
   (default tbd by operator from real-app testing).
4. **Developer toggle for orb type** — `VITE_BREATHING_SHAPE=orb-halo|minimal-rings`
   (V1 + V2).
5. **Practice stats are computed and persisted but NOT displayed** — the visible
   stats footer and the Practice Settings "Reset stats" affordance are removed
   pending a deliberate decision on a stats surface.
6. **No vertical scroll on the practice surface, no vertical jiggle** when switching
   practices or phases — the designs must fit the viewport at all supported sizes
   from 320 px wide upward, including the Stretch Idle SetupCard (the 6-setting
   stress case) in EN and PT-BR.

All six items are captured in MANIFEST Requirements alongside the design locks.

The spike is now complete and ready to verify (VALIDATED) on next operator sign-off.

### 2026-05-20 — twelfth pass (no-jiggle layout fix)

Operator caught a subtle layout problem: the previous PracticeChrome wrapped the orb +
feedback area in a `flex-1` flex column with `items-start`, which centered the orb in
the *available* vertical space — meaning the orb's y-position depended on the size of
the feedback content below. Switching from HRV (3-cell setup card) to Stretch (6-cell
setup card) shifted the orb upward; flipping idle→running→complete shifted it again.
That's the jiggle.

Operator's requested anchoring:
- **Top-aligned (from orb up):** top bar → switcher → orb → feedback area, all
  stacked from the screen top with a fixed paddingTop above the orb.
- **Bottom-aligned (from Start down):** Start + Mute → disclaimer, anchored to the
  screen bottom.
- **Middle spacer:** absorbs the remaining space; lets the feedback / setup card
  grow downward without nudging the orb.

Fix applied:
- The orb + feedback container is now a plain `flex flex-col items-center` (no
  `flex-1`), with paddingTop reduced (28 → 18 mobile, 40 → 28 desktop) so the orb
  sits at a fixed y-position right after the switcher.
- A `<div class="flex-1"></div>` spacer was inserted between the orb container and
  the Start + Mute row. It absorbs the variable vertical room as the feedback or
  setup card grows or shrinks.
- Start + Mute and the disclaimer follow the spacer, so they're pinned to the
  screen bottom.

Result: orb position is constant across HRV/Stretch/Navi and A/B/C. Start +
disclaimer position is constant. The variable area between them grows or shrinks
into the spacer without disturbing either anchor. This is the "no vertical jiggle"
requirement made structural — captured in MANIFEST.

### 2026-05-20 — thirteenth pass (desktop disclaimer + min-gap)

Two follow-ups from the desktop view:

- **Disclaimer was clipped on desktop** — the 720 px window was too short to fit the
  worst-case stack (Stretch idle: top bar 98 + switcher 60 + paddingTop 28 + orb 320
  + setup-card marginTop 36 + setup card 102 + Start 60 + disclaimer 51 = 755 px
  before any spacer). `overflow: hidden` on the window mock was chopping the
  disclaimer off the bottom. **Window mock raised to 1024 × 800** — gives the
  spacer ~29 px of room on Stretch idle and ~53 px on HRV idle, with the disclaimer
  fully visible in both.

- **Setup card was gluing to Start on Stretch desktop** — when the flex-1 spacer
  collapsed to 0 (worst-case content), the variable region's bottom edge touched
  the bottom controls. **Added `pt-4` (16 px) to the bottom controls row** in
  PracticeChrome. This is now a **minimum** gap: when the spacer has room it
  provides additional space above the pt-4; when the spacer collapses, pt-4 holds
  the gap. Applies to both mobile and desktop layouts.

Combined effect: at every screen / practice / phase combination on both viewports,
the variable region has at least 16 px of breathing room before the Start button,
and the disclaimer is always visible. The structural anchoring (top group fixed,
bottom group fixed, variable region grows into spacer) is preserved.

Note for the real build: the 800 px desktop figure is a spike mock; production
should use viewport-relative sizing (e.g. `100vh` minus the window chrome). The
constraint to carry forward is the *layout structure*, not the exact 800 px
number — top anchored, bottom anchored, spacer in the middle with a 16 px
minimum gap between the variable region and the bottom group.

### 2026-05-20 — fourteenth pass (install banner — mobile-only alternatives)

Operator's last exploration before closing the spike: the current
`src/components/InstallBanner.tsx` "doesn't look too good." It's a horizontal
strip below the top app bar — functional but visually unrefined against the new
mono-zen chrome. Four alternative treatments built, all mobile + idle only
(install only matters when not yet installed; desktop never shows it):

| # | Variant | Position | Shape |
|---|---------|----------|-------|
| **V1** | **Slim top strip** | below top bar, full-width | Refined version of current — same horizontal layout (icon + text + action + dismiss), but mono-zen palette and softer borders. |
| **V2** | **Floating pill** | below top bar, with horizontal margins | Padded rounded card with a soft shadow. Feels like a toast — temporary and lifted, not glued to the chrome. Action becomes a filled accent pill. |
| **V3** | **Inline card** (with chevron) | below the switcher (above the orb) | Reuses the locked V1 SetupCard shape, so install reads as *part of* the practice surface — same chevron + tap affordance. Two-line content (title + sub-line). |
| **V4** | **Bottom card** | above the Start row (above disclaimer) | Vertical layout — icon + title + sub on top, full accent button below. Most prominent of the four; X in the corner. |

Plus a **None** option (banner hidden) so the operator can confirm the absence
case (everything else stays correctly anchored — no orb shift when banner
appears/disappears, validating the no-jiggle layout structure).

### Implementation

- `INSTALL_VARIANTS` array with `position: 'top' | 'bottom'` per variant; the
  V3 inline card sits in the `top` slot too because rendering it between the
  switcher and the orb would push the orb downward (no-jiggle violation when the
  banner is dismissed). Keeping V3 below the top bar but above the switcher
  preserves the locked orb position.
- `PracticeChrome` now accepts `topBanner` and `bottomBanner` slot props. Each
  slot defaults to `null`. The IdleScreen picks the slot based on the active
  variant's `position`.
- Dismiss is local state inside `IdleScreen` so re-mounting (via theme / practice
  / shape change) resets it. Flipping the install variant in the harness also
  brings the banner back — by design, since the spike is for comparing them.
- iOS toggle in the harness flips the action label between **Install** (Android /
  Chrome) and **How to install** (iOS, where the underlying real component
  expands an `IosInstallSteps` panel). Spike doesn't expand the steps — the
  cue here is the label change.
- Each variant uses the locked `LOCKED_COPY.en.install.bannerText` /
  `installButton` / `iosStepsButton` strings (verbatim — those are locked copy).
- App icon glyph in the banner is a mini-orb (3 concentric circles) — doesn't
  reuse the real PWA PNG (which ships at runtime in `public/`), but evokes the
  app's identity in spike scope.

Harness adds a `install` row (lime buttons + orange iOS toggle), visible only
when `viewport=mobile` AND `screen=idle`. Side panel calls out the alternatives.

**Verdict: V3 (Inline card with chevron) wins.** Operator-selected. The shape
reuses the locked V1 SetupCard pattern — install reads as a *contextual surface
in the practice flow* rather than a chrome strip stuck above it. Two-line content
keeps the install copy + sub-line readable without truncation, and the chevron +
dismiss X follow the rest of the app's affordance vocabulary. Position locked
below the top bar (NOT between the switcher and the orb) so the orb stays
anchored when the banner appears or is dismissed — preserving the no-jiggle
structure.

Rejected:
- **V1 Slim strip** — refined but still reads as chrome ornamentation, not
  content. Stuck below the top bar instead of belonging to the practice surface.
- **V2 Floating pill** — toast-like, but the lifted shadow + filled accent pill
  competed with the Start button visually.
- **V4 Bottom card** — most prominent, but consumed too much vertical space on
  the worst-case (Stretch + 6-cell SetupCard). On HRV it dominated the screen.

V3 lock captured in MANIFEST Requirements alongside the other v1.6 locks.

---

## Spike 010 — closed

The visual system for HRV v1.6 is now fully designed and locked. Spike covered:

- Two themes (Mono Zen light + dark, cool slate, semibold Inter).
- Five app surfaces: Learn / App Settings / Idle / Running / Complete.
- Three practices with shared chrome + per-practice feedback (HRV time-based,
  Stretch + Navi count-based via shared `FeedbackCount`).
- A/Idle layout: V1 Grid SetupCard, tap-to-edit chevron, scales 3 → 6 settings.
- Practice Settings sheet (bottom on mobile, center modal on desktop) with all
  real control types: stepper, segmented, visual picker, toggle, accent button.
- App Settings page (theme + language + audio + about), Learn page (about /
  practices / resources).
- Breathing shape: two variants behind dev toggle (V1 Orb halo + V2 Minimal),
  end-of-phase ring cue preserved, rings hidden on Idle / Complete.
- Orb idle behaviour: still + ambient breath behind dev toggle.
- MuteToggle chrome aligned with the top-bar icons (lighter treatment, build
  must update `MuteToggle.tsx` accordingly).
- Disclaimer at the bottom of the practice surface (locked copy).
- Stats UI removed (anti-gamification stance).
- No-jiggle layout structure (top group fixed, bottom group fixed, spacer +
  16 px min gap).
- Desktop validation (centered column, larger orb, modal-vs-sheet for settings).
- V3 Inline card install banner (mobile + idle only).

Twelve operator-locked design decisions captured in
`.planning/spikes/MANIFEST.md` Requirements. The build phase has a complete
visual contract to work against.

## Results

PENDING — awaiting operator audition. Verdict to be one of:

- **APPROVED — ship as the new theme baseline.** Tokens transcribed to
  `src/styles/theme.css`, old themes removed, `ThemePicker` collapses to binary.
- **APPROVED with tweaks** — specific values to adjust (e.g. dark surface lighter,
  accent warmer, stepper buttons larger).
- **Needs another pass** — control type X looks wrong on variant Y, or the orb-compression
  pattern doesn't survive the bottom sheet.

The selected tokens become the source of truth for the v1.6+ visual phase.
