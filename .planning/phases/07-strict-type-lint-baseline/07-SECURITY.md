---
phase: 7
slug: strict-type-lint-baseline
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-11
---

# Phase 7 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| (none introduced) | Phase 7 modifies only build-toolchain config (tsconfig.app.json, tsconfig.node.json, eslint.config.js), production-source type-signature annotations + template-literal/JSX hygiene + isolated rule fires (no behavior change), test-only narrowing/typing, and three comment-only `// Reason:` annotations. No new endpoints, no new auth/authz logic, no new data flows, no new runtime dependencies. | n/a |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-07-01-01 | (n/a) | tsconfig.app.json + tsconfig.node.json + 4 test files | accept | Config-only strict-flag enablement + test-file inline type narrowing. Dev-only `typescript` / `typescript-eslint` deps already installed. Behavior-preservation invariant D-08/D-09 enforced by full Vitest suite (363/363) at the commit boundary. | closed |
| T-07-02-01 | (n/a) | eslint.config.js + 16 production source files (interface signatures + template-literal/JSX hygiene) | accept | Dev-only ESLint preset swap to `strictTypeChecked` + `this: void` annotations + `String()` / `.toFixed()` template hygiene + JSX void-handler wrappers. Indirect security tightening: `no-misused-promises` forces explicit `void` markers on intentional fire-and-forget JSX handlers — no silent unhandled-rejection paths. Behavior-preservation invariant D-08/D-09 enforced by full Vitest suite (363/363) at every commit boundary. | closed |
| T-07-03-01 | (n/a) | 7 production source files (isolated rule fires) + ~9 test/setup files (bulk pattern fixes) + App.tsx (stale-disable removal + 1-line deps fix) | accept | All production fixes preserve runtime semantics: WebKit casts kept-and-annotated, defensive optional chains kept-and-annotated, dead SSR guards removed in verified SPA context, definite-assignment refactor preserves catch-return contract, `main.tsx` null-check throws a descriptive error in place of silent null-deref. Indirect security tightening: every surviving `!` is now traceable to a documented `// Reason:` invariant; `no-unsafe-member-access` enforcement on `JSON.parse` results in tests prevents type confusion in fixtures. Behavior-preservation invariant D-08/D-09 enforced by full Vitest suite (363/363) at every commit boundary. | closed |
| T-07-04-01 | (n/a) | eslint.config.js + src/app/App.tsx + src/hooks/usePrefersReducedMotion.ts | accept | Config-only rule-severity override (`react-hooks/exhaustive-deps` → error) plus three comment-only `// Reason:` annotation lines on existing or new `eslint-disable-next-line react-hooks/*` directives. Comment-only changes cannot alter runtime semantics. Dev-only `eslint-plugin-react-hooks` already installed. Behavior-preservation invariant D-08/D-09 enforced by full Vitest suite (363/363) at the commit boundary. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-07-01 | T-07-01-01 | No runtime threat surface — strict-mode tsconfig flag enablement + test-only inline type narrowing. Dev-only toolchain deps unchanged in runtime bundle. | Phase 7 plan author + executor (D-08/D-09 quad-green at commit boundary) | 2026-05-11 |
| R-07-02 | T-07-02-01 | No runtime threat surface — dev-only ESLint preset upgrade + behavior-preserving type-signature + template-literal/JSX hygiene fixes. Net security posture improves (explicit `void` on fire-and-forget JSX handlers). | Phase 7 plan author + executor (D-08/D-09 quad-green at every task commit) | 2026-05-11 |
| R-07-03 | T-07-03-01 | No runtime threat surface — isolated rule fires are behavior-preserving (annotations, dead-code removal in SPA, refactors that preserve contracts). Net security posture improves (every surviving `!` documented; test-fixture type confusion blocked). | Phase 7 plan author + executor (D-08/D-09 quad-green at every task commit; `npm run lint` exits 0 at plan close) | 2026-05-11 |
| R-07-04 | T-07-04-01 | No runtime threat surface — one ESLint rule-severity entry + three `// Reason:` comments. Comment-only edits cannot alter runtime behavior. Net security posture improves (react-hooks/exhaustive-deps now hard-enforced as error). | Phase 7 plan author + executor (D-08/D-09 quad-green at commit boundary) | 2026-05-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-11 | 4 | 4 | 0 | /gsd-secure-phase (short-circuit: register_authored_at_plan_time=true, all dispositions=accept) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-11
