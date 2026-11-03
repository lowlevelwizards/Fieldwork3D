# Armor & chest-rig shape bible — Release A
Build intent: visual identities must read from the normal isometric gameplay camera, using existing solid boxes and physical camo UV scale. No new combat capabilities, body mass, ammo, or armor stats follow automatically from a wardrobe choice.

## Archetype silhouettes
| ID | Shoulder | Front/bags | Side/back | Identity |
|---|---|---|---|---|
| soft-vest | wide flat soft shoulder | full broad front, low continuous hem | wraparound sides, ID strip | police/external soft protection |
| plate-standard | paired medium straps | medium chest plate bag, distinct lower edge | continuous side cummerbund | modern general-purpose carrier |
| plate-jpc | narrow open straps | cropped smaller plate bags | open/skeletonized sides | light carrier |
| plate-legacy | raised shoulder/collar | long, wide slab with center storm closure | deep wraparound side coverage | older conventional military |
| chest-placard | minimal attachment straps | three separate adjacent tall empty pouch cells | no full harness | placard |
| micro-rig | narrow harness | short compact organizer | side utility pods | modern compact harness |
| light-rig | large X straps | two banks of medium cargo | back crossed straps | classic chest rig |
| split-front | wide shoulder harness | two visibly separated pouch banks | open center, side extensions | split-front field rig |

## Absolute conventions
- Positive local X is front, +/-Z are operator left/right, +Y up.
- Existing shirt torso and IK remain unchanged; no new colliders.
- Author complete armor shells; hide old common shells for wardrobe looks.
- Rig surface offsets depend on selected shell, not scale of body parts.
- Functional magazines remain authoritative and don't become ammunition merely by modeling a pouch.
- Box-only large primary forms, ≤ 2 supporting form lines per identity, no sub-voxel clutter.
- Test 3/4, front, side, back and gameplay-distance preview; grayscale identities first.
- Distinguish styles by width/height/projection/shoulder/side coverage and pouch map, not brand decals.

## Release checkpoint policy
Stages: reference/identity spec -> new armor geometry -> rig geometry -> mounting/functional integration -> mobile visual and regression gate.
Commit each stage on feature branch. No merges while Pages is running; verify production Pages hash after merge.
