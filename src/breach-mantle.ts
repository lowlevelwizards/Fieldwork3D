/** Traversal Stage 3a: deterministic, collision-truth crossing contract.
 * A vault is a timed physical transition over ONE explicitly eligible
 * obstacle, not permission to ignore all cover or slide through a wall.
 *
 * This module defines the action and checks. The live motor and rendering
 * integration are a separate stage: never bypass cover collision merely
 * because probeCrossing returns an opportunity.
 */
import {type Obstacle,type Door,type Pt,type Segment,
 OPERATOR_RADIUS,pointToSegment,doorLeafSegment} from './breach-core.ts';
import {coverHeight} from './breach-cover-height.ts';
import {isFootstepObstacle,traversalSurface} from './breach-traversal-surfaces.ts';
import type {WindowState} from './breach-windows.ts';

export type TraverseKind='step'|'hop'|'vault'|'mantle'|'climb-window';
export type TraversePace='walk'|'run';
export type TraverseFitness={
 pace?:TraversePace;injury?:0|1|2|3;loadFactor?:number;
};
export type TraverseOpportunity={
 kind:TraverseKind;obstacleIndex:number;fixture:string;
 /** Window climbs require their pane to remain legally open or broken. */
 windowId?:string;
 from:Pt;approach:Pt;landing:Pt;destination:Pt;
 height:number;duration:number;lift:number;
};
export type TraverseFrame={
 p:Pt;elevation:number;progress:number;done:boolean;phase:
 'takeoff'|'over'|'landing'|'complete';
};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const pointBetween=(a:Pt,b:Pt,t:number):Pt=>({
 x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)
});
export const traversalDuration=(kind:TraverseKind,
 fit:TraverseFitness={}):number=>{
 const base:Record<TraverseKind,number>={
  step:.14,hop:.38,vault:.76,mantle:1.42,'climb-window':1.18
 };
 const pace=fit.pace==='run'&&kind!=='mantle'&&kind!=='climb-window'?.83:1;
 const injury=fit.injury===1?1.12:fit.injury===2?1.35:
   fit.injury===3?Infinity:1;
 const load=Math.max(.9,Math.min(1.5,fit.loadFactor??1));
 return base[kind]*pace*injury*load;
};
export function traversalKind(obstacle:Obstacle):TraverseKind|null{
 const surface=traversalSurface(obstacle);
 const height=coverHeight(obstacle);
 if(surface==='step-over')return 'step';
 if(surface!=='vault'&&surface!=='mantle')return null;
 if(height<=0||height>44)return null;
 // Structural walls require more deliberate hand-supported climbing.
 if(surface==='mantle')return 'mantle';
 if(height<=16)return 'hop';
 if(height<=28)return 'vault';
 return 'mantle';
}
/** Exact intersection interval of a 2D segment with an axis-aligned prop,
 * used only to locate a potential crossing, never to waive wall collision. */
export function crossingInterval(from:Pt,to:Pt,o:Obstacle):
 [number,number]|null{
 let low=0,high=1;
 for(const [p,v,min,max] of [
  [from.x,to.x-from.x,o.x-o.w/2,o.x+o.w/2],
  [from.y,to.y-from.y,o.y-o.h/2,o.y+o.h/2]
 ]){
  if(Math.abs(v)<1e-8){if(p<min||p>max)return null;continue;}
  let enter=(min-p)/v,leave=(max-p)/v;
  if(enter>leave){const swap=enter;enter=leave;leave=swap;}
  low=Math.max(low,enter);high=Math.min(high,leave);
  if(low>=high)return null;
 }
 return low>0&&high<1?[low,high]:null;
}
function outsideTarget(p:Pt,o:Obstacle,r:number){
 return Math.abs(p.x-o.x)>=o.w/2+r||
   Math.abs(p.y-o.y)>=o.h/2+r;
}
/** Every sample of the proposed path must be clear of walls, door leaves,
 * and all cover EXCEPT the one obstacle being traversed at height.
 * This is independent of map-intel authoring and cannot reveal hidden props.
 */
function sweptApartFromTarget(from:Pt,to:Pt,target:number,
 cover:readonly Obstacle[],walls:readonly Segment[],
 doors:readonly Door[],r=OPERATOR_RADIUS){
 const length=distance(from,to);
 const steps=Math.max(1,Math.ceil(length/2.5));
 for(let i=0;i<=steps;i++){
  const p=pointBetween(from,to,i/steps);
  if(walls.some(w=>pointToSegment(p,w)<r+1))return false;
  if(doors.some(d=>pointToSegment(p,doorLeafSegment(d))<r+1))
   return false;
  if(cover.some((o,index)=>index!==target&&isFootstepObstacle(o)&&
   Math.abs(p.x-o.x)<o.w/2+r&&Math.abs(p.y-o.y)<o.h/2+r))
   return false;
 }
 return true;
}
/** The only legal collision exception while airborne is the SAME
 * obstacle that was verified at takeoff. Recheck world geometry every tick;
 * moving furniture, closing doors, or a newly placed blocker may invalidate
 * a crossing. The landing remains full-size body clear.
 */
export function traversalStepClear(from:Pt,to:Pt,
 action:TraverseOpportunity,world:CrossingWorld):boolean{
 const target=world.cover[action.obstacleIndex];
 if(!target||target.fixture!==action.fixture)return false;
 if(action.kind==='climb-window'){
   const w=world.windows?.find(w=>w.id===action.windowId);
   if(!w||!canClimbWindow(w)||
      distance({x:target.x,y:target.y},{x:w.x,y:w.y})>1)return false;
 }else if(traversalKind(target)!==action.kind)return false;
 if(!sweptApartFromTarget(from,to,action.obstacleIndex,
   world.cover,world.walls,world.doors))return false;
 // Never land in furniture after a world mutation, including the target.
 if(distance(to,action.landing)<.15&&world.canStand&&
    !world.canStand(to))return false;
 return true;
}
export const traversalRouteLength=(from:Pt,path:readonly Pt[]):number=>{
 let total=0,previous=from;
 for(const point of path){total+=distance(previous,point);previous=point;}
 return total;
};
/** Compare seconds, not just metres: a 1.4 s mantle should not interrupt
 * an ordinary walk that is almost as direct. The explicit landing geometry
 * is still validated separately by probeObstacleCrossing.
 */
export function preferTraversal(from:Pt,goal:Pt,op:TraverseOpportunity,
 ordinary:readonly Pt[],speed=53):boolean{
 if(!ordinary.length)return true;
 const safeSpeed=Math.max(15,speed);
 const ordinarySeconds=traversalRouteLength(from,ordinary)/safeSpeed;
 const crossSeconds=(distance(from,op.approach)+
   distance(op.landing,goal))/safeSpeed+op.duration;
 return ordinarySeconds>crossSeconds+.12;
}
export type CrossingWorld={
 cover:readonly Obstacle[];walls:readonly Segment[];doors:readonly Door[];
 actors?:readonly Pt[];canStand?:(p:Pt)=>boolean;
 windows?:readonly WindowState[];
};
/** Find a *single* useful obstacle crossing along a user-intended segment.
 * We require both a full-body takeoff and landing, a verified swept path
 * against all OTHER obstacles, and no person occupying the landing.
 */
export function probeObstacleCrossing(from:Pt,to:Pt,world:CrossingWorld,
 fit:TraverseFitness={}):TraverseOpportunity|null{
 if(fit.injury===3)return null;
 const length=distance(from,to);
 if(length<20||length>180)return null;
 const options=world.cover.map((o,index)=>({
   o,index,interval:crossingInterval(from,to,o),
   kind:traversalKind(o)
 })).filter(x=>x.interval&&x.kind&&x.kind!=='step')
   .sort((a,b)=>a.interval![0]-b.interval![0]);
 if(options.length!==1)return null;
 const {o,index,interval,kind}=options[0];
 const [enter,exit]=interval!;
 // A very broad object is not a hop or vault, even if it is short.
 const width=(exit-enter)*length;
 if(width>(kind==='hop'?30:kind==='vault'?52:34))return null;
 const lead=(OPERATOR_RADIUS+3)/length;
 const trail=(OPERATOR_RADIUS+5)/length;
 const takeoff=pointBetween(from,to,Math.max(0,enter-lead));
 const landing=pointBetween(from,to,Math.min(1,exit+trail));
 if(!outsideTarget(takeoff,o,OPERATOR_RADIUS+1)||
    !outsideTarget(landing,o,OPERATOR_RADIUS+1))return null;
 if(world.canStand&&(!world.canStand(takeoff)||
    !world.canStand(landing)))return null;
 if(world.actors?.some(p=>distance(p,landing)<OPERATOR_RADIUS*2+3))
    return null;
 if(!sweptApartFromTarget(takeoff,landing,index,
   world.cover,world.walls,world.doors))return null;
 const duration=traversalDuration(kind!,fit);
 if(!Number.isFinite(duration))return null;
 return {kind:kind!,obstacleIndex:index,fixture:o.fixture??'cover',
  from:{...from},approach:takeoff,landing,destination:{...to},
  height:coverHeight(o),duration,lift:coverHeight(o)+5};
}
/** A real map window is a cut wall opening with its own physical sill.
 * Only the specific open/broken pane and its matching collider are exempted
 * during an explicitly timed climb. Never ignore an arbitrary nearby wall.
 */
export function probeWindowCrossing(from:Pt,to:Pt,world:CrossingWorld,
 fit:TraverseFitness={}):TraverseOpportunity|null{
 if(fit.injury===3||!world.windows?.length)return null;
 const length=distance(from,to);
 if(length<20||length>180)return null;
 const valid:TraverseOpportunity[]=[];
 for(const w of world.windows){
   if(!canClimbWindow(w))continue;
   const normal=w.vertical?{x:1,y:0}:{x:0,y:1};
   const fromSide=(from.x-w.x)*normal.x+(from.y-w.y)*normal.y;
   const toSide=(to.x-w.x)*normal.x+(to.y-w.y)*normal.y;
   if(fromSide*toSide>=0)continue;
   const fraction=fromSide/(fromSide-toSide);
   if(fraction<=0||fraction>=1)continue;
   const center=pointBetween(from,to,fraction);
   const lateral=Math.abs(w.vertical?center.y-w.y:center.x-w.x);
   // A diagonally authored destination may meet the facade beside a
   // perfectly usable window. Approach the CENTER of the opening instead
   // of requiring a pixel-perfect perpendicular drag through the sill.
   // The route to takeoff and from landing are checked independently.
   if(lateral>w.width/2+18)continue;
   const index=world.cover.findIndex(o=>
     (o.fixture==='window-sill'||o.fixture==='glass-barrier')&&
     Math.hypot(o.x-w.x,o.y-w.y)<1&&
     Math.abs((w.vertical?o.h:o.w)-w.width)<2);
   if(index<0)continue;
   const obstacle=world.cover[index];
   const fromSign=fromSide>=0?1:-1;
   const thickness=w.vertical?obstacle.w:obstacle.h;
   const distanceToCenter=thickness/2+OPERATOR_RADIUS+4;
   const approach={x:w.x+normal.x*fromSign*distanceToCenter,
     y:w.y+normal.y*fromSign*distanceToCenter};
   const landing={x:w.x-normal.x*fromSign*distanceToCenter,
     y:w.y-normal.y*fromSign*distanceToCenter};
   if(!outsideTarget(approach,obstacle,OPERATOR_RADIUS+1)||
      !outsideTarget(landing,obstacle,OPERATOR_RADIUS+1))continue;
   if(world.canStand&&(!world.canStand(approach)||
      !world.canStand(landing)))continue;
   if(world.actors?.some(p=>distance(p,landing)<OPERATOR_RADIUS*2+3))
      continue;
   if(!sweptApartFromTarget(approach,landing,index,world.cover,
      world.walls,world.doors))continue;
   const duration=traversalDuration('climb-window',fit);
   if(!Number.isFinite(duration))continue;
   valid.push({
      kind:'climb-window',windowId:w.id,
      obstacleIndex:index,fixture:obstacle.fixture??'window-sill',
      from:{...from},approach,landing,destination:{...to},
      height:w.sillHeight??14,duration,
      lift:Math.max(13,(w.sillHeight??14)+5)
   });
 }
 // No ambiguous automatic choice across multiple apertures.
 return valid.length===1?valid[0]:null;
}
/** Shared shape/clearance contract for an openable or broken pane.
 * Bars, boards, overhead glazing and narrow/high apertures aren't shortcuts.
 */
export function hasClimbableWindowOpening(window:WindowState):boolean{
 if(window.treatment==='bars'||window.treatment==='boarded'||
    window.style==='wire')return false;
 if(window.width<25)return false;
 const sill=window.sillHeight??14,head=window.headHeight??38;
 return sill<=30&&head-sill>=18;
}
export function canClimbWindow(window:WindowState):boolean{
 return (window.open||window.shattered)&&hasClimbableWindowOpening(window);
}
/** Movement can open a standard exterior sash as part of a climb, just like
 * a move through a known closed door can issue OPEN automatically. Never
 * silently break picture glass or bypass bars, boards and fixed panes.
 */
export function canOpenWindowForClimb(window:WindowState):boolean{
 return !window.open&&!window.shattered&&window.operable&&
   hasClimbableWindowOpening(window);
}
/** Distinguish intentionally restricted windows from an ordinary sash
 * that merely needs to be opened before the operator can use it.
 */
export function windowClimbAvailability(window:WindowState):
 'ready'|'open-first'|'break-first'|'blocked'{
 if(!hasClimbableWindowOpening(window))return 'blocked';
 if(canClimbWindow(window))return 'ready';
 if(canOpenWindowForClimb(window))return 'open-first';
 return 'break-first';
}
/** A window is never auto-passable just because its sill is low. This
 * clearance gate is shared by future window orders and auto-climb paths. */
export function windowCrossingKind(window:WindowState):
 TraverseKind|null{
 return canClimbWindow(window)?'climb-window':null;
}
/** Animate the body between validated takeoff and landing. The live motor
 * still has to check clearance as it commits each frame; this is a
 * deterministic pose/trajectory sampler, not a collision override.
 */
export function sampleTraversal(action:TraverseOpportunity,
 elapsed:number):TraverseFrame{
 const t=Math.max(0,Math.min(1,elapsed/Math.max(.001,action.duration)));
 const smooth=t*t*(3-2*t),p=pointBetween(action.approach,action.landing,smooth);
 const lift=t>=1?0:Math.sin(Math.PI*t)*action.lift;
 return {p,elevation:lift,progress:t,done:t>=1,
  phase:t>=1?'complete':t<.25?'takeoff':t<.78?'over':'landing'};
}
