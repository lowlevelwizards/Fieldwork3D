/** D3.9B1: one short-footstep state for explicit/implicit opening.
 * This is transient intent; the existing motor owns all movement.
 */
import type {TeamActor,Session} from './breach-game.ts';
import {OPERATOR_RADIUS,doorLeafSegment,type Door,type Pt} from './breach-core.ts';
import {doorWouldStrikeActors} from './breach-door.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {DOOR_HAND_RELEASE_REACH} from './breach-door-hand-constants.ts';
export type OpeningFootwork={
 readonly doorId:string;readonly orderId:number;readonly kind:'stance'|'swing';
 target:Pt|null;attempts:number;nextAt:number
};
const steps=new WeakMap<TeamActor,OpeningFootwork>();
export function openingFootwork(a:TeamActor,doorId:string,orderId:number,
 kind:OpeningFootwork['kind']):OpeningFootwork{
 const old=steps.get(a);
 if(old&&old.doorId===doorId&&old.orderId===orderId&&old.kind===kind)
  return old;
 const state:OpeningFootwork={doorId,orderId,kind,target:null,attempts:0,nextAt:0};
 steps.set(a,state);return state;
}
export function clearOpeningFootwork(a:TeamActor,doorId:string,orderId:number):void{
 const state=steps.get(a);
 if(state?.doorId===doorId&&state.orderId===orderId)steps.delete(a);
}
export function setOpeningFootstep(a:TeamActor,state:OpeningFootwork,target:Pt):void{
 state.target={...target};steps.set(a,state);
}
export function queueOpeningFootstep(a:TeamActor,target:Pt):void{
 if(!a.nav.length||Math.hypot(a.nav[0].x-target.x,a.nav[0].y-target.y)>=3.5)
  a.nav.unshift({...target});
}

// B2: cold, finite sweep-aware opener/follower clearance. The hinge
// remains authoritative, and the candidate goes through the ordinary motor.
// No new route solver, physics pass-through, or per-tick search.
export function upcomingOpeningSweep(door:Door):number{
 const fraction=door.openFraction??0;
 return Math.min(Math.max(1,door.pushTarget??1),fraction+.17);
}
export function openingSweepThreatens(door:Door,position:Pt):boolean{
 return door.open&&!door.locked&&!door.wedged&&!door.heldBy&&
   (door.openFraction??0)<.72&&
   doorWouldStrikeActors(door,upcomingOpeningSweep(door),[position],OPERATOR_RADIUS);
}
export function selectGuidedOpeningStep(a:TeamActor,s:Session,
 door:Door,goal:Pt):Pt|null{
 if(!openingSweepThreatens(door,a.p))return null;
 const world=sessionWorldGeometry(s);
 const fraction=upcomingOpeningSweep(door);
 const futureLeaf=doorLeafSegment({...door,openFraction:fraction});
 const currentLeaf=doorLeafSegment(door);
 const dx=goal.x-a.p.x,dy=goal.y-a.p.y;
 const aim=Math.atan2(dy,dx);
 const grip=a.doorHandContact;
 const holding=grip?.releasedAt===null&&grip.doorId===door.id;
 const reachPoint=holding?{
  x:futureLeaf.a.x+(futureLeaf.b.x-futureLeaf.a.x)*grip.fraction,
  y:futureLeaf.a.y+(futureLeaf.b.y-futureLeaf.a.y)*grip.fraction
 }:null;
 const neighbors:Pt[]=[];
 for(const other of s.operators)
  if(other!==a&&other.health>0)neighbors.push(other.p);
 for(const civil of s.civilians)
  if(civil.health>0)neighbors.push(civil.p);
 // Goal-forward is the preferred body step. Lateral and rear steps are
 // allowed only when the leaf really threatens the current capsule.
 const angles=[0,Math.PI/4,-Math.PI/4,Math.PI/2,
  -Math.PI/2,3*Math.PI/4,-3*Math.PI/4,Math.PI];
 let best:Pt|null=null,bestScore=Infinity;
 for(const length of [12,22,32])
  for(const angle of angles){
   const theta=aim+angle;
   const target={x:a.p.x+Math.cos(theta)*length,
    y:a.p.y+Math.sin(theta)*length};
   if(doorWouldStrikeActors(door,fraction,[target],OPERATOR_RADIUS)||
      // Do not choose a target that penetrates the current panel.
      !sweptBodyClear(a.p,target,s.doors,OPERATOR_RADIUS,world)||
      neighbors.some(p=>Math.hypot(target.x-p.x,target.y-p.y)<
        OPERATOR_RADIUS*2+1))continue;
   if(reachPoint&&Math.hypot(target.x-reachPoint.x,
       target.y-reachPoint.y)>DOOR_HAND_RELEASE_REACH-1)continue;
   const before=Math.hypot(a.p.x-goal.x,a.p.y-goal.y);
   const after=Math.hypot(target.x-goal.x,target.y-goal.y);
   // A useful clearing step should take distance off the current leaf
   // without oscillating between equally good forward/back alternatives.
   const near=Math.hypot(target.x-currentLeaf.a.x,target.y-currentLeaf.a.y);
   const score=(after-before)*2+length*.06+Math.abs(angle)*2+near*.0001;
   if(score<bestScore){best=target;bestScore=score;}
  }
 return best;
}
