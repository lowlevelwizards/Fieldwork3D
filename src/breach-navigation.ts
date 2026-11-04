/** Deterministic actor body clearance and swept collision.
 * An OPENING door is a pushable obstacle, not a rigid wall. A closed leaf
 * still blocks entry, but an actor already inside its capsule may escape.
 * Static walls and cover remain unconditionally solid. */
import {passable,pointToSegment,doorLeafSegment,WALLS,COVER,segmentsCross,
  OPERATOR_RADIUS,type Door,type Pt} from './breach-core.ts';
import {isFootstepObstacle} from './breach-traversal-surfaces.ts';
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
      const initial=leafGap(from,door);
      if(!trapped.includes(door)||gap+1e-5<initial)return false;
      // An embedded body must actually move OUT of the leaf, not travel
      // parallel through its interior at the same penetration depth.
      if(i===steps&&gap<radius+1&&
         gap<initial+Math.min(.04,distance(from,to)*.04))return false;
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
export const SQUEEZE_RADIUS=3.8;
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
           (before>=sample.radius+1||gap+1e-5<before||
            i===steps&&gap<before+Math.min(.04,distance(from,to)*.04)))
          return false;
      }
    }
  }
  return true;
}


/** Safe micro-steering at a furniture corner. A straight diagonal into a
 * rectangular table can fail even while one tangent is open. Try a small
 * real swept step along that tangent before declaring a stuck waypoint.
 * No route nodes are edited and no collision radius is relaxed.
 */
export function slideAroundStaticCorner(from:Pt,intended:Pt,toward:Pt,
  doors:Door[]):Pt|null{
 const speed=distance(from,intended);
 if(speed<.05)return null;
 const aim=Math.atan2(intended.y-from.y,intended.x-from.x);
 const goalBefore=distance(from,toward);
 let best:Pt|null=null,bestScore=-Infinity;
 for(const turn of [-Math.PI/4,Math.PI/4,-Math.PI/2,Math.PI/2,
                    -Math.PI*3/4,Math.PI*3/4]){
   const theta=aim+turn;
   const candidate={x:from.x+Math.cos(theta)*speed,
     y:from.y+Math.sin(theta)*speed};
   const gain=goalBefore-distance(candidate,toward);
   // Never choose an arbitrary away-then-back oscillation. The ordinary
   // world-truth replan still handles paths requiring a larger detour.
   if(gain<=.07||!sweptBodyClear(from,candidate,doors))continue;
   const score=gain-Math.abs(turn)*.015;
   if(score>bestScore){best=candidate;bestScore=score;}
 }
 return best;
}

/** Retain the *tangential* part of an attempted step when the shoulder
 * grazes an ordinary wall. Without this, a route almost parallel to a wall
 * may reject every step (and get stuck in the recovery loop). All candidates
 * are swept with the unchanged full-size collision radius.
 *
 * Wall direction is irrelevant to actor facing: walking back along the wall
 * does not require first rotating the shoulders INTO the wall.
 */
export function glideAlongStaticWall(from:Pt,intended:Pt,
  doors:Door[]):Pt|null{
 const dx=intended.x-from.x,dy=intended.y-from.y;
 const step=Math.hypot(dx,dy);
 if(step<.04)return null;
 let best:Pt|null=null,bestMovement=-Infinity;
 for(const wall of WALLS){
   const vx=wall.b.x-wall.a.x,vy=wall.b.y-wall.a.y;
   const len=Math.hypot(vx,vy);
   if(len<.001)continue;
   const tx=vx/len,ty=vy/len;
   const near=pointToSegment(from,wall);
   if(near>OPERATOR_RADIUS+6||
      pointToSegment(intended,wall)>OPERATOR_RADIUS+6)continue;
   // Only attempt a gliding correction if this wall is actually in
   // contact with the attempted motion; distant parallel walls do nothing.
   const normalX=-ty,normalY=tx;
   const signed=(from.x-wall.a.x)*normalX+
     (from.y-wall.a.y)*normalY;
   const sign=signed>=0?1:-1;
   const outwardX=normalX*sign,outwardY=normalY*sign;
   const tangent=dx*tx+dy*ty;
   const outward=dx*outwardX+dy*outwardY;
   if(outward>0&&near>=OPERATOR_RADIUS+1)continue;
   const correction=Math.min(step,
     Math.max(0,OPERATOR_RADIUS+1.2-near));
   const allowedTangent=Math.sqrt(Math.max(0,step*step-
     correction*correction));
   const glide=Math.max(-allowedTangent,
     Math.min(allowedTangent,tangent));
   // Never creep sideways without an intended tangential component. A
   // nearly embedded shoulder may still take a small outward recovery step.
   // A near-perpendicular move into a doorjamb must NOT be counted as
   // successful wall gliding just because a tiny outward adjustment exists.
   // That produces a seconds-long apparent walk with almost no progress and
   // prevents the motor from invoking its real route repair. True wall-parallel
   // travel (including reverse) has a substantial tangential component.
   // Genuine embedded-wall escapes are handled by releaseStaticWallOverlap.
   if(Math.abs(glide)<Math.max(.035,step*.32))continue;
   const candidate={
     x:from.x+tx*glide+outwardX*correction,
     y:from.y+ty*glide+outwardY*correction
   };
   if(!sweptBodyClear(from,candidate,doors))continue;
   // The chosen tangent must still make meaningful progress in the
   // direction of the CURRENT navigation step. At a corner, a long but
   // nearly perpendicular slide can otherwise appear as successful
   // movement forever and suppress route recovery.
   const progress=((candidate.x-from.x)*dx+
     (candidate.y-from.y)*dy)/step;
   if(progress<Math.max(.04,step*.18))continue;
   const score=progress+Math.abs(glide)*.15-correction*.08;
   if(score>bestMovement){bestMovement=score;best=candidate;}
 }
 return best;
}

/** A generated corner, small numerical drift or a previous body resolution
 * can leave an operator a fraction INSIDE static wall clearance. Ordinary
 * swept checks then reject even an outward step forever. Search one tiny
 * physical release along wall normals (with swept samples), never deeper
 * through the wall, a door leaf, or a solid prop.
 */
export function releaseStaticWallOverlap(from:Pt,goal:Pt,
 doors:Door[],maxStep=1.3):Pt|null{
 const r=OPERATOR_RADIUS+1;
 const overlaps=WALLS.filter(w=>pointToSegment(from,w)<r-.01);
 if(!overlaps.length)return null;
 const step=Math.max(.15,Math.min(1.4,maxStep));
 const aim=Math.atan2(goal.y-from.y,goal.x-from.x);
 const headings=[aim,...overlaps.flatMap(w=>{
   const dx=w.b.x-w.a.x,dy=w.b.y-w.a.y;
   return [Math.atan2(dx,-dy),Math.atan2(-dx,dy)];
 }),...Array.from({length:12},(_,i)=>i*Math.PI/6)];
 let best:Pt|null=null,bestScore=-Infinity;
 for(const heading of headings){
   const candidate={x:from.x+Math.cos(heading)*step,
     y:from.y+Math.sin(heading)*step};
   let valid=true;
   for(let i=1;i<=4;i++){
     const t=i/4,at={x:from.x+(candidate.x-from.x)*t,
       y:from.y+(candidate.y-from.y)*t};
     // Near-zero-radius check maintains bounds and furniture identity.
     if(!passable(at,0)){valid=false;break;}
     // Check furniture at the same full operator radius.
     // A temporarily overlapping wall must never grant cover ghosting.
     const wallBlocked=WALLS.some(w=>
       !overlaps.includes(w)&&pointToSegment(at,w)<r-.001);
     const coverBlocked=COVER.some(o=>isFootstepObstacle(o)&&
       Math.abs(at.x-o.x)<o.w/2+OPERATOR_RADIUS&&
       Math.abs(at.y-o.y)<o.h/2+OPERATOR_RADIUS);
     if(wallBlocked||coverBlocked){valid=false;break;}
     for(const wall of overlaps){
       const before=pointToSegment(from,wall);
       if(pointToSegment(at,wall)<before+.02*t){valid=false;break;}
     }
     if(!valid)break;
     if(doors.some(door=>leafGap(at,door)<r)){valid=false;break;}
   }
   if(!valid)continue;
   const gains=overlaps.map(w=>
     pointToSegment(candidate,w)-pointToSegment(from,w));
   if(gains.some(g=>g<.08))continue;
   const toward=(candidate.x-from.x)*(goal.x-from.x)+
     (candidate.y-from.y)*(goal.y-from.y);
   const score=Math.min(...gains)*10+
     toward/(Math.max(1,distance(from,goal))*step);
   if(score>bestScore){bestScore=score;best=candidate;}
 }
 return best;
}
