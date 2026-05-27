---
phase: 48
chunk: components-primitives
fixed_at: 2026-05-26
review_path: .planning/phases/48-appearance-page-i18n/48-REVIEW-components-primitives.md
iteration: 1
findings_in_scope: 14
fixed: 10
skipped: 4
status: partial
---

# Phase 48 / components+primitives: Code Review Fix Report

**Fixed at:** 2026-05-26
**Source review:** `.planning/phases/48-appearance-page-i18n/48-REVIEW-components-primitives.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 14 (5 warnings + 9 info)
- Fixed: 10 (5 warnings + 5 info)
- Skipped: 4 (4 info — 1 spike-locked, 3 moot after WR-03 deletion)

## Fixed Issues

### WR-01: SegmentedControl is missing the `disabled:opacity-45` visual cue
**Files modified:** `src/components/primitives/SegmentedControl.tsx`
**Commit:** `8a9e071`
**Applied fix:** Added `disabled:opacity-45` to the option-button className alongside the existing `disabled:cursor-not-allowed`. Now matches the disabled treatment used by every other interactive primitive (Pill — now deleted, Toggle, Stepper, IconButton, PickerCardGrid). The 45% value is not spike-locked to a different value; it is the sibling pattern.

### WR-02: Consolidate MuteToggle icons + delete the other unused icon exports
**Files modified:** `src/components/MuteToggle.tsx`, `src/components/icons/index.ts`, `src/components/icons/CloseIcon.tsx` (deleted), `src/components/icons/GearIcon.tsx` (deleted), `src/components/icons/InfoIcon.tsx` (deleted), `src/components/icons/ShareIcon.tsx` (deleted)
**Commit:** `58240ab`
**Applied fix:** Took the reviewer's preferred option (a). Wired `MuteToggle` to import `SpeakerIcon`, `SpeakerMutedIcon`, and `RefreshIcon` from the centralized library and deleted the three private duplicates (`SpeakerIcon`, `SpeakerSlashIcon`, `ResumeIcon`) at the bottom of the file. The icons library's existing `SpeakerMutedIcon` already had the same path geometry as MuteToggle's `SpeakerSlashIcon`, and `RefreshIcon` matches `ResumeIcon` — no new icon files needed, only the import wiring. Runtime visual output is preserved byte-for-byte: MuteToggle passes `width={20} height={20} strokeWidth={2}` explicitly on each icon usage, matching the prior inline values. The MuteToggle SVG-shape tests (`path`-count = 3 for speaker-on, `line`-count = 2 for slash, `path`+`polyline` for resume) still hold because the icon path data is identical.

Deleted four icons that had zero importers anywhere in `src/` and no `.planning/` backlog reservation: `CloseIcon`, `GearIcon`, `InfoIcon`, `ShareIcon`. The only `.planning/` references were a descriptive catalog in `REFACTOR-LOOP-STATE.md` (a state document, not a feature backlog) and spike 010's HTML.

### WR-03: Delete unused `ArrowLink`, `Eyebrow`, `Pill` primitives
**Files modified:** `src/components/primitives/ArrowLink.tsx` (deleted), `src/components/primitives/ArrowLink.test.tsx` (deleted), `src/components/primitives/Eyebrow.tsx` (deleted), `src/components/primitives/Eyebrow.test.tsx` (deleted), `src/components/primitives/Pill.tsx` (deleted), `src/components/primitives/Pill.test.tsx` (deleted), `src/components/primitives/index.ts`
**Commit:** `bf8bd2b`
**Applied fix:** Deleted all three components and their tests. Grep across `src/` confirmed zero importers outside the components' own files. `.planning/` references were limited to the REFACTOR-LOOP-STATE.md descriptive table (Item B catalog) and the 41-spike-mono-zen summary — neither a backlog reservation. Removed corresponding barrel exports from `primitives/index.ts` and dropped the now-stale "None of these are consumed by any surface yet — they become the toolkit for items C/D/E" comment from the file header.

Side effect: findings IN-02 (ArrowLink href tightening), IN-03 (Pill aria-pressed vs radio semantics), and IN-09 (ArrowLink motion-reduce) are now moot — see Skipped Issues.

### WR-04: PickerCardGrid requires `disabled` but every sibling defaults it
**Files modified:** `src/components/primitives/PickerCardGrid.tsx`
**Commit:** `0333b55`
**Applied fix:** Changed `disabled: boolean` to `disabled?: boolean` and added `disabled = false` to the destructured props. Existing consumers (`CuePicker`, `ThemePicker`, `TimbrePicker`) all pass `disabled` explicitly so behavior is unchanged; the API now matches IconButton / SegmentedControl / Stepper / Toggle / Pill. `tsc --noEmit` clean.

### WR-05: Move Stepper's MinusGlyph / PlusGlyph into icons/
**Files modified:** `src/components/icons/MinusIcon.tsx` (new), `src/components/icons/PlusIcon.tsx` (new), `src/components/icons/index.ts`, `src/components/primitives/Stepper.tsx`
**Commit:** `d1ebecf`
**Applied fix:** Created `MinusIcon.tsx` and `PlusIcon.tsx` in `components/icons/` following the same shape as every other icon (24×24 viewBox + `currentColor` stroke + 1.5 stroke-width default + `SVGProps<SVGSVGElement>` for override). Stepper now imports them and passes `width={16} height={16}` to preserve the existing 16-pixel render size. Visual output is preserved verbatim — same path data, same strokeLinecap, same viewBox.

The matching ArrowGlyph relocation from ArrowLink is no longer needed because ArrowLink was deleted in WR-03.

### IN-01: IconButton docstring says "Round white icon button" but bg is theme-aware
**Files modified:** `src/components/primitives/IconButton.tsx`
**Commit:** `8b261ff`
**Applied fix:** Changed the opening phrase from "Round white icon button" to "Round surface-colored icon button". The component's background is `bg-[var(--color-breathing-surface)]`, which is theme-aware (#252932 under dark). "Surface-colored" honors the existing token name without claiming a specific hue.

### IN-04: Toggle.label is aria-label only — no way to associate a visible label
**Files modified:** `src/components/primitives/Toggle.tsx`
**Commit:** `787e1fa`
**Applied fix:** Added an optional `id?: string` prop. When set, it propagates to the underlying `<button id={...}>` so consumers can wire a visible adjacent label via `<label htmlFor={id}>` (the common settings-row pattern). Non-breaking — existing consumers using the aria-label-only path continue unchanged. Docstring documents the visible-label pattern. No state-machine / audio / persistence change (design-logic separation honored).

### IN-05: ChevronBackIcon lacks `dir="rtl"` mirroring affordance
**Files modified:** `src/components/icons/ChevronBackIcon.tsx`
**Commit:** `c31c9bc`
**Applied fix:** Added Tailwind's `rtl:rotate-180` variant to the SVG `className`. Under LTR (the only direction shipping today) the class is inert; under RTL (future Hebrew/Arabic locales — chunk is part of the i18n phase) the chevron flips to point right, which is the correct back affordance. Extracted `className` from `SVGProps` so consumer overrides merge (consumer-supplied class is appended after `rtl:rotate-180`).

### IN-06: SectionCard.padding loosely typed as `string`
**Files modified:** `src/components/primitives/SectionCard.tsx`
**Commit:** `b10bc0a`
**Applied fix:** Tightened `padding: string` to `padding: CSSProperties['padding']`. Same vendored React-types union that the inline `style.padding` attribute uses. Existing consumers (`SettingsPanelBody`, `AppearancePage`) pass shorthand strings like `"16px"` / `"14px 16px"` — those continue to typecheck. Numbers still rejected (which was the desired behavior — `padding={0}` was already a bug-trap per the reviewer's note). `tsc --noEmit` clean.

### IN-07: PageShell `<main>` has no `<h1>` contract
**Files modified:** `src/components/primitives/PageShell.tsx`
**Commit:** `9c52d87`
**Applied fix:** Documentation only. Added a "Heading contract" paragraph to the docstring stating that callers must provide a `<TopAppBar>` (or equivalent `<h1>`-bearing header) as the first child to satisfy the document-outline requirement. Every current consumer already does this; the change makes the convention explicit so future page authors do not break it.

## Skipped Issues

### IN-02: ArrowLink treats `href=""` as a valid anchor
**File:** `src/components/primitives/ArrowLink.tsx:30`
**Reason:** Moot. ArrowLink was deleted in WR-03 (zero importers). No file to tighten.

### IN-03: Pill uses `aria-pressed` but is described as a "selection group" member
**File:** `src/components/primitives/Pill.tsx:38`
**Reason:** Moot. Pill was deleted in WR-03 (zero importers). The contradictory docstring no longer exists.

### IN-08: Empty 36×36 placeholders in TopAppBar use `size-9` (size mismatch with `size-10` IconButtons)
**File:** `src/components/primitives/TopAppBar.tsx:23,27`
**Reason:** **Spike-locked.** TopAppBar's docstring explicitly reproduces spike 010's `width: 36, height: 36` placeholder dimensions ("Empty 36×36 placeholders maintain title centering when a slot is absent (mirrors spike's L1051 `<div style={{ width: 36, height: 36 }}></div>`)"). Per memory rules [[feedback_spike_locked_values]] and [[project_v16_visual_locks]], spike-locked visual values must be applied verbatim and not re-surfaced. The reviewer's suggested fix (`size-10` placeholders, 40×40) would re-tune a value that the spike deliberately locked at 36×36. The visual centering drift the reviewer noted is real but accepted as a downstream consequence of honoring the spike; if the operator decides to re-tune the placeholder size later, that is a new design decision, not a code-review fix.

### IN-09: ArrowLink.ArrowGlyph ignores `motion-reduce` for stroke transitions
**File:** `src/components/primitives/ArrowLink.tsx:52-69`
**Reason:** Moot. ArrowLink was deleted in WR-03. The reviewer's own note said "None required today. Document in a comment for future maintainers" — and per the [[feedback_no_design_locking]] memory rule, comments should not anchor references to deleted code or scheduled-but-not-yet-done changes, so there is no value in dropping a future-tense comment elsewhere.

---

## Verification

- `npx tsc --noEmit` runs clean across the whole project after every commit and after all 10 fixes landed.
- No new tests added (per the chunk-priority guidance — "NEVER add a byte-locking test for a design value"). Existing tests continue to apply: `MuteToggle.test.tsx` SVG path-count assertions still hold because the consolidated icons have identical path geometry; `PickerCardGrid.test.tsx` `disabled: false` path now exercises the default; `Stepper.test.tsx` button-by-label assertions are unchanged.
- No state-machine / audio / persistence / business-logic changes ([[feedback_design_logic_separation]] honored throughout).
- No hardcoded hex / Tailwind palette class introduced ([[feedback_no_design_locking]] honored).
- Per-finding commit pattern `fix(48-components-primitives-{ID}): <summary>` followed for all 10 commits.

---

_Fixed: 2026-05-26_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
_Chunk: components/icons + components/primitives_
