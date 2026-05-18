---
phase: 34
slug: stretch-as-a-distinct-practice
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-18
---

# SECURITY.md — Phase 34: stretch-as-a-distinct-practice

**Audit date:** 2026-05-18
**ASVS Level:** L1
**Block on:** high (open threats)

---

## Threat Verification

### Mitigate-disposition threats (8 total)

| Threat ID | Category | Component | Status | Evidence |
|-----------|----------|-----------|--------|----------|
| T-34-02 | Tampering | `coerceStretchSettings` — named-key reads off raw | CLOSED | `src/storage/practices.ts:98` — `const r = asRecord(raw)` called before any named-key read; `asRecord` rejects non-plain-objects, arrays, and prototype-polluting payloads (returns `{}`) at line 54–58. Per-field coercion: `isValidBpm`, `isValidRatio`, `isValidWarmUp`, `isValidCoolDown`, `isValidRampDuration` — each returns default on failure, never throws (lines 102–122). |
| T-34-03 | Tampering | v2→v3 `migrateEnvelope` reading `out.practices.resonant.settings` | CLOSED | `src/storage/storage.ts:114–115` — `(out.practices ?? {}) as Record<string, unknown>` and `(existingPractices['resonant'] ?? {}) as Record<string, unknown>` are the declared defensive `?? {}` casts before any named-key read. Step is purely constructive: adds `stretch` key only, resonant slice untouched (line 133 comment). |
| T-34-04 | Tampering | `coerceActivePractice` | CLOSED | `src/storage/practices.ts:63` — strict allow-list: `raw === 'resonant' \|\| raw === 'stretch' \|\| raw === 'naviKriya' ? raw : 'resonant'`. Any other value returns `'resonant'`. No reflection off untrusted input. |
| T-34-08 | Tampering | `App.tsx` hydrating `stretchSettings` from `initialPractices.stretch.settings` | CLOSED | `src/app/App.tsx:123` — `initialPractices = useMemo(() => loadPractices(), [])`. `loadPractices()` calls `coercePractices(readEnvelope(deps).practices)` (`src/storage/practices.ts:150`), which calls `coercePracticeSlice(r.stretch, coerceStretchSettings)` (line 144). `initialPractices.stretch.settings` at line 138 is already the output of `coerceStretchSettings` — the raw envelope never reaches App state directly. |
| T-34-09 | Denial of Service | stretch engine path with corrupt `StretchSettings` | CLOSED | `buildStretchSegments` and `startStretchSession` both operate exclusively on coerced `StretchSettings`. Data flow: `stretchSettings` state ← `initialPractices.stretch.settings` ← `loadPractices()` ← `coercePractices()` ← `coerceStretchSettings()`. The coercer guarantees all fields are in-range; the cross-field invariant (T-34-15) ensures `targetBpm < initialBpm`. The segment table is always finite. `computeStretchTotalMs` derives from the snapped segment table (`src/domain/stretchRamp.ts:242–243`). |
| T-34-10 | Tampering | `recordStretchSession` write at session end | CLOSED | `src/storage/practices.ts:255–258` — write path: `{ ...env, practices: { ...practices, stretch: { ...practices.stretch, stats: next } } }`. The outer `...practices` spread passes resonant and naviKriya slices through untouched. Only `stretch.stats` is overridden. |
| T-34-15 | Tampering | persisted `StretchSettings` with `targetBpm >= initialBpm` reaching `buildStretchSegments` | CLOSED | Two-layer mitigation. Layer 1 (coercer): `src/storage/practices.ts:111–114` — `if (targetBpm >= initialBpm)` resets both `initialBpm` and `targetBpm` to `DEFAULT_STRETCH_SETTINGS` values atomically. Layer 2 (engine guard): `src/domain/stretchRamp.ts:90–92` — `if (!(targetBpm < initialBpm)) { throw new RangeError('targetBpm must be strictly below initialBpm') }`. The `!(x < y)` form also catches NaN BPMs. |
| T-34-16 | Tampering | coerced `initialBpm` of `1` collapsing SettingsForm `targetBpm` picker to empty option list | CLOSED | `src/storage/practices.ts:103` — `isValidBpm(r.initialBpm) && STRETCH_INITIAL_BPM_OPTIONS.includes(r.initialBpm as number)` — `initialBpm` is valid only when it is both a recognised BPM option AND a member of `STRETCH_INITIAL_BPM_OPTIONS` (>= 1.5). `initialBpm: 1` is in `BPM_OPTIONS` but not in `STRETCH_INITIAL_BPM_OPTIONS`, so it falls back to the default. `STRETCH_INITIAL_BPM_OPTIONS` is imported at line 23. |

---

### Accept-disposition threats (8 total)

The following threats carry an `accept` disposition. Rationale is documented in the plan-time threat models. No mitigation code is required; these are recorded here as the accepted-risks log entry for this phase.

| Threat ID | Category | Component | Accepted Rationale (plan reference) |
|-----------|----------|-----------|--------------------------------------|
| T-34-01 | Tampering | `validateStretchSettings` | Domain validators called on already-coerced data; storage-layer coercer is the real input gate. `validateStretchSettings` is fail-closed. (34-01-PLAN.md) |
| T-34-05 | Tampering | `VITE_SWITCHER_TREATMENT` build-time define | Build-time only; no user-controlled input path. Strict `=== 'B'` equality means any unexpected value compiles to safe default `'A'`. No injection surface. (34-03-PLAN.md) |
| T-34-06 | Information Disclosure | Switcher treatment exposed as dev knob | Cosmetic label-rendering choice; carries no secret and no privileged capability. Presence in `.env.example` is intentional developer documentation. (34-03-PLAN.md) |
| T-34-07 | Tampering | `strings.ts` copy catalog | Static const data compiled into the bundle; no user input path. `LOCKED_COPY` byte-equality guard independently protects legally-sensitive copy. (34-04-PLAN.md) |
| T-34-11 | Tampering | `computeStretchTotalMs` reading a corrupt `StretchSettings` | Function calls `buildStretchSegments` which operates on coerced `StretchSettings`; segment table is always finite — no NaN/Infinity total. (34-06-PLAN.md) |
| T-34-12 | Information Disclosure | `startStretchSession` carrying `selectedSettings` through | `selectedSettings` is the user's own resonant config already held in engine state; passing through unchanged exposes nothing new. (34-06-PLAN.md) |
| T-34-13 | Tampering | `requestEnd` reading `state.stretchSegments` | `stretchSegments` is engine-owned `RunningSessionState` produced by `startStretchSession`; never user-supplied. Reading it to route the end dialog introduces no new input path. (34-07-PLAN.md) |
| T-34-14 | Denial of Service | Stretch steppers hidden during session | Purely a render gate on `isRunning` (trusted `inSessionView`); removes editable surface during a session rather than adding any. (34-07-PLAN.md) |

---

## Unregistered Flags

**34-02-SUMMARY.md `## Threat Flags`:** No new threat surface reported. All three threats from the plan register (T-34-02, T-34-03, T-34-04) were mitigated; no unregistered flags.

**34-08-SUMMARY.md `## Threat Flags`:** None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

No unregistered flags from either SUMMARY file require logging.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-18 | 16 | 16 | 0 | gsd-security-auditor |

---

## Audit Result

**Threats Closed:** 16/16 (8 mitigate CLOSED + 8 accept logged)
**Threats Open:** 0
**Blockers:** 0

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-18
