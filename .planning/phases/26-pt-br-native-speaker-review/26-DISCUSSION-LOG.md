# Phase 26: PT-BR Native-Speaker Review - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 26-pt-br-native-speaker-review
**Areas discussed:** Review workflow, Delivery format, Glossary & register, Done-gate & plan split

---

## Review workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Claude proposes, you approve | Claude drafts improved PT-BR per string; operator approves/tweaks/rejects | ✓ |
| You dictate every fix | Claude shows EN + current PT-BR; operator types each correction | |
| Claude proposes, flag only doubts | Claude auto-applies obvious fixes, surfaces only uncertain ones | |

**User's choice:** Claude proposes, you approve
**Notes:** Operator is the PT-BR native speaker — review loop is operator-facing approval.

---

## Delivery format

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown review table | One EN → current → proposed → note table per catalog, marked up in one pass | ✓ |
| Batched AskUserQuestion | ~10-15 interactive approve/tweak batches by section | |
| Edit then git diff | Claude applies all proposed PT-BR, operator reviews git diff | |

**User's choice:** Markdown review table

### Table scope (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| All 98, changes flagged | Every marked string; CHANGED|KEPT column | ✓ |
| Only changed strings | Table lists only proposed edits | |
| All 98, sorted changed-first | Full list, changed grouped at top | |

**User's choice:** All 98, changes flagged

---

## Glossary & register

### Register

| Option | Description | Selected |
|--------|-------------|----------|
| Informal você, no direct address | Standard Brazilian app tone, você implied, imperatives | ✓ |
| Explicitly warm/personal | More personal phrasing for direct-address copy | |
| You decide | Claude picks per string | |

**User's choice:** Informal você, no direct address

### Glossary (technical/brand terms)

| Option | Description | Selected |
|--------|-------------|----------|
| VFC + keep BPM/brand names | HRV→VFC, BPM stays 'BPM', app/brand names English | |
| Keep HRV in English too | Leave 'HRV' untranslated | |
| You decide per term | Claude picks, lists in review table | |

**User's choice:** Other (free text) — "HRV → VFC, BPM → RPM, 'Resonant Breathing' app names + 'Forrest Knutson' stay English."
**Notes:** Operator overrode the BPM-stays default — wants `BPM → RPM` (Respirações Por Minuto) in the PT-BR label. EN `bpmLabel` stays `BPM`. Treated as a CHANGED row, not a silent marker removal.

---

## Done-gate & plan split

| Option | Description | Selected |
|--------|-------------|----------|
| One plan, both catalogs | Single plan, both catalogs, all 98 markers | ✓ |
| Two plans, per catalog | Plan 1 strings.ts, Plan 2 learnContent.ts | |
| You decide | Planner picks split | |

**User's choice:** One plan, both catalogs

### Marker-guard test (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Add a marker-guard test | Test fails if marker reappears in src/content/ | ✓ |
| No guard test | Rely on grep=0 done-gate only | |
| You decide | Planner decides | |

**User's choice:** Add a marker-guard test

---

## Claude's Discretion

- Exact wording of each proposed PT-BR correction (subject to operator approval).
- Review-table layout / column order.
- Marker-guard test as standalone file vs folded into an existing `src/content/` test.

## Deferred Ideas

None — discussion stayed within phase scope.
