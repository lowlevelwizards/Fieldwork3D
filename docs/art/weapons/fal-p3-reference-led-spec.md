# FN FAL 50.00 — P3 reference-led modular art

## Why P2 did not read differently
P2 adjusted depth, bevels and small exterior marks while retaining the major side
silhouette. The production FAL and G3 upper-receiver masses were nearly identical.
This pass deliberately strengthens the primary shapes without adding mechanical
complexity, new saved parts or game simulation changes.

## Supplied reference audit
- Black polymer handguard: long, slender and gently tapered with **three long slots**,
  not a stubby triangular AR fore-end; no copied attachment bracket or new furniture ID
- Two timber handguard references: corroborate three vents and generous broad shoulder
  flats; wood coloration and grain are *not* requested as a new factory FAL finish
- Steel 20-round magazine: essentially straight walls, **sloping lower edge**;
  deliberately smaller face, no AK curve, no fake ribs or bulky separate toe
- Receiver close-ups: meaningful stepped upper/lower geometry, right ejection recess,
  left charging handle, visible magwell/grip transition; aftermarket top rail is excluded
- Carry handle reference: offset bar carried on bent support, contoured thick grip;
  **not** a fixed AR-like enclosed receiver bridge

## Applied stages
1. P3A: 3.22-wide steel magazine top, strong +0.58 unit front heel rise, same
   -8.05 rear extent, -2.98 insertion datum, 2.08 depth and shared carried art
2. P3B: contoured lower/upper and well, muted dedicated lower steel, new compact
   stock wrist, shorter grip and one low-poly contoured polymer carry handhold
3. P3C: eight-sided shoulder-inset handguard, front taper to 1.45 half-width,
   three larger hexagonal FN-style vent shadows each side aligned to changing
   side Z, tapered slimmer factory muzzle profile

## Non-goals and compatibility
Exactly one `fal-5000` factory variant; same six part IDs, pose contacts, muzzle
X=22, stock X=-15, insertion Y=-2.98, ammo simulation, reload system and saves.
No new FAL weapon ballistics, no extra country/wood variants, no high-detail pins,
screws, engraved text, added picatinny rails or fake trigger controls.
21 exterior render meshes, no render-tick geometry allocation.

## Release gate
- Focused FAL stage1/stage2/P1/P2/P3 geometry tests and check/build
- Actual real WebGL M4/G3/FAL same-scale side/3-quarter/mobile smoke captures
- Human inspection in actual Arsenal 128px/256px and operator carry/aim/reload.
  Screenshot existence does **not** prove acceptable geometry or styling
- Compare against pinned P2 commit `b8ed3d6100582ef8a5a8acd0cc3dee0fff98adbd`;
  do not merge or deploy without visual approval and a clear release queue
