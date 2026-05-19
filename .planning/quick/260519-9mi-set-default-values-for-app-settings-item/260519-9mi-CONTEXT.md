# Quick Task 260519-9mi: Set default values for app Settings items — Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Task Boundary

Set the default value for each of the 5 items in the app Settings dialog
(`src/components/SettingsDialog.tsx`: Theme → Variant → Cue → Timbre → Language).
Each default was confirmed with the operator one-by-one. This task applies the
two that changed; the other three are explicitly confirmed UNCHANGED.
</domain>

<decisions>
## Implementation Decisions

All defaults live in `src/domain/settings.ts`.

### UNCHANGED (confirmed — do NOT touch)
- `DEFAULT_THEME` = `'system'`
- `DEFAULT_VARIANT` = `'orb'`
- `DEFAULT_LOCALE` = `'en'`

### DEFAULT_CUE — CHANGE `'labels'` → `'arrow'`
- Edit `export const DEFAULT_CUE: CueStyleId = 'labels'` → `'arrow'`.
- The current trailing comment `// FIXED per CONTEXT D-01 / success criterion 5`
  is now stale — that earlier "fixed" decision is being deliberately overridden
  by the operator. Replace the comment with one noting the default is `'arrow'`,
  set via quick task 260519-9mi (2026-05-19), superseding the earlier CONTEXT
  D-01 "labels (fixed)" decision.

### DEFAULT_TIMBRE — CHANGE `'bowl'` → `'sine'`
- Edit `export const DEFAULT_TIMBRE: TimbreId = 'bowl'` → `'sine'`.

### Behavior notes (no extra code needed)
- Both defaults are the fallback the storage coercers use when a persisted value
  is missing/invalid (`coerceCue` / `coerceTimbre` in `src/storage/prefs.ts`).
  Changing the constant only affects NEW users and users with no/invalid
  persisted value — a returning user with a valid persisted cue/timbre keeps
  their choice. No migration code is required.
- `CUE_OPTIONS` and `TIMBRE_OPTIONS` are UNCHANGED — only the default pointer
  moves.

### Claude's Discretion
- Exact wording of the replaced `DEFAULT_CUE` comment.
- Test-fixture updates: any test asserting the OLD defaults (`cue: 'labels'` or
  `timbre: 'bowl'` as the resolved default / coercer fallback) must be updated to
  `'arrow'` / `'sine'`. Known reference sites: `src/domain/settings.test.ts`,
  `src/storage/prefs.test.ts`, `src/app/App.test.tsx`, `src/app/App.session.test.tsx`.
  Tests that exercise a specific NON-default value are unaffected — update only
  the assertions that depend on the default itself.
</decisions>

<specifics>
## Specific Ideas

Files in scope:
- `src/domain/settings.ts` — `DEFAULT_CUE`, `DEFAULT_TIMBRE` (+ comment).
- Tests referencing the defaults: `src/domain/settings.test.ts`,
  `src/storage/prefs.test.ts`, `src/app/App.test.tsx`,
  `src/app/App.session.test.tsx` — update only assertions tied to the default.

`src/storage/prefs.ts` and `src/hooks/useAudioCues.ts` consume `DEFAULT_CUE` /
`DEFAULT_TIMBRE` by reference — no edits needed there, they pick up the new
values automatically.

Verification gate: `npm run build` clean + `npm run test:run` with no NEW
failures. The 3 pre-existing `App.persistence.test.tsx` LOCL-03 failures are
known and unrelated — do not count them.
</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in the decisions above. This
task supersedes the earlier "DEFAULT_CUE fixed to labels" decision (settings.ts
comment referencing CONTEXT D-01 / success criterion 5).
</canonical_refs>
