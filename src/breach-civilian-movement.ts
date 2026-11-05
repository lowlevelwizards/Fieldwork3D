/** E5-B3: an unarmed, short-range civilian motor. Routines are
 * generated with physical swept clearance; the live world/door gate is
 * rechecked on EVERY move. Never teleports, authors player orders or shoots. */
import type {Pt} from './breach-core.ts';
import type {CivilianActor} from './breach-civilian-types.ts';
import {routineDwellSeconds} from './breach-ai-routine-dwell.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function stepCivilianMovement(c:CivilianActor,now:number,dt:number,
  clear:(from:Pt,to:Pt)=>boolean,occupied:(p:Pt,id:string)=>boolean):void{
 c.priorP={...c.p};
 if(c.health<=0||c.state==='incapacitated'||c.state==='frozen'||
    c.state==='compliant'||c.state==='wounded'||c.state==='attentive'||
    c.state==='startled'||(c.state==='hiding'&&!c.goal)){
   c.velocity=0;return;
 }
 if(now<c.dwellUntil||now<c.retryAt){c.velocity=0;return;}
 let goal:Pt|null=c.goal;
 const routine=c.state==='routine';
 if(routine){
  if(c.routine.length<2){c.velocity=0;return;}
  const at=c.routineIndex%c.routine.length;
  goal=c.routine[at];
  if(dist(c.p,goal)<9){
   c.routineIndex++;
   c.dwellUntil=now+routineDwellSeconds(c.id,c.activity,at,c.routineIndex);
   c.velocity=0;return;
  }
 }
 if(!goal){c.velocity=0;return;}
 const remaining=dist(c.p,goal);
 if(remaining<9){
  c.p={...goal};c.goal=null;c.velocity=0;
  if(c.state==='fleeing'){
   c.state='hiding';c.stateSince=now;c.dwellUntil=now+3;
  }else if(c.state==='hiding')c.dwellUntil=now+3;
  return;
 }
 const speed=c.state==='fleeing'?66:c.state==='hiding'?37:29;
 const step=Math.min(Math.max(0,dt)*speed,remaining);
 if(step<.0001){c.velocity=0;return;}
 const candidate={x:c.p.x+(goal.x-c.p.x)*step/remaining,
   y:c.p.y+(goal.y-c.p.y)*step/remaining};
 if(!clear(c.p,candidate)||occupied(candidate,c.id)){
   c.velocity=0;c.blockedTime+=dt;
   if(c.blockedTime>1.25){
    c.retryAt=now+1.2;c.blockedTime=0;
    if(routine)c.routineIndex++;
    else {c.goal=null;c.state='frozen';c.stateSince=now;}
   }
   return;
 }
 c.blockedTime=0;
 c.heading=Math.atan2(goal.y-c.p.y,goal.x-c.p.x);
 c.p=candidate;c.velocity=speed;
}
