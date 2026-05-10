# Phase 4: Local Memory & Practice Stats - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 04-local-memory-practice-stats
**Areas discussed:** Stats counting rules, Stats placement & empty state, Reset UX, Persistence scope, Display format, Test infrastructure

---

## Stats Counting Rules

### When does a session count toward "total sessions"?

| Option | Description | Selected |
|--------|-------------|----------|
| Any reached t=0 | Counts as soon as the lead-in ends and `session.start()` fires. Manual End right after still counts. | |
| Min elapsed (e.g. 60s) | Only count if the session ran ≥ N seconds before End / completion. Filters accidental Starts. | ✓ |
| Only completed timed | Only timed sessions that reach 'Session complete' count. Manual End and open-ended don't add to total. | |

**User's choice:** Min elapsed threshold.

### How is "total minutes" computed?

| Option | Description | Selected |
|--------|-------------|----------|
| Actual elapsed | Wall-clock from `session.start` until end/complete. Manual End at 4:30 adds 4.5 min. | ✓ |
| Planned completed | Only the configured duration counts, and only when fully reached. Manual End adds 0. | |
| Actual, rounded down | Actual elapsed truncated to whole minutes (so a 4:30 session contributes 4 min). | |

**User's choice:** Actual elapsed.

### Does lead-in cancel affect stats?

| Option | Description | Selected |
|--------|-------------|----------|
| Never counts | Cancel during 3-2-1 records nothing. Session only "happens" from t=0 onward. | ✓ |
| Counts if reached t=0 | Lead-in cancel is invisible to stats (restates the rule explicitly). | |

**User's choice:** Never counts (lead-in is pre-session by SESS-05 framing).

### Minimum elapsed threshold value

| Option | Description | Selected |
|--------|-------------|----------|
| 30 seconds | Most permissive. Filters only accidental Start→End taps. ~3 breath cycles at 5.5 BPM. | ✓ |
| 60 seconds | Round number. ~5–6 cycles at 5.5 BPM. Also makes 'total minutes ≥ 1' a guarantee. | |
| 120 seconds | Stricter — ensures a real practice attempt, not a quick check. | |

**User's choice:** 30 seconds. Most permissive option chosen so stats reflect real practice without excluding short experiments.

### Edge case: completion below threshold

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — completion always counts | Reaching 'Session complete' bypasses the min threshold (1-min duration completes → counts). | ✓ |
| Threshold applies always | Even a completed 30s session is below threshold and skipped. | |

**User's choice:** Completion always counts.

### What does "last session" show?

| Option | Description | Selected |
|--------|-------------|----------|
| Date + duration | e.g. 'May 8, 2026 — 12 min'. Minimal, calm, fits one line. | ✓ |
| Date + duration + BPM/ratio | e.g. 'May 8 — 12 min — 5.5 BPM, 40:60'. More detail without recent-session list. | |
| Relative time + duration | e.g. 'Yesterday — 12 min'. Friendlier, but harder to parse for >7 days. | |

**User's choice:** Date + duration only.

---

## Stats Placement & Empty State

### Where do practice stats live?

| Option | Description | Selected |
|--------|-------------|----------|
| Below settings, in same card | Inside the existing white card on idle. Small section under the Duration stepper. | |
| Separate card below main | A second small card stacked under the main card. Visually grouped apart. | |
| Footer strip, single line | Tiny inline summary below the existing main card / "Timing stays local..." caption. Reset becomes a small text link. | ✓ |

**User's choice:** Footer strip below the main card. Two short lines: `12 sessions · 47 min total` then `Last: May 7 · Reset`.

### What shows before the first session is recorded?

| Option | Description | Selected |
|--------|-------------|----------|
| Hide stats area entirely | Section appears only after the first counted session. Cleanest first-visit screen. | ✓ |
| Show with calm empty copy | e.g. 'No sessions yet. Start when you're ready.' | |
| Show zeros | '0 sessions · 0 min — Last: —'. Visible structure, dashes for missing values. | |

**User's choice:** Hide entirely. First-visit users see clean intro, no implication they're "behind".

### Are stats hidden during a running session?

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden during session view | Stats only on idle (matches Phase 2 D-16 hiding settings during lead-in + running). | ✓ |
| Always visible | Stats persist on screen even during running. Risks pushing orb below the fold. | |

**User's choice:** Hidden during session view.

---

## Reset UX

### Reset granularity

| Option | Description | Selected |
|--------|-------------|----------|
| One 'Reset' — wipes both | Single action clears stats AND restores default settings. | |
| One 'Reset' — stats only | Reset clears stats. Settings persist independently. No 'Reset settings' button. | ✓ |
| Split: Reset stats / Reset settings | Two distinct actions. More control, more UI surface. | |

**User's choice:** Stats-only reset. Settings personalisation should not be wiped by accident.

### Confirmation before reset

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm via dialog | Reuses the EndSessionDialog pattern: title + 'Reset' / 'Keep' buttons, default focus on Keep. | ✓ |
| One-tap, no confirm | Reset wipes immediately. Risk of accidental clear. | |
| Inline two-step (tap to arm) | First tap turns 'Reset' into 'Tap again to confirm' for ~3s, then reverts. No modal. | |

**User's choice:** Confirm via dialog. Symmetric with End-session destructive action.

### Where does Reset live in the footer strip?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline text link in strip | 'Last: May 7 · Reset' — small, calm, blends with footer copy. | ✓ |
| Right-aligned small button | Stats text on the left, small outlined Reset button on the right. | |
| Below the footer strip | Stats text on its own line; Reset rendered as a separate small button below. | |

**User's choice:** Inline text link. Implementation must still meet the 44×44 hit-area floor via tap-target padding.

---

## Persistence Scope

### Does mute preference survive reload?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — persist mute | If user mutes, stays muted on next visit. LOCL-01 explicitly lists 'audio preference'. | ✓ |
| No — always default ON | Mute resets to OFF every visit. Conflicts with LOCL-01 wording. | |

**User's choice:** Persist mute. Phase 3 D-07 first-visit-default-ON survives only when no stored value exists.

### Settings restore — validation policy

| Option | Description | Selected |
|--------|-------------|----------|
| Validate, fall back per-field | Each field validated against current options. Invalid field → DEFAULT_SETTINGS value; valid fields restored. | ✓ |
| Validate, fall back to all defaults | If any field is invalid, discard the whole stored object and use DEFAULT_SETTINGS. | |
| Restore verbatim, no validation | Trust storage. Risks RangeError from validateSettings(). | |

**User's choice:** Per-field fallback. Whole object never discarded if only one field drifted.

### localStorage write failure

| Option | Description | Selected |
|--------|-------------|----------|
| Silent fallback to in-memory | App keeps working in-session; nothing persists across reload. No user-visible notice. | ✓ |
| Silent + log to console | Same behavior + console.warn for devs. Still no user-visible notice. | |
| User-visible inline note | Small caption near stats: 'Your browser blocks local storage; stats won't be saved.' | |

**User's choice:** Silent fallback. Mirrors Phase 3 D-10 silent-fallback posture for AudioContext failures.

---

## Display Format

### "Total minutes" display past 60 minutes

| Option | Description | Selected |
|--------|-------------|----------|
| Always plain minutes | '47 min', '127 min', '1042 min'. Simple, unambiguous. | |
| Switch to 'h m' ≥ 60 min | '47 min' → '2h 7m' → '17h 22m'. Friendlier at scale. | |
| Switch to hours ≥ 60 min, decimal | '47 min' → '2.1 hours' → '17.4 hours'. Compact, calm, no h/m jargon. | ✓ |

**User's choice:** Decimal hours past 60 minutes. One decimal place.

---

## Test Infrastructure

### Date.now() injection

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — inject a clock dependency | Storage layer takes a `now()` function so tests can assert exact stored timestamps. Matches sessionController's `performance.now()` injection pattern. | ✓ |
| No — Date.now() + vi.useFakeTimers() | Read Date.now() at the call site; tests use vitest fake timers. Less indirection. | |

**User's choice:** Inject a clock dependency. Defaults to `Date.now`.

---

## Claude's Discretion

The user explicitly left the following to research/planning:

- Storage key naming, schema layout, optional `version` field for future migration.
- Module shape and file location (`src/storage/`, `src/stats/`, hook vs plain module).
- Exact JSON shape of the persisted object.
- Aggregation precision (seconds vs ms internally) — only the display format is locked.
- Migration policy beyond per-field fallback.
- Date formatting library (`Intl.DateTimeFormat` is the obvious default).
- Reset confirm dialog reuse strategy: parametrise `EndSessionDialog` vs extract a generic `ConfirmDialog` vs add `ResetStatsDialog` — planner picks based on cleanest diff.

## Deferred Ideas

- Recent-session list (v2 LOCL-04).
- Streaks, achievements, weekly summaries (out of scope per PROJECT.md).
- Charts, sparklines.
- Cloud sync, accounts, multi-device merge (out of scope per PROJECT.md).
- Export / import stats JSON.
- User-visible storage-failure notice.
- "Reset settings" affordance (explicitly rejected).
- Storage schema versioning / migration framework.
- Time-zone handling for "Last session" (local-tz only in v1).
- Per-session BPM/ratio/audio tags in stored last-session.
