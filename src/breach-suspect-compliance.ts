/** D9.1: one authoritative surrender transition for morale and spoken commands.
 * Only previously observed physical threats can receive a voiced challenge.
 * A refusal is not a reroll on each simulation tick.
 */
import type {Session,TeamActor} from './breach-game.ts';
import type {BattleEvent} from './breach-combat.ts';
import {releaseSuspectHeldFirearm} from './breach-suspect-weapons.ts';

export const SUSPECT_CHALLENGE_RANGE=100;
/** Spoken FOLLOW ME / STOP commands need not approach hand-contact range. */
export const SUSPECT_ESCORT_VOICE_RANGE=150;
export const SUSPECT_CHALLENGE_SECONDS=.48;
export const SUSPECT_CHALLENGE_COOLDOWN=6;

export function challengeSuspectDecision(target:Pick<TeamActor,
 'health'|'surrendered'|'morale'|'suppression'|'injuryStage'|
 'lastChallengeAt'>,now:number):'ineligible'|'cooldown'|'surrender'|'refuse'{
 if(target.health<=0||target.surrendered)return 'ineligible';
 if(target.lastChallengeAt!==undefined&&
    now-target.lastChallengeAt<SUSPECT_CHALLENGE_COOLDOWN)return 'cooldown';
 // A verbal challenge is not guaranteed compliance, but a shaken or
 // already uncertain suspect should be willing to surrender without first
 // being shot or heavily suppressed. Decisions remain deterministic and
 // use only the existing morale/pressure state, never a per-tick reroll.
 const pressure=target.suppression+Math.min(2,target.injuryStage)*.11;
 return target.morale<=.34||
   target.morale<=.62&&pressure>=.22?'surrender':'refuse';
}
export function commitSuspectSurrender(
 s:Session,target:TeamActor,
 notify:(s:Session,message:string)=>void,
 battleEvent:(s:Session,kind:BattleEvent['kind'],actor:TeamActor|null,
  p:{x:number;y:number},text:string,meta?:BattleEvent['meta'])=>void,
 source:'morale'|'challenge'='morale',challengerId?:string):boolean{
 if(target.health<=0||target.surrendered)return false;
 // Never fabricate a wound, down event, or casualty to represent compliance.
 const released=releaseSuspectHeldFirearm(s,target);
 target.surrendered=true;target.lastSurrenderAt=s.seconds;
 target.releasedWeaponId=released.id;
 target.velocity=0;target.nav=[];target.plan=[];
 target.reload=0;target.reloadMode=null;target.secondaryReload=null;
 target.aim=0;target.targetId=null;target.combatChoice=null;
 target.intent=null;target.defense=null;target.retreatPoint=null;
 target.suspectEscapeMode=null;target.suspectEscapeGoal=null;
 target.suspectEscapeWeaponId=null;target.suspectEscapeStartedAt=-100;
 target.suspectEscapeCooldownUntil=s.seconds+3;
 target.suspectRearmedSecondary=false;
 target.fireRetreatTarget=null;target.fireRetreatUntil=0;
 const message=target.name+' SURRENDERED'+
   (source==='challenge'?' AFTER CHALLENGE':'');
 notify(s,message);
 battleEvent(s,'surrender',target,target.p,message,
  {action:source==='challenge'?'suspect-compliance':'suspect-surrender',
   targetId:target.id,...(challengerId?{contributorId:challengerId}:{})});
 return true;
}
