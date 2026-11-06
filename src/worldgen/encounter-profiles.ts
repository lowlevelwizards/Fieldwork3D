/** Weighted encounter identity. Changes distribution, never bypasses the
 * physical spawn solver, mission contracts, or insertion clearance.
 */
import type {OperationKind} from '../breach-operations.ts';
import type {EncounterPremise,EncounterProfile}
 from './encounter-types.ts';
import {encounterRng} from './encounter-rng.ts';
const profiles:readonly EncounterProfile[]=[
 'quiet-approach','scattered','clustered','active','prepared'];
export function chooseEncounterProfile(premise:EncounterPremise,
 seed:number,mission?:OperationKind,incidentId?:string):EncounterProfile{
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
 // Mission-specific encounter SHAPES, not scripted spawns or mandatory
 // alarms. Keep existing premise and seeded sampling authoritative.
 switch(mission){
  case 'clear':
   weights.scattered+=3;weights.active+=1.5;break;
  case 'intel':
   weights['quiet-approach']+=4.5;weights.scattered+=1.8;break;
  case 'rescue':
   weights.clustered+=3.2;weights.active+=2;break;
  case 'capture':
   weights.clustered+=2.6;weights.prepared+=2.7;break;
  case 'hold':
   weights.prepared+=5;weights.clustered+=1;break;
 }
 if(incidentId==='warrant-service'){
   weights.prepared+=3;weights.clustered+=1;
 }else if(incidentId==='missing-person'){
   weights.active+=2;weights.clustered+=1;
 }else if(incidentId==='evidence-seizure'){
   weights['quiet-approach']+=3;weights.scattered+=1;
 }
 let roll=encounterRng(seed,19)()
  profiles.reduce((n,key)=>n+weights[key],0);
 for(const p of profiles){roll-=weights[p];if(roll<=0)return p;}
 return profiles.at(-1)!;
}
