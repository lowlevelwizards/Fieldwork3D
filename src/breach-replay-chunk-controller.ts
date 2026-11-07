/** Replay R3 G4d1 — bounded asynchronous playback controller.
 *
 * No timer, RAF, IndexedDB writes, implicit audio playback or live simulation.
 * The host owns its clock, exclusive replay Session, disclosure policy, and
 * audio mixer. Only an acknowledged historical sample advances the clock.
 * Seeking, pauses and closure invalidate pending work before scene mutation.
 */
import type {Session} from './breach-game.ts';
import {ReplayChunkSceneBridge,type ChunkSceneFrame,
  type ChunkSceneSoundCue} from './breach-replay-chunk-scene.ts';

export type ChunkControllerStatus='idle'|'paused'|'playing'|'buffering'|
  'error'|'closed';
export type ChunkControllerOutcome='ready'|'buffering'|'superseded'|
  'ended'|'idle'|'closed';
export type ChunkControllerResult={
  status:ChunkControllerOutcome;
  at:number;
  /** Unfiltered candidates. Never play these without hearing/disclosure. */
  candidateSounds:readonly ChunkSceneSoundCue[];
};
const EMPTY:readonly ChunkSceneSoundCue[]=[];
const MAX_DT=.15;
export class ReplayChunkPlaybackController{
  private readonly bridge:ReplayChunkSceneBridge;
  private readonly scene:Session;
  private mode:ChunkControllerStatus='idle';
  private lastFrame:ChunkSceneFrame|null=null;
  private clock:number;
  private serial=0;
  private busyToken:number|null=null;
  private syncRequired=false;
  private rateValue=1;
  private failure:string|null=null;
  constructor(bridge:ReplayChunkSceneBridge,exclusiveReplaySession:Session){
    this.bridge=bridge;
    this.scene=exclusiveReplaySession;
    this.clock=bridge.startTime;
  }
  get status(){return this.mode;}
  get time(){return this.clock;}
  get duration(){return this.bridge.endTime;}
  get rate(){return this.rateValue;}
  get frame(){return this.mode==='error'||this.mode==='closed'?null:this.lastFrame;}
  get errorMessage(){return this.failure;}
  get recordingComplete(){return this.bridge.recordingComplete;}
  get residentChunks(){return this.bridge.residentChunks;}
  get isBuffering(){return this.mode==='buffering';}
  get disclosureLabel(){
    return this.recordingComplete?'RECORDED FILM':'PARTIAL RECORDED FILM';
  }
  setRate(rate:number):void{
    if(!Number.isFinite(rate)||rate<.25||rate>4)
      throw Error('Replay speed must stay within 0.25–4×');
    this.rateValue=rate;
  }
  /** Resume from the last verified frame. A paused pending tick has no
   * permission to commit; resync to that exact time before next advance.
   */
  play():boolean{
    if(this.mode==='closed'||this.mode==='error'||!this.lastFrame||
      this.mode==='buffering')return false;
    if(this.clock>=this.duration)return false;
    this.mode='playing';
    return true;
  }
  pause():void{
    if(this.mode==='closed'||this.mode==='error')return;
    if(this.mode==='buffering'){
      this.serial++;
      this.syncRequired=true;
    }
    this.mode=this.lastFrame?'paused':'idle';
  }
  private result(status:ChunkControllerOutcome,
    candidates:readonly ChunkSceneSoundCue[]=EMPTY):ChunkControllerResult{
    return {status,at:this.clock,candidateSounds:candidates};
  }
  private fail(error:unknown):never{
    this.serial++;
    this.mode='error';
    this.lastFrame=null;
    this.failure=error instanceof Error?error.message:String(error);
    throw error;
  }
  /** Explicit navigation is silent, pauses playback and supersedes any
   * pending tick. UI should show BUFFERING until this resolves. Latest seek
   * wins, including when the prior request or chunk read finishes last.
   */
  async seek(time:number):Promise<ChunkControllerResult>{
    if(this.mode==='closed')return this.result('closed');
    if(!Number.isFinite(time))
      throw Error('Invalid replay seek position');
    const request=++this.serial;
    this.mode='buffering';
    this.failure=null;
    this.syncRequired=false;
    const target=Math.max(this.bridge.startTime,
      Math.min(this.duration,time));
    this.busyToken=request;
    try{
      const result=await this.bridge.seek(target);
      if(this.mode==='closed')return this.result('closed');
      if(request!==this.serial)return this.result('superseded');
      if(result.status!=='ready')
        return this.result(result.status==='closed'?'closed':'superseded');
      this.bridge.applyToReplaySession(this.scene,result.value);
      this.clock=result.value.at;
      this.lastFrame=result.value;
      this.mode='paused';
      return this.result('ready');
    }catch(error){
      if(request!==this.serial)return this.result('superseded');
      return this.fail(error);
    }finally{
      if(this.busyToken===request)this.busyToken=null;
    }
  }
  /** One and only one outstanding read per playback clock; missing data
   * freezes the last *verified* time. A one-second browser hitch advances
   * at most 150 ms of recorded time and does not synthesize skipped frames.
   */
  async tick(elapsedSeconds:number):Promise<ChunkControllerResult>{
    if(this.mode==='closed')return this.result('closed');
    if(this.mode==='buffering')return this.result('buffering');
    if(this.mode!=='playing'||!this.lastFrame)return this.result('idle');
    if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0)
      throw Error('Invalid replay host elapsed time');
    if(this.clock>=this.duration){
      this.mode='paused';
      return this.result('ended');
    }
    const dt=Math.min(MAX_DT,elapsedSeconds);
    if(dt===0)return this.result('ready');
    const request=++this.serial;
    this.busyToken=request;
    this.mode='buffering';
    try{
      // If an earlier frame fetch finished after a pause, the bridge's
      // cursor may be ahead of the displayed time. Seek back, silently.
      if(this.syncRequired){
        const aligned=await this.bridge.seek(this.clock);
        if(request!==this.serial||this.mode==='closed')
          return this.result('superseded');
        if(aligned.status!=='ready')
          throw Error('Could not resynchronize replay history');
        this.syncRequired=false;
      }
      const result=await this.bridge.advance(dt,this.rateValue);
      if(request!==this.serial||this.mode==='closed')
        return this.result('superseded');
      if(result.status!=='ready')
        return this.result(result.status==='closed'?'closed':'superseded');
      this.bridge.applyToReplaySession(this.scene,result.value);
      this.lastFrame=result.value;
      this.clock=result.value.at;
      const ended=this.clock>=this.duration;
      this.mode=ended?'paused':'playing';
      // Seek, rewind, scan and buffering never emit retrospective sound
      // from before the last committed playback frame.
      return this.result(ended?'ended':'ready',result.candidateSounds);
    }catch(error){
      if(request!==this.serial)return this.result('superseded');
      return this.fail(error);
    }finally{
      if(this.busyToken===request)this.busyToken=null;
    }
  }
  /** Close invalidates all unresolved IDB reads. The caller owns restoring
   * the original live mission and UI, not this read-only controller.
   */
  close():void{
    if(this.mode==='closed')return;
    this.serial++;
    this.busyToken=null;
    this.mode='closed';
    this.lastFrame=null;
    this.bridge.close();
  }
}
