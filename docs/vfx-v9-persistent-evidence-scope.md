# V9 — persistent damage/evidence
Stacked on V8 aafee24. No new simulation or evidence authority.

## Scope and audit
- Existing authoritative impact buffer retains 64 marks, with 24 blood marks and spatial refresh. Existing cover intact/debris owners, door damage, window pane state and recorded replay evidence remain authoritative. Never create another history, inferred damage event or collision body.
- V4 ground-mark atlas and V6 settled glass are the first improved persistent evidence presentations. Keep existing cap and age policy; neither new evidence nor longer recorded mark retention is introduced here.
- Consolidate repeated settled mark uploads via exact per-slot matrix/color/style dirty flags. Re-evaluate sight, wall and actor occlusion every frame as before; changing visible subset, position, height, age, radius or surface rewrites appropriate slots. Reset on mission replacement. No new allocations per mark or draw calls.
- The first V9 integration is opt-in ?vfxEvidence=1 and is independent of the V4 appearance toggle. Tests cover independent lanes, aging/rewind, compaction and reset. Actual rendering and matrix version checks required.
- Remaining V9 art work: material-specific persistent damage masks and physically anchored wall/fixture marks only where existing recorded evidence has a valid owner and normal. Current ground evidence lacks a robust persistent surface owner; do not fake wall holes, destruction or unknown evidence. Existing geometry and debris remain unchanged. V10 must assess combined costs and release blockers.
