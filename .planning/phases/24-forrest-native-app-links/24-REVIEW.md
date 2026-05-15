---
phase: 24-forrest-native-app-links
reviewed: 2026-05-15T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/content/learnContent.ts
  - src/content/strings.ts
  - src/components/LearnDialog.tsx
  - src/components/LearnDialog.test.tsx
  - src/content/learnContent.test.ts
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-05-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 24 adds two outbound store links (iOS App Store + Google Play) for the native
"Resonant Breathing" app to `LearnDialog`. The change is small, well-scoped, and faithful
to the phase decisions: `target="_blank" rel="noopener noreferrer"` is present on both new
`<a>` elements (D-04), the `LearnContent` interface and both locales were updated keeping
`LEARN_CONTENT` a complete `Readonly<Record<LocaleId, LearnContent>>` (D-10), `lockedCopy.ts`
is untouched (D-09), and PT-BR labels carry the `// TODO: native-speaker review` marker (D-06).
No security vulnerabilities and no correctness bugs were found.

Two WARNING-level findings concern test coverage gaps and one duplicated literal. Two INFO
items note minor maintainability points. None block shipping, but the test gaps weaken the
regression guard for a section whose entire reason for existing is claim-safe attribution.

## Warnings

### WR-01: No structural / contract test for the two new `appStoreIos` and `googlePlayAndroid` keys in `learnContent.test.ts`

**File:** `src/content/learnContent.test.ts:105-118` (and absent PT-BR label coverage)
**Issue:** `learnContent.test.ts` adds `https://` prefix and exact-URL assertions for the
two new keys, but there is **no test asserting the `label` fields are present and non-empty**,
and no test asserting label content. Every other claim-safe attribute in this phase rests on
the labels (D-05 / D-08: "heading and labels name only the app, not Forrest"). The structural
contract block (lines 6-27) loops over `explainer.*` only and never touches `links.*`, so a
future edit that blanks `appStoreIos.label` or reintroduces a Forrest-authorship claim into a
label would pass the entire `learnContent.test.ts` suite. The clinical-verbs guard
(lines 30-47) likewise inspects only `explainer.*.body`, never link labels — so the new
labels have zero claim-safety regression coverage at the content-data layer.
**Fix:** Add label assertions in the `LEARN_CONTENT link contract` block, e.g.:
```ts
it('appStoreIos label is non-empty and names the app, not Forrest', () => {
  expect(LEARN_CONTENT.en.links.appStoreIos.label.length).toBeGreaterThan(0)
  expect(LEARN_CONTENT.en.links.appStoreIos.label).not.toMatch(/Forrest/i)
})
it('googlePlayAndroid label is non-empty and names the app, not Forrest', () => {
  expect(LEARN_CONTENT.en.links.googlePlayAndroid.label.length).toBeGreaterThan(0)
  expect(LEARN_CONTENT.en.links.googlePlayAndroid.label).not.toMatch(/Forrest/i)
})
```
Also extend the `no URL ... matches dangerous schemes` test (already done — lines 121-135)
and add the same `Forrest`-absent guard for the PT-BR labels.

### WR-02: Store URLs duplicated as string literals across `learnContent.ts` and `learnContent.test.ts`

**File:** `src/content/learnContent.ts:92,96,167,171`; `src/content/learnContent.test.ts:114,118`
**Issue:** The exact iOS and Android store URLs appear as raw string literals in four places
in `learnContent.ts` (EN + PT-BR x 2 keys) and again in two `.toBe()` assertions in the test.
The `PT-BR URL identity` block (test lines 169-174) catches EN/PT-BR drift, but a typo
introduced into *both* locales simultaneously (e.g. a copy-paste edit) would still pass the
identity tests, and the exact-URL test only pins `en`. D-07 marks these URLs as
locale-invariant and verified — a single source of truth would make that invariant
structural rather than test-enforced.
**Fix:** Optional but recommended — hoist the two URLs to named constants and reference them
in both locale entries:
```ts
const APP_STORE_IOS_URL = 'https://apps.apple.com/us/app/resonant-breathing/id1568058013'
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.johngoodstadt.knutson.meditation'
```
This eliminates the EN/PT-BR divergence class entirely and the `PT-BR URL identity` tests
become tautological (safe to keep or drop).

## Info

### IN-01: New native-apps section is not asserted to render *after* videos and *before* the affiliation line

**File:** `src/components/LearnDialog.test.tsx:177-205`
**Issue:** D-01 specifies the new section renders after "Selected HRV Breathing Videos" and
before the `affiliationLine` micro-line. The new tests verify the heading and links exist and
carry correct attributes, but never assert DOM order. A future refactor could move the section
without any test failing. Order is a stated decision (D-01), so an order assertion would lock it.
**Fix:** Add an order check, e.g. compare `compareDocumentPosition` of the
`nativeAppsHeading` element against the videos heading and the affiliation `<p>`, or assert the
sequence of `h3` text content.

### IN-02: `every <a>` security test comment understates the new link count

**File:** `src/components/LearnDialog.test.tsx:146-148`
**Issue:** The comment on the `every <a> element` test still reads
"Expect at least 4 links (youtubeChannel + website + book + patreon + heroVideo + keyVideos)"
— it omits the two new store links and the running count is now 9, not "at least 4". The
assertion `toBeGreaterThanOrEqual(4)` is still technically correct but the stale comment
misleads readers about what the test covers. The `forEach` does transitively cover the two
new links' security attributes, which is good.
**Fix:** Update the comment to enumerate `appStoreIos` and `googlePlayAndroid` and raise the
documented expectation to 9 (or tighten the assertion to `toBe(9)` to catch accidental
link removal/addition).

---

_Reviewed: 2026-05-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
