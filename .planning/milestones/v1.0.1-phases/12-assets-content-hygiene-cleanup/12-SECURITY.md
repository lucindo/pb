---
phase: 12
slug: assets-content-hygiene-cleanup
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-20
---

# Phase 12 — Security

_Backfilled retroactively for Phase 12 (shipped 2026-05-12). Frontmatter `created: 2026-05-20` reflects backfill date; the audited code surface is the Phase 12 implementation present in `main`._

> Per-phase security contract: threat register, accepted risks, and audit trail. The Phase 12 PLAN.md inlined a `<threat_model>` block at plan time (T-12-01..T-12-04 — ASVS L1 baseline, all `low`/`info`); this SECURITY.md regenerates the register from the **implemented** Phase 12 code surface (`public/favicon.svg`, `src/content/learnContent.ts` Amazon URL, `src/domain/settings.ts` predicate-extraction) — not from the PLAN's advisory threats — and re-scores each row against the current `main` state.

---

## Trust Boundaries

Phase 12 was a v1.0.1 patch wave focused on assets / content / hygiene cleanup; it did NOT introduce any new authentication, network, or storage surface. The implemented changes touch three pre-existing trust boundaries (no new boundary introduced):

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| User-agent ↔ Vite static asset server (dev + production `dist/`) | New `public/favicon.svg` bytes cross from disk to browser, rendered inside `<link rel="icon">` — favicon context, NOT inline `<img src="data:…">` or inline `<svg>`. Browsers do NOT parse favicon resources as documents; script content (if any) is not executed. | Static SVG bytes, anonymous (no cookies, no credentials). |
| LearnDialog `<a>` → outbound `amazon.com` URL | Outbound link from `src/components/LearnDialog.tsx` to a third-party domain (the Amazon product page). Hardcoded constant in `src/content/learnContent.ts:68`, not user-controlled. New-tab navigation via `target="_blank" rel="noopener noreferrer"`. | Outgoing GET on user click; no app data in the URL beyond the static affiliate `linkId` that is Forrest Knutson's tag (CONTEXT D-06 — pre-existing, not introduced by this phase). |
| Storage envelope → `coerceSettings`/`validateSettings` predicates | Untrusted JSON (`unknown` values from `localStorage` + cross-tab `StorageEvent`) crosses into the domain layer via `(v: unknown): v is <T>` predicates that were relocated to `src/domain/settings.ts:147,151,155`. The predicate-extraction is a module-boundary move; the validation policy is byte-identical to pre-Phase-12. | localStorage → domain predicates; previously validated at the same call sites pre-extraction. |

No new endpoint, no new auth flow, no new persisted secret, no new network call.

---

## Threat Register

ASVS L1 baseline. STRIDE rows regenerated against the implemented Phase 12 code surface in `main` (2026-05-20 backfill audit). Each row cites a concrete file and line where the relevant code lives today.

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-12-01 | Tampering / Spoofing | `public/favicon.svg` (NEW asset, ASSETS-01) — currently 486 bytes (spike-010 orb-halo redesign supersession; original Phase 12 shipped a ~150-byte single-circle teal glyph — the threat carve-out is unchanged) | mitigate | SVG body restricted to declarative shape elements (`<svg>`, `<defs>`, `<radialGradient>`, `<rect>`, `<g>`, `<circle>`). NO `<script>`, `<foreignObject>`, `onload=`/`onclick=` event attributes, `xlink:href`/`href` to external resources, `<image>` tag, or `<animate>`/`<set>` animation elements. Negative-grep contract: `! grep -qE '<script\|<foreignObject\|onload=\|xlink:href\|<animate' public/favicon.svg` exits 0. Loaded as `<link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />` — favicon context; browsers do not parse this resource as a document. | closed |
| T-12-02 | Information Disclosure / Open-Redirect | `src/content/learnContent.ts:68` book.url (CONTENT-01) and `:157` (sibling LearnLink entry that reuses the same canonical URL) → outbound `amazon.com` URL | mitigate | URL is a hardcoded constant in source — NOT user-controlled, NOT dynamically constructed, NOT in any way derived from user input or network data. `src/components/LearnDialog.tsx` renders the link with `target="_blank"` and `rel="noopener noreferrer"` — already locked by an existing assertion at `src/components/LearnDialog.test.tsx` (Phase 6 D-12 invariant). The Amazon affiliate `linkId` query param is Forrest Knutson's tag (CONTEXT D-06), not the app's — preserving it is honest, not a routing tampering. Destination domain unchanged from pre-Phase-12 (`amzn.to/3RTAVqi` resolved to the same `dp/B0CCFWP4W8` page); Phase 12 only made the hover-preview honest. | closed |
| T-12-03 | Tampering / Type-Confusion | `isValidBpm`/`isValidRatio`/`isValidDuration` at the storage→domain boundary (HYGIENE-02) — currently exported from `src/domain/settings.ts:147,151,155` and consumed by both `validateSettings` (throwing path, `RangeError` verbatim) and `src/storage/settings.ts coerceSettings` (silent-fallback path) | accept | Predicates use `typeof === 'number'` + `Number.isFinite` + readonly-allowlist `.includes()` only. No `obj[userKey]` dynamic property access; no `eval`/`Function`/dynamic require. The Phase 12 change was a module-boundary move (file-private `function isValid<X>` → `export function isValid<X>` in a different file); the validation logic and allow-list contents are byte-identical to pre-Phase-12. `src/storage/settings.ts coerceSettings` still gates on `(raw !== null && typeof raw === 'object' && !Array.isArray(raw))` before any property read. Phase 12 introduced no new attack surface here. | closed |
| T-12-04 | N/A (Operational) | HYGIENE-01 (`.planning/REQUIREMENTS.md` row flip + `REVIEW.md` §IN-02 addendum), HYGIENE-03 (single-line JSDoc above `formatLastSessionDate`), `index.html` `%BASE_URL%favicon.svg` substitution | accept | Docs-only / build-time-substitution-only changes. No runtime attack surface. `%BASE_URL%` is a documented Vite HTML transform (no plugin, no codegen); resolves to the static string `/hrv/` at build time per `vite.config.ts` `base: '/hrv/'`. Not user-controlled, not network-derived. HYGIENE-01 / HYGIENE-03 are pure planning-doc + JSDoc edits with no executable surface. | closed |
| T-12-05 | Spoofing | (no auth/identity surface) | accept | App has no server, no accounts, no auth flow. Phase 12 introduces no identity, session, or credential surface. | closed |
| T-12-06 | Repudiation | (no logging/audit surface) | accept | App has no audit log. Git history (Phase 12 commits) provides full attribution per Phase 12 D-15 per-commit green-gate invariant. | closed |
| T-12-07 | Denial of Service | favicon asset (T-12-01 surface), shared predicates (T-12-03 surface) | accept | Favicon is a static ~486-byte SVG; serves in well under any browser size guard. Predicates are O(1) `.includes()` over readonly allow-lists of ≤ 13 numbers and ≤ 4 strings — no superlinear behavior on adversarial input. No new long-running or recursive code path introduced. | closed |
| T-12-08 | Elevation of Privilege | (no privilege model) | accept | Single-user, single-device, local-storage-only app. No privilege model exists; no role, no admin, no impersonation. | closed |
| T-12-09 | Input Validation | Storage envelope read → `coerceSettings` (silent fallback to `DEFAULT_SETTINGS`) and `validateSettings` (throws `RangeError` on invalid input) — both gates exercise the relocated `isValid<X>` predicates | mitigate | The Phase 12 predicate extraction does NOT relax any validation gate. `coerceSettings` continues to gate on `(raw !== null && typeof raw === 'object' && !Array.isArray(raw))` and per-field `isValid<X>` checks. `validateSettings` continues to throw `RangeError` with verbatim messages `Unsupported BPM: ${String(...)}` / `Unsupported ratio: ${...}` / `Unsupported duration: ${String(...)}`. Domain test `src/domain/settings.test.ts` locks all three predicate contracts (happy/invalid/wrong-type per predicate). | closed |
| T-12-10 | Secrets / Credentials | (no secret surface) | accept | No secret read/written/transmitted. No new env var, no new API key, no new credential. The Vite `base: '/hrv/'` string is a build-time path config, not a secret. | closed |
| T-12-11 | Supply Chain | (no new dependency) | accept | Phase 12 D-11 milestone invariant: zero net-new runtime deps. No `npm install`, no new package added to `dependencies` or `devDependencies`. No new third-party CSS, no new external font/CDN. The `public/favicon.svg` glyph is hand-authored, not sourced from a third-party icon pack. | closed |
| T-12-12 | Cryptography | (no crypto surface) | accept | No hashing, encryption, signing, or RNG introduced or modified. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**Block-on-high gate:** zero `high` severity threats — every Phase 12 row is `low` or `info`. Audit proceeds to closure.

---

## Accepted Risks Log

Eight of the twelve STRIDE categories are dispositioned `accept` because Phase 12's effective threat surface for those categories is the empty set (no auth, no logging, no DoS surface, no privilege model, no secrets, no supply-chain delta, no crypto). The four `mitigate` rows (T-12-01, T-12-02, T-12-03 accepted at module-boundary parity, T-12-09) each carry a concrete control wired into the implementation and locked by a vitest assertion or negative grep.

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-12-01 | T-12-05 .. T-12-08, T-12-10 .. T-12-12 | Phase 12 introduces no auth/identity, no logging, no DoS-prone code path, no privilege model, no secret, no new runtime dep, no crypto surface. Each row is N/A by phase scope. | plan author + execute-phase verifier (verified via `12-VERIFICATION.md`); backfill auditor 2026-05-20 | 2026-05-20 |
| AR-12-02 | T-12-03 | `isValidBpm`/`isValidRatio`/`isValidDuration` extraction is a byte-identical module-boundary move; validation logic and allow-list contents are unchanged from pre-Phase-12. Phase 12 introduces no new attack surface at this seam — the `accept` disposition reflects parity with the pre-existing `file-private function` declarations that already shipped in v1.0. | plan author (Phase 12 PLAN.md `<threat_model>` row T-12-03) | 2026-05-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-12 | 4 | 4 | 0 | Phase 12 PLAN.md `<threat_model>` (T-12-01..T-12-04 inlined at plan time; closed at `/gsd-verify-work` per `12-VERIFICATION.md`) |
| 2026-05-20 | 12 | 12 | 0 | gsd-security-auditor (backfill — register regenerated against implemented Phase 12 code surface in `main`; expanded original 4 PLAN.md rows to the full 12-row STRIDE table mirroring `13-SECURITY.md`) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed (zero `open` rows in the register)
- [x] `status: verified` set in frontmatter
- [x] Threat register references concrete Phase 12 components by file path (`public/favicon.svg`, `src/content/learnContent.ts:68`, `src/domain/settings.ts:147`)

**Approval:** verified 2026-05-20 (backfill — register regenerated against the implemented Phase 12 code surface; every row closed)
