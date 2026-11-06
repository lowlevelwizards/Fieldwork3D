/** R5 identity coverage: a definition only clears a missing-asset gap if
 * the specific Reference Kit actually selects a modeled and valid item.
 * The presence of a generic flag in the art library is NOT automatic coverage.
 */
import type {FactionReference,ReferenceGap} from './faction-reference-catalog.ts';
import {identityMarking} from './operator-identity-markings.ts';
import {policeVisorFit} from './operator-police-visor-policy.ts';
import {referenceWeaponChoice} from './faction-reference-weapons.ts';
export const referenceHasIdentity=(ref:FactionReference):boolean=>
 Object.entries(ref.markings??{}).some(([slot,id])=>{
  const mark=identityMarking(id);
  return !!mark&&mark.slots.some(s=>s===slot)&&
   mark.from<=ref.era.end&&mark.to>=ref.era.start;
 });
/** R5I: exact coverage is distinct from a convincing but generic proxy.
 * Visor-mounted police helmets improve recognition, but are not proof that
 * a particular historical agency issued this exact helmet.
 */
export type ReferenceGapFidelity='exact'|'approximate'|'missing';
export function referenceGapFidelity(ref:FactionReference,gap:ReferenceGap):
 ReferenceGapFidelity{
 switch(gap.id){
  case 'ar-family':case 'ak-family':{
   const issued=referenceWeaponChoice(ref.id);
   if(issued.fidelity==='proxy')return 'missing';
   if((gap.id==='ar-family'&&issued.preset.family!=='ar')||
      (gap.id==='ak-family'&&issued.preset.family!=='ak'))return 'missing';
   return issued.fidelity==='exact'?'exact':'approximate';
  }
 case 'unit-insignia':return referenceHasIdentity(ref)?'exact':'missing';
 case 'police-marking':
  return ['label-police','label-swat'].includes(ref.markings?.chest??'')?
   'exact':'missing';
 case 'ukraine-identification':
  return ref.markings?.rightShoulder==='flag-ukraine'?'exact':'missing';
 case 'poland-insignia':
  return ref.markings?.rightShoulder==='flag-poland'?'exact':'missing';
 case 'alice-webbing':
  return ref.styles?.rigStyle==='alice-lc2'&&ref.kit?.rig==='rig-full'?
   'exact':'missing';
 case 'm1956-webbing':
  return ref.styles?.rigStyle==='m1956-lce'&&ref.kit?.rig==='rig-full'?
   'exact':'missing';
 case 'helmet-m56':
  return ref.styles?.headwear==='ddr-m56'&&
    (ref.kit?.head??'head-helmet')==='head-helmet'?'exact':'missing';
 case 'visor-police':{
  const selected=ref.styles?.headwear==='police-helmet'&&
   ref.policeVisorPosition==='lowered'||ref.styles?.headwear==='police-helmet'&&
   ref.policeVisorPosition==='raised';
  if(!selected)return 'missing';
  const fit=policeVisorFit('police-helmet',
   ref.styles?.facewear??'face-none',
   ref.styles?.eyewear??'eyes-none',ref.styles?.headset??'comms-none');
  return fit.compatible?'approximate':'missing';
 }
 case 'red-beret':
  return ref.styles?.headwear==='beret'&&
   ref.kit?.head==='head-cap'&&ref.headwearColor==='beret-scarlet'?
   'exact':'missing';
 default:return 'missing';
 }
}
export const resolvedReferenceGap=(ref:FactionReference,gap:ReferenceGap):boolean=>
 referenceGapFidelity(ref,gap)==='exact';
/** Do not silently erase authored gaps. The audit filters covered IDs,
 * while the authored recipe remains an inspectable record of historical goals. */
export const unresolvedReferenceGaps=(ref:FactionReference):readonly ReferenceGap[]=>
 ref.gaps.filter(gap=>!resolvedReferenceGap(ref,gap));
