/** Small, explicit combat response from observable tactical facts only. */
export type CombatAction='engage'|'reposition'|'reload'|'hold'|'withdraw'|'investigate';
export type CombatContext={visible:boolean;remembered:boolean;laneClear:boolean;
 ammunition:number;suppression:number;morale:number;
 temperament?:'guard'|'aggressor'|'cautious'};
/** Personality changes thresholds, never awareness or fire-lane legality. */
export function chooseCombatAction(s:CombatContext):CombatAction{
 if(!s.visible)return s.remembered?'investigate':'hold';
 const retreatPressure=s.temperament==='cautious'?.59:
  s.temperament==='aggressor'?.84:.72;
 const retreatMorale=s.temperament==='cautious'?.70:
  s.temperament==='aggressor'?.42:.62;
 const holdPressure=s.temperament==='cautious'?.41:
  s.temperament==='aggressor'?.67:.55;
 if(s.suppression>retreatPressure&&s.morale<retreatMorale)
  return 'withdraw';
 if(s.ammunition<=0)return 'reload';
 if(!s.laneClear)return 'reposition';
 if(s.suppression>holdPressure)return 'hold';
 return 'engage';
}
