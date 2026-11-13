/** Experimental pre-encounter intent; no world changes unless explicitly enabled. */
import type {EncounterPremise} from '../worldgen/encounter-types.ts';
import type {BuildingArchetype} from '../breach-site.ts';
import type {OperationKind} from '../breach-operations.ts';
import {INCIDENTS} from './incident-catalog.ts';
import {briefingRng,mixBriefingSeed,weightedBriefingPick} from './briefing-seed.ts';

export function chooseGenerationIncidentIntent(
 seed:number,building:BuildingArchetype,mission:OperationKind,requestedId?:string
):string|null{
 const pool=INCIDENTS.filter(i=>i.missions.includes(mission)&&
   (!i.buildings||i.buildings.includes(building))&&
   (!i.needs||i.needs==='rescue-target'&&mission==='rescue'||
     i.needs==='capture-target'&&mission==='capture'));
 const requested=pool.find(i=>i.id===requestedId);
 if(requested)return requested.id;
 const rand=briefingRng(mixBriefingSeed(seed,0x671eb294));
 return weightedBriefingPick(pool,i=>i.weight,rand)?.id??null;
}

/** The premise is not known until AFTER furnishing and encounter planning.
 * Resolve the chosen intent against that actual premise before using it for
 * profile, actors or briefing. A fallback stays deterministic and cannot
 * claim an impossible incident/building/mission combination.
 */
export function resolveGenerationIncidentIntent(
 seed:number,building:BuildingArchetype,mission:OperationKind,
 premise:EncounterPremise,candidateId?:string
):string|null{
 const pool=INCIDENTS.filter(i=>i.missions.includes(mission)&&
   (!i.buildings||i.buildings.includes(building))&&
   (!i.premises||i.premises.includes(premise))&&
   (!i.needs||i.needs==='rescue-target'&&mission==='rescue'||
     i.needs==='capture-target'&&mission==='capture'));
 const selected=pool.find(i=>i.id===candidateId);
 if(selected)return selected.id;
 const rand=briefingRng(mixBriefingSeed(seed,0x1ec1de17));
 return weightedBriefingPick(pool,i=>i.weight,rand)?.id??
   'generic-'+mission;
}
