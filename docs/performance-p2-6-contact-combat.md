# P2.6 — Protect active contact and gunfire frames

## Priority reset (iPhone reports, November 12 2026)

User explicitly prioritizes frame-time spikes **during active threat contact
and combat** over mission first-load time. Do not spend the next release
optimizing a 900ms one-time wardrobe build during mission preparation.

Latest live capture: 763 live callbacks, 87 intervals >=33ms and one
>=67ms (max 106ms) in a one-minute report, while idle intervals had
large unconfirmed between-callback waits. The user reports particularly
noticeable stutters when discovering hostiles and exchanging shots.
These are subjective symptoms; existing reports do not yet prove their
precise cause or measure GPU time.

## Source-proven active-frame work to eliminate

1. `TacticalScene3D.update` previously skipped an unseen actor with no
   rig, then called `this.soldier(actor)` and the full first
   `poseOperator` **on the first frame where that hostile was disclosed**.
   This includes cold wardrobe/cross-gear baking (previously measured
   ~350–388ms for four first-use operators), firearm geometry and material
   composition. It is not just a mission-load hitch: enemy first contact
   can coincide with this CPU path.

   **Change:** During initial planning, before GO, pre-construct and pose
   *hidden* hostile rigs, including graphic material preparation. Leave
   `root.visible=false`, status, weapon light beam, and ground-contact
   shadows hidden until the original `presentActor` disclosure permits
   display. Replays and in-progress new spawns still follow the existing
   lazy policy. No fog, target selection, or actor state is modified.

   Tradeoff: first planning frame and baseline memory can increase in
   large encounters; deliberate shift away from a more costly combat reveal.

2. Every visible shot created an entirely new mesh group plus
   2 unique materials and up to 4 chips; expiry disposed those
   resources during sustained automatic fire. Unlike authoritative shot
   resolution, those objects are presentation-only.

   **Change:** Recycle completed shot visuals by exact
   `side|surface` style, capped at 20 spare effects. Reset and dispose
   all spares during site replacement. No cross-style material reuse:
   trace color, impact material and chip counts are unchanged. Visibility
   and the 20-active-shot cap remain identical; hit/casualty/ballistics
   and event histories are not touched.

## Important regressions

- An enemy leaving sight must hide independent world-space contact
  shadows and weapon light beams, not only their character root.
- Personal/historical replay never builds hidden truth based on current
  live enemy roster.
- A previously hidden rig/weapon is fully prepared and reuses its
  appearance key on first contact.
- A recycled shot visual must be same-side, same-surface, bounded in
  memory, and fully cleaned at mission transitions.

## Release & next acceptance test

Critical animation, 3D disclosure, combat effects, deterministic
simulation, mobile WebGL, and full build tests; a safe production
checkpoint with exact Pages hash verification. No FPS claim without
matching device and seed tests.

For the next iPhone test, gather 20–30s of live movement **with a
deliberate first enemy reveal and shooting** and compare live
>=33/67ms rates, top prior SIM phases, 3D actors (rig/pose/app)
and 3D effects CPU, not unrelated idle waits. A perfect first-load
benchmark does not constitute success.
