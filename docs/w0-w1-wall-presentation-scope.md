# W0–W1: architectural presentation foundation

Base: 6644f06ba4fc4c74a8ff653b873714c1898d9249 (consolidated VFX). W2–W8 are deliberately excluded.

## W0 — baseline and contract
- Existing E6.19 software WebGL evidence (V10 predecessor 689a35f, job 138683714158, 90 frames each): seeds 23/97, total draw p95 973/1330, known-exterior walls 87/93 draws per frame, wall weathering 68/88, exterior detail 78/70, (use raw artifacts for timing). Existing profiler measures CPU/driver wall time, not physical GPU. These are historical reference counts, not exact-current-base A/B.
- Ownership audit: generated segment has body, skirting and cap in one disclosure group, cap junctions under an assigned wall, wall patina as child, local wear decals; legacy layout uses flat meshes. Existing wall loop repeats LOS/cut and knowledge queries per component. Existing depthWrite changes only on transparent flag transition, invalid when a known façade stays transparent while cutting or restoring. Legacy/shared materials and cap junctions require independent ownership.
- Preserve existing spatialSurfaceKnown, fog textures, discovery, actor/prop gates, replay personal evidence, floor/roof/door/window state, physical walls and collision. True-blind unknown geometry stays hidden in tactical view; exterior-known shows authorized shell; floor-plan/full-view retain their respective authorization; camera cuts never grant knowledge. Physical director/bodycam retains structural occluders without exposing unauthorized actors/props. Repeated generated missions must reset segment history.
- Baseline verification: existing fog/disclosure, camera cutaway, cap geometry, scene lifetime, E6.19 transparency-role and browser suites. Capture exact-base and candidate in matching browser scenarios (seeds 23/97, tactical and replay, phone/desktop where supported); compare draw/texture/material counts, cut transitions and screenshots. A future W2 performance goal is not an artificial W1 draw reduction gate.

## W1 — segment presentation state
- Compile a stable segment registry once per site composition; body/skirting/cap and assigned cap junction share one camera fade and known-façade resolution. Keep flat mesh inventory for diagnostics and existing disposal. Do not merge geometry yet.
- Resolve cut/opacity once per segment; preserve normal easing, xray target, Director orthographic immediate fade and bodycam opaque restoration. Hidden state continues to be governed by existing parent disclosure.
- Derive transparent, depthWrite, renderOrder and transparency role independently; restore depth writing for solid known façades even if transparent stays true. Avoid shader recompilation for depth-write-only updates.
- Keep patina opacity formula and current texture/layer ordering. Isolate any shared structural material before changing presentation state. Do not alter local wear decals or façade detail ordering in W1; later compositing/pass work owns them.
- Reset registry and fade on site swap. No new simulation state, geometry topology, collision, texture generation or knowledge mutation.
- Tests: grouping and independent segment state; camera modes and fade restoration; known facade false/true cut/recover with unchanged transparent flag; patina opacity parity; reset; existing fog and replay regression suites. Verify full production build and exact browser evidence before merging; previously deferred unrelated absolute movement/worldgen failures remain visible and must not be mistaken for W1 regressions. Do not lower thresholds.

## Deferred
W2 surface compositing, W3 atlas/face-specific art, W4 geometry batching, W5 fog pass reconstruction, W6 art, W7 floor/wear, W8 combined acceptance. No deployment claim until exact main build is verified.
