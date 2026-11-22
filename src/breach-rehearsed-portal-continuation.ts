/** D3.35: true post-rehearsal doorway continuation, NO second motor.
 * Some actors physically cross an open leaf on the real D2 rehearsal but
 * acquire an intel path BACK THROUGH that same leaf. Repeating this
 * combination causes kilometres of body movement without the authored GO.
 *
 * This keyed, bounded witness observes actual accepted short rehearsals.
 * Only after a second independently accepted rehearsal and a REAL
 * crossed-side body pose may acquisition replace a backwards initial
 * intel route with a physical-world prefix to the NEXT OPERABLE door.
 * The existing actor motor must execute ALL footsteps and open that door.
 * No player order, hinge, position, lock, failure or arrival is edited.
 */
import {doorCenter,doorLeafSegment,doorBlocksSegment,pointToSegment,
 OPERATOR_RADIUS,type Pt,type Door} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
import {signedDoorSide} from './breach-door-traversal-episode.ts';

const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
type PortalWitness={
 orderId:number;doorId:string;goal:Pt;portal:Pt;
 approach:Pt;lastAt:number;count:number;used:boolean;
};
const byActor=new WeakMap<TeamActor,PortalWitness>();
const samePt=(a:Pt,b:Pt,tol=.5)=>d(a,b)<=tol;
/** Called ONLY after the specialist/adoption gate has accepted a short
 * non-goal-reaching, full-body-swept door rehearsal route.
 */
export function noteAcceptedRehearsedPortal(
 a:TeamActor,door:Door,goal:Pt,portal:Pt,seconds:number
):void{
 const order=a.plan[0];
 if(a.side!=='blue'||order?.kind!=='move'||
    door.kind==='sliding'||door.kind==='shutter'||!door.open||
    door.locked||door.jammed||door.wedged||door.heldBy||
    (door.openFraction??0)<.98||
    Math.abs(door.angularVelocity??0)>=.16||
    d(portal,goal)<3||d(a.p,portal)>100||
    signedDoorSide(a.p,door)*signedDoorSide(goal,door)>=0||
    signedDoorSide(portal,door)*signedDoorSide(goal,door)<=0)return;
 const before=byActor.get(a);
 const same=!!before&&before.orderId===order.id&&
    before.doorId===door.id&&samePt(before.goal,goal)&&
    d(before.portal,portal)<6&&seconds-before.lastAt<9;
 byActor.set(a,{orderId:order.id,doorId:door.id,goal:{...goal},
  portal:{...portal},approach:{...a.p},lastAt:seconds,
  count:same?Math.min(6,before.count+1):1,used:same&&before.used});
}

/** NO work if the real body has not completed the rehearsed crossing,
 * if the leaf is no longer stable/open, or if this was an ordinary
 * outward detour with a goalward next intel leg. This is an acquisition
 * selector, not a cooldown bypass for motor collision recovery.
 */
export function eligibleRehearsedPortalContinuation(
 a:TeamActor,doors:readonly Door[],goal:Pt,
 firstIntel:Pt|undefined,seconds:number
):Door|null{
 const w=byActor.get(a),order=a.plan[0];
 if(!w||w.used||w.count<2||a.side!=='blue'||
    order?.kind!=='move'||order.id!==w.orderId||
    !samePt(order.p,goal)||!samePt(w.goal,goal)||
    a.nav.length||a.doorTraversal||a.traversal||
    a.traversalPending||a.squeeze||a.autoSidestep||
    a.fireRetreatTarget||!firstIntel||
    seconds-w.lastAt>3||seconds<w.lastAt||
    d(a.p,w.portal)>5||d(a.p,goal)<25)return null;
 const toward={x:goal.x-a.p.x,y:goal.y-a.p.y};
 const first={x:firstIntel.x-a.p.x,y:firstIntel.y-a.p.y};
 // The actual repeated error: initial-intel routes reverse through
 // the physically cleared leaf, even though the authored GO is ahead.
 if(first.x*toward.x+first.y*toward.y>=-25)return null;
 const door=doors.find(x=>x.id===w.doorId);
 if(!door||!door.open||door.locked||door.jammed||
    door.wedged||door.heldBy||
    door.kind==='sliding'||door.kind==='shutter'||
    (door.openFraction??0)<.98||
    Math.abs(door.angularVelocity??0)>=.16||
    d(a.p,doorCenter(door))>85||
    pointToSegment(a.p,doorLeafSegment(door))>OPERATOR_RADIUS+60||
    signedDoorSide(w.approach,door)*signedDoorSide(goal,door)>=0||
    signedDoorSide(a.p,door)*signedDoorSide(goal,door)<=0)
   return null;
 return door;
}

/** A legitimate next-door route terminates at the FIRST true closed
 * operable leaf. The earlier prefix MUST be fully body-swept. Only
 * the final contact may intersect exactly one real operable door, with
 * the same full-body stride clear after removing THAT door alone.
 * Locked/wedged/held, world walls and every other door still veto.
 */
export function certifiedFollowOnPortalPrefix(
 from:Pt,goal:Pt,route:readonly Pt[],doors:readonly Door[],
 sweep:(a:Pt,b:Pt,doors:readonly Door[])=>boolean,
 operable:(door:Door)=>boolean
):Pt[]{
 if(route.length<2||route.length>28||
   d(from,route[0])>96||!route.every(p=>
     Number.isFinite(p.x)&&Number.isFinite(p.y)))return [];
 let at=from,length=0;
 for(let i=0;i<route.length;i++){
  const next=route[i],span=d(at,next);
  length+=span;
  if(!Number.isFinite(span))return [];
  if(sweep(at,next,doors)){at=next;continue;}
  if(i!==route.length-1)return [];
  const only=doors.filter(door=>
    operable(door)&&doorBlocksSegment(door,{a:at,b:next})&&
    sweep(at,next,doors.filter(x=>x!==door)));
  if(only.length!==1)return [];
  at=next;
 }
 if(length>d(from,goal)*2.5+110)return [];
 return route.map(p=>({...p}));
}
export function noteAcceptedFollowOnPortal(a:TeamActor):void{
 const w=byActor.get(a);if(w)w.used=true;
}
