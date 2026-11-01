/** Rear service work zones have a clear central vehicle/worker lane.
 * Ground-only markings share the exterior zone coordinates, so they cannot
 * become colliders or create unscripted door obstructions.
 */
import type {ExteriorZone} from '../breach-site.ts';
export type RearServiceMark={id:string;zoneId:string;
 kind:'loading-zone'|'maintenance-bay'|'waste-collection'|'clear-route';
 x:number;y:number;width:number;depth:number};
export function planRearServiceMarks(zones:readonly ExteriorZone[]):RearServiceMark[]{
 const out:RearServiceMark[]=[];
 for(const zone of zones){
  if(zone.kind!=='service'||zone.w<48||zone.h<48)continue;
  const horizontal=zone.w>=zone.h,short=horizontal?zone.h:zone.w;
  const long=horizontal?zone.w:zone.h;
  const add=(kind:RearServiceMark['kind'],lx:number,ly:number,w:number,d:number)=>{
   const x=horizontal?zone.x+lx:zone.x+ly,
    y=horizontal?zone.y+ly:zone.y+lx;
   const width=horizontal?w:d,depth=horizontal?d:w;
   if(x-width/2<zone.x-zone.w/2+4||x+width/2>zone.x+zone.w/2-4||
     y-depth/2<zone.y-zone.h/2+4||y+depth/2>zone.y+zone.h/2-4)return;
   out.push({id:zone.id+':'+kind,zoneId:zone.id,kind,x,y,width,depth});
  };
  add('clear-route',0,0,long*.78,Math.min(18,short*.24));
  add('loading-zone',-long*.24,-short*.29,Math.min(53,long*.28),Math.min(22,short*.27));
  add('waste-collection',long*.25,short*.28,Math.min(46,long*.25),Math.min(22,short*.27));
  if(long>145)add('maintenance-bay',long*.08,-short*.31,Math.min(35,long*.20),Math.min(22,short*.26));
 }
 return out;
}
