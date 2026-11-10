/** Stage 8: single source of order activation, completion and failure.
 * Completion consumes exactly one authored node and resets transient motor
 * state; failure keeps the node and deduplicates its warning.
 */
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import {angleDifference,targetAngle,interruptsWatch} from './breach-plan.ts';
import {bodyClear} from './breach-navigation.ts';
import {pathFor} from './breach-plan-authoring.ts';
import type {Door,Pt} from './breach-core.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const angle=(a:Pt,b:Pt)=>targetAngle(a,b);
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const clone=(p:Pt):Pt=>({...p});
export function rotate(a:TeamActor,goal:number,dt:number){
  const delta=angleDifference(a.heading,goal);
  const turn=clamp(delta,-dt*6,dt*6);
  a.heading+=turn;a.turning=Math.abs(delta);
  return Math.abs(delta)<.075;
}
/** Aim targets are recomputed after EVERY movement tick, not on waypoint entry. */
export function aimHeading(a:TeamActor):number|null{
  const instruction=a.aimInstruction;
  if(!instruction)return null;
  if(instruction.mode==='free')return null;
  if(instruction.mode==='fixed')return instruction.angle??a.heading;
  if(!instruction.point||d(a.p,instruction.point)<2)return a.heading;
  return angle(a.p,instruction.point);
}
export function applyAimNode(a:TeamActor,n:PlanNode){
  // The clearing angle belongs to the OPTIONAL generated entry template.
  // A player's explicit persistent WATCH on the stack takes precedence
  // through arrival; merely reaching an entry MOVE must not cancel it.
  if(n.entryDoorId&&n.aimMode==='fixed'&&
     a.aimInstruction?.mode==='track'&&
     a.aimInstruction.source!=='stack')return;
  if(n.aimMode==='free')a.aimInstruction=null;
  else if(n.aimMode==='track'&&n.aimPoint)
    a.aimInstruction={mode:'track',point:clone(n.aimPoint),
      // A player can change a stack waypoint into WATCH. Only the untouched
      // template's PIE-labelled stack pivot may yield to an entry sector.
      ...(n.stackDoorId&&n.aimLabel==='pie'?{source:'stack' as const}:{})};
  else if(n.aimMode==='fixed'&&n.facing!==undefined)
    a.aimInstruction={mode:'fixed',angle:n.facing};
  else if(n.facing!==undefined)
    a.aimInstruction={mode:'fixed',angle:n.facing};
}
export function completeOrder(a:TeamActor){
  if(a.plan.length)a.completedOrders++;
  a.plan.shift();a.activeNode=-1;a.nav=[];a.autoSidestep=null;
  a.waitRemaining=0;
  a.actionTimer=0;a.syncReady=null;a.pieIndex=0;
  a.orderIssue=null;a.motorPause=null;
  a.passageWaitSeconds=0;a.passageStallReported=false;pathFor(a);
}
/** Explicitly report failure without silently consuming the player's order.
 * Re-evaluate the precondition each tick; changing world state can clear
 * the issue. Repeated identical failures never flood the event feed.
 */
export function failCurrentOrder(s:Session,a:TeamActor,n:PlanNode,reason:string,notify:(s:Session,text:string)=>void){
  if(a.orderIssue?.nodeId!==n.id||a.orderIssue.reason!==reason){
    notify(s,a.name+' '+reason);
    a.orderIssue={nodeId:n.id,reason,since:s.seconds};
  }
  a.velocity=0;
}
export function clearCurrentOrderIssue(a:TeamActor){a.orderIssue=null;}

export function beginOrder(a:TeamActor,n:PlanNode,doors:readonly Door[]):void{
 if(a.activeNode===n.id)return;
 a.activeNode=n.id;a.nav=[];a.autoSidestep=null;
 a.waitRemaining=0;a.actionTimer=0;
 a.orderIssue=null;
 if(interruptsWatch(n,a.pace))a.aimInstruction=null;
 if(bodyClear(a.p,[...doors])){
   a.squeeze=false;a.squeezeTime=0;
 }
 a.pieIndex=0;
}
