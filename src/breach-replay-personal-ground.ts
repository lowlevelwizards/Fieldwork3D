/** Replay R4.2b: operator-specific terrain evidence captured ONLY during
 * the authoritative simulation ground sight pass. No playback raycasting.
 *
 * Recording is explicitly enabled by MissionRecorder before GO. Live
 * simulations without a recorder incur only one WeakMap lookup per visible
 * ground cell, and the journal is reclaimed with the session.
 */
export type PersonalGroundBatch={
  at:number;observerId:string;keys:string[];
};
type GroundJournal={
  seen:Map<string,Set<string>>;
  pending:PersonalGroundBatch[];
};
const journals=new WeakMap<object,GroundJournal>();
export function enablePersonalGroundCapture(session:object):void{
  if(!journals.has(session))
    journals.set(session,{seen:new Map(),pending:[]});
}
export function notePersonalGround(
  session:object,observerId:string,time:number,key:string
):boolean{
  const journal=journals.get(session);
  if(!journal||!observerId||!Number.isFinite(time)||time<0||!key)return false;
  let known=journal.seen.get(observerId);
  if(!known){known=new Set();journal.seen.set(observerId,known);}
  if(known.has(key))return false;
  known.add(key);
  const last=journal.pending.at(-1);
  if(last&&last.at===time&&last.observerId===observerId)
    last.keys.push(key);
  else journal.pending.push({at:time,observerId,keys:[key]});
  return true;
}
/** Single authoritative recorder drains pending observed tiles each tick.
 * A second reader must use the persisted replay, not this session journal.
 */
export function drainPersonalGround(session:object):PersonalGroundBatch[]{
  const journal=journals.get(session);
  if(!journal||!journal.pending.length)return [];
  const pending=journal.pending;journal.pending=[];
  return pending;
}
export class PersonalGroundHistory{
  private cursor=0;
  private atTime=-Infinity;
  private seen=new Map<string,Set<string>>();
  constructor(private readonly batches:readonly PersonalGroundBatch[]){}
  /** Bounded incremental replay; rewind reconstructs without live geometry. */
  at(time:number,observerId:string):ReadonlySet<string>|null{
    if(!Number.isFinite(time)||time<0)return null;
    if(time<this.atTime){
      this.cursor=0;this.seen=new Map();
    }
    this.atTime=time;
    while(this.cursor<this.batches.length&&
      this.batches[this.cursor].at<=time){
      const batch=this.batches[this.cursor++];
      let tiles=this.seen.get(batch.observerId);
      if(!tiles){tiles=new Set();this.seen.set(batch.observerId,tiles);}
      for(const key of batch.keys)tiles.add(key);
    }
    return this.seen.get(observerId)??new Set();
  }
}
