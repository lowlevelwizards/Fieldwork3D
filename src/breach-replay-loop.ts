/** Replay R3: bounded A/B looping for immutable historical films. */
export type ReplayLoopRange={start:number;end:number};
export function makeReplayLoop(start:number|null,end:number|null,
  duration:number):ReplayLoopRange|null{
  if(start===null||end===null||!Number.isFinite(start)||
    !Number.isFinite(end)||!Number.isFinite(duration))return null;
  const a=Math.max(0,Math.min(duration,start));
  const b=Math.max(0,Math.min(duration,end));
  return b-a>=.35?{start:a,end:b}:null;
}
export function advanceReplayLoop(time:number,delta:number,
  range:ReplayLoopRange|null,duration:number):{
    time:number;wrapped:boolean
  }{
  if(!range)return {time:Math.max(0,Math.min(duration,time+delta)),
    wrapped:false};
  if(time<range.start||time>=range.end)
    return {time:range.start,wrapped:true};
  const next=time+Math.max(0,delta);
  if(next<range.end)return {time:next,wrapped:false};
  return {time:range.start+(next-range.start)%(range.end-range.start),
    wrapped:true};
}
