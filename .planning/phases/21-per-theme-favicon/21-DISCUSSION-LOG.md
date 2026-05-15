# Phase 21: Per-Theme Favicon - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 21-per-theme-favicon
**Areas discussed:** Todo cross-reference, Favicon design, Asset delivery, No-flash strategy, Swap wiring, Color-map sync

---

## Todo Cross-Reference

| Option | Description | Selected |
|--------|-------------|----------|
| Leave deferred | Out of favicon scope — palette color redesign is its own concern, stays deferred behind 16.3 | ✓ |
| Fold into Phase 21 | Treat palette aesthetic redesign as part of this phase | |

**User's choice:** Leave deferred
**Notes:** `2026-05-13-themes-aesthetic-refresh.md` matched at score 0.6 on keyword "palette" but is a color redesign, not favicon work.

---

## Favicon Design

| Option | Description | Selected |
|--------|-------------|----------|
| Recolor only | Same flat circle, 5 fill colors driven by accent-strong token | ✓ |
| Recolor + breathing glyph | Add concentric ring / orb motif; new asset, more design work | |
| Two-tone (bg + accent) | Circle uses palette bg, inner dot uses accent-strong | |

**User's choice:** Recolor only
**Notes:** Minimal, consistent with current flat-circle favicon.

---

## Asset Delivery

| Option | Description | Selected |
|--------|-------------|----------|
| Runtime-recolored SVG data-URI | One SVG template; JS swaps fill, sets link.href to data: URI | ✓ |
| 5 prebuilt static SVG files | favicon-light.svg ... favicon-dusk.svg; JS swaps which file the link points to | |

**User's choice:** Runtime-recolored SVG data-URI
**Notes:** No new static files; single source of truth for the favicon shape.

---

## No-Flash Strategy (FAVI-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Inline pre-paint script | Extend index.html:8 pre-paint script to set favicon href before first paint | ✓ |
| First React effect | useFavicon effect sets favicon on mount; risks brief default-favicon flash | |

**User's choice:** Inline pre-paint script
**Notes:** Reuses the proven THEME-04 no-flash pattern.

---

## Swap Wiring

| Option | Description | Selected |
|--------|-------------|----------|
| New useFavicon hook | Separate hook mirroring useTheme's listener pattern; single responsibility | ✓ |
| Extend useTheme | Add favicon swap into useTheme's apply effect; one listener set | |

**User's choice:** New useFavicon hook
**Notes:** Isolated, independently testable; accepts small event-listener duplication.

---

## Color-Map Sync

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcode + SYNC comment + test | Inline 5 hex values, SYNC comment, automated test asserting match with theme.css | ✓ |
| Hardcode + SYNC comment only | Inline values + sync comment, no automated guard | |

**User's choice:** Hardcode + SYNC comment + test
**Notes:** The inline pre-paint script cannot read theme.css tokens; the test guards against silent desync on future color edits.

---

## Claude's Discretion

- Exact SVG template form and fill-color injection mechanism.
- Where the shared 5-entry hex color map lives so the inline script and useFavicon reference one definition.
- Exact data-URI encoding (raw / URL-encoded / base64).

## Deferred Ideas

- `2026-05-13-themes-aesthetic-refresh.md` — palette color redesign, deferred behind 16.3 thorough redesign.
- Marketing/PWA icons, maskable icons, Apple touch icon — land with PWA-01 (v2).
