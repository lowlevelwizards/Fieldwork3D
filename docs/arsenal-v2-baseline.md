# Arsenal / Workbench V2 — Stage 0 baseline
**Baseline:** main at `ac2989a654d4fcf3410cbf2bf7a941329320ec0f` (2026-11-07).
**Scope:** Non-breaking foundation for one full-screen weapon gallery and draft-based editor.

## Current authoritative paths
- `src/equipment-weapon-families.ts`: AR/AK/HK appearances, 29 factory recipes, 133 body components, six family slots; `WeaponFamily` is an art-family label, **not** an interchangeability group.
- `src/equipment-weapon-assemblies.ts`: `WeaponConfiguration.version=1`, legacy class and seven accessory slots (including a duplicate generic stock); authoritative physical sockets and pose contact resolver.
- `src/equipment-weapon-workbench.ts`, `src/equipment-weapon-workbench-layout.ts`, `src/weapons/geometry/weapon-visual-anchors.ts`: current 3D workbench UI / mounts.
- `src/ui/weapon-preset-browser.ts`: factory checkpoints; separately embedded in `src/campaign-ui.ts` and `src/breach-main.ts`.
- `src/campaign-state.ts`, `src/equipment-weapon-inventory.ts`, `src/equipment-weapon-ownership.ts`, `src/equipment-weapon-identity.ts`: Campaign writes, credits, inventory, serialized weapon IDs and wear.
- `src/breach-roster.ts`, `src/equipment-magazine-persistence.ts`: Quick Play equipment, resets and magazine conservation.
- `src/breach-combat.ts`: four gameplay classes remain the ammunition, damage, capacity and reload authority.
- `src/breach-modular-weapon-geometry.ts`, `src/breach-weapon-geometry.ts`: preserve existing authored visuals and contact geometry.

## Confirmed conflicts / design corrections
1. `stock` is a real family part and also an old abstract attachment slot. The new assembly presents one stock, while the v1 adapter retains old stock IDs.
2. `hk` art family contains G3, HK33/HK53 and MP5. They must be distinct **browse** identities, without pretending the whole family interchanges.
3. Catalog part names often contain technical descriptors / baked material suffixes; display aliases cannot overwrite stable save IDs or baked geometry.
4. A body part is currently a **visual** alteration; replacing it does not purchase a firearm, alter class, or consume magazines. Preserve this boundary in the UI release.
5. The MP5SD integral muzzle, optic mount dependencies, foregrip rail restrictions and receiver feed/length constraints must be retained.
6. Campaign serial ownership must never be inferred from saved recipes. Campaign commitment is separate from preview.
7. Quick Play loadouts reset between rounds; intentionally saved personal build recipes may persist without persisting combat equipment.
8. Existing pose and replay systems must keep receiving valid legacy `WeaponConfiguration` values during migration.

## Rollout and release gates
- **Stage 1**: New pure catalog/labels/adapters only. No UI/campaign mutation.
- **Stage 2**: New pure, atomic draft/compatibility proposal model; preserve v1 configuration behavior.
- **Stages 3–5**: Gallery, viewport, integrated editing behind a controlled entry.
- **Stages 6–8**: Build persistence and Campaign / Quick Play adapters.
- **Stages 9–11**: Operator/replay proof, finish support where authored, UI cutover.
- Separate later work: ammunition/class/magazine simulation, receiver-based firearm economy.

## Focused safety tests
`tests/weapon-families-01.test.mjs`; `tests/weapon-platform-interchange-r2.test.mjs`; `tests/weapon-arsenal-r4.test.mjs`; `tests/equipment-19-04-weapon-persistence.test.mjs`; `tests/equipment-27-01-campaign-ownership.test.mjs`; new Arsenal tests.

## Integration caution
Open PRs for replay, clearing and Pages verification were present at baseline; do not overwrite their shared code or merge blindly. Latest observed main Pages workflow at `ac2989a654d4fcf3410cbf2bf7a941329320ec0f` completed successfully, but live Pages content was **not independently verified** here. No production merge until prior deployment and served artifact can both be verified.
