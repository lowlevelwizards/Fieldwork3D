/** Replay R3 G5b1 — bounded 20Hz capture-to-chunk handoff.
 *
 * This does not change MissionRecorder or write IndexedDB itself. A caller
 * supplies a transactional, ordered sink (future G5b2). One persistence
 * operation per FULL chunk, never one per frame or game tick.
 *
 * Memory contract: one assembling chunk plus at most N sealed chunks
 * (including the in-flight write). On storage pressure we stop accepting
 * new evidence and explicitly mark the recording truncated. No silent
 * FIFO drops. Failed chunks retain their ordinal for explicit retry.
 */
export const REPLAY_SPOOL_CHUNK_FRAMES=400;
export type ReplaySpoolResult={
  acceptedFrames:number;persistedFrames:number;chunks:number;
  recordingComplete:boolean;truncatedAt:number|null;
  truncationReason:string|null;
};
export type ReplaySpoolState='recording'|'truncated'|'failed'|
  'draining'|'complete';
type SealedChunk<T>={
  index:number;frames:readonly T[];final:boolean
};
export class ReplayChunkCaptureSpool<T extends {t:number}>{
  private readonly sink:(index:number,frames:readonly T[],
    final:boolean)=>Promise<void>;
  readonly chunkFrames:number;
  readonly maxQueuedChunks:number;
  private assembling:T[]=[];
  private pending:SealedChunk<T>[]=[];
  private active:SealedChunk<T>|null=null;
  private lastTime=-Infinity;
  private firstRejectedAt:number|null=null;
  private rejectedReason:string|null=null;
  private writerFailure:unknown=null;
  private nextIndex=0;
  private committedChunks=0;
  private received=0;
  private persisted=0;
  private closed=false;
  private complete=false;
  private listeners=new Set<()=>void>();
  constructor(sink:(index:number,frames:readonly T[],
    final:boolean)=>Promise<void>,
    options:{chunkFrames?:number;maxQueuedChunks?:number}={}){
    this.sink=sink;
    this.chunkFrames=options.chunkFrames??REPLAY_SPOOL_CHUNK_FRAMES;
    this.maxQueuedChunks=options.maxQueuedChunks??2;
    if(typeof sink!=='function'||
      !Number.isSafeInteger(this.chunkFrames)||
      this.chunkFrames<2||this.chunkFrames>REPLAY_SPOOL_CHUNK_FRAMES||
      !Number.isSafeInteger(this.maxQueuedChunks)||
      this.maxQueuedChunks<1||this.maxQueuedChunks>4)
      throw Error('Invalid bounded replay spool configuration');
  }
  get state():ReplaySpoolState{
    if(this.complete)return 'complete';
    if(this.writerFailure!==null)return 'failed';
    if(this.closed)return 'draining';
    return this.rejectedReason?'truncated':'recording';
  }
  get acceptedFrames(){return this.received;}
  get persistedFrames(){return this.persisted;}
  get residentFrames(){
    return this.assembling.length+this.pending.reduce(
      (sum,item)=>sum+item.frames.length,0)+
      (this.active?.frames.length??0);
  }
  get outstandingChunks(){return this.pending.length+(this.active?1:0);}
  get maximumResidentFrames(){
    return (this.maxQueuedChunks+1)*this.chunkFrames;
  }
  get errorMessage(){
    return this.writerFailure instanceof Error?
      this.writerFailure.message:
      this.writerFailure===null?null:String(this.writerFailure);
  }
  get result():ReplaySpoolResult{
    return {acceptedFrames:this.received,persistedFrames:this.persisted,
      chunks:this.committedChunks,recordingComplete:!this.rejectedReason&&
        this.writerFailure===null&&this.complete,
      truncatedAt:this.firstRejectedAt,
      truncationReason:this.rejectedReason};
  }
  private notify(){
    for(const listener of this.listeners)listener();
    this.listeners.clear();
  }
  private async waitForChange():Promise<void>{
    // Register only after examining the pending/active state. Pump always
    // sets active synchronously before its first await, avoiding lost wakes.
    await new Promise<void>(resolve=>this.listeners.add(resolve));
  }
  private pump():void{
    if(this.active||!this.pending.length||this.writerFailure!==null)
      return;
    const batch=this.pending.shift()!;
    this.active=batch;
    // Do not await from the simulation loop. The sink itself owns atomic
    // IndexedDB transactions; a rejected request never advances this index.
    void (async()=>{
      try{
        await this.sink(batch.index,batch.frames,batch.final);
        this.persisted+=batch.frames.length;
        this.committedChunks++;
      }catch(error){
        this.writerFailure=error;
        this.pending.unshift(batch);
      }finally{
        this.active=null;
        this.notify();
        if(this.writerFailure===null)this.pump();
      }
    })();
  }
  private enqueue(final:boolean):void{
    if(!this.assembling.length)return;
    const chunk:SealedChunk<T>={
      index:this.nextIndex++,
      // One bounded structured clone preserves within-chunk sharing and
      // guarantees that later live scene mutations cannot rewrite history.
      frames:structuredClone(this.assembling),final
    };
    this.assembling=[];
    this.pending.push(chunk);
    this.pump();
  }
  /** Synchronous simulator-safe intake: no awaits, IDB or timers. */
  append(frame:T):boolean{
    if(this.closed)throw Error('Cannot append after replay spool seal');
    if(this.rejectedReason||this.writerFailure!==null)return false;
    if(!frame||!Number.isFinite(frame.t)||frame.t<0||
      frame.t<=this.lastTime)
      throw Error('Replay stream requires strictly increasing frame times');
    if(this.assembling.length+1===this.chunkFrames&&
      this.outstandingChunks>=this.maxQueuedChunks){
      this.firstRejectedAt=this.lastTime;
      this.rejectedReason='bounded chunk write backlog';
      return false;
    }
    this.assembling.push(frame);
    this.received++;
    this.lastTime=frame.t;
    if(this.assembling.length===this.chunkFrames)
      this.enqueue(false);
    return true;
  }
  /** A sealed full chunk may be retried ONLY after the transaction failed
   * atomically. No new frames are accepted while persistence is uncertain.
   */
  retry():boolean{
    if(this.writerFailure===null)return false;
    this.writerFailure=null;
    this.pump();
    return true;
  }
  private async drain():Promise<void>{
    while(this.active||this.pending.length){
      if(this.writerFailure!==null)
        throw this.writerFailure;
      await this.waitForChange();
    }
  }
  /** Finish a complete or explicitly partial film with a final short
   * chunk. Call again after retry() if the storage sink failed. The film
   * is ready for publication ONLY when this promise resolves.
   */
  async finish():Promise<ReplaySpoolResult>{
    if(this.complete)return this.result;
    this.closed=true;
    await this.drain();
    if(this.assembling.length)this.enqueue(true);
    await this.drain();
    if(this.received!==this.persisted)
      throw Error('Cannot publish replay with unpersisted samples');
    this.complete=true;
    this.notify();
    return this.result;
  }
}
