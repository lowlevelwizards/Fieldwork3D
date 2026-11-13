# A3.5 — physical contact anchors and shared hand ownership

**Release:** feature branch `feature/a3-5-contact-anchor-ownership`. Do not merge/deploy before a separately verified checkpoint. **Prerequisite:** A3.1–A3.4 Release 1 merged at `bf1334ef`, Pages run 43405363700 succeeded including public-build verification.

## Objective
Establish one deterministic, replay-seekable contact contract for a limb touching an actual object or another actor. A3.5 is infrastructure plus a live **door-hand** adapter, not an early implementation of A3.6 wall/cover/doorframe bracing or A3.7 teammate stacking.

## Complete scope
1. **Pure anchor:** typed target kind (door, surface, teammate), stable ID, world XYZ point, outward unit surface normal, owning limb (support/firing hand, support forearm, shoulder), contact intent (door, brace, teammate), acquisition/release times. No global mutable contact registry, Three dependency, hidden animation clock, or second physics simulation.
2. **Real physical reach:** deterministic acquisition vs retention hysteresis from actual hand/limb origin, finite position/normal checks, optional authoritative line-of-reach/occlusion predicate; reject unreachable/invalid candidates. Deliberate actor contact will be enabled in A3.7, static bracing in A3.6. Targets may never grant movement, ballistic clearance, or a change to planned orders.
3. **Conflict arbitration:** no limb has two simultaneous anchors; existing action-window ownership remains supreme (down/surrender, treatment, reload, throw, push, injury, door). For equally valid requests, prefer a retained contact before reacquiring, otherwise a fixed priority and ID tie-break. Incompatible actions suppress and release the presentation contact, never steal an arm from a higher-priority action.
4. **Deterministic release:** a one-time acquire timestamp, fixed and bounded smooth reach/release weights evaluated at session/replay seconds; finite releasedAt and cleanup contract. A pause does not advance a contact, time-seeking reconstructs the same result without accumulated rig history.
5. **First integration:** adapt existing D4 motor-owned door-hand contact to the generalized typed anchor, with leaf-derived normal and current world point; maintain D4 hinge pressure, physical reach, cancellation, and replay authority unchanged. Feed the same resolved contact into the *existing* support-arm IK and one pose-output commit. Preserve legacy door animation where no durable contact exists.
6. **Inspection and QA:** Physicality Lab exposes the physical door anchor and ownership alongside existing door contact and hand/motor diagnostics. Tests cover object/actor anchor geometry, acquisition/retention hysteresis, action conflict, two simultaneous candidate arbitration, release and same-time replay seeking; D4 door reach, pose, and gameplay regressions, typecheck/build, browser Physicality Lab smoke.

## Boundaries
- **A3.6** will select actual surfaces and implement reachable wall/cover/doorframe bracing, weapon/arm pivot and release.
- **A3.7** will select consent/geometry-safe teammate shoulder contacts during stacking.
- **A3.8+** lockpick and kick choreography; **A3.11+** traversal and anticipation.
- This stage does not invent physics, let wrists traverse walls, alter friend/civilian fire safety, drive actors by IK, create new shot permissions, or change 60 Hz locomotion/footstep ownership.
