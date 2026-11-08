/** Thin painted U-shaped work-bay boundary marks, open toward the
 * service corridor. These are ground-only render annotations, NOT fences,
 * additional collision, invisible cover or alternate navigation.
 *
 * Deliberately derived from fixtures that ACTUALLY spawned, not from pads
 * which might be empty because a generator correctly rejected the prop.
 */
import type {Site,ExteriorZone} from '../breach-site.ts';
import {planRearServiceMarks} from './rear-service-program.ts';

export type ServiceBoundaryMark={
 kind:'waste-bay-line'|'utility-bay-line'|'loading-bay-line';
 zoneId:string;x:number;y:number;width:number;depth:number;
};
const waste=new Set(['screened-dumpster','dumpster','recycling-bin','trash-bin']);
const utility=new Set(['utility-cabinet']);
const loading=new Set(['shipping-container','supply-cart','pallet']);
const toKind=(fixture:string|undefined):ServiceBoundaryMark['kind']|null=>
 waste.has(fixture??'')?'waste-bay-line':
 utility.has(fixture??'')?'utility-bay-line':
 loading.has(fixture??'')?'loading-bay-line':null;

const inside=(z:ExteriorZone,m:ServiceBoundaryMark)=>
 m.x-m.width/2>=z.x-z.w/2+2&&m.x+m.width/2<=z.x+z.w/2-2&&
 m.y-m.depth/2>=z.y-z.h/2+2&&m.y+m.depth/2<=z.y+z.h/2-2;
const intersects=(a:ServiceBoundaryMark,b:{
 x:number;y:number;width:number;depth:number})=>
 Math.abs(a.x-b.x)<(a.width+b.width)/2+1&&
 Math.abs(a.y-b.y)<(a.depth+b.depth)/2+1;

/** Maximum 3 fixtures per service zone; no extra geometry when empty.
 * The three sides form a work-bay outline around the real fixture, with
 * the fourth side facing the authorized central worker route left OPEN.
 */
export function planServiceBoundaryMarks(site:Site):ServiceBoundaryMark[]{
 const marks:ServiceBoundaryMark[]=[];
 for(const zone of site.exteriorZones??[]){
  if(zone.kind!=='service')continue;
  const lane=planRearServiceMarks([zone]).find(m=>m.kind==='clear-route');
  const occupants=site.cover.filter(c=>
    toKind(c.fixture)!==null&&
    Math.abs(c.x-zone.x)<zone.w/2-2&&
    Math.abs(c.y-zone.y)<zone.h/2-2).slice(0,3);
  for(const cover of occupants){
   const kind=toKind(cover.fixture)!;
   const broad=zone.w>=zone.h;
   const side=broad?cover.y<=zone.y?-1:1:cover.x<=zone.x?-1:1;
   const extent=(broad?cover.h:cover.w)/2+4.5;
   const other=(broad?cover.w:cover.h)/2+4.5;
   const shortLength=Math.max(10,Math.min(24,(broad?cover.h:cover.w)*.82));
   const thickness=1.6;
   const mark=(x:number,y:number,width:number,depth:number):
    ServiceBoundaryMark=>({kind,zoneId:zone.id,x,y,width,depth});
   const back=broad?
     mark(cover.x,cover.y+side*extent,other*2,thickness):
     mark(cover.x+side*extent,cover.y,thickness,other*2);
   const wings=([-1,1] as const).map(offset=>broad?
     mark(cover.x+offset*other,cover.y+side*(extent-shortLength/2),
       thickness,shortLength):
     mark(cover.x+side*(extent-shortLength/2),cover.y+offset*other,
       shortLength,thickness));
   for(const candidate of [back,...wings]){
     if(inside(zone,candidate)&&(!lane||!intersects(candidate,lane)))
       marks.push(candidate);
   }
  }
 }
 return marks;
}
