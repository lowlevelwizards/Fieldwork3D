/** Threat roles are assigned independently of personality; mission-critical
 * capture targets are stable and group purposes remain physically plausible. */
import type {Site} from '../breach-site.ts';
import type {EncounterActorSpec,EncounterGroup,EncounterPremise,
 EncounterRole} from './encounter-types.ts';
import type {OperationKind} from '../breach-operations.ts';
import {encounterRng} from './encounter-rng.ts';
const near=(a:{x:number;y:number},b:{x:number;y:number})=>
 Math.hypot(a.x-b.x,a.y-b.y);
export function assignEncounterRoles(site:Site,source:EncounterActorSpec[],
 groups:EncounterGroup[],premise:EncounterPremise,
 mission:OperationKind,seed:number):EncounterActorSpec[]{
 const rng=encounterRng(seed,8);
 const groupMap=new Map(groups.map(g=>[g.id,g]));
 const assigned=source.map((a,index)=>{
  const purpose=groupMap.get(a.groupId)?.purpose;
  let role:EncounterRole=a.role;
  if(mission==='capture'&&index===0)role='target';
  else if(purpose==='security'){
   role=rng()<.24?'lookout':rng()<.38?'patrol':'sentry';
  }else if(purpose==='organised'){
   if(a.role==='leader')role='leader';
   else role=rng()<.35?'reserve':rng()<.38?'investigator':'occupant';
  }else if(premise==='defensive'&&rng()<.3)role='reserve';
  else if(['routine','after-hours'].includes(premise)&&rng()<.22)role='patrol';
  const weaponProfile:EncounterActorSpec['weaponProfile']=
   ['sentry','lookout','leader','reserve'].includes(role)?'security':
   premise==='defensive'?'prepared':'ordinary';
  return {...a,role,weaponProfile};
 });
 // Mission identity should matter near its actual objective, not imply
 // new hostiles or move anyone into an unsafe/unknown part of the map.
 // The already-validated spawn solver owns all coordinates and capacity.
 if(mission==='clear')return assigned;
 const capture=assigned.find(a=>a.role==='target');
 const focus=mission==='capture'?capture?.position:site.objective;
 if(!focus)return assigned;
 const closest=assigned.map((actor,index)=>({
   actor,index,distance:near(actor.position,focus)
  })).filter(x=>x.actor.role!=='target'&&x.actor.role!=='leader'&&
    x.distance<=175)
   .sort((a,b)=>a.distance-b.distance||
    a.actor.id.localeCompare(b.actor.id))[0];
 if(!closest)return assigned;
 const role:EncounterRole=mission==='hold'?'reserve':'sentry';
 assigned[closest.index]={...closest.actor,role,weaponProfile:'security'};
 return assigned;
}
