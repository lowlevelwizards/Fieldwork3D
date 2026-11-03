/** Bounded post-furnishing tidy-up. Real doors and full-size body movement
 * need a usable mouth. Reposition *incidental* chairs, totes and loose junk
 * that were accidentally placed directly in a threshold's approach.
 *
 * This does NOT delete essential service fixtures, teleport runtime objects,
 * move walls, open doors, or remove deliberately structural barricades.
 * It edits only the seeded site before deployment, deterministically.
 */
import type {Site} from '../breach-site.ts';
import {pointToSegment,type Pt,type Obstacle,type Door} from '../breach-core.ts';
import {isFootstepObstacle} from '../breach-traversal-surfaces.ts';

const INCIDENTAL=new Set([
 'chair','office-chair','patio-chair','stool','small-table','side-table',
 'storage-tote','tipped-trash-bin','trash-bag','mop-bucket',
 'box','product-box'
]);
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const middle=(door:Door):Pt=>({x:(door.a.x+door.b.x)/2,
 y:(door.a.y+door.b.y)/2});
function roomFor(site:Site,o:Obstacle){
 return site.rooms.find(r=>r.kind==='room'&&
   o.x>=r.x&&o.x<=r.x+r.w&&o.y>=r.y&&o.y<=r.y+r.h);
}
const overlaps=(a:Obstacle,b:Obstacle)=>Math.abs(a.x-b.x)<
 (a.w+b.w)/2+3&&Math.abs(a.y-b.y)<(a.h+b.h)/2+3;

/** Is an obstacle actually across the shoulder-width approach corridor?
 * This strip covers about 40 units on either side of the jamb and is
 * independent of the larger tactical furniture/service arrangement.
 */
function crowdsDoor(o:Obstacle,door:Door):boolean{
 if(!isFootstepObstacle(o))return false;
 const width=dist(door.a,door.b)||1,m=middle(door);
 const tx=(door.b.x-door.a.x)/width,ty=(door.b.y-door.a.y)/width;
 const nx=-ty,ny=tx,dx=o.x-m.x,dy=o.y-m.y;
 const lateral=Math.abs(dx*tx+dy*ty);
 const depth=Math.abs(dx*nx+dy*ny);
 const tangentExtent=Math.abs(tx)*o.w/2+Math.abs(ty)*o.h/2;
 const normalExtent=Math.abs(nx)*o.w/2+Math.abs(ny)*o.h/2;
 return lateral<tangentExtent+10&&depth<normalExtent+42;
}
function mayPlace(site:Site,all:readonly Obstacle[],index:number,
 candidate:Obstacle,room:ReturnType<typeof roomFor>):boolean{
 if(room&&(candidate.x-candidate.w/2<room.x+5||
   candidate.x+candidate.w/2>room.x+room.w-5||
   candidate.y-candidate.h/2<room.y+5||
   candidate.y+candidate.h/2>room.y+room.h-5))return false;
 const b=site.bounds;
 if(b&&(candidate.x-candidate.w/2<b.minX+10||
  candidate.y-candidate.h/2<b.minY+10||
  candidate.x+candidate.w/2>b.maxX-10||
  candidate.y+candidate.h/2>b.maxY-10))return false;
 const radius=Math.hypot(candidate.w,candidate.h)/2+2;
 if(site.walls.some(w=>pointToSegment(candidate,w)<radius))return false;
 if(all.some((other,i)=>i!==index&&overlaps(candidate,other)))return false;
 if(site.doors.some(door=>pointToSegment(candidate,door)<radius+4||
    crowdsDoor(candidate,door)))return false;
 return true;
}
export type ClearanceRepair={site:Site;moved:number;unresolved:number};
/** Attempts at most two relocations per doorway. Leave a blocked,
 * structural approach for candidate selection to reject instead of silently
 * removing walls or essential room features.
 */
export function repairDoorwayClutter(site:Site):ClearanceRepair{
 const cover=site.cover.map(o=>({...o}));
 let moved=0,unresolved=0;
 const stable={...site,cover};
 for(const door of site.doors){
  const center=middle(door),width=dist(door.a,door.b)||1;
  const tangent={x:(door.b.x-door.a.x)/width,
    y:(door.b.y-door.a.y)/width};
  const blockers=cover.map((o,i)=>({o,i,d:dist(o,center)}))
    .filter(({o})=>INCIDENTAL.has(o.fixture??'')&&
      o.w<=46&&o.h<=46&&crowdsDoor(o,door))
    .sort((a,b)=>a.d-b.d||a.i-b.i);
  let handled=0;
  for(const {i} of blockers){
   if(handled++>=2)break;
   const o=cover[i],room=roomFor(site,o);
   const lateral=(o.x-center.x)*tangent.x+(o.y-center.y)*tangent.y;
   // Try the closer side of the room, then the opposite side. A controlled
   // offset preserves the recognisable furniture grouping where possible.
   const preferred=Math.sign(lateral)||(i%2===0?1:-1);
   let relocated=false;
   for(const side of [preferred,-preferred]){
    for(const amount of [18,26,34,44,54]){
     const target={...o,x:o.x+tangent.x*amount*side,
       y:o.y+tangent.y*amount*side};
     if(!mayPlace(stable,cover,i,target,room))continue;
     // Never move the prop across a solid wall even during map furnishing.
     let canMove=true;
     for(let step=1;step<=4;step++){
      const t=step/4,candidate={...o,
       x:o.x+(target.x-o.x)*t,y:o.y+(target.y-o.y)*t};
      if(site.walls.some(w=>pointToSegment(candidate,w)<
        Math.hypot(o.w,o.h)/2+1)){canMove=false;break;}
     }
     if(!canMove)continue;
     cover[i]=target;relocated=true;moved++;break;
    }
    if(relocated)break;
   }
   if(!relocated)unresolved++;
  }
 }
 return {site:moved?{...site,cover}:site,moved,unresolved};
}
