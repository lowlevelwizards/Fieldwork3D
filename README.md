# Fieldwork — Ground Zero / Build 007: Water Accumulates

The small diorama now stores **actual litres of standing water** from rain.
The world still consists of the original 10 × 10 m ground block, moving
clouds, atmosphere and one clock. No river, particles-based water fluid
solver, groundwater, new terrain mesh or game characters were introduced.

## The new causal fact

1. Rainfall delivers water to the ground below moving cloud footprints.
2. Nine small, fixed low spots retain the rain they receive. The local
   rainfall depends on cloud positions, coverage and precipitation strength.
3. The amount stored is **state**, not an effect of the current sky color.
   Each catchment has its own water volume measured in litres.
4. Shallow irregular puddle visuals expand with their accumulated volume,
   respond to the current sky and lighting, and stay inside the original tile.
5. Water is NOT removed just because the rain stops or it becomes sunny.
   This build intentionally has **no evaporation, soil absorption, runoff,
   drainage or flow.** Water also does not disappear when the clock loops.
6. The water volumes persist in browser local storage across reloads
   where the browser permits it.

This first model only assigns rain to nine small illustrative catchments.
It does **not** yet conserve *all* rainfall outside those basins or model
overflow routing, and its footprints remain fixed once full. The total
standing-water value is the water retained by the modelled catchments,
not a claim of complete rainfall accounting.

## How to verify

- Set CLOUDS near 100%, then **resume time**. Watch the puddles grow as
  water lands under drifting clouds.
- Lower CLOUDS or pause time. The puddles remain.
- Change the time slider: it previews other lighting and rain conditions,
  but **does not retroactively deposit or remove water**.
- The STANDING WATER readout reports the sum retained, in litres.
- CLEAR empties puddles for another experiment.
- Rain and clouds still respond to the old controls and 4-minute day.

Note: A later comparative investigation of the **LLW browser water system**
is deliberately out of scope for this minimal accumulation atom. Before
attempting full surface hydrology, study that implementation's methods
and decide what applies to Fieldwork's terrain and performance envelope.

Older full prototype is preserved at
[`archive/pre-ground-zero-2026-10-23`](../../tree/archive/pre-ground-zero-2026-10-23).

Validation: `npm install && npm test && npm run build`.
