# Phase 24: Forrest Native-App Links - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 24-forrest-native-app-links
**Areas discussed:** Link placement, Link presentation, Label wording, Store URLs, Attribution

---

## Link Placement

| Option | Description | Selected |
|--------|-------------|----------|
| New sub-section | Dedicated heading as a 3rd link section after Resources + Videos; new strings.learn heading key, EN+PT-BR | ✓ |
| Into Resources section | Append the 2 links to existing "Forrest Knutson Resources" list; no new heading, mixes app-store with web links | |

**User's choice:** New sub-section
**Notes:** Keeps native apps visually distinct from web resources.

---

## Link Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text links | Same accent-color text-link style as existing 4 links; zero new image assets | ✓ |
| Official store badges | Official App Store / Google Play badge images; adds asset files + store badge-guideline compliance | |

**User's choice:** Plain text links
**Notes:** Consistent with existing LearnDialog links; recolored badges already forbidden by REQUIREMENTS Out of Scope.

---

## Label Wording

| Option | Description | Selected |
|--------|-------------|----------|
| App-named | "Resonant Breathing on the App Store" / "Resonant Breathing on Google Play" | ✓ |
| Store-named | "iOS App Store" / "Google Play" | |
| Platform-named | "Resonant Breathing for iOS" / "Resonant Breathing for Android" | |

**User's choice:** App-named
**Notes:** App name "Resonant Breathing" verified verbatim against both store listings. PT-BR labels machine-translated with `// TODO: native-speaker review` marker.

---

## Store URLs

| Option | Description | Selected |
|--------|-------------|----------|
| Researcher finds them | Phase researcher locates + verifies official store URLs | |
| I'll provide them | User pastes the exact two URLs | ✓ |

**User's choice:** I'll provide them
**Notes:** Provided iOS `id1568058013` and Android `com.johngoodstadt.knutson.meditation`. Both pages fetched and verified to resolve; app name "Resonant Breathing" confirmed; store developer found to be "John Goodstadt" — triggered the Attribution discussion below.

---

## Attribution

| Option | Description | Selected |
|--------|-------------|----------|
| Neutral, no Forrest claim | Heading + labels name only the "Resonant Breathing" app; no copy claiming Forrest authored/owns it | ✓ |
| Companion-app framing | Frame as the companion app Forrest recommends, without claiming he published it | |

**User's choice:** Neutral, no Forrest claim
**Notes:** Surfaced because the verified store developer is "John Goodstadt", not Forrest Knutson. Neutral framing avoids a false attribution and keeps locked claim-safe copy intact.

---

## Claude's Discretion

- Exact new key names in `LearnContent.links` and the `UiStrings['learn']` heading key.
- Exact EN heading text (any neutral phrasing naming the "Resonant Breathing" app).

## Deferred Ideas

None — discussion stayed within phase scope.
