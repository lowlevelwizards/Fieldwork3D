/** Architectural exterior zones share existing tactical bounds.
 * Does not invent a new world coordinate system or dynamic-bound API.
 */
import {type Site,type ExteriorZone,seeded} from '../breach-site.ts';
import {type Obstacle,type Pt} from '../breach-core.ts';
import {propDefinition} from './asset-catalog.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const overlaps=(a:Obstacle,b:Obstacle)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+17&&Math.abs(a.y-b.y)<(a.h+b.h)/2+17;
export function addExteriorProperty(site:Site,seed:number):Site{
 const rng=seeded(seed^0x15b8ad1);
 const minX=Math.min(...site.rooms.map(r=>r.x));
 const maxX=Math.max(...site.rooms.map(r=>r.x+r.w));
 const minY=Math.min(...site.rooms.map(r=>r.y));
 const maxY=Math.max(...site.rooms.map(r=>r.y+r.h));
 const kind=site.archetype??'house';
 const industrial=['garage','warehouse','utility'].includes(kind);
 const residential=['house','townhouse','apartment','motel'].includes(kind);
 const zones:ExteriorZone[]=[];
 const width=Math.max(54,maxX-minX-28),middleX=(minX+maxX)/2;
 if(minY>50)zones.push({id:'rear-yard',kind:industrial?'service':residential?'garden':'patio',
  x:middleX,y:Math.max(30,minY/2),w:width,h:Math.max(28,Math.min(63,minY-28))});
 if(maxY<650)zones.push({id:'forecourt',kind:industrial?'service':residential?'yard':'parking',
  x:middleX,y:(maxY+Math.min(723,maxY+155))/2,
  w:width,h:Math.max(30,Math.min(155,723-maxY))});
 if(maxX<590)zones.push({id:'side-passage',kind:'yard',x:(maxX+625)/2,
  y:(minY+maxY)/2,w:Math.min(43,625-maxX),h:Math.min(240,maxY-minY)});
 const available=industrial?['barrel','crate','tire-stack','pallet']:
  residential?['bush','planter','hedge','picnic-table']:
  ['planter','bush','patio-chair','dumpster'];
 const cover=site.cover.slice();
 const protectedPoints=[...site.spawn,...site.enemies,site.objective,site.extract,site.entrance];
 for(const zone of zones){
  const count=zone.kind==='yard'?1:2;
  for(let i=0;i<count;i++){
   const item=available[(Math.floor(rng()*available.length)+i)%available.length];
   const asset=propDefinition(item);if(!asset)continue;
   const w=Math.min(asset.width,Math.max(12,zone.w*.24));
   const h=Math.min(asset.depth,Math.max(12,zone.h*.27));
   let accepted=false;
   for(let attempt=0;attempt<12;attempt++){
    const x=zone.x+(rng()-.5)*Math.max(0,zone.w-w-20);
    const y=zone.y+(rng()-.5)*Math.max(0,zone.h-h-18);
    const candidate:Obstacle={x,y,w,h,fixture:item,low:asset.cover==='low'};
    const bounds=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
    if(x-w/2<bounds.minX+17||x+w/2>bounds.maxX-17||
      y-h/2<bounds.minY+23||y+h/2>bounds.maxY-22)continue;
    if(site.rooms.some(r=>x+w/2>r.x&&x-w/2<r.x+r.w&&
      y+h/2>r.y&&y-h/2<r.y+r.h))continue;
    if(protectedPoints.some(p=>Math.abs(p.x-x)<w/2+32&&Math.abs(p.y-y)<h/2+32))continue;
    if(site.doors.some(d=>distance({x,y},{x:(d.a.x+d.b.x)/2,y:(d.a.y+d.b.y)/2})<68))continue;
    if(cover.some(o=>overlaps(o,candidate)))continue;
    cover.push(candidate);accepted=true;break;
   }
   if(!accepted)continue;
  }
 }
 return {...site,exteriorZones:zones,cover};
}
