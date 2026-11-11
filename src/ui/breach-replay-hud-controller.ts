/** Stage 4: replay toolbar, camera and historical disclosure UI.
 * No game authority, no listeners created from a render refresh.
 */
import {team,type Session} from '../breach-game.ts';
import type {MissionRecorder} from '../breach-replay.ts';
import type {ReplayPlaybackController} from '../breach-replay-playback-controller.ts';
import type {ReplayCameraController} from '../breach-replay-camera-controller.ts';
import type {ReplayKnowledgeController} from '../breach-replay-knowledge-controller.ts';
import type {ReplayBodycamController} from '../breach-replay-bodycam-controller.ts';
import type {ReplayPresentationOptions,createReplayPresentationOptions} from '../breach-replay-presentation-options.ts';
import type {ViewMode,TacticalScene3D} from '../breach-3d.ts';
import type {ReplayQuickVideo} from '../breach-replay-video.ts';
import type {createBreachAudioController} from '../breach-audio-controller.ts';
import {operatorContactAvailable} from '../breach-replay-contact-lens.ts';
import type {createBreachReplayAnalysisController} from './breach-replay-analysis-controller.ts';
import {formatReplayTime} from '../breach-replay-transport.ts';
import {REPLAY_SPEED_STOPS,speedIndex} from '../breach-replay-speed.ts';
import {resolvedReplayCamera,type ReplayCameraChoice,type ReplayPerspective}
 from '../breach-replay-ui-state.ts';
import {bodycamDisclosureLabel} from '../breach-replay-bodycam-controls.ts';
import {tacticalIcon} from './tactical-icons.ts';
export type ReplayHudElements={
 replayOverlayChoices:HTMLElement;
 replayAnalysis:HTMLButtonElement;
 replayBodycam:HTMLButtonElement;
 replayBodycamMount:HTMLButtonElement;
 replayBodycamStatus:HTMLElement;
 replayClock:HTMLOutputElement;
 replayContactLens:HTMLButtonElement;
 replayContactNote:HTMLElement;
 replayDirectBodycam:HTMLButtonElement;
 replayDirectDirector:HTMLButtonElement;
 replayDirectFree:HTMLButtonElement;
 replayDirectLens:HTMLButtonElement;
 replayDirectMount:HTMLButtonElement;
 replayDirectSight:HTMLSelectElement;
 replayDirectTracers:HTMLButtonElement;
 replayDirectXray:HTMLButtonElement;
 replayDirector:HTMLButtonElement;
 replayEventText:HTMLOutputElement;
 replayExportVideo:HTMLButtonElement;
 replayFollow:HTMLButtonElement;
 replayFollowStatus:HTMLOutputElement;
 replayGhosts:HTMLButtonElement;
 replayGroundLens:HTMLButtonElement;
 replayInspectActor:HTMLSelectElement;
 replayInspectFollow:HTMLButtonElement;
 replayInspectMovement:HTMLButtonElement;
 replayInspectActorButtons:HTMLElement;
 replayLoopIn:HTMLButtonElement;
 replayLoopOut:HTMLButtonElement;
 replayLoopToggle:HTMLButtonElement;
 replayMiniPlay:HTMLButtonElement;
 replayNames:HTMLButtonElement;
 replayNextEvent:HTMLButtonElement;
 replayPlanVersion:HTMLButtonElement;
 replayPlans:HTMLButtonElement;
 replayPlay:HTMLButtonElement;
 replayPresetStatus:HTMLOutputElement;
 replayPresets:HTMLElement;
 replayPrevEvent:HTMLButtonElement;
 replayQuickCamera:HTMLSelectElement;
 replayQuickSpeed:HTMLSelectElement;
 replayQuickView:HTMLSelectElement;
 replaySaveArchive:HTMLButtonElement;
 replaySeek:HTMLInputElement;
 replayShareToggle:HTMLButtonElement;
 replaySight:HTMLButtonElement;
 replaySightChoices:HTMLElement;
 replaySightTrigger:HTMLButtonElement;
 replaySound:HTMLButtonElement;
 replaySpeed:HTMLButtonElement;
 replaySpeedChoices:HTMLElement;
 replaySpeedRange:HTMLInputElement;
 replaySpeedTrigger:HTMLButtonElement;
 replaySpeedValue:HTMLOutputElement;
 replaySquad:HTMLButtonElement;
 replayStatusChip:HTMLOutputElement;
 replayTraces:HTMLButtonElement;
 replayTrails:HTMLButtonElement;
 replayView:HTMLButtonElement;
 replayExit:HTMLButtonElement;
 replayViewChoices:HTMLElement;
 replayViewTrigger:HTMLButtonElement;
};

export type ReplayHudInteractionPort={
 readonly state:Session;readonly recorder:MissionRecorder;readonly stage:TacticalScene3D|null;
 readonly replaying:boolean;readonly viewMode:ViewMode;
 selected:string;readonly cssW:number;readonly cssH:number;
 replayKnowledge:ReplayKnowledgeController;replayPlayback:ReplayPlaybackController;
 replayCamera:ReplayCameraController;replayBodycam:ReplayBodycamController;
 replayDirector:ReplayCameraController['director'];
 replayAnalysisUi:ReturnType<typeof createBreachReplayAnalysisController>;
 replayQuickVideo:ReplayQuickVideo;audio:ReturnType<typeof createBreachAudioController>;
 stopReplayBodycam:()=>void;startReplayBodycam:()=>boolean;
 applyReplayBodycamMount:()=>void;
 chooseReplayCamera:(mode:Parameters<ReplayCameraController['selectMode']>[0])=>void;
 cameraMode:(mode:ViewMode)=>void;
 advanceReplayCamera:(dt:number,instant?:boolean)=>void;
 rebuildReplayEventIndex:()=>void;seekReplay:(time:number)=>void;
 exitReplay:()=>void;invalidateFog:()=>void;
 showUiHelp:(message:string,duration?:number)=>void;
};
export type ReplayHudSnapshot={
 state:Session;recorder:MissionRecorder;
 replayPlayback:ReplayPlaybackController;replayCamera:ReplayCameraController;
 replayKnowledge:ReplayKnowledgeController;replayBodycam:ReplayBodycamController;
 videoActive:boolean;library:{activeSavedReplayId:unknown;busy:boolean;
  isRecorderSaved:(recorder:MissionRecorder)=>boolean};
 analysisUi:ReturnType<typeof createBreachReplayAnalysisController>;
 viewMode:ViewMode;stageAvailable:boolean;selected:string;replaying:boolean;
 presentationOptions:ReplayPresentationOptions;
 audioSoundEnabled:boolean;
};
export function createBreachReplayHudController(config:{
 ui:ReplayHudElements;snapshot:()=>ReplayHudSnapshot;
 onOverlayChoice:(choice:string)=>void;
 followReplayOperator:(id:string)=>void;
 interactions:ReplayHudInteractionPort;
 presentation:{
  options:ReturnType<typeof createReplayPresentationOptions>;
  setXray:(on:boolean)=>void;
 };
}){
 const port=config.interactions;
 let bound=false;
 let quickBound=false,directBound=false,lateBound=false;
function changeReplaySight(mode:'team'|'full'|'operator'):void{
  if(mode==='operator'){
    if(!port.replayKnowledge.hasContactEvidence)return;
    const eligible=port.replayBodycam.observers;
    const next=eligible.includes(port.replayCamera.followId)?port.replayCamera.followId:
      eligible.includes(port.selected)?port.selected:eligible[0];
    if(!next)return;
    port.replayKnowledge.observerId=next;
    port.replayKnowledge.omniscient=false;
    port.replayAnalysisUi.closeReplayShotInspector();
    if(port.replayBodycam.active)port.applyReplayBodycamMount();
  }else{
    if(port.replayBodycam.active)port.stopReplayBodycam();
    port.replayKnowledge.groundLensOn=false;port.replayKnowledge.observerId=null;
    port.replayKnowledge.omniscient=mode==='full';
  }
  port.invalidateFog();
  port.rebuildReplayEventIndex();
  port.replayAnalysisUi.renderReplayEventMarkers();port.replayAnalysisUi.renderReplayEventFeed();
  port.replayAnalysisUi.refreshReplayShotInspector();updateReplayHud();
}
function followReplayOperator(id:string):void{
  if(!port.replaying||!team(port.state).some(a=>a.id===id&&a.health>0))return;
  if(port.replayBodycam.active)port.stopReplayBodycam();
  if(port.viewMode==='plan2d'&&port.stage)port.cameraMode('iso');
  port.selected=id;port.replayCamera.followId=id;
  port.chooseReplayCamera('operator');port.replayCamera.follow=true;
  if(port.replayKnowledge.observerId){
    port.replayKnowledge.observerId=port.replayBodycam.observers.includes(id)?id:null;
    port.invalidateFog();port.rebuildReplayEventIndex();
    port.replayAnalysisUi.renderReplayEventMarkers();port.replayAnalysisUi.renderReplayEventFeed();
  }
  port.advanceReplayCamera(0,true);
  updateReplayHud();
}

 function bind():void{
  if(bound)return;
  bound=true;
  const ui=config.ui;
  for(const button of config.ui.replayOverlayChoices
    .querySelectorAll<HTMLButtonElement>('[data-overlay-choice]')){
    button.addEventListener('click',()=>{
      const choice=button.dataset.overlayChoice;
      if(!choice)return;
      config.onOverlayChoice(choice);
      updateReplayHud();
    });
  }
  ui.replayDirectTracers.addEventListener('click',()=>{
    config.presentation.options.setPreset('custom');
    config.presentation.options.patch({replayTraceMode:config.presentation.options.options.replayTraceMode==='off'?'recent':'off'});
    updateReplayHud();
  });
  ui.replayDirectXray.addEventListener('click',()=>{
    const enabled=!config.presentation.options.options.replayXrayOn;
    config.presentation.options.patch({replayXrayOn:enabled});
    config.presentation.setXray(enabled);
    updateReplayHud();
  });
  ui.replayAnalysis.addEventListener('click',()=>{
    config.presentation.options.setPreset('custom');
    config.presentation.options.patch({replayAnalysis:!config.presentation.options.options.replayAnalysis});
    updateReplayHud();
  });
  ui.replayPlans.addEventListener('click',()=>{
    config.presentation.options.setPreset('custom');
    const scope=config.presentation.options.options.replayPlanScope;
    config.presentation.options.patch({
      replayPlanScope:scope==='selected'?'all':scope==='all'?'none':'selected'
    });
    updateReplayHud();
  });
  ui.replayNames.addEventListener('click',()=>{
    // Retain legacy preset-label behavior for the direct NAMES toolbar.
    config.presentation.options.patch({replayNameTags:!config.presentation.options.options.replayNameTags});
    updateReplayHud();
  });
  ui.replayPlanVersion.addEventListener('click',()=>{
    config.presentation.options.setPreset('custom');
    config.presentation.options.patch({replayPlanVersion:
      config.presentation.options.options.replayPlanVersion==='active'?'original':'active'});
    updateReplayHud();
  });
  ui.replayTraces.addEventListener('click',()=>{
    config.presentation.options.setPreset('custom');
    const mode=config.presentation.options.options.replayTraceMode;
    config.presentation.options.patch({replayTraceMode:mode==='off'?'recent':
      mode==='recent'?'selected':'off'});
    updateReplayHud();
  });
  ui.replayGhosts.addEventListener('click',()=>{
    config.presentation.options.setPreset('custom');
    const mode=config.presentation.options.options.replayGhostMode;
    config.presentation.options.patch({replayGhostMode:mode==='off'?'selected':
      mode==='selected'?'squad':'off'});
    updateReplayHud();
  });
  ui.replayTrails.addEventListener('click',()=>{
    config.presentation.options.setPreset('custom');
    const mode=config.presentation.options.options.replayTrailMode;
    config.presentation.options.patch({replayTrailMode:mode==='off'?'recent':
      mode==='recent'?'full':'off'});
    updateReplayHud();
  });
 }
 function bindQuickInteractions():void{
  if(quickBound)return;quickBound=true;
config.ui.replayQuickView.addEventListener('change',()=>{
  if(port.replayBodycam.active)return;
  const next=config.ui.replayQuickView.value as ReplayPerspective;
  if(!['iso','top','plan2d'].includes(next))return;
  port.cameraMode(next);
  port.chooseReplayCamera(resolvedReplayCamera(port.replayCamera.mode,next,!!port.stage,port.replayBodycam.active));
  
  updateReplayHud();
});
config.ui.replayInspectActor.addEventListener('change',()=>{
  const id=config.ui.replayInspectActor.value;
  if(!team(port.state).some(a=>a.id===id))return;
  port.selected=id;
  if(port.replayCamera.mode==='operator'){
    port.replayCamera.followId=id;port.advanceReplayCamera(0,true);
  }
  updateReplayHud();
});
config.ui.replayInspectFollow.addEventListener('click',()=>{
  const id=config.ui.replayInspectActor.value;
  if(!team(port.state).some(a=>a.id===id)||port.replayBodycam.active)return;
  if(port.viewMode==='plan2d')port.cameraMode('iso');
  port.selected=id;port.replayCamera.followId=id;port.chooseReplayCamera('operator');port.replayCamera.follow=true;
  port.advanceReplayCamera(0,true);updateReplayHud();
});
config.ui.replayInspectMovement.addEventListener('click',()=>{
  const id=config.ui.replayInspectActor.value;
  if(!team(port.state).some(a=>a.id===id))return;
  port.selected=id;applyReplayPreset('movement');
});
config.ui.replayQuickCamera.addEventListener('change',()=>{
  if(port.replayBodycam.active)return;
  const choice=config.ui.replayQuickCamera.value;
  const mode:ReplayCameraChoice=choice.startsWith('operator:')?
    'operator':choice as ReplayCameraChoice;
  if(!['free','operator','squad','director'].includes(mode)||
      resolvedReplayCamera(mode,port.viewMode as ReplayPerspective,!!port.stage,port.replayBodycam.active)!==mode)
    return;
  if(mode==='operator'){
    const id=choice.slice('operator:'.length);
    if(!team(port.state).some(a=>a.id===id))return;
    port.replayCamera.followId=id;
  }
  port.chooseReplayCamera(mode);port.replayCamera.follow=mode==='operator';
  port.advanceReplayCamera(0,true);updateReplayHud();
});


 }
 function bindDirectInteractions():void{
  if(directBound)return;directBound=true;
config.ui.replayDirectSight.addEventListener('change',()=>{
  const mode=config.ui.replayDirectSight.value;
  if(mode==='team'||mode==='full'||mode==='operator')
    changeReplaySight(mode);
});


config.ui.replayDirectDirector.addEventListener('click',()=>{
  if(port.replayBodycam.active)port.stopReplayBodycam();
  if(port.viewMode!=='iso'&&port.stage)port.cameraMode('iso');
  port.chooseReplayCamera(port.replayCamera.mode==='director'?'free':'director');
  port.replayCamera.follow=false;
  port.replayDirector.target=null;
  
  port.advanceReplayCamera(1/60,false);updateReplayHud();
});
config.ui.replayDirectLens.addEventListener('click',()=>{
  if(!port.replaying||port.replayCamera.mode!=='director')return;
  port.replayCamera.lens=port.replayCamera.lens==='ortho'?'wide':
    port.replayCamera.lens==='wide'&&port.replayDirector.camEligibleObservers.length?
      'cam':'ortho';
  // Mount is a viewer preference, not a director edit. No recorded
  // subject changes just because the lens changes.
  if(port.replayCamera.lens==='cam'&&port.viewMode!=='iso'&&port.stage)port.cameraMode('iso');
  port.advanceReplayCamera(0,true);
  updateReplayHud();
});
config.ui.replayDirectBodycam.addEventListener('click',()=>{
  if(port.replayBodycam.active){
    const returnId=port.replayCamera.followId;
    port.stopReplayBodycam();
    followReplayOperator(returnId);
  }else{
    if(port.replayCamera.mode!=='operator'||
      !port.replayBodycam.observers.includes(port.replayCamera.followId))return;
    port.replayKnowledge.observerId=port.replayCamera.followId;
    if(!port.startReplayBodycam())return;
  }
  port.invalidateFog();port.rebuildReplayEventIndex();
  port.replayAnalysisUi.renderReplayEventMarkers();port.replayAnalysisUi.renderReplayEventFeed();
  updateReplayHud();
});
config.ui.replayDirectMount.addEventListener('click',()=>{
  if(port.replayCamera.mode==='director'&&port.replayCamera.lens==='cam'){
    port.replayCamera.camMount=port.replayCamera.camMount==='chest'?'helmet':'chest';
    port.advanceReplayCamera(0,true);updateReplayHud();
  }else config.ui.replayBodycamMount.click();
});
config.ui.replayDirectFree.addEventListener('click',()=>{
  if(port.replayBodycam.active)port.stopReplayBodycam();
  port.chooseReplayCamera('free');port.replayCamera.follow=false;
  updateReplayHud();
});
config.ui.replaySight.addEventListener('click',()=>{
  port.stopReplayBodycam();
  port.replayKnowledge.groundLensOn=false;
  port.replayKnowledge.observerId=null;
  port.replayKnowledge.omniscient=!port.replayKnowledge.omniscient;port.invalidateFog();
  port.rebuildReplayEventIndex();
  port.replayAnalysisUi.renderReplayEventMarkers();port.replayAnalysisUi.renderReplayEventFeed();
  port.replayAnalysisUi.refreshReplayShotInspector();updateReplayHud();
});
/** Only Vite DEVELOPMENT + explicit QA query can access this hook.
 * Production builds strip it; normal replay has NO Bodycam button yet.
 * Browser smoke uses historical replay disclosure, never simulated LOS.
 */

 }
 function bindLateInteractions():void{
  if(lateBound)return;lateBound=true;
config.ui.replayContactLens.addEventListener('click',()=>{
  if(!port.replayKnowledge.hasContactEvidence)return;
  const known=port.recorder.frames.find(f=>
    !!f.knowledge?.operatorVisibleActorIds)?.knowledge;
  const ids=team(port.state).map(a=>a.id).filter(id=>
    operatorContactAvailable(known,id));
  if(!ids.length)return;
  const at=port.replayKnowledge.observerId===null?-1:
    ids.indexOf(port.replayKnowledge.observerId);
  port.replayKnowledge.observerId=at>=ids.length-1?null:ids[at+1];
  if(!port.replayKnowledge.observerId){
    port.replayKnowledge.groundLensOn=false;port.stopReplayBodycam();
  }else if(port.replayBodycam.active){
    if(port.replayBodycam.observers.includes(port.replayKnowledge.observerId))
      port.applyReplayBodycamMount();
    else port.stopReplayBodycam();
  }
  if(port.replayKnowledge.observerId){
    port.replayKnowledge.omniscient=false;
    port.selected=port.replayKnowledge.observerId;
    port.replayCamera.followId=port.replayKnowledge.observerId;
    port.replayAnalysisUi.closeReplayShotInspector();
  }
  port.invalidateFog();
  port.rebuildReplayEventIndex();
  port.replayAnalysisUi.renderReplayEventMarkers();port.replayAnalysisUi.renderReplayEventFeed();
  port.replayAnalysisUi.refreshReplayShotInspector();updateReplayHud();
});
config.ui.replayGroundLens.addEventListener('click',()=>{
  if(port.replayBodycam.active)port.stopReplayBodycam();
  if(!port.replayKnowledge.observerId||!port.replayKnowledge.personalGround)return;
  port.replayKnowledge.groundLensOn=!port.replayKnowledge.groundLensOn;
  if(port.replayKnowledge.groundLensOn&&port.viewMode!=='plan2d')port.cameraMode('plan2d');
  port.replayKnowledge.groundCacheObserver=null;
  port.replayKnowledge.groundCacheCount=-1;
  updateReplayHud();
});
config.ui.port.replayBodycam.addEventListener('click',()=>{
  if(port.replayBodycam.active)port.stopReplayBodycam();
  else if(!port.startReplayBodycam())return;
  port.rebuildReplayEventIndex();
  port.replayAnalysisUi.renderReplayEventMarkers();port.replayAnalysisUi.renderReplayEventFeed();
  port.replayAnalysisUi.refreshReplayShotInspector();updateReplayHud();
});
config.ui.replayBodycamMount.addEventListener('click',()=>{
  if(!port.replayBodycam.active)return;
  port.replayBodycam.mount=port.replayBodycam.mount==='chest'?'helmet':'chest';
  port.applyReplayBodycamMount();updateReplayHud();
});
config.ui.replayView.addEventListener('click',()=>{
  if(port.replayBodycam.active)port.stopReplayBodycam();
  port.cameraMode(port.viewMode==='iso'?'top':port.viewMode==='top'?'plan2d':'iso');
  port.chooseReplayCamera(resolvedReplayCamera(port.replayCamera.mode,
    port.viewMode as ReplayPerspective,!!port.stage,port.replayBodycam.active));
  
  updateReplayHud();
});

config.ui.replayFollow.addEventListener('click',()=>{
  if(port.replayBodycam.active)port.stopReplayBodycam();
  if(port.replayCamera.follow){
    const i=squadIds.indexOf(port.replayCamera.followId as typeof squadIds[number]);
    if(i===squadIds.length-1)port.replayCamera.follow=false;
    else port.replayCamera.followId=squadIds[i+1];
  }else port.replayCamera.follow=true;
  port.chooseReplayCamera(port.replayCamera.follow?'operator':'free');
  port.advanceReplayCamera(0,true);updateReplayHud();
});
config.ui.replaySquad.addEventListener('click',()=>{
  if(port.replayBodycam.active)port.stopReplayBodycam();
  port.chooseReplayCamera(port.replayCamera.mode==='squad'?'free':'squad');
  port.replayCamera.follow=false;port.advanceReplayCamera(0,true);updateReplayHud();
});
config.ui.port.replayDirector.addEventListener('click',()=>{
  if(port.replayBodycam.active)port.stopReplayBodycam();
  if(port.replayCamera.lens==='cam'&&port.viewMode!=='iso'&&port.stage)
    port.cameraMode('iso');
  port.chooseReplayCamera(port.replayCamera.mode==='director'?'free':'director');
  port.replayCamera.follow=false;port.advanceReplayCamera(0,true);updateReplayHud();
});







config.ui.replayExportVideo.addEventListener('click',()=>{
  if(port.replayQuickVideo.active){
    port.replayQuickVideo.stop();config.ui.replayExportVideo.textContent='VIDEO 20S';return;
  }
  port.audio.unlock();
  const videoAudioStream=port.audio.beginVideoCapture();
  if(port.replayPlayback.time>=port.recorder.duration-.2)port.seekReplay(0);
  port.replayPlayback.prepareVideoExport();
  const started=port.replayQuickVideo.start(port.replayPlayback.time,
    {width:port.cssW,height:port.cssH},videoAudioStream);
  if(!started){
    port.audio.endVideoCapture();
    port.showUiHelp('VIDEO CAPTURE NOT SUPPORTED IN THIS BROWSER',4200);
    return;
  }
  port.replayPlayback.play();
  config.ui.replayExportVideo.textContent='STOP VIDEO';
  config.ui.replayExportVideo.title=port.replayQuickVideo.audioTrackCount?
    'Recording replay video with audio':'Recording replay video without audio';
  updateReplayHud();
});
config.ui.replayExit.addEventListener('click',port.exitReplay);
 }
function populateInspectActors():void{
 const ui=config.ui,state=config.snapshot().state;
 ui.replayInspectActor.replaceChildren();
 ui.replayInspectActorButtons.replaceChildren();
 for(const actor of team(state)){
  const option=document.createElement('option');
  option.value=actor.id;option.textContent=actor.name.toUpperCase();
  ui.replayInspectActor.append(option);
  const button=document.createElement('button');
  button.type='button';button.dataset.followActor=actor.id;
  button.textContent=actor.name.toUpperCase();button.title='Follow '+actor.name;
  button.addEventListener('click',()=>config.followReplayOperator(actor.id));
  ui.replayInspectActorButtons.append(button);
 }
}
function populateCameraChoices():void{
 const ui=config.ui,state=config.snapshot().state;
 for(const option of ui.replayQuickCamera.querySelectorAll('option[data-actor]'))
   option.remove();
 for(const actor of team(state)){
  const option=document.createElement('option');
  option.value='operator:'+actor.id;option.dataset.actor=actor.id;
  option.textContent='FOLLOW '+actor.name.toUpperCase();
  ui.replayQuickCamera.append(option);
 }
}
function updateReplayHud():void{
 const ui=config.ui;
 const {state,recorder,replayPlayback,replayCamera,replayKnowledge,replayBodycam,
   videoActive,library,analysisUi,viewMode,stageAvailable,selected,
   presentationOptions,replaying,audioSoundEnabled}=config.snapshot();
  const {replayXrayOn,replayTraceMode,replayGhostMode,replayTrailMode,
   replayPlanScope,replayPlanVersion,replayNameTags,replayAnalysis,
   replayPreset}=presentationOptions;
 const replayDirector=replayCamera.director;
  ui.replaySeek.value=String(Math.round(replayPlayback.time*60));
  ui.replayMiniPlay.textContent=replayPlayback.playing?'Ⅱ':'▶';
  const following=replayCamera.mode==='operator'&&
    team(state).some(actor=>actor.id===replayCamera.followId&&actor.health>0);
  const followingName=team(state).find(actor=>actor.id===replayCamera.followId)?.name??
    replayCamera.followId;
  const autoCam=replayCamera.mode==='director'&&replayCamera.lens==='cam';
  const camId=autoCam?replayCamera.directorCamActor:null;
  const camName=team(state).find(a=>a.id===camId)?.name??camId;
  ui.replayFollowStatus.textContent=replayBodycam.active?
    'BODYCAM · '+followingName.toUpperCase():following?
    'FOLLOWING · '+followingName.toUpperCase():
    autoCam?'DIRECTOR CAM · '+(camName?.toUpperCase()??'NO RECORDED VIEW'):
    replayCamera.mode==='director'?
      'DIRECTOR · '+(replayDirector.target?.shotType.toUpperCase()??'SQUAD') :
    replayCamera.mode==='squad'?'FOLLOWING · SQUAD':'FREE CAMERA';
  ui.replayFollowStatus.dataset.following=String(following||replayBodycam.active);
  ui.replayClock.textContent=formatReplayTime(replayPlayback.time)+' / '+
    formatReplayTime(recorder.duration)+
    (recorder.completeness.complete?'':' · PARTIAL');
  ui.replaySeek.setAttribute('aria-valuetext',
    formatReplayTime(replayPlayback.time)+' of '+formatReplayTime(recorder.duration));
  ui.replayPlay.dataset.caption=replayPlayback.playing?'PAUSE':'PLAY';
  const playbackIcon=replayPlayback.playing?'pause':'replayPlay';
  if(ui.replayPlay.dataset.mode!==playbackIcon){
    ui.replayPlay.dataset.mode=playbackIcon;
    ui.replayPlay.replaceChildren(tacticalIcon(playbackIcon));
    ui.replayPlay.setAttribute('aria-label',replayPlayback.playing?'Pause replay':'Play replay');
    ui.replayPlay.title=replayPlayback.playing?'Pause replay':'Play replay';
  }
  ui.replaySpeed.textContent=replayPlayback.rate+'×';
  ui.replayQuickSpeed.value=String(replayPlayback.rate);
  ui.replayQuickSpeed.disabled=videoActive;
  ui.replaySpeedTrigger.querySelector('small')!.textContent=replayPlayback.rate+'×';
  ui.replaySpeedTrigger.setAttribute('aria-label','Playback speed '+replayPlayback.rate+' times');
  ui.replaySpeedTrigger.disabled=videoActive;
  ui.replaySpeedRange.disabled=videoActive;
  ui.replaySpeedRange.value=String(speedIndex(replayPlayback.rate));
  ui.replaySpeedRange.setAttribute('aria-valuetext',replayPlayback.rate+'×');
  ui.replaySpeedRange.style.setProperty('--speed-progress',
    (speedIndex(replayPlayback.rate)/(REPLAY_SPEED_STOPS.length-1)*100)+'%');
  ui.replaySpeedValue.textContent=replayPlayback.rate+'×';
for(const b of ui.replaySpeedChoices.querySelectorAll<HTMLButtonElement>('[data-speed-choice]')){
    b.disabled=videoActive;
    b.setAttribute('aria-pressed',String(Number(b.dataset.speedChoice)===replayPlayback.rate));
  }
  const loop=replayPlayback.loopRange(recorder.duration);
  ui.replayLoopIn.textContent=replayPlayback.loopIn===null?'SET LOOP IN':
    'IN '+formatReplayTime(replayPlayback.loopIn);
  ui.replayLoopOut.textContent=replayPlayback.loopOut===null?'SET LOOP OUT':
    'OUT '+formatReplayTime(replayPlayback.loopOut);
  ui.replayLoopToggle.textContent=replayPlayback.loopEnabled?'LOOP ON':'LOOP OFF';
  ui.replayLoopToggle.disabled=!loop||videoActive;
  ui.replayLoopIn.disabled=videoActive;
  ui.replayLoopOut.disabled=videoActive;
  ui.replayLoopToggle.setAttribute('aria-pressed',String(replayPlayback.loopEnabled));
  ui.replayExportVideo.textContent=videoActive?'STOP VIDEO':'VIDEO 20S';
  ui.replaySpeed.disabled=videoActive;
  ui.replaySound.textContent=audioSoundEnabled?'SOUND ON':'SOUND OFF';
  ui.replaySound.setAttribute('aria-pressed',String(audioSoundEnabled));
  ui.replaySpeed.title='Playback speed '+replayPlayback.rate+'× · Tap to change';
  ui.replaySpeed.setAttribute('aria-label',
    'Playback speed '+replayPlayback.rate+' times. Tap to select next speed');
  ui.replaySight.textContent=replayKnowledge.omniscient?'FULL VIEW':'TEAM SIGHT';
  const replaySightMode=replayKnowledge.observerId?'operator':
    replayKnowledge.omniscient?'full':'team';
  ui.replayDirectSight.value=replaySightMode;
  ui.replaySightTrigger.querySelector('small')!.textContent=replaySightMode.toUpperCase();
  ui.replaySightTrigger.setAttribute('aria-label','Visibility: '+replaySightMode+' sight');
  for(const b of ui.replaySightChoices.querySelectorAll<HTMLButtonElement>('[data-sight-choice]')){
    b.setAttribute('aria-pressed',String(b.dataset.sightChoice===replaySightMode));
    b.disabled=b.dataset.sightChoice==='operator'&&!replayKnowledge.hasContactEvidence;
  }
  ui.replayDirectSight.querySelector<HTMLOptionElement>('option[value="operator"]')!
    .disabled=!replayKnowledge.hasContactEvidence;
  ui.replayDirectTracers.setAttribute('aria-pressed',
    String(replayTraceMode!=='off'));
  // Both director lenses keep walls opaque but cut away the ceiling.
  // The tactical X-ray toggle must not influence either film audition.
  ui.replayDirectXray.disabled=replayCamera.mode==='director';
  ui.replayDirectXray.setAttribute('aria-pressed',
    String(replayCamera.mode!=='director'&&replayXrayOn));
  ui.replayDirectXray.title=replayCamera.mode==='director'?
    'Director: solid walls, removed ceiling; wall X-ray unavailable':
    replayXrayOn?'Selective Cutaway on: fade only blocking walls':
      'Selective Cutaway off: retain normal architectural opacity';
  ui.replayDirectDirector.setAttribute('aria-pressed',
    String(replayCamera.mode==='director'));
  ui.replayDirectLens.hidden=replayCamera.mode!=='director';
  ui.replayDirectLens.setAttribute('aria-pressed',
    String(replayCamera.lens!=='ortho'));
  const lensLabel=replayCamera.lens.toUpperCase();
  const camAvailable=replayDirector.camEligibleObservers.length>0;
  ui.replayDirectLens.setAttribute('aria-label',
    'Director lens: '+lensLabel+'. Tap to choose the next view');
  ui.replayDirectLens.title=camAvailable?
    'Director lens '+lensLabel+' · ORTHO / WIDE / CAM':
    'Director lens '+lensLabel+
      ' · reconstructed CAM needs recorded personal sight evidence';
  ui.replayDirectLens.querySelector('small')!.textContent=lensLabel;
  const canBodycam=stageAvailable&&replayBodycam.observers.includes(replayCamera.followId);
  ui.replayDirectBodycam.hidden=!replayBodycam.active&&replayCamera.mode!=='operator';
  ui.replayDirectBodycam.title=canBodycam?
    'Reconstructed operator camera from recorded observation evidence':
    'This replay lacks recorded personal sight evidence for this operator';
  ui.replayDirectBodycam.disabled=!replayBodycam.active&&!canBodycam;
  ui.replayDirectBodycam.setAttribute('aria-pressed',String(replayBodycam.active));
  ui.replayDirectBodycam.querySelector('small')!.textContent=replayBodycam.active?'EXIT':'CAM';
  ui.replayDirectBodycam.setAttribute('aria-label',replayBodycam.active?'Exit Bodycam':'Enter Bodycam');
  ui.replayDirectMount.hidden=!replayBodycam.active&&!autoCam;
  const activeMount=autoCam?replayCamera.camMount:replayBodycam.mount;
  ui.replayDirectMount.querySelector('small')!.textContent=
    activeMount==='chest'?'CHEST':'HEAD';
  ui.replayDirectMount.setAttribute('aria-label',
    (autoCam?'Director CAM':'Bodycam')+' mount: '+
    activeMount+'. Tap to switch head or chest');
  ui.replayDirectMount.title=autoCam?
    'Director CAM mount · follows every selected operator':
    'Bodycam head/chest mount';
  ui.replayDirectFree.hidden=replayCamera.mode==='free'&&!replayBodycam.active;
  ui.replayDirectFree.querySelector('small')!.textContent=replayBodycam.active?'EXIT':'FREE';
  ui.replayDirectFree.setAttribute('aria-label',replayBodycam.active?'Exit Bodycam camera':'Free camera');
  ui.replayContactLens.disabled=!replayKnowledge.hasContactEvidence;
  ui.replayContactLens.textContent=replayKnowledge.observerId?
    'CONTACTS: '+replayKnowledge.observerId.toUpperCase():'CONTACTS: TEAM';
  ui.replayContactLens.title=replayKnowledge.hasContactEvidence?
    'Only confirmed enemy contacts and own activity; team map remains shared':
    'This recording has no individual operator contact evidence';
  ui.replayContactNote.hidden=!replayKnowledge.observerId;
  ui.replayContactNote.textContent=replayBodycam.active?
    'RECONSTRUCTED FIRST PERSON · PERSONAL CONTACTS · STRUCTURAL MAP FROM SHARED RECORDING.':
    replayKnowledge.groundLensOn?
    'GOLD CELLS: INDIVIDUALLY OBSERVED FLOOR · WORLD OBJECTS STILL SQUAD STATE · 2D ONLY.':
    'PERSONAL CONTACTS / LAST-SEEN DOORS · MAP/PROPS REMAIN SQUAD KNOWLEDGE. SHOT PATHS HIDDEN.';
  ui.replayGroundLens.disabled=!replayKnowledge.observerId||
    !replayKnowledge.personalGround||replayBodycam.active;
  ui.replayBodycam.disabled=!stageAvailable||!replaying||
    replayBodycam.observers.length===0;
  ui.replayBodycam.textContent=replayBodycam.active?'BODYCAM ON':'BODYCAM OFF';
  ui.replayBodycam.setAttribute('aria-pressed',String(replayBodycam.active));
  ui.replayBodycamMount.disabled=!replayBodycam.active;
  ui.replayBodycamMount.textContent='MOUNT '+replayBodycam.mount.toUpperCase();
  ui.replayBodycamStatus.hidden=!replayBodycam.active&&!autoCam;
  if(autoCam&&camId){
    ui.replayBodycamStatus.textContent='DIRECTOR · '+
      bodycamDisclosureLabel(camId,replayCamera.camMount,
        replayBodycam.groundObservers.has(camId));
  }else if(replayBodycam.active&&replayKnowledge.observerId){
    ui.replayBodycamStatus.textContent=bodycamDisclosureLabel(
      replayKnowledge.observerId,replayBodycam.mount,
      replayBodycam.groundObservers.has(replayKnowledge.observerId));
  }else if(autoCam){
    ui.replayBodycamStatus.textContent=
      'DIRECTOR CAM · NO RECORDED PERSONAL CAMERA AVAILABLE';
  }
  ui.replayGroundLens.textContent=replayKnowledge.groundLensOn?
    'GROUND: PERSONAL':'GROUND: OFF';
  ui.replayGroundLens.setAttribute('aria-pressed',
    String(replayKnowledge.groundLensOn));
  ui.replayView.textContent=viewMode.toUpperCase();
  ui.replayQuickView.value=viewMode;
  ui.replayQuickView.disabled=replayBodycam.active;
  ui.replayViewTrigger.querySelector('small')!.textContent=
    viewMode==='plan2d'?'PLAN':viewMode.toUpperCase();
  ui.replayViewTrigger.setAttribute('aria-label','Perspective: '+viewMode);
  ui.replayViewTrigger.disabled=replayBodycam.active;
  for(const b of ui.replayViewChoices.querySelectorAll<HTMLButtonElement>('[data-view-choice]'))
    b.setAttribute('aria-pressed',String(b.dataset.viewChoice===viewMode));
  ui.replayView.disabled=replayBodycam.active;
  ui.replayFollow.textContent=replayCamera.follow?'FOLLOW '+replayCamera.followId.toUpperCase():'FOLLOW';
  ui.replaySquad.textContent=replayCamera.mode==='squad'?'SQUAD ON':'FOLLOW SQUAD';
  ui.replayDirector.textContent=replayCamera.mode==='director'?'DIRECTOR ON':'DIRECTOR OFF';
  ui.replayQuickCamera.value=replayCamera.mode==='operator'?
    'operator:'+replayCamera.followId:replayCamera.mode;
  for(const option of ui.replayQuickCamera.options){
    const value=option.value;
    const mode:ReplayCameraChoice=value.startsWith('operator:')?'operator':
      value as ReplayCameraChoice;
    option.disabled=resolvedReplayCamera(mode,viewMode as ReplayPerspective,
      stageAvailable,replayBodycam.active)!==mode;
  }
  ui.replayQuickCamera.disabled=replayBodycam.active;
  if(team(state).some(a=>a.id===selected))ui.replayInspectActor.value=selected;
  for(const b of ui.replayInspectActorButtons.querySelectorAll<HTMLButtonElement>('[data-follow-actor]'))
    b.setAttribute('aria-pressed',String(replayCamera.mode==='operator'&&
      b.dataset.followActor===replayCamera.followId));
  ui.replaySquad.setAttribute('aria-pressed',String(replayCamera.mode==='squad'));
  ui.replayDirector.setAttribute('aria-pressed',String(replayCamera.mode==='director'));
  ui.replaySquad.disabled=viewMode==='plan2d'||!stageAvailable||replayBodycam.active;
  ui.replayDirector.disabled=viewMode==='plan2d'||!stageAvailable||replayBodycam.active;
  ui.replayFollow.disabled=viewMode==='plan2d'||!stageAvailable||replayBodycam.active;
  ui.replayAnalysis.textContent=replayAnalysis?'ANALYSIS ON':'ANALYSIS';
  ui.replayPlans.textContent='PLANS '+replayPlanScope.toUpperCase();
  ui.replayPlanVersion.textContent='PLAN '+replayPlanVersion.toUpperCase();
  ui.replayNames.textContent=replayNameTags?'NAMES ON':'NAMES OFF';
  analysisUi.syncReplayOverlayChoices();
  ui.replayTraces.textContent='TRACES '+replayTraceMode.toUpperCase();
  ui.replayGhosts.textContent='GHOSTS '+replayGhostMode.toUpperCase();
  ui.replayTrails.textContent='ACTUAL PATH '+replayTrailMode.toUpperCase();
  ui.replayPlans.setAttribute('aria-pressed',String(replayPlanScope!=='none'));
  ui.replayNames.setAttribute('aria-pressed',String(replayNameTags));
  for(const button of ui.replayPresets.querySelectorAll<HTMLButtonElement>('[data-replay-preset]'))
    button.setAttribute('aria-pressed',String(button.dataset.replayPreset===replayPreset));
  ui.replayPresetStatus.textContent=replayPreset==='custom'?'CUSTOM SETTINGS':'';
  ui.replayShareToggle.textContent=videoActive?'■ STOP VIDEO':'SAVE / SHARE';
  const replaySaved=!!(library.activeSavedReplayId||library.isRecorderSaved(recorder));
  ui.replaySaveArchive.disabled=library.busy||replaySaved;
  ui.replaySaveArchive.textContent=replaySaved?'SAVED TO LIBRARY':'SAVE REPLAY';
  ui.replayShareToggle.setAttribute('aria-label',videoActive?
    'Stop replay video recording':'Open replay save and share');
  ui.replayPrevEvent.disabled=!analysisUi.replayEventIndex?.previous(replayPlayback.time);
  ui.replayNextEvent.disabled=!analysisUi.replayEventIndex?.next(replayPlayback.time);
  const event=analysisUi.replayEventIndex?.latest(replayPlayback.time+.14);
  ui.replayEventText.textContent=event&&replayPlayback.time-event.t<6.5?
    formatReplayTime(event.t)+' · '+event.text:
    replayPlayback.time<.5?'TAP AN OPERATOR TO FOLLOW · PLAYBACK STARTING':
    'NO RECENT RECORDED ACTION';
  const status=videoActive?'● RECORDING':
    replayPlayback.incident?.loop?'INCIDENT LOOP':
    replayPlayback.incident?'WATCHING MOMENT':
    replayPlayback.loopEnabled?'A/B LOOP':
    replayCamera.mode==='director'&&performance.now()<replayDirector.editNoticeUntil?
      'DIRECTOR EDIT · +'+replayDirector.editNoticeSeconds.toFixed(1)+'S':'';
  ui.replayStatusChip.textContent=status;
  ui.replayStatusChip.hidden=!status;
  analysisUi.syncReplayEventFeed();
}

 return {bind,bindQuickInteractions,bindDirectInteractions,bindLateInteractions,followReplayOperator,update:updateReplayHud,populateInspectActors,populateCameraChoices};
}
