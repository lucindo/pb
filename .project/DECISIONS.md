# Decisions — code-cleanup branch

Pre-pattern-breathing cleanup. Resolves the structural findings from
`/ds-code-review` that were not mechanically auto-fixed.

## D1 — Shape of pattern-breathing (lynchpin)

**Q:** Is pattern-breathing one configurable practice, multiple discrete
practices, or one engine with named presets? This decides whether the leftover
multi-practice scaffolding is dead weight or a seam to keep.

**A:** **Presets over one engine.** One configurable engine; named presets
(e.g. Box = 4/4/4/4) are *data* selectable in the UI, not separate practice
types with their own engine/audio/stats.

**Rationale:** Presets are data, not practice types — so the old per-practice
scaffolding (kind discriminant, per-practice factories, endSessionDialogs
array, switcher namespace) stays dead and gets collapsed. A future preset list
is new data work, unrelated to the old switcher abstraction.

## D2 — Switcher namespace / name collision

**Q:** The dead `practice.switcher` namespace holds two identical "Pattern
Breathing" strings (`patternBreathingName` for the header, `patternBreathingHeading`
for the sheet subtitle/aria). Collapse to one, or keep two keys?

**A:** **Collapse to a single `practice.name`** used by both surfaces; delete the
`switcher` namespace (EN + PT-BR + the type).

**Rationale:** YAGNI — both values are identical today, and the preset feature
will redesign these surfaces and can add a key when it genuinely needs one.
Closes PLAN.md's open app-name-vs-technique-name question.

## D3 — ViewModel factories

**Q:** `createPracticeSessionViewModel` / `createPracticeSettingsViewModel` are
single-call but have their own pure unit tests. Inline or keep?

**A:** **Keep both; strip only the dead `kind` field.**

**Rationale:** Pure, fast-to-test VM builders — the test seam outweighs the
"called once" smell. Inlining would force testing VM construction through the
React hook.

## D4 — Modal class-string duplication

**Q:** Extract a shared base for the ConfirmDialog / SettingsSheet modal class
strings, or leave them?

**A:** **Leave as-is.**

**Rationale:** Only two dialogs and they meaningfully diverge (padding, width,
text color). A shared base + overrides risks visual regression for little gain.
Revisit if a third modal appears.

## D5 — Remaining leftovers to collapse this branch

**Q:** Which leftover removals land in this cleanup branch?

**A:** **All of them:**
- Remove the single-member `kind: 'patternBreathing'` discriminant (both VM
  types + factories + the tests/mocks that pin it).
- Flatten `dialogs.endSessionDialogs[]` + its `.map()` to a single dialog VM
  rendered directly.
- Inline + drop the `type SessionPrimaryAction = BreathingPrimaryAction` alias.
- Lift the worker's `250` heartbeat literal to a named constant.

**Rationale:** All follow from D1 (single engine, presets-as-data); the user
opted to clear them now rather than carry dead generality into the feature work.
