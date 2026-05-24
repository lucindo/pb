# Spike application loop — live state

**What this is:** Applying spike 010 (Mono Zen · Light & Dark) + the v2.0 MANIFEST feature decisions to the codebase, item by item. Each item runs a 4-step propose/go/implement/approve cycle. Same shape as `REFACTOR-LOOP-STATE.md` (A→I, now archived as complete).

---

## Resume prompt (stable — paste after `/clear`)

```
Read .planning/SPIKE-LOOP-STATE.md and follow its "Session start protocol" before doing anything else. Chat mode only — no pickers.
```

The protocol below is what makes the loop survive /clear. Keep it terse but follow it every time.

---

## Session start protocol (MANDATORY before any work)

This protocol exists because the loop's previous failures came from skipping it. If you skip a step, the failures will recur.

### Step 1 — Read this whole file
You're reading it via the resume prompt. Don't skim — read the item table, the Current Focus, the History, and the Pinned Rules.

### Step 2 — Scan MEMORY.md for applicable rules
`~/.claude-personal/projects/-Users-lucindo-Code-hrv/memory/MEMORY.md` — read the full index. For ANY propose-step, the following memories are PRESUMED applicable to this loop unless the item explicitly says otherwise:

- **[[spike-implementation-fidelity]]** — implement spike values verbatim; deviation breaks trust
- **[[spike-is-design-not-features]]** — CRITICAL; do not invent feature/data-model changes from spike screens. MANIFEST has the explicit feature decisions; nothing more is in scope.
- **[[spike-locked-values]]** — apply hex/values verbatim, never re-surface as OQ
- **[[design-logic-separation]]** — design must not touch state machines, audio, persistence, business logic (except MANIFEST-listed feature items)
- **[[copy-casing-is-not-design]]** — copy/wording is CONTENT; only spike-locked copy changes count
- **[[no-design-locking]]** — tests/code/comments must not anchor design tokens; new components follow the rule
- **[[propose-step-checklist]]** — every propose-step prints Section A (Downstream Constraints) + Section B (Applicable Memory Rules) BEFORE Goal/Scope/Risk
- **[[chat-not-pickers]]** — chat only; never use AskUserQuestion
- **[[ack-dont-fix-inline]]** — during a feedback dump from the operator, acknowledge first; don't edit until they say "you can fix"
- **[[use-lsp-for-renames]]** — symbol renames go through LSP rename-symbol or manual per-file Edit; never sed/perl/regex
- **[[v16-visual-locks]]** — the 12 operator-locked decisions in MANIFEST. **3+ days old — verify code-state claims before relying on them.**
- **[[v2-carryforward-disposition]]** — kept/dropped items. **3+ days old — verify before relying on them.**
- **[[dark-theme-token-collapse]]** — addressed by the new `borderSoft` token; verify on every dark-variant check

### Step 3 — Identify the next item
Look at the **Current Focus** section below. It names the next item and its propose/go/implement/approve step number.

### Step 4 — Read the spike artifacts for the current item
- `.planning/spikes/010-mono-zen-light-dark/README.md` — search for the section relevant to the current item (e.g. "twelfth pass" for no-jiggle layout, "fourteenth pass" for install banner)
- `.planning/spikes/010-mono-zen-light-dark/index.html` — locate the relevant visual implementation (token values, component JSX, layout structure)
- `.planning/spikes/MANIFEST.md` — Requirements section for the operator-locked decision (search for the bullet matching the item)

Spike values are **AUTHORITATIVE**. Transcribe verbatim; never paraphrase a hex code.

### Step 5 — Verify against live code before proposing
This is the discipline that failed in the first list draft. Memories are point-in-time snapshots; the codebase is live. Before proposing any item, grep/Read to confirm:
- The thing the item claims to add doesn't already exist
- The thing the item claims to remove still exists
- The naming/structure assumptions in the proposal match current files
- No related feature has shifted since the memory was written

If verification surfaces "already done" or "no longer applicable", say so and drop/revise the item BEFORE printing Goal/Scope/Risk.

### Step 6 — Apply the propose-step checklist
Print **Section A — Downstream Constraints** (what downstream tasks might this change constrain?) and **Section B — Applicable Memory Rules** (which rules from MEMORY.md apply to this work, including any cited above?). Then Goal/Scope/Risk/Verification/Commit message. Then **WAIT for operator "go"**.

### Step 7 — Implement on "go"
Per-file edits, run verification (tsc + lint + tests + build + item-specific grep guards), commit atomically, then commit the state file with the pinned commit hash.

### Step 8 — Wait for "approve" then advance
Operator says "next" or "approve" → mark item done, update Current Focus to the next item, commit state file.

---

## Orphan cleanup queue (for J17 audit to pick up)

Items deferred during the loop that J17's final-audit step should sweep up. Each line: WHAT (the orphan) · WHEN (which item left it) · WHY (operator decision or intentional deferral).

- `vm.install.showBanner` viewmodel field — J13 deviation removed the practice-screen install banner; field is no longer consumed (PracticeScreen.tsx) but still derived in `appViewModel.ts:153`. Cleanup: delete the field + its derivation + the appViewModel.test.ts `showBanner` assertions.
- `vm.install.onDismiss` viewmodel field + wiring path — same J13 deviation; no remaining consumer.
- `installDismissed` storage field + persistence read/write — same J13 deviation; nothing writes it anymore (banner's dismiss button is gone). Touches sealed storage layer, so a domain task to sequence properly.
- LOCKED_COPY entries `install.bannerText`, `install.regionLabel`, `install.dismiss` (EN + PT-BR) — same J13 deviation; no consumer after banner removal. Note: `install.installButton`, `install.iosStepsButton`, `install.settingsLabel`, `install.iosStep1/2/3` STAY (Settings still consumes them).
- `SettingsInstallSection` chrome (still uses pre-J12 accent + accent-strong + shadow-sm pairing) — flagged during J12 propose as out-of-scope; J17 should decide whether to re-tokenize to the Mono Zen quieter pairing (border-soft + text-soft) for consistency with MuteToggle.
- `THEME_OPTIONS = ['light', 'dark', 'system']` + `DEFAULT_THEME = 'system'` in `src/domain/settings.ts` — J1 v16-visual-locks said "light + dark only" but only updated tokens, not the picker option list. J14 surfaced this during the App Settings restructure; J17 should prune 'system' from `THEME_OPTIONS` + change `DEFAULT_THEME` to 'light' (or 'dark'), plus migrate any stored `theme: 'system'` user pref on read. Domain + storage change.
- `vm.appHeader` viewmodel field + `getPracticeHeader()` helper + i18n `practice.header` / `switcher.stretchHeader` / `switcher.naviKriyaHeader` (EN + PT-BR) — J16 V4 dropped TopAppBar's `eyebrow` prop; no consumer remains. Cleanup: delete the viewmodel field + derivation + helper + 6 i18n entries + their strings.test.ts assertions.
- `src/components/primitives/Card.tsx` + `Card.test.tsx` — J16 dump #3 "Learn restructure" commit `556463f` dropped the only consumer (LearnPage). Cleanup: delete the primitive + test, OR repurpose as the shared SectionCard chrome (SectionCard is currently inlined in both LearnPanel.tsx + SettingsPanelBody.tsx with identical styles).

J17's propose step must read this section and create a per-orphan cleanup plan before declaring the loop done.

---

## Workflow per item (same 4-step loop as refactor)

1. **Propose** — Section A + B + Goal/Scope/Risk/Verification/Commit message. Wait.
2. **Go / change** — Operator says "go", "continue", or proposes modifications.
3. **Implement** — Do the work, commit atomically, print a summary including verification results.
4. **Approve** — Operator reviews. "Next" advances; otherwise fix.

State below is updated after every step transition. The state file commits with each transition so the resume prompt always lands on truth.

---

## Items (in execution order — J1 → J18)

| Tag | Item | Status |
|-----|------|--------|
| J1 | Theme tokens — Nord palette → Mono Zen light + dark (cool slate, semibold-ready); add `borderSoft`, `orbHalo1/2/3`, `modalBackdrop`; remove old gradient + ring tokens | done (commit `be13fb4`) |
| J2 | Font system — Inter Variable + weight loading per spike (ultralight 200/300 for breath labels, semibold 600 for headings) | done (commit `0decf6a`) |
| J3 | No-jiggle PracticeScreen layout (anchored top group → flex-1 spacer → anchored bottom group, 16px min gap above Start) | done (commit `637ad75`) |
| J4 | Orb body — 3-layer halo + center disc + asymmetric border-radii (organic-puddle); consumes `orbHalo1/2/3` + `accent`; replaces gradient + outer/inner ring | done (commit `a742c0b`) |
| J5 | Orb V2 minimal variant — single accent disc + faint halo, gated by **query-string param** (extend `featureFlags.ts`), NOT VITE_*. Default TBD by operator. | done (commit `7366f1b`) |
| J6 | Orb idle behavior (still vs ambient) — **query-string param**, NOT VITE_*. Default TBD by operator. | done (commit `f54aa37`) |
| J7 | Ring cue conditional — outer + inner ring visible ONLY on Running; hidden on Idle + Complete. | **skipped — false-positive item** (the orb-outer-ring-idle-only memory was stale from a prior implementation that got `git reset` away; the deviation never existed in the current code. J6's OrbIdle already hard-sets `showRings={false}`; OrbBody only renders on Running. Memory deleted; no test added.) |
| J8 | SetupCard primitive — V1 Grid 2×3 (1 row HRV/Navi, 2 rows Stretch); whole card is tap target with right-chevron affordance | done (commit `5d6439b`) |
| J9 | Settings sheet/modal primitive — bottom sheet on mobile, center modal on desktop; renders stepper, segmented, visual picker, toggle, accent button | **implemented — awaiting operator approval** (commit `7a2884d`) |
| J10 | Wire SetupCard → Settings sheet → form rendering on Idle. **MUST preserve in-session extend-duration affordance** (currently the Increase button on the Duration stepper stays enabled during Running). | done (commits `2bf2834` + `d88f3d7` UAT fix) |
| J11 | FeedbackTime (HRV, big remaining time + small pace caption) + FeedbackCount (Stretch + Navi, big number + " of N" + uppercase context) primitives | done — primitives only, no wiring (commit `748ce31`) |
| J12 | MuteToggle chrome alignment — `accent / accent-strong` → `borderSoft / textSoft`; 44px hit area preserved | done (commit `6183e1e`) |
| J13 | InstallBanner V3 — inline card, reuses SetupCard shape, mobile + idle only | done — **DEVIATION**: banner removed entirely; install kept only on App Settings (commit `117310b`) |
| J14 | App Settings restructure into Appearance / Language / Audio / About sections (verify current section grouping at propose-time) | done (commit `6988ccc`) |
| J15 | Desktop responsive — centered column (520px practice, 600px Learn/AppSettings), orb scaled to 320px diameter, modal-vs-sheet for Settings | done (commit `c72d335`) |
| **J16** | **Operator feedback pass — cross-cutting polish & fixes across the entire spike loop. NO SCOPE PUSHBACK: every feedback item is in scope; "that's not what this step is about" is NEVER a valid response. Each feedback gets its own propose/go/implement/approve sub-cycle (proposes can be terser — no Section-A scope worry).** | **ACTIVE — receiving feedback** |
| J17 | Locked-copy verification — disclaimer / "Session complete · Take a moment" / 5 surface titles match `LOCKED_COPY` + spike-locked strings (formerly J16; moved after the feedback pass so verification runs against what actually lands) | pending |
| J18 | Final audit — 3-agent re-audit + grep guards + spike-fidelity walkthrough across all 5 surfaces | pending |
| J19 | **(Gated)** Complete screen — operator decision: ship as distinct surface OR keep current inline "Session complete" headline | pending |

---

## Current focus

**Item:** J16 — Operator feedback pass (ACTIVE)
**Step:** receiving feedback (no propose yet — operator is dumping)

**Mode:** operator is delivering cross-cutting feedback across the entire spike loop. Per [[ack-dont-fix-inline]]: ACKNOWLEDGE first, take notes, do NOT edit code until operator says "you can fix" (or equivalent). Per the J16 pinned rule: NO SCOPE PUSHBACK — every item is in scope by definition.

**Per-feedback-item flow (once operator says "you can fix"):**
1. Brief propose (Section A permissive: "feedback-pass work, cross-cutting allowed"; Section B applicable memory rules only if relevant)
2. Goal / Scope / Risk / Verification (terse)
3. Implement, commit atomically with a `fix(...): ... (J16 feedback)` prefix
4. Wait for next-feedback-or-approve

**Feedback log (append as items come in):**

**Dump #1 — Idle, desktop** (screenshots: spike vs current vs current-annotated)

**Mode shift (operator directive):** chain-proceed through ALL dump #1 items without per-item pause. Operator passes each on faith ("no point on checking now as any feedback you probably will reply it was not in scope or some other thing"). Implication: NO scope deflection — every annotation in the dump is in scope, even ones that arose ambient (e.g. width arrow). Final review of the whole batch at the end.

Visuals:
- V1 — Settings + Learn buttons → bare icon-only (info-circle "i" leading + gear trailing, matching spike's circular icon-button chrome). Drop the text labels. **DONE — commit `3da02c8`**
- V2 — Switcher colors → spike's active/inactive treatment (filled accent pill + on-accent text + container border-soft). **DONE — commit `a546317`**
- V3 — Start button color → spike's PrimaryButton chrome (accent fill, no shadow, 15 px / weight 600 / 0.06em tracking). **DONE — commit `295de73`**
- V4 — App title → spike's 17 px / weight 600 / 0.01em inline between icons; eyebrow dropped; TopAppBar refactored to flex row. **DONE — commit `0c66e21`**

Content:
- C1 — Start button copy: "Start session" → "Start" (EN) / "Iniciar sessão" → "Iniciar" (PT-BR). 9 test files updated to match. **DONE — commit `1d0540c`**
- C2 — Practice titles use existing locked copy "HRV Breathing" / "HRV Stretch" / "Navi Kriya". **Satisfied by V4** — `appTitle` viewmodel already resolved to those exact strings via getPracticeTitle (`practice.title` / `switcher.stretchHeading` / `switcher.naviKriyaHeading`). V4's eyebrow-drop + title-render is what made the operator's expected copy visible as THE title. No separate commit.

Annotated but not in bullet list (awaits operator confirmation):
- Operator drew red arrows under the setup-card row saying "the width is shorter than spike". Did not become an action item; flag at batch review.

**New orphan introduced by V4:** `vm.appHeader` viewmodel field + `getPracticeHeader()` helper + LOCKED-COPY entries `practice.header` / `switcher.stretchHeader` / `switcher.naviKriyaHeader` (EN + PT-BR) — no consumer after TopAppBar's eyebrow prop was dropped. Added to orphan queue below.

**Dump #1 batch — APPROVED by operator on review.**

**Dump #2 (mini)** — End button copy
- "End session" → "End" (EN) / "Encerrar sessão" → "Encerrar" (PT-BR). 8 test files updated. Collision with EndSessionDialog's confirm button (also "End") resolved by scoping dialog-confirm queries to `within(dialog)`; JSDOM-only fix since browsers honor `<dialog>` inert. **DONE — commit `b300072`**

**Dump #3** — Settings page pickers (Language / Appearance / Cue Style / Timbre)

- A — Language → SegmentedControl. SegmentedControl chrome updated to spike (border-soft container, accent-fill active, text-soft inactive, no shadow); added `disabled` prop. LanguagePicker swaps from PickerCardGrid → SegmentedControl. **DONE — commit `c9069c5`**
- B — Appearance: PickerCardGrid chrome refactored to spike values (border-soft border on both states, bg-soft fill on selected, text-soft on unselected, no shadow, drop min-h-12; inline=rounded-full text-xs, stack=rounded-2xl text-[11px]). ThemePicker gains 14×14 round color-swatch icons per spike L1831-1834 — Light/Dark use literal bg hex (#f3f5f7 / #1a1d24), System uses a 50/50 linear-gradient between them. **DONE — commit `e2db3e6`**
- C — Cue Style: PickerCardGrid columns extended to support 4; CuePicker columns 3 → 4 (matches spike VisualPicker L1564). Existing CueGlyph component kept per operator's "visual reference, NOT content" note. **DONE — commit `812d04f`**
- D — Timbre: per-option Unicode glyph (◯ Bowl / ◐ Bell / ∿ Sine / ◊ Flute per spike L1672-1675) inline with label; aria-hidden so the radio's accessible name stays as the localized label. TimbrePicker.test.tsx 2 tests updated from textContent equality to accessible-name queries. **DONE — commit `035e099`**

**Awaiting operator review of Dump #3.**

### Archived — Implementation summary (Item J10)

Atomic swap of the per-practice Idle settings UI: inline forms out, SetupCard + SettingsSheet in.

**New files:**
- `src/app/setupCardSummary.ts` — pure helper. `buildSetupCardSummary({ settings, practice })` returns the per-practice `SetupCardItem[]` (or `null` for hidden / stretch-running). `resolveSheetPracticeName(settings, switcher)` reuses existing switcher headings for the aria-label + sheet subtitle (no new copy keys for the practice names themselves).
- `src/app/PracticeSettingsView.test.tsx` — 10 behavioral tests; no class-string locking.

**Per-practice cell shapes (operator-decided OQ-1, sourced from real app domain, NOT spike's illustrative SETUP_SUMMARY):**
- Resonant (HRV): 3 cells — bpmLabel/ratioLabel/durationLabel; values format BPM as `${bpm} ${bpmUnit}`, ratio direct, duration as `${minutes} ${minutesUnit}` or openEndedLabel.
- Stretch: 6 cells — initialBpm/targetBpm/ratio/warmUp/ramp/coolDown. Derived total duration deliberately omitted (operator: "skip total"). coolDownMinutes may be `'open-ended'` → uses holdOpenEndedLabel.
- NaviKriya: 3 cells — rounds/frontCount/omLength (formatted via fast/medium/slow strings). perOmCue toggle stays sheet-only.

**Running behavior (OQ-2 — operator: "hide" Stretch):**
- Resonant Running: card enabled, tap opens sheet, ResonantSettingsForm with `isRunning=true` shows just the Duration stepper with Increase enabled when `getNextDurationOption` returns a number.
- Stretch Running: `buildSetupCardSummary` returns null → PracticeSettingsView returns null. No card, no sheet (no in-session affordance for Stretch in the current form).
- Navi Running: viewmodel `kind: 'hidden'` upstream → already returns null.

**Sheet header (OQ-3 + OQ-4):**
- Title: generic `'Practice'` / `'Prática'` (new keys `practice.settingsSheet.title`).
- Subtitle: per-practice resolved via existing `switcher.{resonant,stretch,naviKriya}Heading` strings (`HRV Breathing` / `HRV Stretch` / `Navi Kriya`). No new per-practice copy.
- Close button: localized via `practice.settingsSheet.close` (`Close` / `Fechar`).
- Card aria-label: `practice.settingsSheet.editCardAriaLabel(name)` returns `Edit ${name} settings` / `Editar configurações de ${name}` with the resolved practice name.

**PracticeScreen state:**
- `useState(false)` for `settingsSheetOpen` — transient UI state in the screen module, not in viewmodel.
- Auto-close on the Idle→Running edge uses the **setState-during-render** pattern (React docs: "storing info from previous renders") to avoid the `react-hooks/set-state-in-effect` anti-pattern that J6 already had to dodge:
  ```tsx
  const [wasInSession, setWasInSession] = useState(vm.controlsDisabled)
  if (vm.controlsDisabled !== wasInSession) {
    setWasInSession(vm.controlsDisabled)
    if (vm.controlsDisabled && settingsSheetOpen) setSettingsSheetOpen(false)
  }
  ```
- Resonant Running extend-duration is reachable: user re-taps the SetupCard → `onOpenSheet` sets state true → sheet renders the form with `isRunning=true`.

**SettingsSheet children gating:**
- `<SettingsSheet>` only renders form children when `open={true}` (`{isSheetOpen ? renderForm(...) : null}`). Prevents form `role=group` elements from leaking into the accessibility tree when the sheet is closed (JSDOM doesn't filter closed-dialog children).

**Sealed layers unchanged (per `[[design-logic-separation]]`):**
- `src/app/appViewModel.ts` — viewmodel shape untouched; per-practice formatter consumes existing fields.
- `src/app/appControllerAdapters.ts` — no plumbing changes.
- `src/components/{Resonant,Stretch,NaviKriya}SettingsForm.tsx` — rendered as-is inside the sheet's children slot. Zero form edits.
- Domain / audio / storage / hooks — untouched.

**Test infrastructure migration:**
- `src/app/appTestHarness.ts` → `settingGroup(name)` now auto-opens the sheet via the SetupCard tap when the requested group isn't already in the DOM. Existing call sites work unchanged.
- Direct `screen.getByRole('group', ...)` call sites migrated to `settingGroup`:
  - `App.dialog.test.tsx` (2 sites)
  - `App.persistence.test.tsx` (2 sites)
  - `App.settings.test.tsx` (3 sites — stretch persistence test)
  - `App.wakeLock.test.tsx` (2 sites, `replace_all`)
  - `App.audio.test.tsx` (2 sites)
- `App.session.test.tsx` one test ("does not allow running duration edits for open-ended") needed an explicit re-query of `settingGroup('Duration')` after `startAndAdvancePastLeadIn()` because the sheet auto-closes on session start; the stale Idle-state DOM ref no longer matches the Running-state controls.
- `App.audio.test.tsx` one `queryByRole('dialog')` disambiguated by name to `'End this session?'` to avoid potential overlap (defensive — the auto-close handles it but the name-specific query preserves the test's intent of checking the EndSessionDialog specifically).

**Verification:**
- `npm run lint`: clean.
- `npx tsc --noEmit -p tsconfig.app.json`: clean.
- Full suite: 105 files / 1152 tests pass (was 1142; net +10 = the 10 new PracticeSettingsView tests).
- `npm run build`: clean; PWA precache 19 / 625.98 KiB (was 620.58 KiB; +5.40 KiB from the new components).
- No `toHaveClass(` or hex literals in new code; tokens used throughout.

**Manual verification needed (operator-side):**
- HRV Idle: SetupCard with 3 cells (BPM / Ratio / Duration); tap opens sheet with the existing form; close via Close button / backdrop / Esc.
- HRV Running: SetupCard still visible; tap opens sheet with just the Duration stepper, Increase enabled while next finite option exists.
- Stretch Idle: SetupCard with 6 cells (Start BPM / Target BPM / Ratio / Warm-up / Stretch / Settle); tap opens sheet with the full stretch form.
- Stretch Running: SetupCard hidden entirely (no in-session controls).
- Navi Idle: SetupCard with 3 cells (Rounds / Front OMs / OM pace); tap opens sheet with the full navi form (including the perOmCue toggle that's not in the card).
- Navi Running: SetupCard hidden (viewmodel kind 'hidden').
- Locale switch EN ↔ PT-BR: card labels + sheet title + close button + aria-label all flip.
- Idle → Start session: sheet auto-closes if it was open.

**Commit:** `2bf2834`

### Archived — Implementation summary (Item J9)

Created `src/components/SettingsSheet.tsx` (90 LOC) + `src/components/SettingsSheet.test.tsx` (100 LOC). Pure responsive presentation primitive; no wiring.

**Architecture:**
- Native `<dialog>` via the existing `useModalDialog` hook (focus trap, Esc handling, backdrop click delegated to the codebase's established pattern)
- Responsive positioning purely via Tailwind `sm:` breakpoint (640 px) — no JS media query
- Mobile (`< sm`): bottom-anchored full-width sheet, `m-0 mt-auto mb-0 max-h-[58vh] w-full rounded-t-3xl shadow-up p-5/5/7 + drag handle`
- Desktop (`≥ sm`): auto-centered modal, `m-auto max-h-[82vh] w-[88%] max-w-[460px] rounded-3xl shadow-down-large p-6/6/7, no drag handle (sm:hidden)`

**Spike values transcribed verbatim from index.html lines 1603-1645:**
- Mobile shadow: `0 -10px 30px rgba(0,0,0,0.10)`
- Desktop shadow: `0 30px 80px rgba(0,0,0,0.35)`
- Drag handle: 44×4, rounded-full, `var(--color-border-soft)` bg, `margin: 0 auto 16px`
- Title: 22 px, weight 600, letter-spacing -0.01em, `var(--color-breathing-text)`
- Close button: transparent bg, 1 px `var(--color-border-soft)` border, `var(--color-breathing-text-soft)` color, rounded-full, px-3 py-1.5, 12 px, weight 500
- Subtitle: uppercase, 11 px, letter-spacing 0.12em, `var(--color-breathing-muted)`, mb-2
- `overscroll-behavior: contain` on the dialog so swipes inside the sheet don't propagate to the page
- `modal-fade` class for 200 ms cross-fade (reduced-motion override already wired in theme.css)
- No slide-up animation — flagged as polish, not spike-locked structure

**Prop shape:**
- `open: boolean`
- `onClose: () => void`
- `title: string` (required)
- `subtitle?: string` (optional second-line text, used for practice name in J10)
- `closeLabel: string` (i18n'd close button text; not hardcoded "Close")
- `children: ReactNode` (sheet body slot — J10 fills with the form components)

**Architecture decisions:**
- Uses `useId()` to generate `aria-labelledby` linkage to the title `<h2>` — clean React-idiomatic pattern
- Inlines the dialog setup (mirroring EndSessionDialog) rather than extending ModalDialogShell — sheet has specific responsive DOM that the generic shell doesn't capture
- All animation handled by the existing `modal-fade` CSS class — no new CSS rules added
- Backdrop overrides via `backdrop:bg-[var(--color-modal-backdrop)]` (already a project pattern)

**9 behavioral tests** (no class-string assertions per `[[no-design-locking]]`):
- Dialog opens (`.open === true`) when `open=true`
- Dialog closed (`.open === false`) when `open=false`
- Title rendered + `aria-labelledby` correctly linked to `<h2>` id
- Subtitle conditional render (provided → visible; omitted → not in DOM)
- Children slot renders custom content
- Close button uses supplied `closeLabel` + fires `onClose` on click
- Backdrop click (`target === dialog`) → fires `onClose`
- Esc (cancel event) → fires `onClose` via useModalDialog's wired handler

**No wiring.** SettingsSheet is not rendered anywhere in the app yet. J10 will:
1. Add per-practice formatter to derive `SetupCardItem[]` from current settings
2. Replace `PracticeSettingsView`'s inline form rendering with `<SetupCard>` on Idle
3. Add sheet open state (likely `useState` in PracticeScreen)
4. Mount `<SettingsSheet>` with the existing per-practice form components inside the children slot
5. Preserve the in-session extend-duration affordance (Increase button on Duration stepper stays enabled during Running)

**Verification:**
- `tsc --noEmit -p tsconfig.app.json`: clean
- `npm run lint`: clean
- Full suite: 104 files / 1142 tests pass (was 1133; net +9 = the 9 new SettingsSheet tests)
- `npm run build`: clean; PWA precache 19 / 620.58 KiB

**No manual UAT.** Visual landing is J10's job — SettingsSheet isn't rendered in the app surface yet. Operator approval at J9 is code-review of the file + test coverage.

**Commit:** `7a2884d`

### Archived — J7 skipped (false-positive item from stale memory)

J7 was seeded into the items list based on the (now-deleted) `[[orb-outer-ring-idle-only]]` memory, which claimed Idle had a deviation (extra outer stroke ring). That memory was a 3-day-old observation from a prior implementation that got `git reset` away before the v2.0 work began — the deviation never existed in the current codebase. Post-J6, ring rendering is already exactly per spike (Running only); the audit grep confirmed every consumer site passes `showRings={false}` outside the OrbBody (Running) path.

No code change. Memory file `project_orb_outer_ring_idle_only.md` deleted + MEMORY.md index entry removed.

**Root cause of the item-list pollution**: I seeded the spike-loop items table from MEMORY.md without re-verifying live code first. The session-start protocol's Step 5 (verify against live code before proposing) explicitly applies per-item-propose, but I should have applied the same discipline at items-list-seeding time too. Already covered by [[propose-step-checklist]] + the broader "memories are point-in-time, code is live" rule — no new memory needed, just stricter application.

### Archived — Implementation summary (Item J6)

Added idle orb rendering + a query-string `orbIdle` toggle (default `still`).

**The gap J6 filled:** before J6, `OrbShape` returned null for any null-frame state. Idle and Complete rendered no orb at all — the surface had a slot for it (post-J3) but never populated it. After J6, both surfaces show an empty halo orb. This was a real correctness gap the spike never anticipated (spike harness always renders the orb).

**`src/featureFlags.ts`:**
- New `OrbIdleBehavior = 'still' | 'ambient'` type
- New `ORB_IDLE_FLAG` spec — default `'still'` (per operator decision matching spike's `'Orb defaults to still'` line 259), canonical-only values (no aliases — already terse), case-insensitive + whitespace-trimmed
- `FeatureFlags` gains `orbIdle: OrbIdleBehavior`; `readFeatureFlags()` returns the new field

**`src/hooks/useAmbientScale.ts` (NEW):**
- rAF clock matching spike's `useBreathPhase` (line 569-595): `PHASE_MS = 5500`, easeInOutSine interpolation between MIN_SCALE and MAX_SCALE
- Three branches:
  - inactive (`active=false`) → MID_SCALE static (no rAF subscription, no state churn)
  - reduced motion → MID_SCALE static (no rAF subscription)
  - otherwise → rAF-ticked, ~60 Hz setState
- **Avoided React `set-state-in-effect` anti-pattern**: the inactive/reduced-motion branches don't `setScale(MID_SCALE)` inside the effect — instead the return statement short-circuits (`return animated ? scale : MID_SCALE`). The rAF cleanup handles the active→inactive transition; stale `scale` state is just ignored.

**`src/hooks/useAmbientScale.test.tsx` (NEW):**
- inactive → MID_SCALE
- active + prefers-reduced-motion → MID_SCALE (matchMedia stubbed via the existing `// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion` pattern from `usePrefersReducedMotion.test.ts`)
- active + normal motion, initial render before rAF → MID_SCALE (initial state of the `scale` ref; rAF advance left untested — math reads clearly enough)

**`src/components/OrbShape.tsx`:**
- New `idleMode?: OrbIdleBehavior | null` prop on `OrbShape`
- Dispatcher extended: `if (frame === null) { if (idleMode != null) return <OrbIdle .../>; return null }`
- New `OrbIdle` component: calls `useAmbientScale(idleMode === 'ambient')`; renders `<OrbContainer showRings={false} reducedMotion={false} orbScale={ambientScale} discBg=accent variant />` with empty children (no label, no digit, no marker — spike line 259 "empty centre disc")
- Reuses J4's OrbContainer + J5's variant branching; no new visual primitives

**Threading (4 files):**
- `PracticeScreen.tsx` — `<PracticeSessionView idleMode={vm.featureFlags.orbIdle} ...>`
- `PracticeSessionView.tsx` — accept + forward to both session surfaces
- `BreathingSessionSurface.tsx` — accept + pass to OrbShape
- `NaviKriyaSessionSurface.tsx` — accept + pass to OrbShape (only the `kind: 'orb'` branch — NKShape itself doesn't see idleMode since its count branch is always session-active)
- `NKShape.tsx` UNCHANGED (no Idle state inside the count branch)

**No changes to:**
- `sessionPresentation.ts` — null-frame semantics unchanged; OrbShape's dispatcher handles the idle case
- domain / state / audio / storage
- `OrbShape.test.tsx`, `NKShape.test.tsx`, `CueGlyph.test.tsx` — existing assertions unchanged (default tests don't pass idleMode → null-frame still returns null)
- theme.css

**Verification:**
- `tsc --noEmit -p tsconfig.app.json`: clean
- `npm run lint`: clean (1 fix during implementation: refactored useAmbientScale to avoid setState-in-effect anti-pattern flagged by `react-hooks/set-state-in-effect`)
- Full suite: 102 files / 1127 tests pass (was 1120; net +7 = 4 orbIdle parser tests + 3 useAmbientScale tests)
- `npm run build`: clean; PWA precache 19 / 618.62 KiB

**Manual verification needed (operator-side):**
- Default URL on Idle: orb visible with empty centre disc, no rings, static at MID_SCALE
- `?orbIdle=ambient`: same orb but gently scaling over 11 s cycle (5.5 s in / 5.5 s out)
- `?orbIdle=junk`: defaults back to `still`
- `prefers-reduced-motion`: ambient stays at MID_SCALE
- HRV / Stretch / Navi: all show the idle orb on Idle
- Complete: empty idle orb visible (marker deferred to J18 per operator agreement)
- Running session: unchanged (live frame still drives scale)

**Commit:** `f54aa37`

### Archived — Implementation summary (Item J6)

Added idle orb rendering + a query-string `orbIdle` toggle (default `still`).

**The gap J6 filled:** before J6, `OrbShape` returned null for any null-frame state. Idle and Complete rendered no orb at all — the surface had a slot for it (post-J3) but never populated it. After J6, both surfaces show an empty halo orb. This was a real correctness gap the spike never anticipated (spike harness always renders the orb).

**`src/featureFlags.ts`:**
- New `OrbIdleBehavior = 'still' | 'ambient'` type
- New `ORB_IDLE_FLAG` spec — default `'still'` (per operator decision matching spike's `'Orb defaults to still'` line 259), canonical-only values (no aliases — already terse), case-insensitive + whitespace-trimmed
- `FeatureFlags` gains `orbIdle: OrbIdleBehavior`; `readFeatureFlags()` returns the new field

**`src/hooks/useAmbientScale.ts` (NEW):**
- rAF clock matching spike's `useBreathPhase` (line 569-595): `PHASE_MS = 5500`, easeInOutSine interpolation between MIN_SCALE and MAX_SCALE
- Three branches:
  - inactive (`active=false`) → MID_SCALE static (no rAF subscription, no state churn)
  - reduced motion → MID_SCALE static (no rAF subscription)
  - otherwise → rAF-ticked, ~60 Hz setState
- **Avoided React `set-state-in-effect` anti-pattern**: the inactive/reduced-motion branches don't `setScale(MID_SCALE)` inside the effect — instead the return statement short-circuits (`return animated ? scale : MID_SCALE`). The rAF cleanup handles the active→inactive transition; stale `scale` state is just ignored.

**`src/hooks/useAmbientScale.test.tsx` (NEW):**
- inactive → MID_SCALE
- active + prefers-reduced-motion → MID_SCALE (matchMedia stubbed via the existing `// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion` pattern from `usePrefersReducedMotion.test.ts`)
- active + normal motion, initial render before rAF → MID_SCALE (initial state of the `scale` ref; rAF advance left untested — math reads clearly enough)

**`src/components/OrbShape.tsx`:**
- New `idleMode?: OrbIdleBehavior | null` prop on `OrbShape`
- Dispatcher extended: `if (frame === null) { if (idleMode != null) return <OrbIdle .../>; return null }`
- New `OrbIdle` component: calls `useAmbientScale(idleMode === 'ambient')`; renders `<OrbContainer showRings={false} reducedMotion={false} orbScale={ambientScale} discBg=accent variant />` with empty children (no label, no digit, no marker — spike line 259 "empty centre disc")
- Reuses J4's OrbContainer + J5's variant branching; no new visual primitives

**Threading (4 files):**
- `PracticeScreen.tsx` — `<PracticeSessionView idleMode={vm.featureFlags.orbIdle} ...>`
- `PracticeSessionView.tsx` — accept + forward to both session surfaces
- `BreathingSessionSurface.tsx` — accept + pass to OrbShape
- `NaviKriyaSessionSurface.tsx` — accept + pass to OrbShape (only the `kind: 'orb'` branch — NKShape itself doesn't see idleMode since its count branch is always session-active)
- `NKShape.tsx` UNCHANGED (no Idle state inside the count branch)

**No changes to:**
- `sessionPresentation.ts` — null-frame semantics unchanged; OrbShape's dispatcher handles the idle case
- domain / state / audio / storage
- `OrbShape.test.tsx`, `NKShape.test.tsx`, `CueGlyph.test.tsx` — existing assertions unchanged (default tests don't pass idleMode → null-frame still returns null)
- theme.css

**Verification:**
- `tsc --noEmit -p tsconfig.app.json`: clean
- `npm run lint`: clean (1 fix during implementation: refactored useAmbientScale to avoid setState-in-effect anti-pattern flagged by `react-hooks/set-state-in-effect`)
- Full suite: 102 files / 1127 tests pass (was 1120; net +7 = 4 orbIdle parser tests + 3 useAmbientScale tests)
- `npm run build`: clean; PWA precache 19 / 618.62 KiB

**Manual verification needed (operator-side):**
- Default URL on Idle: orb visible with empty centre disc, no rings, static at MID_SCALE
- `?orbIdle=ambient`: same orb but gently scaling over 11 s cycle (5.5 s in / 5.5 s out)
- `?orbIdle=junk`: defaults back to `still`
- `prefers-reduced-motion`: ambient stays at MID_SCALE
- HRV / Stretch / Navi: all show the idle orb on Idle
- Complete: empty idle orb visible (marker deferred to J18 per operator agreement)
- Running session: unchanged (live frame still drives scale)

**Commit:** `f54aa37`

---

## History

| Item | Commit | Notes |
|------|--------|-------|
| J1 | `be13fb4` | Theme tokens — Nord → Mono Zen cool slate. 9 token values replaced + 6 new tokens added (`text`, `text-soft`, `border-soft`, `orb-halo-1/2/3`) in both light + dark. Deprecated orb-in/out + ring tokens kept temporarily (J4/J7 remove). Favicon synced across 3 sites. Inline cleanup: 2 value-locking tests dropped + 2 derived rewrites in `faviconPalette.test.ts`; lowercase word-bounded `slate` matcher dropped from drift-guard test (mono-zen vocabulary collision); 2 stale comment refs fixed. 101 files / 1117 tests pass. |
| J2 | `0decf6a` | Font system — self-hosted Inter Variable via `@fontsource-variable/inter` ^5.2.8 (runtime dep). `src/index.css` imports the package + body font-family stack now prefers `'Inter Variable'`. Workbox `globPatterns` extended with `woff2`; `globIgnores` trims cyrillic/greek/vietnamese subsets from the SW precache (app is EN + pt-BR; Latin + Latin-ext are the only subsets needed). Bundle: 7 woff2 files emit to `dist/`; SW precache 19 entries / 619 KiB (was 24 / 702 KiB before globIgnores). 101 files / 1117 tests pass; no test changes — typography-load is verified at runtime, asserting it would violate `no-design-locking`. |
| J3 | `637ad75` | No-jiggle PracticeScreen layout — restructured `src/app/PracticeScreen.tsx` to match spike's `PracticeChrome`. Removed inner `PracticeWorkspace` card (rounded-card chrome: border + bg + shadow + p-5 + backdrop-blur). New tree: top bar → switcher → orb-group (fixed `pt-[18px] sm:pt-7` paddingTop above orb) → variable region → `flex-1` spacer → controls (`pt-4` min-gap) → disclaimer (11 px / 400 / 0.02em / nowrap / muted, `pb: max(1.25rem, env(safe-area-inset-bottom))`). PageShell + session/settings/controls views unchanged. `workspaceCompact` prop now dead (left in place; followup cleanup). CSS bundle 33.25 → 32.63 KiB; PWA precache 19 / 617.97 KiB. 101 files / 1117 tests pass; no test changes. |
| J4 | `a742c0b` | Orb body — replaced in/out gradient + ring stack with the spike's 3-halo (organic-puddle asymmetric border-radii, sized 100% / 86% / 74%, slate halo tokens) + centre disc (62% size, accent bg, on-accent text, border-soft shadow). Added `showRings` prop (defaults true; J7 wires Idle/Complete to false). NK front/back signal preserved via disc-bg crossfade (accent ↔ accent-strong, 400 ms). Removed deprecated tokens (orb-in-*, orb-out-*, ring-*) + CSS rules (.orb-layer--*, .shape-marker--*, reduced-motion @media). CueGlyph: in-orb uses currentColor; picker preview uses accent. NKShape: OM count inherits currentColor. `theme.contrast.test.ts`: removed obsolete in/out crossfade ratio test (1117 → 1115; net -2 = describe.each(light+dark) × 1 block). Reduced-motion: scale freeze unchanged; inner-ring suppression moved CSS @media → JS skip-render. CSS bundle 32.63 → 31.43 KiB; PWA precache 19 / 617.03 KiB. Files: OrbShape.tsx + CueGlyph.tsx + NKShape.tsx + theme.css + theme.contrast.test.ts. |
| J5 | `7366f1b` | V2 Minimal variant + `breathingShape` query-string flag (default `orb-halo`; aliases `halo`/`orb`, `minimal`/`rings`; case-insensitive). OrbContainer parameterizes per variant: V1 = 3 organic halos + disc shadow + ring opacity 0.45; V2 = single full-bleed accent halo at 0.16 opacity + no disc shadow + ring opacity 0.5. Threaded through PracticeScreen → PracticeSessionView → {BreathingSessionSurface, NaviKriyaSessionSurface, NKShape} → OrbShape. Same commit corrects a J4 transcription deviation (ring transition 400 ms ease-in-out → 600 ms ease per spike V1 line 635 + V2 line 746). 1115 → 1120 tests; 5 new featureFlags parser tests. 9 files changed (133/-32). |
| J6 | `f54aa37` | Idle-orb rendering + `orbIdle=still\|ambient` query flag (default `still` per spike line 259). Closed a real gap: pre-J6, Idle and Complete rendered NO orb at all (OrbShape returned null for null-frame). New OrbIdle branch in dispatcher; new useAmbientScale hook (rAF clock, 5500 ms phase per spike line 569, easeInOutSine). Hook avoids React setState-in-effect anti-pattern via return-side short-circuit (`return animated ? scale : MID_SCALE`). showRings={false} hard-set on the idle path. Threaded through PracticeScreen → PracticeSessionView → {BreathingSessionSurface, NaviKriyaSessionSurface}; NKShape unchanged (no Idle inside count branch). 1120 → 1127 tests (+7: 4 orbIdle parser + 3 useAmbientScale). 9 files changed (190/-6); +useAmbientScale hook + test files. |
| J7 | (skipped) | False-positive item seeded from the stale `[[orb-outer-ring-idle-only]]` memory. Memory deleted; no code change. The deviation never existed in the current codebase — J6's OrbIdle hard-sets `showRings={false}`, and OrbBody (Running) is the only consumer that defaults to `showRings={true}`. Audit grep confirmed every other path was already false-passing. Root cause: items list was seeded from MEMORY.md without live-code verification (the session-start protocol's Step 5 applies at items-list-seeding time too, not just at per-item-propose time). |
| J8 | `5d6439b` | V1 Grid 2×3 SetupCard primitive. NEW: `src/components/SetupCard.tsx` (60 LOC) renders as whole-card `<button>` with 3-col grid of label/value cells + right-chevron. Values transcribed verbatim from spike index.html lines 1188-1244: rounded-3xl, 1px border-soft, 14×18 padding, grid gap 10×18, label 10px/500/0.16em/uppercase/muted, value 14px/600/text/tabular-nums, chevron 18×18 polyline. Pure presentation — caller supplies pre-formatted localized items + onTap + ariaLabel; data derivation is J10's job. NOT wired into PracticeScreen yet (existing per-practice forms keep rendering inline). 6 behavioral tests; 1127 → 1133. Files: SetupCard.tsx + SetupCard.test.tsx (both NEW). |
| J9 | `7a2884d` | Responsive sheet/modal primitive. NEW: `src/components/SettingsSheet.tsx` (90 LOC) — native `<dialog>` via existing useModalDialog (focus trap/Esc/backdrop delegated), Tailwind `sm:` responsive: mobile bottom sheet (`m-0 mt-auto max-h-58vh w-full rounded-t-3xl shadow-up p-5/5/7` + drag handle) / desktop center modal (`m-auto max-h-82vh w-88% max-w-460 rounded-3xl shadow-down-large p-6/6/7`). Values verbatim from spike lines 1603-1645 (shadows, drag handle, title 22/600/-0.01em, close 12/500 with border-soft, subtitle 11/0.12em/muted, `overscroll-behavior:contain`). Uses existing `modal-fade` for cross-fade. Prop shape: open/onClose/title/subtitle/closeLabel/children; useId() auto-links title to aria-labelledby. NOT wired yet — J10 atomically swaps PracticeSettingsView's inline forms for the SetupCard + SettingsSheet wrapping the same forms. 9 behavioral tests (no class-string locking); 1133 → 1142. Files: SettingsSheet.tsx + SettingsSheet.test.tsx (both NEW). |
| J16 | — | (renumbered) Operator feedback pass — see Current Focus for live state. |
| J15 | `c72d335` | Desktop responsive layout per spike 010 eleventh pass (README lines 510-545). CSS (theme.css): `--orb-size` mobile clamp tightened to `clamp(180px, 50vw, 280px)` (was `35vw → 360px`); desktop (≥sm = 640px) locks to `320px` via `@media (min-width: 640px) :root { --orb-size }` override (OQ-1 + OQ-2 recommended). New `--page-bg-gradient` custom property: mobile keeps original `radial-gradient(circle at top, bg-soft, bg 48%, bg-edge)`; desktop overrides to spike's positioned variant `radial-gradient(50% 70% at 50% 25%, edge 0%, bg 50%, bg-soft 100%)` (OQ-3 b). PageShell: NEW `width?: 'practice' \| 'page'` prop (default 'page' = `sm:max-w-[600px]`; `'practice'` = `sm:max-w-[520px]`); mobile (<sm) full-width preserved. Drops the unconditional `max-w-3xl`. Background sourced from `var(--page-bg-gradient)`. PracticeScreen passes `width="practice"`; PracticeToggle + PracticeControlsView wrappers gain inner `mx-auto sm:max-w-[400px]` cap per spike line 528. AppSettingsPage + LearnPage default to 'page' (600px) — no explicit override. OrbShape / OrbContainer consume `var(--orb-size)` — auto-scale on media-query fire. PWA precache 626.18 KiB (+0.30). Tests unchanged (PageShell tests are behavioral; no class-string locking on widths). 3 files changed (76/-18). |
| J14 | `6988ccc` | App Settings restructured into 4 spike-locked sections per spike 010 sixth + seventh pass (index.html lines 1797-1894): Appearance (Theme) / Language (Language picker) / Audio (Cue + Timbre) / About (Version + GitHub + Install). NEW: `SettingsSectionHeader.tsx` (~30 LOC) — `<h2>` by default with spike values verbatim (fontSize 11, weight 500, letterSpacing 0.16em, uppercase, color muted, mt-24/mb-8); 3 behavioral tests. EXTENDED: `PickerCardGrid.tsx` adds optional `sectionLabelHidden` prop → applies `sr-only` to the `<p>` sublabel (visually hidden, accessibility-tree preserved for radiogroup's `aria-labelledby`); ThemePicker + LanguagePicker forward the new prop. OQ-1 (a) — Install moves into About, sits below GitHub link with `border-soft` 1px top border. OQ-3 (a) — Appearance + Language pickers hide their sublabels (single-picker sections); OQ-3 (b) — Audio keeps Cue + Timbre sublabels visible (multi-picker disambiguation). OQ-2 (a) — version surfaced via `__APP_VERSION__` (vite `define` reads from package.json at config-time, declared globally in new `src/vite-env.d.ts`); GitHub URL constant `https://github.com/lucindo/hrv` with `target=_blank rel=noopener noreferrer`. OQ-4 — SectionHeader values verbatim from spike. Outer `<Card padding="lg">` wrap dropped from AppSettingsPage — each section card is now self-contained per spike. Per `[[spike-is-design-not-features]]`: spike Audio's "Subtle haptics" toggle deliberately omitted (no haptics in app domain). `THEME_OPTIONS` includes 'system' unchanged — flagged for J17 (domain change, separate item). 1158 → 1166 tests (+8). 11 files changed (338/-36); 3 new (SettingsSectionHeader.tsx + test + vite-env.d.ts). PWA precache 625.88 KiB (+2.22). |
| J13 | `117310b` | **DEVIATION from spike 010 fourteenth pass (V3 inline card).** Operator decision: don't surface install on the practice screen at all — App Settings already exposes install via `SettingsInstallSection` (iOS expand + Android install, existing locked copy, `installable && !isStandalone` gate, `inSessionView` disable). DELETED: `src/components/InstallBanner.tsx` (~100 LOC) + `src/components/InstallBanner.test.tsx` (6 behavioral tests). EDIT: `src/app/PracticeScreen.tsx` — dropped the InstallBanner import + `{vm.install.showBanner && <InstallBanner .../>}` mount from PageShell overlays (now just `<EndSessionDialogsView />`). Orphans deferred to J17 audit queue (documented in this state file's new "Orphan cleanup queue" section): `vm.install.showBanner` + `onDismiss` viewmodel fields; `installDismissed` storage field; LOCKED_COPY `install.bannerText`/`regionLabel`/`dismiss` entries. 1165 → 1158 tests (-7). PWA precache 623.66 KiB (-2.16). 3 files changed (1/-207). |
| J12 | `6183e1e` | MuteToggle chrome re-tokenized to Mono Zen quieter pairing. Spike 010 MuteButton (index.html lines 455-486) verbatim: `border-[var(--color-breathing-accent)]` → `border-[var(--color-border-soft)]`; `text-[var(--color-breathing-accent-strong)]` → `text-[var(--color-breathing-text-soft)]`; drop `shadow-sm` per operator OQ-1 (spike's flat treatment). Preserved: 44px hit area (`size-11 min-h-11 min-w-11`), `bg-[var(--color-breathing-surface)]`, hover/active `bg-[var(--color-breathing-bg-soft)]`, focus ring on accent for keyboard visibility, disabled cursor + 45% opacity. SVG icons inherit text-soft via `currentColor`. Stale "mirrors SettingsStepper:42-50 verbatim" header comment updated to explain spike-driven chrome rationale. Other icon-button chrome (SettingsStepper / SegmentedControl) keeps accent treatment — J17 audit concern. No tests changed (MuteToggle.test.tsx is fully behavioral — `aria-pressed`, accessible names, disabled state, SVG element counts; zero `toHaveClass`). 1 file changed (6/-5). PWA precache 625.82 KiB (+0.14 KiB, negligible). |
| J11 | `748ce31` | FeedbackTime + FeedbackCount visual primitives. Scope: primitives only (operator OQ-1), no wiring. NEW: `src/components/FeedbackTime.tsx` (~50 LOC) — HRV time-based readout: big primary number above uppercase secondary caption. NEW: `src/components/FeedbackCount.tsx` (~60 LOC) — Stretch + Navi count-based readout: big number baseline-aligned with mid suffix above uppercase context. Both carry role="status" + aria-live="polite" + caller-supplied ariaLabel; both accept pre-formatted localized strings (no in-component formatting). Spike values verbatim from index.html lines 1060-1121: FeedbackTime mt-28, primary 28/500/0.04em/text/tabular-nums, secondary 12/500/0.16em/muted/uppercase mt-6; FeedbackCount mt-22, baseline row gap-2 tabular-nums, big 36/600/-0.01em/text, mid 16/500/text-soft (spike line 1107 — slightly stronger than muted), small 12/500/0.14em/muted/uppercase mt-4. NOT wired — `BreathingSessionSurface` and `NaviKriyaSessionSurface` still render the existing `SessionReadout` / `NKSessionReadout`. Wiring deferred to a follow-up item (data-shape mapping for Stretch + StatusPanel-chrome decision + lead-in/completion-headline placement remain OQs). 13 behavioral tests (slot rendering, role=status + aria-live + ariaLabel, big/mid baseline grouping via shared parent, DOM order via span sibling index, Navi-shape + Stretch-shape data samples). 1152 → 1165 tests. 4 files changed (244/-0). |
| J10 | `2bf2834` + `d88f3d7` | SetupCard + SettingsSheet wired on Idle. NEW: `src/app/setupCardSummary.ts` (pure per-practice formatter + practice-name resolver — sources from real app domain, NOT the spike's illustrative SETUP_SUMMARY). PracticeSettingsView atomic swap: inline form → SetupCard (always) + SettingsSheet wrapping the same forms (conditional children to prevent role=group leakage when closed). Per-practice cells: HRV 3, Stretch 6 (skipped derived total per OQ-1), Navi 3. Stretch Running hides card entirely per OQ-2 (no in-session affordance). Resonant Running keeps card enabled — extend-duration reachable inside sheet via the existing isRunning-gated form. Sheet header: generic "Practice" / "Prática" title (OQ-4) + per-practice subtitle reusing existing `switcher.*Heading` strings (OQ-3). Session-start edge auto-closes the sheet via the setState-during-render pattern (avoids the J6 react-hooks/set-state-in-effect lint trap). New i18n keys: `practice.settingsSheet.{title, close, editCardAriaLabel}`. Test infra: `settingGroup()` helper auto-opens sheet via SetupCard tap; direct `screen.getByRole('group', ...)` call sites in App.{dialog,persistence,settings,wakeLock,audio}.test.tsx migrated to the helper. 1 session test had to re-query Duration after `startAndAdvancePastLeadIn` because sheet auto-closes on session start, stale Idle-state DOM ref no longer matches Running controls. 1142 → 1152 tests (+10: new PracticeSettingsView.test.tsx). 12 files changed (398/-21); 2 new (setupCardSummary.ts + PracticeSettingsView.test.tsx). No domain/audio/storage/hooks edits; sealed layers untouched. PWA precache 625.98 KiB (+5.40). **UAT fix `d88f3d7`**: two pre-existing NK defects exposed by Mono Zen tightening — (A architectural) OM count was overlaid as sibling outside OrbShape so it inherited body grey instead of disc on-accent white; now OrbShape accepts `children` prop threaded through OrbLeadIn into the centre disc, count renders inside → crisp white. (B less invasive) `nk-om-pulse` rest was `scale(var(--orb-scale-mid))=0.79` which compounded with OrbContainer's own MID inner scale for visible 0.62 rest → orb appeared smaller & "dropped" vs lead-in 0.79; keyframes now rest at `scale(1)` peak `scale(1.06)` → compounded rest 0.79 matches lead-in with gentle 6% per-OM pulse. 3 files / 48-55. |

---

## Pinned rules (do not violate without explicit operator override)

- **Chat mode only** — never use AskUserQuestion in this loop; design/visual work stays in plain chat per [[chat-not-pickers]]
- **Spike fidelity** — every value in the spike (hex, weight, gap, radius, copy in `LOCKED_COPY`) is authoritative; transcribe verbatim per [[spike-locked-values]] + [[spike-implementation-fidelity]]
- **Design is NOT features** — do not invent feature/data-model changes from spike screens; only MANIFEST-listed feature items are in scope per [[spike-is-design-not-features]]
- **Sealed layers stay sealed** — domain/audio/storage/hooks not touched except for the MANIFEST-listed feature items (theme enum reduction + chime→flute were done in prior milestones; remaining feature items in this loop = none on the domain side)
- **No design-locking** — new components/tests use behavioral assertions, not class-name assertions; new code uses tokens not literals per [[no-design-locking]]
- **Mandatory propose-step checklist** — Section A + Section B before Goal/Scope/Risk for every item per [[propose-step-checklist]]
- **Verify memory claims about code state** — memories are snapshots; grep/Read live code before relying on a memory's claim that something exists or doesn't
- **State file commits with every step transition** — so the resume prompt always lands on truth
- **No bundled items** — each item gets its own commit; operator can interrupt at any boundary
- **Operator feedback dumps get acknowledged first** — do not edit code mid-dump per [[ack-dont-fix-inline]]
- **J16 (Feedback pass) has NO SCOPE GUARDS** — during the feedback pass, ALL operator feedback is in scope by definition. The propose-step checklist still runs per sub-item, but its Section A is permissive ("this is feedback-pass work, cross-cutting allowed"). Never reply "that's not in this step's scope" inside J16 — the operator added the step specifically to avoid that response.
