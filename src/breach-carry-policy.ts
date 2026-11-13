/** A2.4 single deterministic, priority-ordered intent → visible carry policy.
 * Read-only: presentation AND muzzle/clearance use this decision. No clocks,
 * motor changes, target acquisition or shot authorization.
 */
import type {Handling,HandlingIntent} from './breach-weapon-pose.ts';
import type {WeaponId} from './breach-combat.ts';
export type CarryReason='hard-clearance'|'squeeze'|'hands-busy'|
 'close-contact'|'aim'|'watch'|'threshold-stack'|'door-entry'|
 'friendly-courtesy'|'moving'|'hold';
export type CarryFacts={aim:number;moving:number;obstruction:boolean;
 friendlyNear:boolean;friendlyAhead?:boolean;intent?:HandlingIntent;
 threatRange?:number|null;weapon?:WeaponId};
export type CarryChoice={handling:Handling;reason:CarryReason;urgent:boolean};
export function chooseCarry(f:CarryFacts):CarryChoice{
 const pick=(handling:Handling,reason:CarryReason,
  urgent=false):CarryChoice=>({handling,reason,urgent});
 if(f.obstruction)return pick('short','hard-clearance',true);
 if(f.intent==='squeeze')return pick('short','squeeze',true);
 if(f.intent==='run'||f.intent==='traverse'||
    f.intent==='reload'||f.intent==='treat')
  return pick('low','hands-busy',true);
 // An ally actually ahead of the barrel must never be flagged simply
 // because the rest of the fireteam is stacked nearby. A separate
 // clearance probe calculates how much the gun must be brought back.
 // A neutral rear stack must lift the muzzle rather than aim low into
 // the teammate's back. LOOK/PIE keeps the deliberate scanning carry:
 // the physical barrel probe still short-stocks if the lane is unsafe.
 if(f.friendlyAhead&&f.aim<.20){
  if(f.intent==='look'||f.intent==='pie'||f.intent==='engage')
   return pick('ready','watch',true);
  return pick('high','friendly-courtesy',true);
 }
 const near=f.weapon==='shotgun'?86:f.weapon==='smg'?100:74;
 if(f.threatRange!=null&&f.threatRange<=near&&f.aim>=.34)
  return pick('point','close-contact',true);
 if(f.aim>=.82)return pick('ads','aim',true);
 if(f.aim>=.20)return pick('point','aim',true);
 if((f.intent==='door'||f.intent==='stack'||f.intent==='entry')&&
   f.friendlyNear)return pick('high','threshold-stack',true);
 if(f.intent==='entry'||f.intent==='stack'||f.intent==='door')
  return pick('ready','door-entry');
 if(f.intent==='pie'||f.intent==='look'||f.intent==='hold'||
    f.intent==='engage')return pick('ready','watch');
 if(f.friendlyNear)return pick('low','friendly-courtesy');
 if(f.moving>.32)return pick('low','moving');
 return pick('ready','hold');
}
