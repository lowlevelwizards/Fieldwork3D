/** D13.7: initial and active policy-only access for authored catalog models.
 * This does not grant stock, quote a price, create operators or touch saves.
 * The three tactical-police references alone define assessed playable content.
 */
import {DISPATCH_PLAYABLE_REFERENCE_IDS,
 type DispatchCampaignDraft,type DispatchReferenceId}
 from './dispatch-campaign-setup.ts';
import {mayChooseDispatchSetupContent} from './dispatch-campaign-eligibility.ts';
import {dispatchStarterChoiceStatus} from './dispatch-starter-choices.ts';

export type DispatchWeaponAccess='offered'|'standing-locked'|'reference-locked'|'not-assessed';

/** Exact catalog access for both the creation review and live named procurement. */
import {familyPreset,FAMILY_PRESETS} from './equipment-weapon-families.ts';
export function dispatchCatalogWeaponAccess(
 setup:Pick<DispatchCampaignDraft,'equipmentScope'|'unlockMode'>,
 referenceId:DispatchReferenceId,standing:number,presetId:string
):DispatchWeaponAccess{
 const preset=familyPreset(presetId);
 if(!preset)return 'not-assessed';
 const allowed=(level:number)=>mayChooseDispatchSetupContent(setup,referenceId,level,'weapon-preset',presetId)&&
  mayChooseDispatchSetupContent(setup,referenceId,level,'equipment','primary-'+preset.weapon,'primary');
 if(allowed(standing))return 'offered';
 if(standing<70&&allowed(70))return 'standing-locked';
 const assessed=DISPATCH_PLAYABLE_REFERENCE_IDS.some(ref=>dispatchStarterChoiceStatus(ref,'weapon-preset',presetId)!==null);
 return assessed?'reference-locked':'not-assessed';
}
export function dispatchCatalogAccessReview(setup:Pick<DispatchCampaignDraft,'equipmentScope'|'unlockMode'>,
 referenceId:DispatchReferenceId,standing:number){
 return FAMILY_PRESETS.map(p=>({id:p.id,name:p.name,status:dispatchCatalogWeaponAccess(setup,referenceId,standing,p.id)}));
}
