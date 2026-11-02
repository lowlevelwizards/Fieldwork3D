/** Bounded operator-footprint mobility audit for generated doorway traffic.
 * No A* calls, global site mutation or additional map generation passes. */
import type {Site} from '../breach-site.ts';
import {OPERATOR_RADIUS,pointToSegment,doorLeafSegment,type Pt,
  type Obstacle} from '../breach-core.ts';
export type MobilityIssue={doorId:string;kind:'blocked-approach'|'pinched-threshold'|'blocked-swing';side?:number};
export type MobilityAudit={checkedDoors:number;issues:MobilityIssue[];
 blockedApproaches:number;pinchedThresholds:number;blockedSwings:number};
type AuditSite=Pick<Site,'doors'|'cover'> & Partial<Pick<Site,'walls'|'bounds'>>;
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const boxGap=(p:Pt,o:Obstacle)=>Math.hypot(
 Math.max(0,Math.abs(p.x-o.x)-o.w/2),
 Math.max(0,Math.abs(p.y-o.y)-o.h/2));
function free(site:AuditSite,p:Pt,r=OPERATOR_RADIUS){
 const b=site.bounds;
 return (!b||(p.x>=b.minX+13&&p.y>=b.minY+20&&
   p.x<=b.maxX-13&&p.y<=b.maxY-13))&&
   !(site.walls??[]).some(w=>pointToSegment(p,w)<r+1)&&
   !site.cover.some(o=>boxGap(p,o)<r+.1);
}
export function auditTacticalMobility(site:AuditSite,maxDoors=32):MobilityAudit{
 const issues:MobilityIssue[]=[];
 const doors=site.doors.slice(0,Math.max(0,maxDoors));
 for(const door of doors){
  const width=distance(door.a,door.b)||1;
  const center={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
  const tx=(door.b.x-door.a.x)/width,ty=(door.b.y-door.a.y)/width;
  if(door.kind!=='shutter'&&width<OPERATOR_RADIUS*2+4)
   issues.push({doorId:door.id,kind:'pinched-threshold'});
  for(const side of [-1,1]){
   let found=false;
   for(const depth of [19,24,30,38]){
    if(found)break;
    for(const offset of [0,-9,9,-16,16]){
     const p={x:center.x-ty*side*depth+tx*offset,
       y:center.y+tx*side*depth+ty*offset};
     if(free(site,p)){found=true;break;}
    }
   }
   if(!found)issues.push({doorId:door.id,kind:'blocked-approach',side});
  }
  if(door.kind==='hinged'||door.kind===undefined){
   const leaf=doorLeafSegment({...door,openFraction:.73});
   const blocked=[.43,.60,.78,.93].some(t=>{
    const p={x:leaf.a.x+(leaf.b.x-leaf.a.x)*t,
      y:leaf.a.y+(leaf.b.y-leaf.a.y)*t};
    return (site.walls??[]).some(w=>pointToSegment(p,w)<1.25)||
      site.cover.some(o=>boxGap(p,o)<1.25);
   });
   if(blocked)issues.push({doorId:door.id,kind:'blocked-swing'});
  }
 }
 return {checkedDoors:doors.length,issues,
   blockedApproaches:issues.filter(i=>i.kind==='blocked-approach').length,
   pinchedThresholds:issues.filter(i=>i.kind==='pinched-threshold').length,
   blockedSwings:issues.filter(i=>i.kind==='blocked-swing').length};
}
