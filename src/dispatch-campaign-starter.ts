/** D3/D4 narrow pilot: the one authored 2015 SWAT appearance.
 * Uses normal Campaign career and ownership, no new incident mechanics. */
import {newCampaign,type CampaignState} from './campaign-state.ts';
import {createCampaignRules} from './campaign-rules.ts';
import {issueDispatchPilotOperator} from './dispatch-pilot-operator.ts';
import {reconcileCampaignWeaponOwnership} from './equipment-weapon-ownership.ts';

export function newDispatchPilotCampaign(seed:number):CampaignState{
 const base=newCampaign(seed,createCampaignRules('dispatch'),'Dispatch SWAT Pilot');
 return reconcileCampaignWeaponOwnership({...base,
  operators:base.operators.map(issueDispatchPilotOperator)});
}
