---
phase: 16-themes
created: 2026-05-12
milestone: v1.1
requirements:
  - THEME-01
  - THEME-02
  - THEME-03
  - THEME-04
  - THEME-05
---

# Phase 16: Themes - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 16 lands the **theme switching system** on top of the Phase 15 settings shell: six themes (Light, Dark, System + Moss, Slate, Dusk) swap via a `data-theme` attribute on `<html>`, persist across reloads through `Envelope.prefs.theme`, and apply pre-paint via an inline `<head>` script that runs before React hydrates.

Deliverables:

1. EDIT `src/styles/theme.css` — `@theme` block becomes the **Light** preset (cool/neutral; current v1.0.1 calm teal-pastel palette migrates into `[data-theme='moss']`). Add five `[data-theme='X']:root { … }` override blocks (dark, moss, slate, dusk; light is the `:root` baseline) that re-declare the same `--color-*` token names — flat override, no semantic indirection layer.
2. EDIT `index.html` — add a synchronous inline `<script>` in `<head>` that reads `localStorage.getItem('hrv:state:v1')`, JSON.parse, extracts `prefs.theme`, resolves `'system'` (and any invalid/missing/throw) via `matchMedia('(prefers-color-scheme: dark)')` with `'light'` as the catch-all fallback, and writes `<html data-theme='light'|'dark'|'moss'|'slate'|'dusk'>` before `<body>` mounts. No flash of unstyled / wrong-theme content.
3. NEW `src/hooks/useTheme.ts` — App-side orchestrator hook called **once** in `App.tsx`. Owns:
   - `useState<ThemeId>(loadPrefs().theme)` seeded at mount;
   - side-effect `useEffect` that writes `document.documentElement.dataset.theme` (resolving `'system'` via matchMedia) whenever state changes;
   - `mql.addEventListener('change', …)` attached **only when state is `'system'`** (mirrors `usePrefersReducedMotion.ts` lifecycle); cleaned up when user switches to a named theme;
   - own `window.addEventListener('storage', …)` filtered on `STATE_KEY` to re-read `loadPrefs().theme` on cross-tab writes;
   - `window.addEventListener('hrv:prefs-changed', …)` to re-read on same-tab writes (the `'storage'` event does NOT fire in the writing tab).
   - Returns `{ theme, setTheme }`.
4. NEW `src/hooks/useThemeChoice.ts` (or co-located inside `ThemePicker.tsx` — planner's call) — picker-side state hook. Reads `loadPrefs().theme` on mount, exposes `setTheme(next)` that calls `savePrefs({ ...loadPrefs(), theme: next })` then `window.dispatchEvent(new CustomEvent('hrv:prefs-changed', { detail: { theme: next } }))`. The custom event is the **only** same-tab sync mechanism back to App's `useTheme`.
5. EDIT `src/components/ThemePicker.tsx` — Phase 15 stub body (`Theme: {prefs.theme}`) becomes a real picker: option list over `THEME_OPTIONS` rendering radio-like buttons / native `<select>` / segmented control (planner picks UI shape), `disabled` gated by Phase 15 D-02 contract, calls `useThemeChoice().setTheme(id)` on selection. **No new prop at the `SettingsDialog` call site** (Phase 15 D-02 invariant preserved).
6. EDIT `src/app/App.tsx` — single new line of `useTheme()` invocation at top of the App body. **No new App state beyond the Phase 15 `settingsDialogOpen`**; the hook is self-contained. (Phase 15 D-05 invariant approximately preserved — `useTheme` adds internal state, App.tsx itself doesn't grow new `useState` calls.)
7. NEW `src/styles/theme.contrast.test.ts` — Vitest THEME-05 guard. `it.each(['light','dark','moss','slate','dusk'])`: set `document.documentElement.dataset.theme`, mount probe `<div class="orb-layer--in">` and `<div class="orb-layer--out">`, read `getComputedStyle().background`, parse the linear-gradient `--from`/`--to` rgb stops, compute midpoint relative-luminance (sRGB → linear → WCAG luminance formula), assert the orb-in vs orb-out luminance contrast ratio ≥ **1.5**. Tiny inline `relativeLuminance(r,g,b)` helper — no new dep. (Planner must verify jsdom can resolve the `[data-theme]` cascade reliably; if not, fall back to injecting the parsed `theme.css` content into a `<style>` tag inside the test setup.)
8. NEW `src/hooks/useTheme.test.ts` (or `.tsx` if RTL needed) — covers: initial mount writes the resolved attribute; `setTheme('dark')` updates state + writes attribute + persists via savePrefs; `setTheme('system')` resolves via matchMedia mock; mql `change` event updates attribute when state is `'system'`, no update when state is named; `'storage'` event with `STATE_KEY` re-reads; `'hrv:prefs-changed'` re-reads; cleanup unsubscribes mql listener on unmount or non-system switch.
9. NEW `src/components/ThemePicker.test.tsx` (Phase 15 already has a smoke test — replace/extend) — renders all 6 options, selecting writes savePrefs + dispatches `'hrv:prefs-changed'`, `disabled` gating preserved, current selection reflected.

**Concrete hex values for each palette (`@theme` Light + four override blocks) are LOCKED IN PLAN.md, not here.** The discussion locked the structure and contract; the planner picks the actual hexes informed by research + the THEME-05 ≥ 1.5 luminance contrast guard.

**Not in scope (Phase 17/18/19 owns):**
- Visual variant rendering (`orb`/`square`/`ring` — Phase 17 / VARIANT-01..07)
- Timbre presets in `cueSynth` (Phase 18 / TIMBRE-01..05)
- Language swap + `learnContent.ts` PT-BR (Phase 19 / I18N-01..05)
- Any edit to `src/domain/settings.ts` (`ThemeId` / `THEME_OPTIONS` / `isValidTheme` / `DEFAULT_THEME` were locked in Phase 14 D-01)
- Any edit to `src/storage/prefs.ts` (`loadPrefs` / `savePrefs` / `coercePrefs` were locked in Phase 14 D-10)
- Any edit to `src/components/SettingsDialog.tsx` (Phase 15 D-01 contract — picker phases NEVER re-edit the dialog)
- Custom `'hrv:prefs-changed'` event consumers for variant/timbre/locale (Phase 17/18/19 may reuse the event but Phase 16 only handles `detail.theme`)

</domain>

<decisions>
## Implementation Decisions

### Token override architecture + palette scope

- **D-01:** **Flat override** of existing `--color-*` token names — each `[data-theme='X']:root { … }` block re-declares the same names already used by components. No semantic indirection layer (no `--bg-token` aliasing). Component classNames like `text-[var(--color-breathing-muted)]` / `bg-[var(--color-breathing-bg)]` keep working with zero churn. Chosen over (b) semantic indirection (requires renaming/aliasing every token + audit every component className for one feature phase) and (c) Claude discretion (collapses to flat — same outcome).

- **D-02:** **Every `--color-*` token is themable** (page chrome + orb gradient + rings + modal backdrop). Each named palette ships a full re-skin: `--color-breathing-bg/-soft/-edge/-surface/-accent/-accent-strong/-muted` + `--color-orb-in-from/-to`, `--color-orb-out-from/-to`, `--color-orb-in-text`, `--color-orb-out-text` + `--color-ring-outer`, `--color-ring-inner` + `--color-modal-backdrop`. Maximum visual distinctiveness; per-theme review must validate THEME-05 reduced-motion crossfade contrast on the new orb hues (D-13). Chosen over (b) chrome-only (palettes feel barely distinct) and (c) chrome + orb only (artificial split — rings are already perceptual neutrals but cohere with the palette better when re-tinted).

- **D-03:** **Light is a fresh preset; the current v1.0.1 teal-pastel `@theme` baseline becomes Moss.** Concretely: `[data-theme='moss']:root { … }` declares the exact current `@theme` values; `:root @theme` is replaced with a new cool/neutral Light palette (planner-locked hexes). Acknowledged consequence: v1.0.1 users with `DEFAULT_THEME='system'` and OS-light will see a visual change at first launch of v1.1 (Light ≠ current teal). This is acceptable because v1.1 is a customization milestone, not a transparent patch — and OS-dark users get the new Dark preset anyway. Chosen over (b) "Light = current teal verbatim" (would force the new Moss palette to be artificially distinct from Light, awkward when Moss = "calm teal" is what users already know).

- **D-04:** **All override blocks live in `src/styles/theme.css`** (single file). `@theme` holds Light; `[data-theme='dark'|'moss'|'slate'|'dusk']:root { … }` blocks follow in source order Dark → Moss → Slate → Dusk. **Per-theme concrete hex values are LOCKED IN PLAN.md**, not in this CONTEXT.md — the planner picks ~85 hexes (17 tokens × 5 palettes) informed by research and the THEME-05 ≥ 1.5 luminance contrast guard. Chosen over (b) split per palette into `src/styles/themes/*.css` (new convention Phase 16 bootstraps for one feature) and (c) lock hexes during this discussion (would extend the CONTEXT step into a multi-hour palette-design exercise).

### System mode resolution + FOUC inline script

- **S-01:** **JS resolves `'system'` to a concrete `'light'` or `'dark'` `data-theme` at runtime.** When `prefs.theme === 'system'`, `useTheme` reads `matchMedia('(prefers-color-scheme: dark)').matches` and writes `<html data-theme='dark'>` or `'light'`. There is **no `[data-theme='system']` CSS branch**. mql `'change'` listener inside `useTheme` updates the attribute live while `state === 'system'`. Chosen over (b) pure CSS `[data-theme='system'] @media` (would double per-palette token surface inside a system block) and (c) hybrid `data-theme='system'` attribute + CSS `@media` (same downsides as b + an extra attribute value that components never consume).

- **S-02:** **FOUC inline script hardcodes the storage key string `'hrv:state:v1'`** (current `STATE_KEY` in `src/storage/storage.ts:35`). A `// SYNC WITH index.html FOUC SCRIPT` comment sits next to the `STATE_KEY` export. Bump-site = single comment; future `STATE_KEY` revisions (`:v2`, etc. per STORAGE-01 docstring) must update `index.html` manually. Chosen over (b) Vite `define`/HTML transform (build-time coupling for a single string) and (c) extract to a dedicated constant file (adds a new file solely for one cross-boundary string).

- **S-03:** **Inline script resolves `'system'` via `matchMedia` and falls back to `'light'` on ANY error path** (missing key, JSON parse fail, missing/invalid `theme` field, matchMedia absent). Concretely:
  ```html
  <script>
  (function(){
    try {
      var raw = localStorage.getItem('hrv:state:v1');
      var t = raw && (JSON.parse(raw).prefs || {}).theme;
      if (t === 'system' || !t || ['light','dark','moss','slate','dusk'].indexOf(t) < 0) {
        t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', t);
    } catch(_) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
  </script>
  ```
  First paint matches the steady state — no flash for OS-dark default users. Chosen over (b) write raw stored id verbatim (would write `data-theme='system'`, which has no CSS branch per S-01 — equivalent to unstyled) and (c) always-`'light'` fallback (OS-dark default users would flash light → dark on hydration).

- **S-04:** **`matchMedia('(prefers-color-scheme: dark)')` change listener lives inside `useTheme`, gated on `state === 'system'`.** `useEffect` attaches the listener only when `theme === 'system'`; cleanup unsubscribes when user switches to any named theme. Mirrors `src/hooks/usePrefersReducedMotion.ts:21-35` listener pattern verbatim (re-seed from live mql in effect for stale-initial-state defense; `addEventListener('change')` + cleanup). Chosen over (b) always-on listener with handler-side gate (closure-over-stale-prefs risk + listener runs needlessly when user has named theme) and (c) listener inside ThemePicker (tied to dialog-open lifecycle — useless when dialog is closed).

### Theme-apply effect placement

- **A-01:** **`useTheme()` (the orchestrator hook) owns prefs.theme React state + the side effect that writes `<html data-theme>` + the matchMedia listener + the cross-tab/same-tab sync listeners + the savePrefs write path.** Returns `{ theme, setTheme }`. Picker UI consumes `setTheme`. App consumes only the mount side-effect (no need to read `theme` itself). Chosen over (b) read-only side-effect hook with state owned by ThemePicker (forces hoisting + threading) and (c) App-hoisted state via context (over-engineered for one consumer + breaks Phase 15 D-05 minimal-App-state posture).

- **A-02:** **`useTheme` is called once from `App.tsx` (always-mounted).** ThemePicker calls a slimmer companion hook `useThemeChoice()` that re-reads `loadPrefs().theme` on mount (when dialog opens) and exposes `setTheme(next)` which calls `savePrefs(...)` then `window.dispatchEvent(new CustomEvent('hrv:prefs-changed', { detail: { theme: next } }))`. App-side `useTheme` listens for `'hrv:prefs-changed'` and re-reads loadPrefs to sync its state. The reason for the split: the always-on mql listener and the cross-tab `'storage'` listener MUST be mounted whenever the app is alive, not gated by dialog-open; ThemePicker mounts only when dialog opens. Phase 15 D-02 "no new props at SettingsDialog call site" is preserved because ThemePicker still accepts only `{ disabled }` and pulls its setter from its own internal hook call.

- **A-03:** **Same-tab sync uses a custom `'hrv:prefs-changed'` event** dispatched after every `savePrefs(...)` in `useThemeChoice.setTheme`. Event detail shape: `{ theme: ThemeId }` (or more generically `{ key: 'theme', value: ThemeId }` — planner picks the more generic shape so Phase 17/18/19 can reuse the same event for variant/timbre/locale changes without redesign). The browser's `'storage'` event does NOT fire in the tab that wrote — this custom event closes that gap. Chosen over (b) a pub-sub module in `src/storage/prefs-bus.ts` (new abstraction Phase 16 bootstraps for one consumer) and (c) ThemePicker writes the `data-theme` attribute directly (duplicates write logic across two hooks).

- **A-04:** **Cross-tab sync uses a separate `window.addEventListener('storage', …)` inside `useTheme`**, filtered on `e.key === STATE_KEY`. The existing Phase 8 STORAGE-03 listener in `App.tsx:116-126` (stats-only) is NOT touched. Two listeners on the same event are fine (independent concerns; both filter on the same key but handle different sub-trees). Chosen over (b) extending the existing STORAGE-03 listener (couples Phase 16 to Phase 8 effect; violates minimal App.tsx edits posture) and (c) declaring cross-tab theme out-of-scope (acceptable but unnecessary given the listener is already cheap).

### THEME-05 reduced-motion contrast validation

- **D-13:** **Automated computed-style contrast test in Vitest** is the primary THEME-05 guard. CI green-gate enforces it on every commit (D-14 carry-forward). No manual UAT screenshot pass is required; per-palette visual review happens informally during the CONTEXT/PLAN review but is NOT a Phase 16 blocker. Chosen over (b) per-theme manual UAT only (no regression guard for future palette tweaks) and (c) design-time hex lock with no runtime test (commented-rationale assertion drifts under future code review) and (d) both automated + manual (manual adds calendar time without raising the contract above what the automated test enforces).

- **D-14:** **Metric: WCAG relative-luminance contrast ratio on midpoint colors, floor ≥ 1.5.** Test computes the midpoint color of `linear-gradient(135deg, --from, --to)` as the per-channel average of `--from` and `--to` (sRGB), converts to linear-RGB, computes WCAG relative luminance `0.2126*R + 0.7152*G + 0.0722*B`, then the contrast ratio `(L_brighter + 0.05) / (L_darker + 0.05)`. Floor 1.5 sits below the Phase 2 D-07 reference baseline (teal-pastel vs blue-pastel midpoint ≈ ~1.8) by enough margin to allow palette choices while still guaranteeing the crossfade is perceptually readable under prefers-reduced-motion. Helper `relativeLuminance(r,g,b)` lives inline in the test file — no new dep, no shared module. Chosen over (b) HSL hue distance ≥ 30° (dark theme may have orb-in and orb-out share hue while still distinguishable on luminance) and (c) CIELAB delta-E (more accurate but ~30 LOC color-space conversion for one consumer is over-investment) and (d) Claude discretion (collapses to luminance).

- **D-15:** **Test file: `src/styles/theme.contrast.test.ts`** co-located with `theme.css`. Iterates with `it.each(['light','dark','moss','slate','dusk'])` (5 concrete themes; `'system'` is skipped — it has no CSS branch per S-01). For each theme: set `document.documentElement.dataset.theme = id`, mount two probe `<div>`s with `className='orb-layer--in'` and `'orb-layer--out'`, read `getComputedStyle(probe).background`, parse the `linear-gradient(135deg, rgb(...), rgb(...))` to extract the two rgb stops, compute midpoint per-channel, compute relative luminance, assert contrast ≥ 1.5. **Planner research action:** verify jsdom evaluates the `@theme` + `[data-theme='X']:root` cascade reliably; if not, fall back to either (a) injecting `theme.css` contents into a `<style>` tag in the test setup or (b) switching this single test file to `happy-dom`. Chosen over (b) full BreathingShape component render per theme (slower, integration-flavored, pulls full tree) and (c) pure unit test on parsed hex constants in a new `src/styles/themePalettes.ts` module (introduces parallel source-of-truth that must stay in sync with `theme.css` — drift risk).

- **D-16:** **Iteration set = 5 concrete themes; `'system'` skipped.** `'system'` resolves to `light` or `dark` at runtime per S-01 — testing it would re-test light or dark depending on the matchMedia mock, providing zero additional coverage. The 5-theme list is `['light','dark','moss','slate','dusk']` matching `THEME_OPTIONS.filter(t => t !== 'system')`. No drift guard added (deferred — see Deferred Ideas). Chosen over (b) iterate all 6 (redundant) and (c) iterate 5 plus a schema-drift guard (deferred until a second `ThemeId` is ever added without an override block).

### Carry-forward invariants (load-bearing for Phase 16)

- **D-17:** **Per-commit green-gate** (Phase 15 D-14 / Phase 14 D-14 / Phase 7 D-09). `npx tsc --noEmit && npm run lint && npm run build && npm test` exits 0 at every commit boundary. Phase 15 baseline at HEAD = 438 tests; Phase 16 adds new tests without modifying existing ones (Phase 15 already-passing `ThemePicker.test.tsx` smoke test is replaced/extended).

- **D-18:** **Zero new npm dependencies** (PROJECT.md v1.1 "Zero net-new runtime deps" invariant + Phase 14 D-15 + Phase 15 D-15 carry-forward). All color math (sRGB → linear → relative luminance, gradient string parsing) is inline in `theme.contrast.test.ts`. No `color`, `chroma-js`, `culori`, etc.

- **D-19:** **Phase 15 D-01 picker contract preserved.** `SettingsDialog.tsx` is NOT edited in Phase 16. `ThemePicker.tsx` body is the only picker file Phase 16 touches; Phase 17/18/19 fill their own picker files in parallel without colliding.

- **D-20:** **Phase 15 D-02 picker prop interface preserved.** `ThemePicker` still accepts ONLY `{ disabled: boolean }`. The `setTheme` setter is sourced from its internal `useThemeChoice()` hook call, not from props. The `disabled` prop continues to gate the option click handlers + visual.

- **D-21:** **Phase 15 D-16 file-split invariant preserved.** Phase 16 does NOT edit `src/domain/settings.ts` (`ThemeId` / `isValidTheme` / `DEFAULT_THEME` / `THEME_OPTIONS` are final from Phase 14 D-01). Phase 16 does NOT edit `src/storage/prefs.ts` (`loadPrefs` / `savePrefs` / `coercePrefs` are final from Phase 14 D-10). Phase 16 ONLY adds new files (`useTheme.ts`, `useThemeChoice.ts` or inline, `theme.contrast.test.ts`, hook tests) + edits `theme.css`, `index.html`, `ThemePicker.tsx`, `ThemePicker.test.tsx`, `App.tsx` (single hook call line). `STATE_KEY` in `src/storage/storage.ts` is touched only to add the `// SYNC WITH index.html FOUC SCRIPT` comment (per S-02).

- **D-22:** **Locked-copy contract preserved** (Phase 15 D-18 carry-forward). New visible strings introduced by Phase 16 are all claim-safe, locked, no marketing:
  - Option labels in `ThemePicker`: `Light`, `Dark`, `System`, `Moss`, `Slate`, `Dusk` (verbatim — the ThemeId values capitalized for first character; no display-mapping function). `System` is shown literally; users learn it follows OS preference from context, not from copy.
  - Section label (already locked in Phase 15 D-18): `Theme`.
  - No description copy ("dark mode for low light", etc.) — Phase 15 D-18 minimal posture continues.

### Claude's Discretion

None — every gray area presented in `present_gray_areas` resolved to a concrete option. The remaining open items are intentionally deferred to the planner (per-theme hex values per D-04, exact UI shape of the picker — radio buttons vs `<select>` vs segmented control — per the Phase 15 D-02 picker contract, exact wiring shape of the custom `'hrv:prefs-changed'` event detail object per A-03).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements / specs

- `.planning/REQUIREMENTS.md` §"Theming" THEME-01 (line 27), THEME-02 (line 28), THEME-03 (line 29), THEME-04 (line 30), THEME-05 (line 31) — the five Phase 16 requirements + traceability table at lines 104-108.
- `.planning/ROADMAP.md` §"Phase 16: Themes" (lines 97-110) — Goal + 5 Success Criteria. SC1 (Light/Dark/System apply on selection + System tracks `prefers-color-scheme`), SC2 (3 named palettes apply via `data-theme`, no utility class changes in TSX), SC3 (FOUC-prevention inline script in `index.html` — no flash of default theme on reload), SC4 (reduced-motion crossfade contrast preserved across all themes), SC5 (`tsc && lint && build && test` exit 0, zero new deps).
- `.planning/PROJECT.md` — v1.1 milestone framing; "Zero net-new runtime deps" invariant (D-18); claim-safe / locked-copy contract (D-22).

### Carry-forward CONTEXT files (decisions Phase 16 inherits)

- `.planning/phases/15-settingsdialog-shell/15-CONTEXT.md` — D-01 (one picker file per dimension — Phase 16 fills `ThemePicker.tsx` body only), D-02 (`{ disabled }`-only prop interface — `setTheme` comes from internal hook, not props), D-04 (read-only stub format being replaced), D-05 (minimal App.tsx state), D-14 (per-commit green-gate), D-15 (zero new deps), D-16 (file-split invariant), D-18 (locked-copy contract).
- `.planning/phases/14-prefs-foundation/14-CONTEXT.md` — D-01 (`ThemeId` enum locked: `'light'|'dark'|'system'|'moss'|'slate'|'dusk'`), D-02 (`THEME_OPTIONS` array), D-03/04 (`DEFAULT_THEME = 'system'`), D-09 (file split — Phase 16 MUST NOT edit `src/domain/settings.ts` or `src/storage/prefs.ts`), D-10 (`loadPrefs`/`savePrefs` API surface consumed verbatim), D-17 (per-field coerce-and-fallback on read — Phase 16 inherits, no defensive seed needed).
- `.planning/milestones/v1.0.1-phases/08-storage-forward-compat-cross-tab-ui-sync/08-CONTEXT.md` — STORAGE-03 cross-tab `'storage'` event pattern (Phase 16 D-A04 attaches its own listener mirroring this shape).
- `.planning/milestones/v1.0-phases/02-orb-visual-guide/` — Phase 2 D-07 reduced-motion crossfade contract (the contract THEME-05 must preserve); D-04 token-naming convention for orb gradient (`--color-orb-in-from/-to`, `--color-orb-out-from/-to`, `--color-orb-in-text`, `--color-orb-out-text`).
- `.planning/milestones/v1.0.1-phases/13-inner-ring-ux-symmetry/` — Phase 13 D-03 + UAT correction reversing reduced-motion ring posture (CSS context for `--color-ring-outer` / `--color-ring-inner` themability per D-02).

### Code patterns (read before implementing)

- `src/styles/theme.css` (169 LOC) — current `@theme` block (lines 1-50) + reduced-motion `@media` block (lines 160-168). Phase 16 edits both. **`@theme` block becomes Light baseline (D-03); 4 new `[data-theme='X']:root` override blocks appended for Dark / Moss / Slate / Dusk (D-04). Moss override block = byte-identical copy of current `@theme` values (D-03).** Reduced-motion `@media` block is NOT moved into per-theme branches — it stays global because the contract (orb scale fixed, ring suppressed, dialog fade off) is theme-independent.
- `src/hooks/usePrefersReducedMotion.ts` (full file, 40 LOC) — **literal template for `useTheme`'s matchMedia listener lifecycle** (S-04). Same `useState` seed + effect re-seed + `addEventListener('change')` + cleanup shape. SSR `!window.matchMedia` guards mirrored.
- `src/app/App.tsx` lines 89-126 — Phase 8 STORAGE-03 `'storage'` event listener (`STATE_KEY` filter, mount/unmount, empty deps). **Literal template for the cross-tab `'storage'` listener inside `useTheme` (A-04).**
- `src/storage/storage.ts` lines 13-35 — `STATE_KEY = 'hrv:state:v1'` declaration + version-bump comment block. Phase 16 adds `// SYNC WITH index.html FOUC SCRIPT` comment next to the export (S-02).
- `src/storage/prefs.ts` lines 24-29 (`UserPrefs` interface), lines 38-40 (`coerceTheme`), lines 68-75 (`loadPrefs` / `savePrefs`). Phase 16 consumer surface — read-only-consumer for `loadPrefs`, write-side for `savePrefs` inside `useThemeChoice`.
- `src/domain/settings.ts` lines 53-61 — `ThemeId` union + `THEME_OPTIONS` + `isValidTheme` + `DEFAULT_THEME`. Phase 16 consumes these as final.
- `src/components/ThemePicker.tsx` (current stub) — replaced by the real picker body. `{ disabled }`-only prop interface preserved (D-20). Internal `loadPrefs()` read replaced by `useThemeChoice()` call.
- `src/components/SettingsDialog.tsx` — **NOT EDITED in Phase 16.** Consumes `ThemePicker` via existing import. Pass-through `inSessionView` → `disabled` chain stays exactly as Phase 15 wired it.
- `src/app/App.tsx` (full file) — only edit is one new line: `useTheme()` invocation inside the `App` function body. Returns nothing the App uses; called for the side effect.
- `index.html` (current 13-LOC stub) — add the synchronous `<script>` from S-03 immediately before `<title>` or immediately after `<meta name="viewport">` (planner picks). Script must be inline (no `src=`) and synchronous (no `async`/`defer`) to guarantee execution before `<body>` parses.

### Tests (mirror these for Phase 16)

- `src/hooks/usePrefersReducedMotion.test.ts` — **literal template for `useTheme.test.ts` matchMedia mocking** (spy `window.matchMedia`, return `{ matches, addEventListener, removeEventListener }` shape; test mount + change + cleanup paths).
- `src/storage/storage.test.ts` lines 79-99 — pattern for forward-compat envelope tests; Phase 16 `useTheme.test.ts` may inject `STATE_KEY` values via `window.localStorage.setItem` for initial-mount tests.
- `src/storage/prefs.test.ts` lines 49-70, 128-151 — `coercePrefs` + `savePrefs` round-trip tests; Phase 16's `useThemeChoice` write test mirrors the `savePrefs` round-trip shape.
- `src/components/ResetStatsDialog.test.tsx` — option-click + persistence pattern (close analog for picker-with-side-effect tests).
- `src/app/App.persistence.test.tsx` lines 353-420 — pattern for dispatching synthetic `StorageEvent` to test cross-tab listener; Phase 16 `useTheme.test.ts` re-uses this pattern for `'storage'` event AND for `'hrv:prefs-changed'` CustomEvent.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`src/hooks/usePrefersReducedMotion.ts`** — full template for `useTheme`'s mql lifecycle. Same `useState` initializer, same effect-mount re-seed, same `addEventListener('change')` + cleanup. `useTheme`'s mql listener is mounted/unmounted in an effect keyed on `theme === 'system'` (S-04), but the inner listener body shape is identical.

- **`src/app/App.tsx:116-126`** — STORAGE-03 `'storage'` event listener with `STATE_KEY` filter is the literal template for `useTheme`'s cross-tab listener (A-04). Same shape, different handler body (re-read `loadPrefs().theme` instead of `loadStats()`).

- **`src/storage/prefs.ts:68-75`** — `loadPrefs(deps?)` consumed in three places in Phase 16: (a) `useTheme` initial state seed, (b) `useTheme` re-read on `'storage'` / `'hrv:prefs-changed'`, (c) `useThemeChoice` initial state seed on mount. `savePrefs(prefs, deps?)` consumed once inside `useThemeChoice.setTheme`. No edit to `prefs.ts`.

- **`src/domain/settings.ts:53-61`** — `THEME_OPTIONS` is the iteration set for `ThemePicker` UI (six buttons / option list) and for the THEME-05 test (minus `'system'`, per D-16).

- **`STATE_KEY = 'hrv:state:v1'`** at `src/storage/storage.ts:35` — the literal string the FOUC inline script reads. Phase 16 adds a comment but does NOT export the literal for build-time injection (S-02).

- **`@theme` block in `src/styles/theme.css:1-50`** — the existing 17 `--color-*` token names are the override surface. Components everywhere already reference these via `var(--color-...)` and Tailwind arbitrary-value classes (`text-[var(--color-breathing-muted)]`, `bg-[var(--color-modal-backdrop)]`, etc.) — flat override (D-01) inherits this whole consumer base for free.

### Established Patterns

- **Native `matchMedia` + `addEventListener('change')` + cleanup** (Phase 2 reduced-motion pattern, `usePrefersReducedMotion.ts:21-35`). Phase 16's `useTheme` mql lifecycle follows this verbatim, gated on `theme === 'system'`.

- **`'storage'` event with `STATE_KEY` filter for cross-tab sync** (Phase 8 STORAGE-03, `App.tsx:116-126`). Phase 16 attaches a second listener with same filter shape, different handler.

- **Per-field coerce-and-fallback on prefs read** (Phase 14 D-17, `prefs.ts:54-66`). Phase 16 inherits — no defensive seed-on-mount needed. `loadPrefs()` always returns a valid `UserPrefs`.

- **Inline SVG, no icon library** (Phase 15 D-15 carry-forward). If `ThemePicker` adds option icons (sun/moon/leaf glyphs etc.), they're hand-coded SVG — planner's call whether to include icons at all.

- **Forward-compat envelope read** (Phase 8 STORAGE-01, `storage.ts:63-107`). The inline FOUC script's hardcoded read of `prefs.theme` survives any future envelope field additions because it only reads one nested path.

- **Per-commit green-gate + zero new deps** (Phase 7 D-09 → Phase 15 D-14/D-15). Phase 16 D-17/D-18 carry forward verbatim.

### Integration Points

- **`src/app/App.tsx`** — single new line of `useTheme()` invocation inside `function App()`. Hook is called for side effect; return value `{ theme, setTheme }` is not consumed by App. No new `useState` in App (Phase 15 D-05 minimal-state posture preserved — `useTheme` owns its own internal state).

- **`index.html`** — new synchronous inline `<script>` block in `<head>` (S-03). No other HTML edits.

- **`src/styles/theme.css`** — `@theme` block edited to hold Light palette (was: calm teal-pastel = current v1.0.1 baseline → becomes: new cool/neutral Light palette, planner-locked hexes). Four new `[data-theme='X']:root { … }` blocks appended in source order Dark → Moss → Slate → Dusk (D-04). Reduced-motion `@media` block (lines 160-168) untouched.

- **`src/components/ThemePicker.tsx`** — stub body replaced by the real picker (option list over `THEME_OPTIONS`, click → `setTheme(id)` from `useThemeChoice`). Prop interface unchanged: `{ disabled: boolean }`.

- **`src/components/SettingsDialog.tsx`** — **NOT EDITED** (Phase 15 D-01 + Phase 16 D-19).

- **`src/storage/storage.ts:35`** — `// SYNC WITH index.html FOUC SCRIPT` comment added next to `STATE_KEY` export. No semantic change.

- **`src/hooks/`** — new files: `useTheme.ts`, `useThemeChoice.ts` (or co-located inside `ThemePicker.tsx` — planner's call), corresponding `.test.ts` / `.test.tsx`.

- **`src/styles/`** — new file: `theme.contrast.test.ts` (D-15).

</code_context>

<specifics>
## Specific Ideas

- **Custom event name `'hrv:prefs-changed'` (not `'hrv:theme-changed'`).** A-03 chose the generic key/value detail shape so Phase 17 (variant), Phase 18 (timbre), Phase 19 (locale) can dispatch the same event with `detail.key = 'variant' | 'timbre' | 'locale'` and reuse the listener pattern. Phase 16 only handles `detail.key === 'theme'` (or absent — for forward compatibility, treat any prefs-changed event as a cue to re-read all prefs). Planner picks the exact detail shape.

- **Moss = the v1.0.1 calm teal-pastel palette, byte-identical.** This preserves the v1.0.1 visual identity inside the named-palette grid for any user who prefers the original look — they pick Moss and get the familiar visuals back. The new Light preset is intentionally distinct (cool/neutral) so the palette grid feels meaningfully expanded rather than "Light + 4 variants of Light".

- **First paint = correct paint.** Combined effect of FOUC script (S-03) + inline matchMedia resolution: a v1.0.1 user on a dark-OS machine landing on v1.1 for the first time sees `[data-theme='dark']` from the very first paint, not a flash of Light → Dark on hydration.

- **`'system'` users who never open the picker should pick up OS dark/light flips live.** A user who launches the app, leaves the tab open, and toggles OS theme mid-session must see the visual flip without reload. mql listener inside `useTheme` (S-04) delivers this; the `inSessionView` gating is NOT relevant — the visual flip is decorative and happens regardless of session state.

</specifics>

<deferred>
## Deferred Ideas

- **Schema-drift guard test** (raised in D-16). A test that asserts every `ThemeId` minus `'system'` has a corresponding `[data-theme='X']:root` block in `theme.css`. Deferred until a second new `ThemeId` is added without an override block (currently a hypothetical — Phase 16 ships all 5 concrete blocks).

- **Per-theme manual UAT screenshot** (raised in D-13). The automated contrast test (D-13/D-14) is the THEME-05 guard; a manual visual sanity pass per theme is informally recommended but not gated. Could become an explicit HUMAN-UAT.md item if user-testing surfaces palette feel issues.

- **Display-mapping for theme names** (raised in D-22). Localized theme labels (`Claro` / `Escuro` etc. for `pt-BR`) live in Phase 19 (`I18N-01` learnContent.ts work). Phase 16 ships English-only labels because Phase 14 D-08 locked the `LocaleId` enum but Phase 19 owns the runtime translation map.

- **CIELAB delta-E contrast metric** (raised in D-14). The WCAG luminance ratio ≥ 1.5 floor is the v1.1 contract; if future palette-design work in v1.2+ wants a perceptually-uniform metric, a `colorMath.ts` helper module could be introduced then.

- **Theme-aware `--shadow-breathing-card`** — currently a fixed `0 24px 80px rgb(15 118 110 / 0.12)` (teal-tinted). Dark theme may want a different shadow tint. Deferred — planner decides whether `--shadow-breathing-card` joins the themable token set (D-02 currently scopes only `--color-*` tokens).

- **`@theme` vs `:root` semantic split** — the existing `@theme` block uses Tailwind v4's `@theme` at-rule (generates Tailwind utility classes from tokens). `[data-theme='X']:root` uses the standard `:root` selector. Mixing the two is unusual but works at runtime; planner should verify Tailwind v4's `@theme` interaction with descendant override selectors during research and confirm no surprises in the build output.

- **Pre-load theme into `<meta name="theme-color">`** — would tint mobile browser chrome (iOS Safari address bar) to match active theme. Deferred to a future polish phase — not in scope for THEME-01..05.

- **`prefers-contrast: more` palette variant** — user-agent preference for higher contrast. Out of scope for v1.1 customization.

- **Theme transition animation** — fade between palettes on switch. CSS `transition: background-color/border-color/color 200ms ease` on the affected elements. Deferred — Phase 16 ships instant switching per ROADMAP SC1 ("immediately applies"), and a transition would risk THEME-05 perceptual contract during the in-flight tween.

</deferred>

---

*Phase: 16-Themes*
*Context gathered: 2026-05-12*
