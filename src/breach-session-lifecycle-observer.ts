/** R7.1 — one Session lifecycle/recording handoff, never a HUD renderer.
 * The fixed 60-Hz loop and immediate input commits both observe this boundary.
 * Existing MissionRecorder and CampaignFlow remain the only historical/persistence owners.
 */
import type {Session} from './breach-game.ts';
import type {MissionRecorder} from './breach-replay.ts';

export type BreachLifecycleInput={
 session:Session;recorder:Pick<MissionRecorder,'capturePlanning'>;replaying:boolean;
};
export type BreachLifecyclePorts={
 observePhase:(phase:Session['phase'])=>void;
 recordCompletedOperation:()=>void;
};

/** A replay never records a planning edit or a terminal receipt. Session identity,
 * not seed or phase alone, prevents duplicate completion across repeated RAFs.
 * The recorder's own signature journal deduplicates identical planning samples.
 */
export function createBreachSessionLifecycleObserver(ports:BreachLifecyclePorts){
 let phaseSession:Session|null=null;
 let lastPhase:Session['phase']|null=null;
 let lastWasReplay=false;
 let completedSession:Session|null=null;

 function observe({session,recorder,replaying}:BreachLifecycleInput):void{
  if(replaying){lastWasReplay=true;return;}
  if(phaseSession!==session||lastPhase!==session.phase||lastWasReplay){
   ports.observePhase(session.phase);
   phaseSession=session;
   lastPhase=session.phase;
  }
  lastWasReplay=false;
  if(session.phase==='planning')recorder.capturePlanning(session);
  if(session.started&&(session.phase==='won'||session.phase==='lost')&&
    completedSession!==session){
   // The existing campaign/quick-play flow performs its own domain guards.
   // Mark before the callback, matching its prior single-attempt semantics.
   completedSession=session;
   ports.recordCompletedOperation();
  }
 }
 return {observe};
}
