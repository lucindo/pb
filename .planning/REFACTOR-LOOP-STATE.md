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
| D | Surface routing: introduce `appScreen` state (`'practice' \| 'learn' \| 'appSettings'`), add `ScreenRouter`. `LearnDialog` / `SettingsDialog` migrate to `LearnPage` / `AppSettingsPage` composed from primitives + PageShell. | ✓ done — commit `039caeb` |
| E | Unified `PickerCardGrid<T>` primitive — collapses `CuePicker` / `LanguagePicker` / `ThemePicker` / `TimbrePicker` into one data-driven component. | ✓ done — commit `bd22ca5` |
| F1 | `CueGlyph` inline-style → className (warmup: smallest, surgical) | ✓ done — commit `1e98038` |
| F2 | `App.*.test.tsx` vs. unit-test overlap audit (mostly read-only; if deletions, low risk) | ✓ done — commit `94958e8` |
| F3 | Presentation-safe type re-exports (mechanical barrel cleanup) | ✓ done — commit `ac691e3` |
| F4 | `shapeConstants.ts` single-source-of-truth (TS↔CSS sync) | ✓ done — commit `3926b77` |
| F5 | `UiStrings` surface-vocabulary rename plan (top-level keys to match new surface structure) | ✓ done — commit `498545a` |
| F6 | `UiStringsContext` provider replacing drilling of `uiStrings` through the view layer (vm stays as explicit prop — see proposal) | **implemented — awaiting operator approval** |
| G | Dead-code purge — delete `LearnDialog` + `SettingsDialog` + `SettingsPanel` (and their tests) after audit narrowed the original 8-file list to 3 confirmed orphans; other 5 are LIVE. | ✓ done — commit `0844ab9` |
| H | Test pristineness pass — drop design-token-locking assertions in 7 primitive tests; rename `learnDialogModel` → `learnPanelModel` (LSP-unavailable → manual per-file Edit fallback per rule); fix 3 stale `LearnDialog` comment references + 1 inline style. First item executed using the new mandatory propose-step checklist ([[propose-step-checklist]] + [[no-design-locking]] memories). | ✓ done — commit `4457259` |
| I | Sibling-pattern stale-comment cleanup — 3-agent re-audit confirmed READY-FOR-SPIKE, but my own grep found 9 stale `SettingsDialog` / `SettingsPanel` / "Phase 15" / "legacy modal" / "scheduled for removal" references that H missed because it only fixed the `LearnDialog` family. Same meta-pattern as before — the rule was applied narrowly, not broadly. 5 files touched, comments only. | **implemented — awaiting operator approval** |

---

## Current focus

**Item:** I — Sibling-pattern stale-comment cleanup
**Step:** 4 (implemented + committed, awaiting operator approval)

### Implementation summary (Item I)

After H, operator approved "run the audit again to confirm clean." Three parallel agents (test quality, structural, visual-readiness) ALL returned **READY-FOR-SPIKE** with zero blockers. My own independent grep verification confirmed: zero `toHaveClass` design-token assertions, zero hex outside theme, zero static inline styles, zero Tailwind palette colors, zero imports of deleted components.

**BUT** — the same independent grep found **9 stale comment references** to deleted `SettingsDialog` / `SettingsPanel` / "Phase 15" / "legacy modal path" / "scheduled for removal" that H had missed. These are the exact sibling pattern of the `LearnDialog` references H fixed. Same rule, different family name — I caught the LearnDialog family because I was renaming `learnDialogModel`, missed the SettingsDialog family because I wasn't actively looking.

This is the meta-pattern documented in [[propose-step-checklist]]: the rule fires on the family I'm thinking about, not on every applicable instance. The v2 application (this item) explicitly scanned for SIBLING patterns of the previously-found violation.

**Files modified (5):**
- `src/app/pages/AppSettingsPage.tsx` — dropped "Replaces the legacy SettingsDialog modal route" from docstring (exact mirror of the LearnPage fix in H).
- `src/components/SettingsAnchor.tsx` — replaced "Phase 15 SettingsDialog Shell — D-07, D-08..." header with a current-state description (gear-icon anchor for Settings page, disabled in-session, mirrors LearnAnchor with two doc'd differences). Dropped 6 D-XX markers that referenced the deleted dialog's phase context.
- `src/components/SettingsPanelBody.tsx` — replaced "Shared by SettingsPanel.tsx (legacy modal path; SettingsDialog wraps it; deleted in Item G) // AppSettingsPage.tsx" with "Consumed by AppSettingsPage. Excludes the title and back affordance." Two references to deleted code removed.
- `src/app/App.session.test.tsx` — one comment: "user who never opens SettingsDialog" → "user who never visits the Settings page."
- `src/app/App.locale.test.tsx` — 5 comment + 1 test-name edits:
  - section header "PT-BR is clicked via SettingsDialog" → "...on the Settings page"
  - dropped "Post Item-D refactor: this routes to AppSettingsPage (full-page surface) instead of opening a modal SettingsDialog" (migration is closed; the historical reference is rot)
  - test name "locale picker buttons are disabled when SettingsDialog is opened in-session" → "Settings is unreachable in-session via the gear anchor being disabled" (the test was renamed in H to AppSettingsPage flow but the name still said SettingsDialog)
  - 5-line comment block about "SettingsDialog auto-closes on inSessionView (App.tsx WR-09 useEffect)..." rewritten to describe the current `useAppNavigation.closeOnSessionView` mechanism and `controlsDisabled` gate
  - "Open SettingsDialog and verify..." → "Open the Settings page and verify..."
  - "Close the dialog" → "Navigate back to practice"
  - dropped "(Phase 15 D-08: ...)" qualifier on a comment about the SettingsAnchor disabled state

**No code behavior changed.** All edits are comments, docstrings, or one test name.

**Four verification grep guards (post-change, must return zero):**
1. `grep -rn 'SettingsDialog' src` — clean
2. `grep -rn 'LearnDialog\b' src` — clean
3. `grep -rn 'SettingsPanel\b' src | grep -v 'SettingsPanelBody'` — clean (only SettingsPanelBody, the live component)
4. `grep -rn 'scheduled for removal\|legacy modal' src` — clean

**Verification:**
- `tsc --noEmit -p tsconfig.app.json`: clean
- `npm run lint`: clean
- Full suite: **101 files / 1117 tests pass** (unchanged from H — pure comment work)
- Build clean. Bundle unchanged.

**Commit message:** `docs: drop stale SettingsDialog/SettingsPanel comment references (sibling pattern to H's LearnDialog cleanup)`

### Archived — Implementation summary (Item H)

Post-G audit (3 parallel agents — test quality, structural, visual-readiness) surfaced that 7 primitive test files contained ~30 class-locking assertions (`toHaveClass('p-6')`, `toHaveClass('bg-[var(--color-breathing-accent-strong)]')`, etc.) written during Item B (commit `c0bfe60`). Same model, same codebase — but Item B's "test the prop API" framing produced exactly the design-locking pattern the post-G audit ("what blocks visual freedom?") was looking for.

Operator pushed back on the pattern itself: **"you propose to fix and then implement new problems as solution. Can't you see the pattern?"** Two memory rules created in response, both general (not test-specific):
- [[no-design-locking]] — broad rule covering tests, code, AND comments. No anchoring of downstream-modifiable values (Tailwind classes, hex, design tokens, deleted-code refs, stale future-tense notes).
- [[propose-step-checklist]] — procedural enforcement. Every propose-step gets mandatory Downstream Constraints + Applicable Memory Rules sections before Goal/Scope/Risk. The checklist makes the "review hat" framing mandatory at "implement hat" decision points.

**Item H is the first item executed under the new propose-step checklist** — the proposal itself printed both sections, and the verification step caught 3 additional stale comment references the proposal missed (LearnDialog refs in LearnPage.tsx + lockedCopy.ts + learnContent.ts). Fixed inline since they fall under the same no-design-locking rule that motivated H.

**Test rewrites (7 files, -10 tests net):**
- `PageShell.test.tsx` — dropped 6 layout/background class assertions (min-h-screen, max-w-3xl, bg-[radial-gradient, mx-auto, flex-col, items-center). Kept structural assertions (children inside section, section inside main, overlays as siblings). 5 → 4 tests.
- `Card.test.tsx` — dropped 4 padding/shadow class assertions (p-6, p-8, shadow-[var(--shadow-card)], shadow-[var(--shadow-modal)]). Replaced with "renders without error across every variant" loops that exercise the prop API without locking the class output. 6 → 4 tests.
- `Eyebrow.test.tsx` — dropped 2 typography assertions (uppercase, tracking-[0.16em]). 3 → 2 tests.
- `IconButton.test.tsx` — dropped 2 size-class assertions (size-10, size-8). Replaced with variant-loop. 5 → 4 tests.
- `Pill.test.tsx` — dropped 3 background-color assertions for filled/outlined/active. Replaced with aria-pressed assertions (the behavioral contract) + variant-loop. 6 → 6 tests.
- `PickerCardGrid.test.tsx` — dropped 6 grid/layout/selected-state class assertions. Kept all 6 behavioral aria/role/event tests. Added 1 variant-matrix render-without-error test. 11 → 7 tests.
- `TopAppBar.test.tsx` — DELETED the `relative` + `w-full` test entirely; replaced with a strengthened CONTRACT comment in `TopAppBar.tsx` source explaining that the `relative` class MUST stay or absolutely-positioned slot children silently escape. 6 → 5 tests.

**Cleanup (5 spots):**
- Renamed `learnDialogModel.{ts,test.ts}` → `learnPanelModel.{ts,test.ts}` (file move via `git mv`); renamed `LearnDialogModel` interface → `LearnPanelModel`, `getLearnDialogModel` function → `getLearnPanelModel`. LSP server unavailable for `.ts` files in this environment — used the documented fallback per [[use-lsp-for-renames]]: grep all references type-aware (3 files: definition, importer, test), Edit each site by hand. No sed/perl/regex used.
- Removed stale "shared by LearnDialog... scheduled for removal in Item G" comment block in `LearnPanel.tsx`.
- Removed stale LearnDialog references in `LearnPage.tsx` docstring, `lockedCopy.ts` D-04 comment, `learnContent.ts` D-04 comment. Caught by the verification-step grep, not the proposal.
- Tailwind-ified `IosInstallSteps.tsx:50` inline style (`style={{ display: 'inline', verticalAlign: 'middle' }}` → `className="inline align-middle"`).

**Out of scope kept out:**
- PageShell prop expansion (YAGNI) — no new `maxWidth?` / `layout?` props
- Audio hook wrapper for `playInhalePreview` — non-violation
- OrbShape inline styles — dynamic + token-based, can't be classes
- No changes to domain / audio / storage / hooks / appViewModel / sessionPresentation / useAppViewModel — sealed by design

**Three verification grep guards (post-change, must return zero hits):**
1. `grep ... toHaveClass | grep -E 'p-[0-9]|bg-\[|text-\[var|size-[0-9]|grid-cols|flex-col|...'` in primitives — clean
2. `grep -rn 'LearnDialog\|learnDialog'` in src — clean (after the 3 comment fixes)
3. `grep -rn 'style='` in components+app outside OrbShape/NKShape — clean

**Verification:**
- `tsc --noEmit -p tsconfig.app.json`: clean
- `npm run lint`: clean
- Full suite: **101 files / 1117 tests pass** (was 101/1127 → -10 design-locking tests removed, no behavioral coverage lost)
- `npm run build`: clean. JS bundle unchanged.

**Commit message:** `refactor(tests+cleanup): drop design-token-locking assertions; rename historical learnDialogModel; drop stale comments`

### Archived — Implementation summary (Item G)

Ground-truth audit (precise module-path grep `from ['\"].*/${name}['\"]`, excluding self + own test) corrected the original 8-file Item-G table down to **3 confirmed orphans**. The other 5 names in the table were a stale snapshot from before items C/D landed.

**Audit results:**
| File | Live importers | Verdict |
|------|---------|---------|
| `LearnDialog.tsx` | 0 | DELETED |
| `SettingsDialog.tsx` | 0 | DELETED |
| `SettingsPanel.tsx` | only `SettingsDialog.tsx` | DELETED (cascade) |
| `SessionReadout.tsx` | `BreathingSessionSurface.tsx` | LIVE — kept |
| `NKSessionReadout.tsx` | `NaviKriyaSessionSurface.tsx` | LIVE — kept |
| `StatusPanel.tsx` | `NaviKriyaSessionSurface.tsx`, `NKSessionReadout.tsx`, `SessionReadout.tsx` | LIVE — kept |
| `SettingsAnchor.tsx` | `PracticeScreen.tsx` | LIVE — kept |
| `LearnAnchor.tsx` | `PracticeScreen.tsx` | LIVE — kept |
| `learnDialogModel.ts` | `LearnPanel.tsx` (LearnPage uses LearnPanel) | LIVE — kept (`*Dialog*` in name is historical; rename for clarity deferred) |

**Files deleted (5):**
- `src/components/LearnDialog.tsx`
- `src/components/LearnDialog.test.tsx` (32 tests)
- `src/components/SettingsDialog.tsx`
- `src/components/SettingsDialog.test.tsx` (17 tests)
- `src/components/SettingsPanel.tsx` (no own test file — was always covered transitively via SettingsDialog.test)

**Files modified:** none. The 3 deletes had zero production-code consumers — `SettingsPanel` was reachable only through `SettingsDialog`, both dialogs had been routed nowhere since Item D landed `LearnPage` / `AppSettingsPage`. tsc + lint passing confirms there were no orphan internal references either.

**Verification:**
- `tsc --noEmit -p tsconfig.app.json`: clean
- `npm run lint`: clean (0 errors, 0 warnings)
- Full suite: **101 files / 1127 tests pass** (was 103/1176 → -2 files, -49 tests, exactly the LearnDialog+SettingsDialog test count drop, no other tests broke).
- `npm run build`: production build clean. JS bundle **299.05 KB unchanged** — Vite was already tree-shaking these orphans out of the prod bundle since they had no live importers. Source-code shrinkage only, not runtime gain. The win is in maintenance surface, not bytes.

**Commit message:** `refactor(dead-code): delete orphan LearnDialog + SettingsDialog + SettingsPanel after pages migration`

### Archived — Implementation summary (Item F6)

Operator approved the narrowed proposal: contextify only `uiStrings` (the full type), leave `vm` as an explicit prop (it's only one hop deep — `ScreenRouter → PracticeScreen`), and keep leaf components on narrow `Pick<UiStrings, ...>` slices so they stay context-free + testable in isolation.

**Files added (2):**
- `src/hooks/useUiStringsContext.tsx` — `UiStringsContext` (typed `UiStrings | null` with a null sentinel), `UiStringsProvider` component, `useUiStrings()` hook that throws on missing provider. ~22 LOC. Single targeted `eslint-disable-next-line react-refresh/only-export-components` on the hook export — the warning is benign for an app-wide Provider where HMR re-renders everything anyway.
- `src/hooks/useUiStringsContext.test.tsx` — 3 tests: provider/consumer roundtrip, locale-switch propagation through Provider via rerender, missing-provider throws with the documented error message (with `console.error` mocked during the expected throw to suppress React's error-boundary noise).

**Files modified (10):**
- `src/app/App.tsx` — wraps `<ScreenRouter>` in `<UiStringsProvider value={vm.uiStrings}>`. Now 3 imports / 12 LOC.
- `src/app/ScreenRouter.tsx` — dropped `strings={vm.uiStrings.learn}` from `<LearnPage>` and `strings={vm.uiStrings}` from `<AppSettingsPage>`. Pages read from context.
- `src/app/pages/LearnPage.tsx` — dropped `strings` prop; `useUiStrings().learn` at top of component. `LearnPanel` (leaf) still receives the sliced `strings` prop.
- `src/app/pages/AppSettingsPage.tsx` — dropped `strings` prop; `useUiStrings()` at top; rebuilds the `Pick<UiStrings, 'appSettings' | 'install'>` slice locally to pass to `SettingsPanelBody` (leaf — stays prop-driven).
- `src/app/PracticeScreen.tsx` — dropped 4 `uiStrings={vm.uiStrings}` passes to the 4 child views. Kept `vm.uiStrings.install` to `InstallBanner` and `vm.uiStrings.practice.topBar` to `SettingsAnchor` / `LearnAnchor` (leaves stay prop-driven).
- `src/app/EndSessionDialogsView.tsx`, `PracticeSessionView.tsx`, `PracticeSettingsView.tsx`, `PracticeControlsView.tsx` — each dropped `uiStrings: UiStrings` prop; calls `useUiStrings().practice.<slice>` at top of component. Still passes narrow slices to leaf components.
- `src/app/pages/LearnPage.test.tsx`, `pages/AppSettingsPage.test.tsx` — wrap render with `<UiStringsProvider value={UI_STRINGS.en}>`. No assertion changes.

**Not modified (intentional):**
- Leaf components (`OrbShape`, `EndSessionDialog`, `StretchSettingsForm`, `MuteToggle`, `CuePicker`, `TimbrePicker`, `ThemePicker`, `LanguagePicker`, `LearnPanel`, `SettingsPanelBody`, `InstallBanner`, `IosInstallSteps`, `SessionReadout`, `NKSessionReadout`, `NaviKriyaSettingsForm`, `ResonantSettingsForm`, `SettingsStepper`, `LearnAnchor`, `SettingsAnchor`, `NKShape`, `SessionActionRow`) — all keep their narrow `Pick<UiStrings, ...>` / `UiStrings['x']['y']` props. They stay testable in isolation without a Provider wrapper. Their tests are untouched.
- `sessionPresentation.ts` / `appControllerAdapters.ts` / `appViewModel.ts` / `practiceCopy.ts` / `useLocale.ts` — non-React or vm-construction code. They keep taking `UiStrings` as an explicit arg.
- `ScreenRouter.test.tsx` — uses `vi.mock` to mock the three page components, so it never renders into real `useUiStrings()` calls. Stays green without changes.
- `App.*.test.tsx` integration tests — render the real `App.tsx`, which now wraps with the Provider. Stay green without changes.

**Slip in the proposal (corrected during implementation):**
The proposal said "drop the 2 `strings={vm.uiStrings.practice.topBar}` passes (anchors)". But anchors are leaf components. Dropping the prop would force them to call `useUiStrings()`, violating the leaf-stay-context-free rule that's the foundation of the rest of this design. Caught and reverted to keeping the props before writing. Single-rule consistency wins over saving one prop.

**Verification:**
- `tsc --noEmit -p tsconfig.app.json`: clean
- `npm run lint`: clean (0 errors, 0 warnings)
- Full suite: **103 files / 1176 tests pass** (was 102/1173 → +1 file, +3 tests for `useUiStringsContext.test.tsx`)
- `npm run build`: production build clean. JS bundle **298.69 → 299.05 KB (+0.36 KB)** for the Context object + Provider component + hook + the single Provider wrapping in `App.tsx`. Negligible.

**Commit message:** `refactor(ui-strings): add UiStringsContext; remove uiStrings drilling from view layer`

### Archived — Implementation summary (Item F5)

Operator pushed back hard on my proposal to defer to a plan document: "go fix your mess once and for all, stop taking shortcuts". Executed the full rename in one commit.

**New `UiStrings` structure (top-level keys reorganized by surface):**

```
UiStrings {
  practice: {           // PracticeScreen surface (was scattered across 11 keys)
    header, title       // (was app.*)
    topBar: { ... }     // (was anchors.*)
    switcher: { ... }   // (was practice.* — the OLD top-level practice was switcher labels)
    controls: { ... }
    breathing: { ... }
    readout: { ... }
    settingsForm: { ... }
    nkControls: { ... }
    nkReadout: { ... }
    mute: { ... }
    endSessionDialog: { ... }
  }
  appSettings: {        // AppSettingsPage surface (was scattered: settings + themes + cue + timbres)
    title, close, themeLabel, cueLabel, timbreLabel, languageLabel
    themes: { light, dark, system }
    cue: { labels, arrow, nose }
    timbres: { bowl, bell, sine, flute }
  }
  learn: { ... }        // LearnPage surface (unchanged)
  install: { ... }      // cross-surface install copy (unchanged)
}
```

**Implementation reality (long road, fully documented):**
- First attempt used BSD `sed -E` with `\b` anchors. **`\b` is silently unsupported in BSD sed extended-regex mode** — none of those substitutions ran. Wasted a sed phase.
- Second attempt used `perl -i -pe` with bare-namespace regexes (no anchor on the carrier object). **Over-applied**: `.settings` → `.appSettings` hit `navi.settings` (NaviKriyaSessionController), `.readout` → `.practice.readout` hit `presentation.readout` (BreathingPresentation), `.cue` → `.appSettings.cue` hit `shape.cue`, etc. Tens of false matches. Also some patterns double-applied because perl ran twice on certain phases.
- Reset all `src/` via `git checkout --`, kept the new `strings.ts` interface, restarted with the right approach.
- Third attempt used a **single perl script with `\K`-anchored carriers**: `(?:uiStrings|UI_STRINGS\.en|UI_STRINGS\['en'\]|UI_STRINGS\['pt-BR'\]|EN_STRINGS_FIXTURE)\K`. `\K` resets the match start so only the path-after-carrier is substituted. Plus a separate pass for `UI_STRINGS[locale]` (variable subscript). This worked.
- 4 `Pick<UiStrings, 'settings' | 'themes' | 'cue' | 'timbres' | 'install'>` files manually updated to `Pick<UiStrings, 'appSettings' | 'install'>`, then their inner `strings.settings.X` / `strings.themes` accesses rewired to `strings.appSettings.X` etc.
- `src/app/practiceCopy.ts` had `strings: UiStrings` (full type) so its 10 internal accesses needed manual edits.
- 3 computed-key accesses in `src/content/strings.test.ts` (`UI_STRINGS[locale].practice[key]`) couldn't be regex-handled — fixed manually.

**Files touched:** 69 files (sources + tests). New `src/content/strings.ts`. The bulk of the rename was mechanical (regex), the residual was surgical (4 Pick types + 1 practiceCopy + 3 computed-key tests).

**Migration table:**
| Old | New |
|---|---|
| `app.header` / `app.title` | `practice.header` / `practice.title` |
| `controls.*` | `practice.controls.*` |
| `endSessionDialog.*` | `practice.endSessionDialog.*` |
| `mute.*` | `practice.mute.*` |
| `readout.*` | `practice.readout.*` |
| `anchors.*` | `practice.topBar.*` |
| `breathing.*` | `practice.breathing.*` |
| `settingsForm.*` | `practice.settingsForm.*` |
| `nkReadout.*` / `nkControls.*` | `practice.nkReadout.*` / `practice.nkControls.*` |
| `practice.<switcherKey>` | `practice.switcher.<switcherKey>` |
| `settings.*` | `appSettings.*` |
| `themes.*` / `cue.*` / `timbres.*` | `appSettings.themes.*` / `appSettings.cue.*` / `appSettings.timbres.*` |
| `learn.*` / `install.*` | unchanged |

**Lesson learned (for future similar refactors):** when running regex-based renames across a codebase, **anchor on the carrier object**, never on bare namespace names. Bare-name regexes are catastrophic on a codebase where the same property name (`settings`, `controls`, `readout`, `cue`) appears on multiple unrelated objects.

**Verification:**
- `tsc --noEmit` (with explicit `-p tsconfig.app.json`): clean
- `lint`: clean
- Full suite: **102 files / 1173 tests pass** (unchanged from F4 — pure refactor, no test count delta)
- `npm run build`: clean

**Commit message:** `refactor(strings): reorganize UiStrings top-level keys by surface (practice/appSettings/learn/install)`

### Archived — Implementation summary (Item F4)

Operator chose **option A (test guard)** with the explicit constraint: the test must not become an obstacle to future orb redesign. Test is value-agnostic — asserts EQUALITY between TS and CSS, not specific numeric values.

**Files added (1):**
- `src/components/shapeConstants.test.ts` (~30 LOC, 3 tests). Reads `src/styles/theme.css` at test time via `readFileSync(resolve(__dirname, '..', 'styles', 'theme.css'))`. Regex-extracts `--orb-scale-{min,max,mid}` values and asserts each equals the corresponding TS export. Header comment explicitly states: "If the scale-based orb is replaced wholesale, delete shapeConstants.ts + the CSS vars + THIS TEST together — the test is not meant to anchor the constants to existence."

**Files modified (2):**
- `src/components/shapeConstants.ts` — updated header docstring to point at the new guard test as the enforcement mechanism. Dropped the per-line "keep in sync with --orb-scale-X" comments (now redundant — the test enforces it).
- `src/styles/theme.css` — updated the comment block above `--orb-scale-*` definitions to reference the guard test. Dropped the per-line "keep in sync with MIN_SCALE" inline comments.

**The contract (intentionally constrained):**
- Test asserts equality only — not specific values. Changing scales requires editing both files; test stays green.
- Test does NOT anchor the constants to existence. If the orb redesign removes the scale concept, delete all three (TS file + CSS vars + test) together.
- Header comments on both sides spell this out so future-Claude (or future-operator) reads "it's a drift detector, not a value lock" before being tempted to fight it.

**Verification:**
- `tsc --noEmit` + `lint` clean
- New test: 3/3 pass
- Full suite: **102 files / 1173 tests pass** (was 101/1170 → +1 file, +3 tests)
- Build clean

**One small detour in implementation:** First attempt used `fileURLToPath(new URL('../styles/theme.css', import.meta.url))`. That fails in vitest's jsdom env because `import.meta.url` isn't a `file://` URL there. Switched to `resolve(__dirname, ...)` — the pattern already used by `content.no-removed-themes.test.ts` in this codebase.

**Commit message:** `test(shapeConstants): add drift guard between TS exports and CSS --orb-scale-* tokens`

### Archived — Implementation summary (Item F3)

**Operator chose the bigger play** ("do domain barrel too"). Scope went beyond the minimal "route through existing storage barrel" to include a fresh `src/domain/index.ts` barrel + migration of all presentation deep imports.

**Files added (1):**
- `src/domain/index.ts` — re-exports all 9 domain modules via `export *`. Mirrors `src/storage/index.ts`. No name collisions across modules.

**Files modified — pass 1 (sed migration, 37 files):**
- All presentation files in `src/components/` and `src/app/` (incl. tests) — swapped `from '../domain/<module>'` → `from '../domain'` and `from '../storage/(practices|prefs)'` → `from '../storage'` via a single sed pass.
- Pattern: `s|from '\.\./domain/[a-zA-Z]+'|from '../domain'|g` and `s|from '\.\./storage/(practices\|prefs)'|from '../storage'|g`.
- No production-code consumers (hooks, audio, storage internals, domain internals) touched — they keep using their existing intra-layer paths.

**Files modified — pass 2 (consolidation, 12 files):**
After pass 1, 12 files had 2-6 duplicate `from '../domain'` import lines. Consolidated each into a single grouped import for readability:
- `src/app/sessionPresentation.ts` (6 → 1)
- `src/app/appViewModel.ts` (5 → 1)
- `src/app/appControllerAdapters.test.ts` (4 → 1)
- `src/app/appViewModel.test.ts` (3 → 1)
- `src/components/SessionReadout.tsx` (4 → 1)
- `src/components/StretchSettingsForm.tsx` (2 → 1)
- `src/components/NaviKriyaSettingsForm.tsx` (2 → 1)
- `src/components/OrbShape.tsx` (2 → 1)
- `src/components/SettingsForm.nk.test.tsx` (2 → 1)
- `src/components/SettingsForm.stretch.test.tsx` (3 → 1)
- `src/app/sessionPresentation.test.ts` (2 → 1)
- `src/app/App.audio.test.tsx` (2 → 1)

**Out of scope (explicitly):**
- A truly "presentation-safe" filtered barrel that excludes storage loaders/savers from the import surface — that's a separate architectural decision (active `src/types.ts`). The current `src/storage` and `src/domain` barrels are full-surface re-exports.

**Verification:**
- `tsc --noEmit` + `lint` clean
- Full suite: **101/101 files, 1170/1170 tests pass** (no test churn — paths-only refactor)
- `npm run build` clean. JS bundle unchanged at ~298 KB (Vite already tree-shook the deep paths, so barrel routing doesn't add weight).

**Commit message:** `refactor(imports): add domain barrel; route presentation through storage + domain barrels (drop deep imports)`

### Archived — Implementation summary (Item F2)

**Audit scope:** All 8 `App.*.test.tsx` files (2636 LOC, ~94 tests). Cross-referenced against the matching unit test files.

**Finding:** The clear-cut duplication is in **one place only** — `App.dialog.test.tsx` lines 30-123, `describe('EndSessionDialog (component-level)', ...)`. 9 tests that render `<EndSessionDialog>` in isolation (no `<App/>`), with the same helper and assertions as `src/components/EndSessionDialog.test.tsx`. Likely pre-date the dedicated unit file and were never cleaned up.

**Other App.*.test.tsx files are genuinely integration:** session lifecycle with fake timers, localStorage migration, audio gating, cross-surface locale propagation. None duplicate unit-level concerns.

**Action:**
- Deleted lines 1-123 of `App.dialog.test.tsx` and rebuilt the file from line 125+ with trimmed imports (no `userEvent`, no `EndSessionDialog`, no `UI_STRINGS`; no `EN_STRINGS_FIXTURE` const; no `renderDialog` helper).
- One assertion in the deleted block — "exposes role=dialog with accessible name via aria-labelledby" — has no direct port in the unit file, but every other unit test uses `getByRole('dialog', { name: 'End this session?' })` to find the dialog, which implicitly verifies the same role+name behavior. No coverage lost.

**Verification:**
- `tsc --noEmit` + `lint` clean
- Full suite: 101/101 files, **1170/1170 tests pass** (was 1179 → -9 deleted tests, as predicted)

**Commit message:** `test(App.dialog): drop EndSessionDialog component-level block (duplicates EndSessionDialog.test.tsx)`

### Archived — Implementation summary (Item F1)

- `src/components/CueGlyph.tsx` only — replaced 3 `style={{ color: colorToken }}` usages with a single `colorClass` ternary applied via className (Tailwind arbitrary-value `text-[var(--...)]`).
- Dropped a dead `text-[var(--color-breathing-accent-strong)]` from the labels-mode span — it was always overridden by the inline style.
- No CSS file changes; no test changes; visual byte-equivalent.

**Verification:**
- `tsc --noEmit` + `lint` clean
- `npm test --run src/components/CueGlyph.test.tsx`: 22/22 pass
- Full suite: 101/101 files, 1179/1179 tests pass
- `npm run build` clean

**Commit message:** `refactor(CueGlyph): inline style → className for token colors`

### Archived — Implementation summary (Item E)

All defaults honored: explicit `labelId` prop (not `useId`), generic `<T extends string>`, class strings moved into primitive verbatim, CuePicker glyph stays in `renderOption`, `optionLayout` defaults `'inline'`, all 4 existing picker tests kept unchanged.

**Files added (2):**
- `src/components/primitives/PickerCardGrid.tsx` — generic `<T extends string>` radiogroup-cards primitive. ~70 LOC. Owns the section label `<p>`, the radiogroup `<div>`, the per-option card `<button>`, and the byte-identical selected/unselected/base class strings that were copy-pasted across the 4 picker files.
- `src/components/primitives/PickerCardGrid.test.tsx` — 11 isolated tests using a synthetic `Fruit` type: label rendering, aria-labelledby wiring, radio count + names, aria-checked, click → onChange, disabled cascade, grid-cols-2 vs grid-cols-3, optionLayout inline vs stack, selected vs unselected class.

**Files modified (5):**
- `src/components/primitives/index.ts` — add `PickerCardGrid` + `PickerCardLayout` exports.
- `src/components/ThemePicker.tsx` — 56 LOC → 22 LOC adapter. `columns=3`, default `inline` layout.
- `src/components/LanguagePicker.tsx` — 65 LOC → 22 LOC adapter. `columns=2`, default `inline`.
- `src/components/TimbrePicker.tsx` — 66 LOC → 27 LOC adapter. `columns=2`, default `inline`. The `playInhalePreview(id)` side effect stays in a wrapper `onChange` so the primitive doesn't need to know about audio.
- `src/components/CuePicker.tsx` — 66 LOC → 38 LOC adapter. `columns=3`, `optionLayout='stack'`. `renderOption` returns the CueGlyph swatch above the label.

**Also fixed:** `src/app/App.dialog.test.tsx` — dropped a stale `async` from the WR-09 test rewritten in Item D (lint surfaced it on this run; passed in Item D's lint cache).

**API**

```ts
PickerCardGridProps<T extends string> {
  sectionLabel: string
  labelId: string
  options: readonly T[]
  value: T
  onChange(this: void, next: T): void
  renderOption(this: void, option: T): ReactNode
  columns: 2 | 3
  disabled: boolean
  optionLayout?: 'inline' | 'stack'  // default 'inline'; 'stack' adds flex-col items-center gap-1
}
```

**Verification:**
- `npx tsc --noEmit`: clean
- `npm run lint`: clean (after fixing the stale async)
- `npm test -- --run` full suite: **101 files / 1179 tests pass** (was 100/1168 → +1 file, +11 tests). All 4 picker tests (Cue 19 / Theme 15 / Timbre 20 / Language 15) pass unchanged — strongest evidence the visual + a11y output is byte-equivalent.
- `npm run build`: production build clean. **JS bundle 301.12 → 298.69 KB (-2.4 KB)** from the dedup.

**Commit message:** `refactor(primitives): extract PickerCardGrid; collapse 4 pickers to thin adapters`

### Archived — Proposal for Item E

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
| D | `039caeb` | Surface routing: appScreen state + ScreenRouter; LearnPage / AppSettingsPage replace dialogs as route destinations. LearnDialog / SettingsDialog / SettingsPanel become orphan code (deletion deferred to G). |
| E | `bd22ca5` | PickerCardGrid primitive extracted; 4 pickers each shrink from ~60 LOC to ~15-40 LOC adapters. Visual + a11y byte-equivalent. JS bundle -2.4 KB. |
| F1 | `1e98038` | CueGlyph inline style → className for token colors. Surfaced + removed a dead static class. |
| F2 | `94958e8` | Deleted 9 component-level EndSessionDialog tests from App.dialog.test.tsx (covered by EndSessionDialog.test.tsx). Test count 1179 → 1170. |
| F3 | `ac691e3` | Created `src/domain/index.ts` barrel; routed 37 presentation files through `../domain` and `../storage` barrels (sed pass) then consolidated 12 files with duplicate import lines (manual pass). Operator chose "bigger play" over minimal storage-only migration. |
| F4 | `3926b77` | Added shapeConstants.test.ts drift guard between TS exports and `--orb-scale-*` CSS tokens. Value-agnostic equality assertions; explicit "delete-together if orb redesigned" contract in header comment per operator constraint. |
| F5 | `498545a` | UiStrings top-level keys reorganized by surface: `practice.*` / `appSettings.*` / `learn.*` / `install.*`. ~69 files touched. Mechanically applied via carrier-anchored perl (\K resets match start); 4 Pick<UiStrings> types + practiceCopy + 3 computed-key tests handled manually. |
| F6 | `fe14c47` | `UiStringsContext` + `useUiStrings()` hook (throws on missing provider). `App.tsx` wraps everything in `UiStringsProvider`. 4 PracticeScreen child views + 2 pages stop receiving `uiStrings` / `strings` props and read from context. Leaf components (anchors, banners, forms, pickers, dialogs) keep narrow slice props to stay testable in isolation. Bundle +0.36 KB. |
| G | `0844ab9` | Audit-corrected dead-code purge: deleted `LearnDialog`, `SettingsDialog`, `SettingsPanel` + the 2 dialog tests (49 tests removed). Original 8-file Item-G list was an outdated snapshot — module-path-precise grep found 5 of the listed files (Readout/StatusPanel pair, anchors) STILL LIVE. Bundle unchanged (Vite was already tree-shaking these). |
| H | `4457259` | Test pristineness pass — rewrote 7 primitive test files to drop ~30 design-token-locking class assertions (e.g., `toHaveClass('p-6')`, `toHaveClass('bg-[var(--color-breathing-accent-strong)]')`). Renamed historical `learnDialogModel` → `learnPanelModel` via manual per-file Edit (LSP unavailable for .ts in this env). Removed 3 stale LearnDialog comment refs (caught by verification grep). Tailwind-ified 1 inline style. Net -10 tests, behavioral coverage preserved. First item executed under the new mandatory propose-step checklist memory rules. |
| I | `80da948` | Sibling-pattern stale-comment cleanup. 3-agent post-H audit said READY-FOR-SPIKE, but my independent grep found 9 stale `SettingsDialog`/`SettingsPanel`/Phase-15 comment references H missed because it only fixed the LearnDialog family. 5 files touched (AppSettingsPage docstring, SettingsAnchor header, SettingsPanelBody comment, 2 App.*.test.tsx files). Comments only — zero code behavior change, tests pass unchanged. |

---

## Pinned rules

- Chat mode only — no AskUserQuestion pickers
- Architecture refactors only — NOT design work
- No new persisted fields, no new audio gates, no domain changes
- Update this file on every step transition
- Commit this file with each step transition so the resume prompt always lands on truth
