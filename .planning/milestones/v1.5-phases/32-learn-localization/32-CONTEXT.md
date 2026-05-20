# Phase 32: Learn & Localization - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 32 makes the Learn surface practice-aware and brings every new v1.5
string to native-quality PT-BR.

The Learn dialog stops being resonant-only: opening Learn shows the **active
practice's** description and its relevant Forrest videos (LEARN-02), while the
shared "Who is Forrest" and "Forrest Resources" sections stay visible for both
practices (LEARN-03). `src/content/learnContent.ts` is extended with a
per-practice partition over the shared base — content architecture, not a
feasibility risk.

Localization (I18N-08) covers all new v1.5 copy: the Phase 30/31 strings
(practice switcher, Navi Kriya session readout, controls, stats) plus the
net-new Navi Kriya Learn copy. The existing pt-BR entries in `strings.ts` are
treated as drafts and reviewed to native quality.

Covers requirements LEARN-02, LEARN-03, I18N-08. This is the final phase of the
v1.5 Navi Kriya Practice milestone.

</domain>

<decisions>
## Implementation Decisions

### Learn partition & layout
- **D-01:** When a practice is active, Learn renders **practice-first** order:
  active practice description → its videos → then the shared "Who is Forrest"
  → "Forrest Resources". The practice being practiced leads; broader Forrest
  context follows.
- **D-02:** The native-apps block ("Resonant Breathing app" — Forrest's iOS/
  Android apps) is **resonant-only**. Navi Kriya has no native app, so its Learn
  view omits the block entirely. The block is per-practice, not shared.
- **D-03:** The Navi Kriya practice description **mirrors resonant's
  two-section explainer shape** — two parallel sections (e.g. "What is Navi
  Kriya" + "How this app paces it"), symmetric with resonant's
  `hrv` + `timing` explainers.
- **D-04:** The Learn dialog title stays **generic** — `learn.title` "About
  this practice" is unchanged. The practice-description section heading already
  names the practice (see D-08); no practice name in the title.

### Navi Kriya Learn copy
- **D-05:** Claude **drafts** the Navi Kriya description copy (both sections,
  claim-safe and calm, mirroring the resonant explainer tone); the operator
  reviews and **locks** it during planning/execution — same flow as the
  original HRV/timing copy.
- **D-06:** The Navi Kriya video block carries **two links, in this order**:
  1. "The Guardian In Meditation" — `https://www.youtube.com/watch?v=M3t7gY_yak8`
  2. "Navi Kriya Walkthrough" — `https://www.youtube.com/watch?v=A4BGQCIp9fI`
  "Fewer is fine" — no padding to match resonant's count. The operator confirmed
  both URLs (the first was re-verified after a paste-truncation flag — final
  ID ends in `...yak8`).
- **D-08:** No extra practice label in the dialog — the **practice-description
  section heading carries the practice identity** ("What is Navi Kriya" vs
  "What is HRV / resonance breathing"). That is the sole signal of which
  practice's content is shown.

### Practice-aware Learn behavior
- **D-07:** Learn **auto-tracks the active practice** — it shows whichever
  practice the switcher is currently on (Navi content when Navi is active,
  resonant content when resonant is active). One Learn anchor, no in-dialog
  practice toggle. Consistent with the home screen (switcher, controls, stats)
  all tracking the active practice.

### PT-BR scope & quality gate
- **D-09:** **All v1.5 pt-BR is in scope.** The pt-BR entries already present in
  `strings.ts` for Phase 30/31 keys (practice, nkReadout, nkControls, …) are
  treated as **executor drafts** — Phase 32 reviews and finalizes every v1.5
  pt-BR string to native quality, plus translates the net-new Navi Kriya Learn
  copy.
- **D-10:** pt-BR is produced **Claude-drafts / operator-reviews** — Claude
  drafts the pt-BR, the operator (native speaker) reviews and corrects during
  execution. Same flow as Phase 26's I18N-07 native-speaker review.
- **D-11:** The Phase 26 drift-guard workflow is **extended to the new Navi
  Kriya Learn copy** — new pt-BR copy in `learnContent.ts` carries
  `// TODO: native-speaker review` markers during drafting; markers are removed
  only after the operator's review; the existing fs-scan test
  `src/content/content.no-review-markers.test.ts` keeps the done-state locked.
- **D-12:** Navi Kriya **video titles stay in English** in both catalogs
  ("The Guardian In Meditation", "Navi Kriya Walkthrough") — consistent with the
  existing resonant videos, whose source content is English.

### Claude's Discretion
- The exact `learnContent.ts` data shape for the per-practice partition (a
  `practices` map keyed by practice id over a shared base, vs. a flat extension)
  — planner's call; the spike note is "per-practice partition over the shared
  base" (`multi-practice-architecture.md` §4).
- How the Navi Kriya description's two sections are titled — D-03 fixes the
  two-section shape; exact headings follow once the copy is drafted (D-05).
- Whether the two Navi Kriya videos use the existing `heroVideo` +
  `keyVideos[]` shape or a flatter two-link list — D-06 fixes order and count;
  the data shape is a planner detail.
- The structural changes to `LearnDialog.tsx` to render practice-scoped vs
  shared sections (the dialog currently renders a fixed resonant layout).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Multi-practice & Learn blueprint (spike findings — authoritative)
- `.claude/skills/spike-findings-hrv/references/multi-practice-architecture.md`
  §4 "Learn screen" — the per-practice partition over a shared base; shared
  (Who is Forrest, Forrest Resources) vs per-practice (videos, description).
- `.claude/skills/spike-findings-hrv/SKILL.md` — requirements index + the
  non-negotiable design decisions for the second-practice work.

### Requirements & prior phases
- `.planning/REQUIREMENTS.md` — LEARN-02, LEARN-03, I18N-08 (this phase) and the
  v1.5 Out-of-Scope table.
- `.planning/phases/30-multi-practice-architecture-switcher/30-CONTEXT.md` —
  Phase 30 decisions: practice concept, "Navi Kriya" stays untranslated as a
  Sanskrit proper noun (D-05), strings added EN-only deferred to Phase 32.
- `.planning/phases/31-navi-kriya-engine-session/31-CONTEXT.md` — Phase 31
  decisions: all new NK session/controls/stats copy shipped EN-only, PT-BR
  deferred here.

### Localization precedent
- Phase 26 (I18N-07) — established the operator-as-native-reviewer flow, the
  `// TODO: native-speaker review` marker, and the
  `content.no-review-markers.test.ts` fs-scan drift guard. See PROJECT.md
  "Key Decisions" (Phase 26 row) and `.planning/milestones/v1.3-REQUIREMENTS.md`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/content/learnContent.ts`: `Readonly<Record<LocaleId, LearnContent>>` —
  today's resonant-only structure: `explainer` { `hrv`, `timing`, `forrest` } +
  `links` { `youtubeChannel`, `website`, `book`, `patreon`, `heroVideo`,
  `keyVideos[]`, `appStoreIos`, `googlePlayAndroid` }. Phase 32 extends this
  into a per-practice partition. The locked Forrest phrase is NOT here — it
  lives in `lockedCopy.ts`.
- `src/components/LearnDialog.tsx`: renders a fixed resonant layout — three
  explainer sections (hrv → timing → forrest), Resources block, Videos block,
  native-apps block, affiliation micro-line. Phase 32 makes it practice-aware
  (practice-first order per D-01; native-apps resonant-only per D-02).
- `src/content/strings.ts`: `Record<LocaleId, UiStrings>` — already holds
  `learn` (title/close/headings), `practice`, `nkReadout`, `nkControls` keys
  with **pt-BR drafts present** for the v1.5 keys (D-09 treats them as drafts).
- `src/content/content.no-review-markers.test.ts`: fs-scan drift guard from
  Phase 26 — extended to cover the new Navi Kriya Learn copy (D-11).
- `src/content/lockedCopy.ts`: locked claim-safe Forrest phrase + affiliation
  line — shared, unchanged by this phase.
- `src/components/LearnAnchor.tsx`: opens the Learn dialog; D-18 disable-not-hide
  during a running session. One anchor, reused as-is (D-07 auto-track).
- `src/hooks/useLocale.ts` (App.tsx wiring): resolves `learnContent` +
  `lockedCopy` + `strings` by active locale and passes them to `LearnDialog`.

### Established Patterns
- Section-keyed content shape in `learnContent.ts` — i18n-stable identifier keys
  (`hrv`, `timing`, `forrest`); top-level shape is `Record<LocaleId, …>`.
- `Record<LocaleId, UiStrings>` type-completeness — TypeScript enforces every
  locale carries every key; a frozen-EN `LOCKED_COPY` byte-equality guard
  protects locked claim-safe copy.
- Operator-as-native-pt-BR-reviewer with a `// TODO: native-speaker review`
  marker + fs-scan test drift guard (Phase 26 I18N-07).
- "Navi Kriya" is a Sanskrit proper noun — stays untranslated across locales
  (Phase 30 D-05).

### Integration Points
- `src/content/learnContent.ts` — the per-practice partition lands here.
- `src/components/LearnDialog.tsx` — practice-aware rendering (which sections
  show, the practice-first order).
- `src/app/App.tsx` — `LearnDialog` receives the active-practice-scoped Learn
  content; the auto-track wiring (D-07) reads `activePractice`.
- `src/content/strings.ts` — pt-BR review of all v1.5 keys + new Learn copy.
- `src/content/content.no-review-markers.test.ts` — extended scan scope (D-11).

</code_context>

<specifics>
## Specific Ideas

- The Learn dialog mirrors the rest of the app's practice-awareness: the
  switcher, inline controls, heading, and stats footer all track the active
  practice — Learn now does too (D-07).
- The Navi Kriya video links, in operator-confirmed order:
  1. "The Guardian In Meditation" — `https://www.youtube.com/watch?v=M3t7gY_yak8`
  2. "Navi Kriya Walkthrough" — `https://www.youtube.com/watch?v=A4BGQCIp9fI`
  The first ID was re-verified after a paste-truncation flag; planner/executor
  should still sanity-check both resolve before they ship.
- The Navi Kriya description copy is Claude-drafted then operator-locked —
  claim-safe, calm, non-medical tone, mirroring the resonant explainer voice.

</specifics>

<deferred>
## Deferred Ideas

- **A third / fourth practice** — Future requirement PRACTICE-F1; the Learn
  per-practice partition and the top switcher are sized for ~3–4 practices and
  must be revisited beyond that.
- **v1.x carry-forward tech debt** — remains deferred (see STATE.md
  `## Deferred Items`): iOS Safari audio recovery, Firefox orb flicker, Android
  wake-lock UAT, 28 Info-severity review findings, WR-01 `IosInstallSteps`
  `::marker` coupling, etc.
- **Review all app config values and defaults** (HRV + Navi — every default/
  min/max/step) — pending todo
  `.planning/todos/pending/2026-05-17-review-all-app-config-values-and-defaults.md`;
  a milestone-close review item, not Learn/localization scope.

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 32-learn-localization*
*Context gathered: 2026-05-17*
