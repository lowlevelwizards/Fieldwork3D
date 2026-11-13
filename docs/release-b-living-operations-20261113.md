# Release B — Living Operations 1.0

Feature branch `feature/living-operations-b1-20261113` starts at main `f111ac3fdc1ec8e81092e2070e1af4eff7587bb2` (2026-11-13). This is a staged implementation plan and development record, not a production acceptance claim.

## Product contract
Build on the existing five playable mission objectives, operational dossiers, deterministic architectural compiler, mission/encounter profile, civilian runtime and persistent debriefs. The incident must **describe the actual generated operation**, not create unimplemented rescue groups, evidence items, scripted reinforcements or teleports. Faction/civilian combat safety, fog, fixed-step execution and physically verified insertion remain authoritative.

Three first-class operation families:
1. **High-Risk Warrant** (`warrant-service`, CAPTURE). Real capture-target presence is mandatory; credible hostile security may guard the target, but no virtual reinforcements or omniscient defenders.
2. **Missing Person** (`missing-person`, RESCUE). Existing real rescue-person marker and escort/extraction rules remain authoritative; hostiles have a more unsettled/mobile local posture, not an imaginary hostage wave.
3. **Evidence Seizure** (`evidence-seizure`, INTEL). Existing physical marked objective and cache recovery remain authoritative; defenders use a quieter, scattered watch/posture, without fabricating extra evidence.

## Staged work
- B0: Baseline and product/engine invariants (this record).
- B1: Resolve intent after premise/mission/physical target eligibility. No invalid property/mission/premise promise survives; reuse the same vetted incident ID in encounter profile, dossier, restart and replay.
- B2: Distinct, seeded physical encounter profiles for the three families; choose only already valid gameplay archetypes. No extra generation pass.
- B3: Apply constrained, physically grounded local actor doctrines after verified placement, before existing activity/routine setup; no relocation, omniscient paths, or enemy count changes.
- B4: Deterministic incident regression matrix, selected seeds/building profiles, preservation of objective/extraction, replay and dossier identity, civilian disclosure.
- B5: Integrated CI and release checkpoint only when reproducible tests pass; verify previous public Pages deployment before merging/queuing a new one.

## Release discipline
- Stage-level commits live on this branch; no per-build production merges.
- Prefer targeted Node/TS tests and one main build; if test failures reveal engine bugs, fix root cause rather than reducing assertions.
- Do not merge when a Pages job is active; compare exact head and build stamp at checkpoint.
- Follow-on work (deeper objective interactions, optional extraction choices, campaign consequence, multi-building sites) gets its own B2+/Release C branch, not a premature claim of completion.

## Baseline
Current normal-play generation already opts into incident intent, but an incident is currently chosen *before* the encounter premise; premise-specific restrictions can reject it later in the dossier. Existing profile weights for three showcase families are modest, and actual local roles are mission/premise rather than incident-specific. These are the immediate gaps addressed here.
