# Fieldwork Breach — Stage 3A: anatomy, garment fit and silhouette foundation

**Scope:** Audit and engineering foundations ONLY. No Stage 3B clothing meshes
are approved or built by this change. All headwear geometry and all 30
Camouflage 5B artwork files, along with gameplay animation, remain untouched.

## Existing baseline, measured in authoring units

| Part | Current reference | Status |
| --- | --- | --- |
| Public facing direction | -Z operator root, bridged to legacy +X animation frame | **Locked** |
| Chest assembly | Center Y 26; 10 units front–rear × 12 tall × 14 across shoulders | **Locked** |
| Hip assembly | Center Y 20.2; 8 × 5 × 12 body | **Locked** |
| Shoulders | Chest-local (1, 4, -7) and (1, 4, +7), separation 14 | **Locked** |
| Resting head origin | Chest-local (0, 10, 0); headwear independently approved | **Locked** |
| Hip joint lateral offset | ±4.8 | **Locked** |
| Leg upper and lower lengths | 11.25 each | **Locked** |
| Ankle reference | Existing planted shoe/foot scheduler, no change | **Locked** |
| Arms | Authored two-bone IK, existing neutral mannequin pose and grip contacts | **Locked** |
| Headgear | Approved fit, hair occlusion, 30 pattern artwork and material scale | **Locked** |

These numbers describe the present anatomy and base boxes. They are **not**
new idealized proportions or approval of any new clothing silhouette.
Chest-to-waist visual gap changes in gait, neutral mannequin lift and
crouch; it must be *sampled after pose*, not patched into world coordinates.

## Existing geometry and fit audit

1. **Torso and shoulder:** one core 10×12×14 body plus jacket collar/flap
   overlays or slimmer shirt details. Most selectable top variants currently
   share the same rectangular torso and arms. Their labels are more distinct
   than their model silhouettes. The main Stage 3B decision is how much
   jacket shoulder volume and sleeve weight the user wants.
2. **Head/collar:** actual helmet/cap/boonie/other headwear has a separately
   approved anatomical fit. Existing jacket collar centers at y≈5.95 in
   chest space, near the head/neck. New top shells must *yield to the
   existing head/neck clearance*; do not lift headgear to compensate.
3. **Sleeves:** upper and lower arms are independently articulated meshes,
   with variable y-length from the existing IK solver. Existing cuffs,
   patches and rolled-sleeve overlays are attached to the moving segments.
   Any future sleeve shell needs separate upper/lower cuts and a joint
   transition; never anchor cuffs only in static chest space.
4. **Belt and jacket hem:** both torso and hips move. Jacket hems are
   chest-local near y=-6, while belts are hip-local near y=-2.
   Some overlap at the waist is expected. Hem length must not be achieved
   by moving hip transforms or altering crouch clearance.
5. **Legs and knees:** thighs and shins are articulated; the knee is
   the -Y end of the *lower* segment. Both 11.25 lengths and planted
   feet are gameplay truth. Loose trousers should wrap these existing
   lengths; volume should not change reach.
6. **Boot and cuff:** the shoe geometry has an intentional forward toe
   translation, while the shoe origin remains the planted ankle point.
   Existing boot cuffs ride the shoe and are not a license to move feet.
7. **Armor + webbing:** soft vest front exterior is approximately x=6.675;
   plate carrier front exterior approximately x=7.65. The base chest front
   is x=5. A layer of cloth disappearing beneath a vest is normal;
   two coincident visible outer surfaces would cause z-fighting. Existing
   rig groups move outward by 1.15 for soft armor and 1.95 for a carrier.
   A future jacket must preserve these preexisting gear bearing planes.
8. **Packs and tool mounts:** pack root is chest-local x≈-8.2 and animated
   by the existing inertia. Front straps ride the chest; body of the pack
   rides the inertial parent. Future jacket backs must account for both,
   without editing the carry or weapon ledger.
9. **Face, hair, headwear:** the approved actual headwear selection is
   authoritative and has separate UV construction. New collar/hair geometry
   must not create an extra generic helmet shell beneath it.

## Foundation implemented

- New `src/operator-garment-fit.ts` exports existing locked anatomical
  dimensions, a material/garment layer-order policy, surface-separation
  tolerance and 19 **virtual** garment anchor references.
- Anchors are cheap `{parent,offset}` references to existing chest, hip,
  upper arm, forearm, upper leg, lower leg and shoe meshes. They introduce
  **zero new scene-graph nodes, draw calls, geometry, or idle-frame matrix
  updates**. World points are resolved only when requested.
- The common rig exposes `garmentFitAnchors`, so Stage 3B and Stage 3C
  garment shells can bind to validated attachment points.
- Operator Lab > Diagnostics > **Garment Fit Anchors** shows eight location
  markers (collar, shoulders, front/rear hems, waist and both knees) plus
  live shoulder, sleeve, hip and knee distances.
- Focused regression tests check locked references, no extra nodes,
  parent/coordinate agreement, and sampling through idle, bare mannequin,
  crouch, run, pie/strafe-style traversal, aiming, reload and fall.
- No wardrobe schema changes, no mesh redesign, no new art or camo, no
  animation/IK/footstep/weapon modifications. Existing Stage 1/2 choices
  and saves behave as before.

## Rulebook for subsequent clothing implementation

**Layer order:** skin → underlayer → outer fabric → armor textile → rig
textile → hard hardware.

**Constraints:**

- A little *hidden* body/garment interpenetration is needed for cloth
  under armor. For *exposed surfaces*, maintain at least ≈0.12 model
  units of separation when distinct surfaces overlap rather than leaving
  them coplanar. This is an initial technical z-fighting tolerance,
  not an artistic silhouette decision.
- All garment geometry is cosmetic and must follow its selected segment.
  Never change movement collision, leg/arm lengths, planted ankle,
  shoulder IK anchor, stock socket or head rest to fix a garment.
- Geometry that is not visible should not cost draw calls. Keep clothing
  separately toggleable but merge rigid same-material pieces, as the
  existing visual-kit architecture does.
- The approved Stage 2 fabric density applies per real textile panel,
  not by stretching the camouflage UV to a new sleeve width.
- Only the real equipped item can grant coverage, carrying capacity or
  protection. Clothing shells are appearance, not inventory.
- Physical iPhone review still required for silhouette and per-frame
  performance; automated unit tests are not a substitute for screenshots.

## Known unresolved visual risks, reserved for 3B / 3C

- Front jacket flap/hem and armor front may visually merge or partially
  intersect at certain sizes, especially larger PCU styles.
- Shared torso geometry means many upper-body styles remain silhouettes
  that are only cosmetically different, rather than truthful cuts.
- Rolled forearm sleeve details and patches may be too cube-like or
  awkward around elbow flexion.
- Knee panels and cargo pockets have tiny protruding box details rather
  than clothing volume; they are 3C scope.
- Boot/cuff integration and thigh-vs-holster motion are also 3C/3D scope.
- No claim is made that all combinations are physically clip-free:
  audit instrumentation and movement regression tests are a baseline
  for review, not the finished art pass.

## Stage 3B — decisions to request from the user, NOT implemented

Before building an upper-body model, present and agree the main clothing
families and their silhouette character:

1. **Historic field blouse / BDU / jungle jacket:** boxy or tapered cut,
   collar size, pocket volume, sleeve fullness, untucked hem.
2. **Modern combat shirt / ACU blouse:** knit torso vs woven sleeves,
   high/low collar, elbow reinforcements, seam placement, armor fit.
3. **Outerwear:** softshell / hooded shell / insulation bulk, closure,
   waist shaping, hood stow and visibility under headgear.
4. **Civilian layers:** T-shirt, flannel, button-ups, knit, rolled and
   short sleeves; differing volumes from genuine uniform clothing.

Ask which visual family to prototype **first** and how chunky/stubby
to make the garment envelope. Protect the already approved headgear.
Do not auto-approve a global proportion change.
