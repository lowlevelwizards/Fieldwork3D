/** Stage 11: briefing, settings and mission sheet coordinator.
 * UI ownership only: no tactical orders, campaign persistence or mission rules.
 */
import type {CampaignMode} from '../breach-app-mode.ts';
import type {createBreachAudioController} from '../breach-audio-controller.ts';
import {confirmFieldworkAction} from './fieldwork-controls.ts';
import {team,operationBriefing,type Session} from '../breach-game.ts';
import type {CampaignState} from '../campaign-state.ts';
import {createBriefingCardModel,type BriefingReport,type BriefingTab}
 from '../briefing/briefing-view-model.ts';
import {createTacticalSheetNavigation} from './tactical-sheet-navigation.ts';
import {INTEL_MODES,type IntelMode} from '../breach-intel.ts';
import type {BreachBootConfig} from '../breach-boot-config.ts';
import {readStoredText,writeStoredText,saveIntelPreference}
 from '../breach-persistence.ts';
import type {SiteScale} from '../breach-site.ts';
import type {LightingMode} from '../equipment-site-lighting.ts';
import type {ViewMode} from '../breach-3d.ts';
import {initialMiniatureFocusMode,MINIATURE_FOCUS_STORAGE_KEY,
 type MiniatureFocusMode} from '../rendering/miniature-focus-config.ts';
export type MissionScreensElements={
 briefingBody:HTMLElement;
 briefingCampaignContext:HTMLElement;
 briefingCaseContext:HTMLElement;
 briefingCaseReports:HTMLElement;
 briefingCondition:HTMLElement;
 briefingExtraction:HTMLElement;
 briefingIntel:HTMLElement;
 briefingIntelToggle:HTMLButtonElement;
 briefingIntelView:HTMLElement;
 briefingLayout:HTMLElement;
 briefingLocation:HTMLElement;
 briefingOverview:HTMLElement;
 briefingPanel:HTMLElement;
 briefingPrimary:HTMLElement;
 briefingRoster:HTMLElement;
 briefingSite:HTMLElement;
 briefingSiteReports:HTMLElement;
 briefingSituation:HTMLElement;
 briefingSituationBlock:HTMLElement;
 briefingSteps:HTMLElement;
 briefingThreat:HTMLElement;
 briefingTitle:HTMLElement;
 briefingToggle:HTMLButtonElement;
 briefingType:HTMLElement;
 siteSettings:HTMLElement;
 siteSettingsToggle:HTMLButtonElement;
 siteLighting:HTMLButtonElement;
 siteSize:HTMLButtonElement;
 intelMode:HTMLButtonElement;
 restart:HTMLButtonElement;
 play:HTMLButtonElement;retry:HTMLButtonElement;
 next:HTMLButtonElement;debrief:HTMLElement;
 play:HTMLButtonElement;
 retry:HTMLButtonElement;
 next:HTMLButtonElement;
 debrief:HTMLElement;
 variant:HTMLButtonElement;
 uiHelp:HTMLButtonElement;
 briefingClose:HTMLButtonElement;
 cameraFit:HTMLButtonElement;
 view2d:HTMLButtonElement;
 viewTop:HTMLButtonElement;
 viewIso:HTMLButtonElement;
};
export type MissionActionsHooks={
 returnToQuickPlayGenerator:()=>void;returnAfterCampaignMission:()=>boolean;
 resetMission:(variant?:number)=>void;restartMission:()=>void;
 setMode:(mode:CampaignMode)=>void;campaignEntry:(hasCampaign:boolean)=>void;
 audio:ReturnType<typeof createBreachAudioController>;
 resetTargeting:()=>void;captureBeforeExecution:()=>void;toggleExecution:()=>void;
};
export type MissionScreensHooks={
 ui:MissionScreensElements;
 boot:BreachBootConfig;
 operationsBoard:HTMLElement;operationsToggle:HTMLButtonElement;
 getSession:()=>Session;getCampaign:()=>CampaignState|null;
 getMode:()=> CampaignMode;
 isReplaying:()=>boolean;briefingPreviewEnabled:boolean;
 getEntryId:()=>string;hideWeaponChooser:()=>void;
 hideContextPalette:()=>void;
 getLighting:()=>LightingMode;setLighting:(value:LightingMode)=>void;
 getScale:()=>SiteScale;setScale:(value:SiteScale)=>void;
 getIntel:()=>IntelMode;setIntel:(value:IntelMode)=>void;
 lightingModes:readonly LightingMode[];
 showHelp:(message:string,duration?:number)=>void;refreshHud:()=>void;
 renderFavorites:()=>void;
 changeCamera:(mode:ViewMode)=>void;fitCamera:()=>void;
 getFocusMode:()=>MiniatureFocusMode|undefined;
 setFocusMode:(mode:MiniatureFocusMode)=>void;
 renderOperationsBoard:()=>void;updateContext:()=>void;
 onPresentationChange?:(visible:{briefing:boolean;settings:boolean})=>void;
};
export function createBreachMissionScreens(config:MissionScreensHooks){
 const ui=config.ui;
 const notifyPresentation=()=>config.onPresentationChange?.({
  briefing:!ui.briefingPanel.hidden,settings:!ui.siteSettings.hidden
 });
const siteChoicePopup=document.createElement('div');
siteChoicePopup.className='fw-site-choice';
let siteChoiceOwner:HTMLButtonElement|null=null;
function closeSiteChoice(){
 siteChoicePopup.remove();
 siteChoiceOwner?.setAttribute('aria-expanded','false');
 siteChoiceOwner=null;
}
function openSiteChoices(button:HTMLButtonElement,label:string,
 choices:readonly {value:string;label:string;description:string}[],
 selectedValue:string,choose:(value:string)=>void){
 if(siteChoiceOwner===button){closeSiteChoice();return;}
 closeSiteChoice();
 siteChoiceOwner=button;
 button.setAttribute('aria-expanded','true');
 siteChoicePopup.replaceChildren();
 const heading=document.createElement('strong');
 heading.textContent=label+' · NEXT SITE';
 siteChoicePopup.append(heading);
 for(const choice of choices){
  const option=document.createElement('button');
  option.type='button';option.className='fw-site-choice-option';
  option.setAttribute('aria-pressed',String(choice.value===selectedValue));
  const name=document.createElement('strong');name.textContent=choice.label;
  const detail=document.createElement('small');detail.textContent=choice.description;
  option.append(name,detail);
  option.addEventListener('click',()=>{choose(choice.value);closeSiteChoice();});
  siteChoicePopup.append(option);
 }
 button.insertAdjacentElement('afterend',siteChoicePopup);
}

const tacticalSheetNavigation=createTacticalSheetNavigation({
 settings:ui.siteSettings,squad:config.operationsBoard,briefing:ui.briefingPanel
},()=>{collapseTacticalSheets(null);config.updateContext();});
/** Only one major tactical sheet owns the viewport and touch focus at a time. */
function collapseTacticalSheets(except:'squad'|'weapon'|'settings'|'briefing'|null){
 if(except!=='squad')config.operationsBoard.hidden=true;
 if(except!=='weapon')config.hideWeaponChooser();
 if(except!=='settings'){
  ui.siteSettings.hidden=true;
  ui.siteSettingsToggle.setAttribute('aria-expanded','false');
  closeSiteChoice();
 }
 if(except!=='briefing'){
  ui.briefingPanel.hidden=true;
  ui.briefingToggle.setAttribute('aria-expanded','false');
 }
 tacticalSheetNavigation.sync();
 notifyPresentation();
}
config.operationsToggle.addEventListener('click',()=>{
 if(config.getSession().phase!=='planning'||config.isReplaying())return;
 const opening=config.operationsBoard.hidden;
 collapseTacticalSheets(opening?'squad':null);
 config.operationsBoard.hidden=!opening;
 if(opening){
  config.hideContextPalette();
  config.renderOperationsBoard();
 }
 tacticalSheetNavigation.sync();
 if(opening)tacticalSheetNavigation.focusFirst();
 config.updateContext();
});

/** V3: render only when mission identity or roster changes; never on each frame. */
let briefingRenderedSession:Session|null=null;
let briefingRenderedDossier:Session['operationDossier'];
let briefingRenderedRoster='';
let briefingRenderedEntry='';
function renderBriefingReports(root:HTMLElement,reports:readonly BriefingReport[]):void{
 const fragment=document.createDocumentFragment();
 if(!reports.length){
  const message=document.createElement('p');message.className='fw-brief-v3-report-empty';
  message.textContent='No additional verified reports available.';
  fragment.append(message);
 }
 for(const report of reports){
  const article=document.createElement('article');article.className='fw-brief-v3-report';
  const meta=document.createElement('div');meta.className='fw-brief-v3-report-meta';
  meta.textContent=report.source.toUpperCase()+' · '+report.confidence.toUpperCase();
  const body=document.createElement('p');body.textContent=report.text;
  article.append(meta,body);fragment.append(article);
 }
 root.replaceChildren(fragment);
}
function syncBriefingCard():void{
 const state=config.getSession();
 const dossier=config.briefingPreviewEnabled?state.operationDossier:undefined;
 const names=team(state).map(actor=>actor.name).join(' · ');
 if(state===briefingRenderedSession&&dossier===briefingRenderedDossier&&
    names===briefingRenderedRoster&&config.getEntryId()===briefingRenderedEntry)return;
 briefingRenderedSession=state;
 briefingRenderedDossier=dossier;
 briefingRenderedRoster=names;
 briefingRenderedEntry=config.getEntryId();
 const brief=operationBriefing(state);
 const model=createBriefingCardModel(state.missionType,brief,dossier);
 ui.briefingTitle.textContent=model.title;
 ui.briefingType.textContent=model.missionLabel.toUpperCase();
 ui.briefingLocation.textContent=model.siteLabel;
 ui.briefingPrimary.textContent=model.primary;
 ui.briefingSituationBlock.hidden=false;
 ui.briefingSituation.textContent=model.situation;
 ui.briefingThreat.textContent=model.threat.value;
 ui.briefingLayout.textContent=model.layout;
 const steps=document.createDocumentFragment();
 model.steps.forEach((step,index)=>{
  const cell=document.createElement('div');cell.className='fw-brief-v3-step';
  const head=document.createElement('strong');
  head.textContent=String(index+1).padStart(2,'0')+' / '+step.action;
  const subtitle=document.createElement('small');subtitle.textContent=step.detail;
  cell.append(head,subtitle);steps.append(cell);
 });
 ui.briefingSteps.replaceChildren(steps);
 // Full authority remains available under ORDERS, never re-authored by prose.
 ui.briefingBody.textContent=brief.objective;
 ui.briefingCondition.textContent=brief.condition;
 ui.briefingExtraction.textContent=brief.extraction;
 ui.briefingSite.textContent=model.siteLabel+' · '+model.layout;
 ui.briefingCaseContext.textContent=model.situation+
   (model.caseContext?'\n\n'+model.caseContext:'');
 const campaign=config.getCampaign();
 const job=config.getMode()==='mission'&&campaign?.activeContractId?
   campaign.contracts.find(c=>c.id===campaign.activeContractId):undefined;
 ui.briefingCampaignContext.textContent=[
   model.campaignLabel??(job?
     job.region.toUpperCase()+' · RISK '+job.risk+' · '+job.title:''),
   model.followUp??''
 ].filter(Boolean).join('\n');
 ui.briefingRoster.textContent=brief.squad+' OPERATORS · '+names;
 renderBriefingReports(ui.briefingIntel,model.reports.threat);
 renderBriefingReports(ui.briefingSiteReports,model.reports.site);
 renderBriefingReports(ui.briefingCaseReports,model.reports.case);
}
function setBriefingIntelTab(tab:BriefingTab):void{
 for(const control of ui.briefingPanel.querySelectorAll<HTMLButtonElement>(
   '[data-briefing-tab]'))
  control.setAttribute('aria-pressed',String(control.dataset.briefingTab===tab));
 for(const section of ui.briefingPanel.querySelectorAll<HTMLElement>(
   '[data-briefing-section]'))
  section.hidden=section.dataset.briefingSection!==tab;
}
function setBriefingView(mode:'brief'|'intel'):void{
 const intel=mode==='intel';
 ui.briefingOverview.hidden=intel;
 ui.briefingIntelView.hidden=!intel;
 ui.briefingIntelToggle.textContent=intel?'BACK TO BRIEF':'VIEW INTEL';
 ui.briefingIntelToggle.setAttribute('aria-expanded',String(intel));
 if(intel)setBriefingIntelTab('threat');
}
 function requireCloseButton():HTMLButtonElement{
  const node=document.getElementById('closeSiteSettings');
  if(!(node instanceof HTMLButtonElement))
    throw Error('Missing mission Settings close button');
  return node;
 }
function closeMissionSettings(returnFocus=true){
  if(ui.siteSettings.hidden)return;
  collapseTacticalSheets(null);
  if(returnFocus)ui.siteSettingsToggle.focus();
  config.updateContext();
}
function showMissionBriefing(){
  if(config.getSession().phase!=='planning'||config.isReplaying()||!config.getSession().site)return;
  // Always open on the five-second overview; details are optional.
  setBriefingView('brief');
  config.refreshHud();
  collapseTacticalSheets('briefing');
  ui.briefingPanel.hidden=false;
  ui.briefingToggle.setAttribute('aria-expanded','true');
  tacticalSheetNavigation.sync();tacticalSheetNavigation.focusFirst();
  notifyPresentation();
  config.updateContext();
}
 function bindMenus():void{
// The Settings trigger lives in the collapsible Tools drawer. Settings
// therefore owns an always-visible close action, and camera changes return
// immediately to the map without leaving a hidden trigger focused.
const closeSiteSettingsButton=requireCloseButton();

closeSiteSettingsButton.addEventListener('click',()=>{
 closeMissionSettings();tacticalSheetNavigation.sync();
});
const missionSettingsTabs=Array.from(ui.siteSettings.querySelectorAll<HTMLButtonElement>(
 '[data-site-tab]'));
const missionSettingsPanels=Array.from(ui.siteSettings.querySelectorAll<HTMLElement>(
 '[data-site-panel]'));
function selectMissionSettingsTab(tab:string){
 for(const button of missionSettingsTabs)
  button.setAttribute('aria-pressed',String(button.dataset.siteTab===tab));
 for(const panel of missionSettingsPanels)
  panel.hidden=panel.dataset.sitePanel!==tab;
 const title=ui.siteSettings.querySelector<HTMLElement>('.site-settings-heading strong');
 if(title)title.textContent=tab==='environment'?'ENVIRONMENT':
  tab==='preferences'?'PREFERENCES':'MISSION';
}
config.renderFavorites();
for(const button of missionSettingsTabs)button.addEventListener('click',()=>{
 selectMissionSettingsTab(button.dataset.siteTab??'mission');
});
function chooseCameraView(mode:ViewMode){
  config.changeCamera(mode);
  closeMissionSettings();
}
ui.viewIso.addEventListener('click',()=>chooseCameraView('iso'));
ui.viewTop.addEventListener('click',()=>chooseCameraView('top'));
ui.view2d.addEventListener('click',()=>chooseCameraView('plan2d'));
ui.cameraFit.addEventListener('click',()=>{
  config.fitCamera();
  closeMissionSettings();
  config.updateContext();
});

ui.briefingToggle.addEventListener('click',showMissionBriefing);
ui.briefingIntelToggle.addEventListener('click',()=>{
 const opening=ui.briefingIntelView.hidden;
 setBriefingView(opening?'intel':'brief');
});
for(const button of ui.briefingPanel.querySelectorAll<HTMLButtonElement>(
 '[data-briefing-tab]')){
 button.addEventListener('click',()=>setBriefingIntelTab(
  button.dataset.briefingTab as BriefingTab));
}
ui.briefingClose.addEventListener('click',()=>{
  ui.briefingPanel.hidden=true;
  ui.briefingToggle.setAttribute('aria-expanded','false');
  tacticalSheetNavigation.sync();
  notifyPresentation();
  config.updateContext();
});
// Shelved graphics experiment: the controls remain in source for future
// development but are hidden. Only explicit ?focusFx developer URLs opt in.
const miniatureFocusButtons=Array.from(
 ui.siteSettings.querySelectorAll<HTMLButtonElement>('[data-miniature-focus]'));
const storedMiniatureFocus=()=>readStoredText(MINIATURE_FOCUS_STORAGE_KEY);
let miniatureFocusSetting:MiniatureFocusMode=config.getFocusMode()??
 initialMiniatureFocusMode(
   config.boot.focusFx,storedMiniatureFocus());
function syncMiniatureFocusPreference():void{
 for(const button of miniatureFocusButtons){
   const active=button.dataset.miniatureFocus===miniatureFocusSetting;
   button.setAttribute('aria-pressed',String(active));
 }
}
for(const button of miniatureFocusButtons)button.addEventListener('click',()=>{
 const value=button.dataset.miniatureFocus;
 if(value!=='off'&&value!=='subtle'&&value!=='strong'&&value!=='replay')return;
 miniatureFocusSetting=value;
 config.setFocusMode(value);
 writeStoredText(MINIATURE_FOCUS_STORAGE_KEY,value);
 syncMiniatureFocusPreference();
});
syncMiniatureFocusPreference();

ui.uiHelp.addEventListener('click',()=>{
  closeMissionSettings();
  config.showHelp('Tap a route line to insert a waypoint · LOOK = brief check · WATCH = keep watching as you move · Hold a command for help.',8500);
  config.refreshHud();
});
ui.siteSettingsToggle.addEventListener('click',()=>{
  const opening=ui.siteSettings.hidden;
  collapseTacticalSheets(opening?'settings':null);
  ui.siteSettings.hidden=!opening;
  ui.siteSettingsToggle.setAttribute('aria-expanded',String(opening));
  if(opening)selectMissionSettingsTab('mission');
  tacticalSheetNavigation.sync();
  if(opening)tacticalSheetNavigation.focusFirst();
  else ui.siteSettingsToggle.focus();
  notifyPresentation();
  config.updateContext();
});

 }
 function syncMissionPhase():void{
  const phase=config.getSession().phase;
  if(phase!=='planning'){
    ui.briefingPanel.hidden=true;config.operationsBoard.hidden=true;
  }
  config.operationsToggle.hidden=
    config.getMode()!=='quick'||phase!=='planning'||config.isReplaying();
  config.operationsToggle.disabled=config.operationsToggle.hidden;
  if(config.operationsToggle.hidden)config.operationsBoard.hidden=true;
  notifyPresentation();
 }
 function syncNextSiteControls():void{
  const campaignMission=config.getMode()==='mission';
  const quickPlay=config.getMode()==='quick';
  // Quick Play size and building selection live in the scenario creator.
  // Do not show a competing size control that its worker will not read.
  ui.siteSize.hidden=quickPlay;
  ui.variant.textContent=quickPlay?'MISSION SETUP':'NEW SITE';
  ui.variant.disabled=campaignMission;
  ui.siteSize.disabled=campaignMission;
  ui.intelMode.disabled=campaignMission;
  ui.restart.disabled=campaignMission;
  const returnButton=document.getElementById('campaignReturnButton') as HTMLButtonElement|null;
  if(returnButton)returnButton.disabled=
    campaignMission&&config.getSession().phase==='running';
  ui.intelMode.textContent='NEXT SITE INTEL · '+
    config.getIntel().replaceAll('-', ' ').toUpperCase();
  ui.intelMode.disabled=campaignMission||config.isReplaying();
  ui.intelMode.title=campaignMission?
    'Campaign intelligence is defined by the active contract':
    'Applies to your next new site; current mission stays unchanged';
  ui.siteSize.textContent='NEXT SITE SIZE · '+config.getScale().toUpperCase();
  ui.siteSize.disabled=campaignMission||config.isReplaying();
 }
 
 let missionActionPorts:MissionActionsHooks|null=null;
 function executePlay(keyboard=false):void{
  const port=missionActionPorts;
  if(!port)return;
  const state=config.getSession();
  port.audio.unlock();
  if(!keyboard)port.audio.uiClickTone(state.phase==='running'?'pause':'go');
  if(state.phase==='won'||state.phase==='lost'){
   if(!port.returnAfterCampaignMission()){
    if(config.getMode()==='quick')port.returnToQuickPlayGenerator();
    else port.resetMission();
   }
  }else{
   port.resetTargeting();port.captureBeforeExecution();port.toggleExecution();
   if(!keyboard)config.refreshHud();
  }
  if(keyboard)config.refreshHud();
 }
 function bindMissionActions(port:MissionActionsHooks):void{
  if(missionActionPorts)return;
  missionActionPorts=port;
  ui.variant.addEventListener('click',async()=>{
   if(config.isReplaying()||config.getMode()==='mission')return;
   if(config.getMode()==='quick'){port.returnToQuickPlayGenerator();return;}
   const state=config.getSession();
   if((state.started||team(state).some(a=>a.plan.length>0))&&
     !await confirmFieldworkAction({
       title:'Generate a new site?',
       message:'Your current routes and progress will be replaced. Your Quick Play campaign data remains separate.',
       confirmLabel:'GENERATE NEW SITE',danger:true
     }))return;
   port.resetMission(state.variant+1);
  });
  ui.retry.addEventListener('click',()=>{
   if(config.getMode()!=='mission')port.restartMission();
  });
  ui.next.addEventListener('click',()=>{
   if(port.returnAfterCampaignMission())return;
   if(config.getMode()==='quick')port.returnToQuickPlayGenerator();
   else port.resetMission(config.getSession().variant+1);
  });
  const afterActionMainMenu=document.getElementById('afterActionMainMenu') as HTMLButtonElement|null;
  afterActionMainMenu?.addEventListener('click',()=>{
   if(config.isReplaying())return;
   ui.debrief.hidden=true;config.operationsBoard.hidden=true;
   closeMissionSettings(false);port.setMode('menu');
   port.campaignEntry(!!config.getCampaign());
  });
  ui.play.addEventListener('click',()=>executePlay(false));
  ui.restart.addEventListener('click',async()=>{
   if(config.getMode()==='mission'||config.isReplaying())return;
   const state=config.getSession();
   if((state.started||team(state).some(a=>a.plan.length>0))&&
     !await confirmFieldworkAction({
       title:'Restart this mission?',
       message:'All current orders and discoveries will be discarded.',
       confirmLabel:'RESTART MISSION',danger:true
     }))return;
   port.restartMission();closeMissionSettings(false);showMissionBriefing();
  });
 }

 function bindSitePreferences():void{
ui.siteLighting.textContent='LIGHTING · '+config.getLighting().toUpperCase();
ui.siteLighting.addEventListener('click',()=>{
  if(config.isReplaying()||config.getSession().started||config.getSession().phase!=='planning'){
    config.showHelp('CHOOSE LIGHTING BEFORE DEPLOYMENT');return;
  }
  const current=config.lightingModes.indexOf(config.getLighting());
  config.setLighting(config.lightingModes[(current+1)%config.lightingModes.length]);
  config.getSession().lightingMode=config.getLighting();
  ui.siteLighting.textContent='LIGHTING · '+config.getLighting().toUpperCase();
  const url=new URL(location.href);
  if(config.getLighting()==='day')url.searchParams.delete('lighting');
  else url.searchParams.set('lighting',config.getLighting());
  history.replaceState(null,'',url.href);
  config.refreshHud();
});
ui.siteSize.textContent='MAP SIZE · '+config.getScale().toUpperCase();
// Explicit, touch-friendly choices for next-site rules. This chooser only
// updates future generation settings and never mutates the active mission.

ui.siteSize.addEventListener('click',()=>{
 if(config.isReplaying()||config.getMode()==='mission')return;
 openSiteChoices(ui.siteSize,'BUILDING SIZE',[
  {value:'small',label:'SMALL',description:'Shorter operation · compact site'},
  {value:'medium',label:'MEDIUM',description:'Balanced layout and encounter'},
  {value:'large',label:'LARGE',description:'Larger, more involved operation'}
 ],config.getScale(),selected=>{
  config.setScale(selected as SiteScale);
  ui.siteSize.textContent='NEXT SITE SIZE · '+selected.toUpperCase();
  const url=new URL(location.href);
  url.searchParams.set('scale',selected);
  history.replaceState(null,'',url.href);
  config.showHelp('NEXT SITE SIZE SET · CURRENT SITE UNCHANGED',2300);
 });
});

ui.intelMode.addEventListener('click',()=>{
 if(config.isReplaying()||config.getMode()==='mission')return;
 openSiteChoices(ui.intelMode,'INTELLIGENCE',[
  {value:'true-blind',label:'TRUE BLIND',description:'Discover the environment during play'},
  {value:'exterior-known',label:'EXTERIOR KNOWN',description:'Exterior known · interior unexplored'},
  {value:'floor-plan',label:'FLOOR PLAN',description:'Building plan known · threats unknown'},
  {value:'full-view',label:'FULL VIEW',description:'Sandbox-style full site knowledge'}
 ],config.getIntel(),selected=>{
  if(!INTEL_MODES.includes(selected as IntelMode))return;
  config.setIntel(selected as IntelMode);
  saveIntelPreference(config.getIntel());
  config.showHelp('NEXT SITE INTEL SET · CURRENT KNOWLEDGE UNCHANGED',3000);
  config.refreshHud();
 });
});

 }
 return {
  bindSitePreferences,bindMenus,bindMissionActions,executePlay,syncMissionPhase,syncNextSiteControls,
  syncSheets:()=>tacticalSheetNavigation.sync(),
  closeSettings:closeMissionSettings,showBriefing:showMissionBriefing,
  navigation:tacticalSheetNavigation,collapse:collapseTacticalSheets,
  syncBriefingCard,setBriefingIntelTab,setBriefingView
 };
}
