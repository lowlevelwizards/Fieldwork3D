# EQA3.2 — Real physical OPEN stance ownership correction

Date: 2026-11-18. Base: EQA3.1 live release 9d8cb104cd2f39c667a42bb0f6218f76baae15a4.

## Exact failure, not an AI or terrain assumption

Frozen actual user-authorable OPEN test: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44429628353 . All six FRONT/SERVICE scenes accepted real door orders. Townhouse 12 INTEL and Townhouse 23 RESCUE opened both doors, but Retail seed 14 HOLD FRONT and SERVICE remained shut after 20 simulated seconds with DOOR still active. Action timer remained zero despite actor motion, zero blocked-actor frames, and no lock or jam. Both Retail failures reproduced in the same geometry with all hostiles and civilians removed.

Detailed world snapshots found physically clear and teammate-free retreat stances at Retail FRONT (491,540.35), from original authored handle waypoint (498,518.35), and SERVICE (70,501.5) from original (63,479.5). Each was outside the moving leaf sweep and certified by the normal full-capsule body test.

## Exact root cause

The generic movement-order handler runs BEFORE the door-order handler. After the latter selected its legitimate safe opening stance, the former grabbed the next tick when the actor had moved more than five units from the original DOOR handle waypoint. Thus a valid door stance and a valid authored approach repeatedly stole locomotion from one another. A stale route-cache hypothesis was tested and falsified, then reverted; the transient route actually contained the correct safety stance.

## Minimal fix

In src/breach-order-movement.ts, an active OPEN door order with an already selected opening-footwork stance yields to the door-order handler before generic waypoint walking. In src/breach-order-door.ts, that existing short, physically verified stance is finished before trying another handle-reach correction. All actor movement still passes the same world full-body sweep; the normal handle interaction, lock/jam, hinge dynamics, actor clearance, and order timer remain authoritative. No teleport, door ghosting, forced angle or other AI/mission changes.

## Final gate

https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44430932390 — SUCCESS, 33/33 targeted tests, TypeScript check, production Vite build succeeded in 11.09 seconds.

Eight actual generated 60Hz OPEN tests passed: Retail seed14 HOLD FRONT/SERVICE with live NPCs, Retail 14 same sites without NPCs, Townhouse seed12 INTEL FRONT/SERVICE, Townhouse seed23 RESCUE FRONT/SERVICE. Every test required real GO-time action timer advancement, physical panel swing >=0.72, zero failed orders and no out-of-site body teleport. Additional existing D3.31F lock and forced-door, D3.30 threshold, D3.29 broken latch, Q5 opener, Q6 entry tests all passed.

This is a narrowly tested real door-physics issue, not a claim of complete four-person human iOS gameplay acceptance. EQA3.0/EQA3.2 diagnostic scripts and raw artifacts remain isolated in draft audit PR #1751.

Release checkpoint: verify previous GitHub Pages production success, merge this narrow batch only, and verify public served-build stamp after the automatic deployment.
