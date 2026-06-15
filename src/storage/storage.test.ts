import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readEnvelope, writeEnvelope, migrateEnvelope, STATE_KEY, STATE_VERSION } from './storage'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('readEnvelope', () => {
  it('returns empty envelope when nothing is stored', () => {
    expect(readEnvelope()).toEqual({ version: STATE_VERSION })
  })

  it('returns the parsed envelope when valid JSON is stored', () => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 1, settings: { bpm: 4 }, mute: true, stats: null,
    }))
    const env = readEnvelope()
    // readEnvelope preserves the on-disk numeric version (1 here) rather than
    // overwriting it with STATE_VERSION — the v1→v2 migration runs in-memory but
    // does not restamp `version` (writeEnvelope stamps STATE_VERSION on the next
    // write). The flat settings subtree round-trips unchanged.
    expect(env.version).toBe(1)
    expect(env.settings).toEqual({ bpm: 4 })
    expect(env.mute).toBe(true)
  })

  it('falls back to empty envelope when stored JSON is corrupt (D-17)', () => {
    window.localStorage.setItem(STATE_KEY, '{not-json')
    expect(readEnvelope()).toEqual({ version: STATE_VERSION })
  })

  it('falls back to empty envelope when getItem throws (D-17 — Safari ITP)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(readEnvelope()).toEqual({ version: STATE_VERSION })
  })

  it('falls back to empty envelope when stored value is a non-object (array / number / string)', () => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify([1, 2, 3]))
    expect(readEnvelope()).toEqual({ version: STATE_VERSION })
    window.localStorage.setItem(STATE_KEY, JSON.stringify(42))
    expect(readEnvelope()).toEqual({ version: STATE_VERSION })
    window.localStorage.setItem(STATE_KEY, JSON.stringify('str'))
    expect(readEnvelope()).toEqual({ version: STATE_VERSION })
  })
})

describe('writeEnvelope', () => {
  it('persists the envelope with version stamped', () => {
    writeEnvelope({ version: STATE_VERSION, settings: { bpm: 4 } })
    const raw = window.localStorage.getItem(STATE_KEY)
    expect(raw).not.toBeNull()
    // Reason: raw non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(JSON.parse(raw!) as unknown).toMatchObject({ version: STATE_VERSION, settings: { bpm: 4 } })
  })

  it('silently absorbs QuotaExceededError on setItem (D-16)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const e = new Error('quota')
      e.name = 'QuotaExceededError'
      throw e
    })
    expect(() => { writeEnvelope({ version: STATE_VERSION }) }).not.toThrow()
  })

  it('silently absorbs SecurityError on setItem (D-16 — Safari ITP / private mode)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => { writeEnvelope({ version: STATE_VERSION, mute: true }) }).not.toThrow()
  })

  it('fails OPEN and still writes when the inner version re-read throws (Safari ITP)', () => {
    // The version guard must distinguish "disk holds a newer schema" from "cannot read
    // the disk version". When the inner getItem throws, it must assume STATE_VERSION and
    // proceed — NOT let the throw skip the write. Asserted via the setItem spy because a
    // throwing getItem makes reading the value back impossible.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    writeEnvelope({ version: STATE_VERSION, settings: { bpm: 6 } })

    expect(setItemSpy).toHaveBeenCalledTimes(1)
    const [key, payload] = setItemSpy.mock.calls[0] ?? []
    expect(key).toBe(STATE_KEY)
    expect(JSON.parse(payload ?? '{}') as unknown)
      .toMatchObject({ version: STATE_VERSION, settings: { bpm: 6 } })
  })

  it('preserves on-disk version when reading; stamps STATE_VERSION on write', () => {
    // Seed a v4 envelope (simulates a future schema written by a newer build
    // in another tab). Must be > STATE_VERSION (3) to exercise the future-version
    // guard. `prefs` is the forward-compat probe — the spread must let it survive
    // the readEnvelope round-trip.
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 4, settings: { bpm: 4 }, prefs: { theme: 'dark' },
    }))
    // STORAGE-01: readEnvelope returns the on-disk numeric version (4),
    // NOT STATE_VERSION (3). The known settings subtree round-trips.
    const env = readEnvelope()
    expect(env.version).toBe(4)
    expect(env.settings).toEqual({ bpm: 4 })
    // STORAGE-01: unknown top-level fields survive the read (positive forward-compat
    // coverage). Type-cast required because Envelope.prefs is not statically declared.
    // Without this assertion a regression to a pick-only-known-keys readEnvelope
    // would not be caught by the post-write disk-dump check.
    expect((env as unknown as Record<string, unknown>).prefs)
      .toEqual({ theme: 'dark' })
    // STORAGE-02: disk version 4 > STATE_VERSION 3 → write refused.
    // The caller's `version: 1` does NOT require an `as any` cast because
    // Envelope.version is widened to `number`.
    writeEnvelope({ version: 1, settings: { bpm: 5 } })
    // Disk unchanged: the refused write left the v4 envelope intact.
    const rawAfter = window.localStorage.getItem(STATE_KEY)
    expect(rawAfter).not.toBeNull()
    // Reason: rawAfter non-null asserted by expect().not.toBeNull() above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(JSON.parse(rawAfter!) as unknown).toMatchObject({ version: 4, settings: { bpm: 4 } })
  })

  it('writeEnvelope refuses to overwrite a future-version on-disk envelope (STORAGE-02)', () => {
    // Seed a v4-only envelope (no known subtrees) to isolate the version guard.
    // v4 > STATE_VERSION (3) makes it a genuine future schema.
    window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 4 }))
    // Caller attempts to land 99-session stats on top of the v3 envelope.
    // The 99-session probe gives the negative assertion something concrete
    // to test — if the guard fails, the stats subtree appears on disk.
    writeEnvelope({
      version: 1,
      stats: {
        totalSessions: 99,
        totalElapsedSeconds: 0,
        lastSessionAtMs: null,
        lastSessionDurationSeconds: null,
      },
    })
    // Silent refusal: disk envelope unchanged at version: 4.
    const rawAfter = window.localStorage.getItem(STATE_KEY)
    expect(rawAfter).not.toBeNull()
    // Reason: rawAfter non-null asserted by expect().not.toBeNull() above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(JSON.parse(rawAfter!) as unknown).toMatchObject({ version: 4 })
    // Negative: 99-session probe was NOT written.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(JSON.parse(rawAfter!) as unknown).not.toMatchObject({ stats: { totalSessions: 99 } })
  })
})

describe('migrateEnvelope v1→v2 (PRACTICE-04)', () => {
  // A returning user's flat v1 envelope. settings/stats are deliberately shaped
  // like real subtrees so the lossless-fold assertions are concrete.
  const V1_SETTINGS = { bpm: 4, ratio: '40:60', durationMinutes: 10 }
  const V1_STATS = {
    totalSessions: 7,
    totalElapsedSeconds: 4200,
    lastSessionAtMs: 1_700_000_000_000,
    lastSessionDurationSeconds: 600,
  }

  it('folds a flat v1 envelope into practices.resonant losslessly', () => {
    const migrated = migrateEnvelope(
      { version: 1, settings: V1_SETTINGS, stats: V1_STATS },
      1,
    )
    const practices = migrated.practices as {
      resonant: { settings: unknown; stats: unknown }
    }
    // The flat resonant data is carried into practices.resonant verbatim —
    // downstream coercers validate it field-by-field as always.
    expect(practices.resonant.settings).toEqual(V1_SETTINGS)
    expect(practices.resonant.stats).toEqual(V1_STATS)
    expect(migrated.activePractice).toBe('resonant')
  })

  it('does not delete the original flat settings/stats fields (forward-compat orphans)', () => {
    const migrated = migrateEnvelope(
      { version: 1, settings: V1_SETTINGS, stats: V1_STATS },
      1,
    )
    // The flat fields survive as harmless orphans — the top-level spread in
    // readEnvelope preserves them; this is what keeps the migration lossless.
    expect(migrated.settings).toEqual(V1_SETTINGS)
    expect(migrated.stats).toEqual(V1_STATS)
  })

  it('is idempotent on already-migrated v3 data (fromVersion >= 3 skips both ladder steps)', () => {
    const v3Envelope = {
      version: 3,
      practices: {
        resonant: { settings: V1_SETTINGS, stats: V1_STATS },
      },
      // A stale on-disk practice id from an earlier build. migrateEnvelope does NOT
      // coerce activePractice, so it must pass through unchanged here.
      activePractice: 'legacy',
    }
    const out = migrateEnvelope(v3Envelope, 3)
    // Both fromVersion < 2 and fromVersion < 3 guards are false — practices/activePractice
    // pass through unchanged.
    expect(out.practices).toEqual(v3Envelope.practices)
    expect(out.activePractice).toBe('legacy')
  })

  it('populates practices.resonant when a seeded v1 envelope is read back', () => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 1, settings: V1_SETTINGS, stats: V1_STATS,
    }))
    const env = readEnvelope()
    const practices = env.practices as {
      resonant: { settings: unknown; stats: unknown }
    }
    expect(practices.resonant.settings).toEqual(V1_SETTINGS)
    expect(practices.resonant.stats).toEqual(V1_STATS)
    expect(env.activePractice).toBe('resonant')
  })

  it('STATE_KEY stays exactly "hrv:state:v1" after a write (no accidental key bump)', () => {
    // The :v1 suffix is the key NAME, not the version field. Bumping
    // STATE_VERSION must never touch STATE_KEY (the FOUC script depends on it).
    expect(STATE_KEY).toBe('hrv:state:v1')
    writeEnvelope({ version: STATE_VERSION, settings: V1_SETTINGS })
    expect(window.localStorage.getItem('hrv:state:v1')).not.toBeNull()
    expect(STATE_KEY).toBe('hrv:state:v1')
  })
})

describe('migrateEnvelope v2→v3', () => {
  // A v2 envelope representing a returning user. The v2→v3 step is now a no-op:
  // the per-practice subtree passes through untouched (STATE_VERSION stays 3 so
  // an on-disk v3 from an earlier build is never flagged as a future schema).
  const RESONANT_SETTINGS = {
    bpm: 5.5,
    ratio: '40:60',
    durationMinutes: 10,
  }
  const RESONANT_STATS = {
    totalSessions: 3,
    totalElapsedSeconds: 1800,
    lastSessionAtMs: 1_700_000_000_000,
    lastSessionDurationSeconds: 600,
  }
  const V2_ENVELOPE = {
    version: 2,
    practices: {
      resonant: {
        settings: RESONANT_SETTINGS,
        stats: RESONANT_STATS,
      },
    },
    activePractice: 'resonant',
  }

  it('leaves practices.resonant byte-equal to its pre-migration value (untouched)', () => {
    const migrated = migrateEnvelope(V2_ENVELOPE, 2)
    const practices = migrated.practices as Record<string, { settings: unknown; stats: unknown }>
    const resonant = practices['resonant']
    if (resonant === undefined) throw new Error('Expected resonant practice after migration')
    expect(resonant.settings).toEqual(RESONANT_SETTINGS)
    expect(resonant.stats).toEqual(RESONANT_STATS)
  })

  it('is idempotent — running migration twice on the same v2 envelope produces the same result', () => {
    const once = migrateEnvelope(V2_ENVELOPE, 2)
    // Run again simulating re-read: fromVersion is still 2 for the original envelope
    const twice = migrateEnvelope(V2_ENVELOPE, 2)
    expect(once).toEqual(twice)
  })

  it('skips the v2→v3 step when fromVersion >= 3 (envelope returned unchanged)', () => {
    const v3Envelope = { version: 3, practices: { resonant: { settings: {}, stats: {} } } }
    const out = migrateEnvelope(v3Envelope, 3)
    expect(out.practices).toEqual(v3Envelope.practices)
  })

  it('STATE_VERSION is 3', () => {
    expect(STATE_VERSION).toBe(3)
  })
})

describe('migrateEnvelope v1→v3 chained (HOUSE-09)', () => {
  // A v1 flat envelope from a returning user who has never opened the app since
  // the v2 ladder shipped. migrateEnvelope(env, 1) folds the flat v1 shape into
  // the per-practice resonant slice; the v2→v3 step is a no-op.
  //
  // This block asserts only what `migrateEnvelope` actually produces —
  // resonant + activePractice. The v1→v2 analog block above is consistent.
  const V1_SETTINGS = { bpm: 4, ratio: '40:60', durationMinutes: 10 }
  const V1_STATS = {
    totalSessions: 7,
    totalElapsedSeconds: 4200,
    lastSessionAtMs: 1_700_000_000_000,
    lastSessionDurationSeconds: 600,
  }

  it('folds a v1 flat envelope all the way to v3 in one call', () => {
    const migrated = migrateEnvelope(
      { version: 1, settings: V1_SETTINGS, stats: V1_STATS },
      1,
    )
    const practices = migrated.practices as {
      resonant: { settings: unknown; stats: unknown }
    }
    // v1→v2 step: resonant slice populated losslessly from flat fields.
    expect(practices.resonant.settings).toEqual(V1_SETTINGS)
    expect(practices.resonant.stats).toEqual(V1_STATS)
    expect(migrated.activePractice).toBe('resonant')
  })

  it('is idempotent — re-migrating the v3 output is a no-op', () => {
    const once = migrateEnvelope(
      { version: 1, settings: V1_SETTINGS, stats: V1_STATS },
      1,
    )
    // Feed the output back through with its terminal version. STATE_VERSION (3)
    // means both fromVersion < 2 and fromVersion < 3 guards are false — the
    // returned envelope must equal `once` (modulo the `version` field, which
    // writeEnvelope stamps, not migrateEnvelope). Catches a regression where a
    // ladder step started rewriting an already-migrated v3 input.
    const twice = migrateEnvelope(once, STATE_VERSION)
    expect(twice).toEqual(once)
  })

  it('STATE_VERSION is 3 (ladder terminal)', () => {
    // Locks the test against silent ladder extension — if a future v3→v4 step
    // ships, this assertion fails and forces the HOUSE-09 regression to be
    // re-evaluated against the new terminal.
    expect(STATE_VERSION).toBe(3)
  })
})
