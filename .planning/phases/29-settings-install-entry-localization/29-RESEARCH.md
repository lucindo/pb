# Phase 29: Settings Install Entry & Localization - Research

**Researched:** 2026-05-16
**Domain:** React component integration (SettingsDialog extension), React state sharing, i18n copy finalization, drift-guard testing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Settings entry placement & form**
- D-01: Install entry sits in SettingsDialog below Language picker, above Close button — last block before Close.
- D-02: Form is a single labeled action row — section label plus one action, mirroring picker sectionLabel rhythm.
- D-03: Section label copy direction is "Install for offline use" — benefit-describing banner-style one-liner. Final wording locked in localization pass.
- D-04: When installed (standalone), install entry is hidden entirely — no row. `useIsStandaloneOrPhone` already detects standalone.

**iOS path inside the dialog**
- D-05: iOS steps inline-expand within SettingsDialog below the install row — same inline-expand pattern as Phase 28 banner. No modal-on-modal.
- D-06: iOS step content extracted into a shared component rendered by both InstallBanner and the Settings entry. One source of truth.
- D-07: Android / desktop Chrome/Edge triggers native prompt via captured `beforeinstallprompt`. After install, standalone detection flips and entry hides on next dialog open.

**Desktop / no-install browsers**
- D-08: Settings install entry shown only when an install path exists — `beforeinstallprompt` was captured OR platform is iOS. Desktop Firefox/Safari (no mechanism) see no entry.
- D-09: Desktop Chrome/Edge get identical native-prompt install button as Android.
- D-10: INSTALL-06 intent = "present wherever installation is possible." D-08 is the correct INSTALL-06 behavior.

**PT-BR copy finalization**
- D-11: PT-BR finalized via Phase 26-style native-speaker review — draft strings carry review markers, get finalized, drift-guard test confirms done-state.
- D-12: Localization pass covers all install copy — Phase 28 banner UiStrings.install block AND new Settings entry strings — finalized together.
- D-13: Claude drafts native-quality PT-BR (applying Phase 26 RPM/VFC glossary); operator reviews and approves before markers are removed.

### Claude's Discretion
- Exact final wording of EN + PT-BR install-entry label/copy (direction locked by D-03).
- Whether the shared iOS-steps component lives in `src/components/` as a standalone file or alongside InstallBanner — constraint: both surfaces import the same component.
- How Settings install row's installability state is wired (lift to shared owner, context, or prop-drill from App.tsx) — constraint: banner and Settings entry observe the same captured prompt.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. Desktop install banners, banner re-surfacing after dismissal, and install analytics remain out of scope per REQUIREMENTS.md Out-of-Scope table.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INSTALL-06 | User can find a persistent install option in SettingsDialog whenever the app runs in a browser, including desktop | Gated on installable condition (deferredPrompt captured OR isIOS) AND NOT isStandalone; existing hooks cover all detection; prop-drill or lift wires the state; D-10 clarifies desktop scope |
| INSTALL-07 | User sees all install banner and Settings copy in their selected language (EN and PT-BR) | UiStrings.install block already exists with EN final + PT-BR draft; extend with Settings-entry keys; finalize PT-BR via review-marker + drift-guard mechanism |
</phase_requirements>

---

## Summary

Phase 29 is an integration and localization phase with no new infrastructure. All detection hooks (`useBeforeInstallPrompt`, `useIsStandaloneOrPhone`), the strings catalog (`UiStrings.install`), the dialog host (`SettingsDialog`), and the locale plumbing (`useLocale`) already exist from Phases 19, 28. The work is: (1) wire install state into SettingsDialog via prop-drill or lift, (2) extract the iOS-steps inline block from InstallBanner into a shared component, (3) mount the install row inside SettingsDialog, (4) add Settings-entry strings to `UiStrings.install`, and (5) finalize PT-BR copy with review markers and remove them after operator approval.

The central architectural question is how `deferredPrompt` / `triggerInstall` (currently owned by `useBeforeInstallPrompt` called in App.tsx) reaches SettingsDialog. Three approaches exist: prop-drill (narrowly surgical, zero new abstraction), lift to a parent-owned callback (same file, no extra component), or React context (heaviest, unnecessary at this scale). The codebase evidence strongly favors prop-drill: every other capability (strings, onClose, inSessionView) is already drilled into SettingsDialog as props. The constraint from CONTEXT.md is that banner and Settings entry observe the same captured prompt — prop-drill from App.tsx satisfies this trivially because App.tsx already owns both `deferredPrompt` and the InstallBanner render.

The Phase 26 review-marker mechanism is already in place as a working drift-guard. Adding new Settings-entry strings to the `install` block means extending both the `UiStrings` interface and the two locale entries in `UI_STRINGS`, then adding a `// TODO: native-speaker review` comment to the PT-BR entry, which the existing `content.no-review-markers.test.ts` will catch if not removed.

**Primary recommendation:** Prop-drill install state into SettingsDialog; extract iOS steps to `src/components/InstallStepsIOS.tsx` (or `IosInstallSteps.tsx`); finalize copy in `strings.ts` with the Phase 26 review-marker workflow.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Install installability detection (deferredPrompt / isIOS) | App.tsx (client) | useBeforeInstallPrompt hook | Hook captures the browser event; App.tsx aggregates and gates all render surfaces |
| Standalone detection (hide when installed) | App.tsx (client) | useIsStandaloneOrPhone hook | Same hook already used for banner gate; gate repeated for settings entry |
| Settings install row render | SettingsDialog (client) | — | Dialog owns its own layout; install row is a slotted block inside the dialog column |
| iOS inline-expand steps | Shared component (client) | InstallBanner + SettingsDialog | D-06: one source of truth; both surfaces render the shared component |
| Locale copy for install | strings.ts (static content) | useLocale hook | Catalog-driven per project convention; no inline strings in components |
| PT-BR review gate | content.no-review-markers.test.ts (test) | — | fs-scan drift-guard: blocks CI if review markers remain |

---

## Standard Stack

This phase introduces no new npm dependencies. All tooling is inherited from Phase 28 / baseline.

### Core (existing, verified in codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.5 | Component composition, hooks | Project baseline — `[VERIFIED: package.json]` |
| TypeScript | 6.0.2 | Type-safe interfaces | Project baseline — `[VERIFIED: package.json]` |
| Vitest | 4.1.5 | Unit/component tests | Project test runner — `[VERIFIED: package.json]` |
| @testing-library/react | (existing) | Component rendering in tests | Established test pattern — `[VERIFIED: codebase]` |
| Tailwind CSS | (existing) | Utility classes via CSS vars | Project styling — `[VERIFIED: codebase]` |

**Installation:** No new packages needed. `[VERIFIED: codebase — no new dependencies identified]`

---

## Architecture Patterns

### System Architecture Diagram

```
App.tsx
  ├── useBeforeInstallPrompt()
  │     └── { deferredPrompt, triggerInstall }  ──────────────────────────┐
  ├── useIsStandaloneOrPhone()                                              │
  │     └── { isStandalone, isIOS, isPhone }  ──────────────────────────┐  │
  ├── useLocale()                                                         │  │
  │     └── { uiStrings }  ────────────────────────────────────────────┐ │  │
  │                                                                     │ │  │
  ├── InstallBanner (isIOS, onInstall=triggerInstall, strings=install)  │ │  │
  │     └── <IosInstallSteps strings /> (if isIOS && expanded)          │ │  │
  │                                                                     │ │  │
  └── SettingsDialog (open, onClose, inSessionView, strings,            │ │  │
                       isIOS, isStandalone,              ◄──────────────┘─┘  │
                       onInstall=triggerInstall,  ◄─────────────────────────┘
                       deferredPrompt≠null)
        └── install row (show when installable AND NOT standalone)
              ├── Android/desktop: <button onClick=onInstall>
              └── iOS: toggle + <IosInstallSteps strings /> (inline expand)
```

### Recommended Project Structure (additions only)

```
src/
├── components/
│   ├── InstallBanner.tsx           # existing — imports IosInstallSteps (Phase 29 edit)
│   ├── IosInstallSteps.tsx         # NEW — extracted shared iOS steps component (D-06)
│   └── SettingsDialog.tsx          # existing — receives install props + mounts row (Phase 29 edit)
└── content/
    └── strings.ts                  # existing — extend UiStrings.install + finalize PT-BR (Phase 29 edit)
```

### Pattern 1: Prop-Drill for Install State into SettingsDialog

**What:** Pass `deferredPrompt`, `isIOS`, `isStandalone`, and `onInstall` as new props to SettingsDialog from App.tsx — same pattern as `inSessionView`, `strings`, `onClose`.

**When to use:** When the consumer (SettingsDialog) is a direct child of the state owner (App.tsx) and the state is needed in one place within the dialog. This is true here.

**Why not Context:** SettingsDialog already receives 5 props; adding 3-4 more is within the dialog's role as the install-settings integration point. Context adds indirection that no other surface in the app uses.

**Why not lift to a new hook:** `useBeforeInstallPrompt` already captures the event correctly. Duplicating the hook call would mean two listeners competing for the same `beforeinstallprompt` event — incorrect.

**Existing pattern in App.tsx (analogous):**
```typescript
// Source: src/app/App.tsx lines 179-200
const { isPhone, isStandalone, isIOS } = useIsStandaloneOrPhone()
const { deferredPrompt, triggerInstall } = useBeforeInstallPrompt()
// ...
const showBanner = isPhone && !isStandalone && !installDismissed && appPhase === 'idle' && (isIOS || deferredPrompt !== null)
// ...
<InstallBanner isIOS={isIOS} onInstall={triggerInstall} ... />
```

**Settings entry gate (derived in App.tsx or SettingsDialog):**
```typescript
// Source: [ASSUMED] — derived from CONTEXT.md D-04/D-08
const showSettingsInstall = !isStandalone && (isIOS || deferredPrompt !== null)
// Pass to SettingsDialog, or compute inside SettingsDialog from raw props
```

**SettingsDialog prop extension:**
```typescript
// Source: [ASSUMED] — mirrors existing SettingsDialogProps pattern
export interface SettingsDialogProps {
  open: boolean
  onClose(this: void): void
  inSessionView: boolean
  strings: Pick<UiStrings, 'settings' | 'themes' | 'variants' | 'cue' | 'timbres' | 'install'>
  // New for Phase 29:
  isIOS: boolean
  isStandalone: boolean
  installable: boolean          // = isIOS || deferredPrompt !== null
  onInstall(this: void): Promise<void>
}
```

Alternatively, pass `isIOS`, `isStandalone`, `deferredPrompt !== null`, and `onInstall` separately — equivalent. The planner decides exact prop shape.

### Pattern 2: Shared IosInstallSteps Component (D-06)

**What:** Extract the iOS step block from InstallBanner into a standalone component. Both InstallBanner and the Settings install row import and render it.

**Current location in InstallBanner.tsx (lines 74-89):**
```typescript
// Source: src/components/InstallBanner.tsx lines 74-89
{isIOS && iosExpanded && (
  <div id="install-ios-steps" aria-live="polite" className="pt-4 text-sm leading-6">
    <ol className="list-decimal pl-5">
      <li className="text-[var(--color-breathing-accent-strong)]">
        {strings.iosStep1}
        {' '}
        <IOsShareIcon />
      </li>
      <li>{strings.iosStep2}</li>
      <li>{strings.iosStep3}</li>
    </ol>
  </div>
)}
```

And the `IOsShareIcon` helper function (lines 96-117).

**Extraction shape:**
```typescript
// Source: [ASSUMED] — derived from InstallBanner.tsx and CONTEXT.md D-06
export interface IosInstallStepsProps {
  id: string               // for aria-controls on the toggle button
  strings: Pick<UiStrings['install'], 'iosStep1' | 'iosStep2' | 'iosStep3'>
}

export function IosInstallSteps({ id, strings }: IosInstallStepsProps) {
  return (
    <div id={id} aria-live="polite" className="pt-4 text-sm leading-6">
      <ol className="list-decimal pl-5">
        <li className="text-[var(--color-breathing-accent-strong)]">
          {strings.iosStep1}{' '}<IOsShareIcon />
        </li>
        <li>{strings.iosStep2}</li>
        <li>{strings.iosStep3}</li>
      </ol>
    </div>
  )
}
```

The `IOsShareIcon` SVG moves into this file or stays as an internal helper. If it stays in InstallBanner.tsx, the shared component imports it from there — but this creates a circular dependency risk. Cleaner: move it alongside `IosInstallSteps`.

**Consumer pattern (Settings row, D-05):**
```typescript
// Source: [ASSUMED] — mirrors InstallBanner's iosExpanded local state pattern
const [iosExpanded, setIosExpanded] = useState<boolean>(false)
// ...
<button aria-expanded={iosExpanded} aria-controls="settings-ios-steps"
  onClick={() => setIosExpanded(prev => !prev)}>
  {strings.install.iosStepsButton}
</button>
{iosExpanded && <IosInstallSteps id="settings-ios-steps" strings={strings.install} />}
```

### Pattern 3: Settings Install Row — Section Label Rhythm

**What:** The install row matches the SettingsDialog picker rhythm — `<p>` section label + action below.

**Current picker template (LanguagePicker.tsx):**
```typescript
// Source: src/components/LanguagePicker.tsx lines 33-35
<div>
  <p id="language-picker-label" className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">{sectionLabel}</p>
  <div role="radiogroup" ...>
```

**Settings install row (analogous):**
```typescript
// Source: [ASSUMED] — derived from CONTEXT.md D-02 and LanguagePicker pattern
<div>
  <p className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">
    {strings.install.settingsLabel}  {/* e.g. "Install for offline use" */}
  </p>
  <div className="mt-2">
    {isIOS ? (
      <>
        <button ...>{strings.install.iosStepsButton}</button>
        {iosExpanded && <IosInstallSteps id="settings-ios-steps" strings={strings.install} />}
      </>
    ) : (
      <button onClick={() => void onInstall()}>{strings.install.installButton}</button>
    )}
  </div>
</div>
```

### Pattern 4: UiStrings.install Extension

**What:** Add Settings-entry-specific keys to the existing `UiStrings.install` interface.

**Current interface (strings.ts lines 133-142):**
```typescript
// Source: src/content/strings.ts lines 133-142
readonly install: {
  readonly regionLabel: string
  readonly bannerText: string
  readonly installButton: string
  readonly iosStepsButton: string
  readonly dismiss: string
  readonly iosStep1: string
  readonly iosStep2: string
  readonly iosStep3: string
}
```

**Extension for Phase 29 (new keys only):**
```typescript
// Source: [ASSUMED] — derived from CONTEXT.md D-02/D-03
readonly install: {
  // ... existing 8 fields ...
  readonly settingsLabel: string    // "Install for offline use" (D-03)
}
```

The `installButton` and `iosStepsButton` strings are already shared — Settings entry can reuse them directly (same action, same copy). Only the section label needs a new key.

### Pattern 5: PT-BR Review-Marker Workflow

**What:** Draft PT-BR strings carry the marker comment `// TODO: native-speaker review`. The drift-guard test fails if the marker remains. Operator approves final text; implementer removes the marker.

**Marker convention (verified in content.no-review-markers.test.ts):**
```typescript
// Source: src/content/content.no-review-markers.test.ts lines 36-46
const REVIEW_MARKER = 'TODO: native-speaker review'
// Test fails if any non-test .ts file in src/content/ contains this string.
```

**Usage in strings.ts:**
```typescript
// Source: src/content/strings.ts line 406-407 (current PT-BR draft pattern)
// DRAFT: Phase 29 will finalize PT-BR install copy
install: {
  // ... values ...
}
```

**Phase 29 pattern — draft with markers:**
```typescript
// TODO: native-speaker review
install: {
  settingsLabel: 'Instalar para uso offline',   // [DRAFT — to be reviewed]
  // ... update existing PT-BR fields if needed ...
}
```

The `// TODO: native-speaker review` line on the block (or per-field) is the trigger. After operator sign-off, the line is removed. The test then passes. `[VERIFIED: content.no-review-markers.test.ts lines 36-46]`

### Anti-Patterns to Avoid

- **Calling useBeforeInstallPrompt twice:** The hook registers a `beforeinstallprompt` listener at mount. If SettingsDialog also called the hook, there would be two competing listeners. Always call once in App.tsx and pass results down.
- **Duplicating iOS step markup in SettingsDialog:** Before D-06, this would mean two copies of the step list + IOsShareIcon. Changes to step text or layout would need to happen in two places. Extract to shared component.
- **Inline strings in components:** Project convention (D-01 of strings.ts header) forbids UI strings inline in components. All install-entry copy must route through `strings.ts`.
- **Gating on isPhone inside SettingsDialog:** The Settings install entry is present on desktop Chrome/Edge (D-09). The banner was gated on `isPhone`; the Settings entry must NOT inherit that gate. Gate on `installable` (deferredPrompt !== null OR isIOS) only.
- **Showing "installed" confirmation when standalone:** D-04 says hide the row entirely. No "You're already installed" message — empty space where the row was.
- **Removing review markers before operator approval:** D-13 says Claude drafts, operator approves. The drift-guard test is the "done" signal — it passes only after markers are removed, which happens only after human approval.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Standalone detection | Custom navigator.standalone polling | `useIsStandaloneOrPhone` (already built, Phase 28) | All iOS/Android/desktop edge cases handled, including iPadOS 13+ |
| Install prompt capture | New event listener | `useBeforeInstallPrompt` (already built, Phase 28) | One-shot prompt, appinstalled handling, saveInstallDismissed on installed — all covered |
| iOS install steps | Copy/paste from InstallBanner | Extract to `IosInstallSteps` component (D-06) | Prevents copy drift, satisfies D-06 constraint |
| Locale state | Prop threading or re-read | `useLocale` in App.tsx (already wired) → `uiStrings.install` prop | Locale already centralized; SettingsDialog already receives `strings` prop |
| PT-BR drift detection | Manual audit | `content.no-review-markers.test.ts` (already exists) | Automated fs-scan runs with every `npm test` |

**Key insight:** This phase is almost entirely composition. The hard parts (browser APIs, state management, i18n plumbing) are done. Phase 29 is wiring + extraction + copy.

---

## Common Pitfalls

### Pitfall 1: Leaking isPhone gate into SettingsDialog
**What goes wrong:** Planner copies the `showBanner` gate pattern and includes `isPhone` in the SettingsDialog install-row gate, hiding the entry from desktop Chrome/Edge users.
**Why it happens:** The banner explicitly requires `isPhone` (D-08 of Phase 28 — no desktop banner). The Settings entry has the opposite requirement (D-08/D-09 of Phase 29 — desktop Chrome/Edge SHOULD see it).
**How to avoid:** Gate the Settings row on `!isStandalone && (isIOS || deferredPrompt !== null)` — no phone check.
**Warning signs:** Test matrix that only tests phone scenarios for the Settings row.

### Pitfall 2: Double-registering beforeinstallprompt listener
**What goes wrong:** useBeforeInstallPrompt called in both App.tsx and SettingsDialog (or a custom hook inside SettingsDialog). The first listener's `e.preventDefault()` suppresses the mini-infobar; the second misses the event entirely, `deferredPrompt` stays null, Settings entry never appears on Android.
**Why it happens:** Wanting encapsulation — making SettingsDialog self-contained for its install logic.
**How to avoid:** Only App.tsx calls `useBeforeInstallPrompt`. Pass `deferredPrompt !== null` (or `triggerInstall`) down as props.
**Warning signs:** SettingsDialog importing `useBeforeInstallPrompt`.

### Pitfall 3: IosInstallSteps ID collision
**What goes wrong:** InstallBanner and SettingsDialog both render IosInstallSteps with `id="install-ios-steps"`. When both are in the DOM simultaneously (theoretically impossible since SettingsDialog is a modal that overlays the banner's area, but worth noting), IDs collide. More practically: if the IDs are the same, the `aria-controls` on the toggle buttons may point to the wrong element if a screen reader implements aria-controls via ID lookup across the whole document.
**Why it happens:** Copying the `id="install-ios-steps"` string from InstallBanner into the new shared component.
**How to avoid:** Pass `id` as a prop to `IosInstallSteps`. InstallBanner passes `"install-ios-steps"`, SettingsDialog passes `"settings-ios-steps"`.
**Warning signs:** Hardcoded `id` inside IosInstallSteps.

### Pitfall 4: TypeScript error when extending UiStrings.install
**What goes wrong:** Adding a new key to `UiStrings.install` interface causes a TypeScript compile error at `as const satisfies Readonly<Record<LocaleId, UiStrings>>` if the new key is missing from either `en` or `pt-BR` locale entries.
**Why it happens:** `satisfies` enforces exhaustive coverage — any missing key is a type error.
**How to avoid:** Add the new key to the interface AND both locale entries simultaneously in the same edit.
**Warning signs:** `npm run build` failing with "Property X is missing in type..." after adding a key to the interface only.

### Pitfall 5: Review marker in wrong scope
**What goes wrong:** The `// TODO: native-speaker review` comment is placed on a line OUTSIDE `src/content/` (e.g., in a component file), or not placed at all. The drift-guard test only scans `src/content/` non-test `.ts` files.
**Why it happens:** Misreading the test's `CONTENT_DIR = resolve(__dirname)` — it resolves to `src/content/`, not `src/`.
**How to avoid:** The PT-BR draft comment belongs in `src/content/strings.ts` only. No review markers anywhere else.
**Warning signs:** `content.no-review-markers.test.ts` passes immediately despite draft PT-BR values (because the marker was placed in `src/components/`).

### Pitfall 6: inSessionView not applied to install row
**What goes wrong:** The install action row is not disabled when `inSessionView=true`, allowing users to trigger the install flow during a session.
**Why it happens:** The install row is a new block that doesn't inherit the existing `disabled={inSessionView}` threading automatically.
**How to avoid:** Consult SettingsDialog D-05 ("inSessionView prop threaded as disabled={inSessionView} to all four pickers"). The install row should follow the same contract — either disable the button or hide the row when `inSessionView` is true. CONTEXT.md D-04 says the row is absent when standalone; inSessionView is a separate concern. Planner needs to decide: disable-not-hide (matching picker pattern) or keep-but-don't-care (the dialog auto-closes on session start per App.tsx WR-09 effect). Given WR-09 auto-closes SettingsDialog when `inSessionView` flips to true, disabling the button is belt-and-suspenders but technically correct.

---

## Code Examples

### App.tsx — passing install state to SettingsDialog
```typescript
// Source: src/app/App.tsx (existing pattern — SettingsDialog call at line 818)
<SettingsDialog
  open={settingsDialogOpen}
  onClose={onSettingsClose}
  inSessionView={inSessionView}
  strings={uiStrings}
  // Phase 29 additions (prop-drill from existing hook values):
  isIOS={isIOS}
  isStandalone={isStandalone}
  installable={isIOS || deferredPrompt !== null}
  onInstall={triggerInstall}
/>
```

### content.no-review-markers.test.ts — existing drift guard
```typescript
// Source: src/content/content.no-review-markers.test.ts (VERIFIED)
const REVIEW_MARKER = 'TODO: native-speaker review'
// Scans all non-test .ts files in src/content/
// Fails if any file contains the marker substring
```

### SettingsDialog.test.tsx — existing test pattern for new behaviors
```typescript
// Source: src/components/SettingsDialog.test.tsx (VERIFIED pattern)
// Tests assert dialog.open boolean, onClose invocations, and child text rendering
// New install-row tests follow same pattern:
// - render with installable=true, isStandalone=false → expect install row visible
// - render with installable=false → expect install row absent
// - render with isStandalone=true → expect install row absent
// - render with isIOS=false, installable=true → expect install button
// - render with isIOS=true, installable=true → expect steps-toggle button
```

### InstallBanner.tsx — iOS steps section (extraction target)
```typescript
// Source: src/components/InstallBanner.tsx lines 74-89 (VERIFIED)
// This entire block becomes IosInstallSteps:
{isIOS && iosExpanded && (
  <div id="install-ios-steps" aria-live="polite" className="pt-4 text-sm leading-6">
    <ol className="list-decimal pl-5">
      <li className="text-[var(--color-breathing-accent-strong)]">
        {strings.iosStep1}{' '}<IOsShareIcon />
      </li>
      <li>{strings.iosStep2}</li>
      <li>{strings.iosStep3}</li>
    </ol>
  </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Banner-only install UX | Persistent Settings row (Phase 29) | Phase 29 | Post-dismissal recovery path for all browsers |
| PT-BR draft strings | PT-BR final strings | Phase 29 | INSTALL-07 complete |
| iOS steps duplicated in banner only | Shared IosInstallSteps component | Phase 29 | Single source of truth per D-06 |

**Deprecated/outdated:**
- `// DRAFT: Phase 29 will finalize PT-BR install copy` comment in strings.ts: replaced in Phase 29 with review-marker workflow, then removed after operator approval.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | IosInstallSteps takes an `id` prop (not hardcoded) | Architecture Patterns — Pattern 2 | ID collision if hardcoded and both surfaces render simultaneously; mitigate with unique IDs per surface |
| A2 | Only one new `settingsLabel` key needed in UiStrings.install (installButton and iosStepsButton can be reused) | Pattern 4 | If designer/operator wants distinct copy for Settings button vs banner button, one more key per locale |
| A3 | SettingsDialog install row is disabled (not hidden) during inSessionView | Pitfall 6 | Behavior technically irrelevant since WR-09 closes dialog on session start; but disabling is the correct belt-and-suspenders per picker pattern |
| A4 | The boolean `installable` (isIOS \|\| deferredPrompt !== null) is computed in App.tsx and passed as a single prop | Pattern 1 | Equivalent to passing raw booleans and computing inside SettingsDialog; either works, planner decides |

**If this table is empty:** Not applicable — 4 assumptions recorded above.

---

## Open Questions

1. **Exact prop name for "is there an install path" in SettingsDialog**
   - What we know: App.tsx has `isIOS`, `deferredPrompt !== null` (via `useBeforeInstallPrompt`)
   - What's unclear: Whether to pass a pre-computed `installable: boolean` or raw `isIOS: boolean` + `hasPrompt: boolean` — planner decides
   - Recommendation: Pass `installable` (pre-computed) for a cleaner SettingsDialog API; avoids re-computing the OR inside the dialog

2. **Whether `installButton` and `iosStepsButton` copy is reused or new keys added**
   - What we know: The install button in the Settings row performs the same action as in the banner; the "How to install" toggle performs the same iOS flow
   - What's unclear: Whether the operator wants slightly different button copy in the Settings context vs the banner
   - Recommendation: Reuse existing keys initially; D-03 says only the section label needs a new string. If operator wants distinct copy during review, add keys at that point.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code/config changes only. No new external dependencies, CLIs, services, databases, or runtimes. Vitest (4.1.5) confirmed running. `[VERIFIED: npm test output — 987 tests pass]`

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | vite.config.ts (vitest inline config) |
| Quick run command | `npm test -- --run src/components/SettingsDialog.test.tsx src/components/IosInstallSteps.test.tsx src/content/content.no-review-markers.test.ts` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INSTALL-06 | Settings row visible when installable=true, !standalone | unit | `npm test -- --run src/components/SettingsDialog.test.tsx` | ❌ Wave 0 — new tests in existing file |
| INSTALL-06 | Settings row absent when installable=false | unit | same | ❌ Wave 0 |
| INSTALL-06 | Settings row absent when isStandalone=true | unit | same | ❌ Wave 0 |
| INSTALL-06 | Android/desktop path: install button triggers onInstall | unit | same | ❌ Wave 0 |
| INSTALL-06 | iOS path: steps-toggle present, steps expand inline | unit | same | ❌ Wave 0 |
| INSTALL-06 | IosInstallSteps renders 3 steps with Share glyph | unit | `npm test -- --run src/components/IosInstallSteps.test.tsx` | ❌ Wave 0 — new file |
| INSTALL-06 | InstallBanner still renders IosInstallSteps (no regression after extraction) | unit | `npm test -- --run src/components/InstallBanner.test.tsx` | ✅ Existing — adjust after extraction |
| INSTALL-07 | PT-BR review markers removed from strings.ts | drift-guard | `npm test -- --run src/content/content.no-review-markers.test.ts` | ✅ Existing — passes when markers removed |
| INSTALL-07 | UiStrings.install has all required keys in both locales | type check | `npm run build` (tsc) | ✅ Existing — TypeScript enforces exhaustive coverage |

### Sampling Rate
- **Per task commit:** `npm test -- --run src/components/SettingsDialog.test.tsx src/content/content.no-review-markers.test.ts`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] New `describe` blocks in `src/components/SettingsDialog.test.tsx` — covers INSTALL-06 row visibility, Android button, iOS toggle
- [ ] `src/components/IosInstallSteps.test.tsx` — covers D-06 shared component (steps render, Share glyph present, id prop wired to aria-controls)
- [ ] No new test files needed for strings.ts extension — TypeScript satisfies check plus existing drift-guard cover INSTALL-07

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no | Install prompt is a browser API call, no user text input |
| V6 Cryptography | no | — |

**Security posture:** This phase is UI-only composition. The `beforeinstallprompt` API is browser-controlled; there is no server, no auth, no user data collection. The `installable` boolean is derived from browser events — no XSS surface (it is not rendered as HTML). No new localStorage keys are introduced. Same threat posture as Phase 28 T-28-08 (showBanner is a pure derived boolean with no external mutation surface) — the Settings row gate is identical in structure.

---

## Sources

### Primary (HIGH confidence)
- `src/components/InstallBanner.tsx` — verified iOS steps block and IOsShareIcon at lines 74-117
- `src/components/SettingsDialog.tsx` — verified picker layout, inSessionView threading, props interface
- `src/hooks/useBeforeInstallPrompt.ts` — verified deferredPrompt/triggerInstall API and single-listener pattern
- `src/hooks/useIsStandaloneOrPhone.ts` — verified isStandalone/isIOS/isPhone detection
- `src/content/strings.ts` — verified UiStrings.install interface (8 fields), EN final, PT-BR draft with comment
- `src/content/content.no-review-markers.test.ts` — verified REVIEW_MARKER = 'TODO: native-speaker review', CONTENT_DIR = src/content/
- `src/app/App.tsx` — verified showBanner gate, hook call sites, SettingsDialog render with existing props
- `.planning/phases/29-settings-install-entry-localization/29-CONTEXT.md` — decisions D-01..D-13

### Secondary (MEDIUM confidence)
- `.planning/phases/28-phone-install-banner/28-01-SUMMARY.md` through `28-03-SUMMARY.md` — Phase 28 implementation record confirms hooks + component are complete as described

### Tertiary (LOW confidence)
- None — all claims derived from verified codebase files

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified in package.json and codebase
- Architecture: HIGH — verified from actual source files; prop-drill and extraction targets are concrete, not speculative
- Pitfalls: HIGH — derived from verified code patterns (gate differences between banner and settings row are explicit in CONTEXT.md decisions)
- Localization mechanism: HIGH — drift-guard test verified line-by-line; marker constant confirmed

**Research date:** 2026-05-16
**Valid until:** 2026-06-16 (stable stack; only risk is new browser changes to beforeinstallprompt behavior)
