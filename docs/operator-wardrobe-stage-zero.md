# Operator Wardrobe Stage 0: Lab foundation

Completed: bare-on-start Lab and UNEQUIP ALL (minimal underlayer, no
visible firearm, helmet, armor, rig, belt, footwear, pack, gloves, tools,
magazines or consumables). Campaign/Quick Play default equipment unchanged.

One selector per actual item in the Lab. Selecting an individual appearance
also changes its underlying authoritative equipment class, removing the
duplicate "generic helmet" and "specific helmet" steps from this editor.
Legacy saved kit and wardrobe records remain readable.

Inspect: show all, hide selected group, isolate group, frame selected group,
pin current appearance as reference, compare pinned/current side-by-side.
The live head, shoulder, chest, hand, hip, knee, foot, backpack anchors
derive from current operator transforms. Knee anchor is the true shared IK
leg joint. No animation skeleton, feet IK, weapon contact, hitbox, or
physical proportions were changed.

Not covered in Stage 0: redesign of individual helmets, carriers, gloves,
camo patterns, clothes, knee pad models, backpacks or specialist gear.
Existing 3-kit and 6-pose comparison tools remain.

Device review checklist:
- Empty and relaxed operator appears on initial Lab entry
- Unequip All removes every visible selected item, including the gun
- Item selection updates kit and visible model without a second selector
- Show/hide/isolation includes all legacy and new nested accessory layers
- Head, hands, knees and feet camera targets frame the right body locations
- Pin Reference and Compare A/B present two actual outfit combinations
- Saving/reloading a bare outfit stays unarmed
- No changes to Campaign/Quick Play item ownership/reset rules
- No mobile rendering or performance regression

A merged commit does not certify a successful build or device rendering.
Stop before Stage 1 until the user's visual review.
