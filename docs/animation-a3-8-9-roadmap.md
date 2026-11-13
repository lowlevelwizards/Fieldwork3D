# Animation A3.8–A3.9 — implementation contract and staged release

Base main: `279efcb9100ae98ebcb85a41a115623b9769b5dc` (Pages public verification passed, run 43432050816). Feature branch: `feature/animation-a3-8-a3-9-physicality`. This scope refines the approved A3.8/A3.9 concept; ship only complete, independently checked stages. Do not merge while another Pages production run is queued/running.

## A3.8-T — Deterministic clearance-aware 180-degree turns
- Keep ordinary shortest rotation. Near exact 180°, sample real nearby wall/cover/leaf and boot-corridor clearance on both sides from the actual actor and motor-world geometry. No inferred knowledge or teleport.
- Resolve a near-tie to a more viable pivot side. Commit direction for the episode until reaching the target or significant retargeting; do not choose a new direction each 60-Hz tick. Enforce finite wrapped angles and deterministic tie breaking.
- Use original actor rotational motor; footstep scheduler remains sole foot-contact writer and body/pelvis hierarchy stays anatomical. Do not modify a planned route or fire permission.
- Verify ±179°, exact 180°, ±181°, busy open leaves, constrained left/right corridor, WATCH retarget, opponent/civilian proximity and rewind. Check no longer-than-needed direction for unambiguous turns.

## A3.8-L — Actual door lock/tool manipulation
- Use the existing tool order's genuine door/handle-side reach and duration. Add typed action-contact claim for actual keyway, held and released by simulation clock.
- Render tool hand movement through the existing IK; no independent motion engine, hand through wall, invented tool, early unlock, shortened action or role ownership conflict.
- Action phases: settle, retrieve, reach, stabilize, manipulate, finish/release. Real interruption (wound, movement, blocked door), opposing side, missing tool, etc. abort cleanly.
- Visual pose sampled from immutable replay frame with the exact real tool and door geometry. Older films remain safe.

## A3.9-H — Continuous cover-aware stance height, operator + stationary defender
- Establish single effective cover-top authority (respect `topHeight`, fixture catalog, toppled state) before offering a hand rest. Exclude unusable walls/cover and low items; height is real world units.
- Preserve user-authored `stand` and `crouch` as hard posture bands, with small overlap near medium height. Never silently change the command. No moving/running/squeezing/vaulting auto posture.
- Fixed-step, replayable height choice with bounded dwell hysteresis, based on truly nearby real cover surface and a legitimate observed/known threat or static defensive position. AI may not learn enemies from proximity.
- Animated knee/pelvis/chest and foot/IK reach match committed height. Eye/aim/muzzle and protective body volume must use the same tactical height when this goes live; no visual-only permission to shoot through cover or friendlies.
- Explicit priority: authored posture > emergency safety > temporary A3.3 teammate lane lower stance > local cover-adjustment within current band. Return to normal on departure/interrupt.
- Diagnostic matrix: short desk, table, counter, tall shelf, water cooler, low wall, occluded fixture, standing/crouched, stationary defender, moving unit, adjacent friendlies.

## A3.9-K — Door kick weight transfer
- Keep existing authoritative kick (.76s and real fixed-tick .53 impact fraction) and D4 door leaf/collision solver. Reuse it to drive real target foot contact.
- Feet: viable support-foot selection, chamber, extension, exact leaf impact, follow-through based on outcome, physical replant and repeat cycle. No shoe teleport through static obstacles or from missing clearance.
- Preserve weapon/arm ownership, no unearned kick impulse, no obstacle bypass, replay seek safety, mobile/desktop real scene.
- Tests cover inward/outward, both hinges, open/closed/blocked leaves, resistant door, repeated kicks, teammate on the other side, tight support foot and no stomp through furniture.

## Checkpoints
1. Complete A3.8-T and its pure + live-turn regression. Stage commit and verify.
2. Complete A3.8-L and its door, action and replay regression. Stage commit and verify. Merge A3.8 at release checkpoint only if all checks green and previous public Pages verified.
3. Complete A3.9-H and tactical/silhouette/pose integration; stage commit and verify.
4. Complete A3.9-K; run consolidated critical simulation/pose/door/browser gate; deploy at verified logical release checkpoint. Incomplete stages remain on feature branch and PR and must not be described as deployed.
