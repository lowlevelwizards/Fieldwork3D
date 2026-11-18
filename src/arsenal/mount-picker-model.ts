/** Arsenal M2.7A: pure mount-picker view model.
 * The physical solver is the only source of valid positions. Never invent
 * continuous coordinates between actual support contacts, new hardware or
 * stock transactions for the Workbench UI.
 */
import type {ArsenalRecipeV2} from './recipes.ts';
import {arsenalRecipeToLegacy} from './recipes.ts';
import {physicalAttachmentFitOptions,
 type PhysicalAttachmentPlacement} from '../weapons/geometry/weapon-physical-mount-fit.ts';
import {chooseWeaponMountPosition}
 from '../weapons/geometry/weapon-mount-position-edits.ts';
import {mountedAccessorySeat}
 from '../weapons/geometry/mounted-accessory-layout.ts';
import type {MountableSlot}
 from '../weapons/geometry/weapon-mount-selections.ts';

export interface MountPickerRail{
 key:string;face:'top'|'bottom'|'left'|'right';
 ownerPartId:string;surfaceId:string;
 choices:readonly PhysicalAttachmentPlacement[];
}
export interface MountPickerState{
 slot:MountableSlot;attachmentId:string;
 automatic:boolean;selectedKey:string|undefined;
 selectedX:number|undefined;selectedIndex:number;
 rails:readonly MountPickerRail[];
 reason?:string;
}
const INTEGRAL=new Set(['optic-irons','optic-g36-integrated','optic-g36-single',
 'foregrip-none','light-none']);
const faceOrder:Record<MountPickerRail['face'],number>={
 top:0,bottom:1,right:2,left:3
};
export function mountPickerState(recipe:ArsenalRecipeV2,
 slot:MountableSlot):MountPickerState{
 const id=recipe.accessories[slot];
 const empty=(reason:string):MountPickerState=>({
  slot,attachmentId:id,automatic:true,selectedKey:undefined,
  selectedX:undefined,selectedIndex:0,rails:[],reason
 });
 if(INTEGRAL.has(id))return empty('Equip a rail-mounted accessory to position it.');
 const config=arsenalRecipeToLegacy(recipe);
 if(!config)return empty('This weapon assembly needs repair.');
 const fit=physicalAttachmentFitOptions(config,id);
 if(!fit.options.length)return empty('No modeled compatible rail for this accessory.');
 const groups=new Map<string,PhysicalAttachmentPlacement[]>();
 for(const option of fit.options){
  const key=[option.ownerPartId,option.surfaceId,option.face].join('|');
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key)!.push(option);
 }
 const rails:MountPickerRail[]=[];
 for(const [key,items] of groups){
  // Bounded evaluation only on Workbench state changes, never in RAF.
  // A physical foot may fit individually but collide with another mount.
  const viable=items.filter(choice=>{
   const current=mountedAccessorySeat(config,slot)?.placement;
   if(current&&current.ownerPartId===choice.ownerPartId&&
    current.surfaceId===choice.surfaceId&&current.face===choice.face&&
    Math.abs(current.x-choice.x)<.04)return true;
   const next=chooseWeaponMountPosition(config,slot,choice);
   const seated=mountedAccessorySeat(next,slot)?.placement;
   return next!==config&&!!seated&&seated.face===choice.face&&
    seated.ownerPartId===choice.ownerPartId&&
    Math.abs(seated.x-choice.x)<.72;
  });
  if(viable.length)rails.push({
   key,face:viable[0].face,ownerPartId:viable[0].ownerPartId,
   surfaceId:viable[0].surfaceId,choices:viable.sort((a,b)=>a.x-b.x)
  });
 }
 rails.sort((a,b)=>faceOrder[a.face]-faceOrder[b.face]||
  a.ownerPartId.localeCompare(b.ownerPartId)||
  a.surfaceId.localeCompare(b.surfaceId));
 const seat=mountedAccessorySeat(config,slot);
 const selection=config.mountSelections?.[slot];
 const selectedKey=seat?[
  seat.placement.ownerPartId,seat.placement.surfaceId,seat.placement.face
 ].join('|'):undefined;
 const selected=rails.find(rail=>rail.key===selectedKey);
 const selectedIndex=selected&&seat?
  selected.choices.reduce((best,item,i,all)=>
   Math.abs(item.x-seat.x)<Math.abs(all[best].x-seat.x)?i:best,0):0;
 return {slot,attachmentId:id,automatic:!selection,
  selectedKey,selectedX:seat?.x,selectedIndex,rails,
  ...(!rails.length?{reason:'No collision-free positions on this weapon.'}:{})
 };
}
export function nearestMountChoice(rail:MountPickerRail,
 x:number|undefined):PhysicalAttachmentPlacement{
 const choices=rail.choices;
 if(!choices.length)throw Error('Mount rail has no positions');
 if(x===undefined)return choices[0];
 return choices.reduce((best,p)=>Math.abs(p.x-x)<Math.abs(best.x-x)?p:best,
  choices[0]);
}
