/** MAP 16: functional property ground finishing.
 * Visual-only marks attached to existing exterior zones, never new collision.
 */
import {type Site,type ExteriorZone} from '../breach-site.ts';
export type SurfaceKind='path'|'driveway-stripe'|'parking-divider'|
 'garden-border'|'service-pad'|'patio-paver';
export type PropertySurface={
 id:string;zoneId:string;kind:SurfaceKind;
 x:number;y:number;width:number;depth:number;
};
export function planPropertySurfaces(site:Site):PropertySurface[]{
 const marks:PropertySurface[]=[];
 const add=(zone:ExteriorZone,kind:SurfaceKind,x:number,y:number,
   width:number,depth:number)=>{
  if(width<=0||depth<=0)return;
  if(x-width/2<zone.x-zone.w/2-1||x+width/2>zone.x+zone.w/2+1||
     y-depth/2<zone.y-zone.h/2-1||y+depth/2>zone.y+zone.h/2+1)return;
  marks.push({id:zone.id+':'+kind+':'+marks.length,zoneId:zone.id,
    kind,x,y,width,depth});
 };
 for(const zone of site.exteriorZones??[]){
   if(zone.w<16||zone.h<16)continue;
   const broad=zone.w>=zone.h;
   if(zone.kind==='yard'){
     if(broad)add(zone,'path',zone.x,zone.y,Math.min(28,zone.w*.3),
       zone.h*.87);
     else add(zone,'path',zone.x,zone.y,zone.w*.87,
       Math.min(28,zone.h*.3));
   }
   if(zone.kind==='driveway'){
     if(broad)add(zone,'driveway-stripe',zone.x,zone.y,
       Math.max(15,zone.w-20),Math.min(zone.h*.10,5));
     else add(zone,'driveway-stripe',zone.x,zone.y,
       Math.min(zone.w*.10,5),Math.max(15,zone.h-20));
   }
   if(zone.kind==='parking'){
     const slots=Math.min(5,Math.max(2,Math.floor(
       (broad?zone.w:zone.h)/58)));
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
 return marks;
}
