/** Replay R3 G4d3 — evidence-correct event index from lazy V2 frames.
 *
 * The active scene transport is NEVER sought to build the event rail.
 * Every event is authorized at its own recorded timestamp, using only the
 * LEFT authoritative sample. Full view is an explicit opt-in; an absent
 * personal observation fails closed. The index appears atomically only
 * after the entire disclosure pass succeeds.
 */
import {openChunkedReplayV2,type ReplayChunkReadSession}
  from './breach-replay-chunk-store.ts';
import {ReplayEventIndex,type ReplayIndexedEvent}
  from './breach-replay-event-index.ts';
import {operatorContactEventKnown}
  from './breach-replay-contact-lens.ts';
import type {ReplayDisclosure}
  from './breach-replay-visibility.ts';

export type ReplayChunkEventIndexResult=
  |{status:'ready';index:ReplayEventIndex;evaluated:number;
    disclosed:number}
  |{status:'superseded'|'closed'};
export type ReplayChunkEventIndexStatus='idle'|'building'|'ready'|
  'error'|'closed';
const MAX_EVENT_INDEX=100000;
const EPS=1e-6;
export class ReplayChunkDisclosedEventIndex{
  private readonly session:ReplayChunkReadSession;
  private readonly all:readonly ReplayIndexedEvent[];
  private readonly startTime:number;
  private readonly endTime:number;
  private version=0;
  private statusValue:ReplayChunkEventIndexStatus='idle';
  private visible:ReplayEventIndex|null=null;
  private failure:string|null=null;
  constructor(session:ReplayChunkReadSession){
    this.session=session;
    const entries=new ReplayEventIndex(
      session.summary.sidecar.battleEvents,
      session.summary.sidecar.executionEvents);
    if(entries.all.length>MAX_EVENT_INDEX)
      throw Error('Replay event catalog exceeds bounded index limit');
    this.all=entries.all;
    const bounds=session.summary.boundaries;
    if(!bounds.length||!Number.isFinite(bounds[0].fromTime)||
      !Number.isFinite(bounds.at(-1)!.toTime))
      throw Error('Replay event index needs a valid frame catalog');
    this.startTime=bounds[0].fromTime;
    this.endTime=bounds.at(-1)!.toTime;
  }
  get status(){return this.statusValue;}
  /** A loading/failed index cannot be mistaken for a complete event rail. */
  get current(){return this.statusValue==='ready'?this.visible:null;}
  get errorMessage(){return this.failure;}
  get residentChunks(){return this.session.window.residentCount;}
  async build(policy:ReplayDisclosure,friendlyIds:readonly string[]):
    Promise<ReplayChunkEventIndexResult>{
    if(this.statusValue==='closed')return {status:'closed'};
    if(policy.mode==='operator'&&!policy.observerId)
      throw Error('Operator replay disclosure requires an observer');
    const token=++this.version;
    this.statusValue='building';
    this.visible=null;
    this.failure=null;
    const friendlies=new Set(friendlyIds);
    const disclosed=new Set<string>();
    let evaluated=0;
    let cachedTime=NaN;
    let cachedKnowledge:Awaited<ReturnType<
      typeof this.session.window.surrounding>>|null=null;
    try{
      for(const item of this.all){
        if(token!==this.version)return {status:'superseded'};
        if(!Number.isFinite(item.t)||item.t<this.startTime-EPS||
          item.t>this.endTime+EPS)
          throw Error('Historical event is outside recorded film bounds');
        let include=false;
        if(policy.mode==='full')include=true;
        else if(policy.mode==='squad'){
          if(item.kind==='objective'||(item.actor&&
            friendlies.has(item.actor)))include=true;
        }else if(item.actor===policy.observerId){
          include=operatorContactEventKnown(
            item,null,policy.observerId,friendlies);
        }
        // Neither the team's current knowledge nor another observer's
        // later sight can authorize an event. Query recorded evidence at T.
        if(!include&&policy.mode!=='full'&&item.actor&&
          !friendlies.has(item.actor)){
          if(cachedTime!==item.t){
            cachedKnowledge=await this.session.window.surrounding(item.t);
            cachedTime=item.t;
          }
          if(token!==this.version)return {status:'superseded'};
          const knowledge=cachedKnowledge?.previous.knowledge??null;
          if(policy.mode==='operator')
            include=operatorContactEventKnown(
              item,knowledge,policy.observerId,friendlies);
          else include=knowledge?.visibleActorIds.includes(item.actor)??false;
        }
        if(include)disclosed.add(item.key);
        evaluated++;
      }
      if(token!==this.version)return {status:'superseded'};
      const index=new ReplayEventIndex(
        this.session.summary.sidecar.battleEvents,
        this.session.summary.sidecar.executionEvents,
        event=>disclosed.has(event.key));
      this.visible=index;
      this.statusValue='ready';
      return {status:'ready',index,evaluated,disclosed:index.all.length};
    }catch(error){
      if(token!==this.version)return {status:'superseded'};
      this.visible=null;
      this.statusValue='error';
      this.failure=error instanceof Error?error.message:String(error);
      throw error;
    }
  }
  close(){
    if(this.statusValue==='closed')return;
    this.version++;
    this.visible=null;
    this.statusValue='closed';
  }
}
/** Opens a SECOND bounded read window. Building event indexes cannot move
 * the player camera, invalidate the current Bodycam scene or consume the
 * active controller's 2–3 decoded chunk budget.
 */
export async function openChunkedReplayEventIndexV2(id:string):
Promise<ReplayChunkDisclosedEventIndex>{
  return new ReplayChunkDisclosedEventIndex(await openChunkedReplayV2(id));
}
