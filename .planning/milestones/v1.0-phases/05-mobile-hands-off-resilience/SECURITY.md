# SECURITY.md — Phase 5: mobile-hands-off-resilience

**Audit date:** 2026-05-10
**ASVS Level:** L1 (browser-API local-only project, no auth, no network, no storage of user data)
**block_on:** open_high

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-05-01 | Tampering | accept | CLOSED | `vitest.setup.ts:209` — `if (typeof navigator !== 'undefined' && !('wakeLock' in navigator))`. Conditional gate present; test-only file never reaches production bundle. |
| T-05-02 | Information Disclosure | accept | CLOSED | `vitest.setup.ts:215-221` — `release()` body dispatches `new Event('release')` only; no network call, no PII, no external I/O. |
| T-05-03 | Elevation of Privilege | accept | CLOSED | `vitest.setup.ts:210-222` — `FakeWakeLockSentinel extends EventTarget` implements only W3C surface (`request`, `release`, `'release'` event); cannot keep a real screen awake. |
| T-05-04 | Information Disclosure | mitigate | CLOSED | `src/hooks/useWakeLock.ts:55` — `} catch {` (bare, no `err` binding). `src/hooks/useWakeLock.ts:71` — `} catch {` (bare). `grep "err\b"` returns only a comment string (`// Bare catch — no err.name branching`), zero live bindings. No `console.warn`/`console.error` call present anywhere in the file. |
| T-05-05 | Denial of Service | accept | CLOSED | `src/hooks/useWakeLock.ts:39` — `if (sentinelRef.current !== null) return`. D-08 idempotency guard present; concurrent `request()` flood bounded to one in-flight call. |
| T-05-06 | Tampering | mitigate | CLOSED | `src/hooks/useWakeLock.ts:50` — `if (sentinelRef.current === sentinel)`. Identity guard inside the `'release'` listener exactly matches the stated mitigation. |
| T-05-07 | Spoofing | accept | CLOSED | Accepted per plan. Re-request routes through `navigator.wakeLock.request('screen')` which is subject to browser policy; worst-case is one silently-absorbed call. No documentation gap. |
| T-05-08 | Tampering | mitigate | CLOSED | `src/app/App.tsx:129-130` — `const wakeLockRequest = wakeLock.request` / `const wakeLockRelease = wakeLock.release`. Hoisted before dep arrays; `wakeLockRelease` appears in cleanup-effect dep array at `App.tsx:356`. |
| T-05-09 | Information Disclosure | mitigate | CLOSED | `src/app/App.wakeLock.test.tsx:168` — `expect(screen.queryByText(/wake[- ]?lock/i)).not.toBeInTheDocument()`. Test 6 (nested silent-fallback describe) explicitly asserts no wake-lock UI text rendered. |
| T-05-10 | Denial of Service | accept | CLOSED | Accepted per plan. D-08 idempotency in hook + `appPhase` state-machine guard in `App.tsx` already present for audio (parallel pattern). |
| T-05-11 | Repudiation | mitigate | OPEN (LOW) | `05-04-UAT-LOG.md` is committed (git: `bb157c4`). Tester name (`Renato Lucindo`), date (`2026-05-10`), and build commit (`9d11af8`) are present at lines 82-84. **However:** frontmatter `signed_off: false` and `gating_gap: S2`. The log documents an incomplete sign-off — S2 (Android Chrome) was not run. The mitigation structure (name+date+commit) is present, but the log is explicitly not fully signed off. Classified LOW: the format and audit trail are intact; only one scenario is missing. Not a high-severity blocker per `block_on: open_high`. |
| T-05-12 | Information Disclosure | accept | CLOSED | Local-only project; UAT log device metadata is operational data confined to `.planning/`; no external sharing. |

---

## Accepted Risks Log

| Threat ID | Accepted Risk | Rationale |
|-----------|---------------|-----------|
| T-05-02 | Fake sentinel dispatches synthetic events in test env | No PII, no network; test-process-only |
| T-05-03 | Polyfill exposes W3C surface in jsdom that host lacks | Behavior stub only; no real screen-awake capability |
| T-05-05 | No rate-limit beyond ref-guard on `request()` | Single in-flight guard is sufficient for this local app |
| T-05-07 | Synthetic `visibilitychange` triggers re-request | Browser-policy gated; worst case is one absorbed call |
| T-05-10 | Repeated Start clicks can call `request()` | Two-layer guard (hook idempotency + appPhase) bounds this |
| T-05-12 | UAT log contains device model and OS version | Local project, no PII definition, no external sharing |

---

## Unregistered Flags

None. SUMMARY.md `## Threat Flags` sections for Plans 01, 02, and 03 all explicitly record "None." No unregistered attack surface was introduced.

---

## Summary

- **threats_total:** 12
- **closed:** 11
- **open:** 1 (T-05-11, LOW severity)

---

## OPEN_THREATS

**Phase:** 5 — mobile-hands-off-resilience
**Closed:** 11/12 | **Open:** 1/12
**ASVS Level:** L1

### Open

| Threat ID | Category | Mitigation Expected | Gap | Files Searched |
|-----------|----------|---------------------|-----|----------------|
| T-05-11 | Repudiation | UAT log signed off with tester+date+commit, committed to git | `signed_off: false` in frontmatter; `gating_gap: S2 (Android Chrome real-device coverage)`. Log is committed and partially populated but S2 (Android Chrome 10-min screen-awake) was not run. The log itself documents this as a gating gap and states Phase 5 must NOT be marked complete until resolved. | `.planning/phases/05-mobile-hands-off-resilience/05-04-UAT-LOG.md` |

**Severity assessment:** LOW. The audit trail format is intact (name, date, commit hash committed to git). The gap is a missing real-device test result, not a missing log or missing identity. Per `block_on: open_high`, this does not gate phase advancement.

**Recommended remediation:** Run UAT Scenario 2 (Android Chrome, 10-min timed session) and Scenario 3 (lock/unlock re-acquire) on an Android Chrome device; append results to `05-04-UAT-LOG.md`; flip `signed_off: true`. Can use BrowserStack or a borrowed device.
