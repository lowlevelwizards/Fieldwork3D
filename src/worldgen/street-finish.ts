/** ST3: deterministic large graphic surface finishes. All public marks
 * are clipped to their real substrate; no new physical colliders. */
import type {Site} from '../breach-site.ts';
import type {PropertySurface,SurfaceKind} from './property-surfaces.ts';
import type {StreetRect} from './public-street-layout.ts';
import {seeded} from './seeded-rng.ts';
export function planStreetFinishes(site:Site):PropertySurface[]{
 const p=site.streetInfrastructure;if(!p)return [];
 const marks:PropertySurface[]=[],zoneId='public-street';
 const add=(kind:SurfaceKind,r:StreetRect)=>marks.push({id:'street:'+kind+':'+marks.length,zoneId,kind,...r});
 if(p.verge)add('street-verge',p.verge);
 if(p.shoulder)add('street-shoulder',p.shoulder);
 if(p.accessConnection)add('street-driveway-link',p.accessConnection);
 const road=p.frontage.road,along=p.axis,across=along==='x'?'y':'x';
 const len=along==='x'?road.width:road.depth,depth=p.visibleRoadWidth;
 const rect=(at:number,other:number,w:number,h:number):StreetRect=>along==='x'?
  {x:at,y:other,width:w,depth:h}:{x:other,y:at,width:h,depth:w};
 const from=road[along]-len/2;
 const rng=seeded(site.seed^0x2a2cd11);
 // Sparse broad patches: maintain legibility at gameplay distance.
 const count=Math.min(5,Math.floor(len/150));
 for(let i=0;i<count;i++){
  const w=24+rng()*22,h=Math.min(depth*.35,12+rng()*12);
  const at=from+(i+.5)*len/count,other=road[across]+(rng()-.5)*(depth-h-6);
  add('road-patch',rect(at,other,w,h));
 }
 if(depth>=24&&len>=120){
  for(const t of [.27,.74]){
   const at=from+len*t,other=road[across];
   add('road-manhole',rect(at,other,13,13));
  }
 }
 // Real curb drain positions lie on the road edge, not on the sidewalk.
 const sign=p.entry==='south'||p.entry==='east'?1:-1;
 for(const curb of p.frontage.curb){
  const span=along==='x'?curb.width:curb.depth;
  if(span<55)continue;
  const at=curb[along]+span*.22;
  add('street-drain',rect(at,road[across]-sign*(depth/2-3),14,5));
 }
 // Expansion joints follow the actual sidewalk pieces around curb cuts.
 for(const slab of p.frontage.sidewalkPieces){
  const length=along==='x'?slab.width:slab.depth,wide=along==='x'?slab.depth:slab.width;
  const n=Math.floor(length/42);
  for(let i=1;i<n;i++)add('sidewalk-joint',rect(slab[along]-length/2+i*length/n,slab[across],.9,wide-2));
 }
 return marks;
}
