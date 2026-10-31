# Fieldwork breach stabilization — acceptance and ownership

## Current production architecture

The game motor owns world position, collision and true displacement. Its
60 Hz recorder owns planted foot/contact events; live, paused/planning, and
replay presentation consume these recorded motion facts. The local rig gait
scheduler is reserved as an explicit fallback for isolated laboratories.

The **distance gait is experimental, not live gameplay**. In Operator Lab
select Current, Pre-180 Reference, or Distance Gait (Experimental), then run
exactly the same tracks. The historical gait is a frozen reference, never
production execution code. Candidate promotion requires deterministic
acceptance *and* on-device inspection; code health is not evidence of a
visually natural result.

## Performance

* `?perf=1` on the battle URL displays frame p50/p95/max, fixed simulation
  steps, scene/overlay CPU slices and WebGL draw/triangle counts.
* Displayed tactical routes are cached by known intelligence, door memory,
  site identity and goals. Planning uses exact start positions; walking
  uses a local origin bin to avoid A* every rendered frame. The gameplay
  motor never trusts a cached drawn route for physical collision.
* Mobile graphics modes: `?quality=performance`, default balanced, or
  `?quality=quality`. No mode reduces IK or the authoritative 60 Hz gait.
* Fixed-step catch-up is limited to 3 ticks per presentation frame;
  pressure slows wall-clock combat rather than skipping discrete simulation
  events or running unbounded catch-up.
* Repeated floor grids use instance geometry; fog textures upload when the
  visibility inputs change.

## Verification tracks

Use the same seeded scene to inspect idle/walk/run, stop/start, repeated
180-degree turns, strafe reversal, pie at a door, squeeze between shelves,
blocked walking, simultaneous operators and replay at variable playback
speeds. Quantify contact drift, hip-to-ankle reach, step starvation, and
frame p95 before/after. Do not promote a candidate that slides, stretches,
crosses knees, freezes legs, or worsens on-device pacing.

## Fast merge gates

Every small PR needs a typechecked production build and relevant regression
tests. Full replay, rendering and worldgen suites are final integration
gates—not excuses to merge a known failure. Preserve a rollback path and
never claim mobile visual validation without inspecting a real capture.
