/** Pure, versioned operation-briefing domain. No UI or runtime actor references. */
import type {BuildingArchetype,EnvironmentCondition,SiteScale} from '../breach-site.ts';
import type {IntelMode} from '../breach-intel.ts';
import type {EncounterPremise,EncounterProfile} from '../worldgen/encounter-types.ts';
import type {OperationKind,OperationBrief} from '../breach-operations.ts';

export type ReportQuality='high'|'medium'|'low';
export type ClaimConfidence='confirmed'|'credible'|'unverified'|'unknown';
export type ClaimSource='records'|'patrol'|'witness'|'dispatch'|'unconfirmed';
export type BriefingLength='brief'|'standard'|'detailed';
export type NarrativeStyle='dispatch'|'operations'|'intelligence';
export type MissionTruth={
  schema:1;
  seed:number;
  missionKind:OperationKind;
  building:BuildingArchetype|'unknown';
  subtype:string|null;
  siteName:string;
  scale:SiteScale;
  propertyCondition:EnvironmentCondition|null;
  premise:EncounterPremise|'unknown';
  encounterProfile:EncounterProfile|'unknown';
  risk:1|2|3;
  riskFromContract:boolean;
  intelMode:IntelMode;
  roomCount:number;
  hostileCount:number;
  armedProfileCount:{ordinary:number;security:number;prepared:number};
  activeCivilianCount:number;
  rescueTargetPresent:boolean;
  captureTargetPresent:boolean;
  objective:OperationBrief;
  entryId:string;
};
export type IntelClaim={
  id:string;
  text:string;
  source:ClaimSource;
  confidence:ClaimConfidence;
  /** Traceable to a mission fact, or explicitly to authored story fiction. */
  provenance:string;
  /** Structural facts permitted by the existing architecture-intel mode only. */
  disclosure:'general'|'exterior'|'floor-plan';
};
export type IncidentDefinition={
  id:string;
  name:string;
  missions:readonly OperationKind[];
  buildings?:readonly BuildingArchetype[];
  premises?:readonly EncounterPremise[];
  needs?:'capture-target'|'rescue-target';
  weight:number;
  /** Fictional case history only; never asserts an unimplemented game event. */
  leads:readonly string[];
  contexts:readonly string[];
};
export type OperationDossierV1={
  schema:1;
  identity:{seed:number;missionKind:OperationKind;incidentId:string;
    narrativeSeed:number;title:string;entryId:string;version:1};
  classification:{building:string;siteName:string;intelMode:IntelMode;
    reportQuality:ReportQuality};
  incident:{name:string;lead:string;context:string;style:NarrativeStyle};
  claims:IntelClaim[];
  contract:{objective:string;condition:string;extraction:string};
  /** Fully resolved text, not rerolled on open/restart/replay. */
  rendered:{brief:string;standard:string;detailed:string};
};
