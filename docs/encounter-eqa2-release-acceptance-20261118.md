# EQA2 release acceptance — focused encounter quality + unified civilian actors

Date: 2026-11-18. Base: `main` at `c4223b61c4c30f24a4c8fe927299675c2f206219` (G36 reference and campaign integration).

## Intent, scope and limits

Improves three **specific** independently reproducible player-facing situations, not a new general AI system:

1. EQA1 final drag MOVE endpoints accepted near a known closed door when the full standing body could not actually complete the instruction. Ported the tested read-only-knowledge D3.23A pattern plus a known-frame final-landing check. Actual door physics, lock handling and genuine threshold-crossing OPEN are unchanged. EQA1 seeds 20/Capture and 26/Clear both changed from ~320 blocked FRONT frames to zero.
2. Prepared mission placements (the actual weak Retail HOLD and Warehouse INTEL/RESCUE examples): reward **existing physically legal** objective-near defensive anchors at original bounded placement time. No additional hostiles, invisible spawns, hard security quota or new AI tactics. Non-prepared, capture/clear, no-hostile and quiet profiles remain untouched.
3. Live/replay **3D** civilian renderer uses `createOperatorRig` / `poseOperator`, the same actual skeleton, outfit/identity, gait and body-pose engine as other NPCs. Civilian-specific states choose the animation inputs (routine, flee/run, hide/crouch, compliant/surrender, injured, down/carried), not a second animated puppet. Clothes are civilian casual styles, headwear bare, no armor, pack, rig, or visible weapon; seeded appearance is stable. The authoritative separate civilian state machine, collision, gunfire safety, awareness, rescue/escort, recorded visibility and 2D presentation are not modified. The old inexpensive standalone civilian rig remains only as compatibility for existing older tests and labs, **not live 3D**. Shared operator rig instances are disposed on actor retirement or site swap.

## Reproducible CI results

Successful complete integrated workflow: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44415183865

- TypeScript checks, 37 targeted tests (new civilian shared model, replay resets, legacy visual integrity, actor lifetime, EQA1 move/door rules, 55-site validity): **37 passed, 0 failed**.
- 55 generated scenarios (11 real building archetypes x five objectives, small seed 11–21): **55 valid, zero structural failures**.
- Previously warned objective-security cases reduced **13 -> 10** (warnings, never forced validity). In particular:
  - Retail 14 HOLD/PREPARED: assigned guards **0 -> 2** with two existing hostiles;
  - Warehouse 17 INTEL/PREPARED: **0 -> 1** of two existing hostiles;
  - Warehouse 17 RESCUE/PREPARED: **0 -> 1** of two existing hostiles;
  - A Warehouse 17 HOLD/PREPARED now shows 1 assigned nearby defender; all scenarios use physically validated actual spawns.
- 22 full fixed-step 20-second actor/civilian-response probes: report emitted without invalid issues (gunshot is *diagnostic* scripted stimulus).
- 40 x 12-second real motor/visibility scripted intel trials: **zero invalid, zero unaccepted, zero low-movement**, **357 blocked actor frames and 0 silent-door frames** (frozen EQA0 source: 1562 / 654). No claim of more contacts from changing authored final stopping positions.
- `npm run build`: TypeScript and Vite **successful**, no production deploy in feature CI.

Artifacts are attached to the successful workflow: `diversity.json`, `living.json`, `contact.json`. EQA0 frozen baseline: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44412489746 ; EQA1 detailed forensic origin: https://github.com/lowlevelwizards/Fieldwork3D/pull/1747 .

## Unresolved, intentionally out of scope

- Subjective mission quality still requires real player-controlled, rendered complete room searches and multiple insertion choices, particularly default Unknown objective intel, actual rescue SECURE/FOLLOW/extract and mobile responsiveness. Short headless scripted trials cannot prove enjoyment or mobile FPS.
- Captured room exposure warnings and legitimate low-opposition rescues remain open for evidence-backed iteration, not automatic enemy spawning.
- Shared character rig costs more to create/pose than cheap legacy cuboids; measure cold first-contact mobile frame hitches in real device play. Lazy visible-only spawning and rig disposal prevent undisclosed lifetime accumulation, but have not been device-profiled in this run.
- No broad moving/queue/door motor rewrite, no civilian AI intelligence addition, and no new campaign economy.
- Publish only at a single production checkpoint after verified merge and GitHub Pages served build.
