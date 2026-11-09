/** AI perception-to-intent and posture reconciliation. This never peeks
 * at unseen actors; the calling decision phase supplies only confirmed targets.
 */
import {WALLS,COVER} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {bestBelief} from './breach-awareness.ts';
import {chooseAiIntent,hasRecentSound} from './breach-ai-policy.ts';
import {chooseCombatAction} from './breach-ai-combat.ts';
import {directionalCoverFrom} from './breach-cover-direction.ts';
import {settledEnemyPosture} from './breach-ai-posture.ts';
import {assessFireLane} from './breach-fire-safety.ts';
import {aimHeight} from './breach-cover-height.ts';
export function reconcileEnemyIntent(s:Session,a:TeamActor,visibleCount:number):void{
 const belief=bestBelief(a.awareness);
 const recentNoise=hasRecentSound(s.seconds,a.lastNoiseAt);
  if(visibleCount===0)a.combatChoice=chooseCombatAction({
    visible:false,remembered:!!belief,ammunition:a.magazine,
    laneClear:false,suppression:a.suppression,morale:a.morale,temperament:a.personality});
  a.intent=chooseAiIntent(a.intent,{
    visible:visibleCount>0,hasBelief:!!belief,recentSound:recentNoise,
    suppression:a.suppression,morale:a.morale,
    temperament:a.personality},s.seconds);
  if(visibleCount===0){
    if(belief&&belief.lastAt>=s.seconds-24)
      a.contact={...belief.estimate};
    else if(!recentNoise){
      a.contact=null;a.heard=null;a.contacted=false;
      if(a.alert==='investigating')a.alert='idle';
      // Defensive postures may linger after contact, but cease indefinite
      // armed-cover alert when the evidence and suppression have truly faded.
      if(a.alert==='cover'&&a.suspicion.stage==='unaware'&&
         a.suppression<.08&&!a.retreatPoint){
        a.alert='idle';a.defense=null;
      }
    }
  }

}
export function reconcileEnemyPosture(s:Session,a:TeamActor,
 visible:readonly TeamActor[]):void{
 const threat=visible[0]?.p??a.heard??a.contact??a.watch;
  let desiredPosture=a.posture;
  if(threat&&a.velocity<15&&
    directionalCoverFrom(threat,a.p,COVER).crouched&&
    (a.suppression>.26||a.personality==='cautious'||
     a.alert==='cover'||a.combatChoice==='hold'))
    desiredPosture='crouch';
  else if(a.velocity>20||a.suppression<.12||a.alert==='engaging')
    desiredPosture='stand';
  const settled=settledEnemyPosture(a.posture,desiredPosture,
    s.seconds,a.postureChangedAt??-100);
  if(settled!==a.posture){a.posture=settled;a.postureChangedAt=s.seconds;}
  // Crouching behind chest-high furniture can make a visible contact
  // impossible to shoot. Stand up when that alone restores the muzzle lane.
  if(a.posture==='crouch'&&visible.length){
    const b=visible[0],height=aimHeight(b.posture==='crouch');
    const low=assessFireLane(a.p,18,b.p,height,COVER,WALLS,s.doors);
    const high=assessFireLane(a.p,26,b.p,height,COVER,WALLS,s.doors);
    if(low.blocker==='cover'&&high.blocker==='clear'){
      // The only exception to pose dwell: a verified clear higher muzzle.
      a.posture=settledEnemyPosture(a.posture,'stand',s.seconds,
        a.postureChangedAt??-100,true);
      a.postureChangedAt=s.seconds;
    }
  }

}
