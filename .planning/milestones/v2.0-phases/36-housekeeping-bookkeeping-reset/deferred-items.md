# Phase 36 — Deferred Items

Pre-existing issues discovered during execution but out of scope per the executor scope-boundary rule (only auto-fix issues DIRECTLY caused by the current task's changes).

## Plan 36-06 (HOUSE-09)

### Pre-existing ESLint failures on `main` — not caused by HOUSE-09

`npm run lint` exits with 53 errors and 3 warnings on `main` BOTH before and after the HOUSE-09 test addition. Verified by stashing the HOUSE-09 change and re-running lint — identical 56 problems / 53 errors count.

The HOUSE-09 test addition introduced ZERO new lint errors.

**Sample errors (all pre-existing):**

- `src/storage/storage.test.ts:278-279` — `Forbidden non-null assertion` (in the v2→v3 block at lines 278-279, authored 2026-05-18 in commit `707f0cf5`, NOT in the new HOUSE-09 block)
- `src/storage/practices.ts:71` — `Forbidden non-null assertion`
- `src/storage/practices.ts:127-131` — `This assertion is unnecessary since it does not change the type of the expression` (3 errors)
- `src/hooks/useWakeLock.ts:120` — `react-hooks/exhaustive-deps` ref-cleanup warning
- Plus ~50 more across `src/components/`, `src/hooks/`, `src/audio/`, `src/lib/`, `src/storage/`, `src/app/`

**Why out of scope:** Phase 36 is a procedural / bookkeeping reset. CONTEXT §domain explicitly states "No user-visible behavior change. No source code changes except one new test file." HOUSE-09 only appends a new `describe` block to `storage.test.ts` — fixing 56 pre-existing lint issues across the codebase would balloon Phase 36 scope beyond the HOUSE-09 boundary.

**Disposition:** Folded into v2.0 Phase 44 POLISH-02 sweep (the "28 Info-severity findings + full `/gsd-code-review --all --fix`" rollup). The v1.0.1 per-commit green-gate invariant (D-11) is restated against the test/build/typecheck path; the lint half of the gate has been failing on `main` for some time and the appropriate fix is the Phase 44 cleanup pass, not a Phase 36 ad-hoc sweep.

**Verification that HOUSE-09 itself is lint-clean:**

```
$ git stash && npm run lint 2>&1 | grep -c error  # before HOUSE-09: 53 errors
$ git stash pop && npm run lint 2>&1 | grep -c error  # after HOUSE-09: 53 errors (identical)
```

No new lint debt introduced by this plan.

### CONTEXT D-11 green-gate scope note

CONTEXT D-11 calls the full `tsc && lint && build && test` green-gate the "per-commit invariant" to be re-run once at the push boundary (Phase 36-09 / HOUSE-14). The lint portion is currently red on `main` independent of Phase 36 work. Plan 36-09 (push gate) will need to either (a) accept the pre-existing lint debt and push regardless, (b) split the green-gate into the typecheck + build + test triad (which exit 0) and defer lint to Phase 44, or (c) decide to do a focused lint sweep before the push. Operator decision; flag for plan 36-09.
