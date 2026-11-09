/** Fixed-step SYNC, RELOAD and FLASH handlers, retaining authored timing.
 * Stable callbacks delegate game-owned events and order completion.
 */
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import type {Pt} from './breach-core.ts';
import {liveMagazineCapacity} from './arsenal/live-magazine-capacity.ts';
import {validateThrow} from './breach-flash.ts';
import {targetAngle} from './breach-plan.ts';
export type UtilityOrderHooks={
 pop:(actor:TeamActor)=>void;notify:(s:Session,message:string)=>void;
 beginReload:(s:Session,a:TeamActor)=>boolean;
 fail:(s:Session,a:TeamActor,n:PlanNode,reason:string)=>void;
 clearIssue:(a:TeamActor)=>void;
 rotate:(a:TeamActor,heading:number,dt:number)=>boolean;
 battleEvent:(s:Session,kind:'flash',a:TeamActor,p:Pt,text:string)=>void;
};
const clone=(p:Pt):Pt=>({x:p.x,y:p.y});
export function executeTacticalUtilityOrder(s:Session,a:TeamActor,n:PlanNode,
 dt:number,h:UtilityOrderHooks):boolean{
  if(n.kind==='sync'){
    a.syncReady=n.syncCode??'A';
    // Only actors still carrying this code participate. An undone
    // companion order must not create a permanent one-sided deadlock.
    const code=a.syncReady;
    const peers=s.operators.filter(x=>x.side==='blue').filter(x=>x.health>0&&
      (x.syncReady===code||x.plan.some(order=>
        order.kind==='sync'&&order.syncCode===code)));
    if(peers.every(x=>x.syncReady===code)){
      // Clear all participants in the same fixed simulation tick.
      for(const teammate of peers)h.pop(teammate);
      h.notify(s,'GO CODE '+(n.syncCode??'A'));
    }
    return true;
  }
  if(n.kind==='reload'){
    // The authored order owns one reload, not an endless sequence of
    // refills when the final available magazine isn't completely full.
    if(a.actionTimer>0&&a.reload===0){h.pop(a);return true;}
    if(a.actionTimer===0){
      if(a.magazine>=liveMagazineCapacity(a.weapon,a.weaponConfiguration)){h.pop(a);return true;}
      if(a.reload>0){a.velocity=0;return true;}
      if(!h.beginReload(s,a)){
        h.fail(s,a,n,'RELOAD UNAVAILABLE · CHECK AMMO');return true;
      }
      h.clearIssue(a);
      a.actionTimer=dt;
    }
    return true;
  }
  if(n.kind==='flash'){
    if(!n.aimPoint||s.flashRemaining<=0||a.flashCharges<=0){
      h.fail(s,a,n,'FLASH UNAVAILABLE');return true;
    }
    const trajectory=validateThrow(a.p,n.aimPoint,s.doors);
    if(!trajectory.valid){
      h.fail(s,a,n,'FLASH BLOCKED — '+
        (trajectory.reason??'CHECK TRAJECTORY'));return true;
    }
    h.clearIssue(a);a.velocity=0;h.rotate(a,targetAngle(a.p,n.aimPoint),dt);
    a.actionTimer+=dt;
    if(a.actionTimer>=.3){
      s.flashRemaining--;a.flashCharges--;a.lastThrowAt=s.seconds;
      s.grenades.push({id:s.nextEffectId++,p:clone(a.p),
        from:clone(a.p),to:clone(n.aimPoint),age:0,fuse:1.15,
        path:trajectory});
      h.battleEvent(s,'flash',a,a.p,a.name+' FLASH OUT');
      h.notify(s,a.name+' FLASH OUT');
      h.pop(a);
    }
    return true;
  }

 return false;
}
