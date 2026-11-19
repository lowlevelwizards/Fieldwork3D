/** L2.7C — pure, bounded view of physically issued flashbangs.
 * Presentation only: no stock, throw, animation, or collision authority.
 * Keep the four-pouch ceiling consistent with FIELD_ITEMS.flashbang.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {FIELD_ITEMS,initialFieldInventory,type FieldCarryLocation} from './equipment-field-inventory.ts';

export type VisibleFlashLocation=Exclude<FieldCarryLocation,'pocket'>;
export type VisibleFlash={location:VisibleFlashLocation;index:number};
const displayOrder:readonly VisibleFlashLocation[]=['rig','belt','backpack'];
const maximum=FIELD_ITEMS.flashbang.maxPerOperator;
/** The live simulation's remaining flashCharges is the upper bound. A
 * preview omits it, so every unspent issued flash is visible. */
export function visibleFlashCanisters(
 kit:EquipmentLoadout|undefined,remaining?:number):VisibleFlash[]{
 if(!kit)return [];
 const inventory=kit.fieldInventory??initialFieldInventory(kit);
 const allowed=Number.isFinite(remaining)?Math.max(0,Math.floor(remaining!)):maximum;
 const limit=Math.min(maximum,allowed);
 const result:VisibleFlash[]=[];
 for(const location of displayOrder){
  const total=inventory.stacks.reduce((n,row)=>
   n+(row.itemId==='flashbang'&&row.location===location?row.quantity:0),0);
  for(let i=0;i<total&&result.length<limit;i++)
   result.push({location,index:i});
 }
 return result;
}
/** Reusable miniature socket positions in the rig's legacy +X frame.
 * Up to four 8-sided silhouette canisters, staggered rather than overlapping.
 * The back-pack anchors are relative to the existing pack pivot.
 */
export function flashCanisterSocket(location:VisibleFlashLocation,index:number){
 const i=Math.max(0,Math.min(3,Math.floor(index)));
 const column=i%2,row=Math.floor(i/2);
 switch(location){
  case 'rig':return {bone:'chest' as const,
   x:9.1,y:-3.0-row*6.1,z:column?5.1:-5.1};
  case 'belt':return {bone:'hip' as const,
   x:1.15,y:-3.0-row*1.6,z:column?7.3:-7.3};
  case 'backpack':return {bone:'pack' as const,
   x:-1.1,y:2.2-row*6.2,z:column?4.4:-4.4};
 }
}

/** Wedges are explicitly equipped, and physically consumed by the existing
 * door-wedge action. Never display decorative wedges without the tool.
 * Keep exactly the same conservative cap and carry order as flashbangs.
 */
export type VisibleWedge={location:FieldCarryLocation;index:number};
export function visibleDoorWedges(
 kit:EquipmentLoadout|undefined,remaining?:number):VisibleWedge[]{
 if(!kit||kit.slots.utility!=='utility-wedge')return [];
 const inventory=kit.fieldInventory??initialFieldInventory(kit);
 const limit=Math.min(FIELD_ITEMS.wedge.maxPerOperator,
  Number.isFinite(remaining)?Math.max(0,Math.floor(remaining!)):
   FIELD_ITEMS.wedge.maxPerOperator);
 const result:VisibleWedge[]=[];
 for(const location of ['belt','rig','pocket','backpack'] as const){
  const total=inventory.stacks.reduce((n,row)=>
   n+(row.itemId==='wedge'&&row.location===location?row.quantity:0),0);
  for(let i=0;i<total&&result.length<limit;i++)
   result.push({location,index:i});
 }
 return result;
}

/** Readable stowage sockets, relative to existing hip, chest and pack bones.
 * Wedges are flat, chunky quadrilaterals rather than cylinders or magazines.
 */
export function wedgeSocket(location:FieldCarryLocation,index:number){
 const i=Math.max(0,Math.min(3,Math.floor(index)));
 const column=i%2,row=Math.floor(i/2);
 switch(location){
  case 'rig':return {bone:'chest' as const,
   x:10.2,y:-3.1-row*3.1,z:column?5.6:-5.6};
  case 'belt':return {bone:'hip' as const,
   x:1.1,y:-3.1-row*2.3,z:column?7.1:-7.1};
  case 'pocket':return {bone:'hip' as const,
   x:-2.1,y:-3.3-row*2.3,z:column?4.6:-4.6};
  case 'backpack':return {bone:'pack' as const,
   x:-.7,y:4.1-row*3.1,z:column?4.1:-4.1};
 }
}
