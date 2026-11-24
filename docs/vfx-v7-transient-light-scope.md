# V7 — transient illumination
Stacked on V6 head 1b89f3d. Default renderer unchanged.

## Scope and initial integration
- Actual material illumination from recorded muzzle events and flash bursts; retain existing visual cue meshes, damage/flash effects and gameplay clocks.
- Fixed two scene-owned, shadowless point lights (one muzzle, one flash). No shadow maps, draw meshes, per-event creation or light-count churn. Deterministic strongest eligible pulse per channel; age-derived quadratic decay, hard expiry, reset and replay rewind. Source is recorded shot muzzle, not speculative current pose.
- Use current actor and event disclosure; disable personal replay until observer-specific evidence exists. No new knowledge, no hidden-source illumination. Existing flash visual remains authoritative; user-requested around-corner indication needs a separately designed non-positional cue.
- Critical caveat: shadowless point lights can illuminate through walls and cost shader work even at zero intensity. Compare idle and active WebGL costs, verify wall bleed, inspect scene-lit materials including operator shader paths. Do not enable by default unless a wall-safe bounded approach and net performance are demonstrated. If direct point lights are unacceptable, prefer room-scoped shader attenuation or other bounded solution rather than enabling shadow passes.
- Opt-in ?vfxLights=1 integrated. Focused tests cover decay, source selection, constant count, resets. Actual browser shader, wall-disclosure and representative stress acceptance pending.
