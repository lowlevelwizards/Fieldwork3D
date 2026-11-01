/** Inspect actual generated doors/passages against the same critical room
 * relationships used by the pre-wall spatial fitter. These are explanatory
 * warnings: constrained footprints may still be playable via indirect halls.
 */
import type {Site,Room} from '../breach-site.ts';
import {criticalContacts} from './spatial-program-fit.ts';

export type MissingWorkflowLink={a:string;b:string};
const sharesDoorWall=(a:Room,b:Room)=>{
 const xTouch=Math.abs(a.x+a.w-b.x)<.25||Math.abs(b.x+b.w-a.x)<.25;
 const yTouch=Math.abs(a.y+a.h-b.y)<.25||Math.abs(b.y+b.h-a.y)<.25;
 const yOverlap=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
 const xOverlap=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
 return xTouch&&yOverlap>=48||yTouch&&xOverlap>=48;
};
export function missingPhysicalWorkflowLinks(
 site:Pick<Site,'archetype'|'rooms'|'doors'|'openings'>):MissingWorkflowLink[]{
 if(!site.archetype)return [];
 const present=new Set(site.rooms.map(r=>r.purpose));
 const transitions=[...site.doors,...(site.openings??[])];
 const links=new Set<string>();
 const pair=(a:string,b:string)=>[a,b].sort().join('|');
 for(const passage of transitions){
  const p={x:(passage.a.x+passage.b.x)/2,
   y:(passage.a.y+passage.b.y)/2};
  const touching=site.rooms.filter(r=>
   p.x>=r.x-.25&&p.x<=r.x+r.w+.25&&
   p.y>=r.y-.25&&p.y<=r.y+r.h+.25);
  for(let i=0;i<touching.length;i++)for(let j=i+1;j<touching.length;j++){
   const a=touching[i],b=touching[j];
   if(a.purpose&&b.purpose&&sharesDoorWall(a,b))
    links.add(pair(a.purpose,b.purpose));
  }
 }
 return (criticalContacts[site.archetype]??[])
  .filter(([a,b])=>present.has(a)&&present.has(b)&&!links.has(pair(a,b)))
  .map(([a,b])=>({a,b}));
}
