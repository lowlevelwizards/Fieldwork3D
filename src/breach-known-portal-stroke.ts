/** Forgive a small finger offset at a *known, physical* passage.
 * This never changes collider geometry. The normal known-route solver must
 * already confirm a short route crossing the SAME portal.
 */
import {pointToSegment,segmentsCross,type Pt,type Segment}
  from './breach-core.ts';

const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const side=(p:Pt,seg:Segment)=>
  (seg.b.x-seg.a.x)*(p.y-seg.a.y)-
  (seg.b.y-seg.a.y)*(p.x-seg.a.x);
const midpoint=(s:Segment):Pt=>({x:(s.a.x+s.b.x)/2,y:(s.a.y+s.b.y)/2});

/** Do not forgive a long detour, unknown portal, or a literal sill crossing.
 * The caller supplies ONLY known real doors and walk-through arch/wide gaps.
 */
export function knownPortalStrokeRoute(from:Pt,to:Pt,blocked:Pt,
 portals:readonly Segment[],route:readonly Pt[]):boolean{
 if(!route.length||!portals.length)return false;
 const straight=distance(from,to);
 if(straight<12)return false;
 const points=[from,...route];
 let traveled=0;
 for(let i=1;i<points.length;i++)traveled+=distance(points[i-1],points[i]);
 if(traveled>straight+Math.min(48,Math.max(20,straight*.35)))return false;
 return portals.some(portal=>{
   if(side(from,portal)*side(to,portal)>=0)return false;
   if(pointToSegment(blocked,portal)>18)return false;
   const center=midpoint(portal);
   for(let i=1;i<points.length;i++){
     const leg={a:points[i-1],b:points[i]};
     if(segmentsCross(leg,portal)||pointToSegment(center,leg)<7)return true;
   }
   return false;
 });
}
