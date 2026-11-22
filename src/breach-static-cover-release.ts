/** D3.33: monotonic, sub-stride release of a body briefly intersecting
 * solid static cover near an already-open generated-entry door.
 *
 * This is NOT a route, teleport, squeeze, or collision exemption. It is an
 * actual <=0.75-unit physical recovery proposal for the existing motor.
 * Never release deep inside cover, cross a wall, enter a second fixture,
 * increase existing penetration, cross a leaf, or overlap another actor.
 */
import {OPERATOR_RADIUS,pointToSegment,doorLeafSegment,
 type Pt,type Door,type Obstacle} from './breach-core.ts';
import type {SessionWorldGeometry} from './breach-world-context.ts';
import {isFootstepObstacle} from './breach-traversal-surfaces.ts';

const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const R=OPERATOR_RADIUS+1;
const depth=(p:Pt,o:Obstacle)=>Math.min(
 o.w*.5+OPERATOR_RADIUS-Math.abs(p.x-o.x),
 o.h*.5+OPERATOR_RADIUS-Math.abs(p.y-o.y)
);
export function proposeShallowCoverRelease(
 from:Pt,goal:Pt,doors:readonly Door[],world:SessionWorldGeometry,
 peerPoints:readonly Pt[]=[],maxStep=.75
):Pt|null{
 if(!Number.isFinite(from.x)||!Number.isFinite(from.y)||
    !Number.isFinite(goal.x)||!Number.isFinite(goal.y))return null;
 const overlaps:Obstacle[]=[];
 world.someCoverNearPoint(from,OPERATOR_RADIUS+2,o=>{
  const initial=depth(from,o);
  if(isFootstepObstacle(o)&&initial>.02)overlaps.push(o);
  return false;
 });
 // A body more than four units inside a prop is not a recoverable
 // corner graze and must remain visibly blocked for investigation.
 if(!overlaps.length||overlaps.some(o=>depth(from,o)>4))return null;
 // Never treat a wall penetration as a cover-only escape entitlement.
 if(world.someWallNearPoint(from,R,w=>
   pointToSegment(from,w)<R-.01))return null;
 const originalLeafGaps=doors.map(door=>
  pointToSegment(from,doorLeafSegment(door)));
 const originalPeerGaps=peerPoints.map(p=>dist(from,p));
 const step=Math.max(.1,Math.min(.75,maxStep));
 const goalAngle=Math.atan2(goal.y-from.y,goal.x-from.x);
 const headings=[goalAngle,...overlaps.flatMap(o=>[
  Math.atan2(from.y-o.y,from.x-o.x),
  Math.atan2(Math.sign(from.y-o.y),0),
  Math.atan2(0,Math.sign(from.x-o.x))
 ]),...Array.from({length:16},(_,i)=>i*Math.PI/8)];
 let best:Pt|null=null,bestScore=-Infinity;
 for(const theta of headings){
  if(!Number.isFinite(theta))continue;
  const candidate={x:from.x+Math.cos(theta)*step,
   y:from.y+Math.sin(theta)*step};
  let valid=true;
  for(let i=1;i<=5;i++){
   const t=i/5;
   const at={x:from.x+(candidate.x-from.x)*t,
    y:from.y+(candidate.y-from.y)*t};
   if(at.x<world.bounds.minX+13||at.y<world.bounds.minY+20||
      at.x>world.bounds.maxX-13||at.y>world.bounds.maxY-13){
    valid=false;break;
   }
   if(world.someWallNearPoint(at,R,w=>pointToSegment(at,w)<R-.01)){
    valid=false;break;
   }
   // At 0.15-unit resolution, ALL originally overlapping covers must
   // become strictly less penetrated. Every other solid remains solid.
   if(world.someCoverNearPoint(at,OPERATOR_RADIUS+2,o=>{
    if(!isFootstepObstacle(o))return false;
    const previous=depth(from,o),current=depth(at,o);
    return previous>.02&&overlaps.includes(o)?
      current>previous-.025*t:current>0;
   })){valid=false;break;}
   for(let k=0;k<doors.length;k++){
    const gap=pointToSegment(at,doorLeafSegment(doors[k]));
    const before=originalLeafGaps[k];
    if(gap>=R)continue;
    if(before>=R||gap+1e-5<before||
       i===5&&gap<before+.025){valid=false;break;}
   }
   if(!valid)break;
   for(let k=0;k<peerPoints.length;k++){
    const gap=dist(at,peerPoints[k]),before=originalPeerGaps[k];
    if(gap>=OPERATOR_RADIUS*2+1)continue;
    if(before>=OPERATOR_RADIUS*2+1||gap+1e-5<before||
      i===5&&gap<before+.025){valid=false;break;}
   }
   if(!valid)break;
  }
  if(!valid)continue;
  const gains=overlaps.map(o=>depth(from,o)-depth(candidate,o));
  if(gains.some(g=>g<.1))continue;
  const advance=((candidate.x-from.x)*(goal.x-from.x)+
   (candidate.y-from.y)*(goal.y-from.y))/
   Math.max(1,dist(from,goal)*step);
  const score=Math.min(...gains)*10+advance;
  if(score>bestScore){bestScore=score;best=candidate;}
 }
 return best;
}
