/** D4.2 Dispatch-only incident presentation over EXISTING contracts.
 * Absolutely no mission kind, objective, map, reward, risk, save, intel
 * or simulation mutation. Names are callout framing, not new police systems.
 */
import type {CampaignState,Contract} from './campaign-state.ts';
import {isDispatchPilot} from './dispatch-campaign-eligibility.ts';

const LABELS:Partial<Record<Contract['kind'],Readonly<{
 title:string;context:string;
}>>>={
 clear:{title:'Site Security Callout',context:'Secure the site using the existing clear objective.'},
 intel:{title:'Document Recovery Callout',context:'Recover the existing document objective and extract.'},
 rescue:{title:'Civilian Assistance Callout',context:'Locate and escort the existing civilian objective.'},
 hold:{title:'Site Defense Callout',context:'Secure and hold the assigned location.'},
 capture:{title:'Target Recovery Callout',context:'Complete the existing target recovery objective.'}
};

export type DispatchIncidentView=Readonly<{
 title:string;description:string;category:string;reference:string;
 originalTitle:string;
}>;

export function campaignIncidentView(campaign:CampaignState,contract:Contract):
 DispatchIncidentView{
 if(!isDispatchPilot(campaign))
  return {title:contract.title,description:contract.description,
   category:'CONTRACT',reference:contract.id,originalTitle:contract.title};
 const label=LABELS[contract.kind];
 return Object.freeze({
  title:label?.title??contract.title,
  description:label?.context??contract.description,
  category:'DISPATCH / PILOT INCIDENT',
  reference:'DISPATCH · '+contract.id.toUpperCase(),
  originalTitle:contract.title
 });
}
