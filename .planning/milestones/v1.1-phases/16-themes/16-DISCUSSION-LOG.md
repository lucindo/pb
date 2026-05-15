# Phase 16: Themes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 16-themes
**Areas discussed:** Token architecture + palette scope, System mode + FOUC script, Theme-apply effect placement, THEME-05 reduced-motion contrast validation

---

## Token architecture + palette scope

### T-01: Override pattern for `[data-theme='X']` blocks

| Option | Description | Selected |
|--------|-------------|----------|
| Flat override — re-declare same names | `[data-theme='dark']:root { --color-breathing-bg: …; … }` repeats whichever token names a theme needs to override; same names used by components stay unchanged | ✓ |
| Semantic indirection layer | Add abstract `--bg`/`--surface`/`--accent` layer; existing `--color-breathing-*` become aliases; per-theme blocks change only the abstract layer | |
| You decide | | |

**User's choice:** Flat override — re-declare same names.
**Notes:** Smallest diff, zero semantic-layer abstraction Phase 16 has to invent for itself.

### T-02: Palette scope — what each named palette overrides

| Option | Description | Selected |
|--------|-------------|----------|
| Chrome + orb gradient + rings + modal-backdrop | All ~17 `--color-*` tokens themable; full re-skin per palette | ✓ |
| Chrome only — orb stays teal→blue everywhere | Palettes change page chrome only; orb gradient invariant | |
| Chrome + orb gradient (rings/backdrop fixed) | Middle ground | |
| You decide | | |

**User's choice:** Full re-skin — chrome + orb + rings + backdrop.
**Notes:** Maximum visual distinctiveness; THEME-05 must validate orb-in/out crossfade contrast on the new orb hues.

### T-03: Light theme identity

| Option | Description | Selected |
|--------|-------------|----------|
| Light = current `@theme` baseline (no change) | `[data-theme='light']` either omitted (root `@theme` IS light) or redundant | |
| Light is a fresh preset; current baseline becomes Moss | Rename: current teal-pastel = Moss; Light gets new cool/neutral palette | ✓ |
| You decide | | |

**User's choice:** Light = fresh preset; current baseline becomes Moss.
**Notes:** Acknowledged: v1.0.1 users with OS-light + `DEFAULT_THEME='system'` see a visual change on v1.1 launch.

### T-04: File location + when hexes are locked

| Option | Description | Selected |
|--------|-------------|----------|
| All in `src/styles/theme.css`; hexes locked in PLAN.md | Single file; planner picks exact hexes informed by research | ✓ |
| Split per palette — `src/styles/themes/*.css` | One file per palette; new convention | |
| Single file + lock hex values during this discussion | Long discussion to lock ~85 hexes | |
| You decide | | |

**User's choice:** Single file, hexes deferred to PLAN.md.

---

## System mode + FOUC script

### S-01: How `'system'` resolves at runtime

| Option | Description | Selected |
|--------|-------------|----------|
| JS resolves system → writes `<html data-theme='light'|'dark'>` | matchMedia read; live mql listener updates attribute | ✓ |
| Pure CSS — `[data-theme='system']` uses `@media` | Doubles per-palette token surface inside system block | |
| Hybrid — `data-theme='system'` attribute + CSS `@media` inside | Preserves system-id in attribute for debugging | |
| You decide | | |

**User's choice:** JS resolves system → concrete `data-theme`.

### S-02: FOUC inline script — storage key access

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcode storage key string in inline script | `localStorage.getItem('hrv:state:v1')` literal in `index.html`; CI grep test or comment in `storage.ts` for bump-site | ✓ |
| Build-time inject via Vite define / HTML transform | `%STATE_KEY%` replacement mirroring `%BASE_URL%` favicon pattern | |
| Extract to `.json` / `.ts` constant + dual-read | New file solely for one cross-boundary string | |
| You decide | | |

**User's choice:** Hardcode + comment in storage.ts.

### S-03: FOUC handling of `'system'` + invalid/missing/corrupt envelope

| Option | Description | Selected |
|--------|-------------|----------|
| Inline resolves system via matchMedia, falls back to `'light'` | Catch-all fallback for any error path; first paint matches steady state | ✓ |
| Inline writes raw stored id verbatim; React resolves later | Flash risk for `system` users | |
| Inline writes `'light'` on any uncertainty | OS-dark users see light → dark flash | |
| You decide | | |

**User's choice:** Inline matchMedia + `'light'` fallback.

### S-04: matchMedia listener location + cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| `useEffect` in `useTheme` hook — key: `prefs.theme === 'system'` | Listener attached only when state is system; cleanup on switch | ✓ |
| Always-on listener, gated inside handler | Closure-over-stale-prefs risk | |
| Inside `ThemePicker.tsx` — self-contained | Tied to dialog-open lifecycle — useless when closed | |
| You decide | | |

**User's choice:** `useEffect` keyed on system inside `useTheme`.

---

## Theme-apply effect placement

### A-01: `useTheme` hook contract

| Option | Description | Selected |
|--------|-------------|----------|
| Hook owns state + side effect + write — returns `{ theme, setTheme }` | Single concern; ThemePicker stays thin; no App-state hoist | ✓ |
| Hook is read-only side effect; ThemePicker owns state + write | Hoisting + threading | |
| Hoist theme state into App.tsx + thread via context or props | Over-engineered for one consumer | |
| You decide | | |

**User's choice:** Hook owns everything.

### A-02: useTheme call site

| Option | Description | Selected |
|--------|-------------|----------|
| Call once in App.tsx (always-mounted); ThemePicker reads its own copy via dedicated read hook | App owns mql + write; ThemePicker uses `useThemeChoice`; sync via custom event | ✓ |
| Call useTheme in BOTH App.tsx and ThemePicker; sync via storage event | Two useState instances synced via storage event (same-tab quirk needs manual dispatch anyway) | |
| Hoist useTheme call into App.tsx + add minimal `{theme, onThemeChange}` props to ThemePicker (NOT through SettingsDialog) | Requires breaking Phase 15 D-02 picker contract | |
| You decide | | |

**User's choice:** App-anchored `useTheme` + ThemePicker-side `useThemeChoice` companion hook.

### A-03: Same-tab sync mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Custom event `'hrv:prefs-changed'` dispatched after savePrefs | useTheme listens; reusable for Phase 17/18/19 | ✓ |
| Pub-sub module in `src/storage/prefs-bus.ts` | New abstraction for one consumer | |
| useThemeChoice writes `<html data-theme>` directly + dispatches `'storage'` simulation | Duplicates write logic | |
| You decide | | |

**User's choice:** Custom `'hrv:prefs-changed'` event.

### A-04: Cross-tab listener placement

| Option | Description | Selected |
|--------|-------------|----------|
| Separate listener inside `useTheme` — same `STATE_KEY` filter | Self-contained; two independent listeners on same event are fine | ✓ |
| Extend existing STORAGE-03 listener in App.tsx | Couples Phase 16 to Phase 8 effect | |
| Cross-tab theme sync is out of scope | Acceptable but unnecessary | |
| You decide | | |

**User's choice:** Separate listener inside `useTheme`.

---

## THEME-05 reduced-motion contrast validation

### D-13: How to prove THEME-05 for all 6 themes

| Option | Description | Selected |
|--------|-------------|----------|
| Automated computed-style contrast test per theme | CI-enforced regression guard | ✓ |
| Per-theme manual UAT screenshot review | No automated guard | |
| Design-time hex lock + commented rationale (no runtime test) | No regression guard | |
| Automated test + manual UAT (defense in depth) | Adds calendar time without raising the contract | |

**User's choice:** Automated computed-style contrast test.

### D-14: Contrast metric + threshold

| Option | Description | Selected |
|--------|-------------|----------|
| WCAG relative-luminance contrast on midpoint colors — ≥ 1.5 | Standardized formula; tiny inline helper, no new dep | ✓ |
| Hue distance — ≥ 30° in HSL | Dark theme orb-in/out can share hue while still distinguishable on luminance | |
| Delta-E in CIELAB (perceptually uniform) | More accurate but ~30 LOC color-space helper | |
| You decide | | |

**User's choice:** WCAG luminance ratio ≥ 1.5 on midpoint colors.

### D-15: Test scaffolding

| Option | Description | Selected |
|--------|-------------|----------|
| `src/styles/theme.contrast.test.ts` — iterate THEME_OPTIONS, jsdom getComputedStyle on a probe element | Co-located with theme.css; no React render | ✓ |
| `src/components/BreathingShape.theme.test.tsx` — full component render per theme | Slower, integration-flavored | |
| Pure unit test on parsed hex constants in a new TS module | Parallel source-of-truth drift risk | |
| You decide | | |

**User's choice:** `theme.contrast.test.ts` co-located with theme.css.
**Notes:** Planner action — verify jsdom evaluates `[data-theme]` cascade reliably; fall back to injecting `theme.css` into a `<style>` tag in test setup or switching to happy-dom if needed.

### D-16: Iteration set

| Option | Description | Selected |
|--------|-------------|----------|
| Iterate 5 concrete themes (skip `'system'`) | `['light','dark','moss','slate','dusk']` | ✓ |
| Iterate all 6 ThemeIds including `'system'` | Redundant (system resolves to light/dark) | |
| Iterate 5 + drift guard | Detects schema drift if new ThemeId added without CSS block | |
| You decide | | |

**User's choice:** 5 concrete themes (skip system); drift guard deferred.

---

## Claude's Discretion

None — every gray area resolved to a concrete option. Remaining open items deferred to planner:
- Per-theme concrete hex values (D-04)
- Exact UI shape of the picker (radio buttons / `<select>` / segmented control — Phase 15 D-02 picker contract)
- Exact wiring shape of the `'hrv:prefs-changed'` event detail object (A-03)

## Deferred Ideas

- Schema-drift guard test (D-16)
- Per-theme manual UAT screenshot pass (D-13)
- `pt-BR` display labels for theme names (Phase 19 / I18N-01)
- CIELAB delta-E contrast metric (potential v1.2 upgrade)
- Theme-aware `--shadow-breathing-card` token (D-02 currently `--color-*` only)
- Tailwind v4 `@theme` interaction with descendant override selectors (planner research item)
- `<meta name="theme-color">` pre-load for mobile browser chrome tinting
- `prefers-contrast: more` palette variant
- Cross-theme transition animation (instant switching per ROADMAP SC1)
