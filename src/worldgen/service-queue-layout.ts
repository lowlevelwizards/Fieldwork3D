/** Place sparse customer queue posts in front of real service counters.
 * Works on final oriented furniture, never on render-only coordinates.
 * Avoids doors, objective/start areas, windows, and all solid fixtures.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
import {inspectCounterAccess} from './service-counter-access.ts';
const station=new Set(['transaction-counter','reception-desk','parts-counter']);
const eligible=new Set(['checkout','reception','lobby','parts']);
const overlaps=(a:Obstacle,b:Obstacle,gap=6)=>
 Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&Math.abs(a.y-b.y)<(a.h+b.h)/2+gap;
const inside=(r:Room,o:Obstacle)=>
 o.x-o.w/2>r.x+12&&o.x+o.w/2<r.x+r.w-12&&
 o.y-o.h/2>r.y+12&&o.y+o.h/2<r.y+r.h-12;
export function placeServiceQueues(site:Site):Site{
 const cover=site.cover.slice();
 const access=inspectCounterAccess(site);
 const protectedPoints:Pt[]=[...site.spawn,...site.enemies,site.entrance,
  site.objective,site.extract];
 for(const service of site.cover.filter(o=>station.has(o.fixture??''))){
  const entry=access.find(a=>a.x===service.x&&a.y===service.y&&
   a.fixture===service.fixture);
  if(!entry?.customerClear||!entry.staffClear)continue;
  const room=site.rooms.find(r=>r.kind==='room'&&
   service.x>r.x&&service.x<r.x+r.w&&service.y>r.y&&service.y<r.y+r.h);
  if(!room||!eligible.has(room.purpose??'')||
     room.w<120||room.h<100)continue;
  // A queue always faces the actual front of the oriented counter.
  // 0 is +Y, 1 +X, 2 -Y, 3 -X.
  const turn=service.orientation??0;
  const forward=([{x:0,y:1},{x:1,y:0},{x:0,y:-1},{x:-1,y:0}] as const)[turn];
  const side={x:forward.y,y:-forward.x};
  const along=(turn%2===0?service.h:service.w)/2+35;
  const center={x:service.x+forward.x*along,y:service.y+forward.y*along};
  const posts:Obstacle[]=[-1,1].map(sign=>({
   x:center.x+side.x*21*sign,y:center.y+side.y*21*sign,
   w:7,h:7,low:true,fixture:'queue-stanchion',material:'sheet-metal'
  }));
  if(!posts.every(o=>inside(room,o)))continue;
  if(posts.some(o=>site.doors.some(d=>Math.hypot(o.x-(d.a.x+d.b.x)/2,
    o.y-(d.a.y+d.b.y)/2)<40)))continue;
  if(posts.some(o=>(site.openings??[]).some(w=>Math.hypot(o.x-(w.a.x+w.b.x)/2,
    o.y-(w.a.y+w.b.y)/2)<38)))continue;
  if(posts.some(o=>protectedPoints.some(p=>Math.abs(p.x-o.x)<19&&Math.abs(p.y-o.y)<19)))continue;
  if(posts.some(o=>cover.some(c=>overlaps(o,c,6))))continue;
  cover.push(...posts);
 }
 return {...site,cover};
}
