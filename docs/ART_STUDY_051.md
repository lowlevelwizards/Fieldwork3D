# Fieldwork / Art Study 051 — The First Look

**Status: isolated prototype, deliberately not the replacement live game.**

Open **study.html** (GitHub Pages: `/Fieldwork3D/study.html`).

## Creative thesis

One soldier, one stretch of road, one isometric camera. Player-scale immersion
before simulation or campaign scope. A weathered farmhouse on a winding
wet lane in Cutwoods, with fences, overgrowth, road ruts, shallow pools,
roadside equipment, stones, poles and woodland.

This is a coded *interpretation* of the high-density concept illustration,
not a claim to reproduce its photographic detail. Accept/reject the scene by
its **composition, texture scale, silhouette, environmental density and
sense of place** on a real phone.

## Intentional reset

- This page has **no imports** from existing terrain, weather, regional actors,
  missions, objectives or AI. No surgery on production world.html/main.ts.
- No new game systems: no enemies, firearms simulation, damage, loot or map.
- A freshly authored 76x86m environment, with the camera framed around a
  much smaller **human-scale** piece at any one time.
- Grass, stones and roadside litter are instanced to bound draw overhead.
- Dirt, ruts, water and field colors are generated on a continuous sampled
  ground surface, not the old broad rectangular palette patches.
- Geometry and props are all at real metre scale. Trees, fences, house shell,
  crates and roadside obstacles obstruct movement.
- Soldier has articulated legs, actual locomotion-driven stride, attached
  equipment/weapon, and a visibly changed crouching silhouette.

## Input

- Desktop: **WASD/arrows** move; **click** valid ground to walk;
  **drag** to orbit; **C** crouch/stand; **R** reset angle;
  mouse wheel to zoom.
- iPhone: drag lower-left space to move; drag right to orbit;
  tap visible ground to walk; pinch to adjust scale; CROUCH control.
- A subtle framing offset points the view ahead of the soldier rather
  than keeping the player a centered board-game token.

## Art review gates

1. The opening view looks like a specific place, not an empty field.
2. Rook is identifiable as a soldier with readable stance and equipment.
3. Terrain is visually credible from a close, fixed isometric angle.
4. The farmhouse, fence, road, foliage and props share a coherent material scale.
5. Walking and orbiting are satisfying on iPhone, not only desktop.
6. The few UI elements do not obscure the player or world.

**Only after these gates are judged positively**: add one threat and a
small hide/reposition/withdraw loop. Don't reconnect the region/campaign systems
prematurely.

## Scope and deployment

The existing index.html environment lab, world.html regional game, river lab,
and all their CI tests remain intact. This prototype is shipped only as a
separate study.html entrypoint on an unmerged PR branch until reviewed.
