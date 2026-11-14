# D2.4 — Stationary contact, cover-height and pose-seam consolidation

**Source baseline:** production-verified main `d40d95fd5d4b5f32b809490779081b39029066a2` (Pages workflow 43537661572 completed with exact public served-build verification).
**Branch:** `feature/d2-4-contact-cover-pose-20261113`. Stage each compatible change here; do not merge until latest-head critical acceptance and a verified deployment checkpoint.

## Source ownership map
- `breach-game.ts`: one fixed `contacts` phase after authoritative motion, before reports and combat, calls close-contact, `advanceCoverStances`, `advanceContextualSupportContacts`.
- `breach-world-context.ts`: existing Session-scoped revision-aware wall/cover index and real `isClear` (doors and cover included). Do not cache its results across mutable positions, doors or revisions.
- `breach-contextual-support-contact.ts`: deterministic near-wall / cover / frame / aligned ally candidates, with action precedence, attached contact timestamps and fixed release. Candidate LOS was evaluated before `contactWithinReach`; one-element arbitration made a temporary array.
- `breach-cover-stance.ts`: real nearby cover face + actual `coverHeight`, authored stand/crouch bands, fixed-tick bounded drop and replay, but eagerly obtains world geometry even if ineligible.
- `breach-pose-contacts.ts` + `breach-pose-action-state.ts`: one action and hand owner policy, though simulation and rendering assemble the source facts slightly differently.
- `breach-3d.ts`: interpolated visual muzzle/clearance and per-rig `poseOperator`, distinct from shot-time collision; visible actor roster scans should only be consolidated with exact parity evidence.
- `breach-operator-pose-output.ts`: 30 slots, six stage owners, one atomic pose commit; Package B scratch already handles major avoidable temporary quaternion allocation.

## Stage scope
### D2.4.0 — Reproducible evidence and boundaries
Document the current code's data, safety, replay and actual physical query ownership. Add focused test instrumentation which counts attempted visibility probes on geometrically impossible contact candidates. No default-on per-tick profiler or new subsystem.

### D2.4.1 — Fail-fast contact and arbitration (low behavior risk)
- Validate physical reach, facing and anchor identity before `world.isClear`; perform EXACT same final real occlusion veto for candidates that could attach.
- Reuse hand origin/forward orientation where applicable instead of repeating it for each wall/cover/frame.
- Fast path the single-candidate arbitration without filter/sort or a disposable `[candidate]` list.
- Only look up SessionWorldGeometry after a qualifying actor's tool/active/release gating.
- Preserve the previous candidate order, minimum score, retained priority, start and release timestamps.

### D2.4.2 — Cover and shoulder-source alignment
- Fetch world/index only for actors eligible for cover stance; avoid sin/cos and sqrt for failing candidates where exact same classification is provable.
- Make teammate support Y follow the leader's already-recorded `coverStanceDrop`, with exact original Y when absent/zero. Do not change posture, physical collision or aim/eye/muzzle source.
- Never cache a speculative cover face across movement, changed doors, destroyed/moved cover or replay restore.

### D2.4.3 — Action/contact seam clarity
- Reconcile action evidence at the source, not by adding a separate hand owner, new animation clock or second contact solver.
- Preserve explicit door/lockpick, throw, reload, treatment and injury action precedence.
- Verify same-timestamp replay, unavailable old fields and gear variants.

### D2.4.4 — Measured pose/readiness cleanup
- Benchmark 2/8/16 rigs with existing B8 harness, count side-actor scans and scene pose calls.
- Only remove proven redundant visual-frame allocations; do not reuse fixed-tick muzzle clearance for interpolation, or edit final shot/friendly/civilian safety.
- No rewrite of 1289-line pose controller or 30-slot output unless a separately reproduced hotspot requires it.

### D2.4.5 — Integrated checkpoint
- Critical A3.5–A3.9 contacts, B2/B8 six-owner output and replay, D2.1–D2.3, D1 crossing, R7 four-person firefights, production TypeScript/build and available browser labs.
- Count candidate visibility probes before/after in identical seeded cases; same selection and output fingerprints except intentional shoulder-height enhancement.
- No unqualified mobile FPS/thermal claim from Node CPU timings.
- Verify preceding GitHub Pages run was successful and publicly served exact main SHA. Merge only one logical release batch when latest-head checks succeed; then verify the exact new public Pages build.

## Non-negotiable invariants
- One 60Hz simulation, one motor, one physical cover height, one hand owner resolver, one B2 pose commit.
- Never make contact confer shot permission, locomotion, peer movement or hidden threat knowledge.
- No additional continuous LOS queries, cached cross-tick occlusion, fixed-tick/render-time conflation, authored posture changes, or historical replay reinterpretation.
