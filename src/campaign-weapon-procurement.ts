/** D13: one read-only procurement quote for the Operations Room.
 * Never treats a curated appearance snapshot as a historical issue record.
 */
import type {CampaignState,CampaignOperator} from './campaign-state.ts';
import {WEAPON_PRICES,canAffordCampaignPurchase,
 campaignWeaponStockAtCapacity} from './campaign-state.ts';
import {isDispatchPilot,mayChooseCampaignContent}
 from './dispatch-campaign-eligibility.ts';
import {effectiveDispatchSetup,DISPATCH_PLAYABLE_REFERENCE_IDS}
 from './dispatch-campaign-setup.ts';
import {dispatchStarterChoiceStatus} from './dispatch-starter-choices.ts';
import {initialDispatchDepartment} from './dispatch-department.ts';

export const CAMPAIGN_WEAPON_PLATFORMS=[
 'carbine','smg','rifle','shotgun'
] as const satisfies readonly CampaignOperator['weapon'][];
export type CampaignWeaponProcurementStatus='ready'|'reference-locked'|'not-assessed'|
 'standing-locked'|'deployment-locked'|'funds-locked'|'armory-full';
export type CampaignWeaponQuote=Readonly<{
 weapon:CampaignOperator['weapon'];price:number;stock:number;issued:number;
 status:CampaignWeaponProcurementStatus;canPurchase:boolean;
 authorization:string;priceLabel:string;
}>;
export function campaignWeaponQuote(c:CampaignState,
 weapon:CampaignOperator['weapon']):CampaignWeaponQuote{
 const price=WEAPON_PRICES[weapon],stock=c.inventory.weapons[weapon]??0;
 const issued=c.operators.filter(x=>x.status!=='retired'&&x.status!=='lost'&&
  x.weapon===weapon).length;
 const dispatch=isDispatchPilot(c);
 const unlimited=dispatch&&effectiveDispatchSetup(c).economy==='unlimited';
 const offered=mayChooseCampaignContent(c,'equipment','primary-'+weapon,'primary');
 const department=c.dispatchDepartment??initialDispatchDepartment();
 // Ask the existing policy whether standing is the *only* missing condition.
 // This is a quote, never a bypass of the mutation-time authorization check.
 const withStanding={...c,dispatchDepartment:{...department,standing:100}};
 const standingOnly=dispatch&&!offered&&department.standing<70&&
  mayChooseCampaignContent(withStanding,'equipment','primary-'+weapon,'primary');
 // A gap in all playable authored references is NOT an explicit refusal.
 // Keep this distinct from a valid item offered by another reference but
 // unavailable under the current time, scope or access settings.
 const assessedElsewhere=DISPATCH_PLAYABLE_REFERENCE_IDS.some(referenceId=>
  dispatchStarterChoiceStatus(referenceId,'equipment','primary-'+weapon)!==null);
 const status:CampaignWeaponProcurementStatus=!offered?
  standingOnly?'standing-locked':assessedElsewhere?'reference-locked':'not-assessed':
  c.activeContractId?'deployment-locked':
  campaignWeaponStockAtCapacity(c)?'armory-full':
  !canAffordCampaignPurchase(c,price)?'funds-locked':'ready';
 const authorization=status==='reference-locked'?
  'NOT OFFERED · Current reference, time or access policy':
  status==='not-assessed'?
  'NOT ASSESSED · No playable Dispatch reference evaluates this weapon class':
  status==='standing-locked'?
  'CAREER RESTRICTED · Standing 70 / 100 required (current '+department.standing+')':
  status==='deployment-locked'?'DEPLOYMENT ACTIVE · Armory frozen':
  status==='armory-full'?'ARMORY FULL · Serialized weapon capacity reached':
  status==='funds-locked'?'INSUFFICIENT FUNDS · '+price+' CR needed':
  'ELIGIBLE · '+(stock>0?'Armory copies available':'No spare copies yet');
 return {weapon,price,stock,issued,status,canPurchase:status==='ready',
  authorization,priceLabel:unlimited?'NO CHARGE':price+' CR'};
}
