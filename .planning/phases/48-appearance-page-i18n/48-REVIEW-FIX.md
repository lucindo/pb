---
phase: 48-appearance-page-i18n
fixed_at: 2026-05-26T09:46:00Z
review_path: .planning/phases/48-appearance-page-i18n/48-REVIEW.md
iteration: 2
findings_in_scope: 8
fixed: 6
skipped: 2
status: partial
---

# Phase 48: Code Review Fix Report

**Fixed at:** 2026-05-26T09:46:00Z
**Source review:** `.planning/phases/48-appearance-page-i18n/48-REVIEW.md`
**Iteration:** 2
**Fix scope:** all (critical + warning + info)

**Summary (cumulative across iterations 1 + 2):**
- Findings in scope: 8 (WR-01, WR-02, WR-03, IN-01, IN-02, IN-03, IN-04, IN-05)
- Fixed: 6 (3 warnings — iter 1; 3 info — iter 2)
- Skipped (with rationale, no code change required): 2 (IN-04, IN-05)
- Status: partial (no in-scope finding remains unaddressed; skipped items are intentional non-fixes documented below)

---

## Iteration 1 — already-fixed warnings (verified on `main`)

The three warnings were resolved by iteration 1 and verified present on the current branch (commits `3cf352d`, `dbd8c4a`, `69fdbbb`). The narrative below is preserved verbatim from the iteration-1 report.

### WR-01: Duplicated private `SectionCard` component — chrome will drift

**Files modified:**
- `src/components/primitives/SectionCard.tsx` (new — shared primitive)
- `src/components/primitives/index.ts` (barrel export added)
- `src/app/pages/AppearancePage.tsx` (local copy removed, import added)
- `src/components/SettingsPanelBody.tsx` (local copy removed, import added)

**Commit:** `3cf352d` (iteration 1)

**Applied fix:** Extracted the spike-locked card chrome (border-soft 1px + surface bg + 20px radius) from the two duplicated private functions into a new shared `SectionCard` primitive at `src/components/primitives/SectionCard.tsx` with the exact same signature (`padding: string`, `children: ReactNode`). Visual output is byte-identical to the prior inline copies. `LearnPanel.tsx`'s structurally-different variant (no `padding` prop) was intentionally left alone per reviewer note.

This consolidates the spike-locked design source of truth: any future v2.x update to the card chrome now flows through one component instead of two private copies that would silently desync.

### WR-02: Dead `id` attribute on OrbPicker / RingCuePicker label `<p>`

**Files modified:**
- `src/components/OrbPicker.tsx` (removed `id="orb-picker-label"`)
- `src/components/RingCuePicker.tsx` (removed `id="ring-cue-picker-label"`)

**Commit:** `dbd8c4a` (iteration 1)

**Applied fix:** Removed the dead `id` attributes from both pickers' `<p>` sublabels. `SegmentedControl` labels its radiogroup via `aria-label` (not `aria-labelledby`), so the ids were unreferenced — a paste-and-rename inheritance from `LanguagePicker`. `LanguagePicker.tsx` was intentionally NOT touched per phase scope (its matching dead id belongs to a separate phase).

Chose the minimal-surgical option (a) from the reviewer's suggested fixes: just remove the dead attribute. The conditional `sectionLabelHidden ? 'sr-only' : ...` class logic is preserved so the pickers retain parity with `LanguagePicker`'s behavior for any future `sectionLabelHidden=true` consumers.

### WR-03: Marker-guard `label:` allowlist pattern is too broad

**Files modified:**
- `src/content/content.no-review-markers.test.ts` (rewrote allowlist + added regression tests)

**Commit:** `69fdbbb` (iteration 1)

**Applied fix:** Replaced the shape-based regex allowlist (which fired on any `label:` / `theme:` line anywhere in `src/content/**.ts`) with a block-scope tracker. The new `findUnreviewedMarkers(text, file)` function walks each file line-by-line maintaining a stack of currently-open `<key>: {` block names. A marker is allowed iff the value line below it lives inside one of two structural contexts:

1. Any descendant of an `appearance: {` block (covers all appearance.* PT-BR keys); OR
2. The `theme:` value line directly under `appSettings.sections` (D-01 renamed key).

Added 4 new tests that lock the guard's behavior:
- WR-03 regression #1: a stray `label:` marker outside appearance.* still fails the guard.
- WR-03 regression #2: a stray `theme:` marker outside `appSettings.sections` still fails the guard.
- Positive: a marker inside any descendant of `appearance:` is allowed.
- Positive: a marker above `theme:` inside `appSettings.sections` is allowed.

Per `[[feedback_no_design_locking]]`: the tracker no longer anchors on specific key names (halo, kuthasta, rings, etc.) — only on block-scope shape. Future additions or renames inside `appearance.*` require zero test changes.

---

## Iteration 2 — info findings

### IN-01: `AppSettingsPage` focus-restoration effect runs on every `returningFromAppearance` change

**Files modified:**
- `src/app/pages/AppSettingsPage.tsx` (added 5-line WHY comment above the focus `useEffect`)

**Commit:** `fe6de37`

**Applied fix:** Per the task instructions and `[[feedback_design_logic_separation]]` + `[[feedback_no_design_locking]]`: there is no concrete bug today (ScreenRouter unmounts/remounts the page across appearance ↔ appSettings transitions, so the effect only fires on fresh mount). The reviewer's concern is a hypothetical future router refactor.

Rather than adding speculative `useRef` guards (which would be dead defensive code today and locked-in design tomorrow), added a short inline comment near the effect:

```tsx
// Assumption: ScreenRouter unmounts/remounts this page on every navigation, so
// this effect only fires on fresh mount with a stable `returningFromAppearance`
// value — it does not steal focus mid-session. If the router is ever changed to
// keep this page mounted across the appearance ↔ appSettings transition, this
// effect needs a one-shot ref guard (see IN-01 in 48-REVIEW.md).
useEffect(() => { ... }, [returningFromAppearance])
```

This pins down the invariant that makes the current implementation correct and gives a future maintainer the exact pointer (IN-01 / `useRef` guard) if the router contract ever changes.

### IN-02: `appControllerAdapters` test does not assert appearance callbacks propagate

**Files modified:**
- `src/app/appControllerAdapters.test.ts` (added new `it()` case asserting the three Phase 48 fields)

**Commit:** `c53b1e3`

**Applied fix:** Added a focused test `'propagates onAppearanceOpen, onBackToAppSettings, and returningFromAppearance from navigation'` to the `'app controller adapters'` suite. The new test:

1. Defines DISTINCT function identities for `onAppearanceOpen` and `onBackToAppSettings` (the pre-existing `'combines surface navigation state'` test reused a single `noop` for every callback, which couldn't have distinguished cross-wired fields).
2. Constructs an `AppNavigation` with `appScreen='appearance'` and `returningFromAppearance=true` (exercising a non-default boolean flow-through, not the default `false`).
3. Calls `createAppDialogsViewModel(...)` with that navigation.
4. Asserts each Phase 48 field is forwarded byte-identical:
   - `dialogs.onAppearanceOpen === navigation.onAppearanceOpen`
   - `dialogs.onBackToAppSettings === navigation.onBackToAppSettings`
   - `dialogs.returningFromAppearance === true`

Targeted run: `appControllerAdapters.test.ts` → **8/8 passed** (7 pre-existing + 1 new).

### IN-03: `useAppNavigation` test `'closeOnSessionView forces appearance → practice and clears sentinel'` is a partial tautology

**Files modified:**
- `src/app/useAppNavigation.test.tsx` (split one test into two; rewrote sentinel-clear assertion to actually drive the value to `true` first)

**Commit:** `022ae25`

**Applied fix:** The original test set `appScreen='appearance'` (which forces `returningFromAppearance=false` via `onAppearanceOpen`), then asserted post-rerender that `returningFromAppearance===false`. Since the value was already `false` before the rerender, the assertion didn't exercise the `setReturningFromAppearance(false)` line in the effect.

Refactored into TWO tests so each has a clear, non-tautological assertion target:

1. **`'closeOnSessionView forces appearance → practice'`** — keeps the screen-transition assertion (the genuinely meaningful part of the original); drops the tautology.

2. **`'closeOnSessionView clears returningFromAppearance sentinel when previously set'`** — drives the sentinel to `true` via the real flow:
   ```
   onSettingsOpen() → onAppearanceOpen() → onBackToAppSettings()
   ```
   The last call is the only state-machine path that produces `returningFromAppearance=true`. Asserts pre-condition `returningFromAppearance===true`, then rerenders with `closeOnSessionView=true`, then asserts the effect both routes to `practice` AND clears the sentinel. **Without** the `setReturningFromAppearance(false)` line in the effect, this new test would fail.

Targeted run: `useAppNavigation.test.tsx` → **10/10 passed** (was 9; +1 from the split, 0 regressions).

### IN-04: `useAppNavigation` does not gate back callbacks on `controlsDisabled`

**Status:** SKIPPED — non-fix is the correct outcome.

**Skip rationale:** The reviewer's IN-04 itself documents that this is "not exploitable today" and "almost certainly harmless." I re-read `src/app/useAppNavigation.ts` end-to-end and verified that BOTH back callbacks share the same un-gated pattern:

```ts
const onBackToPractice = useCallback((): void => {        // NOT gated
  setAppScreen('practice')
  setReturningFromAppearance(false)
}, [])

const onBackToAppSettings = useCallback((): void => {     // NOT gated
  setAppScreen('appSettings')
  setReturningFromAppearance(true)
}, [])
```

This is **consistent** — there is no existing pattern in the file where some back callbacks are gated and others are not. Per the task instructions: "If existing back callbacks are also un-gated, this is intentional design (operator preference: back should always work)." Per `[[feedback_design_logic_separation]]`: "only touch the state machine if there's a real inconsistency, not a hypothetical race."

Adding speculative `if (controlsDisabled) return` guards would:
1. Lock in a defensive pattern downstream code can't easily remove.
2. Introduce subtle behavioral divergence with `onBackToPractice` (the prior phase's invariant).
3. Address a microtask race that the `closeOnSessionView` effect already covers (it routes to `practice` synchronously on the next render).

No code change is the correct outcome.

### IN-05: PT-BR `'Sinal do anel'` for Ring cue is awkward

**Status:** SKIPPED — this is the I18N-04 workflow's intended state.

**Skip rationale:** The string already carries a `// TODO: native-speaker review` marker at `src/content/strings.ts:570`. The whole point of the marker-guard mechanism (hardened in WR-03 above) is to surface these strings for the post-shipping I18N-04 native-speaker review pass. The reviewer's IN-05 explicitly states "this is the `// TODO: native-speaker review` workflow's intended target — flagged for the I18N-04 close-out pass, not as a blocker."

Per the task instructions and `[[project_v2_carryforward_disposition]]`: IN-05 is part of the I18N-04 post-shipping native-speaker pass, not a Phase 48 fix. The marker is already in place; I18N-04 will pick it up alongside the other 14+ TODO-marked PT-BR strings.

No code change. The operator will surface `'Sinal do anel'` explicitly during I18N-04.

---

## Verification

### Per-fix verification (3-tier strategy)

| Finding | Tier 1 (re-read) | Tier 2 (tsc + targeted tests) |
|---------|------------------|-------------------------------|
| WR-01 (iter 1) | passed | tsc clean; `SettingsPanelBody.test.tsx` + `AppearancePage.test.tsx` → 21/21 |
| WR-02 (iter 1) | passed | tsc clean; `OrbPicker.test.tsx` + `RingCuePicker.test.tsx` + `AppearancePage.test.tsx` → 19/19 |
| WR-03 (iter 1) | passed | tsc clean; `content.no-review-markers.test.ts` → 5/5 |
| IN-01 (iter 2) | passed | tsc clean; `AppSettingsPage.test.tsx` → 10/10 |
| IN-02 (iter 2) | passed | tsc clean; `appControllerAdapters.test.ts` → 8/8 (was 7) |
| IN-03 (iter 2) | passed | tsc clean; `useAppNavigation.test.tsx` → 10/10 (was 9) |
| IN-04 (iter 2) | n/a (skipped) | n/a |
| IN-05 (iter 2) | n/a (skipped) | n/a |

### Full pre-commit gate (aggregate, after all iteration-2 fixes)

| Gate | Result |
|------|--------|
| `npm run test -- --run` | 115 test files / **1280 tests passed** (was 1278 in iter 1; +2 new tests from IN-02 + IN-03) |
| `npm run build` | succeeded; `dist/index-uLXY4Puw.js` 311.14 KiB, gzip 92.39 KiB; PWA precache 19 entries (529.48 KiB) |
| `npm run lint` | clean (no output) |

All three gates green. Aggregate state is clean — no regressions introduced, no new lint warnings, no type errors.

### Memory-rule compliance check (iteration 2)

- `[[feedback_design_logic_separation]]` — IN-01 added a doc comment only (no state-machine change). IN-04 skipped specifically to avoid touching the state machine without evidence of a real inconsistency. IN-02 + IN-03 changed test files only.
- `[[feedback_no_design_locking]]` — IN-01's comment names an *invariant* (mount-remount contract) without anchoring on specific values or implementation details that downstream code could break. IN-02 + IN-03's new assertions exercise behavior, not specific identities of locked code.
- `[[project_v16_visual_locks]]` — no visual primitives touched in iteration 2 (no markup, no styles, no tokens).
- `[[project_dark_theme_token_collapse]]` — not touched.
- `breathing.inhale/exhale label width` — not touched.
- `[[feedback_use_lsp_for_renames]]` — no symbol renames performed.
- `[[project_v2_carryforward_disposition]]` — IN-05 explicitly deferred to I18N-04 per this rule.

---

## Skipped Issues (with rationale)

### IN-04 — Missing `controlsDisabled` gating on back callbacks
- **Rationale:** Both `onBackToPractice` and `onBackToAppSettings` are un-gated, so there is no existing pattern of gated back callbacks for the new code to align with. The reviewer flagged this as "not exploitable today" and "almost certainly harmless." `[[feedback_design_logic_separation]]` says only touch the state machine for real inconsistencies, not hypothetical races. The `closeOnSessionView` effect already provides the actual safety net.
- **Action:** None. The current code is consistent and correct.

### IN-05 — PT-BR `'Sinal do anel'` reads mechanically
- **Rationale:** The string already carries the `// TODO: native-speaker review` marker. The WR-03-hardened marker guard ensures it cannot ship without explicit review. This is exactly the intended state for the I18N-04 native-speaker pass. Operator confirmation in the task brief: "Default: skip with rationale, since I18N-04 is the post-shipping native-speaker pass that already addresses this."
- **Action:** None. The string is already queued for I18N-04 review via the existing marker workflow.

---

_Fixed: 2026-05-26T09:46:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
