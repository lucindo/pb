// src/storage/storage.ts
//
// Phase 4 D-16/D-17: silent-fallback envelope adapter for localStorage.
// Mirrors src/audio/audioEngine.ts's D-10 posture: every risky op is wrapped in
// try { } catch { } and the catch swallows ALL errors. Caller continues with
// in-memory defaults. NO console.warn in production (D-17 says it is "acceptable
// but not required"); gate on `import.meta.env.DEV` if you add it (Open Question 1).

// WR-05: dual-versioning convention.
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
// v1 has no migration framework; D-15's per-field coercers absorb soft drift.
// A migration framework will be added when a non-trivial schema change lands
// (deferred per 04-CONTEXT.md "Storage schema versioning / migration framework"
// and 04-RESEARCH.md R-02).
//
// Tests should NOT depend on the literal STATE_KEY string; assert through the
// public load*/save* API where possible. Tests that DO use STATE_KEY directly
// are seeding fixtures (App.persistence.test.tsx, storage.test.ts) — those are
// expected to migrate together with the constant if it changes.
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
