---
spike: 012
name: spiritual-eye-orb
type: comparison
validates: "Given the locked Mono Zen cool-slate system, when the production orb is reinterpreted with kutastha layered iconography (gold ring + blue field + white five-pointed star), then at least one variant preserves the spiritual-eye reference while still feeling calm and inside the existing app."
verdict: VALIDATED — winner V5 Halo Flame (kutastha as warm-cool halo gradient + opalescent indigo disc + small white 5-point star)
related: [009, 010, 011]
tags: [ui, orb, kutastha, spiritual-eye, kriya-yoga, breathing-visual, comparison]
---

# Spike 012: Spiritual Eye Orb (Kutastha)

## What This Validates

> Given the locked Mono Zen cool-slate system, when the production orb is
> reinterpreted with kutastha layered iconography (gold ring + blue field +
> white five-pointed star), then at least one variant preserves the
> spiritual-eye reference while still feeling calm and inside the existing
> app.

## Background

The Kutastha (कूटस्थ) or **Spiritual Eye** is the iconic vision-form in Kriya
Yoga — the inner image meditators see at the Ajna (third-eye) center. Forrest
Knutson — the practitioner whose work this app's HRV and Navi Kriya practices
are modelled after — teaches this composition explicitly.

The composition is described consistently across primary sources:

| Layer | Appearance | Symbolism |
|---|---|---|
| Outer | Ring of golden light (sometimes "quivering ring of flame") | Vibratory creation / Cosmic Nature |
| Middle | Sphere of opalescent blue / indigo | Christ Consciousness / intelligence in creation |
| Centre | Brilliant white five-pointed star (often described "razor-sharp") | Pure Spirit / Cosmic Consciousness |

The structural parallel to the production orb (3-layer halo + accent disc +
outer ring + centered glyph) is striking: every kutastha layer has an
existing slot.

## Research

**Primary sources:**

- [Self-Realization Fellowship — Light of the Spiritual Eye](https://yogananda.org/blog/light-of-the-spiritual-eye)
- [Ananda — Tuning into the Spiritual Eye](https://www.ananda.org/ask/tuning-into-the-spiritual-eye/)
- [Ananda — Golden ring around blue pupil, white light at center](https://www.ananda.org/ask/i-see-a-golden-ring-around-a-blue-pupil-and-in-the-center-a-white-light-what-is-it/)
- [The Kutastha Vision and the Inner Stargate (breath4balance)](https://breath4balance.com/2025/06/16/the-kutastha-vision-and-the-inner-stargate-a-phenomenological-analysis-of-the-spiritual-eye/)
- [Forrest Knutson — The Process of Yogic Meditation (podcast)](https://escaping-samsara.com/forrest-knutson-the-process-of-yogic-meditation/)

**Approach comparison:**

| Approach | Description | Pros | Cons | Status |
|---|---|---|---|---|
| Literal saturation | Vivid gold + vivid indigo + bright white | Most recognisable | Clashes with locked Mono Zen calm (spike 010) | Rejected up-front |
| Tonal Zen | Star only; ring/halo/disc unchanged from production | Minimal disruption | Loses ring + field reference | V1 |
| Champagne accent | Warm muted ring; cool interior | Single warm note, preserves calm | Subtle — may not "read" as kutastha | V2 |
| Indigo Field | Indigo halos + indigo disc + crisp star | Strong "eye" reading | Shifts the disc colour identity | V3 |
| Tri-Light | All three layers present, all desaturated | Most complete symbolism | Most palette divergence from Mono Zen | V4 |
| Halo Flame | Warm-to-cool gradient across the 3 halos | Captures "ring of flame" phrasing in the halo system | Halo gradient is new visual idiom | V5 |

**Chosen approach:** build all five live in a comparison harness against a
reference (production orb unchanged). Real motion + real Mono Zen background
reveals which preserve the symbol *and* the calm. Same pattern used by
spikes 009 + 010.

## How to Run

```
open .planning/spikes/012-spiritual-eye-orb/index.html
```

Network needed on first open for the CDN imports (React 19 + htm + Tailwind).

Harness controls (top dark band):
- **Theme** — Light / Dark (live token swap)
- **State** — Idle (still, MID_SCALE) / Running (breathing animation, rings + progress arc visible)
- **Shortlist** — per-card `+ shortlist` pill; running summary printed in the harness

## What to Expect

- Five candidate orbs in a responsive grid, plus the production orb at the
  bottom as a reference anchor.
- All variants share **identical geometry** with `src/components/OrbShape.tsx`:
  - 3-layer halo at 100% / 86% / 74% with asymmetric border-radii (verbatim)
  - 62% disc with `0 6px 24px var(--color-border-soft)` shadow
  - Outer ring at 0.45 opacity (when Running)
  - South-anchored bidirectional progress arc (when Running)
- All variants breathe in lockstep (6 s in / 6 s out, ≈ 5 bpm) when Running.
- The only differences between variants are: **outer ring colour**, **halo
  RGBA**, **disc fill**, **on-accent text/star fill**, and **star
  fill/stroke/size** — the same surface area the production code already
  exposes per-variant via tokens.

## Investigation Trail

- **Initial decomposition** — Considered splitting into multiple spikes
  (e.g. one for ring-only changes, one for disc-shift, one for the star
  geometry). Rejected: the variants are too tightly coupled for that to be
  useful — the question is "what *combination* reads as kutastha *and* as
  Mono Zen", which only one head-to-head harness answers. Single comparison
  spike matches the pattern of spikes 009/010.

- **Star geometry choice** — Yogananda's "razor-sharp" pentagonal star
  suggests sharp acute points, not a chubby dingbat. Used a standard 5-point
  star polygon with outer:inner ratio 2.5 (sharp silhouette). The fill
  inherits from the disc's `on-accent` colour family (pearl on light,
  near-white on dark) so star + disc-text share a token in production.

- **Why all variants keep the production ring/arc cues** — The end-of-phase
  ring cue is a locked requirement (spike 010 + 011: "production Orb's
  distinguishing feature versus most meditation apps"). The kutastha
  variants must not break that affordance. Variants only colour-shift the
  outer ring; the progress arc inherits the same colour. The ring cue
  question is *not* re-opened by this spike.

- **V5 chosen at first audition; refined in two passes:**

  - **Pass 1 — disc + star.** Operator picked V5 immediately for the
    halo-flame gradient idea, with two tunes: (a) the disc shifted from
    slate-purple `#4e5778` to a deeper indigo with opalescent character;
    (b) the white star reduced from 40% of the disc to a smaller kernel.
    Applied: disc became a `radial-gradient(circle at 50% 42%, …)` with
    indigo stops (light: `#4a5a96 → #34406f → #2a356a`; dark:
    `#6c7cb6 → #4a5a96 → #38477e`). Star shrunk to 26%, stroke 0.7 → 0.6.

  - **Pass 2 — gold intensity calibration.** First gold bump was too hot
    (halo-1 opacity 0.34 → 0.62 with brighter hue `#d0aa60`). Operator
    asked for "between before and this", so opacity landed at 0.48 (light)
    / 0.45 (dark) with a slightly less saturated hue (`#caa662`). Star
    shrunk further to 20% with stroke 0.6 → 0.5 in the same pass — small
    bright kernel reads more like the "razor-sharp star" in primary
    sources than the earlier glyph-scale star did.

  - **Locked at iteration 3** — no further tuning requested.

## Results

**Verdict:** VALIDATED. **V5 (Halo Flame) ships as a new orb variant.**

**Why V5 won the audition over V1–V4:**

- **V1 Tonal Zen** — too subtle; the star alone, without any warm or
  indigo cue, reads as "an orb that happens to have a star". Loses the
  spiritual-eye identity.
- **V2 Champagne Flame** — outer ring is a thin 1.5 px stroke; even at
  high opacity the gold "flame" reads as decoration on the boundary
  rather than as the surrounding ring of light kutastha describes. The
  halos and disc still read as production grey, so the variant feels
  like the production orb wearing a gold belt.
- **V3 Indigo Field** — indigo halos + indigo disc without any warm
  element produced a cohesive blue-eye look but missed the gold ring
  (one of the three primary kutastha layers).
- **V4 Tri-Light** — included all three layers, but combining a strong
  gold ring stroke with indigo halos AND an indigo disc made the orb
  visually heavy: the gold ring sat on top of a dark composition,
  drawing attention to the boundary rather than the center.
- **V5 Halo Flame** — uses the halos themselves as the gold "ring of
  light", letting the warmth diffuse rather than be a hard stroke. The
  opalescent indigo disc and small bright star carry the rest of the
  vision. Reads as kutastha *and* as Mono Zen; preserves all locked
  affordances (ring cue, progress arc, geometry, motion, idle states).

**Locked V5 values** (transcribe verbatim into production):

| Token | Light | Dark |
|---|---|---|
| Halo 1 (outer, 100%) | `rgba(202, 166, 98, 0.48)` | `rgba(206, 168, 100, 0.45)` |
| Halo 2 (mid, 86%) | `rgba(168, 148, 116, 0.44)` | `rgba(170, 156, 122, 0.46)` |
| Halo 3 (inner, 74%) | `rgba(93, 104, 119, 0.50)` *(production halo-3 unchanged)* | `rgba(150, 156, 168, 0.52)` *(production halo-3 unchanged)* |
| Disc background | `radial-gradient(circle at 50% 42%, #4a5a96 0%, #34406f 60%, #2a356a 100%)` | `radial-gradient(circle at 50% 42%, #6c7cb6 0%, #4a5a96 60%, #38477e 100%)` |
| Disc on-color | `#ffffff` | `#ffffff` |
| Star fill | `#ffffff` | `#fafafe` |
| Star stroke | `rgba(255,255,255,0.20)` | `rgba(255,255,255,0.12)` |
| Star stroke width | `0.5` (in 0..100 viewBox) | `0.5` |
| Star size | **20% of disc** | **20% of disc** |
| Star geometry | 5-point polygon, outer:inner radius ratio **2.5**, point straight up | identical |
| Outer ring | `var(--color-breathing-accent)` *(production unchanged)* | identical |
| Progress arc | `var(--color-breathing-accent)` *(production unchanged)* | identical |

**Decision shape (for the build phase):** which (if any) of these three
exposure strategies — open decision, NOT locked by this spike:

- (a) **New `BreathingShapeVariant` value** — `'spiritual-eye'` joins
  `'orb-halo' | 'minimal-rings'` behind the existing dev toggle
  `VITE_BREATHING_SHAPE`. Same shape as spike-010's V1/V2 dev toggle.
- (b) **Default for the Navi Kriya practice only** — kutastha aligns
  directly with Forrest Knutson's Kriya lineage; other practices stay
  on `orb-halo`.
- (c) **User-visible variant picker** — re-opens what spike 010
  explicitly removed. Likely rejected on the anti-config stance, but
  surfacing as an explicit option.

## Implementation Mapping

The V5 win stays within the existing OrbContainer geometry. The
build-phase changes — and *only* these changes:

1. **Add two new theme tokens** in `src/styles/theme.css` (light + dark):
   `--color-orb-disc-spiritual-eye` (the radial-gradient indigo) and
   `--color-orb-halo-1-spiritual-eye` / `--color-orb-halo-2-spiritual-eye`
   for the gold halos. Halo-3 reuses the existing `--color-orb-halo-3`
   (cool slate, intentionally unchanged). Disc on-colour reuses
   `--color-breathing-on-accent` (already white in both themes).

2. **Add a `StarGlyph` component** to `src/components/` modelled on
   `CheckmarkGlyph` (`OrbShape.tsx:134-155`) — 5-point polygon, sharp
   (outer:inner = 2.5), point up, inherits `currentColor` from the disc's
   on-accent text colour. SVG only, no animation.

3. **Branch on variant in `OrbContainer`** (`OrbShape.tsx:305+`): when
   `variant === 'spiritual-eye'`, use the new disc + halo tokens and
   render `<StarGlyph />` as the disc child during Running. The decision
   on what to render at Idle/Complete (still star? no star?) is part of
   the build-phase exposure decision (a/b/c above), not locked here.

4. **Extend `BreathingShapeVariant` union** (`src/featureFlags.ts`) with
   `'spiritual-eye'`, and read it from `VITE_BREATHING_SHAPE` per the
   established pattern.

**No geometry change.** **No motion change.** **No ring-cue change.**
**No new affordances.** Halo positions/sizes/border-radii, disc
proportion, ring opacity, progress arc — all production-identical.

Per `[[feedback_spike_implementation_fidelity]]` and
`[[feedback_spike_is_design_not_features]]`: the locked V5 values above
are the design contract — implemented verbatim, no feature additions,
no relocations, no data-model changes.
