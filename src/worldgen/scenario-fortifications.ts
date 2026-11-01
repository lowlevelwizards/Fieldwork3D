/** Tactical interior fortifications use ordinary physical props and the
 * same world collision as weapons and operator movement. They deliberately
 * sit toward protected room edges; never put a wall across a doorway.
 * The caller's architectural A* rejection remains authoritative.
 */
import type {Site} from '../breach-site.ts';
import {seeded} from '../breach-site.ts';
import {pointToSegment,type Obstacle,type Pt} from '../breach-core.ts';
import {propDefinition} from './asset-catalog.ts';
const roles=new Set(['sales','office','stockroom','storage','workshop',
 'bay','service','loading','dining','lobby','living']);
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const overlaps=(a:Obstacle,b:Obstacle,gap=11)=>
 Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&
 Math.abs(a.y-b.y)<(a.h+b.h)/2+gap;
export function addScenarioFortifications(site:Site,seed:number):Site{
 if(site.scenarioStyle!=='guarded')return site;
 const random=seeded(seed^0x36f04e9a),cover=site.cover.slice();
 const protectedPoints=[...site.spawn,...site.enemies,
  site.objective,site.extract,site.entrance].filter(Boolean);
 let added=0;
 const rooms=site.rooms.filter(r=>r.kind==='room'&&roles.has(r.purpose??'')&&
  r.w>=158&&r.h>=137).sort((a,b)=>a.id.localeCompare(b.id));
 for(const room of rooms){
  if(added>=2)break;
  if(random()>.65)continue;
  const fixture=['warehouse','garage','utility'].includes(site.archetype??'')?
    (random()<.5?'pallet':'crate'):
    random()<.65?'crate':'small-table';
  const asset=propDefinition(fixture);
  if(!asset)continue;
  const w=asset.width,h=asset.depth,atY=room.y+room.h*.27;
  const positions:Pt[]=[
   {x:room.x+room.w*.27,y:atY},
   {x:room.x+room.w*.73,y:room.y+room.h*.73},
   {x:room.x+room.w*.73,y:atY},
   {x:room.x+room.w*.27,y:room.y+room.h*.73},
  ];
  const start=Math.floor(random()*positions.length);
  for(let n=0;n<positions.length;n++){
   const p=positions[(start+n)%positions.length];
   const candidate:Obstacle={x:p.x,y:p.y,w,h,fixture,
     low:asset.cover==='low',orientation:0};
   if(p.x-w/2<room.x+13||p.x+w/2>room.x+room.w-13||
     p.y-h/2<room.y+13||p.y+h/2>room.y+room.h-13)continue;
   if(cover.some(other=>overlaps(other,candidate)))continue;
   if(site.walls.some(wall=>pointToSegment(p,wall)<Math.max(w,h)/2+8))continue;
   if(site.doors.some(d=>pointToSegment(p,d)<Math.max(w,h)/2+66))continue;
   if((site.openings??[]).some(o=>pointToSegment(p,o)<Math.max(w,h)/2+66))continue;
   if((site.windows??[]).some(q=>dist(p,{x:q.x,y:q.y})<45))continue;
   if(protectedPoints.some(q=>dist(p,q)<Math.max(w,h)/2+55))continue;
   cover.push(candidate);added++;break;
  }
 }
 return added?{...site,cover}:site;
}
