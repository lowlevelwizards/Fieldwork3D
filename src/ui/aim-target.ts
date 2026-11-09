/** Look/watch authoring is angular intent, not a walkable-floor order.
 * Never inspect hidden actors, room intelligence or nav clearance here. */
import type {Pt} from '../breach-core.ts';

export type PointBounds={minX:number;minY:number;maxX:number;maxY:number};
export function insideTacticalBounds(p:Pt,b:PointBounds):boolean{
 return Number.isFinite(p.x)&&Number.isFinite(p.y)&&
   p.x>=b.minX&&p.x<=b.maxX&&p.y>=b.minY&&p.y<=b.maxY;
}
/** Near-coincident taps still express a direction. Extend the vector instead
 * of rejecting it as "too close". Only an exactly coincident point has no
 * meaningful heading; callers leave the existing order intact for that tap. */
export function aimTargetFromTap(origin:Pt,point:Pt,minDistance=3):Pt|null{
 if(!Number.isFinite(origin.x)||!Number.isFinite(origin.y)||
    !Number.isFinite(point.x)||!Number.isFinite(point.y))return null;
 const dx=point.x-origin.x,dy=point.y-origin.y;
 const length=Math.hypot(dx,dy);
 if(length<.0001)return null;
 if(length>=minDistance)return {x:point.x,y:point.y};
 const scale=minDistance/length;
 return {x:origin.x+dx*scale,y:origin.y+dy*scale};
}
