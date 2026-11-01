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
