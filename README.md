# Fieldwork — Ground Zero / Builds 011–014: Living Ground

One continuous 10 × 10 metre heightfield, with real rainfall, drainage,
ponds, **absorbing soil**, **evaporation**, **shared wind**, and **five physical
surface materials**. This continues the earlier 008–010 hydrology model,
without introducing actors, resources, plant life, or gameplay.

## 011 — Soil absorbs rain

Every one of the 1,024 terrain cells has a measurable soil-water volume
in litres, a material-defined holding capacity, and a maximum intake rate.
During rainfall each cell accepts as much as its capacity and permeability
allow. Only excess goes into the downhill surface-water routing. Existing
ponds can also seep into the soil beneath them using unused cell intake
capacity. Dry ground therefore delays pond formation; saturated ground
promotes runoff. Water is transferred, never silently destroyed.

## 012 — Evaporation

The light cycle and cloud shade determine solar evaporation. The shared
wind increases drying modestly, including at night. Actual litres leave
both exposed soil and standing ponds. Evaporated water is tracked as a
cumulative **atmospheric export**, rather than immediately manufacturing
more rain. There is not yet a humidity or closed water-vapor cycle.

## 013 — Wind

A smooth, deterministic, cyclic prevailing wind is derived from the same
world clock as cloud movement. Its integrated displacement controls
cloud drift. Its direction/strength also tilts falling raindrops, shifts
the mist pattern and influences evaporation. The result respects the
clock's pause and scrub behavior; no competing real-time animation clock.

## 014 — Materials

The same existing terrain surface contains spatial patches of loam,
clay, sand, rock and organic soil. Each specifies storage capacity,
infiltration rate, evaporation multiplier and dry/wet colors. Actual
per-cell saturation, not simply current rain intensity, darkens the
ground. A single terrain mesh receives vertex colors without new slabs.

## Inspect the causal chain

- Set CLOUDS to 100% and run through a rainy spell: soil becomes moist
  before/while ponds form, with rock and clay shedding water sooner.
- Lower clouds to 0 and advance through bright daytime: water dries,
  faster than on a cool night. Already evaporated litres remain counted.
- Pause time or drag the clock: atmosphere previews update but no
  reservoirs change until time genuinely advances.
- Use the lower water ledger to see retained **PONDS**, retained **SOIL**,
  accumulated **EXIT** and **EVAP**.
- CLEAR resets all stores and counters. A new save key upgrades old Build
  010 pond saves without wiping them. Saved soil moisture persists on
  devices that permit local storage.

**Water mass budget:**
cumulative rainfall = ponds + soil + runoff off-map + evaporated.

This is an intentionally small, transparent, material-dependent hydrology
model, not Darcy/Richards soil-fluid PDEs, groundwater flow, temperature
physics, geomorphology, erosion, or a closed atmospheric water cycle.

Historical reference:
[LLW browser hydrology](https://github.com/lowlevelwizards/llw-browser/blob/main/hydrology.js).

Validate: `npm install && npm test && npm run check && npm run build`.

## Build 015 — Ground & Water Visual Integrity

This build does not introduce a new physical process and does not modify
the hydrology/catchment calculations, material storage capacities, or
saved-water schema.

- **Pond surfaces:** replaces the overbright Phong specular material with
  controlled dark slate-colored water, depth-sensitive transparency at
  terrain-clipped shores, small sunlight highlights, and understated
  clock/rain-driven ripple detail. No reflection camera or expensive
  planar reflection textures.
- **Material transitions:** the five underlying physical material categories
  stay unchanged. Visual colors are smoothly blended across neighboring
  geological samples, calculated once and cached on the terrain geometry.
- **Depression legibility:** shallow concave terrain regions receive a
  small, geometry-derived ambient-darkness adjustment. Grass uses smooth
  geometric normals instead of hard faceting; elevation is not exaggerated.
- **Lighting:** less overexposed midday sunlight, slightly restrained haze,
  and cloud colors that do not blow out to pure ivory at noon.
- **Cloud shadows:** ground shadow decals follow real terrain elevation
  instead of hovering across depressions.
- **Preserved:** cloud/rain transparency ordering, mobile camera controls,
  conserved water volume, local soil moisture, terrain-cell elevations,
  real runoff paths, and persisted saves.

The screenshots that motivated Build 015 showed white, opaque-looking pond
discs and geometric sand/soil boundaries. These changes target those exact
failure modes. Deployment passing does not substitute for a real iPhone
visual check.

## Build 015.1 — Corrected water lighting and checkerboard regression

The initial 015 visual pass had two presentation bugs:
- It used an explicitly unlit `ShaderMaterial` that ignored the world's
  directional sun, ambient hemisphere, fog, exposure and scene tonemapping.
- Its "rain ripples" used two multiplied high-frequency sine waves, producing
  a visible stationary checkerboard across ponds.

Build 015.1 removes the entire unlit ripple shader, uses a light-responsive
`MeshStandardMaterial` instead, and fades shorelines with vertex RGBA
derived from measured local depth. The water receives the **same actual
sunlight, nighttime ambient lighting, fog and tonemapping** as the ground;
its color is not chosen from a separate authored time palette. Water remains
terrain-clipped, region-confined and correctly ordered behind overhead
clouds. Real hydrology and saved volumes are unchanged.

`tests/water-visual.test.mjs` asserts that the checkerboard shader cannot
return by accident, that RGB + alpha derive from water depth, and that a
scene-lit material is used.

## Build 015.2 — Ground surface continuity

This is a **render-only** refinement based on iPhone screenshots showing
disconnected mottled patches around the ponds. Hydrology, drainage routes,
material categories, physical soil moisture, reservoirs, and saves are intact.

- A normalized, separable 5×5 Gaussian filter smooths the display moisture
  field without writing to the 32×32 physical soil grid.
- Every shared corner and cell-center terrain vertex bilinearly samples the
  same continuous visual moisture field. Earlier, those vertex types used
  different averaging rules, exposing individual triangular color fans.
- Ground wetness now uses a restrained nonlinear blend (maximum 75% of
  the wet palette instead of 94%).
- Concavity shading is reduced to a subtle 0.96–1.01 multiplier instead of
  the previous much darker 0.78 minimum.
- Visual sand, clay, rock and organic transitions are broadened through
  smoother color weights; the *categorical physical types* stay identical.
- Pond shoreline alpha now reaches true zero at the terrain contact line,
  removing an unnecessary always-visible overlay at the very edge.

No water amounts, soil properties, or basin elevations were changed.
The additional tests check continuity, saturation invariants, physics
preservation, and the water mass budget. The target is a connected ground
surface, not dark scattered stains.

## Build 016 — Mud and Ground Trafficability

Weather now affects tactical mobility. Soil saturation, physical material
(clay, loam, sand, organic soil, rock), slope, water depth, and vehicle load
determine bearing strength (kPa), traction, movement factor and rutting.
Wet rock loses grip but never becomes mud. Saturated clay/organic soil
restrict heavy wheeled loads much more than people on foot.

Open **GROUND TEST** at the bottom of the viewport. Switch FOOT/VEHICLE
and tap or drag to simulate passage. The temporary green→red ground overlay
shows relative traversability. The probe readout reports moisture, bearing
capacity, traction, two movement factors and rut depth. Heavy repeated
passage produces visible, persistent tracks that recover gradually as soil
dries. Turn inspection off to orbit the camera again. CLEAR TRACKS is
separate from the existing CLEAR WATER button.

Ruts live in a separate ground-condition state layer and persist locally.
They affect future movement results but do not yet physically excavate the
heightfield, alter watersheds, or change water volumes; that would be a
separate erosion/hydrological geometry atom. No actors, vehicles, factions
or arbitrary mud overlays were introduced.

New tests verify mobility consequences, slow recovery, persistence,
determinism, saturation contrasts and unchanged water conservation.

## Builds 017–021 — Verdigris Valley & Connected Watershed

Fieldwork's environmental testbed now samples a geographically coherent,
north-to-south valley instead of a generic plateau scattered with basins.
This is groundwork for an **asymmetric tactical warzone**, not a sandbox
ecology game.

### 017 — The valley has a shape

- A 180 km **regional model** defines six fixed north-to-south identities:
  Northline Peaks, Timberline, Cutwoods, Breadlands, Flooded Belt, and
  Verdigris City. The major valley corridor and north-to-south downhill
  relationship persist under bounded deterministic campaign seeds.
- The 10×10 m live hydrology testbed is a **representative local valley
  section**, not a 180 km landscape shrunk to 10 metres. It now features
  a lower meandering central floor, taller lateral flanks and ridges,
  two incised tributary gullies, and small perched side depressions.
- The read-only **VERDIGRIS / REGION** button shows the continental valley
  identity and the main river corridor. Regional rendering and detailed
  local simulation use separate spatial scales by design. There is not yet
  a tile-streaming system for thousands of adjacent local sections.

### 018 — Connected drainage

- The authoritative watershed retains its strict downhill cell routing
  and now computes upstream contributing area for every cell, identifying
  concentrated channels from actual topography.
- Rain not absorbed by soil enters **moving local runoff storage**, passes
  one downhill neighbor at a time, and spends measurable time in each cell.
  It no longer instantly teleports to a remote sink or map edge.
- Northern boundary inflow (16 L/hour at test scale) is modeled as an
  explicit **regional headwater import**, separately recorded from local
  rainfall. It provides a small persistent stream between storms.

### 019 — Visible streams / river sections

- Connected strips of physically lit water appear along the same actual
  downhill links used by the transport model. Their presence follows
  **real stored runoff**, not a permanently drawn blue line.
- Tributary concentration, discharge storage, depth estimates and
  downhill residence time are measured. The streams form a live local
  network feeding the main valley outlet. Flow speed is currently
  approximated from channel/overland residence time, not solved from
  full shallow-water momentum equations.

### 020 — Rising water and overbank flooding

- Each measured channel has finite storage before it overtops.
  Overflow enters a separate, conserved overbank reservoir.
- Floodwater temporarily occupies neighboring low terrain when the
  hydraulic head is sufficient, and drains much more slowly than
  stream water. Rain uphill can therefore raise downstream flows later.
- The environment inspector now shows SURFACE/ SOIL/ EXIT plus cumulative
  UPSTREAM import, in-channel water and overbank FLOOD water. The existing
  ground-load inspector uses the new flood + channel depth so deep
  water reduces actual trafficability.
- **Water accounting:** local rainfall + imported upstream water =
  ponds + overland/channel water + inundation + soil water + outlet export
  + evaporation. The separate saved-water key for 017 migrates older
  compatible basin and soil saves to the altered terrain where possible,
  preserving their litres as moving water if old sink sites no longer exist.

### 021 — Terrain-forming processes (generation-time first pass)

- The initial local valley surface encodes **channel incision** for the
  north–south course and tributary gullies, and broad floodplain
  deposition as an exceptionally low-gradient valley floor.
- This is deterministic, authored *generation-time geomorphology*, not
  an active sediment-transport or landscape-modifying erosion solver.
  Dynamic erosion, deposition mass, sediment grain sorting, changing
  channel bed elevations, and run-time recomputation of drainage graphs
  remain deliberate future work.

### How to test

1. Open the 017–021 build. Orbit the new terrain: a falling north–south
   valley corridor now exists between two continuous flanking slopes.
2. Select **VERDIGRIS / REGION** to see the stable large-scale north-to-
   south shape. The live slab is a separate detailed watershed slice.
3. Turn CLOUDS to 0 and run time: the stream continues from the explicitly
   metered upstream boundary and eventually exits the south.
4. Turn CLOUDS to 100% and run several world-hours: rainfall infiltrates,
   tributaries carry runoff, and some channels fill and spill onto adjacent
   floodplain terrain. UPSTREAM, CHANNEL, FLOOD, SOIL, EXIT and EVAP change
   according to their respective stores.
5. Enable GROUND TEST and compare FOOT vs VEHICLE near the river/flooded
   ground. Passing feet/vehicles still make ruts; their state persists
   independently from water.
6. Use CLEAR to reset all water reservoirs, including imported upstream
   volume and inundation. CLEAR TRACKS remains a separate operation.

This is a validated *simulation and build* pass. Phone visual quality and
actual camera readability still require screenshot feedback from the
device. No generated military campaign, roads, settlements, actors or
moving AI units have been introduced.

## Build 022 — Natural valley and visible water

The original runoff view drew almost every wet downhill graph edge as an
opaque straight blue strip. Storms made hundreds of parallel, evenly spaced
marks; overbank water was displayed as isolated triangular cell fans. Both
looked more like a hydrology debugger than a valley.

- **Physical valley relief:** stronger lateral shoulders and low continuous
  ridges, plus slightly curved and more deeply incised tributary gullies.
  The authoritative grid samples this same revised heightfield; there is
  no render-only elevation displacement.
- **Measured river network:** concentrated catchments and water actually
  held in runoff storage create the visible stream ribbons. Diffuse runoff
  remains physical but no longer generates hundreds of blue graph edges.
  Branches gradually widen with contributing area and volume.
- **Connected water surfaces:** each drawn link follows the real downhill
  neighbor graph; smooth Hermite tangents reduce straight stair-stepped
  segments, and transparent bank fringes meet earth instead of hard blue
  strips. The water color is lit by the scene's ordinary lighting.
- **Floodplains:** a continuous, shared-corner visual flood-depth field
  replaces each cell's sharp blue triangular spokes. Every sample is derived
  from physical overbank litres. Pools and shores fade smoothly.
- **Wet banks and soils:** exposed channel beds have a restrained earth/
  sediment tint; actual local surface water also informs display moisture
  through a filtered visual-only layer. No decorative water reservoirs.
- **Preserved:** rain imports, transport, infiltration, evaporation,
  conserved litres, persistent water/traffic saves, Ground Test, region
  identity and cloud/clock controls.

Try a dry preview, then CLOUDS 100% for several hours: gullies and the
larger valley channel should be readable without an all-over blue mesh;
lower ground wets and floods as real storage rises. Compare FOOT and VEHICLE
along the banks. The geometry change can move historic basin locations,
but the existing save migration routes old basin litres into physical
surface water rather than discarding them.

Validate with `npm test && npm run check && npm run build`.
Visual checks on an actual phone are still needed; CI cannot certify
aesthetics or transparency on mobile GPUs.


## Build 023 — Continuous visual terrain and stream geometry

This is a display-continuity pass over the existing conserved watershed,
not another fluid solver or map-system rewrite. The physical 32×32 grid,
measured terrain elevations, saved stores and groundwater/mobility behavior
remain authoritative.

- The visible channel graph is traced into continuous primary-stream and
  tributary chains. Each active downhill link belongs to one rendered chain,
  confluences share positions, and all width/depth/opacity samples blend
  along entire paths. Fine spline sampling removes width jumps at cell joins.
- Soil saturation, runoff and floodwater feed separate display layers.
  Broad smoothing merges similar areas; elevation-guided bilateral filtering
  protects ridges, steep banks and gully walls from color bleeding.
- Floods render on a 3× finer *visual* grid (96×96) with shared vertex
  samples from the filtered depth field, reducing triangular fan artifacts.
  This affects drawn translucency only, not water locations or litres.
- Sediment-colored channel fringes transition through existing vegetation/
  soil colors, while strong elevation boundaries remain readable.
- The simulated water budget, infiltration, rainfall, headwater import,
  evaporation, catchments, trafficability and persisted saves are unchanged.

Test clear vs stormy hours, then orbit close to a river junction: its shape
should remain coherent and wet ground should fade naturally into neighboring
similar terrain without blue tiling. Real iPhone screenshots remain necessary
to validate visual quality beyond automated tests.

## Build 024 — Hydraulic river stages and connected surface water

- Live river reaches now use trapezoidal cross-sections: the actual routed
  litres determine water depth and wetted width; bankfull storage depends
  on channel size and its upslope contributing area.
- Above bankfull, *existing conserved flood litres* raise stage and allow
  water to spread over lower neighboring floodplain terrain. No fixed
  0.2 m stream-width cap or permanently separate narrow blue stream.
- Moving water responds to receiving water-surface elevation: downstream
  backwater slows transport, floodwater spreads according to local head,
  and water on channel cells can re-enter the main stream after recession.
  All changes preserve the original rain/soil/import/export mass budget.
- LLW-browser-inspired channel pruning removes short weak visual runoff
  spurs without modifying the physical downhill graph or discarding water.
- River ribbons, overbank water, and volume-solved standing ponds are
  sampled into **one** lit mesh with consistent water tint and stage.
  Pond surfaces remain horizontal; streams descend; bank edges are
  clipped by the actual landform and fade into nearby damp soil.
- The existing independent flow and pond renderer files remain available
  as historical comparison modules but are no longer instantiated in the
  production scene. The unified renderer is hydraulic-surface-field.ts.
- Physically stored water and ruts retain the original snapshot format.
  New regression tests cover channel stage/width, pond fill/spill,
  edge pruning, rendering integration and mass preservation.

On a phone, compare low water against a rain-driven rise, especially
near a confluence and a depression. Inspect whether floodwater spreads
into a wider shared surface rather than producing parallel river teeth.
This remains a simplified shallow-water approximation, not a full
momentum-conserving fluid solver; visual polish still needs device review.

## Build 024.1 — Water-surface geometry regression repair

The Build 024 renderer incorrectly stitched a 96×96 grid containing dry
ground-height vertices directly into raised water samples. That created
dark, steeply sloping geometry across the valley and spiky tributaries.
The data underneath was not necessarily flooded to those drawn heights.

- Streams, water stored overbank, and volume-solved ponds still use one
  lit water material and one dynamic mesh, but **do not share arbitrary
  triangles across dry/wet or unrelated surface-height boundaries**.
- Each supported river, flood-cell and pond patch is clipped against the
  actual continuously sampled ground height. Pond surfaces remain level;
  river reaches follow their measured downhill hydraulic stage.
- Filtered flood colors no longer invent a water surface on dry neighboring
  land. The physically stored flood reservoir determines where water can be
  displayed. Small water quantities can still affect soil moisture.
- Water color is lighter muted blue-green with restrained transparency;
  shallow water retains a readable bank, without a dark opaque trench.
- The river, flood and pond reservoirs, mass-conserving transfers, saved
  water state and traffic model are **unchanged**.
- Regression tests assert no triangles emerge from dry ground, shoreline
  clipping stays above terrain, pond surfaces remain horizontal and abrupt
  water-level changes never generate a raised-to-dry hanging sheet.

The conservative correction favors truthful local wet patches over blurred
flood-contour polish. A later pass may blend neighboring, physically
connected flood cells more deeply, but must not recreate the old global
raised grid. Verify on iPhone after clear/dry weather and several simulated
rainy hours; CI checks geometry properties but does not render screenshots.

## Build 024.2 — Continuous water footprint, not translucent tiles

The 024.1 repair removed the dark hanging river wall but still generated
overlapping stream ribbons, flood-cell plates and separate pond geometry.
The transparent, double-sided triangles produced a pale checkerboard river
and occasional thin, raised triangular artifacts on mobile.

- A pure, testable `hydraulic-water-mesh-model.ts` now samples **one** water
  footprint from the authoritative stream, flood and basin stores.
- Each surface sample resolves to a single supported hydraulic water level
  and coverage. Cells without physical water cannot independently draw
  translucent plates, and channels are no longer stacked on flood or pond
  meshes.
- Terrain shore clipping is still used, but never stitches large height
  discontinuities into steep water triangles. Connected reaches use a
  finer visual grid than the 32×32 physical simulation.
- One-sided `FrontSide` geometry, correct upward winding and a blue-green
  transparent water material prevent backface overdraw and crossed quads.
- The rainfall, soil, channel capacity, pond, flood, backwater, saves, and
  trafficability simulation are unchanged.
- Regression tests inspect actual generated triangles in dry, wet, replayed,
  and different-detail conditions, including height spans, alpha bounds,
  normal orientation, finite coordinates, and mass-preserving reads.

This pass deliberately prioritizes eliminating water-grid geometry artifacts
and rendering contradictions over ornamental water effects. Real iPhone
review is still needed to assess the final shoreline and river appearance.

## Build 025 — river geometry reconstruction (isolated verification track)

The 024.x experiments repeatedly rendered channel heightfields as a set of
transparent grid tiles, producing checkerboards and raised polygon shards
despite valid water balances. Following Unreal Water splines, Red Blob drainage
hierarchy, Catlike Coding river-strip geometry and Houdini terrain-carving
workflows, Build 025 adds an **authoritative, durable main-river geography**
without replacing the live water renderer before visual approval.

1. `river-geography.ts` defines the north-to-south river axis, tangent,
   channel incision and banks once. `terrain-model.ts` now imports the exact
   same formulas: preexisting terrain and watershed cell heights are unchanged.
2. `river-ribbon-model.ts` builds a **single joined channel mesh** sampled
   along the actual centerline. Each cross-section intersects the terrain
   to determine its left and right shoreline, not a painted blue cell mask.
   Water stage determines width; the same bed and banks remain after recession.
3. `river-pond-model.ts` extracts basin surfaces using the *actual*
   mass-conserving pond levels, with shoreline clipping on terrain triangles.
   Flood test levels widen the river using its cross-section, not a second
   mesh of independent flooded grid squares.
4. `river-lab.html` is a mobile, isolated water test scene. Use
   `/river-lab.html?scenario=normal&view=oblique` or choose DRY, NORMAL,
   HIGH, FLOOD, RECEDING, POND and LIVE LEDGER. The first six are
   deterministic visualization fixtures; LIVE LEDGER samples genuine
   `TerrainWater` runoff litres and channel stages. Toggle GEOMETRY
   OVERLAY to inspect the shared bed, bank positions and water surface.
5. `scripts/capture-river-lab.mjs` captures repeatable mobile screenshots
   from overhead and oblique views with Playwright. The separate
   `River Geometry Visual Audit` workflow uploads screenshots as artifacts
   on PRs affecting the lab, for human review.

**Release gate**: This track is NOT wired into the normal Verdigris region
renderer. Before replacing Build 024.2, visually approve dry/normal/high/
flood/pond/recession screenshots, confirm no gaps or z-fighting at banks,
test real channel-stage profile in LIVE LEDGER, and compare gameplay water
depth/ground-load readings. The main channel is reconstructed; secondary
tributary meshes and unified compound river/pond confluences are deliberately
deferred until that visual gate succeeds. This prevents another unverified
rendering rewrite from reaching live.

Run `npm test && npm run check && npm run build` first. For local screenshots:
`npm install --no-save --package-lock=false playwright@1.56.1`,
`npx playwright install chromium`, then
`node scripts/capture-river-lab.mjs`. The audit workflow automates the same.

## Build 030 — Ground cover is a property of the land

At Verdigris's current 10 m overview scale, separate 3D grass blades are
inappropriate. The earlier grass-blade prototype remains in source for a
future much-closer camera, but the live region no longer instantiates it.

- `ground-cover-model.ts` computes stable continuous cover (0–100%) from
  the already-authored geologic soil blend, terrain slope, valley elevation
  and long-term drainage. Channel beds, rocky ground and saturated
  depressions support less cover; drained fertile terraces support more.
- The one physical terrain mesh incorporates green vegetation and drier
  straw/earth color into its dry and wet material palettes. A subtle
  fragment-level color grain uses world coordinates, so there are no
  separately placed grass tiles, square borders or repetitive decals.
- The hourly weather and conserved soil-water state **only alter the
  moisture tint**, never the underlying established vegetation density.
- The optional **GROUND COVER → INSPECT** control displays the existing
  measured coverage with a tan-to-green overlay and reports percent cover,
  terrain-derived long-term moisture, slope and current soil water when
  touching the map. It cannot change terrain or create/destroy any water.
  Ground cover and ground-load inspectors are mutually exclusive.
- The Build 029 continuous live river remains unchanged and foreground
  water still occludes submerged terrain.

This is one causal atom: perennial ground-cover suitability. There are no
new trees, shrubs, NPCs, growing seasons, ecological succession or movement
rules. Existing ground-load behavior and save files are unchanged.
