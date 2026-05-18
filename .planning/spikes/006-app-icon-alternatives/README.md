---
spike: 006
name: app-icon-alternatives
type: comparison
validates: "Given the installed PWA icon, when the user reviews meditation-themed candidates in real iOS/Android install contexts, then the icon worth shipping emerges"
verdict: PENDING
related: []
tags: [icon, pwa, branding, design, meditation, comparison]
---

# Spike 006: App Icon Alternatives

## What This Validates

**Given** the installed PWA icon, **when** the user reviews meditation-themed
candidates in real iOS / Android install contexts, **then** the app icon worth
shipping emerges.

The operator's framing: explore alternative app icons, options visually related
to meditation, anchored on a reference glyph the operator likes.

## Research

No new libraries — the harness is a buildless icon workbench. Findings from
reading the production setup before building:

- The installed app icon today is the **glowing orb** —
  `public/pwa-512x512.png` / `pwa-192x192.png` / `pwa-maskable-*.png` /
  `apple-touch-icon.png`, declared in `vite.config.ts`'s `VitePWA` manifest. It
  is a soft blue radial gradient (`#d3ecf2 → #88c0d0 → #5e81ac`) on charcoal
  `#2e3440` — the same breathing-orb motif as `public/favicon.svg`.
- **Maskable gap noted:** `pwa-maskable-512x512.png` is byte-identical to the
  non-maskable `pwa-512x512.png` — the orb runs near the edges with no extra
  safe-zone inset. Whatever icon wins, its maskable export must inset the glyph
  into the central 80% safe zone.
- App palette: theme `#5e81ac`, light bg `#eceff4`, dark base `#2e3440`. New
  candidates stay in this family (pale glyph on a deep calm gradient) so the
  icon still reads as this app.

**The reference glyph (operator-supplied image):** a minimalist line-art totem —
a shallow cradling **crescent** on top, a small **radiant sun** (circle + rays)
in the middle, and a tall **arch** at the bottom. Read top-to-bottom it is a
figure in a meditative posture. Recreated as SVG in the two **Totem** candidates.

**Approach comparison:**

| Approach | Pros | Cons | Status |
|----------|------|------|--------|
| SVG glyphs in a live harness | Buildless, infinitely tweakable, rendered in real iOS/Android masks at real sizes | Final ship still needs SVG → PNG raster | **Chosen** |
| Static PNG mockups | What-you-see-is-final | No live mask/size/tone switching, slow to iterate | Rejected for the spike |

## How to Run

```
open .planning/spikes/006-app-icon-alternatives/index.html
```

Network needed on first open (React / htm / Tailwind from CDN).

## What to Expect

- Seven icon cards: **Current** (the orb), **Totem · line**, **Totem · solid**,
  **Crescent + sun**, **Lotus**, **Breathing rings**, **Ensō**.
- Each card shows the icon large plus two small sizes (does it survive
  shrinking?).
- Global controls: **Mask** (iOS rounded tile / Android circle / square),
  **Tone** (pale-on-deep / dark-on-light), and the maskable **safe-zone** ring.
- A **home-screen preview** — the shortlisted (or Current) icon shown among
  placeholder app tiles on a light or dark wallpaper.
- A "+ shortlist" toggle per card and a running shortlist summary.

## Observability

- **Real install contexts** — every icon renders inside the actual OS mask
  shapes at home-screen sizes, so legibility-when-cropped and
  legibility-when-small are visible, not assumed.
- **Safe-zone ring** — the dashed inner-80% circle shows exactly what the
  Android maskable crop keeps; an icon whose glyph escapes the ring would be
  clipped once installed.

## Investigation Trail

1. **Inspected the current icon.** Read the `VitePWA` manifest and viewed the
   PNGs — the installed icon is the orb; the maskable variant has no safe-zone
   inset (logged as a build note).
2. **Read the reference image.** A three-element meditation totem — crescent,
   radiant sun, arch.
3. **Built the harness.** Seven SVG candidates: the orb (baseline), two faithful
   recreations of the reference glyph (airy line vs. weighted solid), and four
   adjacent meditation motifs (crescent+sun, lotus, breathing rings, ensō). All
   kept inside the maskable safe zone, all in the app palette.
4. **Made install-realism first-class.** Live OS-mask switching, multi-size
   rendering, tone flip, safe-zone overlay, and a home-screen preview — so the
   choice is judged the way the icon is actually seen.
5. _(Pending operator review — verdict to be set from the checkpoint.)_

## Results

_Pending operator review. The harness is built and self-consistent; the verdict
(which icon ships, in which tone) is an operator design call recorded at the
checkpoint._
