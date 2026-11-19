# EQA3.10 · Civilian encounter reaction + physical restraints

**Feature branch:** `feature/eqa3-10-civilian-contact-20261119`. Forked from verified 19 Nov Pages `3f1cdfc`. Two stages committed in rolling sequence; no main merge until targeted critical CI succeeds, prior deployment is verified, and Pages public build is checked.

## R · brief alarm flinch, independently reproducible
- A civilian's low-frequency sensory observer timestamps `lastFlinchAt` only when a new, genuinely audible alarm or newly confirmed armed threat is perceived. Routine sightings and unknown enemy intent are not triggers; no new simulation authority is introduced.
- Shared operator-skeleton civilians use the existing head-cover gesture + short knee bend for <0.48 s. Legacy rig hunches/raises arms; overhead 2D indicates hands shielding head. Full running gait and all civilian state transitions remain under existing logic. The transition expires cleanly and can replay backwards.
- The legacy standing/working/seated head tracking previously overwritten an actual evidence-based gaze with idle sway; the small idle motion is now additive to witnessed head direction.
- Film snapshots preserve the observed flinch timestamp. Old replay samples default to no flinch; no omniscient sight changes.

## Z · finite RESTRAIN, not conflated with SECURE
- The shared physical carry catalog now includes `zip-tie`: one flex-cuff pair per unit, 0.03 kg, one carry space, up to six per operator; no automatic issue on existing kits.
- Quick Play and Campaign loadout editors already use the shared field inventory. Deploy copies the actually issued count into `TeamActor.restraintRemaining` just as it does for other finite tactical consumables. Consumption is in the tactical count on GO, not a fictional inventory render side-effect. Each mission can use at most the quantity it started with; no ghost restocks mid-mission. Persistent campaign requisition/stock accounting is a **separate later pass**.
- Contextual RESTRAIN appears only when a personally reachable, **already compliant, unrestrained non-rescue** civilian is present, and the selected operator has remaining cuffs. It uses the same 28-unit auto-turn and 34-unit disclosed physical-contact geometry checks.
- A new explicit `restrain-civilian` order is authored only in planning. GO rechecks actual reach, clearance, person state, and remaining issued count; real motor turns the operator, plays a short hand-contact animation, waits ~1.15 s within reach, and then consumes **exactly one** cuff while marking that civilian's existing recorded `restrained` flag.
- SECURE alone never applies cuffs. Rescue targets cannot be tied; FOLLOW, emergency aid, extraction and mission outcome are otherwise untouched. Running out of stock, losing line of contact, injury or invalid compliance cancels the order without consuming a cuff.
- Existing restrained hands-behind-back kneeling poses are used in 2D, legacy 3D and shared 3D with film-rewind parity.

## Focused release gates
1. TypeScript `npm run check`.
2. EQA3.10 audio evidence, 2D/legacy/unified pose, deterministic replay checks.
3. EQA3.10 inventory/physical GO one-charge RESTRAIN, zero-stock refusal, blocked wall, rescue safeguard, contextual palette tests.
4. EQA3.9 auto SECURE and civilian pose/film, EQA3.7 contact selection, legacy R2 and C5 response, core inventory and contextual C4 tests.
5. Feature branch only until green; confirm latest Pages main deployment succeeds before one release-batch merge; verify public build after.

## Next stage, separately from this batch
Improve actual civilian encounter outcomes under fire and near crowded doorways, then expose rescued / unrestrained / restrained / escorted distinctions in a compact debrief. Measure whole missions rather than adding a new AI layer.
