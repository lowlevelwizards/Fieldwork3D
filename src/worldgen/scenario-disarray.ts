/** Actual small displaced fixtures for disrupted missions.
 * Changes physical cover and rendering together, never visual-only fake walls.
 * All candidates stay against walls in spacious rooms, well outside door,
 * civilian, operator and objective envelopes. Bounded to three per site.
 */
import type {Site} from '../breach-site.ts';
import {seeded} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
import {propDefinition} from './asset-catalog.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const roles=new Set(['living','dining','kitchen','office','sales','stockroom',
 'workshop','bay','storage','service','laundry','reception','packing']);
export function addScenarioDisarray(site:Site,seed:number):Site{
 if(site.scenarioStyle!=='disrupted')return site;
 const random=seeded(seed^0x36ab1927);
 const cover=site.cover.slice();
 let placed=0;
 const rooms=site.rooms.filter(r=>r.kind==='room'&&roles.has(r.purpose??'')&&
   r.w>=145&&r.h>=135).sort((a,b)=>a.id.localeCompare(b.id));
 const protectedPoints=[...site.spawn,...site.enemies,site.objective,site.extract,
  site.entrance].filter(Boolean);
 for(const room of rooms){
  if(placed>=3)break;
  if(random()>.63)continue;
  const list=room.purpose==='workshop'||room.purpose==='stockroom'?
   ['storage-tote','tipped-trash-bin']:['tipped-trash-bin','storage-tote'];
  const fixture=list[Math.floor(random()*list.length)];
  const asset=propDefinition(fixture);
  if(!asset)continue;
  const w=asset.width,h=asset.depth;
  const spots:Pt[]=[
   {x:room.x+w/2+18,y:room.y+h/2+18},
   {x:room.x+room.w-w/2-18,y:room.y+h/2+18},
   {x:room.x+room.w-w/2-18,y:room.y+room.h-h/2-18},
   {x:room.x+w/2+18,y:room.y+room.h-h/2-18},
  ];
  const offset=Math.floor(random()*spots.length);
  for(let j=0;j<spots.length;j++){
   const p=spots[(offset+j)%spots.length];
   const obstacle:Obstacle={x:p.x,y:p.y,w,h,low:asset.cover==='low',
     fixture,orientation:((offset+j)%4) as 0|1|2|3};
   if(site.doors.some(d=>dist(p,{x:(d.a.x+d.b.x)/2,
     y:(d.a.y+d.b.y)/2})<72))continue;
   if(protectedPoints.some(q=>dist(p,q)<48))continue;
   if((site.windows??[]).some(q=>dist(p,{x:q.x,y:q.y})<35))continue;
   if(cover.some(c=>Math.abs(c.x-p.x)<(c.w+w)/2+14&&
     Math.abs(c.y-p.y)<(c.h+h)/2+14))continue;
   if(site.walls.some(wall=>{
     const dx=wall.b.x-wall.a.x,dy=wall.b.y-wall.a.y;
     const k=Math.max(0,Math.min(1,
       ((p.x-wall.a.x)*dx+(p.y-wall.a.y)*dy)/(dx*dx+dy*dy||1)));
     return dist(p,{x:wall.a.x+dx*k,y:wall.a.y+dy*k})<Math.min(w,h)/2+7;
   }))continue;
   cover.push(obstacle);placed++;break;
  }
 }
 return placed?{...site,cover}:site;
}
