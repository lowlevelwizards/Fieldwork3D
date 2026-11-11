# Package A — Stage A3: Unified application flow

**Baseline:** A2 production `b8c5708fe45b5222ee9ef9344f2316625f6eb4d7`.
**Change boundary:** navigation coordination only. No new Session ownership, simulation change, save schema, world generation, tactical command, fog disclosure, or replay film edits.

## Current-code audit and ambiguities resolved

- The legacy `CampaignMode` is four values (`menu/home/mission/quick`). It serves both background activity and navigation. Reinterpret it as the existing **mode contract**; preserve its value meanings for callers. Represent what the player is *viewing* independently.
- The 2D/3D world is a **persistent mission**, not a screen to recreate. Showing/closing Quick Play's scenario creator or Settings does not call `reset`, `newSession`, or replace the recorder.
- `BreachMissionController` retains sole mission/restart/session swap authority. `createReplayModeController` retains replay snapshots and historical information; AppFlow may only record replay *entry provenance and destination*.
- `createBreachQuickPlayController` owns generator progress/cancel/worker. `createQuickPlayConfigurator` owns input, focus and visibility. The flow coordinator observes successful visibility changes and mission mounts; it **must not** mirror controls or run the worker.
- Mission screens own briefing, sheets, focus and settings. The flow coordinator records successful visible transitions rather than guessing that a click opened a sheet (briefing cannot open while running).
- Replay library owns archives, bookmarks and playlist/film restoration; the flow coordinator owns whether an open library is a front-menu route and the destination after closing. An archive opened from a menu must return to the library and then menu; debrief playback returns to the finished debrief with selection/scroll preserved.
- The menu-to-Quick Play generator is allowed to keep showing the menu behind the overlay during generation. Only worker completion replaces the session. Cancellation before that point leaves the old mission untouched.
- Do not introduce a large global store, a parallel phase machine, or UI rerenders driven by app-flow subscriptions. Read existing authoritative mission phase to reconcile `tactical` versus `debrief`.

## Full implementation scope

### A3.1 Pure application-flow owner

Create `src/breach-app-flow.ts`, a pure, testable `createBreachAppFlow(initialMode)` with:

- Existing `CampaignMode` as the sole writable `mode` owner.
- `surface`: `menu | home | briefing | tactical | debrief | replay`.
- `overlay`: `null | quick-play-creator | settings | replay-library`. No alternative Mission Session or replay-state boolean.
- `replayReturn` and `replayOrigin`: the previously visible surface and whether playback entered through the archive or local debrief; no implicit switch to full-view, mission reset or recorder overwrite.
- `missionMounted`, `briefingVisibility`, `settingsVisibility`, `creatorVisibility`, `openLibrary/closeLibrary`, `beginReplay/exitReplay`, `observePhase`, `setMode` transitions. Idempotent repeated calls, rejected inappropriate transitions, and immutable snapshots.
- Dedicated `libraryReturnsToMenu` route flag, replacing replay library's own duplicate `returnToMenu` field. Keep `entrySource` there only for returning to archived film list and original recorder, a playback-specific operation.

### A3.2 Bind existing controllers to actual transitions

- Replace the mutable `campaignMode` global in main with `appFlow.mode`. Pass getter/setter hooks to CampaignFlow, Quick Play, Studio, Arsenal, Operations Board, Mission Controller and Runtime Loop; no new writes to a second source.
- Report mission mount exactly when `BreachMissionController` completes a Session replacement; report mode/surface after the *actual* controller accepts transitions.
- Bind successful Quick Play generator open/close via optional visibility callback on the configurator. Preserve non-destructive return from Settings, Next, terminal GO/Space, and menu entry; retain worker cancel/failure return to creator and prior mode.
- Bind successful briefing open/close, Settings open/close and sheet collapse through MissionScreens visibility hook. Preserve focus and accessibility transitions, never force-open a briefing while running.
- Report entered replay only if `enterReplay()` succeeds; restore the prior surface when exiting. Handle after-action clip/debrief selection, and the replay library's restore-on-exit.
- Route replay library's menu return through app flow and preserve its existing archive/recorder restoration and focus behavior. Library opened from gameplay remains non-menu; menu-origin library remains menu-origin across playback.

### A3.3 Acceptance and release

- Pure transition tests: initial modes, menu/home routes, mode/overlay separation, reopening/closing, phase reconciliation, mission replacement, rejection of invalid replay entry, return destinations for debrief and menu archive, and repeated no-op events.
- Targeted integration tests: Quick Play overlay never resets the current Session; cancellation returns to creator; replay through debrief preserves after-action workspace; archive through menu returns to archive then menu; campaign deploy/return and mission restart; keyboard shortcut guards, UI focus and old query flags.
- Existing curated architecture/60 Hz parity suite, boundary checks, TypeScript build; Stage 6 real WebGL tactical + mobile/desktop and replay/Operator Lab acceptance. Ensure consolidation branches trigger browser jobs.
- Commit each completed work segment on the A3 feature branch. Merge only after all required checks pass, previous Pages release is successful and expected served build, then verify the new public build stamp.

## Explicit non-goals and invariants

- A4 tactical targeting state, A5 replay option reset/presentation state and A6 main dependency extraction stay deferred.
- No change to Campaign/Quick Play persistence boundaries or replay disclosure policy.
- Do not conflate a modal Settings/creator/library overlay with a Session, simulation pause, or a new mission.
- The four legacy mode values and callback signatures remain compatible unless intentionally replaced by the same-type owner.
- Physical iPhone Safari and desktop GPU manual acceptance remain separate pending sign-offs, not implied by Playwright emulation.

## Closure condition

One authoritative mode/surface/overlay and deterministic return path; every handoff sourced from an existing controller that actually succeeded; no duplicate route provenance in library; all tests green and deployed Pages stamp matches merged SHA. A4 does not begin before verified A3 closure.