# Dispatch D5 — Mission continuity (implementation contract)

Purpose: one actual Dispatch contract remains recognizable across selection,
briefing, operation, debrief and saved career history. D5 is presentation
continuity only: no new police-only objectives, locations, rules or save schema.

## D5.0 — Authoritative identity
- `deployedDispatchIncident` takes an **accepted, real** Campaign contract.
- Immutable identity captures campaign ID, contract ID, existing D4 title,
  call reference, original title, actual kind, region, day and risk. Verified
  follow-ups include only actually recorded previous operation outcomes.
- `validatedDispatchIncident` accepts the snapshot only in the same Dispatch
  career and while that contract is active or appears in actual saved history.
- `historicalDispatchIncident` reconstructs from actual archived contracts;
  missing/pruned contract metadata is **unknown**, never fictitiously filled.

## D5.1 — Briefing
- The existing `attachCampaignDossierContext` uses authored Dispatch labels,
  including reference and true follow-up. It leaves objective, actual intel,
  threats, map and claim evidence untouched.
- The standard briefing card reads the deployment snapshot, so reference,
  title, region, risk and campaign day remain displayed when optional
  procedural briefing generation is turned off or errors.
- No second dossier composer or alternate mission rules.

## D5.2 — In-mission reference
- A small incident reference lives on the existing mission-settings sheet,
  with a title on its trigger. Reconcile on existing UI updates, only when
  changed; do not add work to renderer, simulation or animation loops.
- Session deployment records context **after** resetting the mission.
  Mission identity remains available even after result settlement clears
  `activeContractId`.
- Quick Play, Training, replay and other campaign formats get no Dispatch UI.

## D5.3 — After action and history
- One incident snapshot is forwarded to the existing tactical HUD/debrief
  renderer and structured details. The report has the actual incident title,
  reference, region and campaign day; score, grade, outcomes, medics, shots,
  replay evidence, promotions and progression remain authoritative.
- Debrief rendering caches include campaign ID + contract ID; mission,
  replay and campaign switching do not carry stale headings.
- The career log resolves historical names only from actual saved contracts.
  Missing records have an explicit unclassified reference fallback.

## D5.4 — Acceptance
- Unit tests verify accepted -> staged -> settled -> archived identity, real
  follow-up provenance and cross-career invalidation.
- Source-level integration tests assert real briefing fallback, mission mode
  scoping and debrief/cache wiring, with legacy briefing parity.
- Critical PR CI covers affected campaign/briefing/debrief regression,
  deterministic architecture checks, TypeScript and production build.
- No version-2 saves, duplicate operation history, new assets, sidearms,
  warrants, arrests, new police-only incidents or simulation code.

## Release gate
Keep individual feature commits on branch. After CI success, compare against
the latest main and integrate cleanly; do not merge while Pages is running or
queued. Verify the previous Pages release successfully served current main,
then merge the compatible D5 batch at one checkpoint. Verify the new public
Pages build stamp after deployment. If any gate fails, repair and hold release.
