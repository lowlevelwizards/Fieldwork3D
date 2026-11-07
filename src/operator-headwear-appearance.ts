/** Pure headwear selection policy, usable without DOM, CSS or a renderer. */
import type {WardrobeOptions} from './operator-wardrobe-data.ts';
import {headwearColorChoices,type HeadwearSolidColorId} from './operator-headwear-colors.ts';
import {headwearCamoChoices,resolvedHeadwearCamo,nextHeadwearCamoRoll,type HeadwearCamoId} from './operator-headwear-camo.ts';

export const headwearAppearanceModel=(id:string)=>
 id==='high-cut-rails'?'high-cut':id;

export function selectHeadwearSolid(w:WardrobeOptions,model:string,
 requested:unknown):WardrobeOptions{
 const id=headwearAppearanceModel(model);
 if(typeof requested!=='string'||!headwearColorChoices(id).includes(
  requested as HeadwearSolidColorId))return w;
 return {...w,headwearColor:requested as HeadwearSolidColorId,
  headwearCamo:undefined};
}
export function selectHeadwearCamo(w:WardrobeOptions,model:string,
 requested:unknown):WardrobeOptions{
 if(typeof requested!=='string'||!headwearCamoChoices(model).includes(
  requested as HeadwearCamoId))return w;
 const id=requested as HeadwearCamoId;
 return {...w,headwearCamo:id,
  headwearCamoRoll:w.headwearCamo===id?
   nextHeadwearCamoRoll(w.headwearCamoRoll):0};
}
export function rerollHeadwearCamo(w:WardrobeOptions,model:string):WardrobeOptions{
 const selected=resolvedHeadwearCamo(model,w.headwearCamo);
 return selected?selectHeadwearCamo(w,model,selected):w;
}
