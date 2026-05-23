# Architecture refactor loop — live state

**What this is:** A 4-step propose/go/implement/approve loop, executing the architecture refactors that v2.0 needs before any redesign work can resume safely. After three operator-led refactor runs (commits `d2c50ed`, `6245525`, `c0ae572`) the codebase has clean view-model / hook / domain / audio / storage separation. These items finish that work and add the primitives needed to compose the v2.0 design.

**Resume prompt (stable — paste this after `/clear`):**

```
Read .planning/REFACTOR-LOOP-STATE.md and pick up where we left off. Chat mode only — no pickers.
```

---

## Workflow per item

1. **Propose** — I print: goal, scope (files), risk. Wait.
2. **Go / change** — Operator says "go" or proposes modifications.
3. **Implement** — I do the work, commit atomically, print a summary.
4. **Approve** — Operator reviews. "Next" advances; otherwise fix.

State below is updated after every step transition.

---

## Items (in execution order — A renumbered after architecture report revision)

| Tag | Item | Status |
|-----|------|--------|
| A | Theme tokens: elevation + scrim + destructive. Route `EndSessionDialog` off its hardcoded hex through the new destructive token. | ✓ done — commit `0c1d372` |
| B | Design-primitive component library (`Card`, `Pill`, `SegmentedControl`, `IconButton`, `Eyebrow`, `ArrowLink`, `Stepper`, `Toggle`) + icon/glyph library (centralized SVGs). | ✓ done — commit `c0bfe60` |
| C | `PageShell` + `TopAppBar` primitives. Extract `AppHeader` (currently inline in `AppScreen.tsx`) into a real component. | ✓ done — commit `88305ea` |
| D | Surface routing: introduce `appScreen` state (`'practice' \| 'learn' \| 'appSettings'`), add `ScreenRouter`. `LearnDialog` / `SettingsDialog` migrate to `LearnPage` / `AppSettingsPage` composed from primitives + PageShell. | **implemented — awaiting operator approval** |
| E | Unified `PickerCardGrid<T>` primitive — collapses `CuePicker` / `LanguagePicker` / `ThemePicker` / `TimbrePicker` into one data-driven component. | pending |
| F | Cleanup pass: `shapeConstants.ts` single-source-of-truth (TS↔CSS), `PracticeContext` provider replacing prop drilling, `UiStrings` surface-vocabulary rename plan, App.*.test.tsx vs. unit-test overlap audit, `CueGlyph` inline-style → className, presentation-safe type re-exports. | pending |
| G | Dead-code purge — delete `LearnDialog`, `SessionReadout`, `NKSessionReadout`, `StatusPanel`, `SettingsAnchor`, `LearnAnchor`, `SettingsDialog` (and tests) once their replacements are live. (Originally Item A; moved here after verifying all of them still have live importers in current state.) | pending |

---

## Current focus

**Item:** D — Surface routing (`appScreen` + `ScreenRouter`); Learn/Settings become pages
**Step:** 4 (implemented + committed, awaiting operator approval)

### Implementation summary

All five defaults honored: single commit, no browser-history integration, focus the back button on mount, install banner gated to PracticeScreen, `AppDialogsView` renamed to `EndSessionDialogsView`.

**Files added (12):**

`src/app/`
- `useAppNavigation.ts` + `useAppNavigation.test.tsx` — replaces `useAppDialogs`. State: `appScreen: 'practice' | 'learn' | 'appSettings'`. Same `controlsDisabled` + `closeOnSessionView` gates.
- `ScreenRouter.tsx` + `ScreenRouter.test.tsx` — switch on `vm.dialogs.appScreen`; dispatches to `PracticeScreen` / `LearnPage` / `AppSettingsPage`. Tested with mocked page modules.
- `PracticeScreen.tsx` — renamed from `AppScreen.tsx`. Renders the practice surface; install banner now lives only here (not on Learn/Settings).
- `EndSessionDialogsView.tsx` — renamed from `AppDialogsView.tsx`. Renders only the end-session confirmation modals (those stay modal — they're confirmation flows, not destinations).
- `pages/LearnPage.tsx` + `pages/LearnPage.test.tsx` — `PageShell` + `TopAppBar` (back chevron leading slot) + Card-wrapped `LearnPanel`. Focuses back button on mount via `IconButton`'s new `buttonRef` prop.
- `pages/AppSettingsPage.tsx` + `pages/AppSettingsPage.test.tsx` — same shape; wraps `SettingsPanelBody`. `inSessionView` hard-coded to false (navigation to the page is gated by `controlsDisabled`).

`src/components/`
- `LearnPanel.tsx` + `LearnPanel.test.tsx` — body extract of `LearnDialog` (sections, videos, explainer, resources, native-apps, taglines). No title, no Close button — those belong to the surrounding chrome.
- `SettingsPanelBody.tsx` + `SettingsPanelBody.test.tsx` — body extract of `SettingsPanel` (pickers + install row). No title, no Close button.

**Files modified (11):**
- `src/components/primitives/IconButton.tsx` — added optional `buttonRef` prop so pages can focus the back chevron on mount. Tests unchanged (additive prop).
- `src/components/LearnDialog.tsx` — refactored to wrap `LearnPanel` for body content. Visual output byte-equivalent; existing 31 LearnDialog tests pass unchanged.
- `src/components/SettingsPanel.tsx` — refactored to wrap `SettingsPanelBody` for picker stack + install row. Visual output byte-equivalent; existing SettingsDialog tests pass unchanged.
- `src/app/appViewModel.ts` — `AppDialogsViewModel` shape: dropped `learnOpen`/`settingsOpen`/`settingsInSessionView`/`onLearnClose`/`onSettingsClose`; added `appScreen` + `onBackToPractice`.
- `src/app/appControllerAdapters.ts` — `createAppDialogsViewModel` now takes `navigation: AppNavigation` instead of `dialogs: AppModalDialogs` + `settingsInSessionView: boolean`.
- `src/app/appControllerAdapters.test.ts` — adapter test rewritten against new signature.
- `src/app/useAppViewModel.ts` — wires `useAppNavigation` (replaces `useAppDialogs`).
- `src/app/App.tsx` — uses `ScreenRouter` instead of `AppScreen`.
- `src/app/App.locale.test.tsx` — locale switch test now navigates back to practice via the back button before asserting on the Start-session button (which only lives on PracticeScreen).
- `src/app/App.dialog.test.tsx` — WR-09 case rewritten: clicking Learn now navigates (not opens modal); the closeOnSessionView invariant is covered by `useAppNavigation.test.tsx`.

**Files deleted (4):**
- `src/app/useAppDialogs.ts` + `useAppDialogs.test.tsx` (replaced by `useAppNavigation`)
- `src/app/AppScreen.tsx` (renamed to `PracticeScreen`)
- `src/app/AppDialogsView.tsx` (renamed to `EndSessionDialogsView`)

**Files unchanged but now orphan-tested (deferred to Item G):**
- `src/components/LearnDialog.tsx` + test — component still works in isolation but nothing in the live app graph imports it (LearnPage took over the route).
- `src/components/SettingsDialog.tsx` + test — same.
- `src/components/SettingsPanel.tsx` + test — still imported only by SettingsDialog. Goes with it in Item G.

These deletions are intentionally deferred so this commit stays focused on the routing migration; Item G is the dedicated dead-code pass and will prune all three (plus SettingsAnchor / LearnAnchor) once their replacements are confirmed live.

**Honest UX deltas (not strictly architecture):**
- Learn / Settings unmount the practice surface (radial-gradient bg shows).
- Back affordance is now a top-left chevron IconButton, not a center-bottom "Close" button.
- No native focus trap (was inherent to `<dialog>`); replaced by focus-on-back-button on mount.
- Back-button aria-label reuses `strings.{learn,settings}.close` ("Close") — content unchanged.

**Verification:**
- `npx tsc --noEmit`: clean
- `npm run lint`: clean
- `npm test -- --run` full suite: **100 files / 1168 tests pass** (was 95/1136 → +5 files, +32 tests net after rewriting the two integration tests above).
- `npm run build`: production build clean (107 modules, **301 KB JS (-1 KB)** / 31 KB CSS).
- **Not yet verified in a browser** — needs operator confirmation that (a) clicking the gear / book book anchors routes to the new full-page surfaces; (b) the back chevron returns to practice; (c) starting a session from practice does NOT show Learn/Settings underneath (closeOnSessionView guarantee); (d) install banner shows only on practice.

**Commit message:** `refactor(routing): introduce appScreen + ScreenRouter; migrate Learn/Settings to pages`

### Archived — Proposal for Item D

**Goal**
Add two layout primitives — `PageShell` (page-level wrapper: bg, padding, centered max-width column) and `TopAppBar` (eyebrow + title + leading/trailing slots, `position: relative` so existing anchors still position correctly). Rewire `AppScreen` to use both, replacing its current inline `<main>` + `<section>` + `AppHeader` code. **Visual output must be byte-equivalent** — this is plumbing, not redesign.

**Why now**
Item D (`LearnPage` / `AppSettingsPage`) needs both primitives — every page needs the same shell + bar shape. Building them while extracting the practice surface's header proves the API against a known-good baseline before two more pages depend on it.

**Scope — new primitives (`src/components/primitives/`)**

| File | Purpose | API |
|------|---------|-----|
| `PageShell.tsx` | Page wrapper: radial-gradient `<main>` + centered `<section>`. Children render inside the section. | `<PageShell minHeightCompensation="3rem"\|"4rem" align="start"\|"center">…</PageShell>` |
| `TopAppBar.tsx` | Header bar: optional eyebrow above title, optional `leading` + `trailing` slots. `position: relative` so absolutely-positioned slot children (existing anchors) still work. | `<TopAppBar eyebrow="..." title="..." leading={...} trailing={...} />` |

Each gets a co-located `.test.tsx`.

**Scope — `AppScreen.tsx` rewire**

Replace the inline `<main>` + `<section>` with `<PageShell>`. Replace the inline `AppHeader` (lines 16-45) with `<TopAppBar leading={<SettingsAnchor … />} trailing={<LearnAnchor … />} eyebrow={vm.appHeader} title={vm.appTitle} />`. `SettingsAnchor` / `LearnAnchor` stay as-is — they're deleted in Item G after Item D migrates Learn/Settings to the new IconButton pattern. The local `AppHeader` function disappears. `PracticeWorkspace` is unchanged (workspace-specific, not page-shell).

`InstallBanner` and `AppDialogsView` stay as direct children of `PageShell` (overlays).

**Out of scope (deferred to later items)**
- Visual redesign of the header (still eyebrow + h1, same tokens, same anchors)
- Replacing `SettingsAnchor` / `LearnAnchor` with `IconButton` (Item D — happens when the chrome around them changes)
- The `compact` mt-6 vs mt-10 toggle on `PracticeWorkspace` (workspace concern, not shell)

**Risk**
Low-medium. Existing visual output must not change. The `position: relative` contract on `TopAppBar` must be airtight — existing anchor tests (`SettingsAnchor.test.tsx`, `LearnAnchor.test.tsx`) verify behavior but not positioning. I will manually verify by running the dev server and visually checking the header pre/post change.

**Files touched**
- New: `src/components/primitives/PageShell.tsx` + test
- New: `src/components/primitives/TopAppBar.tsx` + test
- Modified: `src/components/primitives/index.ts` (add two exports)
- Modified: `src/app/AppScreen.tsx` (drop inline `AppHeader`, swap `<main>`/`<section>` for `PageShell`, swap header for `TopAppBar`)

**Commit message:** `refactor(primitives): add PageShell + TopAppBar; route AppScreen header through them`

**Question for you before I start**
Two API choices worth confirming:
1. `TopAppBar` accepts `leading`/`trailing` as `ReactNode` slots (so today's `SettingsAnchor`/`LearnAnchor` plug in unchanged; tomorrow Item D plugs in `<IconButton icon={ChevronBackIcon} … />`). Alternative would be a stricter `{ icon, label, onClick, disabled }` shape — but that forces an early commitment to IconButton and breaks the byte-equivalence guarantee for this commit. My default is slots.
2. `PageShell` exposes `align="start"` (current practice surface uses `items-center justify-start`) as default. Learn/Settings pages will likely want the same. Reasonable?

### Archived — Item B implementation summary

**Files added (29):** `src/components/primitives/` (8 primitives + 8 tests + barrel) and `src/components/icons/` (9 icons + barrel).

**Verification:** `tsc --noEmit` clean, `lint` clean, full suite 93 files / 1125 tests pass.

**Sensible defaults locked:** Card radius 24 px; Card padding 16/24/32; Pill/Segmented active = `--color-breathing-accent-strong` bg + `--color-breathing-on-accent` text; Segmented outer container = `--color-breathing-bg-soft`; Eyebrow tracking 0.16em; IconButton 32/40 px; Stepper button 32 px gap 12 px; Toggle 44×24 track / 20 px knob.

### Archived — Proposal for Item B

**Goal**
Add a `src/components/primitives/` tree (one file per primitive) and a `src/components/icons/` tree (one file per glyph). Both are purely additive — no existing code modified. The primitives consume the tokens added in Item A. None are consumed by any surface yet; they become the toolkit for items C/D/E.

**Why now**
Item C (`PageShell` + `TopAppBar`) and beyond compose entirely from these primitives. Building them first means each later item is small (drops in a primitive composition) rather than a re-implementation. The v2.0 redesign drift happened because every surface re-built its own pill/card/eyebrow — this is the foundation that prevents that recurrence.

**Scope — primitives (`src/components/primitives/`)**

| File | Purpose | Rough API |
|------|---------|-----------|
| `Card.tsx` | Rounded surface w/ `--shadow-card`, configurable padding | `<Card padding="md" elevation="card\|modal\|none">…</Card>` |
| `Eyebrow.tsx` | Uppercase tracked muted section label | `<Eyebrow>ABOUT</Eyebrow>` |
| `IconButton.tsx` | Round white icon button (top-bar / close affordances) | `<IconButton icon={InfoIcon} label="..." onClick={...} size="md\|sm" />` |
| `Pill.tsx` | Single pill button (filled / outlined, active state) | `<Pill variant="filled\|outlined" active>label</Pill>` |
| `SegmentedControl.tsx` | Unified outer pill, N internal segments, filled-dark active | `<SegmentedControl options={...} value={...} onChange={...} renderGlyph?={...} />` |
| `Stepper.tsx` | Minimal `[−] value [+]` row, no container | `<Stepper value={...} onChange={...} min={...} max={...} step={...} renderValue?={...} />` |
| `Toggle.tsx` | iOS-style pill + knob | `<Toggle checked onChange={...} label="..." />` |
| `ArrowLink.tsx` | Bold accent text + trailing `→` glyph | `<ArrowLink href? onClick?>Watch the video</ArrowLink>` |
| `index.ts` | Re-export barrel | — |

Each primitive has a co-located `.test.tsx` (props → DOM render, no logic to test beyond that). Each uses tokens from `theme.css` — no inline hex, no Tailwind arbitrary color values.

**Scope — icons (`src/components/icons/`)**

Audit current inline SVGs (in `InstallBanner`, `MuteToggle`, `SettingsAnchor`, `LearnAnchor`, `CueGlyph`, `IosInstallSteps`, etc.) and migrate each to its own file under `src/components/icons/`. Standardized:
- 24×24 viewbox
- 1.5 stroke
- `stroke="currentColor"` and `fill="currentColor"` (or none) so color flows from CSS
- Named exports: `<InfoIcon />`, `<GearIcon />`, `<ChevronBackIcon />`, `<ChevronRightIcon />`, `<CloseIcon />`, `<SpeakerIcon />`, `<SpeakerMutedIcon />`, `<ShareIcon />` (iOS install), etc.
- One `index.ts` barrel

`CueGlyph.tsx` and timbre glyphs (Bowl/Bell/Sine/Flute) are NOT icons — they're styled visual elements that depend on cue style and orb state. They stay where they are; the icon library is for chrome icons only.

This step is a one-time consolidation pass — no existing consumer is rewired yet. That happens in items C/D/E as each surface gets rebuilt against the primitives.

**Risk**
Low. Pure addition. New files only. Existing files unchanged. Test coverage is per-primitive (each test renders the component in isolation and asserts on DOM/aria).

**Files touched (estimate)**
- New: `src/components/primitives/*.tsx` (~9 files) + `src/components/primitives/*.test.tsx` (~8 files) + `src/components/primitives/index.ts`
- New: `src/components/icons/*.tsx` (~8 files) + `src/components/icons/index.ts`
- No existing files modified

Commit message: `refactor(primitives): add design-primitive library + centralized icon set (no consumers yet)`

**Question for you before I start**
Do you want me to lock specific visual values now (corner radii, padding scales, segmented-control active fill = `--color-breathing-accent-strong`, etc.) or leave them as sensible defaults that you'll tune later when surfaces consume them? My default: use the existing token vocabulary with sensible Tailwind utilities; flag any value I had to invent in the implementation summary.

---

## History

| Item | Commit | Notes |
|------|--------|-------|
| A | `0c1d372` | Tokens + EndSessionDialog routed through destructive. Light byte-equivalent; dark visual TBD on real device. |
| B | `c0bfe60` | Primitive + icon library landed. No consumers yet. |
| C | `88305ea` | PageShell + TopAppBar; AppScreen routed through them. Visual byte-equivalent (DOM tests pass); browser confirmation pending. |
| D | (this commit) | Surface routing: appScreen state + ScreenRouter; LearnPage / AppSettingsPage replace dialogs as route destinations. LearnDialog / SettingsDialog / SettingsPanel become orphan code (deletion deferred to G). |

---

## Pinned rules

- Chat mode only — no AskUserQuestion pickers
- Architecture refactors only — NOT design work
- No new persisted fields, no new audio gates, no domain changes
- Update this file on every step transition
- Commit this file with each step transition so the resume prompt always lands on truth
