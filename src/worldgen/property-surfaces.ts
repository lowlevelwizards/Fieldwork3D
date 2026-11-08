/** MAP 16: functional property ground finishing.
 * Visual-only marks attached to existing exterior zones, never new collision.
 */
import {type Site,type ExteriorZone} from '../breach-site.ts';
import {arrivalAccessLane} from './property-access-lane.ts';
import {parkingStallCount,reservedParkingBay} from './parking-stalls.ts';
import {planRearServiceMarks} from './rear-service-program.ts';
import {planPublicStreet,type StreetRect} from './public-street-layout.ts';
export type SurfaceKind='path'|'driveway-stripe'|'parking-divider'|
 'garden-border'|'service-pad'|'patio-paver'|'drainage-grate'|
 'sidewalk'|'curb-edge'|'curb-ramp'|'crosswalk-stripe'|
 'reserved-parking'|'access-hatch'|'stall-end-line'|
 'loading-zone'|'maintenance-bay'|'waste-collection'|'clear-route';
export type PropertySurface={
 id:string;zoneId:string;kind:SurfaceKind;
 x:number;y:number;width:number;depth:number;
};
export function planPropertySurfaces(site:Site):PropertySurface[]{
 const marks:PropertySurface[]=[];
 const entry=site.entrySide??'south';
 const front=site.doors.find(d=>d.id==='FRONT');
 const frontCenter=front?{x:(front.a.x+front.b.x)/2,y:(front.a.y+front.b.y)/2}:undefined;
 const add=(zone:ExteriorZone,kind:SurfaceKind,x:number,y:number,
   width:number,depth:number)=>{
  if(width<=0||depth<=0)return;
  if(x-width/2<zone.x-zone.w/2-1||x+width/2>zone.x+zone.w/2+1||
     y-depth/2<zone.y-zone.h/2-1||y+depth/2>zone.y+zone.h/2+1)return;
  marks.push({id:zone.id+':'+kind+':'+marks.length,zoneId:zone.id,
    kind,x,y,width,depth});
 };
 // Public streets are authored by one site-edge layout instead of
 // independent sidewalk/curb estimates inside a forecourt rectangle.
 // These are presentation marks only: no new invisible obstruction.
 const street=planPublicStreet(site);
 const publicZone=site.exteriorZones?.find(z=>z.id==='arrival-forecourt');
 if(street&&publicZone){
   const addStreet=(kind:SurfaceKind,r:StreetRect)=>{
     marks.push({id:'street:'+kind+':'+marks.length,
       zoneId:publicZone.id,kind,x:r.x,y:r.y,
       width:r.width,depth:r.depth});
   };
   for(const strip of street.sidewalkPieces)addStreet('sidewalk',strip);
   if(street.approach)addStreet('path',street.approach);
   for(const curb of street.curb)addStreet('curb-edge',curb);
   if(street.curbRamp)addStreet('curb-ramp',street.curbRamp);
 }
 for(const zone of site.exteriorZones??[]){
   if(zone.w<16||zone.h<16)continue;
   const broad=zone.w>=zone.h;
   if(zone.kind==='yard'){
     const arrival=zone.id==='arrival-forecourt'&&frontCenter;
     if(arrival&&street)continue;
     const vertical=arrival?(entry==='south'||entry==='north'):broad;
     if(vertical){
       const x=arrival?Math.max(zone.x-zone.w/2+15,
         Math.min(zone.x+zone.w/2-15,frontCenter.x)):zone.x;
       add(zone,'path',x,zone.y,Math.min(24,zone.w*.26),zone.h*.92);
     }else{
       const y=arrival?Math.max(zone.y-zone.h/2+15,
         Math.min(zone.y+zone.h/2-15,frontCenter.y)):zone.y;
       add(zone,'path',zone.x,y,zone.w*.92,Math.min(24,zone.h*.26));
     }
   }
   if(zone.kind==='driveway'){
     const lane=arrivalAccessLane(site,zone);
     if(lane&&!street)add(zone,'path',lane.x,lane.y,
       Math.min(lane.w,24),Math.min(lane.h,zone.h*.9));
     if(broad)add(zone,'driveway-stripe',zone.x,zone.y,
       Math.max(15,zone.w-20),Math.min(zone.h*.10,5));
     else add(zone,'driveway-stripe',zone.x,zone.y,
       Math.min(zone.w*.10,5),Math.max(15,zone.h-20));
   }
   if(zone.kind==='driveway'||zone.kind==='service'){
     // Flush drains belong at the edge of paved traffic and maintenance
     // surfaces, not in grass, gardens or the middle of a walkway.
     if(broad)add(zone,'drainage-grate',zone.x,
       zone.y-zone.h*.37,zone.w*.62,3.5);
     else add(zone,'drainage-grate',
       zone.x-zone.w*.37,zone.y,3.5,zone.h*.62);
   }
   if(zone.kind==='parking'){
     if(zone.id==='arrival-forecourt'&&frontCenter&&!street){
       const vertical=entry==='south'||entry==='north';
       if(vertical){
         const x=Math.max(zone.x-zone.w/2+14,
           Math.min(zone.x+zone.w/2-14,frontCenter.x));
         add(zone,'path',x,zone.y,Math.min(19,zone.w*.14),zone.h*.88);
       }else{
         const y=Math.max(zone.y-zone.h/2+14,
           Math.min(zone.y+zone.h/2-14,frontCenter.y));
         add(zone,'path',zone.x,y,zone.w*.88,Math.min(19,zone.h*.14));
       }
     }
     const slots=parkingStallCount(zone);
     // The marker and its sign must reference the SAME selected bay.
     // Still illustrative, not a declaration of accessibility compliance.
     const reserved=reservedParkingBay(site,zone);
     if(reserved){
       const {x,y,bayWidth,short,broad,side}=reserved;
       if(broad){
         add(zone,'reserved-parking',x,y,bayWidth,short*.55);
         const aisleX=x+side*(bayWidth/2+5);
         for(let n=-1;n<=1;n++)
           add(zone,'access-hatch',aisleX+n*3.5,y,1.5,short*.48);
         add(zone,'stall-end-line',x,zone.y-short*.36,bayWidth*.87,1.7);
       }else{
         add(zone,'reserved-parking',x,y,short*.55,bayWidth);
         const aisleY=y+side*(bayWidth/2+5);
         for(let n=-1;n<=1;n++)
           add(zone,'access-hatch',x,aisleY+n*3.5,short*.48,1.5);
         add(zone,'stall-end-line',zone.x-short*.36,y,1.7,bayWidth*.87);
       }
     }
     for(let i=1;i<slots;i++){
       const along=(i/slots-.5)*(broad?zone.w:zone.h);
       if(broad)add(zone,'parking-divider',zone.x+along,zone.y,
         1.6,zone.h*.72);
       else add(zone,'parking-divider',zone.x,zone.y+along,
         zone.w*.72,1.6);
     }
   }
   if(zone.kind==='garden'){
     const edge=Math.min(zone.w*.15,14);
     if(broad)for(const n of [-1,1])
       add(zone,'garden-border',zone.x,zone.y+n*(zone.h/2-edge/2),
         zone.w*.88,edge);
     else for(const n of [-1,1])
       add(zone,'garden-border',zone.x+n*(zone.w/2-edge/2),zone.y,
         edge,zone.h*.88);
   }
   if(zone.kind==='service')add(zone,'service-pad',
     zone.x,zone.y,zone.w*.77,zone.h*.74);
   if(zone.kind==='patio'){
     const count=Math.min(5,Math.floor((broad?zone.w:zone.h)/25));
     for(let i=0;i<count;i++){
       const along=(i+.5)/count-.5;
       if(broad)add(zone,'patio-paver',zone.x+along*zone.w*.82,zone.y,
         zone.w*.70/count,zone.h*.68);
       else add(zone,'patio-paver',zone.x,zone.y+along*zone.h*.82,
         zone.w*.68,zone.h*.70/count);
     }
   }
 }
 for(const m of planRearServiceMarks(site.exteriorZones??[]))
  marks.push({id:m.id,zoneId:m.zoneId,kind:m.kind,
   x:m.x,y:m.y,width:m.width,depth:m.depth});
 return marks;
}
