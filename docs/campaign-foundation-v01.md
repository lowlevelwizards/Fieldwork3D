# Campaign Foundation v0.1 — modular campaign contracts

## Why this exists

Fieldwork is one tactical simulation with three future curated campaign families
(**Dispatch**, **Operations**, **Wasteland**) and a future **Sandbox Campaign**
creator. Quick Play stays an independent, nonpersistent mission creator.

This milestone builds only a safe compatibility seam around the **existing,
playable legacy campaign**. It does **not** announce three playable modes or
change the rules of an existing save.

## Audited existing owners

- `src/campaign-state.ts` owns the version-1 campaign record, operators, finite
  supplies, contracts, settlement, skill progression, weapon service and armory.
- `src/campaign-persistence.ts` and `src/breach-persistence.ts` validate,
  import/export, and store the same existing campaign snapshot.
- `src/breach-campaign-flow.ts` owns contract deployment and applies the
  existing fixed campaign contract to the tactical session.
- `src/quick-play-settings.ts` and `src/breach-quickplay-controller.ts` own
  **separate** Quick Play recipe generation and worker execution.
- `src/campaign-ui.ts` owns the existing campaign menu and operations room.
  Its current `NEW CAMPAIGN` remains the **legacy campaign**, not a misleading
  substitute for Dispatch or a Sandbox creator.

## What v0.1 implements

1. `src/campaign-rules.ts`: a pure, explicitly versioned `CampaignRules`
   contract and registry for the four intended template identities. The
   templates are **design definitions**, not distinct implemented economies.
2. Capabilities distinguish `configurable` (actually wired), `fixed`
   (existing but not toggleable), and `planned` (not running). A capability's
   dependency list is centralized, rather than introducing scattered boolean
   gameplay flags.
3. Two **real** campaign mission rules are configurable via the model API:
   `mission.intel` = `contract | floor-plan | exterior-known | true-blind`;
   `mission.scale` = `contract | standard | expanded`. Both default to
   `contract`, exactly preserving current contract intent.
4. `newCampaign(seed, rules?)` accepts a validated configuration for future
   Sandbox Campaign creation. Existing call sites continue to create an
   unchanged legacy campaign. There is **no misleading UI control yet**.
5. `CampaignState.rules?` is an optional extension to the *existing*
   `version:1` save. Missing metadata is interpreted as the legacy campaign
   in memory without any auto-write or migration. Explicit rules are
   validated when loading/importing; unsupported versions fail closed.
6. The existing campaign flow reads the rules only on **contract deployment**,
   where it determines map intelligence and size. Contract IDs, enemies,
   objectives, rewards, equipment, debrief, and settlement remain authoritative
   in their current owners.
7. Focused tests cover template declarations, planned/fixed distinctions,
   legacy exact-save parity, custom rules through JSON and browser storage,
   contract deployment and settlement, invalid payload rejection, and
   isolation from Quick Play.

## Clear limits

**Not built:** gas/filters, battery depletion, scavenging loot, hideout,
survival economy, military logistics, faction reputation, extra campaign saves,
campaign creator UI, mode-specific factions/maps, or three progression trees.
The existing campaign **already** implements operator persistence, finite ammo,
weapon service, equipment ownership and some finite medical supplies; these are
currently fixed behavior and cannot be turned off using this registry.

**No global simulation hooks:** campaign rules are read outside the 60 Hz
simulation. We do not insert a campaign option branch into every combat system.

**No hard-coded content partitions:** factions, maps, weapons and clothing
remain shared. Future availability policies should be data-driven and enforced
at appropriate acquisition and mission-selection boundaries.

## Architectural contract for follow-up milestones

- Campaign state is the durable record. Rule configuration is a versioned,
  validated *policy*, not a second record of operators, resources, or inventory.
- A template supplies coherent defaults. Sandbox eventually allows a derived
  configuration with dependencies and availability checks. All four use the
  same mission, combat and debrief internals.
- Each new toggle must have an implemented runtime owner and a persistence
  contract **before** it becomes configurable. Unbuilt features must remain
  visibly planned, not silently ignored.
- Continue existing legacy save/import/export semantics; introduce a new save
  migration only when necessary, with fixtures and round-trip tests.
- Never use the existing `CampaignMode` navigation union as the campaign
  *family* discriminator: `mission` means the current screen's tactical
  context, not Dispatch/Operations/Wasteland.
- Preserve Quick Play's separate recipe and reset-to-fresh-gear rules.

## Next realistic increment (not included)

Create a non-destructive Sandbox Campaign setup flow that selects a template,
shows only genuinely configurable controls, and saves a new campaign with
`CampaignRules`. Keep Dispatch, Operations and Wasteland marked as unfinished
campaign *families* until each has its first distinct playable system.
