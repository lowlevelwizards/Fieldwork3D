/** D3.17E6: bounded *negative* route-query suppression for an unchanged
 * physically impossible MOVE landing. Never edits/finishes the PlanNode,
 * learns hidden map details for the player, or ignores door motion.
 */
import type {TeamActor} from './breach-game.ts';
import type {Door,Pt} from './breach-core.ts';
import {physicalDoorPoseKey} from './breach-recovery-proposal-gate.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
type Negative={
 orderId:number;goal:Pt;anchor:Pt;revision:number;doorKey:string;
 since:number;lastProbe:number
};
const witnesses=new WeakMap<TeamActor,Negative>();
/** Returns true when no repeat A* should run. Always reprobes after
 * 6 seconds even with unchanged geometry; real changes invalidate now.
 */
export function shouldPauseNegativeGoalProbe(
 a:TeamActor,goal:Pt,seconds:number,revision:number,
 doors:readonly Door[]
):boolean{
 const order=a.plan[0];
 if(order?.kind!=='move')return false;
 const doorKey=physicalDoorPoseKey(a.p,doors);
 const prev=witnesses.get(a);
 const same=!!prev&&prev.orderId===order.id&&
   distance(prev.goal,goal)<.5&&distance(prev.anchor,a.p)<3&&
   prev.revision===revision&&prev.doorKey===doorKey&&
   seconds-prev.since<28;
 if(!same){
  witnesses.set(a,{orderId:order.id,goal:{...goal},anchor:{...a.p},
   revision,doorKey,since:seconds,lastProbe:seconds});
  return false;
 }
 if(seconds-prev.lastProbe>=6){
  prev.lastProbe=seconds;return false;
 }
 return true;
}
