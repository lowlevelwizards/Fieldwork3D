/** Tactical picking is presentation-aware, but read-only; plan commits
 * cross an explicit semantic boundary rather than living in DOM handlers. */
import {doorCenter,doorLeafSegment,type Pt} from './breach-core.ts';
import {team,liveVisibility,insertPlanNode,type Session,type TeamActor}
 from './breach-game.ts';
import {doorKnown} from './breach-intel.ts';
import {activeWatchTarget} from './ui/active-watch-marker.ts';
import {resolveTacticalPick,screenSegmentDistance,
 type TacticalPick} from './ui/tactical-target-resolver.ts';
import {tacticalHitProfile} from './ui/touch-hit-targets.ts';
import {routeLineHit} from './breach-route-edit.ts';
import type {DisplayRouteCache} from './breach-route-cache.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export type TacticalPickInput={
 screen:Pt;pointerKind:string;state:Session;replaying:boolean;
 selected:string;selectedNode:number|null;doorFocusId:string|null;
 viewMode:'iso'|'top'|'plan2d';
 worldToScreen:(point:Pt,height:number)=>Pt;
 executionProblemStatus:(actor:TeamActor)=>{orderId:number|null}|null;
 executionMarkerPoint:(actor:TeamActor,projected:boolean)=>Pt;
 displayRouteCache:DisplayRouteCache;
};
/** One shared screen-space picker for the visible planning surface.
 * Routes, doors and order handles compete by explicit geometry, never by
 * separate first-match handlers or unseen world information. */
export function pickTacticalTarget(input:TacticalPickInput):TacticalPick|null{
  const {screen,pointerKind,state,replaying,selected,selectedNode,
    doorFocusId,viewMode,worldToScreen,executionProblemStatus,
    executionMarkerPoint,displayRouteCache}=input;
  const uid=(id:string)=>state.operators.find(a=>a.id===id);

  if(replaying)return null;
  const touch=pointerKind==='touch',pen=pointerKind==='pen';
  // GO/PAUSE still permit direct operator selection. The rest of the
  // planning surface is deliberately non-interactive while executing.
  if(state.phase!=='planning'){
    return resolveTacticalPick(team(state).filter(a=>a.health>0).map(a=>({
      kind:'operator' as const,owner:a.id,
      distancePx:distance(worldToScreen(a.p,viewMode==='plan2d'?0:24),screen),
      corePx:touch?18:pen?16:14,haloPx:touch?30:pen?25:21
    })),selected);
  }
  const hits:TacticalPick[]=[];
  const actor=uid(selected);
  for(const unit of team(state)){
    if(unit.health<=0)continue;
    const here=worldToScreen(unit.p,viewMode==='plan2d'?0:24);
    // A 44 px direct finger target is generous without an invisible 60 px
    // magnetic halo that steals floor taps beside a stacked teammate.
    hits.push({kind:'operator',owner:unit.id,distancePx:distance(here,screen),
      corePx:touch?22:pen?18:15});
    const problem=executionProblemStatus(unit);
    if(problem?.orderId!=null){
      const marker=executionMarkerPoint(unit,viewMode!=='plan2d');
      const point=viewMode==='plan2d'?worldToScreen(marker,0):marker;
      hits.push({kind:'problem',owner:unit.id,nodeId:problem.orderId,
        distancePx:distance(point,screen),corePx:touch?15:12,haloPx:19});
    }
    const active=activeWatchTarget(unit);
    if(active){
      hits.push({kind:'activeWatch',owner:unit.id,
        distancePx:distance(worldToScreen(active,12),screen),
        corePx:touch?17:pen?15:12,
        haloPx:unit.id===selected&&touch?24:undefined});
    }
    for(const node of unit.plan){
      const here=worldToScreen(node.p,8);
      const selectedHandle=unit.id===selected&&node.id===selectedNode;
      hits.push({kind:'node',owner:unit.id,nodeId:node.id,
        distancePx:distance(here,screen),
        corePx:touch?(unit.id===selected?19:17):pen?16:13,
        haloPx:selectedHandle&&touch?24:undefined});
      if(node.aimPoint&&node.aimMode==='track')
        hits.push({kind:'watch',owner:unit.id,nodeId:node.id,
          distancePx:distance(worldToScreen(node.aimPoint,12),screen),
          corePx:touch?17:pen?15:12,
          haloPx:selectedHandle&&touch?23:undefined});
      if(node.aimPoint&&node.kind==='flash')
        hits.push({kind:'flash',owner:unit.id,nodeId:node.id,
          distancePx:distance(worldToScreen(node.aimPoint,12),screen),
          corePx:touch?17:pen?15:12});
    }
    const hit=routeLineHit(unit.p,unit.plan,screen,
      point=>worldToScreen(point,4),
      unit.id===selected?(touch?14:pen?12:10):(touch?8:pen?7:6),
      (from,to)=>displayRouteCache.get(from,to,state.intel,true).points);
    if(hit)hits.push({kind:'route',owner:unit.id,
      routeIndex:hit.index,routePoint:hit.point,
      distancePx:hit.distancePx,corePx:unit.id===selected?
        (touch?14:pen?12:10):(touch?8:pen?7:6)});
  }
  // Known doors only. The painted leaf and visible door selector own the
  // tap, not a cluster of broad, overlapping circles around the threshold.
  // Interaction reach is checked at commit using the selected command origin.
  if(actor)for(const door of state.doors){
    if(!doorKnown(state.intel,door.id))continue;
    const fraction=liveVisibility(state,doorCenter(door))?
      (door.openFraction??(door.open?1:0)):
      (state.intel.doorMemory.get(door.id)??0);
    const leaf=doorLeafSegment({...door,openFraction:fraction});
    const a=worldToScreen(leaf.a,10),b=worldToScreen(leaf.b,10);
    const center=worldToScreen(doorCenter(door),12);
    const gap=Math.min(screenSegmentDistance(screen,a,b),
      Math.max(0,distance(screen,center)-4));
    hits.push({kind:'door',doorId:door.id,distancePx:gap,
      corePx:touch?(door.id===doorFocusId?15:12):pen?11:9});
  }
  return resolveTacticalPick(hits,selected);
}

/** Authoritative plan insertion, without HUD or pointer event side effects. */
export type RouteWaypointInsertion=
 | {status:'miss'}
 | {status:'blocked';index:number;point:Pt}
 | {status:'inserted';index:number;point:Pt;nodeId:number};
export function insertTacticalRouteWaypoint(input:{
 state:Session;selected:string;screen:Pt;pointerKind:string;
 worldToScreen:(p:Pt,height:number)=>Pt;
 displayRouteCache:DisplayRouteCache;
}):RouteWaypointInsertion{
 const {state,selected,screen,pointerKind,worldToScreen,displayRouteCache}=input;
 const actor=state.operators.find(a=>a.id===selected);
 if(!actor||state.phase!=='planning')return {status:'miss'};
 const hit=routeLineHit(actor.p,actor.plan,screen,
   point=>worldToScreen(point,4),tacticalHitProfile(pointerKind).route,
   (from,to)=>displayRouteCache.get(from,to,state.intel,true).points);
 if(!hit)return {status:'miss'};
 const nodeId=state.nextId;
 if(!insertPlanNode(state,selected,hit.index,hit.point))
   return {status:'blocked',index:hit.index,point:hit.point};
 return {status:'inserted',index:hit.index,point:hit.point,nodeId};
}
