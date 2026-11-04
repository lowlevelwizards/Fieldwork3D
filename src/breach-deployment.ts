/** R2: optional external staging that is genuinely reachable in physical
 * world geometry. This NEVER routes through hidden interior rooms.
 * Call with the matching Site activated in breach-core.
 */
import {type Pt,passable,route} from './breach-core.ts';
import type {Site} from './breach-site.ts';
import {insideSiteFootprint,exteriorBriefedAt,accessibleExteriorWall}
 from './breach-site-footprint.ts';
import {initializeWindows} from './breach-windows.ts';
import {windowClimbAvailability,probeWindowCrossing} from './breach-mantle.ts';
export type DeploymentChoice={
 id:string;kind:'primary'|'secondary'|'shutter'|'window';
 status:'door'|'open-first'|'break-first';approach:Pt;spots:[Pt,Pt,Pt,Pt];
};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function verify(site:Site,id:string,kind:DeploymentChoice['kind'],
 status:DeploymentChoice['status'],segment:{a:Pt;b:Pt}):
 DeploymentChoice|null{
 if(!accessibleExteriorWall(site,segment)||!site.spawn[0])return null;
 const len=distance(segment.a,segment.b);if(len<1)return null;
 const tangent={x:(segment.b.x-segment.a.x)/len,
  y:(segment.b.y-segment.a.y)/len};
 const mid={x:(segment.a.x+segment.b.x)/2,y:(segment.a.y+segment.b.y)/2};
 const outside=(p:Pt)=>passable(p,8)&&exteriorBriefedAt(site,p);
 if(!outside(site.spawn[0]))return null;
 for(const sign of [1,-1]){
  const normal={x:-tangent.y*sign,y:tangent.x*sign};
  const point=(depth:number,lateral=0):Pt=>({
   x:mid.x+normal.x*depth+tangent.x*lateral,
   y:mid.y+normal.y*depth+tangent.y*lateral});
  const approach=point(37),inside=point(-27);
  if(insideSiteFootprint(site,approach)||
    !insideSiteFootprint(site,inside)||!passable(inside,5.5)||
    !outside(approach)||!route(site.spawn[0],approach,outside).length)
   continue;
  const spots=[point(41,-16),point(41,16),
   point(63,-16),point(63,16)] as [Pt,Pt,Pt,Pt];
  const clear=(from:Pt,to:Pt)=>{
   const count=Math.max(1,Math.ceil(distance(from,to)/3));
   for(let i=0;i<=count;i++){
    const t=i/count;
    if(!outside({x:from.x+(to.x-from.x)*t,
      y:from.y+(to.y-from.y)*t}))return false;
   }
   return true;
  };
  if(!spots.every(p=>clear(approach,p)))continue;
  return {id,kind,status,approach,spots};
 }
 return null;
}
export function verifiedDeploymentChoices(site:Site):DeploymentChoice[]{
 const result:DeploymentChoice[]=[],consumed=new Set<string>();
 for(const door of site.doors){
  if(consumed.has(door.id))continue;
  consumed.add(door.id);
  if(door.pairedWith)consumed.add(door.pairedWith);
  const kind=door.id==='FRONT'?'primary':
   door.kind==='shutter'?'shutter':'secondary';
  const entry=verify(site,door.id,kind,'door',door);
  if(entry)result.push(entry);
 }
 for(const w of initializeWindows(site.windows??[])){
  if(w.interior)continue;
  const status=windowClimbAvailability(w);
  if(status!=='open-first'&&status!=='break-first')continue;
  const h=w.width/2;
  const segment=w.vertical?
   {a:{x:w.x,y:w.y-h},b:{x:w.x,y:w.y+h}}:
   {a:{x:w.x-h,y:w.y},b:{x:w.x+h,y:w.y}};
  const entry=verify(site,w.id,'window',status,segment);
  if(!entry)continue;
  // A reachable exterior staging mat is NOT sufficient: this particular
  // sill also has to satisfy the authoritative motor's climb contract.
  const inside={x:w.x+(w.x-entry.approach.x)*27/37,
    y:w.y+(w.y-entry.approach.y)*27/37};
  const crossing=probeWindowCrossing(entry.approach,inside,{
    cover:site.cover,walls:site.walls,doors:site.doors,
    windows:[{...w,open:true}],canStand:p=>passable(p,8)});
  if(crossing)result.push(entry);
 }
 return result;
}
