# Dispatch D14 — incident dossiers and continuing cases

## D14.0 — Source-of-truth audit (2026-11-16)

Existing systems already provide:
- Five simulation-owned objectives: `clear`, `intel`, `rescue`, `hold`, `capture`. Do not introduce an arrest/warrant/negotiation objective on the strength of briefing copy.
- Seven curated playable D8 Dispatch incident IDs, validated against authored mission/building compatibility. `dispatchCase` is a version-1 contract snapshot; first authored lead and context come from the existing shared `INCIDENTS` catalog.
- `createContracts` retains its mission kind, seed, risk, region, deadline and budget, and only assigns a validated presentation case.
- `resolveOperation` already creates one successful `followUpOf` contract for eligible mission kinds (intel → capture → hold; clear → rescue → hold). The next contract may have a different authored incident ID. A shared contract lineage therefore means **related operations**, not the same location, suspect, agency, or event.
- `CampaignReport` holds authoritative outcome and grade. D10 evidence and D11 standing are already settled. Archived contracts and reports are bounded and older records may be missing.
- Current predeployment modal already distinguishes floor-plan / scouted / unknown intelligence, but shows only the first generic case context. The offer card calls links simply "FOLLOW-UP OPERATION".

## D14.1–D14.2 — Read-only case dossier (this release batch)

- Project each available or accepted Dispatch contract's factual starting assignment, authored **reported** lead, objective, site and intelligence limitations from existing fields only. Do not promise dynamic enemy counts, hostage behavior, offsite surveillance, reinforcement, or police powers not in the game.
- Project a bounded, cycle-safe follow-up trail from actual `followUpOf` links; use real `history` outcomes only. Missing/pruned parent contract or report must be visibly unresolved, never inferred. Preserve the original immutable incident and save facts.
- Show a compact dossier in the predeployment review; make the offer card identify a verified prior operation's outcome. Reuse the existing modal, no extra scrolling-heavy management surface or WebGL.
- Leave original non-Dispatch campaign cards, missions, economy, AI, ROE, force reviews, career settlement, and save schema unchanged.
- Test all seven authored D8 incidents, the five objectives, failure and success lineage, corrupted/missing/pruned history handling, and real save reload where supported.

## D14.3 — compact, opt-in related-case chronicle (this release batch)

The existing last-eight operation log remains primary and unchanged. When
completed related cases exist, a closed-by-default `details` section shows up
to eight genuinely settled follow-ups, their recorded outcomes, and the
closest retained parent from the D14.1 projection. Older or pruned parent
records are explicitly unknown. Do not invent retrospective cases, write
new journal entries or expand the scroll height without a deliberate tap.

## Later D14 candidates (require independent authority)

- D14.4: incident variety within the existing mission mechanics, including briefing uncertainty and site hazards **only when backed by true generated mission data**.
- D14.5+: researched dedicated police gameplay (arrest, negotiation, barricade / warrant mechanics) must not be simulated by new words alone.

## Release discipline

Feature branch commits per stage; only affected Dispatch/campaign UI regression checks and production typecheck/build; release D14 as one logical batch after D13E–F's public Pages build is verified and no Pages publish is queued. No feature branch should merge over a running production deployment.

## D14.4 — Broadened authored incident variety (separate release branch)

Previously Dispatch sampled seven curated incident IDs even though the
shared briefing catalog contains nineteen fully authored, building-compatible
variants covering the existing five playable objectives. Reuse all nineteen
without adding mission mechanics or claiming new police capabilities:
- Capture: High-Risk Warrant, Fugitive Lead, Organizer Apprehension
- Rescue: Missing Person, Urgent Welfare Response, Isolated Worker, Witness Recovery
- Intel: Evidence Seizure, Records Retrieval, Concealed Cache, Equipment Trace
- Clear: After-Hours Security Sweep, Compromised Hideout, Shipment-Site Security,
  Facility Reclamation
- Hold: Access-Control Detail, Perimeter Recovery, Site Preservation, Observation Post

The existing deterministic and recency-weighted selector remains authoritative.
Already-created contracts retain their exact `dispatchCase`, seed, objective,
site class, risk, funds and follow-up links. Newly offered cases gain variety
only within existing compatible authored incident/building data. The historical
`DISPATCH_D8_INCIDENT_IDS` export name is unchanged to avoid consumer migration.
Older saves continue loading; malformed and generic incident IDs still fail
closed. D14.1 dossier projections automatically use the expanded authored pool.

Ship D14.4 independently after D14.0–D14.3 public Pages verification, focused
Dispatch incident/case tests and production typecheck/build.

## D14.5 — One seeded reported lead across briefing surfaces

The predeployment dossier previously displayed the first lead/context in
the shared incident catalog while the tactical briefing deterministically
selected one of its authored variants. That could make the same operation
appear to have different reports depending on the screen.

- Extract the existing B4 seeded lead/context selector into the small
  `briefing/incident-wording.ts` leaf. Do not change the seed mix, authored
  corpus, narrative RNG draw order, report quality, tactical facts or save.
- Reuse the selector for the actual predeployment dossier, offer-card context,
  and the tactical briefing. The same contract seed and incident ID now choose
  identical report wording in both layers; repeated screens remain stable.
- Do not claim that a reported lead is verified operational intelligence;
  the D14 uncertainty language and intel disclosure remain unchanged.
- Test an authored capture, intel and hold case end-to-end through the
  tactical dossier composer, plus deterministic variation and untouched
  authored catalog.
- Stage on a separate feature branch; defer all merging until D14B's Pages
  release is verified and this stage's own critical checks pass.

## D14.6–D14.9 — next situation/closeout feature branch (draft checkpoint)

**D14.6 — contract-backed situation.** The pure dossier now projects a
five-objective operational emphasis, exact contract risk assessment (explicitly
not a count of enemies), actual standard/expanded mission scale, and retained
region/deadline. All nineteen authored cases keep their original deterministic
leads, authored identity, site, mission kind and seed. No guessed premises,
incident-specific hazards, suspect numbers or newly generated encounter truth.

**D14.7 — low-scroll briefing.** The Operations Room contract card exposes
operational emphasis and footprint in one compact line. The predeployment
review reuses existing fields, combines deadline/region/reward and labels risk
as a contract assessment. The original acceptance boundary remains untouched.
Legacy non-Dispatch presentations retain their prior fields.

**D14.8 — read-only after-action reconciliation.** A pure settled-report
projection distinguishes original *reported/unconfirmed* lead from recorded
mission outcome, objective status and grade. Missing D10 force evidence is
explicitly unassessed; recorded zero squad civilian harm is not presented as
legal justification. Missing/pruned contract history remains unknown. A
closed-by-default Operations Room chronicle section displays only the latest
four saved closeouts; existing eight-operation log and related-case trail remain
primary. No inferred shared suspects, scenes, detention or investigations.

**D14.9 — critical regression/release guard.** Focused tests cover nineteen
authored cases, both risk/scale profiles, malformed and legacy incidents,
projection purity, saved history/outcome/evidence, missing links, Quick Play
separation and the original deployment acceptance boundary. Run only affected
Dispatch tests plus typecheck/build via feature PR critical CI. Do not release
without green CI and an explicit verified public Pages predecessor; do not
queue another merge over a production deployment. This stage creates no new
save fields or gameplay rules.
