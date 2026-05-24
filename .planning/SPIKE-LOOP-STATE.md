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
| J4 | Orb body — 3-layer halo + center disc + asymmetric border-radii (organic-puddle); consumes `orbHalo1/2/3` + `accent`; replaces gradient + outer/inner ring | **implemented — awaiting operator approval** (commit `a742c0b`) |
| J5 | Orb V2 minimal variant — single accent disc + faint halo, gated by **query-string param** (extend `featureFlags.ts`), NOT VITE_*. Default TBD by operator. | pending |
| J6 | Orb idle behavior (still vs ambient) — **query-string param**, NOT VITE_*. Default TBD by operator. | pending |
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

**Item:** J5 — Orb V2 minimal variant (single accent disc + faint halo, gated by **query-string param** — extend `featureFlags.ts`, NOT VITE_*; default TBD by operator)
**Step:** 1 (awaiting propose; J4 implemented + committed, awaiting operator approval)

When you arrive here fresh after J4's approval:
1. Read this whole file (you're here)
2. Read MEMORY.md and the rules listed in Step 2 above
3. Read `.planning/spikes/010-mono-zen-light-dark/README.md` — search for "V2", "Minimal", "single accent disc", "minimal-rings" (the V2 description + the dev-toggle section line 478, line 489-490)
4. Read `.planning/spikes/010-mono-zen-light-dark/index.html` `VariantOrbMinimal` (or similar) — locate the V2 component's structure (a single solid accent disc + a faint halo; no asymmetric halo layers; same outer/inner ring treatment as V1)
5. Read current `src/lib/featureFlags.ts` (or wherever featureFlags live — verify the file path first; spike notes say "extend featureFlags.ts")
6. Verify how `OrbShape` is structured post-J4 (variant gating point — likely at the OrbContainer level or as a switch in `OrbBody`)
7. Apply the propose-step checklist and print Section A + B + Goal/Scope/Risk. **Default TBD: ask operator in propose-step Section A — they explicitly want to decide at build time per v16-visual-locks (deferred decisions list).**

### Archived — Implementation summary (Item J4)

Rewrote `src/components/OrbShape.tsx` to use the spike's 3-halo + centre disc structure. Two render paths (`OrbBody` for active breathing, `OrbLeadIn` for countdown/NK shell) share a new `OrbContainer` factor for the layout primitive.

**Halo geometry — transcribed verbatim from spike index.html lines 617-619:**
```
HALOS = [
  { token: '--color-orb-halo-1', pct: 1.00, radius: '48% 52% 51% 49% / 50% 49% 51% 50%', shift: [-4,  2] },
  { token: '--color-orb-halo-2', pct: 0.86, radius: '52% 48% 49% 51% / 49% 52% 48% 51%', shift: [ 3, -2] },
  { token: '--color-orb-halo-3', pct: 0.74, radius: '50% 50% 53% 47% / 51% 49% 51% 49%', shift: [-1,  3] },
]
DISC_PCT = 0.62  // centre disc at 62% of orb size
boxShadow: '0 6px 24px var(--color-border-soft)'  // disc shadow per spike line 660
```

**Rings (`showRings` prop, defaults true):**
- Outer: `1.5px solid var(--color-breathing-accent)` at opacity 0.45, full-bleed
- Inner: same stroke at opacity 0 (In) / 0.45 (Out), sized MIN_SCALE %, 400 ms ease-in-out crossfade
- `showRings: false` skips both. J7 wires Idle + Complete to pass false (current state: still rendering rings on Idle = the orb-outer-ring-idle-only deviation continues briefly until J7).

**NK front/back signaling — preserved, new primitive:**
- Old: in/out gradient layer crossfade on `[data-phase='out']`
- New: centre-disc `background` inline-transition between `var(--color-breathing-accent)` (front) and `var(--color-breathing-accent-strong)` (back), 400 ms ease-in-out
- Light: 5d6877 → 414957 (darker on back); dark: b4bac4 → ccd0d9 (lighter on back). Same on-accent text reads against both (the `accent-strong vs on-accent ≥ 1.5` test still locks the legible-contrast invariant).

**Reduced-motion:**
- Orb scale freeze (MID_SCALE): unchanged JS path via `usePrefersReducedMotion()`
- Inner ring suppression: moved from CSS `@media (prefers-reduced-motion) .shape-marker--inner { display:none }` to JS conditional render (`!reducedMotion` gate on the inner span)
- Same UX guarantee, fewer moving parts

**Deprecated tokens removed in lockstep:**
- `--color-orb-in-from / -to / -text` (light + dark blocks)
- `--color-orb-out-from / -to / -text` (light + dark blocks)
- `--color-ring-outer`, `--color-ring-inner` (light + dark blocks)
- CSS rules: `.orb-layer--in`, `.orb-layer--out`, `[data-phase='out'] .orb-layer--{in,out}`, `.shape-marker--outer`, `.shape-marker--inner`, `[data-phase='out'] .shape-marker--inner`, the reduced-motion `@media` block for shape-marker
- `.orb { will-change: transform }` KEPT — the breathing-scale wrapper still uses the class for GPU promotion

**CueGlyph (`src/components/CueGlyph.tsx`):**
- In-orb glyph: dropped phase-keyed color class → uses `currentColor` (centre disc sets `color: var(--color-breathing-on-accent)`, which cascades)
- Picker preview: `--color-orb-in-from` → `--color-breathing-accent`
- Doc-comments updated

**NKShape (`src/components/NKShape.tsx`):**
- OM count `style={{ color: phase === 'back' ? ... : ... }}` removed → inherits currentColor from the centre disc
- Phase distinction now conveyed by the disc bg crossfade (above), not the count color

**`theme.contrast.test.ts`:**
- Removed the `'reduced-motion crossfade midpoint contrast ratio…'` `it` block (light + dark iterations) — the in/out gradient primitive it asserted no longer exists
- Removed the unused `midpoint()` helper + `THEME_05_FLOORS` const
- File-top doc-comment updated to describe current scope (role-pair contrast checks)
- The accent-strong vs on-accent + destructive contrast tests are unchanged

**No changes to:**
- `BreathingSessionSurface.tsx`, `NaviKriyaSessionSurface.tsx` — signatures unchanged
- `CuePicker.tsx`, `CuePicker.test.tsx`, `CueGlyph.test.tsx`, `OrbShape.test.tsx` — all behavior-focused, all pass
- domain / hooks / storage / state / audio
- `shapeConstants.ts` — MIN_SCALE / MAX_SCALE / MID_SCALE unchanged

**Verification:**
- `tsc --noEmit -p tsconfig.app.json`: clean
- `npm run lint`: clean
- Full suite: 101 files / 1115 tests pass (was 1117; net -2 = removed `describe.each([light, dark])` × 1 contrast-test block)
- `npm run build`: clean; CSS bundle 32.63 → 31.43 KiB (~1.2 KiB shed from removed orb-layer/shape-marker rules + deprecated tokens × 2 themes); PWA precache 19 / 617.03 KiB
- Grep guard (`orb-in-*|orb-out-*|ring-outer|ring-inner|.orb-layer--|.shape-marker--`): 0 active consumers (one explanatory comment in theme.contrast.test.ts documenting the removed primitive — intentional)

**Manual verification needed (operator-side):**
- Idle, light: halo body + centre disc visible; outer ring still renders (will go in J7); no extra strokes beyond the spike's
- Running, light + dark: halo scale animates with breath; inner ring fades in on Out; outer ring constant
- NK Front → Back transition: centre disc darkens on light theme / lightens on dark theme (~12-16 lum delta)
- 3-2-1 countdown: digit centered INSIDE the centre disc; no animation
- `prefers-reduced-motion`: orb at MID_SCALE; inner ring not rendered; outer ring still rendered

**Commit:** `a742c0b`

---

## History

| Item | Commit | Notes |
|------|--------|-------|
| J1 | `be13fb4` | Theme tokens — Nord → Mono Zen cool slate. 9 token values replaced + 6 new tokens added (`text`, `text-soft`, `border-soft`, `orb-halo-1/2/3`) in both light + dark. Deprecated orb-in/out + ring tokens kept temporarily (J4/J7 remove). Favicon synced across 3 sites. Inline cleanup: 2 value-locking tests dropped + 2 derived rewrites in `faviconPalette.test.ts`; lowercase word-bounded `slate` matcher dropped from drift-guard test (mono-zen vocabulary collision); 2 stale comment refs fixed. 101 files / 1117 tests pass. |
| J2 | `0decf6a` | Font system — self-hosted Inter Variable via `@fontsource-variable/inter` ^5.2.8 (runtime dep). `src/index.css` imports the package + body font-family stack now prefers `'Inter Variable'`. Workbox `globPatterns` extended with `woff2`; `globIgnores` trims cyrillic/greek/vietnamese subsets from the SW precache (app is EN + pt-BR; Latin + Latin-ext are the only subsets needed). Bundle: 7 woff2 files emit to `dist/`; SW precache 19 entries / 619 KiB (was 24 / 702 KiB before globIgnores). 101 files / 1117 tests pass; no test changes — typography-load is verified at runtime, asserting it would violate `no-design-locking`. |
| J3 | `637ad75` | No-jiggle PracticeScreen layout — restructured `src/app/PracticeScreen.tsx` to match spike's `PracticeChrome`. Removed inner `PracticeWorkspace` card (rounded-card chrome: border + bg + shadow + p-5 + backdrop-blur). New tree: top bar → switcher → orb-group (fixed `pt-[18px] sm:pt-7` paddingTop above orb) → variable region → `flex-1` spacer → controls (`pt-4` min-gap) → disclaimer (11 px / 400 / 0.02em / nowrap / muted, `pb: max(1.25rem, env(safe-area-inset-bottom))`). PageShell + session/settings/controls views unchanged. `workspaceCompact` prop now dead (left in place; followup cleanup). CSS bundle 33.25 → 32.63 KiB; PWA precache 19 / 617.97 KiB. 101 files / 1117 tests pass; no test changes. |
| J4 | `a742c0b` | Orb body — replaced in/out gradient + ring stack with the spike's 3-halo (organic-puddle asymmetric border-radii, sized 100% / 86% / 74%, slate halo tokens) + centre disc (62% size, accent bg, on-accent text, border-soft shadow). Added `showRings` prop (defaults true; J7 wires Idle/Complete to false). NK front/back signal preserved via disc-bg crossfade (accent ↔ accent-strong, 400 ms). Removed deprecated tokens (orb-in-*, orb-out-*, ring-*) + CSS rules (.orb-layer--*, .shape-marker--*, reduced-motion @media). CueGlyph: in-orb uses currentColor; picker preview uses accent. NKShape: OM count inherits currentColor. `theme.contrast.test.ts`: removed obsolete in/out crossfade ratio test (1117 → 1115; net -2 = describe.each(light+dark) × 1 block). Reduced-motion: scale freeze unchanged; inner-ring suppression moved CSS @media → JS skip-render. CSS bundle 32.63 → 31.43 KiB; PWA precache 19 / 617.03 KiB. Files: OrbShape.tsx + CueGlyph.tsx + NKShape.tsx + theme.css + theme.contrast.test.ts. |

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
