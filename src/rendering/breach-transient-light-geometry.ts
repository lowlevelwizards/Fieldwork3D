/** V17.3a: conservative maximum sphere radius for an existing transient
 * PointLight. This is presentation-only, not sight or gameplay illumination.
 * No map-wide scan: static walls and high cover use the session broadphase.
 */
import {doorOpticalSegment,doorTransmitsSightAndLight,type Door,type Pt,type Segment} from '../breach-core.ts';
import {groundDistanceToSegment} from '../breach-ground-geometry.ts';
import {coverBlocksOpticalSight} from '../breach-optical-occlusion.ts';
import type {SessionWorldGeometry} from '../breach-world-context.ts';
export type TransientLightWorld=Pick<SessionWorldGeometry,'someWallNearPoint'|'someCoverNearPoint'>;
export function safeTransientLightRange(world:TransientLightWorld,doors:readonly Door[],source:Pt,maximum:number,coveringSegments:readonly Segment[]=[]):number{
 if(!Number.isFinite(source.x)||!Number.isFinite(source.y)||!Number.isFinite(maximum)||maximum<=0)return 0;
 let safe=maximum;
 world.someWallNearPoint(source,maximum+5,wall=>{
  safe=Math.min(safe,Math.max(0,groundDistanceToSegment(source,wall)-5));
  return safe===0;
 });
 if(safe===0)return 0;
 for(const door of doors){
  if(doorTransmitsSightAndLight(door))continue;
  const leaf=doorOpticalSegment(door);
  if(Math.hypot(leaf.b.x-leaf.a.x,leaf.b.y-leaf.a.y)<=.1)continue;
  safe=Math.min(safe,Math.max(0,groundDistanceToSegment(source,leaf)-5));
  if(safe===0)return 0;
 }
 for(const edge of coveringSegments){
  safe=Math.min(safe,Math.max(0,groundDistanceToSegment(source,edge)-1));
  if(safe===0)return 0;
 }
 world.someCoverNearPoint(source,safe+1,cover=>{
  if(!coverBlocksOpticalSight(cover,false))return false;
  const dx=Math.max(0,Math.abs(source.x-cover.x)-cover.w/2);
  const dy=Math.max(0,Math.abs(source.y-cover.y)-cover.h/2);
  safe=Math.min(safe,Math.max(0,Math.hypot(dx,dy)-1));
  return safe===0;
 });
 return safe;
}

/** Conservative polar mask for receiver-side directional illumination.
 * Each sector uses the minimum distance to any opaque segment whose
 * thickness-expanded angular span intersects that sector. No center-ray
 * sampling gaps at thin blockers, corners or bin boundaries. The result
 * deliberately underestimates reach at oblique walls rather than leaks.
 * The caller owns the fixed buffer and can compare it before uploading.
 */
export const TRANSIENT_LIGHT_SECTORS=64;
export const TRANSIENT_LIGHT_BLOCKER_LIMIT=96;
const TAU=Math.PI*2,STEP=TAU/TRANSIENT_LIGHT_SECTORS;
function angleDelta(a:number,b:number):number{
 return Math.atan2(Math.sin(a-b),Math.cos(a-b));
}
export function fillTransientLightReach(
 world:TransientLightWorld,doors:readonly Door[],source:Pt,maximum:number,out:Float32Array,
 coveringSegments:readonly Segment[]=[]
):boolean{
 if(out.length!==TRANSIENT_LIGHT_SECTORS)throw Error('Invalid transient reach buffer');
 out.fill(0);
 if(!Number.isFinite(source.x)||!Number.isFinite(source.y)||!Number.isFinite(maximum)||maximum<=0)return false;
 out.fill(maximum);
 let blockers=0,failed=false;
 const segment=(ax:number,ay:number,bx:number,by:number,shell:number)=>{
  if(!Number.isFinite(ax)||!Number.isFinite(ay)||!Number.isFinite(bx)||!Number.isFinite(by)){failed=true;return true;}
  const x=ax-source.x,y=ay-source.y,u=bx-source.x,v=by-source.y;
  const dx=u-x,dy=v-y,l2=dx*dx+dy*dy;
  const t=l2>1e-8?Math.max(0,Math.min(1,-(x*dx+y*dy)/l2)):0;
  const d=Math.hypot(x+t*dx,y+t*dy);
  if(d-shell>=maximum)return false;
  if(++blockers>TRANSIENT_LIGHT_BLOCKER_LIMIT||d<=shell){failed=true;return true;}
  const a=Math.atan2(y,x),b=Math.atan2(v,u),span=angleDelta(b,a);
  const center=a+span*.5;
  const half=Math.abs(span)*.5+Math.asin(Math.min(1,shell/d))+STEP*.5+1e-7;
  const reach=Math.max(0,d-shell);
  for(let i=0;i<TRANSIENT_LIGHT_SECTORS;i++){
   if(Math.abs(angleDelta((i+.5)*STEP,center))<=half)
    out[i]=Math.min(out[i],reach);
  }
  return false;
 };
 world.someWallNearPoint(source,maximum+5,wall=>segment(wall.a.x,wall.a.y,wall.b.x,wall.b.y,5));
 if(!failed)for(const door of doors){
  if(doorTransmitsSightAndLight(door))continue;
  const leaf=doorOpticalSegment(door);
  if(Math.hypot(leaf.b.x-leaf.a.x,leaf.b.y-leaf.a.y)<=.1)continue;
  if(segment(leaf.a.x,leaf.a.y,leaf.b.x,leaf.b.y,5))break;
 }
 if(!failed)for(const edge of coveringSegments)
  if(segment(edge.a.x,edge.a.y,edge.b.x,edge.b.y,1))break;
 if(!failed)world.someCoverNearPoint(source,maximum+1,cover=>{
  if(!coverBlocksOpticalSight(cover,false))return false;
  const l=cover.x-cover.w/2,r=cover.x+cover.w/2,t=cover.y-cover.h/2,b=cover.y+cover.h/2;
  if(source.x>=l-1&&source.x<=r+1&&source.y>=t-1&&source.y<=b+1){failed=true;return true;}
  return segment(l,t,r,t,1)||segment(r,t,r,b,1)||segment(r,b,l,b,1)||segment(l,b,l,t,1);
 });
 if(failed){out.fill(0);return false;}
 return true;
}
export function transientReachAt(reach:Float32Array,angle:number):number{
 if(reach.length!==TRANSIENT_LIGHT_SECTORS||!Number.isFinite(angle))return 0;
 const normalized=((angle%TAU)+TAU)%TAU;
 return reach[Math.min(TRANSIENT_LIGHT_SECTORS-1,Math.floor(normalized/STEP))];
}
