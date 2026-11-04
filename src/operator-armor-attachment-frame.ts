/** Shared fitted armor/rig/magazine coordinate frame. For every look,
 * connection surfaces come from the selected visible uniform and carrier,
 * never only from a universal bare torso.
 *
 * +X is front in the legacy chest group, +/-Z are sides, +Y is up.
 * Cosmetic only; no armor/weapon stats or collision geometry change.
 */
import {ARMOR_PROFILES,rigMagazineMount,
 type RigMagazineSocket} from './operator-armor-rig-silhouettes.ts';
import {fittedArmorSurfaces} from './operator-uniform-fit-envelope.ts';
import {rigContactFrame} from './operator-rig-contact-frame.ts';

export type ArmorAttachmentFrame={
 front:{x:number;y:number};
 back:{x:number;y:number};
 sideLeft:{z:number};sideRight:{z:number};
 shoulderLeft:{z:number};shoulderRight:{z:number};
 shoulderY:number;
 rigShiftX:number;
 standOff:number;
};
/** Front/back anchor positions and actual side clearance for an armor type
 * over a named garment. Old three-argument callers still default to the
 * combat shirt, while game call sites pass the true selected top.
 */
export function armorAttachmentFrame(style:string,
 top='combat-shirt'):ArmorAttachmentFrame{
 const base=ARMOR_PROFILES[style]??ARMOR_PROFILES['armor-bare'];
 const fit=fittedArmorSurfaces(style,top,base);
 const standard=ARMOR_PROFILES['plate-standard'];
 const rigClearance=style==='soft-vest'||style==='soft-flak'?.12:
  style==='plate-heavy'||style==='plate-legacy'?.16:0;
 const outside=fit.side+.38;
 return {
  front:{x:fit.front,y:-1.7},
  back:{x:fit.back,y:-1.7},
  sideLeft:{z:-outside},sideRight:{z:outside},
  shoulderLeft:{z:-fit.shoulderZ},shoulderRight:{z:fit.shoulderZ},
  shoulderY:fit.shoulderY,
  rigShiftX:fit.front-standard.front+rigClearance,
  standOff:rigClearance
 };
}
/** Actual carried magazine coordinates follow the same fitted plate bags
 * as visual rig panels. Retains old positional mirror argument (#4).
 */
export function armorMountedMagazineSocket(style:string,index:number,
 armor:string,mirror=1,top='combat-shirt'):RigMagazineSocket{
 const socket=rigMagazineMount(style,index,armor,mirror);
 // The first two RIG-A panel silhouettes have their own precisely known
 // pouch faces. A real magazine sits JUST under the pocket's outer flap,
 // not ahead of the old nominal 9.25 offset.
 if(['micro-rig','chest-placard','light-rig',
   'chicom-rig','bandolier','split-front','full-chest','lbv'].includes(style)){
  const contact=rigContactFrame(armor,top,style);
  if(Math.abs(socket.rotation)<.01){
   const mouth=style==='micro-rig'?8.93:
    style==='chest-placard'?9.20:
    style==='light-rig'?8.84:
    style==='chicom-rig'?8.94:
    style==='bandolier'?8.50:
    style==='split-front'?9.21:
    style==='full-chest'?9.10:8.51;
   return {...socket,x:mouth+contact.rigShiftX};
  }
  return {...socket,z:Math.sign(socket.z)*(contact.sideRight.z+.12)};
 }
 const frame=armorAttachmentFrame(armor,top);
 const baseline=ARMOR_PROFILES[armor]??ARMOR_PROFILES['armor-bare'];
 if(Math.abs(socket.rotation)<.01)
  return {...socket,x:socket.x+(frame.front.x-baseline.front)+frame.standOff};
 // Hip/side magazines move outward with the fabric and cummerbund.
 return {...socket,z:Math.sign(socket.z)*(frame.sideRight.z+.14)};
}
