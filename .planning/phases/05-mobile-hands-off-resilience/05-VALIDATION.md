---
phase: 5
slug: mobile-hands-off-resilience
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-10
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + @testing-library/react 16.3.2 + jsdom 29.1.1 |
| **Config file** | `vite.config.ts` (test config inlined; `setupFiles: './vitest.setup.ts'`) |
| **Quick run command** | `npm run test:run -- src/hooks/useWakeLock.test.tsx` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~1–2s quick · ~10–15s full (per Phase 1–4 baseline) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run -- src/hooks/useWakeLock.test.tsx` (and `src/app/App.wakeLock.test.tsx` once it exists)
- **After every plan wave:** Run `npm run test:run` (full suite — confirms Phase 1–4 tests still pass after Phase 5 wiring)
- **Before `/gsd-verify-work`:** Full suite green AND manual UAT checklist signed off
- **Max feedback latency:** ~2s (quick) · ~15s (full)

---

## Per-Task Verification Map

> Filled in by planner during plan generation. Each PLAN.md task must reference back to a row here, or to a Wave 0 dependency.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _TBD_ | _TBD_ | 0 | MOBL-02 | — | Polyfill present in `vitest.setup.ts`; full suite green pre-implementation | unit (smoke) | `npm run test:run` | ❌ W0 | ⬜ pending |
| _TBD_ | _TBD_ | 1 | MOBL-02 | — | `request()` calls `navigator.wakeLock.request('screen')` once when supported | unit (hook) | `npm run test:run -- src/hooks/useWakeLock.test.tsx -t "request acquires"` | ❌ W0 | ⬜ pending |
| _TBD_ | _TBD_ | 1 | MOBL-02 | — | `request()` silently absorbs absent API + `NotAllowedError` rejection (D-09) | unit (hook) | `npm run test:run -- src/hooks/useWakeLock.test.tsx` | ❌ W0 | ⬜ pending |
| _TBD_ | _TBD_ | 1 | MOBL-02 | — | `release()` idempotent when no sentinel held (D-08) | unit (hook) | same | ❌ W0 | ⬜ pending |
| _TBD_ | _TBD_ | 1 | MOBL-02 | — | Sentinel `'release'` event clears `sentinelRef`, NOT `wasAcquiredRef` (D-04) | unit (hook) | same | ❌ W0 | ⬜ pending |
| _TBD_ | _TBD_ | 1 | MOBL-02 | — | `visibilitychange→visible` re-requests when `wasAcquired=true` and no sentinel (D-03) | unit (hook) | same | ❌ W0 | ⬜ pending |
| _TBD_ | _TBD_ | 1 | MOBL-02 | — | `visibilitychange` re-acquire failure absorbed; `wasAcquired` stays true (D-05) | unit (hook) | same | ❌ W0 | ⬜ pending |
| _TBD_ | _TBD_ | 1 | MOBL-02 | — | Unmount with sentinel held releases the sentinel (leak guard) | unit (hook) | same | ❌ W0 | ⬜ pending |
| _TBD_ | _TBD_ | 2 | MOBL-02 | — | App `onStartClick` triggers `wakeLock.request` once (SC1) | integration (App) | `npm run test:run -- src/app/App.wakeLock.test.tsx` | ❌ W0 | ⬜ pending |
| _TBD_ | _TBD_ | 2 | MOBL-02 | — | App on `state.status` exit-of-running triggers `release` (SC3, D-07) | integration (App) | same | ❌ W0 | ⬜ pending |
| _TBD_ | _TBD_ | 2 | MOBL-02 | — | App on `complete` triggers `release` (SC3) | integration (App) | same | ❌ W0 | ⬜ pending |
| _TBD_ | _TBD_ | 2 | MOBL-02 | — | App on cancel-during-lead-in triggers `release` (D-07) | integration (App) | same | ❌ W0 | ⬜ pending |
| _TBD_ | _TBD_ | 2 | MOBL-02 | — | App on modal-confirm End triggers `release` | integration (App) | same | ❌ W0 | ⬜ pending |
| _TBD_ | _TBD_ | 2 | MOBL-02 | — | Silent fallback: App start succeeds with `navigator.wakeLock` deleted (D-09) | integration (App) | same | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.setup.ts` — extend with `navigator.wakeLock` polyfill (D-13). Conditional `Object.defineProperty(navigator, 'wakeLock', { writable: true, configurable: true, value: <fake> })`. Fake `WakeLockSentinel` extends `EventTarget` so `addEventListener('release', ...)` fires when `release()` is called.
- [ ] **Pre-implementation smoke** — after polyfill is added but BEFORE hook code, run `npm run test:run` and confirm 0 regressions. Mitigates RESEARCH risks A3/A4 (carry-forward integration risk on Phase 1–4 tests).
- [ ] `src/hooks/useWakeLock.test.tsx` — stub file covering MOBL-02 hook-level behaviors above.
- [ ] `src/app/App.wakeLock.test.tsx` — stub file covering MOBL-02 App-integration behaviors above (planner discretion: SEPARATE file recommended for diff-locality vs folding into `App.audio.test.tsx`).
- [ ] **No framework install needed** — Vitest, RTL, jsdom already present.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual screen stays awake on real iOS Safari 16.4+ during a 60-min session | MOBL-02 (SC2) | jsdom has no display, no auto-lock; polyfill is a stub. Only real device exercises OS auto-lock layer. | Real iOS 16.4+ device. Start a 10-min timed session, leave phone face-up untouched. Confirm screen does not auto-lock for the full 10 min. |
| Actual screen stays awake on real Android Chrome during a 60-min session | MOBL-02 (SC2) | Same as above. | Real Android device with Chrome. Start a 10-min timed session, leave phone face-up untouched. Confirm screen does not auto-lock. |
| Phone-lock during session, then unlock → screen stays on after unlock (D-03 re-acquire) | MOBL-02 (SC2) | Synthetic `visibilitychange` events in tests cannot prove the OS-level lock release on tab-hide and re-acquire on tab-show actually keep the screen awake post-unlock. | Real iOS/Android. Start a session, lock the phone manually, wait 30s, unlock. Confirm screen stays awake for the rest of the session. |
| No console errors / no user-visible artifact on Firefox <126 or any rejection path (D-09) | MOBL-02 (SC1, silent fallback) | Manual visual + DevTools inspection on a downlevel browser, OR force-disabled flag. | Desktop Firefox 126+: start a session, confirm no console errors. Toggle `dom.screenwakelock.enabled=false`, restart, confirm no UI artifact. |
| Battery-low / Power-saver-on rejection path | MOBL-02 (D-09) | Browser may revoke a granted lock when battery is low; cannot simulate in test environment. | Acceptable to leave unverified in v1 — hook treats revocation as "lock revoked → silently absorbed" via the same code path as any other rejection. Trust unit test of rejection handler. |
| Visual confirmation: no Wake-Lock UI appears anywhere | MOBL-02 (D-10, D-12) | UI is intentionally absent; verifying absence is a manual visual sweep. | Run dev server, exercise Start / End / lead-in cancel / complete paths. Confirm no badge, banner, toast, or icon references Wake Lock state. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`useWakeLock.test.tsx`, `App.wakeLock.test.tsx`, `vitest.setup.ts` polyfill)
- [ ] No watch-mode flags (`npm run test:run` is non-watch by project convention)
- [ ] Feedback latency < 15s (full suite)
- [ ] Manual UAT checklist signed off before `/gsd-verify-work`
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
