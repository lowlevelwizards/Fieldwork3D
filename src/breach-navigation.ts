/** Deterministic actor body clearance and swept collision.
 * An OPENING door is a pushable obstacle, not a rigid wall. A closed leaf
 * still blocks entry, but an actor already inside its capsule may escape.
 * Static walls and cover remain unconditionally solid. */
import {passable,pointToSegment,doorLeafSegment,
  OPERATOR_RADIUS,type Door,type Pt} from './breach-core.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const leafGap=(p:Pt,d:Door)=>pointToSegment(p,doorLeafSegment(d));
/** Open leaves are handled by the door contact motor. Collision on an open
 * leaf may never make an existing overlap permanently inescapable. */
export function bodyClear(p:Pt,doors:Door[],radius=OPERATOR_RADIUS){
  if(!passable(p,radius))return false;
  return !doors.some(door=>!door.open&&leafGap(p,door)<radius+1);
}
export function sweptBodyClear(from:Pt,to:Pt,doors:Door[],
  radius=OPERATOR_RADIUS){
  const steps=Math.max(1,Math.ceil(distance(from,to)/4));
  const trapped=doors.filter(door=>!door.open&&
    leafGap(from,door)<radius+1);
  for(let i=1;i<=steps;i++){
    const f=i/steps;
    const at={x:from.x+(to.x-from.x)*f,
      y:from.y+(to.y-from.y)*f};
    if(!passable(at,radius))return false;
    for(const door of doors){
      if(door.open)continue;
      const gap=leafGap(at,door);
      if(gap>=radius+1)continue;
      // A leaf can close into an actor. Permit movement away from it;
      // never allow a new intrusion or movement deeper into overlap.
      if(!trapped.includes(door)||
        gap+1e-5<leafGap(from,door))return false;
    }
  }
  return true;
}

/** Foot contacts have independent geometry from actor capsule traffic.
 * Even a pushable open door cannot accept a planted foot inside its leaf.
 * This is presentation only; it never changes the authoritative route. */
export function footAnchorClear(p:Pt,doors:readonly Door[]):boolean{
  return passable(p,2.25)&&!doors.some(door=>
    pointToSegment(p,doorLeafSegment(door))<3.3);
}
