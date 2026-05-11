# Phase 4: Local Memory & Practice Stats - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 introduces a small browser-local persistence layer plus a calm idle-screen practice-stats surface. Users get three things across visits: (a) their last BPM, ratio, duration, AND audio (mute) preference are restored on load (LOCL-01); (b) a footer strip below the main card shows total counted sessions, total practice minutes, and the date+duration of the last session (LOCL-02); (c) an inline "Reset" affordance with a confirmation dialog clears the stats (LOCL-03). Persistence and stats writes must hook into the existing `useSessionEngine` lifecycle without introducing parallel timers (preserves SESS-05 single-clock invariant).

The phase boundary is fixed by `.planning/ROADMAP.md`. Out of scope for Phase 4: a per-session recent list (v2 `LOCL-04`), pause/resume (v2 `SESS-06`), volume control (v2 `AUDI-03`), Wake Lock (Phase 5), learning content / Forrest links / disclaimer copy (Phase 6), streaks/gamification (PROJECT.md out-of-scope), accounts/cloud sync (PROJECT.md out-of-scope), themes / dark mode / sound packs (v2 `CUST-01`), charts/sparklines, exports, and any change to the Phase 1 timing math, Phase 2 visual contract, or Phase 3 audio engine API beyond reading the persisted mute pref at startup.

</domain>

<decisions>
## Implementation Decisions

### Stats Counting Rules
- **D-01:** A session counts toward "total sessions" when actual elapsed (from `session.start()` at t=0 to end/complete) is **≥ 30 seconds** OR the session reaches `Session complete` regardless of length. Completion is an unconditional pass on the threshold (a 1-min timed session that completes counts).
- **D-02:** "Total minutes" is **actual elapsed**, summed in seconds internally and aggregated across counted sessions. No padding, no rounding to planned duration. A 4:30 session contributes 4 minutes 30 seconds to the running total.
- **D-03:** Lead-in cancel (user clicks Start, then re-clicks during 3-2-1) records **nothing**. Stats are only ever written from the t=0 onward window. The cancel-during-lead-in path in `App.tsx` (`onStartClick` cancel branch) MUST NOT touch the stats store.
- **D-04:** Manual `End session` mid-session and modal-confirm `End` both write a session record IF D-01's threshold is met. Open-ended `End` follows the same rule.
- **D-05:** "Last session" displays **date + duration** only (e.g. `May 7 — 10 min`). No BPM/ratio, no relative time strings ("Yesterday"). Date format is the user's locale short-month + day; year is shown only if not the current calendar year.

### Stats Display Format
- **D-06:** Total minutes display switches at the 60-minute boundary: `< 60 min` → `47 min`; `≥ 60 min` → decimal hours like `2.1 hours`, `17.4 hours`. One decimal place. No `h m` jargon. The session count uses the singular "session" for `1`, otherwise "sessions".
- **D-07:** Per-session duration in "Last session" is always integer minutes (floor), e.g. `10 min`. A 9:55 session shows `9 min`. (Same display unit policy regardless of stored precision.)

### Stats Placement And Visibility
- **D-08:** Stats render as a **footer strip BELOW the existing main card**, two short lines: line 1 `12 sessions · 47 min total`, line 2 `Last: May 7 · Reset`. Reset is an inline text link in line 2 (not a button, not in a separate row).
- **D-09:** Empty state (zero counted sessions): the entire stats footer is **hidden**. No "0 sessions", no "No sessions yet" copy. The strip appears only after the first counted session is recorded.
- **D-10:** Stats footer is **hidden during the session view** (lead-in + running) — same visibility gate as Phase 2 D-16's hidden BPM/Ratio steppers (`inSessionView`). Keeps the orb + `End session` action above the fold on mobile.

### Reset UX
- **D-11:** Reset wipes **stats only**. Settings (BPM, ratio, duration, mute) are NOT reset — the user changes those by interacting with steppers / mute toggle. There is no "Reset settings" button. Locked: never wipe both with one action.
- **D-12:** Reset requires a **confirmation dialog**. Reuse the existing `EndSessionDialog` pattern from Phase 2 D-10/D-11/D-12 (`<dialog>` element, focus-trap, Esc-to-cancel, default focus on the calm-cancel button to defend against accidental Enter). Locked copy: title `Reset practice stats?`, primary button `Reset`, cancel button `Keep`. Default focus on `Keep`.
- **D-13:** Reset link styling: inline text link inside the footer strip, `· Reset` placement (after `Last: …`). Must still meet the 44×44 hit-area floor (Phase 2 D-17) — implemented via padded tap-target around the visible inline label, not by enlarging the visible text.

### Persistence Scope
- **D-14:** **Mute preference persists across reloads.** This is the LOCL-01 reading. Phase 3 D-07 ("first-visit default ON") is preserved as the seed value: when no stored mute pref exists, the default is ON; once the user toggles, the new value is written and restored on subsequent visits. No in-app override of this rule.
- **D-15:** Settings restoration policy is **validate-and-fall-back per-field**. On load, each persisted field is validated against the current `BPM_OPTIONS` / `RATIO_OPTIONS` / `DURATION_OPTIONS` / boolean-mute domains. Invalid OR missing fields fall back to their `DEFAULT_SETTINGS` value (`5.5 BPM / 40:60 / 10 min`) or `false` for mute. Valid fields are restored. The whole stored object is never discarded if only one field drifted.
- **D-16:** **Storage write failures are silently absorbed** (private mode, quota exceeded, Safari ITP block). The app continues with **in-memory state for the remainder of the session**; nothing user-visible is rendered. No banner, no toast, no inline note. Mirrors Phase 3 D-10's silent-fallback posture (AudioContext failure → visuals-only with no inline notice).
- **D-17:** Storage **read** failures (corrupt JSON, throw on `getItem`) are also silent — fall back to defaults exactly as if no record existed. The app does not log to the user-facing surface. Console.warn for devs is acceptable but not required.

### Test Infrastructure
- **D-18:** The stats/persistence module exposes an injected clock dependency: a `now: () => number` function (defaulting to `Date.now`) plus the existing `performance.now()`-based session timing. This mirrors `sessionController`'s testability pattern and lets tests assert exact stored timestamps without `vi.useFakeTimers()` ceremony at every call site.

### Claude's Discretion
The following technical choices are explicitly left to research/planning:
- Storage key naming and schema layout (single key vs split keys; with or without a `version` field for future migration).
- Module shape and file location (e.g. `src/storage/`, `src/stats/`, or a hook). The constraint is that the writer is invoked from the existing session-end transitions (manual end, modal-confirm end, completion) and the reader is invoked once at app mount.
- Exact JSON shape of the persisted object — names and nesting are planner discretion as long as D-14 through D-17 hold.
- Aggregation precision: tracking elapsed in seconds vs ms internally is planner discretion; only the display format (D-06/D-07) is locked.
- Migration policy for an unrecognised future schema bump — defer to D-15's per-field fallback semantics for now, but the planner may add a version field to make the next iteration cheaper.
- Date formatting library / approach for `Last: May 7` (`Intl.DateTimeFormat` is the obvious default; no library added).
- Reset confirmation dialog component reuse strategy: can extract a generic `ConfirmDialog` from `EndSessionDialog`, or add a second concrete `ResetStatsDialog` — planner picks based on cleanest diff.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope And Constraints
- `.planning/PROJECT.md` — Defines the local-only / no-accounts / no-medical-claims constraint that bounds the persistence layer, AND the "save last settings and basic practice stats locally" decision row in the Key Decisions table. Also lists streaks/gamification as out-of-scope — Phase 4 must not drift toward those.
- `.planning/ROADMAP.md` — Defines Phase 4 goal, fixed boundary, requirements mapping (`LOCL-01`, `LOCL-02`, `LOCL-03`), and success criteria. Confirms Phase 5 owns Wake Lock and Phase 6 owns learning content (these MUST NOT be pulled into Phase 4).

### Requirements
- `.planning/REQUIREMENTS.md` — Defines `LOCL-01` (BPM, ratio, duration, audio preference saved locally between visits), `LOCL-02` (basic local practice stats: total sessions, total minutes, last session), `LOCL-03` (reset locally saved settings and stats). Also defines deferred items: v2 `LOCL-04` (recent-session list), v2 `AUDI-03` (volume control), v2 `SESS-06` (pause/resume), v2 `CUST-01` (themes / sound packs).

### Carrying Forward From Prior Phases
- `.planning/phases/01-configurable-session-timing/01-CONTEXT.md` — `DEFAULT_SETTINGS` source (D-01 first-open defaults: 5.5 BPM, 40:60, 10 min), the `In`/`Out` phase labels (D-16), and `Open-ended` duration label (D-17). Phase 4's per-field validation (D-15) MUST fall back to these defaults.
- `.planning/phases/02-visual-guide-accessible-responsive-interface/02-CONTEXT.md` — Single-column layout (D-15), 44×44 hit-area floor (D-17), settings hidden during running session (D-16) — the precedent for Phase 4 D-10's hide-stats-during-session-view rule. Also locks the `EndSessionDialog` pattern (D-10/D-11/D-12) that Phase 4 D-12 reuses for reset confirmation.
- `.planning/phases/03-optional-generated-audio-cues/03-CONTEXT.md` — D-07 (first-visit audio default ON) is the seed value Phase 4 D-14 layers persistence onto, and explicitly notes "LOCL-01 (Phase 4) will revisit if mute survives reload" — this CONTEXT confirms it does. D-10's silent-fallback posture is the reference for Phase 4 D-16/D-17 (storage failures stay silent).

### Web APIs And Browser Behavior
- MDN `Storage.localStorage` — primary persistence API. Specifically the throw behavior under Safari Private Browsing and quota-exceeded errors that D-16/D-17 handle silently.
- MDN `Intl.DateTimeFormat` — for the `May 7` date rendering in D-05. No library dependency.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/domain/settings.ts` exposes `SessionSettings`, `DEFAULT_SETTINGS`, `BPM_OPTIONS`, `RATIO_OPTIONS`, `DURATION_OPTIONS`, and `validateSettings`. Phase 4's per-field restore (D-15) reuses these option arrays for validation rather than re-declaring them. `validateSettings` is whole-object validation that throws — the per-field policy means the new restore code does field-level checks against the option arrays directly (and only calls `validateSettings` once a clean object has been assembled).
- `src/hooks/useSessionEngine.ts` exposes `state.status`, `state.lockedSettings`, `state.startedAtMs` (when `running`), and the `state.status === 'complete'` transition. The stats writer reads these to compute `actual elapsed = nowMs - startedAtMs` at the end transition.
- `src/hooks/useAudioCues.ts` already exposes `muted` + `setMuted`. Phase 4 supplies the initial `muted` value at hook construction time (or wires a `setMuted` call once on mount) AND persists every change. The hook's existing TODO comment ("LOCL-01 (Phase 4) will revisit if mute survives reload") is the integration seam.
- `src/components/EndSessionDialog.tsx` is the dialog pattern Phase 4 D-12 reuses. Either parametrise the existing component or extract a generic `ConfirmDialog` (planner discretion).
- `src/app/App.tsx` is the composition point: it owns the session-end transitions (`requestEnd`, `confirmEnd`, the `state.status !== 'running'` cleanup effect) where stats are written, AND the mount path where stored settings + mute are restored before initial render.
- `src/styles/theme.css` exposes existing tokens; the inline-text-link Reset (D-13) reuses the theme accent/muted colors. No new theme tokens anticipated for Phase 4.

### Established Patterns
- **Single-frame data flow** — every visible session value derives from `useSessionEngine`'s `SessionFrame`. Stats writing is a non-visual consumer of session lifecycle transitions; it must NOT introduce parallel timers, intervals, or its own elapsed counter. The session's `state.startedAtMs` (running) and the moment of transition out of `running` are the two clock readings the writer uses.
- **Imperative resource hooks** — Phase 3 introduced `useAudioCues` (engine ref, async init, cleanup-on-unmount). The stats/persistence module can follow the same hook shape OR a plain module + once-on-mount restore inside `App.tsx`. Either works; the codebase has precedent for both.
- **Test infrastructure** — `vitest.setup.ts` already polyfills `HTMLDialogElement` and `matchMedia`. Phase 4 will likely add a `localStorage` mock (jsdom provides one by default, but tests may want a controllable stub for quota-throw and corrupt-JSON paths). The injected clock (D-18) keeps timestamp tests deterministic without `vi.useFakeTimers()`.
- **Tailwind v4 + theme tokens** — styling baseline unchanged. Stats footer reuses existing typography/color scales for a calm low-emphasis appearance.
- **44×44 hit-area floor (Phase 2 D-17)** — the inline Reset link MUST meet this floor via tap-target padding even though the visible label is small.
- **Silent fallback pattern** — Phase 3 D-10 (AudioContext fail → visuals-only with no notice) is the precedent for D-16/D-17 (storage fail → in-memory only with no notice).

### Integration Points
- **App mount (read path):** `src/app/App.tsx` constructs `useSessionEngine(initialSettings)` and `useAudioCues()`. Phase 4 reads from storage BEFORE these hooks initialise so the restored settings flow in as `initialSettings` and the restored mute pref flows into the audio hook on first render. Restore order: settings → mute → render.
- **Session-end transitions (write path):** `src/app/App.tsx` has three end paths in scope for stats writing: `requestEnd` (open-ended manual End), `confirmEnd` (modal-confirm End for timed), and the `useEffect` watching `state.status !== 'running'` (covers `complete`). The cancel-during-lead-in branch in `onStartClick` MUST NOT write (D-03). All three writes need: actual elapsed (computed from `state.startedAtMs` and the current `performance.now()` or the `lastFrame.elapsedMs`), the threshold check (D-01), and the timestamp from the injected clock (D-18).
- **Settings change (write path):** `useSessionEngine.setSelectedSettings` is the only entry point for settings updates from `SettingsForm`. Phase 4 wraps or observes this so each accepted change writes to storage. Mute changes flow through `useAudioCues.setMuted` similarly.
- **New module:** `src/storage/` (or `src/stats/`) — encapsulates the storage adapter (read/write/reset, silent-fallback wrapper around `localStorage`), the per-field validation, the stats accumulator (`recordSession`, `getStats`, `resetStats`), and the injected clock seam. Specific module shape is planner discretion (see Claude's Discretion D-list).
- **New component:** stats footer strip — small presentational component rendered by `App.tsx` below the main card, gated by `inSessionView === false` (D-10) and `stats.totalSessions > 0` (D-09). The Reset link triggers a confirm dialog (D-12) — either the existing `EndSessionDialog` parametrised or a new `ResetStatsDialog` (planner discretion).

</code_context>

<specifics>
## Specific Ideas

- The user explicitly chose the **footer-strip placement** (D-08) over an inside-the-card or separate-card layout. The reason is the chosen mockup keeps the orb + Start button visually dominant on the idle screen and preserves the calm tone (stats are background context, not the main story).
- The user explicitly chose **hide-when-empty** (D-09) over "show zeros" or "show calm copy". The reason is first-visit users see a clean intro screen with no implication that they're "behind" on practice — important for the calm/non-medical tone.
- The user explicitly chose to **persist mute** (D-14). Reason: LOCL-01 wording explicitly lists "audio preference" alongside settings, and a user who mutes once typically wants that to stick — Phase 3 D-07's "first-visit default ON" only applies when no stored value exists.
- The user explicitly chose **split granularity for reset** (D-11): wiping stats does NOT touch settings. Reason: settings are personalised over time and accidental wipes would be annoying; stats are the only datum the user might want a clean slate on.
- The user explicitly chose **confirm-via-dialog** (D-12) reusing the End-session pattern, NOT one-tap. Reason: stats deletion is irreversible (no undo, no recent-session backup) and the existing dialog gives consistent affordance with the symmetric End-session destructive-action flow.
- The user explicitly chose **decimal hours past 60 min** (D-06, e.g. `2.1 hours`) over plain minutes-forever or `h m` jargon. Reason: calmer to read, scales to long-term users without a wide number, and avoids splitting a single number into two units.
- The user explicitly chose **30-second min threshold** (D-01) — the most permissive of the three options offered. Reason: filters only true accidents (Start → immediately End) without excluding short experiments. The completion-bypass on the threshold (D-01 second clause) is to let 1-min timed sessions count.
- The user explicitly chose **actual-elapsed minutes** (D-02), not planned-completed. Reason: stats reflect real practice, not configured intent — a partial session of real breathing should show.

</specifics>

<deferred>
## Deferred Ideas

- **Recent-session list** (last N sessions with per-row date/duration/settings) — tracked as v2 `LOCL-04` in `REQUIREMENTS.md`. Phase 4 stores only an aggregate (count, total seconds) plus the single most-recent session.
- **Streaks, achievements, "X days in a row" badges** — explicitly out of scope per `PROJECT.md` (gamification rejected for v1). Do not introduce in Phase 4.
- **Charts, sparklines, weekly summaries, sessions-per-week graphs** — not in scope for v1; would belong to a hypothetical future stats-detail view, not Phase 4.
- **Cloud sync, accounts, multi-device merge** — explicitly out of scope per `PROJECT.md` (accounts/cloud sync rejected for v1). Reset-to-default behavior described in D-11 is the only "data control" surface in v1.
- **Export / import stats JSON** — not discussed; could be a useful escape hatch later but is not part of LOCL-01/02/03.
- **User-visible storage-failure notice** (private mode banner) — explicitly rejected (D-16) in favor of silent fallback. May be revisited if user feedback shows confusion ("why aren't my stats saving?"). Tracked here, not lost.
- **A "Reset settings" affordance** — explicitly rejected (D-11). User can manually return to defaults via the steppers. May be revisited if telemetry-free user feedback shows a need.
- **Storage schema versioning / migration framework** — Phase 4 ships per-field validate-and-fallback (D-15) which absorbs most schema drift naturally. A version field is left to planner discretion; a fuller migration framework is deferred to whichever phase first needs a non-trivial schema change.
- **Time-zone handling for "Last session"** — Phase 4 ships local-tz date string via `Intl.DateTimeFormat`. A user travelling across time zones may see the date "shift" relative to when they actually practised; not addressed in v1.
- **Per-session BPM/ratio/audio-on tags** in stored last-session — explicitly rejected (D-05). May be useful for the v2 recent-list view.

</deferred>

---

*Phase: 04-local-memory-practice-stats*
*Context gathered: 2026-05-09*
