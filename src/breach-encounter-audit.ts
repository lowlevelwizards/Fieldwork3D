/** Encounter audit snapshots for deterministic local tests and Map Lab diagnostics.
 * No simulation mutations, opponent omniscience in player UI, or extra tick work.
 */
import type {ActorAwareness} from './breach-awareness.ts';
import type {AIIntent} from './breach-ai-policy.ts';
export type EncounterAuditActor={
 id:string;side:'red'|'blue';health:number;alert:string;
 p:{x:number;y:number};awareness:ActorAwareness;
 intent:AIIntent|null;encounterReactionUntil?:number;
 lastShotAt:number;lastNoiseAt:number;velocity:number;
};
export type EncounterAuditRow={
 at:number;id:string;alert:string;intent:string;
 observedContacts:number;visualProgress:number;
 reactionRemaining:number;lastShotAt:number;moving:boolean;
};
export function encounterAuditSnapshot(at:number,actors:readonly EncounterAuditActor[]):
 EncounterAuditRow[]{
 return actors.filter(a=>a.side==='red'&&a.health>0).map(a=>({
  at,id:a.id,alert:a.alert,intent:a.intent?.kind??'none',
  observedContacts:Object.values(a.awareness.contacts)
   .filter(c=>c.confidence>.1).length,
  visualProgress:Math.max(0,...Object.values(a.awareness.visualProgress)),
  reactionRemaining:Number.isFinite(a.encounterReactionUntil)?
   Math.max(0,(a.encounterReactionUntil??0)-at):0,
  lastShotAt:a.lastShotAt,moving:a.velocity>10
 }));
}
export function summarizeEncounterAudit(rows:readonly EncounterAuditRow[]){
 const ids=new Set(rows.map(r=>r.id));
 const firstVisual=rows.filter(r=>r.visualProgress>=.999);
 const shots=rows.filter(r=>r.lastShotAt>=0&&r.lastShotAt<=r.at);
 const earliest=(r:readonly EncounterAuditRow[])=>r.length?
   Math.min(...r.map(x=>x.at)):null;
 return {actors:ids.size,samples:rows.length,
  firstVisualAt:earliest(firstVisual),
  firstShotAt:earliest(shots),
  maxConcurrentMovers:Math.max(0,...[...new Set(rows.map(r=>r.at))].map(
   t=>rows.filter(r=>r.at===t&&r.moving).length))};
}
