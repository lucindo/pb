---
phase: 48-appearance-page-i18n
reviewed: 2026-05-26T13:33:32Z
depth: deep
files_reviewed: 36
files_reviewed_list:
  - src/components/CueGlyph.tsx
  - src/components/CuePicker.tsx
  - src/components/EndSessionDialog.tsx
  - src/components/FeedbackCount.tsx
  - src/components/FeedbackTime.tsx
  - src/components/IosInstallSteps.tsx
  - src/components/LanguagePicker.tsx
  - src/components/LearnAnchor.tsx
  - src/components/LearnPanel.tsx
  - src/components/ModalDialogShell.tsx
  - src/components/MuteToggle.tsx
  - src/components/NKSessionReadout.tsx
  - src/components/NKShape.tsx
  - src/components/NaviKriyaSettingsForm.tsx
  - src/components/OrbPicker.tsx
  - src/components/OrbShape.tsx
  - src/components/PracticeToggle.tsx
  - src/components/ResonantSettingsForm.tsx
  - src/components/RingCuePicker.tsx
  - src/components/SessionActionRow.tsx
  - src/components/SessionReadout.tsx
  - src/components/SettingsAnchor.tsx
  - src/components/SettingsFormShell.tsx
  - src/components/SettingsPanelBody.tsx
  - src/components/SettingsRow.tsx
  - src/components/SettingsSectionHeader.tsx
  - src/components/SettingsSegmentedRow.tsx
  - src/components/SettingsSheet.tsx
  - src/components/SettingsStepper.tsx
  - src/components/SettingsToggleRow.tsx
  - src/components/SetupCard.tsx
  - src/components/StretchSettingsForm.tsx
  - src/components/ThemePicker.tsx
  - src/components/TimbrePicker.tsx
  - src/components/learnPanelModel.ts
  - src/components/shapeConstants.ts
  - src/components/useModalDialog.ts
findings:
  critical: 1
  warning: 7
  info: 6
  total: 14
status: issues_found
---

# Phase 48: Code Review Report — components/ (main chunk)

**Reviewed:** 2026-05-26T13:33:32Z
**Depth:** deep
**Files Reviewed:** 36
**Status:** issues_found

## Summary

Deep adversarial review of 36 React UI components in `src/components/`. The codebase has strong i18n discipline (UiStrings catalog in `src/content/strings.ts`), consistent spike-locked styling tokens, and good modal/dialog patterns via the `useModalDialog` hook. However, this review surfaced one clear **i18n violation** (hard-coded English copy in `NKShape.tsx` aria-label that bypasses the strings catalog), an **inconsistent aria-labelling pattern** between HRV and NK session readouts (NK lacks an `announcementAriaLabel` so it duplicates `readoutAriaLabel` on the inner live region), several **stale-closure / defensive-programming gaps** around `<dialog>` lifecycle and stepper bounds, and a handful of **code-quality smells** (orphan id, array-index keys on stable lists, paragraph-text-as-key in split). No security issues found.

The most material finding (CR-01) is a regression-class i18n bug that breaks PT-BR users navigating Navi Kriya with a screen reader.

## Critical Issues

### CR-01: Hard-coded English aria-label in NKShape bypasses UiStrings catalog

**File:** `src/components/NKShape.tsx:63`
**Issue:** The screen-reader announcement for the Navi Kriya orb is composed with a hard-coded English template string:

```tsx
const ariaLabel = `Navi Kriya session: OM ${String(count)}, phase ${phaseLabel}`
```

While `phaseLabel` is correctly sourced from `nkReadoutStrings.front`/`.back` (so the phase WORD is localized), the surrounding sentence skeleton ("Navi Kriya session:", "OM", ", phase") is hard-coded English. PT-BR locale users running a screen reader will hear: `Navi Kriya session: OM 47, phase Costas` — a mixed-language announcement. This directly violates the D-01 strings-catalog discipline documented at the top of `src/content/strings.ts` ("UI strings live here, not inline in components") and the project's broader i18n contract enforced by `content.no-removed-keys.test.ts` and `lockedCopy.test.ts`.

**Fix:** Add a localized template to `UiStrings['practice']['nkReadout']`, e.g.:

```ts
// strings.ts UiStrings.practice.nkReadout
readonly orbAriaLabel: (count: number, phaseLabel: string) => string

// en
orbAriaLabel: (c, p) => `Navi Kriya session: OM ${String(c)}, phase ${p}`,
// pt-BR
orbAriaLabel: (c, p) => `Sessão Navi Kriya: OM ${String(c)}, fase ${p}`,

// NKShape.tsx
const ariaLabel = nkReadoutStrings.orbAriaLabel(count, phaseLabel)
```

## Warnings

### WR-01: NK session readout uses identical aria-label on both wrapper and inner live region

**File:** `src/components/NKSessionReadout.tsx:32-39` (cross-reference: `src/content/strings.ts` `nkReadout` interface)
**Issue:** The outer `<section aria-label={strings.readoutAriaLabel}>` wraps a `<FeedbackCount ariaLabel={strings.readoutAriaLabel}>` — both regions carry the SAME label ("Navi Kriya session readout"). This is inconsistent with the HRV equivalent in `SessionReadout.tsx:117-122`, where the outer `<section>` uses `readoutAriaLabel` and the inner FeedbackTime uses the distinct `announcementAriaLabel`. The `nkReadout` strings interface has no `announcementAriaLabel` field, so there is no way for the NK readout to follow the same two-label pattern. Result: redundant SR announcements for NK users, and a maintenance asymmetry where any future test that asserts an `announcementAriaLabel` query on NK will silently match the wrong element.

**Fix:** Add `announcementAriaLabel` to `nkReadout` strings (`'Navi Kriya session announcement'` / `'Anúncio da sessão de Navi Kriya'`) and pass it as the inner `ariaLabel`:

```tsx
<FeedbackCount
  big={String(count)}
  mid={`/ ${String(target)}`}
  small={small}
  ariaLabel={strings.announcementAriaLabel}
/>
```

### WR-02: FeedbackTime live region announces every per-second timer tick

**File:** `src/components/FeedbackTime.tsx:29-46`
**Issue:** The outer `<div role="status" aria-live="polite" aria-label={ariaLabel}>` wraps a `primary` value that updates every second (e.g. "02:51" → "02:50" → ...). Polite live regions announce the changed contents on each mutation. Across a 5-minute HRV session this floods screen-reader output with ~300 timer announcements, drowning out genuinely useful announcements (phase changes, lead-in, complete). FeedbackCount has the same shape but updates only per-OM, which is intended; FeedbackTime's per-second cadence is not.

**Fix:** Drop `aria-live` from the FeedbackTime wrapper (keep `role="status"` if needed for landmark navigation), OR add an explicit `aria-live="off"` override. If callers genuinely want milestone announcements (e.g. on phase change), the consuming surface should mount a separate, narrowly-scoped live region whose content is debounced/quantized.

```tsx
<div
  role="status"
  aria-live="off"
  aria-label={ariaLabel}
  ...
>
```

### WR-03: Stepper changeBy() wraps via Array.prototype.at when guard is bypassed

**File:** `src/components/SettingsStepper.tsx:52-57`
**Issue:** `options.at(selectedIndex + offset)` returns the LAST element when `selectedIndex + offset === -1` (Array#at semantics: negative indices count from the end). The disabled-button gates (`canDecrease` / `canIncrease`) prevent the click in the normal path, but `value` not present in `options` yields `selectedIndex === -1`, and any race where the disabled prop hasn't yet applied (or a programmatic click in a test) would silently wrap to `options[options.length - 1]` instead of being a no-op. This is a defensive-programming defect.

**Fix:** Guard with explicit bounds check before calling `.at`:

```ts
const changeBy = (offset: -1 | 1) => {
  const next = selectedIndex + offset
  if (next < 0 || next >= options.length) return
  const nextValue = options[next]
  if (nextValue !== undefined) onChange(nextValue)
}
```

### WR-04: OrbShape silently ignores `frame` when `nkPhase` is also provided

**File:** `src/components/OrbShape.tsx:99-128`
**Issue:** The branch order in `OrbShape` is `nkPhase` > `leadInDigit` > `showCompletion` > `frame === null` > render `OrbBody(frame)`. If a caller (now or in a future refactor) passes both a `frame` AND `nkPhase`, the frame is silently dropped, the breathing animation is suppressed, and the orb locks at MID_SCALE. Today only `NKShape` passes `nkPhase` (without frame), so this is dormant. As an API contract the function should either accept `nkPhase XOR frame` (mutually exclusive types) or document/dev-assert the precedence. Current props interface allows the footgun.

**Fix:** Either narrow the type with a discriminated union, or add a dev-mode invariant:

```ts
if (process.env.NODE_ENV !== 'production' && nkPhase != null && frame != null) {
  console.warn('OrbShape: nkPhase + frame both provided; frame ignored')
}
```

Preferably refactor `OrbShapeProps` into a discriminated union (`{ kind: 'nk', phase, ... } | { kind: 'session', frame, ... } | { kind: 'leadIn', digit, ... } | { kind: 'complete' } | { kind: 'idle', mode } | { kind: 'hidden' }`).

### WR-05: useModalDialog re-invokes onAfterOpen when only `open` deps changes from `false→true→false→true`

**File:** `src/components/useModalDialog.ts:27-45`
**Issue:** The effect deps `[open, onAfterOpen]` mean any change to `onAfterOpen` will re-run the effect. Inside the effect, `if (open && !dialog.open)` calls `dialog.showModal()` and `onAfterOpen?.(dialog)`. The `dialog.open` guard prevents double `showModal()`, but `onAfterOpen?.()` runs every time the effect fires while `open === true` AND `dialog.open === false` (which is the boundary case — `showModal()` synchronously sets `dialog.open = true`, so the next run skips). Net behavior is correct in practice. However: if a caller passes a non-memoized `onAfterOpen` and React re-renders the parent rapidly during the open window, the effect will re-run but `onAfterOpen` won't fire because `dialog.open` is now true — silent omission rather than expected callback. Today no caller passes `onAfterOpen`, so this is dormant. Worth documenting.

**Fix:** Either (a) move `onAfterOpen` to a ref-stable handle (set in a separate effect, read inside the open effect) to avoid stale-closure-style surprises, or (b) explicitly mention in the JSDoc that `onAfterOpen` fires exactly once per false→true transition.

```ts
const onAfterOpenRef = useRef(onAfterOpen)
useEffect(() => { onAfterOpenRef.current = onAfterOpen }, [onAfterOpen])

useEffect(() => {
  // ... use onAfterOpenRef.current(dialog) instead of onAfterOpen?.(dialog)
}, [open])
```

### WR-06: SetupCard maps items using `it.label` as React key

**File:** `src/components/SetupCard.tsx:50-52`
**Issue:** `items.map((it) => <SettingCell key={it.label} ... />)`. If two items share the same `label` (e.g. two cells both labeled "Duration" in some future composition), React will warn and DOM diffing will be incorrect. Today the call sites (`PracticeSettingsView.tsx` via `buildSetupCardSummary`) emit unique labels per practice, so this is latent. The label is also a localized string — locale changes shouldn't collide in practice, but the key is semantically the wrong choice.

**Fix:** Either accept an explicit `id` per item, or use the array index (stable, since the order is fixed per practice):

```tsx
interface SetupCardItem {
  id: string  // stable identifier
  label: string
  value: string
}
// ...
{items.map((it) => <SettingCell key={it.id} label={it.label} value={it.value} />)}
```

### WR-07: LearnPanel uses paragraph TEXT as React key when splitting body

**File:** `src/components/LearnPanel.tsx:91-93`
**Issue:** `explainer.forrest.body.split('\n\n').map((paragraph) => <p key={paragraph} ...>{paragraph}</p>)`. Duplicate paragraphs (whether from a content edit, locale translation, or accidental copy/paste in `lockedCopy.ts`) would produce duplicate React keys. The same anti-pattern exists in `CueGlyph.tsx:127-129` and `:131-133` where SVG path data (a string) is the key — but those lists are static and locked, so the collision risk is zero. The LearnPanel case is content-driven and editor-mutable.

**Fix:** Use the array index since paragraph order is the natural identifier:

```tsx
{explainer.forrest.body.split('\n\n').map((paragraph, i) => (
  <p key={i} className={`${BODY_CLASSES} [&:not(:first-of-type)]:mt-2`}>{paragraph}</p>
))}
```

## Info

### IN-01: LanguagePicker has an orphan `id="language-picker-label"` with no consumer

**File:** `src/components/LanguagePicker.tsx:18`
**Issue:** The `<p id="language-picker-label">` carries an explicit id but no element references it via `aria-labelledby` (the `SegmentedControl` is labelled via `ariaLabel={sectionLabel}` — a separate, redundant copy of the same string). Either the id was meant to be wired and isn't, or it's dead code from a refactor. Compare with sibling pickers (`OrbPicker.tsx:21`, `RingCuePicker.tsx:20`) that drop the id entirely.

**Fix:** Drop the id, or wire it as `aria-labelledby` on the SegmentedControl (which would require extending `SegmentedControlProps` to accept `labelledBy`):

```tsx
<p className={sectionLabelHidden ? 'sr-only' : 'mb-2 ...'}>{sectionLabel}</p>
```

### IN-02: OrbShape halo lists use array index as React key

**File:** `src/components/OrbShape.tsx:461, 476`
**Issue:** `V1_HALOS.map((h, i) => <div key={i} ...>)`. The lists are `as const` and never reorder, so `key={i}` is functionally safe — but the project's idiomatic key choice (e.g. `CueGlyph.tsx:128` `key={d}` and `:132` `key={...coord-string}`) prefers content-derived keys. Use the `token` field (unique per entry) for consistency.

**Fix:**
```tsx
V1_HALOS.map((h) => <div key={h.token} ...>)
SPIRITUAL_EYE_HALOS.map((h) => <div key={h.token} ...>)
```

### IN-03: LearnAnchor / SettingsAnchor remain focusable when "disabled"

**File:** `src/components/LearnAnchor.tsx:13-25`, `src/components/SettingsAnchor.tsx:13-25`
**Issue:** The disabled state is implemented via `aria-disabled={disabled || undefined}` + `onClick={disabled ? undefined : onClick}` rather than the native `disabled` attribute. The button remains focusable and clickable (no-op). Comment in `LearnAnchor.tsx:2-3` documents this as intentional ("aria-disabled + no-op click handler"), and it is a defensible pattern (keeps tab order stable; SR announces "dimmed"). Worth keeping a note that pressing Enter/Space on a "disabled" anchor sends no signal — there's no visual or audible feedback for that no-op.

**Fix:** No change required if intentional. If accessibility audit wants a louder signal, consider adding a brief `aria-live` hint via `aria-describedby` when activated in disabled state. (Or just live with the documented intent.)

### IN-04: SettingsPanelBody depends on Vite globals without defensive fallback

**File:** `src/components/SettingsPanelBody.tsx:165`
**Issue:** `${__APP_VERSION__} · ${__APP_BUILD_SHA__} · ${__APP_BUILD_DATE__}` interpolates Vite-time `define` globals. If any global is undefined at build time (e.g. CI misconfiguration), the UI displays literal `"undefined · undefined · undefined"` with no fallback. The `vite.config.ts` should already enforce these, but a runtime fallback keeps the About card from looking broken in a misbuild.

**Fix:** Wrap with a tiny helper:

```ts
const versionLine = [__APP_VERSION__, __APP_BUILD_SHA__, __APP_BUILD_DATE__]
  .filter(Boolean)
  .join(' · ') || 'unknown'
```

### IN-05: CuePicker passes the picker option label as `phaseLabel` to CueGlyph preview

**File:** `src/components/CuePicker.tsx:26-33`
**Issue:** `phaseLabel={label}` where `label = strings[id]` ("Text" / "Arrow" / "Nose") — a category label, not an inhale/exhale word. In labels-mode preview, `CueGlyph` renders `phaseLabel.charAt(0)` ("T" / "A" / "N") as a single-character swatch. The semantics of `phaseLabel` in the CueGlyph interface is documented as "the localized In/Out word" (`CueGlyph.tsx:102`), but the CuePicker reuses it as a generic glyph-fallback string. This works because `preview=true` skips the sr-only span (so screen readers never hear the wrong word), but the prop API conflates two unrelated concerns.

**Fix:** Split into two props on CueGlyph: `phaseLabel` (the In/Out word; required when `preview=false`) and `previewLabel` (the glyph-mode preview character; optional, defaults to `phaseLabel.charAt(0)`).

### IN-06: Inline px-style values throughout instead of Tailwind utilities

**File:** Multiple — `FeedbackTime.tsx:37-44`, `FeedbackCount.tsx:48-66`, `SetupCard.tsx:36-41`, `SettingsSheet.tsx:54-59`, `SettingsSectionHeader.tsx:30-37`, `SessionReadout.tsx:72-92`
**Issue:** Many components use inline `style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', ... }}` rather than Tailwind utility classes. Comments justify this as "spike-locked verbatim transcription" (see `FeedbackCount.tsx:9-16`), which is the documented project discipline per the spike-implementation-fidelity rule. **Not a defect** under this codebase's conventions, but a small risk: spike-locked numeric values now exist as duplicated literals in many files. If a future redesign updates the design system, find/replace will miss any of these. Consider centralizing the spike-locked typography scale into a shared `typographyTokens.ts` file.

**Fix:** Optional — extract repeated style blocks into shared constants:

```ts
// src/components/typographyTokens.ts
export const SECTION_HEADER_STYLE = { fontSize: 11, fontWeight: 500, letterSpacing: '0.16em' } as const
export const FEEDBACK_PRIMARY_STYLE = { fontSize: 36, fontWeight: 600, letterSpacing: '-0.01em' } as const
// ...
```

---

_Reviewed: 2026-05-26T13:33:32Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
