/** After Action V2 link normalization. The existing replay controller owns
 * playback and session lifecycle; this only defines truthful clip targets.
 */
import type {MissionRecorder} from './breach-replay.ts';
export type AfterActionReplayAnchor={
  surface:string;contactId?:string;shotId?:number|null;time:number;
  end?:number
};
export type AfterActionLaunchRequest={
  range:{start:number;end:number};label:string;
  contactId:string|null;shotId:number|null;
};
const finite=(n:number)=>Number.isFinite(n)&&n>=0;
export function makeAfterActionLaunchRequest(
 rec:MissionRecorder,anchor:AfterActionReplayAnchor
):AfterActionLaunchRequest|null{
 if(!finite(rec.duration)||rec.duration<.35||!finite(anchor.time))return null;
 const match=anchor.contactId?rec.ballistics.shots.filter(s=>
   s.targetId===anchor.contactId).slice().sort((a,b)=>
   a.recordedAt-b.recordedAt||a.id-b.id):[];
 const found=anchor.shotId==null?null:
   rec.ballistics.shots.find(s=>s.id===anchor.shotId)??null;
 const first=found?found.recordedAt:match[0]?.recordedAt??anchor.time;
 const last=found?found.recordedAt:
   match.at(-1)?.recordedAt??(anchor.end!==undefined&&finite(anchor.end)?
     Math.max(anchor.time,anchor.end):anchor.time);
 const low=Math.max(0,Math.min(first,last,rec.duration));
 const high=Math.min(rec.duration,Math.max(first,last,low));
 return {
   range:{start:low,end:high},
   label:anchor.contactId?.toUpperCase()??anchor.surface.toUpperCase(),
   contactId:anchor.contactId??null,shotId:anchor.shotId??null
 };
}
