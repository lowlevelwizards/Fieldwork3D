/** Read-only final-site inspection; role representation is inferred
 * from accepted fixtures, not a claim that all requested roles fit. */
import type {Site} from '../breach-site.ts';
import {exteriorRoleRequests} from './exterior-role-program.ts';
export function describeExteriorFurnishing(site:Site){
 const zones=site.exteriorZones??[];
 const outdoor=site.cover.filter(o=>!site.rooms.some(r=>o.x>=r.x&&o.x<=r.x+r.w&&o.y>=r.y&&o.y<=r.y+r.h));
 const owners=new Map(zones.map(z=>[z.id,[] as typeof outdoor]));
 let unassigned=0;
 for(const o of outdoor){
  const zone=zones.filter(z=>Math.abs(o.x-z.x)<=z.w/2&&Math.abs(o.y-z.y)<=z.h/2)
   .sort((a,b)=>a.w*a.h-b.w*b.h||a.id.localeCompare(b.id))[0];
  if(zone)owners.get(zone.id)!.push(o);else unassigned++;
 }
 return {count:outdoor.length,unassigned,zones:zones.map(z=>{
  const fixtures=owners.get(z.id)!;
  const requested=exteriorRoleRequests(site.archetype??'house',z,site.seed);
  const represented=requested.filter(role=>fixtures.some(o=>role.alternatives.includes(o.fixture??'')));
  return {id:z.id,kind:z.kind,count:fixtures.length,areaM2:Math.round(z.w*z.h/400),
   roles:represented.map(r=>r.role),unrepresented:requested.filter(r=>!represented.includes(r)).map(r=>r.role)};
 })};
}
