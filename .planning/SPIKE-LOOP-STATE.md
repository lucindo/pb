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
- **[[orb-outer-ring-idle-only]]** — current Idle has a DEVIATION (extra outer stroke ring); spike orb has no extra outer stroke; J7 fixes this
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
| J7 | Ring cue conditional — outer + inner ring visible ONLY on Running; hidden on Idle + Complete. Resolves [[orb-outer-ring-idle-only]] deviation. | pending |
| J8 | SetupCard primitive — V1 Grid 2×3 (1 row HRV/Navi, 2 rows Stretch); whole card is tap target with right-chevron affordance | pending |
| J9 | Settings sheet/modal primitive — bottom sheet on mobile, center modal on desktop; renders stepper, segmented, visual picker, toggle, accent button | pending |
| J10 | Wire SetupCard → Settings sheet → form rendering on Idle. **MUST preserve in-session extend-duration affordance** (currently the Increase button on the Duration stepper stays enabled during Running). | pending |
| J11 | FeedbackTime (HRV, big remaining time + small pace caption) + FeedbackCount (Stretch + Navi, big number + " of N" + uppercase context) primitives | pending |
| J12 | MuteToggle chrome alignment — `accent / accent-strong` → `borderSoft / textSoft`; 44px hit area preserved | pending |
| J13 | InstallBanner V3 — inline card, reuses SetupCard shape, mobile + idle only | pending |
| J14 | App Settings restructure into Appearance / Language / Audio / About sections (verify current section grouping at propose-time) | pending |
| J15 | Desktop responsive — centered column (520px practice, 600px Learn/AppSettings), orb scaled to 320px diameter, modal-vs-sheet for Settings | pending |
| J16 | Locked-copy verification — disclaimer / install banner / "Session complete · Take a moment" / 5 surface titles match `LOCKED_COPY` + spike-locked strings | pending |
| J17 | Final audit — 3-agent re-audit + grep guards + spike-fidelity walkthrough across all 5 surfaces | pending |
| J18 | **(Gated)** Complete screen — operator decision: ship as distinct surface OR keep current inline "Session complete" headline | pending |

---

## Current focus

**Item:** J7 — Ring cue conditional — outer + inner ring visible ONLY on Running; hidden on Idle + Complete. Resolves [[orb-outer-ring-idle-only]] deviation.
**Step:** 1 (awaiting propose; J6 approved + committed)

When you arrive here fresh:
1. Read this whole file (you're here)
2. Read MEMORY.md and the rules listed in Step 2 above — **[[orb-outer-ring-idle-only]]** is the deviation J7 closes
3. Read `.planning/spikes/010-mono-zen-light-dark/README.md` line 445-450 (the "Ring cues hidden on Idle (A) and Complete (C)" item — added to MANIFEST as a hard requirement)
4. Read `.planning/spikes/010-mono-zen-light-dark/index.html` IdleScreen line 1979 + CompleteScreen line 2026 — both pass `showRings: false` to BreathingOrb. RunningScreen leaves it at default `true`.
5. Audit OrbShape's consumers post-J6 to verify the current ring-rendering state per phase:
   - **Idle**: OrbShape gets `frame=null` + `idleMode='still'|'ambient'` → renders `OrbIdle` which passes `showRings={false}` (J6 already correct ✅ — verify in code)
   - **Lead-in**: OrbShape gets `leadInDigit=N` → renders `OrbLeadIn` which passes `showRings={false}` (already correct ✅)
   - **Running**: OrbShape gets a non-null `frame` → renders `OrbBody` with default `showRings={true}` (already correct per spike ✅)
   - **Complete**: same null-frame path as Idle → renders `OrbIdle` with `showRings={false}` (J6 already correct ✅)
   - **NK Idle (sessionActive=false)**: same null-frame path → idle orb, rings off (J6 already correct ✅)
   - **NK Running (count branch)**: NKShape passes `nkPhase` → OrbLeadIn with `showRings={false}` — and that's the NK shell; the spike doesn't render rings on NK shell either (NK has no exhale-end cue; per the NKShape doc comment, rings are HRV-specific) ✅
6. **Surprise check**: J6 may have already closed the deviation completely. If so, J7 becomes a verification + cleanup item (drop the stale `[[orb-outer-ring-idle-only]]` memory; possibly add a grep guard or test ensuring no future call passes `showRings={true}` outside Running).
7. Apply the propose-step checklist and print Section A + B + Goal/Scope/Risk. **If verification confirms J6 already closed the deviation, the propose should be small (cleanup + invariant guard); otherwise specify which consumer site needs the false-passing fix.**

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
