/** D15.5: shared *policy*, never a second actor/civilian motor.
 * The target follows observed leader travel, not the direction of a rifle.
 * All body/door collision and route legality remain in the existing engines.
 */
import type {Pt} from './breach-core.ts';
export const FOLLOW_SEPARATION_LIMIT=125;
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export type PhysicalLeader={p:Pt;heading:number;priorP?:Pt;velocity?:number};
export function physicalFollowGoal(
 leader:PhysicalLeader,follower?:{p:Pt}|null):Pt{
 const dx=leader.priorP?leader.p.x-leader.priorP.x:0;
 const dy=leader.priorP?leader.p.y-leader.priorP.y:0;
 const moved=Math.hypot(dx,dy);
 if(leader.velocity!==undefined&&leader.velocity>3&&moved>.025){
  const dir=Math.atan2(dy,dx);
  return {x:leader.p.x-23*Math.cos(dir),
    y:leader.p.y-23*Math.sin(dir)};
 }
 const gap=follower?dist(leader.p,follower.p):0;
 if(follower&&gap>30)return {
  x:leader.p.x+(follower.p.x-leader.p.x)*23/gap,
  y:leader.p.y+(follower.p.y-leader.p.y)*23/gap};
 return {x:leader.p.x-23*Math.cos(leader.heading),
   y:leader.p.y-23*Math.sin(leader.heading)};
}
export function physicalFollowerSeparated(
 follower:{p:Pt;health:number},leader:{p:Pt;health:number}|null,
 limit=FOLLOW_SEPARATION_LIMIT):boolean{
 return !leader||leader.health<=0||follower.health<=0||
   dist(follower.p,leader.p)>limit;
}
/** Walking owner slows, explicit running remains controlled by order owner. */
export function physicalEscortWalkMultiplier(
 leader:{p:Pt},follower:{p:Pt;health:number;injuryStage:number}|null,
 healthyBase=.78):number{
 if(!follower||follower.health<=0)return 1;
 const separation=dist(leader.p,follower.p);
 if(separation>=108)return 0;
 if(separation<=30)return 1;
 const base=follower.health<2||follower.injuryStage>0?.39:healthyBase;
 if(separation<=62)return base;
 if(separation<=87)return base*.8;
 return base*.45;
}
