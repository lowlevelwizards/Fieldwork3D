/** Shared swept-body navigation collision.
 * Static obstacles and rotated door leaves share one clearance policy.
 * Rendering-only door trims have no independent physical collider. */
import {passable,pointToSegment,doorLeafSegment,
  OPERATOR_RADIUS,type Door,type Pt} from './breach-core.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function bodyClear(p:Pt,doors:Door[],radius=OPERATOR_RADIUS){
  if(!passable(p,radius))return false;
  return !doors.some(door=>pointToSegment(p,doorLeafSegment(door))<radius+1);
}
export function sweptBodyClear(from:Pt,to:Pt,doors:Door[],
  radius=OPERATOR_RADIUS){
  const steps=Math.max(1,Math.ceil(distance(from,to)/4));
  for(let i=1;i<=steps;i++){
    const f=i/steps;
    if(!bodyClear({x:from.x+(to.x-from.x)*f,
      y:from.y+(to.y-from.y)*f},doors,radius))return false;
  }
  return true;
}
