/** Arsenal V2 Stage 7a: pure Campaign quote + all-or-nothing commit.
 * Body changes remain appearance-only under the existing class-based economy.
 * No weapon class, serial, ammo, magazine, service-history or kit mutation.
 */
import type {CampaignState} from '../campaign-state.ts';
import {WEAPON_ATTACHMENT_SLOTS,sameWeaponConfiguration,
 type WeaponConfiguration} from '../equipment-weapon-assemblies.ts';
import {attachmentPrice,returnAttachments} from '../equipment-weapon-inventory.ts';
import {arsenalRecipeToLegacy,type ArsenalRecipeV2} from './recipes.ts';

export interface CampaignArsenalPurchase{partId:string;price:number;}
export interface CampaignArsenalQuote{
 valid:boolean;canCommit:boolean;reason?:string;
 cost:number;purchases:readonly CampaignArsenalPurchase[];
 nextConfiguration?:WeaponConfiguration;
 stockAfter?:Record<string,number>;
}
const denied=(reason:string):CampaignArsenalQuote=>({
 valid:false,canCommit:false,reason,cost:0,purchases:[]
});
/** Preview only. Does not touch Campaign state, credits or parts stock. */
export function quoteCampaignArsenalEdit(c:CampaignState,operatorId:string,
 recipe:ArsenalRecipeV2):CampaignArsenalQuote{
 if(c.activeContractId)return denied('Finish the current contract before editing equipment');
 const operator=c.operators.find(o=>o.id===operatorId);
 if(!operator||operator.status==='lost'||operator.status==='retired')
  return denied('Operator is unavailable');
 if(recipe.weapon!==operator.weapon)
  return denied('Changing gameplay weapon class requires an explicit weapon swap');
 const next=arsenalRecipeToLegacy(recipe);
 if(!next)return denied('The assembled weapon is not valid');
 // The pre-existing Campaign attachment store remains authoritative.
 const stock=returnAttachments(c.inventory.attachments,operator.weaponConfiguration,next);
 const purchases:CampaignArsenalPurchase[]=[];
 let cost=0;
 for(const slot of WEAPON_ATTACHMENT_SLOTS){
  const id=next.slots[slot];
  if(id===operator.weaponConfiguration.slots[slot])continue;
  const price=attachmentPrice(id);
  if(price<0)return denied('Unknown inventory attachment '+id);
  if(price===0)continue;
  if((stock[id]??0)>0){stock[id]--;continue;}
  purchases.push({partId:id,price});cost+=price;
 }
 if(Object.values(stock).some(v=>!Number.isInteger(v)||v<0||v>999))
  return denied('Attachment stock capacity would be exceeded');
 if(c.funds<cost)return {valid:true,canCommit:false,
  reason:'Insufficient credits',cost,purchases,
  nextConfiguration:next,stockAfter:stock};
 return {valid:true,canCommit:true,cost,purchases,
  nextConfiguration:next,stockAfter:stock};
}
/** Re-quotes against CURRENT authority; stale previews cannot spend stale stock. */
export function commitCampaignArsenalEdit(c:CampaignState,operatorId:string,
 recipe:ArsenalRecipeV2):{state:CampaignState;quote:CampaignArsenalQuote}{
 const quote=quoteCampaignArsenalEdit(c,operatorId,recipe);
 if(!quote.canCommit||!quote.nextConfiguration||!quote.stockAfter)
  return {state:c,quote};
 const operator=c.operators.find(o=>o.id===operatorId);
 if(!operator)return {state:c,quote:denied('Operator is unavailable')};
 if(sameWeaponConfiguration(operator.weaponConfiguration,quote.nextConfiguration))
  return {state:c,quote};
 return {state:{...c,funds:c.funds-quote.cost,
  inventory:{...c.inventory,attachments:{...quote.stockAfter}},
  operators:c.operators.map(o=>o.id===operatorId?
   {...o,weaponConfiguration:quote.nextConfiguration!}:o)},
  quote};
}
