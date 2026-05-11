# Phase 7: Strict Type & Lint Baseline — Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 3 config files modified + 7 fix categories (inline, no new files)
**Analogs found:** all categories have exact in-codebase analog or are self-referential

---

## File Classification

| Modified File / Fix Category | Role | Data Flow | Closest Analog | Match Quality |
|------------------------------|------|-----------|----------------|---------------|
| `tsconfig.app.json` | config | — | self (current shape below) | self-reference |
| `tsconfig.node.json` | config | — | self (current shape below) | self-reference |
| `eslint.config.js` | config | — | self (current shape below) | self-reference |
| Fix: `mock.calls[N]` narrowing in test files | test | — | `src/audio/cueSynth.test.ts:70` (already uses `?.`) | exact |
| Fix: `unbound-method` on interface methods | component/hook | — | `src/components/SettingsStepper.tsx` (prop interface) | exact |
| Fix: `no-confusing-void-expression` | component | — | `src/components/SettingsStepper.tsx:47,62` | exact |
| Fix: `no-misused-promises` in JSX props | component | — | `src/app/App.tsx:305` (`void audioStop()` in callback) | role-match |
| Fix: `restrict-template-expressions` | utility/component | — | `src/storage/format.ts:33` (already uses `.toFixed`) | exact |
| Fix: `// Reason:` annotations on surviving disables | app | — | `src/app/App.tsx:205,390` (current shape) | self-reference |
| Fix: `no-unsafe-member-access` on `JSON.parse` in tests | test | — | `src/storage/storage.ts:66` (cast to `Record<string,unknown>`) | exact |
| Fix: `require-await` on FakeAudioContext methods | test utility | — | `vitest.setup.ts:187-206` (current shape) | self-reference |

---

## Pattern Assignments

### `tsconfig.app.json` — Config Modification

**Current content** (lines 1–25, full file):

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

**Insertion point:** Add three keys at the END of the `/* Linting */` block, AFTER the existing `noFallthroughCasesInSwitch` line (D-10: preserve that flag). Surgical edit — do NOT rewrite the file.

**Post-edit shape for the `/* Linting */` block:**

```json
    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
```

**Nothing else changes.** `include: ["src"]` already covers test files (D-03 — no test tsconfig split).

---

### `tsconfig.node.json` — Config Modification

**Current content** (lines 1–24, full file):

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "esnext",
    "types": ["node"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

**Insertion point:** Identical pattern to `tsconfig.app.json` — append after `noFallthroughCasesInSwitch`. Note: `tsconfig.node.json` does NOT have `jsx` (not needed for `vite.config.ts`).

**Post-edit shape for the `/* Linting */` block:**

```json
    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
```

---

### `eslint.config.js` — Config Modification

**Current content** (lines 1–26, full file):

```javascript
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
)
```

**Three changes (all surgical):**

1. **Line 10:** Replace `...tseslint.configs.recommended` with `...tseslint.configs.strictTypeChecked`
   - `strictTypeChecked` is a superset of `recommended` — this is a one-line swap, not a structural change.

2. **Lines 13–15** (the `languageOptions` block): Add `parserOptions` block after `globals`:
   ```javascript
   languageOptions: {
     ecmaVersion: 2020,
     globals: globals.browser,
     parserOptions: {
       projectService: true,
       tsconfigRootDir: import.meta.dirname,
     },
   },
   ```
   `import.meta.dirname` resolves to the repo root (where `eslint.config.js` lives). `projectService: true` auto-discovers `tsconfig.json` and resolves composite references to `tsconfig.app.json` and `tsconfig.node.json`. No explicit `project: [...]` array needed.

3. **Lines 22 (the `rules` block):** Add `exhaustive-deps: 'error'` override after the spread:
   ```javascript
   rules: {
     ...reactHooks.configs.recommended.rules,
     'react-hooks/exhaustive-deps': 'error',   // BUILD-03: upgrade from 'warn'
     'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
   },
   ```

**Post-edit full file shape:**

```javascript
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
)
```

**Per-file overrides:** None needed. `eslint.config.js` is a `.js` file and is not matched by `**/*.{ts,tsx}`. `vite.config.ts` is resolved automatically via `tsconfig.node.json` through `projectService`. No `ignores` or `files` override blocks required beyond the existing `{ ignores: ['dist'] }`.

**Config spread ordering:** `...tseslint.configs.strictTypeChecked` spreads BEFORE the custom block. ESLint flat-config processes array entries in order; later entries win. This means the custom `rules` block (including the `exhaustive-deps: 'error'` override) correctly overrides any `strictTypeChecked` defaults (Pitfall 6 — ordering matters).

---

## Fix Category Pattern Assignments

### Fix Category 1: `mock.calls[N]` Narrowing in Test Files (BUILD-01, 12 errors)

**Affected files:**
- `src/app/App.audio.test.tsx` (2 errors — `mock.calls[0]`)
- `src/app/App.wakeLock.test.tsx` (4 errors — `mock.results[0].value`)
- `src/audio/cueSynth.test.ts` (4 errors — `oscillators[0]`, `filters[0]`, `mock.calls[0]`)
- `src/hooks/useAudioCues.test.tsx` (2 errors — `mock.calls[0][0]`)

**Error code:** TS2532 — Object is possibly 'undefined' (from `noUncheckedIndexedAccess`)

**Current broken pattern — `src/app/App.wakeLock.test.tsx:64`:**
```typescript
const sentinel = await requestSpy.mock.results[0].value as WakeLockSentinel
```

**Current broken pattern — `src/hooks/useAudioCues.test.tsx:647`:**
```typescript
expect(typeof reanchorSpy.mock.calls[0][0]).toBe('number')
```

**Current broken pattern — `src/audio/cueSynth.test.ts:117`:**
```typescript
expect(oscillators[0].type).toBe('square')
```

**Analog — already-correct pattern in `src/audio/cueSynth.test.ts:70`** (already uses `?.`):
```typescript
const stopArg = stopMock.mock.calls[0]?.[0] as number
```

**Fix pattern — two options per D-07:**

Option A — Non-null assertion with `// Reason:` (for sites where length is already asserted by `toHaveBeenCalledTimes` or array construction):
```typescript
// Reason: length asserted by expect(...).toHaveBeenCalledTimes(1) immediately above.
const sentinel = await requestSpy.mock.results[0]!.value as WakeLockSentinel

// Reason: oscillators array is populated by FakeAudioContext constructor; length is test-invariant.
expect(oscillators[0]!.type).toBe('square')
```

Option B — Use `.at(0)` with narrowing (for chained access):
```typescript
const call = reanchorSpy.mock.calls.at(0)
expect(call).toBeDefined()
expect(typeof call![0]).toBe('number')
```

Option C — Optional chaining `?.` (already in use at `cueSynth.test.ts:70`):
```typescript
const stopArg = stopMock.mock.calls[0]?.[0] as number
```

**Prefer option C (`?.`) for single-level access, option A (non-null with `// Reason:`) when a `toHaveBeenCalledTimes` assertion already guarantees the slot exists.**

---

### Fix Category 2: `unbound-method` on Interface Method Declarations (BUILD-02, 24 errors)

**Affected files:** `App.tsx` (8), `SessionControls.tsx` (3), `EndSessionDialog.tsx` (2), `ResetStatsDialog.tsx` (2), `SettingsForm.tsx` (2), `SettingsStepper.tsx` (1), `LearnAnchor.tsx` (1), `LearnDialog.tsx` (1), `MuteToggle.tsx` (1), `StatsFooter.tsx` (1), plus hook interfaces `UseAudioCues` (3), `UseWakeLock` (2)

**Current broken pattern — `src/components/SessionControls.tsx:6-7`:**
```typescript
export interface SessionControlsProps {
  // ...
  onStart(): void
  onEnd(): void
```

**Current broken pattern — `src/hooks/useWakeLock.ts:24,27`:**
```typescript
export interface UseWakeLock {
  request(): Promise<void>
  release(): Promise<void>
}
```

**Current broken pattern — `src/hooks/useAudioCues.ts:51,53,55`:**
```typescript
  start(plan: BreathingPlan): Promise<number | null>
  stop(): Promise<void>
  setMuted(muted: boolean): void
```

**Fix pattern — add `this: void` to every method signature in every affected interface:**
```typescript
// In SessionControlsProps:
  onStart(this: void): void
  onEnd(this: void): void

// In UseWakeLock:
  request(this: void): Promise<void>
  release(this: void): Promise<void>

// In UseAudioCues:
  start(this: void, plan: BreathingPlan): Promise<number | null>
  stop(this: void): Promise<void>
  setMuted(this: void, muted: boolean): void
```

**Apply the same `this: void` fix to ALL prop interface method declarations:**
- `EndSessionDialogProps.onConfirm(this: void): void` and `onCancel(this: void): void` (`src/components/EndSessionDialog.tsx:5-6`)
- `ResetStatsDialogProps.onConfirm(this: void): void` and `onCancel(this: void): void` (`src/components/ResetStatsDialog.tsx:5-6`)
- `SettingsFormProps.onChange(this: void, settings: SessionSettings): void` and `onExtendDuration(this: void, durationMinutes: number): void` (`src/components/SettingsForm.tsx:14-15`)
- `SettingsStepperProps.onChange(this: void, value: T): void` (`src/components/SettingsStepper.tsx:6`)
- `LearnAnchorProps.onClick(this: void): void` (`src/components/LearnAnchor.tsx:14`)
- `LearnDialogProps.onClose(this: void): void` (`src/components/LearnDialog.tsx:16`)
- `MuteToggleProps.onToggle(this: void): void` (`src/components/MuteToggle.tsx:17`)
- `StatsFooterProps.onResetClick(this: void): void` (`src/components/StatsFooter.tsx:23`)

**No implementation changes** — only interface declarations change. Arrow-function `useCallback` implementations already do not have `this` binding issues.

---

### Fix Category 3: `no-confusing-void-expression` — Arrow Shorthand (BUILD-02, 6 errors)

**Affected files:** `src/components/SettingsStepper.tsx` (2), `src/app/App.tsx` (2), `src/components/SettingsForm.tsx` (2)

**Current broken pattern — `src/components/SettingsStepper.tsx:47,62`:**
```typescript
onClick={() => changeBy(-1)}
onClick={() => changeBy(1)}
```

**Fix pattern — add braces:**
```typescript
onClick={() => { changeBy(-1) }}
onClick={() => { changeBy(1) }}
```

**For App.tsx void-returning async calls** (the 2 occurrences are inside callback wrappers, not JSX directly — verify with actual ESLint output; if they fire, apply same brace pattern):
```typescript
// BEFORE:
onClick={() => clearLeadInTimeouts()}

// AFTER:
onClick={() => { clearLeadInTimeouts() }}
```

**For SettingsForm.tsx `onChange` shorthands** (`src/components/SettingsForm.tsx:60,66`):
```typescript
// BEFORE:
onChange={(bpm) => updateSettings({ bpm })}

// AFTER:
onChange={(bpm) => { updateSettings({ bpm }) }}
```

---

### Fix Category 4: `no-misused-promises` in JSX Prop Callbacks (BUILD-02, 2 errors)

**Affected file:** `src/app/App.tsx`

**Root cause:** `onStartClick` is `async () => Promise<void>`, but `SessionControlsProps.onStart` is typed as `() => void`. Passing an async function to a `void`-return prop fires `no-misused-promises`.

**Current broken pattern — `src/app/App.tsx:523`:**
```typescript
onStart={onStartClick}
```

**Fix pattern (D-08 — option A, no interface change):** Wrap in JSX void expression:
```typescript
onStart={() => { void onStartClick() }}
```

This is behavior-preserving. The async call still fires; the void wrapper marks it fire-and-forget without changing the interface type. Apply to BOTH `no-misused-promises` sites in `App.tsx`.

**Analog — already in use at `src/app/App.tsx:234`:**
```typescript
void audioStop()
void wakeLockRelease()
```

---

### Fix Category 5: `restrict-template-expressions` — Numbers in Template Literals (BUILD-02, 16 errors)

**Affected files:** `src/components/BreathingShape.tsx` (7), `src/storage/format.ts` (3), `src/components/SettingsForm.tsx` (2), `src/domain/settings.ts` (2), `src/app/App.tsx` (1), `src/domain/sessionMath.ts` (1)

**Current broken patterns:**

`src/components/BreathingShape.tsx:104` (CSS transform):
```typescript
transform: `translate3d(0,0,0) scale(${orbScale})`,
```

`src/components/BreathingShape.tsx:131,132,196,211` (CSS percent dimensions):
```typescript
width: `${MIN_SCALE * 100}%`,
height: `${MIN_SCALE * 100}%`,
```

`src/storage/format.ts:32,38,52` (already partly fixed — these use backticks):
```typescript
return `${minutes} min`
return `${count} sessions`
return `${Math.floor(durationSeconds / 60)} min`
```

`src/domain/sessionMath.ts:48`:
```typescript
return `${minutes}:${seconds.toString().padStart(2, '0')}`
```

`src/domain/settings.ts:52,60` (error messages):
```typescript
throw new RangeError(`Unsupported BPM: ${settings.bpm}`)
throw new RangeError(`Unsupported duration: ${settings.durationMinutes}`)
```

`src/app/App.tsx:440`:
```typescript
const key = `${frame.cycleIndex}:${frame.phase}`
```

**Fix patterns:**

For CSS transform/scale values (precision matters — use `.toFixed()`):
```typescript
// BEFORE:
transform: `translate3d(0,0,0) scale(${orbScale})`,
width: `${MIN_SCALE * 100}%`,

// AFTER:
transform: `translate3d(0,0,0) scale(${orbScale.toFixed(4)})`,
width: `${(MIN_SCALE * 100).toFixed(2)}%`,
```

**Analog already in codebase — `src/storage/format.ts:33`** (existing `.toFixed` usage):
```typescript
return `${hours.toFixed(1)} hours`
```

For simple integer/string cases (use `String(n)`):
```typescript
// BEFORE:
return `${minutes} min`
return `${count} sessions`

// AFTER:
return `${String(minutes)} min`
return `${String(count)} sessions`
```

For `sessionMath.ts:48` (`minutes` is already a number from `Math.floor`):
```typescript
// BEFORE:
return `${minutes}:${seconds.toString().padStart(2, '0')}`

// AFTER:
return `${String(minutes)}:${seconds.toString().padStart(2, '0')}`
```

For `settings.ts` error messages and `App.tsx` key (`frame.phase` is a string, `frame.cycleIndex` is number):
```typescript
// settings.ts:
throw new RangeError(`Unsupported BPM: ${String(settings.bpm)}`)
// or for DurationOption (number | 'open-ended'):
throw new RangeError(`Unsupported duration: ${String(settings.durationMinutes)}`)

// App.tsx (frame.phase is already BreathPhase string literal, only cycleIndex is number):
const key = `${String(frame.cycleIndex)}:${frame.phase}`
```

---

### Fix Category 6: `// Reason:` Annotations on Surviving `eslint-disable` Comments (BUILD-03)

**Policy (D-04):** Every surviving `// eslint-disable-next-line react-hooks/*` comment must be preceded by a `// Reason: …` line on the IMMEDIATELY preceding line.

#### App.tsx:205 — KEEP with annotation

**Current shape (lines 203–208):**
```typescript
  useEffect(() => {
    if (state.status !== 'running' && endDialogOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEndDialogOpen(false)
    }
  }, [state.status, endDialogOpen])
```

**Post-edit shape:**
```typescript
  useEffect(() => {
    if (state.status !== 'running' && endDialogOpen) {
      // Reason: subscribe-and-reflect — endDialogOpen mirrors external session.status; setting local state from this trigger effect is the documented React pattern for "subscribe + reflect".
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEndDialogOpen(false)
    }
  }, [state.status, endDialogOpen])
```

#### App.tsx:390 — KEEP with annotation

**Current shape (lines 388–392):**
```typescript
      void audioStop()
      void wakeLockRelease() // Phase 5 D-07: single-write release site (D-08 idempotent)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAppPhase('idle')
      clearLeadInTimeouts()
```

**Post-edit shape:**
```typescript
      void audioStop()
      void wakeLockRelease() // Phase 5 D-07: single-write release site (D-08 idempotent)
      // Reason: subscribe-and-reflect — appPhase resets to 'idle' when session leaves running; this effect is the single write site per D-16 Phase 4 invariant.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAppPhase('idle')
      clearLeadInTimeouts()
```

#### App.tsx:411 — REMOVE (stale disable)

**Current shape (lines 409–413):**
```typescript
        const updated = recordSession(elapsedMs, isComplete)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStats(updated)
        recordedSessionKeyRef.current = snap.key
```

**Post-edit shape (remove the disable entirely):**
```typescript
        const updated = recordSession(elapsedMs, isComplete)
        setStats(updated)
        recordedSessionKeyRef.current = snap.key
```

The stale disable at line 411 is flagged as unused by ESLint 10 with `react-hooks/set-state-in-effect` in v7.1.1 — the `setStats(updated)` call inside the conditional branch does not fire the rule. Remove the comment; no annotation needed.

#### `usePrefersReducedMotion.ts` — new `set-state-in-effect` error at line 22

This is NOT currently suppressed but fires under react-hooks v7.1.1. Add a disable with annotation at line 21 (D-08: smallest behavior-preserving fix).

**Current shape (lines 13–22):**
```typescript
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }
    const mql = window.matchMedia(QUERY)
    // IN-02: re-seed from the live MediaQueryList in case the OS preference
    // changed between the initial render commit and this mount-effect (rare,
    // but the canonical pattern from MDN and the only way to defeat the stale
    // initial-state window for hooks that do not subscribe synchronously).
    setReduced(mql.matches)
```

**Post-edit shape for the `setReduced` call:**
```typescript
    // IN-02: re-seed from the live MediaQueryList in case the OS preference
    // changed between the initial render commit and this mount-effect (rare,
    // but the canonical pattern from MDN and the only way to defeat the stale
    // initial-state window for hooks that do not subscribe synchronously).
    // Reason: re-seed from live MediaQueryList on mount to close the stale-initial-state window; subsequent updates come from the change listener (MDN canonical pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mql.matches)
```

Also address the `no-unnecessary-condition` at `usePrefersReducedMotion.ts:7,14`. Since this is a Vite SPA with no SSR, the `typeof window === 'undefined'` check is dead code per the type system. Two options per D-08:

Option A (recommended — remove the dead SSR guard since this is pure SPA):
```typescript
// Remove the typeof window checks entirely.
// The window.matchMedia guard on its own is sufficient (returns undefined if absent).
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (!window.matchMedia) return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    // ...
```

Option B (if SSR guard must be preserved for future flexibility):
```typescript
    // Reason: SSR/non-browser environment guard; window is always defined in this SPA but the check is retained for portability.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof window === 'undefined' || !window.matchMedia) {
```

**RESEARCH.md recommends Option A** (remove the dead checks) — this is a pure SPA.

---

### Fix Category 7: `no-unsafe-member-access` on `JSON.parse` Results in Tests (BUILD-02, ~53 errors)

**Affected files:** `src/app/App.persistence.test.tsx` (~37 `no-unsafe-member-access` + `no-unsafe-assignment`), `src/storage/settings.test.ts` (remainder), `src/storage/storage.test.ts` (2)

**Current broken pattern — `src/app/App.persistence.test.tsx:35-38`:**
```typescript
function readEnvelope() {
  const raw = window.localStorage.getItem(STATE_KEY)
  return raw ? JSON.parse(raw) : null
}
```

All downstream uses `env?.settings?.bpm`, `env?.stats?.totalSessions`, etc. fire `no-unsafe-member-access` because `JSON.parse` returns `any`.

**Analog — production code fix already in `src/storage/storage.ts:66`:**
```typescript
const p = parsed as Record<string, unknown>
return {
  version: STATE_VERSION,
  settings: p.settings,
  mute: p.mute,
  stats: p.stats,
}
```

**Fix pattern — type the return of `readEnvelope` in the test:**
```typescript
function readEnvelope(): Record<string, unknown> | null {
  const raw = window.localStorage.getItem(STATE_KEY)
  // Reason: test helper reads raw localStorage; shape validated by downstream test assertions.
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null
}
```

After this change, `env?.settings` has type `unknown`, so nested accesses (`env?.settings?.bpm`) will still fire `no-unsafe-member-access` because you cannot member-access `unknown`. The full fix requires narrowing each access:

```typescript
// Option 1 — cast the nested subtrees individually:
const settings = env?.settings as Record<string, unknown> | undefined
expect(settings?.bpm).toBe(5)

// Option 2 — use expect().toMatchObject() which does not require typed access:
expect(env).toMatchObject({ settings: { bpm: 5 } })
```

**Prefer option 2 (`toMatchObject`) where semantically equivalent** — it eliminates the unsafe access entirely and is already used in `src/storage/storage.test.ts:56`.

**Analog — `src/storage/storage.test.ts:56`** (already correct):
```typescript
expect(JSON.parse(raw!)).toMatchObject({ version: 1, settings: { bpm: 4 } })
```

---

### Fix Category 8: `require-await` on FakeAudioContext Methods (BUILD-02, ~14 errors in tests)

**Affected file:** `vitest.setup.ts` — `suspend` and `close` methods; `src/app/App.audio.test.tsx`, `src/audio/audioEngine.test.ts`, `src/hooks/useAudioCues.test.tsx` — async test helpers without `await`.

**Current broken pattern — `vitest.setup.ts:199-206`:**
```typescript
    suspend = vi.fn(async () => {
      this.state = 'suspended'
      this._fireStateChange()
    })
    close = vi.fn(async () => {
      this.state = 'closed'
      this._fireStateChange()
    })
```

These are `async` to match the real `AudioContext` API signature but contain no `await`. The `resume` method at line 187 does NOT fire `require-await` (it has conditional `throw` logic that makes it meaningful `async`).

**Fix pattern — add disable with annotation INSIDE the `vi.fn(...)` arrow, above the body:**
```typescript
    // Reason: async signature matches AudioContext.suspend() API contract; no real async work in the fake.
    // eslint-disable-next-line @typescript-eslint/require-await
    suspend = vi.fn(async () => {
      this.state = 'suspended'
      this._fireStateChange()
    })
    // Reason: async signature matches AudioContext.close() API contract; no real async work in the fake.
    // eslint-disable-next-line @typescript-eslint/require-await
    close = vi.fn(async () => {
      this.state = 'closed'
      this._fireStateChange()
    })
```

**For `require-await` in test helper functions in test files** (not in vitest.setup.ts), the fix is to either:
1. Remove the `async` keyword if there is no actual `await` usage and the return type does not need to be `Promise<void>`.
2. Add `// eslint-disable-next-line @typescript-eslint/require-await` with `// Reason: async declared to match real API signature for use with vi.spyOn / await in caller.`

---

### Fix Category 9: Remaining Isolated Fixes

#### `src/audio/audioEngine.ts` — `no-unnecessary-type-assertion` (3 errors)

**Current pattern (lines 125, 233, 241):**
```typescript
opts.onStateChange?.(audioCtx.state as AudioContextState | 'interrupted')
// ...
opts.onStateChange?.(audioCtx.state as AudioContextState | 'interrupted')
// ...
return audioCtx.state as AudioContextState | 'interrupted'
```

These fire `no-unnecessary-type-assertion` because `audioCtx.state` already satisfies `AudioContextState | 'interrupted'` (the TS DOM lib types `state` as `AudioContextState`; the cast widens it, which is not a no-op but may be flagged differently under TS 6).

**Fix pattern (D-08 — keep the cast, annotate):**
```typescript
// Reason: AudioContextState widened to include WebKit 'interrupted' extension (D-37); cast documents intent even if TS DOM lib does not require it.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
opts.onStateChange?.(audioCtx.state as AudioContextState | 'interrupted')
```

Apply the same pattern to all three occurrences.

**OR** — if the casts are truly no-ops under TS 6, remove them and rely on the `AudioContextState | 'interrupted'` return type annotation on the `get state()` getter to enforce the widened type.

#### `src/audio/audioEngine.ts` — `no-unnecessary-condition` (1 error, line 232)

**Current pattern:**
```typescript
opts.onStateChange?.(audioCtx.state as AudioContextState | 'interrupted')
```
inside a catch block. The `?.` optional chain fires because `onStateChange` is typed as optional (`onStateChange?: (state: ...) => void`) — but at this call site, the type system proves it's always defined. If that is the actual firing pattern, add explicit check or annotate.

**Fix:** If `onStateChange` is always defined at the call site, call directly: `opts.onStateChange(...)`. If it is genuinely optional at that site, the rule should not fire — this may be a false positive from `no-unnecessary-condition`; apply disable with `// Reason:` if confirmed.

#### `src/hooks/useAudioCues.ts:261` — `no-useless-assignment` (1 error)

**Current pattern (line 261):**
```typescript
let newEngine: AudioEngine | null = null
try {
  newEngine = await createAudioEngine({ onStateChange: handleStateChange })
} catch {
  // ...
  return
}
// newEngine is used here (guaranteed non-null after the try)
```

**Fix pattern (D-07 — no new helpers, just restructure):**
```typescript
let newEngine: AudioEngine
try {
  newEngine = await createAudioEngine({ onStateChange: handleStateChange })
} catch {
  if (oldEngine !== null) void oldEngine.close()
  setAudioStatus('unavailable')
  setAudioAvailable(false)
  return
}
// TypeScript now narrows newEngine to AudioEngine (definite assignment after try/catch with return in catch)
```

Or use `| undefined` instead of `| null` and rely on the `return` in `catch` to provide definite assignment:
```typescript
let newEngine: AudioEngine | undefined
```

#### `src/main.tsx:6` — `no-non-null-assertion` (1 error)

**Current pattern:**
```typescript
createRoot(document.getElementById('root')!).render(
```

**Fix pattern — add null check (D-07 style — inline, no helper):**
```typescript
const rootEl = document.getElementById('root')
if (rootEl === null) throw new Error('Root element #root not found in index.html')
createRoot(rootEl).render(
```

**OR — annotated non-null assertion (if D-07 inline narrowing is not desired for this boilerplate site):**
```typescript
// Reason: #root element is always present in index.html; absence is a build-time error not a runtime condition.
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(
```

#### `src/audio/cueSynth.ts:104` — `no-unnecessary-condition` (1 error)

**Current pattern (lines 102–104):**
```typescript
let stopAt: number
let cleanupAt: number
if (needsSustain && phaseDurationSec !== undefined) {
```

The rule fires because after `noUncheckedIndexedAccess`, TypeScript proves `phaseDurationSec !== undefined` is always true at that point in the branch (it already narrowed in the outer condition at line 88). Fix by removing the redundant check or restructuring:

```typescript
if (needsSustain) {
  // phaseDurationSec is non-undefined when needsSustain is true (guaranteed by caller contract)
  // Reason: phaseDurationSec is always defined when needsSustain is true per the outer condition at line 88.
  const dur = phaseDurationSec!
  const phaseEnd = when + dur
```

Or use optional chaining to eliminate the outer condition:
```typescript
if (needsSustain && phaseDurationSec != null) {
```

#### `src/components/SettingsStepper.tsx:28` — `no-unnecessary-condition` (1 error)

**Current pattern (lines 26–31):**
```typescript
  const changeBy = (offset: -1 | 1) => {
    const nextValue = options[selectedIndex + offset]
    if (nextValue !== undefined) {
      onChange(nextValue)
    }
  }
```

After `noUncheckedIndexedAccess`, `options[selectedIndex + offset]` returns `T | undefined`, but the rule says the check is "always truthy" — a contradiction that happens with generic arrays. Fix by using `.at()`:

```typescript
  const changeBy = (offset: -1 | 1) => {
    const nextValue = options.at(selectedIndex + offset)
    if (nextValue !== undefined) {
      onChange(nextValue)
    }
  }
```

`.at()` returns `T | undefined` unambiguously, making the undefined check valid to the linter.

#### `src/hooks/useAudioCues.ts:124` — `no-unnecessary-condition` (1 error)

Verify at lint time which exact line this fires on. The `state === 'interrupted'` check is inside a branch where TypeScript already knows the value. The D-08 fix is to add an annotated disable:

```typescript
// Reason: TypeScript narrows state here but the explicit check documents the WebKit-specific state machine (D-37).
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (state === 'interrupted') { ... }
```

---

## Shared Patterns

### `void` prefix for fire-and-forget async calls

**Source pattern already in use — `src/app/App.tsx:234,235`:**
```typescript
void audioStop()
void wakeLockRelease()
```

**Apply to:** All new `no-floating-promises` sites (if any surface beyond the known list), and the JSX `no-misused-promises` fix wrapping of `onStartClick`.

### `// Reason:` annotation format

**Format (one line before the disable):**
```typescript
// Reason: <one sentence naming the invariant being protected>.
// eslint-disable-next-line <rule-name>
<code that fires the rule>
```

**Apply to:** All surviving disable comments in `App.tsx`, `usePrefersReducedMotion.ts`, `audioEngine.ts`, `cueSynth.ts`, `vitest.setup.ts`, and any test file disable added during the ESLint fix pass.

### Non-null assertion with length assertion

**Pattern for test files where array length is asserted by Vitest:**
```typescript
expect(spy).toHaveBeenCalledTimes(1)
// Reason: length asserted by toHaveBeenCalledTimes(1) immediately above.
const call = spy.mock.calls[0]!
```

**Apply to:** All `mock.calls[N]` and `mock.results[N]` access sites in the four affected test files.

---

## No Analog Found

No fix categories in this phase entirely lack a codebase analog. All fix patterns have either an exact existing match in the codebase or are self-referential (config files read above in their entirety). The `no-extraneous-class` rule (4 occurrences in `App.audio.test.tsx` for `FakeAudioContext` variant classes) is not listed above; if it surfaces, the fix is to convert to plain object factories or add `// eslint-disable-next-line @typescript-eslint/no-extraneous-class` with `// Reason: test double for AudioContext API; class syntax is required for `new` invocation in vi.spyOn context.`

---

## Metadata

**Config files read:** `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.json`, `eslint.config.js`
**Source files read:** `src/app/App.tsx` (lines 201-213, 386-395, 407-416, 518-530, 474-480, 293-321, 440), `src/hooks/useAudioCues.ts` (lines 44-58, 258-278), `src/hooks/useWakeLock.ts` (lines 20-30), `src/hooks/usePrefersReducedMotion.ts` (full), `src/audio/audioEngine.ts` (lines 120-134, 228-242), `src/audio/cueSynth.ts` (lines 98-112), `src/components/SessionControls.tsx`, `src/components/EndSessionDialog.tsx`, `src/components/ResetStatsDialog.tsx`, `src/components/SettingsForm.tsx`, `src/components/SettingsStepper.tsx` (full), `src/components/LearnAnchor.tsx`, `src/components/LearnDialog.tsx`, `src/components/MuteToggle.tsx`, `src/components/StatsFooter.tsx`, `src/storage/format.ts` (full), `src/storage/storage.ts` (lines 60-78), `src/domain/sessionMath.ts` (lines 40-49), `src/domain/settings.ts` (full), `src/main.tsx` (full), `vitest.setup.ts` (lines 185-213), `src/app/App.wakeLock.test.tsx` (lines 60-70), `src/hooks/useAudioCues.test.tsx` (lines 644-650), `src/audio/cueSynth.test.ts` (line 70, 117), `src/app/App.persistence.test.tsx` (lines 30-47, grep of property accesses)
**Pattern extraction date:** 2026-05-11
