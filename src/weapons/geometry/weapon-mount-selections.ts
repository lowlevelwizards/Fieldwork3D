/** Arsenal M2.6A — optional version-preserving, equipment-bound mounting intent.
 * A saved normalized position is never a Three.js coordinate or rail-tooth index.
 * Identity is the accessory plus its physically authored owner, surface and face.
 */
import type {WeaponAttachmentSlot} from '../../equipment-weapon-assemblies.ts';
export type MountableSlot='optic'|'foregrip'|'light';
export type MountFace='top'|'bottom'|'left'|'right';
export type MountStandard='picatinny'|'ak-side-dovetail'|'hk-claw';
export type MountSelection=Readonly<{
 attachmentId:string;ownerPartId:string;surfaceId:string;
 face:MountFace;standard:MountStandard;position:number;
}>;
export type MountSelections=Partial<Record<MountableSlot,MountSelection>>;
export const MOUNTABLE_SLOTS:readonly MountableSlot[]=['optic','foregrip','light'];
const validId=(v:unknown):v is string=>
 typeof v==='string'&&v.length>0&&v.length<=110&&/^[a-z0-9][-a-z0-9:_]*$/.test(v);
export function readMountSelection(raw:unknown):MountSelection|undefined{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return undefined;
 const s=raw as Record<string,unknown>;
 if(!validId(s.attachmentId)||!validId(s.ownerPartId)||
  !validId(s.surfaceId)||!['top','bottom','left','right'].includes(String(s.face))||
  !['picatinny','ak-side-dovetail','hk-claw'].includes(String(s.standard))||
  typeof s.position!=='number'||!Number.isFinite(s.position)||
  s.position<0||s.position>1)return undefined;
 return {attachmentId:s.attachmentId,ownerPartId:s.ownerPartId,
  surfaceId:s.surfaceId,face:s.face as MountFace,
  standard:s.standard as MountStandard,position:s.position};
}
export function readMountSelections(raw:unknown,
 slots:Record<WeaponAttachmentSlot,string>):MountSelections|undefined{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return undefined;
 const source=raw as Record<string,unknown>,out:MountSelections={};
 for(const slot of MOUNTABLE_SLOTS){
  const saved=readMountSelection(source[slot]);
  if(saved?.attachmentId===slots[slot])out[slot]=saved;
 }
 return Object.keys(out).length?out:undefined;
}
export const copyMountSelections=(source?:MountSelections):MountSelections|undefined=>
 source?Object.fromEntries(MOUNTABLE_SLOTS.filter(k=>!!source[k])
  .map(k=>[k,{...source[k]!}])) as MountSelections:undefined;
export function sameMountSelections(a?:MountSelections,b?:MountSelections):boolean{
 return MOUNTABLE_SLOTS.every(slot=>{
  const x=a?.[slot],y=b?.[slot];
  return x===y||(!x&&!y)||!!(x&&y&&
   x.attachmentId===y.attachmentId&&x.ownerPartId===y.ownerPartId&&
   x.surfaceId===y.surfaceId&&x.face===y.face&&x.standard===y.standard&&
   x.position===y.position);
 });
}
