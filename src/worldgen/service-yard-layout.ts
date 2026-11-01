/** Real service/storage pads group large fixtures near their edges.
 * Preserve a central circulation rectangle instead of random central piles.
 * Placement callers still enforce door, actor, clearance and overlap rules.
 */
import type {ExteriorZone} from '../breach-site.ts';
import type {Pt} from '../breach-core.ts';
export const SERVICE_EDGE_FIXTURES=new Set([
 'utility-cabinet','dumpster','shipping-container','crate','pallet','rack',
 'recycling-bin','supply-cart','storage-tote','trash-bag','step-ladder'
]);
export function serviceYardEdgeCandidates(
 zone:ExteriorZone,w:number,h:number):Pt[]{
 if(zone.kind!=='service')return [];
 const broad=zone.w>=zone.h;
 const inset=11;
 const result:Pt[]=[];
 const push=(x:number,y:number)=>{
  if(x-w/2>=zone.x-zone.w/2+inset&&x+w/2<=zone.x+zone.w/2-inset&&
   y-h/2>=zone.y-zone.h/2+inset&&y+h/2<=zone.y+zone.h/2-inset)
   result.push({x,y});
 };
 if(broad){
  const near=zone.y-zone.h/2+h/2+inset;
  const far=zone.y+zone.h/2-h/2-inset;
  for(const side of [near,far])for(const frac of [-.28,.28,0])
   push(zone.x+zone.w*frac,side);
 }else{
  const near=zone.x-zone.w/2+w/2+inset;
  const far=zone.x+zone.w/2-w/2-inset;
  for(const side of [near,far])for(const frac of [-.28,.28,0])
   push(side,zone.y+zone.h*frac);
 }
 return result;
}
