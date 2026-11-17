# Arsenal M3.0 — Production assembly quality and draw-cost baseline

**Scope:** existing authored catalog, no new parts, no ballistics, no inventory
migration. This document starts M3.0; it does **not** mark visual art approved.

## M3.0A — Complete production-builder inventory (committed)
- Audit all `ARSENAL_REFERENCES` through the actual
  `buildWeaponSilhouette` + `buildWeaponAccessories` production entrypoints;
  include the live legacy shotgun fallback separately.
- Log visible body/accessory mesh owners, GPU submission *estimates*, instanced
  rail counts, triangle counts, distinct geometry/material identities and 3D
  bounds. Per-part buckets make high-cost owners visible.
- Include all factory builds rather than picking one photogenic M4. The report
  describes submissions, **not measured runtime draw calls** (which additionally
  depend on frustum culling, shadow passes, clipping and WebGL program state).
- Preserve workbench part names and material/instance identity. Catalog,
  save state and fixture geometry are unchanged.

Run `node --experimental-strip-types scripts/audit-weapon-production-m30.mjs`.

## M3.0B — Safe GPU resource lifecycle (committed)
- Weapon rebuilding already disposed geometry but not GPU instance buffers
  allocated by `THREE.InstancedMesh` for real AR rail teeth. Call the instance
  disposal hook before geometry disposal.
- Do not dispose shared canonical materials. Never mutate gameplay/loadout.
- Tests assert one instanced-buffer disposal event, owned geometry disposal,
  material preservation and repeated production geometry parity.

## M3.0C0 — Conservative rigid candidate map (committed)
- The read-only production audit now groups only same installed part owner,
  material, opaque rendering state, compatible vertex layout and shadows.
  It reports potential submission savings without merging a single mesh.
- Exclude the animation-controlled magazine, instanced rail teeth, transparent
  markings, special metadata, independently visible attachments and children.
- This is a *candidate inventory*, not an approved optimization or measured
  performance gain.

## M3.0C1 — Legacy shotgun rigid pilot (implemented, CI pending)
- First approved candidate is the **legacy shotgun**, not modular rifles.
  It has 20 unnamed non-moving box meshes in two caller-owned materials,
  no removable authored magazine and no selectable family body nodes.
- Production build now runs `compileLegacyShotgunBody()` on shotgun only.
  Same-material, same-attribute, same-shadow rigid boxes become two meshes.
  The real expected camera-pass draw reduction is **20 → 2**; not yet a
  claim of frame-time improvement or production art approval.
- Source geometry is disposed after baking, output remains weapon-owned,
  caller materials are preserved; no async caches or per-frame work.
- A deterministic test compares world-space triangles, normals, pixel UVs,
  shadow configuration and bounds against the pre-compiled authoring body.
- A separate **real WebGL** headless Chromium lab captures three views,
  counts renderer calls and evaluates original-versus-compiled pixel delta.
  All tests must pass before a release; retained baseline screenshots
  require art review if visible output differs.

## M3.0C2 — Reversible modular prototype (committed; NOT enabled in production)
- Expose a manual `compileRigidWeaponPartPilot(root,slot,partId)` helper.
  It only consolidates direct sibling rigid meshes of the **same installed
  part**, material, vertex format, shader, shadow and visibility contract.
- Preserve the canonical `family-{slot}-{partId}-` raycast/bounds identity
  on the compiled mesh. Leave magazines, rails with per-instance transforms,
  configured attachments, metadata-bearing and transparent meshes untouched.
- Provide `restore()` for interactive audit and `commit()` for a future
  separately verified integration (both idempotent). Sources are detached
  from the scene before visual comparison and are never silently discarded.
- Tests cover a real factory reference, part bounds, untouched configuration,
  Workbench ray picking, restoration, and independently controlled magazines.
- **No normal renderer invokes the prototype.** Further work requires
  a real WebGL selected-part comparison, GPU submission measurements and
  regression tests for named per-mesh family art/animation before enabling.

## M3.0C3 — Modular opt-in visual acceptance (NEXT)
- Work **inside a single immutable weapon assembly** at build/change time.
  Cross-weapon pooling and live operator pose animation require separate study.
- Keep at least `receiver,barrel,handguard,stock,grip,magazine` independently
  addressable for Workbench selection, bounds, viewport raycast and attachment
  ownership. Never flatten an entire assembled rifle into one anonymous mesh.
- If combining multiple same-material rigid elements within a part, preserve
  the part's pick identity and world bounds, geometry UV mapping, face normals,
  cast/receive shadows, side-only art and distinct material variants.
- Do not merge instanced teeth, hidden light lenses, separately toggled parts,
  transparent decals, dynamic magazines, independently named sockets, or
  accessory geometry across movable owners.
- Try an opt-in one-family pilot with paired true production WebGL captures;
  commit only when both visible parity and independent part selection pass.
- Report *measured* original/after GPU submissions and build time alongside
  triangle and peak memory cost. Do not assert performance win from mesh count.

## M3.0D — Cross-context acceptance (NEXT)
- Same saved build in desktop/mobile Workbench, Operator Studio, live operator,
  dropped weapon and debrief replay; unchanged muzzle/stock/support-hand/light
  contacts and hardware positions.
- Full side/front/top/three-quarter shots for AR, AK, G3, HK33, MP5, FAL,
  FNC, G36 and shotgun; test shared palette and original G36 integrated optic.
- No art approval without actual game-scale visual review.

## Release discipline
- M2.9 remains independently staged and its production release has priority.
- M3.0 commits stay on a feature branch; do not merge against a queued or
  running Pages publish. Reconcile latest main and run focused typecheck,
  physical mounting, real browser/WebGL and Pages preflight before releasing.
