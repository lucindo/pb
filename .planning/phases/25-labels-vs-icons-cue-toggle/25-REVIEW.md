---
phase: 25-labels-vs-icons-cue-toggle
reviewed: 2026-05-15T00:00:00Z
depth: standard
files_reviewed: 33
files_reviewed_list:
  - src/app/App.tsx
  - src/app/App.test.tsx
  - src/app/App.locale.test.tsx
  - src/components/BreathingShape.tsx
  - src/components/BreathingShape.test.tsx
  - src/components/CueGlyph.tsx
  - src/components/CueGlyph.test.tsx
  - src/components/CuePicker.tsx
  - src/components/CuePicker.test.tsx
  - src/components/DiamondShape.tsx
  - src/components/DiamondShape.test.tsx
  - src/components/OrbShape.tsx
  - src/components/OrbShape.test.tsx
  - src/components/SquareShape.tsx
  - src/components/SquareShape.test.tsx
  - src/components/SettingsDialog.tsx
  - src/components/SettingsDialog.test.tsx
  - src/content/strings.ts
  - src/content/strings.test.ts
  - src/domain/settings.ts
  - src/domain/settings.test.ts
  - src/hooks/useCueChoice.ts
  - src/hooks/useCueChoice.test.ts
  - src/hooks/useVisualCue.ts
  - src/hooks/useVisualCue.test.ts
  - src/storage/prefs.ts
  - src/storage/prefs.test.ts
  - src/hooks/useLocale.test.ts
  - src/hooks/useLocaleChoice.test.ts
  - src/hooks/useThemeChoice.test.ts
  - src/hooks/useTimbreChoice.test.ts
  - src/hooks/useVariantChoice.test.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-05-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 33
**Status:** issues_found

## Summary

Phase 25 adds a "cue style" preference dimension (Text/Arrow/Nose) across the
domain enum, the storage envelope, i18n strings, two hooks, the `CueGlyph`
renderer, the `CuePicker`, `SettingsDialog` wiring, and App.tsx capture-at-Start
integration. The implementation closely mirrors the existing `variant`
dimension (Phase 17) and follows its established patterns: per-field coercion,
the shared `hrv:prefs-changed` event channel, and capture-at-Start snapshot
freezing.

No BLOCKER-level defects were found — the data path, validation, coercion,
and migration are correct, and the cross-tab/same-tab sync is sound. The
findings below are robustness and quality issues. The most notable is a
genuine dead-code / API-shape defect in `useVisualCue` (WR-01): it exposes a
non-persisting `setCue` that would silently lose user changes if any caller
ever used it, diverging from the equivalent `useVisualVariant` contract that
the file comment claims to mirror. The remaining items are an accessibility
gap on decorative SVGs, a `preview` prop semantics mismatch, and minor
duplication.

## Warnings

### WR-01: `useVisualCue` exposes a non-persisting `setCue` that silently loses writes

**File:** `src/hooks/useVisualCue.ts:16-48`
**Issue:** `useVisualCue` returns `{ cue, setCue }` where `setCue` is the raw
`useState` setter (`const [cue, setCue] = useState(...)`). Unlike `useCueChoice`
(whose `setCue` writes to disk + dispatches the sync event), this `setCue`
mutates React state only — it does **not** call `savePrefs` and does **not**
dispatch `hrv:prefs-changed`. The hook's header comment claims it is a "Mirror
of useVisualVariant," and `useVisualVariant` (per the App.tsx import at line 171)
exposes only `variant` for exactly this reason. App.tsx correctly destructures
only `cue` (`const { cue: liveCue } = useVisualCue()`), so the bug is latent —
but the public return shape advertises a setter that, if any future caller
invokes it, will update the orb for one render and then be silently reverted
by the next `storage`/`hrv:prefs-changed` event (which re-reads disk). This is
a data-loss-shaped API: the type signature promises a working setter that
isn't one.
**Fix:** Drop `setCue` from the return type and value so the hook surface
matches its actual capability and the `useVisualVariant` it claims to mirror:
```ts
export function useVisualCue(): { cue: CueStyleId } {
  const [cue, setCue] = useState<CueStyleId>(() => loadPrefs().cue)
  // ...effects use the local setCue internally...
  return { cue }
}
```
If a writable App-side setter is genuinely needed later, route it through
`savePrefs` + the event dispatch like `useCueChoice.setCue` does.

### WR-02: Decorative `CueGlyph` SVGs lack `focusable="false"` — keyboard focus trap on IE/legacy Edge

**File:** `src/components/CueGlyph.tsx:88-95, 107-128`
**Issue:** Both the arrow-mode and nose-mode `<svg>` elements carry
`aria-hidden="true"` but omit `focusable="false"`. In IE11 and pre-Chromium
Edge, inline SVG elements are focusable by default and become tab stops even
when `aria-hidden`. The orb renders this glyph on every breath cycle, so an
affected user would hit an invisible, non-interactive tab stop in the middle
of the page. This is the standard companion attribute to `aria-hidden` on
decorative SVGs and is cheap insurance.
**Fix:** Add `focusable="false"` alongside `aria-hidden="true"` on both
`<svg>` elements:
```tsx
<svg
  aria-hidden="true"
  focusable="false"
  viewBox="0 0 100 100"
  ...
>
```

### WR-03: `preview` prop conflates two unrelated behaviors and is under-tested for the nose case

**File:** `src/components/CueGlyph.tsx:60-79`, `src/components/CuePicker.tsx:54-57`
**Issue:** The `preview` flag does two things at once: (a) switches the color
token to `--color-orb-in-from`, and (b) in labels mode, replaces the phase word
with a literal `'T'`. The `'T'` substitution is hardcoded English — in a
`pt-BR` build the picker swatch for the Text option silently shows `'T'` while
the option label below reads `'Texto'`. More importantly, `CuePicker` passes
`phaseLabel={label}` (the localized option name, e.g. `'Arrow'`/`'Seta'`) into
a `preview` `CueGlyph`. In arrow/nose preview mode `CueGlyph` still emits an
`sr-only` span containing that `phaseLabel`. The `CuePicker` wraps the glyph in
`aria-hidden="true"` (CuePicker.tsx:54), so the `sr-only` text is suppressed —
but this is a fragile coupling: the glyph emits an accessibility node that only
happens to be neutralized by an ancestor. If the wrapper's `aria-hidden` is ever
removed, every picker button gets a duplicated, semantically-wrong accessible
name (the phase word, not the option name).
**Fix:** Have `preview` mode skip the `sr-only` span entirely (it is purely
decorative in the picker), and drive the labels-preview character from the
passed `phaseLabel` rather than a hardcoded `'T'`:
```tsx
{preview ? phaseLabel.charAt(0) : phaseLabel}
```
and in the arrow/nose branches, render the `sr-only` span only when `!preview`.

### WR-04: Test asserts `aria-disabled="false"` but `CuePicker` cannot guarantee that serialization

**File:** `src/components/SettingsDialog.test.tsx:136-142`, `src/components/CuePicker.tsx:31`
**Issue:** The test "CuePicker is enabled (not disabled) when inSessionView=false"
asserts `cueRadiogroup` `toHaveAttribute('aria-disabled', 'false')`. `CuePicker`
sets `aria-disabled={disabled}` with a raw boolean. React serializes
`aria-disabled={false}` to the string `"false"` (aria-* is special-cased), so
the test passes today — but this relies on a React serialization detail rather
than explicit intent, and the sibling pickers (`VariantPicker`,
`ThemePicker`) use the identical `aria-disabled={disabled}` form, so a future
refactor to `aria-disabled={disabled || undefined}` (a common a11y lint
suggestion to drop the attribute when false) would break this test and three
others silently. Prefer asserting the boolean-derived intent explicitly.
**Fix:** Either keep `aria-disabled={disabled}` and add a code comment that the
literal-`"false"` serialization is load-bearing for the test, or assert the
positive-disabled case only and drop the brittle `"false"` assertion. This is a
test-robustness issue, not a product bug.

## Info

### IN-01: Duplicated Tailwind class strings between `CuePicker` and `VariantPicker`

**File:** `src/components/CuePicker.tsx:37-39`
**Issue:** `selectedClasses`, `unselectedClasses`, and `baseClasses` are
byte-identical to `VariantPicker.tsx:37-39` (and the `ThemePicker` equivalents).
Four pickers now carry the same ~400-char class strings inline; a token rename
or a11y tweak must be applied in four places and can drift.
**Fix:** Extract the shared radio-button class strings into a small module
(e.g. `src/components/pickerClasses.ts`) and import them. Out of v1 scope to
mandate, but worth a follow-up.

### IN-02: `CueGlyph` arrow/nose `colorToken` ternary is duplicated logic, easy to drift

**File:** `src/components/CueGlyph.tsx:64-68`
**Issue:** The nested ternary computing `colorToken` is fine, but the three
render branches (labels / arrow / nose) each independently apply
`style={{ color: colorToken }}` and repeat the `relative z-10` wrapper. A
future change to the color contract must touch three sites. Low risk given the
thorough test coverage, but the branches could share a single wrapper.
**Fix:** Optional — factor the wrapper `<span>` and color application into one
place, branching only on the inner content.

### IN-03: `useVisualCue` header comment references decisions without the canonical doc anchor

**File:** `src/hooks/useVisualCue.ts:7-8`
**Issue:** The comment says the same-tab listener filters on
`detail.key === 'cue' || undefined` and cites "D-22" / "A-03" / "A-04". The
actual code (line 38) also accepts `!detail` (null detail). The comment does
not mention the null-detail branch, so a reader auditing the filter against the
comment would miss one accepted case. Minor doc/code drift.
**Fix:** Update the comment to note that a `null`/absent `detail` is also
treated as broadcast-all.

### IN-04: `CuePicker` preview wrapper uses `scale-50` + `overflow-hidden` with no explanation of the chosen size math

**File:** `src/components/CuePicker.tsx:54-57`
**Issue:** The preview glyph is rendered inside `w-8 h-8` then `scale-50`. The
`CueGlyph` arrow/nose SVG is `h-12 w-12` (48px); at `scale-50` that is 24px,
which exceeds the `w-8` (32px) box only on the labels-mode `text-5xl` span
(~48px → 24px scaled, fits). The arithmetic works out, but the comment
("Scaled wrapper renders it at swatch size") does not state the numbers, so a
future glyph-size change to `CueGlyph` (e.g. `h-16`) would silently clip the
preview via `overflow-hidden` with no test catching it (`CuePicker.test.tsx`
test 11 only asserts `button.children.length > 0`).
**Fix:** Add a comment with the size derivation, or add a test asserting the
preview glyph is not clipped. Low priority.

### IN-05: `pt-BR` cue strings carry `// TODO: native-speaker review` markers

**File:** `src/content/strings.ts:287, 305-307`
**Issue:** `cueLabel`, `cue.labels`, `cue.arrow`, `cue.nose` for `pt-BR` are
machine-translated and carry `// TODO: native-speaker review`. This is
consistent with the established Phase 19 I18N-07 convention (every other
`pt-BR` entry carries the same marker), so it is expected, not a defect — but
it is a tracked debt item. Noting for completeness; no action required for
this phase.

---

_Reviewed: 2026-05-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
