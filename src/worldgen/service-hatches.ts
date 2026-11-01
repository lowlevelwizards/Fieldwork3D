/** Service and ordering windows are cuts in real shared walls, not decal openings. */
import type {Site,Room} from '../breach-site.ts';
import type {Pt} from '../breach-core.ts';
import {cutWallAperture} from './architectural-assembly.ts';
const compatible=new Set(['dining|kitchen','kitchen|service','checkout|sales',
 'reception|waiting','lobby|reception','office|sales','sales|stockroom']);
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function addServiceHatches(site:Site,seed:number):Site{
 const at=(p:Pt):Room|undefined=>site.rooms.find(r=>p.x>r.x+1&&
  p.x<r.x+r.w-1&&p.y>r.y+1&&p.y<r.y+r.h-1);
 let walls=site.walls.slice();
 const openings=[...(site.openings??[])],cover=site.cover.slice();
 const initial=walls.slice();let added=0;
 const candidates=initial.map((wall,index)=>{
  const dx=wall.b.x-wall.a.x,dy=wall.b.y-wall.a.y;
  const length=Math.hypot(dx,dy);
  if(length<112||Math.abs(dx)>1&&Math.abs(dy)>1)return null;
  const p={x:(wall.a.x+wall.b.x)/2,y:(wall.a.y+wall.b.y)/2};
  const a=at({x:p.x-dy/length*13,y:p.y+dx/length*13});
  const b=at({x:p.x+dy/length*13,y:p.y-dx/length*13});
  if(!a||!b||a.id===b.id)return null;
  const pair=[a.purpose??'',b.purpose??''].sort().join('|');
  if(!compatible.has(pair))return null;
  if(site.doors.some(d=>dist(p,{x:(d.a.x+d.b.x)/2,y:(d.a.y+d.b.y)/2})<64))return null;
  if((site.windows??[]).some(w=>dist(p,{x:w.x,y:w.y})<65))return null;
  if(openings.some(o=>dist(p,{x:(o.a.x+o.b.x)/2,y:(o.a.y+o.b.y)/2})<65))return null;
  return {wall,index,length,p,pair};
 }).filter((v):v is NonNullable<typeof v>=>!!v)
   .sort((a,b)=>b.length-a.length||a.index-b.index);
 for(const candidate of candidates){
  if(added>=2)break;
  const index=walls.indexOf(candidate.wall);if(index<0)continue;
  const width=Math.min(58,candidate.length-44);
  const cut=cutWallAperture(walls,index,'SERVICE-HATCH-'+added,width,.5,20);
  if(!cut)continue;
  openings.push({id:cut.aperture.id,a:cut.aperture.a,b:cut.aperture.b,kind:'serving'});
  cover.push({x:candidate.p.x,y:candidate.p.y,
   w:Math.abs(candidate.wall.a.x-candidate.wall.b.x)<1?10:width,
   h:Math.abs(candidate.wall.a.x-candidate.wall.b.x)<1?width:10,
   low:true,fixture:'window-sill'});
  walls=cut.walls;added++;
 }
 void seed;
 return {...site,walls,openings,cover};
}
