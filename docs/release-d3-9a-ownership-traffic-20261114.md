# D3.9A — early single-opener ownership and safe traffic

Feature branch: `feature/d3-9-clean-single-opener-20261114`. Base candidate: `375c64bc33ee18757cf969e00bc617ef12ca26d5`. Draft, not deployed.

## Authority
- The current real hinge motor remains the only source of leaf motion and full-body collision.
- One eligible BLUE operator manipulates a contested hinged door before a partial-swing jam. An already-held panel wins; actionable explicit OPEN/KICK follows; otherwise the nearest physically reachable crossing candidate wins, with ID tie-break.
- Solo interaction remains the legacy ordinary path (no unnecessary lease).
- The opener lease is not a passage lease. Safe follower footsteps continue using the existing passage coordinator, motor and collision; no non-owner emits a second OPEN or incidental hinge pressure.
- Explicit CLOSE and HOLD remain authored interactions; locked/held/wedged/jammed leaves do not gain any new opening permission.
- Ownership releases on operation completion, invalidated or canceled implicit orders, or bounded post-explicit-opening continuity.
- D3.9B owns continuous support-hand pivot and forward/backward footwork redesign. D3.9A keeps existing bounded self-clearance, deliberately avoiding a second movement controller.

## Acceptance
Frozen 11 sites × 2 modes × 1500 ticks: compare physical operators (baseline 54/88), physically completed squads (8/22), warehouse 31123 authored MOVE (4/4), door flips (69), stall episodes (13), queue seconds (12.94), full-radius physics violations (0), corrupted authored orders (0), and any per-building regression.

Critical focused test, R7 generated-site acceptance, D1/D2/D4/D5, Q3/Q4, TypeScript and Vite build are required. **Do not merge to main on a nonarrival regression or unverified full corpus.**
