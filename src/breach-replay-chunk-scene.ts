/** Replay R3 G4c2 — one truthful frame source for tactical/Bodycam
 * consumers, backed by bounded persisted V2 chunks.
 *
 * This bridge is opt-in and does not register live UI controls. It never
 * constructs a MissionRecorder, ticks a game, re-runs sight, or materializes
 * the entire film. The common authoritative interpolation + existing
 * applyReplayFrame path own all visible entities and fog knowledge.
 */
import {ReplayChunkTransport,
  type ChunkPlaybackStatus} from './breach-replay-chunk-transport.ts';
import {openChunkedReplayV2,type ReplayChunkReadSession,
  type ReplayChunkPublished} from './breach-replay-chunk-store.ts';
import {sampleReplaySpan} from './breach-replay-frame-sampling.ts';
import {applyReplayFrame,type ReplayFrame} from './breach-replay.ts';
import {ReplayMotionRecorder} from './breach-replay-motion.ts';
import type {Session} from './breach-game.ts';
import type {ReplayKnowledge} from './breach-replay-visibility.ts';

export type ChunkSceneFrame={
  readonly frame:ReplayFrame;
  readonly at:number;
  readonly source:'recorded-v2';
  readonly recordingComplete:boolean;
};
export type ChunkSceneResult=
  |{status:'ready';value:ChunkSceneFrame}
  |{status:'superseded'|'closed'};
export class ReplayChunkSceneBridge{
  private readonly transport:ReplayChunkTransport;
  private readonly motion=new ReplayMotionRecorder();
  private readonly archive:ReplayChunkPublished;
  private committed:ChunkSceneFrame|null=null;
  constructor(session:ReplayChunkReadSession){
    this.archive=session.summary;
    this.transport=new ReplayChunkTransport(session);
    // Pose and door motion are authored history, not resimulated feet.
    // Rehydrate only the bounded event tracks, never all 20 Hz frames.
    this.motion.loadArchive(session.summary.sidecar.motion);
  }
  get status():ChunkPlaybackStatus{return this.transport.status;}
  get current():ChunkSceneFrame|null{return this.committed;}
  get startTime(){return this.transport.startTime;}
  get endTime(){return this.transport.endTime;}
  get recordingComplete(){return this.transport.recordingComplete;}
  get residentChunks(){return this.transport.residentChunks;}
  get residentIndices(){return this.transport.residentIndices;}
  /** The motion, battle, plan and observer journals remain stored in the
   * versioned archive sidecar. No implicit exposure to a personal POV:
   * callers MUST gate events by the recorded observer's evidence.
   */
  get replaySidecar():Readonly<ReplayChunkPublished['sidecar']>{
    return this.archive.sidecar;
  }
  async seek(time:number):Promise<ChunkSceneResult>{
    try{
      const result=await this.transport.seek(time);
      if(result.status!=='ready'){
        if(result.status==='closed')this.committed=null;
        return result;
      }
      if(result.sample!==this.transport.current)
        return {status:'superseded'};
      const frame=sampleReplaySpan(result.sample,this.motion);
      const value:ChunkSceneFrame={
        at:frame.t,frame,source:'recorded-v2',
        recordingComplete:this.recordingComplete
      };
      this.committed=value;
      return {status:'ready',value};
    }catch(e){
      this.committed=null;throw e;
    }
  }
  /** Attach an already resolved historical scene to the *exclusive replay*
   * Session. No live motor step is taken. Never call this on a live
   * gameplay Session; the caller owns lifecycle isolation.
   */
  applyToReplaySession(s:Session,value:ChunkSceneFrame):void{
    if(this.status!=='ready'||this.committed!==value)
      throw Error('Cannot apply stale or unverified V2 replay frame');
    applyReplayFrame(s,value.frame);
  }
  /** The exact recorded per-observer visibility at the displayed time.
   * null means legacy/no evidence; never fall back to the full-world POV.
   */
  recordedObserverKnowledge(observerId:string):
    ReplayKnowledge|null{
    const sample=this.committed?.frame.knowledge??null;
    if(!observerId||!sample?.operatorVisibleActorIds||
      !Object.prototype.hasOwnProperty.call(
        sample.operatorVisibleActorIds,observerId))
      return null;
    return sample;
  }
  close(){
    this.transport.close();this.committed=null;
  }
}
/** No full-film hydration. The factory loads metadata + bounded sample cache. */
export async function openReplayChunkSceneV2(
  id:string
):Promise<ReplayChunkSceneBridge>{
  return new ReplayChunkSceneBridge(await openChunkedReplayV2(id));
}
