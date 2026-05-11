# Phase 6: Learning & Claim-Safe Positioning - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 ships the in-app learning surface and the claim-safe positioning copy that frames the app as guided breathing practice rather than medical advice. It introduces a single new affordance — a subtle top-right corner anchor labeled `Learn` — that opens a native `<dialog>` modal containing: (1) a three-section explainer of HRV/resonance breathing, the app's timing rules, and who Forrest Knutson is; (2) a curated link block (Forrest YouTube channel, Forrest website, Forrest book Amazon link, one hero video, and a short list of additional key videos); (3) a calm one-sentence medical-advice line; and (4) a micro-line affiliation disclaimer at the bottom of the modal. The anchor is persistent on the page (rendered outside the breathing-card flow) but visually muted/disabled during `lead-in` and `running` so it cannot be opened mid-session. No header bar, no route switch, no new screen.

The phase boundary is fixed by `.planning/ROADMAP.md` §Phase 6 and covers `LEARN-01` (Forrest YouTube channel link), `LEARN-02` (curated explanation videos), `LEARN-03` (brief in-app explanation of resonance-style breathing + app's timing rules), and `LEARN-04` (claim-safe framing copy). **Out of scope** for Phase 6: any change to Phase 1 timing math, Phase 2 visual contract / orb / reduced-motion path, Phase 3 audio engine API, Phase 4 storage envelope, Phase 5 wake-lock surface, Phase 5.1 audio-resume + orb-sizing carry-forward fixes (those phases retain ownership of their own seams), accounts / cloud sync (PROJECT.md out-of-scope), PWA / offline (v2 `PWA-01`), themes / sound packs (v2 `CUST-01`), localization machinery (v2 `I18N-01` — copy structure is i18n-ready but the second-language runtime is deferred), inline video players or embedded video iframes (external links only), an in-app "About" surface beyond the bottom disclaimer micro-line, a first-visit auto-open of the Learn modal, any persistent disclaimer copy on the main breathing screen (modal-only), any commercial / affiliate disclosure (app earns no affiliate revenue), and any visual treatment of Forrest beyond a typographic name (no avatar, no photo, no logo, no protected asset reuse).

</domain>

<decisions>
## Implementation Decisions

### Surface And Anchor
- **D-01:** The Learning surface is reached through a **subtle top-right corner anchor** labeled `Learn`, rendered OUTSIDE the breathing-card flow (page-level, not inside the existing card or `StatsFooter`). The anchor is persistent on the page across all `appPhase` states (`idle`, `lead-in`, `running`) and across `state.status` transitions — it does not unmount/remount per state. Justification: maximum discoverability for a one-time-read surface, while staying outside the breathing card so it never competes visually with the orb during practice.
- **D-02:** **Single label only — `Learn`.** No second "About" anchor in v1. Any About / credits surface is folded into the bottom of the same modal (the endorsement micro-line in D-13 carries the credit posture). YAGNI applies — a second anchor adds ergonomic noise without a clear distinct surface to back it.
- **D-03:** Anchor is **visually muted/disabled during `lead-in` and `running`** (no click handler fires, `aria-disabled="true"`, cursor: not-allowed-equivalent or simply non-interactive styling). Enabled in every non-session-view state (`idle` before first session, and `idle` after `complete` / `End`). Justification: the disabled posture mirrors the spirit of Phase 4 D-10 (`StatsFooter` hidden during session view) — Phase 4 hides the entire footer; Phase 6 keeps the anchor on-page for visual stability but removes its interactivity. The "in session view" predicate is the same `appPhase !== 'idle'` test the existing code already computes (`inSessionView`); the anchor's disabled state derives from that.
- **D-04:** Anchor meets the project-wide **44×44 hit-area floor** (Phase 2 D-17) and renders a **focus-visible ring** on keyboard focus (Phase 2 D-21). The visible label text stays small (consistent with the calm aesthetic); the 44×44 floor is achieved via padding around the visible text, NOT by enlarging the text — same technique Phase 4 D-13 used for the inline `Reset` link.

### Modal Shape And Behavior
- **D-05:** The modal is a **native `<dialog>` element** reusing the structural pattern from `EndSessionDialog` (Phase 2 D-10..D-12) and `ResetStatsDialog` (Phase 4 D-12): browser-managed top-layer, focus trap, Esc cancels, backdrop click closes. Default focus on a calm dismiss control (a `Close` button) — never on a Forrest link (defends against accidental Enter dispatching navigation). The dialog component lives as a new file under `src/components/` (planner discretion on exact name — e.g. `LearnDialog.tsx`).
- **D-06:** **Timing/audio keeps running underneath the modal** if the user somehow has the modal open from a non-session state and starts a session — though in practice D-03 prevents the anchor from being clickable during session views, the modal opens and closes purely on `appPhase === 'idle'`. The modal does NOT auto-close on `appPhase` change; the user dismisses it explicitly. If they tap Start while the modal is open, the modal stays open (consistent with `<dialog>` semantics) — but D-03 ensures the anchor cannot have been re-clicked to open it mid-session in the first place.
- **D-07:** **External Forrest links inside the modal** open in a new browser tab using `target="_blank" rel="noopener noreferrer"`. Justification: clicking a link mid-session (theoretically reachable if the user opens the modal during `idle` and then taps Start before tapping the link, though D-03 disables the anchor itself) must NEVER navigate the practice tab away from the running session. The `rel="noopener noreferrer"` posture is the standard security default and also prevents the new tab from accessing `window.opener`.

### Explainer Copy Structure
- **D-08:** The explainer is structured as **three short sections** rendered in a fixed order inside the modal:
  1. **"What is HRV / resonance breathing"** — 2-3 sentences on the practice itself: low-rate paced breathing, alignment with heart-rate variability, no medical claims. The explainer language MUST stay calm and avoid words like "improves", "treats", "cures", "heals", "diagnoses".
  2. **"How this app times your breath"** — 2-3 sentences naming the app's rules in plain English: fewer than 7 breaths per minute, no pauses between inhale and exhale, exhaling longer than inhaling for asymmetric ratios. These rules are already documented in `PROJECT.md` §Context — the copy paraphrases them in user-facing language.
  3. **"Who is Forrest Knutson"** — 1-2 sentences introducing Forrest as the teacher whose practice inspired the app. The user-locked phrase **`inspired by Forrest's teachings`** MUST appear here (D-11 below).
- **D-09:** **Claude drafts the explainer copy.** The drafting happens during plan-phase (or as the first execute-phase task), produces a complete first draft for all three sections, and the user reviews/edits before final commit. Total target length: ~120-200 words across all three sections (concise but covers LEARN-03's "brief in-app explanation" requirement comfortably).
- **D-10:** **Copy lives in a structured content asset, not inline in JSX.** The asset is **i18n-ready in shape** (section-keyed, e.g. a typed TS object literal with `sectionKey → string` mapping, or a Markdown source file parsed at build) but does NOT ship i18n runtime machinery in v1 — only the English content. Justification: PROJECT.md notes "English first, multilingual support possible later" (`I18N-01` v2). The shape choice (TS object vs Markdown file vs JSON) is planner discretion — the constraints are: (a) content is one source of truth, not duplicated across components; (b) sections are individually addressable for future locale swap; (c) it does not pull in a Markdown parser / i18n framework dependency unless explicitly justified. Lightest plausible form is a typed `learnContent.ts` module exporting a record; planner picks.
- **D-11:** The phrase **`inspired by Forrest's teachings`** MUST appear verbatim in the "Who is Forrest Knutson" section. Locked at user request. Planner does not paraphrase or substitute.

### Curated Links And Resource Set
- **D-12:** The modal renders a **labeled link block** below the explainer with the following five items (URLs supplied by the user at plan-phase or as an explicit pre-execute hand-off, EXCEPT the book URL which is already locked):
  1. **`YouTube channel`** — Forrest's primary YouTube channel.
  2. **`Website`** — Forrest's personal site.
  3. **`Book`** — **URL locked at `https://amzn.to/3RTAVqi`** (the Amazon link Forrest uses in his own video descriptions; the app reuses Forrest's published link as-is and earns no affiliate revenue from clicks — see D-14 for the affiliation disclaimer that covers this).
  4. **`Hero video`** — exactly one designated "start-here" Forrest video. URL + title supplied at plan-phase.
  5. **`Key videos`** — a short list of additional curated videos. Count is open (planner expects 2-5 items but user has not committed); URLs + titles supplied at plan-phase. If the user supplies zero key videos and one hero video, the v1 surface ships with just the hero. LEARN-02 is satisfied as long as at least the hero video link is present at execute time.
- **D-13:** **Link presentation: plain text labels, no thumbnails, no embeds, no Open Graph previews.** Each link is a single line with a calm label (the URL itself never displayed). External-link icon / glyph is optional — planner picks based on whether the corner anchor + modal context makes it redundant. Visual rhythm of the block uses existing pastel theme tokens (Phase 2 `theme.css`); no Forrest-branded color or asset.

### Claim-Safe And Disclaimer Copy
- **D-14:** The modal contains exactly **two disclaimer micro-surfaces, modal-only, in this order**:
  1. **One calm sentence near the bottom** of the modal (after the explainer + links): `This is guided breathing practice — not medical advice.` (Or planner-equivalent phrasing — the locked intent is: one sentence, calm tone, no clinical jargon, no "consult a clinician", no multi-sentence legal paragraph. The verbatim text above is the default unless the user edits it during plan-phase review.)
  2. **A micro-line at the very bottom** of the modal, in tiny grey text: `Independent project. Not affiliated with Forrest Knutson.` Sits below the medical-advice line — the two together form a two-line "legal footer feel" that stays calm and minimal.
- **D-15:** **NO disclaimer or claim-safe copy anywhere outside the Learn modal.** The main breathing screen, `StatsFooter`, `EndSessionDialog`, and `ResetStatsDialog` ship unchanged. The Learn modal carries the entire LEARN-04 obligation in v1. Justification: putting medical-advice copy on the main practice screen would clash with the calm/non-clinical posture PROJECT.md locks in.

### Forrest Branding Posture
- **D-16:** **Name + plain text links only.** No image, no avatar, no Forrest YouTube channel avatar, no logo, no Forrest likeness anywhere in v1. The name `Forrest Knutson` is rendered as typography only. This satisfies PROJECT.md's permission-gated stance on Forrest assets (`Treat Forrest logo/assets as permission-dependent`) without requiring a permission conversation as a Phase 6 blocker.
- **D-17:** **Visual rhythm comes from typography and existing pastel theme tokens** (Phase 2 `theme.css`). No new theme tokens are introduced for Phase 6. No new color, no new gradient, no new asset.

### Test And Verification Posture
- **D-18:** The corner anchor's **disabled-during-session** behavior is unit-testable via the same `appPhase` predicate the existing `inSessionView` derivation uses. Tests assert: (a) anchor renders enabled in `idle`, (b) anchor renders disabled (aria-disabled, no click handler) in `lead-in` and `running`, (c) clicking the disabled anchor does not open the modal, (d) the anchor's enabled/disabled transition is purely visual — no remount.
- **D-19:** The modal is **unit-testable as a standalone component** following the pattern of `EndSessionDialog.test.tsx` and `ResetStatsDialog.test.tsx` — vitest + `HTMLDialogElement` polyfill (already in `vitest.setup.ts` from Phase 2). Tests assert: (a) Esc cancels, (b) backdrop click closes, (c) default focus lands on a non-link control, (d) external links carry `target="_blank"` and `rel="noopener noreferrer"`, (e) the user-locked verbatim phrase `inspired by Forrest's teachings` is rendered.
- **D-20:** **No manual UAT plan is required for Phase 6 beyond standard regression.** This phase ships no timing/audio/visual mechanics that need real-device cross-browser validation (Phase 5.1 carries the iOS/Safari open work). A short Phase-6 UAT plan documents: (a) modal opens from the corner anchor in `idle`, (b) anchor is non-interactive during `lead-in` and `running`, (c) external links open in new tabs without affecting a running session if opened pre-session, (d) Esc/backdrop close behaves like the other two dialogs. Plan is a sanity check, not a blocking gate.

### Claude's Discretion
The following implementation details are explicitly left to research/planning:
- Exact filename and module shape of the content asset (`learnContent.ts` vs `learnContent.md` vs `learnContent.json`). Constraint: i18n-ready section-keyed shape, single source of truth, no new dependency unless justified.
- Exact filename of the new dialog component (`LearnDialog.tsx` vs `LearnSection.tsx` vs other — pick for symmetry with `EndSessionDialog.tsx` / `ResetStatsDialog.tsx`).
- Exact filename of the new anchor component (or whether it inlines into `App.tsx` directly — Phase 4's `StatsFooter` is its own component; the anchor is small enough that an inline `<button>` in `App.tsx` is also acceptable).
- Whether to render an external-link glyph next to each link label, or rely on the modal context.
- Exact wording of the calm medical-advice sentence (D-14 default vs planner-equivalent). User reviews at plan-phase.
- Exact wording of the three explainer sections (D-08 structure is locked; the prose itself is planner-drafted and user-reviewed at plan-phase).
- The order of items within the link block — hero video first vs channel first vs book first. Planner picks based on what feels most calm/inviting; the locked content is the set, not the order.
- Whether the corner anchor renders an icon glyph (e.g. an open-book or info icon) alongside the `Learn` text or stays text-only. Constraint: stays calm, no new asset.
- Whether a single shared dialog component is extracted from `EndSessionDialog` / `ResetStatsDialog` to back the new modal too, or `LearnDialog` is a fresh component that mirrors them. Phase 4 D-12 already noted "can extract a generic `ConfirmDialog` from `EndSessionDialog` or add a second concrete dialog" — Phase 6 inherits the same choice and the planner picks the cleanest diff.
- Whether to log a single dev-only `console.debug` when the disabled anchor is clicked (defensive observability). Optional, no user-facing surface.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope And Constraints
- `.planning/PROJECT.md` — Defines the local-only / no-accounts / no-medical-claims constraint that bounds the disclaimer copy; the "Forrest logo/assets are permission-dependent" decision row that bounds D-16; the calm/pastel aesthetic in §Context that bounds D-17; and the out-of-scope row on "Medical, therapeutic, diagnostic, or HRV-improvement claims" that locks the LEARN-04 framing.
- `.planning/ROADMAP.md` — Defines Phase 6 goal (`Users can understand the app's HRV/resonance-style breathing context and reach Forrest Knutson learning resources through calm, claim-safe in-app content`), the four success criteria, and confirms this is the last v1 phase. Phase 5.1 carry-forward audio/orb work is owned by Phase 5.1 (not Phase 6).
- `.planning/STATE.md` — `Blockers/Concerns` row: "Forrest links/copy need careful review to avoid implied endorsement or protected asset reuse in Phase 6" — flagged at roadmap creation and now actively addressed by D-15 + D-16 + D-14's affiliation micro-line.

### Requirements
- `.planning/REQUIREMENTS.md` — Defines `LEARN-01` (prominent link to Forrest's YouTube channel — D-12 item 1), `LEARN-02` (curated links to selected HRV breathing explanation videos — D-12 items 4-5), `LEARN-03` (brief in-app explanation of HRV/resonance breathing + the timing rules — D-08), `LEARN-04` (claim-safe copy frames the app as guided breathing practice, not medical advice — D-14 + D-15). Also lists deferred items relevant to bounding Phase 6: v2 `I18N-01` (multi-language support) is the future motivation for D-10's i18n-ready content shape; v2 `CUST-01` (themes / sound packs) is NOT pulled forward by D-17's "no new theme tokens" stance.

### Carrying Forward From Prior Phases
- `.planning/phases/02-visual-guide-accessible-responsive-interface/02-CONTEXT.md` — D-10/D-11/D-12 lock the native `<dialog>` pattern (focus trap, Esc cancels, backdrop close, locked copy as inline JSX strings) that Phase 6 D-05 reuses. D-17 (44×44 hit-area floor) bounds Phase 6 D-04. D-21 (focus-visible rings) bounds Phase 6 D-04. D-15 (single-column card layout) bounds the page-level placement of the corner anchor — the anchor sits outside the card but inside the same `<main>` flow.
- `.planning/phases/04-local-memory-practice-stats/04-CONTEXT.md` — D-10 (hide `StatsFooter` during session view) is the spiritual precedent for Phase 6 D-03 (disable corner anchor during session view). D-12 (`ResetStatsDialog` clone of `EndSessionDialog` with locked copy) is the second instance of the dialog pattern that Phase 6 D-05 is the third instance of. D-13 (inline link Reset with 44×44 floor via tap-target padding) is the technique Phase 6 D-04 reuses for the anchor.
- `.planning/phases/03-optional-generated-audio-cues/03-CONTEXT.md` — D-09's user-gesture rules and D-10's silent-fallback posture are NOT directly relevant to Phase 6 (no audio surface) but are referenced because the modal's `<dialog>` open is a user-gesture event and Phase 6's links inherit the same security-default posture (`target="_blank" rel="noopener noreferrer"` — D-07).

### Reusable Components
- `src/components/EndSessionDialog.tsx` — structural template for the new Learn dialog. Same focus-trap + Esc + backdrop pattern. Planner picks: clone-and-rename, or extract a generic `ConfirmDialog` + 3 instances.
- `src/components/ResetStatsDialog.tsx` — second existing instance of the same dialog pattern. Confirms the clone-pattern works at N=2 already; adding N=3 (Learn) does not require extraction unless cleaner.
- `src/components/StatsFooter.tsx` — pattern reference for a small below-card surface with 44×44 hit-area floor on an inline-text affordance. Phase 6's corner anchor is structurally different (page-level, not card-footer) but the hit-area technique transfers.

### Web And External Resources
- MDN `<dialog>` — native `<dialog>` element behavior (top-layer rendering, `showModal()`, backdrop, focus-trap, `cancel` event for Esc).
- MDN `rel="noopener noreferrer"` — security default for external links opening in new tabs (D-07).
- Forrest Knutson YouTube channel — URL supplied at plan-phase by user. (LEARN-01.)
- Forrest Knutson personal website — URL supplied at plan-phase by user.
- Forrest Knutson book on Amazon — URL **locked**: `https://amzn.to/3RTAVqi` (mirror of the link Forrest publishes in his own video descriptions; app earns nothing from clicks).
- Forrest hero video + key-videos URLs — supplied at plan-phase by user.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/App.tsx` is the composition site. The new corner anchor renders either inline in App's JSX (above the `<section>` containing the breathing card) or as a small new component imported by App. The anchor's enabled/disabled gate reads the same `inSessionView` predicate Phase 4 already computes (`appPhase !== 'idle'`-equivalent). The Learn modal state (`learnDialogOpen: boolean`) is a new piece of App-level `useState`, sibling to the existing `endDialogOpen` and `resetDialogOpen` state. The modal element is rendered at the bottom of `<main>` alongside the existing two dialogs.
- `src/components/EndSessionDialog.tsx` is the structural template. Same `<dialog>` markup, same `open` / `onConfirm` / `onCancel` prop shape (Phase 6's dialog has `onClose` instead of confirm/cancel since there is no destructive action), same Esc + backdrop behavior. Planner can clone-and-rename or extract a `ConfirmDialog` shared component.
- `src/components/ResetStatsDialog.tsx` is the second existing instance — confirms the dialog pattern works at N=2 dialogs.
- `src/components/StatsFooter.tsx` is the reference for inline link styling + 44×44 hit-area padding on a small text label (Phase 4 D-13). The corner anchor reuses the technique on a page-level button.
- `src/styles/theme.css` exposes the existing pastel tokens. Phase 6 introduces no new tokens (D-17). The micro-line disclaimer (D-14 #2) uses the existing muted color (`var(--color-breathing-muted)` or equivalent).
- `vitest.setup.ts` already polyfills `HTMLDialogElement` (Phase 2) and `matchMedia` (Phase 2). Phase 6 needs no new test infrastructure — the new component tests slot into the existing setup.

### Established Patterns
- **Native `<dialog>` for modals** — Phase 2 (`EndSessionDialog`) and Phase 4 (`ResetStatsDialog`) prove the pattern. Phase 6 is the third instance and the decision point for extraction-vs-clone.
- **Inline locked copy** — Phase 2 D-11 and Phase 4 D-12 keep dialog copy as inline JSX strings to prevent copy drift across plans. Phase 6 follows the same posture for the disclaimer micro-surfaces (D-14) but the explainer (D-08) lives in a content asset (D-10) because of its size and i18n-readiness. The disclaimer lines are short enough to inline; the explainer is not.
- **Hide-during-session-view gating** — Phase 4 D-10 hides `StatsFooter` during `lead-in` + `running`. Phase 6 D-03 disables (rather than hides) the corner anchor during the same predicate. Disable, not hide, because the anchor lives outside the card flow and removing it would cause a layout shift.
- **44×44 hit-area floor via padding** — Phase 2 D-17 and Phase 4 D-13 set the technique. Phase 6 D-04 inherits.
- **External-link security default** — `target="_blank" rel="noopener noreferrer"` is the project default for any link leaving the app. Phase 6 D-07 is the first instance to ship; the pattern locks in here for any future external-link surface.
- **No-new-theme-tokens** — Phase 4 noted "no new theme tokens anticipated for Phase 4"; Phase 6 inherits the same posture (D-17). Phase 2 owns the pastel palette.

### Integration Points
- **Corner anchor render site (`src/app/App.tsx`):** the anchor renders at page level — either as the first child of `<main>` (above the `<section>` wrapping the breathing card) with `position: absolute` / `position: fixed` to the top-right, or as a flex-positioned element inside a new top-level wrapper. Planner picks based on cleanest CSS for responsive behavior on narrow viewports. Constraint: anchor must not overlap the card content at any breakpoint and must respect mobile safe-area insets.
- **`inSessionView` predicate (existing in `App.tsx`):** the anchor's `disabled` / `aria-disabled` state derives from this exact same boolean the rest of the app uses. No new predicate.
- **Modal state (`learnDialogOpen`):** new `useState<boolean>(false)` in `App.tsx`, sibling to `endDialogOpen` and `resetDialogOpen`. Opened by the anchor's `onClick`, closed by the dialog's `onClose` callback or Esc/backdrop.
- **Modal render site (`src/app/App.tsx`):** new `<LearnDialog open={learnDialogOpen} onClose={…} />` rendered inside `<main>` after the existing `<ResetStatsDialog>` (line ~545). Single render site, same as the existing two dialogs.
- **Content asset import:** the new content module (D-10) is imported either by `LearnDialog.tsx` directly (most likely) or via a thin barrel re-export. No App-level import needed.

### Files Anticipated
- `src/components/LearnDialog.tsx` — new dialog component (~80-150 lines anticipated).
- `src/components/LearnDialog.test.tsx` — new unit tests (D-19).
- `src/content/learnContent.ts` (or `.md` / `.json` — planner picks) — new content asset (D-10).
- `src/app/App.tsx` — touched to add the corner anchor, the modal state, and the modal render. Anticipated diff: ~15-30 lines.
- `src/components/StatsFooter.tsx` — UNCHANGED. Phase 6 does not modify the stats surface.
- `src/styles/theme.css` — UNCHANGED. No new tokens (D-17).
- Possibly `src/components/LearnAnchor.tsx` (or inline in App) — small new anchor component. Planner discretion.

</code_context>

<specifics>
## Specific Ideas

- **User-locked phrase: `inspired by Forrest's teachings`** — MUST appear verbatim in the "Who is Forrest Knutson" section of the explainer (D-11). Planner does not paraphrase or substitute.
- **Locked URL: Forrest book Amazon link = `https://amzn.to/3RTAVqi`** — D-12 item 3. This is the same shortened link Forrest publishes in his own video descriptions. The app reuses Forrest's published link rather than constructing its own Amazon URL or affiliate tag. The app earns no affiliate revenue from clicks; the affiliation micro-line in D-14 covers any perception ambiguity.
- **Single label `Learn`** — D-02. Not `Learn · About`, not `Learn more`, not `About this practice`. Single word, calm, scannable.
- **Two-line legal footer feel inside the modal** — D-14. Medical-advice sentence on one line, affiliation micro-line on a second line directly below it, in tinier grey text. Together they read as a calm, minimal "fine print" stripe at the bottom of the modal — not as a legal block.
- **Corner anchor is persistent on-page, never removed mid-session** — D-01 / D-03. Disabled, not hidden. Stable layout across all app states.
- **Three-section explainer, in fixed order** — D-08. "What is HRV / resonance breathing" → "How this app times your breath" → "Who is Forrest Knutson". The Forrest section is intentionally last; the practice itself comes first.
- **External links use `target="_blank" rel="noopener noreferrer"`** — D-07. Project default for any future external link surface in v1+.
- **The phrase "inspired by Forrest's teachings" is the bridge** between the app's independent posture (D-14 #2 affiliation disclaimer) and the warm naming/crediting of Forrest as a teacher. The phrase, the link to his channel, and the lack of any logo together establish the calibrated "respectful but independent" tone.

</specifics>

<deferred>
## Deferred Ideas

- **"About" modal as a second corner anchor** — declined in v1 (D-02). Any credits / acknowledgments surface beyond the affiliation micro-line stays out of scope. Future polish phase could add a second anchor once a clear distinct surface exists.
- **First-visit auto-open of the Learn modal** — considered in discuss (Option D on the anchor-behavior question), declined. Would require a persisted `hasSeenLearn` flag in storage and first-run orchestration in `App.tsx`. Could be added as a v1.x polish phase if discoverability data warrants it.
- **Persistent disclaimer micro-line on the main breathing screen** — declined (D-15). Modal-only is the v1 calm-posture choice. If a stakeholder later requires always-visible "not medical advice" copy on the main screen, a future phase can add a footer micro-line.
- **Multi-language copy variants** — v2 `I18N-01`. The Phase 6 content asset is i18n-ready in shape (D-10) but ships only English in v1. The runtime locale machinery + content translations are deferred entirely.
- **Inline video players or embedded YouTube iframes** — declined. Phase 6 ships external links only. Embedding pulls in third-party scripts, breaks the local-only posture for any tracking, and adds layout complexity. Future polish could add a lightweight thumbnail preview without an embedded player.
- **Forrest avatar / channel image / any visual Forrest asset** — declined (D-16). PROJECT.md gates protected assets on permission, which has not been obtained. If user secures permission later, a v1.x polish phase could add a single avatar.
- **Affiliate disclosure copy / "we may earn a commission" framing** — N/A for v1. The book URL mirrors Forrest's own published link; the app earns nothing. If the app ever adds its own affiliate tag in a future phase, this disclaimer surface is the place to extend.
- **External-link glyph next to each link label** — left to planner discretion (Claude's Discretion section). If selected against by the planner, no deferred work.
- **Open Graph / link preview cards for Forrest videos** — declined. Plain labeled text is the v1 posture (D-13). Could be added in a future polish phase.
- **A "Last updated" date or version stamp inside the modal** — not considered necessary in v1. The git history is the source of truth for content changes.
- **Curated video count beyond "1 hero + a short list"** — user supplies the count at plan-phase (D-12 item 5). If the user ships with only the hero video, LEARN-02 is still satisfied (the spec says "curated links to selected videos" — plural is non-binding when "selected" can be one).

</deferred>

---

*Phase: 6-Learning & Claim-Safe Positioning*
*Context gathered: 2026-05-10*
