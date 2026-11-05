/** R5 identity coverage: a definition only clears a missing-asset gap if
 * the specific Reference Kit actually selects a modeled and valid item.
 * The presence of a generic flag in the art library is NOT automatic coverage.
 */
import type {FactionReference,ReferenceGap} from './faction-reference-catalog.ts';
import {identityMarking} from './operator-identity-markings.ts';
export const referenceHasIdentity=(ref:FactionReference):boolean=>
 Object.entries(ref.markings??{}).some(([slot,id])=>{
  const mark=identityMarking(id);
  return !!mark&&mark.slots.some(s=>s===slot)&&
   mark.from<=ref.era.end&&mark.to>=ref.era.start;
 });
export function resolvedReferenceGap(ref:FactionReference,gap:ReferenceGap):boolean{
 switch(gap.id){
 case 'unit-insignia':return referenceHasIdentity(ref);
 case 'police-marking':return ['label-police','label-swat'].includes(ref.markings?.chest??'');
 case 'ukraine-identification':return ref.markings?.rightShoulder==='flag-ukraine';
 case 'poland-insignia':return ref.markings?.rightShoulder==='flag-poland';
 case 'alice-webbing':return ref.styles?.rigStyle==='alice-lc2'&&ref.kit?.rig==='rig-full';
 case 'red-beret':return ref.styles?.headwear==='beret'&&
  ref.kit?.head==='head-cap'&&ref.headwearColor==='beret-scarlet';
 default:return false;
 }
}
/** Do not silently erase authored gaps. The audit filters covered IDs,
 * while the authored recipe remains an inspectable record of historical goals. */
export const unresolvedReferenceGaps=(ref:FactionReference):readonly ReferenceGap[]=>
 ref.gaps.filter(gap=>!resolvedReferenceGap(ref,gap));
