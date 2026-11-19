# EQA3.9: SECURE auto-facing and civilian reactive animation

## Actual original failure and retained A/B evidence

Warehouse17 RESCUE / UNKNOWN SERVICE discovered the civilian at **23.83 seconds** and MOSS physically arrived 4.91 units away, but the original SECURE logic required live forward-cone visibility both when queuing and when executing. The person remained frozen behind the operator. Earlier audit [run #44455114182](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44455114182) confirmed an ordinary LOOK order toward an already discovered position converted this case from stuck through 110 seconds into a **55.07-second physical extraction**. Thus the search route, mission objective and escort collision were not root causes.

## Revised player request: SECURE is the complete interaction

**No separate LOOK TO PERSON palette button**. For both SECURE and FOLLOW:
- The shared contextual candidate selector and direct plan authoring accept a *living, physically clear* civilian up to **28 world units** away regardless of whether they are behind the operator's current facing cone. At **28–34** units, ordinary true live visual acquisition remains required. Never bypass a wall or closed door.
- Actual GO execution rechecks the person's real health, live position, distance and swept world geometry. A civilian who shuffles just behind the operator can be pursued over a bounded 28–45 unit correction while still physically clear; no teleport or automatic civilian control.
- An eligible operator **turns toward the actual nearby person** via the existing authoritative fixed-tick `rotate` and completes only after facing them. The normal `canSecureRescuePerson` range and physical sightline still apply to rescue targets.
- A successful GO interaction stamps `lastCivilianContactAt`. The already-shared operator animation system briefly extends the support hand in a calm reassurance gesture (~0.64 seconds, render-only). Aligned one-tick SECURE/FOLLOW remain responsive, and mere proximity never causes compliance or custody. Civilian contact never changes ballistic aim or shot authority.
- Earlier `LOOK TO PERSON` prototype code, palette, dispatcher and tests were deliberately removed from the branch.

## Civilian animation: reuse shared 3D operator rig, no second skeleton

- Existing **startled** maps to hands raised high. Civilian response still determines when an actual witnessed gun/sound produces that state.
- Actual **fleeing movement** retains run leg gait, with arms covering the head. If temporarily stalled while fleeing, civilian remains visibly startled, never calm.
- **frozen or stationary hiding** uses existing low crouch with both hands protecting the head.
- **compliant** enters immediately at the real GO-time contact, but the animation begins hands-up, then lowers into its existing kneeling/surrender pose over ~1.2 seconds. The state remains authoritative and rescue progress is not postponed by a visual animation.
- **restrained** has a separately typed, replay-recorded `restrained` flag, default FALSE. When a future physically equipped tie/restraint action sets it, the character kneels with hands behind the back; ordinary SECURE never marks a person bound or consumes imaginary restraints. 2D, legacy and shared skeleton preserve distinct silhouettes.
- The shared rig's head glances briefly toward `threatEstimate` **only when** the civilian's own sensory system recorded evidence within six seconds. Clamp to a plausible yaw. This is a render-only reaction and never reveals hidden enemies.
- Same intentional silhouettes in old legacy/replay rig and the floor-plan 2D renderer, with no new per-frame scans, physics, collisions, AI states, or idle timers.

## Verification and release gate

Targeted CI: TypeScript check, new physically simulated SECURE-from-behind regression, 2D/legacy/shared rig panic and rewind checks, previous civilian EQA3.7 candidate and C4 contact, D1 rescue, C5 unified pose and R2 fear animations. Existing long 110-second A/B script remains as historical causal evidence, not the new player-facing behavior.

Keep EQA3.9 PR **draft until green**. If any test fails, fix the actual blocker and retest; do not merge unverified animation into main. Before any main release verify the most recent Pages run completed successfully and publicly serves its expected build. After merging, wait for the release, verify public Pages again, and only then start the next production batch.

## Replay and inventory boundaries

Mission film samples now carry `civilian.stateSince`, `civilian.restrained`, and `operator.lastCivilianContactAt` as backward-compatible optional channels. Older film frames synthesize an already-settled compliant pose and no restraint or contact hand reach. Time-scrubbing is deterministic; none of the new animation timestamps changes AI or mission rules.

There is currently no physical zip-tie stock, placement or consumption contract in the loadout inventory. This checkpoint supplies the truthful restrained pose and typed renderer signal only. A future RESTRAIN action must require an actual equipped/consumed item, a physical GO interaction, and its own tests. No infinite-free restraint button was introduced.
