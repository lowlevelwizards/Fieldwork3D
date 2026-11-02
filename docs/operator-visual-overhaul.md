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

## OV-24–34 refinement and release acceptance
- Distinct field jacket, light shirt, soft vest, carrier, light rig and webbing.
- Explicit armor-to-webbing separation and alternative full rig arrangement;
  this prevents many overlapping and nearly coplanar surfaces.
- Real day/field bag geometry attached to the inertial pack node: no common
  square brick underneath both choices.
- Optional blank/quiet/graphic face treatments in Operator Lab, three compact
  hair silhouettes, stable subdued uniform palettes and sleeve patches.
- Full-webbing extra magazines wrapped around the torso rather than an
  intersecting second row; redundant decorative pouches are suppressed.
- Medical pouch transfers to a hand-held treatment visual, radio follows
  its actual assigned carry socket, and weapon receiver silhouettes vary.
- Field boots/light footwear have separate accent geometry while planted
  ankle geometry and movement remain unchanged.
- Rear and gameplay-distance Operator Lab views with renderer draw-call and
  triangle counts; focused automated visual-choice consistency checks.

Remaining acceptance is user-side artistic review and physical-device
performance inspection. No body-proportion changes have been approved or
silently introduced. The following systems are explicitly unchanged:
authoritative movement, hitboxes, door interaction rules, shot origin,
foot IK, weapon hand sockets, animation times, campaign and Quick Play rules.
