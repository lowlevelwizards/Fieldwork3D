/** R4.2: sparse historical transitions derived from authoritative
 * per-observer samples. No ray casts, no live AI, no future truth.
 */
import type {ReplayFrame} from './breach-replay.ts';

export type ReplaySightTransition={
  t:number;observerId:string;targetId:string;
  kind:'visible-at-start'|'acquired'|'lost';
};
type KnowledgeFrame=Pick<ReplayFrame,'t'|'knowledge'>;
export class ReplayOperatorSightIndex{
  readonly events:readonly ReplaySightTransition[];
  readonly hasEvidence:boolean;
  constructor(frames:readonly KnowledgeFrame[]){
    const events:ReplaySightTransition[]=[];
    const prior=new Map<string,Set<string>>();
    let hasEvidence=false;
    for(const frame of frames){
      const observed=frame.knowledge?.operatorVisibleActorIds;
      if(!observed||!Number.isFinite(frame.t)){
        // A missing snapshot cannot tell us that a contact was lost.
        // Reset the comparison rather than bridging unknowable intervals.
        prior.clear();continue;
      }
      hasEvidence=true;
      for(const [observerId,visible] of Object.entries(observed)){
        if(!Array.isArray(visible))continue;
        const current=new Set(visible),previous=prior.get(observerId);
        for(const id of current)
          if(!previous?.has(id))events.push({
            t:frame.t,observerId,targetId:id,
            kind:previous?'acquired':'visible-at-start'
          });
        if(previous)
          for(const id of previous)
            if(!current.has(id))events.push({
              t:frame.t,observerId,targetId:id,kind:'lost'
            });
        prior.set(observerId,current);
      }
      // An observer missing from a later evidence sample is unknown,
      // not an explicit loss of sight.
      for(const id of prior.keys())
        if(!Object.prototype.hasOwnProperty.call(observed,id))
          prior.delete(id);
    }
    this.events=events.sort((a,b)=>a.t-b.t||
      a.observerId.localeCompare(b.observerId)||
      a.targetId.localeCompare(b.targetId)||
      a.kind.localeCompare(b.kind));
    this.hasEvidence=hasEvidence;
  }
  forObserver(id:string):ReplaySightTransition[]{
    return this.events.filter(e=>e.observerId===id);
  }
}
