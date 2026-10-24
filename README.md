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
