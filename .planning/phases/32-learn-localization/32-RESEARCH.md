# Phase 32: Learn & Localization — Research

**Researched:** 2026-05-17
**Domain:** React component refactor (LearnDialog practice-awareness) + TypeScript content architecture (learnContent.ts extension) + i18n catalog finalization (strings.ts PT-BR review)
**Confidence:** HIGH — all findings verified directly against codebase source files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Learn partition & layout**
- D-01: Practice-first order — active practice description → its videos → shared "Who is Forrest" → "Forrest Resources". Native-apps block follows (resonant only), then affiliation micro-line, then Close button.
- D-02: Native-apps block ("Resonant Breathing app" — iOS/Android links) is resonant-only. Navi Kriya Learn omits the block entirely — no placeholder.
- D-03: Navi Kriya description mirrors resonant's two-section explainer shape — two parallel sections ("What is Navi Kriya" + "How this app paces it").
- D-04: Dialog title stays generic — `learn.title` "About this practice" unchanged.

**Navi Kriya Learn copy**
- D-05: Claude drafts Navi Kriya description copy (claim-safe, calm, non-medical, mirroring resonant tone); operator reviews and locks during execution.
- D-06: Navi Kriya video block carries exactly two links in this order: 1) "The Guardian In Meditation" → `https://www.youtube.com/watch?v=M3t7gY_yak8`; 2) "Navi Kriya Walkthrough" → `https://www.youtube.com/watch?v=A4BGQCIp9fI`. No padding.
- D-08: No extra practice label in dialog. Practice-description section heading carries the practice identity ("What is Navi Kriya" vs "What is HRV / resonance breathing").

**Practice-aware Learn behavior**
- D-07: Learn auto-tracks the active practice — shows whichever practice the switcher is on. One Learn anchor, no in-dialog practice toggle.

**PT-BR scope & quality gate**
- D-09: All v1.5 pt-BR is in scope. Existing pt-BR entries for Phase 30/31 keys (`practice.*`, `nkReadout.*`, `nkControls.*`) are treated as executor drafts — Phase 32 reviews and finalizes all of them.
- D-10: PT-BR is produced Claude-drafts / operator-reviews — same flow as Phase 26 I18N-07.
- D-11: Phase 26 drift-guard workflow extended to new Navi Kriya Learn copy — new pt-BR copy in `learnContent.ts` carries `// TODO: native-speaker review` markers; markers removed only after operator review; existing `content.no-review-markers.test.ts` keeps done-state locked.
- D-12: Navi Kriya video titles stay in English in both catalogs — consistent with existing resonant video pattern.

### Claude's Discretion

- Exact `learnContent.ts` data shape for per-practice partition (a `practices` map keyed by practice id over a shared base, vs. a flat extension) — planner's call; spike note is "per-practice partition over the shared base."
- How the Navi Kriya description's two sections are titled — D-03 fixes two-section shape; exact headings follow once copy is drafted (D-05).
- Whether the two Navi Kriya videos use existing `heroVideo` + `keyVideos[]` shape or a flatter two-link list — D-06 fixes order and count; data shape is a planner detail.
- Structural changes to `LearnDialog.tsx` to render practice-scoped vs. shared sections.

### Deferred Ideas (OUT OF SCOPE)

- A third / fourth practice (PRACTICE-F1 — future).
- v1.x carry-forward tech debt (iOS Safari audio recovery, Firefox orb flicker, Android wake-lock UAT, 28 Info-severity findings, WR-01 `IosInstallSteps` `::marker` coupling).
- Review all app config values and defaults — pending todo `.planning/todos/pending/2026-05-17-review-all-app-config-values-and-defaults.md`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LEARN-02 | User sees Learn content specific to the active practice — a practice description and relevant Forrest video links | `LearnDialog.tsx` must receive `activePractice: PracticeId` and render the matching content partition from `learnContent.ts` |
| LEARN-03 | User sees shared Learn sections (Who is Forrest, Forrest Resources) regardless of which practice is active | Shared sections in `learnContent.ts` (`explainer.forrest`, `links.youtubeChannel/website/book/patreon`) stay unchanged and always render |
| I18N-08 | User can read all new Navi Kriya and multi-practice UI copy in both English and native-quality PT-BR | All v1.5 keys in `strings.ts` and all new Learn copy in `learnContent.ts` must have operator-reviewed PT-BR values; markers removed after review |
</phase_requirements>

---

## Summary

Phase 32 is a pure content/component refactor with no new infrastructure. It does three things: (1) extend `learnContent.ts` with a per-practice partition so the existing `LearnContent` type gains practice-keyed description and video data; (2) make `LearnDialog.tsx` practice-aware by accepting the active practice and rendering sections in D-01 order with the native-apps block conditionally suppressed for Navi Kriya; and (3) finalize all v1.5 PT-BR strings through the established Claude-draft / operator-review flow, then remove `// TODO: native-speaker review` markers to let the drift-guard test pass.

The architecture is already thoroughly understood from the codebase audit. The current `LearnDialog.tsx` renders a fixed resonant layout with a hardwired `{ explainer, links }` destructure and no awareness of `activePractice`. The file receives `learnContent: LearnContent` from `App.tsx` line 1263. The key changes are: (a) a new `learnContent.ts` data shape that holds both practices' description sections and videos under a `practices` map; (b) `LearnDialog` receives or derives `activePractice: PracticeId` to select the practice partition at render time; and (c) the native-apps block in the dialog JSX becomes a conditional on `activePractice === 'resonant'`. The rest of the dialog (forrest explainer, shared resources, affiliation line, close button) is unchanged.

Localization is the largest surface: there are ~35 v1.5 PT-BR strings that shipped as executor drafts in `strings.ts` (across `practice.*`, `nkReadout.*`, `nkControls.*`), plus 5 new Learn string keys to add to `UiStrings` and the new Navi Kriya content sections in `learnContent.ts`. The operator reviews and approves each PT-BR string during execution; the drift-guard test (`content.no-review-markers.test.ts`) enforces that all markers are removed before the phase is considered done.

**Primary recommendation:** Plan three sequential work units — (1) `learnContent.ts` extension + `UiStrings` new keys in EN (data foundation), (2) `LearnDialog.tsx` practice-aware rendering (component refactor), (3) PT-BR drafting + operator review loop + marker removal (localization finalization). The test suite (78 files / 1131 tests, all green) is the validation gate at each wave boundary.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Practice-scoped Learn content data | Static content module (`learnContent.ts`) | — | Content is authored data, not derived from UI state; colocated with existing LearnContent shape |
| Active-practice content selection | Frontend component (`LearnDialog.tsx`) or parent (`App.tsx`) | — | Selection is render-time — pick the right content partition based on `activePractice` prop |
| Conditional native-apps block | Frontend component (`LearnDialog.tsx`) | — | Conditional render on `activePractice === 'resonant'` — pure JSX logic |
| PT-BR string catalog | Static content module (`strings.ts`) | Static content module (`learnContent.ts`) | Follows existing `Record<LocaleId, UiStrings>` + `Record<LocaleId, LearnContent>` shape |
| Drift-guard enforcement | Test infrastructure (`content.no-review-markers.test.ts`) | — | Existing fs-scan test already covers `src/content/`; extended by adding new file entries |
| Locale resolution | `App.tsx` → `useLocale()` hook | — | Already wires `LEARN_CONTENT[locale]` + `LOCKED_COPY[locale]` + `UI_STRINGS[locale]` and passes them as props — unchanged for this phase |

---

## Standard Stack

This phase uses no new libraries. The entire stack is carried forward from the existing codebase.

### Core (existing — no additions)

| Library/Tool | Purpose | How Used in This Phase |
|---|---|---|
| React 18 (TSX) | Component rendering | `LearnDialog.tsx` practice-aware JSX refactor |
| TypeScript | Type safety | New `PracticeLearnContent` type, updated `UiStrings.learn` interface |
| Vitest + Testing Library | Test framework | Extend `LearnDialog.test.tsx`, `learnContent.test.ts`, `strings.test.ts` |
| Tailwind CSS v4 (Vite plugin) | Utility classes | Zero-change — existing dialog CSS classes carry forward |

**Version verification:** No new packages to install. `vitest` is at `^4.1.5` per `package.json`. [VERIFIED: codebase]

---

## Architecture Patterns

### System Architecture Diagram

```
App.tsx
  │
  ├── useLocale() → { locale }
  │     └── LEARN_CONTENT[locale]   ← learnContent.ts (extended: shared base + practices map)
  │         ├── shared: explainer.forrest, links.*
  │         └── practices: { resonant: { description, videos }, naviKriya: { description, videos } }
  │
  ├── loadActivePractice() → activePractice: PracticeId
  │
  └── LearnDialog (open, learnContent, lockedCopy, strings, activePractice?)
        │
        ├── [PRACTICE-SCOPED] Practice description sections (activePractice → section1 + section2)
        ├── [PRACTICE-SCOPED] Practice videos (activePractice → videos[])
        ├── [SHARED] forrest explainer + lockedCopy.inspiredByForrest (always)
        ├── [SHARED] Forrest Resources links (always)
        ├── [CONDITIONAL] Native-apps block (resonant only — D-02)
        └── [SHARED] affiliationLine + Close button (always)
```

### Recommended Project Structure (unchanged)

```
src/
├── content/
│   ├── learnContent.ts        # MODIFIED — adds PracticeLearnContent + practices map
│   ├── learnContent.test.ts   # MODIFIED — new structural tests for practice partition
│   ├── strings.ts             # MODIFIED — adds 5 new UiStrings.learn keys + PT-BR for all v1.5
│   ├── strings.test.ts        # MODIFIED — new tests for new learn keys + nkReadout/nkControls PT-BR
│   └── content.no-review-markers.test.ts  # unchanged (already covers src/content/)
├── components/
│   ├── LearnDialog.tsx         # MODIFIED — practice-aware rendering (D-01, D-02, D-07, D-08)
│   └── LearnDialog.test.tsx    # MODIFIED — new tests: NK content, no native-apps for NK, resonant-only gate
└── app/
    └── App.tsx                 # MODIFIED (minimally) — pass activePractice to LearnDialog
```

### Pattern 1: Per-Practice Content Partition in `learnContent.ts`

**What:** Extend `LearnContent` to add a `practices` record keyed by `PracticeId`, holding per-practice description sections and video links over the existing shared base.

**When to use:** Always — this is the data foundation for LEARN-02/LEARN-03.

**Recommended shape (planner's discretion — this is the Claude's-discretion area):**

```typescript
// Source: learnContent.ts audit + CONTEXT.md "Claude's Discretion" + UI-SPEC §Content Architecture Contract

export interface PracticeLearnContent {
  readonly description: {
    readonly section1: ExplainerSection  // e.g. "What is Navi Kriya" / "What is HRV / resonance breathing"
    readonly section2: ExplainerSection  // e.g. "How this app paces it" / "How this app times your breath"
  }
  readonly videos: readonly LearnLink[]  // resonant: [heroVideo, ...keyVideos]; naviKriya: exactly 2
}

export interface LearnContent {
  // Shared base (unchanged)
  readonly explainer: {
    readonly forrest: ExplainerSection  // "Who is Forrest Knutson" — shared
  }
  readonly links: {
    readonly youtubeChannel: LearnLink
    readonly website: LearnLink
    readonly book: LearnLink
    readonly patreon: LearnLink
    readonly appStoreIos: LearnLink       // resonant-only at render time (D-02)
    readonly googlePlayAndroid: LearnLink // resonant-only at render time (D-02)
  }
  // Per-practice partition (NEW — Phase 32)
  readonly practices: {
    readonly resonant: PracticeLearnContent
    readonly naviKriya: PracticeLearnContent
  }
}
```

**Key insight:** The existing `explainer.hrv` and `explainer.timing` sections move into `practices.resonant.description.section1` and `section2`. The current `links.heroVideo` and `links.keyVideos[]` move into `practices.resonant.videos`. This restructures the existing resonant data while introducing the naviKriya partition. The `satisfies` constraint with `Readonly<Record<LocaleId, LearnContent>>` is preserved — TypeScript will enforce that both `en` and `pt-BR` carry all fields. [VERIFIED: codebase learnContent.ts]

### Pattern 2: Practice-Aware `LearnDialog` Rendering

**What:** `LearnDialog` receives `activePractice: PracticeId` (or derives it from the `learnContent` structure) and selects `learnContent.practices[activePractice]` at render time.

**Existing wiring in App.tsx (line 1263):**
```tsx
// Current (Phase 32 must update):
<LearnDialog open={learnDialogOpen} onClose={onLearnClose} learnContent={learnContent} lockedCopy={lockedCopy} strings={uiStrings.learn} />
```

**Updated wiring:**
```tsx
// Phase 32 — add activePractice prop
<LearnDialog open={learnDialogOpen} onClose={onLearnClose} learnContent={learnContent} lockedCopy={lockedCopy} strings={uiStrings.learn} activePractice={activePractice} />
```

`activePractice` is already present in `App.tsx` scope (line 125: `const [activePractice, setActivePractice] = useState<PracticeId>(initialActivePractice)`). [VERIFIED: codebase App.tsx]

**Render section order (D-01):**
```tsx
// Source: UI-SPEC §Practice-Aware Layout Contract

// 1. Practice description sections (practice-scoped)
const practiceContent = learnContent.practices[activePractice]
<div className="grid gap-4">
  <div>
    <h3 ...>{practiceContent.description.section1.title}</h3>
    <p ...>{practiceContent.description.section1.body}</p>
  </div>
  <div>
    <h3 ...>{practiceContent.description.section2.title}</h3>
    <p ...>{practiceContent.description.section2.body}</p>
  </div>
</div>

// 2. Practice videos (practice-scoped)
<div>
  <h3 ...>{practiceVideosHeading}</h3>  {/* strings.learn.videosHeading or strings.learn.naviKriyaVideosHeading */}
  <div className="mt-1 grid gap-2">
    {practiceContent.videos.map((video) => (
      <a key={video.url} href={video.url} target="_blank" rel="noopener noreferrer" ...>
        {video.label}
      </a>
    ))}
  </div>
</div>

// 3. Shared forrest explainer (always)
<div>
  <h3 ...>{explainer.forrest.title}</h3>
  {explainer.forrest.body.split('\n\n').map((para) => <p ...>{para}</p>)}
  <p ... className="italic">{lockedCopy.inspiredByForrest}</p>
</div>

// 4. Shared Forrest Resources (always)
<div>
  <h3 ...>{strings.resourcesHeading}</h3>
  <div ...>
    <a href={links.youtubeChannel.url} ...>{links.youtubeChannel.label}</a>
    <a href={links.website.url} ...>{links.website.label}</a>
    <a href={links.book.url} ...>{links.book.label}</a>
    <a href={links.patreon.url} ...>{links.patreon.label}</a>
  </div>
</div>

// 5. Native-apps block — resonant ONLY (D-02)
{activePractice === 'resonant' && (
  <div>
    <h3 ...>{strings.nativeAppsHeading}</h3>
    <div ...>
      <a href={links.appStoreIos.url} ...>{links.appStoreIos.label}</a>
      <a href={links.googlePlayAndroid.url} ...>{links.googlePlayAndroid.label}</a>
    </div>
  </div>
)}

// 6. Affiliation micro-line (always)
<p ...>{lockedCopy.affiliationLine}</p>

// 7. Close button (always)
```

### Pattern 3: New `UiStrings.learn` Keys

**What:** Add 5 new string keys to the `learn` sub-interface. TypeScript's `satisfies` constraint on `UI_STRINGS` will enforce that both `en` and `pt-BR` carry all keys.

```typescript
// Source: UI-SPEC §New String Keys Required

readonly learn: {
  readonly title: string                          // existing
  readonly close: string                          // existing
  readonly resourcesHeading: string               // existing
  readonly videosHeading: string                  // existing (resonant — "Selected HRV Breathing Videos")
  readonly nativeAppsHeading: string              // existing
  // NEW — Phase 32:
  readonly naviKriyaVideosHeading: string         // "Selected Navi Kriya Videos"
  readonly naviKriyaDescriptionSection1Title: string  // "What is Navi Kriya"
  readonly naviKriyaDescriptionSection1Body: string   // Claude drafts, operator locks (D-05)
  readonly naviKriyaDescriptionSection2Title: string  // "How this app paces it"
  readonly naviKriyaDescriptionSection2Body: string   // Claude drafts, operator locks (D-05)
}
```

**Note:** The description body strings (`section1Body`, `section2Body`) could alternatively live in `learnContent.ts` as `PracticeLearnContent.description.section1.body` rather than in `strings.ts`. Both locations are localed by `LocaleId`. The planner should pick one: keeping body content in `learnContent.ts` (matching the existing `hrv.body`/`timing.body` pattern) vs. surfacing them in `strings.ts` for consistency with other UI copy. The UI-SPEC shows the keys in `strings.ts`, but this is the "Claude's Discretion" shape decision. [VERIFIED: UI-SPEC §New String Keys Required]

**Strong recommendation:** Keep practice description body strings in `learnContent.ts` (under `practices.naviKriya.description.section*.body`), not in `strings.ts`. This mirrors where the existing `explainer.hrv.body` and `explainer.timing.body` live. `strings.ts` should hold only the heading strings (section titles + videos heading). This also means the clinical-verbs guard test in `learnContent.test.ts` naturally covers the NK body copy.

### Pattern 4: PT-BR Drift-Guard Workflow (D-11)

**What:** New NK Learn content in `learnContent.ts` ships with `// TODO: native-speaker review` comments during the drafting pass. The operator reviews and removes the markers. The fs-scan test `content.no-review-markers.test.ts` already covers all `.ts` files in `src/content/` — no changes to the test file are needed as long as new content files land in that directory. [VERIFIED: codebase content.no-review-markers.test.ts]

```typescript
// In learnContent.ts during draft (marker present = blocked by test):
naviKriya: {
  description: {
    section1: {
      title: 'What is Navi Kriya',  // TODO: native-speaker review
      body: '...',                   // TODO: native-speaker review
    },
    ...
  }
}
```

**The test scan:** `collectFiles(CONTENT_DIR)` scans all non-`.test.ts` files under `src/content/`. The REVIEW_MARKER is `'TODO: native-speaker review'`. The test fails if any content file contains this string. [VERIFIED: codebase]

### Anti-Patterns to Avoid

- **Hardwiring resonant content in the dialog JSX:** The current `LearnDialog.tsx` reads `const { explainer, links } = learnContent` and accesses `explainer.hrv`, `explainer.timing` directly. After Phase 32 those keys move into `learnContent.practices.resonant`. Do not leave hardcoded `explainer.hrv` fallbacks — use the practice partition.
- **Putting description body strings in `strings.ts`:** The existing `hrv.body` / `timing.body` are in `learnContent.ts`. Keeping NK body copy there keeps the clinical-verbs guard test coverage automatic. If moved to `strings.ts`, you must manually add clinical-verbs guard tests for the new keys.
- **Translating "Navi Kriya":** Phase 30 D-05 locks this as a Sanskrit proper noun — stays "Navi Kriya" in both `en` and `pt-BR`.
- **Translating video titles:** D-12 locks all video titles to English in both locales (consistent with resonant precedent). The pt-BR `learnContent` must carry English video labels.
- **Leaving markers in learnContent.ts before merge:** The drift-guard test (`content.no-review-markers.test.ts`) will fail the full suite if any `// TODO: native-speaker review` comment survives. Wave 2 (localization finalization) must remove all markers after operator review.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript locale completeness enforcement | Manual locale parity checks | `as const satisfies Readonly<Record<LocaleId, UiStrings>>` | Already in `strings.ts` — TypeScript will error at compile time if any locale is missing a key |
| PT-BR draft quality review workflow | Custom review tooling | The established `// TODO: native-speaker review` + operator review flow (Phase 26 D-12) | Already proven in Phase 26; the drift-guard test enforces done-state |
| Clinical copy guard | Ad-hoc string checks | Extend existing `learnContent.test.ts` clinical-verbs regex tests to cover NK description body | Tests already exist for `hrv.body`, `timing.body`, `forrest.body` — pattern is established |
| Practice content selection logic | Complex switch statements in the component | `learnContent.practices[activePractice]` — simple property access | The `PracticeId` union is `'resonant' | 'naviKriya'` — direct keying is type-safe and transparent |

**Key insight:** Every infrastructure concern in this phase (TypeScript enforcement, test drift-guard, clinical-copy guard, locale parity) already exists. Phase 32 extends existing patterns, not builds new ones.

---

## Common Pitfalls

### Pitfall 1: Breaking Existing `learnContent.test.ts` Tests

**What goes wrong:** The current tests assert `Object.keys(LEARN_CONTENT[locale].explainer)` equals `['hrv', 'timing', 'forrest']`. After restructuring, `explainer` only holds `forrest` (the shared section). The `hrv` and `timing` sections move into `practices.resonant.description`.

**Why it happens:** Existing tests are written against the current flat structure; they will fail if the shape changes without updating the tests.

**How to avoid:** Update `learnContent.test.ts` in the same task that restructures `learnContent.ts`. The explainer-keys test becomes: `Object.keys(LEARN_CONTENT[locale].explainer)` equals `['forrest']`. New tests verify `LEARN_CONTENT[locale].practices.resonant.description` and `LEARN_CONTENT[locale].practices.naviKriya.description` both have non-empty section1/section2.

**Warning signs:** `learnContent.test.ts` failures on the `explainer has exactly three keys` test.

### Pitfall 2: `LearnDialog.test.tsx` Tests Check for Resonant Content

**What goes wrong:** Existing `LearnDialog.test.tsx` tests look for "About this practice", the locked phrase, affiliation line, native-app store links — all of which remain valid. But no test currently checks that NK content renders and that the native-apps block is absent when `activePractice === 'naviKriya'`.

**Why it happens:** Phase 32 adds conditional rendering; the existing test helper `renderDialog()` does not pass an `activePractice` prop (which doesn't exist yet).

**How to avoid:** Update `renderDialog()` helper to accept `activePractice?: PracticeId`. Add tests: NK practice description sections present, NK video links present, native-apps block absent for NK, native-apps block present for resonant.

**Warning signs:** Tests that render the dialog without `activePractice` will continue to pass even if the conditional is broken — they won't catch the regression. New parameterized tests are needed.

### Pitfall 3: PT-BR Review Markers in `strings.ts` vs. `learnContent.ts`

**What goes wrong:** The drift-guard test only scans `src/content/` for `.ts` non-test files. `strings.ts` is in `src/content/` so markers there are caught. But the drift-guard is scoped to the string `'TODO: native-speaker review'` — if a different comment format is used, the test won't catch it.

**Why it happens:** Marker format must match `REVIEW_MARKER = 'TODO: native-speaker review'` exactly (see `content.no-review-markers.test.ts` line 36).

**How to avoid:** Use exactly `// TODO: native-speaker review` (case-exact, no extra punctuation). Both `strings.ts` and `learnContent.ts` are scanned by the existing test. [VERIFIED: codebase]

### Pitfall 4: Videos Heading String Key Naming

**What goes wrong:** The existing `strings.learn.videosHeading` renders "Selected HRV Breathing Videos" — resonant-specific. Reusing it for NK videos would be incorrect. A new key `naviKriyaVideosHeading` is required.

**Why it happens:** The existing key is named generically but its value is practice-specific.

**How to avoid:** Add `naviKriyaVideosHeading` to `UiStrings.learn` and use it in the NK video sub-section heading. The resonant sub-section continues to use `videosHeading`. TypeScript enforces both locales carry both keys.

### Pitfall 5: `as const satisfies` Constraint After Adding `practices` Field

**What goes wrong:** The current `LEARN_CONTENT` ends with `} as const satisfies Readonly<Record<LocaleId, LearnContent>>`. Adding a new top-level field to `LearnContent` interface will cause both the `en` and `pt-BR` entries to fail the `satisfies` check until both are updated.

**Why it happens:** `satisfies` checks all entries against the interface at compile time; partial updates fail immediately.

**How to avoid:** Update both `en` and `pt-BR` entries in the same edit. The PT-BR entry can carry `// TODO: native-speaker review` markers on NK content, but the structural fields must be present and string-typed.

### Pitfall 6: App.tsx `learnContent` Prop Shape Change

**What goes wrong:** `App.tsx` line 269 currently does `const learnContent = LEARN_CONTENT[locale]` and passes it directly to `LearnDialog`. After restructuring `LearnContent`, the existing prop-type annotation `learnContent: LearnContent` in `LearnDialog.tsx` will still be valid — but any internal destructuring like `const { explainer, links } = learnContent` accessing `explainer.hrv` directly will fail TypeScript compilation because `explainer.hrv` no longer exists.

**Why it happens:** TypeScript compile-time catch — the restructured `LearnContent` interface removes `explainer.hrv` and `explainer.timing`.

**How to avoid:** Update `LearnDialog.tsx` destructuring and JSX in the same task that updates `learnContent.ts`. Run `npm run build` (tsc + vite build) as the compile-time gate.

---

## Code Examples

### Existing Clinical-Verbs Guard Pattern (extend to NK copy)

```typescript
// Source: src/content/learnContent.test.ts lines 30-47
// Extend this pattern to cover practices.naviKriya.description.section1.body + section2.body

const enClinicalVerbs = /\b(improves|treats|cures|heals|diagnoses)\b/i
const ptBrClinicalVerbs = /\b(melhora|trata|cura|diagnostica|avalia)\b/i

it(`[${locale}] naviKriya section1 body has no forbidden clinical verbs`, () => {
  expect(LEARN_CONTENT[locale].practices.naviKriya.description.section1.body)
    .not.toMatch(locale === 'en' ? enClinicalVerbs : ptBrClinicalVerbs)
})
```

### Existing `satisfies` Pattern in `learnContent.ts` (carry forward unchanged)

```typescript
// Source: src/content/learnContent.ts line 165
export const LEARN_CONTENT: Readonly<Record<LocaleId, LearnContent>> = {
  en: { ... },
  'pt-BR': { ... },
} as const satisfies Readonly<Record<LocaleId, LearnContent>>
```

### Existing Video Link Render Pattern in `LearnDialog.tsx` (reuse for NK)

```typescript
// Source: src/components/LearnDialog.tsx lines 168-178
{links.keyVideos.map((video) => (
  <a
    key={video.url}
    href={video.url}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
  >
    {video.label}
  </a>
))}
// Reuse this pattern for NK videos: practiceContent.videos.map(...)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed resonant-only explainer (hrv + timing + forrest) | Per-practice partition (practices map) | Phase 32 | `LearnDialog` becomes practice-aware; resonant data migrates from top-level to `practices.resonant` |
| `learnContent.ts` top-level `explainer` has 3 keys | `explainer` holds only `forrest` (shared); `practices.*` hold per-practice description | Phase 32 | `learnContent.test.ts` existing key-order test must be updated |
| `UiStrings.learn` has 5 keys | `UiStrings.learn` gains 5 new keys (`naviKriyaVideosHeading`, + 4 NK description keys) | Phase 32 | Both locales must carry all 10 keys |

**PT-BR v1.5 strings already shipped as drafts (review scope — D-09):**

The following PT-BR keys already exist in `strings.ts` and are treated as executor drafts requiring operator review in Phase 32:

- `practice.*`: `toggleLabel`, `resonantName`, `naviKriyaName`, `resonantHeading`, `naviKriyaHeading`, `naviKriyaHeader`, `naviKriyaControlsPlaceholder`, `naviKriyaStatsEmptyBody`, `resetStatsTitle` (template fn) — 9 entries [VERIFIED: codebase strings.ts]
- `nkReadout.*`: `statusLabel`, `readoutAriaLabel`, `phaseLabel`, `front`, `back`, `roundLabel`, `countLabel`, `roundOf`, `countOf` — 9 entries [VERIFIED: codebase strings.ts]
- `nkControls.*`: `roundsLabel`, `frontCountLabel`, `omLengthLabel`, `omLengthFast`, `omLengthMedium`, `omLengthSlow`, `perOmCueLabel`, `perOmCueOn`, `perOmCueOff`, `estimatedDuration` — 10 entries [VERIFIED: codebase strings.ts]
- `stats.roundsCompletedLabel` — 1 entry [VERIFIED: codebase strings.ts]
- `controls.pause`, `controls.resume` — 2 entries [VERIFIED: codebase strings.ts]

Total: ~31 existing PT-BR draft strings to review, plus 5 new NK Learn keys to draft and have reviewed.

---

## Open Questions

1. **Resonant `practices.resonant.videos` shape: flat `LearnLink[]` or preserve `heroVideo` + `keyVideos[]` distinction?**
   - What we know: The current `LearnContent` has separate `heroVideo: LearnLink` and `keyVideos: readonly LearnLink[]`. NK has exactly 2 videos with no hero/key distinction (D-06: "fewer is fine").
   - What's unclear: Should `practices.resonant.videos` flatten the existing heroVideo + keyVideos into a single `LearnLink[]`, or should it preserve a richer shape to avoid losing the `heroVideo` semantic?
   - Recommendation: Flatten to `readonly LearnLink[]` in both resonant and naviKriya for type uniformity. The existing `heroVideo` becomes `videos[0]`, `keyVideos` becomes `videos[1..3]`. The render pattern is already a map loop (lines 168-178) — it works identically.

2. **Where do NK description body strings live: `learnContent.ts` or `strings.ts`?**
   - What we know: The UI-SPEC shows them as `strings.ts` keys. The existing `hrv.body`/`timing.body` are in `learnContent.ts`. The clinical-verbs guard tests cover `learnContent.ts` body fields.
   - What's unclear: The planner must decide — this is explicitly in Claude's Discretion.
   - Recommendation: `learnContent.ts`. Body text is long-form authored content, not UI chrome strings. The clinical-verbs guard test coverage comes automatically.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — phase is code/config-only changes within the existing React + TypeScript + Vitest stack)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.5 |
| Config file | `vite.config.ts` (inline `test:` block) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

**Current baseline:** 78 test files / 1131 tests, all green. [VERIFIED: test run output]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEARN-02 | NK practice description sections render when `activePractice === 'naviKriya'` | unit | `npx vitest run src/components/LearnDialog.test.tsx` | ❌ Wave 0 (new assertions needed) |
| LEARN-02 | NK video links render when `activePractice === 'naviKriya'` | unit | `npx vitest run src/components/LearnDialog.test.tsx` | ❌ Wave 0 |
| LEARN-02 | `learnContent.ts` `practices.naviKriya` has non-empty description + videos | unit | `npx vitest run src/content/learnContent.test.ts` | ❌ Wave 0 (new structural tests) |
| LEARN-03 | Shared forrest explainer renders for both practices | unit | `npx vitest run src/components/LearnDialog.test.tsx` | ❌ Wave 0 (implicit in existing + new parameterized tests) |
| LEARN-03 | Forrest Resources links render for both practices | unit | `npx vitest run src/components/LearnDialog.test.tsx` | ❌ Wave 0 |
| LEARN-03 | Native-apps block absent when `activePractice === 'naviKriya'` | unit | `npx vitest run src/components/LearnDialog.test.tsx` | ❌ Wave 0 |
| I18N-08 | All v1.5 `strings.ts` keys non-empty in pt-BR | unit | `npx vitest run src/content/strings.test.ts` | Partial ✅ — existing exhaustiveness tests cover structure; nkReadout/nkControls need explicit coverage |
| I18N-08 | No `// TODO: native-speaker review` markers remain in `src/content/` | unit | `npx vitest run src/content/content.no-review-markers.test.ts` | ✅ (existing — extended automatically) |
| I18N-08 | NK description body has no clinical verbs in both locales | unit | `npx vitest run src/content/learnContent.test.ts` | ❌ Wave 0 (new clinical-verbs tests) |
| I18N-08 | New `learn.*` string keys non-empty in both locales | unit | `npx vitest run src/content/strings.test.ts` | ❌ Wave 0 (new exhaustiveness assertions) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/content/learnContent.test.ts src/content/strings.test.ts src/components/LearnDialog.test.tsx`
- **Per wave merge:** `npx vitest run` (full 78-file suite)
- **Phase gate:** Full suite green + `npm run build` succeeds before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/content/learnContent.test.ts` — update existing explainer-keys test; add `practices.resonant` + `practices.naviKriya` structural tests; add NK clinical-verbs guard
- [ ] `src/components/LearnDialog.test.tsx` — update `renderDialog()` helper to accept `activePractice`; add NK content present / resonant-apps absent / NK-apps absent tests
- [ ] `src/content/strings.test.ts` — add exhaustiveness checks for new `learn.*` keys; add explicit non-empty checks for `nkReadout.*` and `nkControls.*` PT-BR (currently implicitly covered by `as const satisfies` but not by tests)

---

## Security Domain

This phase makes no network requests, adds no user inputs, introduces no auth flows, and stores no new data. The security posture is unchanged from the existing shipped dialog.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | No | — all content is authored static data, no user input |
| V6 Cryptography | No | — |

**External links:** All links carry `target="_blank" rel="noopener noreferrer"` per the existing pattern established in Phase 6 (D-07). The two new NK video URLs are YouTube HTTPS URLs. Planner/executor should sanity-check both URLs resolve before shipping (CONTEXT.md Specifics note). [VERIFIED: codebase LearnDialog.tsx every `<a>` element]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Flattening `heroVideo` + `keyVideos[]` into a single `videos: readonly LearnLink[]` in the resonant practice partition will not break existing tests | Architecture Patterns / Open Questions | Existing `LearnDialog.test.tsx` tests reference `keyVideos` by URL lookup via `LEARN_CONTENT.en.links.keyVideos` — if the shape moves, those tests need updating. Low risk since tests will fail at compile/run time. |

**All other claims in this research were verified directly against codebase source files — no user confirmation needed.**

---

## Sources

### Primary (HIGH confidence — verified against codebase)

- `src/content/learnContent.ts` — current `LearnContent` type, existing data shape, all EN + PT-BR sections
- `src/components/LearnDialog.tsx` — current render order, all CSS classes, prop interface, conditional patterns
- `src/app/App.tsx` — `activePractice` state, `learnContent` / `lockedCopy` wiring, `LearnDialog` props at line 1263
- `src/content/strings.ts` — all existing v1.5 PT-BR drafts, `UiStrings.learn` interface
- `src/content/content.no-review-markers.test.ts` — drift-guard implementation, scan scope, marker string
- `src/content/learnContent.test.ts` — existing clinical-verbs guards, URL tests, structural tests
- `src/components/LearnDialog.test.tsx` — existing test coverage, `renderDialog()` helper shape
- `src/content/strings.test.ts` — existing exhaustiveness tests, Phase 30 practice key coverage
- `src/hooks/useLocale.ts` — locale resolution hook, `UI_STRINGS[locale]` return shape
- `src/storage/practices.ts` — `PracticeId = 'resonant' | 'naviKriya'` type definition
- `vite.config.ts` — Vitest config (`environment: 'jsdom'`, `globals: true`, `setupFiles`)
- `.planning/phases/32-learn-localization/32-CONTEXT.md` — all locked decisions
- `.planning/phases/32-learn-localization/32-UI-SPEC.md` — UI design contract, section order, new string keys
- `.claude/skills/spike-findings-hrv/references/multi-practice-architecture.md` — Learn screen §4

### Secondary (MEDIUM confidence)

- Phase 31 plan 31-06-SUMMARY.md — confirms `controls.pause`/`controls.resume` strings were added to `strings.ts` during Phase 31 execution
- Vitest run output — 78 files / 1131 tests green confirms current baseline

---

## Metadata

**Confidence breakdown:**
- Content architecture (learnContent.ts shape): HIGH — existing types and patterns directly audited
- Component refactor (LearnDialog.tsx): HIGH — all JSX and prop patterns directly read
- Localization scope (strings.ts review): HIGH — all 31 existing draft strings enumerated from source
- Test validation strategy: HIGH — existing test patterns directly audited and extended

**Research date:** 2026-05-17
**Valid until:** Stable — this is a codebase-internal research; valid until source files change
