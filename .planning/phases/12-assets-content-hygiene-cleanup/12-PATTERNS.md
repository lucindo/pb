# Phase 12: Assets, Content & Hygiene Cleanup - Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 9 (3 new, 6 modified)
**Analogs found:** 7 / 9 (2 use established-pattern-from-doc — see "No Analog Found")

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| NEW `public/favicon.svg` | asset (static) | build-time copy (Vite) | none in repo (no other `public/` asset exists) | none — see "No Analog Found" |
| MODIFIED `index.html:5` | config (HTML entry) | build-time substitution | `index.html:11` (`/src/main.tsx` Vite path) + `vite.config.ts:7` (`base: '/hrv/'`) | role-match |
| MODIFIED `src/content/learnContent.ts:60` | content (frozen) | static data | `src/content/learnContent.ts:52,56,64,68` (sibling `url:` fields) | exact (sibling) |
| MODIFIED `src/domain/settings.ts:50-64` (rewrite `validateSettings`) + 3 new exports | domain (predicates + validator) | request-response (sync, throwing) | `src/storage/settings.ts:20-33` (predicate bodies VERBATIM) + `src/domain/settings.ts:50-64` (throw shape) | exact |
| MODIFIED `src/storage/settings.ts:8-16` (import extension) + `:20-33` (deletion) | storage (coercer) | request-response (sync, fallback) | `src/storage/settings.ts:8-16` (existing import block) | exact (same file, same block) |
| NEW `src/domain/settings.test.ts` (~6-9 cases) | test | request-response (sync) | `src/storage/settings.test.ts` (coercer test) + `src/hooks/useSessionEngine.test.tsx` (structural-gap-fill exception, Phase 10 D-20) + `src/components/SessionReadout.test.tsx` (structural-gap-fill exception, Phase 11 D-06) | exact |
| MODIFIED `src/storage/format.ts:42` (one-line JSDoc) | utility (formatter) | request-response (sync, pure) | `src/audio/audioEngine.ts:39-50` (single-line `/** ... */` JSDoc above method signatures) | role-match (cross-module — no JSDoc exists yet in `src/storage/*.ts`) |
| MODIFIED `.planning/REQUIREMENTS.md` (HYGIENE-01 row, line 148) | docs (traceability) | static doc edit | `.planning/REQUIREMENTS.md:137-145` (`Complete` cells already in same table) | role-match (no `Overtaken` precedent — first use; verbatim shape `\| HYGIENE-01 \| Phase 12 ... \| Overtaken \|`) |
| MODIFIED `REVIEW.md` (one-line addendum after `:389`) | docs (frozen review) | static doc edit | None — REVIEW.md is frozen 2026-05-11 with no existing `[YYYY-MM-DD update]` addenda | none — see "No Analog Found" (use exact verbatim string from CONTEXT.md D-02) |

## Pattern Assignments

### `src/domain/settings.ts:50-64` + 3 new predicate exports (domain, request-response)

**Analog:** `src/storage/settings.ts:20-33` (verbatim relocation per D-08)

**Imports pattern** — domain module is dependency-free already (line 1 starts with type aliases). The 3 predicates need:
- `Number.isFinite` (global, no import)
- `BPM_OPTIONS`, `RATIO_OPTIONS`, `DURATION_OPTIONS` — already declared in-file at lines 10-42
- `RatioLabel`, `DurationOption` types — already exported at lines 1-2

No new imports needed in `src/domain/settings.ts`. Predicates land in the same file as their allowlist source-of-truth (confirms D-08 rationale: domain is the right home — `OPTIONS` already live here, so no cycle risk).

**Predicate pattern** (VERBATIM from `src/storage/settings.ts:20-33` — copy these three function bodies unchanged, change `function` → `export function`):

```typescript
export function isValidBpm(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && (BPM_OPTIONS as readonly number[]).includes(v)
}

export function isValidRatio(v: unknown): v is RatioLabel {
  return typeof v === 'string' && (RATIO_OPTIONS as readonly string[]).includes(v)
}

export function isValidDuration(v: unknown): v is DurationOption {
  if (v === 'open-ended') return true
  return typeof v === 'number'
    && Number.isFinite(v)
    && (DURATION_OPTIONS as readonly DurationOption[]).includes(v)
}
```

Placement: above `validateSettings` (currently at line 50). Predicates form a public-API stanza between `DEFAULT_SETTINGS` (lines 44-48) and `validateSettings` (lines 50-64).

**Validator rewrite pattern** — current `validateSettings` body at `src/domain/settings.ts:50-64`:

```typescript
export function validateSettings(settings: SessionSettings): SessionSettings {
  if (!(BPM_OPTIONS as readonly number[]).includes(settings.bpm)) {
    throw new RangeError(`Unsupported BPM: ${String(settings.bpm)}`)
  }

  if (!RATIO_OPTIONS.includes(settings.ratio)) {
    throw new RangeError(`Unsupported ratio: ${settings.ratio}`)
  }

  if (!(DURATION_OPTIONS as readonly DurationOption[]).includes(settings.durationMinutes)) {
    throw new RangeError(`Unsupported duration: ${String(settings.durationMinutes)}`)
  }

  return { ...settings }
}
```

Rewrite to (per D-09 — throw class + message format preserved verbatim):

```typescript
export function validateSettings(settings: SessionSettings): SessionSettings {
  if (!isValidBpm(settings.bpm)) {
    throw new RangeError(`Unsupported BPM: ${String(settings.bpm)}`)
  }

  if (!isValidRatio(settings.ratio)) {
    throw new RangeError(`Unsupported ratio: ${settings.ratio}`)
  }

  if (!isValidDuration(settings.durationMinutes)) {
    throw new RangeError(`Unsupported duration: ${String(settings.durationMinutes)}`)
  }

  return { ...settings }
}
```

Throw class (`RangeError`), message format (` `Unsupported BPM: ${String(settings.bpm)}` `), and return-shape (`{ ...settings }`) are byte-for-byte identical to today. Existing callers' catch sites unchanged. Subtle: the new predicate-call form also handles `unknown` inputs cleanly — the type narrow is harmless on typed `SessionSettings` fields.

---

### `src/storage/settings.ts` (storage, request-response)

**Analog:** Same file — extend the existing import block, delete the local predicates.

**Import-extension pattern** — existing block at `src/storage/settings.ts:8-16`:

```typescript
import {
  BPM_OPTIONS,
  RATIO_OPTIONS,
  DURATION_OPTIONS,
  DEFAULT_SETTINGS,
  type SessionSettings,
  type RatioLabel,
  type DurationOption,
} from '../domain/settings'
```

Add `isValidBpm`, `isValidRatio`, `isValidDuration` to this block (per D-09). The `OPTIONS` constants and `RatioLabel`/`DurationOption` type imports become unused inside `src/storage/settings.ts` after the predicate bodies move out (the predicates were their only consumer in this file). The planner verifies and removes any that go unused — `DEFAULT_SETTINGS` and `SessionSettings` are still used by `coerceSettings` (lines 35-44) and the load/save wrappers (lines 50-66), so those stay. Resulting import block (planner-final shape; lint will catch unused imports if any):

```typescript
import {
  DEFAULT_SETTINGS,
  isValidBpm,
  isValidRatio,
  isValidDuration,
  type SessionSettings,
} from '../domain/settings'
```

**Deletion pattern** — DELETE `src/storage/settings.ts:20-33` (the three `function isValid<X>(v: unknown): v is <T>` declarations). They are file-private (`function`, not `export function`) — grep confirms no other file in repo imports them. `coerceSettings` at lines 35-44 calls them by bare identifier and now resolves to the imported names; zero call-site change inside that body.

**Coerce body preservation** — `coerceSettings` (lines 35-44) is **unchanged**. Confirmed shape:

```typescript
export function coerceSettings(raw: unknown): SessionSettings {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    bpm:             isValidBpm(r.bpm)             ? r.bpm             : DEFAULT_SETTINGS.bpm,
    ratio:           isValidRatio(r.ratio)         ? r.ratio           : DEFAULT_SETTINGS.ratio,
    durationMinutes: isValidDuration(r.durationMinutes) ? r.durationMinutes : DEFAULT_SETTINGS.durationMinutes,
  }
}
```

Fallback policy preserved verbatim.

---

### `src/domain/settings.test.ts` (NEW — test, request-response)

**Analog:** `src/storage/settings.test.ts` (coercer test, full file, especially lines 1-13 and 22-91 for the `describe`/`it` structural shape) + `src/hooks/useSessionEngine.test.tsx:1-22` (structural-gap-fill posture from Phase 10 D-20) + `src/components/SessionReadout.test.tsx:1-30` (structural-gap-fill posture from Phase 11 D-06).

**Imports pattern** (mirror `src/storage/settings.test.ts:1-12`):

```typescript
import { describe, expect, it } from 'vitest'

import {
  isValidBpm,
  isValidRatio,
  isValidDuration,
} from './settings'
```

(No `beforeEach`/`afterEach` needed — predicates are pure; no `vi`, no `localStorage`, no fake timers.)

**Describe-block pattern** (mirror `src/storage/settings.test.ts:23` `describe('coerceSettings (D-15)', () => { ... })`):

```typescript
describe('isValidBpm (HYGIENE-02 D-08)', () => {
  it('returns true for valid BPM_OPTIONS members (e.g. 5.5)', () => {
    expect(isValidBpm(5.5)).toBe(true)
  })

  it('returns false for out-of-range numbers (0, 7.5)', () => {
    expect(isValidBpm(0)).toBe(false)
    expect(isValidBpm(7.5)).toBe(false)
  })

  it('returns false for wrong type (string "5", null)', () => {
    expect(isValidBpm('5')).toBe(false)
    expect(isValidBpm(null)).toBe(false)
  })

  it('returns false for NaN / Infinity', () => {
    expect(isValidBpm(NaN)).toBe(false)
    expect(isValidBpm(Infinity)).toBe(false)
  })
})

describe('isValidRatio (HYGIENE-02 D-08)', () => {
  it('returns true for RATIO_OPTIONS members (e.g. "40:60")', () => {
    expect(isValidRatio('40:60')).toBe(true)
  })

  it('returns false for malformed strings ("40-60", "")', () => {
    expect(isValidRatio('40-60')).toBe(false)
    expect(isValidRatio('')).toBe(false)
  })

  it('returns false for wrong type (number 60)', () => {
    expect(isValidRatio(60)).toBe(false)
  })
})

describe('isValidDuration (HYGIENE-02 D-08)', () => {
  it('returns true for DURATION_OPTIONS numeric members (e.g. 10)', () => {
    expect(isValidDuration(10)).toBe(true)
  })

  it('returns true for "open-ended" sentinel', () => {
    expect(isValidDuration('open-ended')).toBe(true)
  })

  it('returns false for out-of-range numbers (7) and arbitrary strings ("forever")', () => {
    expect(isValidDuration(7)).toBe(false)
    expect(isValidDuration('forever')).toBe(false)
    expect(isValidDuration(null)).toBe(false)
  })
})
```

Suggested-case shape from CONTEXT.md D-10. Target ~6-9 cases (planner-final). Place in `src/domain/settings.test.ts` (co-located with source, structural-gap-fill exception per Phase 10 D-20 / Phase 11 D-16 — same posture as `useSessionEngine.test.tsx` (Phase 10) and `SessionReadout.test.tsx` (Phase 11)).

**Test naming-convention** — both Phase 10 and Phase 11 gap-fill test files use `describe('<unit>', () => { it('<behaviour>') })` with no preamble comment. The above mirrors `src/storage/settings.test.ts:23` `describe('coerceSettings (D-15)', () => { ... })` — append the `(HYGIENE-02 D-08)` tag for traceability per the existing convention.

---

### `index.html:5` (config, build-time)

**Analog:** `index.html:11` shows the existing Vite path convention (root-absolute `/src/main.tsx` resolved at dev-time + base-prefixed at build-time); `vite.config.ts:7` shows `base: '/hrv/'` is the build-time prefix `%BASE_URL%` expands to.

**Current line 5:**

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

**Replacement (per D-04 — Vite documented HTML substitution):**

```html
<link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />
```

`%BASE_URL%` is the canonical Vite token (no plugin, no build-step codegen — Vite resolves it during the `index.html` transform). Production `dist/index.html` will read `href="/hrv/favicon.svg"`. Same posture as the default Vite template. No change to `vite.config.ts:7`.

---

### `public/favicon.svg` (NEW — asset)

**Analog:** None in repo — the `public/` directory does not exist yet (`ls public/` → `NO_PUBLIC_DIR`). Vite creates it implicitly: any file dropped into `public/` is copied verbatim to `dist/` under the `base` prefix.

**Pattern (per D-03 — single-color filled orb, ~150-200 bytes target):**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#0d9488"/></svg>
```

`#0d9488` is the planner-final literal hex for `--color-breathing-accent` (Tailwind `teal-600`). CSS custom properties do **not** apply inside an external SVG loaded as `<link rel="icon">` (per D-03), so the hex must be inlined. Planner verifies the literal against the resolved Tailwind theme before committing — if `--color-breathing-accent` resolves to a different hex (e.g., a custom theme override), use that. (The teal-600 `#0d9488` is the conventional Tailwind value; planner double-checks by grepping `tailwind.config.*` / `src/styles/*` / theme files for any override.)

---

### `src/content/learnContent.ts:60` (content, static)

**Analog:** Sibling `url:` fields in the same `links:` object — `src/content/learnContent.ts:52` (`youtubeChannel.url`), `:56` (`website.url`), `:64` (`patreon.url`), `:68` (`heroVideo.url`). All use full-domain canonical URLs (e.g., `'https://www.youtube.com/@ForrestKnutson'`, `'https://www.patreon.com/forrestknutson'`).

**Current line 60:**

```typescript
      url: 'https://amzn.to/3RTAVqi',
```

**Replacement (per D-05 — verbatim from Forrest's YouTube descriptions):**

```typescript
      url: 'https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US',
```

Single-string content edit. Schema unchanged — the `book` entry still has `{ label, url }`. The `linkId` query param is Forrest's own Amazon Associates tag — **do not strip** (per D-05 + specifics). The disclaimer at `src/components/LearnDialog.tsx:171` ("Independent project. Not affiliated with Forrest Knutson.") is **not edited** per D-06 — confirmed verbatim at the file site:

```typescript
        <p className="text-center text-xs text-[var(--color-breathing-muted)]">
          Independent project. Not affiliated with Forrest Knutson.
        </p>
```

---

### `src/storage/format.ts:42` (utility, JSDoc)

**Analog:** No existing `/** ... */` JSDoc in `src/storage/*.ts` (all comments there are `//` line-style — see lines 1-4, 18-27, 36, 41, 50, 55). Closest in-repo `/** ... */` precedent is `src/audio/audioEngine.ts:39-50`, where short single-line JSDoc blocks decorate method signatures:

```typescript
  /** Toggle mute. Mid-cue: applies a soft fade-out to the active cue's envelope.
   *  Mid-phase unmute: does NOT fire a make-up cue (D-08). */
  setMuted(muted: boolean): void
  /** Current mute state (mirrors what was last passed to setMuted). */
  readonly muted: boolean
  /** Capture the audioCtx.currentTime at this instant — App.tsx uses this as the t=0 anchor co-anchored with session.start(). */
  now(): number
```

Note the one-line form `/** ... */` on a single line is the established compact style (line 42, 44, 46 of `audioEngine.ts`). D-11 uses this exact shape.

**Current line 41-42 (context — `//` comment on line 41 stays):**

```typescript
// D-05: "May 7" current year; "May 7, 2025" other year.
export function formatLastSessionDate(atMs: number, now: () => number = Date.now): string {
```

**Insertion pattern (per D-11 — add above line 42, between the existing `// D-05` comment and the function signature):**

```typescript
// D-05: "May 7" current year; "May 7, 2025" other year.
/** @param now Test-only seam — production callers always omit this; tests pass a pinned `() => number` to drive the same-year vs other-year branch coverage in `format.test.ts`. */
export function formatLastSessionDate(atMs: number, now: () => number = Date.now): string {
```

Zero code change. The `// D-05:` comment above survives — D-11 layers the JSDoc beside it, not replacing it. Wording is the planner-final suggestion from D-11 (lightly editable but should retain the `@param now Test-only seam` core).

---

### `.planning/REQUIREMENTS.md` traceability row (line 148, docs)

**Analog:** Same table at `.planning/REQUIREMENTS.md:137-145` — rows already use the form `| <REQ-ID> | <Phase> | <Status> |`. Existing statuses in the file: `Pending` (lines 124-136, 146-150) and `Complete` (lines 137-145). No existing `Overtaken` or `Deferred` cells (grep confirms zero matches). D-01 introduces `Overtaken` for the first time — planner picks a status string consistent with the table's vocabulary.

**Current line 148:**

```markdown
| HYGIENE-01 | Phase 12 — Assets, Content & Hygiene Cleanup | Pending |
```

**Replacement (per D-01 — status `Pending` → `Overtaken`):**

```markdown
| HYGIENE-01 | Phase 12 — Assets, Content & Hygiene Cleanup | Overtaken |
```

D-01 also mentions a "one-line reason cell" — the table is currently 3-column (`REQ-ID | Phase | Status`). The planner's options: (a) keep 3 columns and stuff the reason into Status (e.g., `Overtaken (by Phase 9 AUDIO-02)`), or (b) add a fourth `Notes` column to the whole table. (a) is the lower-blast-radius choice and reads naturally — recommend `| HYGIENE-01 | Phase 12 — Assets, Content & Hygiene Cleanup | Overtaken (by Phase 9 AUDIO-02) |`. Planner picks the final form per house-style; the row content above CONTEXT.md cites is decisive.

**Side-effect on the totals line at `.planning/REQUIREMENTS.md:152`** — "Phase totals: ... 12 → 5  =  27" — the count stays 5 (HYGIENE-01 is still tracked in Phase 12 even as Overtaken). No edit needed on line 152.

---

### `REVIEW.md` IN-02 addendum (~line 389, docs)

**Analog:** None — REVIEW.md is the frozen 2026-05-11 deep review with no existing `[YYYY-MM-DD update]` addenda (grep confirms zero matches for `\[20` or `Overtaken` patterns in the file). D-02 introduces the first addendum.

**Current context — `REVIEW.md:385-389`:**

```markdown
### IN-02: `audio.audioNow` is declared in the hook's return interface but never read by `App.tsx`

**File:** `src/hooks/useAudioCues.ts:331-333`, `:343` (return), `App.tsx` (no usage)
**Issue:** The hook returns `audioNow` (line 343) and the consumer never reads it. App.tsx uses `firstInAudioTime` from `audioStart` and `engine.now()` indirectly via `onAudioReanchorRequired`'s callback argument. Dead public API surface; either remove from the interface or document its intended consumer.
**Fix:** Remove from the return tuple and the `UseAudioCues` interface, or keep with a JSDoc note about intended future callers (e.g., "Used by App.tsx for the dual-anchor (Pitfall 2)" — current comment claims this but App.tsx doesn't actually call it).
```

**Insertion (per D-02 — appended immediately after the "Fix:" paragraph at line 389):**

```markdown
**Fix:** Remove from the return tuple and the `UseAudioCues` interface, or keep with a JSDoc note about intended future callers (e.g., "Used by App.tsx for the dual-anchor (Pitfall 2)" — current comment claims this but App.tsx doesn't actually call it).

[2026-05-12 update] Overtaken by Phase 9 AUDIO-02 — `audio.audioNow()` is the documented seam for the caller-side past-time clamp at App.tsx:549. HYGIENE-01 closed-no-op in 12-CONTEXT.md.
```

Exact wording from CONTEXT.md D-02 (verbatim — backticks around `audio.audioNow()` and `App.tsx:549`; em-dash; cites `12-CONTEXT.md`). Blank line above the addendum preserves the existing IN-02 block boundary; the next section `### IN-03` continues normally below.

---

## Shared Patterns

### Per-commit green-gate (D-15 — applies to every commit in Phase 12)

**Source:** `.planning/phases/07-strict-type-lint-baseline/07-CONTEXT.md` D-09 + `.planning/phases/11-domain-ui-contracts-accessibility/11-CONTEXT.md` D-17.

**Apply to:** Every commit in Phase 12.

Each commit must satisfy all four gates:

```bash
npx tsc --noEmit   # exits 0
npm run lint       # exits 0
npm run build      # exits 0
npm test           # full Vitest suite passes (baseline 400 → target ~406-409 after HYGIENE-02 D-10 adds ~6-9 new cases)
```

A commit that breaks any of the four is **rolled back, not patched-forward**.

### `react-hooks/*` disable annotation (D-14)

**Source:** `.planning/phases/07-strict-type-lint-baseline/07-CONTEXT.md` D-04.

**Apply to:** Any new `// eslint-disable-next-line react-hooks/*` introduced in Phase 12 (expected: zero — Phase 12 touches no hook code).

Pattern (if needed):

```typescript
// Reason: <why this disable is correct here, not a bug>
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { ... }, [])
```

### Structural-gap-fill new test-file exception (D-10 application)

**Source:** Phase 10 D-20 (`useSessionEngine.test.tsx`) + Phase 11 D-06 / D-16 (`SessionReadout.test.tsx`).

**Apply to:** `src/domain/settings.test.ts` (NEW per D-10).

The standing rule (Phase 9 D-14 / Phase 10 D-20 / Phase 11 D-16) is **co-locate new contract tests in existing `*.test.{ts,tsx}` neighbors**. The **exception** is invoked when the source file has no existing test file — then a new test file is the structural gap-fill. `src/domain/settings.ts` has no existing test file, so the exception applies cleanly. Mirrors Phase 10's choice for `useSessionEngine.test.tsx` and Phase 11's choice for `SessionReadout.test.tsx`.

### Throw class + message format preservation (D-09 application)

**Source:** `src/domain/settings.ts:50-64` (current `validateSettings`).

**Apply to:** The `validateSettings` rewrite in `src/domain/settings.ts`.

The predicate-call rewrite **must preserve verbatim**: throw class (`RangeError`), message template (`` `Unsupported BPM: ${String(settings.bpm)}` `` and parallel for ratio/duration), return-shape (`{ ...settings }`). Reason: existing callers' catch sites and any tests that assert on `err.message` would otherwise break. The new predicate-form does **not** change observable behaviour — only the inline `.includes()` check is replaced by the new predicate identifier.

---

## No Analog Found

Files with no close in-repo precedent — planner uses the doc-cited shape directly (CONTEXT.md / spec text).

| File | Role | Data Flow | Reason | Direction |
|------|------|-----------|--------|-----------|
| `public/favicon.svg` (NEW) | asset | build-time copy | `public/` dir does not yet exist; no other static asset in repo to mirror | Use the SVG body in CONTEXT.md D-03: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#0d9488"/></svg>`. Vite copies `public/*` verbatim to `dist/` under `base: '/hrv/'`. |
| `REVIEW.md` `[2026-05-12 update]` addendum | docs | static doc edit | No existing dated addendum in REVIEW.md — this is the first | Use the exact verbatim string from CONTEXT.md D-02 (line 104): `[2026-05-12 update] Overtaken by Phase 9 AUDIO-02 — \`audio.audioNow()\` is the documented seam for the caller-side past-time clamp at App.tsx:549. HYGIENE-01 closed-no-op in 12-CONTEXT.md.` |
| `.planning/REQUIREMENTS.md` `Overtaken` status cell | docs | static doc edit | No existing `Overtaken` precedent in the traceability table (table uses `Pending` and `Complete` only — verified by grep) | First use; recommend `Overtaken` or `Overtaken (by Phase 9 AUDIO-02)` to keep the reason discoverable in-row without adding a new column. Planner picks final form. |

## Metadata

**Analog search scope:**
- `/Users/lucindo/Code/hrv/src/` (full tree — predicates, JSDoc precedents, test-file shapes)
- `/Users/lucindo/Code/hrv/public/` (does not exist — confirms "no analog" for `public/favicon.svg`)
- `/Users/lucindo/Code/hrv/index.html`, `/Users/lucindo/Code/hrv/vite.config.ts` (HTML substitution + Vite base config)
- `/Users/lucindo/Code/hrv/REVIEW.md` (frozen 2026-05-11 — addendum analog)
- `/Users/lucindo/Code/hrv/.planning/REQUIREMENTS.md` (traceability row shapes)
- `/Users/lucindo/Code/hrv/.planning/phases/07-strict-type-lint-baseline/07-CONTEXT.md` (D-04 / D-09 carry-forward)
- `/Users/lucindo/Code/hrv/.planning/phases/10-hooks-identity-effect-hygiene/10-CONTEXT.md` (D-20 carry-forward — structural-gap-fill exception)
- `/Users/lucindo/Code/hrv/.planning/phases/11-domain-ui-contracts-accessibility/11-CONTEXT.md` (D-13 / D-16 / D-17 carry-forward — single-plan + new-test-file + green-gate)

**Files scanned:** 14
**Pattern extraction date:** 2026-05-12
