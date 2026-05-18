# Phase 32: Learn & Localization - Pattern Map

**Mapped:** 2026-05-17
**Files analyzed:** 6 (5 modified files + 1 unchanged test)
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/content/learnContent.ts` | content-module | transform (restructure + extend) | itself — existing file being extended | exact (self-analog) |
| `src/content/learnContent.test.ts` | test | transform | itself — existing test file being extended | exact (self-analog) |
| `src/content/strings.ts` | content-module | transform (add keys + review PT-BR) | itself — existing file being extended | exact (self-analog) |
| `src/content/strings.test.ts` | test | transform | itself — existing test file being extended | exact (self-analog) |
| `src/components/LearnDialog.tsx` | component | request-response (prop-driven render) | itself — existing component being refactored | exact (self-analog) |
| `src/components/LearnDialog.test.tsx` | test | request-response | itself — existing test file being extended | exact (self-analog) |
| `src/app/App.tsx` | provider/wiring | request-response | itself — minimal prop-pass change | exact (self-analog) |

> All Phase 32 files are modifications of existing files; no net-new files are created.
> The analogs are the files themselves — the patterns are extracted directly from the current state.

---

## Pattern Assignments

### `src/content/learnContent.ts` (content-module, restructure + extend)

**Analog:** itself (`src/content/learnContent.ts`, lines 1–165)

**Current type definitions pattern** (lines 10–36):
```typescript
export interface ExplainerSection {
  readonly title: string
  readonly body: string
}

export interface LearnLink {
  readonly label: string
  readonly url: string
}

export interface LearnContent {
  readonly explainer: {
    readonly hrv: ExplainerSection
    readonly timing: ExplainerSection
    readonly forrest: ExplainerSection
  }
  readonly links: {
    readonly youtubeChannel: LearnLink
    readonly website: LearnLink
    readonly book: LearnLink
    readonly patreon: LearnLink
    readonly heroVideo: LearnLink
    readonly keyVideos: readonly LearnLink[]
    readonly appStoreIos: LearnLink
    readonly googlePlayAndroid: LearnLink
  }
}
```

**Phase 32 target shape** — add `PracticeLearnContent` interface and `practices` map to `LearnContent`:
```typescript
// NEW interface — add before LearnContent
export interface PracticeLearnContent {
  readonly description: {
    readonly section1: ExplainerSection  // e.g. "What is Navi Kriya"
    readonly section2: ExplainerSection  // e.g. "How this app paces it"
  }
  readonly videos: readonly LearnLink[]  // flat list; resonant: [heroVideo, ...keyVideos]; naviKriya: exactly 2
}

// UPDATED LearnContent — explainer shrinks to forrest-only; practices map added
export interface LearnContent {
  readonly explainer: {
    // hrv and timing REMOVED — moved into practices.resonant.description.section1/section2
    readonly forrest: ExplainerSection  // shared, always present
  }
  readonly links: {
    readonly youtubeChannel: LearnLink
    readonly website: LearnLink
    readonly book: LearnLink
    readonly patreon: LearnLink
    // appStoreIos and googlePlayAndroid stay here (rendered conditionally in dialog)
    readonly appStoreIos: LearnLink
    readonly googlePlayAndroid: LearnLink
    // heroVideo and keyVideos REMOVED — moved into practices.resonant.videos
  }
  // NEW field:
  readonly practices: {
    readonly resonant: PracticeLearnContent
    readonly naviKriya: PracticeLearnContent
  }
}
```

**`as const satisfies` export pattern** (line 38 + line 165):
```typescript
export const LEARN_CONTENT: Readonly<Record<LocaleId, LearnContent>> = {
  en: { ... },
  'pt-BR': { ... },
} as const satisfies Readonly<Record<LocaleId, LearnContent>>
```
Both locale entries must be updated in the same edit — `satisfies` will fail compilation if any locale is missing the new `practices` field.

**PT-BR video titles stay English pattern** (lines 134–153 — `pt-BR` video entries):
```typescript
heroVideo: {
  // Video title kept in English — YouTube source is English; no PT-BR title available.
  label: 'The Holy Trinity of Breath Induces HRV Resonance',
  url: 'https://www.youtube.com/watch?v=89WorFpMyY0',
},
keyVideos: [
  {
    // Video title kept in English — YouTube source is English; no PT-BR title available.
    label: 'The Meditation Magic of Sitting Very Still - SVS',
    ...
  },
```
Copy this comment pattern verbatim for both NK video entries in the `pt-BR` catalog (D-12).

**Draft marker pattern** (D-11 — used during drafting, removed after operator review):
```typescript
// In learnContent.ts pt-BR naviKriya section during draft:
naviKriya: {
  description: {
    section1: {
      title: '...', // TODO: native-speaker review
      body: '...',  // TODO: native-speaker review
    },
    section2: {
      title: '...', // TODO: native-speaker review
      body: '...',  // TODO: native-speaker review
    },
  },
  videos: [
    {
      // Video title kept in English — YouTube source is English; no PT-BR title available.
      label: 'The Guardian In Meditation',
      url: 'https://www.youtube.com/watch?v=M3t7gY_yak8',
    },
    {
      label: 'Navi Kriya Walkthrough',
      url: 'https://www.youtube.com/watch?v=A4BGQCIp9fI',
    },
  ],
}
```
Marker string must be exactly `TODO: native-speaker review` (matched by `content.no-review-markers.test.ts` line 36).

---

### `src/content/learnContent.test.ts` (test, structural + clinical-verbs guard)

**Analog:** itself (`src/content/learnContent.test.ts`, lines 1–181)

**Locale loop pattern** (lines 6–27 and 29–47):
```typescript
for (const locale of LOCALE_OPTIONS) {
  describe(`LEARN_CONTENT[${locale}] structural contract`, () => {
    it(`[${locale}] explainer has exactly three keys in fixed order: hrv, timing, forrest (D-08)`, () => {
      expect(Object.keys(LEARN_CONTENT[locale].explainer)).toEqual(['hrv', 'timing', 'forrest'])
    })
    ...
  })
}
```
Phase 32 updates the explainer-keys test: `['hrv', 'timing', 'forrest']` becomes `['forrest']`. New structural tests use the same `for (const locale of LOCALE_OPTIONS)` loop pattern.

**Clinical-verbs guard pattern** (lines 29–47):
```typescript
for (const locale of LOCALE_OPTIONS) {
  describe(`LEARN_CONTENT[${locale}] clinical-verbs guard`, () => {
    const enClinicalVerbs = /\b(improves|treats|cures|heals|diagnoses)\b/i
    const ptBrClinicalVerbs = /\b(melhora|trata|cura|diagnostica|avalia)\b/i
    const clinicalVerbs = locale === 'en' ? enClinicalVerbs : ptBrClinicalVerbs

    it(`[${locale}] hrv body has no forbidden clinical verbs (D-08 / LEARN-04)`, () => {
      expect(LEARN_CONTENT[locale].explainer.hrv.body).not.toMatch(clinicalVerbs)
    })
    ...
  })
}
```
Extend this pattern to cover `practices.naviKriya.description.section1.body` and `section2.body` — the path changes but the regex and locale-dispatch logic is identical. The existing `hrv`/`timing`/`forrest` guards must be updated to new paths too (`practices.resonant.description.section1.body`, etc.).

**URL identity across locales pattern** (lines 138–176):
```typescript
describe('LEARN_CONTENT PT-BR URL identity (D-12)', () => {
  it('heroVideo URL identical across locales', () => {
    expect(LEARN_CONTENT['pt-BR'].links.heroVideo.url).toBe(LEARN_CONTENT.en.links.heroVideo.url)
  })
  it('keyVideos URLs identical across locales', () => {
    for (let i = 0; i < LEARN_CONTENT.en.links.keyVideos.length; i++) {
      expect(LEARN_CONTENT['pt-BR'].links.keyVideos[i]?.url).toBe(LEARN_CONTENT.en.links.keyVideos[i]?.url)
    }
  })
})
```
Add parallel tests for `practices.resonant.videos` and `practices.naviKriya.videos` URL identity (URLs must match across locales, labels must also match since video titles stay English per D-12).

---

### `src/content/strings.ts` (content-module, add keys + PT-BR finalization)

**Analog:** itself (`src/content/strings.ts`)

**`UiStrings.learn` sub-interface pattern** (lines 133–139):
```typescript
readonly learn: {
  readonly title: string
  readonly close: string
  readonly resourcesHeading: string
  readonly videosHeading: string
  readonly nativeAppsHeading: string
}
```
Phase 32 adds 5 new keys to this interface. The shape convention is `readonly <camelCaseKey>: string`. Template functions use `(arg: type) => string` — not applicable to the new learn keys (all are plain strings).

**New keys to add to `UiStrings.learn`:**
```typescript
readonly learn: {
  readonly title: string                          // existing
  readonly close: string                          // existing
  readonly resourcesHeading: string               // existing
  readonly videosHeading: string                  // existing (resonant — "Selected HRV Breathing Videos")
  readonly nativeAppsHeading: string              // existing
  // NEW — Phase 32:
  readonly naviKriyaVideosHeading: string         // "Selected Navi Kriya Videos"
  readonly naviKriyaDescriptionSection1Title: string  // "What is Navi Kriya"
  readonly naviKriyaDescriptionSection2Title: string  // "How this app paces it"
}
```
Note: section body strings live in `learnContent.ts` (matching `hrv.body`/`timing.body` precedent, not in `strings.ts`). Only heading strings go in `strings.ts`.

**EN values for new keys** (lines 309–315 — existing `learn` block pattern):
```typescript
learn: {
  title: 'About this practice',
  close: 'Close',
  resourcesHeading: 'Forrest Knutson Resources',
  videosHeading: 'Selected HRV Breathing Videos',
  nativeAppsHeading: 'Resonant Breathing app',
  // NEW:
  naviKriyaVideosHeading: 'Selected Navi Kriya Videos',
  naviKriyaDescriptionSection1Title: 'What is Navi Kriya',
  naviKriyaDescriptionSection2Title: 'How this app paces it',
},
```

**PT-BR draft marker pattern** (D-10/D-11 — same marker as learnContent.ts):
```typescript
'pt-BR': {
  ...
  learn: {
    title: 'Sobre esta prática',           // existing — reviewed in Phase 26
    close: 'Fechar',                       // existing
    resourcesHeading: 'Recursos do Forrest Knutson',  // existing
    videosHeading: 'Vídeos selecionados de respiração VFC',  // existing
    nativeAppsHeading: 'App Resonant Breathing',  // existing
    // NEW — Claude draft, operator review:
    naviKriyaVideosHeading: '...', // TODO: native-speaker review
    naviKriyaDescriptionSection1Title: '...', // TODO: native-speaker review
    naviKriyaDescriptionSection2Title: '...', // TODO: native-speaker review
  },
  ...
}
```

**`as const satisfies` export pattern** (line 541 — existing, must compile with new keys):
```typescript
} as const satisfies Readonly<Record<LocaleId, UiStrings>>
```

---

### `src/content/strings.test.ts` (test, exhaustiveness + PT-BR coverage)

**Analog:** itself — read the existing test file for the exact exhaustiveness pattern; extend with new `learn.*` key coverage and explicit non-empty checks for `nkReadout.*` / `nkControls.*` PT-BR.

The established test pattern (from the existing file) checks that all locale entries are non-empty strings and that template functions return non-empty strings. Extend by adding:
1. Non-empty checks for the 3 new `learn.*` heading keys in both locales.
2. Explicit non-empty checks for all `nkReadout.*` and `nkControls.*` PT-BR entries (currently only implicitly enforced by `satisfies`).

---

### `src/components/LearnDialog.tsx` (component, practice-aware refactor)

**Analog:** itself (`src/components/LearnDialog.tsx`, lines 1–228)

**Props interface pattern** (lines 18–24):
```typescript
export interface LearnDialogProps {
  open: boolean
  onClose(this: void): void
  learnContent: LearnContent
  lockedCopy: LockedCopy
  strings: UiStrings['learn']
}
```
Phase 32 adds `activePractice: PracticeId` to this interface. Import `PracticeId` from `../storage/practices`.

**Destructure pattern** (line 81):
```typescript
const { explainer, links } = learnContent
```
Phase 32 replaces / extends this with:
```typescript
const { explainer, links, practices } = learnContent
const practiceContent = practices[activePractice]
```

**Section heading + body pattern** (lines 94–109 — `<div className="grid gap-4">`):
```typescript
<div className="grid gap-4">
  <div>
    <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{explainer.hrv.title}</h3>
    <p className="text-base leading-6 text-[var(--color-breathing-muted)]">{explainer.hrv.body}</p>
  </div>
  <div>
    <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{explainer.timing.title}</h3>
    <p className="text-base leading-6 text-[var(--color-breathing-muted)]">{explainer.timing.body}</p>
  </div>
  ...
</div>
```
Phase 32 replaces the `hrv`/`timing` divs with `practiceContent.description.section1` and `section2`. The CSS classes are carried unchanged.

**Video link render pattern** (lines 157–179):
```typescript
<div>
  <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{strings.videosHeading}</h3>
  <div className="mt-1 grid gap-2">
    <a
      href={links.heroVideo.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
    >
      {links.heroVideo.label}
    </a>
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
  </div>
</div>
```
Phase 32 replaces `links.heroVideo` + `links.keyVideos.map(...)` with a single `practiceContent.videos.map(...)`. The heading switches between `strings.videosHeading` (resonant) and `strings.naviKriyaVideosHeading` (NK) — use `activePractice === 'resonant' ? strings.videosHeading : strings.naviKriyaVideosHeading` or a pre-computed variable. All `<a>` CSS classes are carried unchanged.

**Native-apps conditional pattern** (lines 182–206 — resonant-only, D-02):
```typescript
{/* BEFORE (Phase 31): unconditional */}
<div>
  <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{strings.nativeAppsHeading}</h3>
  <div className="mt-1 grid gap-2">
    <a href={links.appStoreIos.url} ...>{links.appStoreIos.label}</a>
    <a href={links.googlePlayAndroid.url} ...>{links.googlePlayAndroid.label}</a>
  </div>
</div>

{/* AFTER (Phase 32): conditional on activePractice */}
{activePractice === 'resonant' && (
  <div>
    <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{strings.nativeAppsHeading}</h3>
    <div className="mt-1 grid gap-2">
      <a href={links.appStoreIos.url} target="_blank" rel="noopener noreferrer"
        className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
      >{links.appStoreIos.label}</a>
      <a href={links.googlePlayAndroid.url} target="_blank" rel="noopener noreferrer"
        className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
      >{links.googlePlayAndroid.label}</a>
    </div>
  </div>
)}
```

**Dialog open/close imperative pattern** (lines 30–56) — unchanged; carry forward as-is.

**Backdrop click handler pattern** (lines 75–79) — unchanged; carry forward as-is.

**Close button pattern** (lines 217–224) — unchanged CSS classes; carry forward as-is.

---

### `src/components/LearnDialog.test.tsx` (test, extend with practice-aware coverage)

**Analog:** itself (`src/components/LearnDialog.test.tsx`, lines 1–205)

**`renderDialog()` helper pattern** (lines 12–27):
```typescript
function renderDialog(
  props: Partial<{ open: boolean; onClose: () => void; locale: LocaleId }> = {},
) {
  const locale: LocaleId = props.locale ?? 'en'
  const onClose = props.onClose ?? vi.fn()
  const utils = render(
    <LearnDialog
      open={props.open ?? false}
      onClose={onClose}
      learnContent={LEARN_CONTENT[locale]}
      lockedCopy={LOCKED_COPY[locale]}
      strings={UI_STRINGS[locale].learn}
    />,
  )
  return { ...utils, onClose }
}
```
Phase 32 adds `activePractice?: PracticeId` to the `Partial<{...}>` type and passes it to `<LearnDialog>`. Default: `'resonant'` to keep all existing tests passing without change.

**Security attribute test pattern** (lines 110–165):
```typescript
it('every <a> element in the dialog has target="_blank" and rel="noopener noreferrer" (D-07, D-19d)', () => {
  const { container } = renderDialog({ open: true })
  const links = container.querySelectorAll('a')
  links.forEach((link) => {
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
```
Run this same sweep for `activePractice: 'naviKriya'` — every NK video link must carry the same security attributes.

**New tests to add** (following existing describe block naming):
```typescript
describe('LearnDialog — Navi Kriya practice-aware rendering', () => {
  it('renders NK section1 title when activePractice=naviKriya', () => { ... })
  it('renders NK section2 title when activePractice=naviKriya', () => { ... })
  it('renders NK video links when activePractice=naviKriya', () => { ... })
  it('does NOT render native-apps block when activePractice=naviKriya (D-02)', () => {
    renderDialog({ open: true, activePractice: 'naviKriya' })
    expect(screen.queryByText(UI_STRINGS.en.learn.nativeAppsHeading)).not.toBeInTheDocument()
  })
  it('renders native-apps block when activePractice=resonant (D-02 gate)', () => {
    renderDialog({ open: true, activePractice: 'resonant' })
    expect(screen.getByText(UI_STRINGS.en.learn.nativeAppsHeading)).toBeInTheDocument()
  })
})
```

---

### `src/app/App.tsx` (provider/wiring — minimal prop-pass change)

**Analog:** itself — line 1263

**Current wiring** (line 1263):
```tsx
<LearnDialog open={learnDialogOpen} onClose={onLearnClose} learnContent={learnContent} lockedCopy={lockedCopy} strings={uiStrings.learn} />
```

**Phase 32 wiring** — add `activePractice` prop:
```tsx
<LearnDialog open={learnDialogOpen} onClose={onLearnClose} learnContent={learnContent} lockedCopy={lockedCopy} strings={uiStrings.learn} activePractice={activePractice} />
```

`activePractice` is already in scope at line 125: `const [activePractice, setActivePractice] = useState<PracticeId>(initialActivePractice)`. No new state or hooks required.

---

## Shared Patterns

### `as const satisfies` TypeScript Locale Completeness Enforcement

**Source:** `src/content/learnContent.ts` line 165 + `src/content/strings.ts` line 541

**Apply to:** Both `learnContent.ts` and `strings.ts` after adding new fields/keys.

```typescript
} as const satisfies Readonly<Record<LocaleId, LearnContent>>
// and
} as const satisfies Readonly<Record<LocaleId, UiStrings>>
```

TypeScript will error at compile time if either `en` or `pt-BR` is missing any field. Update both locales in the same edit. Run `npm run build` as the compile-time gate.

---

### PT-BR Drift-Guard Marker

**Source:** `src/content/content.no-review-markers.test.ts` lines 36–45

**Apply to:** All new PT-BR strings in `learnContent.ts` and `strings.ts` that have not yet received operator review.

```typescript
const REVIEW_MARKER = 'TODO: native-speaker review'
// ...
if (text.includes(REVIEW_MARKER)) hits.push(file)
```

Marker must be exactly `// TODO: native-speaker review` (case-exact). Both `learnContent.ts` and `strings.ts` are in `src/content/` and are scanned automatically — the test file requires no changes.

---

### External Link Security Attributes

**Source:** `src/components/LearnDialog.tsx` — every `<a>` element (lines 121–205)

**Apply to:** All new video link `<a>` elements in the refactored `LearnDialog.tsx`.

```tsx
<a
  href={video.url}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
>
  {video.label}
</a>
```

`target="_blank"` and `rel="noopener noreferrer"` are required on every external link (D-07). `min-h-[44px]` is the touch-target minimum.

---

### Clinical-Verbs Guard (extend to NK body copy)

**Source:** `src/content/learnContent.test.ts` lines 29–47

**Apply to:** `src/content/learnContent.test.ts` — extend to cover `practices.naviKriya.description.section1.body` and `section2.body`.

```typescript
const enClinicalVerbs = /\b(improves|treats|cures|heals|diagnoses)\b/i
const ptBrClinicalVerbs = /\b(melhora|trata|cura|diagnostica|avalia)\b/i
const clinicalVerbs = locale === 'en' ? enClinicalVerbs : ptBrClinicalVerbs

it(`[${locale}] naviKriya section1 body has no forbidden clinical verbs`, () => {
  expect(LEARN_CONTENT[locale].practices.naviKriya.description.section1.body)
    .not.toMatch(clinicalVerbs)
})
it(`[${locale}] naviKriya section2 body has no forbidden clinical verbs`, () => {
  expect(LEARN_CONTENT[locale].practices.naviKriya.description.section2.body)
    .not.toMatch(clinicalVerbs)
})
```

---

### PT-BR URL Identity Across Locales

**Source:** `src/content/learnContent.test.ts` lines 138–176

**Apply to:** New `practices.*.videos` URL tests.

```typescript
it('naviKriya video URLs identical across locales (D-12)', () => {
  for (let i = 0; i < LEARN_CONTENT.en.practices.naviKriya.videos.length; i++) {
    expect(LEARN_CONTENT['pt-BR'].practices.naviKriya.videos[i]?.url)
      .toBe(LEARN_CONTENT.en.practices.naviKriya.videos[i]?.url)
    // Labels also identical — titles stay in English (D-12)
    expect(LEARN_CONTENT['pt-BR'].practices.naviKriya.videos[i]?.label)
      .toBe(LEARN_CONTENT.en.practices.naviKriya.videos[i]?.label)
  }
})
```

---

## No Analog Found

None — all modified files have direct self-analogs (they are existing files being extended). Every pattern needed is present in the current codebase.

---

## Metadata

**Analog search scope:** `src/content/`, `src/components/`, `src/app/`
**Files scanned:** 7 source files read directly
**Pattern extraction date:** 2026-05-17
