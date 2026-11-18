import type {SessionWorldGeometry} from './breach-world-context.ts';
/** Build 146: one deterministic description of movement failures.
 * Plan authoring keeps imperfect map intel; actual movement always checks
 * authoritative geometry and never fabricates a new tactical destination. */
import {activeWorldBounds,WALLS,COVER,pointToSegment,passable,doorLeafSegment,route,
  type Pt,type Door,type Obstacle} from './breach-core.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {isFootstepObstacle} from './breach-traversal-surfaces.ts';
export type Blocker='bounds'|'wall'|'furniture'|'door'|'actor'|'route'|'clear';
export type MoveDiagnostic={blocker:Blocker;point:Pt;distance:number;
  id?:string};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const inBox=(p:Pt,b:Obstacle,r:number)=>
  Math.abs(p.x-b.x)<b.w/2+r&&Math.abs(p.y-b.y)<b.h/2+r;
export function diagnoseMovement(from:Pt,to:Pt,doors:readonly Door[],
  actors:readonly Pt[]=[],radius=8,
  world?:SessionWorldGeometry):MoveDiagnostic{
  const samples=Math.max(1,Math.ceil(distance(from,to)/3.5));
  const bounds=world?.bounds??activeWorldBounds();
  for(let i=1;i<=samples;i++){
    const f=i/samples,p={x:from.x+(to.x-from.x)*f,
      y:from.y+(to.y-from.y)*f};
    if(p.x<bounds.minX+13||p.y<bounds.minY+20||
       p.x>bounds.maxX-13||p.y>bounds.maxY-13)
      return {blocker:'bounds',point:p,distance:distance(from,p)};
    // D3.10B: blocked-step diagnostics run only after a rejected physical
    // stride, but can still run every tick while genuinely obstructed.
    // Reuse the same owning-session spatial index already used by physics.
    // This is a conservative broadphase only; exact clearance and the
    // wall-before-cover-before-door precedence remain unchanged.
    const wallHit=(w:typeof WALLS[number])=>
      pointToSegment(p,w)<radius+1;
    const wallsBlocked=world?
      world.someWallNearPoint(p,radius+1,wallHit):WALLS.some(wallHit);
    if(wallsBlocked)
      return {blocker:'wall',point:p,distance:distance(from,p)};
    const coverHit=(b:Obstacle)=>isFootstepObstacle(b)&&inBox(p,b,radius);
    const coverBlocked=world?
      world.someCoverNearPoint(p,radius,coverHit):COVER.some(coverHit);
    if(coverBlocked)
      return {blocker:'furniture',point:p,distance:distance(from,p)};
    const blocked=doors.find(d=>
      pointToSegment(p,doorLeafSegment(d))<radius+1);
    if(blocked)return {blocker:'door',point:p,
      distance:distance(from,p),id:blocked.id};
    if(actors.some(a=>distance(p,a)<radius*2))
      return {blocker:'actor',point:p,distance:distance(from,p)};
  }
  return {blocker:'clear',point:{...to},distance:distance(from,to)};
}
export function projectReachableGoal(from:Pt,to:Pt,{
  canStand=passable,
  routeTo=(a,b)=>route(a,b,canStand),
  canNudgeAcross=(a,b)=>!passable(a,0)||
    diagnoseMovement(a,b,[],[],0).blocker==='clear',
  tolerance=13,
}:{
  canStand?:(p:Pt)=>boolean;
  routeTo?:(a:Pt,b:Pt)=>Pt[];
  /** User planning injects KNOWN-only zero-radius crossing; defaults
   * retain legacy physical behavior for generic non-intel callers. */
  canNudgeAcross?:(a:Pt,b:Pt)=>boolean;
  tolerance?:number;
}={}):{point:Pt;adjusted:boolean}|null{
  if(canStand(to)&&routeTo(from,to).length)
    return {point:{...to},adjusted:false};
  // Correct a thumb-tap only by a nearby physical offset. Never select
  // an unrelated room, a far-away position or a different side of a wall.
  const offsets:Pt[]=[];
  for(const r of [4,7,10,13]){
    if(r>tolerance)break;
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      offsets.push({x:to.x+Math.cos(a)*r,y:to.y+Math.sin(a)*r});
    }
  }
  const possible=offsets.filter(p=>canStand(p)&&
    canNudgeAcross(to,p));
  possible.sort((a,b)=>distance(a,to)-distance(b,to));
  for(const p of possible){
    if(routeTo(from,p).length)
      return {point:p,adjusted:true};
  }
  return null;
}
export function progressToward(from:Pt,to:Pt,goal:Pt){
  return distance(from,goal)-distance(to,goal);
}
export function routeSegmentsClear(from:Pt,points:readonly Pt[],doors:Door[]=[]){
  let previous=from;
  for(const next of points){
    if(!sweptBodyClear(previous,next,doors))return false;
    previous=next;
  }
  return true;
}

/** Never reveal unknown furniture or wall geometry when editing a plan. */
export function orderFailureText(from:Pt,to:Pt,options:{
  canStand:(p:Pt)=>boolean;routeTo:(from:Pt,to:Pt)=>Pt[];
  remainingPlanValid?:boolean;
}):string{
  if(!options.canStand(to))return 'DESTINATION HAS INSUFFICIENT CLEARANCE';
  if(!options.routeTo(from,to).length)return 'NO WALKABLE ROUTE TO DESTINATION';
  if(options.remainingPlanValid===false)
    return 'MOVE WOULD INVALIDATE A LATER WAYPOINT';
  return 'INVALID ORDER DESTINATION';
}

/** Once an authoritative step has been rejected, a 'clear' diagnostic is
 * contradictory. Honor actual opposing bodies and closed leaves, then keep
 * detailed geometry when known; fall back to route recovery, not success. */
export function blockedStepCause(diagnosed:Blocker,
 opposingActor:boolean,closedLeaf:boolean):Blocker{
 if(opposingActor)return 'actor';
 if(closedLeaf)return 'door';
 return diagnosed==='clear'?'route':diagnosed;
}
