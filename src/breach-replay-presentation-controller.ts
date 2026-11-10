/** Stage 4: replay frame presentation/seek and director view coordination.
 * Playback owns frame application; this layer never advances the 60Hz game.
 */
import type {Session} from './breach-game.ts';
import type {MissionRecorder} from './breach-replay.ts';
import type {ReplayPlaybackController} from './breach-replay-playback-controller.ts';
import type {ReplayCameraController} from './breach-replay-camera-controller.ts';
import type {ReplayKnowledgeController} from './breach-replay-knowledge-controller.ts';
import type {ReplayBodycamController} from './breach-replay-bodycam-controller.ts';
import type {ReplayQuickVideo} from './breach-replay-video.ts';
import type {ReplayPresentation} from './breach-replay-motion.ts';
import type {TacticalScene3D,ViewMode} from './breach-3d.ts';
import type {createBreachAudioController} from './breach-audio-controller.ts';
import type {createBreachReplayAnalysisController} from './ui/breach-replay-analysis-controller.ts';
import type {RecordedShot} from './breach-replay-ballistics.ts';
export type ReplayPresentationPort={
 ui:{replayClusterMenu:HTMLElement;replayFeed:HTMLElement;
    replayTopHud:HTMLElement;replayPanel:HTMLElement;
    replayFollowStatus:HTMLOutputElement};
 replayQuickVideo:ReplayQuickVideo;
 audioController:ReturnType<typeof createBreachAudioController>;
 replayDirector:ReplayCameraController['director'];
 stage:TacticalScene3D|null;replayPlayback:ReplayPlaybackController;
 recorder:MissionRecorder;state:Session;
 replayPresentation:ReplayPresentation|null;
 fog2D:{invalidate:()=>void};
 replayAnalysisUi:ReturnType<typeof createBreachReplayAnalysisController>;
 updateReplayHud:()=>void;
 replayKnowledge:ReplayKnowledgeController;
 cssW:number;cssH:number;replayCamera:ReplayCameraController;
 replaying:boolean;viewMode:ViewMode;replayBodycam:ReplayBodycamController;
 replayDirectorDebugPanel:HTMLOutputElement|null;
 historicalShotVisible:(shot:RecordedShot)=>boolean;
};
export function createBreachReplayPresentationController(
  current:()=>ReplayPresentationPort
){
 function presentReplayAtCurrentTime():void{
   const port=current();
   port.ui.replayClusterMenu.hidden=true;
   if(port.replayQuickVideo.active)port.replayQuickVideo.stop();
   port.audioController.stopReplaySounds();
   port.replayDirector.target=null;
   port.stage?.resetReplayBodycamSmoothing();
   const frame=port.replayPlayback.applyRecordedFrame(port.recorder,port.state);
   if(frame){
     port.replayPresentation=frame.presentation??null;
     port.fog2D.invalidate();
   }
   advanceReplayCamera(0,true);
   if(!port.ui.replayFeed.hidden)port.replayAnalysisUi.renderReplayEventFeed();
   port.updateReplayHud();
 }
 function seekReplay(t:number):void{
   const port=current();
   port.replayPlayback.seek(t,port.recorder.duration);
   presentReplayAtCurrentTime();
 }
 function rebuildReplayEventIndex():void{
   const port=current();
   const eventIndex=port.replayAnalysisUi.rebuildReplayEventIndex();
   const headerBottom=Math.max(65,
     port.ui.replayTopHud.getBoundingClientRect().bottom,
     document.querySelector('.top')?.getBoundingClientRect().bottom??0);
   const dockRect=port.ui.replayPanel.getBoundingClientRect();
   const dockPixels=port.ui.replayPanel.hidden||dockRect.height<40?
     Math.min(205,port.cssH*.235):
     Math.max(port.cssH-dockRect.top,Math.min(205,port.cssH*.235));
   port.replayDirector.rebuild({
     recorder:port.recorder,eventIndex,state:port.state,
     observerId:port.replayKnowledge.observerId,
     omniscient:port.replayKnowledge.omniscient,
     isShotVisible:port.historicalShotVisible,
     width:port.cssW,height:port.cssH,
     headerBottom,dockPixels,baseSpan:port.stage?.replayCameraBaseSpan()??1100
   });
 }
 function advanceReplayCamera(dt:number,instant=false):void{
   const port=current();
   port.replayCamera.advance({
     dt,instant,replaying:port.replaying,stage:port.stage,
     viewMode:port.viewMode,state:port.state,recorder:port.recorder,
     replayTime:port.replayPlayback.time,
     replayContactObserverId:port.replayKnowledge.observerId,
     replayOmniscient:port.replayKnowledge.omniscient,
     manualBodycamActive:port.replayBodycam.active,
     cssW:port.cssW,cssH:port.cssH,
     replayFollowStatus:port.ui.replayFollowStatus,
     debugPanel:port.replayDirectorDebugPanel
   });
 }
 return {presentReplayAtCurrentTime,seekReplay,rebuildReplayEventIndex,
   advanceReplayCamera};
}
