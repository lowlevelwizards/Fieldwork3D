/** Arsenal V2 Stage 7a: pure Campaign quote + all-or-nothing commit.
 * Body changes remain appearance-only under the existing class-based economy.
 * Existing rounds, serials, service history and weapon class remain owned;
 * a smaller authored magazine conservatively repacks the current rounds.
 */
import type {CampaignState} from '../campaign-state.ts';
import {isDispatchPilot,dispatchPilotUnclassifiedEditingEnabled}
 from '../dispatch-campaign-eligibility.ts';
import {effectiveDispatchSetup} from '../dispatch-campaign-setup.ts';
import {fitMagazineInventory} from './live-magazine-capacity.ts';
import {sameWeaponConfiguration,type WeaponConfiguration}
 from '../equipment-weapon-assemblies.ts';
import {quoteAttachmentTransfer,type AttachmentAcquisition}
 from '../equipment-weapon-transactions.ts';
import {arsenalRecipeToLegacy,type ArsenalRecipeV2} from './recipes.ts';
import {resolveMountedAccessoryLayout}
 from '../weapons/geometry/mounted-accessory-layout.ts';

export type CampaignArsenalPurchase=AttachmentAcquisition;
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
 if(isDispatchPilot(c)&&!dispatchPilotUnclassifiedEditingEnabled(c))
  return denied('Dispatch pilot requires global equipment scope for custom Arsenal builds');
 const noCharge=isDispatchPilot(c)&&effectiveDispatchSetup(c).economy==='unlimited';
 if(c.activeContractId)return denied('Finish the current contract before editing equipment');
 const operator=c.operators.find(o=>o.id===operatorId);
 if(!operator||operator.status==='lost'||operator.status==='retired')
  return denied('Operator is unavailable');
 if(recipe.weapon!==operator.weapon)
  return denied('Switch weapon class in Campaign Armory first, then reopen Arsenal');
 const next=arsenalRecipeToLegacy(recipe);
 if(!next)return denied('The assembled weapon is not valid');
 // An explicit saved location must fit on this actual equipped family.
 // Preview and commit both fail atomically; never spend for a phantom mount.
 const unresolved=resolveMountedAccessoryLayout(next).unresolved;
 if(unresolved.length)return denied('Mount placement needs repair: '+
  unresolved.map(x=>x.attachmentId).join(', '));
 // Same pure inventory mathematics as direct Armory and saved kits.
 const transfer=quoteAttachmentTransfer(c.inventory.attachments,
  operator.weaponConfiguration,next,
  noCharge?Number.MAX_SAFE_INTEGER:c.funds,true);
 // Only the bill changes in Creative. Preserve the exact finite attachment
 // stock/purchase ledger and all mount validation from the common quote.
 return {...transfer,cost:noCharge?0:transfer.cost,
  nextConfiguration:transfer.valid?next:undefined};
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
   {...o,weaponConfiguration:quote.nextConfiguration!,
    ...fitMagazineInventory(o.id,o.weapon,quote.nextConfiguration!,
     o.magazine,o.reserve,o.magazines)}:o)},
  quote};
}
