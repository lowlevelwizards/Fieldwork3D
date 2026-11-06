/** Experimental pre-encounter intent; no world changes unless explicitly enabled. */
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
