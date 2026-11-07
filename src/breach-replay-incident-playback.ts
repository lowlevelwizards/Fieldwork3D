/** R4.1: bounded historical incident playback without resimulation. */
import type {ReplayIncident} from './breach-replay-incidents.ts';
import type {ReplayLoopRange} from './breach-replay-loop.ts';

const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
export function incidentPlaybackWindow(
  incident:Pick<ReplayIncident,'start'|'end'>,duration:number,
  lead=3,tail=5
):ReplayLoopRange|null{
  if(!Number.isFinite(duration)||duration<=0||
    !Number.isFinite(incident.start)||!Number.isFinite(incident.end)||
    incident.start<0||incident.end<incident.start||
    incident.end>duration||!Number.isFinite(lead)||
    !Number.isFinite(tail))return null;
  const start=clamp(incident.start-Math.max(0,lead),0,duration);
  const end=clamp(incident.end+Math.max(0,tail),0,duration);
  return end-start>=.35?{start,end}:null;
}
export function advanceIncidentPlayback(
  time:number,dt:number,range:ReplayLoopRange,loop:boolean
):{time:number;wrapped:boolean;finished:boolean}{
  const width=range.end-range.start;
  if(!Number.isFinite(time)||!Number.isFinite(dt)||
    !Number.isFinite(width)||width<=0)
    return {time:range.start,wrapped:false,finished:true};
  if(time<range.start||time>range.end)
    return {time:range.start,wrapped:true,finished:false};
  const next=time+Math.max(0,dt);
  if(next<range.end)return {time:next,wrapped:false,finished:false};
  if(loop)return {time:range.start+(next-range.start)%width,
    wrapped:true,finished:false};
  return {time:range.end,wrapped:false,finished:true};
}
