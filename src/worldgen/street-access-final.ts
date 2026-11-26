/** Dedicated curbside parallel bays and a clear transfer-to-approach
 * connection. Vehicle dimensions and cardinal collision remain authoritative. */
import type {Site,ExteriorZone} from '../breach-site.ts';
import type {StreetRect} from './public-street-layout.ts';
import {STREET_DIMENSIONS as D} from './street-standards.ts';
import {reservedParkingBay} from './parking-stalls.ts';
import {arrivalAccessLane} from './property-access-lane.ts';
const overlap=(r:StreetRect,c:{x:number;y:number;w:number;h:number},pad=0)=>
 Math.abs(r.x-c.x)<(r.width+c.w)/2+pad&&Math.abs(r.y-c.y)<(r.depth+c.h)/2+pad;
export function attachCurbsideParking(site:Site):Site|null{
 const p=site.streetInfrastructure,r=p?.curbside;if(!p||!r)return null;
 const axis=p.axis,across=axis==='x'?'y':'x',length=axis==='x'?r.width:r.depth;
 const crossWidth=axis==='x'?r.depth:r.width;
 if(site.cover.some(c=>overlap(r,c))||(site.structures??[]).some(c=>overlap(r,c)))return null;
 const lo=r[axis]-length/2+26,hi=r[axis]+length/2-26;
 const excluded=[p.frontage.approach,p.frontage.curbRamp,p.accessConnection].filter((a):a is StreetRect=>!!a)
  .map(a=>[a[axis]-(axis==='x'?a.width:a.depth)/2-24,a[axis]+(axis==='x'?a.width:a.depth)/2+24] as const);
 let spans:[number,number][]=[[lo,hi]];
 for(const [a,b] of excluded)spans=spans.flatMap(([x,y]):[number,number][]=>b<=x||a>=y?[[x,y]]:[[x,Math.min(a,y)],[Math.max(b,x),y]]);
 const zones:ExteriorZone[]=[];
 for(const [x,y] of spans){
  const count=Math.min(5,Math.floor((y-x)/D.parallel.length));if(count<1)continue;
  const alongLength=count*D.parallel.length,alongCenter=(x+y)/2;
  zones.push({id:'curbside-'+zones.length,kind:'parking',x:axis==='x'?alongCenter:r[across],y:axis==='x'?r[across]:alongCenter,
   w:axis==='x'?alongLength:crossWidth,h:axis==='x'?crossWidth:alongLength,
   vehicleParking:{version:1,role:'public',mode:'parallel',axis,rowCenter:r[across],rowDepth:crossWidth,aisleCenter:r[across],aisleDepth:0,alongCenter,alongLength,count}});
 }
 if(!zones.length)return null;
 return {...site,exteriorZones:[...(site.exteriorZones??[]),...zones]};
}
export function clearStreetAccess(site:Site):boolean{
 const p=site.streetInfrastructure;if(!p)return true;
 const walk=p.frontage.approach,drive=p.accessConnection;
 if([walk,drive].some(r=>r&&site.cover.some(c=>overlap(r,c,1))))return false;
 for(const zone of site.exteriorZones??[]){
  const reserved=reservedParkingBay(site,zone),lot=zone.vehicleParking;
  if(!reserved||reserved.transferCenter===undefined||!lot||lot.version!==1)continue;
  const lane=arrivalAccessLane(site,zone);if(!lane)return false;
  const axis=lot.axis,at=axis==='x'?lane.x:lane.y,transfer=reserved.transferCenter;
  const end=transfer+Math.sign(at-transfer)*(reserved.transferWidth??D.parking.width)/2;
  const span=Math.abs(end-at)+D.pedestrianClear/2;
  const cross=lot.rowCenter,center=(end+at)/2;
  const connection:StreetRect=axis==='x'?{x:center,y:cross,width:span,depth:D.pedestrianClear}:{x:cross,y:center,width:D.pedestrianClear,depth:span};
  const transferRect:StreetRect=axis==='x'?{x:transfer,y:cross,width:reserved.transferWidth??D.parking.width,depth:lot.rowDepth}:{x:cross,y:transfer,width:lot.rowDepth,depth:reserved.transferWidth??D.parking.width};
  if(site.cover.some(c=>overlap(transferRect,c)||overlap(connection,c)))return false;
 }
 return true;
}
