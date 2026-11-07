/** Replay R3 G4c2 — one truthful frame source for tactical/Bodycam
 * consumers, backed by bounded persisted V2 chunks.
 *
 * This bridge is opt-in and does not register live UI controls. It never
 * constructs a MissionRecorder, ticks a game, re-runs sight, or materializes
 * the entire film. The common authoritative interpolation + existing
 * applyReplayFrame path own all visible entities and fog knowledge.
 */
import {ReplayChunkTransport,
  type ChunkPlaybackStatus,type ChunkPlaybackResolution}
  from './breach-replay-chunk-transport.ts';
import {ReplaySoundTimeline,
  type ReplaySoundEvent} from './breach-replay-audio.ts';
import {ReplayEventIndex,type ReplayIndexedEvent}
  from './breach-replay-event-index.ts';
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
/** Candidate sounds only. The player layer still needs recorded listener,
 * distance, wall/door attenuation and personal disclosure before playback.
 * Never include raw hit/down outcomes in a bodycam sound cue.
 */
export type ChunkSceneSoundCue=Omit<ReplaySoundEvent,'hit'|'down'>;
export type ChunkSceneAdvance=
  |{status:'ready';value:ChunkSceneFrame;
    candidateSounds:ChunkSceneSoundCue[]}
  |{status:'superseded'|'closed';candidateSounds:[]};
export class ReplayChunkSceneBridge{
  private readonly transport:ReplayChunkTransport;
  private readonly motion=new ReplayMotionRecorder();
  private readonly sounds:ReplaySoundTimeline;
  private readonly archive:ReplayChunkPublished;
  private committed:ChunkSceneFrame|null=null;
  constructor(session:ReplayChunkReadSession){
    this.archive=session.summary;
    this.transport=new ReplayChunkTransport(session);
    // Pose and door motion are authored history, not resimulated feet.
    // Rehydrate only the bounded event tracks, never all 20 Hz frames.
    this.motion.loadArchive(session.summary.sidecar.motion);
    this.sounds=new ReplaySoundTimeline(
      session.summary.sidecar.shots,
      session.summary.sidecar.battleEvents);
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
  private resolve(result:ChunkPlaybackResolution):ChunkSceneResult{
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
  }
  async seek(time:number):Promise<ChunkSceneResult>{
    try{
      const result=await this.transport.seek(time);
      return this.resolve(result);
    }catch(e){
      this.committed=null;throw e;
    }
  }
  /** Only continuous, positive forward playback may return candidate
   * audio. Direct seek and rewind are deliberately silent. The UI must still
   * apply acoustic attenuation and personal disclosure at playback time.
   */
  async advance(dt:number,rate=1):Promise<ChunkSceneAdvance>{
    if(this.status!=='ready'||!this.committed)
      throw Error('Seek before starting chunk-backed playback');
    const from=this.committed.at;
    try{
      const step=await this.transport.advance(dt,rate);
      const resolved=this.resolve(step);
      if(resolved.status!=='ready')
        return {...resolved,candidateSounds:[]};
      const to=resolved.value.at;
      const candidateSounds:ChunkSceneSoundCue[]=
        rate>0&&rate<=2&&to>from?
          this.sounds.between(from,to,7).map(({hit,down,...cue})=>cue):[];
      return {...resolved,candidateSounds};
    }catch(e){
      this.committed=null;throw e;
    }
  }
  /** Event feeds are rebuilt from recorded events, never the live session.
   * The caller MUST supply a disclosure predicate (personal vs team/full).
   * For personal review, sample knowledge at EACH event's historical time;
   * the current frame must not authorize future/private event contents.
   */
  disclosedEventIndex(allow:(event:ReplayIndexedEvent)=>boolean):
    ReplayEventIndex{
    if(typeof allow!=='function')
      throw Error('Replay event index requires a disclosure policy');
    return new ReplayEventIndex(this.archive.sidecar.battleEvents,
      this.archive.sidecar.executionEvents,allow);
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
