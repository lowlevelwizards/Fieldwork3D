/** Insert actual glazed apertures into shared *interior* walls.
 * Glass and low sills use the existing physical window + tactical state pipeline.
 */
import type {Site,Room,BuildingArchetype,WindowOpening} from '../breach-site.ts';
import type {Pt} from '../breach-core.ts';
import {cutWallAperture} from './architectural-assembly.ts';
const limits:Record<BuildingArchetype,number>={
 house:1,townhouse:1,apartment:1,retail:2,office:3,garage:1,
 warehouse:1,restaurant:2,motel:1,utility:1,clinic:3
};
const privateUses=new Set(['bathroom','restroom','bedroom','guest','treatment','exam']);
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function addInteriorGlazing(site:Site,seed:number):Site{
 const kind=site.archetype??'house';
 const rooms=site.rooms;
 const at=(p:Pt):Room|undefined=>rooms.find(r=>p.x>r.x+1&&p.x<r.x+r.w-1&&
  p.y>r.y+1&&p.y<r.y+r.h-1);
 const possible=site.walls.map((wall,index)=>{
  const dx=wall.b.x-wall.a.x,dy=wall.b.y-wall.a.y;
  const length=Math.hypot(dx,dy),middle={x:(wall.a.x+wall.b.x)/2,y:(wall.a.y+wall.b.y)/2};
  if(length<104||Math.abs(dx)>1&&Math.abs(dy)>1)return null;
  const nx=-dy/length,ny=dx/length;
  const left=at({x:middle.x+nx*13,y:middle.y+ny*13});
  const right=at({x:middle.x-nx*13,y:middle.y-ny*13});
  if(!left||!right||left.id===right.id||left.zoneId===right.zoneId||
   privateUses.has(left.purpose??'')||privateUses.has(right.purpose??''))return null;
  if(site.doors.some(d=>distance(middle,{x:(d.a.x+d.b.x)/2,y:(d.a.y+d.b.y)/2})<61))return null;
  if((site.windows??[]).some(w=>distance(middle,{x:w.x,y:w.y})<62))return null;
  const useful=['office','meeting','reception','lobby','waiting','sales','checkout',
   'kitchen','dining','workshop','bay','control','service','hallway'];
  const score=Number(useful.includes(left.purpose??''))+Number(useful.includes(right.purpose??''));
  if(score<1)return null;
  return {wall,index,middle,length,score};
 }).filter((x):x is NonNullable<typeof x>=>x!==null)
  .sort((a,b)=>b.score-a.score||b.length-a.length||a.index-b.index);
 let walls=site.walls.slice(),windows:WindowOpening[]=[...(site.windows??[])];
 const cover=site.cover.slice();let count=0;
 for(const candidate of possible){
  if(count>=limits[kind])break;
  const index=walls.indexOf(candidate.wall);if(index<0)continue;
  const width=Math.min(64,candidate.length-44);
  const cut=cutWallAperture(walls,index,'IW'+count,width,.5,20);
  if(!cut)continue;
  const sillHeight=kind==='office'&&count===0?0:
    kind==='office'||kind==='retail'?9:13;
  windows.push({id:cut.aperture.id,x:candidate.middle.x,y:candidate.middle.y,
   width,vertical:Math.abs(candidate.wall.a.x-candidate.wall.b.x)<1,
   style:['garage','warehouse','utility'].includes(kind)?'industrial':'picture',
   interior:true,sillHeight,headHeight:sillHeight===0?39:37});
  cover.push({x:candidate.middle.x,y:candidate.middle.y,
   w:Math.abs(candidate.wall.a.x-candidate.wall.b.x)<1?10:width,
   h:Math.abs(candidate.wall.a.x-candidate.wall.b.x)<1?width:10,
   low:true,fixture:sillHeight===0?'glass-barrier':'window-sill'});
  walls=cut.walls;count++;
 }
 void seed;
 return {...site,walls,windows,cover};
}
