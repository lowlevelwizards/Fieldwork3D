/** Build 26.00: deterministic world illumination independent of renderer.
 * This is LIGHT REACH only. It never grants target detection, enemy intel,
 * fog of war visibility or aiming privileges. Consumers must still perform
 * the authoritative line-of-sight and sight-confirmation checks.
 */
import type {Pt,Segment,Door,Obstacle} from './breach-core.ts';
import {lightBeamBlockers,lightRayDistance} from './equipment-weapon-light-beam.ts';
export type IlluminationSource={
 id:string;p:Pt;range:number;intensity:number;
 heading?:number;halfAngle?:number;enabled?:boolean;
};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const headingDifference=(a:number,b:number)=>
 Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function illuminationAt(point:Pt,
 sources:readonly IlluminationSource[],blockers:readonly Segment[],
 ambient=.25):number{
 let light=clamp(ambient);
 for(const source of sources){
  if(source.enabled===false||source.intensity<=0||source.range<=0)continue;
  const dx=point.x-source.p.x,dy=point.y-source.p.y;
  const distance=Math.hypot(dx,dy);
  if(distance>=source.range)continue;
  const angle=Math.atan2(dy,dx);
  if(source.heading!==undefined&&source.halfAngle!==undefined&&
    Math.abs(headingDifference(angle,source.heading))>source.halfAngle)continue;
  if(distance>.01&&lightRayDistance(source.p,angle,distance+.1,blockers)<distance-.01)
    continue;
  const falloff=1-distance/source.range;
  light+=clamp(source.intensity)*falloff*falloff;
 }
 return clamp(light);
}
/** Pre-build blockers when door/cover geometry changes, never per target. */
export const buildIlluminationBlockers=(walls:readonly Segment[],
 doors:readonly Door[],cover:readonly Obstacle[])=>
 lightBeamBlockers(walls,doors,cover);
/** A bounded, spatially local sampling field for deterministic gameplay. */
export function sampleIlluminationGrid(input:{
 origin:Pt;columns:number;rows:number;step:number;
 sources:readonly IlluminationSource[];blockers:readonly Segment[];
 ambient?:number}):Float32Array{
 const columns=Math.max(0,Math.min(96,Math.floor(input.columns)));
 const rows=Math.max(0,Math.min(96,Math.floor(input.rows)));
 const step=Math.max(.1,input.step);
 const result=new Float32Array(columns*rows);
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++)
  result[y*columns+x]=illuminationAt({x:input.origin.x+x*step,
   y:input.origin.y+y*step},input.sources,input.blockers,input.ambient);
 return result;
}
