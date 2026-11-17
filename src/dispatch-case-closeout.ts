/** D14.8: retrospective display from settled CampaignReport evidence only.
 * A reported lead remains unverified, even after a successful mission.
 * No new investigation, legal ruling, case state, or save data.
 */
import type {CampaignState,CampaignReport} from './campaign-state.ts';
import {isDispatchPilot} from './dispatch-campaign-eligibility.ts';
import {campaignIncidentView} from './dispatch-incident-view.ts';
import {dispatchCaseDossier} from './dispatch-case-dossier.ts';

export type DispatchCaseCloseout=Readonly<{
 title:string;day:number;reported:string;recorded:string;
 forceEvidence:string;relationship:string;
}>;

export function dispatchCaseCloseout(campaign:CampaignState,
 report:CampaignReport):DispatchCaseCloseout|null{
 if(!isDispatchPilot(campaign))return null;
 // Refuse speculative previews or detached synthetic reports.
 const stored=campaign.history.find(row=>row.id===report.id&&
  row.contractId===report.contractId);
 if(!stored)return null;
 const contract=campaign.contracts.find(row=>row.id===stored.contractId);
 const dossier=contract?dispatchCaseDossier(campaign,contract):null;
 const title=contract?campaignIncidentView(campaign,contract).title:
  'RETAINED OPERATION · ORIGINAL INCIDENT NOT AVAILABLE';
 const evidence=stored.dispatchForce;
 const forceEvidence=!evidence?
  'NO RETAINED FORCE REVIEW · cannot assess civilian harm or suspect contact':
  evidence.blueCivilianInjured+evidence.blueCivilianDown>0?
   'RETAINED REVIEW · SQUAD CIVILIAN HARM RECORDED · '+
    evidence.blueCivilianInjured+' INJURED · '+evidence.blueCivilianDown+' DOWN':
   'RETAINED REVIEW · NO SQUAD CIVILIAN HARM RECORDED · not a legal finding';
 const prior=contract?.followUpOf?dossier?.related.at(-1):undefined;
 const relationship=!contract?
  'CONTRACT ARCHIVED OR PRUNED · prior relationship unavailable':
  !contract.followUpOf?'NO RECORDED PRIOR OPERATION LINK':
  !prior?'PRIOR OPERATION LINK INCOMPLETE':
  prior.outcome==='unknown'?'PRIOR OPERATION RECORD UNAVAILABLE':
  'RELATED RESPONSE · '+prior.title+' · '+
   (prior.outcome==='unrecorded'?'OUTCOME UNRECORDED':
    prior.outcome.toUpperCase())+
   ' · shared suspects and site not established';
 return Object.freeze({
  title,day:stored.day,
  reported:dossier?.lead??'ORIGINAL REPORTED LEAD UNAVAILABLE',
  recorded:'MISSION '+stored.outcome.toUpperCase()+' · OBJECTIVE '+
   (stored.objective?'RECORDED COMPLETE':'RECORDED INCOMPLETE')+
   ' · GRADE '+stored.grade,
  forceEvidence,relationship
 });
}
