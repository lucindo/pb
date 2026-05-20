# Phase 36: Housekeeping bookkeeping reset — Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 17 (1 code · 6 backfilled docs · 6 frontmatter flips · 4 frontmatter populates · plus git ops)
**Analogs found:** 17 / 17

> Phase 36 is procedural. The ONLY source-code edit is appending a new `describe` block to `src/storage/storage.test.ts` (HOUSE-09). Everything else is doc-artifact backfill, single-field frontmatter edits, or git operations (`restore` / `mv` / `rm` / `push`). This map focuses code-pattern fidelity on the test addition and locates canonical doc-shape analogs for the artifact backfills.

---

## File Classification

| # | New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---------------------|------|-----------|----------------|---------------|
| 1 | `src/storage/storage.test.ts` (append new `describe`) | test | transform / regression | `src/storage/storage.test.ts` :220–298 (`describe('migrateEnvelope v2→v3 (Phase 34 STRETCH-03)')`) + :143–218 (`describe('migrateEnvelope v1→v2 (PRACTICE-04)')`) | exact (same file, same `describe` style) |
| 2 | `.planning/phases/12-…/12-VALIDATION.md` (backfill, HOUSE-01) | doc artifact (validation) | doc generation | `.planning/milestones/v1.1-phases/13-inner-ring-ux-symmetry/13-VALIDATION.md` | exact shape (canonical recent VALIDATION) |
| 3 | `.planning/phases/12-…/12-SECURITY.md` (backfill, HOUSE-02) | doc artifact (security) | doc generation | `.planning/milestones/v1.1-phases/13-inner-ring-ux-symmetry/13-SECURITY.md` | exact shape |
| 4 | `.planning/phases/33-…/33-VALIDATION.md` (backfill, HOUSE-03) | doc artifact (validation) | doc generation | `.planning/phases/34-stretch-as-a-distinct-practice/34-VALIDATION.md` (HEAD) | exact shape (same v1.5 era) |
| 5 | `.planning/phases/35-…/35-VALIDATION.md` (backfill, HOUSE-04) | doc artifact (validation) | doc generation | `.planning/phases/32-learn-localization/32-VALIDATION.md` (HEAD) | exact shape |
| 6 | `.planning/phases/02-…/02-VERIFICATION.md` (frontmatter flip, HOUSE-07) | doc artifact (verification) | frontmatter mutation | `.planning/milestones/v1.1-phases/13-inner-ring-ux-symmetry/13-VERIFICATION.md` :1–7 (`status: passed`) | exact (target shape) |
| 7 | `.planning/phases/03-…/03-VERIFICATION.md` (frontmatter flip, HOUSE-07) | doc artifact (verification) | frontmatter mutation | same as #6 | exact |
| 8 | `.planning/phases/05-…/05-VERIFICATION.md` (frontmatter flip, HOUSE-07) | doc artifact (verification) | frontmatter mutation | same as #6 | exact |
| 9 | `.planning/phases/15-…/15-VERIFICATION.md` (frontmatter flip, HOUSE-07) | doc artifact (verification) | frontmatter mutation | same as #6 | exact |
| 10 | `.planning/phases/18-…/18-VERIFICATION.md` (frontmatter flip, HOUSE-07) | doc artifact (verification) | frontmatter mutation | same as #6 | exact |
| 11 | `.planning/phases/31-…/31-VERIFICATION.md` (frontmatter flip, HOUSE-05) | doc artifact (verification) | frontmatter mutation | same as #6 | exact |
| 12 | `.planning/phases/32-…/32-03-SUMMARY.md` (frontmatter populate, HOUSE-06) | doc artifact (summary) | frontmatter mutation | `.planning/milestones/v1.0.1-phases/12-assets-content-hygiene-cleanup/12-01-SUMMARY.md` :56–60 (`requirements-completed:` list) + `30-04-SUMMARY.md` :51 (inline form) | exact (two valid forms) |
| 13 | `.planning/phases/33-…/33-01-SUMMARY.md` (frontmatter populate, HOUSE-06) | doc artifact (summary) | frontmatter mutation | same as #12 | exact |
| 14 | `.planning/phases/34-…/34-11-SUMMARY.md` (frontmatter populate, HOUSE-06) | doc artifact (summary) | frontmatter mutation | same as #12 | exact |
| 15 | `.planning/phases/35-…/35-02-SUMMARY.md` (frontmatter populate, HOUSE-06) | doc artifact (summary) | frontmatter mutation | same as #12 | exact |
| 16 | `.planning/phases/28-…/28-01-SUMMARY.md` (drift fix, HOUSE-08) | doc artifact (summary) | content correction | own pre-deletion HEAD copy (`git show f81f08f^:…/28-01-SUMMARY.md`) | exact (target self) |
| 17 | `.planning/phases/28-…/28-03-SUMMARY.md` (drift fix, HOUSE-08) | doc artifact (summary) | content correction | own pre-deletion HEAD copy (`git show f81f08f^:…/28-03-SUMMARY.md`) | exact (target self) |

---

## Pattern Assignments

### 1. `src/storage/storage.test.ts` — append `describe('migrateEnvelope v1→v3 chained (HOUSE-09)', …)` block

**Role:** test · **Data flow:** transform / regression
**Analog (same file):** the existing `describe('migrateEnvelope v2→v3 (Phase 34 STRETCH-03)')` block at lines 220–298, with the v1→v2 block at 143–218 as the secondary reference for v1-envelope fixture shape.

#### Imports pattern (lines 1–3, already present — DO NOT re-add)

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readEnvelope, writeEnvelope, migrateEnvelope, STATE_KEY, STATE_VERSION } from './storage'
```

No new imports needed; `migrateEnvelope`, `STATE_VERSION`, `describe`, `expect`, `it` are all already in scope. The new block lives AFTER line 298 (end of v2→v3 block), at file tail. No fixture sharing between blocks (each describe declares its own constants — keeps blocks readable and copy-safe).

#### Fixture pattern — v1 flat envelope (copy v1→v2 block, lines 146–152)

```typescript
const V1_SETTINGS = { bpm: 4, ratio: '40:60', durationMinutes: 10 }
const V1_STATS = {
  totalSessions: 7,
  totalElapsedSeconds: 4200,
  lastSessionAtMs: 1_700_000_000_000,
  lastSessionDurationSeconds: 600,
}
```

Use the same shape; the HOUSE-09 test exercises the chained ladder (v1→v2→v3 in one call), so the v1 input is identical to the v1→v2 block's input. Rename constants to `V1_SETTINGS_HOUSE09` / `V1_STATS_HOUSE09` if the planner wants block-local non-collision (the v1→v2 block scopes its consts inside its own `describe`, so collision is not a syntactic risk, but a rename guards readability).

#### Inline ZERO-stats literal (copy v2→v3 block, lines 254–259)

```typescript
const ZERO_STATS_LITERAL = {
  totalSessions: 0,
  totalElapsedSeconds: 0,
  lastSessionAtMs: null,
  lastSessionDurationSeconds: null,
}
```

Critical: do NOT import `ZERO_STATS` from `src/storage/stats.ts` — that creates a circular dep (stats.ts → storage.ts). Use the inline literal. This is called out explicitly in `src/storage/storage.ts:112-113` ("CRITICAL: Do NOT import ZERO_STATS from stats.ts").

#### Core assertion pattern — chained migration (synthesize from CONTEXT D-06)

```typescript
describe('migrateEnvelope v1→v3 chained (HOUSE-09)', () => {
  // A v1 flat envelope from a returning user who has never opened the app since the
  // v2 ladder shipped. migrateEnvelope(env, 1) must cascade BOTH ladder steps
  // (v1→v2 then v2→v3) in a single call.
  const V1_SETTINGS = { bpm: 4, ratio: '40:60', durationMinutes: 10 }
  const V1_STATS = {
    totalSessions: 7,
    totalElapsedSeconds: 4200,
    lastSessionAtMs: 1_700_000_000_000,
    lastSessionDurationSeconds: 600,
  }
  const ZERO_STATS_LITERAL = {
    totalSessions: 0,
    totalElapsedSeconds: 0,
    lastSessionAtMs: null,
    lastSessionDurationSeconds: null,
  }

  it('folds a v1 flat envelope all the way to v3 in one call', () => {
    const migrated = migrateEnvelope(
      { version: 1, settings: V1_SETTINGS, stats: V1_STATS },
      1,
    )
    const practices = migrated.practices as {
      resonant: { settings: unknown; stats: unknown }
      stretch:  { settings: unknown; stats: unknown }
    }
    // v1→v2 step: resonant slice populated losslessly from flat fields
    expect(practices.resonant.settings).toEqual(V1_SETTINGS)
    expect(practices.resonant.stats).toEqual(V1_STATS)
    expect(migrated.activePractice).toBe('resonant')
    // v2→v3 step: stretch slice seeded (settings carries resonant blob; stats = ZERO)
    expect(practices.stretch.settings).toEqual(V1_SETTINGS)
    expect(practices.stretch.stats).toEqual(ZERO_STATS_LITERAL)
  })

  it('is idempotent on re-migration (running v1→v3 twice yields the same envelope)', () => {
    const once  = migrateEnvelope({ version: 1, settings: V1_SETTINGS, stats: V1_STATS }, 1)
    const twice = migrateEnvelope({ version: 1, settings: V1_SETTINGS, stats: V1_STATS }, 1)
    expect(once).toEqual(twice)
  })

  it('STATE_VERSION is 3 (ladder terminal)', () => {
    expect(STATE_VERSION).toBe(3)
  })
})
```

Cast pattern (`migrated.practices as { resonant: { … }; stretch: { … } }`) is copied verbatim from the v1→v2 block (lines 159–161) and v2→v3 block (lines 263–264, 270–271). `Envelope.practices` is typed `unknown` at the surface; the test narrows via a structural cast.

#### Critical contract assertions (planner must include all four)

Per CONTEXT.md D-06 verbatim:
1. `practices.resonant.settings` / `practices.resonant.stats` populated losslessly from the flat v1 fields.
2. `practices.stretch` seeded with defaults (settings from resonant blob, stats === ZERO_STATS_LITERAL).
3. `practices.naviKriya` seeded with defaults (CONTEXT D-06 wording — see note below).
4. `version === 3` after migration.
5. Idempotent on re-migration (`migrateEnvelope(env, 1)` twice returns equal envelopes).

**Note on naviKriya seeding (CONTEXT D-06 wording vs code reality):** D-06 says "practices.stretch and practices.navi seeded with defaults". The current `migrateEnvelope` code at `src/storage/storage.ts:92-136` does NOT seed `practices.naviKriya` — only the v1→v2 ladder creates `resonant`, and the v2→v3 ladder creates `stretch`. naviKriya defaults are supplied downstream by `coercePractices` (see `src/storage/storage.ts:88` "naviKriya is intentionally absent so coercePractices supplies defaults"). The planner should pick one of two test strategies:

- **(a) Assert only what `migrateEnvelope` produces:** test asserts `practices.resonant` + `practices.stretch` + `version`; naviKriya assertion is omitted (matches the v1→v2 block at line 154–167 which does not assert naviKriya either).
- **(b) Route the test through the `readEnvelope` seam:** seed localStorage with the v1 envelope (matching the v1→v2 "populates practices.resonant when a seeded v1 envelope is read back" pattern at lines 197–208) and assert the full coerced shape including naviKriya defaults.

Strategy (a) is the closer analog to the cited "v2→v3 (Phase 34 STRETCH-03)" block and keeps HOUSE-09 a pure `migrateEnvelope` regression. The planner should decide (a) vs (b) based on whether HOUSE-09's "naviKriya seeded with defaults" wording is canonical or descriptive — recommend (a) and surface the wording mismatch as a CONTEXT clarification note in the PLAN.

#### Test sampling / runtime

- Quick run: `npx vitest run src/storage/storage.test.ts` — ~1s.
- Full gate (per D-11): `npx tsc --noEmit && npm run lint && npm run build && npm test`.

---

### 2 & 3. Phase 12 VALIDATION.md + SECURITY.md (HOUSE-01, HOUSE-02)

**Role:** doc artifact (validation / security) · **Data flow:** generated by orchestrator
**Generation source (per CONTEXT D-08, D-09):** `/gsd-validate-phase 12` produces VALIDATION.md, `/gsd-secure-phase 12` produces SECURITY.md. The planner does NOT hand-write these — the orchestrator + auditor agents do. The pattern below documents the target SHAPE so the planner can verify the output and detect drift.

**Analog (canonical, recent passed phase):** `.planning/milestones/v1.1-phases/13-inner-ring-ux-symmetry/13-VALIDATION.md` and `13-SECURITY.md`.

#### VALIDATION.md frontmatter shape (target)

From `13-VALIDATION.md:1-8`:

```yaml
---
phase: 12
slug: assets-content-hygiene-cleanup
status: passed              # MUST end at 'passed' per CONTEXT D-10 success criterion
nyquist_compliant: true     # or 'partial' with an override block
wave_0_complete: true
created: 2026-05-20         # D-03: today's date (backfill, not original phase date)
---
```

Per CONTEXT D-03, the body must open with `"Backfilled retroactively for Phase 12 (shipped YYYY-MM-DD)"` — honest about the backfill timestamp while documenting the verification of the already-shipped code.

#### VALIDATION.md body sections (target outline)

Mirror `13-VALIDATION.md` section headings verbatim:
- `# Phase 12 — Validation Strategy` (title with em-dash)
- `## Test Infrastructure` (table: Framework / Config file / Quick run command / Full suite command / Estimated runtime)
- `## Sampling Rate` (After every task commit / Full gate / Pre-verify / Max feedback latency)
- `## Per-Task Verification Map` (Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status)
- `## Wave 0 Requirements` (or N/A note)
- `## Manual-Only Verifications` (if any)
- `## Validation Sign-Off` (checkbox list ending with **Approval:** approved YYYY-MM-DD)

The auditor regenerates the Nyquist coverage table from Phase 12's PLAN must-haves (located at `.planning/milestones/v1.0.1-phases/12-assets-content-hygiene-cleanup/12-01-PLAN.md` per CONTEXT canonical refs).

#### SECURITY.md frontmatter shape (target)

From `13-SECURITY.md:1-8`:

```yaml
---
phase: 12
slug: assets-content-hygiene-cleanup
status: verified            # threats_open: 0 short-circuit
threats_open: 0
asvs_level: 1
created: 2026-05-20         # D-03: today's date (backfill)
---
```

#### SECURITY.md body sections (target outline)

Mirror `13-SECURITY.md` section headings:
- `# Phase 12 — Security`
- `## Trust Boundaries` (table or "no new trust boundary" prose)
- `## Threat Register` (12 STRIDE rows: Threat ID | Category | Component | Disposition | Mitigation | Status)
- `## Accepted Risks Log` (Risk ID | Threat Ref | Rationale | Accepted By | Date)
- `## Security Audit Trail` (Audit Date | Threats Total | Closed | Open | Run By)
- `## Sign-Off` (checkbox list + **Approval:** verified YYYY-MM-DD)

**Important per CONTEXT D-09:** the security auditor REGENERATES the threat model from the implemented Phase 12 code (assets / content / cleanup surface — favicon.svg, learnContent.ts amazon URL, domain/settings.ts predicate extraction). The inline threats in `12-01-PLAN.md` are advisory only — the regenerated register may surface threats the original PLAN missed.

---

### 4 & 5. Phase 33 + 35 VALIDATION.md (HOUSE-03, HOUSE-04)

**Role:** doc artifact (validation) · **Data flow:** generated by `/gsd-validate-phase {33,35}`
**Analog:** `.planning/phases/34-stretch-as-a-distinct-practice/34-VALIDATION.md` (same v1.5 era, HEAD-present).

#### 34-VALIDATION.md frontmatter (target shape for 33 and 35)

```yaml
---
phase: 34
slug: stretch-as-a-distinct-practice
status: verified              # 33/35 will be 'passed' on first auditor pass
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-18
updated: 2026-05-18
---
```

For 33-VALIDATION.md substitute `phase: 33`, slug from the restored dir name; for 35-VALIDATION.md substitute `phase: 35`. Per CONTEXT D-03 use `created: 2026-05-20`; per D-10 the file must end with `status: passed`. If `/gsd-validate-phase` surfaces uncovered Nyquist points, the planner spawns `gsd-nyquist-auditor` with gap-filling enabled (CONTEXT D-10).

---

### 6 – 11. VERIFICATION.md frontmatter re-flip (HOUSE-05, HOUSE-07)

**Role:** doc artifact (verification) · **Data flow:** single-field mutation (`status: human_needed` → `status: passed`)
**Targets:** Phases 02, 03, 05, 15, 18, 31 — 6 files total.
**Analog:** `.planning/milestones/v1.1-phases/13-inner-ring-ux-symmetry/13-VERIFICATION.md:1-7` (canonical `status: passed` shape).

#### Target frontmatter shape (after re-flip)

```yaml
---
phase: 13-inner-ring-ux-symmetry
verified: 2026-05-12T16:21:16Z
status: passed                          # ← THE ONLY FIELD EDITED
score: 13/13 must-haves verified
overrides_applied: 0
---
```

#### Current state of each target (BEFORE re-flip)

From actual HEAD inspection:

- **`02-VERIFICATION.md`** (v1.0 archived):
  ```yaml
  status: human_needed
  score: 24/24 must-haves verified (automated checks); 5 visual/perceptual UAT items remain for human sign-off
  ```
- **`18-VERIFICATION.md`** (v1.1 archived):
  ```yaml
  status: human_needed
  score: 5/5 must-haves verified (code-level); SC-1 and SC-3 require human audition
  ```
- **`31-VERIFICATION.md`** (v1.5, currently `D` in working tree, present in HEAD):
  ```yaml
  status: human_needed
  score: 9/9 must-haves verified
  human_verification: [9 items, all confirmed in 31-HUMAN-UAT.md]
  ```

Phases 03, 05, 15 follow the same shape (`status: human_needed` + populated `human_verification:` block). All six phases have operator-confirmed UATs per CONTEXT canonical refs (`.planning/milestones/v1.5-MILESTONE-AUDIT.md` and `31-HUMAN-UAT.md`).

#### Edit pattern — frontmatter-only, no body change (CONTEXT D-04)

Edit ONLY `status: human_needed` → `status: passed`. Leave the `human_verification:` array intact (it remains the audit trail of which items were human-checked). The git commit message is the audit trail per D-04:

```
docs(36): re-flip VERIFICATION status human_needed → passed for phases 02/03/05/15/18 (HOUSE-07) and 31 (HOUSE-05)

Operator-confirmed per .planning/milestones/v1.5-MILESTONE-AUDIT.md (Phase 31)
and historical milestone records (Phases 02/03/05/15/18).
```

CONTEXT D-05 commit-granularity proposes a single combined commit for all 6 re-flips; planner may split HOUSE-05 (Phase 31) from HOUSE-07 (Phases 02/03/05/15/18) if the diff readability gains warrant it.

---

### 12 – 15. SUMMARY.md `requirements-completed:` frontmatter populate (HOUSE-06)

**Role:** doc artifact (summary) · **Data flow:** frontmatter add/populate
**Targets:** `32-03-SUMMARY.md`, `33-01-SUMMARY.md`, `34-11-SUMMARY.md`, `35-02-SUMMARY.md` (last-plan SUMMARY per phase).
**Analog (canonical):** `.planning/milestones/v1.0.1-phases/12-assets-content-hygiene-cleanup/12-01-SUMMARY.md:56-60` and `.planning/phases/30-multi-practice-architecture-switcher/30-04-SUMMARY.md:51`.

#### Two valid field-value forms

**Form A — multi-line list** (12-01-SUMMARY.md:56-60):

```yaml
requirements-completed:
  - ASSETS-01
  - CONTENT-01
  - HYGIENE-01
  - HYGIENE-02
  - HYGIENE-03
```

**Form B — single-line array** (30-04-SUMMARY.md:51):

```yaml
requirements-completed: [PRACTICE-01, PRACTICE-03, PRACTICE-05, PRACTICE-06]
```

Both forms are valid YAML and both are in use in the codebase. Planner picks per phase by matching the SUMMARY's existing frontmatter style. Per CONTEXT decision-discretion, the planner derives the array values by reading each phase's `*-VERIFICATION.md` "Requirements Coverage" table and the `v1.5-MILESTONE-AUDIT.md` per-requirement rows (lines 96–121 cited above).

#### Existing SUMMARY frontmatter style per target (from HEAD)

| Target | Existing style | Insert form |
|--------|---------------|-------------|
| `32-03-SUMMARY.md` | `dependency_graph:` (underscored) — Phase 32+ convention | Form A (multi-line list) — most readable |
| `33-01-SUMMARY.md` | `dependency_graph:` (underscored) | Form A |
| `34-11-SUMMARY.md` | `dependency_graph:` (underscored) | Form A |
| `35-02-SUMMARY.md` | `dependency_graph:` (underscored) | Form A |

Note: CONTEXT mentions stale frontmatter convention divergence (Phase 30/31 dashed vs Phase 32+ underscored) — this is **deferred**, not in Phase 36 scope. Keep `requirements-completed` (dashed) as that's the form used in both canonical analogs (12-01 and 30-04); do NOT rename to `requirements_completed` even though sibling fields in 32+ use underscores.

#### Values to populate (planner derives, examples)

From `v1.5-MILESTONE-AUDIT.md:96-121`:

- **32-03:** `[LEARN-02, LEARN-03, I18N-08]` (Phase 32 closes these three)
- **33-01:** `[PRACTICE-02]` (Phase 33 closes the PRACTICE-02 regression — see 33-01-SUMMARY one-liner)
- **34-11:** `[STRETCH-01, STRETCH-02, STRETCH-03, STRETCH-04, STRETCH-05, STRETCH-06]` (Phase 34 closes all six STRETCH-XX requirements at plan 11)
- **35-02:** `[AUDIO-01, AUDIO-02]` (Phase 35 closes both AUDIO-XX requirements at plan 02)

Planner MUST re-derive from each phase's VERIFICATION.md audit table at execution time — the values above are anchored to milestone-audit text but the canonical source is the per-phase VERIFICATION.md.

#### Insertion site

Between the existing `decisions:` (or `key-decisions:`) and `metrics:` blocks (mirrors 12-01-SUMMARY.md ordering). For 34-11-SUMMARY.md specifically the existing frontmatter has no `requirements-completed:` field — append BEFORE `metrics:`.

---

### 16 & 17. Phase 28 SUMMARY drift fix (HOUSE-08)

**Role:** doc artifact (summary) · **Data flow:** content correction (field-count + symbol-name)
**Targets:** `28-01-SUMMARY.md`, `28-03-SUMMARY.md`. **Both files are absent from HEAD and the working tree** (deleted in `f81f08f docs(phase-30): add security threat verification`). The planner must independently restore them — they are NOT among the 6 v1.5 dirs restored by HOUSE-10.

**Analog:** the deleted files themselves, recoverable via `git show f81f08f^:.planning/phases/28-phone-install-banner/28-0{1,3}-SUMMARY.md`.

#### Recovery pattern

```bash
git show f81f08f^:.planning/phases/28-phone-install-banner/28-01-SUMMARY.md > /tmp/28-01-SUMMARY.md
git show f81f08f^:.planning/phases/28-phone-install-banner/28-03-SUMMARY.md > /tmp/28-03-SUMMARY.md
```

Then apply the drift fixes IN /tmp, then move into the chosen location.

#### Drift to fix (from CONTEXT canonical_refs)

**28-01-SUMMARY.md "field count" drift:** the SUMMARY's `metrics.files_changed: 4` field needs cross-checking against the actual count of files in `key_files.created` + `key_files.modified`. The recovered file shows:
- `key_files.created`: 2 files (`installDismissed.ts`, `installDismissed.test.ts`)
- `key_files.modified`: 2 files (`storage/index.ts`, `content/strings.ts`)
- Total: 4 — actually matches.

The planner must read the body's "Task 2: UiStrings.install block" section (which lists the actual edits) and re-verify against the current `src/storage/installDismissed.ts` + `src/content/strings.ts`. The "field count" drift wording in CONTEXT may refer to a count of `UiStrings.install` strings/fields rather than file count — re-read the canonical implementation (`src/storage/installDismissed.ts`, `src/content/strings.ts`) and the SUMMARY body before editing.

**28-03-SUMMARY.md `SafariNavigator` reference (superseded):** the SUMMARY's `decisions` list contains:

```yaml
decisions:
  - "iOS detection via (navigator as SafariNavigator).standalone !== undefined as a per-render expression in App.tsx — avoids a third hook, consistent with how the plan specifies the local SafariNavigator interface"
```

The current iOS-detect implementation lives at `src/lib/iosDetect.ts` (or wherever the install-banner UI now lives in `main`); `SafariNavigator` is the superseded reference. Planner must:

1. `grep -rn "SafariNavigator" src/` — confirm whether the name still exists in current `src/`. If absent, the SUMMARY's decision row is stale and must be rewritten to cite the current API/hook name.
2. Verify the `InstallBanner.tsx` import block (per CONTEXT canonical refs at `src/components/InstallBanner.tsx`) for the current iOS-detect symbol.

The fix is a single quoted-string edit in the SUMMARY's `decisions:` block — NOT a code edit. The SUMMARY is an audit artifact; the canonical implementation in `src/` is the source of truth and the SUMMARY must reflect it.

#### Placement decision (planner-owned per CONTEXT specifics)

CONTEXT specifics line 141 explicitly flags this: Phase 28 is v1.4 and there is no `.planning/milestones/v1.4-phases/` archive. The planner has two options:

- **(a)** Restore `28-*` to `.planning/phases/28-phone-install-banner/`, apply the drift fixes, then leave it there (and flag v1.4 archive as a deferred follow-up — already in CONTEXT deferred).
- **(b)** Create `.planning/milestones/v1.4-phases/28-phone-install-banner/` from the recovered HEAD content and edit in place.

Option (a) is cleaner and matches CONTEXT specifics ("planner must independently confirm where the 28-01/28-03 SUMMARYs live in current `main` and edit in place"). Recommend (a); the v1.4 archive backfill stays deferred.

---

## Shared Patterns

### Backfill body opener (CONTEXT D-03)

**Apply to:** all backfilled VALIDATION.md / SECURITY.md (HOUSE-01..04).

Body opens with a single italic line immediately under the H1 title:

```markdown
# Phase 12 — Validation Strategy

_Backfilled retroactively for Phase 12 (shipped 2026-05-11). Frontmatter `created: 2026-05-20` reflects backfill date; the audited code surface is the Phase 12 implementation present in `main`._

> Per-phase validation contract. …
```

The italic backfill notice precedes the existing blockquote-tagline (if any). It's the honest audit trail.

### Frontmatter `created:` field convention

**Apply to:** all backfilled artifacts (HOUSE-01..04) and the new HOUSE-09 test (no frontmatter — test file).

Per CONTEXT D-03, `created: 2026-05-20` for backfilled artifacts (today). Do NOT backdate to the phase's original ship date — the artifact is authored today and that's auditable. Sibling phases (32 / 34) use `created:` matching their actual creation date; the backfill convention deliberately diverges.

### Commit message scope prefix (CONTEXT D-07)

**Apply to:** all 7-8 commits across Phase 36.

```
docs(36): …      ← default prefix for doc backfills / frontmatter edits / archive moves
test(36): …      ← ONLY for commit 6 (HOUSE-09 test addition)
chore(36): …     ← ONLY for the .gitignore line if split out (HOUSE-13)
```

Sample subject (CONTEXT D-05, commit 6):

```
test(36): add v1→v3 chained migrateEnvelope regression (HOUSE-09)
```

Sample subject (CONTEXT D-05, commit 3):

```
docs(36): re-flip VERIFICATION status human_needed → passed for phases 02/03/05/15/18/31 (HOUSE-05, HOUSE-07)
```

### Green-gate / push boundary (CONTEXT D-11..D-13)

**Apply to:** the push commit only (commit 7 or 8, depending on split).

```bash
# Confirm exact command — repo's existing convention:
npx tsc --noEmit && npm run lint && npm run build && npm test
# (equivalent to `npm run check` if defined in package.json — planner confirms)
```

Run ONCE after the last bookkeeping commit, immediately before `git push origin main`. Per D-12: on failure, add a fix-up commit (e.g., `fix(36): correct HOUSE-09 test fixture`) — do NOT amend. Per D-13: `git push origin main` with no post-push verification.

### Migration test no-circular-import invariant

**Apply to:** HOUSE-09 test (and any future migration test).

Do NOT import `ZERO_STATS` from `src/storage/stats.ts`. stats.ts imports from storage.ts, so the import would create a circular dep. Use the inline literal (`{ totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null, lastSessionDurationSeconds: null }`) — same pattern as the existing v2→v3 block at `storage.test.ts:254-259` and the implementation at `storage.ts:112-128`.

### Frontmatter `status` field is canonical (CONTEXT code_context)

**Apply to:** VERIFICATION.md re-flips and VALIDATION.md generation.

Downstream tooling (gsd-sdk) reads frontmatter `status:` as the canonical phase-artifact contract. A one-field edit is sufficient — body changes for HOUSE-05/07 are explicitly OUT of scope per D-04. The audit trail is the git commit message, not a body annotation.

---

## No Analog Found

Files with no close existing match in the codebase — planner should use RESEARCH.md patterns or the cited orchestrator behavior:

| File / Action | Role | Data Flow | Reason |
|---------------|------|-----------|--------|
| `git restore .planning/phases/` (HOUSE-10 prep) | git op | working-tree mutation | No prior bookkeeping phase has done a bulk multi-dir restore-then-re-archive. Pattern is one-shot. |
| `git mv .planning/phases/3{0..5}-* .planning/milestones/v1.5-phases/` (HOUSE-10) | git op | rename-tracking | Closest precedent is the v1.1 archive landing (look at git log for the commit that created `.planning/milestones/v1.1-phases/`) — but the operation is a single `mv` with shell glob expansion, no code pattern to copy. |
| `.gitignore` append `.claude/` (HOUSE-13) | config | single-line append | Read the current `.gitignore` first; append `.claude/` on its own line at file tail. Trivial. |
| `git rm CLAUDE.md` (HOUSE-11) | git op | tracked-file removal | Trivial. |
| `git rm -r .claude/skills/spike-findings-hrv/` (HOUSE-12) | git op | tracked-dir removal | Trivial — 22 tracked files per CONTEXT. |
| `git push origin main` (HOUSE-14) | git op | network push | No CI gate per D-13. |

---

## Pattern Mapping Decisions Summary

| Decision | Rationale |
|----------|-----------|
| HOUSE-09 test pattern follows v2→v3 block (lines 220–298), not v1→v2 (143–218) | Same level of nesting / fixture style; v2→v3 is the most recent and also asserts ZERO_STATS_LITERAL which HOUSE-09 needs. |
| VALIDATION.md analog is 13-VALIDATION.md, not 34-VALIDATION.md | 13-VALIDATION.md has the richest section structure (Manual-Only Verifications + per-task map) — useful template even if Phase 12's table will be shorter. 34-VALIDATION.md is the canonical match for HOUSE-03/04 (same v1.5 era). |
| SECURITY.md analog is 13-SECURITY.md | Same reasoning — canonical recent passed phase with `threats_open: 0` short-circuit pattern. |
| `requirements-completed:` uses Form A (multi-line list) for HOUSE-06 targets | Sibling fields in Phase 32+ are multi-line YAML; matches local style. The single-line array (Form B) is valid but less readable for >2 items. |
| 28-* drift fix done in `.planning/phases/28-phone-install-banner/` (option a) | Matches CONTEXT specifics line 141 explicit guidance; v1.4 archive stays deferred. |
| Backfill body opener convention `_Backfilled retroactively for Phase X…_` | Direct quote from CONTEXT D-03. |

---

## Metadata

**Analog search scope:**
- `.planning/milestones/v1.0-phases/`, `v1.0.1-phases/`, `v1.1-phases/` — canonical archived doc artifacts (VALIDATION / SECURITY / VERIFICATION / SUMMARY shapes)
- `.planning/phases/` (HEAD via `git show`) — current v1.5 phase artifacts (32/33/34/35) and deleted Phase 28 SUMMARYs
- `src/storage/storage.ts` (lines 80–180) and `src/storage/storage.test.ts` (full file) — HOUSE-09 code pattern
- `.planning/milestones/v1.5-MILESTONE-AUDIT.md` — operator-confirmation reference for HOUSE-05/07 re-flips

**Files scanned (Read):** 8
- `36-CONTEXT.md`
- `src/storage/storage.test.ts`
- `src/storage/storage.ts:80-180`
- `13-VALIDATION.md`, `13-SECURITY.md`, `13-VERIFICATION.md`
- `15-04-SUMMARY.md`, `12-01-SUMMARY.md`

**Files inspected (Bash + git show):** 12
- `30-04-SUMMARY.md` (HEAD)
- `32-03-SUMMARY.md`, `32-VALIDATION.md`, `32-VERIFICATION.md` (HEAD)
- `33-01-SUMMARY.md` (HEAD)
- `34-11-SUMMARY.md`, `34-VALIDATION.md`, `34-SECURITY.md` (HEAD)
- `35-02-SUMMARY.md` (HEAD)
- `31-VERIFICATION.md` (HEAD)
- `28-01-SUMMARY.md`, `28-03-SUMMARY.md` (via `git show f81f08f^`)
- `02-VERIFICATION.md`, `18-VERIFICATION.md` (canonical `status: human_needed`)
- `12-01-PLAN.md` (Phase 12 must-haves source)

**Pattern extraction date:** 2026-05-20
