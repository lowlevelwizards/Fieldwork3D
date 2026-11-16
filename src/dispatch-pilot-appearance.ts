/** D6 narrow, visual-only Dispatch pilot appearance policy.
 * Preserve everything outside explicitly authorized appearance fields.
 * A real helmet, armor, clothing cut, insignia and equipment stay unchanged.
 */
import {readWardrobe,resolvedWardrobe,type WardrobeOptions}
 from './operator-wardrobe-data.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {evaluateDispatchContent} from './dispatch-content-policy.ts';
import {DISPATCH_PILOT_REFERENCE_ID} from './dispatch-content-foundation.ts';
import {isGloveSolid,isGarmentSolidId,solidChoicesFor} from './operator-garment-color-policy.ts';
import {isSkinToneId,isHairStyleId,isHairToneId}
 from './operator-identity-palette.ts';

export const DISPATCH_APPEARANCE_SOLIDS=['black','navy','charcoal'] as const;
export const DISPATCH_GLOVE_STYLES=['gloves-field','gloves-none'] as const;
const policy=(kind:'solid-color'|'wardrobe-style',id:string)=>
 evaluateDispatchContent({kind,id,context:{
  mode:'dispatch',referenceId:DISPATCH_PILOT_REFERENCE_ID
 }}).selectable;
const same=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);
const allowedSolid=(value:string|undefined,channel:'top'|'trousers',look:WardrobeOptions,kit:EquipmentLoadout)=>
 value===undefined||(
  isGarmentSolidId(value)&&DISPATCH_APPEARANCE_SOLIDS.some(id=>id===value)&&
  solidChoicesFor(channel,resolvedWardrobe(look,kit)).includes(value)&&
  policy('solid-color',value));

/** Exact validated diff; normalize current and candidate, then reject ANY
 * unapproved changed key. Legacy unsupported choices are retained, not edited.
 */
export function dispatchPilotAppearanceAllowed(original:WardrobeOptions,
 candidate:WardrobeOptions,kit:EquipmentLoadout):boolean{
 const before=readWardrobe(original),after=readWardrobe(candidate);
 // Identity attributes only; uniforms retain their modeled cut and markings.
 if(after.skinTone!==undefined&&!isSkinToneId(after.skinTone)||
  after.hairStyle!==undefined&&!isHairStyleId(after.hairStyle)||
  after.hairTone!==undefined&&!isHairToneId(after.hairTone))return false;
 if(after.sleeveState!==before.sleeveState&&
  !['unrolled','cuffed','rolled'].includes(after.sleeveState))return false;
 if(after.trouserHem!==before.trouserHem&&
  !['unbloused','bloused','cuffed'].includes(after.trouserHem))return false;
 if(after.styles.gloves!==before.styles.gloves){
  const id=after.styles.gloves;
  if(!id||!DISPATCH_GLOVE_STYLES.some(item=>item===id)||
    !policy('wardrobe-style',id)||
    resolvedWardrobe(after,kit).gloves!==id)return false;
 }
 if(after.gloveSolid!==before.gloveSolid&&
  (after.gloveSolid!==undefined&&
   (!isGloveSolid(after.gloveSolid)||!DISPATCH_APPEARANCE_SOLIDS.some(x=>x===after.gloveSolid)||
    !policy('solid-color',after.gloveSolid))))return false;
 for(const channel of ['top','trousers'] as const){
  if(after.fabricSolids?.[channel]!==before.fabricSolids?.[channel]&&
   (after.fabricCamo?.[channel]||
    !allowedSolid(after.fabricSolids?.[channel],channel,after,kit)))return false;
 }
 // Compare canonical copies after stripping ONLY D6-owned fields. This
 // prevents a partial or malicious Studio save changing helmet setup, patches,
 // visor, camera, accessory mounts or another operator's look.
 const strip=(w:WardrobeOptions)=>{
  const {skinTone,hairStyle,hairTone,sleeveState,trouserHem,gloveSolid,
   styles,fabricSolids,...rest}=w;
  const {gloves,...otherStyles}=styles;
  const {top,trousers,...otherSolids}=fabricSolids??{};
  return {...rest,styles:otherStyles,fabricSolids:otherSolids};
 };
 return same(strip(before),strip(after));
}
