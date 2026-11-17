# Dispatch D8 — Incident-owned campaign generation

D8.0 audit (2026-11-16). Contracts currently persist seed/kind/risk/region but
not an authored case or compatible building. D4 labels map the five generic
kinds to five generic callouts. D5 transient presentation is tied to accepted
contract IDs, not a generated incident. The mission reset currently passes
kind and risk, but not a requested building/incident. Site generation already
accepts an archetype and optional encounter intent; the encounter director
may substitute another incident if the requested premise is incompatible.
Briefing already reads the actual site's incident intent; score and history
remain owned by CampaignState.

Reuse existing `INCIDENTS`, `generateSite`, `EncounterContext`,
`createOperationDossier`, D5 presentation and existing five objectives.

D8 batch plan:
- D8.1: optional v1 `Contract.dispatchCase`; validate IDs, eligible objective
  and compatible building on load. Existing accepted and archived contracts
  remain legacy and must not be rewritten.
- D8.2: deterministic, Dispatch-only assignment for seven curated existing
  incident IDs. Populate new offers and authored follow-ups. Leave Sandbox
  and old Campaign untouched. Keep prior incident data immutable.
- D8.3: pass contract-owned building and incident through mission creation
  into the existing generator. Never silently substitute a different case;
  either produce its correct encounter or fail the generation gate.
- D8.4: tie case title and dossier to the same generated incident. No false
  warrant/legal procedures, no new objectives, AI systems, ROE or arrests.
- D8.5–D8.7: concise case card, history, regression and release checkpoints.

Critical hazards:
1. `generateSite` chooses archetype from seed if not supplied.
2. `assembleSession` doesn't forward an archetype override.
3. `BreachMissionController.create` doesn't forward explicit incident ID.
4. `chooseGenerationIncidentIntent` / `resolveGenerationIncidentIntent`
   can choose compatible alternatives if a requested ID is impossible.
5. Historical saves lack incident metadata; D5 must remain their fallback.
6. Restart and replay use a prebuilt site, so no reroll should occur there.
7. Dossier must never claim unseen hostiles or unsupported civilian mechanics.

Acceptance: deterministic fixed-seed catalog tests, contract lifecycle,
site/encounter/dossier alignment for featured cases, old-save isolation,
campaign settlement and critical PR CI plus production build. Release only
after preceding Pages run's public build-stamp check succeeded.
