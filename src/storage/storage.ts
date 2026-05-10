// src/storage/storage.ts
//
// Phase 4 D-16/D-17: silent-fallback envelope adapter for localStorage.
// Mirrors src/audio/audioEngine.ts's D-10 posture: every risky op is wrapped in
// try { } catch { } and the catch swallows ALL errors. Caller continues with
// in-memory defaults. NO console.warn in production (D-17 says it is "acceptable
// but not required"); gate on `import.meta.env.DEV` if you add it (Open Question 1).

export const STATE_KEY = 'hrv:state:v1'
export const STATE_VERSION = 1 as const

export interface StorageDeps {
  now?: () => number       // D-18 — defaults to Date.now (consumed by stats.ts / format.ts)
  storage?: Storage        // defaults to window.localStorage
}

export interface Envelope {
  version: typeof STATE_VERSION
  settings?: unknown
  mute?: unknown
  stats?: unknown
}

const EMPTY_ENVELOPE: Envelope = { version: STATE_VERSION }

export function readEnvelope(deps: StorageDeps = {}): Envelope {
  const storage = deps.storage ?? window.localStorage
  try {
    const raw = storage.getItem(STATE_KEY)
    if (raw === null) return { ...EMPTY_ENVELOPE }
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // CR-01: pick ONLY the three known subtree keys; drop everything else
      // (unknown / drifted / oversized fields injected via DevTools or future-schema
      // drift). The downstream coercers (coerceSettings / coerceMute / coerceStats)
      // do per-field validation on each subtree before consumers read it. By NOT
      // spreading `parsed`, we ensure save-after-load is idempotent for valid data
      // and discards drift instead of re-persisting it (D-15 invariant for the
      // round-trip semantics — bad fields are dropped, not re-saved).
      const p = parsed as Record<string, unknown>
      return {
        version: STATE_VERSION,
        settings: p.settings,
        mute: p.mute,
        stats: p.stats,
      }
    }
    return { ...EMPTY_ENVELOPE }
  } catch {
    // D-17: read failures silent (corrupt JSON, throwing getItem in Safari ITP)
    return { ...EMPTY_ENVELOPE }
  }
}

export function writeEnvelope(env: Envelope, deps: StorageDeps = {}): void {
  const storage = deps.storage ?? window.localStorage
  try {
    const payload = JSON.stringify({ ...env, version: STATE_VERSION })
    storage.setItem(STATE_KEY, payload)
  } catch {
    // D-16: write failures silent (quota, ITP, private mode).
  }
}
