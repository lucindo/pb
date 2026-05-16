# Phase 26: PT-BR Native-Speaker Review - Pattern Map

**Mapped:** 2026-05-15
**Files analyzed:** 3 (2 modified catalogs, 1 new marker-guard test)
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/content/strings.ts` (MODIFIED) | content / data-catalog | transform (value-only edits) | itself (no role change) | n/a — in-place value edits |
| `src/content/learnContent.ts` (MODIFIED) | content / data-catalog | transform (value-only edits) | itself (no role change) | n/a — in-place value edits |
| `src/content/<marker-guard>.test.ts` (NEW) | test / drift-guard | file-I/O scan + assert | `src/styles/theme.no-hardcoded-classes.test.ts` | exact (banned-pattern fs-scan guard) |

**Note on the modified catalogs:** these are not "new files that copy an analog" — they are value-only edits to existing `pt-BR` entries. There is no pattern to copy; the constraint is the *opposite* (do not change shape, keys, EN values, or the `Record<LocaleId, ...>` typing). The relevant "pattern" for the planner is the marker-removal mechanics, documented in §Pattern Assignments below.

## Pattern Assignments

### `src/content/strings.ts` (MODIFIED — value-only `pt-BR` edits)

**No analog file.** This is an in-place edit. The pattern to preserve:

**Marker line shape — end-of-line inline comment** (e.g. lines 264-269):
```typescript
      header: 'PRÁTICA VFC', // TODO: native-speaker review
      title: 'Respiração VFC', // TODO: native-speaker review
      startSession: 'Iniciar sessão', // TODO: native-speaker review
      endSession: 'Encerrar sessão', // TODO: native-speaker review
```

**Marker mechanics for `strings.ts`:**
- **85** entries carry the bare end-of-line marker matching `/\/\/ TODO: native-speaker review$/`.
- **1** additional occurrence is at line 9 — a *header-comment reference*, NOT a real marker:
  ```typescript
  // "// TODO: native-speaker review" per I18N-07.
  ```
  Raw `grep -c "TODO: native-speaker review"` returns **86** because it counts line 9. CONTEXT.md says "86 markers" — that count includes the header reference. The planner must decide: either (a) the header line is rewritten/removed as part of the marker sweep so a literal-substring guard can stay simple, or (b) the guard regex is anchored to end-of-line (`/\/\/ TODO: native-speaker review$/m`) to skip the quoted header reference. **Recommendation: rewrite line 9** during the sweep — it documents a now-resolved hand-off and a substring guard (`text.includes('native-speaker review')`) is the most robust, least-bypassable form. See §Shared Patterns for the trade-off.

**Edit rule (D-11):** when applying an approved correction, change *only* the `pt-BR` value and delete the trailing ` // TODO: native-speaker review` comment. For KEPT rows the value is unchanged but the marker is still deleted. EN values on the same key are never touched.

---

### `src/content/learnContent.ts` (MODIFIED — value-only `pt-BR` edits)

**No analog file.** In-place edit. The pattern to preserve:

**Marker line shape — standalone comment line** (e.g. lines 103-109):
```typescript
        // TODO: native-speaker review
```

**Marker mechanics for `learnContent.ts`:**
- **12** raw `grep` hits, of which **10** are standalone-line markers matching `/^\s*\/\/ TODO: native-speaker review\s*$/m`. The remaining 2 are on different line shapes (verify exact placement when applying — `grep -n "TODO: native-speaker review" src/content/learnContent.ts` gives the authoritative list). CONTEXT.md's "12" is the raw count and is the authoritative target for I18N-07.
- Marker style here differs from `strings.ts`: it is a **standalone comment line above the entry**, not a trailing inline comment. The sweep removes the whole comment line.

**Edit rule:** identical to `strings.ts` — `pt-BR` value-only edits, every marker line deleted regardless of CHANGED/KEPT.

---

### `src/content/<marker-guard>.test.ts` (NEW — drift-guard test, D-12)

**Primary analog:** `src/styles/theme.no-hardcoded-classes.test.ts` — a banned-pattern fs-scan guard that recursively walks a directory and asserts a regex is absent from every matched file. This is a *closer* analog than `favicon.sync.test.ts` (which CONTEXT.md names): favicon.sync compares three concrete sources for *agreement*, whereas D-12 needs *absence of a banned pattern across a directory* — exactly what `theme.no-hardcoded-classes.test.ts` does.

**Secondary analog:** `src/styles/favicon.sync.test.ts` — named in CONTEXT.md; use it for the file-read boilerplate (`/// <reference types="node" />` + `node:fs`/`node:path` imports) and the explanatory header-comment convention.

**Planner decision (D-12 / Claude's Discretion):** standalone file vs. fold into existing `src/content/` test.
- **Recommendation: standalone file** — `src/content/markerGuard.test.ts` (or `content.no-review-markers.test.ts`). Rationale: it is an fs-scanning test (needs `/// <reference types="node" />` + `node:fs`); the three existing `src/content/*.test.ts` files are pure in-memory import tests with no fs access. Mixing an fs-scan into `strings.test.ts` would force the Node type reference and a directory walker into an otherwise clean unit-test file. A standalone file matches the `src/styles/` precedent where every fs-scan guard is its own `*.test.ts`.
- File-naming convention in this repo for guard tests: descriptive dotted segment — `favicon.sync.test.ts`, `theme.no-hardcoded-classes.test.ts`, `theme.alpha-probe.test.ts`. A name like `content.no-review-markers.test.ts` fits that convention.

**Node-type reference boilerplate** (`favicon.sync.test.ts` lines 9-16) — copy verbatim:
```typescript
// Reason: node:fs and node:path are available in the Vitest jsdom test environment.
// tsconfig.app.json has types:["vite/client"] which excludes @types/node; the triple-slash
// reference adds Node.js type coverage for this test-only file without altering tsconfig.app.json.
/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
```
(Confirmed: `tsconfig.app.json` has `"types": ["vite/client"]` and excludes `@types/node` — the triple-slash reference is required for any test-only file using `node:fs`.)

**Header-comment convention** — every guard test opens with a block comment naming the phase, decision, what it guards, and its analog (`favicon.sync.test.ts` lines 1-7, `theme.no-hardcoded-classes.test.ts` lines 1-9):
```typescript
// src/content/content.no-review-markers.test.ts
//
// Phase 26 D-12: marker-guard. Fails if "// TODO: native-speaker review" appears
// anywhere in src/content/. Locks the I18N-07 done-state against future regressions.
//
// Analog: src/styles/theme.no-hardcoded-classes.test.ts (banned-pattern fs-scan guard)
```

**Directory-walker pattern** (`theme.no-hardcoded-classes.test.ts` lines 32-52) — adapt by changing the extension filter from `.tsx` to `.ts` and the exclusion from `themes/` to `.test.ts`:
```typescript
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      collectFiles(full, acc)
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      acc.push(full)
    }
  }
  return acc
}

const CONTENT_DIR = resolve(__dirname)        // = src/content
const CONTENT_FILES = collectFiles(CONTENT_DIR)
```
Note `src/content/` is flat (only `strings.ts`, `learnContent.ts`, `lockedCopy.ts`) — a recursive walker is harmless future-proofing, or the planner may use a simple `readdirSync` filter. **Exclude `.test.ts` files** so the guard test does not flag the literal banned string in its own source.

**Scan-and-assert pattern** (`theme.no-hardcoded-classes.test.ts` lines 54-63) — the core assertion shape, collect hits then `toEqual([])` with a diagnostic message:
```typescript
const REVIEW_MARKER = 'TODO: native-speaker review'

describe('src/content marker-guard (Phase 26 D-12 / I18N-07)', () => {
  it('no "// TODO: native-speaker review" marker remains in src/content/', () => {
    const hits: string[] = []
    for (const file of CONTENT_FILES) {
      const text = readFileSync(file, 'utf-8')
      if (text.includes(REVIEW_MARKER)) hits.push(file)
    }
    expect(hits, `Unresolved native-speaker review markers in:\n${hits.join('\n')}`).toEqual([])
  })
})
```

## Shared Patterns

### Test runner & conventions
**Source:** all `src/**/*.test.ts` files; `package.json` scripts.
**Apply to:** the new marker-guard test.
- Runner is **Vitest** (`"test": "vitest"`, `"test:run": "vitest run"`). No separate `vitest.config.*` — config lives in `vite.config.ts`.
- Standard import: `import { describe, expect, it } from 'vitest'` (content tests use `describe, expect, it` order; styles tests use `describe, it, expect` — either is fine, follow the chosen analog).
- Assertion style: `expect(value, 'diagnostic message').toEqual(...)` / `.toBe(...)`. Guard tests pass a human-readable failure message as the second `expect` arg listing the offending files (`theme.no-hardcoded-classes.test.ts` line 61).
- File naming for guards: descriptive dotted segment + `.test.ts` (`favicon.sync.test.ts`, `theme.no-hardcoded-classes.test.ts`).

### Substring vs. anchored-regex match (load-bearing decision for the planner)
**Affects:** the marker-guard test AND the `strings.ts` line-9 header comment.
- A plain **substring** scan (`text.includes('TODO: native-speaker review')`) is the most robust, hardest-to-bypass guard form — it matches the spirit of D-12 ("appears *anywhere*").
- BUT `strings.ts` line 9 currently contains `// "// TODO: native-speaker review" per I18N-07.` — a quoted header reference, not a real marker. A pure substring guard would fail on that line.
- **Two consistent options:**
  1. **Rewrite/remove line 9** during the sweep (recommended), then use the simple substring guard. The header comment documents a hand-off that Phase 26 resolves, so updating it is in-scope and natural.
  2. Keep line 9 and anchor the guard to the real marker shape — but the two catalogs use *different* shapes (`strings.ts` trailing inline; `learnContent.ts` standalone line), so an anchored regex must match both: `/(^|\s)\/\/ TODO: native-speaker review\s*$/m`. More fragile.
- These two choices must be made together — the planner picks one and the catalog sweep + guard test must agree.

### Must-not-break guards (regression safety net — D-13 done-gate)
**Apply to:** the catalog edits — these existing tests must stay green and must NOT be modified.
- `src/content/lockedCopy.test.ts` — byte-equality `.toBe()` snapshot on EN `LOCKED_COPY`. Phase 26 must not touch `lockedCopy.ts`.
- `src/content/strings.test.ts` — `Record<LocaleId, UiStrings>` exhaustiveness + non-empty value checks (e.g. `UI_STRINGS[locale].controls.startSession.length > 0`). Value-only edits keep this green as long as no value becomes empty and no key is removed.
- `src/content/learnContent.test.ts` — `LEARN_CONTENT` structural contract (fixed key order `['hrv','timing','forrest']`), non-empty title/body, clinical-verbs guard. **Note `learnContent.test.ts` lines 30-46:** a PT-BR clinical-verbs blacklist regex `/\b(melhora|trata|cura|diagnostica|avalia)\b/i` is asserted *absent* from `pt-BR` explainer bodies. Any proposed PT-BR correction to a `learnContent.ts` body must avoid these five verbs or this test fails.

### Glossary consistency check (optional reinforcement, not required by D-12)
**Source:** `strings.test.ts` lines 62-67 (exact-value assertions like `expect(UI_STRINGS.en.cue.labels).toBe('Text')`).
The repo already pins specific exact string values with `.toBe(...)` assertions. If the planner wants, a CHANGED-row outcome like D-07 (`bpmLabel` PT-BR → `RPM`) could be pinned the same way, but D-12 only mandates the marker-guard — exact-value assertions for glossary terms are discretionary.

## No Analog Found

None. All three files have a clear analog or are in-place edits with no analog needed.

## Metadata

**Analog search scope:** `src/content/`, `src/styles/` (guard-test precedents), `package.json`, `tsconfig.app.json`
**Files scanned:** strings.ts (markers), learnContent.ts (markers), strings.test.ts, learnContent.test.ts, lockedCopy.test.ts, favicon.sync.test.ts, theme.no-hardcoded-classes.test.ts
**Pattern extraction date:** 2026-05-15
