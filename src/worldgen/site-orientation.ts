/** Rotate a complete, already-compiled physical property. Apply before
 * furnishing, window placement, dressing, population or fog generation.
 * Transform *every* authoritative gameplay coordinate, not just artwork.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Pt} from '../breach-core.ts';
export type EntrySide='south'|'east'|'north'|'west';
const sides:readonly EntrySide[]=['south','east','north','west'];
export function orientArchitecturalSite(site:Site,seed:number):Site{
 const quarterTurns=(Math.floor((seed>>>0)/11))%4;
 const bounds=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 const w=bounds.maxX-bounds.minX,h=bounds.maxY-bounds.minY;
 const point=(p:Pt):Pt=>{
  const x=p.x-bounds.minX,y=p.y-bounds.minY;
  switch(quarterTurns){
   case 1:return {x:y,y:w-x};
   case 2:return {x:w-x,y:h-y};
   case 3:return {x:h-y,y:x};
   default:return {x,y};
  }
 };
 const room=(r:Room):Room=>{
  const a=point({x:r.x,y:r.y}),b=point({x:r.x+r.w,y:r.y+r.h});
  return {...r,x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),
   w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)};
 };
 const obstacle=(o:Site['cover'][number]):Site['cover'][number]=>{
  const a=point({x:o.x-o.w/2,y:o.y-o.h/2});
  const b=point({x:o.x+o.w/2,y:o.y+o.h/2});
  return {...o,x:(a.x+b.x)/2,y:(a.y+b.y)/2,
   w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)};
 };
 const perimeter=(s:{a:Pt;b:Pt})=>({...s,a:point(s.a),b:point(s.b)});
 const nx=quarterTurns%2?h:w,ny=quarterTurns%2?w:h;
 return {...site,entrySide:sides[quarterTurns],
  rooms:site.rooms.map(room),walls:site.walls.map(perimeter),
  doors:site.doors.map(d=>({...d,a:point(d.a),b:point(d.b)})),
  openings:site.openings?.map(o=>({...o,a:point(o.a),b:point(o.b)})),
  cover:site.cover.map(obstacle),entrance:point(site.entrance),
  extract:point(site.extract),objective:point(site.objective),
  spawn:site.spawn.map(point),enemies:site.enemies.map(point),
  bounds:{minX:0,minY:0,maxX:Math.max(640,nx),maxY:Math.max(740,ny)}};
}
/** Public interior point is inferred from operator approach. Supports
 * all four entry sides and does not assume the building faces south.
 */
export function entryInteriorPoint(site:Site,depth=20):Pt|null{
 const door=site.doors.find(d=>d.id==='FRONT');if(!door)return null;
 const mid={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
 const from=site.spawn?.[0]??{x:mid.x,y:mid.y+45};
 const dx=mid.x-from.x,dy=mid.y-from.y,mag=Math.hypot(dx,dy)||1;
 return {x:mid.x+dx/mag*depth,y:mid.y+dy/mag*depth};
}
