/** Truthful after-action replay anchors. The existing playback controller
 * applies context padding exactly once and owns all transport behavior.
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
 // Never anchor a clip to a different contact or silently accept an invalid ID.
 if(anchor.shotId!=null&&(!found||
   anchor.contactId!=null&&found.targetId!==anchor.contactId))return null;
 if(anchor.end!==undefined&&(!finite(anchor.end)||anchor.end<anchor.time))return null;
 const first=found?found.recordedAt:match[0]?.recordedAt??anchor.time;
 // Explicit incident bounds take precedence over unrelated shots on the same target.
 const last=found?found.recordedAt:anchor.end!==undefined?anchor.end:
   match.at(-1)?.recordedAt??anchor.time;
 if(!finite(first)||!finite(last)||first>rec.duration||last>rec.duration)return null;
 const low=Math.max(0,Math.min(first,last,rec.duration));
 const high=Math.min(rec.duration,Math.max(first,last,low));
 return {
   range:{start:low,end:high},
   label:anchor.contactId?.toUpperCase()??anchor.surface.toUpperCase(),
   contactId:anchor.contactId??null,shotId:anchor.shotId??null
 };
}
