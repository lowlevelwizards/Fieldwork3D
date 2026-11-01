/** Covered entry assemblies are supported, overhead architectural structures.
 * Canopy posts are real movement/cover obstacles; the overhead roof is
 * visual-only because its underside is above operator height.
 */
import type {Site} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
const allowed=new Set(['house','townhouse','office','retail','clinic','restaurant','motel']);
export function addCoveredEntry(site:Site,seed:number):Site{
 if(!allowed.has(site.archetype??'')||seed%3===2||
    site.structures?.some(s=>s.kind==='entry-canopy'))return site;
 const door=site.doors.find(d=>d.id==='FRONT');if(!door)return site;
 const side=site.entrySide??'south';
 const outward=side==='north'?{x:0,y:-1}:side==='south'?{x:0,y:1}:
   side==='east'?{x:1,y:0}:{x:-1,y:0};
 const tangent={x:outward.y,y:-outward.x};
 const m={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
 const center={x:m.x+outward.x*22,y:m.y+outward.y*22};
 const posts:Obstacle[]=[-1,1].map(sign=>({
  x:m.x+outward.x*44+tangent.x*47*sign,
  y:m.y+outward.y*44+tangent.y*47*sign,
  w:6,h:6,fixture:'canopy-post',low:false,material:'sheet-metal'
 }));
 const bounds=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 const protectedPoints:Pt[]=[...site.spawn,...site.enemies,site.entrance,
  site.objective,site.extract];
 const safe=posts.every(p=>
  p.x>bounds.minX+10&&p.x<bounds.maxX-10&&
  p.y>bounds.minY+10&&p.y<bounds.maxY-10&&
  !site.rooms.some(r=>p.x>r.x-5&&p.x<r.x+r.w+5&&
    p.y>r.y-5&&p.y<r.y+r.h+5)&&
  !site.cover.some(o=>Math.abs(o.x-p.x)<(o.w+p.w)/2+10&&
    Math.abs(o.y-p.y)<(o.h+p.h)/2+10)&&
  !protectedPoints.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<28));
 if(!safe)return site;
 const horizontal=side==='north'||side==='south';
 const roof={id:'ENTRANCE-CANOPY',kind:'entry-canopy',
  x:center.x,y:center.y,w:horizontal?106:46,h:horizontal?46:106};
 return {...site,cover:[...site.cover,...posts],
  structures:[...(site.structures??[]),roof]};
}
