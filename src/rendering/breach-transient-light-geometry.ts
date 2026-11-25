/** V17.3a: conservative maximum sphere radius for an existing transient
 * PointLight. This is presentation-only, not sight or gameplay illumination.
 * No map-wide scan: static walls and high cover use the session broadphase.
 */
import {doorOpticalSegment,doorTransmitsSightAndLight,type Door,type Pt} from '../breach-core.ts';
import {groundDistanceToSegment} from '../breach-ground-geometry.ts';
import {coverBlocksOpticalSight} from '../breach-optical-occlusion.ts';
import type {SessionWorldGeometry} from '../breach-world-context.ts';
export type TransientLightWorld=Pick<SessionWorldGeometry,'someWallNearPoint'|'someCoverNearPoint'>;
export function safeTransientLightRange(world:TransientLightWorld,doors:readonly Door[],source:Pt,maximum:number):number{
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
 world.someCoverNearPoint(source,safe+1,cover=>{
  if(!coverBlocksOpticalSight(cover,false))return false;
  const dx=Math.max(0,Math.abs(source.x-cover.x)-cover.w/2);
  const dy=Math.max(0,Math.abs(source.y-cover.y)-cover.h/2);
  safe=Math.min(safe,Math.max(0,Math.hypot(dx,dy)-1));
  return safe===0;
 });
 return safe;
}
