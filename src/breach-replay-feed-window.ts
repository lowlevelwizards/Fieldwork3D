/** Replay UX V2 — bounded chronological feed following.
 * Input events have already passed historical disclosure filtering.
 * The function never reads live mission state or mutates the timeline.
 */
export type ReplayFeedPosition={start:number;end:number;focusIndex:number};
export function replayFeedPosition<T extends {t:number}>(
  events:readonly T[],time:number,windowSize=80
):ReplayFeedPosition{
  const n=events.length,size=Math.max(1,Math.floor(windowSize));
  if(n===0)return {start:0,end:0,focusIndex:-1};
  let lo=0,hi=n;
  while(lo<hi){
    const mid=(lo+hi)>>>1;
    if(events[mid].t<=time+.00001)lo=mid+1;else hi=mid;
  }
  const focusIndex=Math.max(0,lo-1);
  const start=Math.min(Math.max(0,focusIndex-Math.floor(size/2)),
    Math.max(0,n-size));
  return {start,end:Math.min(n,start+size),focusIndex};
}
