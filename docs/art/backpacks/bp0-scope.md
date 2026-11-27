# BP0 — Backpack overhaul scope

## Source baseline
Legacy day/field equipment: 8/16 spaces, 1.2/2.4 kg, bulk 2/4. The ten wardrobe looks are scaled versions of two shells plus overlays in operator-visual-kit and operator-wardrobe-gear-visuals; one chest harness serves all. Pose Lab and unified wardrobe repeat the same class mapping. Pack pivot is chest-local (-8.2,0,0), animated via packInertia. Retention measures visible roots; accessory sockets are generic. Preserve inventory transaction, independent fabric channel, static merge, AO, movement and pose authorities.

## Approved roster / reference direction
Hydration (ThermoBak), assault panel (zip-on carrier panel), tactical daypack (RUSH12), assault pack (3 Day Assault), ALICE medium field pack, expedition rucksack (PLCE Bergen), medical clamshell (Medic Assault), communications pack (COMM-3), civilian daypack (classic school pack). None is a valid choice. Reference names are visual targets, not claims of licensed replicas. Reference imagery and in-engine contact sheets still required at art stages.
Retire sling bag and wearable duffel from new selection; preserve old saves. Admin -> panel only if explicitly compatible and inventory fits. Do not silently shrink storage or grant capabilities. Legacy field -> ALICE, ruck -> expedition, medic/comms -> corresponding model, sling -> civilian, duffel -> expedition candidates only. Old IDs and quantities remain authoritative until transactional migration at BP12.

## Art contract
Chunky shaped volumes, distinctive flap/pockets/zipper paths, flat straps and buckles, texture lines for webbing; no micro bevels. Chest coordinates +X front, +Y up, +/-Z sides. Pack geometry local +X toward body. Explicit attach face, top/bottom strap seats, external sockets, contact outline. Independent material channel, static geometry consolidation, lazy construction. No runtime physics or collision enlargement. Internal contents concealed unless mounted. No automatic medical/radio/hydration effects.

## Stages and gates
BP1 canonical profiles/legacy compatibility; BP2 reusable textile primitives; BP3 pure fitted mounting and harness builder, stable animated root. These are foundations; keep legacy production choices and renderer until replacement models are available. BP4 hydration/panel, BP5 day/assault, BP6 ALICE/ruck, BP7 specialist, BP8 civilian, BP9 comparative art. BP10 sling/armor fit, BP11 inertia, BP12 transactional inventory integration, BP13 sockets/material/faction, BP14 UI/perf, BP15 release.
Acceptance: test catalog coverage, migration capacity safety, geometry bounds/UV/normal validity, harness endpoints and compatible armor, no per-frame geometry allocation, later rendered rear/side/front/game-camera captures and actual loadout/pose regressions. No merge or deploy for incomplete foundations.
