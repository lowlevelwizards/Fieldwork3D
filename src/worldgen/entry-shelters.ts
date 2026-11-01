/** Lightweight overhead architecture tied to actual entry doors.
 * Columns are physical cover; the roof stays overhead and never pretends to
 * be a navigable floor. Do not place supports in the operator arrival lane.
 */
import type {Site} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';

const center=(d:{a:Pt;b:Pt}):Pt=>({x:(d.a.x+d.b.x)/2,y:(d.a.y+d.b.y)/2});
const overlap=(a:Obstacle,b:Obstacle,margin=10)=>
 Math.abs(a.x-b.x)<(a.w+b.w)/2+margin&&
 Math.abs(a.y-b.y)<(a.h+b.h)/2+margin;
export function addCoveredEntries(site:Site,seed:number):Site{
 const front=site.doors.find(d=>d.id==='FRONT');
 if(!front)return site;
 const side=site.entrySide??'south';
 const axis=side==='east'||side==='west'?'vertical':'horizontal';
 const outward=side==='south'?{x:0,y:1}:side==='north'?{x:0,y:-1}:
  side==='east'?{x:1,y:0}:{x:-1,y:0};
 const lateral=axis==='horizontal'?{x:1,y:0}:{x:0,y:1};
 const source=center(front);
 const kind=site.archetype??'house';
 const residential=['house','townhouse','motel'].includes(kind);
 const industrial=['garage','warehouse','utility'].includes(kind);
 const roofKind=residential?'porch-roof':industrial?'service-awning':'entrance-canopy';
 const width=industrial?106:residential?90+(seed%2)*6:96;
 const depth=residential?47:industrial?38:40;
 const middle={x:source.x+outward.x*(depth/2-5),
  y:source.y+outward.y*(depth/2-5)};
 const w=axis==='horizontal'?width:depth;
 const h=axis==='horizontal'?depth:width;
 const bounds=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 if(middle.x-w/2<bounds.minX+7||middle.x+w/2>bounds.maxX-7||
   middle.y-h/2<bounds.minY+7||middle.y+h/2>bounds.maxY-7)return site;
 // No shelter if the roof footprint would overlap an unrelated room.
 if(site.rooms.some(r=>middle.x>r.x+8&&middle.x<r.x+r.w-8&&
   middle.y>r.y+8&&middle.y<r.y+r.h-8))return site;
 const structures=[...(site.structures??[]),{
   id:'ENTRY-SHELTER',kind:roofKind,x:middle.x,y:middle.y,w,h
 }];
 const cover=site.cover.slice();
 // Commercial awnings cantilever to keep customer queues and doors clear.
 // Domestic porches use two real load-bearing posts, never render-only props.
 if(residential){
  const tip={x:source.x+outward.x*(depth-10),
   y:source.y+outward.y*(depth-10)};
  const posts:Obstacle[]=[-1,1].map(sign=>({
    x:tip.x+lateral.x*sign*(width/2-7),
    y:tip.y+lateral.y*sign*(width/2-7),
    w:8,h:8,fixture:'porch-post',low:false,material:'hardwood'
  }));
  const protectedPoints=[...site.spawn,...site.enemies,site.objective,
    site.extract,site.entrance];
  const clear=posts.every(p=>site.rooms.every(r=>
    p.x+p.w/2<=r.x||p.x-p.w/2>=r.x+r.w||
    p.y+p.h/2<=r.y||p.y-p.h/2>=r.y+r.h)&&
    site.doors.every(d=>Math.hypot(p.x-center(d).x,p.y-center(d).y)>35)&&
    protectedPoints.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>21)&&
    cover.every(o=>!overlap(p,o)));
  if(!clear)return site; // no unsupported floating porch canopy
  cover.push(...posts);
 }
 return {...site,cover,structures};
}
