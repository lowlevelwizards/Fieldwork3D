/** Small, explicit combat response from observable tactical facts only. */
import {npcPressurePolicy,type Temperament} from './breach-ai-pressure-policy.ts';
export type CombatAction='engage'|'reposition'|'reload'|'hold'|'withdraw'|'investigate';
export type CombatContext={visible:boolean;remembered:boolean;laneClear:boolean;
 ammunition:number;suppression:number;morale:number;
 temperament?:Temperament};
/** Personality changes thresholds, never awareness or fire-lane legality. */
export function chooseCombatAction(s:CombatContext):CombatAction{
 if(!s.visible)return s.remembered?'investigate':'hold';
 const {contactWithdraw:retreatPressure,contactMorale:retreatMorale,contactHold:holdPressure}=npcPressurePolicy(s.temperament);
 if(s.suppression>retreatPressure&&s.morale<retreatMorale)
  return 'withdraw';
 if(s.ammunition<=0)return 'reload';
 // Real danger outranks searching for a better muzzle lane. Otherwise a
 // heavily suppressed actor repeatedly steps out of cover just to fire.
 if(s.suppression>holdPressure)return 'hold';
 if(!s.laneClear)return 'reposition';
 return 'engage';
}
