# Phase 46: Kuthasta orb variant - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship spike-012 V5 Halo Flame as a third `BreathingShapeVariant` value `'spiritual-eye'` (with aliases `kuthasta` / `star`). The operator can request the new orb by appending `?breathingShape=spiritual-eye` (or `kuthasta` / `star`) to the URL and visually UAT the locked design in the real app — across Light/Dark themes and across HRV / Stretch / Navi Kriya practices — before deciding to promote it through Settings.

**Touches three files only:**

- `src/featureFlags.ts` — extend `BreathingShapeVariant` union by one variant; add aliases to the existing `BREATHING_SHAPE_FLAG.parse` per the established alias-list pattern.
- `src/components/OrbShape.tsx` — branch in `OrbContainer` when `variant === 'spiritual-eye'`; add a `StarGlyph` co-located alongside `CheckmarkGlyph`.
- `src/styles/theme.css` — add 4 new tokens per theme (8 total) for the spiritual-eye disc + halos.

**Strict non-goals for this phase** (Phase 47 / 48 / out-of-scope):

- No persistence layer (Phase 47).
- No Settings UI surface (Phase 48).
- No geometry / motion / ring-cue / reduced-motion / lead-in / completion-checkmark / idle-still/ambient affordance changes — all production-identical (KUTH-03 + roadmap success criterion 3).
- No new alias surface area beyond `spiritual-eye` / `kuthasta` / `star`.
- No build-time env var (`VITE_BREATHING_SHAPE` stays untouched — the dev override is the query string).

</domain>

<decisions>
## Implementation Decisions

### Spiritual-eye disc fill matrix

The spike-012 README locks the indigo radial gradient for the active breathing disc but explicitly defers the "what at Idle / Complete?" question to the build phase (`README.md` L302). The disc fill across the orb's six rendering states is now locked:

| State                       | Disc fill                                                             | Centre content       |
| --------------------------- | --------------------------------------------------------------------- | -------------------- |
| Running (active breath)     | `var(--color-orb-disc-spiritual-eye)` — light indigo radial gradient  | StarGlyph            |
| Idle (still or ambient)     | `var(--color-orb-disc-spiritual-eye)` — light indigo radial gradient  | StarGlyph            |
| LeadIn countdown (3 / 2 / 1)| `var(--color-breathing-accent)` — production solid (unchanged)        | digit (existing)     |
| NK front-phase              | `var(--color-orb-disc-spiritual-eye)` — light indigo radial gradient  | OM count (existing)  |
| NK back-phase               | `var(--color-orb-disc-spiritual-eye-strong)` — darker indigo gradient | OM count (existing)  |
| Completion (checkmark)      | `var(--color-breathing-accent)` — production solid (unchanged)        | CheckmarkGlyph (existing) |

- **D-01:** Star is **Running + Idle only**. LeadIn / NK / Completion keep their existing centre content (digit, OM count, checkmark) — star never coexists behind primary information.
- **D-02:** Indigo gradient renders at **Running + Idle + NK** (front and back). LeadIn and Completion keep the production solid `var(--color-breathing-accent)` — kutastha identity is a "practice surface" signal, not a transient-state signal.
- **D-03:** NK back-phase gets a **second darker indigo gradient** (`--color-orb-disc-spiritual-eye-strong`) to preserve the existing NK front/back signal (production today swaps `accent → accent-strong`). This is an **off-spike extension** — spike-012 did not exercise NK in its harness. The darker gradient is derived from the spike-locked indigo by uniform-darkening each stop (~10–15% darker; planner/executor proposes exact hex; operator UATs and may re-spec). Per `[[feedback_spike_locked_values]]`: the original spike-locked light gradient stays verbatim; this is a derivation for a state the spike did not cover, not a re-tuning of the spike result.

### StarGlyph component

- **D-04:** StarGlyph is **co-located in `src/components/OrbShape.tsx`** alongside `CheckmarkGlyph` (`OrbShape.tsx:134-155`). Single-file pattern matches the existing project convention — `CheckmarkGlyph` is similarly small and orb-local. No new file in `src/components/`.
- **D-05:** Geometry per spike-012 lock: SVG `0 0 100 100` viewBox, 5-point polygon, outer:inner radius ratio **2.5** (sharp silhouette), point straight up. Fills `#ffffff` (light) / `#fafafe` (dark). Stroke `rgba(255,255,255,0.20)` light / `rgba(255,255,255,0.12)` dark at stroke-width `0.5`. Star size **20% of disc**. Star fill inherits via `currentColor` from disc's `--color-breathing-on-accent` (matches CheckmarkGlyph pattern — `OrbShape.tsx:134-155`).

### Theme tokens

- **D-06:** Add **4 tokens per theme = 8 total** in `src/styles/theme.css` (light + dark blocks):
  - `--color-orb-disc-spiritual-eye` — light indigo radial gradient
  - `--color-orb-disc-spiritual-eye-strong` — darker indigo radial gradient (D-03; derived)
  - `--color-orb-halo-1-spiritual-eye` — gold halo outer (rgba)
  - `--color-orb-halo-2-spiritual-eye` — gold halo mid (rgba)
  - Halo-3 reuses the existing `--color-orb-halo-3` (cool slate, intentionally unchanged per spike L268).
- **D-07:** Token naming follows the **spike-proposed slug `spiritual-eye`** + `-strong` suffix for the NK back-phase variant. Mirrors the production `accent` / `accent-strong` convention. The variant identifier `spiritual-eye` matches `BreathingShapeVariant` in `src/featureFlags.ts` — single vocabulary across the type system and the token surface.

### Spike-012 V5 locked values (verbatim — no re-tuning)

Applied per `[[feedback_spike_locked_values]]` + `[[feedback_spike_implementation_fidelity]]`. The hex values below are not decisions to be revisited — they are spike-locked design contracts. Spike README "Locked V5 values" table:

| Token | Light | Dark |
|---|---|---|
| Halo 1 (outer)              | `rgba(202, 166, 98, 0.48)` | `rgba(206, 168, 100, 0.45)` |
| Halo 2 (mid)                | `rgba(168, 148, 116, 0.44)`| `rgba(170, 156, 122, 0.46)` |
| Halo 3 (inner, unchanged)   | `rgba(93, 104, 119, 0.50)` | `rgba(150, 156, 168, 0.52)` |
| Disc gradient (front)       | `radial-gradient(circle at 50% 42%, #4a5a96 0%, #34406f 60%, #2a356a 100%)` | `radial-gradient(circle at 50% 42%, #6c7cb6 0%, #4a5a96 60%, #38477e 100%)` |
| Disc on-colour              | `var(--color-breathing-on-accent)` (already white in both themes) | same |
| Star fill                   | `#ffffff` | `#fafafe` |
| Star stroke                 | `rgba(255,255,255,0.20)` | `rgba(255,255,255,0.12)` |
| Star stroke width           | `0.5` (in 0..100 viewBox) | same |
| Star size                   | 20% of disc | same |
| Star geometry               | 5-point polygon, outer:inner ratio 2.5, point up | same |
| Outer ring                  | `var(--color-breathing-accent)` (production unchanged) | same |
| Progress arc                | `var(--color-breathing-accent)` (production unchanged) | same |

The darker indigo gradient for NK back-phase (D-03) is derived from these locked values, not re-tuned from them.

### Feature flag (aliases, parser, default)

- **D-08:** Extend `BreathingShapeVariant` union to `'orb-halo' | 'minimal-rings' | 'spiritual-eye'`. Add to `BREATHING_SHAPE_FLAG.parse` (`src/featureFlags.ts:64-73`) the aliases:
  ```
  if (v === 'spiritual-eye' || v === 'kuthasta' || v === 'star') return 'spiritual-eye'
  ```
  Case-insensitive + trim per the existing `.trim().toLowerCase()` pattern. Unrecognized values continue to fall back to `'orb-halo'` (production default — KUTH-01, roadmap success criterion 4) via the existing `return null` path.

### Claude's Discretion

- Exact darker-indigo hex stops for `--color-orb-disc-spiritual-eye-strong` (D-03). Planner / executor proposes a uniform-darkening of the spike-locked indigo (~10–15% per stop) for operator UAT; operator re-specs at UAT time if it doesn't read right against the spike's lighter front-phase gradient.
- Whether to ship the off-spike NK back-phase gradient as a query-string-only "compose two tokens" or as a fully-spelled second token in `theme.css`. Token approach (D-06) is the default for symmetry; planner may diverge if implementation reveals a simpler path.
- Test surface choice. Existing `src/featureFlags.test.ts` should grow new alias cases (`spiritual-eye` / `kuthasta` / `star` / unrecognized → `orb-halo`). Existing `src/components/OrbShape.test.tsx` may or may not need spiritual-eye render assertions — planner decides based on the test file's current discipline.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spike contract (the design lock)

- `.planning/spikes/012-spiritual-eye-orb/README.md` — VALIDATED verdict, V5 Halo Flame description, "Locked V5 values" table, "Implementation Mapping" section, and the explicit "decision shape (a/b/c)" for build-phase exposure. The roadmap chose **(a)** new `BreathingShapeVariant` value.
- `.planning/spikes/012-spiritual-eye-orb/index.html` — running spike harness for visual reference of the V5 V5 final composition under both Light + Dark and both Idle + Running states (operator UATs the production build against this harness).

### Phase scope

- `.planning/REQUIREMENTS.md` §"Kuthasta Orb (KUTH)" — KUTH-01 through KUTH-04 (the four locked requirements for Phase 46).
- `.planning/ROADMAP.md` §"Phase 46: Kuthasta orb variant" — phase goal, dependencies, success criteria, plans-to-be-written marker, UI hint.

### Code surface

- `src/featureFlags.ts` — `BreathingShapeVariant` union (L7), `BREATHING_SHAPE_FLAG` parser (L64-73), `readFeatureFlags` aggregator (L99-106). Pattern reference for adding a third union member + aliases.
- `src/components/OrbShape.tsx` — `OrbContainer` (L305-431) is the single branching point; `CheckmarkGlyph` (L134-155) is the model for the new `StarGlyph`; the discBg prop (L291, L420) is the disc-fill string consumers thread per state.
- `src/styles/theme.css` L18-20 (light orb halos), L68-70 (dark orb halos) — the placement pattern for the new spiritual-eye tokens.

### Established conventions

- `.planning/spikes/CONVENTIONS.md` — spike artifact conventions (relevant if any planner-time questions arise about spike fidelity).

### No external specs beyond the above

The four code/spec files plus the spike directory fully define the design contract. No ADRs, no separate feature docs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets

- **`CheckmarkGlyph`** (`src/components/OrbShape.tsx:134-155`) — exact pattern for `StarGlyph`: `<span aria-hidden="true" className="relative z-10" style={{ color: 'var(--color-breathing-on-accent)' }}>` wrapping an SVG that uses `currentColor`. Inherits disc text colour automatically.
- **`OrbContainer`** (`src/components/OrbShape.tsx:305-431`) — single branching point. Already accepts `variant` prop and branches `variant === 'minimal-rings'` (L329-330, L387-413). Add a third branch for `variant === 'spiritual-eye'` in the same locations. The `discBg` string prop (L291, L420) is the disc-fill override hook — for spiritual-eye, override at the OrbBody / OrbIdle / OrbLeadIn / showCompletion call sites per the disc-fill matrix in D-01/D-02/D-03.
- **`BREATHING_SHAPE_FLAG`** parser (`src/featureFlags.ts:64-73`) — established alias-list pattern: `.trim().toLowerCase()` + `if (v === '...' || v === '...') return ...`. Add the third clause in the same shape.
- **Existing orb halo + disc tokens** (`src/styles/theme.css` L18-20 light, L68-70 dark) — the spiritual-eye tokens slot directly into the same blocks with the new naming (D-07).

### Established patterns

- **Spike-locked values are applied verbatim** (`[[feedback_spike_locked_values]]`, `[[feedback_spike_implementation_fidelity]]`). The V5 hex / rgba / gradient strings are NOT re-tuned at planning or implementation time. The only off-spike value in this phase is the NK back-phase darker indigo (D-03), explicitly noted as a derivation not in the spike.
- **Spike is design, NOT features** (`[[feedback_spike_is_design_not_features]]`). This phase adds zero new orb features — no new affordance, no new control, no relocation. It is a third value of an existing variant union, nothing more.
- **Feature flag aliases are case-insensitive trim + alias list** (`featureFlags.ts:67-72`). Followed verbatim for the new aliases.
- **Co-located orb glyphs** — `CheckmarkGlyph` is local to `OrbShape.tsx`, not extracted (D-04 follows this convention for `StarGlyph`).
- **`accent` / `accent-strong` naming pattern** for state-distinct disc tokens (D-07 follows this with `spiritual-eye` / `spiritual-eye-strong`).

### Integration points

- **NK practice** (touched only because `OrbShape` is the orb engine for all three practices) — NK back-phase visual signal is preserved via D-03's darker indigo gradient. NK rendering code itself is not edited; it threads through `OrbContainer`'s existing `discBg` prop and `nkPhase` branch (L249-253).
- **All breath-driving sites** thread through `OrbShape` and `OrbContainer` — no per-practice branches needed. The variant value is a single prop already plumbed through (`OrbShapeProps.variant`, L30).
- **Reduced-motion / lead-in / completion** — all existing code paths in `OrbShape` (L99-118) continue to handle these states; the spiritual-eye branch only affects disc fill + halo tokens + (during Running + Idle) the star centre child.

</code_context>

<specifics>
## Specific Ideas

- The kutastha identity for this app = **gold halos (always-on for spiritual-eye) + indigo disc (practice surface) + white star (when disc is empty)**. The three layers from the primary sources (Yogananda / Ananda) map naturally to the three orb layers (halo / disc / centre). The phase's job is to wire that mapping verbatim.
- Operator wants to **visually UAT in the real app** before any persistence (Phase 47) or UI surface (Phase 48) lands. The query-string-only exposure is intentional — fast feedback loop, easy to back out, no migration cost if the variant doesn't ship.
- Operator chose "spec a second darker indigo for NK back-phase" over the simpler "drop NK distinction" option (D-03), even at the cost of an off-spike colour. Signal: NK front/back distinction is load-bearing UX, not decorative.

</specifics>

<deferred>
## Deferred Ideas

- **Promoting spiritual-eye through Settings UI** — Phase 48 (`APPEAR-03` lists `kuthasta` as one of the three orb picker options). Phase 46 does not surface it through any UI.
- **Persisting the user's spiritual-eye selection across sessions** — Phase 47 (PREFS-01..04 promotes the four feature flags to persisted prefs via per-field `coerceSettings`).
- **Per-practice orb variant configuration** — REQUIREMENTS.md "Out of Scope": orb variant is app-wide chrome (like theme), not per-practice. The spike's option (b) "default for Navi Kriya only" is rejected.
- **User-visible variant picker on the Practice Settings sheet** — REQUIREMENTS.md "Out of Scope": Practice Settings stays clean per spike-010 separation; orb variant lives on the Appearance page only (when Phase 48 ships).
- **Cleanup of the spike harness** — `.planning/spikes/012-spiritual-eye-orb/` stays as the design reference. No deletion in this phase.
- **Promoting `VITE_BREATHING_SHAPE` env var to a build-time toggle** — explicitly out of scope (REQUIREMENTS.md: "Promoting `VITE_SWITCHER_TREATMENT` to a build-time toggle" — same posture for `VITE_BREATHING_SHAPE`; the env var is being absorbed into the persisted preference in Phase 47 + UI in Phase 48).

</deferred>

---

*Phase: 46-kuthasta-orb-variant*
*Context gathered: 2026-05-25*
