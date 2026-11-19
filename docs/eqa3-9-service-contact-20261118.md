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
3. The previously disclosed objective point is within the normal 34-unit command zone of the selected operator's final point. This check does **not** read hidden civilian health, identity, or current position.
4. The person is not currently live-visible.
5. The command has not been repeatedly attempted (at most 4, with a fixed cooldown).

Compare Warehouse17 FRONT/SERVICE and UNKNOWN/CONFIRMED intelligence in the unchanged 110-second actual game simulation, explicitly checking prior discovery timestamps, SECURE, FOLLOW, extraction, casualty outcome and no integrity regressions.

**Interpretation caution:** A successful A/B would show an issue with orientation/command discoverability and the scripted scout, **not** with search route AI or a need to extend fog sight. A failed A/B may reveal geometry/door/visibility or interaction-reach mismatch and needs a separate cause-specific check. Do not merge a gameplay/UI change solely because the diagnostic driver completes more missions.

## EQA3.9 stage A/B verified on actual physics

[110-second A/B CI #44455114182](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44455114182) passed; each trial used real 60Hz player-authored orders, actual enemy fire and civilian state, same seed and paired insertion. The only opt-in difference was a normal LOOK order toward a position previously disclosed to the squad.

| Warehouse17 RESCUE | Original actions | With actual LOOK |
| --- | --- | --- |
| UNKNOWN / FRONT | Mission DONE, extracted at 63.93s | Mission DONE, extracted at 63.93s |
| UNKNOWN / SERVICE | Person discovered 23.83s, MOSS arrives by 39.63s, remains SECURE through 110s | Person secured and mission enters EXTRACT 40.57s; **physically extracts at 55.07s** |
| CONFIRMED / FRONT | Civilian incapacitated under hostile fire; not extracted | Same combat casualty outcome |
| CONFIRMED / SERVICE | Civilian incapacitated under hostile fire; not extracted | Same combat casualty outcome |

No integrity exceptions or script route aborts. This demonstrates the original inability to SECURE was the operator's orientation/contact affordance after handoff, not failure to search for the rescue person. The normal LOOK action solves it without fog overrides or auto-commands.

## EQA3.9 player-facing change (staged separately on same feature branch)

- Add `LOOK TO PERSON` in the **existing** contextual palette only when the real rescue objective is already confirmed/discovered; the selected route endpoint lies within 34 units; the known location is not currently visible; and a real 5.5-unit swept contact ray is not blocked by the current world/door geometry.
- The dispatcher revalidates those conditions and authoritatively authors the exact existing `planLook()` order on click. This does not SECURE or FOLLOW automatically, and does not use the civilian's hidden live position.
- The nearby known point, not an unseen moving person, is the target: this makes the user recheck the last observed/confirmed objective location instead of magically tracking a character.
- Existing SECURE/FOLLOW visibility and physical GO-time conditions remain unchanged.
- Tests cover unknown/approximate privacy, confirmed/discovered cues, contact obstruction, route-end gating, no auto-SECURE, and real GO-time sight acquisition; plus the earlier EQA3.7 civilian selector and D1 rescue lifecycle. Full A/B physical mission replay remains in targeted CI.

Do not merge until the player-facing feature branch's TypeScript and targeted tests succeed. Merge at one production release checkpoint only if the latest main deployment is healthy and Pages serves the expected build.
