/** BT1/BT2: canonical pelvis-local belt contact loop (+X forward).
 * Shape is an intentionally chunky chamfered rectangle, not a scaled slab.
 * Segment normals point outward; all visual and mounting consumers use them.
 */
import {BELT_PROFILES,type BeltStyle} from './operator-belt-profile.ts';
export type WaistPoint=readonly [number,number];
export type BeltFrameSegment={index:number;start:WaistPoint;end:WaistPoint;
 x:number;z:number;normalX:number;normalZ:number;yaw:number;length:number};
export const BELT_CENTER_Y=-1.65;
export const WAIST_CONTACT:readonly WaistPoint[]=[
 [4.45,-5.35],[4.45,5.35],[3.70,6.5],[-3.70,6.5],
 [-4.45,5.35],[-4.45,-5.35],[-3.70,-6.5],[3.70,-6.5]
];
export function beltContactSegments():BeltFrameSegment[]{
 return WAIST_CONTACT.map(([x,z],index)=>{
  const end=WAIST_CONTACT[(index+1)%WAIST_CONTACT.length];
  const dx=end[0]-x,dz=end[1]-z,length=Math.hypot(dx,dz);
  return {index,start:[x,z],end,x:(x+end[0])/2,z:(z+end[1])/2,
   normalX:dz/length,normalZ:-dx/length,yaw:-Math.atan2(dz,dx),length};
 });
}
export function beltSurface(style:BeltStyle,index:number,along=0){
 const seg=beltContactSegments()[index];
 if(!seg||style==='no-belt')return null;
 const t=BELT_PROFILES[style].thickness;
 // Padded belt has a narrow fastening section over the front contact.
 const thickness=style==='padded-belt'?(index===0?.76:t+.32):t;
 const offset=Math.max(-seg.length/2,Math.min(seg.length/2,along));
 const tx=Math.cos(seg.yaw),tz=-Math.sin(seg.yaw);
 return {x:seg.x+seg.normalX*thickness+tx*offset,y:BELT_CENTER_Y+(style==='padded-belt'&&index!==0?.36:0),
  z:seg.z+seg.normalZ*thickness+tz*offset,yaw:Math.atan2(seg.normalX,seg.normalZ),
  normalX:seg.normalX,normalZ:seg.normalZ};
}
