/** Retrospective NEW INFORMATION, never a synthetic sight check or future
 * disclosure. Every comparison is strictly between recorded past and now.
 * Ground coverage is a cumulative count; actor IDs require exact historical
 * per-observer sightings where that evidence exists. */
import type {ReplayFrame} from './breach-replay.ts';

export type DirectorDiscovery={
  /** Additions to the already-known ground, not all currently visible tiles. */
  newGround:number;
  newHostiles:number;
  newCivilians:number;
  /** Only an actual historical observer of a newly acquired actor. */
  observerId:string|null;
  /** Bounded editorial emphasis; zero for no new knowledge. */
  strength:number
};
const additions=(current:readonly string[]|undefined,
 previous:readonly string[]|undefined):number=>{
  if(!current||!previous)return 0;
  const before=new Set(previous);
  return current.reduce((n,id)=>n+Number(!before.has(id)),0);
};
export function directorRecordedDiscovery(
 frame:ReplayFrame|null|undefined,previous:ReplayFrame|null|undefined,
 friendlyIds:ReadonlySet<string>
):DirectorDiscovery{
  const empty:DirectorDiscovery={newGround:0,newHostiles:0,
    newCivilians:0,observerId:null,strength:0};
  if(!frame||!previous||previous.t>=frame.t)return empty;
  const now=frame.knowledge,then=previous.knowledge;
  if(!now||!then)return empty; // legacy recordings fail closed
  // seenGround is cumulative memory, but its count may not be monotonic
  // across a damaged archive. Never turn a reset into false discovery.
  const newGround=Math.max(0,
    (frame.seenGround?.length??0)-(previous.seenGround?.length??0));
  let newHostiles=0,newCivilians=0;
  let observerId:string|null=null,best=-1;
  const nowEyes=now.operatorVisibleActorIds;
  const prevEyes=then.operatorVisibleActorIds;
  const nowCiv=now.operatorVisibleCivilianIds;
  const prevCiv=then.operatorVisibleCivilianIds;
  if(nowEyes&&prevEyes){
    for(const id of Object.keys(nowEyes).sort()){
      if(!friendlyIds.has(id)||!Object.hasOwn(prevEyes,id))continue;
      const newly=(nowEyes[id]??[]).filter(x=>!friendlyIds.has(x));
      const count=additions(newly,prevEyes[id]);
      const civilians=nowCiv&&prevCiv&&Object.hasOwn(prevCiv,id)?
        additions(nowCiv[id],prevCiv[id]):0;
      newHostiles+=count;
      newCivilians+=civilians;
      const weight=count*3+civilians;
      if(weight>best&&weight>0){best=weight;observerId=id;}
    }
  }
  // Sighting arrays are missing in legacy films. Ground can still carry
  // knowledge if current and prior samples both have explicit knowledge.
  return {newGround,newHostiles,newCivilians,observerId,
    strength:Math.min(1,(Math.min(15,newGround)/15)*.8+
      Math.min(2,newHostiles)*.7+Math.min(2,newCivilians)*.4)};
}
