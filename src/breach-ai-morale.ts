/** Psychological response to *experienced* danger, not a hidden global event. */
export type Resolve='hold'|'withdraw'|'surrender';
export type Temperament='guard'|'aggressor'|'cautious';
export type MoraleContext={nearbyAllies?:number;
 recentlySeenThreats?:number;retreatBlocked?:boolean};
export function moraleResponse(morale:number,suppression:number,
 injury:number,personality:Temperament,
 context:MoraleContext={}):Resolve{
 const courage=personality==='aggressor'?.12:
  personality==='cautious'?-.09:0;
 // Only actual nearby friends supplied by the runtime provide reassurance.
 // This changes resolve, never who the opponent can see or shoot.
 const support=Math.min(.12,Math.max(0,context.nearbyAllies??0)*.04);
 // Outnumbering is a conclusion from the defender's own recent *direct*
 // sightings, never from the actual hidden blue-team roster. Support counts
 // only nearby friendly bodies and preserves the prior four-arg behavior.
 const outnumbered=Math.max(0,Math.min(3,
   (context.recentlySeenThreats??0)-(context.nearbyAllies??0)-1));
 const effectiveMorale=Math.max(0,Math.min(1,
   morale+support-outnumbered*.045));
 const endangered=suppression+Math.min(2,injury)*.12+
   outnumbered*.035+(context.retreatBlocked?.08:0);
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

/** Count only independently confirmed and RECENT visually observed subjects,
 * never all actual opponents or an unverified reported/guessed contact.
 * This helper runs only while a defender is under meaningful pressure. */
export function countRecentlySeenThreats(
 contacts:Readonly<Record<string,{lastSeenAt:number|null}>>,
 now:number,horizon=2):number{
 let count=0;
 for(const belief of Object.values(contacts)){
  if(belief.lastSeenAt!==null&&belief.lastSeenAt>=0&&
     now>=belief.lastSeenAt&&now-belief.lastSeenAt<=horizon)count++;
 }
 return Math.min(5,count);
}
