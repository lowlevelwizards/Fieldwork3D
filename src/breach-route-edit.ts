import {route,type Pt} from './breach-core.ts';
import {type PlanNode} from './breach-plan.ts';

/** Pixel-space hit for the actual routed movement polyline, not the
 * straight line between two authored waypoints. The returned order index
 * is the insertion position BEFORE the node reached by that segment.
 */
export type RouteLineHit={index:number;point:Pt;distancePx:number};
export function routeLineHit(origin:Pt,plan:PlanNode[],screen:Pt,
  project:(p:Pt)=>Pt,thresholdPx=14):RouteLineHit|null{
  let from={...origin},best:RouteLineHit|null=null;
  for(let index=0;index<plan.length;index++){
    const node=plan[index];
    if(node.kind==='move'||node.kind==='door'){
      const steps=route(from,node.p);
      let previous=from;
      for(const current of steps){
        const a=project(previous),b=project(current);
        const dx=b.x-a.x,dy=b.y-a.y,denom=dx*dx+dy*dy;
        if(denom<.001){previous=current;continue;}
        const t=Math.max(0,Math.min(1,
          ((screen.x-a.x)*dx+(screen.y-a.y)*dy)/denom));
        const pixel={x:a.x+t*dx,y:a.y+t*dy};
        const distancePx=Math.hypot(pixel.x-screen.x,pixel.y-screen.y);
        if(distancePx<=thresholdPx&&(!best||distancePx<best.distancePx)){
          best={index,point:{
            x:previous.x+t*(current.x-previous.x),
            y:previous.y+t*(current.y-previous.y),
          },distancePx};
        }
        previous=current;
      }
      from=node.p;
    }else if(node.kind==='pie'&&node.arc?.length){
      // Legacy pie arcs are movement paths, but are not editable by
      // inserting a normal waypoint into their generated geometry.
      from=node.arc[node.arc.length-1];
    }
  }
  return best;
}
