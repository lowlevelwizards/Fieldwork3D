/** Stage 11: briefing, settings and mission sheet coordinator.
 * UI ownership only: no tactical orders, campaign persistence or mission rules.
 */
import {team,operationBriefing,type Session} from '../breach-game.ts';
import type {CampaignState} from '../campaign-state.ts';
import {createBriefingCardModel,type BriefingReport,type BriefingTab}
 from '../briefing/briefing-view-model.ts';
import {createTacticalSheetNavigation} from './tactical-sheet-navigation.ts';
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
};
export type MissionScreensHooks={
 ui:MissionScreensElements;
 operationsBoard:HTMLElement;operationsToggle:HTMLButtonElement;
 getSession:()=>Session;getCampaign:()=>CampaignState|null;
 getMode:()=> 'menu'|'home'|'mission'|'quick';
 isReplaying:()=>boolean;briefingPreviewEnabled:boolean;
 getEntryId:()=>string;hideWeaponChooser:()=>void;
 closeSiteChoice:()=>void;hideContextPalette:()=>void;
 renderOperationsBoard:()=>void;updateContext:()=>void;
};
export function createBreachMissionScreens(config:MissionScreensHooks){
 const ui=config.ui;
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
  config.closeSiteChoice();
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
 return {
  navigation:tacticalSheetNavigation,collapse:collapseTacticalSheets,
  syncBriefingCard,setBriefingIntelTab,setBriefingView
 };
}
