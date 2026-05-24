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
| J1 | Theme tokens — Nord palette → Mono Zen light + dark (cool slate, semibold-ready); add `borderSoft`, `orbHalo1/2/3`, `modalBackdrop`; remove old gradient + ring tokens | pending |
| J2 | Font system — Inter Variable + weight loading per spike (ultralight 200/300 for breath labels, semibold 600 for headings) | pending |
| J3 | No-jiggle PracticeScreen layout (anchored top group → flex-1 spacer → anchored bottom group, 16px min gap above Start) | pending |
| J4 | Orb body — 3-layer halo + center disc + asymmetric border-radii (organic-puddle); consumes `orbHalo1/2/3` + `accent`; replaces gradient + outer/inner ring | pending |
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

**Item:** J1 — Theme tokens (Nord palette → Mono Zen light + dark)
**Step:** 1 (awaiting propose-step from a fresh session, or proceed if mid-session)

When you arrive here fresh:
1. Read this whole file (you're here)
2. Read MEMORY.md and the rules listed in Step 2 above
3. Read `.planning/spikes/010-mono-zen-light-dark/README.md` — first 60 lines for the locked token table, plus the "second pass (pivot to cool slate + semibold + layered-halo orb)" section
4. Read `.planning/spikes/010-mono-zen-light-dark/index.html` lines 73-180 for the CANDIDATES array with the locked token values (both light + dark)
5. Read current `src/styles/theme.css` end-to-end
6. Grep all consumers of the tokens being added/removed
7. Apply the propose-step checklist and print Section A + B + Goal/Scope/Risk

---

## History

| Item | Commit | Notes |
|------|--------|-------|
| (none yet — loop starts at J1) | | |

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
