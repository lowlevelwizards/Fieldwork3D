/** Bounded second pass that actually attempts missing essential fixtures.
 * Searches all rectangles of a connected zone; does not invent furniture,
 * shrink assets, ignore door clearances or claim unsatisfied rooms are complete.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
import {propDefinition} from './asset-catalog.ts';
import {ROOM_CONTRACTS} from './room-contracts.ts';
type Input=Pick<Site,'rooms'|'doors'|'openings'|'spawn'|'enemies'|'objective'|'extract'>;
export type RecoveryIssue={roomId:string;fixture:string;reason:string};
const inside=(o:Obstacle,r:Room)=>o.x>r.x&&o.x<r.x+r.w&&o.y>r.y&&o.y<r.y+r.h;
const collides=(a:Obstacle,b:Obstacle)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+5&&
 Math.abs(a.y-b.y)<(a.h+b.h)/2+5;
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function candidates(room:Room,width:number,depth:number):Pt[]{
 const l=room.x+width/2+9,r=room.x+room.w-width/2-9,
       t=room.y+depth/2+9,b=room.y+room.h-depth/2-9;
 if(l>r||t>b)return [];
 const points:Pt[]=[];
 const dx=Math.max(1,Math.ceil((r-l)/15)),dy=Math.max(1,Math.ceil((b-t)/15));
 for(let y=0;y<=dy;y++)for(let x=0;x<=dx;x++)
  points.push({x:l+(r-l)*x/dx,y:t+(b-t)*y/dy});
 // Prioritize room walls, preserving the most usable central circulation.
 points.sort((a,c)=>{
  const edge=(p:Pt)=>Math.min(p.x-l,r-p.x,p.y-t,b-p.y);
  return edge(a)-edge(c)||a.y-c.y||a.x-c.x;
 });
 return points;
}
export function recoverRoomEssentials(site:Input,initial:readonly Obstacle[]):{
 cover:Obstacle[];issues:RecoveryIssue[];recovered:number
}{
 const cover=[...initial],issues:RecoveryIssue[]=[];
 const groups=new Map<string,Room[]>();
 for(const room of site.rooms){
  if(room.kind==='hall')continue;
  const id=room.zoneId??room.id;
  groups.set(id,[...(groups.get(id)??[]),room]);
 }
 const reserved=[...site.spawn,...site.enemies,site.objective,site.extract];
 let recovered=0;
 for(const [zone,rooms] of groups){
  const role=rooms[0]?.purpose??'storage';
  const contract=ROOM_CONTRACTS[role];if(!contract)continue;
  for(const alternatives of contract.required){
   if(cover.some(o=>alternatives.includes(o.fixture??'')&&rooms.some(r=>inside(o,r))))continue;
   let chosen:Obstacle|undefined;
   for(const fixture of alternatives){
    const asset=propDefinition(fixture);
    if(!asset?.solid)continue;
    for(const room of rooms){
     if(asset.width>room.w-18||asset.depth>room.h-18)continue;
     const spots=candidates(room,asset.width,asset.depth);
     for(const pos of spots){
      const candidate:Obstacle={...pos,w:asset.width,h:asset.depth,fixture,low:asset.cover==='low'};
      if(cover.some(o=>collides(o,candidate)))continue;
      if(reserved.some(p=>Math.abs(p.x-pos.x)<asset.width/2+23&&
        Math.abs(p.y-pos.y)<asset.depth/2+23))continue;
      if(site.doors.some(d=>distance(pos,{x:(d.a.x+d.b.x)/2,
        y:(d.a.y+d.b.y)/2})<Math.max(37,Math.max(asset.width,asset.depth)/2+20)))continue;
      if((site.openings??[]).some(o=>distance(pos,{x:(o.a.x+o.b.x)/2,
        y:(o.a.y+o.b.y)/2})<Math.max(44,Math.max(asset.width,asset.depth)/2+22)))continue;
      chosen=candidate;break;
     }
     if(chosen)break;
    }
    if(chosen)break;
   }
   if(chosen){cover.push(chosen);recovered++;}
   else issues.push({roomId:zone,fixture:alternatives.join('|'),reason:'essential-unresolved'});
  }
 }
 return {cover,issues,recovered};
}
