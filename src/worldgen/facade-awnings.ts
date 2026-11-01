/** Cantilevered storefront overhangs follow actual facade glazing, never
 * fabricated openings. Their overhead silhouettes are not walkable floors.
 * No posts are placed in customer or emergency access routes.
 */
import type {Site,WindowOpening} from '../breach-site.ts';
const inside=(site:Site,x:number,y:number)=>site.rooms.some(r=>
 x>r.x+2&&x<r.x+r.w-2&&y>r.y+2&&y<r.y+r.h-2);
export type FacadeAwning={id:string;hostWindowId:string;x:number;y:number;
 w:number;h:number;metal:boolean};
export function planFacadeAwnings(site:Site):FacadeAwning[]{
 if(!['retail','restaurant','office','clinic'].includes(site.archetype??''))
  return [];
 const bounds=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 const out:FacadeAwning[]=[];
 for(const [i,window] of (site.windows??[]).entries()){
  if(window.interior||!['storefront','picture','tall'].includes(window.style??''))continue;
  if(window.style!=='storefront'&&(site.seed+i)%3===1)continue;
  const vertical=window.vertical;
  const a=vertical?{x:window.x-12,y:window.y}:{x:window.x,y:window.y-12};
  const b=vertical?{x:window.x+12,y:window.y}:{x:window.x,y:window.y+12};
  const inwardA=inside(site,a.x,a.y),inwardB=inside(site,b.x,b.y);
  if(inwardA===inwardB)continue;
  const sign=inwardA?1:-1,depth=20;
  const x=window.x+(vertical?sign*depth/2:0);
  const y=window.y+(vertical?0:sign*depth/2);
  const w=vertical?depth:window.width+9;
  const h=vertical?window.width+9:depth;
  if(x-w/2<=bounds.minX+6||x+w/2>=bounds.maxX-6||
     y-h/2<=bounds.minY+6||y+h/2>=bounds.maxY-6)continue;
  // A host window can support one independently named overhang.
  out.push({id:'AWNING-'+window.id,hostWindowId:window.id,
   x,y,w,h,metal:site.archetype==='office'||site.archetype==='clinic'});
 }
 return out;
}
