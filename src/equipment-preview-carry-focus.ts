/** L2.11F: presentation-only marker anchors in the EXISTING operator rig.
 * These locations cannot change inventory or combat authority.
 */
import type {FieldCarryLocation} from './equipment-field-inventory.ts';
export type PreviewCarryFocus={
 bone:'chest'|'hip'|'pack';x:number;y:number;z:number;radius:number;
};
const SOCKETS:Readonly<Record<FieldCarryLocation,PreviewCarryFocus>>={
 rig:{bone:'chest',x:10.5,y:-3.8,z:0,radius:5.8},
 belt:{bone:'hip',x:1.7,y:-3.8,z:0,radius:6.6},
 pocket:{bone:'hip',x:-1.9,y:-5.2,z:6.0,radius:3.6},
 backpack:{bone:'pack',x:-3.6,y:0,z:0,radius:6.4}
};
export const previewCarryFocus=(location:FieldCarryLocation):PreviewCarryFocus=>
 SOCKETS[location];
