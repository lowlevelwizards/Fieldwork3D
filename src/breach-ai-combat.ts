/** Small, explicit combat response from observable tactical facts only. */
export type CombatAction='engage'|'reposition'|'reload'|'hold'|'withdraw'|'investigate';
export type CombatContext={visible:boolean;remembered:boolean;laneClear:boolean;
 ammunition:number;suppression:number;morale:number};
export function chooseCombatAction(s:CombatContext):CombatAction{
 if(!s.visible)return s.remembered?'investigate':'hold';
 if(s.suppression>.72&&s.morale<.62)return 'withdraw';
 if(s.ammunition<=0)return 'reload';
 if(!s.laneClear)return 'reposition';
 if(s.suppression>.55)return 'hold';
 return 'engage';
}
