/** Equipment 24.03: chest-local sockets for actual carry locations.
 * These are presentation-only. Their values follow the same physical
 * belt/rig/backpack/pocket ledger used to calculate access time.
 */
import type {CarryLocation} from './equipment-carry-placement.ts';
export type EquipmentCarryAnchor={x:number;y:number;z:number;angle:number};
const ANCHORS:Readonly<Record<'medical'|'utility',
 Record<CarryLocation,EquipmentCarryAnchor>>>={
 medical:{
  rig:{x:-1,y:-4.1,z:7.7,angle:0},
  belt:{x:2,y:-10,z:6.8,angle:-.18},
  pocket:{x:3,y:-9.5,z:6.3,angle:-.12},
  backpack:{x:-8.8,y:-1.4,z:6.8,angle:0},
  overflow:{x:-10,y:-4,z:7.3,angle:0}
 },
 utility:{
  rig:{x:-5,y:-4.1,z:-7.9,angle:0},
  belt:{x:1.8,y:-10.5,z:-6.8,angle:.26},
  pocket:{x:4,y:-9.3,z:-5.8,angle:.2},
  backpack:{x:-9.6,y:-2,z:-6.2,angle:-.15},
  overflow:{x:-10,y:-5,z:-7.3,angle:-.15}
 }
};
export function equipmentCarryAnchor(kind:'medical'|'utility',
 location:CarryLocation='rig'):EquipmentCarryAnchor{
 return ANCHORS[kind][location]??ANCHORS[kind].rig;
}

/** OV-17: parent-local physical sockets. Belt pieces follow the pelvis;
 * rear-mounted items follow the existing inertial backpack anchor.
 * These are visual-only, never change item access costs or inventory.
 */
export type EquipmentCarrySocket=EquipmentCarryAnchor&{bone:'chest'|'hip'|'pack'};
const SOCKETS:Readonly<Record<'medical'|'utility',
 Record<CarryLocation,EquipmentCarrySocket>>>={
 medical:{
  rig:{bone:'chest',x:2,y:-4,z:8.0,angle:0},
  belt:{bone:'hip',x:2,y:-3.2,z:6.55,angle:-.14},
  pocket:{bone:'hip',x:-1.5,y:-4,z:6.25,angle:-.12},
  backpack:{bone:'pack',x:-.85,y:-.5,z:6.3,angle:0},
  overflow:{bone:'hip',x:-2.6,y:-4.5,z:7.1,angle:-.18}
 },
 utility:{
  rig:{bone:'chest',x:-2.8,y:-3.3,z:-8.0,angle:0},
  belt:{bone:'hip',x:1.2,y:-3.4,z:-6.6,angle:.16},
  pocket:{bone:'hip',x:-1.9,y:-4.1,z:-6.1,angle:.13},
  backpack:{bone:'pack',x:-1.1,y:-1,z:-6.0,angle:-.1},
  overflow:{bone:'hip',x:-2.3,y:-4.5,z:-7.0,angle:.16}
 }
};
export function equipmentCarrySocket(kind:'medical'|'utility',
 location:CarryLocation='rig'):EquipmentCarrySocket{
 return SOCKETS[kind][location]??SOCKETS[kind].rig;
}

/** Visual storage only. Long equipment never hangs vertically from the thigh
 * even if the inventory ledger chooses a faster belt/pocket location.
 * This deliberately does NOT modify ownership, weight or access timing.
 */
export function utilityDisplaySocket(itemId:string,
 location:CarryLocation='rig',hasPack=false):EquipmentCarrySocket{
 const base=equipmentCarrySocket('utility',location);
 const long=['utility-breach','utility-pry','utility-cutter'].includes(itemId);
 if(!long)return base;
 if(hasPack)return {bone:'pack',x:-2.2,y:1.7,z:-8.8,angle:0};
 return {bone:'chest',x:-6.45,y:3.0,z:-8.85,angle:0};
}
