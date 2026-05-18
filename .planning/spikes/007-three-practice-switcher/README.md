---
spike: 007
name: three-practice-switcher
type: comparison
validates: "Given Stretch promoted to a top-level practice, when the 3-practice top segmented control renders at real mobile widths, then it stays legible, tappable, and balanced — or a compaction is needed"
verdict: VALIDATED — 3-practice switcher confirmed; treatments A + B both ship behind a developer setting
related: [002]
tags: [ui, switcher, navigation, mobile, practice, comparison]
---

# Spike 007: Three-Practice Switcher

## What This Validates

**Given** HRV's Stretch *mode* promoted to a top-level *practice*, **when** the
3-practice top segmented control renders at real mobile widths, **then** it
stays legible, tappable, and balanced — or a compaction is needed.

The operator's framing: thinking of promoting Stretch to a distinct practice
(HRV · Stretch · Navi); wants to see how the switcher looks, especially on
mobile.

## Research

No new libraries — a faithful render of the production component. Findings from
reading the code before building:

- **Spike 002 already settled the switcher *type*:** the top segmented control,
  with an explicit note — *"Holds comfortably for ~3–4 practices; revisit if the
  catalog grows past that."* So 3 practices is inside the validated envelope.
  This spike does not re-pick the type; it renders the **3-practice instance**.
- The production component is `src/components/PracticeToggle.tsx`: a 2-pill
  segmented control today. Equal-width `flex-1` pills, `rounded-full` container,
  `min-h-44px`, theme-token styled. The active pill carries an **accent border**
  — required because on the dark/dusk themes `bg-soft === surface`, so without
  it the active pill dissolves into the container.
- Current EN practice names (`src/content/strings.ts`): `resonant → "HRV"`,
  `naviKriya → "Navi"`. PT-BR: `"VFC"`, `"Navi"`. The new practice is **Stretch**
  — the widest label; PT-BR "Alongar" is wider still.
- Stretch is currently an intra-practice **`mode`** (standard / stretch) on the
  resonant practice. Promoting it means a new `PracticeId` `'stretch'` and a
  third per-practice slice (settings + stats) — a real model change, scoped in
  the footer of the harness, out of scope for this spike's *look* question.

**Approach comparison:**

| Approach | Pros | Cons | Status |
|----------|------|------|--------|
| Faithful component render in true-size device frames | Real tokens, real widths, real text size — the fit question answered honestly | Not the live app | **Chosen** |
| Eyeballing the existing 2-pill switcher | Zero effort | "Stretch" never rendered; mobile fit unknown | Rejected |

## How to Run

```
open .planning/spikes/007-three-practice-switcher/index.html
```

Network needed on first open (React / htm / Tailwind from CDN).

## What to Expect

- A true-size **device frame** — switch it between 320 / 360 / 390 px phones and
  a desktop window.
- Inside: the app card with the 3-practice switcher in **two treatments** —
  **A** text-only equal pills (today's component, extended), **B** icon + label.
- Controls: **width**, **theme** (all 5 — the active-pill border matters on
  dark/dusk), **locale** (EN / PT-BR — "Alongar" is the width stress), and the
  **in-session** disabled state.
- A computed **fit readout**: card-inner width, per-pill width, and text space,
  with a warning when the space gets tight for "Stretch" / "Alongar".

## Observability

- **Computed fit readout** — per-pill width and available text space are derived
  from the device width and the real card/container padding, and flagged amber/
  red when a label is at risk. The "does it fit" question is a number, not a
  guess.
- **True-size rendering** — device frames render at actual CSS px with the real
  14px pill text, so legibility is seen, not assumed.

## Investigation Trail

1. **Checked prior art.** Spike 002 validated the top segmented control for
   ~3–4 practices — so this is a confirmation render, not a type re-evaluation.
2. **Read the production component.** `PracticeToggle.tsx` — equal `flex-1`
   pills, accent-border active state, theme-token styled. Reproduced verbatim.
3. **Built the harness.** True-size device frames (320/360/390/desktop), all 5
   themes, EN/PT-BR, idle vs in-session, and both label treatments side by side.
4. **Added a computed fit readout** so the narrow-mobile question has a measured
   answer.
5. **Operator review.** The operator confirmed the 3-practice switcher looks
   good, including on mobile. They liked **both** treatments — A (text) and B
   (icon + label) — and did not want to pick one from the harness alone.

## Results

**Verdict: VALIDATED — the 3-practice switcher holds up; the A/B treatment
choice is deferred to real-app testing.**

The operator reviewed the 3-practice top segmented control across widths,
themes, and locales and confirmed it works — no compaction needed, mobile fit
is fine. They liked **both** label treatments and chose **not** to decide
between them from the harness.

**Decision — ship both treatments behind a developer setting:**

- Both treatments — **A: text-only equal pills** and **B: icon + label** —
  are built into the production switcher.
- A **developer-only** toggle selects between them (NOT a user-facing setting —
  it must not appear in the Settings dialog). Mechanism is a build-time call
  (e.g. a build flag, an env var, or a hidden/localStorage dev toggle) — decided
  at build time.
- Purpose: let the operator exercise both treatments in the real running app
  and choose the final default from full testing, rather than from the spike.

**Notes for the build:**

- This spike validated the *look* only. **Promoting Stretch to a practice is a
  real feature**, not a spike-apply: it needs a new `PracticeId` `'stretch'`, a
  third per-practice slice (settings + stats), a storage-envelope migration, and
  EN/PT-BR strings for the "Stretch" / "Alongar" label. That work belongs in a
  planned phase/milestone — the switcher (with the dev toggle) is one piece of
  it.
- Treatment B's glyphs in the harness are placeholders (orb / ramp / counting
  dots) — final glyphs are a build-time design pass.
- Computed fit confirmed: at 320 px the per-pill text space is tight but
  sufficient for "Stretch"; "Alongar" (PT-BR) is the snuggest label and still
  fits. No compaction treatment was needed.
