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
  private readonly frames:readonly T[];
  constructor(frames:readonly T[],chunkSize=REPLAY_CHUNK_FRAMES){
    this.frames=frames;
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
  actorArrayReuse:number;worldArrayReuse:number;
  uniqueActorRecords:number;sharedActorRecords:number
};
/** Object-reference counts, NOT misleading estimated heap bytes. */
export function replaySharingFootprint(
  frames:readonly {actors:readonly object[];doors:object}[]
):ReplaySharingFootprint{
  const actorRefs=new WeakSet<object>(),worldRefs=new WeakSet<object>();
  const records=new WeakSet<object>();
  let uniqueActorArrays=0,uniqueWorldArrays=0,uniqueActorRecords=0;
  let actorRecordCount=0;
  for(const f of frames){
    if(!actorRefs.has(f.actors)){actorRefs.add(f.actors);uniqueActorArrays++;}
    if(!worldRefs.has(f.doors)){worldRefs.add(f.doors);uniqueWorldArrays++;}
    for(const actor of f.actors){
      actorRecordCount++;
      if(!records.has(actor)){records.add(actor);uniqueActorRecords++;}
    }
  }
  return {frames:frames.length,uniqueActorArrays,uniqueWorldArrays,
    actorArrayReuse:frames.length-uniqueActorArrays,
    worldArrayReuse:frames.length-uniqueWorldArrays,
    uniqueActorRecords,sharedActorRecords:actorRecordCount-uniqueActorRecords};
}

/** G2 read-side experiment for future persisted chunks.
 * No background writer, no recorder cap change, no unbounded array and no
 * silent fallback to current simulation knowledge. A corrupt/missing chunk
 * fails explicitly. Loaded chunks are validated before entering the cache.
 */
export class ReplayChunkWindow<T extends {t:number}>{
  private readonly catalog:readonly ReplayChunkBoundary[];
  private readonly loadChunk:(index:number)=>Promise<readonly T[]>;
  private readonly cache=new Map<number,readonly T[]>();
  private readonly pending=new Map<number,Promise<readonly T[]>>();
  private readonly maxResidentChunks:number;
  private readonly maxFramesPerChunk:number;
  constructor(
    boundaries:readonly ReplayChunkBoundary[],
    loadChunk:(index:number)=>Promise<readonly T[]>,
    options:{maxResidentChunks?:number;maxFramesPerChunk?:number}={}
  ){
    this.maxResidentChunks=options.maxResidentChunks??3;
    this.maxFramesPerChunk=options.maxFramesPerChunk??REPLAY_CHUNK_FRAMES;
    if(!Number.isSafeInteger(this.maxResidentChunks)||
      this.maxResidentChunks<2||this.maxResidentChunks>8||
      !Number.isSafeInteger(this.maxFramesPerChunk)||
      this.maxFramesPerChunk<1)
      throw Error('Invalid replay window memory bounds');
    if(boundaries.length>5000)
      throw Error('Replay window catalog exceeds safety limit');
    let expected=0,previousTime=-Infinity;
    for(let i=0;i<boundaries.length;i++){
      const b=boundaries[i];
      if(b.index!==i||b.first!==expected||
        !Number.isSafeInteger(b.endExclusive)||
        b.endExclusive<=b.first||
        b.endExclusive-b.first>this.maxFramesPerChunk||
        !Number.isFinite(b.fromTime)||!Number.isFinite(b.toTime)||
        b.fromTime<0||b.fromTime<previousTime||
        b.toTime<b.fromTime)
        throw Error('Invalid or noncontiguous replay chunk catalog');
      expected=b.endExclusive;previousTime=b.toTime;
    }
    this.catalog=boundaries.map(b=>({...b}));
    this.loadChunk=loadChunk;
  }
  /** Number of resident chunks, not bytes or persisted archive size. */
  get residentCount(){return this.cache.size;}
  get residentIndices(){return [...this.cache.keys()].sort((a,b)=>a-b);}
  get totalFrames(){return this.catalog.at(-1)?.endExclusive??0;}
  private async get(index:number):Promise<readonly T[]>{
    const cached=this.cache.get(index);
    if(cached){
      this.cache.delete(index);this.cache.set(index,cached);
      return cached;
    }
    const ongoing=this.pending.get(index);
    if(ongoing)return ongoing;
    const boundary=this.catalog[index];
    if(!boundary)throw Error('Replay chunk is outside the recorded catalog');
    const task=Promise.resolve().then(()=>this.loadChunk(index)).then(frames=>{
      if(!Array.isArray(frames)||frames.length!==
        boundary.endExclusive-boundary.first)
        throw Error('Replay chunk missing or incomplete: '+index);
      let prior=-Infinity;
      for(const sample of frames){
        if(!sample||!Number.isFinite(sample.t)||sample.t<prior)
          throw Error('Replay chunk contains invalid frame time: '+index);
        prior=sample.t;
      }
      const tolerance=1e-5;
      if(Math.abs(frames[0].t-boundary.fromTime)>tolerance||
        Math.abs(frames[frames.length-1].t-boundary.toTime)>tolerance)
        throw Error('Replay chunk time boundaries do not match: '+index);
      this.cache.set(index,frames);
      while(this.cache.size>this.maxResidentChunks){
        const oldest=this.cache.keys().next().value;
        if(oldest===undefined)break;
        this.cache.delete(oldest);
      }
      return frames;
    }).finally(()=>{this.pending.delete(index);});
    this.pending.set(index,task);
    return task;
  }
  /** Only the two authoritative surrounding samples are exposed.
   * Adjacent chunks are fetched on demand for threshold interpolation.
   */
  async surrounding(time:number):Promise<{
    previous:T;next:T;alpha:number
  }|null>{
    if(!Number.isFinite(time)||!this.catalog.length)return null;
    const first=this.catalog[0],last=this.catalog.at(-1)!;
    const t=Math.max(first.fromTime,Math.min(time,last.toTime));
    let lo=0,hi=this.catalog.length-1;
    while(lo<hi){
      const mid=(lo+hi)>>>1;
      if(this.catalog[mid].toTime<t)lo=mid+1;else hi=mid;
    }
    const chunkIndex=lo,chunk=await this.get(chunkIndex);
    // The sought timestamp may fall between two persisted chunks.
    if(t<chunk[0].t&&chunkIndex>0){
      const prior=await this.get(chunkIndex-1);
      const previous=prior[prior.length-1],next=chunk[0];
      return {previous,next,
        alpha:next.t>previous.t?(t-previous.t)/(next.t-previous.t):0};
    }
    lo=0;hi=chunk.length-1;
    while(lo<hi){
      const mid=(lo+hi+1)>>>1;
      if(chunk[mid].t<=t)lo=mid;else hi=mid-1;
    }
    const previous=chunk[lo];
    const next=lo+1<chunk.length?chunk[lo+1]:
      chunkIndex+1<this.catalog.length?
        (await this.get(chunkIndex+1))[0]:previous;
    return {previous,next,
      alpha:next.t>previous.t?(t-previous.t)/(next.t-previous.t):0};
  }
}
