# Spike Manifest

## Idea

Add a second Forrest Knutson practice — **Navi Kriya** — alongside the existing Resonant
Breathing practice in the HRV Breathing WebApp. Navi Kriya follows an HRV-like paced
pattern but with fewer options. The open structural question: ship it as a **separate
sibling app** (nearly a clone of this one) or host **multiple practices in one app** with
a way to switch between them (operator leans toward a Tab Bar). These spikes make the
multi-practice shell tangible before committing.

## Requirements

Design decisions that emerged during spiking — non-negotiable for the real build.

- Per-practice state vs. shared chrome must follow the existing split in
  `src/domain/settings.ts`: session settings (bpm/ratio/duration/mode) are per-practice;
  theme, timbre, visual variant, cue style, and locale are app-wide.
- Navi Kriya's real practice mechanics are NOT yet defined — modeled as a stub. Must be
  specified before any implementation phase.
- **Navigation and an active session are mutually exclusive.** Switching practices is
  disabled while a session is in progress; the user must end the session first. No
  background/multi-practice session state exists — one practice active, one session
  possible. (Spike 001, operator decision.)
- **The practice switcher is a top segmented control** — a compact pill toggle above the
  orb, disabled during a session. Holds comfortably for ~3–4 practices; revisit if the
  catalog grows past that. (Spike 002, operator decision.)
- **One shared chrome-settings screen** (theme, language, visual variant, cue style)
  serves both practices unchanged — these are app-wide, per the spike-001 split. Practice
  controls stay per-practice and are NOT unified. The current `SettingsDialog` mixes both
  and will need to separate shared chrome from per-practice controls. (Operator
  clarification.)
- Navi Kriya is **app-paced** (metronome ticks each OM at the chosen OM length) and
  **auto-advances** front → back → next round, marking each transition with sound.
  (Operator decision, spike 003.)
- Navi Kriya structure: 1 round = front OMs + back OMs at a fixed **4:1 ratio**; base
  front count configurable (default 100); rounds configurable (default 3); four cue
  roles — front marker, back marker, per-OM tick (toggle), end chord. Real tempo
  ≈ 2.16s/OM (Forrest's follow-along ≈ 4m30s/round); fast/medium/slow values finalized
  in the build. Sounds route through the existing `audioEngine`/timbres. (Spike 003.)
- The **Learn screen** is not spiked — shared sections (Who is Forrest, Forrest
  Resources) plus per-practice sections (videos, description) is a content-architecture
  task, not a feasibility risk.
- The **3-2-1 countdown beep** swaps to **Crisp ping** — 660 Hz (`fundamentalHzIn ×
  1.5`), 0.10 s, peak gain 0.12, decay τ 0.04 — replacing the current 440 Hz / 0.12 s /
  0.08 / 0.05 beep. Single beep, **no settings picker**: the operator auditioned the
  alternatives and chose one. The swap is the three `COUNTDOWN_TICK_*` constants plus a
  pitch ratio in `src/audio/nkCueSynth.ts` (`scheduleCountdownTick`), and applies to both
  the HRV and Navi Kriya countdowns. (Spike 004, operator decision.)
- **Stretch is promoted from an HRV `mode` to a top-level practice** — the switcher carries
  three: HRV · Stretch · Navi. The validated top segmented control (spike 002) holds at 3
  practices on mobile down to 320 px in both EN and PT-BR — no compaction needed. The
  switcher ships with **both label treatments** — A (text-only equal pills) and B (icon +
  label) — selectable via a **developer-only** toggle (NOT in the user Settings dialog), so
  the operator picks the final default from real-app testing. Promoting Stretch is a real
  feature (new `PracticeId` `'stretch'`, a third per-practice settings+stats slice, a
  storage migration, EN/PT-BR "Stretch"/"Alongar" strings) — needs its own planned phase.
  (Spike 007, operator decision.)
- The **installed app icon** swaps to **Breathing rings** (pale on deep) — three faint
  concentric rings (radii 200/152/104 in a 512 viewBox, stroke `#e6eef3`, opacity
  0.24/0.42/0.66) around a `#9fc6d6` centre disc (r46), on a `#3b4252→#2b303b` radial
  gradient. Echoes the breathing-orb motion. Ships as PNG exports — `pwa-192/512`,
  `pwa-maskable-192/512`, `apple-touch-icon` (180) in `public/`. The maskable exports
  must inset the glyph (~0.9×) into the inner-80% safe zone — also fixing the existing
  bug where the maskable PNG was byte-identical to the non-maskable one. The browser-tab
  favicon was synced to the same motif: a two-ring + dot mark that keeps the Phase 21
  per-theme recolour (single `__FILL__` colour, retinted per theme). (Spike 006, operator
  decision — icon + favicon shipped.)
- The **session-end sound** swaps to **Warm pad fade** — the same C-major triad, but a
  strike-free envelope: fade in (~0.9 s) → hold → linear fade out (~1.4 s), total ~5.0 s,
  peak 0.11. Replaces the current 1.8 s percussive-strike chord. Single sound, **no
  picker**. Not a pure constant change: `buildNKToneNodes` is strike-only and shared with
  the tick/countdown builders, so the build must add an optional pad envelope-mode to it
  (absent → current strike, so ticks stay byte-identical) and have `scheduleEndChord`
  pass it, alongside revised `END_CHORD_*` constants. Applies to both practices'
  completion sounds. (Spike 005, operator decision.)
- The **visual look-and-feel direction is Monochrome Zen** in a **cool slate** family
  with semibold Inter typography. The current six themes (`light / dark / system / moss /
  slate / dusk`) collapse to just two: **light** (cool pale near-white, `bg #f3f5f7`,
  surface `#ffffff`, accent slate `#5d6877`) and **dark** (cool near-black `#1a1d24`,
  surface `#252932`, accent dimmed mid-slate `#b4bac4` — explicitly *not* bleached
  white), plus the existing `system` follow. The five custom themes are removed; the
  user-visible theme picker becomes a binary light/dark switch and lives on the **App
  Settings page**, not in the Practice Settings sheet. A new `borderSoft` token joins
  the theme vocabulary to head off the spike-008 dark-theme token-collapse pattern.
  The **orb is a three-layer translucent-halo + solid centre disc** (asymmetric border-
  radii for an organic-puddle feel) with the breath label rendered *inside* the disc in
  `onAccent`; tokens `orbHalo1 / orbHalo2 / orbHalo3` (rgba) replace the previous
  gradient + ring tokens. **Orb-always-on-display** is preserved across all screens —
  the Practice Settings sheet opens as a compact bottom sheet that does not eclipse the
  orb. (Spike 009 + spike 010, operator decision.)
- **Five app surfaces — Learn / App Settings / Idle / Running / Complete — are
  visually locked** at spike-010 iteration 6: Learn (info icon destination — about
  Forrest, per-practice intros, resources), App Settings (gear icon — Appearance /
  Language / Audio / About; theme moved here from Practice Settings), Idle (current-
  setup summary in a tappable card → Practice Settings sheet, Start + Mute), Running
  (orb breathing with In/Out inside disc, practice-specific feedback under orb,
  switcher disabled, End + Mute), Complete (orb still with subtle check marker,
  "Session complete" line, Done + Mute — *operator may drop this screen at
  implementation* since A and C diverge only in the marker + line; decision deferred).
  Practice Settings sheet shape: HRV/Stretch get BPM + Ratio + Duration steppers + Cue
  timbre + Cue sound; Navi gets Front OM count + Rounds + Cue timbre + Cue sound +
  Per-OM tick. **A/Idle layout is V1 (Grid) — a 2 × 3 grid card** rendering the active
  practice's settings (1 row for 3-setting practices HRV/Navi, 2 rows for Stretch's 6
  settings; whole card is the tap target → opens the Practice Settings sheet, with a
  right-chevron affordance vertically centred to the card). Other variants explored
  (V2 List / V3 Primary-metric + Adjust button / V4 Pills / V5 Narrative) were rejected
  in favour of V1's predictability, scannability, and continuity across the 3 → 6
  setting range. (Spike 010, operator decision.)
- **Per-practice feedback shape (Running screen)** — HRV uses a time-based primitive
  (large remaining time + small pace caption); Stretch and Navi share a *single*
  count-based primitive (`FeedbackCount`: big primary number, small ` of N` mid, small
  uppercase tracked context line) with different data shapes filled in. One primitive
  per practice-class, not per practice. (Spike 010, operator decision.)
- **Anti-gamification stance** — stats computation continues in the app, but the
  visible "stats footer" (`12 MIN TODAY · STREAK 5d`) and the Practice Settings
  "Reset stats" affordance are both removed pending a deliberate decision on whether
  a stats display belongs in the product. Until then, no streak / duration / badge /
  affirmation surface anywhere — including the Complete screen, which shows only
  "Session complete · Take a moment". (Spike 010, operator decision.)
- **Orb idle behaviour** — both **still** (no animation, empty centre disc) and
  **ambient breath** (gentle scale animation, no In/Out label) read well on the Idle
  and Complete screens. Ship **both** behaviours behind a **developer-only environment
  toggle** (e.g. `VITE_ORB_IDLE_BEHAVIOR=still|ambient`), in the same shape as the
  `VITE_SWITCHER_TREATMENT` dev toggle from spike 007 — not in user-facing App
  Settings. The operator picks the final default from real-app testing. (Spike 010,
  operator decision.)
- **The breathing visual ships two shape variants behind a developer toggle** — V1
  "Orb (halo)" (mono-zen layered halos + accent disc) and V2 "Minimal" (single accent
  disc + faint halo), selectable via env var `VITE_BREATHING_SHAPE=orb-halo|minimal-rings`,
  same shape as the `VITE_SWITCHER_TREATMENT` and `VITE_ORB_IDLE_BEHAVIOR` flags. The
  existing `Square` and `Diamond` shape variants are removed; `Orb` is retained and
  refined. The other shapes explored in spike 010 (Lungs / Column / Ripple) were
  rejected — kept in the spike file for future reference only, not shipped. (Spike 010,
  operator decision.)
- **End-of-phase ring cue is preserved** — an always-visible outer boundary marking
  end-of-inhale, plus an inner boundary that appears only during the exhale phase
  marking end-of-exhale. This is the production Orb's distinguishing feature versus
  most meditation apps (the user paces by sight, gauging distance + velocity to the
  next boundary — not just feeling the rhythm). Both variants V1 and V2 carry the same
  cue. (Spike 010, operator decision.)
- **The practice surface has no vertical scroll and no vertical jiggle** — every
  screen state (Idle / Running / Complete) must fit inside the viewport at all
  supported sizes (mobile + desktop) without scrolling, and switching between
  practices (HRV ↔ Stretch ↔ Navi) or phases (A ↔ B ↔ C) must not cause vertical
  layout shifts of the orb, switcher, or controls. Designs that work at the smallest
  device width (320 px) must be checked against the largest practice (Stretch's
  6-setting Idle SetupCard) and the wordiest locale (PT-BR). (Spike 010, operator
  decision.)
- **Variant app-configuration is removed** — the user-visible "shape variant" picker
  (currently Orb / Square / Diamond) goes away with the v1.6 build. Orb is the only
  family; the dev-toggle between V1 halo and V2 minimal is *not* user-exposed.
  (Spike 010, operator decision.)
- **Design holds at desktop viewport** — the locked mobile design renders inside a
  centered column on desktop (520 px wide for the practice screens A/B/C, 600 px for
  Learn + App Settings) with the orb scaled up to 320 px diameter. Practice Settings
  becomes a center modal instead of a bottom sheet at desktop sizes. No multi-column
  re-layout; the design intentionally stays consistent with mobile. The build phase
  may use any width-detection strategy (CSS `@media` or container queries) as long as
  the outcome matches: same components, larger orb, modal-vs-sheet for the settings
  surface, generous whitespace on either side of the centered column. (Spike 010,
  operator decision.)
- **Ring cues are hidden on Idle (A) and Complete (C)** — even when the orb is
  ambient-breathing on those screens, neither the outer nor inner boundary renders.
  Rings appear only during a Running (B) session. The breath shape itself (orb halos /
  minimal disc) still scales when ambient-breath is on; only the targeting boundaries
  go. (Spike 010, operator decision.)
- **Install banner is V3 Inline card** — the production
  `src/components/InstallBanner.tsx` is replaced by an inline-card treatment that
  reuses the locked V1 SetupCard shape: rounded `surface` card with `borderSoft`
  border, app-icon glyph on the left, two-line content (`Install on this iPhone` /
  `Install the app` title + the locked `bannerText` sub-line `Add to your home
  screen for offline use`), tap-to-install affordance with a right chevron, plus a
  small dismiss X. **Mobile-only, idle-only** (never on desktop, never during
  Running / Complete). Renders below the top app bar — not between switcher and
  orb — to preserve the locked orb position on appear and dismiss. Action label
  branches on `isIOS`: **Install** (Android / Chrome triggers the deferred prompt)
  vs **How to install** (iOS expands the `IosInstallSteps` panel below the card).
  The locked strings (`LOCKED_COPY.{en,pt}.install.*`) carry verbatim; the visual
  shape changes only. (Spike 010, operator decision.)
- **MuteToggle chrome alignment** — the production `MuteToggle.tsx:52` uses
  `border-[var(--color-breathing-accent)]` + `text-[var(--color-breathing-accent-strong)]`,
  which reads as a glaring outlier against the new mono-zen chrome where every other
  icon (top-bar info + gear) uses `borderSoft` + `textSoft`. The build phase must
  update `MuteToggle.tsx` to the lighter treatment so all top/bottom icons sit at the
  same visual weight. Hit area stays 44 px (size-11) for the a11y floor — only colour
  classes change. (Spike 010, operator decision.)
- A **Spiritual-Eye orb variant** ships alongside the production orb-halo: the
  three concentric halos carry a warm-cool gradient (champagne gold outer →
  tan blend mid → cool slate inner — gold halos carry the "ring of light"
  imagery rather than a hard ring stroke), the accent disc becomes a radial-gradient
  opalescent **dark indigo** (light: `#4a5a96 → #34406f → #2a356a` from a
  `42% / 50%` centre; dark: `#6c7cb6 → #4a5a96 → #38477e`), and a small
  white 5-point star (20% of disc, outer:inner radius ratio 2.5, point up,
  stroke 0.5) sits at the centre. Reuses production halo geometry, outer
  ring, progress arc, motion, and idle states verbatim — only colour/glyph
  changes. Locked V5 values + per-theme RGBA + build-phase mapping live in
  `.planning/spikes/012-spiritual-eye-orb/README.md`. The exposure strategy
  (new `BreathingShapeVariant` value behind `VITE_BREATHING_SHAPE` /
  default-for-Navi-Kriya-only / user-visible picker) is left for the build
  phase — *not* locked by this spike. (Spike 012, operator decision.)
- The **Chime cue timbre is replaced by a Flute** — Chime is structurally a near-clone of
  Bowl (Bowl's `1.0 / 2.76 / 5.4` stack + a `7.6×` shimmer), which is why the two sound
  too close. Bowl is kept; the fourth timbre slot becomes a flute with a **soft breath
  attack**. Preset: harmonic partials `1.0→1.0 / 2.0→0.22 / 3.0→0.08`, `decayTauIn 1.1`,
  `decayTauOut 1.4`, `filterFreqHz 4000`, `filterQ 0.4`, `peakGain 0.18`, fundamentals
  unchanged at `440/220`, `oscillatorType 'sine'`. The defining feature is a **~0.13 s
  linear attack ramp** — the strike-envelope flute was rejected for sounding too close to
  Sine. Build implications: (a) `cueSynth` must gain an optional soft-attack envelope mode
  (ramp `0→peakGain` over `attackSec`, then the existing exp decay; absent/`0` ⇒ current
  strike, so Bowl/Bell/Sine + countdown/end cues stay byte-identical — same shape as the
  spike-005 pad mode); (b) `TimbrePreset` gains an `attackSec` field (`0` for the other
  three); (c) the timbre is renamed `chime → flute` across the `TimbreId` union, EN/PT-BR
  display strings, and `TimbrePicker`; (d) persisted `timbre: 'chime'` prefs need a
  coercion/migration to `'flute'`. Needs its own planned phase. (Spike 008, operator
  decision.)

## Spikes

| #   | Name                  | Type       | Validates | Verdict | Tags |
|-----|-----------------------|------------|-----------|---------|------|
| 001 | multi-practice-shell  | standard   | Tabbed shell hosting Resonant + Navi Kriya keeps per-practice settings/stats isolated with shared chrome, without feeling bloated | VALIDATED | architecture, navigation, multi-practice |
| 002 | switcher-ux           | comparison | Which switcher (bottom tab bar / top segmented control / launch screen) fits a calm, mid-practice breathing app | VALIDATED — winner: B (top segmented control) | navigation, ux, comparison |
| 003 | navi-kriya-practice   | standard   | App-paced Navi Kriya counting practice — 100 front / 25 back OM per round, N rounds, marker + per-OM sounds — works as a usable in-app meditation | VALIDATED | practice, navi-kriya, audio, counting |
| 004 | countdown-beep-alternatives | comparison | Auditioning the current 3-2-1 lead-in beep against alternatives surfaces the beep worth shipping | VALIDATED — winner: Crisp ping | audio, countdown, sound-design, cue, comparison |
| 005 | session-end-sound-alternatives | comparison | Auditioning the current session-complete chord against alternatives surfaces the end sound worth shipping, and whether it ships longer | VALIDATED — winner: Warm pad fade | audio, session-end, sound-design, cue, comparison |
| 006 | app-icon-alternatives | comparison | Reviewing meditation-themed installed-icon candidates in real iOS/Android masks surfaces the app icon worth shipping | VALIDATED — winner: Breathing rings | icon, pwa, branding, design, meditation, comparison |
| 007 | three-practice-switcher | comparison | The top segmented control, extended to 3 practices (HRV/Stretch/Navi), stays legible and balanced at real mobile widths | VALIDATED — 3-practice switcher confirmed; both treatments ship behind a dev setting | ui, switcher, navigation, mobile, practice, comparison |
| 008 | chime-replacement-timbre | comparison | Keep Bowl; replace Chime (a near-clone of Bowl) with a flute-family timbre clearly distinct from Bowl/Bell/Sine on In and Out cues, still calm | VALIDATED — winner: Flute — soft attack | audio, timbre, cue, sound-design, flute, comparison |
| 009 | look-feel-alternatives | comparison | Six fully-composed aesthetic directions (palette + typography + orb gradient + ambient surface + chrome) for the practice screen — calm/clean meditation-appropriate look to replace the current 5-theme system | VALIDATED — winner: F. Monochrome Zen (refined in 010); collapses 5-theme system to light+dark | ui, look-and-feel, palette, typography, theme, aesthetic, comparison |
| 010 | mono-zen-light-dark | comparison | Tightened Monochrome Zen as the full v1.6 visual system — paired light + dark cool-slate palette, 5 screens (Learn / App Settings / Idle / Running / Complete), 3 practices with per-practice feedback shapes, V1 grid SetupCard, V1 orb-halo + V2 minimal shape variants behind a dev toggle, no-jiggle layout, desktop validation, V3 inline-card install banner | VALIDATED — full visual system locked; see Requirements above for the carry-forward list | ui, look-and-feel, theme, mono-zen, controls, layout, install, desktop, comparison |
| 011 | ring-progress-cue | comparison | A south-anchored bidirectional progress arc (grows from south to north during inhale, retracts during exhale) reads as one continuous calm motion and preserves the "pace by sight" affordance — credible companion to the production outer + inner cue | VALIDATED — ships behind dev toggle `?ringCue=progress-arc` (Phase 45); production default `outer-inner` unchanged | ui, orb, ring, pacing-cue, breathing-visual, comparison |
| 012 | spiritual-eye-orb | comparison | Reinterpret the production orb with kutastha layered iconography (gold ring + blue field + white 5-point star) while staying inside the locked Mono Zen cool-slate system — at least one of 5 variants reads as spiritual-eye AND as calm Mono Zen | VALIDATED — winner V5 Halo Flame: warm-cool halo gradient + opalescent indigo disc (radial gradient) + small white 5-point star (20% of disc); production geometry/ring-cue/motion unchanged; locked tokens in spike README | ui, orb, kutastha, spiritual-eye, kriya-yoga, breathing-visual, comparison |
