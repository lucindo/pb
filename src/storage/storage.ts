// src/storage/storage.ts
//
// Silent-fallback envelope adapter for localStorage. Every risky op is wrapped
// in try { } catch { } and the catch swallows ALL errors. Caller continues with
// in-memory defaults. No warn/log in production; gate on `import.meta.env.DEV`
// if you add logging.
//
// SYNC WITH index.html FOUC SCRIPT: it hardcodes both 'pattern-breathing:state:v1'
// and the `JSON.parse(raw).prefs.theme` path. If the key suffix bumps or the
// prefs subtree moves, update the FOUC script too — nothing in the build catches
// the desync, and returning users get a theme flash on every load.
export const STATE_KEY = 'pattern-breathing:state:v1'
export const STATE_VERSION = 1 as const

export interface StorageDeps {
  now?: () => number       // defaults to Date.now (consumed by stats.ts / format.ts)
  storage?: Storage        // defaults to window.localStorage
}

export interface Envelope {
  // `version` is widened to `number` (not `typeof STATE_VERSION`) so readEnvelope
  // can surface an on-disk version > STATE_VERSION written by a newer build in
  // another tab; the writeEnvelope downgrade guard reads it back.
  version: number
  settings?: unknown
  mute?: unknown
  stats?: unknown
  // `unknown` mirrors settings/mute/stats; the coercer narrows at the boundary.
  // Avoids a storage→domain typed circular import.
  prefs?: unknown
}

const EMPTY_ENVELOPE: Envelope = { version: STATE_VERSION }

// Prototype-pollution-safe object guard: only treat `raw` as a record when it is
// a plain non-array object; otherwise hand back an empty record so every named-key
// read falls through to a default. Shared by the per-field coercers in
// settings.ts / stats.ts / prefs.ts.
export function asRecord(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
}

export function readEnvelope(deps: StorageDeps = {}): Envelope {
  const storage = deps.storage ?? window.localStorage
  try {
    const raw = storage.getItem(STATE_KEY)
    if (raw === null) return { ...EMPTY_ENVELOPE }
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Forward-compatible read: spread `p` FIRST so unknown top-level fields
      // written by a future build survive the round-trip, then pin `version` to
      // the on-disk numeric value (or STATE_VERSION when absent / non-numeric) so
      // the writeEnvelope downgrade guard can detect a future-schema envelope.
      // Subtree coercers still strip unknown sub-keys downstream — forward-compat
      // is top-level ONLY.
      const p = parsed as Record<string, unknown>
      const onDiskVersion =
        typeof p.version === 'number' && Number.isFinite(p.version)
          ? p.version
          : STATE_VERSION
      return { ...p, version: onDiskVersion }
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
    // Cross-tab downgrade guard: if another tab running a NEWER build wrote a
    // future-schema envelope, refuse to overwrite it with this older build's
    // data (which would corrupt the newer tab's next read). Best-effort, not
    // transactional — a residual TOCTOU window between the inner getItem and the
    // outer setItem remains; closing it needs the Web Locks API (deferred).
    //
    // The inner re-read MUST be fail-open in its own try/catch: if getItem throws
    // (Safari ITP / private mode) assume STATE_VERSION and still write, rather
    // than letting the outer catch swallow the whole write.
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
