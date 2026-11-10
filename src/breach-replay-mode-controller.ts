/** Explicit Replay entry/exit lifecycle. Never advances or mutates the
 * authoritative live simulation; the mission controller owns session swaps.
 */
import {team,type Session} from './breach-game.ts';
import type {MissionRecorder} from './breach-replay.ts';
import type {TacticalScene3D} from './breach-3d.ts';
import type {ReplayPlaybackController} from './breach-replay-playback-controller.ts';
import type {ReplayCameraController} from './breach-replay-camera-controller.ts';
import type {ReplayKnowledgeController} from './breach-replay-knowledge-controller.ts';
import type {ReplayBodycamController} from './breach-replay-bodycam-controller.ts';
import type {createBreachReplayAnalysisController} from './ui/breach-replay-analysis-controller.ts';
import {ReplayMovementHistory} from './breach-replay-movement-history.ts';
import {adoptPresentationWorldSession} from './breach-world-context.ts';
import {bodycamEligibleObserverIds,bodycamHasPersonalGround}
 from './breach-replay-bodycam-controls.ts';

export type ReplayModeControllerHooks={
 getSession:()=>Session;setSession:(session:Session)=>void;
 getFinishedSession:()=>Session|null;
 setFinishedSession:(session:Session|null)=>void;
 isReplaying:()=>boolean;setReplaying:(enabled:boolean)=>void;
 getRecorder:()=>MissionRecorder;getStage:()=>TacticalScene3D|null;
 createReplaySession:(recorder:MissionRecorder,finished:Session)=>Session;
 resumeLiveSession:(finished:Session)=>Session;
 playback:ReplayPlaybackController;
 camera:ReplayCameraController;
 knowledge:ReplayKnowledgeController;
 bodycam:ReplayBodycamController;
 getAnalysis:()=>ReturnType<typeof createBreachReplayAnalysisController>;
 ui:{replayPanel:HTMLElement;replayTopHud:HTMLElement;
   replayRail:HTMLElement;replaySeek:HTMLInputElement};
 resetTargeting:()=>void;
 resetReplayOptions:()=>void;
 setXray:(enabled:boolean)=>void;
 setMovementHistory:(value:ReplayMovementHistory|null)=>void;
 clearReplayPresentation:()=>void;
 beginAudio:(recorder:MissionRecorder)=>void;
 endAudio:()=>void;
 stopVideo:()=>void;
 stopBodycam:()=>void;
 populateCameraChoices:()=>void;
 populateInspectActors:()=>void;
 rebuildEventIndex:()=>void;
 seekReplay:(seconds:number)=>void;
 invalidateFog:()=>void;
 afterReplayExit:()=>void;
 updateHud:()=>void;
};

export function createReplayModeController(config:ReplayModeControllerHooks){
 function enterReplay():boolean{
  if(config.isReplaying())return false;
  const recorder=config.getRecorder();
  if(recorder.frames.length<2)return false;
  const live=config.getSession(),stage=config.getStage();
  config.setFinishedSession(live);config.setReplaying(true);
  config.playback.reset();config.playback.play();
  config.camera.reset(stage);
  config.knowledge.omniscient=false;
  config.resetTargeting();
  config.knowledge.observerId=null;
  config.bodycam.active=false;config.bodycam.mount='chest';
  config.setXray(true);
  config.bodycam.observers=[];config.bodycam.groundObservers.clear();
  config.knowledge.prepare(recorder);
  config.knowledge.omniscient=false;
  config.knowledge.groundLensOn=false;
  config.knowledge.groundCacheObserver=null;
  config.knowledge.groundCacheCount=-1;
  config.knowledge.groundCacheSite=null;
  config.camera.director.indexPlans(recorder.plans.revisions);
  config.getAnalysis().startSession();
  config.resetReplayOptions();
  config.setMovementHistory(new ReplayMovementHistory(recorder.frames,
    team(live).map(a=>a.id)));
  config.beginAudio(recorder);
  config.getAnalysis().showReplayToolTab(null);
  config.setSession(config.createReplaySession(recorder,live));
  const state=config.getSession();
  // Replay becomes the displayed geometry only at the actual UI handoff.
  // Building the historical session never mutates the live presentation.
  adoptPresentationWorldSession(state);
  config.camera.followId=team(state)[0]?.id??'rook';
  config.populateCameraChoices();
  config.populateInspectActors();
  config.bodycam.observers=bodycamEligibleObserverIds(
    recorder.frames.find(f=>!!f.knowledge?.operatorVisibleActorIds)?.knowledge,
    team(state).map(a=>a.id));
  config.bodycam.groundObservers=new Set(config.bodycam.observers.filter(id=>
    bodycamHasPersonalGround(recorder.personalGround,id)));
  config.getStage()?.applySite(state.site??null);
  config.getStage()?.setReplayBodycam(null);
  config.rebuildEventIndex();
  config.getAnalysis().rebuildReplaySquadEntries();
  document.body.classList.add('replaying');
  config.ui.replayPanel.hidden=false;
  config.ui.replayTopHud.hidden=false;config.ui.replayRail.hidden=false;
  config.getAnalysis().setReplayRailCollapsed(false);
  config.getAnalysis().setReplayDockCollapsed(false);
  config.ui.replaySeek.max=String(Math.max(1,Math.ceil(recorder.duration*60)));
  config.getAnalysis().renderReplayEventMarkers();
  config.seekReplay(0);config.updateHud();
  return true;
 }
 function exitReplay():boolean{
  if(!config.isReplaying())return false;
  config.stopVideo();
  config.stopBodycam();
  config.bodycam.observers=[];
  config.setXray(false);
  config.camera.reset(config.getStage());
  config.playback.reset();
  config.bodycam.groundObservers.clear();
  config.setReplaying(false);
  config.clearReplayPresentation();
  config.getAnalysis().reset();
  config.knowledge.reset();
  config.setMovementHistory(null);config.endAudio();
  document.body.classList.remove('replaying');
  config.ui.replayPanel.hidden=true;
  config.ui.replayTopHud.hidden=true;config.ui.replayRail.hidden=true;
  config.getAnalysis().closeReplayChoices();
  const finished=config.getFinishedSession();
  if(finished)config.setSession(config.resumeLiveSession(finished));
  config.setFinishedSession(null);
  config.invalidateFog();config.afterReplayExit();
  config.getStage()?.applySite(config.getSession().site??null);
  config.updateHud();return true;
 }
 return {enterReplay,exitReplay};
}
