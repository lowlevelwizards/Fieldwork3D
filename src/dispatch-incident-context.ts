/** D5.0 – one presentation-only Dispatch incident identity, read from
 * canonical Campaign contracts. No persistence, gameplay, or mission mutation.
 */
import type {CampaignState,Contract,CampaignReport} from './campaign-state.ts';
import {isDispatchPilot} from './dispatch-campaign-eligibility.ts';
import {campaignIncidentView} from './dispatch-incident-view.ts';

export type DispatchIncidentContext=Readonly<{
 campaignId:string;contractId:string;reference:string;
 kind:Contract['kind'];title:string;description:string;
 region:string;risk:Contract['risk'];day:number;originalTitle:string;
 followUp?:Readonly<{contractId:string;title:string;outcome:'success'|'failure'}>;
}>;

/** Accept only an actual accepted contract; the contract ID remains the key. */
export function deployedDispatchIncident(campaign:CampaignState|null,
 contractId:string|null|undefined):DispatchIncidentContext|null{
 if(!campaign||!isDispatchPilot(campaign)||!contractId)return null;
 const contract=campaign.contracts.find(k=>k.id===contractId&&k.status==='accepted');
 if(!contract)return null;
 const view=campaignIncidentView(campaign,contract);
 const prior=contract.followUpOf?
  campaign.contracts.find(k=>k.id===contract.followUpOf):undefined;
 const priorReport=prior?campaign.history.find(r=>r.contractId===prior.id):undefined;
 const followUp=prior&&priorReport?Object.freeze({
  contractId:prior.id,
  title:campaignIncidentView(campaign,prior).title,
  outcome:priorReport.outcome
 }):undefined;
 return Object.freeze({campaignId:campaign.id,contractId:contract.id,
  reference:view.reference,kind:contract.kind,title:view.title,
  description:view.description,region:contract.region,risk:contract.risk,
  day:campaign.day,originalTitle:view.originalTitle,...(followUp?{followUp}:{})});
}

/** Transient mission identity is valid ONLY in this same career and for an
 * actual active or settled contract. No guessing another mission by kind. */
export function validatedDispatchIncident(campaign:CampaignState|null,
 snapshot:DispatchIncidentContext|null):DispatchIncidentContext|null{
 if(!campaign||!snapshot||!isDispatchPilot(campaign)||
  campaign.id!==snapshot.campaignId)return null;
 if(campaign.activeContractId===snapshot.contractId)return snapshot;
 return campaign.history.some(r=>r.contractId===snapshot.contractId)?
  snapshot:null;
}

/** Reopen a recorded career operation without persisting a second title.
 * Missing/pruned contract records get an explicitly unknown display name.
 */
export function historicalDispatchIncident(campaign:CampaignState|null,
 report:Pick<CampaignReport,'contractId'|'day'>):DispatchIncidentContext|null{
 if(!campaign||!isDispatchPilot(campaign))return null;
 const contract=campaign.contracts.find(c=>c.id===report.contractId);
 if(contract){
  const v=campaignIncidentView(campaign,contract);
  return Object.freeze({campaignId:campaign.id,contractId:contract.id,
   reference:v.reference,kind:contract.kind,title:v.title,
   description:v.description,region:contract.region,risk:contract.risk,
   day:report.day,originalTitle:v.originalTitle});
 }
 // Without contract facts even the mission kind or region is unknown.
 return null;
}
