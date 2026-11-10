# Fieldwork Breach — Closeout Stage 3: 3D presentation completion

## Completion gate

Protect **same-seed view parity**, **bounded GPU/mesh resources**, and
**no disclosure leaks** across tactical top-down, 3D miniature, Director,
replay Bodycam and Floor Plan. This closeout is PRESENTATION-ONLY; it must not
edit actor positions, fog knowledge, authored orders, seeded RNG, weapon
outcomes, replay snapshots or the authoritative fixed 60 Hz clock.

## Codebase audit / actual boundary

The pre-existing scene already had substantial protections:
- SiteSceneBuildPort for generated architecture and decor
- per-site material tracker, static batching and shared geometry
- shared 2D/3D fog-mask implementation, separate memory and live passes
- actor/civilian frame reconciliation, historical actor/civilian disclosure
- roof/cutaway logic, historical door/window knowledge, mini focus safeguards
- renderer instrumentation, fog texture size cap and several fog regression suites

The remaining gaps were narrowly scoped:

| Gap | Closing responsibility |
| --- | --- |
| 2D fog accidentally defaulted to global WALLS/COVER | `breach-fog-mask.ts` passes `sessionWorldGeometry(s).walls/cover` to `visionPolygon` |
| 3D mini focus LOS could use globally active map | `breach-3d.ts` passes its owning session optical blockers |
| Personal replay prop/cover gate depended on Bodycam toggle | `breach-3d-disclosure-presenter.ts` and scene evaluate replay policy independently of lens |
| Historic personal arch preview could reconstruct present LOS | Personal opening policy reads historical fine/micro evidence, with legitimate structural briefings preserved |
| Unrecorded fallback rescue figure could appear on historical squad/personal view | Fail closed unless explicitly full view |
| Dropped magazines and flashes were drawn when hidden | `breach-combat-effects-presenter.ts` gates physical transient visual meshes against the same sight policy |
| Every dropped-magazine visual could accumulate | Restrict the visual retention window to 64 recent magazine IDs; do not truncate or mutate recorded/simulation inventory |
| Orphan hostile actor visuals could remain after roster change | Frame presenter asks scene to retire absent red rigs; blue preloads persist, while hidden-but-existing hostiles remain pooled |
| Scene batch mesh detachment did not emit an instancing-buffer disposal signal | `StaticSceneBatches.clear` disposes InstancedMesh ownership while leaving shared geometry/material alive |

## View parity contract

A game session's **own** physical geometry is the sole source of visual
occlusion. Other missions, background replays, global active-site utilities
or equal seed identifiers may not alter the fog mask or a miniature focus ray.

The same authenticated visibility / recorded evidence rules apply across
lens modes. Changing from Bodycam to tactical/Director does **not** elevate
individual historic knowledge into squad knowledge. Structural physical walls
remain occluders even in personal views; an unknown wall is not removed so
the viewer can see through adjacent rooms.

The full-view / intentionally omniscient lens remains an explicit override.
Likewise floor-plan briefings may show architectural structure but never
grant historical individual actor or civilian sightings.

The live world may show an effects mesh only where its observer has actual
visibility; restricted personal replay omits transient effects with no
independent historical eyewitness proof. This excludes hidden muzzle
evidence, magazines, thrown explosives and flash-burst silhouettes.

## Resource ownership contract

- Site-specific material clones and wall/patina materials are released on
  site change. Shared geometry/material caches are **not** site resources.
- Static batch instancing VBOs emit disposal signals on site reset. Removing
  a mesh from its parent alone does not promise GPU release.
- The scene retains the four ready-to-play friendly rigs and currently
  existing hostile actors; it retires hostiles that vanish from a new
  snapshot without touching simulation actors.
- Dropped magazine **presentation** models are bounded; the authoritative
  inventory, event log, and recording are unchanged.
- Scene does not reconstruct unseen rigs, effects or decor on a restricted
  view. Historical lenses do not compute new tactical discovery.

## Tests and closeout checks

The dedicated `breach-closeout-stage3-presentation.test.mjs` verifies
session-vs-global fog, same-seed interleaving, personal archive evidence,
restricted rescue fallback, transient object concealment, magazine resource
ceilings, instancing disposal and stale hostile retirement. Focused CI also
runs prior fog/exterior opening, 3D disclosure, replay personal visibility,
scene lifetime, world context and render frame regressions.

The untouched frozen Roadmap 2 deterministic door, medical, combat,
civilian/replay SHA-256 outcomes are retained in the critical integration
suite. Stage 3 must not regenerate or bless new values to turn CI green.

After green CI, confirm previous deployment success and expected public
build, merge one release checkpoint, and wait for the new Pages workflow
to pass its `Verify public Pages serves expected build` gate. A passing
build or successful merge alone is **not** a verified deployed release.

Device-by-device playtesting remains a separate manual acceptance activity,
not something a Node/Actions test can certify.
