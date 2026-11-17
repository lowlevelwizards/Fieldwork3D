/** Arsenal M2.5A/D: one immutable, pure accessory layout for meshes,
 * hand contacts and flashlight emission. Evaluated on equipment changes.
 * Coordinates are weapon-local (X muzzleward, Y up, +Z weapon right).
 * Does not mutate saves, change shot-time muzzles or issue purchases.
 */
import type {WeaponConfiguration,WeaponAttachmentSlot}
 from '../../equipment-weapon-assemblies.ts';
import {physicalAttachmentFitOptions,
 type PhysicalAttachmentPlacement,type PhysicalAttachmentFit}
 from './weapon-physical-mount-fit.ts';

export type AccessoryVolume=Readonly<{
 minX:number;maxX:number;minY:number;maxY:number;minZ:number;maxZ:number;
}>;
export type MountedAccessorySeat=Readonly<{
 attachmentId:string;slot:WeaponAttachmentSlot;
 placement:PhysicalAttachmentPlacement;
 /** Actual modeled outboard attachment location, not its clamp contact. */
 x:number;y:number;z:number;
 normalX:number;normalY:number;normalZ:number;
 volume:AccessoryVolume;
 /** Preferred support palm in the same unscaled weapon-local space. */
 hand?:Readonly<{x:number;y:number;z:number}>;
 /** Actual lens center; the beam uses its X projection. */
 lens?:Readonly<{x:number;y:number;z:number}>;
}>;
export type AccessoryLayout=Readonly<{
 mounts:readonly MountedAccessorySeat[];
 unresolved:readonly PhysicalAttachmentFit[];
}>;
const cache=new WeakMap<WeaponConfiguration,AccessoryLayout>();
const positive=(face:string)=>face==='right'?1:face==='left'?-1:0;
function seatOf(p:PhysicalAttachmentPlacement):MountedAccessorySeat{
 const id=p.attachmentId,s=positive(p.face);
 const bottom=id==='foregrip-vertical'||id==='foregrip-handstop';
 const light=id==='light-compact';
 const x=p.x;
 const y=light?p.y:bottom?p.y-.5:p.y;
 const z=light?p.z+s*1.55:p.z;
 const volume:AccessoryVolume=light?{
  minX:x-2.68,maxX:x+2.68,minY:y-.74,maxY:y+.74,
  minZ:z-.74,maxZ:z+.74
 }:id==='foregrip-vertical'?{
  minX:x-1.69,maxX:x+1.69,minY:p.y-6.1,maxY:p.y,
  minZ:-1.40,maxZ:1.40
 }:id==='foregrip-handstop'?{
  minX:x-1.2,maxX:x+1.2,minY:p.y-2.05,maxY:p.y,
  minZ:-1.55,maxZ:1.55
 }:{
  minX:p.clearanceStartX,maxX:p.clearanceEndX,
  minY:p.y,maxY:p.y+4,minZ:-1.7,maxZ:1.7
 };
 return {attachmentId:id,slot:p.attachmentSlot,placement:p,
  x,y,z,normalX:0,normalY:bottom?-1:light?0:1,normalZ:light?s:0,
  volume,
  ...(id==='foregrip-vertical'?{hand:{x,y:p.y-3.1,z:-2.05}}:
   id==='foregrip-handstop'?{hand:{x:x-.60,y:p.y-1.04,z:-2.65}}:{}),
  ...(light?{lens:{x:x+2.68,y,z}}:{})
 };
}
const overlaps=(a:AccessoryVolume,b:AccessoryVolume):boolean=>
 a.minX<b.maxX-.04&&b.minX<a.maxX-.04&&
 a.minY<b.maxY-.04&&b.minY<a.maxY-.04&&
 a.minZ<b.maxZ-.04&&b.minZ<a.maxZ-.04;
/** Intentional parent rail/adapter intersections do not count as collisions.
 * Only free-standing accessory bodies are compared, with one conservative
 * swept hand clearance in the grip zone near negative weapon Z.
 */
export function accessorySeatsConflict(a:MountedAccessorySeat,
 b:MountedAccessorySeat):boolean{
 if(a.slot==='opticMount'||b.slot==='opticMount')return false;
 if(overlaps(a.volume,b.volume))return true;
 const grip=a.hand?a:b.hand?b:null;
 const other=grip===a?b:grip===b?a:null;
 if(grip&&other?.slot==='light'&&grip.hand){
  const hand=grip.hand;
  return hand.x>=other.volume.minX-1&&hand.x<=other.volume.maxX+1&&
   hand.y>=other.volume.minY-1.1&&hand.y<=other.volume.maxY+1.1&&
   hand.z>=other.volume.minZ-1.1&&hand.z<=other.volume.maxZ+1.1;
 }
 return false;
}
const active=(c:WeaponConfiguration):readonly string[]=>[
 c.slots.opticMount,c.slots.optic,c.slots.foregrip,c.slots.light
].filter(x=>![
 'optic-mount-none','optic-irons','optic-g36-integrated',
 'foregrip-none','light-none'
].includes(x));
/** Bounded layout search (four slots, at most 6 options per slot). Existing
 * optic support is ordered first. No newly requested light can silently
 * displace a sight; unsupported legacy parts appear as unresolved.
 */
export function resolveMountedAccessoryLayout(c:WeaponConfiguration):AccessoryLayout{
 const prior=cache.get(c);
 if(prior)return prior;
 const ids=active(c);
 const result:MountedAccessorySeat[]=[];
 const unresolved:PhysicalAttachmentFit[]=[];
 for(const id of ids){
  const fit=physicalAttachmentFitOptions(c,id,[]);
  const candidates=fit.options.map(seatOf);
  const selected=candidates.find(candidate=>result.every(existing=>
   !accessorySeatsConflict(candidate,existing)));
  if(selected)result.push(selected);
  else unresolved.push(fit.feasible?{
   attachmentId:id,feasible:false,options:[],
   reasons:['occupied']
  }:fit);
 }
 const output:AccessoryLayout={mounts:result,unresolved};
 cache.set(c,output);return output;
}
export const mountedAccessorySeat=(c:WeaponConfiguration,
 slot:WeaponAttachmentSlot):MountedAccessorySeat|undefined=>
 resolveMountedAccessoryLayout(c).mounts.find(s=>s.slot===slot);
