# L1.2 — Physical building-power controls
**Fieldwork Breach · Complete implementation scope · 2026-11-16**

## Objective
Make L1.1's independent mains, backup and room-light switches accessible as real player-authored physical interactions. Preserve the existing author/execute split, 60-Hz simulation authority, K1 fixtures, sight occlusion, operator knowledge, mobile palette, restart/replay and lighting-cache invalidation.

## Existing code/behavior audit
- `src/worldgen/wall-dresser.ts` generates actual noncolliding `light-switch`, `breaker-panel` and `electrical-box` wall details with deterministic IDs, rooms, position and facing. They are already modeled by `src/rendering/breach-site-scene-builder.ts`, visible only when discovered. **Reuse** instead of inventing another visual panel layer.
- Authored K1 Killhouse maps and archival sites often have no `wallDetails`: provide a small visible, nonblocking practice power station, while leaving the actual site walls/doors/cover untouched.
- `src/equipment-site-power.ts` is the one electrical authority (two mains groups and optional backup; immutable revisions and per-fixture switches). No second power system.
- `src/breach-plan.ts`, `breach-game.ts`, `breach-plan-authoring.ts` already own ordered undoable `interact` nodes, insertion after a selected waypoint, and motor lifecycle.
- `src/breach-order-executor.ts` invokes `breach-order-interactions.ts` on the existing fixed simulation tick. Failed orders retire without claiming success and continue subsequent plans.
- `src/ui/context-actions.ts`, `src/ui/tactical-palette-controller.ts`, `src/breach-tactical-context-command.ts` are the single mobile/mouse context-action flow.
- `liveVisibility` checks current friendly visibility. Hidden switches must not be advertised from floor-plan geometry, and the actual motor must independently validate physical obstruction.

## Implementation and acceptance specification
### L1.2A — One physical object map
- Pure, deterministic, site-keyed `sitePowerControls(site)`. Existing wall switches map to the local room's real light ID, first wall breaker/electrical box to independently labeled circuit switches (MAINS A, MAINS B, EMERGENCY where authored).
- Stable `switch:<fixtureId>` and `breaker:<circuitId>` identities; no random rerolls between live/replay/plan views.
- Wall attachments are thin existing geometry, *not* new collision walls. For authored training sites without wall details, place bounded small physical practice stations. Maps with no rooms have no controls.
- Never create devices in every room just to guarantee access; only available wall details receive bindings on generated sites.

### L1.2B — Planned physical manipulation
- Explicit `power-on` / `power-off` as existing `interact` orders with a stable target ID. No immediate or implicit toggle from clicking a button or moving through a threshold.
- Author at operator's HERE/final point or the selected waypoint's position; each is one undo/redo transaction, preserving subsequent nodes and their identity.
- Require eligible friendly operator, planning phase, seen control and bounded control distance. Do not inspect hidden target geometry to author a route; reject unsupported or unknown IDs.
- Current state is shown in a clear textual label: CUT / RESTORE + MAINS A, MAINS B, EMERGENCY or ROOM LIGHT.
- No standalone new order clock or new menu. Existing contextual palette provides keyboard-focusable HTML buttons, touch and mouse parity.

### L1.2C — Fixed-step execution and reliability
- The same `createInteractionOrderHandler` owns execution. After arriving at the authored waypoint, the operator must remain within **43 world units** of the true device and maintain unblocked physical contact. A thin contact sweep accounts for the existing ~5-unit wall projection.
- Timed hold **0.65 seconds**, counting only live fixed simulation ticks, during which the actor remains stationary. An incapacitated/absent/unreachable control cannot successfully flip power.
- Orders carry target end state rather than an ambiguous "toggle". If two operators have the same target in one tick, existing actor order gives deterministic priority; a repeated request for the achieved state is harmless, never reverses it.
- Dispatch goes only to `setSiteCircuitPower` / `setSiteFixtureSwitch`. Accepted actions increment electrical and illumination revisions and use the existing event/notification channels. Failed actions use existing terminal-order reporting and do not block later nodes.
- No circuit changes on camera rotation, UI closing, cancelling a planned order, replay scrubbing or walking past panels.

### L1.2D — Presentation
- Reuse preexisting `light-switch` / `breaker-panel` wall meshes in 3D. For training/older authored maps without them, build restrained nonblocking static stations with existing geometry/material ownership and visibility registration.
- In 2D use tiny muted marks at real device positions, gated by observer disclosure. Cache the read-only visibility scan at eight Hz and dedupe shared breaker locations to protect low-end mobile frame pacing.
- Do not add a second ambient lighting renderer or dynamic shadow-casting lights. Powered fixture visuals and animated breaker toggles remain L1.3.

### L1.2E — Critical regression and release
- Generated-wall detail anchor mapping and authored K1 fallback; stable IDs and no devices on empty sites.
- Context palette only offers eligible physically near and observed devices; no undiscovered fixtures or instant mutations.
- Undo/redo, selected-waypoint insertion, no-op rejection and end-state stability.
- Real fixed-clock interaction with no early power application, successful completion and same-bucket illumination invalidation.
- Invalid/out-of-reach/blocked target failure retires exactly one order with no ghost changes; distinct operator requests never reverse an already achieved target.
- Cross-check old L1.0/1.1 baseline and K1 low-light trial, production TypeScript/build, CI and scene lifetime tests.
- Commit compatible stages on this feature branch, merge once at the checkpoint after confirming the prior Pages release succeeded; verify resulting main Pages serves the exact build before claiming deployment.

## Explicit deferrals
- **L1.3:** fixture emissives, pooled local light pools, material response to blackouts, 2D/ISO visual parity.
- **L1.4–1.6:** extended flashlight discipline, functional issued NVG equipment, lighting-aware identification changes.
- **L1.7–1.9:** new scored night courses and more exhaustive browser/mobile/replay QA.

## Style/performance guardrails
Small deliberately readable industrial panels rather than high-poly electronics, no per-frame scene mesh creation, no expanded ray/fixture cap, no map-wide omniscience, and no new separate electrical or order engine. Interactive availability is *not* a promise of geometric reach from an imagined route: actual motor truth is checked on execution.
