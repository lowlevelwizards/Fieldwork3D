/** D13: one read-only procurement quote for the Operations Room.
 * Never treats a curated appearance snapshot as a historical issue record.
 */
import type {CampaignState,CampaignOperator} from './campaign-state.ts';
import {WEAPON_PRICES,canAffordCampaignPurchase,
 campaignCatalogStockAtCapacity,canEquipCampaignCatalogWeapon} from './campaign-state.ts';
import {isDispatchPilot,mayChooseCampaignContent,mayChooseDispatchSetupContent}
 from './dispatch-campaign-eligibility.ts';
import {effectiveDispatchSetup,currentDispatchReference}
 from './dispatch-campaign-setup.ts';
import {dispatchWeaponAccess} from './dispatch-weapon-access.ts';
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
 const price=WEAPON_PRICES[weapon],stock=catalogOwnedStock(c).filter(w=>w.platform===weapon).length;
 const issued=c.operators.filter(x=>x.status!=='retired'&&x.status!=='lost'&&
  x.weapon===weapon).length;
 const dispatch=isDispatchPilot(c);
 const unlimited=dispatch&&effectiveDispatchSetup(c).economy==='unlimited';
 const offered=mayChooseCampaignContent(c,'equipment','primary-'+weapon,'primary');
 const department=c.dispatchDepartment??initialDispatchDepartment();
 // Ask the existing policy whether standing is the *only* missing condition.
 // This is a quote, never a bypass of the mutation-time authorization check.
 const access=dispatch?dispatchWeaponAccess(effectiveDispatchSetup(c),
  currentDispatchReference(c),department.standing,weapon):'offered';
 const status:CampaignWeaponProcurementStatus=!offered?
  access==='offered'?'reference-locked':access:
  c.activeContractId?'deployment-locked':
  campaignCatalogStockAtCapacity(c)?'armory-full':
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

import {FAMILY_PRESETS,FAMILY_PARTS,familyPreset,matchingFamilyPreset} from './equipment-weapon-families.ts';
import {DISPATCH_PLAYABLE_REFERENCE_IDS} from './dispatch-campaign-setup.ts';
import {dispatchStarterChoiceStatus} from './dispatch-starter-choices.ts';
/** Named quote uses real owned bodies and both existing authorization guards. */
export type CatalogWeaponQuote=CampaignWeaponQuote & Readonly<{presetId:string;name:string}>;
export function catalogWeaponQuote(c:CampaignState,presetId:string):CatalogWeaponQuote|undefined{
 const preset=familyPreset(presetId);
 if(!preset)return undefined;
 const base=campaignWeaponQuote(c,preset.weapon);
 const assigned=new Set(c.operators.filter(o=>o.status!=='lost'&&o.status!=='retired').map(o=>o.weaponSerialId));
 const matching=(c.inventory.serializedWeapons??[]).filter(w=>matchingFamilyPreset(w.catalogBody)?.id===presetId);
 const issued=matching.filter(w=>assigned.has(w.id)).length,
  stock=catalogOwnedStock(c).filter(w=>matchingFamilyPreset(w.catalogBody)?.id===presetId).length;
 let status=base.status,authorization=base.authorization;
 if(!mayChooseCampaignContent(c,'weapon-preset',presetId)){
  const setup=effectiveDispatchSetup(c),reference=currentDispatchReference(c);
  const standing=(c.dispatchDepartment??initialDispatchDepartment()).standing;
  const at70=standing<70&&mayChooseDispatchSetupContent(setup,reference,70,'weapon-preset',presetId)&&
   mayChooseDispatchSetupContent(setup,reference,70,'equipment','primary-'+preset.weapon,'primary');
  const assessed=DISPATCH_PLAYABLE_REFERENCE_IDS.some(ref=>dispatchStarterChoiceStatus(ref,'weapon-preset',presetId)!==null);
  status=at70?'standing-locked':assessed?'reference-locked':'not-assessed';
  authorization=at70?'CAREER RESTRICTED · Standing 70 / 100 required (current '+standing+')':
   assessed?'NOT OFFERED · Current reference, time or access policy':
   'NOT ASSESSED · No playable Dispatch reference evaluates this named model';
 }else if(status==='ready')authorization='ELIGIBLE · '+(stock>0?'Armory copies available':'No spare copies yet');
 return {...base,presetId,name:preset.name,stock,issued,status,authorization,canPurchase:status==='ready'};
}
export function catalogWeaponOfferings(c:CampaignState):CatalogWeaponQuote[]{
 return FAMILY_PRESETS.map(p=>catalogWeaponQuote(c,p.id)!)
  .sort((a,b)=>Number(b.canPurchase)-Number(a.canPurchase)||a.name.localeCompare(b.name)||a.presetId.localeCompare(b.presetId));
}

import type {SerializedWeapon} from './equipment-weapon-identity.ts';
import {catalogOwnedStock} from './equipment-weapon-ownership.ts';
export function ownedCatalogWeaponName(w:SerializedWeapon):string{
 return matchingFamilyPreset(w.catalogBody)?.name??
  ((FAMILY_PARTS[w.catalogBody.parts.receiver]?.name??w.catalogBody.family.toUpperCase())+' · CUSTOM');
}
export function catalogWeaponIssueOptions(c:CampaignState,operatorId:string){
 return catalogOwnedStock(c).map(w=>({
  serialId:w.id,name:ownedCatalogWeaponName(w),condition:w.condition,
  enabled:canEquipCampaignCatalogWeapon(c,operatorId,w.id)
 })).sort((a,b)=>Number(b.enabled)-Number(a.enabled)||a.name.localeCompare(b.name)||a.serialId.localeCompare(b.serialId));
}
