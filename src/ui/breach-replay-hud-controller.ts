/** Stage 4: replay toolbar, camera and historical disclosure UI.
 * No game authority, no listeners created from a render refresh.
 */
import {team,type Session} from '../breach-game.ts';
import type {MissionRecorder} from '../breach-replay.ts';
import type {ReplayPlaybackController} from '../breach-replay-playback-controller.ts';
import type {ReplayCameraController} from '../breach-replay-camera-controller.ts';
import type {ReplayKnowledgeController} from '../breach-replay-knowledge-controller.ts';
import type {ReplayBodycamController} from '../breach-replay-bodycam-controller.ts';
import type {ReplayPresentationOptions} from '../breach-replay-presentation-options.ts';
import type {ViewMode} from '../breach-3d.ts';
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
 replayViewChoices:HTMLElement;
 replayViewTrigger:HTMLButtonElement;
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
}){
 let bound=false;
 function bind():void{
  if(bound)return;
  bound=true;
  for(const button of config.ui.replayOverlayChoices
    .querySelectorAll<HTMLButtonElement>('[data-overlay-choice]')){
    button.addEventListener('click',()=>{
      const choice=button.dataset.overlayChoice;
      if(!choice)return;
      config.onOverlayChoice(choice);
      updateReplayHud();
    });
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

 return {bind,update:updateReplayHud};
}
