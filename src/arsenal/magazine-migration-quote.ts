/** Arsenal R16b — read-only preflight for eventual per-magazine capacities.
 * This is NOT a save migration or a gameplay mutator. Every possible state
 * transition must be checked before any v2 capacity change is authorized.
 */
import type {MagazineItem} from '../breach-magazines.ts';
import {compareArsenalMagazineWithSimulation,type ArsenalMagazineComparison}
 from './magazine-identities.ts';
import type {ArsenalRecipeV2} from './recipes.ts';

export interface ArsenalMagazineMigrationQuote{
 valid:boolean;reason?:string;
 profile?:ArsenalMagazineComparison;
 roundsBefore:number;roundsAfter:number;
 /** A versioned reader/writer and reload authority MUST ship before applying. */
 requiresVersionedMigration:true;
 loadedRounds?:number;reserveRounds?:number;
 spares?:readonly MagazineItem[];
}
const denied=(reason:string):ArsenalMagazineMigrationQuote=>({
 valid:false,reason,roundsBefore:0,roundsAfter:0,
 requiresVersionedMigration:true
});
/** Preserve each magazine's stable ID, location and partial rounds exactly.
 * This deliberately refuses overfull or nonconserving data instead of
 * splitting/merging physical magazines or minting new rounds.
 */
export function quoteArsenalMagazineMigration(
 recipe:ArsenalRecipeV2,loadedRounds:number,reserveRounds:number,
 spares:readonly MagazineItem[]
):ArsenalMagazineMigrationQuote{
 const profile=compareArsenalMagazineWithSimulation(recipe);
 if(!profile)return denied('Invalid weapon or unrecognized physical magazine');
 const integer=(n:number)=>Number.isInteger(n)&&n>=0;
 if(!integer(loadedRounds)||loadedRounds>profile.simulatedCapacity)
  return denied('Legacy loaded ammunition exceeds authoritative class capacity');
 if(!integer(reserveRounds)||reserveRounds>300)
  return denied('Legacy reserve ammunition is invalid');
 if(!Array.isArray(spares)||spares.length>64)
  return denied('Magazine inventory shape is invalid');
 const ids=new Set<string>();let total=0;
 for(const mag of spares){
  if(!mag||typeof mag.id!=='string'||!mag.id||mag.id.length>120||
   ids.has(mag.id)||mag.weapon!==profile.weapon||
   !integer(mag.rounds)||mag.rounds<1||
   mag.rounds>profile.simulatedCapacity)
   return denied('Spare magazine identity or legacy capacity is invalid');
  if(mag.rounds>profile.nominalRounds)
   return denied('A spare magazine exceeds the new physical capacity');
  ids.add(mag.id);total+=mag.rounds;
 }
 if(total!==reserveRounds)
  return denied('Reserve total does not match saved spare magazines');
 if(loadedRounds>profile.nominalRounds)
  return denied('Loaded rounds exceed physical capacity; repacking is required');
 const clone=spares.map(mag=>({...mag}));
 const before=loadedRounds+reserveRounds;
 return {valid:true,profile,roundsBefore:before,roundsAfter:before,
  loadedRounds,reserveRounds,spares:clone,
  requiresVersionedMigration:true};
}
