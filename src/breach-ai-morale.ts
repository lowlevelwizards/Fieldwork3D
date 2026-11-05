/** Psychological response to *experienced* danger, not a hidden global event. */
export type Resolve='hold'|'withdraw'|'surrender';
export type Temperament='guard'|'aggressor'|'cautious';
export type MoraleContext={nearbyAllies?:number};
export function moraleResponse(morale:number,suppression:number,
 injury:number,personality:Temperament,
 context:MoraleContext={}):Resolve{
 const courage=personality==='aggressor'?.12:
  personality==='cautious'?-.09:0;
 // Only actual nearby friends supplied by the runtime provide reassurance.
 // This changes resolve, never who the opponent can see or shoot.
 const support=Math.min(.12,Math.max(0,context.nearbyAllies??0)*.04);
 const effectiveMorale=Math.min(1,morale+support);
 const endangered=suppression+Math.min(2,injury)*.12;
 if(endangered>.64&&effectiveMorale<.19+courage*-1)return 'surrender';
 if(endangered>.37&&effectiveMorale<.54-courage)return 'withdraw';
 return 'hold';
}
export function witnessShock(distance:number,unobstructed:boolean):number{
 if(!unobstructed||distance>160)return 0;
 return .08+.12*(1-distance/160);
}
