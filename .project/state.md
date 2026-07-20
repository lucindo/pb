# now
Pattern-breathing is feature-complete and shipped on both web and desktop; nothing in flight.

# next
No required action — new work starts from a fresh spec.

# settled
- No backend, telemetry, analytics, or third-party scripts — settings and stats stay in localStorage on-device.
- Not medical advice — no diagnostic or clinical claims in any copy.
- The locked medical-advice and affiliation lines are byte-frozen — editing them fails `lockedCopy.test.ts`.
- One configurable engine with presets as data — do not reintroduce per-practice types, factories, or a switcher.
- Single session engine (`useSessionEngine`, rAF lookahead) — do not add a second engine.
- Production src carries no `any`; strict, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` stay on.
- Validation is per-field at the storage boundary — no migration ladder, no validation deep in the app.
- `multiplier` is the internal name; "Scale" is only the user-facing label.
- `multiplier` is integer-only; bounds are inhale/exhale [1,60], holds [0,300], multiplier [1,15], rounds [1,99] or 'open-ended'.
- Applying a preset sets only the five pattern fields — `rounds` is left untouched.
- Stats stay time-based — do not record rounds-completed.
- No preset-authoring UI and no saved presets — "Custom" is derived live, never persisted.
- Settings is one page — no Advanced page, no Stats page, no feature-flag or query-string machinery.
- Keep both view-model factories and the two separate modal class strings — both were reviewed and deliberately left.
- `OPEN_ENDED_GLYPH` in `strings.ts` is the only source of the infinity glyph.
- Wake Lock is progressive enhancement — sessions must run correctly when it is unavailable.
- `prefers-reduced-motion` suppresses motion outright (arc and hold fill do not render) — do not substitute an animation.
- The three `HOLD_*` knobs in `cueSynth.ts` are signed off by ear — do not re-tune without a listening check.
- Desktop installers ship only when the Pake shell changes; web content auto-updates to installed clients.
- Web release: minor = bump `package.json`, append to `versions.json`, tag `vX.Y`; patch = bump patch and force-move the existing tag.
- Every change gates on `tsc -b`, `npm run lint`, and `npm run test:run`.

# hazards
- `index.html`: the FOUC pre-paint script hardcodes the state key and `prefs.theme` path — changing `storage.ts`'s key or shape without it causes a theme flash.
- `index.html`: the `maximum-scale=1, user-scalable=no` viewport lock IS honored on iOS here — "fixing" it on the assumption iOS ignores it re-breaks the ring framing.
- `src/audio/audioEngine.ts`: AudioContext construction must stay inline — an awaited helper adds a microtask hop that breaks fake-timer lead-in tests.
- `src/audio/audioEngine.ts`: the error guard is duck-typed on `.name`, not `instanceof DOMException` — a real DOMException is not `instanceof Error` in browsers.
- `src/audio/`: the dependency runs boundaryCueSynth → cueSynth only — importing the other way creates a cycle.
- `src/domain/`: domain is pure with zero upward imports — importing from app, hooks, or storage breaks the layering.
- `src/storage/storage.ts`: the cross-tab downgrade guard refuses to overwrite a future-version envelope — dropping it lets an old tab clobber newer state.
- `src/components/PatternBreathingSettingsForm.tsx`: `lastFiniteRounds` must be updated in `onRoundsChange`, never during render — `react-hooks/refs` forbids it.
- `public/pwa-512x512.png`: must stay RGBA — Tauri's Linux build hard-fails on RGB.
- `src/styles/faviconPalette.ts`, `index.html`, `public/favicon.svg`: favicon hexes must match or `favicon.sync.test.ts` fails.
- `.github/workflows/deploy.yml`: the tag's short form must equal `package.json`'s first two segments — the version gate exits 1 on mismatch.
- `.github/workflows/deploy.yml`: deploy fires only on `vX.Y` tag pushes — branch and PR pushes run no CI at all.
- `versions.json`: `official` selects the ref rebuilt at the site root — editing it changes what `/pb/` serves.
- GitHub repo settings: the Pages source and the `github-pages` env `v*` tag policy live only on GitHub, not in source — recreating either silently breaks deploys.
- `.project/PROJECT.md`, `PLAN.md`, `SPEC.md`, `DECISIONS.md`: carry unverified drift — trust the code over them.
