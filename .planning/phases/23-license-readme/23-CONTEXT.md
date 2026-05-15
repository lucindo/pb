# Phase 23: LICENSE + README - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the repository distribution-ready: add an MIT `LICENSE` file at repo root and refresh `README.md` so it is accurate and claim-safe. Repo-root only — zero `src/` files touched. The green-gate (`tsc && lint && build && test`) passes trivially since no runtime code changes.

</domain>

<decisions>
## Implementation Decisions

### LICENSE file
- **D-01:** Add `LICENSE` at repo root with standard MIT License text. Copyright line: `Copyright (c) 2026 Renato Lucindo` (locked by ROADMAP success criteria #1).
- **D-02:** No `LICENSE` file currently exists in the repo — this is a net-new file.

### README refresh depth
- **D-03:** Accuracy-driven refresh — correct every stale/wrong fact. Known errors: test count `"363+ tests as of v1.0"` → `839` (current); Features bullet `"Configurable BPM (3.5 – 7)"` → range is `1 – 7`. Sweep for any other stale values while editing.
- **D-04:** Add Features bullets for capabilities that exist now but the README never mentioned: 5 named palettes, EN/PT-BR language switching, 3 visual variants (Orb/Square/Diamond), 4 audio timbres, BPM-stretch session pattern (Warm-up → Stretch ramp → Settle). After this the Features list should be complete and accurate as of v1.3.
- **D-05:** Existing README structure (intro, About HRV, About Forrest, Features, Tech, Getting Started, Project Structure, Privacy, License) is kept — content corrected/expanded, not restructured.

### License section wording
- **D-06:** Rewrite the README "License" section: state the project is MIT-licensed and point to the `LICENSE` file. Remove the stale `"See LICENSE if present"` conditional phrasing.
- **D-07:** Keep the informal courtesy note below the MIT pointer — request to credit Forrest Knutson as the practice's source and keep the "not medical advice" framing intact. Courtesy ask, not a license term.

### Repo polish extras
- **D-08:** None. README stays text-only — no screenshot, no badges, no live-demo link, no CONTRIBUTING note. Keeps the phase lean and adds no new assets or hosting assumptions.

### Claude's Discretion
- Exact wording of new Features bullets and the rewritten License section — match the README's existing calm, claim-safe voice.
- During the accuracy sweep, fixing any additional stale facts found beyond D-03 is in scope.

### Folded Todos
- **Add license to repo and update README** (`.planning/todos/2026-05-15-add-license-to-repo-and-update-readme.md`, area: docs) — this todo *is* Phase 23. Folded in full; the decisions above are its resolution.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 23: LICENSE + README" — goal + 5 success criteria (LICENSE text + copyright line, README dev/build accuracy, claim-safe positioning, Forrest-attribution boundary, green-gate).
- `.planning/REQUIREMENTS.md` — DOCS-01 (repo has MIT `LICENSE`), DOCS-02 (README accurate, dev/build setup, claim-safe positioning).

### Files edited this phase
- `README.md` — existing 132-line README at repo root; the file being refreshed.
- `LICENSE` — net-new file to create at repo root.

No external ADRs or specs — requirements fully captured in the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `README.md` already exists and is largely sound — has Getting Started (`npm install` / `npm run dev` / `npm test` / `npm run build` / `npm run preview`), Tech section, Project Structure, Privacy, and a claim-safe intro. The phase corrects and extends it rather than rewriting.

### Established Patterns
- README intro already states claim-safe positioning ("guided breathing practice, not medical advice", "independent and unaffiliated" with Forrest) and has an "About Forrest Knutson" section — ROADMAP success criteria #3 and #4 are mostly already met; verify wording stays intact through the edit and that the Forrest-attribution boundary (his name/content/apps remain his) reads explicitly.
- No `src/` code changes — pure repo-root docs phase.

### Integration Points
- None — repo-root files only, no wiring into the app.

</code_context>

<specifics>
## Specific Ideas

- User-spotted error: README says `"Configurable BPM (3.5 – 7)"` but the actual range is `1 – 7` — fix it.
- Test count drift: README cites `363+` tests; v1.2 shipped at `839` Vitest tests.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

### Reviewed Todos (not folded)
- **Add Forrest native app links to Learn page** (`.planning/todos/2026-05-15-add-forrest-native-app-links-to-learn-page.md`) — keyword-matched but belongs to Phase 24 (Forrest Native-App Links). Not folded.
- **Add labels vs icons toggle for session indicator** (`.planning/todos/2026-05-15-add-labels-vs-icons-toggle-for-session-indicator.md`) — keyword-matched but belongs to Phase 25 (Labels-vs-Icons Cue Toggle). Not folded.

</deferred>

---

*Phase: 23-license-readme*
*Context gathered: 2026-05-15*
