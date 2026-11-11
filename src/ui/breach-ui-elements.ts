/** The fixed tactical HTML contract and one-time icon decoration.
 * Stateless DOM lookup only. No mission, replay, pointer or render authority. */
import {tacticalIcon,decorateIconButton} from './tactical-icons.ts';

export const requiredBreachElement=<T extends HTMLElement>(id:string)=>{
  const node=document.getElementById(id);
  if(!node)throw Error('Missing tactical UI: '+id);
  return node as T;
};

export function createBreachUiElements(){
 const el=requiredBreachElement;
const ui={
  rook:el<HTMLButtonElement>('rook'),
  moss:el<HTMLButtonElement>('moss'),
  rookHp:el<HTMLElement>('rookHp'),mossHp:el<HTMLElement>('mossHp'),
  clear:el<HTMLButtonElement>('clear'),
  play:el<HTMLButtonElement>('play'),restart:el<HTMLButtonElement>('restart'),
  phase:el<HTMLElement>('phase'),clock:el<HTMLOutputElement>('clock'),
  hint:el<HTMLElement>('hint'),feed:el<HTMLElement>('feed'),
  mission:el<HTMLElement>('mission'),
  briefingToggle:el<HTMLButtonElement>('briefingToggle'),
  uiHelp:el<HTMLButtonElement>('uiHelp'),
  uiSoundToggle:el<HTMLButtonElement>('uiSoundToggle'),
  briefingPanel:el<HTMLElement>('briefingPanel'),
  briefingTitle:el<HTMLElement>('briefingTitle'),
  briefingBody:el<HTMLElement>('briefingBody'),
  briefingSituationBlock:el<HTMLElement>('briefingSituationBlock'),
  briefingSituation:el<HTMLElement>('briefingSituation'),
  briefingCondition:el<HTMLElement>('briefingCondition'),
  briefingExtraction:el<HTMLElement>('briefingExtraction'),
  briefingSite:el<HTMLElement>('briefingSite'),
  briefingIntel:el<HTMLElement>('briefingIntel'),
  briefingRoster:el<HTMLElement>('briefingRoster'),
  briefingClose:el<HTMLButtonElement>('briefingClose'),
  briefingPrimary:el<HTMLElement>('briefingPrimary'),
  briefingType:el<HTMLElement>('briefingType'),
  briefingLocation:el<HTMLElement>('briefingLocation'),
  briefingThreat:el<HTMLElement>('briefingThreat'),
  briefingLayout:el<HTMLElement>('briefingLayout'),
  briefingSteps:el<HTMLElement>('briefingSteps'),
  briefingOverview:el<HTMLElement>('briefingOverview'),
  briefingIntelView:el<HTMLElement>('briefingIntelView'),
  briefingIntelToggle:el<HTMLButtonElement>('briefingIntelToggle'),
  briefingEntryControls:el<HTMLElement>('briefingEntryControls'),
  briefingEntryLabel:el<HTMLElement>('briefingEntryLabel'),
  briefingCaseContext:el<HTMLElement>('briefingCaseContext'),
  briefingCampaignContext:el<HTMLElement>('briefingCampaignContext'),
  briefingSiteReports:el<HTMLElement>('briefingSiteReports'),
  briefingCaseReports:el<HTMLElement>('briefingCaseReports'),
  context:el<HTMLElement>('contextTools'),
  quickStates:el<HTMLElement>('quickStates'),
  quickScope:el<HTMLElement>('quickScope'),
  tacticalHud:el<HTMLElement>('tacticalHud'),
  cancelTarget:el<HTMLButtonElement>('cancelTarget'),
  siteSettingsToggle:el<HTMLButtonElement>('siteSettingsToggle'),
  quickPlaySetup:el<HTMLButtonElement>('quickPlaySetup'),
  siteSize:el<HTMLButtonElement>('siteSize'),
  siteLighting:el<HTMLButtonElement>('siteLighting'),
  siteSettings:el<HTMLElement>('siteSettings'),
  replayMore:el<HTMLButtonElement>('replayMore'),
  afterActionClipHud:el<HTMLElement>('afterActionClipHud'),
  afterActionClipLabel:el<HTMLElement>('afterActionClipLabel'),
  afterActionClipToggle:el<HTMLButtonElement>('afterActionClipToggle'),
  replayShareToggle:el<HTMLButtonElement>('replayShareToggle'),
  replayQuickView:el<HTMLSelectElement>('replayQuickView'),
  replayQuickCamera:el<HTMLSelectElement>('replayQuickCamera'),
  replayQuickSpeed:el<HTMLSelectElement>('replayQuickSpeed'),
  replayDirectSight:el<HTMLSelectElement>('replayDirectSight'),
  replayDirectTracers:el<HTMLButtonElement>('replayDirectTracers'),
  replayDirectXray:el<HTMLButtonElement>('replayDirectXray'),
  replayDirectDirector:el<HTMLButtonElement>('replayDirectDirector'),
  replayDirectLens:el<HTMLButtonElement>('replayDirectLens'),
  replayDirectBodycam:el<HTMLButtonElement>('replayDirectBodycam'),
  replayDirectMount:el<HTMLButtonElement>('replayDirectMount'),
  replayDirectFree:el<HTMLButtonElement>('replayDirectFree'),
  replayPresets:el<HTMLElement>('replayPresets'),
  replayActorControls:el<HTMLElement>('replayActorControls'),
  replayInspectActor:el<HTMLSelectElement>('replayInspectActor'),
  replayInspectActorButtons:el<HTMLElement>('replayInspectActorButtons'),
  replayInspectFollow:el<HTMLButtonElement>('replayInspectFollow'),
  replayInspectMovement:el<HTMLButtonElement>('replayInspectMovement'),
  replayIncidentInvestigate:el<HTMLButtonElement>('replayIncidentInvestigate'),
  replayPresetStatus:el<HTMLOutputElement>('replayPresetStatus'),
  replayDrawerTitle:el<HTMLElement>('replayDrawerTitle'),
  replayHighlights:el<HTMLElement>('replayHighlights'),
  replayAllEvents:el<HTMLElement>('replayAllEvents'),
  replayExtra:el<HTMLElement>('replayExtra'),
  replayDrawer:el<HTMLElement>('replayDrawer'),
  replayDrawerClose:el<HTMLButtonElement>('replayDrawerClose'),
  replayFeedPanel:el<HTMLElement>('replayFeedPanel'),
  replayPrevChapter:el<HTMLButtonElement>('replayPrevChapter'),
  replayNextChapter:el<HTMLButtonElement>('replayNextChapter'),
  replayBookmark:el<HTMLButtonElement>('replayBookmark'),
  replayChapterList:el<HTMLElement>('replayChapterList'),
  replayDebriefInfo:el<HTMLOutputElement>('replayDebriefInfo'),
  replayDebriefMoments:el<HTMLElement>('replayDebriefMoments'),
  replaySquadEntryPanel:el<HTMLElement>('replaySquadEntryPanel'),
  replaySquadEntryList:el<HTMLElement>('replaySquadEntryList'),
  replayIncidentDetails:el<HTMLElement>('replayIncidentDetails'),
  replayIncidentTitle:el<HTMLElement>('replayIncidentTitle'),
  replayIncidentSummary:el<HTMLOutputElement>('replayIncidentSummary'),
  replayIncidentWatch:el<HTMLButtonElement>('replayIncidentWatch'),
  replayIncidentLoop:el<HTMLButtonElement>('replayIncidentLoop'),
  replayIncidentClose:el<HTMLButtonElement>('replayIncidentClose'),
  replayShotInspector:el<HTMLElement>('replayShotInspector'),
  replayShotTitle:el<HTMLElement>('replayShotTitle'),
  replayShotDetails:el<HTMLOutputElement>('replayShotDetails'),
  replayShotClose:el<HTMLButtonElement>('replayShotClose'),
  replayShotPrev:el<HTMLButtonElement>('replayShotPrev'),
  replayShotNext:el<HTMLButtonElement>('replayShotNext'),
  replayShotFocus:el<HTMLButtonElement>('replayShotFocus'),
  viewIso:el<HTMLButtonElement>('viewIso'),
  viewTop:el<HTMLButtonElement>('viewTop'),
  view2d:el<HTMLButtonElement>('view2d'),
  cameraFit:el<HTMLButtonElement>('cameraFit'),
  intelMode:el<HTMLButtonElement>('intelMode'),
  ash:el<HTMLButtonElement>('ash'),vale:el<HTMLButtonElement>('vale'),
  ashHp:el<HTMLElement>('ashHp'),valeHp:el<HTMLElement>('valeHp'),
  back:el<HTMLButtonElement>('back'),
  undo:el<HTMLButtonElement>('undo'),redo:el<HTMLButtonElement>('redo'),
  wait:el<HTMLButtonElement>('wait'),sync:el<HTMLButtonElement>('sync'),
  reload:el<HTMLButtonElement>('reload'),flash:el<HTMLButtonElement>('flash'),
  loadout:el<HTMLButtonElement>('loadout'),
  stance:el<HTMLButtonElement>('stance'),variant:el<HTMLButtonElement>('variant'),
  contact:el<HTMLButtonElement>('contact'),
  debrief:el<HTMLElement>('debrief'),
  debriefTitle:el<HTMLElement>('debriefTitle'),
  debriefIntelBlock:el<HTMLElement>('debriefIntelBlock'),
  debriefIntelText:el<HTMLElement>('debriefIntelText'),
  debriefGrade:el<HTMLElement>('debriefGrade'),
  debriefSurvivors:el<HTMLElement>('debriefSurvivors'),
  debriefAccuracy:el<HTMLElement>('debriefAccuracy'),
  debriefObjective:el<HTMLElement>('debriefObjective'),
  debriefStats:el<HTMLElement>('debriefStats'),
  retry:el<HTMLButtonElement>('retry'),next:el<HTMLButtonElement>('next'),
  watchReplay:el<HTMLButtonElement>('watchReplay'),
  saveReplayDebrief:el<HTMLButtonElement>('saveReplayDebrief'),
  replaySaveArchive:el<HTMLButtonElement>('replaySaveArchive'),
  openReplayLibrary:el<HTMLButtonElement>('openReplayLibrary'),
  replayLibraryDialog:el<HTMLElement>('replayLibraryDialog'),
  replayLibraryBackdrop:el<HTMLElement>('replayLibraryBackdrop'),
  replayLibraryList:el<HTMLElement>('replayLibraryList'),
  replayLibraryStatus:el<HTMLOutputElement>('replayLibraryStatus'),
  closeReplayLibrary:el<HTMLButtonElement>('closeReplayLibrary'),
  replayImportButton:el<HTMLButtonElement>('replayImportButton'),
  replayImportInput:el<HTMLInputElement>('replayImportInput'),
  favoriteMission:el<HTMLButtonElement>('favoriteMission'),
  favoriteMissionsList:el<HTMLElement>('favoriteMissionsList'),
  replayPanel:el<HTMLElement>('replayPanel'),
  replayRail:el<HTMLElement>('replayRail'),
  replayTopHud:el<HTMLElement>('replayTopHud'),
  replayFollowStatus:el<HTMLOutputElement>('replayFollowStatus'),
  replayDockToggle:el<HTMLButtonElement>('replayDockToggle'),
  replayMiniPlay:el<HTMLButtonElement>('replayMiniPlay'),
  replayViewTrigger:el<HTMLButtonElement>('replayViewTrigger'),
  replayViewChoices:el<HTMLElement>('replayViewChoices'),
  replaySightTrigger:el<HTMLButtonElement>('replaySightTrigger'),
  replaySightChoices:el<HTMLElement>('replaySightChoices'),
  replaySpeedTrigger:el<HTMLButtonElement>('replaySpeedTrigger'),
  replaySpeedRange:el<HTMLInputElement>('replaySpeedRange'),
  replaySpeedValue:el<HTMLOutputElement>('replaySpeedValue'),
  replayRailToggle:el<HTMLButtonElement>('replayRailToggle'),
  replayOverlayTrigger:el<HTMLButtonElement>('replayOverlayTrigger'),
  replayOverlayChoices:el<HTMLElement>('replayOverlayChoices'),
  replaySpeedChoices:el<HTMLElement>('replaySpeedChoices'),
  replayPlay:el<HTMLButtonElement>('replayPlay'),
  replayBack:el<HTMLButtonElement>('replayBack'),
  replayForward:el<HTMLButtonElement>('replayForward'),
  replaySpeed:el<HTMLButtonElement>('replaySpeed'),
  replaySound:el<HTMLButtonElement>('replaySound'),
  replayPrevFrame:el<HTMLButtonElement>('replayPrevFrame'),
  replayNextFrame:el<HTMLButtonElement>('replayNextFrame'),
  replayPrevSample:el<HTMLButtonElement>('replayPrevSample'),
  replayNextSample:el<HTMLButtonElement>('replayNextSample'),
  replayLoopIn:el<HTMLButtonElement>('replayLoopIn'),
  replayLoopOut:el<HTMLButtonElement>('replayLoopOut'),
  replayLoopToggle:el<HTMLButtonElement>('replayLoopToggle'),
  replaySeek:el<HTMLInputElement>('replaySeek'),
  replayMarks:el<HTMLElement>('replayMarks'),
  replayClusterMenu:el<HTMLElement>('replayClusterMenu'),
  replaySight:el<HTMLButtonElement>('replaySight'),
  replayContactLens:el<HTMLButtonElement>('replayContactLens'),
  replayGroundLens:el<HTMLButtonElement>('replayGroundLens'),
  replayBodycam:el<HTMLButtonElement>('replayBodycam'),
  replayBodycamMount:el<HTMLButtonElement>('replayBodycamMount'),
  replayBodycamStatus:el<HTMLElement>('replayBodycamStatus'),
  replayContactNote:el<HTMLElement>('replayContactNote'),
  replayObserverTransitions:el<HTMLElement>('replayObserverTransitions'),
  replayView:el<HTMLButtonElement>('replayView'),
  replayExit:el<HTMLButtonElement>('replayExit'),
  replayPrevEvent:el<HTMLButtonElement>('replayPrevEvent'),
  replayNextEvent:el<HTMLButtonElement>('replayNextEvent'),
  replayFollow:el<HTMLButtonElement>('replayFollow'),
  replaySquad:el<HTMLButtonElement>('replaySquad'),
  replayDirector:el<HTMLButtonElement>('replayDirector'),
  replayAnalysis:el<HTMLButtonElement>('replayAnalysis'),
  replayPlans:el<HTMLButtonElement>('replayPlans'),
  replayPlanVersion:el<HTMLButtonElement>('replayPlanVersion'),
  replayNames:el<HTMLButtonElement>('replayNames'),
  replayTraces:el<HTMLButtonElement>('replayTraces'),
  replayGhosts:el<HTMLButtonElement>('replayGhosts'),
  replayTrails:el<HTMLButtonElement>('replayTrails'),
  replayExportJson:el<HTMLButtonElement>('replayExportJson'),
  replayExportVideo:el<HTMLButtonElement>('replayExportVideo'),
  replayEventText:el<HTMLOutputElement>('replayEventText'),
  replayClock:el<HTMLOutputElement>('replayClock'),
  replayStatusChip:el<HTMLOutputElement>('replayStatusChip'),
  replayFeedFollow:el<HTMLButtonElement>('replayFeedFollow'),
  replayFeedToggle:el<HTMLButtonElement>('replayFeedToggle'),
  replayFeedFilter:el<HTMLSelectElement>('replayFeedFilter'),
  replayFeed:el<HTMLElement>('replayFeed'),
  replayFeedInfo:el<HTMLOutputElement>('replayFeedInfo'),
  rookAmmo:el<HTMLElement>('rookAmmo'),mossAmmo:el<HTMLElement>('mossAmmo'),
  ashAmmo:el<HTMLElement>('ashAmmo'),valeAmmo:el<HTMLElement>('valeAmmo'),
};
for(const key of ['back','undo','redo','siteSettingsToggle','cancelTarget'] as const){
  decorateIconButton(ui[key],key);
}
// Match the approved art across the stationary tools and replay strip.
for(const [key,glyph] of [
  ['wait','wait'],['reload','reload'],['flash','flash'],
  ['stance','crouch'],['briefingToggle','briefing'],
  ['cameraFit','fitView'],['restart','restart'],
  ['watchReplay','watchReplay'],['clear','clearPlan'],
  ['replayMore','settings']
] as const)decorateIconButton(ui[key],glyph);
for(const [key,glyph] of [
  ['replayPrevEvent','previousEvent'],['replayBack','rewind'],
  ['replayForward','fastForward'],['replayNextEvent','nextEvent']
] as const)ui[key].replaceChildren(tacticalIcon(glyph));
 return ui;
}

export function mountBreachDeploymentButton(ui:ReturnType<typeof createBreachUiElements>){
const deploymentButton=document.createElement('button');
deploymentButton.type='button';deploymentButton.id='deploymentChoice';
deploymentButton.setAttribute('aria-label','Cycle available insertion points');
ui.briefingEntryControls.append(deploymentButton);

 return deploymentButton;
}

export function mountBreachDebugPanels(boot:{
 replayDirectorDiagnostics:boolean;navDiagnostics:boolean
}){
const replayDirectorDiagnostics=boot.replayDirectorDiagnostics;
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
const navDiagnostics=boot.navDiagnostics;
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

 return {replayDirectorDebugPanel,navPanel};
}

export function mountBreachManagementElements(ui:ReturnType<typeof createBreachUiElements>){
const operationsToggle=document.createElement('button');
operationsToggle.id='operationsBoardToggle';operationsToggle.type='button';
operationsToggle.textContent='SQUAD';
operationsToggle.setAttribute('aria-label','Open Quick Play squad preparation and equipment');
operationsToggle.title='Edit squad and equipment before the mission';
(document.querySelector('.mode')??ui.siteSettings).append(operationsToggle);

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

 return {operationsToggle,rangeTelemetry,operationsBoard,weaponChooser};
}
