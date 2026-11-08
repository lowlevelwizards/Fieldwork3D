/** Replay R3 G4a — asynchronous read-only playback over bounded V2 chunks.
 * Does NOT replace the production MissionRecorder or render a live replay.
 *
 * Requested time is separate from committed presentation time. Out-of-order
 * IndexedDB responses must never rewind the displayed historical sample,
 * overwrite a newer seek, or borrow state from the current live mission.
 */
import {openChunkedReplayV2,type ReplayChunkReadSession}
  from './breach-replay-chunk-store.ts';
import type {ReplayFrame} from './breach-replay.ts';

export type ChunkPlaybackStatus='idle'|'reading'|'ready'|'error'|'closed';
export type ChunkPlaybackSample={
  readonly t:number;
  readonly previous:ReplayFrame;
  readonly next:ReplayFrame;
  readonly alpha:number;
};
export type ChunkPlaybackResolution=
  |{status:'ready';sample:ChunkPlaybackSample}
  |{status:'superseded'|'closed'};
export class ReplayChunkTransport{
  private readonly session:ReplayChunkReadSession;
  readonly startTime:number;
  readonly endTime:number;
  readonly recordingComplete:boolean;
  readonly truncatedAt:number|null;
  readonly truncationReason:string|null;
  private serial=0;
  private desired:number;
  private committed:number;
  private sampleValue:ChunkPlaybackSample|null=null;
  private phase:ChunkPlaybackStatus='idle';
  constructor(session:ReplayChunkReadSession){
    const boundaries=session.summary.boundaries;
    if(!boundaries.length||!Number.isFinite(boundaries[0].fromTime)||
      !Number.isFinite(boundaries.at(-1)!.toTime))
      throw Error('No seekable authoritative replay frames');
    this.session=session;
    this.startTime=boundaries[0].fromTime;
    this.endTime=boundaries.at(-1)!.toTime;
    if(this.endTime<this.startTime)
      throw Error('Recorded time range is reversed');
    this.desired=this.startTime;
    this.committed=this.startTime;
    const completeness=session.summary.sidecar.completeness;
    this.recordingComplete=completeness.complete;
    this.truncatedAt=completeness.truncatedAt;
    this.truncationReason=completeness.reason;
  }
  get status(){return this.phase;}
  get requestedTime(){return this.desired;}
  get presentationTime(){return this.committed;}
  get current(){return this.sampleValue;}
  get residentChunks(){return this.session.window.residentCount;}
  get residentIndices(){return this.session.window.residentIndices;}
  /** Latest request wins; an earlier response may still finish fetching,
   * but it must NEVER commit a stale presentation or clear a newer error.
   */
  async seek(time:number):Promise<ChunkPlaybackResolution>{
    if(this.phase==='closed')return {status:'closed'};
    if(!Number.isFinite(time))
      throw Error('Nonfinite historical seek requested');
    const target=Math.min(this.endTime,Math.max(this.startTime,time));
    const version=++this.serial;
    this.desired=target;
    this.phase='reading';
    try{
      const frames=await this.session.window.surrounding(target);
      if(this.status==='closed')return {status:'closed'};
      if(version!==this.serial)return {status:'superseded'};
      if(!frames)throw Error('Historical samples are unavailable');
      this.committed=target;
      this.sampleValue={t:target,previous:frames.previous,
        next:frames.next,alpha:frames.alpha};
      this.phase='ready';
      return {status:'ready',sample:this.sampleValue};
    }catch(error){
      if(this.status==='closed')return {status:'closed'};
      if(version!==this.serial)return {status:'superseded'};
      this.phase='error';
      this.sampleValue=null; // Never continue displaying a stale “truth” film.
      throw error;
    }
  }
  /** Positive elapsed time, finite, and bounded playback rate.
   * Negative rates allow intentional rewind, not an unbounded fetch loop.
   */
  advance(dt:number,rate=1):Promise<ChunkPlaybackResolution>{
    if(!Number.isFinite(dt)||dt<0||dt>10||
      !Number.isFinite(rate)||Math.abs(rate)>4)
      return Promise.reject(Error('Invalid or unbounded replay clock step'));
    if(this.phase==='closed')
      return Promise.resolve({status:'closed'});
    return this.seek(this.desired+dt*rate);
  }
  close(){
    if(this.phase==='closed')return;
    this.serial++;
    this.phase='closed';
    this.sampleValue=null;
  }
}
/** Only opens metadata and a bounded read window; never materializes the
 * entire V2 recording. UI playback integration follows in G4b/G4c.
 */
export async function openReplayChunkTransportV2(
  id:string
):Promise<ReplayChunkTransport>{
  return new ReplayChunkTransport(await openChunkedReplayV2(id));
}
