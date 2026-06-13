# Plan: Stretch — shorter phase minimums + target ratio

Source: `.project/SPEC.md`

## Roadmap

- [x] Phase-duration option sets replaced — Warm-up `[2,3,4,5,10]`, Ramp `[2,3,4,5,10]`, Cool-down `[2,3,4,5,10,15,20,25,30,'open-ended']`, all default 5; `WarmUpMinutes`/`CoolDownMinutes` unions and validity predicates follow. (FR-1..3)
- [x] `targetRatio` added to `StretchSettings` + `DEFAULT_STRETCH_SETTINGS` (default = start ratio); `validateStretchSettings` rejects an invalid label, no ordering constraint. (FR-7, FR-8, FR-11, FR-12)
- [ ] Ramp engine interpolates the inhale split — warm-up holds start, ramp steps linearly by `numSteps`, cool-down holds target; identical output when target = start. (FR-9, FR-10, FR-5, FR-6)
- [x] Storage coercer updated — removed phase values fall back to default 5, preserved values kept; missing/invalid `targetRatio` falls back to coerced start ratio. (FR-4, FR-13)
- [ ] Stretch label strings added (EN + pt-BR) — "Start BPM", "Start Ratio", "Target Ratio"; shared `ratioLabel` untouched. (FR-16)
- [ ] Stretch settings form reordered (Start BPM · Start Ratio · Target BPM · Target Ratio · Warm-up · Ramp · Cool-down · Duration) with a Target Ratio segmented control. (FR-14, FR-15)
