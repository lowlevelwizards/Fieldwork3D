/** EB5: classify already placed groups without changing physical population,
 * routes, objectives, or the existing seeded generation streams. */
import type {AiGroupKind} from '../breach-ai-group-profiles.ts';
import type {EncounterActorSpec,EncounterContext,EncounterGroup,EncounterPremise} from './encounter-types.ts';
import {encounterRng} from './encounter-rng.ts';
export type GroupIdentityContext=Pick<EncounterContext,'risk'|'mission'|'archetype'|'groupProfile'|'forceContext'>;
export function selectEncounterGroupProfile(group:EncounterGroup,actors:readonly EncounterActorSpec[],
 premise:EncounterPremise,seed:number,context:GroupIdentityContext={},incidentId?:string|null):AiGroupKind{
 if(group.behaviorProfile)return group.behaviorProfile;
 if(context.groupProfile)return context.groupProfile;
 const members=new Set(group.members);
 const target=actors.some(a=>members.has(a.id)&&a.role==='target');
 const roll=encounterRng(seed,71+Number(group.id.match(/\d+$/)?.[0]??0))();
 // A fugitive is an encounter circumstance; avoid recasting an established
 // organized group or a security detail as civilian merely for containing a target.
 if(group.purpose==='target'||target&&group.purpose==='occupants'&&
   (incidentId==='fugitive-lead'||context.mission==='capture'&&roll<.65))return 'fugitives';
 if(group.purpose==='response')return 'specialists';
 if(context.forceContext==='military'){
  if(group.purpose==='security')return 'security';
  if(premise==='defensive'||premise==='guarded'||group.purpose==='organised')
   return roll<.18?'specialists':roll<.77?'regular-force':'armed-irregulars';
  return roll<.65?'armed-irregulars':'opportunists';
 }
 // Survival settings use the shared irregular/civilian catalog, not a new faction or military pool.
 if(context.forceContext==='survival'){
  if(group.purpose==='security')return roll<.65?'security':'armed-irregulars';
  if(group.purpose==='organised')return roll<.65?'armed-irregulars':'organised-criminals';
  return premise==='defensive'&&roll<.55?'armed-irregulars':'opportunists';
 }
 if(group.purpose==='security')return premise==='guarded'&&context.risk===3&&roll<.18?'specialists':'security';
 if(group.purpose==='organised')return premise==='defensive'?'armed-irregulars':'organised-criminals';
 if(incidentId==='organizer-apprehension'||incidentId==='compromised-hideout'||
    incidentId==='shipment-security')return 'organised-criminals';
 return 'opportunists';
}
export function attachGroupProfiles(groups:readonly EncounterGroup[],actors:readonly EncounterActorSpec[],
 premise:EncounterPremise,seed:number,context:GroupIdentityContext={},incidentId?:string|null):EncounterGroup[]{
 return groups.map(group=>({...group,behaviorProfile:selectEncounterGroupProfile(group,actors,premise,seed,context,incidentId)}));
}
