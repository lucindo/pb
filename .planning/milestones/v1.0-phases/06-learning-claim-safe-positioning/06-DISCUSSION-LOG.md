# Phase 6: Learning & Claim-Safe Positioning - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 6-Learning & Claim-Safe Positioning
**Areas discussed:** Surface placement & gating, Explainer content + video curation, Claim-safe framing & disclaimer, Forrest branding posture

---

## Surface Placement & Gating

### Turn 1 — Where should the Learning content live in the app?

| Option | Description | Selected |
|--------|-------------|----------|
| Footer link → modal dialog | Inline 'Learn' link in below-card footer, opens native `<dialog>`. Most consistent with StatsFooter Reset pattern. | ✓ |
| Always-visible section below card | A second calm panel under the main card, explainer + links rendered inline. | |
| Collapsible accordion below card | Below-card 'Learn more' summary/details element, closed by default. | |
| Dedicated view / route switch | Full-screen 'Learn' view replaces the breathing card. | |

**User's choice:** Footer link → modal dialog
**Notes:** Modal-via-link is the most consistent with the existing dialog patterns (`EndSessionDialog`, `ResetStatsDialog`) and the StatsFooter Reset inline-link approach.

### Turn 2 — Where should the Learn link be anchored, and should it hide during running?

| Option | Description | Selected |
|--------|-------------|----------|
| Below card, idle-only | Single 'Learn' link in below-card footer strip, hidden during lead-in + running (mirrors StatsFooter D-10). | |
| Below card, always visible | Same below-card placement but stays visible during session. | |
| Compact link on stats footer | Fold 'Learn' into StatsFooter line 2 alongside Reset. | |
| Subtle top-right corner anchor | Tiny 'Learn' / 'About' control in the page corner, persistent. | ✓ |

**User's choice:** Subtle top-right corner anchor
**Notes:** User wanted persistent discoverability outside the breathing-card flow. This deviates from the StatsFooter precedent (in a good way) — anchor sits at page level, not inside the card. Mid-session interactivity then became the next gray area.

### Turn 3 — Anchor label + behavior when opened mid-session?

| Option | Description | Selected |
|--------|-------------|----------|
| Single 'Learn' — modal over running, timing keeps running | Mirrors EndSessionDialog 'timing keeps running' rule. | |
| Two labels: 'Learn' + 'About' | Two anchored controls. | |
| Single 'Learn' — disabled during running | Anchor visually muted/disabled in lead-in + running (no click). | ✓ |
| Single 'Learn' — modal + opens-on-first-visit | One label + one-time auto-open with persisted `hasSeenLearn` flag. | |

**User's choice:** Single 'Learn' — disabled during running
**Notes:** Calmer mid-session posture. Anchor stays on-page (no layout shift) but interaction is gated by the same `inSessionView` predicate Phase 4 already uses for hiding `StatsFooter`. First-visit auto-open considered but declined (added to Deferred Ideas).

---

## Explainer Content + Video Curation

### Turn 1 — How should the in-app explainer be structured?

| Option | Description | Selected |
|--------|-------------|----------|
| Two short sections | (1) What is HRV / resonance breathing. (2) How this app times your breath. ~80-120 words. | |
| Three sections | Adds (3) Who is Forrest Knutson. ~120-180 words. | ✓ |
| One paragraph + bulleted timing rules | Single intro + bulleted rules from PROJECT.md Context. | |
| Minimal — one-sentence framing | Just a framing sentence + videos + disclaimer. | |

**User's choice:** Three sections
**Notes:** Three sections give equal weight to the practice itself, the app's mechanics, and the person whose teaching the app honors.

### Turn 2 — Who drafts the explainer copy?

| Option | Description | Selected |
|--------|-------------|----------|
| Claude drafts in plan, you approve | Planner produces draft inline; user reviews before execute. Copy lives as locked strings. | |
| You write, Claude wires | User provides final copy; Claude only wires markup. | |
| Claude drafts — separate iteration cycle | Claude drafts; user iterates in dev mode UAT-style. | |
| Claude drafts; markdown source file (locale-ready) | Copy lives in content file (Markdown or structured TS), sets up future i18n. | ✓ |

**User's choice:** Claude drafts; markdown source file (locale-ready)
**Notes:** I18n-ready content asset gives free future-extension surface (PROJECT.md notes English first, multilingual later). Asset shape (TS vs Markdown vs JSON) deferred to planner.

### Turn 3 — How should the curated video list be assembled?

| Option | Description | Selected |
|--------|-------------|----------|
| You supply the video URLs + titles | User hands off 2-5 Forrest videos. | ✓ |
| Claude proposes a shortlist, you approve before plan | Claude searches + proposes; user picks. | |
| Forrest channel link only, no curated videos this phase | Defer LEARN-02 to v1.x. | |
| You supply URLs in PLAN review, not in discuss | Skip URL specifics in discuss; lock at plan-phase. | |

**User's choice:** You supply the video URLs + titles
**Notes:** User retains curatorial authority over video selection. Timing of when URLs arrive was the next sub-question.

### Turn 4 — How many videos and when will you supply the URLs?

| Option | Description | Selected |
|--------|-------------|----------|
| 3 videos, provide now in discuss | Tightest scope. | |
| 3-5 videos, provide at plan-phase | Lock count range now, URLs at plan. | |
| Provide URLs now, count is whatever you have | Driven by current Forrest-watching. | |
| 1 hero video + channel link | Lightest scope. | |
| **Other (user free-text)** | *(see notes)* | ✓ |

**User's choice (free-text):** "I want to supply links on the plan phase. I like the idea of having a hero video, and at the same time would be good to have a list of key videos, and we will need links for Forrest Youtube channel, Forrest site and link to Forrest book (will be an amazon link)"
**Notes:** User expanded the resource set beyond the original "videos + channel" framing:
- 1 hero video (start-here designation)
- N key videos (count + URLs at plan-phase)
- Forrest YouTube channel link
- Forrest website link (NEW — beyond LEARN-01's literal text, but inside Phase 6 domain)
- Forrest book Amazon link (NEW — same reasoning)

All URLs supplied at plan-phase except the book URL (next turn locked it).

### Turn 5 — Is the Forrest book Amazon link an affiliate link?

| Option | Description | Selected |
|--------|-------------|----------|
| Plain link, no affiliate | Standard Amazon URL. | |
| Affiliate link | Tagged URL forcing FTC disclosure. | |
| Plain now, may swap later | Ship plain; structure for future swap. | |
| Skip the book link in Phase 6 | Drop book; channel + site + videos only. | |
| **Other (user free-text)** | *(see notes)* | ✓ |

**User's choice (free-text):** "Link for his book will be the link he uses on his videos descriptions for the book: https://amzn.to/3RTAVqi"
**Notes:** User locked the book URL to the same shortened Amazon link Forrest publishes in his own video descriptions. The link is amzn.to-style (typically affiliate-capable) but the affiliate belongs to Forrest, not to this app. App earns no revenue. This shifted the disclaimer posture from "commercial disclosure" to "calibrated independent-app posture" — covered in the next area via D-14.

---

## Claim-Safe Framing & Disclaimer

### Turn 1 — What posture and placement for the claim-safe / disclaimer copy?

| Option | Description | Selected |
|--------|-------------|----------|
| One calm line, inside the Learn modal only | Single soft sentence at modal bottom. | ✓ |
| Modal line + persistent footer micro-line | Same line in modal + tiny always-visible line below the card. | |
| Formal multi-sentence disclaimer in modal | Full paragraph: not medical, not diagnosis, consult clinician. | |
| Modal calm line + 'Consult a clinician' soft note | Two-sentence approach. | |

**User's choice:** One calm line, inside the Learn modal only
**Notes:** Calm/minimal posture wins. No persistent footer disclaimer on the main screen — modal-only carries the entire LEARN-04 obligation.

### Turn 2 — Should the modal also disclaim affiliation / endorsement with Forrest?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — brief independent-app sentence in the modal | Calm 'not affiliated' sentence near Forrest links. | |
| No — framing alone is enough | Skip explicit endorsement disclaimer. | |
| Yes — blended into 'Who is Forrest' section | Fold independence statement into the explainer. | |
| Yes — micro-line at the bottom of the modal | Tiny grey line at the very bottom. | |
| **Other (user free-text)** | *(see notes)* | ✓ |

**User's choice (free-text):** "Option number 4 seems good, would like to add that I liked the phrase 'inspired by Forrest's teachings', so would be good to have it somewhere :)"
**Notes:** Two locked items captured:
- Option 4: micro-line at modal bottom: "Independent project. Not affiliated with Forrest Knutson."
- The phrase "inspired by Forrest's teachings" must appear verbatim in the explainer (locked language for the "Who is Forrest" section).

The two locked items together form the "calibrated respectful but independent" tone: warmly credit Forrest as inspiration, explicitly note no affiliation.

---

## Forrest Branding Posture

### Turn 1 — How is Forrest presented visually in the Learn modal?

| Option | Description | Selected |
|--------|-------------|----------|
| Name + plain text links only | No image, no logo. Just typography. | ✓ |
| Name + a non-branded breathing/meditation icon | Small generic theme glyph beside links. | |
| Name + Forrest's public YouTube channel avatar | Embed public avatar from YouTube URL. | |
| Defer all branding to plan-phase | Lock 'no Forrest assets v1' default, defer visual treatment. | |

**User's choice:** Name + plain text links only
**Notes:** Maximally claim-safe. Honors PROJECT.md's permission-gated Forrest assets posture without requiring a permission conversation as a Phase 6 blocker. Visual rhythm comes from typography + existing pastel tokens.

---

## Continue Or Write Context

### Turn 1 — Proceed to write CONTEXT.md or address anything else?

| Option | Description | Selected |
|--------|-------------|----------|
| Write CONTEXT.md now | Synthesize, write, commit, route to plan-phase. | ✓ |
| Discuss accessibility & keyboard navigation | Focus order, Esc, return focus, link reading order. | |
| Discuss responsive behavior of the corner anchor | Tablet/mobile placement, safe area, narrow viewports. | |
| Discuss CONTEXT for the markdown source file structure | Pin Markdown vs TS shape, location, build loading. | |

**User's choice:** Write CONTEXT.md now
**Notes:** All four locked areas judged sufficient. Accessibility patterns are already inherited from Phase 2 D-10..D-12 + D-17 + D-21; planner applies them by reference. Responsive anchor behavior + content-asset shape are explicitly captured under "Claude's Discretion" in CONTEXT.md.

---

## Claude's Discretion

Areas explicitly deferred to research / planner judgment (also captured in CONTEXT.md):

- Exact filename + module shape of the content asset (`learnContent.ts` vs `learnContent.md` vs `learnContent.json`) — constraint: i18n-ready, single source of truth, no new dependency unless justified.
- Exact filename of the new dialog component (`LearnDialog.tsx` vs other).
- Whether the corner anchor is a standalone component or inlines into `App.tsx`.
- Whether to render an external-link glyph next to each link label.
- Exact wording of the calm medical-advice sentence and the three explainer sections (user reviews drafts at plan-phase).
- The order of items within the link block (hero video first vs channel first vs book first).
- Whether to extract a generic `ConfirmDialog` from the three existing dialogs or clone the pattern a third time.
- Whether to log a dev-only `console.debug` when the disabled anchor is clicked.

---

## Deferred Ideas

Captured into CONTEXT.md `<deferred>` section. Highlights:

- "About" modal as a second corner anchor — declined v1 (D-02).
- First-visit auto-open of the Learn modal — declined; possible v1.x polish.
- Persistent disclaimer micro-line on the main breathing screen — declined (D-15).
- Multi-language copy variants — v2 `I18N-01`; content asset shape is i18n-ready (D-10).
- Inline video players or embedded YouTube iframes — declined; external links only (D-13).
- Forrest avatar / channel image / any branded visual asset — declined v1 (D-16); revisit if permission obtained.
- Affiliate disclosure copy — N/A v1; book URL mirrors Forrest's own published link.
- Open Graph / link preview cards for Forrest videos — declined; plain labels only.
- "Last updated" / version stamp inside the modal — not needed v1; git history is source of truth.
- Curated video count beyond "1 hero + a short list" — user supplies at plan-phase.
