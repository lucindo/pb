// src/storage/storage.ts
//
// Phase 4 D-16/D-17: silent-fallback envelope adapter for localStorage.
// Mirrors src/audio/audioEngine.ts's D-10 posture: every risky op is wrapped in
// try { } catch { } and the catch swallows ALL errors. Caller continues with
// in-memory defaults. NO warn/log in production (D-17 says it is "acceptable
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
  // STORAGE-01: widened from `typeof STATE_VERSION` (literal 1) to `number` so
  // readEnvelope can surface an on-disk version > STATE_VERSION when a newer
  // build (v2+) has written to the same key from another tab. EMPTY_ENVELOPE
  // still compiles because STATE_VERSION (`1 as const`) is assignable to number.
  // Per RESEARCH RQ-4 Option b, no `[k: string]: unknown` index signature is
  // added — D-01 carries forward-compat via the runtime `...p` spread, not the
  // static type. The static surface remains the four known fields.
  version: number
  settings?: unknown
  mute?: unknown
  stats?: unknown
  // Phase 14 D-11: static type acknowledges the runtime forward-compat already proven
  // by the prefs probe at storage.test.ts:79-99. `unknown` mirrors settings/mute/stats;
  // coercer narrows at the boundary. Avoids storage→domain typed circular import.
  prefs?: unknown
}

const EMPTY_ENVELOPE: Envelope = { version: STATE_VERSION }

export function readEnvelope(deps: StorageDeps = {}): Envelope {
  const storage = deps.storage ?? window.localStorage
  try {
    const raw = storage.getItem(STATE_KEY)
    if (raw === null) return { ...EMPTY_ENVELOPE }
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // STORAGE-01 / D-01: forward-compatible read.
      //   - Spread `p` FIRST so unknown top-level fields written by a future
      //     build (e.g. a v2 envelope's new top-level subtree) survive the
      //     round-trip. Earlier code (CR-01) picked only the known subtree
      //     keys — that silently discarded forward-compatible fields and broke
      //     the "newer build wrote here, older build is reading" invariant we
      //     now lock with STORAGE-02 on the write side.
      //   - Then override `version` with the on-disk numeric value (or fall
      //     back to STATE_VERSION when absent / non-numeric) using
      //     `Number.isFinite` per RESEARCH §"Recommended Implementation
      //     Approach". The override pins `version` to the disk value so the
      //     downstream writeEnvelope guard (D-04a / STORAGE-02) can detect a
      //     future-schema envelope and refuse to downgrade it.
      //   - The `version: onDiskVersion` override anchors the return shape
      //     to Envelope (`version: number` is the one required field); the
      //     spread already carries the four known subtree fields through
      //     when present on disk, and absent fields stay absent (no
      //     `undefined`-valued own-property is introduced — the post-spread
      //     shape matches EMPTY_ENVELOPE for first-load reads).
      //   - D-02 invariant: subtree coercers (coerceSettings / coerceMute /
      //     coerceStats in src/storage/{settings,mute,stats}.ts) still strip
      //     unknown sub-keys downstream — forward-compat is top-level ONLY.
      //   - Pitfall 3: do NOT revert to a pick-only-known-keys return shape;
      //     that breaks STORAGE-01 contract and the storage.test.ts
      //     "preserves on-disk version when reading" case will fail.
      const p = parsed as Record<string, unknown>
      const onDiskVersion =
        typeof p.version === 'number' && Number.isFinite(p.version)
          ? p.version
          : STATE_VERSION
      return { ...p, version: onDiskVersion }
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
    // STORAGE-02 / D-04a: inline re-read guards against the cross-tab race
    // where another tab running a NEWER build (v2+) wrote a future-schema
    // envelope between this tab's caller-side read and this write. The guard
    // refuses to silently downgrade by overwriting that envelope with v1
    // data, which would corrupt the newer tab's view on its next read.
    //
    // D-03: silent refusal — no warn, no DEV-mode branch, no toast.
    // A debugging developer cannot distinguish refusal from a D-16 quota
    // failure; both yield "RAM state authoritative, disk may not have
    // synced" semantics for the running app (WR-08 posture).
    //
    // Scope: this addresses the CROSS-tab newer-version race only. The
    // in-tab WR-07 increment race (concurrent recordSession calls in the
    // same tab) remains documented v1.x debt — STORAGE-03 handles only the
    // UI consistency half of cross-tab sync.
    //
    // Pitfall 1: the inner re-read MUST live in its OWN nested try/catch.
    // If the inner getItem throws (Safari ITP / private mode) and we let
    // the outer D-16 catch swallow it, the entire write is silently skipped
    // — wrong outcome. The guard must be fail-open: when we cannot read the
    // disk version, assume STATE_VERSION and proceed with the write.
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
      // D-17 posture: treat throw/corrupt as "no version info"; proceed.
    }
    if (currentVersion > STATE_VERSION) return
    // D-04: this build stamps STATE_VERSION on every successful write.
    // Caller-passed `env.version` is structurally ignored (the spread is
    // overridden by the explicit `version: STATE_VERSION` key).
    const payload = JSON.stringify({ ...env, version: STATE_VERSION })
    storage.setItem(STATE_KEY, payload)
  } catch {
    // D-16: write failures silent (quota, ITP, private mode).
  }
}
