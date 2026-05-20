---
spike: 009
name: look-feel-alternatives
type: comparison
validates: "Given a phone-frame mock of the practice screen (orb breathing, switcher, breath label, Start, mini settings peek), when rendered in six fully-composed aesthetic directions (palette + typography + orb gradient + ambient surface + chrome treatment), then one (or a hybrid) reads as the calmest/cleanest meditation-appropriate look for the v1.6+ visual direction"
verdict: VALIDATED — winner: F. Monochrome Zen (refined in spike 010)
related: [002, 006, 007, 010]
tags: [ui, look-and-feel, palette, typography, theme, aesthetic, comparison]
---

# Spike 009: Look & Feel Alternatives

## What This Validates

> **Given** a phone-frame mock of the HRV app's practice screen (orb breathing live,
> 3-practice switcher, breath label "In/Out", Start button, mini settings peek for chrome),
> **when** rendered in six fully-composed aesthetic directions — each varying palette,
> typography, orb gradient, ambient surface, and chrome treatment together,
> **then** one (or a hybrid) reads as the calmest/cleanest meditation-appropriate look to
> the operator, becoming the v1.6+ visual direction.

Framed as **replacing** the current 5-theme system (light/dark/moss/slate/dusk), not as a
new family on top.

## Research

### Anchors per candidate

| Candidate | Reference look | Why it might land |
|-----------|----------------|-------------------|
| A. Soft Morning | Oak, Balance (light) — warm cream + soft sage | Warmth without saturation; serif heading adds literary calm |
| B. Deep Night | Calm's night-sky, Headspace sleep | Aurora violet over deep indigo + ultralight sans = "evening practice"; only candidate with halo glow on orb |
| C. Coastal Mist | Apple Health Mindfulness, Endel (lighter) | Glass over icy blue = "fresh, clean, airy"; tests the most chrome-detail risk (`backdrop-filter`) |
| D. Forest Calm | Insight Timer nature themes, Oak (dark) | Warm wood on moss = grounded/organic; serif heading pairs with earthy palette without going twee |
| E. Sand & Stone | Wim Hof, Othership | Terracotta + warm stone is rare in meditation apps but underrated; display serif + grainy texture = tactile and present-moment |
| F. Monochrome Zen | Waking Up (Sam Harris), Reflectly minimal | Single ink accent + variable ultralight + vast white = zen-by-restraint |

### Token mapping

Each candidate's palette uses the **exact same token vocabulary as `src/styles/theme.css`** —
`bg / bgSoft / bgEdge / surface / accent / accentStrong / muted / onAccent / orbInFrom-To /
orbOutFrom-To / orbInText / orbOutText / ringOuter / ringInner / borderSoft / modalBackdrop`
— so the winner ports 1:1 onto the real app's theme.

Three derived tokens not yet in `theme.css` appear in the harness and are noted for the
real build: `text`, `textSoft`, `borderSoft`. The dark-theme token-collapse memo
(`bg-soft === surface`, controls need explicit borders) is addressed candidate-by-candidate
via `borderSoft` — every candidate has visible borders on the mini settings peek so the
chrome stays legible on dark variants (B, D).

### Typography choices (Google Fonts via single `<link>`)

- A: **Cormorant Garamond** 500 (heading) + **Inter** 400 (body) — literary serif
- B: **Inter** 200 / 300 — ultralight throughout, evening hush
- C: **DM Sans** 500 / 400 — clean humanist sans
- D: **Source Serif 4** 500 + **Inter** 400 — organic serif on earthy palette
- E: **Playfair Display** 500 + **Inter** 400 — display serif on warm stone
- F: **Inter** 200 / 400 — ultralight + regular, contrast by weight only

### Approaches considered and rejected

| Approach | Why considered | Why rejected |
|----------|----------------|--------------|
| Six palettes on identical chrome | Smaller surface area, faster to build | "Look & feel" is bigger than palette — typography + orb gradient + ambient layer affect calm-ness as much as colour. A palette-only comparison misses half the question. |
| Two spikes (one palette-direction, one typography) | Cleaner axes | Splits the holistic judgment the operator asked for; we don't yet know which axes matter most |
| Single high-fidelity mock of each direction (no harness flipping) | Higher visual polish per direction | Loses the live head-to-head comparison that's the whole point — feel matters most when flipping A→B→C in 200ms |

## How to Run

```bash
open .planning/spikes/009-look-feel-alternatives/index.html
```

Network needed on first open (React/htm/Tailwind/Google Fonts CDN).

**Keyboard:** `1`–`6` switches candidates, `S` toggles the settings peek.

## What to Expect

A horizontal harness bar (dark, marked NOT part of product) with six letter buttons A–F:

1. **A. Soft Morning** — warm cream bg, sage accent, italic-leaning Garamond breath label, soft paper grain.
2. **B. Deep Night** — deep indigo with slow aurora drift in background, ultralight Inter, violet halo glow around the orb.
3. **C. Coastal Mist** — pale icy blue with a soft mist gradient, frosted-glass settings card, DM Sans.
4. **D. Forest Calm** — deep moss bg, warm wood/amber accent on Start button, Source Serif breath label, no texture.
5. **E. Sand & Stone** — warm stone bg with coarser warm grain, terracotta Start button, Playfair Display breath label.
6. **F. Monochrome Zen** — paper white, single ink-black accent, ultralight breath label at 36 px, no decoration anywhere.

For each candidate:
- Phone frame (390 × 780, iPhone-ish notch) with the practice screen rendered at real mobile scale.
- Top app bar (info + settings icons), 3-practice switcher pill (HRV / Stretch / Navi), live breathing orb (5.5 s in / 5.5 s out, ~5.5 bpm), breath label alternating, Start button, stats footer.
- **Settings peek** (S key or top-right harness button): a mini bottom-sheet with two toggle rows and two button styles (accent + outlined secondary) — exposes border / chrome behaviour, where dark candidates (B, D) historically collapse.
- A **side token panel** on the right shows the full palette + typography + ambient + chrome recipe for the active candidate (color swatches + hex), so the winner is implementation-ready.
- A **+ shortlist** toggle per candidate plus a running summary of which letters are shortlisted.

## Observability

The token-panel sidebar is the forensic log layer: every value the operator might want
to port into `src/styles/theme.css` is rendered live (swatches + hex), per active candidate.
Shortlist state is visible at all times in the harness bar.

## Investigation Trail

### 2026-05-20 — first build

- Built single-harness comparison with six candidates, each a full aesthetic system
  (palette + typography + orb + ambient + chrome) rather than a palette swap.
- Used the real app's theme-token vocabulary so the winner ports 1:1 into
  `src/styles/theme.css`.
- Added `borderSoft` per candidate up-front to head off the dark-theme token-collapse
  pattern (mini settings peek has visible borders in every candidate, including B/D).
- Aurora drift (B) and mist gradient (C) are animated/static radial gradients in the
  ambient layer, so the orb sits on top of motion without driving it.
- Live breathing orb uses CSS scale animation (0.62→1.00→0.62 over 11 s) — close enough
  to the real resonant cycle for visual judgment; not the production engine.

## Results

**VALIDATED — winner: F. Monochrome Zen.** Operator picked F as the direction with two
adjustments that reshape the rest of the visual work:

1. **Too bright as drawn** — the current `#fafafa` paper / `#ffffff` surface combination
   reads bleached rather than calm. Needs warmer rice-paper tones for the light variant
   (and a paired dark variant, not pure black).
2. **Multi-theme system collapses to two variants** — replacing the current
   `light / dark / system / moss / slate / dusk` with **just `light` + `dark`** (plus
   `system` follow). The five custom themes are dropped.
3. **Orb-always-on-display kept** — that pattern survives the simplification (operator
   liked it explicitly).
4. **Settings peek was under-realistic** — only showed toggles. The real practice
   settings have steppers, segmented controls, visual picker chips, and outlined
   secondaries; need to see them all rendered in the chosen aesthetic before committing.

These open the next spike (010) which iterates Mono Zen into a paired light/dark with a
fully realised settings panel.

### Token signal carried forward

The token vocabulary used here (`bg / bgSoft / bgEdge / surface / accent / accentStrong /
muted / onAccent / orbInFrom-To / orbOutFrom-To / orbInText / orbOutText / ringOuter /
ringInner / borderSoft / modalBackdrop`) is the right shape for the new system. The
`borderSoft` token (not yet in `src/styles/theme.css`) is mandatory — it's what keeps the
dark variant from falling into the spike-008 token-collapse trap.

### Verdict for the other five candidates

- **A. Soft Morning** — warm, but the serif heading + sage palette read more
  "self-help book cover" than "meditation tool". Out.
- **B. Deep Night** — aurora drift was a fun trick but distracting in practice. Out.
- **C. Coastal Mist** — frosted glass on icy blue felt clinical (Apple Health-y) rather
  than calming. Out.
- **D. Forest Calm** — closest runner-up; warm wood on moss has the grounded quality, but
  the serif heading is heavier than the operator wanted. Out.
- **E. Sand & Stone** — terracotta was decisive in the wrong direction (warm/active rather
  than calm/still). Out.

Final token recipe ships from spike 010, not here.
