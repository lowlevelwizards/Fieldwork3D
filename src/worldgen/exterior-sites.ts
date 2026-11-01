/** Architectural exterior zones share existing tactical bounds.
 * Does not invent a new world coordinate system or dynamic-bound API.
 */
import {type Site,type ExteriorZone,seeded} from '../breach-site.ts';
import {type Obstacle,type Pt} from '../breach-core.ts';
import {propDefinition} from './asset-catalog.ts';
import {overlapsArrivalLane} from './property-access-lane.ts';
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
 const bounds=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 const entry=site.entrySide??'south';
 const width=Math.max(54,maxX-minX-28),depth=Math.max(54,maxY-minY-28);
 const middleX=(minX+maxX)/2,middleY=(minY+maxY)/2;
 const frontKind:ExteriorZone['kind']=industrial?'driveway':
   kind==='clinic'||kind==='retail'||kind==='motel'?'parking':'yard';
 const backKind:ExteriorZone['kind']=industrial?'service':
   residential?'garden':'patio';
 type Cardinal='north'|'south'|'east'|'west';
 const opposite:Record<Cardinal,Cardinal>={
   north:'south',south:'north',east:'west',west:'east'
 };
 // Use the actual façade orientation rather than pretending that all
 // properties face south. The road and this arrival zone share one side.
 const edgeZone=(side:Cardinal,id:string,zoneKind:ExteriorZone['kind'],
   maxLength=112)=>{
  const horizontal=side==='north'||side==='south';
  const gap=side==='north'?minY-bounds.minY:
    side==='south'?bounds.maxY-maxY:
    side==='west'?minX-bounds.minX:bounds.maxX-maxX;
  if(gap<32)return;
  const thickness=Math.min(maxLength,Math.max(24,gap-18));
  // Arrival pavement starts at the facade, not floating halfway across
  // a deep setback; the actual public door must meet its outside approach.
  const nearFacade=id==='arrival-forecourt';
  const inset=7;
  const c=side==='north'?minY-(nearFacade?thickness/2+inset:gap/2):
    side==='south'?maxY+(nearFacade?thickness/2+inset:gap/2):
    side==='west'?minX-(nearFacade?thickness/2+inset:gap/2):
    maxX+(nearFacade?thickness/2+inset:gap/2);
  zones.push({id,kind:zoneKind,
    x:horizontal?middleX:c,y:horizontal?c:middleY,
    w:horizontal?width:thickness,h:horizontal?thickness:depth});
 };
 edgeZone(entry,'arrival-forecourt',frontKind,118);
 edgeZone(opposite[entry],'rear-property',backKind,80);
 const sideOptions:Cardinal[]=entry==='north'||entry==='south'?
   ['east','west']:['north','south'];
 const freeGap=(side:Cardinal)=>side==='east'?bounds.maxX-maxX:
   side==='west'?minX-bounds.minX:side==='north'?
   minY-bounds.minY:bounds.maxY-maxY;
 sideOptions.sort((a,b)=>freeGap(b)-freeGap(a));
 edgeZone(sideOptions[0],'side-passage',industrial?'service':'yard',42);
 // Open courts and step-backs are exterior, not missing room floors. Dress
 // their surfaces without placing a random crate in the circulation gap.
 const xEdges=[...new Set(site.rooms.flatMap(r=>[r.x,r.x+r.w]))].sort((a,b)=>a-b);
 const yEdges=[...new Set(site.rooms.flatMap(r=>[r.y,r.y+r.h]))].sort((a,b)=>a-b);
 let courts=0;
 for(let row=0;row<yEdges.length-1&&courts<2;row++)
  for(let col=0;col<xEdges.length-1&&courts<2;col++){
   const x=xEdges[col],y=yEdges[row],w=xEdges[col+1]-x,
    h=yEdges[row+1]-y;
   if(w<62||h<62)continue;
   const cx=x+w/2,cy=y+h/2;
   if(cx<=minX||cx>=maxX||cy<=minY||cy>=maxY||
     site.rooms.some(r=>cx>r.x&&cx<r.x+r.w&&cy>r.y&&cy<r.y+r.h))
     continue;
   const adjacent=site.rooms.filter(r=>
     (Math.abs(r.x+r.w-x)<1||Math.abs(r.x-(x+w))<1)&&
       Math.min(r.y+r.h,y+h)-Math.max(r.y,y)>35||
     (Math.abs(r.y+r.h-y)<1||Math.abs(r.y-(y+h))<1)&&
       Math.min(r.x+r.w,x+w)-Math.max(r.x,x)>35).length;
   if(adjacent<2)continue;
   zones.push({id:'court-'+courts++,kind:industrial?'service':
     residential?'garden':'patio',x:cx,y:cy,w,h});
  }
 const available=industrial?
  ['barrel','crate','tire-stack','pallet','bollard','utility-cabinet']:
  residential?
  ['tree-broadleaf','shrub-round','hedge','picnic-table','tree-scrub','mailbox','trash-bin']:
  ['planter','shrub-tall','patio-chair','dumpster','bike-rack'];
 const byZone:Partial<Record<ExteriorZone['kind'],readonly string[]>>={
   parking:['sedan','pickup','van','suv','parking-block','parking-sign','bollard','bike-rack'],
   driveway:residential?['sedan','pickup','suv','mailbox','trash-bin']:
     ['van','pickup','bollard','utility-cabinet'],
   service:industrial?['utility-cabinet','dumpster','bollard','crate',
      'shipping-container','trash-bin']:['dumpster','trash-bin','bike-rack','planter'],
   patio:kind==='restaurant'?
      ['patio-chair','picnic-table','planter','trash-bin']:
      ['planter','patio-chair','bike-rack','trash-bin','grill'],
   garden:residential?['tree-broadleaf','shrub-round','shrub-tall',
      'picnic-table','shed','grill']:['planter','shrub-tall','picnic-table'],
   yard:residential?['mailbox','tree-broadleaf','shrub-round','trash-bin','hydrant']:
     ['planter','street-lamp','bollard','trash-bin'],
 };
 const cover=site.cover.slice();
 const protectedPoints=[...site.spawn,...site.enemies,site.objective,site.extract,site.entrance];
 for(const zone of zones){
  const count=zone.id.startsWith('court-')?0:
    zone.kind==='garden'?3:zone.kind==='yard'?2:2;
  for(let i=0;i<count;i++){
   // Vehicles belong to arrival/parking zones, not a random garden plot.
   const choices=byZone[zone.kind]??available;
   // First object establishes what this exterior space is *for*. Subsequent
   // objects add character; no vehicle in a garden or dumpsters at the
   // public-facing cafe seating area.
   const anchor:Partial<Record<ExteriorZone['kind'],string>>={
     parking:'sedan',driveway:industrial?'van':'pickup',
     service:industrial?'utility-cabinet':'dumpster',
     patio:kind==='restaurant'?'patio-chair':'planter',
     garden:'tree-broadleaf',yard:residential?'mailbox':'planter'
   };
   const item=i===0?(anchor[zone.kind]??choices[0]):
     choices[Math.floor(rng()*choices.length)];
   const asset=propDefinition(item);if(!asset)continue;
   // Preserve true dimensions: a car never becomes smaller than an operator.
   const w=asset.width,h=asset.depth;
   if(zone.w<w+22||zone.h<h+22)continue;
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
    if(overlapsArrivalLane(site,zone,candidate))continue;
    if(cover.some(o=>overlaps(o,candidate)))continue;
    cover.push(candidate);accepted=true;break;
   }
   if(!accepted)continue;
  }
 }
 return {...site,exteriorZones:zones,cover};
}
