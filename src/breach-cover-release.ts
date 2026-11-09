/** Conservative escape from a body spawned/left overlapping fixed furniture.
 * It permits only shallow, continuous motion that REDUCES existing overlap;
 * walls, closed leaves and all previously uncontacted cover remain solid.
 * This does not grant an operator the ability to walk through a table. */
import {type Pt,type Door,type Obstacle,type Segment,OPERATOR_RADIUS,
  doorLeafSegment,pointToSegment} from './breach-core.ts';
import {isFootstepObstacle} from './breach-traversal-surfaces.ts';

type Bounds={minX:number;minY:number;maxX:number;maxY:number};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const penetration=(p:Pt,o:Obstacle,r:number)=>
  Math.max(0,Math.min(o.w/2+r-Math.abs(p.x-o.x),
    o.h/2+r-Math.abs(p.y-o.y)));

/** Return one small safe, *outward* step, or null when normal movement
 * clearance should handle the position. Call only before route execution. */
export function releaseEmbeddedCover(from:Pt,goal:Pt,
 cover:readonly Obstacle[],walls:readonly Segment[],doors:readonly Door[],
 bounds:Bounds,maxStep=1.5):Pt|null{
 const r=OPERATOR_RADIUS;
 const trapped=cover.map((o,i)=>({o,i,depth:isFootstepObstacle(o)?
   penetration(from,o,r):0})).filter(item=>item.depth>.001);
 if(!trapped.length)return null;
 const trappedIds=new Set(trapped.map(item=>item.i));
 const step=Math.min(1.5,Math.max(.1,maxStep));
 const toward=Math.atan2(goal.y-from.y,goal.x-from.x);
 const angles=[toward,...Array.from({length:16},(_,i)=>i*Math.PI/8)];
 let best:Pt|null=null,bestScore=-Infinity;
 for(const theta of angles){
  const candidate={x:from.x+Math.cos(theta)*step,
    y:from.y+Math.sin(theta)*step};
  let legal=true;
  for(let sample=1;sample<=4&&legal;sample++){
   const t=sample/4,at={
     x:from.x+(candidate.x-from.x)*t,
     y:from.y+(candidate.y-from.y)*t
   };
   if(at.x<bounds.minX+13||at.x>bounds.maxX-13||
      at.y<bounds.minY+20||at.y>bounds.maxY-13||
      walls.some(w=>pointToSegment(at,w)<r+1)||
      doors.some(door=>pointToSegment(at,doorLeafSegment(door))<r+1)){
     legal=false;break;
   }
   for(let i=0;i<cover.length;i++){
    const obstacle=cover[i];
    if(!isFootstepObstacle(obstacle))continue;
    const depth=penetration(at,obstacle,r);
    if(depth<=.001)continue;
    if(!trappedIds.has(i)){legal=false;break;}
    const initial=trapped.find(item=>item.i===i)!.depth;
    if(depth>initial+.001){legal=false;break;}
   }
  }
  if(!legal)continue;
  const gain=trapped.reduce((total,item)=>
    total+item.depth-penetration(candidate,item.o,r),0);
  if(gain<Math.min(.035,step*.1))continue;
  const goalDistance=Math.max(1,distance(from,goal));
  const towardGoal=((candidate.x-from.x)*(goal.x-from.x)+
    (candidate.y-from.y)*(goal.y-from.y))/(goalDistance*step);
  const score=gain*10+towardGoal*.4;
  if(score>bestScore){best=candidate;bestScore=score;}
 }
 return best;
}
