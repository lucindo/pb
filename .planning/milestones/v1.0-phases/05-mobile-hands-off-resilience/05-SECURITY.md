---
phase: 05
slug: mobile-hands-off-resilience
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-10
---

# Phase 05 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Phase 5 wires the Wake Lock API into the breathing-session flow via a new
`useWakeLock` hook (Plans 01–03) plus a manual UAT gate (Plan 04). Attack
surface added by this phase is effectively zero: no network, no storage,
no auth, no PII, no user-supplied input, no rendered UI string. Threats
are defensive coding patterns rather than real-world attack vectors.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Test environment ↔ jsdom navigator | Polyfill modifies a host-supplied global. No untrusted input — value is a static fake under our control. | None (test-only) |
| Component ↔ DOM API (`navigator.wakeLock.request`) | Browser-supplied API call. Returns `WakeLockSentinel` or rejects. Hook treats both outcomes as expected. | None (no payload) |
| Component ↔ DOM events (`document.visibilitychange`, `WakeLockSentinel.'release'`) | Browser-dispatched events. Order-independent guards handle spec ambiguity. | None (no payload) |
| User gesture (click) ↔ App state machine | Click handler invokes `wakeLock.request()` from a user-trusted gesture chain (D-01). | None |
| App.tsx state.status transition ↔ cleanup effect | React state owned by `useSessionEngine`; documented "subscribe to external state" pattern. Single-write release site per D-07. | None |
| Real device hardware ↔ Wake Lock OS layer | Real OS implements actual screen-awake behavior. Tester is the trust anchor for Plan 04 manual UAT. | None |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-05-01 | Tampering | `vitest.setup.ts` polyfill install | accept | Test-only file gated by `if (!('wakeLock' in navigator))`; verified at `vitest.setup.ts:209`. Not shipped to production bundle. | closed |
| T-05-02 | Information Disclosure | Fake sentinel `release()` body | accept | Synthetic `'release'` event only; no PII, no network, no I/O. Verified `vitest.setup.ts:215-221`. | closed |
| T-05-03 | Elevation of Privilege | Polyfill granting capabilities host lacks | accept | Behavior stub only — implements only W3C-spec surface. Cannot keep a real screen awake. Verified `vitest.setup.ts:210-222`. | closed |
| T-05-04 | Information Disclosure | request/release silent-catch branches | mitigate | Bare `catch {}` with zero `err` binding; no `console.warn`/`console.error`. Verified `useWakeLock.ts:55,71`. | closed |
| T-05-05 | Denial of Service | Repeated `request()` in tight loop | accept | D-08 idempotency guard `if (sentinelRef.current !== null) return`. Verified `useWakeLock.ts:39`. | closed |
| T-05-06 | Tampering | Match-pair sentinel guard | mitigate | Identity guard `if (sentinelRef.current === sentinel)` inside release listener. Verified `useWakeLock.ts:50`. | closed |
| T-05-07 | Spoofing | Synthetic visibilitychange events from page-internal scripts | accept | Re-request routes through real `navigator.wakeLock.request('screen')`; browser-policy gated. Worst case: one extra silently-absorbed `request()` call. | closed |
| T-05-08 | Tampering | Cleanup effect dep array stability | mitigate | Hoisted stable refs (`const wakeLockRequest`/`wakeLockRelease`) prevent re-fire. Verified `App.tsx:129-130` + dep array `App.tsx:356`. | closed |
| T-05-09 | Information Disclosure | App-integration silent-fallback path | mitigate | `App.wakeLock.test.tsx:168` asserts `expect(screen.queryByText(/wake[- ]?lock/i)).not.toBeInTheDocument()` (Test 6). Combined with D-10/D-12 zero-UI policy and D-09 silent-catch contract. | closed |
| T-05-10 | Denial of Service | Repeated Start clicks → `request()` | accept | D-08 hook idempotency + `appPhase` state-machine guard already enforced for audio (`if (appPhase !== 'idle') return`). | closed |
| T-05-11 | Repudiation | Manual UAT sign-off | mitigate | UAT log present at `.planning/phases/05-mobile-hands-off-resilience/05-04-UAT-LOG.md`; tester (Renato Lucindo), date (2026-05-10), build commit (`9d11af8`); committed to git as `bb157c4`. Audit-trail format intact. **See Accepted Risks below — content gap (S2 Android scenario not run) is documented as a known LOW-severity risk pending the same physical-device blocker as UAT Test 3.** | closed (accepted) |
| T-05-12 | Information Disclosure | UAT device metadata | accept | Local-only project; `.planning/` not externally shared; no PII in device-model strings. | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-05-01 | T-05-11 (LOW) | UAT log structure and tester identity are intact (committed `bb157c4`); the residual repudiation risk is bounded to the missing S2 Android scenario row, not to a missing log or unauditable record. The S2 gap is tracked as `blocked_by: physical-device` in `05-UAT.md` Test 3 and as Gap 1 in `05-04-UAT-LOG.md`. Severity LOW; per `block_on: open_high` policy, not phase-gating. Risk closes automatically when an Android Chrome run is appended to the UAT log and `signed_off: true` is set in frontmatter. | Renato Lucindo | 2026-05-10 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-10 | 12 | 12 | 0 | gsd-security-auditor (sonnet) + user disposition for T-05-11 |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-10
