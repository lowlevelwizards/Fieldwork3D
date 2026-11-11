# Consolidation Package A — Stage A6: Entrypoint composition closeout

**Baseline:** A5 main `06f9871e195904a87dd0b337075ad022d995ecdd` (green Pages workflow). The tactical entrypoint was **2,777 lines** and retained substantial DOM assembly, HUD formatting, runtime-facing display calculations, event binding and mission/replay navigation sequencing. A6 is a behavior-preserving ownership correction, not a rewrite or one-file rename.

## Audited ownership contract

- **`breach-main.ts` may own** top-level dependency composition, initial browser entry, typed provider closures/getters and explicit startup. It must not implement competing game/replay rules, shadow authoritative state, or contain monolithic DOM construction, per-frame HUD formatting or input-policy decision trees.
- **Existing owners, no extra controller tier:** `breach-mission-controller.ts` owns Session lifetime/snapshot/deployment; `breach-app-flow.ts` owns navigation state; `breach-runtime-loop.ts` owns frame cadence; `ui/breach-mission-screens.ts` owns briefing/settings sheets; `ui/tactical-hud-controller.ts` owns HUD presentation, guidance and keyboard command wiring; `ui/tactical-palette-controller.ts` owns palette display; `ui/breach-replay-hud-controller.ts` owns replay controls; replay timeline, analysis, library and replay-mode controllers retain their own existing responsibilities; gesture/pointer-command modules retain pointer arbitration and plan commit semantics; 2D/3D presentation owners retain drawing and fog.
- **Stateless helpers permitted**, not controllers in disguise: a DOM element registry and small pure format/geometry functions may be moved to the UI/presentation modules that use them. No global event bus, duplicated state stores, `BreachAppController`, host facade mirroring main, or orchestration-service shell.
- Preserve temporal/lifecycle ordering: **release → create → mount**, playback entry/exit return semantics, replay presentation A5 defaults, recording capture boundaries, mission-start snapshot, quick play creator return, and campaign persist/complete exactly once.

## A6 implementation work packages and acceptance

1. Extract the fixed DOM element registry and one-time icon decoration into a stateless `ui/breach-ui-elements.ts`. Main retains only Canvas and 3D mounts, app-controller construction and startup.
2. Move presentational HUD/quick-action derivation into the **existing** tactical HUD and palette owners, leaving the main with explicit narrow subscriptions and authoritative game command callbacks. Preserve selected-node/WATCH preview, injury/medical affordances, 2D/3D parity, and no extra work every animation frame.
3. Move remaining presentation-only replay interactions into the **existing** replay UI/playback/analysis owners. Preserve film disclosure constraints, settings defaults, camera and personal sight, shot inspection, archive/export and return navigation. Do not consolidate distinct replay authorities.
4. Move mission/Quick Play/Campaign and tactical UI event-binding orchestration to the existing mission screens/flow/command owners. Main may pass callbacks, not reimplement command rules or create a second event listener on rebinding. Preserve Escape/Back, keyboard focus guards and mobile pointer priorities.
5. Keep camera/layout and optional diagnostics in the existing presentation/runtime owners rather than adding another coordinator. Remove dead imports, stale aliases and duplicate updates. Debug-only QA hooks must remain explicitly gated and must not leak hidden-intel state to production.
6. Add structural ownership regression checks plus focused tactical planning, WATCH, mission restart, Quick Play return, Campaign, replay/library/Bodycam, fog disclosure and pointer gesture tests. Run architecture boundaries, curated critical 60 Hz/simulation/replay suite, `npm run build`, and the PR browser/WebGL smoke gate.
7. Work on the A6 feature branch. Only merge at a green checkpoint with the previous production Pages build confirmed successful and no active deploy; then verify the new public Pages build stamp. Document any remaining hardware-only acceptance separately (never claim physical iPhone or desktop validation from CI).

## Out of scope

No UI redesign, gameplay balance or command semantics, site generation, AI or physics changes, plan-authoring reimplementation, replay observer knowledge escalation, director camera scoring change, 60 Hz tick change, save/replay schema change, removal of diagnostics used by external QA, or new controller layer.

**Definition of done:** The entrypoint is demonstrably composition focused, existing modules own all presentation/orchestration behavior and one-time listeners, automated source ownership guards and focused tests are green, TypeScript/build/browser checks pass, and the merged Pages stamp is publicly confirmed. A line-count reduction alone is not sufficient.

## Final acceptance expansion for A6

- Preserve the A5 **After Action V3** browser smoke for A6. This stage relocates the replay-entry and clip/unclip event bindings; A6 must retest that workflow, not merely rely on tactical/replay smoke.
- Verify the now-pure 2D fit against known zoom/pan/non-origin bounds, in addition to the renderer order/Bodycam fog invariant.
- Browser CI is Chromium/WebGL on simulated mobile and desktop sizes. Physical device/browser acceptance remains a separate follow-up; do not treat CI as an on-device test.

## Final browser runner dependency repair

GitHub-hosted Ubuntu runners ship with Google Chrome. A6’s browser smoke now uses Playwright’s `channel:'chrome'` only in its opt-in CI flow, with the same WebGL flags and acceptance assertions as before. This avoids the `playwright install --with-deps chromium` apt transaction that failed twice due to the hosted Ubuntu DNS mirror. Outside this CI flow, each script still uses Playwright’s normal browser selection. Fail quickly if no Chrome is preinstalled rather than silently skipping the browser gate.
