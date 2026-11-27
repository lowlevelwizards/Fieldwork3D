/** WR8: fixed-step retention gate after physical contact validation. */
import type {TeamActor} from './breach-game.ts';
import {readSlingKind} from './breach-weapon-retention.ts';
import {initialRetentionTransition,requestRetentionTransition,advanceRetentionTransition,
 retentionTransitionSettled} from './breach-weapon-retention-transition.ts';
import {requestSecondarySwitch,advanceSecondarySwitch,initialSecondarySwitch} from './secondary-switching.ts';
export function beginRetentionTick(a:TeamActor,dt:number){
 if(!a.retentionTransition)return;
 const sling=readSlingKind(a.weaponConfiguration?.slots.sling);
 const next=advanceRetentionTransition(a.retentionTransition,dt,sling);
 a.retentionTransition=next.mode||next.desired?{...next,desired:null}:undefined;
}
export function retentionBusy(a:Pick<TeamActor,'retentionTransition'>){
 return !!a.retentionTransition&&(a.retentionTransition.weight>0||!!a.retentionTransition.desired);
}
export function prepareHandsFree(a:TeamActor,dt:number):boolean{
 const sling=readSlingKind(a.weaponConfiguration?.slots.sling);
 if(sling==='none')return true; // WR10 owns unslung world placement.
 a.velocity=0;a.aim=0;
 if(a.reload>0||a.secondaryReload)return false;
 const mode=sling==='two'?'side-slung':'front-slung';
 a.retentionTransition=requestRetentionTransition(a.retentionTransition??initialRetentionTransition(),mode,sling);
 const sw=a.secondarySwitch??initialSecondarySwitch();
 if(sw.fraction>0){
  const request=requestSecondarySwitch(sw,'primary',a.equipment?.secondary);
  a.secondarySwitch=advanceSecondarySwitch(request.state,dt,a.equipment?.secondary);
  return false;
 }
 return retentionTransitionSettled(a.retentionTransition);
}
