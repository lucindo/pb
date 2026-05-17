# Phase 30: Multi-Practice Architecture & Switcher - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 30 delivers the structural foundation for hosting two practices in one app:
a `practice` concept above the existing intra-practice `mode`, per-practice
settings/stats persistence (with a `STATE_VERSION` migration so returning users
lose nothing), the top segmented practice switcher, and a clean split between
shared chrome settings and per-practice controls.

The Navi Kriya **engine, session, and controls UI** are Phase 31 — Phase 30
builds the practice-aware shell they slot into. When the user selects Navi Kriya
in Phase 30, they see a structural scaffold (heading + empty controls slot +
stub Start), not a runnable practice.

Covers requirements PRACTICE-01 through PRACTICE-06.

</domain>

<decisions>
## Implementation Decisions

### Navi Kriya placeholder (Phase 30 has no NK engine yet)
- **D-01:** The Navi Kriya practice screen renders a **structural scaffold** — a
  real practice-screen layout with the switcher, a practice heading, an empty
  practice-controls slot, and a disabled/stub Start button. Phase 31 swaps the
  live engine, orb, and controls into these existing slots rather than rebuilding
  the screen. Success criterion 1 (switching works) is fully verifiable in Phase 30.
- **D-02:** Phase 30 **defines the Navi Kriya settings data model now** —
  `NaviKriyaSettings` type + defaults (rounds 3, base front count 100, fixed 4:1
  front:back ratio, OM length fast/medium/slow) + validators + a non-throwing
  coercer — wired into the per-practice persistence map. PRACTICE-02 is fully
  satisfied for **both** practices at the end of Phase 30. Phase 31 adds only the
  engine and the controls UI; it does not define new settings shape.

### Settings reorganization (shared chrome vs per-practice controls)
- **D-03:** Per-practice controls **stay inline on the home screen**. The
  existing `SettingsForm` (currently the resonant bpm/ratio/duration/mode form)
  becomes **practice-aware** — it renders the active practice's controls
  (resonant knobs when resonant is active; the empty NK controls slot in Phase 30,
  filled by Phase 31). The shared chrome dialog (`SettingsDialog`: theme / variant
  / cue / timbre / language) is unchanged and serves both practices.
- **D-04:** The inline per-practice controls area gains a **heading naming the
  active practice** (e.g. "Resonant Breathing") so the knobs are unambiguous
  after a switch. This is a new copy string — EN now, PT-BR in Phase 32.

### Switcher labels & styling
- **D-05:** Switcher pills use **full practice names** — "Resonant Breathing"
  and "Navi Kriya". Both fit on a mobile width as a two-segment control. Practice
  display names are copy strings (EN now, PT-BR in Phase 32); "Navi Kriya" is a
  Sanskrit proper noun and stays untranslated.
- **D-06:** While a session is in progress the switcher is **dimmed in place** —
  visible but non-interactive (opacity + not-allowed cursor), matching how the
  chrome pickers already show their in-session disabled state. No hint text, no
  layout shift on session start/end.

### Stats footer scope
- **D-07:** `StatsFooter` shows **only the active practice's** stats and swaps
  when the user switches practice — consistent with the home screen (switcher,
  controls, heading all track the active practice). In Phase 30 the Navi Kriya
  numbers are all zero until Phase 31's engine records a session.
- **D-08:** Reset (via `ResetStatsDialog`) wipes **only the active practice's
  stats**; the other practice's history is untouched. The dialog copy names the
  practice being reset — a new/changed copy string (EN now, PT-BR in Phase 32).

### Claude's Discretion
- Component-level structure of the practice-aware `SettingsForm` (one generic
  component vs per-practice components) — implementation detail for the planner.
- Exact pill visual treatment (the spike-002 pattern is the starting point).
- Switch-transition animation (if any) — keep it calm; no decision was forced.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Multi-practice blueprint (spike findings — authoritative)
- `.claude/skills/spike-findings-hrv/SKILL.md` — requirements + findings index
  for the second-practice work; non-negotiable design decisions from spiking.
- `.claude/skills/spike-findings-hrv/references/multi-practice-architecture.md` —
  the `practice` concept above `mode`, the `AppState` shape, the top
  segmented-control switcher, the `SettingsDialog` split, the `STATE_VERSION`
  migration, and the explicit "what to avoid" list. **Primary reference for this phase.**
- `.claude/skills/spike-findings-hrv/references/navi-kriya-practice.md` — NK
  practice structure (4:1 ratio, default counts, cue roles, tempo) — needed for
  the Phase 30 NK settings data model (D-02); engine detail is Phase 31.
- `.claude/skills/spike-findings-hrv/sources/001-multi-practice-shell/` and
  `.../002-switcher-ux/` — runnable spike sources for the shell and switcher UX.

### Requirements
- `.planning/REQUIREMENTS.md` — PRACTICE-01..06 (this phase), with the v1.5
  Out-of-Scope table and PRACTICE-F1 (third practice deferred).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/storage/storage.ts`: `STATE_VERSION` (currently `1`) + the `migrateEnvelope`
  seam — already built as the explicit migrate-on-read hook. Adding the
  `practices` map + `activePractice` is exactly the "non-trivial schema change"
  that seam was reserved for. `readEnvelope`'s forward-compatible top-level spread
  is preserved through the seam.
- `src/storage/prefs.ts`: `coercePrefs` + per-field coercers — `theme/timbre/
  variant/cue/locale` are the shared chrome; this file's pattern (non-throwing,
  per-field fallback, prototype-pollution-safe) is the model for new per-practice
  coercers.
- `src/storage/settings.ts` (`coerceSettings`) and `src/storage/stats.ts`
  (`coerceStats`, `recordSession`, `resetStats`, `ZERO_STATS`): the existing
  single-practice settings + stats subtrees become `practices.resonant`'s
  settings + stats. `resetStats` currently wipes one stats subtree — D-08 makes
  it per-practice-scoped.
- `src/domain/settings.ts`: existing enum/validator pattern (`isValid*`,
  `DEFAULT_*`, `validateSettings`) is the template for the new `NaviKriyaSettings`
  type, defaults, and validators (D-02).
- `src/components/SettingsDialog.tsx`: the shared chrome dialog — stays as the
  one shared chrome screen, unchanged in structure.
- `src/components/SettingsForm.tsx`: today's resonant session-knob form — becomes
  the practice-aware inline controls host (D-03).
- `src/components/StatsFooter.tsx` / `src/components/ResetStatsDialog.tsx`:
  active-practice-scoped per D-07/D-08.

### Established Patterns
- Per-field, non-throwing coercion at the storage boundary; a single drifted
  field never discards the rest of the envelope. New per-practice coercers MUST
  follow this.
- The existing intra-practice `mode` (`standard`/`stretch`) is **inside** a
  practice's settings — the new `practice` concept sits one level above it.
- In-session disabling: chrome pickers receive `disabled={inSessionView}`. The
  switcher's dimmed-in-place lock (D-06) reuses this exact posture.
- The migration must coerce a pre-existing single-practice envelope into
  `practices.resonant` — this is how PRACTICE-04 (returning user loses nothing)
  is satisfied. `index.html`'s FOUC theme-resolve script reads `hrv:state:v1`;
  the `:v1` key suffix should NOT change (in-envelope `STATE_VERSION` bump only).

### Integration Points
- `src/app/App.tsx` (832 lines) wires settings/stats/prefs load+save, the session
  engine, and the dialogs — it gains `activePractice` state, the switcher, and
  practice-scoped settings/stats plumbing.
- `src/storage/storage.ts` `migrateEnvelope` — the migration step lands here.
- `src/content/strings.ts` — new copy strings (practice names, controls heading,
  practice-named reset copy) added in EN; PT-BR is Phase 32.

</code_context>

<specifics>
## Specific Ideas

- The home screen consistently reflects the **active practice** — switcher,
  inline controls + heading, and stats footer all track it together. Switching
  practice swaps all three; chrome (theme/language/etc.) never changes.
- The Phase 30 → Phase 31 seam is deliberate: Phase 30 leaves named, empty slots
  (NK controls slot, stub Start) that Phase 31 fills — not a screen Phase 31 rebuilds.

</specifics>

<deferred>
## Deferred Ideas

- **Navi Kriya engine, session loop, cue sounds, live on-screen count, and the
  NK controls UI** — Phase 31 (NK-01..09). Phase 30 only defines the NK settings
  data model and the empty scaffold.
- **Per-practice + shared Learn content and PT-BR localization of all new copy**
  — Phase 32 (LEARN-02, LEARN-03, I18N-08). Phase 30 adds new strings in EN only.
- **A third/fourth practice** — Future requirement PRACTICE-F1; the top
  segmented control is sized for ~3–4 practices and must be revisited beyond that.
- **v1.x carry-forward tech debt** — remains deferred (see STATE.md Deferred Items).

</deferred>

---

*Phase: 30-multi-practice-architecture-switcher*
*Context gathered: 2026-05-17*
