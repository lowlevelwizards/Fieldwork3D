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

/** Nearby allies from the same encounter group steady an active enemy.
 * This is intentionally separate from AI choice: callers keep the old
 * "only when suppressed or shaken" gate and its exact <130 threshold.
 * Iterate the roster directly; no per-enemy filtered array at 60 Hz.
 */
export type MoralePeer={
  side:'blue'|'red';health:number;encounterGroupId?:string;
  p:{x:number;y:number}
};
export function countNearbyEnemyAllies(
 actor:MoralePeer,roster:readonly MoralePeer[]
):number{
 let nearby=0;
 for(const other of roster){
   if(other===actor||other.side!=='red'||other.health<=0||
      other.encounterGroupId!==actor.encounterGroupId)continue;
   if(Math.hypot(other.p.x-actor.p.x,other.p.y-actor.p.y)<130)nearby++;
 }
 return nearby;
}
