# Phase 29: Settings Install Entry & Localization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 29-settings-install-entry-localization
**Areas discussed:** Settings entry placement & form, iOS path inside the dialog, Desktop / no-install browsers, PT-BR copy finalization

---

## Settings entry placement & form

### Placement in SettingsDialog column

| Option | Description | Selected |
|--------|-------------|----------|
| Below Language, above Close | Last block before Close; install reads as separate app-level utility | ✓ |
| Top, above Theme | First in the dialog — highest discovery visibility | |
| Its own labeled section | Visually separated section with heading/divider, anywhere | |

### Form of the entry

| Option | Description | Selected |
|--------|-------------|----------|
| Single labeled action row | Section label + one action, mirrors picker `sectionLabel` rhythm | ✓ |
| Reuse InstallBanner component | Drop whole InstallBanner inside the dialog | |
| Plain text + link | A sentence with inline install link | |

### Behavior when already installed

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden entirely | No row in standalone mode (SC4) | ✓ |
| Shown as 'Installed' confirmation | Static inert row | |

### Section label copy direction

| Option | Description | Selected |
|--------|-------------|----------|
| "Install" / "Install app" | Short, matches one-word picker labels | |
| "Install for offline use" | Benefit-describing, banner-style one-liner | ✓ |
| You decide | Leave wording to planner/copy pass | |

**Notes:** Install treated as a distinct app-level action separate from the 5 customization pickers.

---

## iOS path inside the dialog

### How iOS steps appear

| Option | Description | Selected |
|--------|-------------|----------|
| Inline-expand within the dialog | Steps expand in place below the row — same pattern as the banner | ✓ |
| Always-visible steps | Steps render expanded by default on iOS | |
| Nested sub-dialog | Second `<dialog>` with steps — modal-on-modal | |

### iOS step content sharing

| Option | Description | Selected |
|--------|-------------|----------|
| Extract shared steps component | Pull iOS steps + IOsShareIcon into a reusable component | ✓ |
| Reuse whole InstallBanner | Render entire InstallBanner inside the dialog | |
| Independent copy | Separate markup per surface — drift risk | |

### Android post-prompt row behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Row disappears (re-gate) | Standalone detection flips after install; entry hides on next open | ✓ |
| Disable the button | Keep row visible, disable button after prompt consumed | |
| You decide | Leave to planner; no dead button | |

**Notes:** Modal-on-modal explicitly rejected; consistency with Phase 28 D-05.

---

## Desktop / no-install browsers

### Firefox/Safari desktop (no install capability)

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden — only when installable | Entry shows only when `beforeinstallprompt` captured or iOS | ✓ |
| Show browser-specific instructions | Always present; manual guidance on no-install browsers | |
| Show, disabled with a note | Visible but inert with "Not supported" text | |

### Desktop Chrome/Edge install path

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — identical install button | Same native-prompt button as Android | ✓ |
| Desktop gets different copy | Same trigger, desktop-worded copy | |

### INSTALL-06 "including desktop" nuance

| Option | Description | Selected |
|--------|-------------|----------|
| Clarify requirement intent | Treat INSTALL-06 as "present wherever install is possible"; record in CONTEXT.md | ✓ |
| Reconsider — show on all desktop | Show some entry on Firefox/Safari desktop for literal wording | |

**Notes:** D-08/D-10 — entry hidden on Firefox/Safari desktop is the correct INSTALL-06 behavior, not a coverage gap; verifier should not flag it.

---

## PT-BR copy finalization

### Finalization mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 26-style review process | Review markers + fs-scan drift-guard test | ✓ |
| Operator finalizes directly | Operator provides/approves strings inline | |
| You decide | Leave mechanism to planner | |

### Scope of localization pass

| Option | Description | Selected |
|--------|-------------|----------|
| All install copy — banner + Settings | Finalize PT-BR for Phase 28 banner block AND new Settings copy | ✓ |
| Settings entry copy only | Only the new Phase 29 strings | |

### Who translates

| Option | Description | Selected |
|--------|-------------|----------|
| Claude drafts, operator approves | Claude writes native-quality PT-BR, operator reviews | ✓ |
| Operator supplies translations | Operator provides final PT-BR strings | |

**Notes:** Reuses the Phase 26 mechanism end-to-end; INSTALL-07 spans both install surfaces.

---

## Claude's Discretion

- Exact final EN + PT-BR install-entry label wording (direction locked: "Install for offline use" style).
- File location of the extracted shared iOS-steps component.
- Wiring of `useBeforeInstallPrompt` state so both the banner and the Settings entry observe the same captured prompt.

## Deferred Ideas

None — discussion stayed within phase scope.
