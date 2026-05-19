---
spike: 006
name: app-icon-alternatives
type: comparison
validates: "Given the installed PWA icon, when the user reviews meditation-themed candidates in real iOS/Android install contexts, then the icon worth shipping emerges"
verdict: VALIDATED — winner: Breathing rings (pale on deep)
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
5. **Operator review.** The operator reviewed all seven and chose **Breathing
   rings**, in the **pale-on-deep** tone. Notably the operator did *not* pick
   either faithful recreation of their own reference glyph — seeing the totem in
   real install masks alongside the alternatives surfaced that the
   breath-motion motif fit better as an icon. That is exactly what the harness
   was for.

## Results

**Verdict: VALIDATED — winner: Breathing rings (pale on deep).**

The operator reviewed all seven candidates in real iOS/Android install contexts
and chose **Breathing rings** — concentric rings echoing the app's breathing-orb
expansion — in the **pale-on-deep** tone (cohesive with the current orb icon and
the dark favicon).

**Breathing rings spec (the icon to ship):**

| Element | Value |
|---------|-------|
| Background | radial gradient `#3b4252` (center) → `#2b303b` (edge) |
| Rings | 3 concentric circles, radii 200 / 152 / 104 (in a 512 viewBox), stroke `#e6eef3`, stroke-width 13, opacity 0.24 / 0.42 / 0.66 (faint outward) |
| Center | filled disc, radius 46, accent `#9fc6d6` |

**Notes for the build — this is asset generation, not a code constant:**

- Unlike the countdown beep (004) and end sound (005), shipping this is **PNG
  asset generation**, not a one-line constant change. The winning SVG must be
  rasterised to: `pwa-192x192.png`, `pwa-512x512.png`,
  `pwa-maskable-192x192.png`, `pwa-maskable-512x512.png`, `apple-touch-icon.png`
  (180×180) — all in `public/`, already declared in `vite.config.ts`.
- **Maskable safe-zone inset (the build note from step 1):** the non-maskable
  PNGs use the glyph at full size; the **maskable** PNGs must scale the glyph
  down so the outer ring sits inside the inner-80% safe circle (outer ring at
  r200 + 6.5 half-stroke = r206.5 slightly exceeds the r≈205 safe radius — the
  maskable export should shrink the ring set to ~0.9× so nothing is cropped).
  This finally fixes the pre-existing bug where the maskable PNG was byte-
  identical to the non-maskable one.
- **Out of scope (open question):** the browser-tab **favicon** (`favicon.svg` +
  the per-theme recolor in `faviconPalette.ts`) is a separate surface — still
  the orb. The operator's request was the *installed* icon. Whether to bring the
  favicon into visual sync with Breathing rings is a follow-up decision, not
  part of this verdict.

**Surprise:** the operator did not pick either Totem variant — their own
reference glyph. Seeing it cropped into real OS masks next to the alternatives
showed the breath-motion motif worked better as an icon. The harness earned its
keep by making that visible.
