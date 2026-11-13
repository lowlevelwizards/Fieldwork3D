/** Release B3: local, physical tactics for three authored incident families.
 * Changes only existing, already placed actor duties and initial readiness.
 * The live AI and motor still own LOS, hearing, routes, combat and outcomes.
 */
import type {Site} from '../breach-site.ts';
import type {OperationKind} from '../breach-operations.ts';
import type {EncounterActorSpec} from './encounter-types.ts';
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>
 Math.hypot(a.x-b.x,a.y-b.y);
const special=(a:EncounterActorSpec)=>
 a.role==='target'||a.role==='leader';
/** Must be called AFTER objective security/initial activities, BEFORE the
 * normal real-space local routine generator. Does not mutate inputs, alter
 * any actor's identity/coordinates, or manufacture a target or civilian.
 */
export function applyIncidentActorDoctrine(
 site:Pick<Site,'objective'>,source:readonly EncounterActorSpec[],
 mission:OperationKind,incidentId:string|null|undefined
):EncounterActorSpec[]{
 const kind=incidentId==='warrant-service'&&mission==='capture'?'warrant':
   incidentId==='missing-person'&&mission==='rescue'?'missing':
   incidentId==='evidence-seizure'&&mission==='intel'?'evidence':null;
 if(!kind)return source.map(a=>({...a}));
 const actors=source.map(a=>({...a}));
 const target=actors.find(a=>a.role==='target');
 const focus=kind==='warrant'?target?.position:site.objective;
 if(!focus)return actors;
 // Only a physically nearby existing actor qualifies. Far-side remote
 // guards are not conjured near an objective and nobody knows the player.
 const nearby=actors.map((actor,index)=>({actor,index,
   distance:distance(actor.position,focus)}))
   .filter(item=>!special(item.actor)&&item.distance<=175)
   .sort((a,b)=>a.distance-b.distance||
      a.actor.id.localeCompare(b.actor.id));
 if(kind==='warrant'){
   if(target){
     const index=actors.findIndex(a=>a.id===target.id);
     actors[index]={...actors[index],readiness:'suspicious'};
   }
   const guard=nearby[0];
   if(guard)actors[guard.index]={...guard.actor,
     role:'sentry',activity:'watching',readiness:'prepared',
     weaponProfile:'security'};
 }else if(kind==='missing'){
   // A mobile/searching hostile is a different local tactical problem from
   // a static armed guard. The routine maker can refuse unsafe movements.
   const searcher=nearby[0];
   if(searcher)actors[searcher.index]={...searcher.actor,
     role:'patrol',activity:'patrolling',readiness:'attentive'};
 }else{
   const watcher=nearby[0];
   if(watcher)actors[watcher.index]={...watcher.actor,
     role:'sentry',activity:'watching',readiness:'attentive',
     weaponProfile:'security'};
   // A second evidence-site actor may circulate if the real room has a
   // safe short patrol. Never change the only watch guarding the cache.
   const patrol=nearby.find(a=>a.index!==watcher?.index&&
     a.distance>65&&a.distance<=175);
   if(patrol)actors[patrol.index]={...patrol.actor,
     role:'patrol',activity:'patrolling',readiness:'attentive'};
 }
 return actors;
}
