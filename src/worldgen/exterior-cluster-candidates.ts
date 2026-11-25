/** V18.3: local relationships between accepted physical fixtures.
 * Only ranks/supplies candidates. The exterior placement validator owns
 * actual overlap, door, arrival, service and encounter clearances. */
import type {Obstacle,Pt} from '../breach-core.ts';
import type {ExteriorZone} from '../breach-site.ts';
export const EXTERIOR_CLUSTER_GAP=18;
export function exteriorClusterCandidates(
 zone:ExteriorZone,anchor:Obstacle,w:number,h:number
):Pt[]{
 const dx=(anchor.w+w)/2+EXTERIOR_CLUSTER_GAP;
 const dy=(anchor.h+h)/2+EXTERIOR_CLUSTER_GAP;
 const alongX=zone.w>=zone.h;
 const offsets=alongX?[[dx,0],[-dx,0],[0,dy],[0,-dy]]:
  [[0,dy],[0,-dy],[dx,0],[-dx,0]];
 return offsets.map(([x,y])=>({x:anchor.x+x,y:anchor.y+y}))
  .filter(p=>Math.abs(p.x-zone.x)+w/2<=zone.w/2-9&&
   Math.abs(p.y-zone.y)+h/2<=zone.h/2-9);
}
/** Existing service-edge positions are not replaced. Keep companions on
 * the same side of the reserved service route whenever possible. */
export function preferExteriorCluster(
 zone:ExteriorZone,points:readonly Pt[],anchor:Obstacle
):Pt[]{
 const along=(p:Pt)=>zone.w>=zone.h?p.x-zone.x:p.y-zone.y;
 const side=(p:Pt)=>Math.sign(along(p))===Math.sign(along(anchor))?0:1;
 const distance=(p:Pt)=>(p.x-anchor.x)**2+(p.y-anchor.y)**2;
 return points.map((p,index)=>({p,index})).sort((a,b)=>
  (zone.kind==='service'?side(a.p)-side(b.p):0)||
  distance(a.p)-distance(b.p)||a.index-b.index).map(e=>e.p);
}
