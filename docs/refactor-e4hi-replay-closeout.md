# E4.H + E4.I — replay feed efficiency and E4 closeout

## Release boundary
This is one replay-only compatibility batch, built on the verified E4.G public release. Do not merge while another Pages deployment is running. The PR gates must pass at the final head, and the next production job must verify the served `fieldwork-build.json` matches its immutable commit.

## E4.H — bounded event-feed view

### Audited baseline
`ui/breach-replay-analysis-controller.ts` previously ran a fresh `.filter()` against all already-disclosed indexed events every feed render, then allocated a new DOM fragment and 0–80 new event buttons/listeners regardless of whether the visible interval had changed. Regular HUD synchronizations also selected every visible button through a DOM query.

### Implemented
- `ReplayFeedFilterCache` stores only the already-disclosed event-array reference and filtered result for the active filter. A new index identity or filter invalidates it. `all` uses the existing array without a copy.
- `ReplayFeedDomWindow` keeps only the current bounded viewport of buttons and a key-to-visible-nodes map. On a new interval, it reuses overlapping buttons and their original click handlers. During same-window playback it changes only the selected key's DOM class, preserving historical duplicate keys.
- On archive/disclosure rebuild, replay start, and replay reset, the filtered cache and button view are cleared. A new index with the same event keys cannot inherit stale text, shot targets, or personal-visibility information.
- An evicted focused event moves keyboard focus to the nearest visible entry; unchanged in-window focus stays on its original button. No new document-wide listener or hidden observer data.
- The 80-event viewport, time/selection tolerances, chronological ordering, click-to-seek, shot inspection authorization, scroll behavior, paused planning, and archived data are unchanged.

### Focused regression
`tests/refactor-e4h-replay-feed-dom.test.mjs` covers stable 120-refresh DOM reuse, 79/80 overlapping reuse, focused viewport changes, duplicate historical keys, filtered identity/disclosure replacement, old click-handler invalidation, empty feeds and reset.

## E4.I — integrated replay closeout

`scripts/verification/refactor-e4-closeout.mjs` runs a 1,800-frame, four-operator replay workload with 1,700 indexed recorded events, 480 replay samples, historical motion + door interpolation, movement-history queries, bounded Events viewport reconciliation and new replay load, asserting:
- Archive input, exported archival evidence and event arrays remain unchanged after playback;
- No future path/event evidence appears during seeking;
- No global/old-session seek/pose state contaminates a fresh recorder;
- Bounded Events viewport and button creation; caches release references on reset.

`tests/refactor-e4i-replay-closeout.test.mjs` tests the workload in the curated critical regression suite. The architecture PR workflow also retains an observational JSON report under `artifacts/refactor-e4/closeout.json`. Reported Node elapsed time is **not** mobile FPS, GPU timing, measured GC latency, or proof of an improvement over the historical pre-E4 build; there are deliberately no unstable wall-clock CI thresholds.

## Acceptance and exit
- E4.H and E4.I regression tests, existing E4.F/G parity tests, critical architecture, TypeScript build, D3 release and physical-route acceptance green;
- No visibility, evidence, input/accessibility, archive schema, game-clock, body/door motor, or camera behavior changes;
- Affected-code review and public build verification at merge checkpoint;
- Close E4 after this release unless real profiled evidence warrants further replay changes. Prioritize on-device fog/scene, operator pose and long-session GC diagnosis next.
