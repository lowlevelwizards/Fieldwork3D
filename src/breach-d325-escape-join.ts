/** D3.25F: bounded cold connector after a REAL swept escape from an
 * occupied near-open generated-entry leaf. The prior-to-current direction
 * was physically executed already; continue just 3/5/8 units along it,
 * and require full-body clearance for the stage AND next route leg.
 * Never changes the authored goal, bypasses a hinge, or moves an actor.
 * The ordinary motor will execute every returned waypoint again.
 */
import type {Pt} from './breach-core.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);

export function coldSweptEntryEscapeJoin(
 prior:Pt,current:Pt,goal:Pt,
 canStand:(p:Pt)=>boolean,
 sweep:(from:Pt,to:Pt)=>boolean,
 routeTo:(from:Pt,to:Pt)=>Pt[]
):Pt[]{
 const lastStep=dist(prior,current);
 if(!Number.isFinite(lastStep)||lastStep<.1||lastStep>1.55||
    !canStand(current))return [];
 const unit={x:(current.x-prior.x)/lastStep,
   y:(current.y-prior.y)/lastStep};
 for(const length of [3,5,8]){
  const stage={x:current.x+unit.x*length,
   y:current.y+unit.y*length};
  if(!canStand(stage)||!sweep(current,stage))continue;
  const route=routeTo(stage,goal);
  if(!route.length||dist(route[route.length-1],goal)>3||
     !sweep(stage,route[0]))continue;
  return [{...stage},...route.map(p=>({...p}))];
 }
 return [];
}
