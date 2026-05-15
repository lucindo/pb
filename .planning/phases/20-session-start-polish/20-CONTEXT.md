# Phase 20: Session Start Polish - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Prevent an accidental double-start during the 3-second lead-in countdown (LEAD-01). The fix is a **label swap on the existing primary button**: while `appPhase === 'lead-in'`, the button reads `Cancel` (EN) / `Cancelar` (PT-BR) instead of `Start session`.

The button's click behavior during lead-in is **already correct** — `onStartClick` at `src/app/App.tsx:312` detects `appPhase === 'lead-in'` and runs the CR-01 cancel branch (clears lead-in timeouts, resets to idle, stops audio). No handler change is needed. The phase only makes that already-working cancel intent legible by relabeling the button.

In scope: label swap + the `cancel` string in both locales + the wiring to expose lead-in state to `SessionControls` + updating the now-stale test/comment that assert the old locked label.

Out of scope: no style change, no separate cancel affordance, no `disabled` attribute, no handler/state-machine change.
</domain>

<decisions>
## Implementation Decisions

### Cancel-during-lead-in fate
- **D-01:** Resolve LEAD-01 by **relabeling the primary button**, not by disabling it. While `appPhase === 'lead-in'` the label is `Cancel`/`Cancelar`. The button stays clickable; clicking it cancels the lead-in (existing CR-01 behavior at `App.tsx:312`). Rationale: the lead-in is only 3s; a disabled button would silently drop the existing, already-working cancel capability. A relabel both prevents the "double-start" confusion (the button no longer says "Start") and keeps cancel discoverable.
- **D-02:** **No style change** to the button during lead-in — same shape, color, tokens. Label text is the only visual difference.
- **D-03:** **No handler change.** `onStartClick` already routes `appPhase === 'lead-in'` clicks to the cancel branch. Do not touch the App.tsx start/cancel logic or the lead-in timeout chain.
- **D-04:** This **explicitly overrides the Phase 3 D-11 copy lock** ("primary button label is LOCKED to 'Start session' during lead-in"). The lock was a Phase 3 decision; Phase 20 supersedes it for the lead-in window. Update the stale lock comment at `src/app/App.tsx:305-309` accordingly.

### Wiring (Claude's discretion — operator deferred)
- **D-05:** Add an optional `inLeadIn?: boolean` prop to `SessionControlsProps`. `App.tsx` passes `inLeadIn={appPhase === 'lead-in'}`. Label resolution becomes: `isRunning ? endSession : inLeadIn ? cancel : startSession`. Chosen over (a) computing the label string in App and (b) extending the `SessionStatus` domain type — the prop is the smallest blast radius, matches the existing optional-prop pattern in `SessionControls` (`muted`, `audioAvailable`, etc.), and leaves `domain/sessionController` untouched. Optional default keeps existing `SessionControls.test.tsx` callers green.

### Strings
- **D-06:** Add `cancel` to the `controls` slice of `UI_STRINGS`: `en.controls.cancel = 'Cancel'`, `pt-BR.controls.cancel = 'Cancelar'`. Matches the existing `startSession`/`endSession` pattern. The `controls` slice is not part of the frozen-EN `LOCKED_COPY` set, so the Phase 19 byte-equality guard is not affected.

### Test contract impact
- **D-07:** `src/app/App.audio.test.tsx` Test 11 (`:243-279`) asserts `getByRole('button', { name: 'Start session' })` *during lead-in* (`:265`) — this will fail after the swap and **must be rewritten** to expect the `Cancel` label during lead-in. The test's cancel-behavior assertions (no dialog, lead-in numerals cleared, AC closed) stay valid and unchanged.
- **D-08:** Any other test that fetches the primary button by the `'Start session'` name *after entering lead-in* must be re-checked; tests that query it only in the idle state are unaffected. Add a positive regression test that the lead-in label is `Cancel` (and `Cancelar` under the PT-BR locale).

### Claude's Discretion
- Wiring mechanism (D-05) — operator said "you choose the best option."
- Exact placement of the `cancel` key within the `controls` object and the label-resolution expression form.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` §"Phase 20: Session Start Polish" — goal + 3 success criteria.
- `.planning/REQUIREMENTS.md` §"Session Start Polish" — LEAD-01.

### Code touch points
- `src/components/SessionControls.tsx:35-93` — primary button; label currently `isRunning ? endSession : startSession`. Add `inLeadIn` prop here.
- `src/app/App.tsx:310-395` — `onStartClick`; cancel-during-lead-in branch at `:312`. Stale copy-lock comment at `:305-309` to update.
- `src/content/strings.ts` (UI_STRINGS `controls` slice) — add `cancel` EN + PT-BR.
- `src/app/App.audio.test.tsx:243-279` — Test 11, rewrite per D-07.

No external ADRs/specs — requirements fully captured in decisions above.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SessionControls` already uses optional props (`muted`, `audioAvailable`, `needsResume`, `muteStrings`) with graceful fallbacks — `inLeadIn` follows the same shape.
- `appPhase` state in `App.tsx:151` already tracks `'idle' | 'lead-in' | 'running'` — the lead-in signal exists; it just isn't passed down to `SessionControls` yet.

### Established Patterns
- All user-visible strings flow through `UI_STRINGS` per-locale catalog (Phase 19). No inline literals.
- Phase 16.1: button styling is `--color-breathing-*` token-based; D-02 means no style change so this is not exercised, but any incidental edit must not introduce hardcoded classes.
- D-04 `// Reason:` annotation policy — non-obvious changes get a Reason comment.

### Integration Points
- `App.tsx` renders `SessionControls` (search for `<SessionControls` near `App.tsx:669` where `onStart` is wired) — add `inLeadIn={appPhase === 'lead-in'}` there.
- `SessionControls` consumes `status` (session engine status) which is `'idle'` throughout lead-in (SESS-05) — `inLeadIn` is the orthogonal signal that distinguishes idle-idle from idle-during-lead-in.
</code_context>

<specifics>
## Specific Ideas

Operator's exact words: "if I click the button today during the countdown it actually cancels (already working like this), just need the label swap, super simple." PT-BR label is `Cancelar`. Keep the change minimal — label swap and nothing else.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 20-session-start-polish*
*Context gathered: 2026-05-15*
