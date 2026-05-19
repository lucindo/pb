# App Icon & Branding

How to ship the installed PWA app icon the operator chose during spiking — "Breathing
rings", pale on deep.

## Requirements

Non-negotiable — every implementation in this feature area must honor these:

- **The installed icon is "Breathing rings", pale-on-deep tone.** Concentric rings
  echoing the breathing-orb expansion, cohesive with the existing orb icon and dark
  favicon. (Spike 006 — operator choice.)
- **Maskable exports must inset the glyph into the inner-80% safe zone.** This also fixes
  the pre-existing bug where the maskable PNG was byte-identical to the non-maskable one.
- **Stay in the app palette** — pale glyph on a deep calm gradient, so the icon still
  reads as this app.

## How to Build It

This is **PNG asset generation**, not a code constant change.

### 1. The winning SVG — "Breathing rings"

| Element | Value |
|---------|-------|
| Background | radial gradient `#3b4252` (center) → `#2b303b` (edge) |
| Rings | 3 concentric circles, radii **200 / 152 / 104** (in a 512 viewBox), stroke `#e6eef3`, stroke-width 13, opacity **0.24 / 0.42 / 0.66** (faint outward) |
| Center | filled disc, radius **46**, accent `#9fc6d6` |

Source SVG is in `sources/006-app-icon-alternatives/index.html` (the "Breathing rings"
candidate).

### 2. Rasterise to the five PNGs in `public/`

All five targets are already declared in `vite.config.ts`'s `VitePWA` manifest:

- `pwa-192x192.png`, `pwa-512x512.png` — glyph at **full size**.
- `pwa-maskable-192x192.png`, `pwa-maskable-512x512.png` — glyph **scaled to ~0.9×** so
  the outer ring (r200 + 6.5 half-stroke ≈ r206.5) sits inside the r≈205 inner-80% safe
  circle. Without the shrink the ring is cropped on Android's maskable crop.
- `apple-touch-icon.png` — 180×180.

### 3. Verify the maskable inset

Confirm the maskable PNGs are **not** byte-identical to the non-maskable ones (the old
bug). The maskable variant must visibly have more breathing room around the rings.

## What to Avoid

- **Do not export the maskable PNG identical to the non-maskable one.** That was the
  pre-existing bug — the orb ran to the edges with no safe-zone inset. The maskable export
  must shrink the glyph.
- **Do not use static PNG mockups to evaluate icon candidates.** Spike 006 used live SVG
  in real OS-mask shapes (iOS rounded tile / Android circle) at home-screen sizes —
  legibility-when-cropped and legibility-when-small must be *seen*, not assumed.
- **Do not assume the operator's reference glyph wins.** In spike 006 the operator
  supplied a "totem" reference glyph but, seeing it cropped in real masks next to
  alternatives, picked the breath-motion motif instead. Always render candidates in real
  install contexts.

## Constraints

- Final ship requires SVG → PNG rasterisation — the spike harness validates the design,
  not the asset pipeline.
- The browser-tab **favicon** (`favicon.svg` + per-theme recolor in `faviconPalette.ts`)
  is a **separate surface** and was explicitly out of scope for spike 006. Whether to
  sync the favicon to the Breathing-rings motif is a follow-up decision. (Note: project
  history records the favicon was later synced — see ROADMAP/MANIFEST if revisiting.)

## Origin

Synthesized from spikes: 006 (app-icon-alternatives).
Source files available in: sources/006-app-icon-alternatives/.
