import {
  createBreachCanvasGestureController,type TacticalPointer}
 from './breach-canvas-gesture-controller.ts';
import {dispatchTacticalPointerRelease} from './breach-pointer-command-controller.ts';
import {installTouchCommandHelp as bindTouchCommandHelp}
 from './ui/touch-command-help.ts';
import {
  W,H,
  doorCenter,type Pt,} from './breach-core.ts';
import {
  type Session,
  type TeamActor,team,planMove,
  planNearbyInteraction,planAim,planWatch,retargetActiveWatch,
  setFirePolicy,planWait,plannedControl,planDoorFlash,
  planSync,finalPoint,backOne,
  clearPlan,undoPlan,redoPlan,
  posture,toggleContactRule,toggling,
  planReload,reloadNow,planFlash,
  equipWeaponChoice,toggleWeaponLight,planMedicalTreatment,planCasualtyTransport,
  planRecoverMedical
} from './breach-game.ts';
import {TacticalScene3D,type ViewMode} from './breach-3d.ts';
import {createBreach2DWorldRenderer} from './breach-2d-world-renderer.ts';
import {createBreach2DActorRenderer} from './breach-2d-actor-renderer.ts';
import {createBreach2DVisibilityRenderer} from './breach-2d-visibility-renderer.ts';
import {createBreach2DReplayOverlays} from './breach-2d-replay-overlays.ts';
import {createBreach2DRouteOverlays} from './breach-2d-route-overlays.ts';
import {createBreach2DProjectedOverlays} from './breach-2d-projected-overlays.ts';
import {executionStatus} from './breach-execution-state.ts';

import {shouldAppendStrokePoint}
 from './ui/touch-hit-targets.ts';
import type {TacticalPick} from './ui/tactical-target-resolver.ts';
import {pickTacticalTarget,insertTacticalRouteWaypoint} from './breach-tactical-picking.ts';
import {activeWatchTarget} from './ui/active-watch-marker.ts';
import {aimTargetFromTap} from './ui/aim-target.ts';

import {SQUEEZE_RADIUS} from './breach-navigation.ts';
import {equipmentTrainingSite} from './equipment-training-range.ts';
import {captureRangeTrial,type RangeTrial} from './equipment-training-diagnostics.ts';
import type {Site} from './breach-site.ts';
import {BreachMissionController,type MissionTransition} from './breach-mission-controller.ts';
import {createBreachQuickPlayController} from './breach-quickplay-controller.ts';
import {createBreachCampaignFlow} from './breach-campaign-flow.ts';
import {createOperatorStudioBridge} from './operator-studio-bridge.ts';
import {createBreachEquipmentEditorBridge} from './breach-equipment-editor-bridge.ts';
import {createBreachOperationsBoardController} from './breach-operations-board-controller.ts';
import {createBreachRuntimeLoop} from './breach-runtime-loop.ts';
import {createBreachAppFlow} from './breach-app-flow.ts';
import {parseBreachBootConfig,BREACH_LIGHTING_MODES} from './breach-boot-config.ts';
import {loadIntelPreference,loadQuickPlayRoster,saveQuickPlayRoster,
 loadCampaignFromStorage,saveCampaignToStorage} from './breach-persistence.ts';
import {createReplayModeController} from './breach-replay-mode-controller.ts';
import {afterActionSnapshot} from './ui/breach-after-action-controller.ts';
import {makeAfterActionLaunchRequest} from './breach-after-action-replay-navigation.ts';
import {highlightCapture} from './breach-highlight-capture.ts';
import {replayHighlightMoments} from './breach-highlight-frames.ts';
import {restoreAfterActionWorkspace} from './ui/breach-after-action-controller.ts';
import {createBreachReplayPresentationController} from './breach-replay-presentation-controller.ts';
import {createReplayPresentationOptions} from './breach-replay-presentation-options.ts';
import type {MissionStartSnapshot} from './breach-mission-restart.ts';
import type {FavoriteMission} from './breach-mission-favorites.ts';
import {compileMissionFacts} from './briefing/mission-facts.ts';
import {createOperationDossier} from './briefing/briefing-composer.ts';
import {attachCampaignDossierContext} from './briefing/campaign-context.ts';
import {issuedWedges} from './equipment-entry-tools.ts';

import {mostUrgentWound} from './breach-medical-wounds.ts';
import {treatmentSupplyForWound} from './breach-medical-treatment.ts';

import type {SiteScale} from './breach-site.ts';
import type {LightingMode} from './equipment-site-lighting.ts';
import {createBreachAudioController} from './breach-audio-controller.ts';
import {ReplayPlaybackController} from './breach-replay-playback-controller.ts';
import {createBreachReplayTimelineController}
  from './ui/breach-replay-timeline-controller.ts';
import {createBreachReplayAnalysisController}
  from './ui/breach-replay-analysis-controller.ts';
import {ReplayKnowledgeController} from './breach-replay-knowledge-controller.ts';
import {ReplayBodycamController} from './breach-replay-bodycam-controller.ts';
import {ReplayCameraController} from './breach-replay-camera-controller.ts';
import {createBreachReplayLibraryController}
  from './ui/breach-replay-library-controller.ts';
import {resolvedReplayCamera,type ReplayCameraChoice,type ReplayPerspective}
  from './breach-replay-ui-state.ts';
import type {RecordedShot} from './breach-replay-ballistics.ts';
import {ReplayQuickVideo} from './breach-replay-video.ts';
import {ReplayMovementHistory} from './breach-replay-movement-history.ts';
import {measureReplaySquadDoorEntry,type ReplaySquadEntryReview}
  from './breach-replay-squad-entry.ts';
import {operatorContactAvailable} from './breach-replay-contact-lens.ts';
import type {ReplayPresentation} from './breach-replay-motion.ts';
import {WEAPONS} from './breach-combat.ts';
import {fitMagazineInventory}
 from './arsenal/live-magazine-capacity.ts';

import {stageMagazines} from './equipment-magazine-placement.ts';
import {doorReachable} from './breach-door.ts';

import {doorKnown,intelPassable,type IntelMode} from './breach-intel.ts';
import {DisplayRouteCache} from './breach-route-cache.ts';
import {ProjectedRouteCache} from './breach-plan-projection-cache.ts';
import {applyRosterIdentity,freshQuickPlayRoster} from './breach-roster.ts';
import {tacticalSlotOperator,type CampaignState} from './campaign-state.ts';
import {loadMovementScale,equippedFlashCharges} from './equipment-loadouts.ts';
import {initialArmorIntegrity} from './equipment-armor.ts';
import {allocateFlashSupply} from './equipment-supply.ts';
import './breach-style.css';
import './ui/ux-r1-sheets.css';
import './ui/ux-r3-hud.css';
import './ui/fieldwork-action-toast.css';
import {confirmFieldworkAction} from './ui/fieldwork-controls.ts';
import {createBreachMissionScreens} from './ui/breach-mission-screens.ts';



import {tacticalIcon,tacticalIconForState} from './ui/tactical-icons.ts';
import {createBreachUiElements,requiredBreachElement as el} from './ui/breach-ui-elements.ts';
import {createTacticalHudController} from './ui/tactical-hud-controller.ts';
import {createTacticalInteractionState} from './breach-tactical-interaction-state.ts';
import {createBreachTacticalFrameFeedbackController} from './ui/breach-tactical-frame-feedback-controller.ts';
import {createBreachReplayHudController} from './ui/breach-replay-hud-controller.ts';
import {createTacticalPaletteController} from './ui/tactical-palette-controller.ts';
import {dispatchTacticalContextCommand} from './breach-tactical-context-command.ts';

const canvas=el<HTMLCanvasElement>('breachCanvas');
const feedbackLayer=document.createElement('canvas');
feedbackLayer.id='tacticalFeedback';
feedbackLayer.setAttribute('aria-hidden','true');
document.body.append(feedbackLayer);
const feedbackDraw=feedbackLayer.getContext('2d');
const targeting=createTacticalInteractionState();
const hudController=createTacticalHudController(targeting);
const tacticalFeedback=hudController.feedback;
const ctx=canvas.getContext('2d');
if(!ctx)throw Error('Canvas 2D unavailable');
const draw:CanvasRenderingContext2D=ctx;
const ui=createBreachUiElements();
const randomSiteSeed=()=>{
  const bytes=new Uint32Array(1);
  if(typeof crypto!=='undefined'&&crypto.getRandomValues)crypto.getRandomValues(bytes);
  return bytes[0]||((Date.now()^Math.floor(Math.random()*1e9))>>>0);
};
const bootConfig=parseBreachBootConfig(location.search);
// The procedural dossier is the standard briefing; ?briefingV2=0 is an
// optional troubleshooting escape hatch, never a mission rule change.
const briefingPreviewEnabled=bootConfig.briefingPreviewEnabled;
function buildPreviewDossier(session:Session,risk?:1|2|3){
  if(!briefingPreviewEnabled||!session.site)return undefined;
  try{
    const dossier=createOperationDossier(compileMissionFacts(session,{contractRisk:risk}));
    return appFlow.mode==='mission'?
      attachCampaignDossierContext(dossier,campaign):dossier;
  }
  catch(error){
    // Narrative validation must never prevent a valid tactical mission loading.
    console.warn('[Briefing] Safe static contract fallback',error);
    return undefined;
  }
}
// Live civilian field testing is enabled in ordinary Quick Play/Campaign.
// ?civilians=0 is a deliberate rollback switch while testing on phones;
// seeded population limits, rescue compatibility and fog rules are unchanged.
const civilianPreview=bootConfig.civilianPreview;
const legacyStudy=bootConfig.legacyStudy;
const initialSiteSeed=bootConfig.requestedSeed??randomSiteSeed();
let selectedIntelMode:IntelMode=loadIntelPreference();
const requestedCondition=bootConfig.requestedCondition;
let selectedLightingMode:LightingMode=bootConfig.lighting;
let requestedSiteScale:SiteScale=bootConfig.scale;
// Browser saves are optional; Quick Play migration preserves cosmetics only.
let persistentRoster=loadQuickPlayRoster();
function saveRoster():boolean{
 return saveQuickPlayRoster(persistentRoster);
}
let campaign:CampaignState|null=loadCampaignFromStorage();
const appFlow=createBreachAppFlow(
 legacyStudy||bootConfig.quickEntry?'quick':'menu');
function saveCampaign():boolean{
 if(!campaign)return false;
 const saved=saveCampaignToStorage(campaign);
 if(!saved)console.warn('Campaign save unavailable');
 return saved;
}
const studioBridge=createOperatorStudioBridge({
  getCampaign:()=>campaign,setCampaign:value=>{campaign=value;},
  getRoster:()=>persistentRoster,setRoster:value=>{persistentRoster=value;},
  getMode:()=>appFlow.mode,getSelected:()=>selected,
  getSession:()=>state,isReplaying:()=>replaying,
  saveRoster,saveCampaign,
  applyQuickRoster:()=>applyRosterIdentity(state,persistentRoster),
  onQuickSaved:()=>{renderOperationsBoard();updateHud();},
  onCampaignSaved:()=>showCampaignHome()
});
const openOperatorStudio=studioBridge.open;
function applyCampaignSkills(session:Session){
 if(appFlow.mode!=='mission'||!campaign)return;
 for(const a of team(session)){
  const m=tacticalSlotOperator(campaign,a.id);
  if(m){
   a.name=m.callsign;a.skills={...m.skills};a.weapon=m.weapon;
   a.appearanceSeed=m.appearanceSeed;
   a.wardrobe=m.wardrobe;
   a.equipment=m.loadout;
    a.weaponConfiguration=m.weaponConfiguration;
    a.medicalSupplies={...m.medicalSupplies};
    a.wedgeRemaining=issuedWedges(m.loadout);
    a.weaponLightOn=m.weaponConfiguration.slots.light==='light-compact';
   a.flashCharges=equippedFlashCharges(m.loadout);
   const protection=initialArmorIntegrity(m.loadout);
   a.armorIntegrity=Math.min(protection.torso,m.armorCondition.torso);
   a.helmetIntegrity=Math.min(protection.head,m.armorCondition.head);
   a.loadMovementScale=loadMovementScale(m.loadout,m.weaponConfiguration);
   const fitted=fitMagazineInventory(a.id,a.weapon,m.weaponConfiguration,
    m.magazine,m.reserve,m.magazines);
   a.magazine=fitted.magazine;a.reserve=fitted.reserve;
   a.insertedMagazineId=m.loadedMagazineId;
   a.spareMagazines=a.weapon==='shotgun'?[]:
    stageMagazines(fitted.magazines,m.loadout);
   if(m.recoveryDays>0&&m.injuries>0){
    a.injuryStage=Math.max(a.injuryStage,Math.min(2,m.injuries));
    a.health=Math.min(a.health,4-a.injuryStage);
   }
  }
 }
 if(!session.started){
  const squad=team(session);
  const issued=allocateFlashSupply(squad.map(a=>a.flashCharges),campaign.supplies.flash);
  squad.forEach((a,i)=>{a.flashCharges=issued[i];});
  session.flashRemaining=issued.reduce((n,qty)=>n+qty,0);
 }
}
// One lifetime owner: creation, initial snapshots, deployment staging,
// restart/favorite restoration, and replay presentation sessions.
const missionController=new BreachMissionController({
  preferences:()=>({
    legacyStudy,civilianPreview,requestedCondition,
    selectedIntelMode,requestedSiteScale,selectedLightingMode,
    mode:appFlow.mode
  }),
  randomSeed:randomSiteSeed,
  refreshQuickRoster:()=>{
    persistentRoster=freshQuickPlayRoster(persistentRoster);
  },
  applyRoster:session=>applyRosterIdentity(session,persistentRoster),
  applyCampaign:applyCampaignSkills,
  buildDossier:buildPreviewDossier
});
// Front menu intentionally has no site; Quick Play and fixed study are
// initialized exactly once, using the ordinary authoritative session factory.
let state:Session=missionController.create({
  variant:0,seed:initialSiteSeed,
  withoutSite:legacyStudy||appFlow.mode==='menu',initial:true
});
let recorder=missionController.recordInitial(state);
const deploymentButton=document.createElement('button');
deploymentButton.type='button';deploymentButton.id='deploymentChoice';
deploymentButton.setAttribute('aria-label','Cycle available insertion points');
ui.briefingEntryControls.append(deploymentButton);
missionController.bindDeployment({
  button:deploymentButton,label:ui.briefingEntryLabel,
  getSession:()=>state,isReplaying:()=>replaying,
  onSelected:()=>{recorder=missionController.recordInitial(state);},
  reducedMotion:()=>reducedMotionMedia.matches
});
const restoreFavoriteMission=(saved:FavoriteMission):void=>
  quickPlayController.restoreFavorite(saved);
function refreshDeployment():void{
  missionController.refreshDeployment(state,replaying);
}
const operationHistory=()=>campaignFlow.operationHistory();
const recordCompletedOperation=()=>campaignFlow.recordCompletedOperation();
let replaying=false;
const replayPlayback=new ReplayPlaybackController();

const replayQuickVideo=new ReplayQuickVideo(
  (blob,mime)=>{
    audioController.endVideoCapture();
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url;
    anchor.download='fieldwork-replay-'+(recorder.manifest?.site?.seed??'mission')+
      '-'+Math.floor(replayPlayback.time)+'s.'+(mime.includes('mp4')?'mp4':'webm');
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),12000);
    ui.replayExportVideo.textContent='VIDEO 20S';
    showUiHelp('REPLAY VIDEO EXPORTED',3000);
  },
  reason=>{
    console.warn('[Replay Video]',reason);
    audioController.endVideoCapture();
    ui.replayExportVideo.textContent='VIDEO 20S';
    showUiHelp(reason,3600);
  }
);
let replayPresentation:ReplayPresentation|null=null;
let finishedSession:Session|null=null;
const replayKnowledge=new ReplayKnowledgeController();
const replayDisplay=createReplayPresentationOptions();
/** Contact lens filters recorded hostile models/events only; environment is
 * still the shared team map until individual ground/door intel is recorded.
 */
/** Optional recorded floor-discovery overlay, not a full actor POV. */
const replayBodycam=new ReplayBodycamController();
function stopReplayBodycam():void{
  replayBodycam.stop(stage);
  ui.replayBodycamStatus.hidden=true;
}
function applyReplayBodycamMount():void{
  if(!replayBodycam.apply(stage,replayKnowledge.observerId))stopReplayBodycam();
}
function startReplayBodycam():boolean{
  const next=replayBodycam.start(replaying,stage,replayKnowledge.observerId);
  if(!next)return false;
  replayKnowledge.observerId=next;
  replayKnowledge.omniscient=false;replayKnowledge.groundLensOn=false;
  chooseReplayCamera('free');replayCamera.follow=false;
  selected=next;replayCamera.followId=next;
  replayAnalysisUi.closeReplayShotInspector();
  cameraMode('iso');
  applyReplayBodycamMount();
  fog2D.invalidate();return true;
}
const replayCamera=new ReplayCameraController();
const replayDirector=replayCamera.director;
let replayMovementHistory:ReplayMovementHistory|null=null;

let stage:TacticalScene3D|null=null;
let viewMode:ViewMode='iso';
try{stage=new TacticalScene3D();}
catch(error){console.warn('3D unavailable; reverting to tactical plan',error);
  viewMode='plan2d';}
/** All camera mode writes pass through the same availability policy. */
function chooseReplayCamera(mode:Parameters<ReplayCameraController['selectMode']>[0]):void{
  replayCamera.selectMode(mode,viewMode as ReplayPerspective,!!stage,replayBodycam.active);
}
// Explicit developer opt-in only; no hidden intelligence in normal gameplay.
const replayDirectorDiagnostics=bootConfig.replayDirectorDiagnostics;
const replayDirectorDebugPanel=replayDirectorDiagnostics?
  document.createElement('output'):null;
if(replayDirectorDebugPanel){
  replayDirectorDebugPanel.id='replayDirectorDiagnostics';
  Object.assign(replayDirectorDebugPanel.style,{
    position:'fixed',left:'8px',top:'134px',zIndex:'69',
    maxWidth:'210px',whiteSpace:'pre-wrap',pointerEvents:'none',
    padding:'7px',font:'11px/1.4 monospace',borderRadius:'5px',
    color:'#f4e7bc',background:'rgba(10,28,24,.87)'
  });
  replayDirectorDebugPanel.hidden=true;
  document.body.append(replayDirectorDebugPanel);
}
const navDiagnostics=bootConfig.navDiagnostics;
const navPanel=navDiagnostics?document.createElement('output'):null;
if(navPanel){
  navPanel.id='navDiagnostics';
  Object.assign(navPanel.style,{
    position:'fixed',left:'8px',top:'68px',zIndex:'70',
    pointerEvents:'none',background:'rgba(6,12,11,.83)',
    color:'#dce3c9',padding:'8px',font:'11px monospace',
    maxWidth:'210px',whiteSpace:'pre-wrap'
  });
  document.body.append(navPanel);
}
/** Optional, compact between-mission operations board.
 * No mandatory management screen blocks immediate mission deployment.
 */
const operationsToggle=document.createElement('button');
operationsToggle.id='operationsBoardToggle';operationsToggle.type='button';
operationsToggle.textContent='SQUAD';
operationsToggle.setAttribute('aria-label','Open Quick Play squad preparation and equipment');
operationsToggle.title='Edit squad and equipment before the mission';
(document.querySelector('.mode')??ui.siteSettings).append(operationsToggle);
let lastRangeTrial:RangeTrial|null=null;
const rangeTelemetry=document.createElement('aside');
rangeTelemetry.id='equipmentRangeTelemetry';
rangeTelemetry.hidden=true;
rangeTelemetry.style.cssText='position:fixed;top:65px;right:10px;z-index:15;'+
 'max-width:min(80vw,460px);padding:8px 12px;border:1px solid #6e9480;'+
 'border-radius:8px;background:#152421e8;color:#d9e7d6;'+
 'font:11px/1.6 Oxanium,sans-serif;pointer-events:none;white-space:pre-line';
rangeTelemetry.setAttribute('aria-label','Equipment range live metrics');
document.body.append(rangeTelemetry);
const operationsBoard=document.createElement('section');
operationsBoard.id='operationsBoard';
operationsBoard.hidden=true;
operationsBoard.setAttribute('aria-label','Squad operations board');
operationsBoard.className='fw-squad-sheet';
document.body.append(operationsBoard);
// Weapon choices are explicit: never change the selected weapon merely by opening a menu.
const weaponChooser=document.createElement('section');
weaponChooser.id='quickWeaponChooser';
weaponChooser.className='fw-weapon-chooser';
weaponChooser.hidden=true;
weaponChooser.setAttribute('role','group');
weaponChooser.setAttribute('aria-label','Choose selected operator weapon');
document.body.append(weaponChooser);
function hideWeaponChooser(){
 weaponChooser.hidden=true;
 ui.loadout.setAttribute('aria-expanded','false');
}
function showWeaponChooser(){
 const current=team(state).find(a=>a.id===selected);
 if(!current||appFlow.mode==='mission'||state.phase!=='planning'||replaying)return;
 collapseTacticalSheets('weapon');
 weaponChooser.replaceChildren();
 const label=document.createElement('div');
 label.className='fw-weapon-chooser-title';
 label.textContent='CHOOSE WEAPON · '+current.name;
 weaponChooser.append(label);
 for(const id of ['carbine','smg','rifle','shotgun'] as const){
  const btn=document.createElement('button');
  btn.type='button';btn.className='fw-button';
  btn.textContent=WEAPONS[id].label;
  btn.setAttribute('aria-pressed',String(id===current.weapon));
  btn.addEventListener('click',()=>{
   if(equipWeaponChoice(state,selected,id)){
    hideWeaponChooser();updateHud();
   }
  });
  weaponChooser.append(btn);
 }
 const cancel=document.createElement('button');
 cancel.type='button';cancel.className='fw-button fw-weapon-dismiss';
 cancel.textContent='CLOSE';
 cancel.addEventListener('click',hideWeaponChooser);
 weaponChooser.append(cancel);
 weaponChooser.hidden=false;
 ui.loadout.setAttribute('aria-expanded','true');
}
weaponChooser.addEventListener('keydown',event=>{
 if(event.key==='Escape'){event.preventDefault();hideWeaponChooser();ui.loadout.focus();}
});
/** Full Arsenal editor uses the same pure draft and resolver as the standalone gallery.
 * Quick Play commits remain in the transient roster; weapon/kit progress is not saved.
 */
const equipmentEditor=createBreachEquipmentEditorBridge({
 getRoster:()=>persistentRoster,setRoster:value=>{persistentRoster=value;},
 getCampaign:()=>campaign,setCampaign:value=>{campaign=value;},
 getSession:()=>state,getMode:()=>appFlow.mode,isReplaying:()=>replaying,
 saveCampaign,showHelp:showUiHelp,
 onQuickApplied:id=>{
   applyRosterIdentity(state,persistentRoster);
   operationsBoardController.onQuickApplied(id);updateHud();
 },
 onCampaignApplied:()=>showCampaignHome()
});
const openQuickArsenal=equipmentEditor.openQuickArsenal;
const openCampaignArsenal=equipmentEditor.openCampaignArsenal;
const operationsBoardController=createBreachOperationsBoardController({
 board:operationsBoard,toggleButton:operationsToggle,
 getSession:()=>state,getRoster:()=>persistentRoster,
 setRoster:value=>{persistentRoster=value;},
 getMode:()=>appFlow.mode,isReplaying:()=>replaying,
 saveRoster,applyRoster:()=>applyRosterIdentity(state,persistentRoster),
 refreshHud:updateHud,
 syncSheets:()=>missionScreens.syncSheets(),
 history:operationHistory,
 enterTrainingRange:()=>{
   appFlow.setMode('quick');lastRangeTrial=null;
   reset(state.variant,undefined,undefined,equipmentTrainingSite());
   showUiHelp('TEST RANGE · USE SUPPRESS TO FIRE AT TARGET PLATES',6500);
 },
 openStudio:id=>openOperatorStudio(id,'quick'),
 openArsenal:id=>{void openQuickArsenal(id);},showHelp:showUiHelp
});
const renderOperationsBoard=operationsBoardController.render;

const missionScreens=createBreachMissionScreens({
 ui,operationsBoard,operationsToggle,boot:bootConfig,
 onPresentationChange:visible=>{
  appFlow.briefingVisibility(visible.briefing);
  appFlow.settingsVisibility(visible.settings);
 },
 getSession:()=>state,getCampaign:()=>campaign,getMode:()=>appFlow.mode,
 isReplaying:()=>replaying,briefingPreviewEnabled,
 getEntryId:()=>missionController.entryId,
 hideWeaponChooser,hideContextPalette,
 getLighting:()=>selectedLightingMode,setLighting:v=>{selectedLightingMode=v;},
 getScale:()=>requestedSiteScale,setScale:v=>{requestedSiteScale=v;},
 getIntel:()=>selectedIntelMode,setIntel:v=>{selectedIntelMode=v;},
 lightingModes:BREACH_LIGHTING_MODES,
 showHelp:showUiHelp,refreshHud:updateHud,
 renderOperationsBoard,updateContext,
 renderFavorites:()=>replayLibrary.renderFavorites(),
 changeCamera:cameraMode,
 fitCamera:()=>{
   if(stage&&viewMode!=='plan2d')stage.resetCamera();
   else{zoom=1;panX=0;panY=0;layout();}
 },
 getFocusMode:()=>stage?.getMiniatureFocusMode(),
 setFocusMode:mode=>stage?.setMiniatureFocusMode(mode)
});
const collapseTacticalSheets=missionScreens.collapse;
const closeMissionSettings=missionScreens.closeSettings;
const showMissionBriefing=missionScreens.showBriefing;

let selected='rook';
// One presentation owner for dock/floating palette, touch pointer guard,
 // context command buttons, and screen-space obstruction avoidance.
const reducedMotionMedia=matchMedia('(prefers-reduced-motion: reduce)');
let lastAuthoringAt=0;
const paletteController=createTacticalPaletteController({
  context:ui.context,quickStates:ui.quickStates,tacticalHud:ui.tacticalHud,
  play:ui.play,briefingPanel:ui.briefingPanel,siteSettings:ui.siteSettings,
  hint:ui.hint,feed:ui.feed,
  worldToScreen:(p,z)=>worldToScreen(p,z),
  routePoints:(from,to)=>displayRouteCache.get(from,to,state.intel,true).points,
  iconFor:tacticalIconForState,makeIcon:tacticalIcon,
  installHelp:button=>installTouchCommandHelp(button),
  onLayoutChange:()=>updateContext()
});
function hideContextPalette():void{paletteController.hide();}
function advanceContextPalette(dt:number):void{paletteController.advance(dt);}
const auditRouteMode=bootConfig.auditRouteMode;
let selectedNode:number|null=null;
// Executed WATCH has no queued waypoint, but its targeting handle is selectable.
let selectedActiveWatch=false;
let doorMenuDismissedId:string|null=null;
let doorFocusId:string|null=null;
let draggingNode:Pt|null=null;
let draggingWatchTarget=false;
function cancelTargeting(){
  const hadTarget=targeting.cancel();
  if(hadTarget){
    const actor=uid(selected);
    if(actor)tacticalFeedback.emit('cancel',actor.p,'CANCELLED');
  }
  paletteController.invalidate();updateHud();
}

const audioController=createBreachAudioController({
  getContext:()=>({
    state,selected,bodycamActive:replayBodycam.active,
    observerId:replayKnowledge.observerId
  }),
  showUiHelp
});

const displayRouteCache=new DisplayRouteCache();
const projectedRouteCache=new ProjectedRouteCache();
let cssW=innerWidth,cssH=innerHeight,dpr=1;
let viewScale=1,ox=0,oy=0,zoom=1,panX=0,panY=0;
let cursor:Pt|null=null;
let previewHover=false;
let trace:Pt[]|null=null;
// Pointer state, pinch continuity and iOS missing-release recovery now live in
// the input controller. The read-only pointer map is used for HUD previews.
const tacticalGestures=createBreachCanvasGestureController(canvas);
const activePointers=tacticalGestures.activePointers;
const colors:Record<string,string>={
  rook:'#a2d4ca',moss:'#b9c6a0',ash:'#dfb992',vale:'#b7b1d9',
};
const colorFor=(id:string)=>colors[id]??'#d9c5a3';
// One palette shared by world routes and the operator's on-screen controls.
// Skip redundant style writes in the frequently refreshed tactical HUD.
function paintOperatorAccent(element:HTMLElement,id:string){
  const accent=colorFor(id);
  if(element.style.getPropertyValue('--operator-accent')!==accent)
    element.style.setProperty('--operator-accent',accent);
}
const squadIds=['rook','moss','ash','vale'] as const;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function layout(){
  const oldWidth=cssW,oldHeight=cssH;
  cssW=Math.max(1,innerWidth);cssH=Math.max(1,innerHeight);
  if((cssW!==oldWidth||cssH!==oldHeight)&&replayDirector.storyboard)
    replayDirector.storyboard.clear();
  dpr=Math.min(devicePixelRatio||1,2);
  feedbackLayer.width=Math.round(cssW*dpr);
  feedbackLayer.height=Math.round(cssH*dpr);
  feedbackLayer.style.width=cssW+'px';
  feedbackLayer.style.height=cssH+'px';
  canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);
  canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';
  stage?.resize(cssW,cssH);
  const available=Math.max(240,cssH-(cssH<500?85:172));
  const bounds=state.site?.bounds??{minX:0,minY:0,maxX:W,maxY:H};
  const width=bounds.maxX-bounds.minX,height=bounds.maxY-bounds.minY;
  const fit=Math.min((cssW-20)/width,available/height);
  viewScale=fit*zoom;
  ox=cssW/2-(bounds.minX+bounds.maxX)*viewScale/2+panX;
  oy=cssH/2-(bounds.minY+bounds.maxY)*viewScale/2-11+panY;
}
const toWorld=(x:number,y:number):Pt=>{
  if(stage&&viewMode!=='plan2d')return stage.screenToWorld(x,y)??{x:-500,y:-500};
  return {x:(x-ox)/viewScale,y:(y-oy)/viewScale};
};
const worldToScreen=(p:Pt,height=4):Pt=>
  stage&&viewMode!=='plan2d'?stage.project(p,height):
    {x:ox+p.x*viewScale,y:oy+p.y*viewScale};
function fitZoom(next:number,x=cssW/2,y=cssH/2){
  if(stage&&viewMode!=='plan2d'){
    stage.zoomAt(clamp(next,.65,6)/stage.view.zoom,x,y);
  }else{
    zoom=clamp(next,.65,4.8);layout();
  }
  updateContext();
}
function cameraMode(mode:ViewMode){
  if(replaying&&replayBodycam.active&&mode!=='iso')stopReplayBodycam();
  viewMode=stage?mode:'plan2d';
  if(replaying){
    if(viewMode!=='plan2d')replayKnowledge.groundLensOn=false;
    // Resolve follow/director compatibility for every perspective-change path,
    // including personal ground review and legacy advanced-view actions.
    chooseReplayCamera(resolvedReplayCamera(replayCamera.mode,
      viewMode as ReplayPerspective,!!stage,replayBodycam.active));
    
  }
  if(stage){stage.setMode(viewMode);stage.updateCamera(1);}
  for(const [m,button] of [['iso',ui.viewIso],
    ['top',ui.viewTop],['plan2d',ui.view2d]] as const){
    button.setAttribute('aria-pressed',String(m===viewMode));
  }
  paletteController.invalidate();updateHud();
}
function turnCamera(shift:number){
  if(stage&&viewMode!=='plan2d'){
    stage.rotate(shift);updateContext();
  }
}
const uid=(id:string)=>team(state).find(o=>o.id===id);
function selectUnit(id:string){
  const actor=uid(id);if(!actor||actor.health<=0)return;
  hideWeaponChooser();
  audioController.uiClickTone('select');selected=id;targeting.reset();
  selectedNode=null;selectedActiveWatch=false;doorFocusId=null;
  doorMenuDismissedId=null;updateHud();
}
// InteractionState owns temporary command arming; HUD owns guidance only.
// Only plan authoring APIs can commit an order.
function teach(key:string,description:string,duration=4200):void{
  hudController.teach(key,description,duration);
}
function showUiHelp(text:string,duration=4200):void{
  hudController.showHelp(text,duration);
}
function discoverAction(action:string,description:string):void{
  hudController.discoverAction(action,description);
}
const installTouchCommandHelp=(button:HTMLButtonElement)=>
  bindTouchCommandHelp(button,showUiHelp,updateHud);
function armFacing(mode:'look'|'watch'):void{
  if(state.phase!=='planning'||replaying)return;
  targeting.toggleFacing(mode,selectedNode);
  updateHud();
}
/** The tray never competes with the expanded TOOLS panel or GO/BACK. */
function focusedDoor(a:TeamActor,node:ReturnType<typeof selectedPlanNode>){
  const points=node?[node.p]:[finalPoint(a),a.p];
  const explicit=state.doors.find(d=>d.id===doorFocusId&&
    doorKnown(state.intel,d.id)&&
    points.some(p=>doorReachable(p,d)));
  if(explicit)return explicit;
  // A single pass preserves the stable first-door tie break without
  // allocating and sorting every reachable door on context refresh.
  let closest:typeof state.doors[number]|undefined;
  let closestDistance=Infinity;
  for(const door of state.doors){
    if(door.id===doorMenuDismissedId||!doorKnown(state.intel,door.id)||
       !points.some(p=>doorReachable(p,door)))continue;
    const center=doorCenter(door);
    let range=Infinity;
    for(const point of points)range=Math.min(range,distance(point,center));
    if(range<closestDistance){
      closest=door;
      closestDistance=range;
    }
  }
  return closest;
}
function selectedPlanNode(){
  return uid(selected)?.plan.find(n=>n.id===selectedNode);
}
/** The actor itself is HERE. Selected plan nodes own subsequent orders;
 * a door tap brings up ONLY door actions. No redundant HERE/END buttons. */
function updateContext(){
  if(state.phase!=='planning'||replaying||targeting.isArmed||
     !ui.briefingPanel.hidden||
     draggingNode||trace||
     !ui.siteSettings.hidden){
    hideContextPalette();return;
  }
  const a=uid(selected);
  if(!a||a.health<=0){hideContextPalette();return;}
  const node=selectedPlanNode();
  const selectedWatch=selectedActiveWatch?activeWatchTarget(a):null;
  // A watch ring is a sightline target, never a physical door/fixture.
  const nearbyDoor=selectedWatch?undefined:focusedDoor(a,node);
  const door=doorFocusId?nearbyDoor:undefined;
  paletteController.showFromAuthorizedState({
    state,actor:a,selected,node,selectedWatch,nearbyDoor,door,
    medicalCandidate:at=>medicalCandidate(selected,at),
    width:cssW,height:cssH,lastAuthoringAt
  });
}
// One shared long-press handler is installed on each actual command button.
// Duplicating a second timer on the palette caused conflicting 450/540ms holds.
const handleContextAction=(event:MouseEvent)=>{
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>(
    'button[data-action]');
  if(!button||state.phase!=='planning'||replaying)return;
  const action=button.dataset.action;
  if(action)discoverAction(action,button.title);
  const a=uid(selected);
  if(!a)return;
  const beforeErrors=state.events.length;
  const node=selectedPlanNode();
  const door=doorFocusId?focusedDoor(a,node):undefined;
  const result=dispatchTacticalContextCommand({
    state,selected,actor:a,node,door,action:action??'',
    selectedActiveWatch,
    medicalCandidate:at=>medicalCandidate(selected,at)
  });
  if(result.handled){
    if(result.clearSelection){
      selectedNode=null;selectedActiveWatch=false;
    }
    if(result.clearDoorFocus)doorFocusId=null;
    if(result.dismissDoorId!==undefined)
      doorMenuDismissedId=result.dismissDoorId;
    if(result.invalidateFog)fog2D.invalidate();
    if(result.skipFeedback){updateHud();return;}
  }else switch(action){
    case 'ctxSuppress':
      targeting.armSuppress();
      tacticalFeedback.emit('armed',node?.p??a.p,'SUPPRESS READY');
      audioController.uiClickTone('select');updateHud();return;
    case 'ctxFlash':
      if(state.flashRemaining>0)targeting.toggleFlash();
      break;
    case 'ctxLook':
      armFacing('look');
      if(targeting.isFacing)tacticalFeedback.emit('armed',
        node?.p??a.p,'TAP A DIRECTION');
      audioController.uiClickTone('select');return;
    case 'ctxDoor':{
      const available=focusedDoor(a,node);
      if(!available){state.events.push('NO KNOWN DOOR IN REACH');break;}
      doorFocusId=available.id;doorMenuDismissedId=null;
      audioController.uiClickTone('select');updateHud();return;
    }
    case 'ctxWatch':
      armFacing('watch');
      if(targeting.isFacing)tacticalFeedback.emit('armed',
        node?.p??a.p,'TAP WATCH TARGET');
      audioController.uiClickTone('select');return;
    case 'ctxPush':
      targeting.armPush();
      tacticalFeedback.emit('armed',node?.p??a.p,'PUSH DIRECTION');
      showUiHelp('TAP OR DRAG AWAY FROM THE OBJECT TO CHOOSE PUSH DIRECTION',3600);
      audioController.uiClickTone('select');updateHud();return;
    case 'ctxDoorFlash':
      if(!door){state.events.push('SELECT A DOOR FIRST');break;}
      targeting.armDoorFlash(door.id);
      doorFocusId=null;doorMenuDismissedId=door.id;break;
  }
  const failed=state.events.length>beforeErrors;
  hudController.completeAction(
    door?doorCenter(door):node?.p??a.p,
    failed?state.events.at(-1)??'ACTION BLOCKED':null,
    button.querySelector('.command-label')?.textContent??'',
    isFailure=>audioController.uiClickTone(isFailure?'warning':'command'));
  updateHud();
};
ui.context.addEventListener('click',handleContextAction);
ui.quickStates.addEventListener('click',handleContextAction);
function updateQuickStates():void{
  const actor=uid(selected)??null;
  hudController.renderQuickStates({
    state,replaying,actor,node:selectedPlanNode(),
    selectedActiveWatch,watchTargetPresent:!!(actor&&activeWatchTarget(actor)),
    quickStates:ui.quickStates,tacticalHud:ui.tacticalHud,scopeElement:ui.quickScope,
    iconFor:tacticalIconForState,icon:tacticalIcon,
    installHelp:installTouchCommandHelp,
    plannedControl:(nodeId)=>plannedControl(state,selected,nodeId)
  });
}
const siteIdentityOutput=el<HTMLOutputElement>('siteIdentity');
const frameFeedbackController=createBreachTacticalFrameFeedbackController({
 snapshot:()=>({
   state,replaying,selected,feedbackDraw,dpr,cssW,cssH,activePointers,
   cursor,previewHover,hudController,
   flashMode:targeting.flashMode,firePlacement:targeting.firePlacement,
   evacMode:targeting.evacMode,pushMode:targeting.pushMode,
   uid,selectedPlanNode,tacticalFeedback,worldToScreen,
   reducedMotion:reducedMotionMedia.matches
 }),
 warn:()=>audioController.uiClickTone('warning')
});
let fieldLightButton:HTMLButtonElement|null=null;
let medicalButton:HTMLButtonElement|null=null;
let dragButton:HTMLButtonElement|null=null;
let carryButton:HTMLButtonElement|null=null;
let retrieveButton:HTMLButtonElement|null=null;
function casualtyCandidate(id:string){
 const operator=team(state).find(o=>o.id===id&&o.health>0);
 if(!operator)return null;
 return team(state).filter(o=>o.health<=0&&!o.surrendered)
  .sort((a,b)=>distance(operator.p,a.p)-distance(operator.p,b.p))[0]??null;
}
function medicalCandidate(id:string,origin?:Pt){
 const a=team(state).find(o=>o.id===id&&o.health>0);
 if(!a)return null;
 const at=origin??a.p;
 return team(state).filter(o=>{
  const wound=mostUrgentWound(o.medical);
  return wound&&treatmentSupplyForWound(wound,a.medicalSupplies);
 }).sort((x,y)=>distance(at,x.p)-distance(at,y.p))[0]??null;
}

function updateHud(){
  appFlow.observePhase(state.phase);
  if(state.phase!=='planning')targeting.reset();
  if(!replaying&&state.phase==='planning')recorder.capturePlanning(state);
  recordCompletedOperation();
  refreshDeployment();
  missionScreens.syncBriefingCard();
  missionScreens.syncMissionPhase();
  missionScreens.syncNextSiteControls();
  replayLibrary.syncSavedButtons();
  updateQuickStates();
  hudController.renderSession({
    state,mode:appFlow.mode,replaying,selected,selectedNode,selectedActiveWatch,
    ui,siteIdentityOutput,rangeTelemetry,lastRangeTrial,
    medicalCandidate:()=>medicalCandidate(selected),casualty:casualtyCandidate(selected),
    paletteTether:paletteController.tether,paintOperatorAccent,colorFor,
    fieldLightButton,medicalButton,dragButton,carryButton,retrieveButton,navPanel,
    canvas,auditRouteMode,viewMode,cssW,cssH,worldToScreen,displayRouteCache,
    reducedMotion:reducedMotionMedia.matches,weaponChooser,hideWeaponChooser,
    favoriteActive:!!replayLibrary.activeFavoriteId,recorder,campaign,
    operationsLogged:operationHistory().length
  });
  updateContext();
}
function rect(x:number,y:number,w:number,h:number,color:string){
  draw.fillStyle=color;draw.fillRect(x,y,w,h);
}
function line(a:Pt,b:Pt,color:string,width:number){
  draw.beginPath();draw.moveTo(a.x,a.y);draw.lineTo(b.x,b.y);
  draw.lineWidth=width;draw.strokeStyle=color;draw.stroke();
}
function circle(x:number,y:number,r:number,color:string){
  draw.beginPath();draw.arc(x,y,r,0,2*Math.PI);draw.fillStyle=color;draw.fill();
}
/** Show the provisional segment neighbors while dragging an existing move
 * waypoint. It is deliberately a neutral DRAFT, not a promised walkable path.
 * It never probes hidden navigation state or mutates the authored plan. */
/** Persistent order failure anchors use only the operator's own observed
 * motor and authored waypoint; they cannot reveal unseen map geometry.
 */
function executionProblemStatus(a:TeamActor){
  if(replaying||!state.started||a.health<=0)return null;
  const status=executionStatus(a,{
    phase:'running',doors:state.doors,peers:team(state)
  });
  return status.kind==='blocked'&&status.orderId!==null?status:null;
}
function executionMarkerPoint(a:TeamActor,projected:boolean):Pt{
  if(projected){
    const ground=worldToScreen(a.p,24);
    return {x:ground.x+15,y:ground.y-22};
  }
  return {x:a.p.x+15,y:a.p.y-25};
}
const actor2D=createBreach2DActorRenderer({
 draw,rect,line,circle,colorFor,worldToScreen,
 replayKnowledge,executionProblemStatus,executionMarkerPoint,
 getFrame:()=>({state,replaying,selected,...replayDisplay.options,viewMode})
});
/** Bounded forensic overlay; complete shot evidence stays in recorder. */
function historicalShotVisible(shot:RecordedShot):boolean{
  // Shot endpoints and impacts reveal more than the confirmed observer's
  // recorded contacts. Keep forensic trajectories in Team/Full modes only.
  if(replayKnowledge.observerId)return false;
  if(replayKnowledge.omniscient||shot.side==='blue')return true;
  const frame=recorder.at(shot.recordedAt);
  return !!frame?.knowledge?.visibleActorIds.includes(shot.shooterId);
}
const route2D=createBreach2DRouteOverlays({
 draw,line,circle,uid,colorFor,displayRouteCache,
 getFrame:()=>({state,replaying,selected,selectedNode,selectedActiveWatch,
  draggingNode,draggingWatchTarget,trace,cursor,looking:targeting.isFacing,
  ...replayDisplay.options,recorder})
});
/** Gold denotes actual historically observed cells for the selected operator.
 * Shared geometry/doors/people remain shared and are NEVER claimed as POV.
 * Render only in the Floor Plan view; no speculative real-time raycasts.
 */
const fog2D=createBreach2DVisibilityRenderer({
 draw,getState:()=>state,isReplaying:()=>replaying,getViewMode:()=>viewMode,
 replayKnowledge,replayPlayback,
 debugPalette:bootConfig.fogDebugPalette
});
// Blood and bullet decals are part of the floor, not HUD sprites.
// Render beneath architecture AND fog so marks cannot float over walls
// or leak into an unrevealed room.
/** Shared 3D/2D light footprint, shaded beneath architecture and fog. */
const world2D=createBreach2DWorldRenderer({
 draw,rect,line,circle,getState:()=>state,isReplaying:()=>replaying,
 getDoorFocusId:()=>doorFocusId,replayKnowledge,replayPlayback
});
const replay2D=createBreach2DReplayOverlays({
 draw,worldToScreen,colorFor,historicalShotVisible,
 replayPlayback,replayCamera,replayBodycam,
 getFrame:()=>({state,replaying,selected,recorder,
   selectedReplayShotId:replayAnalysisUi.selectedReplayShotId,
   ...replayDisplay.options,viewScale,replayMovementHistory})
});
const projected2D=createBreach2DProjectedOverlays({
 draw,line,circle,uid,worldToScreen,colorFor,selectedPlanNode,
 displayRouteCache,projectedRouteCache,drawExecutionProblem:actor2D.drawExecutionProblem,
 replayKnowledge,replayCamera,route2D,replay2D,
 getFrame:()=>({state,replaying,selected,selectedNode,selectedActiveWatch,
  draggingNode,draggingWatchTarget,trace,...replayDisplay.options,
   doorFocusId,stage,cssW,cssH,dpr})
});
function render(){
  if(stage&&viewMode!=='plan2d'){
    if(stage.isReplayBodycamActive()){
      // Bodycam footage is a clean perspective, not an X-ray tactical HUD.
      // Keep accessible replay transport as DOM, clear only projected plans,
      // floating names, objective circles and selection rings.
      draw.setTransform(dpr,0,0,dpr,0,0);
      draw.clearRect(0,0,cssW,cssH);
      return;
    }
    projected2D.renderProjectedPlans();return;
  }
  draw.setTransform(dpr,0,0,dpr,0,0);
  draw.fillStyle='#141e20';draw.fillRect(0,0,cssW,cssH);
  // Map-space drawing has a single reversible projection.
  draw.save();
  draw.translate(ox,oy);draw.scale(viewScale,viewScale);
  draw.fillStyle='#52655b';draw.fillRect(-9,-9,W+18,H+18);
  world2D.terrain();world2D.furniture();world2D.renderGroundMarks();world2D.renderLightingMood2D();world2D.renderWeaponLights2D();
  world2D.architecture();fog2D.renderFog();fog2D.renderPersonalGround();actor2D.missionMarkers();
  route2D.paths();replay2D.renderReplayMovementHistory(false);
  for(const a of state.civilians)actor2D.civilianSprite(a);
  for(const a of state.operators)actor2D.sprite(a);
  if(!replaying||replayDisplay.options.replayAnalysis)
    for(const a of team(state))actor2D.drawExecutionProblem(a,false);
  actor2D.contacts();replay2D.renderReplayGhosts(false);replay2D.renderReplayBallistics(false);
  replay2D.renderReplayFollowMarker(false);actor2D.endMessage();
  draw.strokeStyle='#d4dac64f';draw.lineWidth=2;
  draw.strokeRect(0,0,W,H);
  draw.restore();
}
/** Rejected authoring orders keep the existing plan intact and mark only
 * the attempted world point; no hidden geometry or actors are inspected. */
function rejectAt(pt:Pt,reason:string):void{
 frameFeedbackController.rejectAt(pt,reason);
}
function useSelectedGround(pt:Pt){
  if(state.phase!=='planning'||replaying)return;
  if(targeting.pushMode){
    const accepted=planNearbyInteraction(state,selected,'push',
      selectedNode??undefined,pt);
    if(!accepted)rejectAt(pt,'NO PUSHABLE OBJECT IN REACH');
    else{
      targeting.reset();tacticalFeedback.emit('command',pt,'PUSH');
      audioController.uiClickTone('command');
    }
    updateHud();return;
  }
  const evacuation=targeting.evacMode;
  if(evacuation){
    targeting.reset();
    if(!planCasualtyTransport(state,selected,evacuation.patientId,pt,evacuation.mode))
      showUiHelp('CASUALTY ROUTE BLOCKED — CHOOSE A REACHABLE DESTINATION');
    updateHud();return;
  }
  if(targeting.firePlacement){
    const nodeId=selectedNode??undefined;
    const accepted=setFirePolicy(state,selected,'suppress',nodeId,pt);
    if(!accepted)rejectAt(pt,'INVALID SUPPRESSION POINT');
    else{
      tacticalFeedback.emit('command',pt,'SUPPRESS');
      audioController.uiClickTone('command');targeting.reset();
    }
    updateHud();return;
  }
  if(targeting.flashMode){
    const id=state.nextId,doorId=targeting.flashDoorId;
    const accepted=doorId?
      planDoorFlash(state,selected,doorId,pt):
      planFlash(state,selected,pt);
    if(!accepted)rejectAt(pt,'FLASH TARGET BLOCKED / OUT OF RANGE');
    else{
      tacticalFeedback.emit('command',pt,'FLASH');
      audioController.uiClickTone('command');
      selectedNode=doorId?state.nextId-1:id;
      targeting.reset();
    }
    updateHud();return;
  }
  if(targeting.isFacing){
    const placedId=state.nextId;
    const retargetingActive=targeting.facing.lookMode==='watch'&&selectedActiveWatch;
    const actor=uid(selected);
    const source=retargetingActive?actor?.p:selectedNode!==null?
      actor?.plan.find(node=>node.id===selectedNode)?.p:
      actor?(targeting.facing.armedOrigin==='here'?actor.p:finalPoint(actor)):null;
    const target=source?aimTargetFromTap(source,pt):null;
    const committed=!!target&&(retargetingActive?
      retargetActiveWatch(state,selected,target):
      targeting.facing.lookMode==='watch'?
        planWatch(state,selected,target,selectedNode??undefined,targeting.facing.armedOrigin):
        planAim(state,selected,'free',target,selectedNode??undefined,'look',targeting.facing.armedOrigin));
    if(!committed){
      rejectAt(pt,target?'AIM ORDER UNAVAILABLE':
        'AIM DIRECTION UNAVAILABLE · TAP AWAY FROM THE OPERATOR');
      showUiHelp('CHOOSE A LOOK / WATCH DIRECTION, OR CANCEL',3200);
    }
    else{
      tacticalFeedback.emit('command',target!,targeting.facing.lookMode==='watch'?'WATCH':'LOOK');
      audioController.playOrderCue(targeting.facing.lookMode==='watch'?'orders.watch':'orders.look');
      if(!retargetingActive&&selectedNode===null){
        selectedNode=placedId;selectedActiveWatch=false;
      }
      teach(targeting.facing.lookMode==='watch'?'watch-placed':'look-placed',
        targeting.facing.lookMode==='watch'?
          'WATCH stays on that point while moving. Drag its ring to adjust.':
          'LOOK checks that direction briefly, then returns to the route.',4100);
    }
    if(committed)targeting.reset();
    updateHud();return;
  }
  const beforeRoute=uid(selected)?finalPoint(uid(selected)!):pt;
  lastAuthoringAt=performance.now();
  if(!planMove(state,selected,pt))
    rejectAt(pt,!intelPassable(pt,state.intel)?
      'DESTINATION BLOCKED · CHOOSE NEARBY FLOOR':
      'NO WALKABLE ROUTE · CHECK DOOR OR PATH');
  else{
    selectedActiveWatch=false;
    selectedNode=uid(selected)?.plan.at(-1)?.id??null;
    tacticalFeedback.emit('route',pt,undefined,beforeRoute);
    audioController.playOrderCue('orders.waypoint');
    teach('waypoint-created',
      'Waypoint added. Drag to move it; choose LOOK / WATCH, or DELETE.',4900);
  }
  updateHud();
}
function isMissionTerminal(s:Session){return s.phase==='won'||s.phase==='lost';}
/** Reapply recorded outcomes after timeline navigation, then refresh dependent
 * camera/audio/visibility presentation. The playback controller owns samples.
 */
let replayPresentationController:ReturnType<typeof createBreachReplayPresentationController>|null=null;
function presentReplayAtCurrentTime():void{replayPresentationController?.presentReplayAtCurrentTime();}
function seekReplay(t:number):void{replayPresentationController?.seekReplay(t);}
function rebuildReplayEventIndex():void{replayPresentationController?.rebuildReplayEventIndex();}
function advanceReplayCamera(dt:number,instant=false):void{
 replayPresentationController?.advanceReplayCamera(dt,instant);
}

function clearReplayOverlays():void{
  replayDisplay.clearOverlays();
  // These are analysis/knowledge UI effects, never recorded sight edits.
  replayKnowledge.groundLensOn=false;
  replayAnalysisUi.selectedReplayShotId=null;
}

function applyReplayPreset(next:'clean'|'movement'|'combat'|'visibility'):void{
  replayDisplay.applyPreset(next);
  if(next==='clean'){
    // Preserve Clear's historical UI-side effects without expanding sight.
    replayKnowledge.groundLensOn=false;
    replayAnalysisUi.selectedReplayShotId=null;
  }else if(next==='visibility'){
    const details=ui.replayExtra.querySelector<HTMLDetailsElement>('[data-replay-group="view"]');
    if(details)details.open=true;
    // A visibility preset cannot change historical observer permissions.
  }
  updateReplayHud();
}
function populateReplayInspectActors():void{
  ui.replayInspectActor.replaceChildren();
  ui.replayInspectActorButtons.replaceChildren();
  for(const actor of team(state)){
    const option=document.createElement('option');
    option.value=actor.id;option.textContent=actor.name.toUpperCase();
    ui.replayInspectActor.append(option);
    const button=document.createElement('button');
    button.type='button';button.dataset.followActor=actor.id;
    button.textContent=actor.name.toUpperCase();
    button.title='Follow '+actor.name;
    button.addEventListener('click',()=>followReplayOperator(actor.id));
    ui.replayInspectActorButtons.append(button);
  }
}
function populateReplayCameraChoices():void{
  for(const option of ui.replayQuickCamera.querySelectorAll('option[data-actor]'))
    option.remove();
  for(const actor of team(state)){
    const option=document.createElement('option');
    option.value='operator:'+actor.id;option.dataset.actor=actor.id;
    option.textContent='FOLLOW '+actor.name.toUpperCase();
    ui.replayQuickCamera.append(option);
  }
}
let replayHudController:ReturnType<typeof createBreachReplayHudController>|null=null;
function updateReplayHud():void{replayHudController?.update();}
/** Display compact clusters, not dozens of overlapping tap targets.
 * The scrubber and event navigation remain the accessible interactions.
 */

const replayModeController=createReplayModeController({
 getSession:()=>state,setSession:next=>{state=next;},
 getFinishedSession:()=>finishedSession,
 setFinishedSession:next=>{finishedSession=next;},
 isReplaying:()=>replaying,setReplaying:next=>{replaying=next;},
 getRecorder:()=>recorder,getStage:()=>stage,
 createReplaySession:(film,live)=>missionController.createReplaySession(film,live),
 resumeLiveSession:live=>missionController.resumeLiveSession(live),
 playback:replayPlayback,camera:replayCamera,
 knowledge:replayKnowledge,bodycam:replayBodycam,
 getAnalysis:()=>replayAnalysisUi,
 ui:{replayPanel:ui.replayPanel,replayTopHud:ui.replayTopHud,
   replayRail:ui.replayRail,replaySeek:ui.replaySeek},
 resetTargeting:()=>{targeting.reset();},
 resetReplayOptions:()=>{replayDisplay.resetForReplay();},
 setXray:enabled=>{
   replayDisplay.patch({replayXrayOn:enabled});
   stage?.setReplayXray(enabled);
 },
 setMovementHistory:next=>{replayMovementHistory=next;},
 clearReplayPresentation:()=>{replayPresentation=null;},
 beginAudio:film=>{audioController.beginReplay(film);audioController.unlock();},
 endAudio:()=>audioController.endReplay(),
 stopVideo:()=>{if(replayQuickVideo.active)replayQuickVideo.stop();},
 stopBodycam:()=>stopReplayBodycam(),
 populateCameraChoices:populateReplayCameraChoices,
 populateInspectActors:populateReplayInspectActors,
 rebuildEventIndex:rebuildReplayEventIndex,
 seekReplay,invalidateFog:()=>fog2D.invalidate(),
 afterReplayExit:()=>{
   appFlow.exitReplay();
   replayLibrary.afterReplayExit();
 },
 updateHud
});
function enterReplay(source:'library'|'debrief'='debrief'){
 if(replayModeController.enterReplay())appFlow.beginReplay(source);
}
let afterActionReturn:ReturnType<typeof afterActionSnapshot>=null;
function exitReplay(){
 const origin=afterActionReturn;
 const exited=replayModeController.exitReplay();
 if(exited&&origin){
   afterActionReturn=null;
   ui.afterActionClipHud.hidden=true;
   // Restore directly; no synthetic tab click, no accidental lost shot.
   restoreAfterActionWorkspace(ui.debrief,origin);
   updateHud();
 }
}
/** Replay Library: load metadata only until a recording is selected.
 * No campaign result, equipment persistence, or live session is modified.
 */
const replayLibrary=createBreachReplayLibraryController({
  ui:{
    replayLibraryDialog:ui.replayLibraryDialog,
    replayLibraryStatus:ui.replayLibraryStatus,
    replayLibraryList:ui.replayLibraryList,
    replayLibraryBackdrop:ui.replayLibraryBackdrop,
    replayImportButton:ui.replayImportButton,
    replayImportInput:ui.replayImportInput,
    openReplayLibrary:ui.openReplayLibrary,
    closeReplayLibrary:ui.closeReplayLibrary,
    saveReplayDebrief:ui.saveReplayDebrief,
    replaySaveArchive:ui.replaySaveArchive,
    favoriteMission:ui.favoriteMission,
    favoriteMissionsList:ui.favoriteMissionsList,
    replayExportJson:ui.replayExportJson
  },
  showUiHelp,closeMissionSettings,isReplaying:()=>replaying,
  getRecorder:()=>recorder,
  setRecorder:value=>{recorder=value;},
  getBookmarks:()=>replayAnalysisUi.replayBookmarks,
  applyLoadedBookmarks:marks=>replayAnalysisUi.restoreBookmarks(marks),
  enterReplay:()=>enterReplay('library'),exitReplay,refreshHud:updateHud,
  getFavoriteDraft:()=>state.site?{
    start:missionController.start,
    label:state.site.name+' · '+state.missionType.toUpperCase()
  }:null,
  playFavorite:restoreFavoriteMission,
  canPlayFavorite:()=>appFlow.mode!=='mission',
  hideCampaignScreen:()=>campaignScreen.hide(),
  onLibraryOpen:fromMenu=>{appFlow.openLibrary(fromMenu);},
  onLibraryClose:restore=>appFlow.closeLibrary(restore),
  returnToCampaignMenu:()=>{
    appFlow.setMode('menu');campaignScreen.entry(!!campaign);
  }
});
ui.watchReplay.addEventListener('click',()=>{
  replayLibrary.markDebriefEntry();enterReplay();
 if(replaying)highlightCapture.queue(recorder,replayHighlightMoments(recorder));
});
ui.debrief.addEventListener('fw-after-action-replay',event=>{
 const detail=(event as CustomEvent<{
   surface:string;contactId?:string;shotId?:number|null;time:number;
   end?:number
 }>).detail;
 if(!detail||replaying)return;
 const request=makeAfterActionLaunchRequest(recorder,detail);
 if(!request)return;
 const origin=afterActionSnapshot(ui.debrief);
 replayLibrary.markDebriefEntry();enterReplay();
 if(!replaying)return;
 afterActionReturn=origin;
 highlightCapture.queue(recorder,replayHighlightMoments(recorder));
 if(stage&&viewMode==='plan2d')cameraMode('iso');
 replayCamera.camMount='chest';replayCamera.lens='cam';
 // Prefer the recorded shooter's own bodycam when the recording supports
 // personal observation. Never select a hostile actor as an observer.
 const shot=detail.shotId==null?null:
   recorder.ballistics.shots.find(s=>s.id===detail.shotId)??null;
 const shooter=shot?.shooterId??null;
 const candidate=shooter&&replayBodycam.observers.includes(shooter)?shooter:
   detail.contactId&&replayBodycam.observers.includes(detail.contactId)?
     detail.contactId:null;
 if(stage&&candidate){
   replayKnowledge.observerId=candidate;
   if(!startReplayBodycam())chooseReplayCamera('director');
 }else if(stage&&replayDirector.camEligibleObservers.length){
   chooseReplayCamera('director');
 }else{
   replayCamera.lens='ortho';chooseReplayCamera('free');
   showUiHelp('BODYCAM UNAVAILABLE · TACTICAL REPLAY',3000);
 }
 replayPlayback.startIncident(request.range,recorder.duration,true,true);
 presentReplayAtCurrentTime();audioController.unlock();
 ui.afterActionClipHud.hidden=false;
 ui.afterActionClipLabel.textContent=request.label+' · LOOP';
 ui.afterActionClipToggle.textContent='UNCLIP';
 updateReplayHud();
});
ui.afterActionClipToggle.addEventListener('click',()=>{
 if(!replaying||!afterActionReturn)return;
 if(replayPlayback.incident){
   replayPlayback.unclipIncident();
   ui.afterActionClipToggle.textContent='RECLIP';
   ui.afterActionClipLabel.textContent='FULL REPLAY';
 }else if(replayPlayback.reclipIncident()){
   ui.afterActionClipToggle.textContent='UNCLIP';
   ui.afterActionClipLabel.textContent='INCIDENT · LOOP';
 }
 presentReplayAtCurrentTime();
});
const replayTimeline=createBreachReplayTimelineController({
  ui:{
    replayPlay:ui.replayPlay,replayMiniPlay:ui.replayMiniPlay,
    replayBack:ui.replayBack,replayForward:ui.replayForward,
    replayPrevFrame:ui.replayPrevFrame,replayNextFrame:ui.replayNextFrame,
    replayPrevSample:ui.replayPrevSample,replayNextSample:ui.replayNextSample,
    replayLoopIn:ui.replayLoopIn,replayLoopOut:ui.replayLoopOut,
    replayLoopToggle:ui.replayLoopToggle,
    replaySpeedChoices:ui.replaySpeedChoices,
    replaySpeedRange:ui.replaySpeedRange,replaySpeedValue:ui.replaySpeedValue,
    replayQuickSpeed:ui.replayQuickSpeed,replaySpeed:ui.replaySpeed,
    replaySeek:ui.replaySeek,replayClusterMenu:ui.replayClusterMenu
  },
  playback:replayPlayback,
  duration:()=>recorder.duration,
  samples:()=>recorder.frames,
  isVideoActive:()=>replayQuickVideo.active,
  seek:seekReplay,stopAudio:()=>audioController.stopReplaySounds(),
  unlockAudio:()=>audioController.unlock(),
  refreshHud:updateReplayHud,showHelp:showUiHelp
});

const replayAnalysisUi=createBreachReplayAnalysisController({
 ui,playback:replayPlayback,camera:replayCamera,knowledge:replayKnowledge,
 presentationOptions:replayDisplay,
 getRecorder:()=>recorder,getSession:()=>state,shotVisible:historicalShotVisible,
 seek:seekReplay,presentCurrent:presentReplayAtCurrentTime,refreshHud:updateReplayHud,
 selectActor:id=>{selected=id;},
 enableMovementAnalysis:()=>{
    replayDisplay.patch({
      replayAnalysis:true,replayPlanScope:'selected',
      replayPlanVersion:'active',replayTrailMode:'recent'
    });
  },
  markRecentTrace:()=>{replayDisplay.patch({replayTraceMode:'recent'});},
 applyPreset:applyReplayPreset,
 getOverlayState:()=>({
    names:replayDisplay.options.replayNameTags,
    contacts:replayDisplay.options.replayContactMarkers,
    plans:replayDisplay.options.replayPlanScope!=='none',
    objectives:replayDisplay.options.replayObjectiveMarkers
  }),
 isVideoActive:()=>replayQuickVideo.active,
 persistBookmarks:()=>replayLibrary.persistCurrentBookmarks(),
 unlockAudio:()=>audioController.unlock(),showHelp:showUiHelp,
 focusShot:shot=>{
   chooseReplayCamera('free');replayCamera.follow=false;replayPlayback.pause();
   if(stage&&viewMode!=='plan2d'){
     stage.view.focus={...shot.end};
     stage.view.zoom=Math.max(stage.view.zoom,1.7);
     stage.updateCamera(1);
   }else{
     const projected=worldToScreen(shot.end);
     panX+=cssW/2-projected.x;panY+=cssH/2-projected.y;
     layout();
   }
   updateReplayHud();
 }
});
replayPresentationController=createBreachReplayPresentationController(()=>({
 ui,replayQuickVideo,audioController,replayDirector,
 get stage(){return stage;},replayPlayback,
 get recorder(){return recorder;},get state(){return state;},
 get replayPresentation(){return replayPresentation;},
 set replayPresentation(v){replayPresentation=v;},
 fog2D,replayAnalysisUi,updateReplayHud,replayKnowledge,
 get cssW(){return cssW;},get cssH(){return cssH;},replayCamera,
 get replaying(){return replaying;},get viewMode(){return viewMode;},
 replayBodycam,replayDirectorDebugPanel,historicalShotVisible
}));
replayHudController=createBreachReplayHudController({
 ui,snapshot:()=>({
   state,recorder,replayPlayback,replayCamera,replayKnowledge,replayBodycam,
   videoActive:replayQuickVideo.active,
   library:replayLibrary,analysisUi:replayAnalysisUi,viewMode,
   stageAvailable:!!stage,selected,replaying,
   presentationOptions:replayDisplay.options,
    audioSoundEnabled:audioController.replaySoundEnabled
 }),
 presentation:{
  options:replayDisplay,
  setXray:enabled=>stage?.setReplayXray(enabled)
 },
 onOverlayChoice:choice=>{
   const options=replayDisplay.options;
   replayDisplay.setPreset('custom');
   if(choice==='names')replayDisplay.patch({replayNameTags:!options.replayNameTags});
   else if(choice==='contacts')replayDisplay.patch({
     replayContactMarkers:!options.replayContactMarkers});
   else if(choice==='plans')replayDisplay.patch({
     replayPlanScope:options.replayPlanScope==='none'?'selected':'none'});
   else if(choice==='objectives')replayDisplay.patch({
     replayObjectiveMarkers:!options.replayObjectiveMarkers});
   else if(choice==='clear')clearReplayOverlays();
   else if(choice==='show')replayDisplay.patch({
     replayNameTags:true,replayContactMarkers:true,
     replayPlanScope:'selected',replayObjectiveMarkers:true
   });
   if(choice==='clear'||choice==='show')replayAnalysisUi.closeReplayChoices();
 }
});
replayHudController.bind();
replayAnalysisUi.bindReplayUi();
ui.replayQuickView.addEventListener('change',()=>{
  if(replayBodycam.active)return;
  const next=ui.replayQuickView.value as ReplayPerspective;
  if(!['iso','top','plan2d'].includes(next))return;
  cameraMode(next);
  chooseReplayCamera(resolvedReplayCamera(replayCamera.mode,next,!!stage,replayBodycam.active));
  
  updateReplayHud();
});
ui.replayInspectActor.addEventListener('change',()=>{
  const id=ui.replayInspectActor.value;
  if(!team(state).some(a=>a.id===id))return;
  selected=id;
  if(replayCamera.mode==='operator'){
    replayCamera.followId=id;advanceReplayCamera(0,true);
  }
  updateReplayHud();
});
ui.replayInspectFollow.addEventListener('click',()=>{
  const id=ui.replayInspectActor.value;
  if(!team(state).some(a=>a.id===id)||replayBodycam.active)return;
  if(viewMode==='plan2d')cameraMode('iso');
  selected=id;replayCamera.followId=id;chooseReplayCamera('operator');replayCamera.follow=true;
  advanceReplayCamera(0,true);updateReplayHud();
});
ui.replayInspectMovement.addEventListener('click',()=>{
  const id=ui.replayInspectActor.value;
  if(!team(state).some(a=>a.id===id))return;
  selected=id;applyReplayPreset('movement');
});
ui.replayQuickCamera.addEventListener('change',()=>{
  if(replayBodycam.active)return;
  const choice=ui.replayQuickCamera.value;
  const mode:ReplayCameraChoice=choice.startsWith('operator:')?
    'operator':choice as ReplayCameraChoice;
  if(!['free','operator','squad','director'].includes(mode)||
      resolvedReplayCamera(mode,viewMode as ReplayPerspective,!!stage,replayBodycam.active)!==mode)
    return;
  if(mode==='operator'){
    const id=choice.slice('operator:'.length);
    if(!team(state).some(a=>a.id===id))return;
    replayCamera.followId=id;
  }
  chooseReplayCamera(mode);replayCamera.follow=mode==='operator';
  advanceReplayCamera(0,true);updateReplayHud();
});

audioController.bindReplayMute(ui.replaySound,updateReplayHud);
function changeReplaySight(mode:'team'|'full'|'operator'):void{
  if(mode==='operator'){
    if(!replayKnowledge.hasContactEvidence)return;
    const eligible=replayBodycam.observers;
    const next=eligible.includes(replayCamera.followId)?replayCamera.followId:
      eligible.includes(selected)?selected:eligible[0];
    if(!next)return;
    replayKnowledge.observerId=next;
    replayKnowledge.omniscient=false;
    replayAnalysisUi.closeReplayShotInspector();
    if(replayBodycam.active)applyReplayBodycamMount();
  }else{
    if(replayBodycam.active)stopReplayBodycam();
    replayKnowledge.groundLensOn=false;replayKnowledge.observerId=null;
    replayKnowledge.omniscient=mode==='full';
  }
  fog2D.invalidate();
  rebuildReplayEventIndex();
  replayAnalysisUi.renderReplayEventMarkers();replayAnalysisUi.renderReplayEventFeed();
  replayAnalysisUi.refreshReplayShotInspector();updateReplayHud();
}
function followReplayOperator(id:string):void{
  if(!replaying||!team(state).some(a=>a.id===id&&a.health>0))return;
  if(replayBodycam.active)stopReplayBodycam();
  if(viewMode==='plan2d'&&stage)cameraMode('iso');
  selected=id;replayCamera.followId=id;
  chooseReplayCamera('operator');replayCamera.follow=true;
  if(replayKnowledge.observerId){
    replayKnowledge.observerId=replayBodycam.observers.includes(id)?id:null;
    fog2D.invalidate();rebuildReplayEventIndex();
    replayAnalysisUi.renderReplayEventMarkers();replayAnalysisUi.renderReplayEventFeed();
  }
  advanceReplayCamera(0,true);
  updateReplayHud();
}
ui.replayDirectSight.addEventListener('change',()=>{
  const mode=ui.replayDirectSight.value;
  if(mode==='team'||mode==='full'||mode==='operator')
    changeReplaySight(mode);
});


ui.replayDirectDirector.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  if(viewMode!=='iso'&&stage)cameraMode('iso');
  chooseReplayCamera(replayCamera.mode==='director'?'free':'director');
  replayCamera.follow=false;
  replayDirector.target=null;
  
  advanceReplayCamera(1/60,false);updateReplayHud();
});
ui.replayDirectLens.addEventListener('click',()=>{
  if(!replaying||replayCamera.mode!=='director')return;
  replayCamera.lens=replayCamera.lens==='ortho'?'wide':
    replayCamera.lens==='wide'&&replayDirector.camEligibleObservers.length?
      'cam':'ortho';
  // Mount is a viewer preference, not a director edit. No recorded
  // subject changes just because the lens changes.
  if(replayCamera.lens==='cam'&&viewMode!=='iso'&&stage)cameraMode('iso');
  advanceReplayCamera(0,true);
  updateReplayHud();
});
ui.replayDirectBodycam.addEventListener('click',()=>{
  if(replayBodycam.active){
    const returnId=replayCamera.followId;
    stopReplayBodycam();
    followReplayOperator(returnId);
  }else{
    if(replayCamera.mode!=='operator'||
      !replayBodycam.observers.includes(replayCamera.followId))return;
    replayKnowledge.observerId=replayCamera.followId;
    if(!startReplayBodycam())return;
  }
  fog2D.invalidate();rebuildReplayEventIndex();
  replayAnalysisUi.renderReplayEventMarkers();replayAnalysisUi.renderReplayEventFeed();
  updateReplayHud();
});
ui.replayDirectMount.addEventListener('click',()=>{
  if(replayCamera.mode==='director'&&replayCamera.lens==='cam'){
    replayCamera.camMount=replayCamera.camMount==='chest'?'helmet':'chest';
    advanceReplayCamera(0,true);updateReplayHud();
  }else ui.replayBodycamMount.click();
});
ui.replayDirectFree.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  chooseReplayCamera('free');replayCamera.follow=false;
  updateReplayHud();
});
ui.replaySight.addEventListener('click',()=>{
  stopReplayBodycam();
  replayKnowledge.groundLensOn=false;
  replayKnowledge.observerId=null;
  replayKnowledge.omniscient=!replayKnowledge.omniscient;fog2D.invalidate();
  rebuildReplayEventIndex();
  replayAnalysisUi.renderReplayEventMarkers();replayAnalysisUi.renderReplayEventFeed();
  replayAnalysisUi.refreshReplayShotInspector();updateReplayHud();
});
/** Only Vite DEVELOPMENT + explicit QA query can access this hook.
 * Production builds strip it; normal replay has NO Bodycam button yet.
 * Browser smoke uses historical replay disclosure, never simulated LOS.
 */
if(import.meta.env.DEV&&bootConfig.bodycamQa){
  type BodycamQa={
    activate:(mount:'chest'|'helmet')=>boolean;
    seek:(time:number)=>boolean;
    stop:()=>void;
    diagnostic:()=>ReturnType<TacticalScene3D['inspectReplayBodycamQa']>|null;
    /** Read-only candidate taps; browser must author with real pointer input. */
    routeCandidates:()=>Array<{world:Pt;screen:Pt}>;
    planned:()=>{actorId:string;path:Pt[]}|null;
    motionSamples:()=>Array<{at:number;p:Pt;heading:number}>;
    prepareIndoorEntry:()=>boolean;
    indoorEntryReview:()=>ReplaySquadEntryReview|null;
  };
  const qa:BodycamQa={
    activate(mount){
      if(!replaying||!stage||viewMode==='plan2d')return false;
      const observer=team(state)[0];
      if(!observer||!recorder.frames[0]?.knowledge?.operatorVisibleActorIds?.[observer.id])
        return false;
      replayKnowledge.observerId=observer.id;
      replayKnowledge.omniscient=false;
      replayKnowledge.groundLensOn=false;
      replayPlayback.pause();
      chooseReplayCamera('free');
      selected=observer.id;
      replayCamera.followId=observer.id;
      cameraMode('iso');
      stage.setReplayBodycam({actorId:observer.id,mount,
        stabilization:'balanced',fov:95});
      seekReplay(Math.min(.1,recorder.duration));
      updateReplayHud();
      return true;
    },
    seek(time){
      if(!replaying||!Number.isFinite(time))return false;
      replayPlayback.pause();
      seekReplay(Math.max(0,Math.min(time,recorder.duration)));
      return true;
    },
    stop(){
      stage?.setReplayBodycam(null);
      replayKnowledge.observerId=null;
      replayKnowledge.omniscient=false;
      fog2D.invalidate();
      if(replaying)updateReplayHud();
    },
    diagnostic:()=>stage?.inspectReplayBodycamQa()??null,
    routeCandidates(){
      if(replaying||!stage||state.phase!=='planning')return [];
      const actor=team(state)[0];if(!actor)return [];
      const result:Array<{world:Pt;screen:Pt}>=[];
      for(const radius of [55,78,105,42])
        for(const bearing of [0,-.6,.6,-1.15,1.15,2.1,-2.1]){
          const angle=actor.heading+bearing;
          const world={x:actor.p.x+Math.cos(angle)*radius,
            y:actor.p.y+Math.sin(angle)*radius};
          if(!intelPassable(world,state.intel,SQUEEZE_RADIUS))continue;
          const screen=worldToScreen(world,0);
          if(screen.x<35||screen.x>cssW-35||
             screen.y<85||screen.y>cssH-200)continue;
          if(team(state).some(a=>distance(
             worldToScreen(a.p,24),screen)<38))continue;
          result.push({world,screen});
        }
      return result;
    },
    planned(){
      const actor=team(state)[0];
      return actor?{actorId:actor.id,
        path:actor.plan.filter(n=>n.kind==='move').map(n=>({...n.p}))}:null;
    },
    motionSamples(){
      const id=team(state)[0]?.id;
      if(!id)return [];
      return recorder.frames.flatMap(f=>{
        const actor=f.actors.find(a=>a.id===id);
        return actor?[{at:f.t,p:{...actor.p},heading:actor.heading}]:[];
      });
    },
    prepareIndoorEntry(){
      // Deterministic two-room indoor training fixture: two enclosed roofs,
      // one physical hinged doorway. This still uses the real session motor,
      // authored MOVE orders and normal MissionRecorder; no replay synthesis.
      if(replaying||state.phase!=='planning')return false;
      const at=(x:number,y:number):Pt=>({x,y});
      const site:Site={
        seed:731,name:'BODYCAM INDOOR ENTRY / QA',layout:'corridor',
        training:true,archetype:'office',roomCount:2,
        rooms:[
          {id:'entry-room',x:240,y:110,w:140,h:150,
            kind:'room',tone:.42,purpose:'lobby'},
          {id:'inner-room',x:240,y:260,w:140,h:180,
            kind:'room',tone:.39,purpose:'office'}
        ],
        walls:[
          {a:at(240,110),b:at(380,110)},
          {a:at(240,110),b:at(240,440)},
          {a:at(380,110),b:at(380,440)},
          {a:at(240,440),b:at(380,440)},
          {a:at(240,260),b:at(290,260)},
          {a:at(332,260),b:at(380,260)}
        ],
        doors:[{id:'ENTRY',a:at(290,260),b:at(332,260),
          kind:'hinged',hinge:'a',swing:-1,open:true,openedAt:0}],
        cover:[],windows:[],entrance:at(311,200),
        spawn:[at(300,200),at(308,173),at(316,146),at(325,119)],
        enemies:[],objective:at(320,400),extract:at(325,420),
        bounds:{minX:0,minY:0,maxX:640,maxY:500}
      };
      reset(0,731,'hold',site);
      const crew=team(state).slice(0,4);
      if(crew.length!==4)return false;
      const goals=[at(300,350),at(312,365),at(325,380),at(339,394)];
      const accepted=crew.every((actor,i)=>
        planMove(state,actor.id,goals[i]));
      updateHud();return accepted;
    },
    indoorEntryReview(){
      if(recorder.frames.length<2)return null;
      return measureReplaySquadDoorEntry(recorder.frames,'ENTRY',
        team(state).map(a=>a.id),0,recorder.duration);
    }
  };
  (window as typeof window&{__fieldworkBodycamQa?:BodycamQa})
    .__fieldworkBodycamQa=qa;
}
ui.replayContactLens.addEventListener('click',()=>{
  if(!replayKnowledge.hasContactEvidence)return;
  const known=recorder.frames.find(f=>
    !!f.knowledge?.operatorVisibleActorIds)?.knowledge;
  const ids=team(state).map(a=>a.id).filter(id=>
    operatorContactAvailable(known,id));
  if(!ids.length)return;
  const at=replayKnowledge.observerId===null?-1:
    ids.indexOf(replayKnowledge.observerId);
  replayKnowledge.observerId=at>=ids.length-1?null:ids[at+1];
  if(!replayKnowledge.observerId){
    replayKnowledge.groundLensOn=false;stopReplayBodycam();
  }else if(replayBodycam.active){
    if(replayBodycam.observers.includes(replayKnowledge.observerId))
      applyReplayBodycamMount();
    else stopReplayBodycam();
  }
  if(replayKnowledge.observerId){
    replayKnowledge.omniscient=false;
    selected=replayKnowledge.observerId;
    replayCamera.followId=replayKnowledge.observerId;
    replayAnalysisUi.closeReplayShotInspector();
  }
  fog2D.invalidate();
  rebuildReplayEventIndex();
  replayAnalysisUi.renderReplayEventMarkers();replayAnalysisUi.renderReplayEventFeed();
  replayAnalysisUi.refreshReplayShotInspector();updateReplayHud();
});
ui.replayGroundLens.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  if(!replayKnowledge.observerId||!replayKnowledge.personalGround)return;
  replayKnowledge.groundLensOn=!replayKnowledge.groundLensOn;
  if(replayKnowledge.groundLensOn&&viewMode!=='plan2d')cameraMode('plan2d');
  replayKnowledge.groundCacheObserver=null;
  replayKnowledge.groundCacheCount=-1;
  updateReplayHud();
});
ui.replayBodycam.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  else if(!startReplayBodycam())return;
  rebuildReplayEventIndex();
  replayAnalysisUi.renderReplayEventMarkers();replayAnalysisUi.renderReplayEventFeed();
  replayAnalysisUi.refreshReplayShotInspector();updateReplayHud();
});
ui.replayBodycamMount.addEventListener('click',()=>{
  if(!replayBodycam.active)return;
  replayBodycam.mount=replayBodycam.mount==='chest'?'helmet':'chest';
  applyReplayBodycamMount();updateReplayHud();
});
ui.replayView.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  cameraMode(viewMode==='iso'?'top':viewMode==='top'?'plan2d':'iso');
  chooseReplayCamera(resolvedReplayCamera(replayCamera.mode,
    viewMode as ReplayPerspective,!!stage,replayBodycam.active));
  
  updateReplayHud();
});

ui.replayFollow.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  if(replayCamera.follow){
    const i=squadIds.indexOf(replayCamera.followId as typeof squadIds[number]);
    if(i===squadIds.length-1)replayCamera.follow=false;
    else replayCamera.followId=squadIds[i+1];
  }else replayCamera.follow=true;
  chooseReplayCamera(replayCamera.follow?'operator':'free');
  advanceReplayCamera(0,true);updateReplayHud();
});
ui.replaySquad.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  chooseReplayCamera(replayCamera.mode==='squad'?'free':'squad');
  replayCamera.follow=false;advanceReplayCamera(0,true);updateReplayHud();
});
ui.replayDirector.addEventListener('click',()=>{
  if(replayBodycam.active)stopReplayBodycam();
  if(replayCamera.lens==='cam'&&viewMode!=='iso'&&stage)
    cameraMode('iso');
  chooseReplayCamera(replayCamera.mode==='director'?'free':'director');
  replayCamera.follow=false;advanceReplayCamera(0,true);updateReplayHud();
});







ui.replayExportVideo.addEventListener('click',()=>{
  if(replayQuickVideo.active){
    replayQuickVideo.stop();ui.replayExportVideo.textContent='VIDEO 20S';return;
  }
  audioController.unlock();
  const videoAudioStream=audioController.beginVideoCapture();
  if(replayPlayback.time>=recorder.duration-.2)seekReplay(0);
  replayPlayback.prepareVideoExport();
  const started=replayQuickVideo.start(replayPlayback.time,
    {width:cssW,height:cssH},videoAudioStream);
  if(!started){
    audioController.endVideoCapture();
    showUiHelp('VIDEO CAPTURE NOT SUPPORTED IN THIS BROWSER',4200);
    return;
  }
  replayPlayback.play();
  ui.replayExportVideo.textContent='STOP VIDEO';
  ui.replayExportVideo.title=replayQuickVideo.audioTrackCount?
    'Recording replay video with audio':'Recording replay video without audio';
  updateReplayHud();
});
ui.replayExit.addEventListener('click',exitReplay);
/** A mission transition is an ordered release → creation → mount.
 * The lifecycle controller owns Session construction, snapshots, and recording;
 * the presentation owners release only their own graphics, UI and sound.
 */
function releaseMissionPresentation():void{
  if(replayQuickVideo.active)replayQuickVideo.stop();
  if(replaying){
    stopReplayBodycam();
    replayCamera.reset(stage);
    replayKnowledge.reset();
    audioController.endReplay();
  }
  replaying=false;replayPlayback.pause();finishedSession=null;
  replayLibrary.resetSession();
  // Clear old recording indexes and UI selections on every replacement.
  replayAnalysisUi.reset();replayPresentation=null;
  replayDisplay.resetForMission();stage?.setReplayXray(false);
  replayMovementHistory=null;
  replayDirector.reset();
  replayKnowledge.reset();
  replayBodycam.observers=[];replayBodycam.groundObservers.clear();
  audioController.endReplay();
  campaignFlow.resetOutcome();
  operationsBoard.hidden=true;
  hideWeaponChooser();
  targeting.reset();document.body.classList.remove('replaying');
  ui.replayPanel.hidden=true;
  ui.replayTopHud.hidden=true;ui.replayRail.hidden=true;
  replayAnalysisUi.closeReplayChoices();
  hudController.resetNotices();
  frameFeedbackController.reset();
  runtimeLoop.resetPresentation();
  missionController.releasePresentation();
}
function mountMissionSession(transition:MissionTransition):void{
  state=transition.session;
  appFlow.missionMounted();
  targeting.reset();
  if(!transition.deferScene)stage?.applySite(state.site??null);
  selected='rook';
  selectedNode=null;selectedActiveWatch=false;
  doorFocusId=null;draggingNode=null;draggingWatchTarget=false;
  tacticalGestures.clear();cursor=null;trace=null;zoom=1;panX=panY=0;
  fog2D.invalidate();audioController.resetLive();
  recorder=transition.recorder;
  tacticalFeedback.clear();
  if(!transition.deferScene){layout();updateHud();}
}
function reset(next=state.variant,siteSeed?:number,
  missionOverride?:Session['missionType'],prebuiltSite?:Site,
  encounterRisk?:1|2|3,deferScene=false,
  restartStart?:MissionStartSnapshot):void{
  missionController.transition(state,{
    variant:next,seed:siteSeed,missionOverride,prebuiltSite,
    risk:encounterRisk,deferScene,restartStart
  },{
    beforeReplace:releaseMissionPresentation,
    mount:mountMissionSession
  });
}
/** RESTART and debrief RETRY restore the same resolved site, squad and
 * insertion snapshot. NEW SITE deliberately creates a new session instead.
 */
function restartMission():void{
  const start=missionController.restartSnapshot(state);
  const request=missionController.restartRequest(start);
  reset(request.variant,request.seed,request.missionOverride,
    request.prebuiltSite,undefined,false,start);
  missionController.restoreStartingSetup(state,start,entry=>
    console.warn('[Restart mission] Original entry no longer valid',entry));
  recorder=missionController.recordInitial(state);
  layout();updateHud();
}
/* Quick Play uses Map Lab-style progress checkpoints. Percentages represent
 * completed work, not predicted time; expensive 3D mesh creation remains
 * synchronous, but the status is painted immediately before it begins. */
const quickPlayController=createBreachQuickPlayController({
  boot:bootConfig,randomSeed:randomSiteSeed,
  onConfiguratorVisibilityChange:visible=>appFlow.creatorVisibility(visible),getScale:()=>requestedSiteScale,
  getMode:()=>appFlow.mode,setMode:mode=>{appFlow.setMode(mode);},
  getSession:()=>state,
  startSession:(seed,site,mission)=>reset(state.variant,seed,mission,site,undefined,true),
  getStage:()=>stage,getViewMode:()=>viewMode,
  layout,refreshHud:updateHud,
  renderFirstFrame:()=>{
    if(stage&&viewMode!=='plan2d')
      stage.update(state,selected,0,doorFocusId,false,null,null,
        recorder.motion.presentation(0,state.operators.map(a=>a.id)));
    render();
  },
  hideMenu:()=>campaignScreen.hide(),showBriefing:showMissionBriefing,
  restoreFavoriteStart:start=>{
    reset(start.variant,start.seed,start.missionType,
      missionController.restartRequest(start).prebuiltSite,undefined,false,start);
    missionController.restoreStartingSetup(state,start,entry=>
      console.warn('[Favorite mission] Saved entry no longer valid',entry));
    recorder=missionController.recordInitial(state);
    closeMissionSettings(false);
  },
  activateFavorite:id=>replayLibrary.activateFavorite(id),
  showHelp:showUiHelp
});
/** Enter Quick Play through its scenario creator, never directly regenerate. */
const launchQuickPlay=()=>quickPlayController.customize();
function returnToQuickPlayGenerator(){
  if(appFlow.mode!=='quick'||replaying||quickPlayController.busy)return;
  // Opening the creator does not discard the current mission, routes or replay.
  const cameFromSettings=!ui.siteSettings.hidden;
  closeMissionSettings(false);
  // Return keyboard focus to a visible control if Settings was the origin.
  if(cameFromSettings)ui.siteSettingsToggle.focus();
  quickPlayController.customize();
}
ui.quickPlaySetup.addEventListener('click',returnToQuickPlayGenerator);
/** Campaign Arsenal drafts are always re-quoted against live ownership and credits.
 * The existing editor remains usable until the new UI completes its cutover.
 */
const campaignFlow=createBreachCampaignFlow({
  getCampaign:()=>campaign,setCampaign:value=>{campaign=value;},saveCampaign,
  getMode:()=>appFlow.mode,setMode:mode=>{appFlow.setMode(mode);},
  getIntel:()=>selectedIntelMode,setIntel:value=>{selectedIntelMode=value;},
  getScale:()=>requestedSiteScale,setScale:value=>{requestedSiteScale=value;},
  getSession:()=>state,isReplaying:()=>replaying,siteSize:ui.siteSize,siteSettings:ui.siteSettings,
  randomSeed:randomSiteSeed,
  resetContract:job=>reset(0,job.seed,job.kind,undefined,job.risk),
  launchQuickPlay,
  openReplayLibrary:()=>replayLibrary.openFromMenu(),
  openStudio:id=>openOperatorStudio(id,'campaign'),
  openArsenal:id=>{void openCampaignArsenal(id);},
  showBriefing:showMissionBriefing
});
const campaignScreen=campaignFlow.screen;
const showCampaignHome=campaignFlow.showHome;
const returnAfterCampaignMission=campaignFlow.returnAfterMission;
ui.rook.addEventListener('click',()=>selectUnit('rook'));
ui.back.addEventListener('click',()=>{
  audioController.uiClickTone('select');
  // BACK must always escape an unfinished targeting gesture first.
  // It cannot accidentally remove an unrelated prior waypoint.
  if(targeting.isArmed){cancelTargeting();return;}
  if(selectedActiveWatch){
    selectedActiveWatch=false;updateHud();return;
  }
  // Build 076 accidentally removed this listener when slimming the HUD.
  if(backOne(state,selected)){
    selectedNode=null;doorFocusId=null;
  }
  updateHud();
});
ui.moss.addEventListener('click',()=>selectUnit('moss'));
ui.ash.addEventListener('click',()=>selectUnit('ash'));
ui.vale.addEventListener('click',()=>selectUnit('vale'));
ui.clear.addEventListener('click',async()=>{
 if(state.phase!=='planning'||replaying)return;
 const session=state,targetId=selected;
 const operator=team(session).find(a=>a.id===targetId);
 const count=operator?.plan.length??0;
 if(count===0)return;
 if(count>=3&&!await confirmFieldworkAction({
   title:'Clear '+(operator?.name??'operator')+' route?',
   message:count+' queued orders will be cleared. Undo can restore the route.',
   confirmLabel:'CLEAR ROUTE',danger:true
 }))return;
 if(session!==state||state.phase!=='planning')return;
 if(clearPlan(state,targetId)){
   selectedNode=null;
   showUiHelp('ROUTE CLEARED · UNDO TO RESTORE',3000);
   audioController.playOrderCue('ui.cancel');updateHud();
 }
});
ui.undo.addEventListener('click',()=>{undoPlan(state,selected);selectedNode=null;audioController.playOrderCue('orders.undo');updateHud();});
ui.redo.addEventListener('click',()=>{redoPlan(state,selected);selectedNode=null;audioController.playOrderCue('orders.redo');updateHud();});
ui.wait.addEventListener('click',()=>{planWait(state,selected,1);audioController.playOrderCue('orders.wait');updateHud();});
fieldLightButton=document.createElement('button');
fieldLightButton.type='button';fieldLightButton.textContent='WEAPON LIGHT';
fieldLightButton.setAttribute('aria-label','Toggle selected operator weapon light');
fieldLightButton.addEventListener('click',()=>{
 if(replaying)return;
 toggleWeaponLight(state,selected);audioController.playOrderCue('equipment.flashlight_click');updateHud();
});
ui.siteSettings.append(fieldLightButton);
const leaveRangeButton=document.createElement('button');
leaveRangeButton.type='button';leaveRangeButton.textContent='LEAVE TEST RANGE';
leaveRangeButton.dataset.equipmentRangeExit='';
leaveRangeButton.addEventListener('click',()=>{
 if(state.site?.training){lastRangeTrial=null;reset();updateHud();}
});
ui.siteSettings.append(leaveRangeButton);
const rangeRepeat=document.createElement('button');
rangeRepeat.type='button';rangeRepeat.textContent='RESTART RANGE TRIAL';
rangeRepeat.dataset.rangeRepeat='';
rangeRepeat.addEventListener('click',()=>{
 if(!state.site?.training)return;
 lastRangeTrial=captureRangeTrial(state,selected);
 reset(state.variant,undefined,undefined,equipmentTrainingSite());
 updateHud();
});
ui.siteSettings.append(rangeRepeat);
medicalButton=document.createElement('button');
medicalButton.type='button';
medicalButton.className=ui.loadout.className;
medicalButton.textContent='TREAT';
medicalButton.setAttribute('aria-label','Plan medical stabilization');
medicalButton.addEventListener('click',()=>{
 if(replaying||state.phase!=='planning')return;
 const patient=medicalCandidate(selected);
 if(patient)planMedicalTreatment(state,selected,patient.id);
 updateHud();
});
ui.loadout.insertAdjacentElement('afterend',medicalButton);
function casualtyActionButton(label:string,action:(target:TeamActor)=>void){
 const button=document.createElement('button');button.type='button';
 button.className=ui.loadout.className;button.textContent=label;
 button.hidden=true;
 button.addEventListener('click',()=>{
  if(state.phase!=='planning'||replaying)return;
  const patient=casualtyCandidate(selected);
  if(patient)action(patient);
  updateHud();
 });
 medicalButton!.insertAdjacentElement('afterend',button);
 return button;
}
dragButton=casualtyActionButton('DRAG',target=>{
 targeting.armEvac(target.id,'drag');
 showUiHelp('TAP DESTINATION FOR CASUALTY DRAG',5500);
});
carryButton=casualtyActionButton('CARRY',target=>{
 targeting.armEvac(target.id,'carry');
 showUiHelp('TAP DESTINATION FOR CASUALTY CARRY',5500);
});
retrieveButton=casualtyActionButton('RECOVER',target=>{
 if(!planRecoverMedical(state,selected,target.id))
  showUiHelp('NO ACCESSIBLE MEDICAL SUPPLY OR ROUTE');
});
ui.loadout.setAttribute('aria-haspopup','true');
ui.loadout.setAttribute('aria-expanded','false');
ui.loadout.addEventListener('click',()=>{
 if(weaponChooser.hidden)showWeaponChooser();
 else hideWeaponChooser();
});
ui.reload.addEventListener('click',()=>{
  if(state.phase==='planning')planReload(state,selected);
  else if(state.phase==='running')reloadNow(state,selected);
  updateHud();
});
ui.cancelTarget.addEventListener('click',cancelTargeting);
ui.flash.addEventListener('click',()=>{
  if(state.phase!=='planning'||replaying)return;
  targeting.toggleFlash();
  updateHud();
});
ui.sync.addEventListener('click',()=>{planSync(state);audioController.playOrderCue('orders.sync');updateHud();});
ui.stance.addEventListener('click',()=>{
  posture(state,selected);audioController.playOrderCue('orders.stance');fog2D.invalidate();updateHud();
});
ui.contact.addEventListener('click',()=>{toggleContactRule(state,selected);updateHud();});
missionScreens.bindSitePreferences();
ui.variant.addEventListener('click',async()=>{
  if(replaying||appFlow.mode==='mission')return;
  if(appFlow.mode==='quick'){returnToQuickPlayGenerator();return;}
  if((state.started||team(state).some(a=>a.plan.length>0))&&
    !await confirmFieldworkAction({
      title:'Generate a new site?',
      message:'Your current routes and progress will be replaced. Your Quick Play campaign data remains separate.',
      confirmLabel:'GENERATE NEW SITE',danger:true
    }))return;
  reset(state.variant+1);
});
ui.retry.addEventListener('click',()=>{if(appFlow.mode!=='mission')restartMission();});
ui.next.addEventListener('click',()=>{
  if(returnAfterCampaignMission())return;
  if(appFlow.mode==='quick')returnToQuickPlayGenerator();
  else reset(state.variant+1);
});
// Navigation is not a mission reset and may never resolve Campaign twice.
const afterActionMainMenu=document.getElementById('afterActionMainMenu') as HTMLButtonElement|null;
afterActionMainMenu?.addEventListener('click',()=>{
  if(replaying)return;
  ui.debrief.hidden=true;
  operationsBoard.hidden=true;
  closeMissionSettings(false);
  appFlow.setMode('menu');
  campaignScreen.entry(!!campaign);
});
ui.play.addEventListener('click',()=>{
  audioController.unlock();audioController.uiClickTone(state.phase==='running'?'pause':'go');
  if(state.phase==='won'||state.phase==='lost'){
   if(!returnAfterCampaignMission()){
     if(appFlow.mode==='quick')returnToQuickPlayGenerator();
     else reset();
   }
  }else{
    targeting.reset();
    missionController.captureBeforeExecution(state,recorder);
    toggling(state);updateHud();
  }
});
ui.restart.addEventListener('click',async()=>{
  if(appFlow.mode==='mission'||replaying)return;
  if((state.started||team(state).some(a=>a.plan.length>0))&&
    !await confirmFieldworkAction({
      title:'Restart this mission?',
      message:'All current orders and discoveries will be discarded.',
      confirmLabel:'RESTART MISSION',danger:true
    }))return;
  restartMission();
  closeMissionSettings(false);
  showMissionBriefing();
});
window.addEventListener('keydown',e=>{
  // Global game shortcuts must never fire while the player edits a name,
  // operates a dialog, or navigates Campaign / the front menu.
  if(e.isComposing||e.altKey||appFlow.mode==='menu'||appFlow.mode==='home')return;
  if(document.querySelector('.fw-confirm-backdrop')||quickPlayController.configuring)return;
  const target=e.target;
  // Escape is handled before the usual input guard so a focused replay
  // range/button can dismiss its panel; native select popups keep Escape.
  if(replaying&&e.code==='Escape'&&
     !(target instanceof HTMLSelectElement)&&
     !(target instanceof HTMLElement&&target.closest(
       '[role="dialog"],[role="alertdialog"],textarea,[contenteditable="true"]'))){
    e.preventDefault();
    if(!ui.replayClusterMenu.hidden)replayAnalysisUi.closeReplayCluster();
    else if(replayAnalysisUi.replayToolTab!==null)replayAnalysisUi.closeReplaySurface();
    else exitReplay();
    return;
  }
  if(target instanceof HTMLElement&&
    (target.isContentEditable||target.closest(
      'input,textarea,select,[contenteditable="true"],[role="dialog"],[role="alertdialog"]'
    )))return;
  if(replaying){
    if(e.code==='Space'&&!e.repeat&&!(
      target instanceof HTMLElement&&target.closest('button,[role="button"]'))){
      e.preventDefault();replayTimeline.togglePlay();
    }
    if((e.code==='ArrowLeft'||e.code==='ArrowRight')&&!(
      target instanceof HTMLElement&&target.closest('button,summary,[role="button"]'))){
      e.preventDefault();
      const direction:-1|1=e.code==='ArrowLeft'?-1:1;
      if(e.ctrlKey||e.metaKey)replayAnalysisUi.jumpEvent(direction>0);
      else if(e.shiftKey){replayPlayback.pause();seekReplay(replayPlayback.time+direction);}
      else replayTimeline.step('frame',direction);
    }
    return;
  }
  if(e.code==='Space'&&!e.repeat){
    e.preventDefault();audioController.unlock();
    if(state.phase==='won'||state.phase==='lost'){
      if(!returnAfterCampaignMission()){
        if(appFlow.mode==='quick')returnToQuickPlayGenerator();
        else reset();
      }
    }else{
      targeting.reset();
      missionController.captureBeforeExecution(state,recorder);
      toggling(state);
    }
    updateHud();
  }
  if(e.code==='Digit1')selectUnit('rook');
  if(e.code==='Digit2')selectUnit('moss');
  if(e.code==='Digit3')selectUnit('ash');
  if(e.code==='Digit4')selectUnit('vale');
  if(e.code==='KeyX'&&!e.repeat){
    e.preventDefault();
    // Keyboard and touch must use the exact same guarded clear-plan workflow.
    ui.clear.click();
  }
  if(e.code==='KeyL')armFacing('look');
  if(e.code==='Backspace'&&!e.repeat){
    e.preventDefault();ui.back.click();
  }
  if(e.code==='Escape'){
    e.preventDefault();
    if(!weaponChooser.hidden)hideWeaponChooser();
    else if(!operationsBoard.hidden)operationsBoard.hidden=true;
    else if(!ui.briefingPanel.hidden){
      ui.briefingClose.click();
    }else if(!ui.siteSettings.hidden){
      ui.siteSettingsToggle.click();
    }else cancelTargeting();
    return;
  }
  if(e.code==='KeyW'&&!e.repeat)armFacing('watch');
  if(e.code==='KeyZ'&&(e.ctrlKey||e.metaKey)){
    e.preventDefault();
    if(e.shiftKey)redoPlan(state,selected);
    else undoPlan(state,selected);updateHud();
  }
  if(e.code==='KeyR'&&!e.repeat&&appFlow.mode!=='mission'){
    e.preventDefault();
    ui.restart.click();
  }
  if(e.code==='KeyV'&&!e.repeat)cameraMode(viewMode==='iso'?'top':'iso');
  if(e.code==='KeyQ'&&!e.repeat)turnCamera(-Math.PI/8);
  if(e.code==='KeyE'&&!e.repeat)turnCamera(Math.PI/8);
  if(e.code==='Digit0'&&!e.repeat)ui.cameraFit.click();
});
function pointerWorld(e:PointerEvent){return toWorld(e.clientX,e.clientY);}
/** Aim can be placed through the rendered silhouette of a door, enemy,
 * window or counter, whether or not that object is known. This reads only
 * the camera ray: never query hidden actors to snap a LOOK/WATCH marker. */
function pointerAimWorld(e:PointerEvent,height=24):Pt{
 return stage&&viewMode!=='plan2d'?
   stage.screenToWorldAtHeight(e.clientX,e.clientY,height)??
     pointerWorld(e):pointerWorld(e);
}
/** Read-only semantic picking; gesture controller owns pointer mechanics. */
function tacticalPickAt(screen:Pt,pointerKind:string):TacticalPick|null{
 return pickTacticalTarget({
  screen,pointerKind,state,replaying,selected,selectedNode,doorFocusId,
  viewMode,worldToScreen,executionProblemStatus,executionMarkerPoint,
  displayRouteCache
 });
}
function adoptPointerOwner(p:{pick?:TacticalPick|null}):void{
  const owner=p.pick?.owner;
  if(owner&&owner!==selected)selectUnit(owner);
}
function activatePointerEdit(p:{pick?:TacticalPick|null}):void{
  adoptPointerOwner(p);
  const pick=p.pick;
  if(!pick)return;
  selectedActiveWatch=pick.kind==='activeWatch';
  selectedNode=selectedActiveWatch?null:pick.nodeId??null;
  doorFocusId=null;
}
function restorePointerSelection(p:{selectionBefore?:{
  owner:string;node:number|null;watch:boolean;door:string|null
}}):void{
  const prior=p.selectionBefore;
  if(!prior)return;
  if(selected!==prior.owner)selectUnit(prior.owner);
  selectedNode=prior.node;selectedActiveWatch=prior.watch;
  doorFocusId=prior.door;
}
// The input controller owns DOM pointer events, camera gesture arbitration and
// interruption cleanup. This scene retains semantic picking and plan edits.
tacticalGestures.install({
  is3D:()=>!!stage&&viewMode!=='plan2d',
  isPlanning:()=>state.phase==='planning',
  isLooking:()=>targeting.isFacing,
  targetArmed:()=>targeting.isArmed,
  world:pointerWorld,
  aimWorld:pointerAimWorld,
  pick:tacticalPickAt,
  selection:()=>({owner:selected,node:selectedNode,watch:selectedActiveWatch,
    door:doorFocusId}),
  restoreSelection:restorePointerSelection,
  activateEdit:activatePointerEdit,
  adoptOwner:adoptPointerOwner,
  cursor:point=>{cursor=point;},
  hover:(active,point)=>{previewHover=active;if(point)cursor=point;},
  clearDrag:()=>{trace=null;draggingNode=null;draggingWatchTarget=false;},
  dragNode:(point,watch)=>{draggingNode=point;draggingWatchTarget=watch;},
  traceRoute:(screen,point)=>{
    if(!trace)trace=[{...uid(selected)!.p}];
    if(shouldAppendStrokePoint(worldToScreen(trace.at(-1)!,8),screen))
      trace.push({...point});
  },
  orbit:(dx,dy)=>{
    if(replaying&&replayCamera.mode!=='free'){
      chooseReplayCamera('free');replayCamera.follow=false;updateReplayHud();
    }
    stage?.orbit(dx,dy);
    for(const [mode,button] of [['iso',ui.viewIso],
      ['top',ui.viewTop],['plan2d',ui.view2d]] as const)
      button.setAttribute('aria-pressed',String(mode===stage?.view.mode));
  },
  pan:(dx,dy)=>{
    if(replaying&&replayCamera.mode!=='free'){
      chooseReplayCamera('free');replayCamera.follow=false;updateReplayHud();
    }
    if(stage&&viewMode!=='plan2d')stage.pan(dx,dy);
    else{panX+=dx;panY+=dy;layout();}
  },
  pinch:(previous,current,ratio)=>{
    if(stage&&viewMode!=='plan2d'){
      if(replaying&&replayCamera.mode!=='free'){
        chooseReplayCamera('free');replayCamera.follow=false;updateReplayHud();
      }
      if(previous)stage.panBetween(previous.x,previous.y,current.x,current.y);
      if(ratio!==1)stage.zoomAt(ratio,current.x,current.y);
    }else{
      if(previous){panX+=current.x-previous.x;panY+=current.y-previous.y;}
      if(ratio!==1)zoom=clamp(zoom*ratio,.65,4.8);
      layout();
    }
  },
  release:commitPointerRelease,
  complete:updateHud,
  wheel:e=>{
    const z=stage&&viewMode!=='plan2d'?stage.view.zoom:zoom;
    fitZoom(z*Math.exp(-e.deltaY*.001),e.clientX,e.clientY);
  }
});
/** A route tap commits once; presentation feedback stays with the app. */
function insertAtRouteLine(screen:Pt,pointerKind:string):boolean{
 const result=insertTacticalRouteWaypoint({
   state,selected,screen,pointerKind,worldToScreen,displayRouteCache
 });
 if(result.status==='miss'){
   canvas.dataset.lastRouteTap='miss:'+(uid(selected)?.plan.length??0)+'/'+selected;
   return false;
 }
 canvas.dataset.lastRouteTap=result.status+':'+result.index;
 if(result.status==='blocked'){
   rejectAt(result.point,'CANNOT INSERT WAYPOINT HERE');
   return true;
 }
 lastAuthoringAt=performance.now();
 tacticalFeedback.emit('node',result.point);
 teach('route-inserted','Waypoint inserted. Drag to reposition, or add LOOK / WATCH.',4100);
 selectedNode=result.nodeId;doorFocusId=null;paletteController.invalidate();
 return true;
}
/** Map gestures have resolved; this is the gameplay-only commit boundary. */
function commitPointerRelease(e:PointerEvent,p:TacticalPointer,
 cancelled:boolean,pointerCount:number):void{
 dispatchTacticalPointerRelease({
 get state(){return state;},get replaying(){return replaying;},
 replayBodycam,get replayTraceMode(){return replayDisplay.options.replayTraceMode;},
 get recorder(){return recorder;},replayPlayback,replayAnalysisUi,
 hudController,get selected(){return selected;},
 get selectedNode(){return selectedNode;},set selectedNode(v){selectedNode=v;},
 get selectedActiveWatch(){return selectedActiveWatch;},
 set selectedActiveWatch(v){selectedActiveWatch=v;},
 get doorFocusId(){return doorFocusId;},set doorFocusId(v){doorFocusId=v;},
 get doorMenuDismissedId(){return doorMenuDismissedId;},
 set doorMenuDismissedId(v){doorMenuDismissedId=v;},
 get flashMode(){return targeting.flashMode;},get pushMode(){return targeting.pushMode;},
 get firePlacement(){return targeting.firePlacement;},get evacMode(){return targeting.evacMode;},
 get trace(){return trace;},get viewMode(){return viewMode;},tacticalFeedback,pointerAimWorld,pointerWorld,
 worldToScreen,followReplayOperator,historicalShotVisible,selectUnit,
 useSelectedGround,showUiHelp,adoptPointerOwner,uid,rejectAt,teach,
 insertAtRouteLine,selectedPlanNode
},e,p,cancelled,pointerCount);
}
window.addEventListener('resize',layout);
missionScreens.bindMenus();
audioController.bindSettings({
  liveMix:el<HTMLButtonElement>('liveMixToggle'),
  roomAudio:el<HTMLButtonElement>('roomAudioToggle'),
  uiSound:ui.uiSoundToggle
});
/** Authoring previews and blocker feedback stay with tactical presentation;
 * the scheduler invokes them once per rendered/active frame. */
function drawTacticalFrameFeedback(studioOccludesTactical:boolean):void{
 frameFeedbackController.draw(studioOccludesTactical);
}

// The runtime owns RAF cadence; the host supplies live state and presentation boundaries.
const runtimeLoop=createBreachRuntimeLoop({
 boot:bootConfig,
 getSession:()=>state,getRecorder:()=>recorder,getMode:()=>appFlow.mode,
 isReplaying:()=>replaying,
 isQuickPlayBusy:()=>quickPlayController.busy||quickPlayController.configuring,
 getSelected:()=>selected,getSelectedActor:()=>uid(selected),
 getDoorFocusId:()=>doorFocusId,getStage:()=>stage,getViewMode:()=>viewMode,
 isMissionTerminal,isStudioVisible:()=>studioBridge.visible,
 getReplayPresentation:()=>replayPresentation,
 setReplayPresentation:value=>{replayPresentation=value;},
 invalidateFog:()=>fog2D.invalidate(),advanceReplayCamera,
 updateHud,updateReplayHud,updateContext,advanceContextPalette,
 renderFrame:render,drawTacticalFrameFeedback,
 captureHighlightFrame:(scene,overlay,time,perspective)=>{
   // Never save a screenshot of an explicitly omniscient replay view.
   if(!replayKnowledge.omniscient)
     highlightCapture.frame(recorder,scene,overlay,time,perspective);
 },
 worldToScreen,
 canvas,playback:replayPlayback,camera:replayCamera,
 knowledge:replayKnowledge,bodycam:replayBodycam,video:replayQuickVideo,
 audio:audioController
});
layout();cameraMode(viewMode);updateHud();
if(appFlow.mode==='menu')campaignScreen.entry(!!campaign);
runtimeLoop.start();
