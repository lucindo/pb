# HRV Breathing

A calm, browser-based breathing timer for slow paced (resonance / HRV) breathing practice. No accounts, no tracking, no medical claims — open a tab, pick a rate, and breathe.

This app is **inspired by Forrest Knutson's teachings** on Heart Rate Variability and slow breathing. It is **independent and unaffiliated** with Forrest — see the Learn modal in-app for the full link set to his original material.

---

## About HRV / Resonance Breathing

**Heart Rate Variability (HRV)** is the natural variation in the time between consecutive heartbeats. It reflects the moment-to-moment dialogue between the sympathetic and parasympathetic branches of the autonomic nervous system, and is often used as a proxy for vagal tone, recovery, and the body's overall stress / calm balance.

**Slow paced breathing** (sometimes called **resonance breathing** or **coherence breathing**) is the practice of deliberately breathing slower than the spontaneous rate — typically **under 7 breaths per minute** — so that the heart rate fluctuation begins to synchronize with the breath cycle. At each person's individual resonance rate the cardiovascular and respiratory systems reach a maximum-amplitude, in-phase oscillation. The subjective experience is a settling of attention and a calm, even-breath quality.

The app's defaults reflect the practice's three working rules:

- **fewer than 7 breaths per minute** — the slow-pace floor
- **no pauses between inhale and exhale** — one continuous wave
- **exhale longer than (or equal to) inhale** — for asymmetric ratios the exhale carries the longer side

A breathing session in the app is just a clean, accurate clock that respects those rules and gets out of the way. The on-screen visual guide and the optional bowl-like tones mark where you are in each breath; the timing itself does the work.

> The information here is informational. The app is **guided breathing practice, not medical advice** — it does not diagnose, treat, or claim to improve any clinical condition. If you have a cardiopulmonary or autonomic-nervous-system condition, talk to a clinician before starting any new breathing practice.

---

## About Forrest Knutson

Forrest Knutson is a Kriya Yoga teacher, meditation instructor, author, and online educator best known for simplifying ancient yogic and contemplative practices for modern audiences. Through his videos and writing he covers breathwork, meditation, nervous system regulation, and spiritual development — combining practical instruction with clear, science-informed explanations that make complex spiritual concepts more accessible.

The slow paced-breathing protocol this app encodes is shaped by Forrest's HRV-focused teaching.

### Links

- **YouTube channel** — [youtube.com/@ForrestKnutson](https://www.youtube.com/@ForrestKnutson)
- **Website / Trainings** — [meditativemellows.com](https://www.meditativemellows.com/)
- **Book — _Mastering Meditation_** — [amzn.to/3RTAVqi](https://amzn.to/3RTAVqi)
- **Patreon** — [patreon.com/forrestknutson](https://www.patreon.com/forrestknutson)

### Selected videos

- [The Holy Trinity of Breath Induces HRV Resonance](https://www.youtube.com/watch?v=89WorFpMyY0) — a good entry point.
- [The Meditation Magic of Sitting Very Still — SVS](https://www.youtube.com/watch?v=6NpH44c34do)
- [4 Proofs of Meditation](https://www.youtube.com/watch?v=Kn_tQYaUO4M)
- [Beginners Deep Meditation — Naturally — Clinical Mindfulness Technique](https://www.youtube.com/watch?v=gEc6RLixpVs)

Forrest is the source of inspiration for the practice; this app is **not affiliated with him**. The Amazon book link is the same link Forrest uses in his own video descriptions — the app does not earn affiliate revenue from clicks.

---

## Features

### Three breathing practices

A pill switcher at the top of the page moves between three practices; each keeps its own settings and its own stats.

- **HRV** — the core resonance-breathing timer. Configurable BPM (1 – 7), inhale/exhale ratio (50:50, 40:60, 30:70, 20:80), and duration (5 – 60 minutes or open-ended).
- **Stretch** — a guided BPM ramp: it opens with a Warm-up at an easier pace, ramps gradually toward a slower target BPM, and closes with a Settle, so the slowdown is gentle rather than abrupt. The Warm-up, ramp, and Settle durations are each configurable.
- **Navi Kriya** — an OM-counting practice run in rounds, with a configurable front-OM count, OM pace, and an optional per-OM tick. The guide tracks the live count through each round's Front and Back phases rather than a breath clock.

### Everything else

- A single calm visual guide with three interchangeable variants — Orb, Square, and Diamond — each with a synchronized In / Out label.
- Five named color palettes (theme switching) so the visual guide matches your preferred calm tone.
- EN / PT-BR language switching — the full interface, including the Learn explainer, is available in English and Brazilian Portuguese.
- Optional generated audio cues — soft bowl-like tones at each phase boundary (mutable), with four selectable timbres.
- 3-2-1 audible + visual lead-in before the timing clock starts.
- Installable as a Progressive Web App — the production build registers a service worker that caches assets for offline use and auto-updates on revisit. On phones, an inline install banner offers add-to-home-screen, with step-by-step instructions on iOS.
- Local-only practice stats (sessions completed, total time) — stored in browser localStorage; never sent anywhere.
- Hands-off resilience — Wake Lock keeps the screen on while a session runs (where supported); the visual guide / tones / clock re-anchor cleanly after suspend / resume / mute / unmute on mobile.
- Calm, claim-safe in-app explainer modal (`Learn` corner anchor → modal with explanation + Forrest links + disclaimers).
- Honors `prefers-reduced-motion` — the visual guide swaps from a breathing scale animation to a fixed mid-scale gradient crossfade.
- Responsive: pocket-sized on mobile, fits comfortably on tablet and desktop without zoom.

### Known Limitations

**iOS < 18.4 standalone-mode Wake Lock.** When the app is installed to the iOS Home Screen (standalone PWA mode), the Screen Wake Lock API is unavailable on iOS before version 18.4 due to [WebKit bug 254545](https://bugs.webkit.org/show_bug.cgi?id=254545) — the screen may dim during a session on those devices. iOS 18.4 and later, and Safari browser tabs on iOS 16.4 and later, are unaffected. Wake Lock is treated as a progressive enhancement throughout the app; a session runs correctly regardless of whether the screen stays on.

---

## Tech

- React 19 + TypeScript, built with Vite.
- Tailwind CSS v4 via `@tailwindcss/vite`.
- Vitest + Testing Library for unit + behavior tests (1255 tests across the codebase).
- ESLint (TypeScript + React Hooks + React Refresh rule packs).
- Web APIs: `<dialog>` (top-layer modals), `AudioContext` (generated cues), Page Visibility / Wake Lock (resume / screen-on), `localStorage` (settings + stats).
- Installable PWA via `vite-plugin-pwa` (Workbox `generateSW`, auto-update) — offline-capable once cached.
- No backend, no telemetry, no analytics, no third-party scripts.

---

## Getting Started

```bash
# install
npm install

# run dev server (Vite)
npm run dev

# run the full test suite
npm test            # watch mode
npm run test:run    # single pass

# lint
npm run lint

# production build
npm run build

# preview the production build locally
npm run preview
```

Open the URL Vite prints (typically `http://localhost:5173`) and the app is ready — no accounts, no setup beyond `npm install`.

The one environment variable is optional and build-time only: `VITE_SWITCHER_TREATMENT` controls the practice switcher's appearance. It defaults to `B` (each pill shows a small glyph beside its label); set `VITE_SWITCHER_TREATMENT=A` before `npm run build` for text-only pills.

---

## Project Structure

```
src/
  app/            React entry — App.tsx wires the page and owns
                  practice / session state
  components/     PracticeToggle (the practice switcher); the breathing
                  visual-guide variants (Orb / Square / Diamond) plus the
                  Navi Kriya guide (NKShape); SessionReadout /
                  NKSessionReadout, SessionControls, SettingsForm,
                  SettingsDialog, StatsFooter, the End / Reset dialogs,
                  LearnAnchor / LearnDialog, InstallBanner / IosInstallSteps,
                  and the Theme / Variant / Cue / Timbre / Language pickers
  content/        learnContent + strings — typed copy, Forrest link
                  record, and EN / PT-BR interface strings
  domain/         breathingPlan, sessionMath, sessionController, settings,
                  stretchRamp (Stretch ramp), naviKriyaSettings — pure
                  functions
  hooks/          useSessionEngine + useNKEngine (the two session engines),
                  useAudioCues, useWakeLock, useTheme, useVisualVariant,
                  useLocale, the PWA-install hooks, and the matching
                  choice hooks
  audio/          audioEngine + cueSynth + nkCueSynth + timbres — Web
                  Audio API layer
  storage/        localStorage wrappers — per-practice settings + stats,
                  prefs, and install-banner dismissal
  styles/         theme palettes + favicon palette sync
.planning/        Planning artifacts (specs, phases, ROADMAP) — see
                  PROJECT.md if you want to dive into the design history
```

---

## Privacy

- No accounts. No sign-up. No tracking pixels or analytics.
- Settings and session stats live in your browser's `localStorage` and never leave the device.
- The Learn modal opens external links (YouTube, Patreon, Amazon, Forrest's site) in new tabs with `target="_blank" rel="noopener noreferrer"` — clicking a link in your browser is the same as any other outbound link.

---

## License

This project is licensed under the **MIT License** — see the [`LICENSE`](LICENSE) file at the repository root for the full text.

As a courtesy — not a license term — if you adapt or build on this app, please continue to credit Forrest Knutson as the source of the breathing practice and keep the "guided breathing practice, not medical advice" framing intact. References to Forrest Knutson and Resonant Breathing here are attribution and inspiration only; his name, content, and apps remain his.
