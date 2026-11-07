/** Replay R2: recorded player-visible knowledge, not a reconstructed AI sight check.
 * The authoritative live simulation owns acquisition. Playback only consumes
 * immutable samples. This module is intentionally presentation-only.
 */
import {isSeen,inSight,liveVisibility,observerPointVisible,type Session,type TeamActor} from './breach-game.ts';

export type ReplayKnowledge={
  /** Exactly which actors had player-visible models at capture time. */
  visibleActorIds:string[];
  /** Civilian model visibility at capture time. */
  visibleCivilianIds:string[];
  /** Bodies already discovered by the team, even if now outside the cone. */
  discoveredBodyIds:string[];
  /** Optional R4.2 evidence: exact confirmed individual visual acquisitions.
   * The keys are friendly observer IDs; values are living hostile actor IDs
   * actually inSight at this simulation tick (NOT full-view team intel).
   * Old recordings omit this field: absence means unknown, never "none".
   * Downed bodies and civilian observer truth are not represented yet.
   */
  operatorVisibleActorIds?:Record<string,string[]>;
  /** R4.2c: observer-specific visible civilians, including incapacitated
   * civilians. Present iff captured by the authoritative game simulation;
   * old replays explicitly do not contain this evidence.
   */
  operatorVisibleCivilianIds?:Record<string,string[]>;
};

const playbackKnowledge=new WeakMap<Session,ReplayKnowledge|null>();

export function captureReplayKnowledge(
  s:Session,previouslyDiscovered:ReadonlySet<string>=new Set()
):ReplayKnowledge{
  const visibleActorIds:string[]=[];
  const visibleCivilianIds:string[]=[];
  const discovered=new Set(previouslyDiscovered);
  const operatorVisibleActorIds:Record<string,string[]>={};
  const operatorVisibleCivilianIds:Record<string,string[]>={};
  const blue=s.operators.filter(a=>a.side==='blue');
  const livingHostiles=s.operators.filter(a=>
    a.side!=='blue'&&a.health>0);
  for(const observer of blue){
    operatorVisibleActorIds[observer.id]=observer.health>0?
      livingHostiles.filter(target=>inSight(observer,target,s))
        .map(target=>target.id):[];
    operatorVisibleCivilianIds[observer.id]=observer.health>0?
      s.civilians.filter(c=>observerPointVisible(s,observer,c.p))
        .map(c=>c.id):[];
  }
  for(const a of s.operators){
    const visible=a.side==='blue'||(a.health>0?
      isSeen(s,a):liveVisibility(s,a.p));
    if(visible)visibleActorIds.push(a.id);
    if(a.health<=0&&visible)discovered.add(a.id);
  }
  for(const c of s.civilians)
    if(liveVisibility(s,c.p))visibleCivilianIds.push(c.id);
  return {visibleActorIds,visibleCivilianIds,
    discoveredBodyIds:[...discovered],operatorVisibleActorIds,
    operatorVisibleCivilianIds};
}

export function applyReplayKnowledge(s:Session,
  sample:ReplayKnowledge|null|undefined):void{
  playbackKnowledge.set(s,sample??null);
}

export function recordedReplayKnowledge(s:Session):ReplayKnowledge|null{
  return playbackKnowledge.get(s)??null;
}

/** R4.2 disclosure policy shared by replay layers and future Bodycam.
 * Historical operator mode fails closed on legacy/no-evidence recordings.
 * Squad and full preserve the pre-R4.2 semantics.
 */
export type ReplayDisclosure=
  |{mode:'full'}
  |{mode:'squad'}
  |{mode:'operator';observerId:string};
export function replayOperatorSightAvailable(
  s:Session,observerId:string
):boolean{
  const observed=recordedReplayKnowledge(s)?.operatorVisibleActorIds;
  return !!observed&&Object.prototype.hasOwnProperty.call(observed,observerId);
}
export function replayActorDisclosed(
  s:Session,a:TeamActor,policy:ReplayDisclosure
):boolean{
  if(policy.mode==='full'||a.side==='blue')return true;
  const sample=recordedReplayKnowledge(s);
  if(policy.mode==='operator')
    return recordedObserverCanSee(sample,policy.observerId,a.id)===true;
  if(sample)return sample.visibleActorIds.includes(a.id);
  return a.health>0?isSeen(s,a):liveVisibility(s,a.p);
}
/** Existing callers keep their exact legacy boolean contract. */
export function replayActorVisible(
  s:Session,a:TeamActor,omniscient=false):boolean{
  return replayActorDisclosed(s,a,omniscient?{mode:'full'}:{mode:'squad'});
}

/** Shared civilian disclosure: personal mode is strictly recorded and
 * fails closed for old films. This never calls live LOS in playback.
 */
export function replayCivilianDisclosed(
  s:Session,civilianId:string,policy:ReplayDisclosure
):boolean{
  if(policy.mode==='full')return true;
  const knowledge=recordedReplayKnowledge(s);
  if(policy.mode==='operator')
    return recordedObserverCanSeeCivilian(knowledge,
      policy.observerId,civilianId)===true;
  return knowledge?.visibleCivilianIds.includes(civilianId)??false;
}
export function replayBodyDiscovered(s:Session,id:string):boolean{
  return recordedReplayKnowledge(s)?.discoveredBodyIds.includes(id)??false;
}

/** Unlike team sight, old films cannot claim an individual's historical
 * knowledge. null means evidence is absent; false means explicitly unseen.
 */
export function recordedObserverCanSee(
  knowledge:ReplayKnowledge|null|undefined,
  observerId:string,targetId:string
):boolean|null{
  const byObserver=knowledge?.operatorVisibleActorIds;
  if(!byObserver||!Object.prototype.hasOwnProperty.call(byObserver,observerId))
    return null;
  return byObserver[observerId].includes(targetId);
}

/** null = old film/lost evidence; false = explicitly not observed. */
export function recordedObserverCanSeeCivilian(
  knowledge:ReplayKnowledge|null|undefined,
  observerId:string,civilianId:string
):boolean|null{
  const byObserver=knowledge?.operatorVisibleCivilianIds;
  if(!byObserver||!Object.prototype.hasOwnProperty.call(byObserver,observerId))
    return null;
  return byObserver[observerId].includes(civilianId);
}
