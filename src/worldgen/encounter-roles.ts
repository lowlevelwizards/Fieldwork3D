/** Threat roles are assigned independently of personality; mission-critical
 * capture targets are stable and group purposes remain physically plausible. */
import type {Site} from '../breach-site.ts';
import type {EncounterActorSpec,EncounterGroup,EncounterPremise,
 EncounterRole} from './encounter-types.ts';
import type {OperationKind} from '../breach-operations.ts';
import {encounterRng} from './encounter-rng.ts';
export function assignEncounterRoles(site:Site,source:EncounterActorSpec[],
 groups:EncounterGroup[],premise:EncounterPremise,
 mission:OperationKind,seed:number):EncounterActorSpec[]{
 const rng=encounterRng(seed,8);
 const groupMap=new Map(groups.map(g=>[g.id,g]));
 return source.map((a,index)=>{
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
}
