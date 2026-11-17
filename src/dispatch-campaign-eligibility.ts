/** D3.1: actual mutation-time Dispatch guard. Reuse D2 source policy.
 * A Dispatch pilot has only the curated 2015 SWAT reference. All other
 * Campaign and Quick Play modes continue through their existing validators.
 */
import type {CampaignState} from './campaign-state.ts';
import type {EquipmentSlot} from './equipment-catalog.ts';
import type {DispatchContentKind} from './dispatch-content-policy.ts';
import {mayChooseDispatchSelection} from './dispatch-selection-projection.ts';
import {currentDispatchReference,effectiveDispatchSetup} from './dispatch-campaign-setup.ts';
import {DISPATCH_STARTER_REFERENCE_IDS} from './dispatch-content-foundation.ts';

export const isDispatchPilot=(campaign:CampaignState):boolean=>
 campaign.rules?.template==='dispatch';

export function mayChooseCampaignContent(campaign:CampaignState,
 kind:DispatchContentKind,id:string,equipmentSlot?:EquipmentSlot):boolean{
 if(!isDispatchPilot(campaign))return true;
 const setup=effectiveDispatchSetup(campaign);
 if(setup.equipmentScope==='global')return true;
 const reference=currentDispatchReference(campaign);
 const restrictedByTime=setup.unlockMode==='historical'||setup.unlockMode==='both';
 const sourceIds=setup.equipmentScope==='dispatch'&&!restrictedByTime?
  DISPATCH_STARTER_REFERENCE_IDS:[reference];
 const careerAccess=setup.unlockMode==='all'||setup.unlockMode==='historical'||
  (campaign.dispatchDepartment?.standing??50)>=70;
 return sourceIds.some(referenceId=>mayChooseDispatchSelection({
   context:{mode:'dispatch',referenceId,specialistAuthorized:careerAccess},
   kind,equipmentSlot
  },id));
}

/** A temporarily unsupported mutation path is disabled rather than offered
 * with a UI-only restriction. Existing saved data is NEVER erased.
 * This applies only to optional cosmetic/weapon construction editing.
 */
export const dispatchPilotUnclassifiedEditingEnabled=(campaign:CampaignState)=>
 !isDispatchPilot(campaign)||effectiveDispatchSetup(campaign).equipmentScope==='global';
