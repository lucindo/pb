---
phase: 48-appearance-page-i18n
chunk: components-primitives
reviewed: 2026-05-26T00:00:00Z
depth: deep
files_reviewed: 22
files_reviewed_list:
  - src/components/icons/ChevronBackIcon.tsx
  - src/components/icons/ChevronRightIcon.tsx
  - src/components/icons/CloseIcon.tsx
  - src/components/icons/GearIcon.tsx
  - src/components/icons/InfoIcon.tsx
  - src/components/icons/RefreshIcon.tsx
  - src/components/icons/ShareIcon.tsx
  - src/components/icons/SpeakerIcon.tsx
  - src/components/icons/SpeakerMutedIcon.tsx
  - src/components/icons/index.ts
  - src/components/primitives/ArrowLink.tsx
  - src/components/primitives/Eyebrow.tsx
  - src/components/primitives/IconButton.tsx
  - src/components/primitives/PageShell.tsx
  - src/components/primitives/PickerCardGrid.tsx
  - src/components/primitives/Pill.tsx
  - src/components/primitives/SectionCard.tsx
  - src/components/primitives/SegmentedControl.tsx
  - src/components/primitives/Stepper.tsx
  - src/components/primitives/Toggle.tsx
  - src/components/primitives/TopAppBar.tsx
  - src/components/primitives/index.ts
findings:
  critical: 0
  warning: 5
  info: 9
  total: 14
status: issues_found
---

# Chunk Review: `src/components/icons/*` + `src/components/primitives/*`

**Reviewed:** 2026-05-26
**Depth:** deep
**Files Reviewed:** 22
**Status:** issues_found

## Summary

The icon library is consistent in size, viewBox, stroke width, and `aria-hidden`
treatment. The primitive library has a usable, well-typed surface that
composes well with the icons.

The dominant theme in this chunk is **dead exports from the barrel files**:
seven of nine icons and three of eleven primitives have **zero non-barrel
callers in the codebase**, and `SpeakerIcon` is actively shadowed by a private
duplicate inside `MuteToggle.tsx`. This is a maintenance hazard (multiple
sources of truth for the same glyph, design drift across copies, future
"unused-export" lint failures) rather than a correctness bug.

The secondary theme is **prop-API inconsistency across primitives** — some
have defaulted `disabled?`, others require it; some apply
`disabled:opacity-45` for visual feedback, `SegmentedControl` silently does
not. None of these break runtime, but they erode the "consistent primitive
toolkit" promise stated in `primitives/index.ts`.

No critical bugs, no security defects, no accessibility blockers. Several
warnings touch a11y semantics (`aria-pressed` on `Pill` used as a radio,
`SegmentedControl` disabled state being visually indistinguishable, minus-key
keyboard activation on `Toggle` is fine because it's a native `<button>`).

## Structural Findings (fallow)

No `<structural_findings>` payload was provided for this chunk; the section
is retained for layout compliance.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: `SegmentedControl` is missing the `disabled:opacity-45` visual cue

**File:** `src/components/primitives/SegmentedControl.tsx:52`
**Issue:** Every other interactive primitive in this chunk
(`Pill`, `Toggle`, `Stepper`, `IconButton`, `PickerCardGrid`) sets both
`disabled:cursor-not-allowed` AND `disabled:opacity-45` on the disabled
state. `SegmentedControl` sets only `disabled:cursor-not-allowed`. When a
consumer passes `disabled={true}` the control still renders at full opacity
and full colour, indistinguishable from the enabled state. The container
gains `aria-disabled` for screen readers, but sighted users get no visual
cue. This is a real a11y regression for low-vision users who rely on
luminance rather than the assistive tree.
**Fix:**
```tsx
// SegmentedControl.tsx button className, add disabled:opacity-45
className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${
  isActive
    ? 'bg-[var(--color-breathing-accent)] font-semibold text-[var(--color-breathing-on-accent)]'
    : 'font-medium text-[var(--color-breathing-text-soft)]'
}`}
```

### WR-02: Dead exports in `components/icons/index.ts` (7 of 9 icons unused)

**File:** `src/components/icons/index.ts:12-18`
**Issue:** `CloseIcon`, `GearIcon`, `InfoIcon`, `RefreshIcon`, `ShareIcon`,
`SpeakerIcon`, and `SpeakerMutedIcon` have **zero importers** anywhere in
`src/` outside `components/icons/`. Only `ChevronBackIcon` (6 usages) and
`ChevronRightIcon` (2 usages) are actually consumed.

`SpeakerIcon` is worse than unused — `src/components/MuteToggle.tsx:63`
defines a **private function `SpeakerIcon()`** with the same name that
shadows the barrel export wherever it's the local symbol. Two icons named
`SpeakerIcon` now exist with potentially different paths/strokes — if the
spike-locked design tweaks one, the other will silently desync.

Evidence:
```
$ grep -rE "\b(CloseIcon|GearIcon|InfoIcon|RefreshIcon|ShareIcon|SpeakerMutedIcon)\b" src --include="*.tsx" --include="*.ts" | grep -v "components/icons/"
(no output)

$ grep -rE "\bSpeakerIcon\b" src --include="*.tsx" --include="*.ts" | grep -v "components/icons/"
src/components/MuteToggle.tsx:55:  ...muted ? <SpeakerSlashIcon /> : <SpeakerIcon />
src/components/MuteToggle.tsx:63:function SpeakerIcon() {
```

**Fix:** Either (a) wire `MuteToggle.tsx` to import the centralized
`SpeakerIcon` + add a `SpeakerSlashIcon` to the icons library and delete
the private duplicates, OR (b) delete the unused exports from
`components/icons/index.ts` and the corresponding `.tsx` files until a
consumer actually needs them. Option (a) is preferred — the icons exist
specifically to centralize chrome glyphs (per the index docstring), so the
private `SpeakerIcon` / `SpeakerSlashIcon` / `ResumeIcon` in `MuteToggle.tsx`
are exactly the duplication the library was created to prevent.

### WR-03: Dead exports in `components/primitives/index.ts` (`ArrowLink`, `Eyebrow`, `Pill`)

**File:** `src/components/primitives/index.ts:10-11,13-14,25-26`
**Issue:** `ArrowLink`, `Eyebrow`, and `Pill` have **zero importers** in the
codebase. The barrel comment ("None of these are consumed by any surface
yet — they become the toolkit for items C/D/E") was written before the
adoption pass; eight of the eleven primitives are now in active use, but
these three never landed in any surface and have been carrying tests,
prop-types, and 20–70 lines of styling each without a single caller.

Evidence:
```
$ for p in ArrowLink Eyebrow Pill; do
    n=$(grep -rE "\b$p\b" src --include="*.tsx" --include="*.ts" | grep -v "components/primitives/" | wc -l)
    echo "$p: $n usages"
  done
ArrowLink: 0 usages
Eyebrow: 0 usages
Pill: 0 usages
```

**Fix:** Either consume them (if there's a planned surface) or delete the
files and remove the exports from `primitives/index.ts`. Dead primitives
encourage future "I'll just inline it" diffs because authors don't trust
the library.

### WR-04: `PickerCardGrid` requires `disabled` but every sibling primitive defaults it

**File:** `src/components/primitives/PickerCardGrid.tsx:13`
**Issue:** `PickerCardGrid` defines `disabled: boolean` as a **required**
prop, while `IconButton`, `Pill`, `SegmentedControl`, `Stepper`, and
`Toggle` all declare `disabled?: boolean` with a `false` default. The
inconsistency forces every consumer (`CuePicker`, `ThemePicker`,
`TimbrePicker`) to pass `disabled={false}` explicitly. This drift will
cause future TS errors when copy-pasted from one picker to another, and
the asymmetry is undocumented.
**Fix:**
```tsx
// PickerCardGrid.tsx
export interface PickerCardGridProps<T extends string> {
  // ...
  disabled?: boolean // make optional
  // ...
}

export function PickerCardGrid<T extends string>({
  // ...
  disabled = false, // add default
  // ...
}: PickerCardGridProps<T>): ReactElement {
```

### WR-05: Chrome glyphs inlined in `Stepper` and `ArrowLink` duplicate icon-library invariants

**File:** `src/components/primitives/Stepper.tsx:62-95`,
`src/components/primitives/ArrowLink.tsx:52-69`
**Issue:** `Stepper` defines private `MinusGlyph` / `PlusGlyph` and
`ArrowLink` defines a private `ArrowGlyph` — all three are 16×16 SVGs with
the same viewBox/stroke-width/cap/join as the icons library. The icon
library docstring (`icons/index.ts:1-8`) says these are
**centralized chrome icon library** glyphs; the inline copies are
structurally chrome glyphs (purely decorative arrow / plus / minus). If a
spike re-tunes stroke-width or arrow geometry, the icon library will
update but Stepper and ArrowLink will silently drift. This is the same
duplication pattern WR-02 calls out for `SpeakerIcon`.

This is not a runtime bug today — it's a future-divergence hazard. Filing
as a warning because the spike-locked design system explicitly tries to
prevent this.

**Fix:** Move `MinusIcon`, `PlusIcon`, `ArrowRightIcon` into
`components/icons/` and re-import them in `Stepper.tsx` and
`ArrowLink.tsx`. Existing 16×16 sizing can flow through the
`width`/`height` overrides via `SVGProps`. Alternatively, add a comment in
the docstrings explicitly accepting the duplication if the project
position is that 16-pixel arrows-of-action are NOT chrome and DO belong
inline with the primitive that uses them.

## Info

### IN-01: `IconButton` docstring says "Round white icon button" but background is theme-aware

**File:** `src/components/primitives/IconButton.tsx:21`
**Issue:** The docstring opens with **"Round white icon button"** but the
background is `bg-[var(--color-breathing-surface)]`, which is `#252932`
under the dark theme (`theme.css:71`). The phrase is a leftover from
light-only design. Misleading to a future reader scanning the file.
**Fix:** Change to "Round surface-colored icon button" or "Round
elevation-1 icon button" — keeps the design intent (raised chip on the
page bg) without claiming a specific hue.

### IN-02: `ArrowLink` treats `href=""` as a valid anchor

**File:** `src/components/primitives/ArrowLink.tsx:30`
**Issue:** The discriminator is `'href' in props && props.href !== undefined`
but an empty string passes both checks, producing `<a href="">` which
reloads the current page on click. A `href` should at minimum be non-empty
when present.
**Fix:** Tighten the check to `props.href !== undefined && props.href !== ''`,
or accept that the type system never lets a button-variant caller pass
`href=""` and the anchor-variant caller is explicitly opting into an
on-page anchor. If the latter, leave as-is.

### IN-03: `Pill` uses `aria-pressed` but is described as a "selection group" member

**File:** `src/components/primitives/Pill.tsx:38`
**Issue:** The docstring says `active={true}` is **"used when a pill is
part of a selection group and one is the current value."** That's
single-select semantics, which maps to `role="radio"` +
`aria-checked` (or `aria-selected` on a tablist), not `aria-pressed`.
`aria-pressed` is the WAI-ARIA pattern for **toggle buttons** — independent
on/off state, not "one-of-N selected." Because `Pill` has zero callers
(see WR-03) this is theoretical, but if a future consumer wires it up as
a selection group screen-readers will announce "toggle button pressed"
where they should announce "radio button selected."
**Fix:** Either drop the "selection group" language from the docstring and
keep `aria-pressed` (Pill is a toggle button), or expose a `role` prop
that lets consumers pick between toggle and radio semantics.

### IN-04: `Toggle.label` is `aria-label` only — no way to associate a visible label

**File:** `src/components/primitives/Toggle.tsx:5,25-26`
**Issue:** The `label` prop drives `aria-label` exclusively. When a
consumer wants a visible adjacent label (the common settings-row pattern)
they cannot click the label text to toggle the switch — the label and the
switch are two unconnected elements. The native `<label>` /
`for`+`id` association is also unavailable since the component owns no
`id`. Workaround in `SettingsToggleRow.tsx` exists but is fragile.
**Fix:** Add an optional `id` prop and document the "visible label →
external `<label htmlFor>`" pattern, or expose `aria-labelledby` as an
alternative to `label`. Non-breaking change.

### IN-05: `ChevronBackIcon` lacks `dir="rtl"` mirroring affordance

**File:** `src/components/icons/ChevronBackIcon.tsx:17`
**Issue:** The chevron points left (`15 6 → 9 12 → 15 18`), which is
correct for LTR "back". In RTL locales the "back" affordance points the
other way. Since the chunk is part of the **i18n phase**
(48-appearance-page-i18n) and Hebrew/Arabic locales may land later, the
icon currently emits the wrong direction in RTL. This is an INFO because
no RTL locale appears in the project today (`src/i18n/` shows EN/PT only,
per the broader review chunks).
**Fix:** Either wrap in `<svg className="rtl:rotate-180" ...>` (Tailwind
direction variant) or document that consumers must rotate per direction.
If RTL is explicitly out of scope, ignore this.

### IN-06: `SectionCard.padding: string` is loosely typed — passing `0` is a bug-trap

**File:** `src/components/primitives/SectionCard.tsx:18,29`
**Issue:** Typed as `padding: string`. The CSS will accept anything (`"16px"`,
`"14px 16px"`, `"1rem"`, but also `"banana"` — silently no-op). A typo
will not throw at compile or runtime. Numbers (`padding={0}`) won't even
typecheck, which is correct for catching the `0` case, but the broad
`string` accepts garbage.
**Fix:** Either keep `string` and accept the loose contract, or use a
union like `CSSProperties['padding']` for richer IDE hints. Optional.

### IN-07: `PageShell` `<main>` is rendered without a `<h1>` guarantee

**File:** `src/components/primitives/PageShell.tsx:30-41`
**Issue:** `PageShell` renders the page-level `<main>`. The TopAppBar (not
nested inside `<section>` because its title is a page-level `<h1>`) is
provided by callers as part of `children`. There is no API contract that a
PageShell child must include a single `<h1>` for the document outline.
Today every page (`AppearancePage`, `LearnPage`, `AppSettingsPage`,
`PracticeScreen`) does include `TopAppBar`, but the structure is held
together by convention rather than the type system.
**Fix:** Documentation only — add a sentence to the docstring stating
"Callers must provide a `<TopAppBar>` (or equivalent `<h1>`-bearing
header) as the first child to satisfy the page-level heading
requirement." Not a runtime issue.

### IN-08: Empty 36×36 placeholders in `TopAppBar` use `size-9` (size mismatch)

**File:** `src/components/primitives/TopAppBar.tsx:23,27`
**Issue:** The docstring says **"36×36 leading slot, … 36×36 trailing
slot"** and reproduces the spike's `width: 36, height: 36` placeholders.
The implementation uses Tailwind `size-9`, which is `36px` (9 × 4px) —
correct. But the leading/trailing `IconButton`s default to `size='md'`,
which is `size-10` (40px). So when a slot has an IconButton it is 40×40,
and when it's a placeholder it is 36×36 — the title centering subtly
shifts between pages depending on whether each slot is present.
**Fix:** Either set the placeholders to `size-10` to match the default
IconButton size, OR have the page consistently pass `size='sm'` (32px)
icon buttons (which would still drift from 36 placeholders). The cleanest
fix is `size-10` placeholders, matching the actual IconButton footprint.
Visual issue only; no assistive impact.

### IN-09: `ArrowLink.ArrowGlyph` ignores `motion-reduce` for stroke transitions

**File:** `src/components/primitives/ArrowLink.tsx:52-69`
**Issue:** `ArrowLink`'s outer anchor/button class has
`motion-reduce:transition-none`, but the inner `ArrowGlyph` SVG has no
transitions at all so this is moot today. Filed as info because if a
future hover-translate animation is added to the glyph (a common CTA
pattern: "arrow slides 2 px right on hover"), `motion-reduce` will need to
be applied to the inner SVG too. Pre-emptive note, not a current defect.
**Fix:** None required today. Document in a comment for future maintainers.

---

## Cross-File Observations (deep-depth)

1. **Type API parity audit.** Of the 11 primitives, only `PickerCardGrid`
   requires `disabled`; the rest default it. Only `IconButton` exposes a
   `buttonRef` escape hatch (the other interactive primitives offer none).
   Only `IconButton` and `Pill` expose `type='button' | 'submit'` — `Toggle`,
   `Stepper`, `PickerCardGrid`, `SegmentedControl` are hard-coded to
   `type="button"` (which is correct for those, since they never go inside
   `<form>`s). The asymmetries are defensible per-case but undocumented as
   a whole.

2. **`focus-visible:ring-breathing-accent` is the single ring token across
   all primitives.** Tailwind `@theme` block at `src/styles/theme.css:1-60`
   exposes `--color-breathing-accent`, so the `ring-breathing-accent` class
   resolves correctly through both themes. Confirmed no hardcoded
   `ring-blue-500` or similar leaks.

3. **`role="radio"` without `role="radiogroup" tabindex` keyboard navigation.**
   `PickerCardGrid` and `SegmentedControl` both render
   `role="radiogroup"` containers with `role="radio"` children. The WAI-ARIA
   pattern expects arrow-key navigation between radio buttons; here, the
   buttons are native `<button>` elements with default Tab behaviour, so
   the user must Tab through every radio rather than Arrow-key between
   them. Not a bug per the project's design choice (Tab navigation is
   simpler and more discoverable), but worth flagging if the project
   adopts WCAG AAA. Filing as a cross-file observation, not a finding,
   because it is consistent across both primitives.

4. **Icon library invariants verified for all 9 icons:**
   - All use `viewBox="0 0 24 24"`.
   - All use `width="24" height="24"` defaults.
   - All set `stroke="currentColor"`, `stroke-width="1.5"`.
   - All set `aria-hidden="true"` (correct — they are always paired with a
     labelled `IconButton` or similar).
   - All accept `SVGProps<SVGSVGElement>` so consumers can override.
   - None set `focusable="false"` (legacy IE11 attribute) — modern React
     spreads do not strip it, so it would survive if added, but its
     omission is fine for evergreen browsers.

5. **Hardcoded color check.** No hex values appear in any primitive or
   icon — all colors flow through `var(--color-*)` tokens. The one
   `rgba(0,0,0,0.15)` in `Toggle.tsx:38` is a knob drop-shadow alpha,
   which is acceptable as a non-themable shadow channel (the dark theme
   inherits the same neutral shadow).

6. **No security-relevant patterns** (no `dangerouslySetInnerHTML`, no
   `eval`, no string-built HTML, no JSON.parse on untrusted input, no
   localStorage reads in this chunk).

---

_Reviewed: 2026-05-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Chunk: components/icons + components/primitives_
