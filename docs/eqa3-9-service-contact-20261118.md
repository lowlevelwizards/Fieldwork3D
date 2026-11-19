# EQA3.9 — Warehouse17 SERVICE: discovered but not secured

## Evidence and corrected classification

EQA3.8 actual 110-second physical mission witness [run 44454592461](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44454592461):

- UNKNOWN / SERVICE discovers the actual rescue target at **23.83s**. This is NOT a failed room search or broken objective reveal.
- The initial scout ROOK becomes incapacitated at **26.73s**, and the audit script chooses MOSS as the surviving second player operator.
- MOSS reaches position **(178.4,463.88)** at around **39.63s**, **4.91 units** from actual civilian **(173.5,464)**. Both stay in the same room for the remainder of 110s. Civilian is alive (health 2), frozen in reaction to the fight, not yet compliant. No SECURE/FOLLOW order is authored. No route abort or rejected tactical order.
- The scripted scout checks `liveVisibility(s,person.p)` before authoring SECURE and suppresses that interaction when the person is outside any currently valid operator cone. `objectiveLocationKnown` is already true because the squad previously discovered the person.
- The physical motor performs its move successfully, but arrival alone never turns the actor toward a nearby known contact. The mission rule correctly insists on real SECURE and then FOLLOW, not proximity magic.

## Narrow A/B question

Does one explicit player-authorable `planLook()` from MOSS's real position to the **already disclosed** rescue point turn the actor's gaze enough to make SECURE authorable, and does the actual rescue/extraction then work?

The opt-in `--contact-look` audit-driver variant is a genuine normal LOOK command, not a visibility override, objective-state edit, body teleport, enemy nerf or mission rule change. It is issued only if:
1. The mission is rescue and SECURE is pending.
2. The objective position is already known through confirmed intel or observation.
3. The living person is physically within the normal 34-unit command zone of the selected operator's final point.
4. The person is not currently live-visible.
5. The command has not been repeatedly attempted (at most 4, with a fixed cooldown).

Compare Warehouse17 FRONT/SERVICE and UNKNOWN/CONFIRMED intelligence in the unchanged 110-second actual game simulation, explicitly checking prior discovery timestamps, SECURE, FOLLOW, extraction, casualty outcome and no integrity regressions.

**Interpretation caution:** A successful A/B would show an issue with orientation/command discoverability and the scripted scout, **not** with search route AI or a need to extend fog sight. A failed A/B may reveal geometry/door/visibility or interaction-reach mismatch and needs a separate cause-specific check. Do not merge a gameplay/UI change solely because the diagnostic driver completes more missions.
