/** D3.15B4: cold, fully physical corner step for generated STACK travel.
 *
 * A long sweptBodyClear segment probes every ~4 world units, so it can
 * report a clear 11-unit chord while the actual <0.3-unit motor stride
 * correctly collides with furniture immediately next to the body.
 *
 * This adapter DOES NOT grant movement, clear a PlanNode, bypass a door,
 * use an imaginary narrow torso, or run on regular motor ticks. The
 * caller supplies the same world-truth capsule sweep as the real motor.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clone=(p:Pt):Pt=>({x:p.x,y:p.y});
const MAX_STRIDE=.3;

/** Subdivide every proposed leg, including its first motor-sized step. */
export function fullBodyMotorStrideClear(from:Pt,to:Pt,
 sweep:(from:Pt,to:Pt)=>boolean):boolean{
 const length=dist(from,to);
 if(!Number.isFinite(length)||length>120)return false;
 if(length<1e-5)return true;
 const steps=Math.ceil(length/MAX_STRIDE);
 let previous=from;
 for(let i=1;i<=steps;i++){
  const f=i/steps;
  const at={x:from.x+(to.x-from.x)*f,
    y:from.y+(to.y-from.y)*f};
  if(!sweep(previous,at))return false;
  previous=at;
 }
 return true;
}

/** ONLY an operator still executing its ordinary generated STACK MOVE.
 * A door blocker is eligible ONLY when the caller verifies genuine motor
 * contact with a stationary, non-locked, physically open leaf. Never treat
 * a closed door or still-swinging panel as a recoverable local corner.
 */
export function stackMicroRecoveryEligible(
 actor:Pick<TeamActor,'side'|'squeeze'|'doorTraversal'|'plan'|
  'blockedTime'|'lastBlocker'|'traversal'|'traversalPending'>,
 stableOpenLeafContact=false):boolean{
 const order=actor.plan[0];
 return actor.side==='blue'&&!actor.squeeze&&!actor.doorTraversal&&
  !actor.traversal&&!actor.traversalPending&&
  order?.kind==='move'&&!!order.stackDoorId&&!order.entryDoorId&&
  actor.blockedTime>=1.1&&
  (actor.lastBlocker==='furniture'||actor.lastBlocker==='wall'||
   (actor.lastBlocker==='door'&&stableOpenLeafContact));
}

/** Bounded 2/4-unit local departure; no grid A* or per-tick 360-degree scan.
 * Prefer shortest total GO path. The sidestep and entire remainder must
 * pass motor-sized checks with the SAME physical body, including corners.
 * The original STACK goal is the final point, never a changed order.
 */
export function selectStackMicroCorner(from:Pt,goal:Pt,
 sweep:(a:Pt,b:Pt)=>boolean):Pt[] {
 const remaining=dist(from,goal);
 if(remaining<=5||remaining>65||
    fullBodyMotorStrideClear(from,goal,sweep))return [];
 let best:Pt[]=[];
 let cost=Infinity;
 for(const radius of [2,4]){
  for(let i=0;i<16;i++){
   const theta=i*Math.PI/8;
   const stage={x:from.x+Math.cos(theta)*radius,
     y:from.y+Math.sin(theta)*radius};
   const length=radius+dist(stage,goal);
   if(length>=cost||length>remaining*1.65+10)continue;
   if(!fullBodyMotorStrideClear(from,stage,sweep)||
      !fullBodyMotorStrideClear(stage,goal,sweep))continue;
   best=[clone(stage),clone(goal)];cost=length;
  }
 }
 return best;
}

type MicroState={orderId:number;goal:Pt;attempts:number;lastAt:number};
const attemptState=new WeakMap<TeamActor,MicroState>();
/** Never repeat cold 32-candidate searches on a blocked 60Hz frame.
 * A changed authored order and physical progress invalidate the witness.
 */
export function claimStackMicroAttempt(a:TeamActor,seconds:number):boolean{
 const n=a.plan[0];
 if(n?.kind!=='move')return false;
 let state=attemptState.get(a);
 if(!state||state.orderId!==n.id||dist(state.goal,n.p)>.5){
  state={orderId:n.id,goal:clone(n.p),attempts:0,lastAt:-Infinity};
  attemptState.set(a,state);
 }
 if(state.attempts>=2||seconds-state.lastAt<3.5)return false;
 state.attempts++;state.lastAt=seconds;
 return true;
}
