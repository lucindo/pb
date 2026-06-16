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

## D6 — Pattern-breathing domain model (resolves the hold-phase open question)

**Q:** D1 settled "presets over one engine" but not the engine's parameters. What
exactly does a pattern look like, and how is a session bounded?

**A:** A pattern is **four phases + a multiplier + a round count**:

```ts
type BreathPhase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out'
interface PatternSettings {
  inhale: number; holdIn: number; exhale: number; holdOut: number  // counts; 0 ⇒ skip
  multiplier: number            // phaseSeconds = count × multiplier (internal name)
  rounds: number | 'open-ended'
}
```

- **Multiplier** scales all four phases uniformly. Kept as its own knob (not folded
  into the counts) because it's the *progression* control — users ramp it
  (1→2→3…) to lengthen holds while preserving the pattern. UI label deferred;
  `multiplier` is the internal name.
- **Presets are data** — named `PatternSettings`. Box-4 = `1·1·1·1 ×4`,
  Weiss/4-7-8 = `4·7·8·0 ×1`, 1-4-2 = `1·4·2·0 ×1`. Editing any field ⇒ "Custom".
  Surfaced via the same picker pattern as today's Ratio control.
- **Length = rounds** (or open-ended). No time-based setting; a calculated
  total-duration readout is display-only.
- **Cues: one per phase**, keyed by `BreathPhase`, fired at each non-zero phase's
  start (zero-count phases fire nothing) — same shape as today's single inhale /
  exhale cue, not a start+end pair per hold. Sound/visual design deferred.

**Rationale:** Smallest model that expresses the named techniques and the
progression use case. Fully **replaces** the resonance `bpm`/`ratio`/`durationMinutes`
parameterization — there is no separate rate knob; rate is implied by the counts.
This is the spec that unblocks architecture-plan Step 3 (`'in'|'out'` → `BreathPhase`,
`PatternSettings` across ~16 files). New app ⇒ no storage migration; stale `bpm`/`ratio`
envelopes fail validation and fall to defaults.
