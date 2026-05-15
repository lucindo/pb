# Phase 24: Forrest Native-App Links - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Add two outbound store links — iOS App Store + Google Play — for the native "Resonant Breathing" app inside the existing `LearnDialog`. Labels localized EN + PT-BR. No new capability; this clarifies HOW the LEARN-01 links are placed, rendered, worded, and attributed.

</domain>

<decisions>
## Implementation Decisions

### Link Placement
- **D-01:** New dedicated link sub-section in `LearnDialog`, rendered after the existing "Selected HRV Breathing Videos" block and before the `affiliationLine` micro-line. It is a 3rd link section parallel to Resources + Videos — its own heading, not appended into "Forrest Knutson Resources".
- **D-02:** New heading key added to `UiStrings['learn']` (`src/content/strings.ts`), EN + PT-BR. PT-BR value carries `// TODO: native-speaker review`. Heading copy is neutral — names the app, not Forrest (see D-08).

### Link Presentation
- **D-03:** Plain styled text links — same accent-color text-link treatment as the existing 4 resource links (`inline-flex min-h-[44px] ... text-[var(--color-breathing-accent)] ...`). No image assets, no store-badge files.
- **D-04:** Each `<a>` carries `target="_blank" rel="noopener noreferrer"` (consistent with every other LearnDialog external link / T-06-07 mitigation).

### Label Wording
- **D-05:** App-named labels. EN: `Resonant Breathing on the App Store` / `Resonant Breathing on Google Play`. App name "Resonant Breathing" verified verbatim against both store pages.
- **D-06:** PT-BR labels are machine-translated and each carry `// TODO: native-speaker review` (Phase 26 sweep will resolve them).

### Store URLs
- **D-07:** Exact URLs provided and verified (both pages resolve, app name confirmed):
  - iOS: `https://apps.apple.com/us/app/resonant-breathing/id1568058013`
  - Android: `https://play.google.com/store/apps/details?id=com.johngoodstadt.knutson.meditation`
  - URLs are locale-invariant — identical for `en` and `pt-BR` (per REQUIREMENTS Out of Scope: "Localized App Store / Google Play URLs").

### Attribution / Claim Safety
- **D-08:** Neutral framing — no copy claiming Forrest Knutson authored, owns, or endorses these apps. Verified store developer is **"John Goodstadt"**, not Forrest Knutson (iOS seller = "John Goodstadt"; Android package id = `com.johngoodstadt.knutson.meditation`). Heading + labels name only the "Resonant Breathing" app. The roadmap goal phrase "Forrest Knutson's native Resonant Breathing apps" is the reference app for his teaching, but the implemented copy must NOT assert his authorship/ownership.
- **D-09:** Locked claim-safe copy is untouched — `lockedCopy.affiliationLine` and `lockedCopy.inspiredByForrest` (`src/content/lockedCopy.ts`) are not modified; the frozen-EN `LOCKED_COPY` byte-equality guard stays green. New link copy stays neutral/descriptive — no benefit-claiming language.

### Data Model
- **D-10:** Two new link keys added to `LearnContent.links` in `src/content/learnContent.ts` (planner picks exact key names, e.g. `appStoreIos` / `googlePlayAndroid`). Both `en` and `pt-BR` entries must be added — `LEARN_CONTENT` stays a complete `Readonly<Record<LocaleId, LearnContent>>`. `learnContent.test.ts` and `LearnDialog.test.tsx` updated to cover the new section/links.

### Claude's Discretion
- Exact new key names in `LearnContent.links` and the `UiStrings['learn']` heading key.
- Exact heading text (EN) — any neutral phrasing naming the "Resonant Breathing" app (e.g. "Resonant Breathing app").

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — LEARN-01 (the requirement); Out of Scope rows: "Recolored / restyled App Store + Google Play badges" (use official badges or plain text — D-03 picks plain text) and "Localized App Store / Google Play URLs" (URLs locale-invariant — D-07).

### Locked Copy
- `src/content/lockedCopy.ts` — `LOCKED_COPY` frozen-EN copy; must NOT change (D-09). Guard: `src/content/lockedCopy.test.ts`.

No external ADRs/specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/LearnDialog.tsx`: renders link sub-sections; existing `<a>` className is the exact text-link style to reuse for the two new links. New section slots after the videos block (~line 173), before the `affiliationLine` `<p>` (~line 178).
- `src/content/learnContent.ts`: `LEARN_CONTENT` is `Readonly<Record<LocaleId, LearnContent>>`; `LearnContent.links` interface (~line 26) gets 2 new keys; `LearnLink` type (`{ label, url }`) is reused as-is.
- `src/content/strings.ts`: `UiStrings['learn']` interface (~line 121) gets 1 new heading key; EN block ~line 241, PT-BR block ~line 360.

### Established Patterns
- All LearnDialog external links carry `target="_blank" rel="noopener noreferrer"` — new links follow this.
- PT-BR strings without a native-speaker pass carry an inline `// TODO: native-speaker review` comment (Phase 26 sweep depends on this marker).
- Link sections render a `<h3>` heading from `strings.learn.*` then a `grid gap-2` of `<a>` elements.

### Integration Points
- `learnContent` / `lockedCopy` / `strings` are resolved per-locale by `useLocale()` in `App.tsx` and passed as `LearnDialog` props — the new section consumes the same prop flow, no wiring changes.
- Tests to update: `src/components/LearnDialog.test.tsx`, `src/content/learnContent.test.ts`.

</code_context>

<specifics>
## Specific Ideas

- App name "Resonant Breathing" confirmed verbatim from both store listings during discussion.
- Store developer confirmed as "John Goodstadt" — drove the neutral-attribution decision (D-08).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 24-forrest-native-app-links*
*Context gathered: 2026-05-15*
