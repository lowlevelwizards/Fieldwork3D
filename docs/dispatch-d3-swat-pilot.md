# Dispatch D3 — Narrow SWAT pilot / rolling implementation

**Scope:** first playable Dispatch campaign, not a full police simulation.
Only the already-authored `us-swat-2015` look is playable. The other three
D1 police references remain browseable research/appearance references, not
promised content or selectable Dispatch campaign agencies.

## D3.0 — Save and creation path
- Dedicated third browser slot `fieldwork3d.dispatch-campaign.v1`.
  The legacy and Sandbox storage keys are unchanged.
- Explicit DISPATCH · SWAT PILOT creation, Continue, replacement confirmation,
  separate import target and save compatibility validation.
- A Dispatch save must declare `rules.template='dispatch'`; it cannot be
  written/imported into legacy or Sandbox. The reverse is also blocked.
- Write candidate first, switch active pointer last, and roll back the
  candidate on failed activation. A missing/corrupt Dispatch pointer falls
  back to legacy without mutating another save.
- Uses the same CampaignState.version=1 save format and existing career,
  contracts, objective settlement and replay pipeline. **No automatic
  conversion of old campaigns and no invented police mission content.**

## D3.1 — Authoritative policy write gates
- The exact existing D2 `us-swat-2015` reference decides NEW equipment
  and weapon preset choices, not the user's existing owned inventory.
- Guards run inside campaign-state mutation functions for equipment, weapon
  platform/preset changes and purchases. They are not just disabled UI rows.
- Generic recruitment remains disabled for the pilot until new hires can be
  issued a validated SWAT appearance and weapon; current four operators and
  their career progression remain playable.
- Unsupported custom Arsenal builds, attachment editing, broad wardrobe edits
  and kit-preset applications remain locked for the pilot until proper
  policy-backed flows exist. Standalone Studio batch saves and historical
  loadout applications cannot silently bypass that restriction.
- The campaign loadout UI explains the pilot policy and disables unsupported
  options, but retains current previously equipped items even if unclassified.
- Original, Sandbox, Quick Play and training gameplay are unaffected.

## D3.2 — One visual / equipment baseline
- Instantiate four normal career operators from the existing 2015 US SWAT
  appearance reference, including the currently implemented AR-pattern weapon
  preset, SWAT marking, helmet, vest, load-bearing gear and dark textiles.
- Magazine allocation, armor integrity, medical supplies and individually
  owned weapon serials are rebuilt with the existing authoritative helpers.
- A stylized visual reference is not an issued-inventory claim. Sidearm and
  arrest/negotiation/ROE gameplay are NOT implied or introduced.

## D3.3 — Critical validation and release boundary
- Test save-slot isolation, fail-closed imports, rollback, no loss of legacy
  save, round-trip continuity and campaign result idempotency.
- Test actual SWAT starter and ownership, equipment mutation denial with
  unrestricted original campaign semantics.
- Test Studio/Arsenal bypass boundaries and campaign menu/creator surfaces.
- Verify no tactical simulation or hotpath reads these setup-time policy
  rules, and no unimplemented weapons or agencies were added.

## Honest pilot limitations
The current Campaign contract pool and settlement economy remain shared.
Names such as "Recover Documents" and military-looking regions are NOT yet
police-specific incident writing. Do not advertise arrests, non-lethal rules,
sidearms, warrants, dispatch calls or police-only maps as implemented.
The SWAT pilot is an intentionally narrow proving ground for isolated careers,
existing CQB gameplay and curated gear.

## Integration
Commit independently useful stages to this feature branch. Run affected-domain
PR CI plus production build, then rebase/integrate if other merges moved main.
At one safe release checkpoint, require the previous Pages workflow to have
succeeded and public Pages to serve current main's build stamp. Never queue
another Pages merge while a publish is queued/running. Verify the new public
stamp after merge. Otherwise keep developing on the branch.
