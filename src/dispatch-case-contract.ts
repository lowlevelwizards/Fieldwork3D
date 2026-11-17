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

/** D14.4: nineteen existing authored, building-compatible cases across
 * the five supported mission objectives. No new gameplay or police powers.
 * Keep the D8 export stable for existing consumers and saved case IDs.
 */
export const DISPATCH_D8_INCIDENT_IDS=[
 'warrant-service','fugitive-lead','organizer-apprehension',
 'missing-person','welfare-response','isolated-employee','witness-recovery',
 'evidence-seizure','records-review','concealed-cache','equipment-trace',
 'after-hours-sweep','compromised-hideout','shipment-security','facility-reclamation',
 'access-control','perimeter-recovery','site-preservation','observation-post'
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
