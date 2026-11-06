/** Replay R3 G1: immutable chunk addressing for future long-film streaming.
 * Read-only index; it does not expand memory limits or alter sample cadence.
 * 400 frames = roughly 20 seconds at 20 Hz, aligned to 40-frame keyframes.
 */
export const REPLAY_CHUNK_FRAMES=400;
export type ReplayChunkBoundary={
  index:number;first:number;endExclusive:number;
  fromTime:number;toTime:number;
};
export class ReplayFrameChunkIndex<T extends {t:number}>{
  readonly chunks:readonly ReplayChunkBoundary[];
  constructor(private readonly frames:readonly T[],
    chunkSize=REPLAY_CHUNK_FRAMES){
    if(!Number.isSafeInteger(chunkSize)||chunkSize<1)
      throw Error('Invalid replay chunk size');
    const entries:ReplayChunkBoundary[]=[];
    for(let first=0;first<frames.length;first+=chunkSize){
      const last=Math.min(frames.length,first+chunkSize);
      entries.push({
        index:entries.length,first,endExclusive:last,
        fromTime:frames[first].t,toTime:frames[last-1].t
      });
    }
    this.chunks=entries;
  }
  get length(){return this.frames.length;}
  /** No slicing/allocating frames; a future decoder may swap storage. */
  atIndex(index:number):T|null{
    return index>=0&&index<this.frames.length?this.frames[index]:null;
  }
  chunkForTime(time:number):ReplayChunkBoundary|null{
    const chunks=this.chunks;
    if(!chunks.length)return null;
    let lo=0,hi=chunks.length-1;
    while(lo<hi){
      const m=(lo+hi)>>>1;
      if(chunks[m].toTime<time)lo=m+1;else hi=m;
    }
    return chunks[lo];
  }
  /** Adjacent authoritative samples, including chunk boundaries. */
  surrounding(time:number):{previous:T;next:T;alpha:number}|null{
    const frames=this.frames;
    if(!frames.length)return null;
    const t=Math.max(frames[0].t,Math.min(frames[frames.length-1].t,time));
    const chunk=this.chunkForTime(t)!;
    let lo=chunk.first,hi=chunk.endExclusive-1;
    while(lo<hi){
      const m=(lo+hi+1)>>>1;
      if(frames[m].t<=t)lo=m;else hi=m-1;
    }
    // If a time lies beyond the end of a chunk, use its right boundary.
    let index=lo;
    if(frames[index].t>t&&index>0)index--;
    const previous=frames[index],next=frames[Math.min(index+1,frames.length-1)];
    return {previous,next,
      alpha:next.t>previous.t?(t-previous.t)/(next.t-previous.t):0};
  }
}
export type ReplaySharingFootprint={
  frames:number;uniqueActorArrays:number;uniqueWorldArrays:number;
  actorArrayReuse:number;worldArrayReuse:number
};
/** Object-reference counts, NOT misleading estimated heap bytes. */
export function replaySharingFootprint(
  frames:readonly {actors:object;doors:object}[]
):ReplaySharingFootprint{
  const actorRefs=new WeakSet<object>(),worldRefs=new WeakSet<object>();
  let uniqueActorArrays=0,uniqueWorldArrays=0;
  for(const f of frames){
    if(!actorRefs.has(f.actors)){actorRefs.add(f.actors);uniqueActorArrays++;}
    if(!worldRefs.has(f.doors)){worldRefs.add(f.doors);uniqueWorldArrays++;}
  }
  return {frames:frames.length,uniqueActorArrays,uniqueWorldArrays,
    actorArrayReuse:frames.length-uniqueActorArrays,
    worldArrayReuse:frames.length-uniqueWorldArrays};
}
