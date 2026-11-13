# Q3–Q4 · Continuous passage convoy and leaf-aware staging

Base: Q0–Q2 release 7720d8f. One coordinator owns GO-time per-threshold ranks; every collision still runs through the existing motor.

## Q3 — Flow and crossing numbers
- Preserve stable per-door/per-side GO-time sequence, actual 20-unit body-center gap, and bounded fractional forward steps. No artificial WAIT between members, distant-waypoint reservation, or arbitrary reordering.
- In planning Floor Plan and 3D projected tactical overlays, render subdued rank badges ONLY for actual planned threshold crossings. Ranks reset independently at each door, including multiple thresholds on a single plan.
- During running reuse immutable GO schedule; during planning cache known-route crossing predictions by authored order signature. No route searches on each RAF, hidden-world knowledge, replay numbering, or permanent operator labels.
- Keep existing node numbering, LOOK/WATCH, and authoring unchanged.

## Q4 — Physical door staging and bounded footwork
- Detect outward-opening hinge leaf sweep, preserve Q2 authored STACK staging, and give separately authored waiting MOVE operators a single bounded, physically verified local correction when they are actually in the opening leaf's sweep.
- Remember the correction target for the episode; no fresh backwards or lateral target every tick, no teleport, solid collision or hinge bypass. If no legal correction exists, wait and let the real hinge stop.
- Retain genuine door push/open-more, hand contact, D2 leaf-tip bypass, and regular world collision.
- Clear correction ownership on throat entry, schedule reset, and final crossing.

## Acceptance
- Unit: multi-door ranks, no non-crossing/replay markers, preview cache reuse, zero-drift holds, legal bounded correction, no correction if blocked, four-body flow, WAIT, counterflow.
- Session: D0–D6, four independent MOVE and generated squad entry on handed hinges, paired leaves, locks, opening/pushing, 11 generated sites, mobile performance instrumentation.
- Production: all critical CI green; verify no ongoing Pages deployment, merge at one release checkpoint, verify public Pages build fingerprint. Q5 long-horizon corpus is distinct.
