# Fieldwork — Ground Zero / Build 004: Time of Day

One 10 × 10 m slab, an orthographic camera, and a deterministic 24-hour
environmental cycle. We have **not** introduced people, game objects, weather
fronts, schedules, or gameplay logic.

## One cause, several observable consequences

One authoritative floating-point clock is measured in hours (0–24).
Every frame, the world samples time-dependent environmental conditions:

- Sun direction and elevation follow a continuous arc (no direct sun at night).
- The directional light changes color and strength from sunrise through dusk.
- The hemisphere fill shifts between cool moonless nights and warm days.
- The sky gradient interpolates continuously from midnight through dawn,
  midday, sunset, blue hour, and back to midnight.
- Fog color/density and low-lying mist opacity increase toward dawn and
  evening, reducing toward midday.
- The slab's physically cast shadow follows the sun and fades at night.

All values are derived from `src/environment-conditions.ts` without
separate independent clocks. The palette has authored keyframes with smooth
cyclic interpolation; colors and intensities do not snap at midnight.

This remains a **visual model** of atmosphere: no meteorology, temperature,
actual moving air, moonlight physics or other new gameplay systems.

## How to verify

- A full simulated day takes **4 real minutes** by default, starting at 05:15.
- **Pause/resume** using the small control at the bottom.
- **Drag the timeline** to inspect any time; dragging pauses playback.
- One-finger horizontal drag rotates the camera without changing elevation.
- Pinch or scroll to zoom; Q/E and +/- are desktop alternatives.

Check pre-dawn mist, warm low-angle sunrise, clear midday, orange sunset,
and dark cool night. Play/pause and scrub should not alter ground geometry.

The previous full prototype is archived on
[`archive/pre-ground-zero-2026-10-23`](../../tree/archive/pre-ground-zero-2026-10-23).

Local validation: `npm install && npm test && npm run build`.
