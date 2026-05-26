---
phase: 48-appearance-page-i18n
reviewed: 2026-05-26T00:00:00Z
depth: deep
files_reviewed: 3
files_reviewed_list:
  - src/content/learnContent.ts
  - src/content/lockedCopy.ts
  - src/content/strings.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 48: Code Review Report — Content / i18n slice

**Reviewed:** 2026-05-26T00:00:00Z
**Depth:** deep
**Files Reviewed:** 3 (`src/content/learnContent.ts`, `src/content/lockedCopy.ts`, `src/content/strings.ts`)
**Status:** issues_found

## Summary

Adversarial review of the three content/i18n source modules at deep depth, with cross-module tracing of consumers in `src/app/**`, `src/components/**`, and `src/hooks/**`.

**Structural / type safety:** All three files use `satisfies Readonly<Record<LocaleId, ...>>`, so EN/PT-BR shape parity is enforced statically. Adding a new `LocaleId` value will surface compile errors at every catalog. The `appearance.*` namespace introduced in Phase 48 is shape-symmetric across locales, and all of its keys are reachable from the new `AppearancePage` / `AppSettingsPage` consumers — no orphaned new keys.

**Locked-copy invariants:** The byte-equality lock on `LOCKED_COPY.en` is in place per the Phase 19 D-02 contract and matches the file-level comment. The substring-absence guard in `lockedCopy.test.ts` correctly iterates over `LOCALE_OPTIONS` and reads `LOCKED_COPY[locale].inspiredByForrest` dynamically. However, **the PT-BR side of the lock is enforced only by a non-empty assertion** — the `// LOCKED: back-translation = ...` comments above each PT-BR entry are documentation, not test invariants. PT-BR locked values can drift silently. See WR-03.

**Cross-module duplication:** Two Navi Kriya section titles ("What is Navi Kriya" / "How this app paces it" — and their PT-BR mirrors) are duplicated across `strings.ts` (`learn.naviKriyaDescriptionSection*Title`) and `learnContent.ts` (`practices.naviKriya.description.sectionN.title`). Only the `learnContent` copies are actually rendered (`LearnPanel.tsx:62-69`); the `strings.ts` copies are dead. See WR-01 + WR-02.

**Hardcoded copy bypass:** I traced every callsite of `UI_STRINGS`, `LEARN_CONTENT`, and `LOCKED_COPY` through `src/app/**`, `src/components/**`, and `src/hooks/**`. The new `AppearancePage` + `AppSettingsPage` consumers correctly source every visible string through `useUiStrings().appearance.*`. No surface hardcodes an EN string in a Phase-48-touched component.

**Translation accuracy spot-check:** One semantic drop in PT-BR (`learnContent.ts:181` drops the "optional" qualifier from the audio-cue description). See WR-04. The matching Navi Kriya passage (line 215) preserves "opcional" — so this is asymmetric, not policy.

**Out of scope (already covered by the earlier `48-REVIEW.md` pass):** the `appearance.*` namespace structure, the `appSettings.sections.appearance → theme` rename, the marker-guard tightening (WR-03 in that report), and the `'Sinal do anel'` translation quality (IN-05 in that report, deferred to I18N-04). I do not re-flag any of those.

## Warnings

### WR-01: Dead i18n keys — `learn.naviKriyaDescriptionSection1Title` + `learn.naviKriyaDescriptionSection2Title` have no UI consumer

**File:** `src/content/strings.ts:206-207` (interface), `:384-385` (EN values), `:595-596` (PT-BR values)

**Issue:** Both keys are declared in the `UiStrings.learn` namespace, byte-locked in `strings.test.ts:240-249` for EN, and asserted to contain `'Navi Kriya'` for PT-BR. But a full-tree `grep` (`src/app/**`, `src/components/**`, `src/hooks/**`) finds zero non-test references to either key. The actual UI rendering uses `practiceContent.description.section1.title` (`src/components/LearnPanel.tsx:62`) and `practiceContent.description.section2.title` (`:67`) — both pulled from `LEARN_CONTENT.{locale}.practices.naviKriya.description.sectionN.title` (`learnContent.ts:117,121,210,214`), which is a completely separate source.

The strings.ts copies are paid for in three places (type slot, EN literal, PT-BR literal) plus four test assertions that pin values nobody renders. The PT-BR copies sit at lines 595-596 inside the `learn:` block immediately preceding the actual consumers' fall-through to `learnContent.ts` — easy to mistake for the canonical source.

**Fix:** Delete the dead keys and their tests.

```ts
// src/content/strings.ts — UiStrings interface (lines 206-207)
- readonly naviKriyaDescriptionSection1Title: string
- readonly naviKriyaDescriptionSection2Title: string

// src/content/strings.ts — EN catalog (lines 384-385)
- naviKriyaDescriptionSection1Title: 'What is Navi Kriya',
- naviKriyaDescriptionSection2Title: 'How this app paces it',

// src/content/strings.ts — PT-BR catalog (lines 595-596)
- naviKriyaDescriptionSection1Title: 'O que é Navi Kriya',
- naviKriyaDescriptionSection2Title: 'Como este app guia a prática',
```

And the matching tests in `strings.test.ts:219-251` (the entire `describe('Phase 32 new learn.* heading keys', …)` block already covers `naviKriyaVideosHeading` which IS used; remove the two `naviKriyaDescriptionSection*Title` keys from the `newLearnKeys` array and delete the three explicit assertions).

If the keys are kept intentionally as a "future canonical" source, add a `// CANONICAL-FOR: …` comment AND consume them from `LearnPanel.tsx` (replace `practiceContent.description.section1.title` with `strings.naviKriyaDescriptionSection1Title`). Otherwise they are pure dead weight that future translators will localize for no UI benefit.

### WR-02: Same Navi Kriya section titles live in two source modules with no equality guard

**File:** `src/content/strings.ts:384-385,595-596` and `src/content/learnContent.ts:117,121,210,214`

**Issue:** Independent of WR-01 (and surviving even if WR-01 is fixed by removing the dead keys), the same four user-visible strings — "What is Navi Kriya", "How this app paces it", "O que é Navi Kriya", "Como este app guia a prática" — live as duplicate literals across `strings.ts` and `learnContent.ts`. Neither test file enforces equality between the two sources:

- `strings.test.ts:241,245` byte-locks the `strings.ts` values via `.toBe('What is Navi Kriya')` etc.
- `learnContent.test.ts:25-28` only checks `length > 0` for `learnContent.practices.naviKriya.description.section{1,2}.{title,body}`.

So if a future Phase changes `learnContent` titles (e.g. "About Navi Kriya"), the rendered UI updates, the `strings.ts` literal does not, and only the dead `strings.ts` values remain pinned — silently divergent. The Phase 32 restructure comment in `learnContent.ts:2-5` makes the migration intent explicit ("restructured into per-practice partition"); the leftover `strings.learn.naviKriya*` keys are the pre-restructure artefact.

**Fix:** Resolve by deciding which module is canonical, then enforcing it:

Option A (recommended, aligns with WR-01): delete the `strings.ts` duplicates; the `learnContent.ts` titles are the sole source.

Option B: keep `strings.ts` as canonical and add a parity test:

```ts
// src/content/learnContent.test.ts — new test
import { UI_STRINGS } from './strings'

it('naviKriya section titles match between LEARN_CONTENT and UI_STRINGS.learn', () => {
  for (const locale of LOCALE_OPTIONS) {
    expect(LEARN_CONTENT[locale].practices.naviKriya.description.section1.title).toBe(
      UI_STRINGS[locale].learn.naviKriyaDescriptionSection1Title,
    )
    expect(LEARN_CONTENT[locale].practices.naviKriya.description.section2.title).toBe(
      UI_STRINGS[locale].learn.naviKriyaDescriptionSection2Title,
    )
  }
})
```

Choose one source of truth — duplicate-without-link is the worst of both options.

### WR-03: PT-BR `LOCKED_COPY` values are not byte-locked — D-02 invariant covers only EN

**File:** `src/content/lockedCopy.ts:25-32`, `src/content/lockedCopy.test.ts:7-19`

**Issue:** The file-header doc comment (`lockedCopy.ts:3-4`) claims "D-02: Frozen-EN snapshot test in lockedCopy.test.ts asserts byte-equality of all 3 EN values via .toBe() — never .toMatchInlineSnapshot() (auto-update defeats the lock)." That promise is delivered for EN (`lockedCopy.test.ts:8-19` — three `.toBe()` assertions with byte-exact literals). For PT-BR, the only assertions are:

```ts
expect(LOCKED_COPY['pt-BR'].inspiredByForrest.length).toBeGreaterThan(0)
expect(LOCKED_COPY['pt-BR'].medicalAdviceLine.length).toBeGreaterThan(0)
expect(LOCKED_COPY['pt-BR'].affiliationLine.length).toBeGreaterThan(0)
expect(LOCKED_COPY['pt-BR'].medicalAdviceLine.includes('—')).toBe(true)
```

A future edit could change `LOCKED_COPY['pt-BR'].affiliationLine` from "Projeto independente. Não afiliado ao Forrest Knutson." to e.g. "Projeto criado em parceria com Forrest Knutson." (the literal opposite claim) and the suite would still pass. The `// LOCKED: back-translation = ...` comments above each entry (`:26, :28, :30`) are pure documentation — nothing references them programmatically.

The point of D-03 ("Lock scope = 3 D-12 minimum entries … Matches Phase 6 D-12 literally. Smallest blast radius.") is to keep claim-safe copy from drifting. The lock is half-effective when one of two locales can drift silently. For a Brazilian-Portuguese user, the affiliation disclaimer and the medical-advice disclaimer are exactly as load-bearing as for an EN user.

**Fix:** Add a byte-equality snapshot for PT-BR matching the EN block. The PT-BR values themselves are the *current* baseline — locking them is what the doc comment already implies:

```ts
// src/content/lockedCopy.test.ts — extend the EN block
describe('LOCKED_COPY frozen-PT-BR snapshot (D-02 parity)', () => {
  it('inspiredByForrest matches PT-BR baseline byte-exact', () => {
    expect(LOCKED_COPY['pt-BR'].inspiredByForrest).toBe('inspirado nos ensinamentos do Forrest')
  })
  it('medicalAdviceLine matches PT-BR baseline byte-exact (em-dash U+2014)', () => {
    expect(LOCKED_COPY['pt-BR'].medicalAdviceLine).toBe('Prática de respiração guiada — não é conselho médico.')
  })
  it('affiliationLine matches PT-BR baseline byte-exact', () => {
    expect(LOCKED_COPY['pt-BR'].affiliationLine).toBe('Projeto independente. Não afiliado ao Forrest Knutson.')
  })
})
```

If keeping PT-BR free-floating is intentional (e.g. native-speaker review still pending for these three lines), update the file-header doc to say so explicitly and remove the "all 3 EN values" wording, which currently implies the same protection extends across the catalog. Right now the comment and the test contract disagree.

### WR-04: PT-BR translation drops the "optional" qualifier on resonant audio-cue copy — asymmetric with the matching Navi Kriya passage

**File:** `src/content/learnContent.ts:181` (PT-BR resonant section2 body) vs `:92` (EN baseline)

**Issue:** The EN baseline says:

> "The on-screen orb and the optional bowl-like tones simply mark where you are in each breath."

The PT-BR translation drops "optional":

> "O orbe na tela e os tons suaves de tigela marcam apenas onde você está em cada respiração."

"tons suaves de tigela" = "soft bowl-like tones" — the "optional" qualifier (i.e. the user can mute them via the mute toggle) is lost. The Navi Kriya equivalent (`learnContent.ts:215`) handles the same construction correctly: "emite um sinal sonoro **opcional** a cada OM" preserves "optional/opcional". So this is not a translator-policy decision; it is an asymmetric drop in one of two parallel passages.

This matters for accuracy: the audio cue is *opt-in/opt-out*, not always-on. A user reading the PT-BR copy and not noticing the mute toggle could reasonably believe the bowl tones are mandatory.

This passage already passed Phase 26 native-speaker review per CONTEXT.md history, so the marker-guard mechanism won't surface it. It needs an explicit fix.

**Fix:**

```ts
// src/content/learnContent.ts:181 — PT-BR resonant.section2.body
- body: 'Este app guia uma inspiração e expiração contínuas, sem pausa entre elas. Escolha uma frequência lenta de menos de sete respirações por minuto; nos padrões assimétricos, a expiração é sempre a parte mais longa. O orbe na tela e os tons suaves de tigela marcam apenas onde você está em cada respiração.',
+ body: 'Este app guia uma inspiração e expiração contínuas, sem pausa entre elas. Escolha uma frequência lenta de menos de sete respirações por minuto; nos padrões assimétricos, a expiração é sempre a parte mais longa. O orbe na tela e os tons opcionais de tigela marcam apenas onde você está em cada respiração.',
```

(Replace "tons suaves" with "tons opcionais" — preserves the bowl-like sound semantics implicit in the noun, and re-introduces the optional qualifier.) Alternatively, "os sons de tigela opcionais" is equally idiomatic. Either matches the symmetry with the Navi Kriya passage.

## Info

### IN-01: Inconsistent `LocaleId` import path across the three sibling files

**File:** `src/content/strings.ts:20`, `src/content/learnContent.ts:10`, `src/content/lockedCopy.ts:11`

**Issue:** Three co-located content modules import the same `LocaleId` type via two different paths:

```ts
// strings.ts:20
import type { LocaleId } from '../domain'        // barrel re-export

// learnContent.ts:10 + lockedCopy.ts:11
import type { LocaleId } from '../domain/settings'  // deep import
```

Both work today because `src/domain/index.ts:11` re-exports `./settings`. But the inconsistency makes refactors harder: if someone moves `LocaleId` from `settings.ts` to another file inside `domain/`, only the barrel-import file picks up the move; the two deep-import files break. Picking one form would also make any future codemod (e.g. ESLint `import/no-deep-internal`) trivially mechanical.

**Fix:** Align all three to the barrel form, which is what the `src/domain/index.ts:1-3` header explicitly recommends ("Presentation consumers (components/, app/) import via `from '../domain'` rather than deep-importing individual files"):

```ts
// src/content/learnContent.ts:10
- import type { LocaleId } from '../domain/settings'
+ import type { LocaleId } from '../domain'

// src/content/lockedCopy.ts:11
- import type { LocaleId } from '../domain/settings'
+ import type { LocaleId } from '../domain'
```

Strictly, `src/content/` is not "presentation" (it's content layer), but the barrel-vs-deep distinction is a project-wide convention; the three sibling files should match each other regardless.

### IN-02: `learnContent.test.ts:233` hardcodes the PT-BR locked phrase rather than reading `LOCKED_COPY`

**File:** `src/content/learnContent.test.ts:232-234` (test-only; affects the source-file invariant)

**Issue:** The PT-BR substring-absence guard in `learnContent.test.ts` hardcodes the locked phrase literal:

```ts
it('PT-BR forrest body does NOT contain its EN-baseline-equivalent locked phrase', () => {
  expect(LEARN_CONTENT['pt-BR'].explainer.forrest.body.includes('inspirado nos ensinamentos do Forrest')).toBe(false)
})
```

`lockedCopy.test.ts:34-40` already does the same check dynamically (reads `LOCKED_COPY[locale].inspiredByForrest`). The hardcoded version goes stale the moment `LOCKED_COPY['pt-BR'].inspiredByForrest` is changed (e.g. to "inspirado nos ensinamentos de Forrest"). The dynamic test would catch it; the hardcoded one would silently pass on the old wording.

Per `[[feedback_no_design_locking]]`: tests should not anchor downstream-modifiable values. The PT-BR locked phrase IS downstream-modifiable (it lives in `lockedCopy.ts` and is the very value the `LOCKED_COPY[locale]` lookup returns).

I'm flagging this in *Info* because the technical scope of this review is `src/content/learnContent.ts`, not its test, but the brittle guard exists *because* of the learnContent.ts invariant. The fix lives in the test file; the cleanest move is to delete the redundant `learnContent.test.ts:232-234` block entirely (lockedCopy.test.ts already covers all locales).

**Fix:** Delete `learnContent.test.ts:232-234`. The dynamic `lockedCopy.test.ts:34-40` already enforces the invariant across all locales.

### IN-03: Affiliate tracking parameter on Amazon book URL conflicts with the `affiliationLine` independence claim

**File:** `src/content/learnContent.ts:68` (EN) and `:157` (PT-BR)

**Issue:** Both locales link to:

```
https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US
```

The `linkId=1a5a2958fc89bdb6769b54d0bc9a4d17` parameter is Amazon's "Site Stripe" affiliate identifier. The companion claim-safe copy in `lockedCopy.ts:23,31`:

> "Independent project. Not affiliated with Forrest Knutson." / "Projeto independente. Não afiliado ao Forrest Knutson."

asserts independence. A click-tracker on the book link is a soft inconsistency: no `tag=XXX-20` commission tag is present (so this is tracking-only, not monetization), but it still trips a privacy-conscious reading of the same page.

Three orthogonal considerations:

1. **Test coverage**: `learnContent.test.ts:137` byte-locks the URL including the `linkId`, so the team has explicitly chosen to keep this tracker. Not an accidental leftover.
2. **Affiliation contract**: the `affiliationLine` lock (LOCKED_COPY D-02) is about *commission/sponsorship*, not click-tracking. A strict reading allows tracker-without-commission.
3. **PT-BR `language=en_US`**: the same URL is used verbatim in the PT-BR catalog, which carries `language=en_US`. This serves a Brazilian Portuguese user to an EN-locale Amazon page. May be intentional (book is EN-only) but worth verifying — the `book` field is the only locale-invariant URL that contains a hardcoded `language=` parameter.

**Fix:** No mechanical fix recommended without operator input. Three options:

A. Strip the `linkId` parameter from both locales' URLs (`?sr=8-1` alone is the canonical product URL). Update `learnContent.test.ts:137` accordingly.

B. Keep the `linkId`, document the choice in a `// AFFILIATE-DISCLOSURE:` comment above line 68 and 157, and ensure the affiliation policy in `lockedCopy.ts` doesn't conflict (it currently doesn't explicitly mention Amazon).

C. Strip `language=en_US` from the PT-BR URL only — minor independence move, no Amazon-policy implications.

Flagging for visibility, not blocking.

---

_Reviewed: 2026-05-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Scope: content/i18n slice — `src/content/learnContent.ts`, `src/content/lockedCopy.ts`, `src/content/strings.ts`_
