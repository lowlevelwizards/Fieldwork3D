/** A3.11: five deliberate readiness levels. Pure, evidence-local and
 * fixed-step only. A watch/suspect can prepare a weapon but can NEVER grant
 * acquisition, invent a target, or permit a shot without direct visibility.
 */
import {angleDelta,type FiringMode} from './breach-ballistics.ts';
import type {ClearanceResult} from './breach-weapon-clearance.ts';

export type FireUrgency='routine'|'look'|'watch'|'suspect'|'contact';
export function fireUrgency(facts:{
 confirmed:boolean;suspicious:boolean;
 aimMode?:'free'|'fixed'|'track'|null;
 authored?:boolean;lookOrder?:boolean
}):FireUrgency{
 if(facts.confirmed)return 'contact';
 if(facts.suspicious)return 'suspect';
 if(facts.authored&&facts.aimMode==='track')return 'watch';
 if(facts.lookOrder||facts.authored&&facts.aimMode==='fixed')return 'look';
 return 'routine';
}
/** A non-contact posture is anticipation only: no shots or new intel. */
export function passiveAimReadiness(urgency:FireUrgency):number{
 switch(urgency){
  case 'contact':return .36;
  case 'suspect':return .32;
  case 'watch':return .26;
  case 'look':return .12;
  default:return 0;
 }
}
/** Preserve earned preparedness at first *visible* contact. Existing
 * enemy reaction, safety, reload and weapon turn limits remain authoritative.
 */
export function contactAimOnAcquisition(previous:number):number{
 return Math.max(.16,Math.min(.48,Math.max(0,previous)));
}
export function contactAcquisitionScale(urgency:FireUrgency):number{
 return urgency==='contact'?.74:1;
}
export function contactTurnScale(urgency:FireUrgency):number{
 return urgency==='contact'?1.25:1;
}
export const SHORT_STOCK_FIRE_YAW_LIMIT=.42;
/** Emergency point fire accepts a physically short-stored weapon only
 * when its actual rendered/shot-time barrel points toward the observed
 * target. No ADS accuracy bonus is granted to an underarm stock.
 * Every solid, civilian and allied trajectory veto still runs at ignition.
 */
export function urgentFireMode(normal:FiringMode|null,aim:number,
 clearance:Pick<ClearanceResult,'blocked'|'carryOverride'|'muzzle'>,
 targetYaw:number):FiringMode|null{
 if(clearance.blocked)return null;
 if(clearance.carryOverride!=='short')return normal;
 if(aim<.34||Math.abs(angleDelta(clearance.muzzle.yaw,targetYaw))>
   SHORT_STOCK_FIRE_YAW_LIMIT||
   Math.abs(clearance.muzzle.pitch)>.46)return null;
 return 'point';
}
