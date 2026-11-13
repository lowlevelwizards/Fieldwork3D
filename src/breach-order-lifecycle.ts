/** Single source of order activation, completion and cancellation.
 * Completed orders count as executed; blocked orders are discarded with
 * feedback so they cannot stall the remaining authored plan.
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
function retireCurrentOrder(a:TeamActor,completed:boolean){
  if(!a.plan.length)return;
  if(completed)a.completedOrders++;
  if(a.doorTraversal?.authoredOrderId===a.plan[0]?.id)
    a.doorTraversal=null;
  a.plan.shift();a.activeNode=-1;a.nav=[];a.autoSidestep=null;
  a.waitRemaining=0;
  a.actionTimer=0;a.syncReady=null;a.pieIndex=0;
  a.orderIssue=null;a.motorPause=null;
  a.passageWaitSeconds=0;a.passageStallReported=false;pathFor(a);
}
export function completeOrder(a:TeamActor){retireCurrentOrder(a,true);}
/** A terminal failure drops only the matching active order, not the rest
 * of the plan. The warning remains in the event feed, while the next
 * order can activate on the following tick without requiring Undo.
 * Temporary movement delays and hit interruptions do not call this.
 */
export function failCurrentOrder(s:Session,a:TeamActor,n:PlanNode,reason:string,notify:(s:Session,text:string)=>void){
  if(a.plan[0]?.id!==n.id)return; // A stale callback cannot skip the next order.
  notify(s,a.name+' '+reason+' · ORDER CANCELLED');
  a.velocity=0;
  retireCurrentOrder(a,false);
}
export function clearCurrentOrderIssue(a:TeamActor){a.orderIssue=null;}

export function beginOrder(a:TeamActor,n:PlanNode,doors:Door[]):void{
 if(a.activeNode===n.id)return;
 a.activeNode=n.id;a.nav=[];a.autoSidestep=null;
 a.waitRemaining=0;a.actionTimer=0;
 a.orderIssue=null;
 if(interruptsWatch(n,a.pace))a.aimInstruction=null;
 if(bodyClear(a.p,doors)){
   a.squeeze=false;a.squeezeTime=0;
 }
 a.pieIndex=0;
}
