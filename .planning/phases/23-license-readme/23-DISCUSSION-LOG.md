# Phase 23: LICENSE + README - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 23-license-readme
**Areas discussed:** README refresh depth, License section wording, Repo polish extras

---

## README refresh depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full current-state refresh | Fix test count + expand Features for all v1.1–v1.3 capabilities | |
| Minimal touch | Only fix the License section; leave stale content | |
| Accuracy-only | Fix factual errors but don't expand the Features list | ✓ |

**User's choice:** Accuracy-only — with clarification.
**Notes:** User flagged a concrete error: README says `"Configurable BPM (3.5 – 7)"` but the real range is `1 – 7`. Follow-up question on missing-but-real features (palettes, language switch, variants, timbres, BPM stretch) → user chose **"Add the missing ones"**. Net result: correct all stale facts AND add bullets for capabilities the README never mentioned.

---

## License section wording

| Option | Description | Selected |
|--------|-------------|----------|
| Plain MIT pointer + keep the asks | MIT pointer to LICENSE + keep informal credit/not-medical-framing note | ✓ |
| Plain MIT pointer only | MIT pointer to LICENSE, drop the informal request | |
| MIT + attribution boundary restate | MIT pointer + restate Forrest-attribution boundary | |

**User's choice:** Plain MIT pointer + keep the asks.
**Notes:** Drop the stale `"See LICENSE if present"` phrasing; keep the courtesy request to credit Forrest and keep the not-medical framing.

---

## Repo polish extras

| Option | Description | Selected |
|--------|-------------|----------|
| Keep lean (none) | No screenshot, badges, or demo link — text-only README | ✓ |
| Screenshot | Add a session screenshot near the top | |
| Live-demo link | Add a "Try it" link to the deployed app | |
| Badges | Add license/build/tech shields | |

**User's choice:** Keep lean (none).
**Notes:** README stays text-only — no new assets or hosting assumptions.

---

## Claude's Discretion

- Exact wording of new Features bullets and the rewritten License section — match the README's existing calm, claim-safe voice.
- Fixing additional stale facts discovered during the accuracy sweep beyond the two known errors.

## Deferred Ideas

None — discussion stayed within phase scope. Two keyword-matched todos (Forrest native-app links, labels-vs-icons toggle) reviewed and left for Phases 24 and 25 respectively.
