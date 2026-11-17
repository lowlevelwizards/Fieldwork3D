/** D8.1: immutable, versioned contract-owned incident identity.
 * Authored IDs already exist in the Briefing/Encounter incident catalog.
 * No duplicate police mission definitions or mutable simulation authority.
 */
import type {BuildingArchetype} from './breach-site.ts';
import type {OperationKind} from './breach-operations.ts';
import {INCIDENTS} from './briefing/incident-catalog.ts';

export type DispatchCaseV1=Readonly<{
 version:1;incidentId:string;archetype:BuildingArchetype;
}>;

/** Seven playable authored cases; five objective kinds, no invented systems. */
export const DISPATCH_D8_INCIDENT_IDS=[
 'warrant-service','missing-person','evidence-seizure',
 'after-hours-sweep','compromised-hideout',
 'access-control','perimeter-recovery'
] as const;

export function dispatchIncidentDefinition(id:string){
 return DISPATCH_D8_INCIDENT_IDS.some(x=>x===id)?
  INCIDENTS.find(x=>x.id===id):undefined;
}

/** Unknown/forged IDs and mismatched buildings fail closed on save import. */
export function validDispatchCase(value:unknown,mission:OperationKind):
 value is DispatchCaseV1{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const c=value as Record<string,unknown>;
 if(Object.keys(c).length!==3||c.version!==1||
    typeof c.incidentId!=='string'||typeof c.archetype!=='string')return false;
 const def=dispatchIncidentDefinition(c.incidentId);
 return !!def&&def.missions.includes(mission)&&
   !!def.buildings?.includes(c.archetype as BuildingArchetype);
}
