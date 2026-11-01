# Equipment overhaul · Build 00 — integration audit

This document records the **existing implementation** before expanding the
Fieldwork personnel/armory systems. It is an integration contract, not a new
parallel game mode.

## Authoritative owners

| Capability | Existing owner | Extension contract |
| --- | --- | --- |
| Active tactical soldier | `src/breach-game.ts` (`TeamActor`) | Only tactical code changes weapon, ammunition and action state at runtime. |
| Weapon stats and ids | `src/breach-combat.ts` (`WEAPONS`) | Catalog references existing `WeaponId`; do not duplicate ballistic values. |
| Magazines/reload | `src/breach-magazines.ts` and `breach-game.ts` | Preserve individual magazine ID, rounds, and the ongoing reload state machine. |
| World appearance | `src/breach-operator-rig.ts` | Reuse rig anchors, existing materials, IK and weapon pose constraints. |
| Quick-play roster | `src/breach-roster.ts` | Preserve v1 save loading; extend without invalidating existing players. |
| Campaign personnel, stock and recovery | `src/campaign-state.ts` | Add equipment ownership to this domain, never the render loop. |
| Campaign UI | `src/campaign-ui.ts` | Build mobile-first armory on existing roster navigation. |
| Tactical deployment | `src/breach-main.ts` (`applyCampaignSkills`) | Derive live equipment from selected campaign operator. |
| Campaign export/import | `src/campaign-persistence.ts` | All new campaign fields must be migrated/validated on read. |
| Mission settlement | `resolveOperation` in `src/campaign-state.ts` | Apply changes once using existing `appliedResults` guard. |
| Training/labs | `src/breach-operator-lab.ts` and `operator-lab.html` | Reuse rather than create a competing character renderer. |

## Existing functionality already in production

* Four deployable tactical slots, plus recruitable reserve personnel.
* Campaign assignments, weapon purchasing/equipment swaps, finite stock ammo.
* Individual appearance seeds and six progressive shooting skills.
* Magazine instances, loaded-magazine IDs, dropped magazines, reload phases.
* Wound and injury stages, operator rigs, gear inertia, weapon clearance.
* Operation after-action history, campaign export/import and persistence.
* Touch-compatible campaign UI and Three.js soldier rendering.

## Incremental rules

1. Add `equipment-catalog` as declarative static metadata referencing the
   authoritative `WEAPONS` definitions, not replacing them.
2. Add a versioned optional per-person loadout to campaign operators and a
   validated v1 fallback for existing saves. Keep `weapon`, `magazine`,
   and `reserve` as the current combat source until explicitly migrated.
3. Equipment actions must not bypass campaign stock or consume ammunition
   on selection. A preset is a recipe, **not owned physical inventory**.
4. Maintain the existing `TeamActor` muzzle/firing/IK semantics. Cosmetic
   modules must not alter shot origins or weapon orientation.
5. Keep inventory/stat calculations out of the 60Hz simulation loop.
6. No claims of physical armor, item access, or accessory gameplay effects
   until those systems are explicitly integrated in tactical simulation.
7. All feature builds receive focused tests for newly altered contracts and
   the existing relevant campaign/roster/reload paths.
8. Merge small slices rather than accumulating parallel implementations.

## Baseline risks / known discrepancies

* Initial campaign recruits populate ammo capacities using hardcoded numbers
  that differ from `WEAPONS` for the SMG. The authoritative weapon table
  should win when normalizing newly configured loadouts.
* Existing weapon purchases use a count of unassigned weapons, not unique
  item instances; unique ownership must be introduced via migration.
* Existing magazine state is more detailed than `CampaignOperator`'s
  aggregate `magazine`/`reserve` fields; preserve this distinction until
  mission magazine reconciliation is implemented.
* Existing campaign saves use `version:1`; add optional fields with bounded,
  defensive normalization rather than immediately rejecting v1 saves.
* There are concurrent architecture/map PRs. Equipment work should touch
  personnel modules only and should never silently merge unrelated changes.

## Rolling feature gates

**A:** Readable and editable loadout, persistent roster, visible equipped gear.
**B:** Physical placement, magazines, weapon config, coverage, handling.
**C:** Consumables, sharing, mission prep, ownership, progression.
**D:** Training, wear, cosmetics, content, optimization.

Each gate should be demonstrated in a playable deployment before expanding
the content catalog.
