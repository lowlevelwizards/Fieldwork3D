/** D3.26F — rate-limited fine-world recovery after REAL motor failure.
 * This grants no movement, route ownership, planning knowledge or clearance.
 * The caller must demand an unchanged blue authored MOVE, actual blocked
 * time, no active door/traversal sequence, and independently certify a
 * full-body route at actual motor-stride resolution before adoption.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
type Probe={orderId:number;goal:Pt;anchor:Pt;attempts:number;lastAt:number};
const attempts=new WeakMap<TeamActor,Probe>();

/** At most three expensive probes for one unchanged MOVE / GO.
 * Require >=4s between probes. If the actor has reached a new physical
 * anchor, it may try again (but never receive additional attempts).
 */
export function claimD326ColdFineProbe(
 actor:TeamActor,goal:Pt,seconds:number
):boolean{
 const order=actor.plan[0];
 if(actor.side!=='blue'||order?.kind!=='move'||
    order.stackDoorId||order.entryDoorId||
    actor.squeeze||actor.traversal||actor.traversalPending||
    actor.fireRetreatTarget||!Number.isFinite(seconds)||
    !Number.isFinite(goal.x)||!Number.isFinite(goal.y)||
    distance(actor.p,goal)<18||distance(actor.p,goal)>720)return false;
 let witness=attempts.get(actor);
 if(!witness||witness.orderId!==order.id||
    distance(witness.goal,goal)>.5){
   witness={orderId:order.id,goal:{...goal},
     anchor:{...actor.p},attempts:0,lastAt:-Infinity};
   attempts.set(actor,witness);
 }
 if(witness.attempts>=3||seconds-witness.lastAt<4)return false;
 // A static failed probe cannot be repeated indefinitely at one center.
 // Only one retry if geometry/door state changed is left to the caller's
 // normal cold backoff; this gate itself never invents progress.
 if(witness.attempts>=2&&distance(actor.p,witness.anchor)<16)
   return false;
 witness.lastAt=seconds;
 witness.attempts++;
 witness.anchor={...actor.p};
 return true;
}

/** Suppress coarse-grid lookahead on a path whose safety specifically
 * depends on 4-unit steps. Store only the route ARRAY identity, not actor
 * world state; replacing transient nav automatically releases ownership.
 * Shifting completed nodes preserves ownership until the route is gone.
 */
const ownedFineRoutes=new WeakMap<TeamActor,Pt[]>();
export function markD326FineMotorRoute(actor:TeamActor):void{
 ownedFineRoutes.set(actor,actor.nav);
}
export function ownsD326FineMotorRoute(actor:TeamActor):boolean{
 return !!actor.nav.length&&ownedFineRoutes.get(actor)===actor.nav;
}
