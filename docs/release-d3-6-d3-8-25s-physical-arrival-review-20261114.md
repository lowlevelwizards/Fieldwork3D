# D3.6–D3.8: 25-second generated-building physical arrival review

## Acceptance protocol

- Identical deterministic generated corpus: 11 sites, two four-operator modes each (22 squad runs, 88 individual destinations), 1,500 fixed ticks per run / 25 seconds at 60 Hz.
- **Physical arrival** reads the actual final body position versus the frozen authored goal. It is not a synonym for a command having been removed.
- Record active order, exact doorway episode, current temporary nav waypoint, last movement blocker, fraction/velocity of nearby hinges, hand attachment, order cancellations and squad sync.
- Safety gates: no invalid positions, nonfinite steps, corrupted plans, uncontrolled door oscillation, or new full-body collision bypass.
- The production motor is not modified to collect these offline observations.

## Original clean D3.6 25-second baseline

| Measure | Clean branch |
|---|---:|
| Operators physically arrived | **49/88** |
| All-four physically arrived squads | **7/22** |
| All-authored-orders-empty squads | **6/22** |
| Operator order queues empty while not at goal | **4** |
| Classified prolonged stalls | 13 |
| Hinge open/close flips | 57 |
| Invalid positions / corrupted plans / physics step violations | **0 / 0 / 0** |

Many incompletes are actively traveling, intentionally synchronized, or have a legitimately inaccessible locked door. Treating all incomplete squads as deadlocked would be invalid.

## Three specific sites

1. **Warehouse 31123, separately authored MOVE mode**: 0/4 physically arrived. All four began opening FRONT and were clustered against its leaf; at t=25s the door was frozen at ~0.397 fraction, velocity 0, assisted push target 1.55. The hinge's architectural sweep is clear without occupants, but live bodies stop the next rotation. All four true body positions overlap the leaf clearance; existing nav and swept world routes cannot cross it. By contrast the **explicit squad-entry mode is 4/4 physically arrived** and FRONT reaches 1.55, proving the obstacle is coordinated body/leaf flow rather than an impassable building.
2. **Motel 31149, squad-entry mode**: two operators are legitimately standing on authored **SYNC B1** while two teammates are still moving to distinct stack stations. Do not remove intentional sync to inflate arrival counts.
3. **Retail 31084, authored mode**: MOSS and VALE had MOVE orders canceled after correctly encountering a **locked** door. Their empty plans do not indicate they reached their distant goals; keep logical completion separate from arrival.

## Rejected movement trials (code reverted)

- **Assisted-hinge micro-yield gate**: enabled the existing finite ~1.25-unit opening-yield when hand support targets over 100%. Full 25s corpus changed **49→48** physical arrivals, **7→6** physical four-person squads, warehouse FRONT still ~0.4. Reverted in full.
- **One-shot cold physical self-clearance**: allowed the existing exact-swept 8/14/22-unit relief proposals to run from an active blocked partial hinge; re-used the episode's existing maneuver attempt budget, with a follow-up revision reserving two attempts after four failed rehearsals. Some warehouse actors stepped away; eventually all four initiated outside-leaf recovery, but two remained midway through transient corrective waypoints and the door still stood at ~0.4. The 25s corpus again changed **49→48** physically arrived, **7→6** physically complete squads, with 0 safety violations. **All experimental gameplay logic and its test are reverted.**
- Do not present passing unit tests or fewer collision-stall flags as evidence of improved squad movement. A candidate with worse physical arrivals is not eligible for release.

## Current retained changes

- 25-second corpus in the D3 critical workflow, including real physical arrivals and logical-done-but-not-arrived count.
- Precise offline-only warehouse per-body hinge, static-vs-dynamic obstruction, route feasibility and authored-order lifecycle evidence; original authored GO orders untouched.
- The earlier D3.2–D3.5 changes remain staged for separate release acceptance; the D3.6–D3.8 experiments above are **not merged or deployed**.

## Proposed D3.9 scope (not yet implemented)

Address the **group** physical doorway condition rather than multiplying independently selected sidesteps. Inspect Q2 doorway scheduling alongside D4 hand contact and D1 crossing episodes. Give one real leaf-clearance maneuver priority at a time, release the body that's blocking the swing, and let other teammates proceed as soon as the actual aperture permits. Make the coordination deterministic, bounded and one-shot per obstruction episode; no new per-frame world routes, no forced hinges, no body ghosting, no rewrite of authored MOVE orders. Validate specifically against warehouse separately-authored MOVE mode, with entry mode and the 11-site 25s corpus as no-regression gates.

**Release decision:** keep draft branch unmerged. The diagnostic extension is safe to retain, but neither attempted gameplay change met physical-arrival acceptance.
