# Release C / C0–C3 — Tactical World foundation
Baseline main: `fcce0e437fdd6464db8cb5eb9ad5116052370155` (Pages verified at prior checkpoint).
Branch: `feature/release-c-tactical-world-c0-c3-20261113`. Product: one authoritative physically credible tactical world.

## Scope and guardrails
- **C0**: reproducible bounded 11-archetype × 3-scale site audit, measured physical quality, topology/cover metrics, generation timing; record reference corpus before altering generator choices.
- **C1**: immutable stable IDs for seed-authored physical props. Assign during final site composition, normalize legacy sites and archived replay frames without reordering; migrate new authored interactions to stable IDs with compatibility for indexed historical orders; no extra per-tick hashing, object scans only on an explicit command.
- **C2**: improve *already sampled* candidate selection using grounded topology and actual entrance/cover opportunities, but never select a less playable/incomplete site, add a third full generator retry or break deterministic seeds. Preserve existing housing, unit, ADA-reference, route and playable geometry constraints.
- **C3**: rank a finite set of existing optional functional furnishings for ballistic crouch/standing fire-back and useful sightlines, without affecting required fixtures or forcing tactical barricades. Improve room-local candidate scoring work with reuse of unchanged room data rather than unnecessary repeated scans.

Never change fixed-step motor, physical door clearance, line-of-fire authority, FOW/disclosure, actor knowledge, replay order, or mission objective truth. No new physics/AI engine. Do not claim a phone FPS result from CI runtimes.

## Test/release approach
- Per-stage feature-branch commits; focus on generator contracts, immutable world state/replay, plan order compatibility, shot effects, room sightline/ballistic audits, site quality, and production typecheck/build.
- 11 seeds (one per archetype via seed % 11), 3 scales, maximum 33 complete site audits. Baseline durations are host-relative, never compared as hardware-independent hard limits.
- Acceptance: all 33 generated without fatal errors; required mission objectives and access remain reachable, object IDs deterministic and preserved when moved/broken/replayed/restarted; no persistent increase in A* retries; bounded selection overhead and maintained visual geometry.
- R1 release checkpoint only after exact branch SHA CI succeeds, previous Pages build verified, no pending deployment. No merge-on-every-stage.
- Device visual, iPhone WebKit and long-session thermals require real on-device acceptance; a CI success cannot substitute.

## Candidate optimization hotspots
- The current topology sampler builds a fresh edge graph for both candidates every comparison and recreates room arrays when no comparison is needed.
- Furnishing iterates over all site props repeatedly for each candidate, and runs sightline and ballistic scans both before and after each candidate. Preserve geometry semantics while restricting scans to the current room and reusing invariant baseline calculations.
- Do not indiscriminately cache mutable session object rays; geometry revisions must invalidate any cached physical data.
