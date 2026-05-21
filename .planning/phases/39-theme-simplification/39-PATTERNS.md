# Phase 39: Theme simplification — Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 19 (1 new test, 18 surgical edits)
**Analogs found:** 19 / 19

This is a deletion-heavy phase that mirrors Phase 38 almost beat-for-beat: a union-narrowing in `src/domain/settings.ts`, a per-field coerce-on-read that absorbs deprecated persisted values without a `STATE_VERSION` bump, surgical strip of i18n catalogs + tests + CSS, a surgical edit of the inline FOUC script in `index.html`, and a new fs-scan drift-guard test that locks the done-state. The primary analog is `src/content/content.no-variants.test.ts` (Phase 38 VAR-06) — the new Phase 39 drift-guard inherits its scaffolding verbatim with only the forbidden-token list swapped out.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/domain/settings.ts` | domain type (union narrowing) | config | Phase 38 settings.ts `VisualVariantId` block deletion | exact (same union-narrow pattern, different surviving members) |
| `src/storage/prefs.ts` | persistence coercer | CRUD | Phase 38 prefs.ts coercer survivor shape | exact (no body change — `coerceTheme` already correct; return union shrinks) |
| `src/storage/prefs.test.ts` | persistence test (strip + add) | persistence | Phase 38 prefs.test.ts VAR-05 round-trip (commit `4bd5e78`) | exact (Phase 39 adds the up-front THM-05 round-trip; mirrors Phase 38's late-added VAR-05 case) |
| `src/styles/theme.css` | CSS palette blocks | render | Phase 38 theme.css `[data-variant=...]` block deletion | role-match (Phase 38 deleted `[data-variant=...]`; Phase 39 deletes `[data-theme=...]` blocks for moss/slate/dusk) |
| `src/styles/faviconPalette.ts` | favicon palette table | typed-record | Phase 38 settings.ts table-literal collapse | role-match (Record-keyed table shrinks via `Exclude<ThemeId, 'system'>` auto-narrow) |
| `src/styles/faviconPalette.test.ts` | favicon test (strip) | render | Phase 38 prefs.test.ts surgical strip | exact (drop assertions tied to deleted keys) |
| `src/styles/favicon.sync.test.ts` | drift-guard (cross-file sync) | fs-scan + regex parse | self (already 2-entry-shaped via `CONCRETE_THEMES`) | exact (auto-shrinks; only the regex-doc comment ages out) |
| `src/styles/theme.contrast.test.ts` | contrast test (table literal strip) | render | self — table literal deletion only | exact (`Record<Exclude<ThemeId,'system'>, number>` auto-narrows to 2 keys) |
| `src/content/strings.ts` | i18n catalog (type + EN + PT-BR) | typed-record | Phase 38 strings.ts `variants` block + `variantLabel` clean-cut | exact (Phase 38 D-08 ↔ Phase 39 D-07) |
| `src/content/strings.test.ts` | i18n test | render | Phase 38 strings.test.ts (no-op after type narrows) | exact (no body change expected per CONTEXT — verify at plan time) |
| `src/components/ThemePicker.tsx` | picker component | render | self — no body change (`THEME_OPTIONS.map(...)` auto-shrinks) | exact (zero-edit consumer of the union) |
| `src/components/ThemePicker.test.tsx` | picker test (strip) | render | Phase 38 SettingsDialog.test.tsx fixture strip | exact (strip moss/slate/dusk assertions, expect 3 options) |
| `src/hooks/useTheme.ts` | hook | event/state | self — no body change | exact (apply effect only branches `'system'` vs named theme) |
| `src/hooks/useTheme.test.ts` | hook test (strip) | event/state | Phase 38 useVisualVariant.test.ts surgical strip | role-match (strip deprecated-theme fixture seeds — L126/142/143/172/178/182/183) |
| `src/hooks/useThemeChoice.test.ts` | hook test (strip) | event/state | Phase 38 useVariantChoice.test.ts surgical strip | role-match (strip moss/slate/dusk fixture seeds — L32/34/38/42/45/49/53/60/64/68/75/81/103) |
| `src/hooks/useFavicon.ts` | hook | render | self — no body change (`FAVICON_COLORS[theme]` consumer; auto-narrows) | exact |
| `src/hooks/useFavicon.test.ts` | hook test (strip) | render | Phase 38 useVariantChoice.test.ts surgical strip | role-match (strip `seedPrefs('moss')` etc.) |
| `src/app/App.session.test.tsx` | cross-cutting test | render | Phase 38 App.session.test.tsx surgical strip (D-12 ↔ Phase 38 D-10) | exact (CONTEXT notes grep finds at least one moss reference; verify at plan time — current grep shows none beyond the spurious "scale(0.79)" substring matches, so this surface may be zero-edit) |
| `index.html` (inline FOUC script @ L18) | FOUC palette allowlist + color map | request-response (synchronous pre-paint) | self — minified IIFE surgical excision | exact (3 allowlist tokens + 3 hex map entries deleted; IIFE shape preserved) |
| **NEW** `src/content/content.no-removed-themes.test.ts` | drift-guard test | fs-scan | `src/content/content.no-variants.test.ts` (Phase 38 VAR-06) | **exact (verbatim structural twin — only the FORBIDDEN_TOKENS list changes)** |

## Pattern Assignments

Grouped by suggested plan order from CONTEXT §Plan structure (D-78). Planner may merge or split groupings per Tiger-Style atomic-commit judgment.

---

### Plan 1 — Domain type collapse + prefs.test.ts THM-05 lock (D-01 + D-02)

#### `src/domain/settings.ts` — surgical edit (union narrowing)

**Analog:** Phase 38 `src/domain/settings.ts` `VisualVariantId` block deletion (38-PATTERNS.md §"settings.ts (surgical edit — delete variant surface)") — same union-narrow pattern, this time keeping the type and shrinking it instead of deleting it whole.

**Before (lines 97-105):**
```typescript
export type ThemeId = 'light' | 'dark' | 'system' | 'moss' | 'slate' | 'dusk'

export const THEME_OPTIONS = ['light', 'dark', 'system', 'moss', 'slate', 'dusk'] as const satisfies readonly ThemeId[]

export function isValidTheme(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEME_OPTIONS as readonly string[]).includes(v)
}

export const DEFAULT_THEME: ThemeId = 'system'
```

**After:**
```typescript
export type ThemeId = 'light' | 'dark' | 'system'

export const THEME_OPTIONS = ['light', 'dark', 'system'] as const satisfies readonly ThemeId[]

export function isValidTheme(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEME_OPTIONS as readonly string[]).includes(v)
}

export const DEFAULT_THEME: ThemeId = 'system'
```

**Compiler cascade:** Every consumer of `ThemeId` that uses literal `'moss' | 'slate' | 'dusk'` becomes a type error. Primary consumers are: `src/storage/prefs.test.ts` (THEME_OPTIONS iteration — no change needed at runtime; the loop just iterates fewer items), `src/styles/faviconPalette.ts` table literal (the `Record<Exclude<ThemeId, 'system'>, string>` shape forces deletion of moss/slate/dusk keys — the table cannot contain extra keys), `src/styles/theme.contrast.test.ts` `THEME_05_FLOORS` table literal (same auto-narrowing), and `src/content/strings.ts` `themes` block (must drop the 3 fields).

#### `src/storage/prefs.ts` — surgical edit (no body change, return-union narrows)

**Analog:** Phase 38 PATTERNS §"prefs.ts" surviving-coercer shape. The `coerceTheme` body stays identical; only the return type narrows naturally from the settings.ts shrink.

**Before/after (lines 38-40):** identical body — `return isValidTheme(raw) ? raw : DEFAULT_THEME`. The change is invisible at the file level; the function now returns the narrower union because `ThemeId` does.

**THM-05 mechanism:** `isValidTheme('moss')` returns `false` (because `'moss'` is no longer in `THEME_OPTIONS`); `coerceTheme('moss')` → `DEFAULT_THEME` (`'system'`). The persisted-disk value `'moss'` is preserved on disk via `readEnvelope`'s spread-then-override (Phase 8 D-01 envelope tolerance) until the next `savePrefs` call overwrites it.

#### `src/storage/prefs.test.ts` — surgical edit + ADD THM-05 round-trip (D-02)

**Analog A (existing strip):** Phase 38 `38-PATTERNS.md` §"prefs.test.ts (surgical edit — strip variant cases)". Identify and surgically strip moss/slate/dusk hits. The current file iterates `for (const opt of THEME_OPTIONS)` at L111 — that loop is invariant (just iterates fewer items); no edit needed there. No literal moss/slate/dusk strings appear in the current prefs.test.ts (verified via grep); the only edit is the ADD below.

**Analog B (ADD — THM-05 two-level regression):** Phase 38 prefs.test.ts VAR-05 forward-compat case at L79-96 (added late as commit `4bd5e78`). Phase 39 captures it up-front per CONTEXT §specifics.

**Phase 38 VAR-05 pattern (copy structurally):**
```typescript
it('tolerates legacy variant key on persisted envelope — VAR-05 forward-compat (Phase 38 D-01)', () => {
  // VAR-05 / CONTEXT D-01: a returning user with a pre-Phase-38 persisted envelope ...
  const legacySquareEnvelope: unknown = { theme: 'system', timbre: 'bowl', cue: 'labels', locale: 'en', variant: 'square' }
  const coercedSquare = coercePrefs(legacySquareEnvelope)
  expect(coercedSquare).toEqual({ theme: 'system', timbre: 'bowl', cue: 'labels', locale: 'en' })
  // ...
})
```

**Phase 39 D-02 test (two halves):**
```typescript
// Half 1 — read-coerce: seed localStorage with a deprecated theme value, assert loadPrefs() returns 'system'.
it('coerces deprecated persisted theme values to "system" on read — THM-05 (CONTEXT D-02)', () => {
  for (const deprecated of ['moss', 'slate', 'dusk']) {
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 1,
      prefs: { theme: deprecated, timbre: 'bowl', cue: 'arrow', locale: 'en' },
    }))
    expect(loadPrefs().theme).toBe('system')
  }
})

// Half 2 — round-trip: read-coerce → savePrefs → re-read → assert persisted JSON theme is 'system'.
it('re-persists deprecated theme as "system" on the next savePrefs call — THM-05 round-trip (CONTEXT D-02)', () => {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 1,
    prefs: { theme: 'moss', timbre: 'bowl', cue: 'arrow', locale: 'en' },
  }))
  const loaded = loadPrefs()
  expect(loaded.theme).toBe('system')
  savePrefs(loaded)
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { prefs: { theme: string } }
  expect(raw.prefs.theme).toBe('system')  // re-persist completed; deprecated value gone from disk
})
```

**Why two halves:** Half 1 locks the read-side coercer alone. Half 2 locks the "re-persist on next write" contract — if a future hook refactor breaks the mount-time `setTheme(loaded.theme)` flow (or any equivalent flow that triggers a savePrefs on mount), Half 2 catches it. Mirrors Phase 38 VAR-05 commit `4bd5e78`.

**Existing imports to retain:** `STATE_KEY` already imported (L14); `loadPrefs`, `savePrefs` already imported (L8-9).

---

### Plan 2 — CSS deletion + faviconPalette + contrast test + favicon.sync test (D-09 + D-10)

#### `src/styles/theme.css` — surgical edit (delete 3 palette blocks + leading comments)

**Analog:** Phase 38 `theme.css` `[data-variant=...]` block deletion (38-PATTERNS.md §"theme.css (surgical edit — delete CSS variant blocks)"). Phase 39 deletes `[data-theme='X']:root { ... }` blocks instead of `[data-variant='X'] ...`.

**Deletion scope (single wholesale line range):**

Lines 152-320 — Moss leading comment header (L152-192), `[data-theme='moss']:root { ... }` block (L193-211), Slate leading comment header (L213-240), `[data-theme='slate']:root { ... }` block (L241-259), Dusk leading comment header (L261-301), `[data-theme='dusk']:root { ... }` block (L302-320). ~169 LOC total.

**Block 1 — Moss (L193-211):**
```css
[data-theme='moss']:root {
  --color-breathing-bg: #fdf6e3;
  --color-breathing-bg-soft: #f4f0d9;
  --color-breathing-bg-edge: #ffffff;
  --color-breathing-surface: #ffffff;
  --color-breathing-accent: #79b595;
  --color-breathing-accent-strong: #35a77c;
  --color-breathing-muted: #829181;
  --color-breathing-on-accent: #fdf6e3;
  --color-orb-in-from: #bdc3af;
  --color-orb-in-to: #bdc3af;
  --color-orb-out-from: #a2bda5;
  --color-orb-out-to: #a2bda5;
  --color-orb-in-text: #2e3440;
  --color-orb-out-text: #2e3440;
  --color-ring-outer: rgb(189 195 175 / 0.5);
  --color-ring-inner: rgb(92 106 114 / 0.45);
  --color-modal-backdrop: rgb(46 52 64 / 0.3);
}
```

**Block 2 — Slate (L241-259) and Block 3 — Dusk (L302-320):** same shape, different hex values; both deleted wholesale.

**Comment headers (L152-192, L213-240, L261-301):** the multi-paragraph rationale comments that precede each block delete with the block — Tiger Style "WHY no longer informs" (Phase 37 PATTERNS reused in Phase 38 PATTERNS §SettingsDialog comment-debt section).

**Audit invariant:** `grep -n "data-theme=" src/styles/theme.css` after deletion returns exactly one line — L132 `[data-theme='dark']:root {` (the surviving dark palette block).

**Light + dark UNCHANGED:** Light is the `@theme` baseline (no `data-theme` block). Dark stays at L132 with current Nord accent (Phase 41 will retune to Mono Zen). Phase 39 only deletes the rejected 3 palettes — CONTEXT §specifics.

#### `src/styles/faviconPalette.ts` — surgical edit (table-literal collapse)

**Analog:** the `Record<Exclude<ThemeId, 'system'>, X>` shape pattern (described in CONTEXT §"Established Patterns"). After `ThemeId` shrinks in Plan 1, `Exclude<ThemeId, 'system'>` auto-narrows from `'light' | 'dark' | 'moss' | 'slate' | 'dusk'` to `'light' | 'dark'`. TypeScript will hard-fail compile if the table contains extra keys.

**Before (lines 12-18):**
```typescript
export const FAVICON_COLORS: Record<Exclude<ThemeId, 'system'>, string> = Object.freeze({
  light: '#5e81ac',
  dark: '#81a1c1',
  moss: '#35a77c',
  slate: '#3760bf',
  dusk: '#f6c177',
})
```

**After:**
```typescript
export const FAVICON_COLORS: Record<Exclude<ThemeId, 'system'>, string> = Object.freeze({
  light: '#5e81ac',
  dark: '#81a1c1',
})
```

**Sync-comment update:** the leading comment at L9-11 currently says "These 5 hex values mirror the --color-breathing-accent-strong token per [data-theme] block." Update to "These 2 hex values mirror the --color-breathing-accent-strong token per [data-theme] block." (mechanical "5" → "2"). The SVG template + `buildFaviconDataUri` signature (`theme: Exclude<ThemeId, 'system'>`) are unchanged — the type auto-narrows.

#### `src/styles/faviconPalette.test.ts` — surgical edit (strip 3 hex tests + 5-key assertion)

**Analog:** Phase 38 `prefs.test.ts` surgical strip (38-PATTERNS.md §"prefs.test.ts (surgical edit — strip variant cases)").

**Edits:**

1. **L17-18** — update key-count assertion:
   - Before: `expect(Object.keys(FAVICON_COLORS)).toHaveLength(5)`
   - After: `expect(Object.keys(FAVICON_COLORS)).toHaveLength(2)`

2. **L16** — update describe label:
   - Before: `it('has exactly 5 keys (no system key)', () => {`
   - After: `it('has exactly 2 keys (light + dark, no system key)', () => {`

3. **L29-39** — delete the 3 individual hex assertions for `moss`, `slate`, `dusk`:
```typescript
// DELETE:
it('moss === #35a77c', () => {
  expect(FAVICON_COLORS.moss).toBe('#35a77c')
})
it('slate === #3760bf', () => {
  expect(FAVICON_COLORS.slate).toBe('#3760bf')
})
it('dusk === #f6c177', () => {
  expect(FAVICON_COLORS.dusk).toBe('#f6c177')
})
```

4. **L41-45** — `CONCRETE_THEMES` iteration test stays; loop iterates 2 items instead of 5 (no body change).

5. **L88-101** — delete the 3 `buildFaviconDataUri('moss'|'slate'|'dusk')` hex-presence tests:
```typescript
// DELETE all three:
it('output contains the per-theme hex (moss)', () => { ... })
it('output contains the per-theme hex (slate)', () => { ... })
it('output contains the per-theme hex (dusk)', () => { ... })
```

#### `src/styles/favicon.sync.test.ts` — auto-shrink (zero edit at runtime; doc comment ages out)

**Analog:** self — the file is already shaped around `CONCRETE_THEMES = THEME_OPTIONS.filter(t => t !== 'system')` (L22-24), so the `describe.each(CONCRETE_THEMES)` auto-iterates 2 themes after Plan 1.

**Optional comment update (Tiger Style WHY-only):** L37 docstring says "Light's value is in the base @theme block; dark/moss/slate/dusk in their [data-theme='X']:root override blocks." → "Light's value is in the base @theme block; dark in its [data-theme='dark']:root override block." (mechanical edit; not strictly required for the test to pass — the regex builder uses `${themeId}` interpolation, not enumerated strings).

**THM-07 verification:** the test iterates `CONCRETE_THEMES` and parses theme.css + index.html for each. After Plan 2's theme.css deletion + the Plan 4 index.html FOUC edit, both regexes return exactly the light + dark hex values, and the cross-file assertions pass.

#### `src/styles/theme.contrast.test.ts` — surgical edit (table literal strip — D-09)

**Analog:** self — the `Record<Exclude<ThemeId,'system'>, number>` shape pattern. After Plan 1, the type auto-narrows; the table literal MUST drop the 3 deprecated keys or `tsc` fails.

**Before (lines 132-138):**
```typescript
const THEME_05_FLOORS: Record<Exclude<ThemeId, 'system'>, number> = {
  light: 1.15,
  dark: 1.5,
  moss: 1.1,
  slate: 1.5,
  dusk: 1.5,
}
```

**After:**
```typescript
const THEME_05_FLOORS: Record<Exclude<ThemeId, 'system'>, number> = {
  light: 1.15,
  dark: 1.5,
}
```

**Comment-debt update:** L4-5 docstring says "midpoint colors, iterated over the 5 concrete themes (light, dark, moss, slate, dusk)." → "midpoint colors, iterated over the 2 concrete themes (light, dark)." Tiger Style WHY-only.

**Auto-shrinking machinery (no edit needed at L124-126):**
```typescript
const CONCRETE_THEMES = THEME_OPTIONS.filter(
  (t): t is Exclude<ThemeId, 'system'> => t !== 'system',
)
```
This already filters `THEME_OPTIONS`, so it shrinks from 5 → 2 once `THEME_OPTIONS` is collapsed in Plan 1. `describe.each(CONCRETE_THEMES)` (L140) auto-iterates 2 themes. **THM-08 satisfied with zero scaffold edits.**

---

### Plan 3 — i18n strings + ThemePicker test (D-07)

#### `src/content/strings.ts` — surgical edit (type + EN + PT-BR catalog clean-cut)

**Analog:** Phase 38 `38-PATTERNS.md` §"strings.ts (surgical edit — typed-catalog block deletion)". Phase 38 deleted the entire `variants` block + the `variantLabel` row; Phase 39 strips 3 fields from the inside of an existing block (`themes`).

**Pattern from Phase 38 (preserved):** Delete the type-level fields first, then `tsc --noEmit` flags the EN + PT-BR catalog rows; delete those next.

**Type deletions (UiStrings interface, L39-41):**
```typescript
// Before:
readonly themes: {
  readonly light: string
  readonly dark: string
  readonly system: string
  readonly moss: string     // delete
  readonly slate: string    // delete
  readonly dusk: string     // delete
}

// After:
readonly themes: {
  readonly light: string
  readonly dark: string
  readonly system: string
}
```

**EN catalog deletions (L197-199 — inside the `themes` block of the `en` catalog):**
```typescript
// Before (L193-200):
themes: {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  moss: 'Moss',     // delete
  slate: 'Slate',   // delete
  dusk: 'Dusk',     // delete
},

// After:
themes: {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
},
```

**PT-BR catalog deletions (L353-355 — inside the `themes` block of the `pt-BR` catalog):**
```typescript
// Before (L349-356):
themes: {
  light: 'Claro',
  dark: 'Escuro',
  system: 'Sistema',
  moss: 'Musgo',         // delete
  slate: 'Ardósia',      // delete
  dusk: 'Crepúsculo',    // delete
},
```

**LOCKED_COPY guard (Phase 19 I18N + Phase 26 I18N-07):** None of these strings are in `LOCKED_COPY` (only Forrest/medical claim-safe copy is — CONTEXT §"Established Patterns"). The byte-equality guard is unaffected. Phase 26 `content.no-review-markers.test.ts` also intact (no review markers are introduced; the strings disappear entirely).

#### `src/content/strings.test.ts` — likely zero-edit (verify at plan time)

**Analog:** Phase 38 `38-PATTERNS.md` §"strings.test.ts" — Phase 38 deleted the `'every locale has variants entries'` test. The current Phase 39 `strings.test.ts` grep shows zero `moss`/`slate`/`dusk` / `Moss`/`Slate`/`Dusk` / `Musgo`/`Ardósia`/`Crepúsculo` hits. Likely no edit; verify at plan time with `grep -n "themes\." src/content/strings.test.ts`.

#### `src/components/ThemePicker.tsx` — ZERO edit (auto-shrink consumer)

**Pattern (verbatim from CONTEXT §"Integration Points"):** `THEME_OPTIONS.map(id => ...)` (L32) auto-shrinks from 6 → 3 once `THEME_OPTIONS` shrinks in Plan 1. The `id` is typed `ThemeId`, so the closure body still type-checks. No JSX change. The L8 comment ("English-locked labels (Light/Dark/System/Moss/Slate/Dusk verbatim)") is the only WHY-debt; update to "English-locked labels (Light/Dark/System verbatim)" per Tiger Style.

#### `src/components/ThemePicker.test.tsx` — surgical edit (strip 6-option assertions + moss/slate/dusk seedTheme calls)

**Analog:** Phase 38 `SettingsDialog.test.tsx` fixture strip (38-PATTERNS.md §"SettingsDialog.test.tsx") — strip option-list assertions, narrow fixture seeds, drop deprecated-key references.

**Key edits (concrete excerpts from current file):**

1. **L37-43** — update label list + count:
```typescript
// Before:
it('renders all 6 options as radio buttons with correct labels in order', () => {
  ...
  expect(radios).toHaveLength(6)
  const labels = Array.from(radios).map((b) => b.textContent)
  expect(labels).toEqual(['Light', 'Dark', 'System', 'Moss', 'Slate', 'Dusk'])
})

// After:
it('renders all 3 options as radio buttons with correct labels in order', () => {
  ...
  expect(radios).toHaveLength(3)
  const labels = Array.from(radios).map((b) => b.textContent)
  expect(labels).toEqual(['Light', 'Dark', 'System'])
})
```

2. **L45-56** — replace the `seedTheme('moss')` / Moss button test. Pick a surviving theme as the seeded selection (e.g. `seedTheme('dark')`; assert Dark is aria-checked). Phase 38 precedent: rotate to a surviving value rather than delete the case.

3. **L58-70** — replace `slateButton` test. Click `'System'` instead (e.g. `seedTheme('light')` → click System → assert stored theme === `'system'`). Preserves the click-writes-to-disk semantics with surviving theme IDs.

4. **L96-109** — replace the `duskButton` disabled-click test. Click `'System'` (or `'Dark'`) instead.

5. **L111-117** — replace the `seedTheme('dusk')` aria-checked-while-disabled test. Use `seedTheme('system')` and `systemButton`.

**Tiger Style note:** the cases are SEMANTICALLY about "click writes / disabled blocks / aria-checked tracks state" — the choice of theme is incidental. Rotating to a surviving theme preserves the behavioral coverage without losing test cases.

#### `src/hooks/useTheme.test.ts` — surgical edit (strip moss/dusk fixture seeds)

**Analog:** Phase 38 `useVisualVariant.test.ts` surgical strip — rotate deprecated-value fixtures to surviving values.

**Hits to rotate (from grep):**
- L126: `prefs: { theme: 'moss', timbre: 'bowl', locale: 'en' },` → rotate `'moss'` → `'dark'` (any surviving non-system theme).
- L142-143: `expect(result.current.theme).toBe('moss')` + `expect(document.documentElement.dataset.theme).toBe('moss')` → assert `'dark'`.
- L172: `seedPrefs('dusk')` → `seedPrefs('dark')`.
- L178: `new CustomEvent('hrv:prefs-changed', { detail: { key: 'theme', value: 'dusk' } })` → `value: 'dark'`.
- L182-183: same — assert `'dark'`.

**Note:** the surviving themes set is `light | dark | system`. The cross-tab-change test needs the NEW theme to differ from the seeded value, so `dark` ↔ `light` works for the rotation. Avoid `system` for the dataset-attribute assertion (system doesn't write a `data-theme` attribute — useTheme's apply effect only writes for named themes).

#### `src/hooks/useThemeChoice.test.ts` — surgical edit (rotate moss/dusk/slate fixtures)

**Analog:** Phase 38 `useVariantChoice.test.ts` surgical strip — same rotation pattern.

**Hits to rotate (from grep, all in L32-103):**
- L32, L38, L49, L64, L81, L103: `seedPrefs(..., theme: 'moss')` → `theme: 'dark'`.
- L34: `expect(result.current.theme).toBe('moss')` → `'dark'`.
- L42, L53: `result.current.setTheme('dusk')` → `setTheme('system')` or `setTheme('light')`.
- L45, L60: `expect(...).toBe('dusk')` → assert the rotated value.
- L68: `setTheme('slate')` → `setTheme('system')`.
- L75: `expect(raw.prefs.theme).toBe('slate')` → assert `'system'`.

**Rotation strategy:** pick two distinct surviving themes so the "before → after" delta is non-trivial. `'dark'` (seed) → `'system'` (set), or `'light'` (seed) → `'dark'` (set), are both clean rotations.

#### `src/hooks/useFavicon.test.ts` — surgical edit (strip moss seedPrefs call)

**Hit:** L81 `seedPrefs('moss')` → rotate to `'dark'`. Single-line edit. Verify with grep at plan time for any additional hits.

---

### Plan 4 — index.html FOUC script (D-08)

#### `index.html:18` — surgical edit (preserve minified IIFE shape)

**Analog:** self (no Phase 38 analog — Phase 38 didn't touch index.html). Pattern: surgical excision within a minified one-line IIFE; preserve every byte not in the deletion scope.

**Before (the full L18 IIFE — relevant fragments below; the rest is unchanged):**
```javascript
// Allowlist (3-token deletion):
if(t==='system'||!t||['light','dark','moss','slate','dusk'].indexOf(t)<0)

// Color map (3-entry deletion):
var c={'light':'#5e81ac','dark':'#81a1c1','moss':'#35a77c','slate':'#3760bf','dusk':'#f6c177'};
```

**After (same two fragments):**
```javascript
// Allowlist:
if(t==='system'||!t||['light','dark'].indexOf(t)<0)

// Color map:
var c={'light':'#5e81ac','dark':'#81a1c1'};
```

**Touch-point count (CONTEXT D-08):** exactly 2 fragments within L18. No third edit:
- The matchMedia fallback (`t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';`) already writes only `'light'` or `'dark'` — no moss/slate/dusk hex reference there.
- The catch fallback (`document.documentElement.setAttribute('data-theme','light');setFav(favUri('#5e81ac'));`) already writes only `'light'` — no edit needed.

**No structural change:** IIFE wrapper preserved. The pre-paint contract (FOUC-free first paint, `data-theme` written before render, favicon set synchronously) survives. Phase 41 (Mono Zen) will retune the surviving 2 hex values in the `c` map; Phase 39 only deletes the 3 deprecated ones.

**Returning-user behavior (THM-05 in pre-paint context):** a returning user with `localStorage.prefs.theme === 'moss'` reads `t === 'moss'`; the surgically-shrunk allowlist `['light','dark'].indexOf('moss') < 0` is TRUE, so the fallback branch runs and resolves to OS-active (light or dark). No FOUC, no flicker, no broken favicon. The persisted `'moss'` value reads through coercePrefs as `'system'` once React mounts (Plan 1's THM-05 mechanism).

**Audit invariant:** `grep -n "moss\|slate\|dusk" index.html` returns zero results after this edit.

---

### Plan 5 — drift-guard test (D-03..D-06)

#### **NEW** `src/content/content.no-removed-themes.test.ts` — drift-guard test

**Analog (load-bearing, verbatim structural twin):** `src/content/content.no-variants.test.ts` (Phase 38 VAR-06). The Phase 39 file copies the Phase 38 file's entire scaffolding — same triple-slash node-types reference, same imports, same `collectFiles` recursive helper with the `.ts/.tsx/.css` extension filter, same four-root scope (`COMPONENTS_DIR`, `APP_DIR`, `CONTENT_DIR`, `STYLES_DIR`), same `SCAN_FILES` flat concatenation, same `Array<{ label: string; match: (text: string) => boolean }>` token-list shape, same two-case describe block (sanity floor + the main sweep). **Only the FORBIDDEN_TOKENS list changes.**

**Imports + helper (copy verbatim from `content.no-variants.test.ts:24-67`):**
```typescript
/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      collectFiles(full, acc)
    } else if (
      (entry.endsWith('.ts') || entry.endsWith('.tsx') || entry.endsWith('.css')) &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.test.tsx')
    ) {
      acc.push(full)
    }
  }
  return acc
}

const COMPONENTS_DIR = resolve(__dirname, '..', 'components')
const APP_DIR        = resolve(__dirname, '..', 'app')
const CONTENT_DIR    = resolve(__dirname)
const STYLES_DIR     = resolve(__dirname, '..', 'styles')

const SCAN_FILES: string[] = [
  ...collectFiles(COMPONENTS_DIR),
  ...collectFiles(APP_DIR),
  ...collectFiles(CONTENT_DIR),
  ...collectFiles(STYLES_DIR),
]
```

**Forbidden-token list (CONTEXT D-04 — replaces the Phase 38 VAR-06 list):**

```typescript
const FORBIDDEN_TOKENS: Array<{ label: string; match: (text: string) => boolean }> = [
  // Plain substring (case-sensitive identifier / key references — 3 lowercase tokens)
  { label: "'moss' (theme id)",  match: (t) => t.includes('moss') },
  { label: "'slate' (theme id)", match: (t) => t.includes('slate') },
  { label: "'dusk' (theme id)",  match: (t) => t.includes('dusk') },
  // Plain substring (case-sensitive EN display strings — 3 capitalized tokens)
  { label: "'Moss' (EN display string)",  match: (t) => t.includes('Moss') },
  { label: "'Slate' (EN display string)", match: (t) => t.includes('Slate') },
  { label: "'Dusk' (EN display string)",  match: (t) => t.includes('Dusk') },
  // Plain substring (PT-BR display strings — D-04 errs on inclusion per Claude's Discretion)
  { label: "'Musgo' (PT-BR Moss)",       match: (t) => t.includes('Musgo') },
  { label: "'Ardósia' (PT-BR Slate)",    match: (t) => t.includes('Ardósia') },
  { label: "'Crepúsculo' (PT-BR Dusk)",  match: (t) => t.includes('Crepúsculo') },
  // Regex — persisted-value literals (catches `theme: 'moss'` / `theme: 'slate'` / `theme: 'dusk'`)
  {
    label: "theme: 'moss'/'slate'/'dusk' (persisted-pref literal)",
    match: (t) => /theme:\s*['"](moss|slate|dusk)['"]/.test(t),
  },
  // Regex — CSS attribute selectors (catches theme.css re-entry)
  {
    label: "[data-theme='moss'/'slate'/'dusk'] CSS selector",
    match: (t) => /\[data-theme=['"]?(moss|slate|dusk)['"]?\]/.test(t),
  },
  // Regex — object-key entries (catches favicon palette / contrast floors / etc. re-entry)
  {
    label: "'moss'/'slate'/'dusk':  object-key entry",
    match: (t) => /['"](moss|slate|dusk)['"]\s*:/.test(t),
  },
]
```

**WARNING — case-sensitivity collision with "Slate" word:** the substring `'Slate'` (capitalized) can collide with English prose containing the unrelated word "slate" in comments or copy. The Phase 39 codebase grep shows zero such collisions (the word does not appear in surviving code/CSS/i18n). If a future contributor writes a comment like "this color is a slate grey", the guard will flag it — that's intentional friction per CONTEXT D-06 ("any future deliberate phase that re-introduces a deprecated palette explicitly deletes this drift-guard test with rationale logged in its SUMMARY"). The lowercase `'slate'` is broader; if false-positive friction proves excessive, the planner may tighten Slate to the persisted-pref regex + CSS selector regex only and drop the plain-substring entry — but CONTEXT D-04 errs on inclusion.

**Describe block (copy verbatim from `content.no-variants.test.ts:104-133`; change only the describe label + failure-message context):**
```typescript
describe('Phase 39 drift-guard: no removed theme tokens (CONTEXT D-04 / D-05 / D-06)', () => {
  it('scans a non-empty set of production files', () => {
    expect(
      SCAN_FILES.length,
      'Phase 39 drift-guard scanned zero files — collectFiles or scan-root resolve is broken',
    ).toBeGreaterThan(10)
  })

  it('no forbidden moss/slate/dusk token appears in src/components/, src/app/, src/content/, or src/styles/', () => {
    const hits: string[] = []
    for (const file of SCAN_FILES) {
      const text = readFileSync(file, 'utf-8')
      for (const token of FORBIDDEN_TOKENS) {
        if (token.match(text)) {
          hits.push(`${file}: ${token.label}`)
        }
      }
    }
    expect(
      hits,
      `Forbidden moss/slate/dusk tokens found (Phase 39 3-theme-only invariant violated):\n${hits.join('\n')}`,
    ).toEqual([])
  })
})
```

**Self-exclusion:** the test file's filename `content.no-removed-themes.test.ts` ends in `.test.ts`, which is excluded by the `collectFiles` reject clause. The file contains literal `'moss'`, `'slate'`, `'dusk'`, etc. inside the `t.includes(...)` and regex bodies — without the test-file exclusion, the guard would self-flag.

**WHY this file exists (header comment, adapted from Phase 38 VAR-06 header):**
```typescript
// src/content/content.no-removed-themes.test.ts
//
// Phase 39 drift-guard (CONTEXT D-03 / D-04 / D-05 / D-06).
//
// Scanned roots: src/components/, src/app/, src/content/, src/styles/
//   - components/ + app/ cover all render paths.
//   - content/ catches moss/slate/dusk i18n copy re-entering via strings.ts.
//   - styles/ catches [data-theme='moss'/'slate'/'dusk'] CSS rules re-entering
//     via theme.css.
//
// Forbidden token classes (CONTEXT D-04):
//   1. Plain substring — 9 entries (lowercase theme ids + EN display strings + PT-BR display strings)
//   2. Regex — persisted-pref literals (theme: 'moss'/'slate'/'dusk')
//   3. Regex — CSS attribute selectors ([data-theme='moss'/'slate'/'dusk'])
//   4. Regex — object-key entries ('moss'/'slate'/'dusk': — catches favicon palette / contrast floor / etc.)
//
// WHY this file exists (CONTEXT D-06): Phase 39 collapsed the 5-palette theme system
// to 3 options (light / dark / system) per the spike-010 visual lock. This drift-guard
// locks that done-state against future regressions. It is the lock — any future phase
// that re-introduces a deprecated palette (or claims one of these reserved names)
// explicitly deletes this file with rationale recorded in that phase's SUMMARY.
// Deleting this file is the intentional unlock.
//
// Analog: src/content/content.no-variants.test.ts (Phase 38 VAR-06 — verbatim structural twin)
```

**Placement rationale (CONTEXT §"Plan structure" + Phase 38 PATTERNS):** collocate with `content.no-stats-ui.test.ts` (Phase 37) and `content.no-variants.test.ts` (Phase 38) so future readers find all three drift-guards via the same `src/content/content.*` glob. Planner may pick `src/styles/no-removed-themes.test.ts` if path scoping reads cleaner (D-03 admits the alternate location).

---

## Shared Patterns

### Pattern: No `STATE_VERSION` bump — per-field coerce + envelope tolerance

**Source:** Phase 8 D-01 envelope tolerance (`src/storage/envelope.ts` `readEnvelope` — spread-then-override pattern) + Phase 14 per-field non-throwing coercer (`coerceTheme`, `coerceTimbre`, `coerceCue`, `coerceLocale` in `src/storage/prefs.ts`).

**Apply to:** Plan 1 (domain narrowing + prefs.test.ts THM-05 lock) + the implicit invariant across all 5 plans.

**Concrete excerpt (`src/storage/prefs.ts:38-40`):**
```typescript
export function coerceTheme(raw: unknown): ThemeId {
  return isValidTheme(raw) ? raw : DEFAULT_THEME
}
```

**Mechanism:** `isValidTheme('moss')` returns `false` after the union narrowing (Plan 1) → `coerceTheme('moss')` returns `DEFAULT_THEME` (`'system'`). The persisted-disk value `'moss'` is preserved on disk via `readEnvelope`'s spread-then-override (Phase 8 D-01) until the next `savePrefs` call overwrites it. **Same stance as Phase 38** — CONTEXT D-01.

### Pattern: `Record<Exclude<ThemeId, 'system'>, X>` auto-narrowing

**Source:** `FAVICON_COLORS` (`src/styles/faviconPalette.ts:12`), `THEME_05_FLOORS` (`src/styles/theme.contrast.test.ts:132`), `CONCRETE_THEMES` filter pattern (`src/styles/favicon.sync.test.ts:22-24`, `src/styles/faviconPalette.test.ts:11-13`, `src/styles/theme.contrast.test.ts:124-126`).

**Apply to:** Plan 2 — `faviconPalette.ts`, `theme.contrast.test.ts`, and (auto-shrinking) `favicon.sync.test.ts`, `faviconPalette.test.ts`.

**Concrete excerpt (`src/styles/favicon.sync.test.ts:22-24`):**
```typescript
const CONCRETE_THEMES = THEME_OPTIONS.filter(
  (t): t is Exclude<ThemeId, 'system'> => t !== 'system',
)
```

**Mechanism:** once `THEME_OPTIONS` shrinks in Plan 1, this filter shrinks from 5 → 2 elements (only `light | dark` survive). All `describe.each(CONCRETE_THEMES)` callers auto-iterate the surviving set. No edit needed at these sites — TypeScript narrows the union; the filter narrows the runtime array.

### Pattern: Drift-guard-as-lock + exit-ramp policy

**Source:** Phase 26 I18N-07 (`src/content/content.no-review-markers.test.ts`), Phase 37 STATS-05 (`src/content/content.no-stats-ui.test.ts`), Phase 38 VAR-06 (`src/content/content.no-variants.test.ts`).

**Apply to:** Plan 5 — `content.no-removed-themes.test.ts`.

**Concrete excerpt (from Phase 38 `content.no-variants.test.ts:17-22`):**
```typescript
// WHY this file exists (CONTEXT D-06): Phase 38 deleted all forbidden variant tokens
// from the scanned roots. This drift-guard locks that done-state against future regressions.
// It is the lock — future re-introduction of a shape variant system is a deliberate phase
// decision that explicitly deletes this file with rationale recorded in that phase's SUMMARY.
// Deleting this file is the intentional unlock.
```

**Apply verbatim** (with "variant" → "deprecated theme palette" substitution) to the Phase 39 drift-guard's header comment.

### Pattern: Surgical strip with rotation (not delete) for cross-cutting test fixtures

**Source:** Phase 38 PATTERNS §"App test files" surgical strip pattern (38-PATTERNS.md §App.session.test.tsx) + Phase 37 D-07 surgical-strip precedent.

**Apply to:** Plan 3 — `useTheme.test.ts`, `useThemeChoice.test.ts`, `useFavicon.test.ts`, `ThemePicker.test.tsx`, possibly `App.session.test.tsx`.

**Rotation strategy (vs Phase 38 deletion):** Phase 38 deleted tests whose subject (the variant axis) was being deleted wholesale. Phase 39 keeps the subject (the theme axis) — only specific theme IDs are deleted. Tests that exercise behavior (`setTheme → savePrefs → loadPrefs → assert`, etc.) should rotate the deprecated theme ID to a surviving one rather than delete the case. This preserves coverage of the behavioral contract while removing the deprecated symbols.

**Concrete rotation:** any `seedTheme('moss')` → `seedTheme('dark')`; any `setTheme('dusk')` → `setTheme('system')` or `setTheme('light')`; preserve a non-trivial before/after delta within the test.

### Pattern: Atomic commit per logical layer (Tiger Style)

**Source:** Tiger Style "small atomic commits" reinforced by Phase 36/37/38 PATTERNS commit-grouping recommendations.

**Apply to:** all 5 plans — each plan corresponds to one logical layer (domain/storage; CSS+favicon+contrast; i18n+picker; FOUC script; drift-guard). Phase 38 had 4 plans of similar scope; Phase 39 has 5 due to the FOUC-script split (no analog in Phase 38).

**Concrete excerpt from Phase 38 PATTERNS commit grouping:** "Commit A `chore(38): delete shape components + hooks` ... Same-commit so TypeScript does not enter an intermediate broken state."

**Phase 39 application:** each plan internally MAY split into multiple commits (e.g. Plan 1 may commit `feat(39): narrow ThemeId union` + `test(39): lock THM-05 read-coerce + round-trip` separately), but cross-plan ordering must respect TS compile health — Plan 1 (union narrowing) MUST land before Plan 2 (CSS deletion that no longer needs the narrowing for compile, but the table literals in faviconPalette.ts + theme.contrast.test.ts WILL fail compile until the union shrinks).

## No Analog Found

None. Every file has a Phase 38 or self analog. The closest match table is exhaustively populated above.

## Metadata

**Analog search scope:**
- `.planning/phases/38-variant-removal/` (38-CONTEXT.md, 38-PATTERNS.md, 38-01-PLAN.md, 38-02-PLAN.md, 38-04-PLAN.md)
- `src/content/content.no-variants.test.ts` (verbatim drift-guard analog)
- `src/domain/settings.ts`, `src/storage/prefs.ts`, `src/storage/prefs.test.ts`
- `src/styles/faviconPalette.ts`, `src/styles/faviconPalette.test.ts`, `src/styles/favicon.sync.test.ts`, `src/styles/theme.contrast.test.ts`, `src/styles/theme.css` (selected ranges)
- `src/content/strings.ts` (selected ranges)
- `src/components/ThemePicker.tsx`, `src/components/ThemePicker.test.tsx`
- `index.html` (full file — 25 lines)
- grep audit across `src/` + `index.html` for moss/slate/dusk surface area

**Files scanned:** 17 production + 5 phase-planning analogs.

**Pattern extraction date:** 2026-05-21.
