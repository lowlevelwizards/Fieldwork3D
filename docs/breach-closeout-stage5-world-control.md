# Fieldwork Breach — Closeout Stage 5: world-context and control isolation

## Completion contract

Physical outcomes, planning knowledge, presentation geometry, and tool
previews must never be selected implicitly by the last site to call
`activateSite()`. Background archive/replay construction, temporary site
audits, Map Lab and Asset Lab workflows must not steal an in-progress live
mission's physical geometry or presentation-owner token. The public 60 Hz
simulation, its RNG, and recorded event history remain unchanged.

## Baseline audit

Roadmap 2 Stage 12 already shipped session-owned authoritative collision
geometry, session-based spatial indexes, immutable recorded cover restoration,
and presentation publication guards. Closeout Stages 1–4 have already scoped
plan authoring, ordered simulation, 3D fog, and pose output.

The remaining concrete defects were confined to the **legacy presentation
adapter and its consumers**:

| Defect | Implemented closeout |
| --- | --- |
| 2D furniture and wall drawing consulted global `COVER/WALLS` | Read `sessionWorldGeometry(state)` |
| 2D physical-light rays consulted globally active architecture | Evaluate weapon clearance and optical blockers from owning world |
| 2D beam cache keyed by seed, tick and IDs across sessions | Each renderer caches per-Session in a WeakMap, invalidates on local revision, door aperture and time changes |
| Tactical tap boundary checked `activeWorldBounds()` | Validate against pointer port's session geometry |
| 2D layout read global bounds | Read current session's site bounds or base training bounds |
| Scene camera reset, pan, zoom/fit, mini-focus reused global bounds | Scene owns `displayedSite` after `applySite()`; all camera bounds come from that owner |
| Creating a historical replay mutated the live global geometry adapter | `breach-presentation-world-ownership.ts` owns a synchronous, exception-safe `withDetachedPresentationWorld` scope restoring site, exact walls/cover and previous presentation owner |
| Replay view activation was implicit in session creation | `enterReplay` explicitly adopts historical session; `exitReplay` restores live via mission controller |
| Leaving tactical presentation kept an old owner token | `releasePresentation` clears the publication owner |

## Ownership / lifecycle sequence

### Live mission or restart
1. `BreachMissionController.create()` builds fresh actors and physical state.
2. After requested site condition, roster and dossier setup, it explicitly
   adopts that Session for presentation.
3. The 3D scene applies the exact new site. The 2D renderer and pointer
   controller fetch geometry from the current session.
4. Restart creates a fresh session from the preserved original-site
   snapshot; history, authored orders and replay transient state do not
   alias the old mission.

### Background replay preparation
1. `createReplaySession()` runs the entire new-session and archived identity
   setup inside `withDetachedPresentationWorld`.
2. The construction scope restores the **exact prior global wall/cover arrays
   and presentation owner**, even if a nested editor audit throws. It is
   intentionally synchronous and must never contain an `await`.
3. Only after replay state becomes the displayed session does
   `enterReplay()` explicitly call `adoptPresentationWorldSession()`.
4. On exit, `resumeLiveSession()` restores live site, ownership, displaced
   cover and camera scene. Neither replay seeking nor recording changes the
   authoritative live clock.

### Editor and site audits
`withTemporarySiteGeometry` already handles nested physical geometry
previews and restores the exact displaced cover on errors. Stage 5 does
not rewrite standalone Map Lab, Asset Lab or worker lifetimes. It supplies
a detached ownership scope for any preview involving a new background
tactical Session and verifies that a nested failed audit leaves live
presentation unchanged.

## Retained compatibility / constraints

The physical `breach-world-context.ts` never imports or calls `activateSite` and only re-exports the dedicated presentation owner for legacy consumers.\n\nThe legacy `WALLS/COVER` arrays and `activeSite()` still exist for older
training-site fixtures, map generators and standalone single-site tools.
`newSession` retains its legacy activation semantics for direct existing
callers. **Background tactical Sessions must use the explicit detached
construction scope**; the mission controller does so for replay.

The 3D scene is assigned a displayed site only at construction or
`applySite`. Its camera never consults a different active editor map.

2D light cache entries are `WeakMap<Session,…>` values, with a bounded
number of currently illuminated actor entries per session. Replay door
angles and session world invalidation are part of its cache key. This is
visual-only: it does not advance fog, light perception or physical firing.

## Release gates

- New multi-session background construction, nested throw safety, replay
  adoption/resume, same-seed light cache isolation, wall/cover parity,
  pointer bounds and detached-interleave deterministic checks
- Roadmap 2 Stage 12 world ownership and movement, Roadmap 3/4 geometry,
  restart snapshots, replay lifecycle and historical playback regressions
- Existing frozen Stage 1 60 Hz door/combat/medical/civilian SHA-256 checks
- Stage 3 view-disclosure tests, editor temporary geometry tests,
  architecture boundary check, TypeScript production build
- Relevant animation, rendering and simulation performance CI
- Previous successful GitHub Pages served-build checkpoint
- Merge and publish only after green CI; verify that public Pages serves
  exactly the merged artifact and confirm the Pages job succeeded

Manual device playtesting remains a separate Stage 6 acceptance task; no
automated Node suite is a substitute for mobile interaction and camera QA.
