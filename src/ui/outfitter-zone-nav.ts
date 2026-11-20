/** One equipment-category rail for Quick Play setup and the live Operations Board.
 * This owns only the presentation/selection affordance, not any loadout,
 * inventory, thumbnail, or tactical state.
 */
import type {LoadoutSlot} from '../equipment-loadouts.ts';
import type {EquipmentPreviewFocus} from '../equipment-preview.ts';
import {uiNode,uiButton} from './dom-elements.ts';

export const OUTFITTER_ZONE_LABELS=[
 ['primary','WEAPON'],['head','HEAD'],['armor','ARMOR'],
 ['rig','CHEST'],['belt','BELT'],['backpack','PACK'],
 ['medical','MEDICAL'],['utility','TOOLS'],
 ['top','TOP'],['legs','LEGS'],['hands','HANDS'],['feet','FOOTWEAR']
] as const satisfies readonly (readonly [LoadoutSlot,string])[];

/** A single camera focus contract, independent of either screen's state. */
export function previewFocusForOutfitterSlot(slot:LoadoutSlot):EquipmentPreviewFocus{
 switch(slot){
  case 'head':return 'head';
  case 'primary':return 'weapon';
  case 'armor':case 'rig':case 'top':return 'torso';
  case 'backpack':return 'back';
  case 'belt':case 'medical':case 'utility':return 'belt';
  case 'legs':case 'feet':return 'legs';
  default:return 'full';
 }
}

export function createOutfitterZoneNav(options:{
 navClass:string;
 buttonClass:string;
 selected:LoadoutSlot;
 onSelect:(slot:LoadoutSlot)=>void;
}):{nav:HTMLElement;select:(slot:LoadoutSlot)=>void}{
 const nav=uiNode('nav',options.navClass);
 nav.setAttribute('aria-label','Equipment locations');
 const controls=new Map<LoadoutSlot,HTMLButtonElement>();
 const select=(slot:LoadoutSlot)=>{
  // Update the persistent navigation before notifying its owning screen.
  for(const [key,button] of controls)
   button.setAttribute('aria-current',String(key===slot));
  options.onSelect(slot);
 };
 for(const [slot,label] of OUTFITTER_ZONE_LABELS){
  const button=uiButton(label,()=>select(slot),options.buttonClass);
  button.dataset.slot=slot;
  button.setAttribute('aria-current',String(slot===options.selected));
  controls.set(slot,button);
  nav.append(button);
 }
 return {nav,select};
}
