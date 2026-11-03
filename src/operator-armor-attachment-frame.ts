/** Armor mounting frames in the legacy +X-forward chest coordinate system.
 * Rigs and actual carried magazines use ONE calculated exterior offset so
 * every plate bag remains wearable after its silhouette changes.
 */
import {ARMOR_PROFILES,rigMagazineMount,
 type RigMagazineSocket} from './operator-armor-rig-silhouettes.ts';
export type ArmorAttachmentFrame={
 front:{x:number;y:number};
 back:{x:number;y:number};
 sideLeft:{z:number};sideRight:{z:number};
 shoulderLeft:{z:number};shoulderRight:{z:number};
 rigShiftX:number;
 standOff:number;
};
const SHOULDER_POSITIONS:Readonly<Record<string,number>>={
 'soft-slick':4.0,'soft-paca':4.0,'soft-vest':4.55,
 'soft-flak':5.05,'plate-slick':3.25,'plate-jpc':3.72,
 'plate-standard':4.05,'plate-heavy':4.42,'plate-legacy':5.06
};
export function armorAttachmentFrame(style:string):ArmorAttachmentFrame{
 const p=ARMOR_PROFILES[style]??ARMOR_PROFILES['armor-bare'];
 const standard=ARMOR_PROFILES['plate-standard'];
 // Small deliberate fabric clearance where a soft/legacy cloth shell has
 // thicker center closure; not a generic scale multiplier.
 const standOff=style==='soft-vest'||style==='soft-flak'? .12:
  style==='plate-heavy'||style==='plate-legacy'? .16:0;
 const side=p.side+.38;
 const shoulder=SHOULDER_POSITIONS[style]??4.35;
 return {
  front:{x:p.front,y:-1.7},back:{x:-p.front,y:-1.7},
  sideLeft:{z:-side},sideRight:{z:side},
  shoulderLeft:{z:-shoulder},shoulderRight:{z:shoulder},
  rigShiftX:p.front-standard.front+standOff,standOff
 };
}
/** Align the carried-magazine positions with the exact same exterior
 * surface used by the visual rig. Only changes visual coordinates.
 */
export function armorMountedMagazineSocket(style:string,index:number,
 armor:string,mirror=1):RigMagazineSocket{
 const socket=rigMagazineMount(style,index,armor,mirror);
 const frame=armorAttachmentFrame(armor);
 return Math.abs(socket.rotation)<.01?
  {...socket,x:socket.x+frame.standOff}:socket;
}