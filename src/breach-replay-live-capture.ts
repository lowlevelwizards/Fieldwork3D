/** Replay R3 G5c1 — authoritative recorder capture to durable spool tap.
 *
 * The existing MissionRecorder is still production's capped, complete V1
 * source. This tap is an opt-in second consumer of its real 20Hz snapshots,
 * not a new simulation step, FOV reconstruction, or higher capture cadence.
 *
 * Forced same-timestamp snapshots can REPLACE the current recorded frame.
 * Hold one last timestamp in RAM until the next distinct sample arrives;
 * then irrevocably hand it to the bounded spool. Never revise already
 * published chunks or silently skip a rejected frame.
 */
import {MissionRecorder,type ReplayFrame,
  type ReplayFrameCaptureNotice} from './breach-replay.ts';
import {ReplayChunkCaptureSpool,type ReplaySpoolResult}
  from './breach-replay-chunk-spool.ts';

export type ReplayLiveCaptureStatus='capturing'|'truncated'|'finishing'|
  'complete'|'failed'|'closed';
export type ReplayLiveCaptureResult=ReplaySpoolResult&{
  /** A storage-complete stream may still reflect a partial V1 film. */
  sourceComplete:boolean;sourceReason:string|null;
};
export class ReplayLiveCaptureTap{
  private readonly recorder:MissionRecorder;
  private readonly spool:ReplayChunkCaptureSpool<ReplayFrame>;
  private unobserve:(()=>void)|null=null;
  private tail:ReplayFrame|null=null;
  private statusValue:ReplayLiveCaptureStatus='capturing';
  private faultValue:string|null=null;
  private delivered=0;
  constructor(recorder:MissionRecorder,
    spool:ReplayChunkCaptureSpool<ReplayFrame>){
    // If we cannot prove that the start of the film is present, refuse
    // attachment. Seeding with the initial state allows the normal app's
    // recorder.capture(state,true) before opening the stream.
    if(recorder.frames.length>1)
      throw Error('Live replay stream must attach before second frame');
    if(recorder.frameCaptureListenerError)
      throw Error('Recorder already has a capture observer error');
    this.recorder=recorder;this.spool=spool;
    this.tail=recorder.frames.at(-1)??null;
    this.unobserve=recorder.observeRecordedFrames(change=>
      this.receive(change));
  }
  get status(){return this.statusValue;}
  get fault(){return this.faultValue??this.recorder.frameCaptureListenerError;}
  get pendingTailTime(){return this.tail?.t??null;}
  get acceptedFrames(){return this.spool.acceptedFrames;}
  get persistedFrames(){return this.spool.persistedFrames;}
  get residentFrames(){return this.spool.residentFrames+(this.tail?1:0);}
  get maximumResidentFrames(){return this.spool.maximumResidentFrames+1;}
  get deliveredNotices(){return this.delivered;}
  private stop(message:string):void{
    if(this.statusValue!=='capturing')return;
    this.faultValue=message;
    this.statusValue='truncated';
    this.unobserve?.();this.unobserve=null;
  }
  private receive(change:ReplayFrameCaptureNotice):void{
    if(this.statusValue!=='capturing')return;
    const frame=change.frame;
    this.delivered++;
    if(change.kind==='replace'){
      if(!this.tail||Math.abs(this.tail.t-frame.t)>1e-6){
        this.stop('Rejected revision to already sealed historical time');
        return;
      }
      this.tail=frame;
      return;
    }
    if(this.tail){
      if(frame.t<=this.tail.t){
        this.stop('Nonmonotonic authoritative capture stream');
        return;
      }
      if(!this.spool.append(this.tail)){
        this.stop(this.spool.errorMessage??
          this.spool.result.truncationReason??
          'Replay persistence backlog; film explicitly truncated');
        return;
      }
    }
    this.tail=frame;
  }
  /** Call only when the authoritative live recorder should be finalized.
   * A transaction failure is thrown to the caller; the incomplete durable
   * draft must remain available for retry/recovery rather than deletion.
   */
  async finish():Promise<ReplayLiveCaptureResult>{
    if(this.statusValue==='closed')
      throw Error('Live recorder tap was closed without publication');
    if(this.statusValue==='complete')
      throw Error('Live replay capture has already been finalized');
    if(this.statusValue==='finishing')
      throw Error('Replay capture finalization already in progress');
    const wasTruncated=this.statusValue==='truncated';
    this.statusValue='finishing';
    this.unobserve?.();this.unobserve=null;
    if(!wasTruncated&&this.tail&&!this.spool.append(this.tail)){
      this.faultValue=this.spool.errorMessage??
        this.spool.result.truncationReason??
        'Replay persistence backlog before last frame';
    }
    this.tail=null;
    try{
      const result=await this.spool.finish();
      const sourceComplete=this.recorder.completeness.complete&&
        !wasTruncated&&!this.faultValue&&
        !this.recorder.frameCaptureListenerError;
      this.statusValue='complete';
      return {...result,
        recordingComplete:result.recordingComplete&&!!sourceComplete,
        sourceComplete:!!sourceComplete,
        sourceReason:this.faultValue??
          this.recorder.frameCaptureListenerError??
          this.recorder.completeness.reason};
    }catch(error){
      this.statusValue='failed';
      this.faultValue=error instanceof Error?error.message:String(error);
      throw error;
    }
  }
  /** Close an abandoned tap. It never declares the durable stream complete.
   * The stream generation must be explicitly recovered/discarded by caller.
   */
  close():void{
    this.unobserve?.();this.unobserve=null;
    this.tail=null;
    this.statusValue='closed';
  }
}
