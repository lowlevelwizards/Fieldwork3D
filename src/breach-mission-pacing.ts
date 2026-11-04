/** Retrospective mission pacing from actual sim events, never predictions.
 * Player-facing only after the run; no hidden opponent coordinates or
 * generated scenario truth is consulted.
 */
import type {BattleEvent} from './breach-combat.ts';
export type MissionPacing={
 firstContactAt:number|null;firstShotAt:number|null;
 objectiveAt:number|null;extractionAt:number|null;
 contactToObjective:number|null;objectiveToExtraction:number|null;
 };
const first=(events:readonly BattleEvent[],predicate:(e:BattleEvent)=>boolean):
 number|null=>events.filter(predicate).reduce<number|null>(
  (t,e)=>t===null?e.t:Math.min(t,e.t),null);
const elapsed=(a:number|null,b:number|null)=>a===null||b===null?null:
 Math.max(0,Math.round((b-a)*10)/10);
export function summarizeMissionPacing(events:readonly BattleEvent[]):MissionPacing{
 const firstContactAt=first(events,e=>e.kind==='intel'&&
   e.text.includes('SPOTTED'));
 const firstShotAt=first(events,e=>e.kind==='shot');
 const objectiveAt=first(events,e=>e.kind==='objective'&&
   /SECURED|FOUND|HELD|RECOVERED/.test(e.text)&&
   e.text!=='HOSTILES SECURED');
 const extractionAt=first(events,e=>e.kind==='objective'&&
   e.text==='MISSION COMPLETE');
 return {firstContactAt,firstShotAt,objectiveAt,extractionAt,
  contactToObjective:elapsed(firstContactAt,objectiveAt),
  objectiveToExtraction:elapsed(objectiveAt,extractionAt)};
}
export function formatMissionPacing(events:readonly BattleEvent[]):string{
 const p=summarizeMissionPacing(events);
 const stamp=(t:number|null)=>t===null?'—':Math.floor(t/60)+
   ':'+String(Math.floor(t%60)).padStart(2,'0');
 const length=(t:number|null)=>t===null?'—':t.toFixed(1)+'s';
 return 'FIRST CONFIRMED CONTACT '+stamp(p.firstContactAt)+
   ' · FIRST SHOT '+stamp(p.firstShotAt)+'\n'+
   'OBJECTIVE SECURED '+stamp(p.objectiveAt)+
   ' · EXTRACTION '+stamp(p.extractionAt)+'\n'+
   'CONTACT → OBJECTIVE '+length(p.contactToObjective)+
   ' · OBJECTIVE → EXIT '+length(p.objectiveToExtraction);
}
