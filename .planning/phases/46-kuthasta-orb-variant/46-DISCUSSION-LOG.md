# Phase 46: Kuthasta orb variant — Discussion Log

> **Audit trail for human reference.** Not consumed by downstream agents (researcher, planner, executor). Decisions captured in `46-CONTEXT.md`.

**Date:** 2026-05-25
**Phase:** 46-kuthasta-orb-variant
**Mode:** discuss (default)
**Areas discussed:** Star visibility, Disc indigo gradient scope, NK back-phase signal, Token naming + StarGlyph location

## Pre-discussion landscape

The spike-012 README's "Implementation Mapping" and "Locked V5 values" sections, combined with the ROADMAP success criteria for Phase 46 and the locked memory rules ([[feedback_spike_locked_values]], [[feedback_spike_implementation_fidelity]], [[feedback_spike_is_design_not_features]]), pre-decided almost the entire phase:

- Spike-012 V5 hex / rgba / gradient values are applied verbatim.
- Exposure strategy = (a) new `BreathingShapeVariant` value, query-string only (the spike README's three exposure options a/b/c).
- Aliases `kuthasta` / `star` via the existing parser pattern.
- Unrecognized values fall back to `orb-halo`.
- Phase 46 is design-only — no feature additions, no relocation, no data-model changes.

Only 4 areas were genuinely open, and the operator selected all 4 to discuss.

## Area 1 — Star visibility across orb states

**Spike README L302 explicitly defers this:** "the decision on what to render at Idle/Complete (still star? no star?) is part of the build-phase exposure decision."

| Option | Description | Pick? |
|---|---|---|
| Running + Idle (recommended) | Star renders during active breath AND idle (still + ambient). Replaced by digit / OM count / checkmark in LeadIn / NK / Completion. | ✓ |
| Running only | Star only during active breath. Idle states show empty disc. | |
| Always (behind other content) | Star at every state, drawn behind digit / count / checkmark. | |

**Decision:** Running + Idle (D-01).

**Rationale:** Star = kutastha identity; the disc-occupying content during LeadIn / NK / Completion carries primary information (countdown digit, OM cycle count, completion signal) that cannot share centre space with a static glyph. Running + Idle gives kutastha presence whenever the disc is otherwise empty.

## Area 2 — Disc indigo gradient scope

**Open question:** the spike locks the indigo radial gradient for the active breathing disc, but OrbContainer currently accepts `discBg` per call site (production solid accent for Running/Idle/LeadIn/Complete, accent-strong for NK back-phase).

| Option | Description | Pick? |
|---|---|---|
| Tied to star — Running + Idle only (recommended) | Indigo gradient renders where the star renders. LeadIn / NK / Completion keep production solids. | ✓ |
| Always (full identity) | Indigo gradient in every spiritual-eye state — around digit / count / checkmark too. | |
| Running only | Indigo gradient only during active breath. Idle uses production solid accent under the star. | |

**Decision:** Tied to star — Running + Idle (D-02), later expanded to include NK by Area 3.

**Rationale:** Coherent rule — kutastha presence = indigo + star together. NK back-phase signal preserved automatically.

## Area 3 — NK back-phase signal with spiritual-eye

**Open question:** given D-01 + D-02, NK shows only gold halos (no indigo, no star, OM count over production accent / accent-strong). The operator chose to override that.

| Option | Description | Pick? |
|---|---|---|
| Keep partial identity (recommended) | NK gets gold halos only; production discBg + OM count. Front/back signal preserved naturally. | |
| Drop NK distinction — always indigo under OM count | Indigo gradient under OM count in both NK phases. Front/back signal collapses. | |
| Spec a second darker indigo for NK back-phase | Indigo gradient front + darker indigo gradient back. Preserves both NK signal AND kutastha identity. Off-spike. | ✓ |

**Decision:** Spec a second darker indigo for NK back-phase (D-03).

**Rationale:** Operator signal — NK front/back distinction is load-bearing UX, worth the off-spike colour spec. The original spike-012 lighter indigo stays verbatim (no re-tuning per [[feedback_spike_locked_values]]); the darker variant is a derivation for a state the spike harness did not exercise. Planner / executor proposes derived hex by uniformly darkening each stop (~10–15%); operator UATs and may re-spec.

**Effect on D-02:** D-02's "Running + Idle only" rule is expanded by D-03 to include NK. Final disc-fill matrix is now Running + Idle + NK (both phases, two indigo gradients) — LeadIn + Completion still use production solid accent.

## Area 4 — Token naming + StarGlyph location

### Token naming

| Option | Description | Pick? |
|---|---|---|
| Spike-proposed + `-strong` suffix (recommended) | `--color-orb-disc-spiritual-eye`, `--color-orb-disc-spiritual-eye-strong`, `--color-orb-halo-1-spiritual-eye`, `--color-orb-halo-2-spiritual-eye`. | ✓ |
| Shorter slug `kuthasta` | `--color-orb-disc-kuthasta` etc. Matches milestone name. | |
| Numbered variant style | `--color-orb-disc-v3` etc. Compact, opaque. | |

**Decision:** Spike-proposed slug + `-strong` suffix (D-06, D-07).

**Rationale:** Mirrors the `accent` / `accent-strong` production convention. Slug matches the `BreathingShapeVariant` value (`spiritual-eye`) — single vocabulary across type system and token surface.

### StarGlyph location

| Option | Description | Pick? |
|---|---|---|
| Co-located in `OrbShape.tsx` (recommended) | Same file as `CheckmarkGlyph` (`OrbShape.tsx:134-155`). | ✓ |
| New file `src/components/StarGlyph.tsx` | Dedicated module. Over-extracts for Phase 46 scope. | |

**Decision:** Co-located in `OrbShape.tsx` (D-04).

**Rationale:** Matches the existing project convention — `CheckmarkGlyph` is similarly small and orb-local.

## Auto-resolved (Claude's discretion)

- Exact darker-indigo hex stops for `--color-orb-disc-spiritual-eye-strong` (planner / executor proposes; operator UATs).
- Test surface choice (planner decides based on existing test discipline).

## Scope creep redirected

None — discussion stayed within the spike-012 + Phase 46 boundary.

## Deferred ideas

- Promoting through Settings UI — Phase 48.
- Persistence across sessions — Phase 47.
- Per-practice orb variant configuration — out of scope (REQUIREMENTS.md).
- User-visible variant picker on Practice Settings — out of scope (REQUIREMENTS.md).

---

*Discussion captured: 2026-05-25*
