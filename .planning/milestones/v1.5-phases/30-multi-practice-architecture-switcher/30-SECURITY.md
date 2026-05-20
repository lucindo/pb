---
phase: 30-multi-practice-architecture-switcher
audit_date: 2026-05-17
asvs_level: 1
threats_total: 12
threats_closed: 12
threats_open: 0
result: SECURED
---

# Phase 30 Security Audit

## Summary

**Phase:** 30 — Multi-Practice Architecture & Switcher
**ASVS Level:** 1
**Threats Closed:** 12/12
**Threats Open:** 0

All declared mitigations verified present in implemented code. No open threats. Phase may ship.

---

## Threat Verification

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-30-01 | Tampering | mitigate | `isValidFrontCount` in `src/domain/naviKriyaSettings.ts:22-28` enforces `typeof number && Number.isFinite && Number.isInteger && v > 0 && v % 4 === 0`; regression case `isValidFrontCount(102) === false` unit-tested at `src/domain/naviKriyaSettings.test.ts:16-18`. |
| T-30-02 | Tampering | accept | Low-risk display/loop counts; predicates `isValidRounds` / `isValidOmLength` reject malformed input at `src/domain/naviKriyaSettings.ts:30-40`. ASVS V5 coercer boundary satisfied in plan 30-03. Accepted per rationale: no injection surface, no arithmetic consequence. |
| T-30-03 | Tampering | mitigate | `disabled={disabled}` on each `<button>` in `src/components/PracticeToggle.tsx:58` is the real interaction lock. Unit test `"when disabled=true clicking a button does NOT call onSwitch"` at `src/components/PracticeToggle.test.tsx:113-127` confirms click cannot fire `onSwitch`. |
| T-30-04 | Information disclosure | accept | Strings are static UI copy with no user data or secrets (`src/content/strings.ts`). No disclosure risk. Accepted: no personal data or secrets in copy catalog. |
| T-30-05 | Tampering | mitigate | Prototype-pollution-safe `asRecord` guard at `src/storage/practices.ts:38-42` (`raw !== null && typeof raw === 'object' && !Array.isArray(raw)`, else `{}`). Used in `coercePractices` (line 86), `coerceNaviKriyaSettings` (line 51), `coercePracticeSlice` (line 78). Non-throwing per-field fallback. Unit-tested with null/array/non-object at `src/storage/practices.test.ts:108-113`. |
| T-30-06 | Tampering | mitigate | `coerceNaviKriyaSettings` at `src/storage/practices.ts:59-62` rounds tampered `frontCount` down via `Math.floor(fc/4)*4`; keeps only if `> 0`, else falls back to default. Explicit 90→88 case unit-tested at `src/storage/practices.test.ts:76`. |
| T-30-07 | Tampering / data integrity | mitigate | `migrateEnvelope` at `src/storage/storage.ts:90-107` implements `if (fromVersion < 2)` guard (idempotent) and preserves flat `settings`/`stats` as orphaned fields (lossless). Migration path unit-tested at `src/storage/storage.test.ts:143`; idempotency at line 180. Full path through `loadPractices()` tested at `src/storage/practices.test.ts:241-258`. |
| T-30-08 | Repudiation | mitigate | `recordResonantSession` at `src/storage/practices.ts:128-158` reads/writes `practices.resonant.stats` exclusively. Unit test at `src/storage/practices.test.ts:186-193` asserts `map.naviKriya.stats` equals `ZERO_STATS` after recording. |
| T-30-09 | Tampering | mitigate | `onSwitchPractice` at `src/app/App.tsx:340-344` contains `if (inSessionView) return` as defense-in-depth behind `PracticeToggle disabled`. Both layers verified in code. |
| T-30-10 | Tampering / data integrity | mitigate | Cross-tab `storage` event listener at `src/app/App.tsx:171-183` calls `loadPractices()` and refreshes both `setResonantStats` and `setNaviKriyaStats`. The orphaned flat `env.stats` is never read. |
| T-30-11 | Repudiation | mitigate | `confirmReset` at `src/app/App.tsx:549-560` calls `resetPracticeStats(activePractice)` and updates only the active slice (`setResonantStats` or `setNaviKriyaStats`). The other practice's state is untouched. |
| T-30-12 | Denial of service | accept | Static client-only PWA; no runtime DoS surface. Build regression caught by Task 2 verify gate (`npm run build`). Accepted: no server or network component; build failure is a developer-time gate, not a runtime risk. |

---

## Accepted Risks Log

| Threat ID | Risk | Rationale | Owner |
|-----------|------|-----------|-------|
| T-30-02 | Tampering — malformed `isValidRounds`/`isValidOmLength` input | Values are display/loop counts with no injection surface; ASVS V5 coercer boundary validates them at the storage layer (plan 30-03). No arithmetic consequence that could affect session safety. | Phase 30 |
| T-30-04 | Information disclosure — practice copy strings | All strings are static UI copy authored at build time. No user data, no secrets, no PII. | Phase 30 |
| T-30-12 | Denial of service — build regression | Static PWA with no server/backend. A broken build cannot create a runtime DoS. The Task 2 verify gate (`npm run build`) detects build failures before the phase closes. | Phase 30 |

---

## Threat Flags from SUMMARY.md

| Source | Flag | Mapping |
|--------|------|---------|
| 30-01-SUMMARY.md | None declared | — |
| 30-02-SUMMARY.md | None declared | — |
| 30-03-SUMMARY.md | None declared | — |
| 30-04-SUMMARY.md | None declared | — |

No unregistered threat flags. No new attack surface appeared during implementation that lacks a threat mapping.

---

## Unregistered Flags

None.

---

*Audit performed: 2026-05-17*
*Auditor: gsd-security-auditor (claude-sonnet-4-6)*
