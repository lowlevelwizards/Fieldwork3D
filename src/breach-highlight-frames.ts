/** Tactical moment selection remains distinct from image merit.
 * These are recorded incident anchors, not pre-authored hero shots.
 */
import type {MissionRecorder} from './breach-replay.ts';
import {ReplayEventIndex} from './breach-replay-event-index.ts';
import {indexReplayIncidents,featuredReplayIncidents}
 from './breach-replay-incidents.ts';
export type HighlightMoment={
 id:string;at:number;end:number;label:string;summary:string;
 actorIds:string[];incidentScore:number;
};
export function replayHighlightMoments(rec:MissionRecorder,limit=5):HighlightMoment[]{
 const index=new ReplayEventIndex(rec.events,rec.executionEvents,()=>true);
 const incidents=indexReplayIncidents(index.all,rec.duration);
 return featuredReplayIncidents(incidents,limit).map(e=>({
   id:e.id,at:e.start,end:e.end,label:e.label,
   summary:e.summary,actorIds:e.actorIds,incidentScore:e.score
 }));
}
