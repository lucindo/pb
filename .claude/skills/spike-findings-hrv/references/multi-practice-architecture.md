# Multi-Practice Architecture

How to host more than one Forrest Knutson practice (Resonant Breathing + Navi Kriya, and
potentially more) inside the single HRV WebApp, and how the user moves between them.

## Requirements

Non-negotiable — every implementation of this feature area must honor these:

- **Per-practice state vs. shared chrome split.** Session settings (bpm, ratio, duration,
  mode, and any practice-specific knobs) are *per-practice*. Theme, timbre, visual
  variant, cue style, and locale are *app-wide chrome*. This mirrors the existing split
  in `src/domain/settings.ts`.
- **Navigation and an active session are mutually exclusive.** Switching practices is
  disabled while a session is in progress — the user must end the session first. There
  is no background or multi-practice session state: one practice active, one session
  possible.
- **The practice switcher is a top segmented control** — a compact pill toggle above the
  orb, disabled during a session. Comfortable for ~3–4 practices.
- **One shared chrome-settings screen** (theme, language, visual variant, cue style)
  serves all practices. Practice controls stay per-practice and are NOT unified into it.
- It is **one app**, not a separate sibling app per practice.

## How to Build It

### 1. Introduce a `practice` concept above the existing `mode`

The app already has an intra-practice `mode` (`standard` / `stretch` in
`src/domain/settings.ts`). A *practice* sits one level above that. Model it as a
discriminated union / id:

```ts
type PracticeId = 'resonant' | 'naviKriya'
```

Each practice owns its own session settings object and its own stats. Shape the app
state as:

```ts
interface AppState {
  // app-wide chrome (shared)
  chrome: { theme: ThemeId; locale: LocaleId; timbre: TimbreId;
            variant: VisualVariantId; cue: CueStyleId }
  // per-practice
  practices: Record<PracticeId, { settings: PracticeSettings; stats: PracticeStats }>
  activePractice: PracticeId
  session: SessionState | null   // at most one, belongs to activePractice
}
```

Persist this in the existing prefs envelope (`src/storage/prefs.ts`). Adding the
`practices` map and `activePractice` is a `STATE_VERSION` migration — coerce a pre-existing
single-practice envelope into `practices.resonant`.

### 2. Practice switcher — top segmented control

A pill toggle rendered *above* the orb, not a bottom tab bar. Disabled while a session
runs. Working pattern from spike 002 (`sources/002-switcher-ux/index.html`):

```jsx
<div className="flex rounded-full bg-slate-200 p-1">
  {practices.map((p) => (
    <button
      key={p.id}
      disabled={sessionRunning}
      className={active === p.id ? 'bg-white shadow text-indigo-500' : 'opacity-60'}
      onClick={() => setActive(p.id)}
    >
      {p.name}
    </button>
  ))}
</div>
```

Lock rule: when `session !== null`, every switcher control is `disabled`. The same rule
applies to any "back to home"-style affordance if the layout ever changes.

### 3. Split `SettingsDialog`

The current `src/components/SettingsDialog.tsx` mixes app-wide chrome (theme, language,
variant, cue) with per-practice controls (bpm, ratio, mode…). Separate them:

- **Chrome settings** — one shared screen, unchanged across practices.
- **Practice controls** — rendered per active practice (Resonant shows bpm/ratio/
  duration/mode; Navi Kriya shows its own knobs — see `navi-kriya-practice.md`).

### 4. Learn screen

Shared sections (Who is Forrest, Forrest Resources) + per-practice sections (videos,
practice description). Content architecture only — extend `src/content/learnContent.ts`
with a per-practice partition over the shared base. Not a feasibility risk.

## What to Avoid

- **Do not keep sessions running across practice switches.** An early spike-001 design
  left a session alive in the background when you switched tabs — it created an "is my
  session still alive?" ambiguity. Locking navigation during a session is simpler in
  both architecture and UX. Rejected.
- **Do not use a bottom tab bar.** Spike 002 compared it head-to-head: permanent bottom
  chrome competes visually with the calm orb and implies frequent switching the app does
  not want. Rejected in favor of the top segmented control.
- **Do not use a launch/home screen** as the switcher either — it adds a choose→enter tap
  before every practice. Rejected.
- **Do not unify the practice control sets.** The practices' knobs genuinely differ;
  only the *chrome* settings screen is shared.

## Constraints

- The top segmented control holds comfortably for **~3–4 practices**. If the practice
  catalog grows past that, the switcher must be revisited.
- Adding the `practices` map to the prefs envelope requires a `STATE_VERSION` bump and a
  migration coercer for existing single-practice users.

## Origin

Synthesized from spikes: 001 (multi-practice-shell), 002 (switcher-ux).
Source files available in: sources/001-multi-practice-shell/, sources/002-switcher-ux/.
