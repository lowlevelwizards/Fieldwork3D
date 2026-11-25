/** V18.4 — bounded exterior finish details anchored to real occupancy.
 * Only surface data, no cover/collider, no per-frame computation. */
import type {Site,ExteriorZone} from '../breach-site.ts';
import type {PropertySurface} from './property-surfaces.ts';
import {planPublicStreet} from './public-street-layout.ts';
import {effectiveCondition} from './condition-visual.ts';
type Rect={x:number;y:number;width:number;depth:number};
const intersects=(a:Rect,b:Rect,pad=0)=>Math.abs(a.x-b.x)<(a.width+b.width)/2+pad&&Math.abs(a.y-b.y)<(a.depth+b.depth)/2+pad;
const zoneRect=(z:ExteriorZone):Rect=>({x:z.x,y:z.y,width:z.w,depth:z.h});
const seat=new Set(['picnic-table','patio-chair','public-bench','grill']);
const equipment=new Set(['tool-chest','compressor','tire-stack','cable-reel','utility-cabinet','pallet','crate','storage-tote']);
export const EXTERIOR_FINISH_LIMIT=24;
export function planExteriorFinishDetails(site:Site,existing:readonly PropertySurface[]):PropertySurface[]{
 const out:PropertySurface[]=[],zones=site.exteriorZones??[];
 const street=site.entrance||site.doors?.some(d=>d.id==='FRONT')?planPublicStreet(site):null;
 const rooms=(site.rooms??[]).map(r=>({x:r.x+r.w/2,y:r.y+r.h/2,width:r.w,depth:r.h}));
 const condition=effectiveCondition(site);
 for(const zone of zones){
  if(Math.min(zone.w,zone.h)<36)continue;
  const broad=zone.w>=zone.h;
  const add=(kind:PropertySurface['kind'],r:Rect,allowPad=false)=>{
   if(out.length>=EXTERIOR_FINISH_LIMIT||r.width<1||r.depth<1||
    Math.abs(r.x-zone.x)+r.width/2>zone.w/2-2||
    Math.abs(r.y-zone.y)+r.depth/2>zone.h/2-2)return false;
   if(rooms.some(b=>intersects(r,b,1))||zones.some(z=>z!==zone&&intersects(r,zoneRect(z),1)))return false;
   if(street&&[street.road,street.sidewalk,street.approach,street.curbRamp].some(b=>b&&intersects(r,b,1)))return false;
   if(existing.some(m=>intersects(r,m,1)&&!(allowPad&&m.zoneId===zone.id&&m.kind==='service-pad')))return false;
   if(out.some(m=>intersects(r,m,.5)))return false;
   out.push({id:'v18:'+zone.id+':'+kind+':'+out.length,zoneId:zone.id,kind,...r});return true;
  };
  // Actual occupied seating receives a paved apron in otherwise soft ground.
  // No invented patio without an accepted physical seat.
  const fixtures=(site.cover??[]).filter(o=>!o.destroyed&&Math.abs(o.x-zone.x)+o.w/2<=zone.w/2&&Math.abs(o.y-zone.y)+o.h/2<=zone.h/2&&!rooms.some(b=>intersects({x:o.x,y:o.y,width:o.w,depth:o.h},b)));
  if(zone.kind==='garden'||zone.kind==='yard'){
   for(const o of fixtures.filter(o=>seat.has(o.fixture??'')).slice(0,2))
    add('amenity-apron',{x:o.x,y:o.y,width:o.w+12,depth:o.h+12});
  }
  // Repaired/worn work surfaces, in useful broad shapes at gameplay zoom.
  // Wear derives from equipment and condition rather than global noise.
  if(zone.kind==='service'&&condition>=34){
   for(const o of fixtures.filter(o=>equipment.has(o.fixture??'')).slice(0,2)){
    const shift=broad?o.h/2+5:o.w/2+5;
    const side=broad?(o.y<zone.y?1:-1):(o.x<zone.x?1:-1);
    add('work-wear',{x:o.x+(broad?0:side*shift),y:o.y+(broad?side*shift:0),
     width:broad?Math.min(o.w,25):7,depth:broad?7:Math.min(o.h,25)},true);
   }
  }
  // Quiet transverse expansion joints on clear paved margins. Never
  // overpaint existing bay stripes, access routes or surface transitions.
  if(['patio','driveway','service'].includes(zone.kind)){
   const length=broad?zone.w:zone.h,depth=broad?zone.h:zone.w;
   const count=Math.min(4,Math.floor(length/42));
   for(let i=1;i<=count;i++){
    const along=(i/(count+1)-.5)*length;
    for(const side of [-1,1]){
     const across=side*depth*.39;
     add('pavement-joint',{x:zone.x+(broad?along:across),y:zone.y+(broad?across:along),
      width:broad?1.5:Math.min(12,depth*.16),depth:broad?Math.min(12,depth*.16):1.5});
    }
   }
  }
 }
 return out;
}
