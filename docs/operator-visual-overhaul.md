# Fieldwork Breach — Operator Visual Overhaul (OV)

## Protected art direction
- Operators remain chunky, stubby and deliberately miniature.
- Body proportions, bone lengths, joint positions and IK remain locked until the user reviews them.
- Cosmetics must not change muzzle origin, weapon grips, feet, collision, damage or movement.
- The inventory and equipment ledger are the authoritative sources for carried gear.

## Implementation
- OV-00–04: Shared modular headgear, hair/face features, clothes, armor,
  chest rigs, backpacks, belts and countable carried magazine visuals.
- OV-01: Operator Lab live item selectors, isolated layers, color palettes
  and three-way light/standard/heavy comparison.
- OV-08–12: Distinct medical marking, radio hardware, flashbang hardware,
  flashlight, ram, pry bar, cutters and wedge shapes.
- OV-11: Different low-poly weapon detailing with unchanged gun sockets.
- OV-13–14: Deterministic complexion and actual campaign magazine placement
  in the shared 3D equipment preview.
- OV-15a: Separation of rear pack from armor and relocation of pouches
  to reduce intersections.
- Visual tests: operator-visual-kit, operator-equipment-details,
  operator-visual-fit and operator-weapon-detail.

## Architecture
- src/breach-operator-rig.ts remains the single shared animation and mesh assembler.
- src/operator-visual-kit.ts creates and toggles geometric wardrobe layers.
- src/operator-equipment-details.ts provides item-specific micro-silhouettes.
- src/equipment-carry-placement.ts remains the authoritative carrying ledger.
- src/equipment-catalog.ts remains the authoritative item registry.
- src/breach-weapon-pose.ts remains the weapon stock/grip alignment authority.
- Quick Play resets gameplay health and kit each round; Campaign persists
  equipment and character state.

## Art and performance review gates
1. Check front, side, rear and isometric views with light, standard and heavy kit.
2. Approve or reject candidate changes to proportions. No automatic body scaling.
3. Check clipping through run, crouch, pie, strafe, doors, reload and down.
4. Check visible carried magazines and tools match actual equipment.
5. Compare readability at default gameplay zoom on iPhone.
6. Review actual GPU performance and draw calls; unit tests cannot verify this.

This file records implementation scope, not a claim that user-side artistic
acceptance or real-device performance validation has completed.
