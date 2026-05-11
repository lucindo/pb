---
phase: 06-learning-claim-safe-positioning
gathered_at: 2026-05-10T00:00:00Z
status: locked
amendments:
  - "User-approved at execute time: D-12 link set extended from 5 keys to 6 by adding `patreon` as a labelled link entry. Plan 02 content asset MUST add `patreon: LearnLink` to `LearnContent.links`. Plan 03 dialog MUST render the patreon row in the link block (plain text label `Patreon`, https URL, target=_blank rel=noopener noreferrer like every other link)."
---

# Phase 6 — Forrest URL Hand-off

## Locked URLs

| Key | Label | URL | Title (if applicable) |
| --- | --- | --- | --- |
| youtubeChannel | YouTube channel | https://www.youtube.com/@ForrestKnutson | |
| website | Website | https://www.meditativemellows.com/ | |
| book | Book | https://amzn.to/3RTAVqi | |
| patreon | Patreon | https://www.patreon.com/forrestknutson | |
| heroVideo | Hero video | https://www.youtube.com/watch?v=89WorFpMyY0 | The Holy Trinity of Breath Induces HRV Resonance |
| keyVideos[0] | Key video | https://www.youtube.com/watch?v=6NpH44c34do | The Meditation Magic of Sitting Very Still - SVS |
| keyVideos[1] | Key video | https://www.youtube.com/watch?v=Kn_tQYaUO4M | 4 Proofs of Meditation |
| keyVideos[2] | Key video | https://www.youtube.com/watch?v=gEc6RLixpVs | Beginners Deep Meditation - Naturally - Clinical Mindfulness Technique |

## Notes

The keys in the first column map 1:1 to the `LEARN_CONTENT.links.*` field names that Plan 02 will create in `src/content/learnContent.ts`: `youtubeChannel`, `website`, `book`, `patreon`, `heroVideo`, `keyVideos`. The `keyVideos` rows form a readonly array of length 3 (bounds 0 to 5 per D-12 item 5).

**Contract amendment (execute-time, user-approved):** D-12 originally locked a 5-key link set. At execute time the user added Patreon as a 6th key. Downstream plans (02, 03) treat the amendment as binding:

- Plan 02 (`learnContent.ts`): extend `LearnContent.links` with `patreon: LearnLink`; add test asserting `LEARN_CONTENT.links.patreon.label === 'Patreon'` and `.url === 'https://www.patreon.com/forrestknutson'` and `.url.startsWith('https://')`.
- Plan 03 (`LearnDialog.tsx`): render the patreon row in the link block in fixed order between `book` and `heroVideo`. Apply the same `target="_blank" rel="noopener noreferrer"` posture (D-07). Add test asserting the patreon link is rendered with the security attributes.

All URLs above use the `https` scheme. The T-06-01 threat mitigation (rejection of dangerous schemes) was enforced during gathering.
