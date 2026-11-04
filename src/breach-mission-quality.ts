/** R5: observational quality checks. Replay is the authoritative past;
 * this module never simulates or corrects past events.
 */
import type {ReplayFrame} from './breach-replay.ts';
import type {BattleEvent} from './breach-combat.ts';
import {summarizeMissionPacing} from './breach-mission-pacing.ts';
export type MissionFilmQuality=ReturnType<typeof summarizeMissionPacing>&{
 duration:number;frameCount:number;eventCount:number;issues:string[];
};
export function assessMissionFilm(frames:readonly ReplayFrame[],
 events:readonly BattleEvent[],expectedActors?:number):MissionFilmQuality{
 const issues:string[]=[];
 const duration=frames.at(-1)?.t??0;
 if(!frames.length)issues.push('no replay frames');
 let before=-Infinity;
 for(const [i,f] of frames.entries()){
  if(!Number.isFinite(f.t)||f.t<before)issues.push('unordered frame '+i);
  before=f.t;
  if(expectedActors!==undefined&&f.actors.length!==expectedActors)
   issues.push('actor count mismatch at '+i);
  if(f.actors.some(a=>!Number.isFinite(a.p.x)||!Number.isFinite(a.p.y)))
   issues.push('invalid actor position at '+i);
  if(f.rescue&&(!Number.isFinite(f.rescue.p.x)||
    !Number.isFinite(f.rescue.p.y)))issues.push('invalid rescue position at '+i);
 }
 if(events.some(e=>!Number.isFinite(e.t)||e.t<0||e.t>duration+.06))
  issues.push('event outside replay time');
 const pacing=summarizeMissionPacing(events);
 if(pacing.firstContactAt!==null&&pacing.objectiveAt!==null&&
  pacing.objectiveAt<pacing.firstContactAt)
   issues.push('objective before confirmed contact');
 if(pacing.objectiveAt!==null&&pacing.extractionAt!==null&&
  pacing.extractionAt<pacing.objectiveAt)
   issues.push('extraction before objective');
 if(frames.some(f=>f.mission==='done')&&pacing.extractionAt===null)
  issues.push('completed mission without extraction event');
 return {...pacing,duration,frameCount:frames.length,
  eventCount:events.length,issues:[...new Set(issues)]};
}
export type MissionSampleObservation={
 seed:number;mission:string;topology:string;invalid:boolean;
 objectiveDistance:number;verifiedApproaches:number;
 verifiedWindows:number;verifiedDoors:number;overexposedRooms:number;
 film:MissionFilmQuality;
};
export function summarizeMissionSamples(samples:readonly MissionSampleObservation[]){
 const avg=(f:(s:MissionSampleObservation)=>number)=>samples.length?
  Math.round(samples.reduce((n,s)=>n+f(s),0)/samples.length*10)/10:0;
 return {samples:samples.length,
  invalid:samples.filter(s=>s.invalid).length,
  missionKinds:new Set(samples.map(s=>s.mission)).size,
  topologySignatures:new Set(samples.map(s=>s.topology)).size,
  meanObjectiveDistance:avg(s=>s.objectiveDistance),
  meanVerifiedApproaches:avg(s=>s.verifiedApproaches),
  meanVerifiedWindows:avg(s=>s.verifiedWindows),
  meanVerifiedDoors:avg(s=>s.verifiedDoors),
  overexposedRooms:samples.reduce((n,s)=>n+s.overexposedRooms,0),
  observedContacts:samples.filter(s=>s.film.firstContactAt!==null).length,
  observedShots:samples.filter(s=>s.film.firstShotAt!==null).length,
  completed:samples.filter(s=>s.film.extractionAt!==null).length,
  replayIssues:samples.reduce((n,s)=>n+s.film.issues.length,0)};
}
