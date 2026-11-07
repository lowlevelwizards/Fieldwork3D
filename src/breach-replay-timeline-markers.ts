/** Replay timeline events are clustered into a bounded number of visual ticks.
 * The complete event index is retained for keyboard navigation and the feed.
 */
export type ReplayTimelineEvent={t:number;kind:string};
export type ReplayTimelineCluster={
  index:number;kind:string;time:number;count:number
};
const priority=(kind:string)=>kind==='down'?5:kind==='wound'?4:
  kind==='flash'?3:kind==='door'?2:kind==='shot'?1:0;
/** Cluster by a touch-friendly horizontal bin, not by 7px display-only ticks. */
export const replayTimelineBins=(width:number):number=>
  Math.max(8,Math.floor(Math.max(0,width)/24));
export function clusterReplayTimeline(
  events:readonly ReplayTimelineEvent[],duration:number,width:number
):ReplayTimelineCluster[]{
  if(duration<=0||!Number.isFinite(duration))return [];
  const bins=replayTimelineBins(width);
  const clusters=new Map<number,ReplayTimelineCluster>();
  for(const e of events){
    if(!Number.isFinite(e.t))continue;
    const index=Math.min(bins-1,Math.max(0,
      Math.floor(e.t/duration*bins)));
    const prior=clusters.get(index);
    if(!prior)clusters.set(index,{
      index,kind:e.kind,time:e.t,count:1
    });
    else{
      prior.count++;
      if(priority(e.kind)>priority(prior.kind))prior.kind=e.kind;
    }
  }
  return [...clusters.values()].sort((a,b)=>a.index-b.index);
}
