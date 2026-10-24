# Fieldwork — Ground Zero / Builds 008–010: Terrain and Hydrology

The diorama now has **real measured elevation** and terrain-directed water,
adapted in principle from the original LLW browser hydrology implementation.
The world remains one 10 × 10 metre ground block with the original sky,
day/night cycle, clouds, fog and rainfall.

## 008 — Elevation exists

- A 32 × 32 metre-coordinate heightfield covers the original ten-metre
  region at 0.3125m spacing.
- The grass and side walls form ONE continuous earth mesh, including true
  shallow hollows, low shoulders and gentle rises.
- The shared `terrainHeight(x,z)` function supplies both rendered heights
  and the hydrology cell elevations. Terrain triangles have actual centre
  vertices so the physics and graphics agree even in a small hollow.

## 009 — Water recognizes the land

- Every grid cell chooses its strictly downhill neighbour.
- Walking these drainage links identifies interior sinks and catchments.
- Adjacent catchments exchange spill information through their lowest
  shared saddles; a minimax escape calculation finds routes toward the
  open region boundary.
- Rain landing on each cell moves downhill to its catchment; rainfall
  draining through boundary outlets is counted as off-map runoff.

## 010 — Water finds its level

- Each depression has capacity in REAL litres, derived from the elevation
  difference between terrain cells and its escape-level spill saddle.
- Retained rain fills the depression until its water surface reaches the
  spill elevation. Surface height is solved by binary search from volume.
- Surplus water overflows into the downstream catchment, or exits through
  the edge; it cannot exceed a basin's geomorphic storage capacity.
- Pond meshes are clipped against the actual heightfield, creating
  expanding irregular coastlines with perfectly horizontal water levels.
- Stored pond water, deposited water, and off-map runoff obey a water
  accounting invariant. No water disappears through a visual effect.
- Basin quantities are saved locally and survive page reloads. Existing
  Build 007 puddle volumes are migrated to the new catchments once.

## Test it

1. Press **CLEAR** to start with empty catchments.
2. Set CLOUDS to 100% and resume time to produce strong rainfall.
3. Water appears in naturally lower places. Watch ponds grow, fill and
   spill, then follow the runoff amount in the bottom panel.
4. Set clouds to 0 and keep time running. Stored pond water remains.
5. Pause/scrub time: color and weather previews change, but no real water
   is created or subtracted unless simulated time is advanced.
6. Reload: pond and runoff quantities persist in browser storage.

**Not implemented yet:** soil infiltration, evaporation, erosion, flowing
surface-wave physics, dynamic reshaping of terrain, terrain editing, or
full water balance outside the 10m world. We use an explicit grid and
instant downhill routing, not particles or a Navier–Stokes fluid solver.

LLW reference: 
[`llw-browser/hydrology.js`](https://github.com/lowlevelwizards/llw-browser/blob/main/hydrology.js).
That implementation uses static normalized catchment/runoff, whereas
Fieldwork3D accumulates litres incrementally across simulation time.

Local verification: `npm install && npm test && npm run build`.
