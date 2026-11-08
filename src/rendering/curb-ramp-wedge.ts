/** Pure, presentation-only curb geometry. The authored sidewalk/road
 * coordinates remain unchanged, as do operator navigation, collision and
 * line-of-sight. A true sloping top avoids fake floating ramp boxes.
 */
import type {StreetRect} from '../worldgen/public-street-layout.ts';

export type StreetSide='north'|'south'|'east'|'west';
export type CurbWedge={vertices:number[];indices:number[]};
const ROAD_TOP=-1.29;
const SIDEWALK_TOP=-1.04;
const UNDER=-1.34;

/** Eight corners (four top, four bottom) form one thin solid wedge.
 * At the streetward edge it lies flush with the carriageway; at the
 * propertyward edge it meets the actual sidewalk top.
 */
export function curbRampWedge(rect:StreetRect,side:StreetSide):CurbWedge{
 const vertical=side==='north'||side==='south';
 const streetward=(side==='south'||side==='east')?1:-1;
 const points:[number,number,number][]=[];
 for(const elevation of [1,0]){
  for(const a of [-1,1])for(const cross of [-1,1]){
   const x=vertical?rect.x+a*rect.width/2:rect.x+cross*rect.width/2;
   const z=vertical?rect.y+cross*rect.depth/2:rect.y+a*rect.depth/2;
   const high=cross!==streetward;
   points.push([x,elevation?(high?SIDEWALK_TOP:ROAD_TOP):UNDER,z]);
  }
 }
 // Quad order 0: property/road side for a=-1, 2/3 for a=+1.
 const faces=[[0,1,3,2],[4,6,7,5],
  [0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];
 const indices:number[]=[];
 for(const [a,b,c,d] of faces)indices.push(a,b,c,a,c,d);
 return {vertices:points.flat(),indices};
}
export const CURB_GROUND_LEVELS={road:ROAD_TOP,sidewalk:SIDEWALK_TOP} as const;
