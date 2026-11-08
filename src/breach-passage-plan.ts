/** Immutable GO-time doorway sequence derived exclusively from authored
 * friendly orders and the same known-route planner available to the player.
 * It is neither an autoplan nor a claim on undiscovered geometry. The
 * execution motor consumes these ranks without editing a single PlanNode. */
import type {Door,Pt,Side} from './breach-core.ts';
import type {PlanNode} from './breach-plan.ts';

export type PassagePlanActor={
 id:string;side:Side;health:number;p:Pt;plan:readonly PlanNode[];
 pace?:'walk'|'run';posture?:'stand'|'crouch';loadMovementScale?:number
};
export type PassageSlot={
 actorId:string;doorId:string;fromSide:-1|1;rank:number;eta:number;
};
export type PassageSchedule=ReadonlyMap<string,readonly PassageSlot[]>;
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const sign=(p:Pt,door:Door)=>{
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const len=Math.hypot(dx,dy)||1;
 return ((p.x-door.a.x)*-dy+(p.y-door.a.y)*dx)/len;
};
export const doorScheduleSide=(p:Pt,door:Door)=>sign(p,door);
const timeFor=(distance:number,actor:PassagePlanActor,pace:'walk'|'run')=>
 distance/(53*(pace==='run'?1.5:1)*
 (actor.posture==='crouch'?.58:1)*
 Math.max(.35,actor.loadMovementScale??1));
/** An actual segment must traverse a door's OPENING, not merely pass near
 * a neighboring parallel door or change sides beyond a solid jamb. */
function crossing(a:Pt,b:Pt,door:Door):{
 side:-1|1;fraction:number
}|null{
 const before=sign(a,door),after=sign(b,door);
 if(Math.abs(before)<.0001||before*after>=-.01)return null;
 const fraction=before/(before-after);
 if(fraction<0||fraction>1)return null;
 const center={x:a.x+(b.x-a.x)*fraction,
  y:a.y+(b.y-a.y)*fraction};
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const len=Math.hypot(dx,dy)||1;
 const along=((center.x-door.a.x)*dx+(center.y-door.a.y)*dy)/len;
 if(along<-.5||along>len+.5)return null;
 return {side:before>0?1:-1,fraction};
}
export function planDoorSchedule(
 actors:readonly PassagePlanActor[],doors:readonly Door[],
 route:(from:Pt,to:Pt)=>readonly Pt[]
):PassageSchedule{
 const slots:PassageSlot[]=[];
 for(const actor of actors){
  if(actor.side!=='blue'||actor.health<=0)continue;
  let at={...actor.p},elapsed=0;
  let pace=actor.pace??'walk';
  const seen=new Set<string>();
  for(const node of actor.plan){
   if(node.kind==='wait'||node.kind==='holdClear'){
    elapsed+=node.duration??1;
    continue;
   }
   if(node.kind==='sync'){elapsed+=.12;continue;}
   if(node.kind==='reload'){elapsed+=1.5;continue;}
   if(node.kind==='flash'||node.kind==='tool'||node.kind==='interact'){
    elapsed+=.8;continue;
   }
   if(!['move','door','pie'].includes(node.kind)){
    if(node.kind==='look')elapsed+=.25;
    continue;
   }
   const points=node.kind==='pie'&&node.arc?.length?
     node.arc:route(at,node.p);
   if(points.length){
    const speed=node.moveMode==='sprint'?'run':pace;
    let from=at;
    for(const to of points){
     const length=dist(from,to);
     if(length<.001){from=to;continue;}
     for(const door of doors){
      if(dist(door.a,door.b)>60)continue;
      const entry=crossing(from,to,door);
      if(!entry)continue;
      const key=door.id+':'+entry.side;
      if(seen.has(key))continue;
      seen.add(key);
      slots.push({actorId:actor.id,doorId:door.id,
       fromSide:entry.side,rank:0,
       eta:elapsed+timeFor(length*entry.fraction,actor,speed)});
     }
     elapsed+=timeFor(length,actor,speed);
     from=to;
    }
    at={...points[points.length-1]};
   }
   if(node.kind==='door')elapsed+=.85;
   if(node.paceState)pace=node.paceState;
  }
 }
 // Absolute planned crossing time is the primary ordering. A slight
 // difference in starting location is irrelevant if another operator's
 // authored route reaches the doorway sooner after a WAIT or detour.
 slots.sort((a,b)=>a.doorId.localeCompare(b.doorId)||
   a.fromSide-b.fromSide||a.eta-b.eta||
   a.actorId.localeCompare(b.actorId));
 const result=new Map<string,PassageSlot[]>();
 let previous='',rank=0;
 for(const slot of slots){
  const key=slot.doorId+':'+slot.fromSide;
  if(key!==previous){previous=key;rank=0;}
  const assigned={...slot,rank:rank++};
  if(!result.has(slot.actorId))result.set(slot.actorId,[]);
  result.get(slot.actorId)!.push(assigned);
 }
 return result;
}
/** A used schedule entry is complete only after the actor's BODY is
 * entirely through the plane. Crossing sideways or touching the seam
 * isn't sufficient. */
export function pendingPassageSlot(p:Pt,
 slots:readonly PassageSlot[]|undefined,
 doors:readonly Door[]):PassageSlot|null{
 for(const slot of slots??[]){
  const door=doors.find(d=>d.id===slot.doorId);
  if(!door)continue;
  if(sign(p,door)*slot.fromSide>=-18)return slot;
 }
 return null;
}
