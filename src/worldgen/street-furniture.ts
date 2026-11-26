/** ST7–10: contextual physical hardware, placed only on private-side
 * frontage where the actual public footway, access and routes remain clear.
 * Reuses authored low-poly fixtures; no per-frame lighting or simulation. */
import type {Site} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';
import {propDefinition} from './asset-catalog.ts';
import {exteriorDoorReserves,intersectsExteriorDoorReserve} from './exterior-door-reserve.ts';
import {intersectsVehicleParkingReserve} from './vehicle-parking-layout.ts';
import {overlapsArrivalLane} from './property-access-lane.ts';
import {streetConflicts} from './street-infrastructure.ts';

const overlap=(a:{x:number;y:number;w:number;h:number},b:{x:number;y:number;w:number;h:number},pad=0)=>
 Math.abs(a.x-b.x)<(a.w+b.w)/2+pad&&Math.abs(a.y-b.y)<(a.h+b.h)/2+pad;
export function planStreetFurniture(site:Site):Obstacle[]{
 const p=site.streetInfrastructure;if(!p)return [];
 const b=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 const axis=p.axis,across=axis==='x'?'y':'x',sign=p.entry==='south'||p.entry==='east'?1:-1;
 const orientation=p.entry==='east'?1:p.entry==='north'?2:p.entry==='west'?3:0;
 const start=axis==='x'?b.minX:b.minY,end=axis==='x'?b.maxX:b.maxY;
 const zones=(site.exteriorZones??[]),front=zones.find(z=>z.id==='arrival-forecourt');
 if(!front)return [];
 const points=[...site.spawn,...site.enemies,site.entrance,site.extract,site.objective,
  ...(site.encounter?.actors??[]).flatMap(a=>[a.position,...(a.routine??[])]),
  ...(site.encounter?.neutrals??[]).flatMap(a=>[a.position,...(a.routine??[])])];
 const doors=exteriorDoorReserves(site.doors),out:Obstacle[]=[];
 const roles=p.kind==='rural'?['wayfinding-sign']:
  p.kind==='industrial'?['street-lamp','street-lamp','hydrant','bollard']:
  p.kind==='commercial'||p.kind==='suburban'?['street-lamp','street-lamp','hydrant','wayfinding-sign','public-bench']:
  ['street-lamp','hydrant'];
 const blocked=[p.frontage.road,p.frontage.sidewalk,p.frontage.approach,p.frontage.curbRamp,p.verge,p.shoulder,p.accessConnection,...p.frontage.curb]
  .filter(r=>r!==null).map(r=>({x:r.x,y:r.y,w:r.width,h:r.depth}));
 for(const fixture of roles){
  const asset=propDefinition(fixture);if(!asset)continue;
  const w=orientation%2?asset.depth:asset.width,h=orientation%2?asset.width:asset.depth;
  const depth=axis==='x'?h:w,alongSize=axis==='x'?w:h;
  const n=site.cover.filter(c=>c.fixture===fixture&&Math.abs(c[across]-p.privateEdge)<100).length+out.filter(c=>c.fixture===fixture).length;
  const cap=fixture==='street-lamp'&&end-start>=400?2:1;if(n>=cap)continue;
  const phase=((site.seed>>>0)%13-6)*3;
  let placed=false;
  for(const t of [0.18,0.82,0.34,0.66,0.48,0.92,0.08]){
   const at=start+(end-start)*t+phase;
   for(const inset of [5,15,27]){
    const cross=p.privateEdge-sign*(depth/2+inset);
    const c:Obstacle={x:axis==='x'?at:cross,y:axis==='x'?cross:at,w,h,fixture,orientation,low:asset.cover==='low'};
    if(at-alongSize/2<start+17||at+alongSize/2>end-17||
      c.x-w/2<b.minX+17||c.x+w/2>b.maxX-17||c.y-h/2<b.minY+23||c.y+h/2>b.maxY-22)continue;
    if(Math.abs(c.x-front.x)+w/2>front.w/2||Math.abs(c.y-front.y)+h/2>front.h/2)continue;
    if(blocked.some(r=>overlap(r,c,3))||intersectsExteriorDoorReserve(doors,c)||
      zones.some(z=>overlapsArrivalLane(site,z,c)||intersectsVehicleParkingReserve(z,c)))continue;
    if(site.rooms.some(r=>overlap({x:r.x+r.w/2,y:r.y+r.h/2,w:r.w,h:r.h},c,8))||
      points.some(pt=>Math.abs(pt.x-c.x)<w/2+32&&Math.abs(pt.y-c.y)<h/2+32))continue;
    if([...site.cover,...out].some(o=>overlap(o,c,12)||
      (o.fixture===fixture&&Math.hypot(o.x-c.x,o.y-c.y)<(fixture==='street-lamp'?150:75))))continue;
    if(streetConflicts({...site,cover:[c]},p).length)continue;
    out.push(c);placed=true;break;
   }
   if(placed)break;
  }
 }
 return out;
}
