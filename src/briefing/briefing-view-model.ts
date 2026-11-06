/** V3: one compact, truthful briefing card. UI reads this, not prose fragments. */
import type {OperationKind,OperationBrief} from '../breach-operations.ts';
import type {IntelClaim,OperationDossierV1,ClaimConfidence,ClaimSource} from './briefing-types.ts';

export type BriefingTab='threat'|'site'|'case'|'contract';
export type BriefingStep={action:string;detail:string};
export type BriefingReport={id:string;text:string;source:ClaimSource;confidence:ClaimConfidence};
export type BriefingCardModel={
 title:string;missionLabel:string;siteLabel:string;primary:string;
 situation:string;steps:readonly [BriefingStep,BriefingStep,BriefingStep];
 threat:{value:string;confidence:ClaimConfidence};
 layout:string;
 caseContext:string;
 campaignLabel:string|null;
 followUp:string|null;
 reports:Record<Exclude<BriefingTab,'contract'>,BriefingReport[]>;
 objective:string;condition:string;extraction:string;
};
export type BriefingOperation=OperationBrief & {building:string;layout:string;squad:number};
const steps:Record<OperationKind,readonly [BriefingStep,BriefingStep,BriefingStep]>={
 clear:[
  {action:'CLEAR',detail:'Neutralize threats'},
  {action:'SECURE',detail:'Reach objective'},
  {action:'EXTRACT',detail:'Withdraw team'}],
 intel:[
  {action:'LOCATE',detail:'Find cache'},
  {action:'COLLECT',detail:'Hold to recover'},
  {action:'EXTRACT',detail:'Carry evidence out'}],
 rescue:[
  {action:'LOCATE',detail:'Find person'},
  {action:'CONTACT',detail:'Establish escort'},
  {action:'EXTRACT',detail:'Escort person out'}],
 hold:[
  {action:'OCCUPY',detail:'Reach position'},
  {action:'HOLD',detail:'7 sec uncontested'},
  {action:'EXTRACT',detail:'Withdraw'}],
 capture:[
  {action:'STOP',detail:'Disable or surrender'},
  {action:'SECURE',detail:'Secure target'},
  {action:'EXTRACT',detail:'Withdraw'}],
};
const primaries:Record<OperationKind,string>={
 clear:'Clear and secure the objective.',
 intel:'Recover the intelligence cache.',
 rescue:'Locate and recover the person.',
 hold:'Secure and hold the position.',
 capture:'Secure the designated target.',
};
const claimGroup=(claim:IntelClaim):Exclude<BriefingTab,'contract'>=>{
 if(['threat','prepared-resistance','civilian-presence'].includes(claim.id))return 'threat';
 if(['floor-plan','layout-unknown','vacant-record'].includes(claim.id))return 'site';
 return 'case';
};
export function createBriefingCardModel(
 kind:OperationKind,brief:BriefingOperation,dossier?:OperationDossierV1
):BriefingCardModel{
 const reports:{threat:BriefingReport[];site:BriefingReport[];case:BriefingReport[]}={
  threat:[],site:[],case:[]
 };
 for(const claim of dossier?.claims??[]){
  reports[claimGroup(claim)].push({
   id:claim.id,text:claim.text,source:claim.source,confidence:claim.confidence
  });
 }
 const threat=dossier?.claims.find(c=>c.id==='threat');
 if(!threat)reports.threat.push({
  id:'fallback-threat',text:brief.notes,source:'dispatch',confidence:'unknown'
 });
 const mode=dossier?.classification.intelMode;
 const layout=mode==='full-view'?'Full site view':
  mode==='floor-plan'?'Floor plan available':
  mode==='true-blind'?'No verified plan':'Interior uncharted';
 const threatValue=threat?.confidence==='confirmed'?'Verified report':
  threat?.confidence==='credible'?'Occupants reported':
  threat?.confidence==='unverified'?'Possible hostiles':'Unconfirmed';
 const followUp=dossier?.campaign?.followUp;
 return {
  title:dossier?.identity.title??brief.code,
  missionLabel:brief.name,
  siteLabel:brief.building,
  primary:primaries[kind],
  situation:dossier?.incident.lead??brief.notes,
  steps:steps[kind],
  threat:{value:threatValue,confidence:threat?.confidence??'unknown'},
  layout,
  caseContext:dossier?.incident.context??'',
  campaignLabel:dossier?.campaign?
   dossier.campaign.region.toUpperCase()+' · RISK '+dossier.campaign.risk+
    ' · '+dossier.campaign.title:null,
  followUp:followUp?
   'Follow-up: '+followUp.title+' ('+followUp.outcome+')':null,
  reports,
  objective:brief.objective,condition:brief.condition,extraction:brief.extraction
 };
}
