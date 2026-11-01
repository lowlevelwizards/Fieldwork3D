/** Authoritative seed-derived scenario metadata. Actors are instantiated by Breach,
 * not by the architectural compiler. Optional on Site during migration. */
import type {Pt} from '../breach-core.ts';
import type {BuildingArchetype,SiteScale} from '../breach-site.ts';
import type {OperationKind} from '../breach-operations.ts';
export type EncounterPremise =
  'routine'|'after-hours'|'hideout'|'guarded'|'disturbance'|'defensive'|'vacant'|'incident';
export type EncounterRole =
  'occupant'|'sentry'|'lookout'|'patrol'|'investigator'|'reserve'|'leader'|'target';
export type EncounterActivity =
  'idle'|'talking'|'seated'|'working'|'inspecting'|'watching'|'resting'|'patrolling';
export type EncounterReadiness = 'unaware'|'relaxed'|'attentive'|'suspicious'|'alerted'|'prepared';
export type EncounterContext = {
  /** Independent from the architectural seed. Defaults to the site's own seed. */
  seed?:number;
  mission?:OperationKind;
  /** Only Campaign supplies a contract risk. */
  risk?:1|2|3;
  /** Future inspector override; the default always derives from identity. */
  premise?:EncounterPremise;
};
export type EncounterActorSpec = {
  id:string;groupId:string;role:EncounterRole;activity:EncounterActivity;
  readiness:EncounterReadiness;zoneId?:string;roomId?:string;
  position:Pt;heading:number;weaponProfile?:'ordinary'|'security'|'prepared';
};
export type EncounterGroup = {
  id:string;purpose:'occupants'|'security'|'organised'|'response'|'target';
  zoneId?:string;members:string[];
};
export type EncounterDiagnostics = {
  targetHostiles:number;placedHostiles:number;rejected:number;
  fallbacks:number;occupiedZones:number;emptyZones:number;
  notes:string[];
};
export type EncounterPlan = {
  version:1;seed:number;building:BuildingArchetype;scale:SiteScale;
  premise:EncounterPremise;mission:OperationKind;risk:1|2|3;
  expectedOccupancy:number;hostileBudget:number;
  groups:EncounterGroup[];actors:EncounterActorSpec[];
  diagnostics:EncounterDiagnostics;
};
