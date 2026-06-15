# Plan — Pattern Breathing (pb)

This repo is an import of the HRV breathing app, being repurposed into a
**Pattern Breathing** app. Strategy: strip the HRV app down to a lean single-practice
base, then build pattern-breathing on the surviving core breathing engine.

## Roadmap

- [x] Decide seed: keep HRV/resonant timer as the base for pattern breathing
- [x] Remove Navi Kriya practice (engine, audio, settings, stats, copy)
- [x] Remove Stretch practice (ramp engine, settings, stats, copy)
- [x] Collapse the 3-way practice abstraction to a single HRV practice (switcher UI gone)
- [x] Remove dead Stretch/Navi Kriya bilingual copy + parity tests
- [x] Refresh `.project/PROJECT.md` to current single-practice shape; drop stale Stretch `SPEC.md`
- [x] Collapse vestigial single-practice scaffolding (5 steps under /ds-step-mode)
- [ ] (Pending user input) Receive remaining "things to remove" toward lean state
- [ ] (Pending user input) Implement pattern-breathing functionality

## Now

**State** — On branch `refactor/strip-to-pattern-breathing`. App is a single
HRV/resonant timer; the vestigial single-practice scaffolding is now collapsed.
Six commits this session (`4bb8f9b` docs → `77c949b`): removed dead `switcherIcon`
flag, collapsed the redundant audio view-model seam, renamed `nkCueSynth` →
`boundaryCueSynth`, made `scheduleImpl` required on the audio session clock, and
dropped the unused active-practice storage accessors. All gates green: `tsc -b`,
`eslint`, 993 vitest tests. `.project/PROJECT.md` is current; nothing pushed.

**Next** — Define the pattern-breathing spec, then start implementing it on the
lean breathing core. No spec exists yet (user to provide).

**Open questions**
- Concrete pattern-breathing spec — e.g. user-defined box / custom
  inhale–hold–exhale–hold patterns? Not yet defined; user will provide.
- Optional leftover: the write-only `activePractice` envelope field + its migration
  seeding survive for schema stability (no longer read in production). Retire only
  via a dedicated storage-migration pass if wanted — out of scope for the collapse.
