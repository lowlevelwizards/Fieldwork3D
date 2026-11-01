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

/** Restore the physical parapet after downstream furnishing and window dressing.
 * This is idempotent and prevents any servicing aperture from becoming a full-height
 * walk-through if a layout recovery pass replaces its obstacle list.
 */
export function enforceServiceHatchBarriers(site:Site):Site{
 // Rebuild exactly one collider for every authoritative glass aperture and
 // every serving cutout. The facade pass necessarily removes original sills
 // while replacing its window geometry, so a missing hatch parapet must not
 // depend on a previous dressing pass retaining its obstacle object.
 const cover=site.cover.filter(c=>
   c.fixture!=='window-sill'&&c.fixture!=='glass-barrier');
 for(const w of site.windows??[]){
  cover.push({x:w.x,y:w.y,
    w:w.vertical?10:w.width,h:w.vertical?w.width:10,
    low:true,fixture:w.sillHeight===0?'glass-barrier':'window-sill'});
 }
 for(const opening of site.openings??[]){
  if(opening.kind!=='serving')continue;
  const center={x:(opening.a.x+opening.b.x)/2,y:(opening.a.y+opening.b.y)/2};
  const vertical=Math.abs(opening.a.x-opening.b.x)<1;
  const width=dist(opening.a,opening.b);
  cover.push({x:center.x,y:center.y,w:vertical?10:width,
   h:vertical?width:10,low:true,fixture:'window-sill'});
 }
 return {...site,cover};
}
