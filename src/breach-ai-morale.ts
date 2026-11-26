/** Psychological response to *experienced* danger, not a hidden global event. */
export type Resolve='hold'|'withdraw'|'surrender';
import {npcPressurePolicy,type Temperament} from './breach-ai-pressure-policy.ts';
export type {Temperament} from './breach-ai-pressure-policy.ts';
import type {AiMotivation} from './breach-ai-group-profiles.ts';
export type MoraleContext={nearbyAllies?:number;motivation?:AiMotivation;
 recentlySeenThreats?:number;retreatBlocked?:boolean};
export function moraleResponse(morale:number,suppression:number,
 injury:number,personality:Temperament,
 context:MoraleContext={}):Resolve{
 const {courage}=npcPressurePolicy(personality);
 // Only actual nearby friends supplied by the runtime provide reassurance.
 // This changes resolve, never who the opponent can see or shoot.
 const support=Math.min(.12,Math.max(0,context.nearbyAllies??0)*.04);
 // Outnumbering is a conclusion from the defender's own recent *direct*
 // sightings, never from the actual hidden blue-team roster. Support counts
 // only nearby friendly bodies and preserves the prior four-arg behavior.
 const outnumbered=Math.max(0,Math.min(3,
   (context.recentlySeenThreats??0)-(context.nearbyAllies??0)-1));
 // Motivation changes willingness to remain in danger, not physical ability.
 // Support-group only benefits from actual nearby allies. No faction-wide
 // knowledge, and no resolve bonus can bypass custody/medical authority.
 const commitment=motivationResolveOffset(context.motivation,support>0);
 const effectiveMorale=Math.max(0,Math.min(1,
   morale+support-outnumbered*.045+commitment));
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
  side:'blue'|'red';health:number;encounterGroupId?:string;surrendered?:boolean;
  p:{x:number;y:number}
};
export function countNearbyEnemyAllies(
 actor:MoralePeer,roster:readonly MoralePeer[]
):number{
 let nearby=0;
 for(const other of roster){
   if(other===actor||other.side!=='red'||other.health<=0||other.surrendered||
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

/** Shared human resolve policy, no new random roll or health modifier.
 * A spoken challenge does not grant the caller knowledge of the subject. */
export function motivationResolveOffset(motivation?:AiMotivation,supported=false):number{
 return motivation==='protect-assignment'?.065:
  motivation==='support-group'&&supported?.055:
  motivation==='survive'?-.065:
  motivation==='avoid-capture'?-.045:0;
}
export function challengeCompliance(morale:number,suppression:number,injury:number,motivation?:AiMotivation):boolean{
 const resolve=Math.max(0,Math.min(1,morale+motivationResolveOffset(motivation)));
 const pressure=suppression+Math.min(2,injury)*.11;
 return resolve<=.34||resolve<=.62&&pressure>=.22;
}
/** Cheap group-scoped candidate index. It retains iteration order and
 * references to live actors rather than caching changing health or positions. */
export function fallenAlliesByGroup<T extends MoralePeer>(roster:readonly T[]):Map<string|undefined,T[]>{
 const groups=new Map<string|undefined,T[]>();
 for(const actor of roster){
  if(actor.side!=='red'||actor.health>0||actor.surrendered)continue;
  let members=groups.get(actor.encounterGroupId);
  if(!members)groups.set(actor.encounterGroupId,members=[]);
  members.push(actor);
 }
 return groups;
}

/** Index stable membership once for a decision phase. Read changing health,
 * surrender, heading and position directly from live actors at use time. */
export function enemyPeersByGroup<T extends MoralePeer>(roster:readonly T[]):Map<string|undefined,T[]>{
 const groups=new Map<string|undefined,T[]>();
 for(const actor of roster){
  if(actor.side!=='red')continue;
  let members=groups.get(actor.encounterGroupId);
  if(!members)groups.set(actor.encounterGroupId,members=[]);
  members.push(actor);
 }
 return groups;
}
