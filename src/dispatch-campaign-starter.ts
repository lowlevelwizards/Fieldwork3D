/** D3/D4 narrow pilot: the one authored 2015 SWAT appearance.
 * Uses normal Campaign career and ownership, no new incident mechanics. */
import {createDispatchSetup,effectiveDispatchSetup,
 dispatchSetupCustomized,dispatchSetupDisplayLabel,
 type DispatchCampaignDraft} from './dispatch-campaign-setup.ts';
import {newCampaign,type CampaignState} from './campaign-state.ts';
import {createCampaignRules} from './campaign-rules.ts';
import {issueDispatchPilotOperator} from './dispatch-pilot-operator.ts';
import {reconcileCampaignWeaponOwnership} from './equipment-weapon-ownership.ts';

export function newDispatchPilotCampaign(seed:number,draft?:DispatchCampaignDraft):CampaignState{
 const setup=createDispatchSetup(draft??{
  preset:'career',referenceId:'us-swat-2015',timeMode:'fixed',
  equipmentScope:'department',unlockMode:'career',
  economy:'standard',startingInventory:'issued'
 });
 const base=newCampaign(seed,createCampaignRules('dispatch'),
  dispatchSetupCustomized(setup)?'Dispatch '+dispatchSetupDisplayLabel(setup):
  setup.preset==='historical'?'Dispatch Historical':
  setup.preset==='decades'?'Dispatch Through the Decades':
  setup.preset==='open'?'Dispatch Open Department':
  setup.preset==='creative'?'Dispatch Creative':'Dispatch Department Career');
 const active=effectiveDispatchSetup({dispatchSetup:setup});
 const operators=base.operators.map(o=>issueDispatchPilotOperator(o,active.referenceId));
 return reconcileCampaignWeaponOwnership({...base,dispatchSetup:setup,operators,
  inventory:{...base.inventory,catalogVersion:undefined,serializedWeapons:undefined},
  ...(setup.economy==='unlimited'?{
   funds:1000000,supplies:{medical:999,ammo:9999,flash:999,
    wedges:999,cuffs:999}
  }:{}),
  ...(setup.startingInventory==='all'?{inventory:{...base.inventory,catalogVersion:undefined,serializedWeapons:undefined,
   weapons:{carbine:8,smg:8,rifle:8,shotgun:8}}}:{})
 });
}
