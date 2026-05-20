# Phase 31: Navi Kriya Engine & Session - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 31 delivers the complete, runnable Navi Kriya practice end to end: the
app-paced front/back OM-counting engine (auto-advance front → back → next round,
fixed 4:1 ratio), the Navi Kriya controls UI, the four cue sounds, pause /
resume / end, the live counting session screen, and per-practice Navi Kriya
stats that a completed session records.

Phase 30 left named, empty slots — the practice-aware `SettingsForm` NK
controls slot, the stub Start button, and the active-practice-scoped
`StatsFooter`. Phase 31 **fills those slots**; it does not rebuild the screen
(Phase 30 D-01). The `NaviKriyaSettings` data model + validators already shipped
in Phase 30 (D-02) — Phase 31 consumes them and builds the editing UI, not a new
settings shape.

Covers requirements NK-01 through NK-09. Per-practice + shared Learn content and
PT-BR localization of all new copy are Phase 32 — Phase 31 ships EN copy only.

</domain>

<decisions>
## Implementation Decisions

### Counting screen visuals
- **D-01:** The Navi Kriya session screen **reuses the user's chosen visual
  variant shape** (Orb / Square / Diamond) — but instead of breathing, the shape
  **pulses once per OM**. The variant picker stays meaningful for both practices;
  the app keeps one visual identity.
- **D-02:** The live OM count number sits **centered inside the shape** — the
  slot the In/Out `CueGlyph` occupies for resonant. It is the plain current
  count, **not** a "count / target" ratio.
- **D-03:** A compact **readout strip below the shape** carries the phase label
  (FRONT / BACK), the round (N of total), and the phase target count — mirroring
  where resonant's `SessionReadout` sits. The shape holds only the live count;
  everything else is one calm strip.
- **D-04:** Per-OM visual feedback is a **gentle scale pulse only** — a soft
  scale-up-and-settle, **no expanding ring**. Stays closest to the app's calm
  tone. OS `prefers-reduced-motion` gets a static fallback (Phase 2 D-05/06/07).

### Cue sound design
- **D-05:** **All four** NK cues (front marker, back marker, per-OM tick, end
  chord) render through the user's selected **shared timbre** (Bowl / Bell /
  Sine / Chime) — the timbre picker stays meaningful for Navi Kriya. Consistent
  with how resonant cues honor the timbre choice.
- **D-06:** Front marker = a **rising** two-tone gesture; back marker = a
  **falling** two-tone gesture (the spike-003 directional pattern — direction
  maps to entering vs. winding down a phase).
- **D-07:** The per-OM tick is **soft and barely-there** — a quiet, short tick
  that anchors the OM rhythm in peripheral hearing without pulling focus from
  chanting. On by default (`perOmCue`), easy to ignore or toggle off.
- **D-08:** The end-of-practice cue is a **resolved low multi-note chord** that
  rings out — a clear, restful "practice complete", distinct from the two-tone
  markers.

### OM tempo values
- **D-09:** The **medium** OM length anchors to **Forrest's measured
  follow-along pace ≈ 2.16 s/OM** — a user on the default tempo is chanting at
  the authentic practice pace.
- **D-10:** Modest tempo spread — **fast ≈ 1.75 s / medium ≈ 2.16 s / slow ≈
  3.0 s** per OM. All three values live in **one easily-adjustable constant**
  (the spike's "keep adjustable" note); exact values finalized during the build.

### Start & end session flow
- **D-11:** Start → a **brief quiet settle** (a few seconds, to set the phone
  down and settle) → front marker → `LEAD_MS ≈ 700 ms` → first OM. **No 3,2,1
  countdown** — the settle pause plus the front marker carry the start.
- **D-12:** A naturally completed session shows an **`EndSessionDialog`-style
  native dialog** announcing completion with a short summary — consistent with
  how a resonant session ends.
- **D-13:** Ending a session **early** (before all rounds finish) **records what
  was done** — it increments the NK session count, adds fully-completed rounds
  to "rounds completed", and adds elapsed minutes. Any practice the user did is
  honored in their Navi Kriya history.
- **D-14:** The **estimated session duration** is shown **next to the NK
  settings controls** and updates **live** as the user changes rounds / front
  count / OM length — they see the time impact while configuring.

### Claude's Discretion
- Exact settle-delay length (D-11) — ~3–5 s is a reasonable starting point;
  keep it adjustable. Exact `LEAD_MS` finalization (≈ 700 ms seed).
- Whether Navi Kriya gets its own engine hook (parallel to `useSessionEngine`)
  or shares structure — planner's call. The spike-003 source is the reference
  for the `useRef` + self-rescheduling `setTimeout` record shape.
- Paused-state visuals — count freeze + a calm paused indicator; reuse the
  `SessionControls` pause/resume/end posture.
- Exact cue synthesis parameters within the chosen timbre (D-05–D-08).
- Wake lock during a Navi Kriya session — reuse the existing `useWakeLock`
  progressive enhancement; Navi Kriya is a hands-off practice.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Navi Kriya engine blueprint (spike findings — authoritative)
- `.claude/skills/spike-findings-hrv/references/navi-kriya-practice.md` —
  **PRIMARY reference for this phase.** The front/back phase machine,
  `start()`/`onOm()` pseudocode, `LEAD_MS`, tempo (~2.16 s/OM real),
  display spec, the four cue roles, and the explicit "what to avoid" list.
- `.claude/skills/spike-findings-hrv/SKILL.md` — requirements index + the
  non-negotiable design decisions for the second-practice work.
- `.claude/skills/spike-findings-hrv/references/multi-practice-architecture.md`
  — the `practice`-above-`mode` concept, per-practice state vs. shared chrome,
  the switcher, the `SettingsDialog` split.
- `.claude/skills/spike-findings-hrv/sources/003-navi-kriya-practice/` —
  runnable spike source: the exact `setTimeout` / `useRef` engine pattern.

### Requirements & prior phase
- `.planning/REQUIREMENTS.md` — NK-01..09 (this phase), the v1.5 Out-of-Scope
  table (no tap-to-count, no breath-syncing, no user-overridable ratio).
- `.planning/phases/30-multi-practice-architecture-switcher/30-CONTEXT.md` —
  Phase 30 decisions: the Phase 30→31 scaffold seam (D-01), the `NaviKriyaSettings`
  data model defined-now (D-02), practice-aware `SettingsForm` (D-03),
  active-practice-scoped `StatsFooter`/reset (D-07/08).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/domain/naviKriyaSettings.ts`: `NaviKriyaSettings` type +
  `DEFAULT_NK_SETTINGS` (`frontCount` 100, `omLength` 'medium', `rounds` 3,
  `perOmCue` true) + `isValidFrontCount`/`isValidOmLength`/`isValidRounds` —
  **already shipped in Phase 30 (D-02)**. The engine consumes these; the new
  controls UI edits them. `frontCount` MUST stay a multiple of 4.
- `src/hooks/useSessionEngine.ts`: resonant's session engine hook — the model
  and reference for the NK engine, though NK is OM-count-driven, not
  breath-clock-driven.
- `src/audio/audioEngine.ts` + `cueSynth.ts` + `timbres.ts`: cue routing — the
  four NK cues express through here with the user's selected timbre (D-05).
- `src/components/SessionControls.tsx` / `SessionReadout.tsx`: resonant
  in-session controls + readout — NK reuses the pause/resume/end posture and the
  readout-strip pattern (D-03).
- `src/components/EndSessionDialog.tsx`: native `<dialog>` end pattern — NK's
  natural-completion dialog reuses it (D-12).
- `src/components/OrbShape.tsx` / `SquareShape.tsx` / `DiamondShape.tsx` +
  `shapeConstants.ts` / `CueGlyph.tsx`: the visual variants — NK pulses the
  chosen shape with the count number inside, in place of the `CueGlyph` (D-01/02).
- `src/components/SettingsForm.tsx`: practice-aware since Phase 30 (D-03) — the
  NK controls UI fills its empty NK slot.
- `src/storage/stats.ts` (`recordSession`/`resetStats`/`coerceStats`/`ZERO_STATS`)
  + `src/storage/practices.ts`: NK stats record into `practices.naviKriya.stats`.
- `src/hooks/useWakeLock.ts`: reuse for hands-off NK sessions.
- `src/hooks/usePrefersReducedMotion.ts`: drives the static fallback for the
  per-OM pulse (D-04).
- `src/content/strings.ts`: new EN copy — phase labels, round readout, completion
  dialog, duration estimate; PT-BR is Phase 32.

### Established Patterns
- Phase 30 left named, empty slots (NK controls slot in `SettingsForm`, stub
  Start) — Phase 31 **fills** them, it does not rebuild the screen (Phase 30 D-01).
- The NK engine is a self-rescheduling `setTimeout` chain held in a `useRef`,
  with `{phase, round, count}` mirrored into React state for display (spike 003).
- Audio (`audioEngine`) must be initialized inside the first "Start" user
  gesture — browser autoplay policy.
- Per-field, non-throwing coercion at the storage boundary — already in place
  for `NaviKriyaSettings`.

### Integration Points
- `src/app/App.tsx` (~832 lines): gains the NK engine wiring and renders the NK
  session screen when `activePractice === 'naviKriya'` and a session runs; the
  Phase 30 stub Start becomes a live Start.
- `practices.naviKriya.settings` / `practices.naviKriya.stats` become live
  read/write targets. **Phase 30 carry-forward CR-01:** resonant settings still
  persist via the legacy flat `env.settings` path; Phase 31 — wiring NK settings
  — is the designated point to make `practices.{resonant,naviKriya}.settings`
  the real write target. Planner should resolve CR-01 here.

</code_context>

<specifics>
## Specific Ideas

- The NK session screen reuses the resonant screen's vocabulary — chosen variant
  shape, a readout strip below it, in-session controls — but the shape **pulses
  once per OM** instead of breathing, and the **count number replaces the In/Out
  glyph** inside the shape.
- The **medium** tempo is the authentic Forrest follow-along pace (~2.16 s/OM):
  the default practice is the real practice.
- All new copy is EN-only this phase; native-quality PT-BR is Phase 32.

</specifics>

<deferred>
## Deferred Ideas

- **Per-practice + shared Learn content and PT-BR localization** of all new
  Navi Kriya / multi-practice copy — Phase 32 (LEARN-02, LEARN-03, I18N-08).
- **A third / fourth practice** — Future requirement PRACTICE-F1; the top
  segmented switcher is sized for ~3–4 practices and must be revisited beyond.
- **v1.x carry-forward tech debt** — remains deferred (see STATE.md
  `## Deferred Items`).

</deferred>

---

*Phase: 31-navi-kriya-engine-session*
*Context gathered: 2026-05-17*
