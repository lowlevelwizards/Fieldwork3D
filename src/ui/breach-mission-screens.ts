/** Stage 11: briefing, settings and mission sheet coordinator.
 * UI ownership only: no tactical orders, campaign persistence or mission rules.
 */
import {team,operationBriefing,type Session} from '../breach-game.ts';
import type {CampaignState} from '../campaign-state.ts';
import {createBriefingCardModel,type BriefingReport,type BriefingTab}
 from '../briefing/briefing-view-model.ts';
import {createTacticalSheetNavigation} from './tactical-sheet-navigation.ts';
import {INTEL_MODES,type IntelMode} from '../breach-intel.ts';
import type {SiteScale} from '../breach-site.ts';
import type {LightingMode} from '../equipment-site-lighting.ts';
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
};
export type MissionScreensHooks={
 ui:MissionScreensElements;
 operationsBoard:HTMLElement;operationsToggle:HTMLButtonElement;
 getSession:()=>Session;getCampaign:()=>CampaignState|null;
 getMode:()=> 'menu'|'home'|'mission'|'quick';
 isReplaying:()=>boolean;briefingPreviewEnabled:boolean;
 getEntryId:()=>string;hideWeaponChooser:()=>void;
 hideContextPalette:()=>void;
 getLighting:()=>LightingMode;setLighting:(value:LightingMode)=>void;
 getScale:()=>SiteScale;setScale:(value:SiteScale)=>void;
 getIntel:()=>IntelMode;setIntel:(value:IntelMode)=>void;
 lightingModes:readonly LightingMode[];intelPreferenceKey:string;
 showHelp:(message:string,duration?:number)=>void;refreshHud:()=>void;
 renderOperationsBoard:()=>void;updateContext:()=>void;
};
export function createBreachMissionScreens(config:MissionScreensHooks){
 const ui=config.ui;
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
  try{localStorage.setItem(config.intelPreferenceKey,config.getIntel());}
  catch{/* Preferences are optional in restricted browsing contexts. */}
  config.showHelp('NEXT SITE INTEL SET · CURRENT KNOWLEDGE UNCHANGED',3000);
  config.refreshHud();
 });
});

 }
 return {
  bindSitePreferences,
  navigation:tacticalSheetNavigation,collapse:collapseTacticalSheets,
  syncBriefingCard,setBriefingIntelTab,setBriefingView
 };
}
