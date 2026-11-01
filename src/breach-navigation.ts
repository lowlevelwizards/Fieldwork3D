/** Deterministic actor body clearance and swept collision.
 * An OPENING door is a pushable obstacle, not a rigid wall. A closed leaf
 * still blocks entry, but an actor already inside its capsule may escape.
 * Static walls and cover remain unconditionally solid. */
import {passable,pointToSegment,doorLeafSegment,WALLS,segmentsCross,
  OPERATOR_RADIUS,type Door,type Pt} from './breach-core.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const leafGap=(p:Pt,d:Door)=>pointToSegment(p,doorLeafSegment(d));
/** Open leaves are still solid. The door motor can swing them out of the
 * way, but a body cannot ghost through a panel at an intermediate angle. */
export function bodyClear(p:Pt,doors:Door[],radius=OPERATOR_RADIUS){
  if(!passable(p,radius))return false;
  return !doors.some(door=>leafGap(p,door)<radius+1);
}
export function sweptBodyClear(from:Pt,to:Pt,doors:Door[],
  radius=OPERATOR_RADIUS){
  const steps=Math.max(1,Math.ceil(distance(from,to)/4));
  const trapped=doors.filter(door=>leafGap(from,door)<radius+1);
  for(let i=1;i<=steps;i++){
    const f=i/steps;
    const at={x:from.x+(to.x-from.x)*f,
      y:from.y+(to.y-from.y)*f};
    if(!passable(at,radius))return false;
    for(const door of doors){
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
/** A foot cannot stay planted across a wall or swing through a door
 * just because its endpoint is on valid floor. */
export function footAnchorReachable(from:Pt,p:Pt,
  doors:readonly Door[]):boolean{
  if(!footAnchorClear(p,doors))return false;
  const link={a:from,b:p};
  return !WALLS.some(w=>segmentsCross(link,w))&&
    !doors.some(door=>segmentsCross(link,doorLeafSegment(door)));
}

/** Build 189: physically rotated shallow torso/shoulder capsule.
 * In narrow mode the operator's shoulders extend along the passage while
 * the torso presents its shorter depth across the passage. */
export type BodyProfile='normal'|'squeeze';
export const squeezeFacing=(travelYaw:number)=>travelYaw-Math.PI/2;
export function profileSamples(p:Pt,heading:number,
  profile:BodyProfile){
  if(profile==='normal')return [{position:{...p},radius:OPERATOR_RADIUS}];
  const sx=-Math.sin(heading)*3.6,sy=Math.cos(heading)*3.6;
  return [
    {position:{x:p.x-sx,y:p.y-sy},radius:5.4},
    {position:{...p},radius:5.4},
    {position:{x:p.x+sx,y:p.y+sy},radius:5.4}
  ];
}
export function profileClear(p:Pt,doors:Door[],heading:number,
  profile:BodyProfile='normal'){
  return profileSamples(p,heading,profile).every(sample=>
    bodyClear(sample.position,doors,sample.radius));
}
export function sweptProfileClear(from:Pt,to:Pt,doors:Door[],
  heading:number,profile:BodyProfile='normal'){
  if(profile==='normal')return sweptBodyClear(from,to,doors);
  const steps=Math.max(1,Math.ceil(distance(from,to)/2.5));
  for(let i=1;i<=steps;i++){
    const t=i/steps,at={x:from.x+(to.x-from.x)*t,
      y:from.y+(to.y-from.y)*t};
    if(!profileClear(at,doors,heading,'squeeze'))return false;
  }
  return true;
}
