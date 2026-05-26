---
phase: 48-appearance-page-i18n
reviewed: 2026-05-26T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - src/app/ScreenRouter.tsx
  - src/app/ScreenRouter.test.tsx
  - src/app/appControllerAdapters.ts
  - src/app/appControllerAdapters.test.ts
  - src/app/appViewModel.ts
  - src/app/pages/AppSettingsPage.tsx
  - src/app/pages/AppSettingsPage.test.tsx
  - src/app/pages/AppearancePage.tsx
  - src/app/pages/AppearancePage.test.tsx
  - src/app/useAppNavigation.ts
  - src/app/useAppNavigation.test.tsx
  - src/components/OrbPicker.tsx
  - src/components/OrbPicker.test.tsx
  - src/components/RingCuePicker.tsx
  - src/components/RingCuePicker.test.tsx
  - src/components/SettingsPanelBody.tsx
  - src/components/SettingsPanelBody.test.tsx
  - src/content/content.no-review-markers.test.ts
  - src/content/strings.test.ts
  - src/content/strings.ts
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
status: issues_found
---

# Phase 48: Code Review Report

**Reviewed:** 2026-05-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 48 adds an Appearance page (4th `AppScreen` value), two new SegmentedControl-based pickers (OrbPicker, RingCuePicker), a sentinel-based focus-restoration mechanism (`returningFromAppearance`), and extends the i18n catalog with EN + PT-BR `appearance.*` namespace plus the `appSettings.sections.appearance → theme` rename.

No critical bugs or security issues were found. The diff is well-scoped, the new state machine extension preserves existing invariants, and the marker-guard relaxation in `content.no-review-markers.test.ts` is structurally tight (line-above-value allowlist, not file-name wildcard).

Three warnings concern (1) a duplicated private `SectionCard` component (chrome divergence risk vs. SettingsPanelBody), (2) dead `id` attributes on the new pickers' label `<p>` elements that no `aria-labelledby` references, and (3) the marker-guard `label:` allowlist pattern being broad enough to silently allow a regression in the future. Info items track minor quality concerns.

## Warnings

### WR-01: Duplicated private `SectionCard` component — chrome will drift

**File:** `src/app/pages/AppearancePage.tsx:22-41` and `src/components/SettingsPanelBody.tsx:36-55`

**Issue:** Both files define a private `function SectionCard({ padding, children })` with the same inline styles (background, border, borderRadius, padding). The AppearancePage version comments "Duplicated inline per RESEARCH OQ#4; do NOT export — private to this file." However, two private copies of identical "spike-locked card chrome" mean a future spike-locked update to one will silently desync from the other. The drift-guard test (`content.no-removed-keys` etc.) only covers content keys, not chrome consistency. The comment claims a research decision but does not capture the rollback cost (visual desync between Settings and Appearance surfaces).

Note: `LearnPanel.tsx` also has a `SectionCard` (different signature, only `children`), so there are now three privately defined `SectionCard` variants in the codebase.

**Fix:** Extract a shared `SectionCard` to `src/components/primitives/SectionCard.tsx` accepting `padding` and `children`. Update both consumers. If the research decision to keep it private is load-bearing, add a `// CHROME-LOCKED: keep in sync with SettingsPanelBody.tsx:36` comment on both copies and a snapshot test asserting both render with identical inline styles.

```tsx
// src/components/primitives/SectionCard.tsx
export function SectionCard({
  padding,
  children,
}: {
  padding: string
  children: ReactNode
}): ReactElement {
  return (
    <div
      style={{
        background: 'var(--color-breathing-surface)',
        border: '1px solid var(--color-border-soft)',
        borderRadius: 20,
        padding,
      }}
    >
      {children}
    </div>
  )
}
```

### WR-02: Dead `id` attribute on OrbPicker / RingCuePicker label `<p>` — no `aria-labelledby` references it

**File:** `src/components/OrbPicker.tsx:22` and `src/components/RingCuePicker.tsx:21`

**Issue:** Both new pickers render:

```tsx
<p id="orb-picker-label" className={...}>{sectionLabel}</p>
<SegmentedControl ariaLabel={sectionLabel} ... />
```

The `SegmentedControl` primitive uses `aria-label={ariaLabel}` (not `aria-labelledby`). It does NOT accept a `labelId` prop. A grep confirms nothing in the codebase reads `#orb-picker-label` or `#ring-cue-picker-label` via `aria-labelledby` or `getElementById`. The id attribute is dead.

This is a copy-paste inheritance from `LanguagePicker.tsx:18` (which has the same dead id) — the original was likely a `PickerCardGrid`-style label intent that was incorrectly carried over when paste-and-renaming from a `SegmentedControl`-based template. The dead id is not a bug today (no a11y degradation — the radiogroup is still labelled by `aria-label`), but it is misleading dead code that suggests an a11y contract which does not exist, and may collide with future DOM (e.g., a real `aria-labelledby` consumer named `orb-picker-label`).

Note: the `sectionLabelHidden` path renders the `<p>` as `sr-only`. With `aria-label` on the radiogroup matching the same string, a screen reader will announce the label twice (once from the `<p>`, once from the radiogroup), which is the actual a11y consequence of this not being wired correctly.

**Fix:** Either (a) remove the dead `id` attribute and skip the `<p>` when `sectionLabelHidden` is true:

```tsx
{!sectionLabelHidden && (
  <p className="mb-2 text-sm font-semibold text-[var(--color-breathing-accent-strong)]">
    {sectionLabel}
  </p>
)}
<SegmentedControl ... ariaLabel={sectionLabel} />
```

…or (b) extend `SegmentedControl` to accept `labelId` and wire `aria-labelledby` like `PickerCardGrid` does, then drop `ariaLabel` when `labelId` is provided. Apply the same fix to `LanguagePicker.tsx` for consistency.

### WR-03: Marker-guard `label:` allowlist pattern is too broad — silent future regression risk

**File:** `src/content/content.no-review-markers.test.ts:75`

**Issue:** The allowlist regex `/^\s*label:\s*'/` matches *any* key named `label:` anywhere in `src/content/**.ts`, not just keys under `appearance.*`. Today this is safe because all four `label:` keys in `strings.ts` happen to live inside `appearance.{orb,ringCue,breathingEffect,switcherIcons}.label`. But if any future addition introduces a `label:` key elsewhere in a content file (very plausible — `label` is one of the most generic UI string keys), a stale `// TODO: native-speaker review` marker above it will be silently allowlisted by this guard. The marker guard, whose entire purpose is to prevent unreviewed PT-BR strings from shipping, will fail to fire.

The same risk applies to the `theme:` pattern (`/^\s*theme:\s*'/`) — any future content key named `theme` (e.g. a new `appSettings.themes.theme`) would silently pass.

**Fix:** Tighten the patterns to include a path-context anchor, or count `appearance.*` block scope. Simplest: require the marker line and value line to be inside a parent block whose key matches `appearance:` or `sections:`. A simpler textual approach: include the parent key prefix in the regex by requiring a longer multi-line context. E.g., track brace depth or include a "previous N lines contain `appearance: {`" check. Alternatively, since this is for I18N-04 close-out, a strictly bounded fix is to gate the entire allowlist behind a per-file allowlist of file paths (only `src/content/strings.ts`) AND restrict the line-number range to lines >= the first `appearance:` block opening.

```ts
// Minimum hardening:
const ALLOWED_FILES = new Set([resolve(CONTENT_DIR, 'strings.ts')])
// ... and only check allowlist for files in ALLOWED_FILES; for other files,
// any marker is a violation.
```

## Info

### IN-01: `AppSettingsPage` focus-restoration effect runs on every `returningFromAppearance` change

**File:** `src/app/pages/AppSettingsPage.tsx:44-50`

**Issue:** The `useEffect` depends on `returningFromAppearance` and calls `.focus()` on every change. In current flow this is fine because the page remounts on navigation, but if the page is ever kept mounted across `returningFromAppearance` flips (e.g., a future refactor), the focus will steal whatever element the user has manually focused. This is brittle.

**Fix:** Either add a one-shot ref guard, or document the assumption explicitly:

```ts
const didFocusOnMount = useRef(false)
useEffect(() => {
  if (didFocusOnMount.current) return
  didFocusOnMount.current = true
  if (returningFromAppearance) {
    chevronButtonRef.current?.focus({ preventScroll: true })
  } else {
    backButtonRef.current?.focus({ preventScroll: true })
  }
}, [returningFromAppearance])
```

### IN-02: `appControllerAdapters` test does not assert `returningFromAppearance` / appearance callbacks are propagated

**File:** `src/app/appControllerAdapters.test.ts:236-247`

**Issue:** The `'combines surface navigation state with session dialog models'` test asserts `appScreen`, `onLearnOpen`, `onSettingsOpen`, `onBackToPractice` are propagated but never asserts that `onAppearanceOpen`, `onBackToAppSettings`, or `returningFromAppearance` flow through `createAppDialogsViewModel`. TypeScript guarantees the fields are present (interface), but a behavioral test for the new fields is missing.

**Fix:** Add to the existing test:

```ts
expect(dialogs.onAppearanceOpen).toBe(navigation.onAppearanceOpen)
expect(dialogs.onBackToAppSettings).toBe(navigation.onBackToAppSettings)
expect(dialogs.returningFromAppearance).toBe(false)
```

### IN-03: `useAppNavigation` test `'closeOnSessionView forces appearance → practice and clears sentinel'` is a partial tautology

**File:** `src/app/useAppNavigation.test.tsx:139-160`

**Issue:** The test navigates `appSettings → appearance` (where `returningFromAppearance` is `false`, set by `onAppearanceOpen`), then rerenders with `closeOnSessionView: true`, and asserts `returningFromAppearance` is `false`. But it was already `false` before the rerender. The assertion does not exercise the effect's `setReturningFromAppearance(false)` line — that line is only meaningfully tested by navigating into a state where `returningFromAppearance=true` first, then triggering `closeOnSessionView`.

**Fix:** Set up the state with `returningFromAppearance=true` before triggering the session start:

```ts
act(() => { result.current.onSettingsOpen() })
act(() => { result.current.onAppearanceOpen() })
act(() => { result.current.onBackToAppSettings() })  // sets returningFromAppearance=true
expect(result.current.returningFromAppearance).toBe(true)  // pre-condition

rerender({ controlsDisabled: false, closeOnSessionView: true })

expect(result.current.appScreen).toBe('practice')
expect(result.current.returningFromAppearance).toBe(false)  // now this is meaningful
```

### IN-04: `useAppNavigation` does not gate `onBackToPractice` / `onBackToAppSettings` on `controlsDisabled`

**File:** `src/app/useAppNavigation.ts:59-67`

**Issue:** `onLearnOpen`, `onSettingsOpen`, `onAppearanceOpen` all guard on `controlsDisabled` (no nav away from practice while a session is active). The two "back" callbacks (`onBackToPractice`, `onBackToAppSettings`) do not. In current flow they are only callable when no session is active (because the back button only exists on Learn/AppSettings/Appearance pages and those pages are only reachable when `controlsDisabled=false`, and a session starting forces routing back to practice via `closeOnSessionView`). So this is not exploitable today.

However: it relies on the `closeOnSessionView` effect firing fast enough to prevent the user from clicking back during the gap between `breathing.inSessionView` flipping to `true` and the effect routing them. The effect runs in a `useEffect`, so there is a microtask window. If the page is currently animating or the user clicks rapidly, the back callback would still run with the session-active state. It's almost certainly harmless (it just routes to practice or appSettings) but worth a note.

**Fix:** Either add `if (controlsDisabled) return` guards to be defensive, or document the invariant ("back callbacks are safe to call mid-session because they route to a screen the closeOnSessionView effect would reach anyway").

### IN-05: PT-BR `'Sinal do anel'` for Ring cue is awkward — flag for I18N-04 review

**File:** `src/content/strings.ts:571`

**Issue:** The PT-BR translation `'Sinal do anel'` for "Ring cue" is literally "Signal of the ring", which is unusual usage. "Ring cue" in this context is a visual feedback element (rings around the breathing orb). A more natural Brazilian-Portuguese phrasing might be "Indicador do anel" or "Estilo do anel" depending on intent. This is the `// TODO: native-speaker review` workflow's intended target — flagged for the I18N-04 close-out pass, not as a blocker. Noting it here so the reviewer is aware of one specific draft string that reads especially mechanical.

Other PT-BR draft strings (`'Aparência'`, `'Voltar para Configurações'`, `'Configurações de aparência'`, `'Estilo do orbe'`, `'Orbe'`, `'Halo'`, `'Mínimo'`, `'Kuthasta'`, `'Arco'`, `'Anéis'`, `'Efeito de respiração'`, `'Ícones do alternador'`) read more naturally.

**Fix:** No code change. Operator to surface this string explicitly in the I18N-04 native-speaker review pass.

---

_Reviewed: 2026-05-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
