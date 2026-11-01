# Equipment 27.00 — Physical weapon identity and maintenance contract

## Current authority audit
- Campaign `inventory.weapons` contains platform **counts**, not physically serialized objects.
- Individual `CampaignOperator.weapon` and `weaponConfiguration` represent currently issued platform + compatible attachment setup, not a unique physical firearm.
- `TeamActor.shots` is the mission-authoritative rounds-fired statistic; no wear should accrue on missed trigger pulls, UI previews or replay playback.
- `CampaignReport` already establishes the mission/day boundary; `CampaignState.appliedResults` guards against duplicate debrief application.
- Quick Play resets combat gear and condition every round; only Campaign should persist weapon serials.
- The existing attachment-stock ledger must keep ownership of detached components; serialized weapons must not duplicate stock or ammunition.

## Staged integration
1. **27.00 (this build):** bounded, strict pure `SerializedWeapon` schema, deterministic shots-to-wear, finite history, explicit service events, safe save reads. No campaign mutation or firing penalties.
2. **27.01:** backward-compatible campaign migration from owned platform counts and issued operators to exact physical instances, explicit assignment, unissued armory storage, and no duplicate IDs.
3. **27.02:** apply one mission's actual rounds only once on debrief; add weapon history and condition in campaign armory, no stealth repair or resupply.
4. **27.03:** explicit service cost/availability and bounded reliability consequences, validated against physical firing, fixed-step simulation, replay and Quick Play isolation.

## Invariants
- One serialized weapon has exactly one current owner (operator or shared armory), never both.
- A weapon change does not conjure a new serial or transfer attached parts without paying inventory costs.
- No mission/replay/UI double-counts rounds or maintenance.
- Current base four platforms and the authoritative ammo/calibre/attachments remain unchanged.
- Wear is floor-based in whole shot counts to eliminate frame-rate dependence.
- No hidden Campaign spending or equipment wear in Quick Play.
