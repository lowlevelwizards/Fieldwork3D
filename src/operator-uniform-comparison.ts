/** Pure Stage 3B side-by-side preview recipes.
 * These are Lab-only display configurations: no campaign inventory, cosmetic
 * save or actual equipment is changed by examining the pair.
 */
import {initialEquipmentLoadout,setEquipmentChoice,
 type EquipmentLoadout,type LoadoutSlot} from './equipment-loadouts.ts';
import {initialWardrobe,type WardrobeOptions} from './operator-wardrobe-data.ts';
import {uniformCutCamoChoices,type UniformCompareCut}
 from './operator-uniform-cut-eligibility.ts';
import type {HeadwearCamoId} from './operator-headwear-camo.ts';

export const UNIFORM_COMPARE_DEFAULT_PRINTS={
 'bdu-shirt':'m81-woodland',
 'acu-shirt':'scorpion-w2'
} as const satisfies Record<UniformCompareCut,HeadwearCamoId>;
export const UNIFORM_COMPARE_LABELS={
 'bdu-shirt':'A · HISTORICAL BDU / FIELD',
 'acu-shirt':'B · MODERN ACU'
} as const;
export function uniformCompareKit():EquipmentLoadout{
 let kit=initialEquipmentLoadout();
 const changes:readonly (readonly [LoadoutSlot,string])[]=[
  ['head','head-none'],['armor','armor-none'],['rig','rig-none'],
  ['backpack','backpack-none'],['belt','belt-none'],
  ['medical','medical-none'],['tactical','tactical-none'],
  ['utility','utility-none'],['hands','hands-none'],
  ['top','top-uniform'],['legs','legs-field'],['feet','feet-boots']
 ];
 for(const [slot,id] of changes)kit=setEquipmentChoice(kit,slot,id);
 return kit;
}
export function uniformCompareWardrobe(cut:UniformCompareCut,
 print:HeadwearCamoId=UNIFORM_COMPARE_DEFAULT_PRINTS[cut]):WardrobeOptions{
 const safePrint=uniformCutCamoChoices(cut).includes(print)?
  print:UNIFORM_COMPARE_DEFAULT_PRINTS[cut];
 return {...initialWardrobe(),
  styles:{top:cut,trousers:'field-trousers',
   headwear:'bare',armorStyle:'armor-bare',
   rigStyle:'no-rig',beltStyle:'no-belt',packStyle:'no-pack',
   gloves:'gloves-none'},
  fabricCamo:{top:safePrint}};
}
