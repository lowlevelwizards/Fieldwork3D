/** D3.11C: opt-in forensic witness for transient physical-route writers.
 * No observer is installed in production. Does not own physics, route
 * selection, player orders, or any persistent actor state.
 */
import type {Session,TeamActor} from './breach-game.ts';
import {observeD328EntryRoute} from './breach-d328-entry-loop.ts';
import {doorLeafSegment,type Pt} from './breach-core.ts';
export type RouteSource=
 'initial-intel'|'initial-enemy'|'shove-stage'|'fire-retreat'|
 'door-short-entry'|'door-rehearsal'|'door-rehearsal-world'|
 'door-rehearsal-joined-waypoint'|'door-drift'|'door-leaf-escape'|
 'full-body-lane'|'blocked-leg-connector'|'collision-world-replan'|
 'collision-intel-replan'|'self-hinge-relief'|'local-detour'|
 'generated-entry-settle'|'initial-portal-recovery'|'passage-retreat'|'door-handoff-reject'|'door-escape-swept-rejoin'|'door-escape-world-rejoin'|'door-escape-local-portal'|'door-escape-future-portal'|'door-squeeze-leaf-exit'|'lane-cycle-world'|'stack-micro-corner'|'cold-micro-departure'|'motor-micro-departure'|'motor-cold-fine-world'|'motor-exact-passage'|
 'open-leaf-local-rejoin'|'d328-entry-fine-world'|'forced-door-shortcut';
export type TransientRouteTransition={
 seconds:number;actorId:string;source:RouteSource;
 prior:readonly Pt[];next:readonly Pt[];
 squeeze:boolean;blockedTime:number;blocker:string|null;
 doorId:string|null;doorPhase:string|null;doorManeuver:string|null;
 doorFraction:number|null;goalKey:string;
 /** Offline-only physically measured actor and leaf at route decision. */
 position?:Pt;leafA?:Pt;leafB?:Pt;
 /** Set only on read-only rejection witnesses. */
 reason?:string;
};
let listener:((record:TransientRouteTransition)=>void)|null=null;
/** For offline deterministic evidence only; clear in a finally clause. */
export function setTransientRouteObserver(
 next:((record:TransientRouteTransition)=>void)|null):void{listener=next;}
function report(s:Session,a:TeamActor,source:RouteSource,next:readonly Pt[],
 reason?:string){
 const fn=listener;if(!fn)return;
 const doorId=a.doorTraversal?.doorId??null;
 const door=doorId?s.doors.find(d=>d.id===doorId):undefined;
 fn({seconds:s.seconds,actorId:a.id,source,
  prior:a.nav.map(p=>({...p})),next:next.map(p=>({...p})),
  squeeze:a.squeeze,blockedTime:a.blockedTime,
  blocker:a.lastBlocker??null,doorId,
  doorPhase:a.doorTraversal?.phase??null,
  doorManeuver:a.doorTraversal?.maneuver??null,
  doorFraction:door?.openFraction??null,goalKey:a.routeGoalKey,
  position:{...a.p},
  ...(door?{leafA:{...doorLeafSegment(door).a},
    leafB:{...doorLeafSegment(door).b}}:{}),
  ...(reason?{reason}:{})});
}
/** Assign exactly the proposed transient route; zero extra allocations
 * when no offline observer is installed. */
export function setTransientRoute(
 s:Session,a:TeamActor,route:Pt[],source:RouteSource):void{
 if(listener)report(s,a,source,route);
 if(route.length)observeD328EntryRoute(a,source,route[0],s.seconds);
 a.nav=route;
}
export function prependTransientLeg(
 s:Session,a:TeamActor,leg:Pt,source:RouteSource):void{
 if(listener)report(s,a,source,[leg,...a.nav]);
 a.nav.unshift(leg);
}

/** Observe an existing in-place prepend without replacing its original
 * mutation contract (passage sequencing keeps a.nav.unshift unchanged). */
export function observeTransientPrepend(
 s:Session,a:TeamActor,leg:Pt,source:RouteSource):void{
 if(listener)report(s,a,source,[leg,...a.nav]);
}

/** D3.13G: offline-only rejection diagnostics. Does not write actor state,
 * change a path or call A*. The production motor pays one null check. */
export function noteDoorHandoffRejection(
 s:Session,a:TeamActor,reason:string
):void{
 if(listener)report(s,a,'door-handoff-reject',a.nav,reason);
}

/** Zero-impact offline audit switch; the gameplay motor never installs it. */
export function hasTransientRouteObserver():boolean{return listener!==null;}
