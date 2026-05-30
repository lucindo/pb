// src/storage/storage.ts
//
// Silent-fallback envelope adapter for localStorage. Every risky op is wrapped
// in try { } catch { } and the catch swallows ALL errors. Caller continues with
// in-memory defaults. No warn/log in production; gate on `import.meta.env.DEV`
// if you add logging.

// Dual-versioning convention.
//
// Two parallel version markers cover different schema-evolution scenarios:
//
//   1. STATE_KEY = 'hrv:state:v1'        — the localStorage KEY's :v1 suffix.
//   2. STATE_VERSION = 1 (in envelope)   — a version field INSIDE the JSON.
//
// When to bump which:
//   - Bump STATE_VERSION (in-envelope) for in-place, migrate-on-read schema
//     changes that are reachable from v1 data via per-field coercion +
//     readEnvelope-time migration logic. The user keeps their data; the
//     storage adapter migrates it.
//   - Bump STATE_KEY suffix (:v2) for breaking shape changes where v1 data is
//     unreadable / unmigratable. v2-aware code reads the new key; v1 data is
//     orphaned (not user-data-loss because we never had cloud sync — they would
//     just see defaults on first load of the new code).
//
// STATE_VERSION is bumped 1→2 when `migrateEnvelope` gains a v1→v2 ladder that
// folds a returning user's flat `settings`/`stats` into the per-practice
// `practices.resonant` subtree. STATE_KEY is deliberately unchanged — v1 data
// is fully migratable.
//
// Tests should NOT depend on the literal STATE_KEY string; assert through the
// public load*/save* API where possible. Tests that DO use STATE_KEY directly
// are seeding fixtures (App.persistence.test.tsx, storage.test.ts) — those are
// expected to migrate together with the constant if it changes.
// SYNC WITH index.html FOUC SCRIPT — when bumping the :v1 suffix, update the
// hardcoded 'hrv:state:v1' string in index.html's <head> theme-resolve script.
// The FOUC script also hardcodes the `prefs.theme` JSON path; if the prefs
// subtree ever moves (e.g. under `practices.appearance.prefs`), update the
// FOUC script's `JSON.parse(raw).prefs` lookup too — otherwise every returning
// user gets a data-theme="light" flash on every load. Nothing in the build
// catches this desync; the link is hand-maintained.
export const STATE_KEY = 'hrv:state:v1'
// STATE_VERSION bumped 2→3: migrateEnvelope seeds the practices.stretch slice
// from the resonant blob and zeroes stretch stats.
export const STATE_VERSION = 3 as const

export interface StorageDeps {
  now?: () => number       // defaults to Date.now (consumed by stats.ts / format.ts)
  storage?: Storage        // defaults to window.localStorage
}

export interface Envelope {
  // Widened from `typeof STATE_VERSION` (literal 1) to `number` so readEnvelope
  // can surface an on-disk version > STATE_VERSION when a newer build has written
  // to the same key from another tab. EMPTY_ENVELOPE still compiles because
  // STATE_VERSION (`3 as const`) is assignable to number.
  // Forward-compat is carried via the runtime `...p` spread, not the static type;
  // the static surface remains the known fields.
  version: number
  settings?: unknown
  mute?: unknown
  stats?: unknown
  // Static type acknowledges the runtime forward-compat proven by the prefs probe
  // in storage.test.ts. `unknown` mirrors settings/mute/stats; coercer narrows at
  // the boundary. Avoids storage→domain typed circular import.
  prefs?: unknown
  // The v2 per-practice subtree. `practices` holds a { resonant, naviKriya } map
  // of settings+stats slices; `activePractice` is the selected practice id.
  // Both `unknown` — coercePractices / coerceActivePractice narrow at the boundary.
  practices?: unknown
  activePractice?: unknown
}

const EMPTY_ENVELOPE: Envelope = { version: STATE_VERSION }

/**
 * Explicit migrate-on-read seam.
 *
 * Applied in `readEnvelope` before the envelope reaches the per-field coercers.
 * The forward-compatible top-level spread is preserved — the returned envelope is
 * a `{ ...env }` superset so unknown top-level fields written by a newer build
 * survive the read+write round-trip.
 *
 * v1→v2 ladder: when `fromVersion < 2`, a pre-existing flat v1 envelope is folded
 * into the v2 per-practice shape. The user's flat `settings`/`stats` become
 * `practices.resonant.{settings,stats}` (still `unknown` — downstream coercers
 * validate them field-by-field as always), and `activePractice` is seeded to
 * `'resonant'`. The flat `settings`/`stats` fields are deliberately NOT deleted:
 * the forward-compat spread preserves them as harmless orphans, keeping the
 * migration lossless. naviKriya is intentionally absent so coercePractices
 * supplies defaults. The ladder is idempotent — a v2 envelope skips the step.
 */
export function migrateEnvelope(env: Envelope, fromVersion: number): Envelope {
  let out: Envelope = { ...env }

  if (fromVersion < 2) {
    // Coerce a flat v1 envelope into the v2 per-practice shape. out.settings /
    // out.stats are the existing resonant data (unknown — coercers validate
    // downstream). naviKriya is omitted so coercePractices supplies defaults.
    out = {
      ...out,
      practices: {
        resonant: { settings: out.settings, stats: out.stats },
      },
      activePractice: 'resonant',
    }
  }

  if (fromVersion < 3) {
    // v2→v3: create the stretch slice.
    // Seed settings from the resonant blob (still unknown — coerceStretchSettings validates downstream).
    // Leave the resonant blob untouched — orphan fields are fine (v1→v2 precedent).
    // CRITICAL: Do NOT import ZERO_STATS from stats.ts — stats.ts imports from storage.ts,
    //           creating a circular dep. Use the inline literal instead.
    const existingPractices = (out.practices ?? {}) as Record<string, unknown>
    const resonantSlice = (existingPractices['resonant'] ?? {}) as Record<string, unknown>
    const resonantSettings = resonantSlice['settings']  // unknown — coerceStretchSettings validates downstream
    out = {
      ...out,
      practices: {
        ...existingPractices,
        stretch: {
          settings: resonantSettings,  // carries ramp fields; downstream coercer validates
          stats: {                     // inline literal — no circular dep
            totalSessions: 0,
            totalElapsedSeconds: 0,
            lastSessionAtMs: null,
            lastSessionDurationSeconds: null,
          },
        },
      },
    }
    // resonant slice is untouched — stretch ramp fields remain there as harmless orphans
  }

  return out
}

export function readEnvelope(deps: StorageDeps = {}): Envelope {
  const storage = deps.storage ?? window.localStorage
  try {
    const raw = storage.getItem(STATE_KEY)
    if (raw === null) return { ...EMPTY_ENVELOPE }
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Forward-compatible read.
      //   - Spread `p` FIRST so unknown top-level fields written by a future
      //     build survive the round-trip. Earlier code picked only the known
      //     subtree keys — that silently discarded forward-compatible fields and
      //     broke the "newer build wrote here, older build is reading" invariant
      //     locked by the write-side guard in writeEnvelope.
      //   - Then override `version` with the on-disk numeric value (or fall
      //     back to STATE_VERSION when absent / non-numeric) using
      //     `Number.isFinite`. The override pins `version` to the disk value so
      //     the downstream writeEnvelope guard can detect a future-schema
      //     envelope and refuse to downgrade it.
      //   - The `version: onDiskVersion` override anchors the return shape
      //     to Envelope (`version: number` is the one required field); the
      //     spread already carries the known subtree fields through when present
      //     on disk, and absent fields stay absent.
      //   - Subtree coercers (coerceSettings / coerceMute / coerceStats) still
      //     strip unknown sub-keys downstream — forward-compat is top-level ONLY.
      //   - Do NOT revert to a pick-only-known-keys return shape; that breaks the
      //     forward-compat contract and the "preserves on-disk version" test.
      const p = parsed as Record<string, unknown>
      const onDiskVersion =
        typeof p.version === 'number' && Number.isFinite(p.version)
          ? p.version
          : STATE_VERSION
      // Route every on-disk read through the explicit migration seam so the
      // migrate-on-read contract is structurally present and testable.
      return migrateEnvelope({ ...p, version: onDiskVersion }, onDiskVersion)
    }
    return { ...EMPTY_ENVELOPE }
  } catch {
    // Read failures silent (corrupt JSON, throwing getItem in Safari ITP).
    return { ...EMPTY_ENVELOPE }
  }
}

export function writeEnvelope(env: Envelope, deps: StorageDeps = {}): void {
  const storage = deps.storage ?? window.localStorage
  try {
    // Inline re-read guards against the cross-tab race where another tab running
    // a NEWER build wrote a future-schema envelope between this tab's read and
    // this write. The guard refuses to silently downgrade by overwriting that
    // envelope with older data, which would corrupt the newer tab's view on its
    // next read.
    //
    // Silent refusal — no warn, no DEV-mode branch, no toast. A debugging
    // developer cannot distinguish refusal from a quota failure; both yield
    // "RAM state authoritative, disk may not have synced" semantics.
    //
    // Scope: addresses the CROSS-tab newer-version race only. The in-tab
    // concurrent recordSession race is documented v1.x debt — the storage-event
    // listener in App.tsx handles only the UI consistency half of cross-tab sync.
    //
    // Residual TOCTOU window: the inner re-read narrows but does NOT close the
    // cross-tab race. Between the inner storage.getItem (below) and the outer
    // storage.setItem, another tab running a newer build can still commit a
    // future-schema envelope; this tab's stale currentVersion read returns the
    // older number, the guard does not fire, and the older payload overwrites the
    // newer envelope. Closing this fully would require BroadcastChannel-coordinated
    // locking or the Web Locks API (deferred). The guard is best-effort, not
    // transactional.
    //
    // User-facing failure mode: an older build loaded after a newer build has
    // written a future-version envelope (browser cache, stale SW, bfcache)
    // short-circuits at the currentVersion > STATE_VERSION check below — every
    // user action that calls a save*/record* function is silently discarded.
    // QA/UAT should clear localStorage between builds when downgrading. A
    // DEV-only console.warn at the short-circuit site signals the situation to
    // developers; production stays silent.
    //
    // The inner re-read MUST live in its OWN nested try/catch. If the inner
    // getItem throws (Safari ITP / private mode) and we let the outer catch
    // swallow it, the entire write is silently skipped — wrong outcome. The guard
    // must be fail-open: when we cannot read the disk version, assume STATE_VERSION
    // and proceed with the write.
    let currentVersion: number = STATE_VERSION
    try {
      const raw = storage.getItem(STATE_KEY)
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw)
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const v = (parsed as Record<string, unknown>).version
          if (typeof v === 'number' && Number.isFinite(v)) currentVersion = v
        }
      }
    } catch {
      // Treat throw/corrupt as "no version info"; proceed with write.
    }
    if (currentVersion > STATE_VERSION) {
      // DEV-only signal so developers can spot a downgrade-after-upgrade.
      if (import.meta.env.DEV) {
        console.warn(
          `[storage] refusing to overwrite on-disk envelope v${String(currentVersion)} ` +
          `(this build is v${String(STATE_VERSION)}). Writes are silently discarded — ` +
          `reload the newer build or clear localStorage.`,
        )
      }
      return
    }
    // Stamp STATE_VERSION on every successful write. Caller-passed `env.version`
    // is structurally ignored (the spread is overridden by the explicit key).
    const payload = JSON.stringify({ ...env, version: STATE_VERSION })
    storage.setItem(STATE_KEY, payload)
  } catch {
    // Write failures silent (quota, ITP, private mode).
  }
}
