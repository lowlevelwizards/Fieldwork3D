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
