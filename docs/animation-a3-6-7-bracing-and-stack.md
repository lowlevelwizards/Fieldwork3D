# A3.6–A3.7 — physical bracing and teammate shoulder contact

**Base:** A3.5 merged at `6d92448a`. **Release:** staged commits on `feature/a3-6-7-bracing-and-team-contacts`; one combined release checkpoint, no overlapping Pages deployment. Existing `PhysicalContact`, pose ownership and support-hand IK are authoritative. No new interaction button, muzzle solver or physics controller.

## A3.6 — Environmental bracing: complete scope

1. **Selection:** fixed-step, deterministic nearby static wall segment, solid cover **face** (only extant, non-toppled eligible obstacles with a genuine reachable surface), and physical doorway **frame endpoint**. A normal points from real contact toward the bracing actor. Stable object identity includes surface category/index; bound point and height are recorded.
2. **Physicality:** world units x/z plane and y elevation. Reach from the actor's actual approximate support-side shoulder envelope (never a fake teleport from the center), bounded acquire/release radii, facing/hand-side limits, real static/cover/door LOS. No reaching through a shut door, room wall, furniture or across someone else. Surface contact cannot relocate the actor or affect shots.
3. **Action precedence:** one support-hand anchor only; active/releasing D4 door attachment, injury, fire, reload, medical, grenade, lockpick, sprint, vault, squeeze, melee or explicit authored motion wins. A brief stationary high/low-ready or watch hold with real free space can brace; no bracing during action clashes. No new perpetual idle limb oscillation.
4. **Time & pose:** single simulation-ticked acquisition/release with hysteresis and stable selection; preserve start time while surface geometry and operator are stable. Existing pose director/IK uses a world target and smooth weights. Firing hand and rigid gun/stock/muzzle are unchanged. Weapon front never becomes an anchor; keeping a support hand on a wall is visibly different from an unbraced rifle hold.
5. **Continuity:** moving away, obstruction, surface destruction, look-away, action changes and death cause release; no repeated acquisition during release interval. Replay stores the contact, including target and start/release time; old saves and missing anchors are safe. Physicality Lab shows kind, normal, attachment and release.

**A3.6 acceptance:** reachable brace at wall, cover and doorframe; no contact through walls/doors, no phantom reach, no arm snap/stuck support grip, no plan, collision, friendly fire or footstep changes. Reproducible 60-Hz contact timelines, same-time seek, typecheck/build and mobile/desktop live browser.

## A3.7 — Teammate shoulder support: complete scope

1. **Selection:** strictly living same-side leader ahead at a believable shoulder distance and similar heading, when follower is in genuine low-speed stack/high-ready context. Attach to the leader's *real, posture-adjusted rear shoulder*, not its center; stable target identity is the leader actor ID. Opposing actors, civilians, dead/hidden/unknown contacts and a teammate behind never qualify.
2. **Safety:** the follower's hand has a reachable physical path, no world/door/cover occlusion and no remote dragging. Teammates are not moved, disabled or made into collision blockers by the hand. Shooting geometry and height-aware clearance from A3.1–A3.4 are unchanged. Do not infer or share contact/target awareness through touch.
3. **Cooperation:** moving, turning away, diverging posture, entering a doorway, reacting to a threat, acting, sprinting or losing proximity releases smoothly. The leader's own hands/weapon/pose remain unchanged. Contact may not compete with an existing door or environmental brace; one actor owns at most one support contact.
4. **Animation:** follower's support hand leaves high-ready grip, travels to and follows leader's moving shoulder with the existing two-bone solver, then blends back. No second rig controller, no moving rifle to fit hand, no body shove and no hidden animation clock.
5. **Replay and inspection:** record target leader, true world point and normal and release; preserve backward seek and old film compatibility. Real-session A3 lab adds seeded aligned/misaligned/too-far/occluded/advancing stack conditions and readable anchor diagnostics.

**A3.7 acceptance:** stable aligned four-person stack follows actual teammate shoulder without double ownership; prompt release in all unsafe/competing actions; no enemy/civilian anchor, through-wall contact, stuck arm, pose discontinuity or moving contacts that displace the motor; deterministic fixed ticks, replay and browser/CI gates pass.

## Release gate
Stage A3.6 code + focused tests first, commit; A3.7 code + focused tests second, commit; integration/replay/lab CI third. Run only critical simulation, pose, door, fire-safety, replay, TypeScript/build and mobile/desktop browser smoke. Merge once all selected latest-head tests pass, current Pages has the preceding release verified on public site, no release running, and no concurrent main update. Verify public served-build stamp after merge. Otherwise leave PR open and document the specific blocker.
