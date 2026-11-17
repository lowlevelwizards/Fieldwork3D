# E6.22 — immutable compiled-model template lifetime

Stage A foundation for Fieldwork's cross-game visual model library.
The E6.20–E6.21 compiler reduced real main-pass draw calls by
158/170 p95 on fixed seeds with >99.97% screenshot pixel agreement,
but still starts from procedural authoring meshes on each site build.

E6.22 adds a **versioned recipe-key template cache**:
- Authoring functions run only once per exact versioned recipe key.
- Optionally bake compatible rigid parts with the E6.20 compiler once.
- Each instance is a fresh cheap transform hierarchy, sharing GPU
  BufferGeometry but not gameplay or animation state.
- Explicit caller-side material resolver permits independent finishes,
  colors and Studio mutations without cross-loadout material leaks.
- Return *leases*. When a template is invalidated, keep all shared GPU
  geometry alive until the last instance releases its lease.
- The site disposal layer can receive `sharedGeometries()` to avoid
  disposing actively shared template geometry.
- Cache owns only factory-declared geometries and generated merged ones,
  never palette materials, physics shapes, fog or tactical state.

**Scope boundary:** this commit adds the infrastructure and tests.
Do not globally cache articulated operator rigs, magazines, interactive
weapon attachments or mutable door states. Integrate specific immutable
recipe families one by one, with versioned keys, release hooks and real
cold-start/steady-frame A/B before default-on migration. Existing production
code is unchanged in this initial stage.

Follow-up stages should adopt architectural opening templates first,
then static room/furniture subassemblies, rigid Arsenal part families,
operator rigid gear at each animation bone, shared Studio/gallery previews,
and ultimately long-lived precompiled asset payloads.

## Architectural opening integration (E6.22 C–E)
- `?e622Template=1` opt-in. Ordinary site construction remains default.
- All fixed opening trims use one pure recipe for both legacy `host.box`
  and compiled model template geometry, preserving UV repeats, physical
  aperture, shadow cast flags, material palette, positions and rotation.
- Template key version+opening kind+full-precision width. Builds once on a
  miss; clones one owner-scoped compiled node on future hits. Caller replaces
  the inert authoring placeholder with current site's real trim material.
- Current BreachScene holds the cache across map resets, but independently
  tracks each site's lease. Teardown excludes cached shared geometry from
  scene disposal; releases the former site's leases after detachment.
- Existing E6.20/E6.21 assembly compiler sees the trim as already compiled
  and does not run the authoring mesh merge a second time.
- CI checks actual geometry cache cold/warm reuse and disposal, two
  fixed-seed live screenshot/draw-count parity against default rendering.
- Node timing is diagnostic only, not browser/mobile FPS.

## Bounded cross-map retention
The template library defaults to 128 cached versioned recipes. On overflow,
least-recently-used idle entries are disposed first. If all are in use,
the oldest live recipe is retired and its buffers remain allocated until
its final visual instance releases its lease. Cache hit updates recency.
The budget prevents indefinite retention across randomized map seeds while
preserving in-round visuals and minimizing repeated authoring work.
