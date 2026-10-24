# Fieldwork — Ground Zero / Build 006: Rain

The 10 × 10 metre diorama now experiences rain. No new terrain or actors
have been added. Rain follows the clouds and the same reversible world clock.

## Cause and effect

1. **Cloud cover** controls the amount of moisture available: low coverage
   is dry, increasing coverage produces drizzle, rain, or a downpour.
2. **Authored rain fronts** determine varying onset, duration, intensity
   and taper-off times. They are deterministic functions of world hour,
   not a second weather clock or a random timer.
3. **Cloud undersides darken** with rising cover and rain, and direct
   sunlight dims in heavy precipitation.
4. **Raindrops** form thin diagonal falling streaks directly under the
   moving blocky clouds. They wrap from cloud height to the ground.
   Both curtains and small ground-hit flecks are region-clipped.
5. **Ground wetness** darkens the existing grass and earth after showers.
   It lingers and recedes, computed from recent rainfall, so scrubbing
   time always reproduces the same ground condition.
6. **Atmosphere** becomes slightly hazier during heavy rainfall. Rain
   does not create pools, runoff, soil moisture gameplay or erosion yet.

All visuals are designed to be lightweight on mobile: reused geometry,
GPU shader animation for raindrops and a limited set of inexpensive
surface-hit points.

## How to inspect

- A full 24-hour cycle runs in four real minutes.
- Pause/play or scrub the day/night time slider; paused rain freezes.
- The **CLOUDS** slider overrides coverage. At ~60% it is mostly dry;
  around 70-85% drizzle/rain becomes possible; near 100% it can pour.
- **AUTO** restores cloud cover and naturally varying rainy intervals.
- The **PRECIPITATION** readout shows current rain intensity and type.
- Orbit and zoom as before.

Rain fronts occur at different hours, with strongest sustained showers
around the misty early morning and another in the evening. During
daylight rain the sun and cloud shadows dim; at night, rain remains
visible in the cool ambient light.

This is still a compact environmental experiment, not full simulated
meteorology. Previous game prototype: 
[`archive/pre-ground-zero-2026-10-23`](../../tree/archive/pre-ground-zero-2026-10-23).

Tests: `npm install && npm test && npm run build`.
