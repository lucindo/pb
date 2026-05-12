---
phase: 8
slug: storage-forward-compat-cross-tab-ui-sync
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-11
verified: 2026-05-12
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x (jsdom env) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/storage/storage.test.ts src/app/App.persistence.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~6 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run quick command for the touched test file(s)
- **After every plan wave:** Run full suite (`npx vitest run`)
- **Before `/gsd-verify-work`:** Full suite must be green at 365 (or 366 if optional key-filter test added)
- **Max feedback latency:** ~6 seconds (full suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | STORAGE-01 | — | `readEnvelope` preserves on-disk numeric `version`; top-level forward-compat fields survive round-trip | unit | `npx vitest run src/storage/storage.test.ts` | ✅ | ✅ green |
| 08-01-02 | 01 | 1 | STORAGE-02 | — | `writeEnvelope` returns void / leaves disk untouched when on-disk `version > STATE_VERSION`; silent (no console.warn) | unit | `npx vitest run src/storage/storage.test.ts` | ✅ | ✅ green |
| 08-02-01 | 02 | 2 | STORAGE-03 | — | App `storage` event listener calls `setStats(loadStats())` only when `e.key === STATE_KEY`; cleanup on unmount | unit (jsdom) | `npx vitest run src/app/App.persistence.test.tsx` | ✅ | ✅ green |
| 08-02-02 | 02 | 2 | STORAGE-03 | — | Manual two-window cross-tab UI refresh stays consistent | manual | (see Manual-Only Verifications) | n/a | ✅ green (08-HUMAN-UAT.md status: complete) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* `vitest` is already installed; `src/storage/storage.test.ts` and `src/app/App.persistence.test.tsx` already exist. No new test scaffolding.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-tab stats refresh integrated UI flow | STORAGE-03 | jsdom synthetic `StorageEvent` proves the listener wiring but not real browser cross-tab delivery | 1) `npm run dev`; open app in two browser windows side-by-side. 2) In window A, complete one breathing session so `totalSessions` increments. 3) Observe window B's stats footer — counter must update without window B being focused or reloaded. 4) Repeat with reset action in window A; window B stats footer must drop to zero. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (N/A — none required)
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-12

---

## Validation Audit 2026-05-12

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Retroactive audit at HEAD (commit 172f1eb). Phase 8 shipped per 08-VERIFICATION.md (status: passed, score: 12/12). All 3 REQ-IDs (STORAGE-01/02/03) have automated vitest coverage; +3 cases delivered (363 → 366 baseline). The cross-tab manual gate (08-HUMAN-UAT.md) is `status: complete, passed: 1`. Full suite at HEAD: 400/400. nyquist_compliant flipped true; status flipped verified.
