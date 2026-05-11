# Phase 8: Storage Forward-Compat & Cross-Tab UI Sync - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 8-storage-forward-compat-cross-tab-ui-sync
**Areas discussed:** Unknown-field passthrough scope, Downgrade-refusal failure mode, Cross-tab refresh scope + triggers, Existing test rewrite

---

## Unknown-field passthrough scope

### Top-level unknown fields

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve top-level unknowns | Spread parsed object, override version with on-disk value. Maximum forward-compat. Breaks Phase 4 CR-01 'drop drift' invariant — garbage top-level keys survive round trip. | ✓ |
| Strict 3-key + version only | Pick `{version, settings, mute, stats}` from parsed object. Matches REVIEW.md fix code. Keeps CR-01 idempotency. A v2 top-level field is dropped if v1 code rewrites the envelope (but downgrade-refusal in STORAGE-02 prevents the rewrite anyway). | |
| Preserve via allow-list | Pick known keys + extend Envelope type with an optional `unknown` index signature listing anticipated v2 keys. Not realistic — v2 doesn't exist yet. | |

**User's choice:** Preserve top-level unknowns.
**Notes:** Accepted the tradeoff of breaking CR-01 at the top level. Reasoning: forward-compat for an unknown v2 schema is more valuable than guarding against DevTools-injected garbage that no one is producing in the wild.

### Subtree-internal unknown keys

| Option | Description | Selected |
|--------|-------------|----------|
| Keep coercers stripping | Subtree coercers continue dropping unknown sub-keys (current behavior). Top-level passthrough only. Schema evolution happens via new top-level subtrees, not by widening existing ones. | ✓ |
| Pass through subtree unknowns too | Modify each coercer to preserve unknown sub-keys. More forward-compat but breaks D-15 per-field coercion contracts. | |

**User's choice:** Keep coercers stripping.
**Notes:** Forward-compat lives at the top level only.

---

## Downgrade-refusal failure mode

### Observability of the refusal

| Option | Description | Selected |
|--------|-------------|----------|
| Silent no-op | Returns void. No log. Matches Phase 4 D-16/D-17 posture. Consistent with the rest of the storage adapter. User cannot distinguish a downgrade-refusal from a quota failure — but they don't need to. | ✓ |
| Silent + dev-only console.warn | `import.meta.env.DEV` gate; warn 'Refusing to overwrite future envelope vN with current vM'. Same prod posture. Slight signature divergence from D-17 'no console.warn'. | |
| Return boolean | Signature change: writeEnvelope returns true/false. Callers can branch. Touches every call site. Largest blast radius. | |

**User's choice:** Silent no-op.
**Notes:** Tightest consistency with D-16/D-17.

### Version stamp on write

| Option | Description | Selected |
|--------|-------------|----------|
| Stamp STATE_VERSION always | Running build owns the version field. Refusal guard prevents downgrade. env.version on the input is ignored — callers can't accidentally write a wrong version. | ✓ |
| Stamp `env.version ?? STATE_VERSION` | Matches REVIEW.md fix code. Allows future internal callers to pass an explicit version. Slightly more flexible but invites misuse. | |

**User's choice:** Stamp STATE_VERSION always.
**Notes:** Deliberately tighter than REVIEW.md's fix sketch.

---

## Cross-tab refresh scope + triggers

### Which subtrees the listener refreshes

| Option | Description | Selected |
|--------|-------------|----------|
| Stats only | Strict scope-match to STORAGE-03 + ROADMAP success criterion #3. `setStats(loadStats())` on storage event for STATE_KEY. Settings/mute drift across tabs stays a v1.x concern. Smallest blast radius. | ✓ |
| Stats + mute | Mute drift across tabs is high-impact. Modest scope creep. | |
| Stats + mute + settings | Full envelope refresh. Most consistent UX. Largest scope creep beyond STORAGE-03 wording. | |

**User's choice:** Stats only.
**Notes:** Stay inside STORAGE-03 wording.

### Backup refresh triggers

| Option | Description | Selected |
|--------|-------------|----------|
| Storage event only | Cheapest, smallest blast radius. Matches STORAGE-03 wording exactly. Risk: backgrounded-tab `storage` events may be throttled in some browsers. | ✓ |
| Storage event + visibilitychange | Re-load stats on `document.visibilitychange` when visible. Catches throttled-event drops. ~3 extra lines. | |
| Storage event + focus | Re-load on window `focus`. Similar to B but fires on tab focus only. | |

**User's choice:** Storage event only.
**Notes:** Edge case `e.newValue === null` falls through naturally via `coerceStats(undefined) → ZERO_STATS`.

---

## Existing test rewrite

| Option | Description | Selected |
|--------|-------------|----------|
| All adapter tests in storage.test.ts; cross-tab in App.persistence.test.tsx | STORAGE-01 + STORAGE-02 in existing `src/storage/storage.test.ts` — replacing the reversed re-stamp case. STORAGE-03 in `src/app/App.persistence.test.tsx`. Matches current test geography. | ✓ |
| New storage.version.test.ts + App.persistence.test.tsx | Carve out version-evolution cases into a dedicated file for visibility. Slight file proliferation. | |
| Rewrite in place, no new file | Edit the reversed test in place, add no-downgrade case beside it. Minimal diff footprint but less explicit about the contract reversal. | |

**User's choice:** All adapter tests in `storage.test.ts`; cross-tab in `App.persistence.test.tsx`.
**Notes:** The reversed case is REPLACED, not deleted — the test name changes to reflect the new contract.

---

## Claude's Discretion

- `Envelope.version` type widening from literal `1` to `number` (or compatible variant) under Phase 7 strict baseline.
- Exact shape of the on-disk `version` validator (`typeof === 'number'` vs `Number.isInteger && >= 1`).
- Whether to keep `EMPTY_ENVELOPE` as a module-level constant or inline.
- Mechanism for dispatching synthetic `StorageEvent` in the cross-tab Vitest case (jsdom compatibility).
- Whether the `storage` listener inlines in `App.tsx` or extracts into a `useEnvelopeStorageEvent(setStats)` hook.

## Deferred Ideas

- WR-07 increment race fix (UI consistency restored here; correctness deferred to v1.x).
- Settings + mute cross-tab sync (out of D-05 scope; v1.1 candidate).
- Focus / visibilitychange backup refresh (out of D-06 scope; revisit in v1.1 if throttling reports appear).
- Migration framework / v2 schema design (explicit non-goal until a real breaking change lands).
- Custom dev-mode `console.warn` for refused writes (rejected by D-03; could land in v1.1 if useful).
- Subtree-level forward-compat (rejected by D-02; coercers stay strict).
