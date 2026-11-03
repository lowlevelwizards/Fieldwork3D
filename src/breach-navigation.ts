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

/** Slowly free a body if a previously moving leaf left it intersecting
 * the panel. Search only short, physically swept movements *away* from the
 * overlap. No teleportation, new wall penetration, or opposing-actor push.
 * Normal navigation remains responsible for continuing the original order.
 */
export function escapeOpenDoorOverlap(from:Pt,goal:Pt,doors:Door[],
  maxStep=1.5):Pt|null{
  const trapped=doors.filter(door=>door.open&&
    door.kind!=='sliding'&&door.kind!=='shutter'&&
    leafGap(from,door)<OPERATOR_RADIUS+1-.01);
  if(!trapped.length)return null;
  const goalDirection=Math.atan2(goal.y-from.y,goal.x-from.x);
  // Prefer moving toward the authored goal if it can also CLEAR the panel.
  // Fall back to either normal, an edgeward slide, or a backward step when
  // the direct move would deepen the overlap.
  const angles=[goalDirection,...Array.from({length:16},(_,i)=>i*Math.PI/8)];
  let best:Pt|null=null,bestScore=-Infinity;
  const step=Math.max(.1,Math.min(1.5,maxStep));
  for(const heading of angles){
    const candidate={x:from.x+Math.cos(heading)*step,
      y:from.y+Math.sin(heading)*step};
    if(!sweptBodyClear(from,candidate,doors))continue;
    const gains=trapped.map(door=>leafGap(candidate,door)-leafGap(from,door));
    if(gains.some(gain=>gain<-.001))continue;
    const gain=Math.min(...gains);
    if(gain<.04)continue;
    const towardGoal=(goal.x-from.x)*(candidate.x-from.x)+
      (goal.y-from.y)*(candidate.y-from.y);
    const score=gain*10+
      towardGoal/(Math.max(1,distance(from,goal))*step)*.85;
    if(score>bestScore){bestScore=score;best=candidate;}
  }
  return best;
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
// A deliberate sideways profile remains a real three-point body sweep,
// with just enough give for the clearance of a jacket/soft gear.
export const SQUEEZE_RADIUS=4.8;
export const squeezeFacing=(travelYaw:number)=>travelYaw-Math.PI/2;
export function profileSamples(p:Pt,heading:number,
  profile:BodyProfile){
  if(profile==='normal')return [{position:{...p},radius:OPERATOR_RADIUS}];
  const sx=-Math.sin(heading)*3.25,sy=Math.cos(heading)*3.25;
  return [
    {position:{x:p.x-sx,y:p.y-sy},radius:SQUEEZE_RADIUS},
    {position:{...p},radius:SQUEEZE_RADIUS},
    {position:{x:p.x+sx,y:p.y+sy},radius:SQUEEZE_RADIUS}
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
    // When a swinging leaf has already brushed the operator, permit
    // a narrow body to ESCAPE that overlap. Never deepen it, and never
    // relax static wall/furniture clearance.
    const start=profileSamples(from,heading,'squeeze');
    const current=profileSamples(at,heading,'squeeze');
    for(let j=0;j<current.length;j++){
      const sample=current[j],startSample=start[j];
      if(!passable(sample.position,sample.radius))return false;
      for(const door of doors){
        const gap=leafGap(sample.position,door),before=leafGap(startSample.position,door);
        if(gap<sample.radius+1&&
           (before>=sample.radius+1||gap+1e-5<before))return false;
      }
    }
  }
  return true;
}
