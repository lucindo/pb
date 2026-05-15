# Phase 21: Per-Theme Favicon - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Each of the 5 named palettes (Light, Dark, Moss, Slate, Dusk) shows its own
favicon variant in the browser tab and OS task switcher. The favicon swaps
immediately on theme change (same-tab + cross-tab), and the persisted-theme
favicon is applied on initial page load with no flash of the default favicon.

In scope: the 5 favicon variants, the runtime swap wiring, and the no-flash
initial-load path. Covers FAVI-01, FAVI-02, FAVI-03.

Out of scope: marketing/PWA icons, maskable icons, Apple touch icon (those land
with PWA-01). No palette color redesign. No favicon variants beyond the 5
palette themes.
</domain>

<decisions>
## Implementation Decisions

### Favicon visual design
- **D-01:** **Recolor only.** Each of the 5 variants is the same flat circle as
  the current `public/favicon.svg`, with only the fill color changed per
  palette. No glyph, no ring, no two-tone. Rationale: minimal blast radius,
  consistent with the existing flat-circle favicon; the phase goal is "favicon
  matches the palette," not a favicon redesign.
- **D-02:** The per-palette fill color is each palette's
  `--color-breathing-accent-strong` token (the theme signature / primary-action
  color): Light `#5e81ac`, Dark `#81a1c1`, Moss `#35a77c`, Slate `#3760bf`,
  Dusk `#f6c177`. The current favicon's generic teal `#0f766e` is replaced — it
  predates the palette system and matches no theme.

### Asset delivery
- **D-03:** **Runtime-recolored SVG data-URI.** One SVG template (the circle
  markup); JS substitutes the fill color from the resolved palette and sets the
  `<link rel="icon">` `href` to a `data:image/svg+xml,...` URI. No new static
  per-theme files in `public/`. Single source of truth for the favicon shape.

### Swap wiring
- **D-04:** **New `useFavicon` hook.** Mirrors `useTheme.ts`'s listener pattern
  — listens to `hrv:prefs-changed` (same-tab, Pitfall-4 sync primitive) and
  `storage` (cross-tab, `STATE_KEY`) and re-resolves the favicon on each. Kept
  separate from `useTheme` for single responsibility and independent
  testability; accepts the small event-listener duplication. Satisfies FAVI-02.
- **D-05:** When the active theme is `'system'`, the favicon follows the
  resolved `light`/`dark` value — the same resolution `useTheme` already does
  for `data-theme`. No separate "system" favicon.

### No-flash initial load (FAVI-03)
- **D-06:** **Extend the existing index.html pre-paint inline script**
  (`index.html:8`, Phase 16 THEME-04) to also set the favicon `<link>` `href`
  before first paint — the same pattern that already eliminates the theme
  flash. A first-paint React effect was rejected because React hydration runs
  after the initial paint, leaving a default-favicon flash window.
- **D-07:** The inline pre-paint script cannot read `theme.css` tokens (it runs
  before CSS loads), so the 5 `accent-strong` hex values (D-02) must be
  **hardcoded into the inline script**. Manage the resulting sync risk with:
  (a) a `SYNC` comment in `index.html` next to the color map, mirroring the
  existing `STATE_KEY` sync note at `index.html:7`, and (b) an automated test
  asserting the inline color map matches the `--color-breathing-accent-strong`
  tokens in `theme.css`. The same hex map is the single color source the
  `useFavicon` hook uses at runtime.

### Claude's Discretion
- Exact SVG template form and how the fill color is injected (string
  interpolation vs `setAttribute` on a parsed node) — planner/executor choice.
- Where the shared hex color map lives so both the inline script and
  `useFavicon` reference one definition without duplication.
- Exact data-URI encoding (raw vs URL-encoded vs base64).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` §"Phase 21: Per-Theme Favicon" — goal + 3 success criteria.
- `.planning/REQUIREMENTS.md` §"Favicon" — FAVI-01, FAVI-02, FAVI-03.

### Code touch points
- `index.html:5` — `<link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg">`. Swap target.
- `index.html:7-8` — existing Phase 16 THEME-04 pre-paint inline script + `SYNC WITH ... STATE_KEY` comment. Extend per D-06/D-07.
- `public/favicon.svg` — current single flat circle, fill `#0f766e`. The SVG template basis for D-03.
- `src/hooks/useTheme.ts` — `hrv:prefs-changed` + `storage` listener pattern to mirror in `useFavicon` (D-04); `'system'` resolution logic (D-05).
- `src/hooks/useThemeChoice.ts` — dispatches `hrv:prefs-changed` `{ key: 'theme', value }` on theme write; favicon swap rides this same event.
- `src/styles/theme.css` — `--color-breathing-accent-strong` per `[data-theme=...]` block; source of the 5 hex values (D-02) and the sync-test assertion target (D-07).
- `src/storage/storage.ts` — `STATE_KEY` (`hrv:state:v1`); `vite.config` `base: '/hrv/'` requires `%BASE_URL%`-aware paths.

No external ADRs/specs — requirements fully captured in decisions above.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `index.html:8` pre-paint inline script already reads `localStorage` theme,
  resolves `system` → `light`/`dark`, and sets `data-theme` before paint —
  D-06 extends this exact script rather than adding a new one.
- `useTheme.ts` has the complete same-tab (`hrv:prefs-changed`) + cross-tab
  (`storage`/`STATE_KEY`) + `system` matchMedia resolution pattern — `useFavicon`
  copies this shape.
- `useThemeChoice.ts` already dispatches `hrv:prefs-changed` on theme change;
  no new event needs to be introduced for FAVI-02.

### Established Patterns
- Pre-paint inline script for no-flash (THEME-04) — proven pattern for FAVI-03.
- `SYNC WITH ...` comments flag hand-maintained cross-file constants
  (`index.html:7`) — the D-07 color map follows this convention.
- Cross-tab/same-tab dual-event sync: `storage` event does not fire in the
  writing tab (Pitfall 4), so the `hrv:prefs-changed` CustomEvent is mandatory
  for same-tab swaps.
- No hardcoded values without a sync guard — D-07 adds an automated test.

### Integration Points
- New `useFavicon` hook mounts in `App.tsx` alongside `useTheme`.
- The inline pre-paint script and `useFavicon` both consume the same 5-entry
  hex color map — keep one definition referenced by both (Claude's discretion).
</code_context>

<specifics>
## Specific Ideas

Keep it minimal — same circle, just the right color per theme. Favicon color is
the palette's `accent-strong` signature. No-flash on load matters: reuse the
theme pre-paint script, do not introduce a flash via a late React effect.
</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- `2026-05-13-themes-aesthetic-refresh.md` ("Themes: aesthetic palette
  refresh") — reviewed, **not folded**. It is a coordinated redesign of the 5
  palette *colors* (Phase 16 human-verify feedback "all themes are extremely
  ugly"), explicitly deferred behind the 16.3 thorough redesign. Out of scope
  for a favicon phase; remains in the todo backlog.

Marketing/PWA icons, maskable icons, Apple touch icon — land with PWA-01 (v2),
per REQUIREMENTS.md "Out of Scope".
</deferred>

---

*Phase: 21-per-theme-favicon*
*Context gathered: 2026-05-15*
