/** Psychological response to *experienced* danger, not a hidden global event. */
export type Resolve='hold'|'withdraw'|'surrender';
export type Temperament='guard'|'aggressor'|'cautious';
export function moraleResponse(morale:number,suppression:number,
 injury:number,personality:Temperament):Resolve{
 const courage=personality==='aggressor'?.12:
  personality==='cautious'?-.09:0;
 const endangered=suppression+Math.min(2,injury)*.12;
 if(endangered>.64&&morale<.19+courage*-1)return 'surrender';
 if(endangered>.37&&morale<.54-courage)return 'withdraw';
 return 'hold';
}
export function witnessShock(distance:number,unobstructed:boolean):number{
 if(!unobstructed||distance>160)return 0;
 return .08+.12*(1-distance/160);
}
