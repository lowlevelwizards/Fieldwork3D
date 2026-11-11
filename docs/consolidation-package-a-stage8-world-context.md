# Consolidation A8 — Session world-context and global compatibility cleanup

**Baseline:** main `cc60346e74db7ed1801a03628b9f5fb0d792bc4c`, A7 production verified by Pages job 43058882462 (served `cc60346e74db-mwcc4vjn`).
**Change boundary:** live Session construction, world registration, and display adoption; no generator, motor, combat, fog, save, replay-format or visual design changes. Release a single compatible group once final head checks pass.

## Audited issue and authority

Roadmap 2 Stage 12 made authoritative geometry session-owned (`breach-world-context.ts` WeakMap and indexed cover array), while Closeout Stage 5 gave presentation its own explicit owner. However:
- `breach-session-factory.ts::assembleSession` still calls `activateSite(site)`, builds `coverState` from global `COVER`, calls global `initialDoors()` and unbound `initialIntel()`, publishes `COVER.splice`, and calls `setPresentationWorldSession`. Background construction therefore switches process-wide geometry before its caller explicitly adopts a view.
- `breach-world-context.ts` falls back to mutable global `WALLS` when `Session.site` is null and records an unrelated `activeGeometryRevision()`. Even a static training Session can accidentally inherit the last activated generated site.
- `breach-door.ts` hinge/push queries receive a session world but fall back to `initialDoors()` for a null Site; this reads whichever legacy site is active.
- `BreachMissionController.create` and replay entry already explicitly call `adoptPresentationWorldSession`, but `applyRequestedCondition` still calls global `activateSite`, and `createReplaySession` uses a detached global swap to undo side effects of its own constructor.
- `breach-presentation-world-ownership.ts` is the intentional adapter for the renderer and single-active-site training/offline consumers; `publishSessionCoverToActiveSite` guards Session **and** active Site identity. Live cover damage, shoves and replay seeking call it only after committed mutations.
- Map Lab, Asset Lab, worldgen audits, legacy test fixtures and selected single-site helpers still rely on `withTemporarySiteGeometry`, direct `WALLS/COVER`, or `activeSite`. They must not be broken or silently converted into multi-session APIs without dedicated analysis.

## Complete stages and verification

- **A8-A — Census and freeze.** Inventory each global reader/writer by live Session, presentation adapter, standalone tool, and legacy fixture. Publish scope and frozen behavior contract in this document. Confirm previous Pages release is successful.
- **A8-B — Explicit site-state constructors.** Add site-scoped static training defaults for walls, cover and initial door records, leaving the old zero-arg APIs valid for standalone callers. `newTacticalState(site)` may accept an explicit site without reading globals; same default actors, initial phase and RNG.
- **A8-C — Session construction isolation.** Build each Session's `coverState`, initialized doors and initial intel from its own site/defaults. Register the session world and bind intel before first observation. `newSession` must have no persistent side effects on `activeSite()`, `WALLS`, `COVER`, or presentation owner. Do not change RNG draws, actor IDs or initialization sequencing.
- **A8-D — Explicit lifecycle adoption.** Mission create/adopt and replay enter/exit/resume must remain the only live presentation handoffs; condition application edits session metadata, not the global site. Retain an exception-safe synchronous detached-scope helper only for deliberate legacy/offline workflows, not for background `newSession`.
- **A8-E — Cleanup legacy leakage.** Null-site authoritative world uses fixed training geometry, not mutable global snapshots; hinge fallback for an explicit Session world uses its own doors. Retain the legacy adapter only for actual standalone callsites. Exclude broad Map Lab generator rewrites and bulk deprecation of `activateSite`.
- **A8-F — Integration and release.** Add fixture tests for back-to-back and interleaved multi-site constructors, live cover modifications, condition changes, training-world independence, replay restoration, exception-safe detached tooling, and deterministic event parity. Run curated architecture regression, 60 Hz frozen outcomes, production type/build, simulation performance, and real WebGL browser acceptance. Commit work packages on branch; merge only once final head checks pass. Verify pre- and post-merge Pages build stamps; block any subsequent deployment until confirmed.

## Unchanged contracts

1. `stepSession` is sole authoritative tick entry. RNG and phase order remain fixed.
2. Session covers are independent arrays and all physical change epochs are per-Session. Replays restore the same array identity, invalidate its local index and do not affect the live simulation.
3. `SessionWorldGeometry.site` and its walls, bounds, cover and revision are never selected by the last global site activation.
4. `IntelState` stores discovered evidence only. World binding is held in a WeakMap and never serialized, leaked into replay, or pre-revealed by another Session.
5. Only explicit adoption chooses visible `WALLS/COVER`; guarded publication never lets a non-owner overwrite them even when both Sessions share a Site object.
6. Legacy site tools retain zero-argument `initialDoors()`, `newTacticalState()`, `activateSite`, `activeSite` and `withTemporarySiteGeometry` intentionally. Compatibility operations are synchronous and exception-safe; they must not be called across await boundaries.
7. All mission game modes, tutorial/training setup, campaign equipment, site generation and replay archives preserve their existing contracts. No changes to gameplay or save schemas.

## Scope boundary / explicit deferrals

Migration of all standalone generators/Labs off the global adapter, or architectural rewriting of core A* and draw caches, is not required for A8: those APIs intentionally have no Session argument. Preserve their existing single-site behavior and document them instead. A9 owns broad CI/obsolete-test consolidation. Hardware iOS/desktop GPU acceptance cannot be inferred from headless Chromium.
