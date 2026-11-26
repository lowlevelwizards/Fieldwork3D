/** D13: one read-only procurement quote for the Operations Room.
 * Never treats a curated appearance snapshot as a historical issue record.
 */
import type {CampaignState,CampaignOperator} from './campaign-state.ts';
import {WEAPON_PRICES,canAffordCampaignPurchase,
 campaignCatalogStockAtCapacity,canEquipCampaignCatalogWeapon} from './campaign-state.ts';
import {isDispatchPilot}
 from './dispatch-campaign-eligibility.ts';
import {effectiveDispatchSetup,currentDispatchReference}
 from './dispatch-campaign-setup.ts';
import {dispatchCatalogWeaponAccess} from './dispatch-weapon-access.ts';
import {initialDispatchDepartment} from './dispatch-department.ts';

import {FAMILY_PRESETS,FAMILY_PARTS,familyPreset,matchingFamilyPreset} from './equipment-weapon-families.ts';
export type CampaignWeaponProcurementStatus='ready'|'reference-locked'|'not-assessed'|
 'standing-locked'|'deployment-locked'|'funds-locked'|'armory-full';
export type CatalogWeaponQuote=Readonly<{
 presetId:string;name:string;weapon:CampaignOperator['weapon'];price:number;stock:number;issued:number;
 status:CampaignWeaponProcurementStatus;canPurchase:boolean;authorization:string;priceLabel:string;
}>;
export function catalogWeaponQuote(c:CampaignState,presetId:string):CatalogWeaponQuote|undefined{
 const preset=familyPreset(presetId);
 if(!preset)return undefined;
 const price=WEAPON_PRICES[preset.weapon];
 const assigned=new Set(c.operators.filter(o=>o.status!=='lost'&&o.status!=='retired').map(o=>o.weaponSerialId));
 const matching=(c.inventory.serializedWeapons??[]).filter(w=>matchingFamilyPreset(w.catalogBody)?.id===presetId);
 const issued=matching.filter(w=>assigned.has(w.id)).length;
 const stock=catalogOwnedStock(c).filter(w=>matchingFamilyPreset(w.catalogBody)?.id===presetId).length;
 const dispatch=isDispatchPilot(c),setup=effectiveDispatchSetup(c);
 const standing=(c.dispatchDepartment??initialDispatchDepartment()).standing;
 const access=dispatch?dispatchCatalogWeaponAccess(setup,currentDispatchReference(c),standing,presetId):'offered';
 const status:CampaignWeaponProcurementStatus=access!=='offered'?access:
  c.activeContractId?'deployment-locked':campaignCatalogStockAtCapacity(c)?'armory-full':
  !canAffordCampaignPurchase(c,price)?'funds-locked':'ready';
 const authorization=status==='standing-locked'?'CAREER RESTRICTED · Standing 70 / 100 required (current '+standing+')':
  status==='reference-locked'?'NOT OFFERED · Current reference, time or access policy':
  status==='not-assessed'?'NOT ASSESSED · No playable Dispatch reference evaluates this named model':
  status==='deployment-locked'?'DEPLOYMENT ACTIVE · Armory frozen':
  status==='armory-full'?'ARMORY FULL · Serialized weapon capacity reached':
  status==='funds-locked'?'INSUFFICIENT FUNDS · '+price+' CR needed':
  'ELIGIBLE · '+(stock>0?'Armory copies available':'No spare copies yet');
 return {presetId,name:preset.name,weapon:preset.weapon,price,stock,issued,status,authorization,
  canPurchase:status==='ready',priceLabel:dispatch&&setup.economy==='unlimited'?'NO CHARGE':price+' CR'};
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
