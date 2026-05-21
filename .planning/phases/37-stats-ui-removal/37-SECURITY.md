---
phase: 37
slug: stats-ui-removal
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-20
mode: retroactive-stride
register_authored_at_plan_time: false
---

# Phase 37 — Security

> Retroactive STRIDE audit. Plans had no `<threat_model>` block; all three SUMMARY.md files
> self-flagged "no new network endpoints, auth paths, file access patterns, or schema changes."
> The register was constructed from implementation files and the diff range 080b7e2..421fa58.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser / localStorage | App reads and writes `hrv:state:v1` JSON blob via `window.localStorage` | Per-practice stats (session counts, elapsed seconds, last-session timestamp), settings, prefs. No PII beyond timestamps. |
| Tab / Tab (cross-tab) | The STORAGE-03 `storage` event listener was the only cross-tab sync surface | Stats counters (now removed). Settings cross-tab sync remains via existing CustomEvent pattern, unchanged by this phase. |
| Source / Bundle | Vitest fs-scan drift-guard reads `src/components/`, `src/app/`, `src/content/` at CI time | Source file contents (static analysis only — no runtime boundary). |

---

## STRIDE Register

### Construction Methodology

Phase 37 is a pure deletion phase. Standard STRIDE categories were evaluated against the diff:

- **Spoofing** — No auth paths exist in this codebase (PWA, no backend). Deletion does not add auth surface. Not applicable.
- **Tampering** — Removing the reset affordance changes what state users can exit. Assessed below.
- **Repudiation** — Removing per-practice stats state from App.tsx changes what audit data is visible. Assessed below.
- **Information Disclosure** — Deleting components could accidentally expose previously-gated data to render paths. Assessed below.
- **Denial of Service** — Removing the cross-tab storage-event listener changes cross-tab behavior. Assessed below.
- **Elevation of Privilege** — No privilege model exists in this app. Not applicable.

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-37-01 | Tampering | `src/storage/practices.ts` | mitigate | Envelope-invariant: `recordXSession` functions preserve write semantics after `resetPracticeStats` deletion; STATS-04 regression locks this | closed |
| T-37-02 | Tampering | `src/app/App.tsx` | mitigate | Per-practice stats useState removed safely; WR-07 single-read pattern in `stats.ts` means disk persistence does not depend on React state mirror | closed |
| T-37-03 | Tampering | `src/storage/storage.ts` | accept | `STATE_VERSION` not bumped — envelope shape at rest is unchanged; only the UI consumer is removed. Accepted: no migration is needed because no schema change occurred. | closed |
| T-37-04 | Information Disclosure | `src/storage/practices.ts` | mitigate | Removing `resetPracticeStats` eliminates the only function that wrote `ZERO_STATS` into the stats slice on user command; existing per-session accumulation is preserved with no new data fields | closed |
| T-37-05 | Information Disclosure | `src/content/strings.ts` | mitigate | Stats-shaped i18n keys (`stats`, `resetStatsDialog`, `practice.resetStatsTitle`) deleted from type AND both locale catalogs; orphan WR-01 keys (`naviKriyaStatsEmptyBody`, `naviKriyaControlsPlaceholder`) also deleted in commit a63dae3 | closed |
| T-37-06 | Information Disclosure | `src/content/strings.ts` | accept | Two stale code comments at strings.ts L303 and L465 reference "reset dialog" as prose inside a `//` comment. These are not exported keys, are not consumed by any renderer, and are not scanned by the drift-guard token set. Risk: negligible — comment-only, not data-at-rest or user-visible. Accepted as minor comment debt. | closed |
| T-37-07 | Repudiation | `src/app/App.tsx` | accept | Removing `activeStats` React state and the per-practice stats useState means the running app no longer holds a live mirror of cumulative stats in RAM. Disk truth (`localStorage`) is still written by `recordXSession` on each session end. No audit-trail regression — disk persistence is intact. Accepted: the app had no server-side audit trail to begin with; localStorage is the only record and remains. | closed |
| T-37-08 | Denial of Service | `src/app/App.tsx` | mitigate | The STORAGE-03 `window.addEventListener('storage', ...)` listener was deleted. Confirmed no non-stats consumer (the only writes were to `setResonantStats`/`setStretchStats`/`setNaviKriyaStats` — all deleted). Cross-tab settings sync uses a separate CustomEvent channel unaffected by this deletion (verified: `useLocale`, `useVisualVariant`, `useVisualCue`, `useFavicon` hooks use CustomEvent dispatch, not the storage-event listener). | closed |
| T-37-09 | Denial of Service | `src/content/content.no-stats-ui.test.ts` | mitigate | Drift-guard could pass vacuously if `collectFiles` returned an empty list (WR-02). Hardened in commit a63dae3: `SCAN_FILES.length > 10` sanity assertion added as a separate `it` case | closed |
| T-37-10 | Information Disclosure | `src/content/content.no-stats-ui.test.ts` | mitigate | Drift-guard originally scanned only `src/components/` + `src/app/`, leaving a re-entry vector via i18n keys (WR-03). Extended in commit a63dae3 to include `src/content/` as a third root, closing the WR-01 re-entry path structurally | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-37-01 | T-37-03 | `STATE_VERSION` not bumped because envelope shape at rest is unchanged — only UI consumers and the reset function are removed. No migration is required. The existing v1→v2→v3 coercion ladder in `migrateEnvelope` continues to handle all returning users. | operator (spike-010 anti-gamification decision) | 2026-05-20 |
| AR-37-07 | T-37-07 | App no longer mirrors stats in RAM; disk-only persistence via `recordXSession` is the accepted authoritative record. This app has no server-side audit trail; localStorage was and remains the only record. No regression in audit capability for this threat model. | operator | 2026-05-20 |
| AR-37-06 | T-37-06 | Two stale `// ... reset dialog` comments remain at `strings.ts` L303 and L465. These are prose in `//` comment lines, not exported values, and are invisible to the drift-guard token set. Accepted as minor comment debt; no user-visible or data-at-rest exposure. | auditor | 2026-05-20 |

---

## Verification Evidence

### T-37-01 — `resetPracticeStats` deletion + STATS-04 lock

- `grep -rE "resetPracticeStats" src/` → **0 matches** (confirmed)
- `src/storage/practices.test.ts` line 485: `describe('STATS-04 record-and-persist regression ...')` with 3 it-cases passing
- `recordResonantSession`, `recordStretchSession`, `recordNaviKriyaSession` preserved at `App.tsx` lines 57–59 (import) and lines 708, 712, 817 (call sites)

### T-37-02 — Per-practice stats useState removal

- `grep -nE "resonantStats|naviKriyaStats|stretchStats|activeStats|resetDialogOpen" src/app/App.tsx` → **0 matches** (confirmed)
- WR-07 pattern in `src/storage/stats.ts` (lines 103–131): `recordSession` reads + writes envelope directly — no React state dependency

### T-37-03 — STATE_VERSION unchanged

- `src/storage/storage.ts` line 40: `export const STATE_VERSION = 3 as const`
- `git diff main -- src/storage/storage.ts | grep STATE_VERSION` → 0 matches (no change across all three plans)

### T-37-04 — No new data fields in storage envelope

- `src/storage/practices.ts` exports: `coerceActivePractice`, `coercePractices`, `coerceNaviKriyaSettings`, `coerceStretchSettings`, `loadPractices`, `loadActivePractice`, `saveActivePractice`, `saveResonantSettings`, `saveNaviKriyaSettings`, `saveStretchSettings`, `recordResonantSession`, `recordStretchSession`, `recordNaviKriyaSession`. No new fields.
- `PersistedStats` fields unchanged: `totalSessions`, `totalElapsedSeconds`, `lastSessionAtMs`, `lastSessionDurationSeconds` (+ optional `roundsCompleted` for NK). No PII added.

### T-37-05 — i18n stats keys deleted + WR-01 orphans removed

- `grep -nE "readonly stats:|readonly resetStatsDialog:|resetStatsTitle:" src/content/strings.ts` → **0 matches**
- `grep -rn "naviKriyaStatsEmptyBody|naviKriyaControlsPlaceholder" src/` → **0 matches** (deleted in commit a63dae3)
- `UiStrings` type no longer has `stats`, `resetStatsDialog`, or `practice.resetStatsTitle` fields

### T-37-08 — Cross-tab storage listener deletion

- `grep -n "STORAGE-03|addEventListener.*'storage'" src/app/App.tsx` → **0 matches** (confirmed)
- Plan 01 SUMMARY confirms: sole writes were `setResonantStats`, `setStretchStats`, `setNaviKriyaStats` — all deleted with their useState declarations
- Settings cross-tab sync (CustomEvent channel) unaffected: `useLocale.ts`, `useVisualVariant.ts`, `useVisualCue.ts`, `useFavicon.ts` use `window.dispatchEvent(new CustomEvent(...))`, not `window.addEventListener('storage', ...)`

### T-37-09 — Drift-guard vacuous-pass hardening

- `src/content/content.no-stats-ui.test.ts` line 106–110: `it('scans a non-empty set of production files', () => { expect(SCAN_FILES.length, ...).toBeGreaterThan(10) })`
- File confirmed present at 130 lines (post-hardening commit a63dae3); 2 it-cases total

### T-37-10 — Drift-guard extended to src/content/

- `src/content/content.no-stats-ui.test.ts` lines 59, 65: `const CONTENT_DIR = resolve(__dirname)` + `...collectFiles(CONTENT_DIR)` in `SCAN_FILES`
- Three scanned roots confirmed: `COMPONENTS_DIR`, `APP_DIR`, `CONTENT_DIR`

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-20 | 10 | 10 | 0 | Claude (gsd-secure-phase, retroactive-STRIDE) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-20
