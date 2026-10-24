# Fieldwork — Ground Zero / Build 000

A clean reset of Fieldwork3D. There is **one 10 × 10 meter ground slab**, shown
through a fixed-elevation orthographic isometric camera. This is the complete scene.

## Controls
- **One-finger horizontal drag / mouse drag:** rotate horizontally around the block.
- **Pinch / mouse wheel:** zoom in or out.
- **Q / E or left / right arrows:** orbit on desktop.
- **+ / -:** zoom on desktop.

The camera retains its elevation throughout, and the slab is framed in both phone
orientations at the default zoom. Rendering happens only when the view changes.

**Intentionally absent:** people, items, factions, combat, missions, repairs,
navigation, autonomous behavior, HUDs, and world simulation.

The previous full prototype is preserved at
[`archive/pre-ground-zero-2026-10-23`](../../tree/archive/pre-ground-zero-2026-10-23).
Build 001 must be discussed and verified separately; no new atom is implied.

Local development: `npm install && npm run dev`. Verification:
`npm test && npm run build`.
