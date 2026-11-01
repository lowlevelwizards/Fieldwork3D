/** Equipment 21.03: deterministic, occluded ground footprint for rifle lights.
 * No Three.js and no gameplay visibility changes: physical rays stop at opaque
 * world walls, solid door leaves, and high cover. Never illuminates through walls.
 */
import {doorLeafSegment,type Door,type Segment,type Pt,type Obstacle}
 from './breach-core.ts';
import {resolveWeaponAssembly,type WeaponConfiguration}
 from './equipment-weapon-assemblies.ts';
export const LIGHT_BEAM_HALF_ANGLE=.34;
export const LIGHT_BEAM_RANGE=155;
export const LIGHT_BEAM_SAMPLES=11;
/** Source from the gun-mounted light rail, not the operator foot position. */
export function weaponLightEmitter(muzzle:{x:number;z:number;yaw:number},
 configuration:WeaponConfiguration):Pt{
 const gun=resolveWeaponAssembly(configuration);
 const offset=(gun.muzzleX-gun.mounted.light.mountX)*gun.lengthScale;
 return {x:muzzle.x-Math.cos(muzzle.yaw)*offset,
  y:muzzle.z-Math.sin(muzzle.yaw)*offset};
}
const transparentDoor=(d:Door)=>['glazed','mesh-gate','screen','french'].includes(d.style??'wood');
export function lightRayDistance(from:Pt,angle:number,maximum:number,
 blockers:readonly Segment[]):number{
 const dx=Math.cos(angle),dy=Math.sin(angle);
 let distance=maximum;
 for(const segment of blockers){
  const vx=segment.b.x-segment.a.x,vy=segment.b.y-segment.a.y;
  const wx=segment.a.x-from.x,wy=segment.a.y-from.y;
  const denominator=dx*vy-dy*vx;
  if(Math.abs(denominator)<1e-7)continue;
  const t=(wx*vy-wy*vx)/denominator;
  const u=(wx*dy-wy*dx)/denominator;
  if(t>.01&&t<distance&&u>=0&&u<=1)distance=t;
 }
 return distance;
}
/** Build once when door/cover geometry changes; renderer may cache on revision. */
export function lightBeamBlockers(walls:readonly Segment[],doors:readonly Door[],
 cover:readonly Obstacle[]=[]):Segment[]{
 const lines:Segment[]=[...walls];
 for(const door of doors){
  if(transparentDoor(door))continue;
  const leaf=doorLeafSegment(door);
  if(Math.hypot(leaf.b.x-leaf.a.x,leaf.b.y-leaf.a.y)>.1)lines.push(leaf);
 }
 for(const o of cover){
  if(o.low||['glass-barrier','chain-link-fence','mesh-gate'].includes(o.fixture??''))continue;
  const x0=o.x-o.w/2,x1=o.x+o.w/2,y0=o.y-o.h/2,y1=o.y+o.h/2;
  const p=[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];
  for(let i=0;i<4;i++)lines.push({a:p[i],b:p[(i+1)%4]});
 }
 return lines;
}
/** Constant sample count enables reuse of a single BufferGeometry per light. */
export function lightBeamFootprint(from:Pt,yaw:number,
 blockers:readonly Segment[],range=LIGHT_BEAM_RANGE):Pt[]{
 const out:Pt[]=[{x:from.x,y:from.y}];
 for(let i=0;i<LIGHT_BEAM_SAMPLES;i++){
  const angle=yaw-LIGHT_BEAM_HALF_ANGLE+
   i*2*LIGHT_BEAM_HALF_ANGLE/(LIGHT_BEAM_SAMPLES-1);
  const distance=lightRayDistance(from,angle,range,blockers);
  out.push({x:from.x+Math.cos(angle)*distance,
   y:from.y+Math.sin(angle)*distance});
 }
 return out;
}
