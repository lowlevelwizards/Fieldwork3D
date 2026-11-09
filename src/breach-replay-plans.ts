/** Replay R2: immutable authored plan revisions, independent of motor routes. */
import type {Session} from './breach-game.ts';
import type {PlanNode,Pt} from './breach-plan.ts';
import {copyNodes} from './breach-plan.ts';
export type ReplayPlanRevision={
  revisionId:number;tick:number;order:number;actorId:string;origin:Pt;
  phase:Session['phase'];nodes:PlanNode[];
};
export class ReplayPlanRecorder{
  readonly revisions:ReplayPlanRevision[]=[];
  private readonly signatures=new Map<string,string>();
  private readonly byActor=new Map<string,ReplayPlanRevision[]>();
  private readonly firstAuthored=new Map<string,ReplayPlanRevision>();
  private indexedCount=0;
  private previousIndexed:ReplayPlanRevision|null=null;
  private ordered=true;
  private lastTick=-Infinity;
  private lastOrder=-Infinity;
  private nextId=1;
  /** Archives restore directly into revisions[]. Index only new entries;
   * never scan the entire mission for every historical viewer query.
   * Unordered legacy revisions retain the old linear lookup semantics.
   */
  private syncIndex():void{
    if(this.indexedCount>this.revisions.length||
       (this.indexedCount>0&&
        this.revisions[this.indexedCount-1]!==this.previousIndexed)){
      this.byActor.clear();this.firstAuthored.clear();
      this.indexedCount=0;this.previousIndexed=null;this.ordered=true;
      this.lastTick=-Infinity;this.lastOrder=-Infinity;
    }
    for(let i=this.indexedCount;i<this.revisions.length;i++){
      const revision=this.revisions[i];
      if(revision.tick<this.lastTick||
         (revision.tick===this.lastTick&&revision.order<this.lastOrder))
        this.ordered=false;
      this.lastTick=revision.tick;this.lastOrder=revision.order;
      let history=this.byActor.get(revision.actorId);
      if(!history){history=[];this.byActor.set(revision.actorId,history);}
      history.push(revision);
      if(revision.nodes.length>0&&!this.firstAuthored.has(revision.actorId))
        this.firstAuthored.set(revision.actorId,revision);
    }
    this.indexedCount=this.revisions.length;
    this.previousIndexed=this.revisions.at(-1)??null;
  }
  capture(s:Session):void{
    const tick=Math.round(s.seconds*60);
    for(const actor of s.operators){
      if(actor.side!=='blue')continue;
      // Idle/finished orders are overwhelmingly common; no JSON serializer
      // is required for a plan that is still empty. In-place plan edits are
      // otherwise checked every tick, preserving exact same-tick history.
      const previous=this.signatures.get(actor.id);
      if(actor.plan.length===0&&previous==='[]')continue;
      const signature=actor.plan.length?JSON.stringify(actor.plan):'[]';
      if(previous===signature)continue;
      this.signatures.set(actor.id,signature);
      this.revisions.push({
        revisionId:this.nextId++,tick,order:this.revisions.length,
        actorId:actor.id,phase:s.phase,
        origin:{x:actor.p.x,y:actor.p.y},nodes:copyNodes(actor.plan)
      });
    }
  }
  /** Same-tick revisions are ordered, never overwritten. */
  at(actorId:string,tick:number,order=Infinity):ReplayPlanRevision|null{
    this.syncIndex();
    if(!this.ordered||Number.isNaN(tick)){
      // Preserve original behavior even for out-of-order imported history.
      let result:ReplayPlanRevision|null=null;
      for(const revision of this.revisions){
        if(revision.tick>tick)break;
        if(revision.actorId===actorId&&
           (revision.tick<tick||revision.order<=order))result=revision;
      }
      return result;
    }
    const history=this.byActor.get(actorId);
    if(!history?.length)return null;
    // Upper bound over tick and within-tick edit order.
    let lo=0,hi=history.length;
    while(lo<hi){
      const mid=(lo+hi)>>>1,revision=history[mid];
      if(revision.tick<tick||
         (revision.tick===tick&&revision.order<=order))lo=mid+1;
      else hi=mid;
    }
    return history[lo-1]??null;
  }
  initial(actorId:string):ReplayPlanRevision|null{
    this.syncIndex();
    return this.firstAuthored.get(actorId)??null;
  }
}
