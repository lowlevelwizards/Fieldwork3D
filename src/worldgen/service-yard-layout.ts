/** Real service/storage pads group large fixtures near their edges.
 * Preserve a central circulation rectangle instead of random central piles.
 * Placement callers still enforce door, actor, clearance and overlap rules.
 */
import type {ExteriorZone} from '../breach-site.ts';
import type {Pt} from '../breach-core.ts';
import {planRearServiceMarks} from './rear-service-program.ts';
export const SERVICE_EDGE_FIXTURES=new Set([
 'utility-cabinet','dumpster','shipping-container','crate','pallet','rack',
 'recycling-bin','supply-cart','storage-tote','trash-bag','step-ladder'
]);
export function serviceYardEdgeCandidates(
 zone:ExteriorZone,w:number,h:number,fixture?:string):Pt[]{
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
 // Work zones give an otherwise anonymous perimeter location a reason:
 // cabinets to maintenance access, refuse to the collection pad, freight
 // to loading space. The central service lane remains free of new random
 // object centers. With no specific fixture the legacy candidate list is
 // unchanged, preserving map generators/tests that inspect possible spots.
 if(fixture){
   const work=planRearServiceMarks([zone]);
   const use=fixture==='utility-cabinet'?'maintenance-bay':
     ['dumpster','recycling-bin','trash-bin','trash-bag'].includes(fixture)?
       'waste-collection':'loading-zone';
   const target=work.find(m=>m.kind===use)??work.find(m=>
     m.kind===('maintenance-bay' as const))??work.find(m=>m.kind==='loading-zone');
   if(target)result.sort((a,b)=>{
     const da=(a.x-target.x)**2+(a.y-target.y)**2;
     const db=(b.x-target.x)**2+(b.y-target.y)**2;
     return da-db||a.x-b.x||a.y-b.y;
   });
 }
 return result;
}
