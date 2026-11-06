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
  private nextId=1;
  capture(s:Session):void{
    const tick=Math.round(s.seconds*60);
    for(const actor of s.operators){
      if(actor.side!=='blue')continue;
      const signature=JSON.stringify(actor.plan);
      if(this.signatures.get(actor.id)===signature)continue;
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
    let result:ReplayPlanRevision|null=null;
    for(const revision of this.revisions){
      if(revision.tick>tick)break;
      if(revision.actorId===actorId&&
        (revision.tick<tick||revision.order<=order))result=revision;
    }
    return result;
  }
  initial(actorId:string):ReplayPlanRevision|null{
    return this.revisions.find(r=>r.actorId===actorId&&r.nodes.length>0)??null;
  }
}
