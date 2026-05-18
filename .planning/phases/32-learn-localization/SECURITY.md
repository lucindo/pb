# SECURITY.md — Phase 32: learn-localization

**Audit Date:** 2026-05-17
**ASVS Level:** L1
**Block On:** high
**Auditor:** gsd-security-auditor

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-32-01 | Tampering | mitigate | CLOSED | `learnContent.ts` lines 125-134 (EN) and 218-229 (pt-BR): NK video URLs are static authored `as const` literals — `M3t7gY_yak8` first, `A4BGQCIp9fI` second (D-06 order), no interpolation, no user input anywhere in the data file |
| T-32-02 | Information Disclosure | accept | CLOSED | See accepted risks log below — Plan 01 added only static data structures; no rendering code, no PII, no secrets in `learnContent.ts` |
| T-32-03 | Information Disclosure | mitigate | CLOSED | `LearnDialog.tsx` lines 126-127, 151-152, 159-160, 167-168, 176-177, 195-196, 203-204: every `<a>` carries `target="_blank" rel="noopener noreferrer"`; NK video links rendered via `practiceContent.videos.map()` at line 122-134 carry these attributes; enforced by test at `LearnDialog.test.tsx` line 248-256 sweeping all `<a>` elements for `activePractice='naviKriya'` |
| T-32-04 | Tampering | accept | CLOSED | See accepted risks log below — `activePractice` typed as `PracticeId` union at `LearnDialog.tsx` line 28, sourced from `App.tsx` line 125 `useState<PracticeId>`, not user free-text |
| T-32-05 | Tampering | accept | CLOSED | See accepted risks log below — all pt-BR values are static authored `as const` constants; template functions bind typed numeric/string args only |
| T-32-06 | Repudiation | mitigate | CLOSED | `content.no-review-markers.test.ts` fs-scan present and scoped to all non-test `.ts` files in `src/content/`; grep confirms zero `// TODO: native-speaker review` markers remain in `learnContent.ts` or `strings.ts` after Plan 03 operator checkpoint |

**Threats Closed: 6/6**

---

## Accepted Risks Log

### T-32-02 — Information Disclosure: `<a>` link rendering (Plan 01 scope)

**Accepted by:** Threat register (register_authored_at_plan_time: true)
**Rationale:** Plan 01 (wave 1) adds only static data — the `PracticeLearnContent` interface and the `practices` map in `learnContent.ts`. No rendering code is introduced in Plan 01. No PII, credentials, or secrets appear in `learnContent.ts`. The `as const satisfies Readonly<Record<LocaleId, LearnContent>>` constraint prevents runtime mutation. Link-attribute hardening (`target/_blank`/`rel`) is addressed in T-32-03 (Plan 02).
**Residual risk:** None — static data file with no untrusted input paths.

### T-32-04 — Tampering: `activePractice` prop value

**Accepted by:** Threat register (register_authored_at_plan_time: true)
**Rationale:** `activePractice` is a `PracticeId` union type (`'resonant' | 'naviKriya'`) enforced by TypeScript at compile time. It originates from `App.tsx` `useState<PracticeId>` (line 125) — not from user free-text, URL parameters, or any external input. `practices[activePractice]` access is exhaustive over the two-member union; TypeScript would reject any out-of-union value. No runtime type guard is needed given the compile-time constraint and static origin.
**Residual risk:** Negligible — union is closed, originating state is internal.

### T-32-05 — Tampering: pt-BR string values in `strings.ts` / `learnContent.ts`

**Accepted by:** Threat register (register_authored_at_plan_time: true)
**Rationale:** All pt-BR copy is static authored content compiled into the bundle via `as const satisfies` constraints. No user input is interpolated into these strings at runtime. Template-function strings (e.g. `practice.resetStatsTitle`, `nkControls.estimatedDuration`) accept only typed numeric/string arguments bound at call sites — not user free-text. The operator reviewed all 38 v1.5 pt-BR strings in Plan 03 Task 1 before markers were removed (D-10 protocol). No injection vector exists.
**Residual risk:** None — fully static authored data.

---

## Unregistered Flags

None. All three SUMMARY.md files (`32-01-SUMMARY.md`, `32-02-SUMMARY.md`, `32-03-SUMMARY.md`) report no new threat surface. No unregistered flags from implementation.
