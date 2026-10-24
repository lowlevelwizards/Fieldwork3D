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
