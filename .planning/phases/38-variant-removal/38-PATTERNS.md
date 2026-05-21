# Phase 38: Variant removal — Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 22 (12 deletes, 9 surgical edits, 1 new)
**Analogs found:** 22 / 22

This is a deletion-heavy phase. The primary analog categories are: (1) delete-with-component policy from Phase 37 D-06/D-09, (2) surgical-strip pattern from Phase 37 App.tsx / strings.ts / test pruning, and (3) the drift-guard test `src/content/content.no-stats-ui.test.ts` as the exact template for the new VAR-06 guard file.

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/components/SquareShape.tsx` | delete (component) | render | Phase 37 StatsFooter.tsx deletion | exact (same delete-with-component policy) |
| `src/components/SquareShape.test.tsx` | delete (component-test) | render | Phase 37 StatsFooter.test.tsx deletion | exact |
| `src/components/DiamondShape.tsx` | delete (component) | render | Phase 37 StatsFooter.tsx deletion | exact |
| `src/components/DiamondShape.test.tsx` | delete (component-test) | render | Phase 37 StatsFooter.test.tsx deletion | exact |
| `src/components/VariantPicker.tsx` | delete (component) | render | Phase 37 ResetStatsDialog.tsx deletion | exact |
| `src/components/VariantPicker.test.tsx` | delete (component-test) | render | Phase 37 ResetStatsDialog.test.tsx deletion | exact |
| `src/components/BreathingShape.tsx` | delete (component + call-site collapse) | render | Phase 37 StatsFooter.tsx deletion + App.tsx prune | exact |
| `src/components/BreathingShape.test.tsx` | delete (component-test) | render | Phase 37 StatsFooter.test.tsx deletion | exact |
| `src/hooks/useVisualVariant.ts` | delete (hook) | state | Phase 37 D-02/D-03 (dead hook with no consumers) | exact |
| `src/hooks/useVisualVariant.test.ts` | delete (hook-test) | state | Phase 37 delete-with-component policy D-09 | exact |
| `src/hooks/useVariantChoice.ts` | delete (hook) | state | Phase 37 D-02/D-03 (dead hook with no consumers) | exact |
| `src/hooks/useVariantChoice.test.ts` | delete (hook-test) | state | Phase 37 delete-with-component policy D-09 | exact |
| `src/domain/settings.ts` | surgical edit | config | Phase 37 practices.ts `resetPracticeStats` deletion (L333-349) | role-match |
| `src/storage/prefs.ts` | surgical edit | CRUD | Phase 37 practices.ts + format.ts dead-code deletion | exact |
| `src/storage/prefs.test.ts` | surgical edit (test) | persistence | Phase 37 App.dialog.test.tsx / App.persistence.test.tsx strip | exact |
| `src/components/SettingsDialog.tsx` | surgical edit (import + render) | render | Phase 37 SettingsDialog.tsx comment-debt cleanup | exact |
| `src/components/SettingsDialog.test.tsx` | surgical edit (test) | render | Phase 37 App.dialog.test.tsx strip | role-match |
| `src/content/strings.ts` | surgical edit (i18n catalog) | typed-record | Phase 37 strings.ts typed-catalog block deletion | exact |
| `src/app/App.tsx` | surgical edit (multi-site) | render + state | Phase 37 App.tsx self-prune (same pattern, different symbols) | exact |
| `src/app/App.*.test.tsx` (5 files) | surgical edit (test strip) | render | Phase 37 App.dialog.test.tsx / App.persistence.test.tsx strip | exact |
| `src/styles/theme.css` | surgical edit (CSS blocks) | render | Phase 37 had no CSS analog; self-prune of `[data-variant='square'/'diamond']` blocks | self-prune |
| `src/content/content.no-variants.test.ts` (NEW) | new (drift-guard test) | fs-scan | `src/content/content.no-stats-ui.test.ts` | exact |

## Pattern Assignments

### DELETE files: SquareShape, DiamondShape, VariantPicker, BreathingShape + their tests; useVisualVariant, useVariantChoice + their tests

**Policy:** Phase 37 D-06 / D-09 delete-with-component. Component and its test file are deleted in the same commit via `git rm`. No import consumer remains after the App.tsx + SettingsDialog.tsx prune, so the TypeScript compiler will not flag.

**Precedent statement from Phase 37 PATTERNS.md (shared pattern section):**
> "the three items are tightly coupled... a single commit reads cleaner than three for a coordinated cleanup." (Phase 36-08-PLAN.md:55-62)

**Commit grouping recommendation (mirrors Phase 37 PATTERNS commit 1+2):**
- Commit A `chore(38): delete shape components + hooks` — `git rm` all 12 files (SquareShape, DiamondShape, VariantPicker, BreathingShape, useVisualVariant, useVariantChoice, plus their 6 test twins). Same-commit so TypeScript does not enter an intermediate broken state.
- The App.tsx call-site collapse (D-03) ships in this same commit because `BreathingShape` consumers in App.tsx must not outlive the deleted file.

**BreathingShape call-site collapse (D-03):** Three App.tsx sites (L1011, L1030, nkStarting branch) that currently read:
```tsx
<BreathingShape
  variant={sessionVariant ?? liveVariant}
  cue={sessionCue ?? liveCue}
  frame={...}
  leadInDigit={...}
  strings={uiStrings.breathing}
/>
```
become:
```tsx
<OrbShape
  cue={sessionCue ?? liveCue}
  frame={...}
  leadInDigit={...}
  strings={uiStrings.breathing}
/>
```
The `variant` prop disappears (OrbShape does not accept it). `sessionCue ?? liveCue` is preserved — cue capture is unrelated to variant (it is the Phase 25 D-09 pattern).

---

### `src/domain/settings.ts` (surgical edit — delete variant surface)

**Analog:** self-prune of `VisualVariantId` / `VARIANT_OPTIONS` / `isValidVariant` / `DEFAULT_VARIANT` block (lines 117-125).

**Before** (lines 117-125):
```typescript
export type VisualVariantId = 'orb' | 'square' | 'diamond'

export const VARIANT_OPTIONS = ['orb', 'square', 'diamond'] as const satisfies readonly VisualVariantId[]

export function isValidVariant(v: unknown): v is VisualVariantId {
  return typeof v === 'string' && (VARIANT_OPTIONS as readonly string[]).includes(v)
}

export const DEFAULT_VARIANT: VisualVariantId = 'orb'
```

**After:** entire 9-line block deleted. No replacement. The remaining coercers (`isValidTheme`, `isValidTimbre`, `isValidCue`, `isValidLocale`) show the surviving shape — each is a standalone export with no cross-dependency.

**TypeScript cascade:** After deletion, `tsc --noEmit` will flag every consumer import. The primary consumers are `src/storage/prefs.ts` (imports `DEFAULT_VARIANT`, `isValidVariant`, `VisualVariantId`) and `src/app/App.tsx` (imports `VisualVariantId` at L65). Both are surgical-edit targets in this phase.

---

### `src/storage/prefs.ts` (surgical edit — delete variant field + coercer)

**Analog:** Phase 37 practices.ts `resetPracticeStats` deletion + format.ts `formatLastSession` deletion. Delete the dead export and every reference to it within the file.

**Phase 14 non-throwing coercer pattern (preserved for the four surviving coercers):**
```typescript
// Surviving coercer shape (coerceTheme as exemplar):
export function coerceTheme(raw: unknown): ThemeId {
  return isValidTheme(raw) ? raw : DEFAULT_THEME
}
```

**Deletions in prefs.ts:**
1. Import block (lines 7-23) — remove `DEFAULT_VARIANT`, `isValidVariant`, `VisualVariantId` from the named imports. The remaining imports stay unchanged.
2. `UserPrefs` interface (lines 27-33) — delete the `variant: VisualVariantId` field line. Interface shrinks to 4 fields: theme, timbre, cue, locale.
3. `DEFAULT_PREFS` object (lines 35-41) — delete the `variant: DEFAULT_VARIANT,` line.
4. `coerceVariant` function (lines 57-59) — delete entire 3-line export:
   ```typescript
   export function coerceVariant(raw: unknown): VisualVariantId {
     return isValidVariant(raw) ? raw : DEFAULT_VARIANT
   }
   ```
5. `coercePrefs` return object (lines 75-81) — delete the `variant: coerceVariant(r.variant),` line. The comment at line 70 ("we only read five known keys... `raw` is never spread") updates to "four known keys".

**After D-01:** `coercePrefs` reads only `r.theme`, `r.timbre`, `r.cue`, `r.locale`. A persisted object with `{prefs: {variant: 'square', ...}}` passes through `readEnvelope`'s spread-then-override (Phase 8 D-01 envelope tolerance) — the `variant` key is harmlessly preserved on disk but ignored at read time.

---

### `src/app/App.tsx` (surgical edit — strip variant capture / render / dep-array threads)

**Analog:** Phase 37 PATTERNS.md App.tsx strip. Same pattern: multi-site self-prune with TypeScript compiler as the linter.

**Deletion sites (from CONTEXT.md canonical refs):**

**1. Import at L35 (hook import):**
```typescript
import { useVisualVariant } from '../hooks/useVisualVariant'   // delete entire line
```

**2. Type import at L65 (`VisualVariantId` in multi-import):**
```typescript
import type { SessionSettings, StretchSettings, VisualVariantId, CueStyleId } from '../domain/settings'
//                                               ^^^^^^^^^^^^^^^^ delete
```

**3. Hook call at L224 (destructure):**
```typescript
const { variant: liveVariant } = useVisualVariant()   // delete entire line
```

**4. sessionVariantRef + sessionVariant state at L292-293:**
```typescript
const sessionVariantRef = useRef<VisualVariantId | null>(null)   // delete
const [sessionVariant, setSessionVariant] = useState<VisualVariantId | null>(null)   // delete
```

**5. Capture-at-Start site (L487, L491-492) — inside onStartClick:**
```typescript
// Phase 17 D-10: capture-at-session-start ...            // delete comment block L487-490
sessionVariantRef.current = liveVariant                  // delete L491
setSessionVariant(liveVariant)                           // delete L492
```

**6. Tidy-clear sites (L472-473 in onEndClick, L670-671 in leave-running effect):**
```typescript
sessionVariantRef.current = null  // Phase 17 D-10 tidy clear ...   // delete
setSessionVariant(null)                                               // delete
```
And at L670-671 (leave-running cleanup):
```typescript
sessionVariantRef.current = null  // Phase 17 D-10 release ...   // delete
setSessionVariant(null)  // Phase 17 D-10 release ...            // delete
```

**7. NK session capture-at-start (L869-870 in onNKStart):**
```typescript
sessionVariantRef.current = liveVariant   // delete
setSessionVariant(liveVariant)            // delete
```

**8. NK complete callback (L819-820 in onNKComplete):**
```typescript
sessionVariantRef.current = null   // delete
setSessionVariant(null)            // delete
```

**9. dep arrays at L557, L927** — remove `liveVariant` and/or `sessionVariant` entries from any `useEffect`/`useCallback` dep arrays that reference them. Compiler will flag after the state deletions.

**10. JSX comment at L1001-1002 and three BreathingShape call sites (L1011-1017, L1030-1036, nkStarting branch L1011-1017):**
```typescript
{/* Phase 17 D-09: sessionVariant ... liveVariant is the fallback at idle. */}  // delete comment
// Each <BreathingShape variant={sessionVariant ?? liveVariant} ...> becomes <OrbShape ...> per D-03
```

**One-line guidance:** Delete the 6 distinct symbol threads (import, type import, hook call, ref+state pair, all capture/clear sites, all dep-array entries). Run `tsc --noEmit` after each logical group — the compiler walks you to the next stale consumer.

---

### `src/components/SettingsDialog.tsx` (surgical edit — import + prop + render)

**Before (lines 8, 29, 95):**
```typescript
// Line 8:
import { VariantPicker } from './VariantPicker'

// Line 29 (SettingsDialogProps strings Pick type):
strings: Pick<UiStrings, 'settings' | 'themes' | 'variants' | 'cue' | 'timbres' | 'install'>

// Line 93 (JSX comment):
{/* D-10 (updated Phase 25 Plan 04): Theme → Variant → Cue → Timbre → Language order ... */}

// Line 95 (render):
<VariantPicker disabled={inSessionView} strings={strings.variants} sectionLabel={strings.settings.variantLabel} />
```

**After:**
- Line 8: deleted
- Line 29: `'variants' |` removed from the Pick union
- Line 93: comment updated to "Theme → Cue → Timbre → Language order"
- Line 95: entire `<VariantPicker ... />` JSX line deleted

**Pattern from Phase 37 PATTERNS.md (SettingsDialog comment-debt section):**
> "Delete (Tiger Style WHY-only comments — if the WHY referenced a live sibling and that sibling is gone, the WHY no longer informs)."

The comment at L10 (`D-10: inner layout single column, Theme → Variant → Timbre → Language order`) updates to remove `→ Variant` from the order description.

---

### `src/content/strings.ts` (surgical edit — typed-catalog block deletion)

**Analog:** Phase 37 PATTERNS.md strings.ts section (frozen-catalog deletion pattern, Phase 19/26 I18N precedent).

**Pattern:** Delete type-level block first → `tsc --noEmit` → delete EN + PT-BR catalog entries.

**Type deletions (UiStrings interface):**

1. `settings.variantLabel` (line 31):
   ```typescript
   readonly variantLabel: string   // delete
   ```

2. `variants` block (lines 44-48):
   ```typescript
   readonly variants: {
     readonly orb: string
     readonly square: string
     readonly diamond: string
   }
   ```
   (entire block deleted)

**EN catalog deletions:**

3. `settings.variantLabel` (line 195): `variantLabel: 'Variant',` — delete

4. `variants` block (lines 208-212):
   ```typescript
   variants: {
     orb: 'Orb',
     square: 'Square',
     diamond: 'Diamond',
   },
   ```
   (entire block deleted)

**PT-BR catalog deletions:**

5. `settings.variantLabel` (line 357): `variantLabel: 'Variante',` — delete

6. `variants` block (lines 370-374):
   ```typescript
   variants: {
     orb: 'Esfera',
     square: 'Quadrado',
     diamond: 'Losango',
   },
   ```
   (entire block deleted)

**LOCKED_COPY guard:** None of these strings are in `LOCKED_COPY` (variant display strings are not Forrest/medical claim-safe copy — confirmed CONTEXT code_context line 128). The byte-equality guard is unaffected.

**Compiler cascade:** After the type deletions, `tsc` flags the App.tsx `uiStrings.variants` read (if any) and the `SettingsDialog` `strings.variants` prop usage (which is also being deleted). The SettingsDialog `Pick<UiStrings, ... | 'variants' | ...>` deletion removes the prop-type reference simultaneously.

---

### `src/styles/theme.css` (surgical edit — delete CSS variant blocks)

**Deletion scope (lines ~403-474):**

Block 1 — Square variant (lines 405-410):
```css
[data-variant='square'] .shape-marker--outer {
  border-radius: 18%;
}
[data-variant='square'] .shape-marker--inner {
  border-radius: 18%;
}
```

Block 2 — Diamond `.orb` + gradient layers (lines 418-426):
```css
[data-variant='diamond'] .orb { clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); }
[data-variant='diamond'] .orb-layer--in { clip-path: ...; }
[data-variant='diamond'] .orb-layer--out { clip-path: ...; }
```

Block 3 — Diamond marker geometry (lines 449-474):
```css
[data-variant='diamond'] .shape-marker--outer,
[data-variant='diamond'] .shape-marker--inner { ... }
[data-variant='diamond'] .shape-marker--outer { width: ...; height: ...; transform: ...; }
[data-variant='diamond'] .shape-marker--inner { width: ...; height: ...; transform: ...; }
```

**Orb selector audit (D-01 note in CONTEXT):** `grep -n "data-variant='orb'" src/styles/theme.css` returns no output — no `[data-variant='orb']` selector exists in the file. Nothing to remove for orb.

**Also delete:** The section-header comment block at lines 391-401 (the `/* ============ Phase 17 deviation ... ============ */` explanatory header that introduces the variant block). After deletion there is no variant section to introduce.

**One-line guidance:** Delete lines 391-474 wholesale (the full variant section from its comment header through the last diamond marker rule). Verify with `grep "data-variant" src/styles/theme.css` returning zero results after.

---

### `src/storage/prefs.test.ts` (surgical edit — strip variant cases)

**Analog:** Phase 37 App.dialog.test.tsx strip (single block deletion) and App.persistence.test.tsx strip (multi-block deletion).

**Action:** Identify and delete all `it`/`describe` cases that:
- Reference `coerceVariant`, `isValidVariant`, `VARIANT_OPTIONS`, `DEFAULT_VARIANT`, `VisualVariantId`
- Assert on `prefs.variant`, `variant: 'square'`, `variant: 'diamond'`, `variant: 'orb'`
- Import the above from `../domain/settings` or `./prefs`

The surviving `coerceTheme` / `coerceTimbre` / `coerceCue` / `coerceLocale` test cases are untouched. The `coercePrefs` integration test cases that build full `UserPrefs` objects will need their `variant` field removed from fixture literals.

**Pattern for fixture literal update (Phase 14 per-field coercer shape):**
```typescript
// Before (fixture with variant):
const prefs = coercePrefs({ theme: 'dark', variant: 'square', timbre: 'bowl', cue: 'arrow', locale: 'en' })
expect(prefs.variant).toBe('orb') // fallback

// After (variant field removed from fixture AND from assertion):
const prefs = coercePrefs({ theme: 'dark', timbre: 'bowl', cue: 'arrow', locale: 'en' })
// No variant assertion — field no longer exists on UserPrefs
```

---

### App test files: App.session.test.tsx, App.audio.test.tsx, App.locale.test.tsx, App.test.tsx, App.wakeLock.test.tsx (surgical edits)

**Analog:** Phase 37 App.dialog.test.tsx + App.persistence.test.tsx surgical strip.

**Pattern (from Phase 37 PATTERNS.md):** "Surgical delete of the single `it` case; verify no shared `beforeEach` seeds [variant]-only state that becomes dead."

**Action per file:**
1. Find every `it`/`describe` block that asserts on `sessionVariant`, `liveVariant`, `variant` prop, `VisualVariantId`, `useVisualVariant`, or the captured-at-start behavior (Phase 17 D-09/D-10).
2. Delete the block wholesale if it is variant-axis-only.
3. If a `beforeEach` seeds the localStorage envelope with `{prefs: {variant: 'square'}}`, remove the `variant` field from the seed — the envelope shape still resolves cleanly via Phase 8 D-01 tolerance (unknown key ignored on read).
4. If a test fixture passes `variant` as a prop to `<BreathingShape>` or `<App>`, delete the prop (after D-03, neither component exists / accepts it).

**One-line guidance:** `grep -n "variant\|VisualVariant\|useVisualVariant\|BreathingShape" src/app/App.*.test.tsx` locates all sites; audit each hit for variant-axis-only vs. cross-cutting; delete variant-only, strip the field from cross-cutting fixtures.

---

### `src/components/SettingsDialog.test.tsx` (surgical edit)

**Analog:** Phase 37 SettingsDialog.tsx comment-debt + App.dialog.test.tsx strip.

**Action:** Delete any `it` cases that:
- Render `<SettingsDialog>` with a `strings` fixture containing `variants: { orb: '...', square: '...', diamond: '...' }` — remove the `variants` key from the fixture object.
- Assert that `VariantPicker` renders, or that variant options appear by role/text.
- Test the `sectionLabel={strings.settings.variantLabel}` rendering.

The `strings` fixture literal in remaining tests drops the `variants` field and `settings.variantLabel` field. The TypeScript type narrowing (`Pick<UiStrings, ...>`) will flag fixture objects at compile time after the type deletion in strings.ts.

---

### `src/components/shapeConstants.ts` (comment-only edit — very small)

**Action (not a separate commit — bundle with shape deletions):** The docstring referencing "OrbShape / SquareShape / DiamondShape" updates to "OrbShape only" or drops the shape enumeration entirely. Verify the exact comment text at plan time with `grep -n "SquareShape\|DiamondShape" src/components/shapeConstants.ts`.

---

## NEW File: `src/content/content.no-variants.test.ts` (VAR-06 drift-guard)

**Analog:** `src/content/content.no-stats-ui.test.ts` — exact structural match, different scoped-roots and forbidden-token list.

**Placement rationale:** Collocate with `content.no-stats-ui.test.ts` and `content.no-review-markers.test.ts` in `src/content/` so future readers find all three drift-guards via the same `src/content/content.*` glob. Matches Phase 37 PATTERNS recommendation.

**File skeleton (copy verbatim from `content.no-stats-ui.test.ts`, change the four parameterized sections):**

**Header comment block:**
```typescript
// src/content/content.no-variants.test.ts
//
// Phase 38 VAR-06 drift-guard.
//
// Scanned roots: src/components/, src/app/, src/content/, src/styles/
//   - components/ + app/ cover all render paths.
//   - content/ catches variant-shaped i18n copy re-entering via strings.ts
//     before a consumer wires it back into a render path.
//   - styles/ catches [data-variant='square'/'diamond'] CSS rules re-entering
//     via theme.css (the WR-01 vector the original three-root scan would miss).
//
// Forbidden token classes (CONTEXT D-04 / D-05):
//   1. Plain substring (case-sensitive component/symbol names)
//   2. Regex (CSS attribute selectors)
//   3. Regex (persisted-value literals)
//
// WHY this file exists (CONTEXT D-06): Phase 38 deleted all forbidden variant tokens
// from the scanned roots. This drift-guard locks that done-state against future regressions.
// It is the lock — future re-introduction of a shape variant system is a deliberate phase
// decision that explicitly deletes this file with rationale recorded in that phase's SUMMARY.
// Deleting this file is the intentional unlock.
//
// Analog: src/content/content.no-stats-ui.test.ts (Phase 37 STATS-05)
```

**Triple-slash reference (identical to analog — required for Node types in jsdom vitest):**
```typescript
/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
```

**`collectFiles` function (copy verbatim from `content.no-stats-ui.test.ts` lines 40-55 — handles both `.ts` and `.tsx`; Phase 38 extends the accept clause to also include `.css` — see plan 38-04 `<interfaces>` adaptation (b)):**
```typescript
// Collect all non-test .ts and .tsx files under dir (recursive).
// Excluding .test.ts and .test.tsx files is load-bearing — this guard file itself contains
// the literal token strings (inside the forbidden-token list below) and must not flag itself.
function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      collectFiles(full, acc)
    } else if (
      (entry.endsWith('.ts') || entry.endsWith('.tsx')) &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.test.tsx')
    ) {
      acc.push(full)
    }
  }
  return acc
}
```

**Scoped roots (CONTEXT D-07 — four roots, not three):**
```typescript
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

**Forbidden token list (CONTEXT D-05, exact entries — planner sets the label strings):**
```typescript
const FORBIDDEN_TOKENS: Array<{ label: string; match: (text: string) => boolean }> = [
  // Plain substring — component / symbol names
  { label: 'SquareShape (component name)',         match: (t) => t.includes('SquareShape') },
  { label: 'DiamondShape (component name)',        match: (t) => t.includes('DiamondShape') },
  { label: 'VariantPicker (component name)',       match: (t) => t.includes('VariantPicker') },
  { label: 'VisualVariantId (type name)',          match: (t) => t.includes('VisualVariantId') },
  { label: 'useVisualVariant (hook name)',         match: (t) => t.includes('useVisualVariant') },
  { label: 'useVariantChoice (hook name)',         match: (t) => t.includes('useVariantChoice') },
  { label: 'coerceVariant (coercer name)',         match: (t) => t.includes('coerceVariant') },
  { label: 'isValidVariant (predicate name)',      match: (t) => t.includes('isValidVariant') },
  { label: 'VARIANT_OPTIONS (constant name)',      match: (t) => t.includes('VARIANT_OPTIONS') },
  { label: 'DEFAULT_VARIANT (constant name)',      match: (t) => t.includes('DEFAULT_VARIANT') },
  // Regex — persisted-value literals (matches `variant: 'square'` and `variant: 'diamond'` in source)
  {
    label: "variant: 'square' (persisted-pref literal)",
    match: (t) => /variant:\s*['"]square['"]/.test(t),
  },
  {
    label: "variant: 'diamond' (persisted-pref literal)",
    match: (t) => /variant:\s*['"]diamond['"]/.test(t),
  },
  // Regex — CSS attribute selectors (catches theme.css re-entry)
  {
    label: "[data-variant='square'] CSS selector",
    match: (t) => /\[data-variant=['"]?square['"]?\]/.test(t),
  },
  {
    label: "[data-variant='diamond'] CSS selector",
    match: (t) => /\[data-variant=['"]?diamond['"]?\]/.test(t),
  },
]
```

**Note on display strings:** CONTEXT D-05 lists `'Square'`, `'Diamond'`, `'Quadrado'`, `'Losango'` as potential banned display strings. These are NOT added to the forbidden-token list because the words "square" and "diamond" appear legitimately in non-variant contexts (e.g. CSS geometry comments, shape math descriptions). The symbol-name tokens above (`SquareShape`, `DiamondShape`, `VisualVariantId`, etc.) are the precise, unambiguous sentinels. The planner should verify at plan time whether any `'Square'` / `'Diamond'` / `'Quadrado'` / `'Losango'` literal remains in `strings.ts` after catalog deletion — if the catalog is clean, the display-string ban adds no coverage and risks false positives.

**Test body (copy structure verbatim from `content.no-stats-ui.test.ts` lines 101-130):**
```typescript
describe('VAR-06 drift-guard (CONTEXT D-04 / D-05 / D-06)', () => {
  // Sanity: broken __dirname resolve or renamed scan root would silently produce
  // empty SCAN_FILES and pass vacuously.
  it('scans a non-empty set of production files', () => {
    expect(
      SCAN_FILES.length,
      'VAR-06 drift-guard scanned zero files — collectFiles or scan-root resolve is broken',
    ).toBeGreaterThan(10)
  })

  it('no forbidden variant token appears in src/components/, src/app/, src/content/, or src/styles/', () => {
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
      `Forbidden variant tokens found (Phase 38 Orb-only invariant violated):\n${hits.join('\n')}`,
    ).toEqual([])
  })
})
```

**Key differences from `content.no-stats-ui.test.ts`:**
- Four scanned roots (adds `src/styles/`) vs. three.
- `.css` filter extension (adaptation b — the `src/styles/` root is `.css`, not `.ts`/`.tsx`; `collectFiles` accepts `.ts` / `.tsx` / `.css` for Phase 38 vs. the analog's `.ts` / `.tsx`-only filter).
- 14 forbidden tokens (10 symbol-name plain-substring + 2 persisted-value regex + 2 CSS selector regex) vs. 6 in STATS-05.
- `describe` label references `VAR-06` not `STATS-05`.
- The drift-guard self-exclusion comment notes this file contains the literal token strings (e.g. `'SquareShape'` inside `t.includes('SquareShape')`) — the `.test.ts` filter in `collectFiles` prevents self-flagging.

---

## Shared Patterns

### Delete-with-component policy (Phase 37 D-06 / D-09)

**Source:** Phase 37 PATTERNS.md "Delete `src/components/StatsFooter.tsx` + `StatsFooter.test.tsx` (same commit)" section.

**Apply to:** All 12 deleted files in Phase 38 (SquareShape, DiamondShape, VariantPicker, BreathingShape — each with its test twin — plus useVisualVariant and useVariantChoice with their test twins).

**Rule:** `git rm` each component and its test file in the same commit. Never leave a component deleted while its test file survives (or vice versa).

### Commit grouping (Tiger Style + Phase 36/37 precedent)

**Source:** Phase 37 PATTERNS.md "Multi-file delete commit shape" + Phase 36-08-PLAN.md precedent.

Suggested split for Phase 38 (planner may adjust based on dependency analysis):

1. `chore(38): delete shape components + hooks; collapse BreathingShape call sites to OrbShape` — the 12 `git rm` deletions + App.tsx call-site collapse (D-03) in one commit (tightly coupled; intermediate broken state otherwise).
2. `chore(38): delete variant domain surface (VisualVariantId / VARIANT_OPTIONS / coerceVariant)` — `src/domain/settings.ts` + `src/storage/prefs.ts` changes.
3. `chore(38): strip variant i18n surface (EN + PT-BR)` — `src/content/strings.ts` type + catalog deletions.
4. `chore(38): strip variant CSS blocks from theme.css` — `src/styles/theme.css` L391-474 deletion.
5. `chore(38): strip variant branches from App.tsx and App test files` — `src/app/App.tsx` multi-site prune + 5 App.*.test.tsx surgical strips.
6. `chore(38): strip variant branches from SettingsDialog + prefs tests` — `SettingsDialog.tsx` import/render/prop + `SettingsDialog.test.tsx` + `prefs.test.ts`.
7. `test(38): VAR-06 drift-guard for variant tokens` — new `src/content/content.no-variants.test.ts`.

### Conventional-commit scope

Use `(38):` scope. Predominant types: `chore(38):` (deletions), `test(38):` (drift-guard).

### Frozen-catalog deletion (Phase 19/26 I18N pattern)

**Source:** Phase 37 PATTERNS.md "Frozen-catalog deletion" shared pattern.

**Apply to `strings.ts`:** Delete the type-level `UiStrings.variants` block and `UiStrings.settings.variantLabel` first, run `tsc --noEmit`, then delete the EN and PT-BR catalog entries. TypeScript is the linter — every stale consumer surfaces as a compile error.

### Per-field coerceX non-throwing pattern (Phase 14)

**Source:** `src/storage/prefs.ts` — four surviving coercers show the shape:
```typescript
export function coerceTheme(raw: unknown): ThemeId {
  return isValidTheme(raw) ? raw : DEFAULT_THEME
}
```

**Apply to:** After D-01 deletion, `coercePrefs` contains only `coerceTheme`, `coerceTimbre`, `coerceCue`, `coerceLocale`. The function shape (non-throwing, per-field fallback to default) is preserved unchanged. No new coercer is introduced by this phase.

### TypeScript-compiler-as-linter

**Source:** Phase 37 PATTERNS.md App.tsx section: "run `tsc --noEmit` — the compiler will flag any consumer you missed."

**Apply to:** After each logical deletion group (domain → storage → i18n → App.tsx), run `tsc --noEmit` to confirm zero outstanding consumers before moving to the next commit.

## No Analog Found

None. Every file in this phase has either a self-analog (sites pruned in-place following the Phase 37 surgical-strip pattern) or the exact `content.no-stats-ui.test.ts` analog for the drift-guard.

## Metadata

**Analog search scope:** `src/content/`, `src/storage/`, `src/components/`, `src/app/`, `src/domain/`, `src/hooks/`, `src/styles/`, `.planning/phases/37-stats-ui-removal/`
**Files scanned:** ~30
**Pattern extraction date:** 2026-05-20
