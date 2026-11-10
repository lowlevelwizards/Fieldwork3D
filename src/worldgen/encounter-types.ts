/** Authoritative seed-derived scenario metadata. Actors are instantiated by Breach,
 * not by the architectural compiler. Optional on Site during migration. */
import type {Pt} from '../breach-core.ts';
import type {BuildingArchetype,SiteScale} from '../breach-site.ts';
import type {OperationKind} from '../breach-operations.ts';
export type EncounterPremise =
  'routine'|'after-hours'|'hideout'|'guarded'|'disturbance'|'defensive'|'vacant'|'incident';
/** Seeded encounter distribution, independent of architectural identity. */
export type EncounterProfile='quiet-approach'|'scattered'|'clustered'|
  'active'|'prepared';
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
  /** Quick Play adjusts population only, not AI intelligence or accuracy. */
  presence?:'light'|'typical'|'heavy';
  /** Ambient bystanders are separate from mandatory rescue objectives. */
  civilianPolicy?:'scenario'|'on'|'off';
  /** Future inspector override; the default always derives from identity. */
  premise?:EncounterPremise;
  /** Developer opt-in until B5–B8 are physically and visually integrated. */
  enableCivilians?:boolean;
  /** Experimental B5: only set by the Briefing Lab. */
  enableIncidentIntent?:boolean;
  incidentId?:string;
};
export type EncounterActorSpec = {
  id:string;groupId:string;role:EncounterRole;activity:EncounterActivity;
  readiness:EncounterReadiness;zoneId?:string;roomId?:string;
  position:Pt;heading:number;routine?:Pt[];weaponProfile?:'ordinary'|'security'|'prepared';
};
/** Separate from EncounterActorSpec: an 'occupant' hostile remains armed.
 * Neutrals have no weapon profile, AI firing authority or faction role. */
export type CivilianSpec={
  id:string;role:'resident'|'visitor'|'employee'|'customer'|'patient'|'guest'|'rescue';
  persona:'cautious'|'steady'|'startled';
  activity:'idle'|'working'|'inspecting'|'seated'|'waiting';
  position:Pt;heading:number;roomId:string;zoneId?:string;
  routine?:Pt[];appearanceSeed:number;isRescueTarget?:boolean;
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
  premise:EncounterPremise;profile?:EncounterProfile;
  mission:OperationKind;risk:1|2|3;
  /** The selected intent may still be rejected by post-generation eligibility. */
  incidentIntentId?:string;
  expectedOccupancy:number;hostileBudget:number;
  groups:EncounterGroup[];actors:EncounterActorSpec[];
  /** Additive version-one extension. Absent on legacy saved encounters. */
  neutrals?:CivilianSpec[];
  diagnostics:EncounterDiagnostics;
};
