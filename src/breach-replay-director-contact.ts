/** Only historical, already-observed operator visual acquisition makes
 * an enemy a required subject. Never use present-day AI LOS or future film.
 * Deterministic stable actor IDs, and prefer the active recorded shooter. */
import type {ReplayFrame} from './breach-replay.ts';
export type DirectorRecordedContact={
 observerId:string;targetId:string;
 observer:{x:number;y:number};target:{x:number;y:number};
};
export function directorRecordedContact(
 frame:ReplayFrame,friendlyIds:ReadonlySet<string>,
 preferredObserverId:string|null=null,
 allowedObserverId:string|null=null
):DirectorRecordedContact|null{
 const observations=frame.knowledge?.operatorVisibleActorIds;
 if(!observations)return null; // old film has no individual evidence
 const byId=new Map(frame.actors.map(a=>[a.id,a]));
 const pairs:DirectorRecordedContact[]=[];
 for(const observerId of Object.keys(observations).sort()){
   if(!friendlyIds.has(observerId)||
      (allowedObserverId!==null&&observerId!==allowedObserverId))continue;
   const observer=byId.get(observerId);
   if(!observer||observer.health<=0)continue;
   for(const targetId of observations[observerId]??[]){
     if(friendlyIds.has(targetId))continue;
     const target=byId.get(targetId);
     if(!target||target.health<=0)continue;
     pairs.push({observerId,targetId,observer:observer.p,target:target.p});
   }
 }
 if(!pairs.length)return null;
 pairs.sort((a,b)=>
   Number(b.observerId===preferredObserverId)-
   Number(a.observerId===preferredObserverId)||
   a.observerId.localeCompare(b.observerId)||
   a.targetId.localeCompare(b.targetId));
 return pairs[0];
}
