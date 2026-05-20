# Phase 33: Close gap PRACTICE-02 — resonant settings read/write split-brain - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Restore resonant-settings persistence across page reloads (requirement PRACTICE-02).

The Phase 31 CR-01 fix moved the resonant-settings **write** path to
`saveResonantSettings()` → `practices.resonant.settings`, but left the **read**
path on the abandoned flat `env.settings` field. Result: `App.tsx:110` calls
`loadSettings()` (reads flat `env.settings`, never written after Phase 31), so
resonant BPM / ratio / duration / mode revert on every reload.

**In scope:** retarget the resonant-settings read to the per-practice envelope;
remove the now-dead `loadSettings`/`saveSettings`; add regression tests proving
resonant settings survive a remount.

**Out of scope:** NK settings (already correct via `practices.naviKriya.settings`
at `App.tsx:145`); the v1→v2 migration ladder itself (unchanged — it already
folds flat settings into `practices.resonant`); milestone-audit metadata fixes
(stale REQUIREMENTS.md NK checkboxes, Phase 31 VALIDATION.md staleness) — those
belong to `/gsd-complete-milestone`, not this gap-closure phase.
</domain>

<decisions>
## Implementation Decisions

### Read-path fix
- **D-01:** Seed `initialSettings` at `App.tsx:110` from the per-practice
  envelope, not the flat field. `initialPractices.resonant.settings` is already
  computed at `App.tsx:115` via `loadPractices()` — derive resonant settings
  from the same source (either reference `initialPractices.resonant.settings`
  directly, or `loadPractices().resonant.settings`). The write path
  (`saveResonantSettings` at `App.tsx:416`) is already correct and stays.

### Dead-code cleanup scope
- **D-02:** Full removal. After D-01, `loadSettings` has zero production callers
  and `saveSettings` is already test-only — delete both from
  `src/storage/settings.ts`. Keep `loadMute`/`saveMute` (still used) and
  `coerceSettings` (still used by the practices coercer path).
- **D-03:** Cleanup ripples through test files — `src/storage/settings.test.ts`
  (the `loadSettings / saveSettings round-trip` describe block) and
  `src/storage/stats.test.ts` (imports `saveSettings`/`loadSettings` to seed
  envelope co-existence tests). Those must be reworked (re-seed via
  `saveResonantSettings` or direct envelope writes) or removed, not left
  importing deleted symbols. Check the `src/storage/index.ts` barrel and drop
  any re-export of the removed functions.

### Orphan flat field
- **D-04:** Leave the stale flat `env.settings` field in localStorage for
  v1-migrated users. Once nothing reads it, it is harmless dead data (a few
  bytes); the migration ladder already copied its value into
  `practices.resonant`. Do not add pruning logic — zero user benefit, new
  surface to test.

### Regression tests
- **D-05:** Cover both revert scenarios the audit identified, each via a real
  App remount:
  1. **Fresh-v2 user** — settings written to `practices.resonant.settings`,
     flat `env.settings` undefined; remount must show the saved settings.
  2. **v1-migrated user** — flat `env.settings` holds a stale pre-change value
     while `practices.resonant.settings` holds the newer value; remount must
     show the practices-subtree value, not the stale flat one.
- **D-06:** The new tests belong with the existing persistence coverage in
  `src/app/App.persistence.test.tsx` (which today seeds only `version: 1`
  envelopes — that gap is precisely what let the bug ship).

### Claude's Discretion
- Exact test-helper shape and whether co-existence tests in `stats.test.ts` are
  reworked vs. dropped — planner/executor decides, as long as no test imports a
  deleted symbol and envelope co-existence stays covered somewhere.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Gap diagnosis
- `.planning/v1.5-MILESTONE-AUDIT.md` — the BLOCKER finding; exact break point,
  failure scenarios, and the mandated regression test. Read first.

### Storage model (locked in Phase 30)
- `.planning/phases/30-multi-practice-architecture-switcher/30-CONTEXT.md` — the
  v1→v2 per-practice envelope decision; `practices.resonant.settings` is the
  canonical home for resonant settings.
- `src/storage/practices.ts` — `loadPractices`, `saveResonantSettings`,
  `coercePractices` (the correct read/write API).
- `src/storage/storage.ts` — `migrateEnvelope` v1→v2 ladder (unchanged by this
  phase; explains why migrated users carry an orphan flat field).
- `src/storage/settings.ts` — `loadSettings`/`saveSettings` (to be removed);
  `loadMute`/`saveMute`/`coerceSettings` (to keep).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `loadPractices()` (`src/storage/practices.ts`): already called once at
  `App.tsx:115` (`initialPractices`); used for stats and NK settings. Reuse it
  as the resonant-settings source — no new storage function needed.

### Established Patterns
- Phase 31's NK wiring is the correct reference pattern: NK settings seed from
  `initialPractices.naviKriya.settings` (`App.tsx:145`) and write via
  `saveNaviKriyaSettings`. Resonant settings should mirror that symmetry.
- `useMemo([])`-once synchronous reads at mount (`App.tsx:108-116`) — preserve
  this; the fix changes the *source* of `initialSettings`, not the timing.

### Integration Points
- `App.tsx:110` — the single read-path line to change.
- `useSessionEngine(initialSettings)` at `App.tsx:130` — consumes the seeded
  value; correctness of the engine seed depends entirely on D-01.
- `src/storage/index.ts` barrel — verify it no longer re-exports removed symbols.

### Test surface
- `src/app/App.persistence.test.tsx` — target for the new D-05 tests; currently
  v1-only seeding.
- `src/storage/settings.test.ts`, `src/storage/stats.test.ts` — must be updated
  for the `loadSettings`/`saveSettings` removal (D-03).
</code_context>

<specifics>
## Specific Ideas

The fix is mechanically settled — the milestone audit specifies the exact change
and the mandated test. No open design questions; this phase is execution of a
known correction plus its missing safety net.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Milestone-audit metadata gaps
(REQUIREMENTS.md NK-01..09 still `[ ]`/`Pending`; Phase 31 VALIDATION.md tracking
stale) are intentionally left to `/gsd-complete-milestone v1.5`.

### Reviewed Todos (not folded)
- **Review all app config values and defaults**
  (`.planning/todos/2026-05-17-review-all-app-config-values-and-defaults.md`) —
  matched only on the keyword "settings" (score 0.2). It is a broad config-audit
  task, unrelated to the read/write persistence bug. Not folded.
</deferred>

---

*Phase: 33-close-gap-practice-02-resonant-settings-read-write-split-brain*
*Context gathered: 2026-05-18*
