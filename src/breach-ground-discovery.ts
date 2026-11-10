/** Pure directional candidate sampling for the simulation's ground pass.
 * Renderers must never call this to grant sight. Every candidate still
 * requires the simulation's true wall, door and cover occlusion check.
 * Preserves original 20/10 centers, bounds, and strict 240-unit cone.
 */
import type {GroundView} from './breach-ground-view.ts';
import {groundViewCandidate} from './breach-ground-view.ts';
import type {Pt} from './breach-core.ts';
export type GroundSamplingBounds={minX:number;minY:number;maxX:number;maxY:number};
export type GroundSample=(col:number,row:number,p:Pt)=>void;
export function forEachGroundSightCandidate(view:GroundView,
 bounds:GroundSamplingBounds,step:10|20,visit:GroundSample):void{
 const minX=Math.max(Math.floor(bounds.minX/step),
   Math.floor((view.x-240)/step));
 const maxX=Math.min(Math.ceil(bounds.maxX/step)-1,
   Math.floor((view.x+240)/step));
 const minY=Math.max(Math.floor(bounds.minY/step),
   Math.floor((view.y-240)/step));
 const maxY=Math.min(Math.ceil(bounds.maxY/step)-1,
   Math.floor((view.y+240)/step));
 for(let row=minY;row<=maxY;row++)for(let col=minX;col<=maxX;col++){
   const x=col*step+step/2,y=row*step+step/2;
   if(groundViewCandidate(view,x,y))visit(col,row,{x,y});
 }
}
