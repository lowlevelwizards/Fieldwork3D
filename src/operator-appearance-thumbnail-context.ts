/** Normalized appearance-card context and deterministic cache identity.
 * Selecting an item replaces the current option for THAT slot before
 * fingerprinting. This prevents every card from invalidating when the
 * player changes that slot's selection without changing its materials.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {setEquipmentChoice} from './equipment-loadouts.ts';
import {bareLabEquipment} from './operator-lab-baseline.ts';
import {initialWardrobe,type WardrobeOptions,type WardrobeSlot}
 from './operator-wardrobe-data.ts';
import {selectWardrobeItem} from './operator-wardrobe-unified.ts';
import {studioUsesClothesOnly} from './operator-studio-preview-policy.ts';

export type AppearanceThumbnailContext={
 kit:EquipmentLoadout;wardrobe:WardrobeOptions;
};
export function appearanceThumbnailContext(
 kit:EquipmentLoadout,wardrobe:WardrobeOptions,
 slot:WardrobeSlot,id:string,liveContext:boolean
):AppearanceThumbnailContext{
 if(!liveContext){
  let next={kit:bareLabEquipment(),wardrobe:initialWardrobe()};
  for(const [baseSlot,baseId] of [
   ['top','bdu-shirt'],['trousers','bdu-trousers'],
   ['footwear','field-boots'],['headwear','bare']
  ] as const)next=selectWardrobeItem(next.kit,next.wardrobe,baseSlot,baseId);
  return selectWardrobeItem(next.kit,next.wardrobe,slot,id);
 }
 const choice=selectWardrobeItem(kit,wardrobe,slot,id);
 let nextKit=choice.kit;
 let nextWardrobe=choice.wardrobe;
 if(studioUsesClothesOnly(slot)){
  for(const [gearSlot,gearId] of [
   ['head','head-none'],['armor','armor-none'],['rig','rig-none'],
   ['belt','belt-none'],['backpack','backpack-none'],
   ['medical','medical-none'],['tactical','tactical-none'],
   ['utility','utility-none']
  ] as const)nextKit=setEquipmentChoice(nextKit,gearSlot,gearId);
  nextWardrobe={...nextWardrobe,styles:{...nextWardrobe.styles,
   headwear:'bare',armorStyle:'armor-bare',rigStyle:'no-rig',
   beltStyle:'no-belt',packStyle:'no-pack'}};
 }
 return {kit:nextKit,wardrobe:nextWardrobe};
}
/** Key order is an implementation detail of save/choice construction and
 * must not invalidate semantically identical looks. Sort keys recursively. */
export function stableThumbnailJSON(value:unknown):string{
 return JSON.stringify(value,(_key,item)=>{
  if(item===null||typeof item!=='object'||Array.isArray(item))return item;
  const record=item as Record<string,unknown>;
  return Object.fromEntries(Object.keys(record).sort().map(k=>[k,record[k]]));
 });
}
/** A content key rather than an editing-session key: cache entries remain
 * reusable when switching back to the same look or between item cards.
 * Context contains exactly what the operator thumbnail renderer receives.
 */
export function appearanceThumbnailKey(
 context:AppearanceThumbnailContext,slot:WardrobeSlot,
 id:string,previewIdentity:string,liveContext:boolean
):string{
 return [
  liveContext?'studio':'lab',slot,id,
  liveContext?previewIdentity:'rook',
  stableThumbnailJSON(context.kit.slots),
  stableThumbnailJSON(context.wardrobe)
 ].join(':');
}
