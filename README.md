# Fieldwork — Ground Zero / Build 003: The Misty Region

A tiny, deliberately causal diorama. The world contains **one 10 × 10-meter
ground block**. It is surrounded by a softly lit sky and a static atmosphere.

## What is true

1. **Ground**: one physical slab with a solid top at y = 0.
2. **Light**: one directional source and a weak sky/ground fill.
3. **Shadow**: the slab blocks directional light, casting a physically
   aligned shadow onto an invisible presentation-only receiver below.
4. **Sky**: a muted overcast sky gradient behind the orthographic scene.
5. **Atmosphere**: distance-based exponential-squared haze and a static,
   soft-edged low-lying mist veil, both visually observable.

Sky, fog and mist are **rendering representations**, not yet a simulated
gas, moving weather system, clouds, temperature, wind or time of day.
The visual shadow receiver and transparent mist sheet are not simulated
terrain tiles or world objects.

## Camera
- Touch/mouse drag horizontally to orbit (pitch stays fixed).
- Pinch or mouse wheel to zoom.
- Q/E or left/right to orbit; +/- to zoom on desktop.

The renderer only draws when a view changes. There are no actors, props,
factions, jobs, combat, inventory, UI panels, clocks or scripted encounters.

Older Fieldwork3D builds remain available on
[`archive/pre-ground-zero-2026-10-23`](../../tree/archive/pre-ground-zero-2026-10-23).

Local validation: `npm install && npm test && npm run build`.
