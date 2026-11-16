# Campaign Foundation v0.2 — Sandbox Creator and protected saves

## Delivered
- Existing Campaign and Sandbox Campaign have independent save slots.
- The original `fieldwork3d.campaign.v1` key is retained byte-for-byte.
- The Sandbox slot is `fieldwork3d.sandbox-campaign.v1`, and a small
  `fieldwork3d.campaign-active-slot.v1` pointer selects which to load.
- New Sandbox Campaign creation collects a cosmetic name, optional reproducible
  seed, and two **working** mission overrides. It calls the same deterministic
  `newCampaign` and tactical flow as the original campaign.
- Default rules **follow the contract** for mission intel and scale. Overrides
  are applied at deployment, without rewriting contract identity/rewards.
- Create, continue, cancel, import, export and return-to-menu use one shared
  campaign authority; Quick Play and Training remain independent.
- Existing systems (operators, injury recovery, ammunition, armory/weapon
  service, contracts, after-action settlement) remain fixed, not faux toggles.
  Dispatch, Operations, Wasteland, gas, filters, looting and batteries are
  **future** features, not selectable gameplay promises.
- The main game and standalone Operator Studio use the same active save-slot
  policy. Standalone editing pins its initial campaign slot and refuses to
  redirect unsaved edits if the selection changes in another tab.

## Correct creation and save semantics
1. Starting a new legacy campaign targets only the legacy key.
2. Starting a new Sandbox Campaign targets only the sandbox key.
3. If a target slot has a valid save, replacement requires explicit confirmation;
   the creator provides a direct export option for existing Sandbox saves.
4. The candidate snapshot is validated and written before the active slot pointer
   is updated. If selection fails, an attempted rollback preserves the former
   target snapshot; the other slot is never modified.
5. No new campaign becomes active in memory unless storage operations succeed.
6. Existing legacy JSON stays valid without name, rules, pointer, or migration.
7. Importing a save must target the explicitly selected slot. Import is not
   allowed during tactical play and does not change Quick Play state.
8. The last applied operation ID still protects against duplicate settlement
   after reopening a persisted campaign.
9. A stale or corrupt Sandbox pointer falls back to the original campaign;
   missing/corrupt saves are not silently converted into new campaigns.

## Limits
- Exactly two local slots; no multi-slot manager, cloud sync or auto-save
  history. Users should export a save before deliberately replacing it.
- Campaign name is display-only, maximum 40 characters; its value cannot
  change procedural generation.
- No editable rules in the middle of a tactical mission. New configuration
  is chosen only when creating a Sandbox Campaign.
- Storage APIs are inherently nontransactional; rollback on pointer failure
  is best effort if browser storage becomes unavailable during rollback.
- No changes to combat, 60 Hz simulation, map generation, or content
  availability policy.

## Critical release checks
- Creation draft / malformed name and seed validation
- Two-slot storage isolation, failures, active pointer and fallback
- Export/import, operator service and after-action settlement continuity
- Legacy menu, Quick Play, Operator Studio and mission setup regressions
- TypeScript, production build and public Pages build-stamp verification
