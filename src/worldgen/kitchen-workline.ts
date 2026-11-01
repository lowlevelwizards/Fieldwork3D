/** Connected restaurant kitchen stations with a real walkable working face.
 * Reserve complete prep > cooking > wash work lines before generic furnishing.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
import {propDefinition} from './asset-catalog.ts';
const kinds=['prep-table','commercial-range','dish-station'] as const;
const lengths=kinds.map(id=>propDefinition(id)?.width??40);
const hits=(o:Obstacle,c:Obstacle,gap=6)=>
 Math.abs(o.x-c.x)<(o.w+c.w)/2+gap&&Math.abs(o.y-c.y)<(o.h+c.h)/2+gap;
const inside=(o:Obstacle,r:Room)=>
 o.x-o.w/2>r.x+9&&o.x+o.w/2<r.x+r.w-9&&
 o.y-o.h/2>r.y+9&&o.y+o.h/2<r.y+r.h-9;
export function planKitchenWorklines(site:Site,occupied:readonly Obstacle[]):Obstacle[]{
 if(site.archetype!=='restaurant')return [];
 const protectedPoints:Pt[]=[...site.spawn,...site.enemies,site.objective,
  site.extract,site.entrance];
 const result:Obstacle[]=[];
 for(const room of site.rooms.filter(r=>r.kind==='room'&&
   r.purpose==='kitchen'&&r.w>=180&&r.h>=110)){
  // A completed station sequence is one installation, not one on each wall.
  if(kinds.every(id=>occupied.some(o=>o.fixture===id&&
    o.x>room.x&&o.x<room.x+room.w&&o.y>room.y&&o.y<room.y+room.h)))continue;
  // A finished workline owns the functional kitchen; never create a second
  // parallel line on the opposite wall when this pass is reapplied.
  if([...occupied,...result].some(o=>kinds.includes(o.fixture as typeof kinds[number])&&
    o.x>room.x&&o.x<room.x+room.w&&o.y>room.y&&o.y<room.y+room.h))continue;
  const center=room.x+room.w/2;
  const candidates=[1,-1].map(side=>kinds.map((id,i):Obstacle=>({
   x:center+(i-1)*51,y:room.y+room.h/2+side*(room.h/2-28),
   w:lengths[i],h:propDefinition(id)?.depth??25,
   fixture:id,low:propDefinition(id)?.cover==='low',
   orientation:side===1?2:0
  })));
  for(const group of candidates){
   if(!group.every(o=>inside(o,room)))continue;
   if(group.some(o=>site.doors.some(d=>Math.hypot(o.x-(d.a.x+d.b.x)/2,
     o.y-(d.a.y+d.b.y)/2)<58)))continue;
   if(group.some(o=>(site.openings??[]).some(h=>Math.hypot(o.x-(h.a.x+h.b.x)/2,
     o.y-(h.a.y+h.b.y)/2)<58)))continue;
   if(group.some(o=>protectedPoints.some(p=>
     Math.abs(o.x-p.x)<o.w/2+24&&Math.abs(o.y-p.y)<o.h/2+24)))continue;
   if(group.some(o=>[...occupied,...result].some(c=>hits(o,c))))continue;
   result.push(...group);break;
  }
 }
 return result;
}
