# Fieldwork Breach — Living Briefings (design specification, 2026-11-06)

**Status:** Proposed; not shipped. This document is the content/gameplay design,
separate from the narrowly scoped same-mission restart bugfix.

## Direction

Use **fact-driven, constrained narrative assembly**, not an unconstrained
Mad Libs sentence generator and not generative AI at runtime.

The mission generator makes **one authoritative Operation Dossier** from
verified map, objective, encounter, intel and campaign facts. A briefing
renderer selects a few human-authored phrasing variants for those facts;
**every sentence must be true under the player's current intel setting**.

The dossier is reproducible from the resolved site + encounter + operation
seed. It belongs to the mission, not to each opening of the briefing UI.
Restart, replay and saved mission share its identity; a NEW SITE gets a new one.

## Levels of information

1. **Hard facts:** mission type, victory/failure conditions, extraction,
   deployment point, building type, site scale, known plan constraints.
2. **Operational intelligence:** evidence source, threat estimate, timing,
   likely points of contact, civilian indications, objective-location quality.
   Every piece includes confidence and whether it was briefed to the squad.
3. **Human story:** caller, incident, time pressure, a notable complication,
   why this particular site matters. Story only uses compatible facts.
4. **Optional atmosphere:** concise dispatch/radio flavor, not critical
   gameplay information. Always skippable.

No briefing may disclose hidden enemy positions, secret doors, floor plans
or civilian positions that the chosen intel level has not earned. It also
must not assert a civilian/hostage/fire/chemical hazard that the simulated
mission does not actually support.

## Data model (illustrative, not yet runtime code)

```ts
type BriefFact<T> = {
  value: T;
  source: 'dispatch'|'witness'|'surveillance'|'records'|'unknown';
  confidence: 'confirmed'|'credible'|'unverified';
  visibility: 'public'|'exterior-known'|'floor-plan'|'full-view';
};
type OperationDossier = {
  schema: 1;
  identity: { seed:number; missionKind:OperationKind; title:string;
    siteType:string; siteName:string; entryId:string };
  task: { objective:string; success:string; extraction:string };
  situation: {
    trigger:string; whyNow:string; stakeholder:string;
    urgency:'routine'|'time-sensitive'|'immediate';
    threat:BriefFact<string>;
    occupants:BriefFact<string>;
    objectiveLocation:BriefFact<string>;
    siteHistory?:BriefFact<string>;
  };
  considerations: BriefFact<string>[];
  narrative: { variantIds:string[]; briefingText:string };
};
```

**Information compiler:** derive confirmed attributes from the generated
Site/EncounterPlan and mission type; add only an authored selection of
compatible incident tags; validate all assertions; downgrade unconfirmed
intel to hedged wording ("reported", "possibly", "not verified").
Architecture, deployment and win conditions remain the sole authorities.

## Narrative grammar

Assemble **sections**, not arbitrary interchangeable words:

- Dispatch lead: why the operation exists (1 sentence).
- Situation: what is reliably known about the site and actors (1–2 sentences).
- Task: what the team must do (always explicit, fixed contract language).
- Considerations: one or two tactically relevant complications, only if
  physically supported by the site/encounter/intel.
- Extraction: exact success/extract rule, never hidden in flavor text.

Template families are gated by mission kind, archetype, condition, encounter
profile, intel quality, campaign state and prior dossier history. Sentence
structures vary, not just proper nouns. Every fact slot has validation rules
and at least three authored phrasings in the mature library. For consistency
and replay reproducibility, choose with a separate seeded narrative RNG,
not a call into the worldgen/AI RNG.

### Sample output A — residence / capture / poor intelligence

**TASK FORCE / WARRANT SERVICE**
A person wanted in connection with an armed robbery is believed to be staying
at a residence on the east side of the block. The last sighting is several
hours old; the number of associates inside is not confirmed.

**OBJECTIVE** Disable or compel surrender of the designated target, then
secure them. **EXTRACTION** Return a surviving operator to the marked exit
after confirmation.

*Note: example only. The real renderer must never invent a historical
incident or the target's location unless the dossier supplies those facts.*

### Sample output B — warehouse / document recovery / floor plan

**TASK FORCE / RECORDS SEIZURE**
An ongoing investigation has identified a warehouse believed to contain
financial records. A building plan is available, but occupancy is unverified.
The loading bay offers an exterior approach; activity elsewhere is unknown.

**OBJECTIVE** Recover the designated records. **EXTRACTION** Withdraw with
the intelligence carrier.

*The loading bay reference requires an actual verified loading-bay approach;
otherwise use a neutral site description.*

### Sample output C — clinic / rescue / time-sensitive

**TASK FORCE / PERSONNEL RECOVERY**
A missing staff member was last reported inside the clinic. The available
witness account is incomplete; dispatch cannot confirm whether the site is
still occupied. Prioritize positive identification before moving the person.

**OBJECTIVE** Locate and make contact with the marked person.
**EXTRACTION** Escort or transport them to the marked exit.

*Do not imply a populated rescue scene unless the active rescue rules and
spawn setup support it.*

## How to prevent repetition

- Track narrative structure and salient incident tags in bounded recent
  history (local Quick Play history; campaign contract record).
- Prefer unused **scenario/lead families** over word substitutions.
- Avoid repeating the same dispatch opening, stakeholder/incident pair and
  complication in adjacent missions.
- Preserve stable title and text on restart, replay, and revisit.
- Vary between a terse three-line dispatch and a fuller 20–45-second report;
  provide a player setting for **Brief / Standard / Detailed**.
- Allow a "Show tactical facts only" mode; variety must never bury objectives.

## UI concept (mobile-first)

A single readable briefing sheet, not a wall of cards:

1. Top: operation codename, site type, risk/intel quality chips.
2. Situation: 2–4 short sentences, with unverified claims explicitly marked.
3. **TASK** and **EXTRACTION** fixed, high-legibility lines.
4. Two optional collapsible sections: **INTELLIGENCE** and **SITE / ENTRY**.
5. **DEPLOY** action uses the existing tactical flow. Reopening the sheet
   never rerolls the story. Entry selection changes only the entry detail,
   not who/what/why. No extra mandatory click to start Quick Play.

Strong UX principle: the briefing must help players choose a real tactic,
not pretend to be procedurally cinematic. Build on the existing
`operationBriefing()`, `#briefingPanel`, `Site`, `EncounterPlan`,
`MissionRecorder`, Campaign contract details and saved-mission manifest.

## Implementation releases

**B0 — trust and stable identity.** Dossier interface + builder. Lock dossier
to mission/site identity, carry through restart and replay. No extra UI yet.
Assert known vs unknown facts and invariant mission win/extract rules.

**B1 — useful facts first.** Generate 2–3 verified situation facts per
mission based on map archetype, encountered role, objective and intel quality.
Display with clear task and extraction. Add 15–20 dispatch structure variants
across five mission kinds, avoiding hardcoded enemy count guesses.

**B2 — story families.** 5–8 authored incident families per mission kind,
conditional triggers, stakes, distinct leads. Build a 50-seed batch renderer
and reject contradiction, duplicated sentences and stale intel.

**B3 — campaign continuity.** Connect contract history, repeat locations,
return visits, witness credibility and prior outcomes only when the campaign
actually records those facts. Keep Quick Play dossiers self-contained.

**B4 — presentation polish.** Optional dispatch voice/text pacing, distinct
clear/uncertain visual labels, brief/standard/detailed preference, low-friction
mobile review, optional simple dispatch audio hooks into Sound Lab.

## Acceptance and telemetry

- Restart produces **identical dossier and map identity**, not a fresh
  narrative draw.
- With true-blind or exterior-known intel, 0 hidden-interior details leak.
- Every briefing states the correct objective and extraction, for 100+ seeds
  spanning all archetypes, five operation kinds and all intel modes.
- Every location-specific sentence has a matching real map/portal fact.
- No unimplemented scripted event or hazard is suggested as real.
- Opening/closing briefing is sub-frame cheap; no runtime network or LLM.
- 20-mission rotation contains diverse structures, not cosmetic synonyms.
- A reader can extract task, threat confidence and extraction in under
  ten seconds even if all optional narrative is collapsed.
