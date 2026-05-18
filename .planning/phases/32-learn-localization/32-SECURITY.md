---
phase: 32
slug: learn-localization
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-17
---

# Phase 32 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| App → YouTube (external links) | The two Navi Kriya video `<a>` links navigate the user to youtube.com in a new tab | Static authored URLs — no PII |
| App → external sites (Learn links) | Every Learn link `<a>` navigates the user to a third-party origin in a new tab | Static authored URLs — no PII |
| Authored content → runtime UI | All v1.5 pt-BR copy is static authored data compiled into the bundle | No user input crosses in |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-32-01 | Tampering | `learnContent.ts` external video URLs | mitigate | URLs are `as const` static literals; D-06 fixed order verified (`M3t7gY_yak8` then `A4BGQCIp9fI`); no interpolation, no user input | closed |
| T-32-02 | Information Disclosure | `<a>` link rendering (Plan 01 scope) | accept | Plan 01 adds pure static data — no rendering code, no PII, no secrets in `learnContent.ts` | closed |
| T-32-03 | Information Disclosure | NK video `<a>` elements (reverse-tabnabbing / referrer leak) | mitigate | Every `<a>` in `LearnDialog.tsx` carries `target="_blank" rel="noopener noreferrer"`; NK video `map()` applies both attrs; parameterized every-`<a>` sweep test for `activePractice='naviKriya'` | closed |
| T-32-04 | Tampering | `activePractice` prop value | accept | `activePractice` typed as `PracticeId` union (`'resonant'\|'naviKriya'`), sourced from `App.tsx` `useState<PracticeId>` — not user free-text | closed |
| T-32-05 | Tampering | pt-BR string values in `strings.ts` / `learnContent.ts` | accept | All copy is `as const` static authored constants, operator-reviewed; template functions bind typed args only, no untrusted interpolation | closed |
| T-32-06 | Repudiation | Review-marker removal without operator sign-off | mitigate | `content.no-review-markers` fs-scan test enforces zero `// TODO: native-speaker review` markers survive; markers removed only after the Task 1 operator checkpoint | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-32-01 | T-32-02 | Plan 01 is pure static-content data — no rendering code, no PII, no secrets in `learnContent.ts`. Link-attribute hardening is delivered under T-32-03. | operator | 2026-05-17 |
| R-32-02 | T-32-04 | `activePractice` is a TypeScript `PracticeId` union sourced from typed `App.tsx` state, not user free-text; `practices[activePractice]` access is exhaustive over the union. | operator | 2026-05-17 |
| R-32-03 | T-32-05 | All pt-BR copy is static authored constants reviewed by the operator; template-function strings use fixed placeholders bound to typed args, no user free-text. | operator | 2026-05-17 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-17 | 6 | 6 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-17
