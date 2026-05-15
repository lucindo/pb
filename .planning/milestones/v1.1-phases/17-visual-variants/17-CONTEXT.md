---
phase: 17-visual-variants
created: 2026-05-14
milestone: v1.1
requirements:
  - VARIANT-01
  - VARIANT-02
  - VARIANT-03
  - VARIANT-04
  - VARIANT-05
  - VARIANT-06
  - VARIANT-07
---

# Phase 17: Visual Variants - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 17 lands the **visual variant rendering system** on top of the Phase 15 settings shell + Phase 16 token-bound theme cascade: three render variants (Orb default, Square, Ring) swap via a render-local `data-variant` attribute on the shape root div, persist across reloads through `Envelope.prefs.variant`, and are **captured at session start** so mid-session pref changes (cross-tab or otherwise) never swap the active shape.

Deliverables:

1. **NEW** `src/components/OrbShape.tsx` — extracted **verbatim** from the existing `BreathingShape.tsx` Body + LeadIn subtrees. `BreathingShapeBody` → `OrbBody`, `BreathingShapeLeadIn` → `OrbLeadIn`. Imports `usePrefersReducedMotion`, `SessionFrame`, `MIN_SCALE / MAX_SCALE / MID_SCALE`. Renders the existing two-layer gradient orb with outer + inner reference markers. Diff is a mechanical move with one className rename (`.orb-ring--outer/--inner` → `.shape-marker--outer/--inner`, see D-15).
2. **NEW** `src/components/SquareShape.tsx` — same prop interface as OrbShape: `{ frame, leadInDigit? }`. Body scales `0.58 → 1.0` over phase progress (re-uses `MIN_SCALE/MAX_SCALE/MID_SCALE` constants verbatim — single source of truth still lives in OrbShape/constants module). Border-radius **fixed** at a comfortable rounded-square value (e.g. `18%` — planner picks final). Two stacked gradient layers using **the same `.orb-layer--in` / `.orb-layer--out` classes** as orb (D-13 token reuse). Outer + inner reference markers via `.shape-marker--outer/--inner` classes (per-variant border-radius applied via `[data-variant='square']` attribute selector — D-15/D-16). Centered phase label / lead-in digit overlay identical to orb (D-08).
3. **NEW** `src/components/RingShape.tsx` — same prop interface. Body = thick circular stroke (annulus) that scales `0.58 → 1.0`. Center hole is transparent or page-background-tinted (planner picks). Two gradient layers reuse `.orb-layer--in/--out` classes (D-13). Outer + inner reference markers via `.shape-marker--outer/--inner` with thinner-stroke per-variant override under `[data-variant='ring']`. Centered phase label / lead-in digit overlay identical to orb (D-08).
4. **EDIT** `src/components/BreathingShape.tsx` — becomes a ~20-line **dispatcher**. Owns the idle null-return guard (`frame === null && leadInDigit == null → return null` — D-04). Accepts new `variant: VisualVariantId` prop (D-03). Switches on variant and delegates to `<OrbShape | SquareShape | RingShape frame leadInDigit />`. No other logic. `BreathingShape.test.tsx` slims to dispatch-only smoke (orb-specific tests move to `OrbShape.test.tsx`).
5. **NEW** `src/hooks/useVisualVariant.ts` — App-side orchestrator hook mirroring `useTheme.ts` (Phase 16). Owns:
   - `useState<VisualVariantId>(() => loadPrefs().variant)` seeded at mount;
   - cross-tab `'storage'` listener filtered on `STATE_KEY` — re-reads `loadPrefs().variant`;
   - same-tab `'hrv:prefs-changed'` listener filtered on `detail.key === 'variant'` (forward-compat hook already documented in `useTheme.ts:76`);
   - returns `{ variant, setVariant }`.
   No `data-variant` global attribute write (D-16 — render-local only); no matchMedia subscription (variants are not OS-driven).
6. **NEW** `src/hooks/useVariantChoice.ts` (or co-located inside `VariantPicker.tsx` — planner's call, mirroring `useThemeChoice` posture). Reads `loadPrefs().variant`, exposes `setVariant(next)` that calls `savePrefs({ ...loadPrefs(), variant: next })` then `window.dispatchEvent(new CustomEvent('hrv:prefs-changed', { detail: { key: 'variant', value: next } }))`.
7. **EDIT** `src/components/VariantPicker.tsx` — Phase 15 stub body (`Variant: {prefs.variant}`) becomes a real radiogroup over `VARIANT_OPTIONS` (Phase 14 D-01: `'orb' | 'square' | 'ring'`). Each option button renders an **inline static shape swatch** (small SVG / CSS-only mini orb / square / ring icon — planner picks rendering primitive) alongside the option label. **No live BreathingShape preview at idle** (D-12). Calls `setVariant(id)` on selection. `disabled` gated by Phase 15 D-02 contract. 44×44 hit area + `focus-visible` ring per VARIANT-06.
8. **EDIT** `src/app/App.tsx`:
   - Invoke `useVisualVariant()` once near `useTheme()`;
   - add `sessionVariantRef = useRef<VisualVariantId | null>(null)` (D-09);
   - inside the existing `startSession` handler — at the same call-site where audio engine, scheduler, wake-lock acquire — set `sessionVariantRef.current = liveVariant` **before** lead-in begins (D-10);
   - on session end / reset, set `sessionVariantRef.current = null`;
   - thread `sessionVariantRef.current ?? liveVariant` as the `variant` prop to `<BreathingShape … />`. Idle uses `liveVariant` so a Phase 15+ idle preview path could be added later without re-wiring; today `BreathingShape` returns null at idle so the value is unused.
9. **EDIT** `src/styles/theme.css`:
   - rename `.orb-ring--outer { … }` → `.shape-marker--outer { … }` and `.orb-ring--inner { … }` → `.shape-marker--inner { … }` (token block, reduced-motion `@media` block, Phase 13 `.orb-ring--inner { display: none }` suppression rule, and `[data-phase='out'] .orb-ring--inner` rule — search-replace across the file);
   - add `[data-variant='square'] .shape-marker--outer { border-radius: 18% }` and `[data-variant='square'] .shape-marker--inner { border-radius: 18% }` (planner picks final radius);
   - add `[data-variant='ring'] .shape-marker--outer { border-width: 1px }` (thinner) and any other Ring-specific marker overrides (planner picks);
   - **NO** new `--color-*` tokens; `--color-orb-in/out-*` reused across all variants (D-13).
   - **NO** rename of `.orb-layer--in/--out` (D-13 — orb-named class reused by all variants; rename deferred to v1.2 ergonomics pass).
10. **NEW** Vitest coverage:
    - `OrbShape.test.tsx` — Body + LeadIn from the old `BreathingShape.test.tsx` (moved, not rewritten);
    - `SquareShape.test.tsx` + `RingShape.test.tsx` — body scale interpolation, lead-in digit overlay (VARIANT-05), `data-variant` attribute presence, reduced-motion fixed-scale path (VARIANT-04);
    - `BreathingShape.test.tsx` — dispatch-only smoke (renders correct child per variant prop, returns null at idle);
    - `useVisualVariant.test.ts` — cross-tab + same-tab listener, no global attribute write;
    - `VariantPicker.test.tsx` — radiogroup behavior, disabled gating, savePrefs + custom-event dispatch on selection.
11. **NO** edits to `src/domain/settings.ts` (`VisualVariantId` / `VARIANT_OPTIONS` / `isValidVariant` / `DEFAULT_VARIANT` locked in Phase 14 D-01/D-05).
12. **NO** edits to `src/storage/prefs.ts` (`loadPrefs` / `savePrefs` / `coercePrefs` locked Phase 14).
13. **NO** edits to `src/components/SettingsDialog.tsx` (Phase 15 D-01 contract — picker phases never re-edit the dialog).

**Not in scope (Phase 18/19 owns):**
- Timbre presets in `cueSynth` (Phase 18 / TIMBRE-01..05)
- Language swap + `learnContent.ts` PT-BR (Phase 19 / I18N-01..05)
- Per-variant token sets (variant-distinct palettes) — deferred to v1.2 (see Deferred Ideas)
- 4th+ variants (waveform, diamond, …) — deferred (`VARIANT_OPTIONS` locked at 3 in Phase 14 D-01)
- `.orb-layer--in/--out` class rename to `.shape-layer--in/--out` for naming consistency — deferred to v1.2 ergonomics pass
- Live idle preview of the selected variant inside `BreathingShape` — deferred (see Deferred Ideas)

</domain>

<decisions>
## Implementation Decisions

### Variant rendering architecture

- **D-01:** **Three sibling shape files + thin dispatcher.** NEW `src/components/OrbShape.tsx` + `SquareShape.tsx` + `RingShape.tsx`. `BreathingShape.tsx` becomes a ~20-line dispatcher that switches on `variant` and delegates. Mirrors Phase 15 D-01 "one file per customization dimension". Per-variant test files. Largest diff but cleanest extension path for any future variants. Chosen over (b) single fat `BreathingShape` with internal switch (file balloons ~3x; cross-variant regression risk) and (c) registry/map `Record<VisualVariantId, FC>` (new abstraction for only 3 entries — YAGNI).

- **D-02:** **Orb extracted verbatim.** `BreathingShapeBody` → `OrbBody`, `BreathingShapeLeadIn` → `OrbLeadIn`, cut byte-identical into `OrbShape.tsx` **except** for one mechanical className rename (`.orb-ring--outer/--inner` → `.shape-marker--outer/--inner`, see D-15). VARIANT-02 zero-regression provable via git diff (orb code unchanged except the rename). Existing `BreathingShape.test.tsx` splits — orb-specific cases → `OrbShape.test.tsx`, dispatch-only smoke → `BreathingShape.test.tsx`. Chosen over (b) extract + refactor common helpers (harder to bisect orb regressions; new shared-primitive surface) and (c) rewrite orb on extract (diff no longer a pure move; VARIANT-02 zero-regression harder to argue).

- **D-03:** **App passes `variant` prop to `BreathingShape`.** `BreathingShape` gains `variant: VisualVariantId` prop alongside existing `frame` and `leadInDigit`. App.tsx threads the capture-at-Start frozen value (D-09 / D-10) down. BreathingShape stays a pure render component. Captures coupling explicit — capture mechanism owns source-of-truth. Chosen over (b) BreathingShape calls `useVisualVariant()` internally (couples render component to orchestrator hook; capture-at-start awkward — would need a 'frozen?' flag contradicting render-purity) and (c) BreathingShape reads `loadPrefs()` at mount (one-time read; bypasses capture mechanism + blocks any future idle-preview).

- **D-04:** **Dispatcher owns the idle null-return guard.** `BreathingShape.tsx` checks `if (frame === null && leadInDigit == null) return null` **before** switching on variant. Sibling shape components never see the idle case — each only handles Body + LeadIn render. Single guard site. Per-variant test files don't need idle coverage. Chosen over (b) each shape owns its null-return (duplicates logic 3x; YAGNI for variant-specific idle deviation) and (c) dispatcher always renders, shape decides what null looks like (same duplication cost as b).

### Square + Ring breathing animation

- **D-05:** **Square = scale-only kinematics.** Square is a rounded-corner rectangle that scales `0.58 → 1.0` over phase progress (re-uses `MIN_SCALE / MAX_SCALE / MID_SCALE` constants verbatim). Border-radius **fixed** at a comfortable rounded-square value (planner picks final — suggested `18%` as starting point). Cheapest, closest to orb's perceptual cue strength, reuses `--orb-scale-*` tokens verbatim. Visual distinctness comes from shape, not motion. Chosen over (b) scale + border-radius morph (second animated property; reduced-motion fallback must lock both mid-values) and (c) scale + 45° rotation (three animated properties; GPU compositor risk we already mitigated for orb at Phase 5.1 D-20 multiplies).

- **D-06:** **Ring = scale-only kinematics, hollow center.** Ring is a thick circular stroke (annulus) that scales `0.58 → 1.0`. Outer edge moves like orb body; inner hole stays proportional. Center is transparent or page-background-tinted (planner picks via existing chrome token, no new token). Reuses `--orb-scale-*` + crossfade pattern verbatim. Distinctness from orb = no fill in center. Chosen over (b) stroke-width animation (non-scale animated property; reduced-motion fixed-mid more code) and (c) scale + stroke-width interpolation (two coupled properties; reduced-motion lock-mid more code).

- **D-07:** **Each variant ships its own outer + inner reference markers.** Square's = outer + inner square outlines at MAX/MIN boundary (matching shape border-radius). Ring's = outer + inner concentric thin-ring outlines (since Ring body is already a ring, the markers stay useful min/max boundary cues at thinner stroke). Each variant supplies its own marker pair via the shared `.shape-marker--outer/--inner` classes with `[data-variant]` overrides (D-15). Preserves the v1.0.1 boundary-cue contract per Phase 5.1 D-10/D-12. Chosen over (b) no markers on Square + Ring (loses precise MIN/MAX visual cue Phase 2 D-04 introduced + 260510-tc9 Bug-1 inner-ring fix) and (c) literal circular `.orb-ring--outer/--inner` reused (square body with circular outer ring is visually awkward).

- **D-08:** **Identical phase label + lead-in digit typography and centering across all 3 variants.** All variants render the centered overlay span at the same `text-5xl/6xl` (Body) and `text-7xl/8xl` (LeadIn) sizes, using the same `--color-orb-in-text` / `--color-orb-out-text` tokens. Geometric center for all 3. VARIANT-05 "lead-in digit prop path" satisfied identically. Visual consistency across variants. Chosen over (b) variant-specific typography (locked-copy contract harder; no driver) and (c) hide label on Ring (asymmetric; risks losing the phase cue for users who rely on the text label).

### Capture-at-session-start mechanism (VARIANT-03)

- **D-09:** **`useVisualVariant` orchestrator hook + App-side `sessionVariantRef` snapshot.** Mirror of `useTheme` (Phase 16): `useVisualVariant` owns live state + storage/event sync. App.tsx reads live variant for any future idle-state preview. On Start click, App snapshots `sessionVariantRef.current = liveVariant`; threads `sessionVariantRef.current` to `BreathingShape` during the session; resets to `null` on session end. Picker disabled in-session (Phase 15 D-08) is the user-facing guard; the snapshot is belt-and-suspenders against cross-tab `'storage'` events (which `useVisualVariant` DOES listen to) firing mid-session. Chosen over (b) live `useVisualVariant` only, picker disable is sole guard (cross-tab storage event could flip variant mid-session — exact threat we mitigated for theme but with opposite intent: theme WANTS cross-tab live sync, variant does NOT mid-session) and (c) BreathingShape captures internally via `useMemo([sessionId])` (couples render component to session-identity concept).

- **D-10:** **Snapshot fires inside the existing `startSession` handler in `App.tsx`, before lead-in begins.** Same call-site where audio engine, scheduler, wake-lock acquire fire. Snapshot once; lead-in + breath loop both see the same frozen variant. Reset to `null` on session end / reset. Mirrors the project-wide "Next-session-only swap" decision documented in PROJECT.md (Timbre + Variant captured at session start). Chosen over (b) lazy: snapshot on first frame after Start via useEffect (1–2 paint gap before effect runs; live variant could change in that window if picker re-enables racily) and (c) snapshot on lead-in dismissal / first 'in' phase (would create a visible swap mid-lead-in if user changes variant during 3-2-1 countdown).

- **D-11:** **`sessionVariantRef` preserved across audio reconstruction.** Phase 5.1 / Phase 9 audio reconstruction (background → foreground recovery) does NOT re-snapshot the variant. Reconstruction is a within-session recovery, not a new session. Variant ref stays orthogonal to audio reconstruction (which uses AUDIO-01 generation counter). Matches VARIANT-03 "captured at session start" where "start" = the initial Start click, not each reconstruction. Chosen over (b) re-snapshot on reconstruction (couples two orthogonal subsystems; user-visible variant swap mid-recovery if any picker write somehow landed) and (c) reset to null then re-snapshot (null-flash window risk).

- **D-12:** **No live idle preview in BreathingShape — VariantPicker shows inline shape swatches.** BreathingShape stays `null` at idle. VariantPicker renders 3 small inline shape swatches (orb / square / ring mini renders or SVG icons — planner picks rendering primitive) inside the radiogroup buttons, same posture as ThemePicker's color swatches. User sees the full variant only after Start. Smallest blast radius; preserves Phase 2 D-03 "idle is empty centered column" semantic. Picker UI is the preview surface. Chosen over (b) live idle preview locked at MID_SCALE (new App branch + visual weight on idle view + new test surface) and (c) live idle preview breathing slowly at default 6 BPM (CPU/battery cost; conflicts with Phase 5 hands-off design).

### Reduced-motion + token strategy

- **D-13:** **Reuse `--color-orb-in/out-*` tokens and `.orb-layer--in/--out` classes verbatim across all 3 variants.** Square + Ring use the SAME CSS variables and the SAME gradient layer classes as orb. Square's body shape differs only in `border-radius`; Ring's only in inner-mask. Zero new color tokens; zero `theme.css` palette work; all 5 palettes (Light/Dark/Moss/Slate/Dusk) already-validated contrast (THEME-05 ≥ 1.5) carries through unchanged. Variant identity = shape geometry only. **Trade-off acknowledged:** class name `.orb-layer` is now used by non-orb variants (mild naming inconsistency vs the `.shape-marker` rename in D-15). Documented as a v1.2 ergonomics-pass deferred item rather than expanding Phase 17 diff. Chosen over (b) rename `--color-orb-*` → `--color-variant-*` (~85 hex sites + every .tsx site; large diff for naming clarity only) and (c) per-variant token sets `--color-square-in-*` / `--color-ring-in-*` (~255 hex values × per-palette UAT × 3 — effectively reopens Phase 16.3 curated-palette work per variant).

- **D-14:** **Reduced-motion contract identical across variants via shared classes.** Body locked at `MID_SCALE = 0.79` under `@media (prefers-reduced-motion: reduce)`; `.orb-layer--in/--out` opacity crossfade preserved as the sole phase cue (Phase 2 D-06 + Phase 13 D-03 contract). `.shape-marker--inner` suppressed via `display: none` under reduced-motion (mirror of the existing Phase 13 `.orb-ring--inner` suppression, carried through the rename). `.shape-marker--outer` stays visible per variant (boundary cue). VARIANT-04 satisfied via class reuse — no new `@media` rules per variant. Chosen over (b) per-variant `@media` blocks (duplicates contract 3x; drift risk if orb's reduced-motion contract evolves) and (c) reduced-motion always renders orb regardless of selected variant (violates VARIANT-04; surprises users who selected Square/Ring).

- **D-15:** **Rename `.orb-ring--outer/--inner` → `.shape-marker--outer/--inner` in `theme.css`; per-variant border-radius via `[data-variant='X']` attribute selectors.** Single class hierarchy. Per-variant geometric overrides: `[data-variant='square'] .shape-marker--outer { border-radius: 18% }` (similar for inner); `[data-variant='ring'] .shape-marker--outer { border-width: 1px }` (thinner stroke); orb keeps the default circular shape via no override needed. Honors THEME-UI-01 token-binding contract (no hardcoded color classes introduced). Phase 13 reduced-motion `.shape-marker--inner { display: none }` suppression rule survives the rename. Chosen over (b) keep `.orb-ring--*` + add parallel `.square-marker--*` / `.ring-marker--*` (three parallel class sets; Phase 13 suppression rule duplicated 3x) and (c) keep `.orb-ring--*` verbatim with `[data-variant]` border-radius overrides (semantically confusing — class named 'orb-ring' on square outline; grep ergonomics suffer).

- **D-16:** **`data-variant` attribute is render-local on the shape root div (NOT global).** Each variant component renders `<div data-variant='orb'|'square'|'ring' …>`. CSS selectors `[data-variant='square'] .shape-marker--outer` resolve via DOM ancestry inside the shape root. Variant attribute is co-located with the only consumer (the BreathingShape area). Different from `data-theme` (Phase 16) which sits on `<html>` because every component reads it; variant scope is render-only, so global is over-reach. Chosen over (b) global `<html data-variant>` like data-theme (couples a single component's render to a document-level attribute; risks misuse) and (c) both local + global (over-engineered; YAGNI).

### Carry-forward invariants (load-bearing for Phase 17)

- **D-17:** **Per-commit green-gate** (Phase 7 D-09 / Phase 11 D-17 / Phase 12 D-15 / Phase 14 D-14 / Phase 15 D-14 / Phase 16 / Phase 16.1 / Phase 16.2 / Phase 16.3). `npx tsc --noEmit && npm run lint && npm run build && npm test` exits 0 at every commit boundary. Roll-back, not patch-forward, on red.

- **D-18:** **Zero new npm dependencies** (PROJECT.md v1.1 "Zero net-new runtime deps" invariant + Phase 14 D-15 + Phase 15 D-15 + Phase 16 carry-forward). Pure React + Tailwind v4 + CSS custom properties + Vitest. No SVG library, no shape-rendering helper package — Square + Ring are pure CSS + minimal inline SVG / `div` shapes.

- **D-19:** **Phase 14 D-09 file-split invariant preserved.** `src/domain/settings.ts` (the predicates + OPTIONS arrays + DEFAULT_* constants) is NOT edited in Phase 17 — `VisualVariantId / VARIANT_OPTIONS / isValidVariant / DEFAULT_VARIANT = 'orb'` are already locked. `src/storage/prefs.ts` is NOT edited in Phase 17. Phase 17 ONLY adds new component + hook files + edits `src/app/App.tsx`, `src/components/BreathingShape.tsx`, `src/components/VariantPicker.tsx`, `src/styles/theme.css`, and the affected test files.

- **D-20:** **Phase 15 D-01 picker invariant preserved.** `src/components/SettingsDialog.tsx` is NOT edited in Phase 17. The variant body lives entirely inside `VariantPicker.tsx`.

- **D-21:** **Phase 15 D-02 picker prop contract preserved.** `VariantPicker` accepts exactly `{ disabled: boolean }`. No new props at the `SettingsDialog` call site. Picker self-reads `loadPrefs()` and owns its own `savePrefs()` write path internally (mirroring Phase 16 `useThemeChoice` posture).

- **D-22:** **`'hrv:prefs-changed'` CustomEvent contract reuse** (Phase 16 forward-decl in `useTheme.ts:76` comment). Phase 17 dispatches `new CustomEvent('hrv:prefs-changed', { detail: { key: 'variant', value: next } })` from `setVariant` and listens for it in `useVisualVariant` filtered on `detail.key === 'variant'`. Phase 18/19 will reuse the same event name with different keys (`'timbre'` / `'locale'`). One event name, three filtered consumers.

- **D-23:** **THEME-UI-01 token-binding guard remains green.** No hardcoded `text-{slate,teal}-*` / `bg-{slate,teal}-*` / `text-white` / `bg-white` Tailwind utilities in any new `.tsx` file. All color references go through `var(--color-*)` tokens. `theme.no-hardcoded-classes.test.ts` (Phase 16.1) continues to exit 0. The `.shape-marker` rename is a CSS-only diff and doesn't introduce hardcoded color classes.

- **D-24:** **VARIANT-06 a11y floor.** Picker buttons honor 44×44 hit area + `focus-visible` ring contracts (Phase 2 D-15/D-17/D-21 carry-forward). VariantPicker mirrors ThemePicker's radiogroup a11y posture verbatim.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher + planner) MUST read these before planning or implementing.**

### Phase requirements + roadmap

- `.planning/ROADMAP.md` — Phase 17 entry (success criteria 1–5; depends on Phase 15)
- `.planning/REQUIREMENTS.md` — VARIANT-01..07 full text + acceptance traceability rows
- `.planning/PROJECT.md` — Key Decisions table ("Next-session-only swap" + "Zero net-new runtime deps" + "Per-commit green-gate" invariants)

### Locked prior-phase contracts (read in full — agents must respect these)

- `.planning/phases/14-prefs-foundation/14-CONTEXT.md` — D-01 (`VisualVariantId = 'orb' | 'square' | 'ring'` locked) + D-05 (`DEFAULT_VARIANT = 'orb'`) + D-09 (file-split invariant: settings.ts and prefs.ts NOT edited downstream)
- `.planning/phases/15-settingsdialog-shell/15-CONTEXT.md` — D-01..04 (picker contract + naming + stub) + D-08 (gear disabled-in-session) + D-15 (zero new deps) + D-16 (Phase 14 D-09 carry-forward)
- `.planning/phases/16-themes/16-CONTEXT.md` — useTheme orchestrator pattern + `'hrv:prefs-changed'` CustomEvent contract (forward-decl for variant/timbre/locale at `useTheme.ts:76`)
- `.planning/phases/16.1-ui-token-migration/16.1-CONTEXT.md` (and SUMMARY) — THEME-UI-01 token-binding contract + `theme.no-hardcoded-classes.test.ts` guard

### Source files Phase 17 directly touches or extracts from

- `src/components/BreathingShape.tsx` — current orb Body + LeadIn (224 LOC, two render sites) — D-02 verbatim extraction source
- `src/components/VariantPicker.tsx` — Phase 15 stub (26 LOC) awaiting Phase 17 body
- `src/hooks/useTheme.ts` — pattern reference for `useVisualVariant` (gated mql NOT applicable; cross-tab `'storage'` + same-tab `'hrv:prefs-changed'` patterns ARE applicable)
- `src/hooks/useThemeChoice.ts` — pattern reference for `useVariantChoice`
- `src/hooks/usePrefersReducedMotion.ts` — subscription pattern referenced by OrbBody (also Square + Ring Bodies)
- `src/storage/prefs.ts` — `loadPrefs` / `savePrefs` / `UserPrefs.variant` field (locked Phase 14)
- `src/domain/settings.ts` — `VARIANT_OPTIONS` / `VisualVariantId` / `isValidVariant` / `DEFAULT_VARIANT` (locked Phase 14 — NOT edited in Phase 17)
- `src/styles/theme.css` — orb tokens + `.orb-layer--in/--out` + `.orb-ring--outer/--inner` (rename target) + reduced-motion `@media` block + Phase 13 inner-ring suppression rule
- `src/app/App.tsx` — `BreathingShape` mount at `App.tsx:610`; `startSession` handler (snapshot site for D-10)
- `src/components/ThemePicker.tsx` — radiogroup + savePrefs + custom-event posture to mirror for VariantPicker

### Carry-forward test guards

- `src/styles/theme.contrast.test.ts` (Phase 16 + 16.1 extension) — THEME-05 ≥ 1.5 guard, all 5 palettes (must stay green after `.shape-marker` rename since the color tokens are unchanged)
- `src/styles/theme.no-hardcoded-classes.test.ts` (Phase 16.1-07) — THEME-UI-01 token-binding guard (must stay green after all new .tsx files added)

</canonical_refs>

<code_context>
## Code Context (from scout_codebase)

### Files in scope

- `src/components/BreathingShape.tsx` (224 LOC) — `BreathingShape` dispatcher (export) + `BreathingShapeBody` (active phase render) + `BreathingShapeLeadIn` (lead-in render). Uses `usePrefersReducedMotion`, `MIN_SCALE / MAX_SCALE / MID_SCALE` constants (kept in sync with `--orb-scale-{min,max,mid}` in `theme.css`). Renders two stacked `.orb-layer--in / .orb-layer--out` gradient spans inside a scaled `.orb` div, with `.orb-ring--outer` (`inset: -1.5px`) + `.orb-ring--inner` (width/height = `MIN_SCALE * 100%`) reference markers. Phase label centered with token-bound color (`--color-orb-{in,out}-text`).
- `src/components/VariantPicker.tsx` (26 LOC) — Phase 15 stub. Accepts `{ disabled: boolean }`. Self-reads `loadPrefs()`. Renders `Variant: orb` label as read-only text. Awaits Phase 17 body.
- `src/hooks/useTheme.ts` (92 LOC) — 4 effects: apply effect (write `data-theme` for named themes), gated mql effect (only when `theme === 'system'`), cross-tab `'storage'` listener (filter on `STATE_KEY`), same-tab `'hrv:prefs-changed'` listener (filter on `detail.key === 'theme' || detail.key === undefined`). Returns `{ theme, setTheme }`. Forward-decl comment at line 76 documents Phase 17/18/19 reuse: "Phase 17/18/19 will dispatch different keys for variant/timbre/locale on the same event name."
- `src/hooks/usePrefersReducedMotion.ts` (39 LOC) — matchMedia subscription pattern.
- `src/storage/prefs.ts` — `loadPrefs() → UserPrefs` (includes `variant: VisualVariantId`); `savePrefs(prefs)`; `coercePrefs(raw)` with per-field fallbacks. Locked at Phase 14.
- `src/domain/settings.ts` — `VARIANT_OPTIONS = ['orb', 'square', 'ring'] as const`; `VisualVariantId = typeof VARIANT_OPTIONS[number]`; `isValidVariant`; `DEFAULT_VARIANT = 'orb'`. Locked at Phase 14 D-01/D-05.
- `src/styles/theme.css` — `:root` block (line ~73) declares `--orb-size`, `--orb-scale-{min,max,mid}`. Reduced-motion `@media` block (line ~418+) handles fixed mid-scale + crossfade preservation + Phase 13 inner-ring suppression. `.orb-layer--in/--out` selectors (line ~344) own the gradient stops; `.orb-ring--outer/--inner` selectors (line ~364 / ~381) own the boundary markers.
- `src/app/App.tsx` — `BreathingShape` rendered at line ~610 inside the centered breathing column. `useTheme()` invoked elsewhere in the App body (Phase 16). `startSession` handler is the snapshot site for D-10.

### Reusable patterns to follow

- **Orchestrator hook pattern** — `useTheme.ts` (`useState` seeded from `loadPrefs()`, cross-tab `'storage'` listener, same-tab `'hrv:prefs-changed'` listener, return `{ value, setValue }`). `useVisualVariant` follows this **minus** the matchMedia effect (variant is not OS-driven) and minus the apply-effect (variant has no global `data-*` write per D-16).
- **Picker write hook pattern** — `useThemeChoice.ts` (read `loadPrefs()`, expose setter that calls `savePrefs(...)` then `dispatchEvent(new CustomEvent('hrv:prefs-changed', { detail: { key, value } }))`). `useVariantChoice` is a direct mirror.
- **Radiogroup picker UI** — `ThemePicker.tsx` (radiogroup over OPTIONS, `disabled` prop gate, focus-visible ring, color swatch per option). `VariantPicker` mirrors with inline shape swatch instead of color swatch.
- **Verbatim component extraction** — Phase 16.1 plan 06 SessionControls extraction (Group A) is a precedent for component-shaped extraction; here we're doing function-shaped extraction (Body + LeadIn out of BreathingShape).
- **Render-local `data-*` attribute pattern** — `BreathingShapeBody` already renders `data-phase={frame.phase}` and `data-progress={…}` on the shape root. `data-variant` joins these as a render-local attribute on the same root.

### Test surface conventions

- `*.test.tsx` for React Testing Library; `*.test.ts` for pure hooks.
- Vitest `it.each([...])` for per-variant parameterized tests (mirroring `theme.contrast.test.ts` per-palette pattern).
- FakeAudioContext polyfill not needed for Phase 17 (visual-only).
- `usePrefersReducedMotion` mock pattern in existing `BreathingShape.test.tsx` carries forward to per-variant test files.

</code_context>

<specifics>
## Specific Ideas

- Square's fixed `border-radius` — starting point `18%`; planner picks final after dev-server smoke at 18% / 22% / 25%.
- Ring's `border-width` for marker stroke — start thinner than orb's `1.5px` (e.g. `1px`); planner picks final.
- Ring's body annulus thickness — express as a percentage of the shape size (e.g. `15%` of `--orb-size`), planner picks final.
- VariantPicker inline shape swatches — primitive choice (CSS-only mini renders vs minimal inline SVG vs Tailwind shape utility) is the planner's call; final must honor THEME-UI-01 (no hardcoded color classes).
- `useVisualVariant` hook test layout mirrors `useTheme.test.ts` structure but drops the matchMedia + apply-effect cases.
- Folded todos: none (matched todo `2026-05-13-themes-aesthetic-refresh.md` is a Phase 16.x palette concern, not a variant one — reviewed not folded).

</specifics>

<reviewed_todos>
## Reviewed Todos (matched but not folded)

- `2026-05-13-themes-aesthetic-refresh.md` (score 0.6, keyword match only) — concerns palette aesthetic, addressed by Phase 16.3 closure. Not in Phase 17 scope.

</reviewed_todos>

<deferred>
## Deferred Ideas

- **Per-variant token sets** (`--color-square-in-*` / `--color-ring-in-*`) — variant-distinct palettes per-palette per-variant. ~255 hex values + per-variant UAT × 5 palettes. Effectively reopens Phase 16.3 curated-palette work per variant. Deferred to v1.2 variant-palette refinement; v1.1 = shape-only distinctness via D-13.
- **`.orb-layer--in/--out` → `.shape-layer--in/--out` rename** for naming consistency with the `.shape-marker` rename (D-15). Deferred to v1.2 ergonomics pass — Phase 17 keeps `.orb-layer` verbatim to minimize diff.
- **Live idle preview of selected variant** inside BreathingShape (locked at MID_SCALE, no animation). Deferred — D-12 chose inline picker swatches; revisit if user feedback shows confusion about what each variant looks like before Start.
- **Additional variants** beyond `'orb' | 'square' | 'ring'` (e.g. waveform, diamond, hexagon). `VARIANT_OPTIONS` locked at 3 by Phase 14 D-01. Adding a 4th requires editing `src/domain/settings.ts` (Phase 14 D-09 invariant) and a new `*Shape.tsx` file. Deferred — v1.2+ if user demand materializes.
- **Square 45° rotation kinematics** (rotate between 0 and 45° on phase progress) and **Square border-radius morph** (circular ↔ rounded-square). Both rejected at D-05 for kinematic-complexity reasons; revisit in v1.2 if scale-only feels too plain after user feedback.
- **Ring stroke-width animation** (thin↔thick on phase progress, fixed outer radius). Rejected at D-06; revisit in v1.2 if scale-only Ring feels too similar to scale-only Orb in side-by-side use.
- **Variant-specific accessibility labels** (e.g. "Breathing square shape", "Breathing ring shape" instead of generic "Breathing shape"). Deferred — generic label suffices; a11y consistency across variants preferred for v1.1.
- **Global `<html data-variant>` attribute** for any future variant-aware chrome (e.g. variant-tinted dialog backdrop). YAGNI per D-16; revisit only if a non-BreathingShape component genuinely needs variant awareness.

</deferred>

---

*Phase: 17-visual-variants*
*Context gathered: 2026-05-14 via /gsd-discuss-phase*
