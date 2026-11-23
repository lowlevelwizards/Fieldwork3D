/** Fixed-step SYNC, RELOAD and FLASH handlers, retaining authored timing.
 * Stable callbacks delegate game-owned events and order completion.
 */
import {failedGeneratedStackSyncMember}
 from './breach-generated-sync-dropout.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import type {Pt} from './breach-core.ts';
import {liveMagazineCapacity} from './arsenal/live-magazine-capacity.ts';
import {validateThrow} from './breach-flash.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {quoteDeployedFieldUse,spendDeployedFieldItem}
 from './equipment-deployed-field-use.ts';
import {targetAngle} from './breach-plan.ts';
import {initialSecondarySwitch,requestSecondarySwitch,advanceSecondarySwitch,secondarySwitchSettled}
 from './secondary-switching.ts';
import {beginTimedSecondaryReload,advanceTimedSecondaryReload}
 from './secondary-timed-reload.ts';
import {commitSecondaryReloadStep} from './secondary-reload-commit.ts';
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
  if(n.kind==='switch-weapon'){
    // Do not freeze a primary reload halfway through a magazine exchange.
    // Fixed-step fire/reload remains authoritative until it can finish.
    if(a.reload>0||a.secondaryReload){a.velocity=0;return true;}
    const target=n.weaponHand??'secondary';
    const request=requestSecondarySwitch(a.secondarySwitch??initialSecondarySwitch(),target,
      a.equipment?.secondary,a.health>0&&!a.surrendered);
    if(!request.accepted){
      h.fail(s,a,n,request.reason??'SECONDARY NOT EQUIPPED');return true;
    }
    h.clearIssue(a);a.velocity=0;
    a.secondarySwitch=advanceSecondarySwitch(request.state,dt,
      a.equipment?.secondary,true);
    if(secondarySwitchSettled(a.secondarySwitch))h.pop(a);
    return true;
  }
  if(n.kind==='sync'){
    a.syncReady=n.syncCode??'A';
    // Only actors still carrying this code participate. An undone
    // companion order must not create a permanent one-sided deadlock.
    const code=a.syncReady;
    const participants=s.operators.filter(x=>x.side==='blue'&&
      x.health>0&&(x.syncReady===code||x.plan.some(order=>
        order.kind==='sync'&&order.syncCode===code)));
    // Only a genuinely failed GENERATED STACK may leave this barrier:
    // a witnessed DOOR LOCKED cancellation, >=3s immobile away from
    // its exact SYNC footprint, with a later generated ENTRY retained.
    // It is NEVER counted READY or given an arrival.
    const separated=participants.filter(x=>
      failedGeneratedStackSyncMember(x,code));
    const peers=participants.filter(x=>!separated.includes(x));
    if(peers.length>0&&
       (separated.length===0||peers.length>=2)&&
       peers.every(x=>x.syncReady===code)){
      // Release only still-capable members in this exact simulation
      // tick. Failed members keep their active original blocked SYNC.
      for(const teammate of peers)h.pop(teammate);
      h.notify(s,'GO CODE '+code+
       (separated.length?' · '+separated.length+' FAILED STACK SEPARATED':''));
    }
    return true;
  }
  if(n.kind==='reload'){
    // S8.2 is the same authored RELOAD command, dispatched by the settled
    // physical hand. The issued Glock owns its magazine and timing; the
    // rifle's magazine/reserve/reload fields never change here.
    if(a.secondarySwitch?.active==='secondary'&&
       secondarySwitchSettled(a.secondarySwitch)){
      a.velocity=0;
      const kit=a.equipment?.secondary;
      if(!kit){h.fail(s,a,n,'NO ISSUED SECONDARY');return true;}
      if(!a.secondaryReload||a.secondaryReload.orderId!==n.id){
        const started=beginTimedSecondaryReload(kit,n.id);
        if(!started.ok||!started.state){
          if(started.reason==='MAGAZINE FULL'){h.pop(a);return true;}
          h.fail(s,a,n,started.reason??'PISTOL RELOAD UNAVAILABLE');
          return true;
        }
        a.secondaryReload=started.state;
        h.clearIssue(a);h.notify(s,a.name+' PISTOL RELOADING');
      }
      const progressed=advanceTimedSecondaryReload(kit,a.secondaryReload,dt);
      if(!progressed.ok){
        a.secondaryReload=null;
        h.fail(s,a,n,progressed.reason??'PISTOL RELOAD INTERRUPTED');
        return true;
      }
      commitSecondaryReloadStep(s,a,progressed);
      if(progressed.dropped)
        h.notify(s,a.name+' PISTOL MAGAZINE DROPPED');
      a.secondaryReload=progressed.state;
      if(progressed.done){
        h.notify(s,a.name+' PISTOL RELOADED');
        h.pop(a);
      }
      return true;
    }
    if((a.secondarySwitch?.fraction??0)>0){
      // Never start a rifle reload while the hands are between weapons.
      a.velocity=0;return true;
    }
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
    const field=quoteDeployedFieldUse(a,'flashbang');
    if(!n.aimPoint||s.flashRemaining<=0||!field.available){
      h.fail(s,a,n,'FLASH UNAVAILABLE');return true;
    }
    // Real sessions provide the full world. Minimal isolated utility
    // harnesses still use the legacy activated core site for throw tests.
    const trajectory=validateThrow(a.p,n.aimPoint,s.doors,[],
      Array.isArray(s.coverState)&&Array.isArray(s.civilians)?
        sessionWorldGeometry(s):undefined);
    if(!trajectory.valid){
      h.fail(s,a,n,'FLASH BLOCKED — '+
        (trajectory.reason??'CHECK TRAJECTORY'));return true;
    }
    h.clearIssue(a);a.velocity=0;h.rotate(a,targetAngle(a.p,n.aimPoint),dt);
    a.actionTimer+=dt;
    if(a.actionTimer>=.3+field.accessSeconds){
      if(!spendDeployedFieldItem(a,'flashbang')){
        h.fail(s,a,n,'FLASH UNAVAILABLE');return true;
      }
      s.flashRemaining--;a.lastThrowAt=s.seconds;
      const release=trajectory.mode==='doorway'&&trajectory.via?
        trajectory.via:a.p;
      s.grenades.push({id:s.nextEffectId++,p:clone(release),
        from:clone(release),to:clone(n.aimPoint),age:0,fuse:1.15,
        path:trajectory});
      h.battleEvent(s,'flash',a,a.p,a.name+' FLASH OUT');
      h.notify(s,a.name+' FLASH OUT');
      h.pop(a);
    }
    return true;
  }

 return false;
}
