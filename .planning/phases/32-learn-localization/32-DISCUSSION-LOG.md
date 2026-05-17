# Phase 32: Learn & Localization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 32-learn-localization
**Areas discussed:** Learn partition & layout, Navi Kriya Learn copy, Practice-aware behavior, PT-BR scope & quality gate

---

## Learn partition & layout

### Section order

| Option | Description | Selected |
|--------|-------------|----------|
| Practice-first | Active practice description → its videos → shared Who-is-Forrest → Forrest Resources | ✓ |
| Context-first | Who is Forrest → practice description → videos → Forrest Resources (today's resonant order) | |
| You decide | Let planning pick a calm, sensible order | |

**User's choice:** Practice-first

### Native-apps block

| Option | Description | Selected |
|--------|-------------|----------|
| Resonant-only | Native-apps block shows only when Resonant is active; Navi Learn omits it | ✓ |
| Always shared | Keep the block visible for both practices | |
| Move into Resources | Fold the two native-app links into the shared Forrest Resources block | |

**User's choice:** Resonant-only

### Navi Kriya description shape

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror two sections | Two parallel sections (What is Navi Kriya + How this app paces it) | ✓ |
| Single description | One 'What is Navi Kriya' section | |
| You decide | Decide once copy is drafted | |

**User's choice:** Mirror two sections

### Dialog title

| Option | Description | Selected |
|--------|-------------|----------|
| Keep generic | 'About this practice' stays | ✓ |
| Name the practice | Title becomes practice-aware ('About Navi Kriya' etc.) | |

**User's choice:** Keep generic

---

## Navi Kriya Learn copy

### Copy author

| Option | Description | Selected |
|--------|-------------|----------|
| Claude drafts, you lock | Claude drafts claim-safe copy; operator reviews and locks | ✓ |
| You supply the copy | Operator provides the exact EN text | |

**User's choice:** Claude drafts, you lock

### Video links

| Option | Description | Selected |
|--------|-------------|----------|
| You provide URLs | Operator supplies the specific Forrest YouTube URLs | ✓ |
| Claude proposes, you confirm | Claude searches for candidates; operator confirms | |
| Use the spike follow-along | Use the spike-003 tempo-reference video as hero | |

**User's choice:** Operator provided two URLs, in order — "The Guardian In Meditation" (`https://www.youtube.com/watch?v=M3t7gY_yak8`) and "Navi Kriya Walkthrough" (`https://www.youtube.com/watch?v=A4BGQCIp9fI`).

### Video count

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror resonant (~4) | Hero + a few curated videos | |
| Fewer is fine | Whatever genuinely exists — even 1–2; no padding | ✓ |
| You decide | Count follows the URLs provided | |

**User's choice:** Fewer is fine — two links

**Notes:** The first URL was flagged for a likely paste-truncation (10-char video ID). The operator re-verified — the correct ID ends in `...yak8` (the trailing `8` had been dropped). CONTEXT.md still notes a final sanity-check before ship.

---

## Practice-aware Learn behavior

### Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-track active practice | Learn shows whichever practice the switcher is on; one anchor, no in-dialog choice | ✓ |
| In-dialog toggle | Learn opens to active practice but offers a way to view the other practice too | |
| You decide | Let planning pick | |

**User's choice:** Auto-track active practice

### Which-practice signal

| Option | Description | Selected |
|--------|-------------|----------|
| Section heading carries it | Practice-description section heading names the practice; no extra label | ✓ |
| Add a practice label | Small practice name near the top of the dialog | |

**User's choice:** Section heading carries it

---

## PT-BR scope & quality gate

### Existing pt-BR status

| Option | Description | Selected |
|--------|-------------|----------|
| Drafts — review them all | Treat existing pt-BR as drafts; finalize every v1.5 string + new Learn copy | ✓ |
| Final — only new copy | Existing pt-BR is native-quality; only translate net-new Navi Learn copy | |
| You decide after a look | Claude surveys and flags non-native entries | |

**User's choice:** Drafts — review them all

### Translation flow

| Option | Description | Selected |
|--------|-------------|----------|
| Claude drafts, you review | Claude drafts pt-BR; operator (native speaker) reviews and corrects | ✓ |
| You write pt-BR directly | Operator supplies the pt-BR text | |

**User's choice:** Claude drafts, you review

### Drift guard

| Option | Description | Selected |
|--------|-------------|----------|
| Extend the marker workflow | New Navi Kriya pt-BR copy gets review markers; fs-scan test locks done-state | ✓ |
| Write final directly | Skip the marker dance | |
| You decide | Let planning choose | |

**User's choice:** Extend the marker workflow

### Video titles

| Option | Description | Selected |
|--------|-------------|----------|
| Keep titles in English | Navi Kriya video titles stay English in both catalogs | ✓ |
| Translate the titles | Provide pt-BR titles | |

**User's choice:** Keep titles in English

---

## Claude's Discretion

- The exact `learnContent.ts` data shape for the per-practice partition.
- Exact headings for the Navi Kriya description's two sections (shape fixed; titles follow the drafted copy).
- Whether the two Navi Kriya videos reuse the `heroVideo` + `keyVideos[]` shape or a flatter two-link list.
- The structural changes to `LearnDialog.tsx` for practice-scoped vs shared rendering.

## Deferred Ideas

- A third / fourth practice (PRACTICE-F1) — the Learn partition and switcher are sized for ~3–4 practices.
- v1.x carry-forward tech debt — remains deferred (see STATE.md `## Deferred Items`).
- "Review all app config values and defaults" pending todo — a milestone-close review item, not Learn/localization scope.
