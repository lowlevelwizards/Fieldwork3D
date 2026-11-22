/** D3.37: a stalled generated ENTRY can have a FULL-BODY-CLEAR
 * first-operable-door route whose very last snapped point is physically
 * inside the CLOSED leaf's shoulder capsule but on its approach side.
 *
 * Only replace that terminal pre-door SNAPPED point with a standable,
 * truly CROSSING post-door landing. The existing exact portal certificate
 * must pass every pre-door full-body segment and explicitly verify the
 * one genuine operable final leaf. No movement, unlocking, door override,
 * authored GO change or second motor occurs here.
 */
import type {TeamActor} from './breach-game.ts';
import type {Pt,Door} from './breach-core.ts';
import {OPERATOR_RADIUS,doorCenter,doorLeafSegment,doorBlocksSegment,
 pointToSegment} from './breach-core.ts';
import {certifiedFollowOnPortalPrefix}
 from './breach-rehearsed-portal-continuation.ts';

const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const copy=(p:Pt):Pt=>({x:p.x,y:p.y});
type Sweep=(from:Pt,to:Pt,doors:readonly Door[])=>boolean;
type Stand=(at:Pt,doors:readonly Door[])=>boolean;
export function selectCertifiedFarSideEntryLanding(
 from:Pt,goal:Pt,proposed:readonly Pt[],doors:readonly Door[],
 sweep:Sweep,stand:Stand,operable:(door:Door)=>boolean
):Pt[]{
 if(proposed.length<2||proposed.length>28||
    !proposed.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))||
    !stand(from,doors)||!stand(goal,doors))return [];
 // Preserve every previously proven node. Nothing about this local
 // terminal snapping defect licenses a replacement earlier route.
 let prior=from;
 for(const node of proposed.slice(0,-1)){
  if(!stand(node,doors)||!sweep(prior,node,doors))return [];
  prior=node;
 }
 const end=proposed[proposed.length-1];
 if(stand(end,doors)||sweep(prior,end,doors))return [];
 const leafCandidates=doors.filter(door=>
  operable(door)&&!door.open&&!door.locked&&
  !door.jammed&&!door.wedged&&!door.heldBy&&
  door.kind!=='sliding'&&door.kind!=='shutter'&&
  pointToSegment(end,doorLeafSegment(door))<=
     OPERATOR_RADIUS+2&&
  pointToSegment(prior,doorLeafSegment(door))>
     OPERATOR_RADIUS+3&&
  !doorBlocksSegment(door,{a:prior,b:end})&&
  sweep(prior,end,doors.filter(d=>d!==door)));
 if(leafCandidates.length!==1)return [];
 const leaf=leafCandidates[0],center=doorCenter(leaf);
 const width=d(leaf.a,leaf.b);
 if(!Number.isFinite(width)||width<OPERATOR_RADIUS*2+5)return [];
 const tangent={x:(leaf.b.x-leaf.a.x)/width,
  y:(leaf.b.y-leaf.a.y)/width};
 const normal={x:-tangent.y,y:tangent.x};
 const goalSide=(goal.x-center.x)*normal.x+
   (goal.y-center.y)*normal.y;
 const approachSide=(prior.x-center.x)*normal.x+
   (prior.y-center.y)*normal.y;
 // A real crossing, not a lateral brushing motion on one side.
 if(Math.abs(goalSide)<OPERATOR_RADIUS+3||
    goalSide*approachSide>=0)return [];
 const sign=goalSide>0?1:-1;
 const sans=doors.filter(x=>x!==leaf);
 for(const depth of [OPERATOR_RADIUS+8,OPERATOR_RADIUS+12,
   OPERATOR_RADIUS+18,OPERATOR_RADIUS+24])
  for(const offset of [0,6,-6,12,-12]){
   const landing={x:center.x+normal.x*sign*depth+
        tangent.x*offset,
    y:center.y+normal.y*sign*depth+tangent.y*offset};
   if(!stand(landing,doors)||!sweep(prior,landing,sans)||
      !doorBlocksSegment(leaf,{a:prior,b:landing}))continue;
   const certified=certifiedFollowOnPortalPrefix(
    from,goal,[...proposed.slice(0,-1),landing],doors,
    sweep,operable);
   if(certified.length)return certified;
  }
 return [];
}

type ColdClaim={orderId:number;doorId:string;goal:Pt;
 anchor:Pt;revision:number};
const used=new WeakMap<TeamActor,ColdClaim>();
/** A lingering squeeze FOOTWORK stance alone is not a collision proof:
 * this cold claim may consider it, but selectCertifiedFarSideEntryLanding
 * must independently prove that the actual full-size body and EACH
 * proposed real motor stride clear before any NAV adoption. Active
 * traversal, hand, and genuinely blocked hinges stay protected.
 */
/** An *existing, physically opened* generated ENTRY leaf has been
 * stationary for multiple seconds after its hand/route completed.
 * One cold attempt per same order, location, and world revision.
 * Everything else remains under the normal generated ENTRY owner.
 */
export function claimStalledGeneratedEntryFarSide(
 actor:TeamActor,goal:Pt,oldLeaf:Door,seconds:number,
 revision:number
):boolean{
 const order=actor.plan[0],episode=actor.doorTraversal;
 if(actor.side!=='blue'||order?.kind!=='move'||
    !order.entryDoorId||order.stackDoorId||
    order.entryDoorId!==oldLeaf.id||
    d(order.p,goal)>.5||actor.nav.length||
    actor.blockedTime<3||actor.lastBlocker!=='route'||
    actor.recoveryAttempts<3||
    actor.traversal||actor.traversalPending||
    actor.autoSidestep||actor.fireRetreatTarget||
    actor.doorHandContact?.releasedAt===null||
    !episode||episode.doorId!==oldLeaf.id||
    episode.authoredOrderId!==order.id||
    episode.phase!=='blocked'||
    episode.maneuver!=='grab-and-hold'||
    episode.handContact||episode.waypoints.length>0||
    !Number.isFinite(episode.lastProgressAt)||
    seconds-episode.lastProgressAt<2.5||
    !oldLeaf.open||oldLeaf.kind==='sliding'||oldLeaf.kind==='shutter'||
    oldLeaf.locked||oldLeaf.jammed||oldLeaf.wedged||oldLeaf.heldBy||
    (oldLeaf.openFraction??0)<.98||
    Math.abs(oldLeaf.angularVelocity??0)>=.16||
    pointToSegment(actor.p,doorLeafSegment(oldLeaf))>=
      OPERATOR_RADIUS+20||
    d(actor.p,goal)<35||
    !Number.isFinite(seconds)||!Number.isFinite(revision)||
    seconds<actor.retryRouteAt)return false;
 const before=used.get(actor);
 if(before&&before.orderId===order.id&&
    before.doorId===oldLeaf.id&&
    d(before.goal,goal)<.5&&d(before.anchor,actor.p)<12&&
    before.revision===revision)return false;
 used.set(actor,{orderId:order.id,doorId:oldLeaf.id,
   goal:copy(goal),anchor:copy(actor.p),revision});
 return true;
}
