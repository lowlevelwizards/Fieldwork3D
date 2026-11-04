/** Weighted encounter identity. Changes distribution, never bypasses the
 * physical spawn solver, mission contracts, or insertion clearance.
 */
import type {EncounterPremise,EncounterProfile}
 from './encounter-types.ts';
import {encounterRng} from './encounter-rng.ts';
const profiles:readonly EncounterProfile[]=[
 'quiet-approach','scattered','clustered','active','prepared'];
export function chooseEncounterProfile(premise:EncounterPremise,
 seed:number):EncounterProfile{
 const weights:Record<EncounterProfile,number>={
  'quiet-approach':2.3,scattered:4,clustered:1.8,active:2.1,prepared:1.3
 };
 if(premise==='vacant'||premise==='after-hours'){
  weights['quiet-approach']+=5;weights.active=.5;
 }
 if(premise==='routine'||premise==='disturbance')weights.active+=4;
 if(premise==='hideout'||premise==='incident')weights.clustered+=4;
 if(premise==='guarded'||premise==='defensive'){
  weights.prepared+=7;weights['quiet-approach']*=.65;
 }
 let roll=encounterRng(seed,19)()*
  profiles.reduce((n,key)=>n+weights[key],0);
 for(const p of profiles){roll-=weights[p];if(roll<=0)return p;}
 return profiles.at(-1)!;
}
