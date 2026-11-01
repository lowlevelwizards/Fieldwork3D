/** LW-18: bounded mission timeline, displayed only after conclusion.
 * Actual time-stamped events come from the replay recorder; live fog and
 * each actor's memories never read this retrospective account.
 */
import type {BattleEvent} from './breach-combat.ts';
const major=new Set<BattleEvent['kind']>([
 'wound','down','door','objective','surrender','intel','impact','interaction'
]);
export function afterActionEvents(events:readonly BattleEvent[],limit=14){
 return events.filter(e=>major.has(e.kind))
  .sort((a,b)=>a.t-b.t||a.id-b.id).slice(-Math.max(0,limit));
}
export function formatAfterAction(events:readonly BattleEvent[],limit=10):string{
 const selected=afterActionEvents(events,limit);
 if(!selected.length)return 'No major recorded tactical events.';
 return selected.map(e=>{
  const minutes=Math.floor(e.t/60),seconds=Math.floor(e.t%60);
  return String(minutes).padStart(2,'0')+':'+
    String(seconds).padStart(2,'0')+'  '+e.text;
 }).join('\n');
}
