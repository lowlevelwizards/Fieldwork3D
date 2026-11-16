/** Dispatch D2.1: pure content selection policy contract.
 * This is a setup/authoring-time advisory, never an equipment or save owner.
 * A dated visual reference is not independent evidence of official item issue.
 */
import {factionReference} from './faction-reference-catalog.ts';
import {dispatchStarterChoiceStatus} from './dispatch-starter-choices.ts';
import {dispatchReferenceContext} from './dispatch-content-foundation.ts';
import {itemDefinition} from './equipment-catalog.ts';
import {familyPreset} from './equipment-weapon-families.ts';
import {WARDROBE_ITEMS} from './operator-wardrobe-data.ts';
import {identityMarking} from './operator-identity-markings.ts';
import {isGarmentSolidId} from './operator-garment-color-policy.ts';
import {isHeadwearCamoId} from './operator-headwear-camo.ts';

export const DISPATCH_CONTENT_KINDS=[
 'reference','equipment','weapon-preset','wardrobe-style',
 'solid-color','camouflage','identity-marking'
] as const;
export type DispatchContentKind=typeof DISPATCH_CONTENT_KINDS[number];
export type DispatchSelectionMode=
 'dispatch'|'quick-play'|'sandbox'|'legacy-campaign'|'operations'|'wasteland';
export type DispatchAvailability=
 'available'|'specialist'|'not-offered'|'unclassified'|'not-applicable';
export type DispatchPolicyContext=Readonly<{
 mode:DispatchSelectionMode;
 /** Required for Dispatch. Must be one of the four existing visual looks. */
 referenceId?:string;
 /** Optional caller assertions. These must agree with the existing timeline. */
 organizationId?:string;role?:string;year?:number;
 /** Explicit specialist permit; never inferred from SWAT appearance alone. */
 specialistAuthorized?:boolean;
}>;
export type DispatchPolicyQuery=Readonly<{
 kind:DispatchContentKind;id:string;context:DispatchPolicyContext;
}>;
export type DispatchPolicyDecision=Readonly<{
 kind:DispatchContentKind;id:string;status:DispatchAvailability;
 selectable:boolean;reason:string;provenance:'none'|'authored-starter-policy';
}>;

export function isKnownDispatchContent(kind:DispatchContentKind,id:string):boolean{
 if(typeof id!=='string'||!id)return false;
 switch(kind){
 case 'reference':return !!factionReference(id);
 case 'equipment':return !!itemDefinition(id);
 case 'weapon-preset':return !!familyPreset(id);
 case 'wardrobe-style':return WARDROBE_ITEMS.some(item=>item.id===id);
 case 'solid-color':return isGarmentSolidId(id);
 case 'camouflage':return isHeadwearCamoId(id);
 case 'identity-marking':return !!identityMarking(id);
 }
}

const result=(kind:DispatchContentKind,id:string,status:DispatchAvailability,
 reason:string,provenance:DispatchPolicyDecision['provenance']='none',
 specialistAuthorized=false):
 DispatchPolicyDecision=>Object.freeze({kind,id,status,
 selectable:status==='available'||status==='not-applicable'||
  (status==='specialist'&&specialistAuthorized),
 reason,provenance});

/** Unknown IDs and contexts fail closed even before authored rules exist.
 * A non-Dispatch mode has no Dispatch restrictions: the authoritative catalog
 * and its own normal slot/appearance validation still apply.
 */
export function evaluateDispatchContent(query:DispatchPolicyQuery):
 DispatchPolicyDecision{
 const {kind,id,context}=query;
 if(!DISPATCH_CONTENT_KINDS.includes(kind)||!isKnownDispatchContent(kind,id))
  return result(kind,id,'unclassified','Unknown content ID or kind');
 if(context?.mode!=='dispatch'){
  if(['quick-play','sandbox','legacy-campaign','operations','wasteland']
   .includes(context?.mode))
   return result(kind,id,'not-applicable',
    'Dispatch content policy does not apply to this mode');
  return result(kind,id,'unclassified','Invalid selection mode');
 }
 const matched=context.referenceId?dispatchReferenceContext(context.referenceId):null;
 if(!matched||
  (context.organizationId!==undefined&&context.organizationId!==matched.organizationId)||
  (context.role!==undefined&&context.role!==matched.role))
  return result(kind,id,'unclassified','Unknown or mismatched Dispatch reference');
 if(context.year!==undefined){
  const reference=factionReference(matched.referenceId);
  if(!Number.isSafeInteger(context.year)||!reference||
   context.year<reference.era.start||context.year>reference.era.end)
   return result(kind,id,'unclassified','Year outside authored appearance period');
 }
 const status=dispatchStarterChoiceStatus(matched.referenceId,kind,id);
 if(status==='available')
  return result(kind,id,status,'Curated choice for this authored appearance',
   'authored-starter-policy');
 if(status==='specialist')
  return result(kind,id,status,
   'Optional specialist choice; explicit authorization required',
   'authored-starter-policy',context.specialistAuthorized===true);
 if(status==='not-offered')
  return result(kind,id,status,'Different authored reference; not offered here',
   'authored-starter-policy');
 return result(kind,id,'unclassified',
  'Not assessed for this authored Dispatch appearance');
}
