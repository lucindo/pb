# Phase 26: PT-BR Native-Speaker Review - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Native-speaker review pass over the machine-translated PT-BR strings in the two
translatable content catalogs, correcting them to natural Brazilian Portuguese and
removing every `// TODO: native-speaker review` marker.

**In scope:**
- `src/content/strings.ts` — 86 `// TODO: native-speaker review` markers on `pt-BR` `UiStrings` entries.
- `src/content/learnContent.ts` — 12 markers on `pt-BR` `LearnContent` entries.
- Total: **98 markers** to resolve (PROJECT.md's "76" is stale — Phases 24 and 25 added more).

**Out of scope (scope anchor):**
- EN values — only `pt-BR` values are reviewed/changed.
- `LOCKED_COPY` (`src/content/lockedCopy.ts`) — already reviewed, no markers; its frozen-EN byte-equality guard must stay intact and untouched.
- No new strings, no new UI, no `STATE_VERSION` / schema changes.
- No new locales — `en` + `pt-BR` only.

</domain>

<decisions>
## Implementation Decisions

### Review workflow
- **D-01:** Claude proposes an improved, native-quality PT-BR value for each of the 98 marked strings. The operator (PT-BR native speaker) approves as-is, tweaks, or rejects each. Claude does not silently apply unreviewed corrections.

### Delivery format
- **D-02:** Corrections are delivered as **one Markdown review table per catalog** (strings.ts, learnContent.ts) inside a single review pass. Columns: key/path · EN · current PT-BR · proposed PT-BR · CHANGED|KEPT flag · note.
- **D-03:** The table lists **all 98 marked strings**, not only changed ones — a CHANGED/KEPT column flags Claude's judgment so the operator sees full review coverage and can still override a KEPT row.
- **D-04:** After the operator marks up the table, Claude applies all approved edits to the catalog files in one pass.

### Register & tone
- **D-05:** PT-BR UI uses an **informal `você` register with no direct address** — implied `você`, imperatives where natural (e.g. `Iniciar sessão`). Calm, neutral Brazilian app tone, consistent with the app's quiet voice. No warm/personal phrasing.

### Glossary (translate vs keep)
- **D-06:** `HRV` → **`VFC`** (Variabilidade da Frequência Cardíaca — standard Brazilian term; already partly used, e.g. `Respiração VFC`).
- **D-07:** `BPM` → **`RPM`** in PT-BR only (Respirações Por Minuto). The EN `bpmLabel` value stays `BPM`; only the `pt-BR` value changes. This is a real translation correction — it lands as a CHANGED row, not a silent marker removal.
- **D-08:** `"Resonant Breathing"` (Forrest's native app names) and `"Forrest Knutson"` stay in English, untranslated.
- **D-09:** Glossary terms must be applied **consistently across both catalogs** — same term, same translation everywhere.

### Plan split & done-gate
- **D-10:** **One plan** covers both catalogs (`strings.ts` + `learnContent.ts`) — single review table pass, all 98 markers resolved together.
- **D-11:** **All 98 markers are removed** after review regardless of whether the string changed (req I18N-07: "every marker is removed").
- **D-12:** New **marker-guard test** — fails if `// TODO: native-speaker review` appears anywhere in `src/content/`. Mirrors the existing `favicon.sync.test.ts` drift-guard pattern; locks the done-state against future regressions.
- **D-13:** Done-gate: `grep "native-speaker review" src/` returns 0 · `lockedCopy.test.ts` byte-equality guard green · `strings.test.ts` + `learnContent.test.ts` (type completeness / `Record<LocaleId, ...>`) green · new marker-guard test green · per-commit green-gate (`tsc && lint && build && test`) holds.

### Claude's Discretion
- Exact wording of each proposed PT-BR correction (subject to operator approval per D-01).
- Review-table layout details and column order, as long as D-02/D-03 fields are present.
- Whether the marker-guard test is a standalone file or folded into an existing `src/content/` test (planner's call).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirement
- `.planning/REQUIREMENTS.md` — I18N-07 is the single requirement for this phase (review all machine-translated PT-BR strings, remove every marker, keep `LOCKED_COPY` byte-guard + `Record<LocaleId, UiStrings>` completeness).

### Translatable catalogs (the work surface)
- `src/content/strings.ts` — `UiStrings` catalog, 86 `pt-BR` markers. Header comment documents Phase 19 decisions D-01/D-10/D-12/D-14/D-15.
- `src/content/learnContent.ts` — `LearnContent` catalog, 12 `pt-BR` markers.

### Must-not-break guards
- `src/content/lockedCopy.ts` — frozen claim-safe `LOCKED_COPY` (3 strings, already reviewed, no markers). Do not touch.
- `src/content/lockedCopy.test.ts` — byte-equality `.toBe()` snapshot lock; must stay green.
- `src/content/strings.test.ts`, `src/content/learnContent.test.ts` — type completeness / catalog-shape tests; must stay green.

### Prior-phase decisions that deposited markers
- `.planning/phases/24-forrest-native-app-links/24-CONTEXT.md` §D-02/D-06 — Phase 24 added PT-BR Learn-surface strings with markers, explicitly for this sweep.
- `.planning/phases/25-labels-vs-icons-cue-toggle/25-CONTEXT.md` §D-12 — Phase 25 added PT-BR cue-picker strings with markers, explicitly for this sweep.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `favicon.sync.test.ts` drift-guard pattern (Phase 21 D-07) — the model for the new marker-guard test (D-12).
- `Record<LocaleId, ...>` typed catalog shape — already enforces type completeness; the review only changes string values, not shape.

### Established Patterns
- Phase 19 D-01 separation: locked claim-safe copy lives in `lockedCopy.ts`, translatable copy in `strings.ts` + `learnContent.ts`. This phase touches only the latter two.
- The `// TODO: native-speaker review` inline marker is the deliberate hand-off mechanism from Phases 19/24/25 — every marked entry is a known sweep target.

### Integration Points
- Catalog string values feed `useLocale` orchestrator and all components rendering PT-BR copy — value-only edits, no API surface change.
- `bpmLabel` (D-07 BPM→RPM) is consumed by SettingsDialog; verify the PT-BR `RPM` label still fits the existing layout.

</code_context>

<specifics>
## Specific Ideas

- The operator is the PT-BR native speaker — the review loop is operator-facing approval, not an external reviewer hand-off.
- BPM→RPM (D-07) is the operator's explicit native-speaker correction; it is a content change, not just marker cleanup, and should be visibly flagged CHANGED in the review table.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 26-pt-br-native-speaker-review*
*Context gathered: 2026-05-15*
